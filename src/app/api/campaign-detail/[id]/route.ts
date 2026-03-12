import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = parseInt(params.id);
    if (isNaN(campaignId)) {
      return NextResponse.json({ message: 'Invalid campaign ID' }, { status: 400 });
    }

    // Get campaign details
    const campaignResult = await sql`SELECT * FROM campaign_runs WHERE id = ${campaignId}`;
    if (campaignResult.rows.length === 0) {
      return NextResponse.json({ message: 'Campaign not found' }, { status: 404 });
    }

    // Get messages for this campaign
    const messagesResult = await sql`
      SELECT * FROM campaign_messages 
      WHERE campaign_id = ${campaignId} 
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      campaign: campaignResult.rows[0],
      messages: messagesResult.rows,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed: ' + error.message }, { status: 500 });
  }
}
