import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Protect this endpoint - Vercel auto-provides CRON_SECRET for scheduled calls
// Also allow calls from external cron services using x-cron-secret header
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // No secret configured = open (set CRON_SECRET in Vercel)

  // Vercel's built-in cron sends Authorization: Bearer <secret>
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) return true;

  // External cron services (cron-job.org etc.) can use x-cron-secret header
  const headerSecret = request.headers.get('x-cron-secret');
  if (headerSecret === cronSecret) return true;

  return false;
}

async function sendMessage(account: any, phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (account.account_type === 'whatsapp_business') {
      const res = await fetch(`https://graph.facebook.com/v18.0/${account.phone_number_id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${account.api_key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'text', text: { body: message } }),
      });
      if (res.ok) return { success: true };
      const err = await res.json();
      return { success: false, error: JSON.stringify(err) };
    } else {
      const res = await fetch('https://wasenderapi.com/api/send-message', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${account.api_key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, text: message }),
      });
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : { raw: await res.text() };
      if (res.ok && data.success !== false) return { success: true };
      return { success: false, error: data?.error || data?.message || `HTTP ${res.status}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find all in_progress campaigns
    const campaigns = await sql`
      SELECT cr.*, wa.api_key, wa.account_type, wa.phone_number_id
      FROM campaign_runs cr
      JOIN wa_accounts wa ON cr.account_id = wa.id
      WHERE cr.status = 'in_progress'
      ORDER BY cr.started_at ASC
    `;

    if (campaigns.rows.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No in_progress campaigns' });
    }

    let totalProcessed = 0;

    for (const campaign of campaigns.rows) {
      const cid = campaign.id;
      const delayMin = parseInt(String(campaign.delay_min || 10)); // already in seconds

      // Check when the last message was sent for this campaign
      const lastSent = await sql`
        SELECT MAX(sent_at) as last_sent FROM campaign_messages
        WHERE campaign_id = ${cid} AND status IN ('sent', 'failed')
      `;
      const lastSentAt = lastSent.rows[0]?.last_sent;

      // If last message was sent less than delay_min seconds ago, skip this campaign
      if (lastSentAt) {
        const secondsSinceLast = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
        if (secondsSinceLast < delayMin) {
          continue; // Not yet time to send next message for this campaign
        }
      }

      // Atomically claim the next queued message
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
        if (qCnt === 0) {
          const finalStatus = fCnt === 0 ? 'completed' : (sCnt === 0 ? 'failed' : 'partial');
          await sql`UPDATE campaign_runs SET status = ${finalStatus}, completed_at = NOW(), sent_count = ${sCnt}, failed_count = ${fCnt} WHERE id = ${cid}`;
        }
        continue;
      }

      const msg = nextMsg.rows[0];
      const result = await sendMessage(campaign, msg.phone, msg.message_text);

      if (result.success) {
        await sql`UPDATE campaign_messages SET status = 'sent', sent_at = NOW() WHERE id = ${msg.id}`;
      } else {
        await sql`UPDATE campaign_messages SET status = 'failed', error_message = ${result.error || 'Unknown'}, sent_at = NOW() WHERE id = ${msg.id}`;
      }

      // Update campaign counters
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

      if (qCnt === 0) {
        const finalStatus = fCnt === 0 ? 'completed' : (sCnt === 0 ? 'failed' : 'partial');
        await sql`UPDATE campaign_runs SET status = ${finalStatus}, completed_at = NOW() WHERE id = ${cid}`;
      }

      totalProcessed++;
    }

    return NextResponse.json({ processed: totalProcessed, campaigns: campaigns.rows.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
