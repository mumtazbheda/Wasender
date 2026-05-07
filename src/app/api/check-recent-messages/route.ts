import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST /api/check-recent-messages
// Body: { phones: string[], lookbackDays?: number }
// Returns which of these phones were messaged recently + when
export async function POST(request: NextRequest) {
  try {
    const { phones, lookbackDays = 7 } = await request.json();

    if (!Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json({ success: true, recent: [], count: 0 });
    }

    // Normalise: strip non-digits, keep leading +
    const normalised = phones
      .map((p: string) => (p || '').replace(/[^0-9]/g, ''))
      .filter(Boolean);

    if (normalised.length === 0) {
      return NextResponse.json({ success: true, recent: [], count: 0 });
    }

    const lookbackMs = lookbackDays * 24 * 60 * 60 * 1000;
    const since = new Date(Date.now() - lookbackMs).toISOString();

    // Find all messages sent to these phones in the lookback window
    // We query one by one to avoid ANY() issues with Vercel Postgres
    const recentMap: Record<string, { phone: string; lastSentAt: string; campaignId: number; campaignName: string }> = {};

    for (const phone of normalised) {
      const res = await sql`
        SELECT cm.phone, cm.sent_at, cr.id as campaign_id, cr.name as campaign_name
        FROM campaign_messages cm
        JOIN campaign_runs cr ON cm.campaign_id = cr.id
        WHERE cm.phone = ${phone}
          AND cm.status = 'sent'
          AND cm.sent_at >= ${since}
        ORDER BY cm.sent_at DESC
        LIMIT 1
      `;
      if (res.rows.length > 0) {
        const row = res.rows[0];
        recentMap[phone] = {
          phone,
          lastSentAt: row.sent_at,
          campaignId: row.campaign_id,
          campaignName: row.campaign_name || 'Unnamed',
        };
      }
    }

    const recent = Object.values(recentMap);
    recent.sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime());

    const latestRun = recent.length > 0 ? recent[0].lastSentAt : null;
    const earliestRun = recent.length > 0 ? recent[recent.length - 1].lastSentAt : null;

    return NextResponse.json({
      success: true,
      recent,
      count: recent.length,
      latestRun,
      earliestRun,
      lookbackDays,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
