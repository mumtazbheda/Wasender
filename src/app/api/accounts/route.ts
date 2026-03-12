import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const ACCOUNTS_FILE = path.join(process.cwd(), 'data', 'accounts.json');

async function ensureAccountsFile() {
  try {
    await fs.access(ACCOUNTS_FILE);
  } catch {
    const dir = path.dirname(ACCOUNTS_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(ACCOUNTS_FILE, JSON.stringify([], null, 2));
  }
}

async function getAccounts() {
  await ensureAccountsFile();
  const data = await fs.readFile(ACCOUNTS_FILE, 'utf-8');
  return JSON.parse(data);
}

async function saveAccounts(accounts: any[]) {
  await ensureAccountsFile();
  await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}

export async function GET() {
  try {
    const accounts = await getAccounts();
    return NextResponse.json({ accounts }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, accessToken, businessAccountId, phoneNumberId } = body;

    if (!name || !phone || !accessToken || !businessAccountId || !phoneNumberId) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const accounts = await getAccounts();
    const newAccount = {
      id: Date.now().toString(),
      name,
      phone,
      accessToken,
      businessAccountId,
      phoneNumberId,
      status: 'active' as const,
      connectedAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    await saveAccounts(accounts);

    return NextResponse.json({ account: newAccount }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to create account' }, { status: 500 });
  }
}
