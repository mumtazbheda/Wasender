import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const ACCOUNTS_FILE = path.join(process.cwd(), 'data', 'accounts.json');
const CAMPAIGNS_FILE = path.join(process.cwd(), 'data', 'campaigns.json');

async function getAccounts() {
  try {
    const data = await fs.readFile(ACCOUNTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function ensureCampaignsFile() {
  try {
    await fs.access(CAMPAIGNS_FILE);
  } catch {
    const dir = path.dirname(CAMPAIGNS_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify([], null, 2));
  }
}

async function getCampaigns() {
  await ensureCampaignsFile();
  const data = await fs.readFile(CAMPAIGNS_FILE, 'utf-8');
  return JSON.parse(data);
}

async function saveCampaigns(campaigns: any[]) {
  await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2));
}

async function replaceVariables(template: string, contact: any) {
  return template
    .replace(/{name}/g, contact.owner1_name || '')
    .replace(/{unit}/g, contact.unit || '')
    .replace(/{rooms_en}/g, contact.rooms_en || '')
    .replace(/{project_name_en}/g, contact.project_name_en || '')
    .replace(/{phone}/g, contact.owner1_mobile || '');
}

function convertDelay(amount: number, unit: string): number {
  switch (unit) {
    case 'seconds':
      return amount * 1000;
    case 'minutes':
      return amount * 60 * 1000;
    case 'hours':
      return amount * 60 * 60 * 1000;
    case 'days':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return amount * 1000;
  }
}

function getRandomDelay(baseDelay: number, randomize: boolean): number {
  if (!randomize) return baseDelay;
  const variance = baseDelay * 0.2; // 20% variance
  return baseDelay + (Math.random() - 0.5) * 2 * variance;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contacts, template, delayBefore, delayBetween, delayUnit, randomizeDelay, accountId } =
      body;

    if (!contacts || !template || !accountId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const accounts = await getAccounts();
    const account = accounts.find((a: any) => a.id === accountId);

    if (!account) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    // Create campaign record
    const campaigns = await getCampaigns();
    const campaignId = Date.now().toString();
    const campaign = {
      id: campaignId,
      accountId,
      totalContacts: contacts.length,
      sentCount: 0,
      failedCount: 0,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      messages: [] as any[],
    };

    campaigns.push(campaign);
    await saveCampaigns(campaigns);

    // Send messages with delays (async in background)
    sendCampaignMessages(
      contacts,
      template,
      account,
      campaignId,
      delayBefore,
      delayBetween,
      delayUnit,
      randomizeDelay
    ).catch(error => console.error('Campaign send error:', error));

    return NextResponse.json(
      { message: 'Campaign started', campaignId, totalContacts: contacts.length },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: `Failed to start campaign: ${error.message}` },
      { status: 500 }
    );
  }
}

async function sendCampaignMessages(
  contacts: any[],
  template: string,
  account: any,
  campaignId: string,
  delayBefore: number,
  delayBetween: number,
  delayUnit: string,
  randomizeDelay: boolean
) {
  const campaigns = await getCampaigns();
  const campaign = campaigns.find((c: any) => c.id === campaignId);

  if (!campaign) return;

  // Wait before starting
  const beforeDelay = convertDelay(delayBefore, delayUnit);
  await new Promise(resolve => setTimeout(resolve, beforeDelay));

  campaign.startedAt = new Date().toISOString();

  // Send to each contact
  for (const contact of contacts) {
    try {
      const message = await replaceVariables(template, contact);
      const phone = (contact.owner1_mobile || '').replace(/[^0-9+]/g, '');

      if (!phone) {
        campaign.failedCount++;
        continue;
      }

      // Send via WhatsApp API
      const response = await fetch(
        `https://graph.instagram.com/v18.0/${account.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'text',
            text: { body: message },
          }),
        }
      );

      if (response.ok) {
        campaign.sentCount++;
        campaign.messages.push({
          phone,
          unit: contact.unit,
          status: 'sent',
          sentAt: new Date().toISOString(),
        });
      } else {
        campaign.failedCount++;
        campaign.messages.push({
          phone,
          unit: contact.unit,
          status: 'failed',
          failedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      campaign.failedCount++;
    }

    // Wait between messages
    const betweenDelay = convertDelay(delayBetween, delayUnit);
    const randomizedDelay = getRandomDelay(betweenDelay, randomizeDelay);
    await new Promise(resolve => setTimeout(resolve, randomizedDelay));
  }

  campaign.status = 'completed';
  campaign.completedAt = new Date().toISOString();

  await saveCampaigns(campaigns);
}
