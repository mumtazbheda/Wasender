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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, accessToken, businessAccountId, phoneNumberId } = body;

    const accounts = await getAccounts();
    const index = accounts.findIndex((a: any) => a.id === id);

    if (index === -1) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    accounts[index] = {
      ...accounts[index],
      name,
      phone,
      accessToken,
      businessAccountId,
      phoneNumberId,
    };

    await saveAccounts(accounts);
    return NextResponse.json({ account: accounts[index] }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to update account' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accounts = await getAccounts();
    const filtered = accounts.filter((a: any) => a.id !== id);

    if (filtered.length === accounts.length) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    await saveAccounts(filtered);
    return NextResponse.json({ message: 'Account deleted' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to delete account' }, { status: 500 });
  }
}
