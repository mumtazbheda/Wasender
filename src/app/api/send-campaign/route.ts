import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function replaceVars(template: string, contact: any): string {
  return template
    .replace(/{name}/g, contact.owner1_name || '')
    .replace(/{unit}/g, contact.unit || '')
    .replace(/{rooms_en}/g, contact.rooms_en || '')
    .replace(/{project_name_en}/g, contact.project_name_en || '')
    .replace(/{phone}/g, contact.owner1_mobile || '');
}

interface PhoneEntry {
  phone: string;
  contact: any;
  ownerNum: number;
  ownerName: string;
}

function deduplicatePhones(contacts: any[]): { entries: PhoneEntry[]; totalPhones: number; duplicates: number } {
  const phoneMap = new Map<string, PhoneEntry>();
  let totalPhones = 0;

  for (const contact of contacts) {
    const owners = [
      { phone: contact.owner1_mobile, num: 1, name: contact.owner1_name },
      { phone: contact.owner2_mobile, num: 2, name: contact.owner2_name },
      { phone: contact.owner3_mobile, num: 3, name: contact.owner3_name },
    ];

    for (const { phone, num, name } of owners) {
      const cleaned = (phone || '').replace(/[^0-9+]/g, '');
      if (cleaned) {
        totalPhones++;
        if (!phoneMap.has(cleaned)) {
          phoneMap.set(cleaned, { phone: cleaned, contact, ownerNum: num, ownerName: name || '' });
        }
      }
    }
  }

  const entries = Array.from(phoneMap.values());
  return { entries, totalPhones, duplicates: totalPhones - entries.length };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignName, contacts, templateName, templateBody,
      accountId, accountName, sheetTab,
      delayBefore, delayBetween, delayUnit, randomizeDelay, filtersUsed
    } = body;

    if (!contacts?.length || !templateBody || !accountId) {
      return NextResponse.json({ message: 'contacts, templateBody, and accountId are required' }, { status: 400 });
    }

    const accountResult = await sql`SELECT * FROM wa_accounts WHERE id = ${parseInt(accountId)}`;
    if (accountResult.rows.length === 0) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }
    const account = accountResult.rows[0];

    const { entries: uniquePhones, totalPhones, duplicates } = deduplicatePhones(contacts);

    // Create campaign record - status in_progress immediately
    const campaignResult = await sql`
      INSERT INTO campaign_runs (name, account_id, account_name, template_name, template_body, sheet_tab, total_contacts, total_unique_phones, duplicates_removed, status, filters_used, delay_before, delay_between, delay_unit, randomize_delay, started_at)
      VALUES (${campaignName || 'Unnamed Campaign'}, ${parseInt(accountId)}, ${accountName || account.name || ''}, ${templateName || 'Unnamed'}, ${templateBody}, ${sheetTab || ''}, ${contacts.length}, ${uniquePhones.length}, ${duplicates}, 'in_progress', ${filtersUsed || ''}, ${delayBefore || 0}, ${delayBetween || 5}, ${delayUnit || 'seconds'}, ${randomizeDelay || false}, NOW())
      RETURNING id
    `;
    const campaignId = campaignResult.rows[0].id;

    // Pre-queue ALL messages — browser will drive the sending with delays
    for (let i = 0; i < uniquePhones.length; i++) {
      const entry = uniquePhones[i];
      const message = replaceVars(templateBody, entry.contact);
      const rowIndex = entry.contact.rowIndex || null;

      await sql`
        INSERT INTO campaign_messages (campaign_id, phone, unit_name, owner_name, owner_num, message_text, status, row_index)
        VALUES (${campaignId}, ${entry.phone}, ${entry.contact.unit || ''}, ${entry.ownerName}, ${entry.ownerNum}, ${message}, 'queued', ${rowIndex})
      `;
    }

    return NextResponse.json({
      message: 'Campaign queued',
      campaignId,
      totalContacts: contacts.length,
      uniquePhones: uniquePhones.length,
      duplicatesRemoved: duplicates,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed: ' + error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await sql`SELECT * FROM campaign_runs ORDER BY created_at DESC LIMIT 50`;
    return NextResponse.json({ campaigns: result.rows }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed: ' + error.message }, { status: 500 });
  }
}
