import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Vercel Hobby plan: 10s function limit. Leave 1.5s buffer for overhead.
const MAX_EXECUTION_MS = 8500;

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) return true;
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateCampaignStats(cid: number): Promise<{ sent: number; failed: number; queued: number }> {
  const stats = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
      COUNT(*) FILTER (WHERE status IN ('queued', 'sending')) as queued_count
    FROM campaign_messages WHERE campaign_id = ${cid}
  `;
  const sent = parseInt(stats.rows[0].sent_count);
  const failed = parseInt(stats.rows[0].failed_count);
  const queued = parseInt(stats.rows[0].queued_count);
  await sql`UPDATE campaign_runs SET sent_count = ${sent}, failed_count = ${failed} WHERE id = ${cid}`;
  if (queued === 0) {
    const finalStatus = failed === 0 ? 'completed' : (sent === 0 ? 'failed' : 'partial');
    await sql`UPDATE campaign_runs SET status = ${finalStatus}, completed_at = NOW() WHERE id = ${cid}`;
  }
  return { sent, failed, queued };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Reset any messages stuck in 'sending' for more than 3 minutes
    await sql`
      UPDATE campaign_messages
      SET status = 'queued'
      WHERE status = 'sending'
        AND (sent_at IS NULL OR sent_at < NOW() - INTERVAL '3 minutes')
        AND created_at < NOW() - INTERVAL '3 minutes'
    `;

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

    // Process campaigns in a round-robin loop until we run out of time
    // This ensures all campaigns get fair processing even with short delays
    let anyProgress = true;
    while (anyProgress) {
      anyProgress = false;

      for (const campaign of campaigns.rows) {
        // Check time budget before each message
        const elapsed = Date.now() - startTime;
        if (elapsed >= MAX_EXECUTION_MS) {
          return NextResponse.json({ processed: totalProcessed, campaigns: campaigns.rows.length, timeUsed: elapsed });
        }

        const cid = campaign.id;
        const delayMin = Math.max(5, parseInt(String(campaign.delay_min || 30)));
        const delayMax = Math.max(delayMin, parseInt(String(campaign.delay_between || delayMin)));

        // Check delay since last sent message
        const lastSent = await sql`
          SELECT MAX(sent_at) as last_sent FROM campaign_messages
          WHERE campaign_id = ${cid} AND status IN ('sent', 'failed')
        `;
        const lastSentAt = lastSent.rows[0]?.last_sent;

        if (lastSentAt) {
          const secondsSinceLast = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
          if (secondsSinceLast < delayMin) {
            // Not yet time — check if we can wait within our time budget
            const waitNeeded = (delayMin - secondsSinceLast) * 1000;
            const timeRemaining = MAX_EXECUTION_MS - (Date.now() - startTime);
            if (waitNeeded <= timeRemaining - 2000) {
              // We have time to wait, then send
              await sleep(waitNeeded);
            } else {
              // Not enough time to wait — skip this campaign for now, next cron call will pick it up
              continue;
            }
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
          // No more queued messages — finalize
          await updateCampaignStats(cid);
          continue;
        }

        const msg = nextMsg.rows[0];
        const result = await sendMessage(campaign, msg.phone, msg.message_text);

        if (result.success) {
          await sql`UPDATE campaign_messages SET status = 'sent', sent_at = NOW() WHERE id = ${msg.id}`;
        } else {
          await sql`UPDATE campaign_messages SET status = 'failed', error_message = ${result.error || 'Unknown'}, sent_at = NOW() WHERE id = ${msg.id}`;
        }

        await updateCampaignStats(cid);
        totalProcessed++;
        anyProgress = true;
      }
    }

    return NextResponse.json({ processed: totalProcessed, campaigns: campaigns.rows.length, timeUsed: Date.now() - startTime });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
