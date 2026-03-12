import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contacts, templateName, templateBody, accountId, delayBefore, delayBetween, delayUnit, randomizeDelay, filtersUsed } = body;

    if (!contacts?.length || !templateBody || !accountId) {
      return NextResponse.json({ message: 'contacts, templateBody, and accountId are required' }, { status: 400 });
    }

    // Get account with full API key
    const accountResult = await sql`SELECT * FROM wa_accounts WHERE id = ${parseInt(accountId)}`;
    if (accountResult.rows.length === 0) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }
    const account = accountResult.rows[0];

    // Create campaign record
    const campaignResult = await sql`
      INSERT INTO campaign_runs (name, account_id, template_name, template_body, total_contacts, status, filters_used, delay_before, delay_between, delay_unit, randomize_delay)
      VALUES (${templateName || 'Campaign'}, ${parseInt(accountId)}, ${templateName || 'Unnamed'}, ${templateBody}, ${contacts.length}, 'in_progress', ${filtersUsed || ''}, ${delayBefore || 0}, ${delayBetween || 5}, ${delayUnit || 'seconds'}, ${randomizeDelay || false})
      RETURNING id
    `;
    const campaignId = campaignResult.rows[0].id;

    // Send messages in background (don't block response)
    (async () => {
      try {
        // Initial delay
        if (delayBefore > 0) {
          await new Promise(r => setTimeout(r, convertDelay(delayBefore, delayUnit || 'seconds')));
        }

        await sql`UPDATE campaign_runs SET started_at = NOW() WHERE id = ${campaignId}`;

        let sentCount = 0;
        let failedCount = 0;

        for (let i = 0; i < contacts.length; i++) {
          const contact = contacts[i];
          const message = replaceVars(templateBody, contact);
          const phone = contact.owner1_mobile || '';

          const result = await sendToPhone(account, phone, message);

          if (result.success) {
            sentCount++;
            await sql`
              INSERT INTO campaign_messages (campaign_id, phone, unit_name, owner_name, message_text, status, sent_at)
              VALUES (${campaignId}, ${phone}, ${contact.unit || ''}, ${contact.owner1_name || ''}, ${message}, 'sent', NOW())
            `;
          } else {
            failedCount++;
            await sql`
              INSERT INTO campaign_messages (campaign_id, phone, unit_name, owner_name, message_text, status, error_message)
              VALUES (${campaignId}, ${phone}, ${contact.unit || ''}, ${contact.owner1_name || ''}, ${message}, 'failed', ${result.error || ''})
            `;
          }

          await sql`UPDATE campaign_runs SET sent_count = ${sentCount}, failed_count = ${failedCount} WHERE id = ${campaignId}`;

          // Delay between messages
          if (i < contacts.length - 1 && delayBetween > 0) {
            const delay = getRandomDelay(convertDelay(delayBetween, delayUnit || 'seconds'), randomizeDelay);
            await new Promise(r => setTimeout(r, delay));
          }
        }

        await sql`UPDATE campaign_runs SET status = 'completed', completed_at = NOW(), sent_count = ${sentCount}, failed_count = ${failedCount} WHERE id = ${campaignId}`;
      } catch (err: any) {
        await sql`UPDATE campaign_runs SET status = 'failed' WHERE id = ${campaignId}`;
      }
    })();

    return NextResponse.json({
      message: 'Campaign started',
      campaignId,
      totalContacts: contacts.length,
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
