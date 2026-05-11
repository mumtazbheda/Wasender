import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSheetHeadersWithAuth, updateSheetCell, getFeedbackColumnIndices } from '@/lib/sheets';

// POST /api/backfill-feedback
// Body: { campaignId: number }
// Writes "Message Sent - DD Mon YYYY" to the feedback column in the Google Sheet
// for every message that has status = 'sent' in the campaign.

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

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();
    if (!campaignId) {
      return NextResponse.json({ message: 'campaignId is required' }, { status: 400 });
    }

    const cid = parseInt(campaignId);

    // Load campaign details
    const campaignRes = await sql`SELECT * FROM campaign_runs WHERE id = ${cid}`;
    if (campaignRes.rows.length === 0) {
      return NextResponse.json({ message: 'Campaign not found' }, { status: 404 });
    }
    const campaign = campaignRes.rows[0];
    const sheetTab = campaign.sheet_tab;
    const accountName = campaign.account_name || '';

    if (!sheetTab) {
      return NextResponse.json({ message: 'Campaign has no sheet_tab — cannot update sheet' }, { status: 400 });
    }

    // Get Google access token
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json({ message: 'No Google token stored. Please sign in via the app first.' }, { status: 400 });
    }

    // Load sheet headers
    const headers = await getSheetHeadersWithAuth(accessToken, sheetTab);

    // Determine which standard field maps to the feedback columns for this account
    const name = accountName.toLowerCase();
    let feedbackFields: Record<number, string>;
    if (name.includes('ahmed')) {
      feedbackFields = { 1: 'ahmed_feedback_1', 2: 'ahmed_feedback_2', 3: 'ahmed_feedback_3' };
    } else if (name.includes('zoha')) {
      feedbackFields = { 1: 'zoha_feedback_1', 2: 'zoha_feedback_2', 3: 'zoha_feedback_3' };
    } else if (name.includes('asma')) {
      feedbackFields = { 1: 'asma_feedback_1', 2: 'asma_feedback_2', 3: 'asma_feedback_3' };
    } else {
      return NextResponse.json({ message: `Unknown account name "${accountName}" — cannot determine feedback columns` }, { status: 400 });
    }

    // Build colIndex for each owner slot: first try column_mappings, then direct header search
    const colIndexForOwner: Record<number, number> = {};
    for (const [ownerNumStr, field] of Object.entries(feedbackFields)) {
      const ownerNum = parseInt(ownerNumStr);
      let colIndex = -1;

      // Try DB column_mappings first
      try {
        const mappingRes = await sql`
          SELECT source_header FROM column_mappings
          WHERE sheet_tab = ${sheetTab} AND standard_field = ${field}
          LIMIT 1
        `;
        if (mappingRes.rows.length > 0) {
          const sourceHeader = mappingRes.rows[0].source_header;
          colIndex = headers.findIndex(h => h.toLowerCase().trim() === sourceHeader.toLowerCase().trim());
        }
      } catch { /* ignore */ }

      // Fall back to direct header search
      if (colIndex < 0) {
        const feedbackCols = getFeedbackColumnIndices(headers, accountName);
        colIndex = feedbackCols[ownerNum] ?? -1;
      }

      colIndexForOwner[ownerNum] = colIndex;
    }

    // Check we found at least owner 1 column
    if ((colIndexForOwner[1] ?? -1) < 0) {
      return NextResponse.json({
        message: `Could not find feedback column for "${accountName}" owner 1 in sheet "${sheetTab}". Check Column Mappings.`,
        colIndexForOwner,
      }, { status: 400 });
    }

    // Load all sent messages for this campaign that have a row_index
    const msgsRes = await sql`
      SELECT id, phone, row_index, owner_num, sent_at
      FROM campaign_messages
      WHERE campaign_id = ${cid}
        AND status = 'sent'
        AND row_index IS NOT NULL
      ORDER BY id ASC
    `;

    if (msgsRes.rows.length === 0) {
      return NextResponse.json({ message: 'No sent messages with row_index found for this campaign', updated: 0 });
    }

    let updated = 0;
    const errors: string[] = [];

    for (const msg of msgsRes.rows) {
      const ownerNum = msg.owner_num || 1;
      const colIndex = colIndexForOwner[ownerNum] ?? colIndexForOwner[1];
      if (colIndex < 0) continue;

      const sentDate = msg.sent_at ? new Date(msg.sent_at) : new Date();
      const timestamp = sentDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      try {
        await updateSheetCell(accessToken, sheetTab, msg.row_index, colIndex, `Message Sent - ${timestamp}`);
        updated++;
      } catch (err: any) {
        errors.push(`Row ${msg.row_index}: ${err.message}`);
      }
    }

    return NextResponse.json({
      message: `Updated ${updated} of ${msgsRes.rows.length} rows in "${sheetTab}"`,
      updated,
      total: msgsRes.rows.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });

  } catch (error: any) {
    return NextResponse.json({ message: 'Failed: ' + error.message }, { status: 500 });
  }
}
