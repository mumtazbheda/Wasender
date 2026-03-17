import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

async function triggerGithubWorkflow(campaignId: number, delayMin: number, delayMax: number) {
  const githubPat = process.env.GITHUB_PAT;
  if (!githubPat) return false;
  try {
    const res = await fetch(
      'https://api.github.com/repos/mumtazbheda/Wasender/actions/workflows/process-campaign.yml/dispatches',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubPat}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            campaign_id: String(campaignId),
            delay_min: String(delayMin),
            delay_max: String(delayMax),
          },
        }),
      }
    );
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { campaignId, mode } = await request.json();
    // mode: 'fresh' = reset everything, 'resume' = only re-queue failed

    if (!campaignId || !mode) {
      return NextResponse.json({ message: 'campaignId and mode are required' }, { status: 400 });
    }

    const cid = parseInt(campaignId);

    // Get campaign info
    const campaignResult = await sql`SELECT * FROM campaign_runs WHERE id = ${cid}`;
    if (campaignResult.rows.length === 0) {
      return NextResponse.json({ message: 'Campaign not found' }, { status: 404 });
    }
    const campaign = campaignResult.rows[0];

    if (mode === 'fresh') {
      // Reset ALL messages to queued (including stuck 'sending' ones)
      await sql`UPDATE campaign_messages SET status = 'queued', sent_at = NULL, error_message = NULL WHERE campaign_id = ${cid}`;
    } else {
      // Resume: re-queue failed and stuck 'sending' messages (keep sent ones)
      await sql`UPDATE campaign_messages SET status = 'queued', sent_at = NULL, error_message = NULL WHERE campaign_id = ${cid} AND status IN ('failed', 'sending')`;
    }

    // Reset campaign status to in_progress
    await sql`
      UPDATE campaign_runs
      SET status = 'in_progress', completed_at = NULL,
          sent_count = 0, failed_count = 0,
          started_at = CASE WHEN ${mode} = 'fresh' THEN NOW() ELSE started_at END
      WHERE id = ${cid}
    `;

    // Calculate delay
    const rawDelay = parseInt(String(campaign.delay_between || 5));
    const unit = campaign.delay_unit || 'seconds';
    const delaySeconds = unit === 'minutes' ? rawDelay * 60 : rawDelay;
    const delayMin = campaign.randomize_delay ? Math.max(5, Math.floor(delaySeconds * 0.5)) : delaySeconds;
    const delayMax = campaign.randomize_delay ? delaySeconds : delaySeconds;

    const workflowTriggered = await triggerGithubWorkflow(cid, delayMin, delayMax);

    return NextResponse.json({
      message: workflowTriggered
        ? `Campaign restarted (${mode === 'fresh' ? 'from beginning' : 'resuming from where left off'})`
        : 'Campaign reset but background job trigger failed',
      workflowTriggered,
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed: ' + error.message }, { status: 500 });
  }
}
