import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Vercel Hobby plan: 10s function limit. Leave 1.5s buffer.
const MAX_EXECUTION_MS = 8500;
// WaSender minimum: 1 message per 5 seconds per account
const MIN_ACCOUNT_DELAY_S = 5;

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
  const timeLeft = () => MAX_EXECUTION_MS - (Date.now() - startTime);

  try {
    // Reset stuck 'sending' messages (>3 min old)
    await sql`
      UPDATE campaign_messages
      SET status = 'queued'
      WHERE status = 'sending'
        AND (sent_at IS NULL OR sent_at < NOW() - INTERVAL '3 minutes')
        AND created_at < NOW() - INTERVAL '3 minutes'
    `;

    // Get all in_progress campaigns with account info
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

    // Group campaigns by account_id
    const accountCampaigns: Record<number, typeof campaigns.rows> = {};
    for (const c of campaigns.rows) {
      const aid = c.account_id;
      if (!accountCampaigns[aid]) accountCampaigns[aid] = [];
      accountCampaigns[aid].push(c);
    }

    // Track last send time per account (from DB + in-function sends)
    const accountLastSend: Record<number, number> = {};

    // Pre-fetch last send time per account across ALL their campaigns
    for (const aid of Object.keys(accountCampaigns)) {
      const aidNum = parseInt(aid);
      let maxSentAt: string | null = null;
      for (const c of accountCampaigns[aidNum]) {
        const lastSent = await sql`
          SELECT MAX(sent_at) as last_sent FROM campaign_messages
          WHERE campaign_id = ${c.id} AND status IN ('sent', 'failed')
        `;
        const ls = lastSent.rows[0]?.last_sent;
        if (ls && (!maxSentAt || new Date(ls) > new Date(maxSentAt))) {
          maxSentAt = ls;
        }
      }
      if (maxSentAt) {
        accountLastSend[aidNum] = new Date(maxSentAt).getTime();
      }
    }

    let totalProcessed = 0;
    let anyProgress = true;

    // Round-robin: keep looping across all accounts until time runs out or nothing left
    while (anyProgress && timeLeft() > 1500) {
      anyProgress = false;

      for (const aidStr of Object.keys(accountCampaigns)) {
        if (timeLeft() < 1500) break;

        const aid = parseInt(aidStr);
        const campaignList = accountCampaigns[aid];

        // Find the best campaign to send from this account
        // (one whose per-campaign delay has also elapsed)
        for (const campaign of campaignList) {
          if (timeLeft() < 1500) break;

          const cid = campaign.id;
          const campaignDelay = Math.max(MIN_ACCOUNT_DELAY_S, parseInt(String(campaign.delay_min || 30)));

          // Check account-level rate limit (5s minimum between ANY messages from same account)
          const lastAccountSend = accountLastSend[aid] || 0;
          const secsSinceAccount = lastAccountSend ? (Date.now() - lastAccountSend) / 1000 : 999;

          // Check campaign-specific delay
          const lastCampaignSent = await sql`
            SELECT MAX(sent_at) as last_sent FROM campaign_messages
            WHERE campaign_id = ${cid} AND status IN ('sent', 'failed')
          `;
          const lastCampTime = lastCampaignSent.rows[0]?.last_sent
            ? new Date(lastCampaignSent.rows[0].last_sent).getTime() : 0;
          const secsSinceCampaign = lastCampTime ? (Date.now() - lastCampTime) / 1000 : 999;

          // Effective delay: must satisfy both account rate limit and campaign delay
          const effectiveDelay = Math.max(MIN_ACCOUNT_DELAY_S, campaignDelay);
          const waitNeeded = Math.max(
            effectiveDelay - secsSinceCampaign,
            MIN_ACCOUNT_DELAY_S - secsSinceAccount,
            0
          );

          if (waitNeeded > 0) {
            const waitMs = waitNeeded * 1000;
            if (waitMs <= timeLeft() - 2000) {
              await sleep(waitMs);
            } else {
              continue; // Not enough time to wait — skip, next cron call will handle it
            }
          }

          // Claim next queued message
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
            await updateCampaignStats(cid);
            continue;
          }

          const msg = nextMsg.rows[0];
          const result = await sendMessage(campaign, msg.phone, msg.message_text);

          const now = Date.now();
          if (result.success) {
            await sql`UPDATE campaign_messages SET status = 'sent', sent_at = NOW() WHERE id = ${msg.id}`;
          } else {
            await sql`UPDATE campaign_messages SET status = 'failed', error_message = ${result.error || 'Unknown'}, sent_at = NOW() WHERE id = ${msg.id}`;
          }

          // Update trackers
          accountLastSend[aid] = now;
          await updateCampaignStats(cid);
          totalProcessed++;
          anyProgress = true;
          break; // Move to next account (round-robin fairness)
        }
      }
    }

    return NextResponse.json({
      processed: totalProcessed,
      campaigns: campaigns.rows.length,
      accounts: Object.keys(accountCampaigns).length,
      timeUsed: Date.now() - startTime,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
