import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const campaignResult = await sql`SELECT * FROM campaign_runs WHERE id = ${parseInt(id)}`;
    if (campaignResult.rows.length === 0) {
      return NextResponse.json({ message: 'Campaign not found' }, { status: 404 });
    }
    
    const messagesResult = await sql`
      SELECT * FROM campaign_messages WHERE campaign_id = ${parseInt(id)} ORDER BY created_at ASC
    `;
    
    return NextResponse.json({
      campaign: campaignResult.rows[0],
      messages: messagesResult.rows,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed: ' + error.message }, { status: 500 });
  }
}
