import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message, accountId } = body;

    if (!phone || !message || !accountId) {
      return NextResponse.json({ message: 'phone, message, and accountId are required' }, { status: 400 });
    }

    const result = await sql`SELECT * FROM wa_accounts WHERE id = ${parseInt(accountId)}`;
    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }
    
    const account = result.rows[0];
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    let sendResult;

    if (account.account_type === 'whatsapp_business') {
      // WhatsApp Business API (Meta Graph API)
      const whatsappRes = await fetch(
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
      sendResult = await whatsappRes.json();
      if (!whatsappRes.ok) {
        return NextResponse.json({ message: 'Failed to send: ' + JSON.stringify(sendResult) }, { status: 400 });
      }
    } else {
      // WAsender API (wasenderapi.com)
      const wasenderRes = await fetch('https://wasenderapi.com/api/send-message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: cleanPhone, text: message }),
      });
      sendResult = await wasenderRes.json();
      if (!wasenderRes.ok || sendResult.success === false) {
        return NextResponse.json({ message: 'Failed to send: ' + (sendResult.error || sendResult.message || JSON.stringify(sendResult)) }, { status: 400 });
      }
    }

    // Log the test message
    try {
      await sql`
        INSERT INTO messages (message_id, direction, phone, message_text, status)
        VALUES (${'test_' + Date.now()}, 'outgoing', ${cleanPhone}, ${message}, 'sent')
      `;
    } catch {}

    return NextResponse.json({ message: 'Test message sent successfully', result: sendResult }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed: ' + error.message }, { status: 500 });
  }
}
