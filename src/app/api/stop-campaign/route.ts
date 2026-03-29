import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();
    if (!campaignId) {
      return NextResponse.json({ message: 'campaignId is required' }, { status: 400 });
    }

    // Only stop campaigns that are in_progress
    const campaign = await sql`SELECT * FROM campaign_runs WHERE id = ${campaignId}`;
    if (campaign.rows.length === 0) {
      return NextResponse.json({ message: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.rows[0].status !== 'in_progress') {
      return NextResponse.json({ message: 'Campaign is not in progress' }, { status: 400 });
    }

    // Mark all queued/sending messages back to queued (so resume works later)
    await sql`
      UPDATE campaign_messages
      SET status = 'queued'
      WHERE campaign_id = ${campaignId} AND status IN ('queued', 'sending')
    `;

    // Mark campaign as stopped
    await sql`
      UPDATE campaign_runs
      SET status = 'stopped'
      WHERE id = ${campaignId}
    `;

    return NextResponse.json({ success: true, message: 'Campaign stopped. Use Re-run → Resume to continue later.' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed: ' + error.message }, { status: 500 });
  }
}
