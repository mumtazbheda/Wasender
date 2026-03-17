import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

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
      // WAsender API
      const res = await fetch('https://wasender.websmartmedia.tech/send-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: cleanPhone, message, apiKey: account.api_key }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) return { success: true };
      return { success: false, error: data.error || data.message || `HTTP ${res.status}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
    }

    const cid = parseInt(campaignId);

    // Get campaign + account info in one query
    const campaignResult = await sql`
      SELECT cr.*, wa.api_key, wa.account_type, wa.phone_number_id, wa.name as account_name_actual
      FROM campaign_runs cr
      JOIN wa_accounts wa ON cr.account_id = wa.id
      WHERE cr.id = ${cid}
    `;

    if (campaignResult.rows.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = campaignResult.rows[0];

    if (campaign.status !== 'in_progress') {
      return NextResponse.json({ isComplete: true, status: campaign.status });
    }

    // Atomically claim the next queued message to prevent double-processing
    const nextMsg = await sql`
      UPDATE campaign_messages
      SET status = 'sending'
      WHERE id = (
        SELECT id FROM campaign_messages
        WHERE campaign_id = ${cid} AND status = 'queued'
        ORDER BY id ASC
        LIMIT 1
      )
      RETURNING *
    `;

    if (nextMsg.rows.length === 0) {
      // No more queued messages — finalize campaign
      const stats = await sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
          COUNT(*) FILTER (WHERE status IN ('queued', 'sending')) as queued_count
        FROM campaign_messages WHERE campaign_id = ${cid}
      `;
      const sCnt = parseInt(stats.rows[0].sent_count);
      const fCnt = parseInt(stats.rows[0].failed_count);
      const qCnt = parseInt(stats.rows[0].queued_count);
      if (qCnt > 0) {
        // Other messages still being processed (by GitHub Actions or browser)
        return NextResponse.json({ isComplete: false, sentTotal: sCnt, failedTotal: fCnt, queuedRemaining: qCnt });
      }
      const finalStatus = fCnt === 0 ? 'completed' : (sCnt === 0 ? 'failed' : 'partial');
      await sql`UPDATE campaign_runs SET status = ${finalStatus}, completed_at = NOW(), sent_count = ${sCnt}, failed_count = ${fCnt} WHERE id = ${cid}`;
      return NextResponse.json({ isComplete: true, status: finalStatus, sentTotal: sCnt, failedTotal: fCnt, queuedRemaining: 0 });
    }

    const msg = nextMsg.rows[0];

    // Send the message
    const result = await sendToPhone(campaign, msg.phone, msg.message_text);

    if (result.success) {
      await sql`UPDATE campaign_messages SET status = 'sent', sent_at = NOW() WHERE id = ${msg.id}`;
    } else {
      await sql`UPDATE campaign_messages SET status = 'failed', error_message = ${result.error || 'Unknown'}, sent_at = NOW() WHERE id = ${msg.id}`;
    }

    // Get updated stats
    const stats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status IN ('queued', 'sending')) as queued_count
      FROM campaign_messages WHERE campaign_id = ${cid}
    `;

    const sCnt = parseInt(stats.rows[0].sent_count);
    const fCnt = parseInt(stats.rows[0].failed_count);
    const qCnt = parseInt(stats.rows[0].queued_count);

    await sql`UPDATE campaign_runs SET sent_count = ${sCnt}, failed_count = ${fCnt} WHERE id = ${cid}`;

    const isComplete = qCnt === 0;
    if (isComplete) {
      const finalStatus = fCnt === 0 ? 'completed' : (sCnt === 0 ? 'failed' : 'partial');
      await sql`UPDATE campaign_runs SET status = ${finalStatus}, completed_at = NOW() WHERE id = ${cid}`;
    }

    return NextResponse.json({
      isComplete,
      success: result.success,
      phone: msg.phone,
      ownerName: msg.owner_name,
      unitName: msg.unit_name,
      sentTotal: sCnt,
      failedTotal: fCnt,
      queuedRemaining: qCnt,
      error: result.error,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
