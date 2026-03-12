import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { updateSheetCell, getSheetHeadersWithAuth, getFeedbackColumnIndices } from '@/lib/sheets';

function convertDelay(amount: number, unit: string): number {
  switch (unit) {
    case 'seconds': return amount * 1000;
    case 'minutes': return amount * 60 * 1000;
    case 'hours': return amount * 60 * 60 * 1000;
    default: return amount * 1000;
  }
}

function getRandomDelay(base: number, randomize: boolean): number {
  if (!randomize || base === 0) return base;
  const variance = base * 0.2;
  return Math.round(base + (Math.random() - 0.5) * 2 * variance);
}

async function sendToPhone(account: any, phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) return { success: false, error: 'No phone number' };

    if (account.account_type === 'whatsapp_business') {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${account.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: { body: message },
          }),
        }
      );
      if (res.ok) return { success: true };
      const err = await res.json();
      return { success: false, error: JSON.stringify(err) };
    } else {
      const res = await fetch('https://wasenderapi.com/api/send-message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: cleanPhone, text: message }),
      });
      const data = await res.json();
      if (res.ok && data.success) return { success: true };
      return { success: false, error: data.error || 'Send failed' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

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

    // Get session for Google Sheets access
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (session as any)?.accessToken as string | undefined;

    // Get account with full API key
    const accountResult = await sql`SELECT * FROM wa_accounts WHERE id = ${parseInt(accountId)}`;
    if (accountResult.rows.length === 0) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }
    const account = accountResult.rows[0];

    // Deduplicate phones across Owner 1/2/3 Mobile
    const { entries: uniquePhones, totalPhones, duplicates } = deduplicatePhones(contacts);

    // Create campaign record with name
    const campaignResult = await sql`
      INSERT INTO campaign_runs (name, account_id, account_name, template_name, template_body, sheet_tab, total_contacts, total_unique_phones, duplicates_removed, status, filters_used, delay_before, delay_between, delay_unit, randomize_delay)
      VALUES (${campaignName || 'Unnamed Campaign'}, ${parseInt(accountId)}, ${accountName || account.name || ''}, ${templateName || 'Unnamed'}, ${templateBody}, ${sheetTab || ''}, ${contacts.length}, ${uniquePhones.length}, ${duplicates}, 'in_progress', ${filtersUsed || ''}, ${delayBefore || 0}, ${delayBetween || 5}, ${delayUnit || 'seconds'}, ${randomizeDelay || false})
      RETURNING id
    `;
    const campaignId = campaignResult.rows[0].id;

    // Try to get feedback column indices for Google Sheet updates
    let feedbackColumns: Record<number, number> | null = null;
    if (accessToken && sheetTab) {
      try {
        const headers = await getSheetHeadersWithAuth(accessToken, sheetTab);
        feedbackColumns = getFeedbackColumnIndices(headers, account.name || accountName || '');
      } catch (e) {
        console.log('Could not get feedback columns:', e);
      }
    }

    // Send messages in background (don't block response)
    (async () => {
      let sentCount = 0;
      let failedCount = 0;
      try {
        // Initial delay
        if (delayBefore > 0) {
          await new Promise(r => setTimeout(r, convertDelay(delayBefore, delayUnit || 'seconds')));
        }

        await sql`UPDATE campaign_runs SET started_at = NOW() WHERE id = ${campaignId}`;

        for (let i = 0; i < uniquePhones.length; i++) {
          const entry = uniquePhones[i];
          const message = replaceVars(templateBody, entry.contact);

          const result = await sendToPhone(account, entry.phone, message);

          if (result.success) {
            sentCount++;
            await sql`
              INSERT INTO campaign_messages (campaign_id, phone, unit_name, owner_name, owner_num, message_text, status, sent_at)
              VALUES (${campaignId}, ${entry.phone}, ${entry.contact.unit || ''}, ${entry.ownerName}, ${entry.ownerNum}, ${message}, 'sent', NOW())
            `;

            // Update feedback column in Google Sheet
            if (accessToken && feedbackColumns && entry.contact.rowIndex) {
              try {
                const colIndex = feedbackColumns[entry.ownerNum];
                if (colIndex >= 0) {
                  const timestamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  await updateSheetCell(accessToken, sheetTab, entry.contact.rowIndex, colIndex, `Message Sent - ${timestamp}`);
                }
              } catch (feedbackErr) {
                console.log('Failed to update feedback column:', feedbackErr);
              }
            }
          } else {
            failedCount++;
            await sql`
              INSERT INTO campaign_messages (campaign_id, phone, unit_name, owner_name, owner_num, message_text, status, error_message)
              VALUES (${campaignId}, ${entry.phone}, ${entry.contact.unit || ''}, ${entry.ownerName}, ${entry.ownerNum}, ${message}, 'failed', ${result.error || ''})
            `;
          }

          await sql`UPDATE campaign_runs SET sent_count = ${sentCount}, failed_count = ${failedCount} WHERE id = ${campaignId}`;

          // Delay between messages
          if (i < uniquePhones.length - 1 && delayBetween > 0) {
            const delay = getRandomDelay(convertDelay(delayBetween, delayUnit || 'seconds'), randomizeDelay);
            await new Promise(r => setTimeout(r, delay));
          }
        }

        // Determine final status based on actual counts
        const finalStatus = failedCount === 0 ? 'completed' : (sentCount === 0 ? 'failed' : 'partial');
        await sql`UPDATE campaign_runs SET status = ${finalStatus}, completed_at = NOW(), sent_count = ${sentCount}, failed_count = ${failedCount} WHERE id = ${campaignId}`;
      } catch (err: any) {
        console.error('Campaign error:', err);
        // Still save whatever counts we have
        try {
          await sql`UPDATE campaign_runs SET status = 'failed', completed_at = NOW(), sent_count = ${sentCount}, failed_count = ${failedCount} WHERE id = ${campaignId}`;
        } catch (_) {
          await sql`UPDATE campaign_runs SET status = 'failed', completed_at = NOW() WHERE id = ${campaignId}`;
        }
      }
    })();

    return NextResponse.json({
      message: 'Campaign started',
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
