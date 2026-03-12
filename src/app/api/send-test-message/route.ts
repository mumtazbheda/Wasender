import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const ACCOUNTS_FILE = path.join(process.cwd(), 'data', 'accounts.json');

async function getAccounts() {
  try {
    const data = await fs.readFile(ACCOUNTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function replaceVariables(template: string, contact: any) {
  return template
    .replace(/{name}/g, contact.owner1_name || '')
    .replace(/{unit}/g, contact.unit || '')
    .replace(/{rooms_en}/g, contact.rooms_en || '')
    .replace(/{project_name_en}/g, contact.project_name_en || '')
    .replace(/{phone}/g, contact.owner1_mobile || '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, template, contact, accountId } = body;

    if (!phone || !template || !accountId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const accounts = await getAccounts();
    const account = accounts.find((a: any) => a.id === accountId);

    if (!account) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    // Replace variables in template
    const message = await replaceVariables(template, contact);

    // Send via WhatsApp API
    const whatsappResponse = await fetch(
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
          to: phone.replace(/[^0-9+]/g, ''),
          type: 'text',
          text: { body: message },
        }),
      }
    );

    if (!whatsappResponse.ok) {
      const error = await whatsappResponse.json();
      return NextResponse.json(
        { message: `Failed to send message: ${JSON.stringify(error)}` },
        { status: 400 }
      );
    }

    const result = await whatsappResponse.json();
    return NextResponse.json({ message: 'Test message sent successfully', result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: `Failed to send test message: ${error.message}` },
      { status: 500 }
    );
  }
}
