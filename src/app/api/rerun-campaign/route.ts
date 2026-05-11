import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

async function triggerGithubWorkflow(campaignId: number, delayMin: number, delayMax: number): Promise<{ ok: boolean; error?: string }> {
  const githubPat = process.env.GITHUB_PAT;
  if (!githubPat) return { ok: false, error: 'GITHUB_PAT env var not set' };

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
    if (res.ok || res.status === 204) return { ok: true };
    const errText = await res.text();
    return { ok: false, error: `GitHub ${res.status}: ${errText}` };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { campaignId, mode, delayMin, delayMax, batchSize, batchWaitMinutes, accountId, accountName } = await request.json();

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

    // Resolve new account values
    const newAccountId = accountId != null ? parseInt(String(accountId)) : null;
    const newAccountName = accountName || null;

    // Update campaign: reset status, save new delays, account, batch settings
    if (newAccountId) {
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
            account_id = ${newAccountId},
            account_name = ${newAccountName},
            started_at = CASE WHEN ${mode} = 'fresh' THEN NOW() ELSE started_at END
        WHERE id = ${cid}
      `;
    } else {
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
    }

    // Trigger GitHub Actions workflow — this is what actually sends the messages
    const { ok: workflowTriggered, error: workflowError } = await triggerGithubWorkflow(cid, newDelayMin, newDelayMax);

    return NextResponse.json({
      message: workflowTriggered
        ? `Campaign ${mode === 'fresh' ? 'restarted' : 'resumed'} and background job started`
        : `Campaign ${mode === 'fresh' ? 'restarted' : 'resumed'} but workflow trigger failed: ${workflowError}`,
      workflowTriggered,
      workflowError: workflowError || null,
      delayMin: newDelayMin,
      delayMax: newDelayMax,
      batchSize: newBatchSize,
      batchWaitMinutes: newBatchWait,
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed: ' + error.message }, { status: 500 });
  }
}
