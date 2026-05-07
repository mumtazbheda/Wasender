import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { campaignId, mode, delayMin, delayMax, batchSize, batchWaitMinutes } = await request.json();

    if (!campaignId || !mode) {
      return NextResponse.json({ message: 'campaignId and mode are required' }, { status: 400 });
    }

    const cid = parseInt(campaignId);

    const campaignResult = await sql`SELECT * FROM campaign_runs WHERE id = ${cid}`;
    if (campaignResult.rows.length === 0) {
      return NextResponse.json({ message: 'Campaign not found' }, { status: 404 });
    }
    const campaign = campaignResult.rows[0];

    if (mode === 'fresh') {
      // Reset ALL messages including sending/stuck ones
      await sql`UPDATE campaign_messages SET status = 'queued', sent_at = NULL, error_message = NULL WHERE campaign_id = ${cid}`;
    } else {
      // Resume: re-queue everything that wasn't successfully sent (including stuck 'sending')
      await sql`UPDATE campaign_messages SET status = 'queued', sent_at = NULL, error_message = NULL WHERE campaign_id = ${cid} AND status IN ('failed', 'sending', 'queued')`;
    }

    // Use provided delays if given, otherwise fall back to stored values (already in seconds)
    const newDelayMin = delayMin != null ? Math.max(5, parseInt(String(delayMin))) : Math.max(5, parseInt(String(campaign.delay_min || 30)));
    const newDelayMax = delayMax != null ? Math.max(newDelayMin, parseInt(String(delayMax))) : Math.max(newDelayMin, parseInt(String(campaign.delay_between || 60)));
    const newBatchSize = batchSize != null ? Math.max(0, parseInt(String(batchSize))) : parseInt(String(campaign.batch_size || 0));
    const newBatchWait = batchWaitMinutes != null ? Math.max(0, parseInt(String(batchWaitMinutes))) : parseInt(String(campaign.batch_wait_minutes || 0));

    // Update campaign: reset status and save new delays + batch settings
    await sql`
      UPDATE campaign_runs
      SET status = 'in_progress',
          completed_at = NULL,
          sent_count = 0,
          failed_count = 0,
          delay_min = ${newDelayMin},
          delay_between = ${newDelayMax},
          batch_size = ${newBatchSize},
          batch_wait_minutes = ${newBatchWait},
          started_at = CASE WHEN ${mode} = 'fresh' THEN NOW() ELSE started_at END
      WHERE id = ${cid}
    `;

    return NextResponse.json({
      message: `Campaign ${mode === 'fresh' ? 'restarted from beginning' : 'resumed'}. Cron job will process it automatically.`,
      workflowTriggered: true,
      delayMin: newDelayMin,
      delayMax: newDelayMax,
      batchSize: newBatchSize,
      batchWaitMinutes: newBatchWait,
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed: ' + error.message }, { status: 500 });
  }
}
