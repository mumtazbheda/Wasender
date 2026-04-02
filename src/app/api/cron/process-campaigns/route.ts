import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { updateSheetCell, getSheetHeadersWithAuth, getFeedbackColumnIndices } from '@/lib/sheets';

const MIN_ACCOUNT_DELAY_MS = 5000; // WaSender: 1 msg per 5s per account

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (request.headers.get('authorization') === `Bearer ${cronSecret}`) return true;
  if (request.headers.get('x-cron-secret') === cronSecret) return true;
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
      const err = await res.json().catch(() => ({}));
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

// Get a valid Google access token using the stored refresh token
async function getGoogleAccessToken(): Promise<string | null> {
  try {
    const row = await sql`SELECT refresh_token, access_token, expires_at FROM google_tokens WHERE id = 1`;
    if (!row.rows[0]?.refresh_token) return null;
    const { refresh_token, access_token, expires_at } = row.rows[0];
    if (access_token && expires_at && (Number(expires_at) - 60) > Date.now() / 1000) {
      return access_token;
    }
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token,
      }),
    });
    const data = await res.json();
    if (!data.access_token) return null;
    const newExpiry = Math.floor(Date.now() / 1000) + (data.expires_in || 3600);
    await sql`UPDATE google_tokens SET access_token = ${data.access_token}, expires_at = ${newExpiry}, updated_at = NOW() WHERE id = 1`;
    return data.access_token;
  } catch {
    return null;
  }
}

async function writeFeedbackToSheet(
  accessToken: string, sheetTab: string, accountName: string,
  rowIndex: number, ownerNum: number
): Promise<void> {
  try {
    const headers = await getSheetHeadersWithAuth(accessToken, sheetTab);
    const feedbackCols = getFeedbackColumnIndices(headers, accountName);
    const colIndex = feedbackCols[ownerNum];
    if (colIndex === undefined || colIndex < 0) return;
    const timestamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    await updateSheetCell(accessToken, sheetTab, rowIndex, colIndex, `Message Sent - ${timestamp}`);
  } catch { /* non-fatal */ }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const log: string[] = [];

  try {
    // 1. Reset messages stuck in 'sending' for over 3 minutes
    const stuck = await sql`
      UPDATE campaign_messages SET status = 'queued'
      WHERE status = 'sending'
        AND created_at < NOW() - INTERVAL '3 minutes'
        AND (sent_at IS NULL OR sent_at < NOW() - INTERVAL '3 minutes')
    `;
    if ((stuck.rowCount ?? 0) > 0) log.push(`Reset ${stuck.rowCount} stuck messages`);

    // 2. Get all in_progress campaigns
    const campaigns = await sql`
      SELECT cr.id, cr.name, cr.account_id, cr.delay_min, cr.delay_between,
             wa.api_key, wa.account_type, wa.phone_number_id
      FROM campaign_runs cr
      JOIN wa_accounts wa ON cr.account_id = wa.id
      WHERE cr.status = 'in_progress'
      ORDER BY cr.started_at ASC
    `;

    if (campaigns.rows.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No in_progress campaigns', log });
    }

    log.push(`Found ${campaigns.rows.length} in_progress campaigns`);

    // 3. Track last send time per account (to avoid rate limiting across campaigns)
    const accountLastSendMs: Record<number, number> = {};

    let totalProcessed = 0;

    // 4. Process each campaign — send ONE message if delay has elapsed
    for (const campaign of campaigns.rows) {
      const cid = campaign.id;
      const delaySeconds = Math.max(5, parseInt(String(campaign.delay_min || 30)));

      // Get last sent time for this campaign
      const lastSentRow = await sql`
        SELECT MAX(sent_at) as last_sent
        FROM campaign_messages
        WHERE campaign_id = ${cid} AND status IN ('sent', 'failed')
      `;
      const lastSentAt: Date | null = lastSentRow.rows[0]?.last_sent
        ? new Date(lastSentRow.rows[0].last_sent) : null;

      const secondsSinceLast = lastSentAt
        ? (Date.now() - lastSentAt.getTime()) / 1000 : 9999;

      // Check campaign delay
      if (secondsSinceLast < delaySeconds) {
        log.push(`Campaign ${cid} (${campaign.name}): waiting ${Math.round(delaySeconds - secondsSinceLast)}s more`);
        continue;
      }

      // Check account-level rate limit (5s between ANY messages from same account)
      const accountLastMs = accountLastSendMs[campaign.account_id] || 0;
      const msSinceAccountSend = Date.now() - accountLastMs;
      if (accountLastMs > 0 && msSinceAccountSend < MIN_ACCOUNT_DELAY_MS) {
        const waitMs = MIN_ACCOUNT_DELAY_MS - msSinceAccountSend;
        log.push(`Account ${campaign.account_id}: waiting ${waitMs}ms for rate limit`);
        await new Promise(r => setTimeout(r, waitMs));
      }

      // Claim next queued message atomically
      const nextMsg = await sql`
        UPDATE campaign_messages SET status = 'sending'
        WHERE id = (
          SELECT id FROM campaign_messages
          WHERE campaign_id = ${cid} AND status = 'queued'
          ORDER BY id ASC LIMIT 1
        )
        RETURNING *
      `;

      if (nextMsg.rows.length === 0) {
        // No queued messages — check if campaign should be finalized
        const counts = await sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'sent') as s,
            COUNT(*) FILTER (WHERE status = 'failed') as f,
            COUNT(*) FILTER (WHERE status IN ('queued','sending')) as q
          FROM campaign_messages WHERE campaign_id = ${cid}
        `;
        const s = parseInt(counts.rows[0].s), f = parseInt(counts.rows[0].f), q = parseInt(counts.rows[0].q);
        if (q === 0) {
          const finalStatus = f === 0 ? 'completed' : s === 0 ? 'failed' : 'partial';
          await sql`UPDATE campaign_runs SET status = ${finalStatus}, completed_at = NOW(), sent_count = ${s}, failed_count = ${f} WHERE id = ${cid}`;
          log.push(`Campaign ${cid} finalized as ${finalStatus}`);
        }
        continue;
      }

      // Send the message
      const msg = nextMsg.rows[0];
      log.push(`Sending to ${msg.phone} for campaign ${cid}`);
      const result = await sendMessage(campaign, msg.phone, msg.message_text);
      const now = Date.now();

      if (result.success) {
        await sql`UPDATE campaign_messages SET status = 'sent', sent_at = NOW() WHERE id = ${msg.id}`;
        log.push(`Sent OK to ${msg.phone}`);
        // Update Google Sheet feedback column
        if (msg.row_index != null && campaign.sheet_tab && campaign.account_name) {
          const accessToken = await getGoogleAccessToken();
          if (accessToken) {
            await writeFeedbackToSheet(accessToken, campaign.sheet_tab, campaign.account_name, msg.row_index, msg.owner_num || 1);
            log.push(`Sheet feedback updated row ${msg.row_index}`);
          } else {
            log.push(`Sheet update skipped: no Google token stored`);
          }
        }
      } else {
        await sql`UPDATE campaign_messages SET status = 'failed', error_message = ${result.error || 'Unknown'}, sent_at = NOW() WHERE id = ${msg.id}`;
        log.push(`Failed ${msg.phone}: ${result.error}`);
      }

      // Update account rate limit tracker
      accountLastSendMs[campaign.account_id] = now;

      // Update campaign counters
      const counts = await sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'sent') as s,
          COUNT(*) FILTER (WHERE status = 'failed') as f,
          COUNT(*) FILTER (WHERE status IN ('queued','sending')) as q
        FROM campaign_messages WHERE campaign_id = ${cid}
      `;
      const s = parseInt(counts.rows[0].s), f = parseInt(counts.rows[0].f), q = parseInt(counts.rows[0].q);
      await sql`UPDATE campaign_runs SET sent_count = ${s}, failed_count = ${f} WHERE id = ${cid}`;
      if (q === 0) {
        const finalStatus = f === 0 ? 'completed' : s === 0 ? 'failed' : 'partial';
        await sql`UPDATE campaign_runs SET status = ${finalStatus}, completed_at = NOW() WHERE id = ${cid}`;
      }

      totalProcessed++;
    }

    return NextResponse.json({ processed: totalProcessed, campaigns: campaigns.rows.length, log });

  } catch (error: any) {
    return NextResponse.json({ error: error.message, log }, { status: 500 });
  }
}
