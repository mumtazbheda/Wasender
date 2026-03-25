import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const campaignId = request.nextUrl.searchParams.get('campaign_id');

    // Get all incoming messages that match phones from campaign_messages (sent ones)
    const result = campaignId
      ? await sql`
          SELECT
            m.id as message_id,
            m.phone,
            m.message_text as reply_text,
            m.created_at as reply_at,
            cm.unit_name,
            cm.owner_name,
            cm.owner_num,
            cm.message_text as sent_text,
            cm.sent_at,
            cm.row_index,
            cm.campaign_id,
            cr.name as campaign_name,
            cr.sheet_tab,
            cr.account_name
          FROM messages m
          INNER JOIN campaign_messages cm ON cm.phone = m.phone AND cm.status = 'sent'
          INNER JOIN campaign_runs cr ON cr.id = cm.campaign_id
          WHERE m.direction = 'incoming'
            AND cr.id = ${parseInt(campaignId)}
          ORDER BY m.created_at DESC
        `
      : await sql`
          SELECT
            m.id as message_id,
            m.phone,
            m.message_text as reply_text,
            m.created_at as reply_at,
            cm.unit_name,
            cm.owner_name,
            cm.owner_num,
            cm.message_text as sent_text,
            cm.sent_at,
            cm.row_index,
            cm.campaign_id,
            cr.name as campaign_name,
            cr.sheet_tab,
            cr.account_name
          FROM messages m
          INNER JOIN campaign_messages cm ON cm.phone = m.phone AND cm.status = 'sent'
          INNER JOIN campaign_runs cr ON cr.id = cm.campaign_id
          WHERE m.direction = 'incoming'
          ORDER BY m.created_at DESC
          LIMIT 200
        `;

    // Group replies by phone to get full thread per contact
    const byPhone: Record<string, any> = {};
    for (const row of result.rows) {
      const key = row.phone;
      if (!byPhone[key]) {
        byPhone[key] = {
          phone: row.phone,
          unit_name: row.unit_name,
          owner_name: row.owner_name,
          owner_num: row.owner_num,
          row_index: row.row_index,
          campaign_id: row.campaign_id,
          campaign_name: row.campaign_name,
          sheet_tab: row.sheet_tab,
          account_name: row.account_name,
          sent_text: row.sent_text,
          sent_at: row.sent_at,
          replies: [],
        };
      }
      byPhone[key].replies.push({
        message_id: row.message_id,
        text: row.reply_text,
        at: row.reply_at,
      });
    }

    const contacts = Object.values(byPhone);
    return NextResponse.json({ success: true, contacts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
