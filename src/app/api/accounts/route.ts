import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const envApiKey = process.env.WASENDER_API_KEY;
    
    let result = await sql`SELECT * FROM wa_accounts ORDER BY connected_at ASC`;
    
    // Auto-create Ahmed account if none exist and env key is set
    if (result.rows.length === 0 && envApiKey) {
      await sql`
        INSERT INTO wa_accounts (name, phone, api_key, account_type, status)
        VALUES ('Ahmed', '', ${envApiKey}, 'wasender', 'active')
      `;
      result = await sql`SELECT * FROM wa_accounts ORDER BY connected_at ASC`;
    }
    
    const accounts = result.rows.map((a: any) => ({
      ...a,
      api_key: a.api_key ? '***' + a.api_key.slice(-4) : '',
      api_key_full: undefined // never expose
    }));
    
    return NextResponse.json({ accounts }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed to fetch accounts: ' + error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, apiKey, accountType, businessAccountId, phoneNumberId } = body;
    
    if (!name || !apiKey) {
      return NextResponse.json({ message: 'Name and API Key are required' }, { status: 400 });
    }
    
    const result = await sql`
      INSERT INTO wa_accounts (name, phone, api_key, account_type, business_account_id, phone_number_id, status)
      VALUES (${name}, ${phone || ''}, ${apiKey}, ${accountType || 'wasender'}, ${businessAccountId || ''}, ${phoneNumberId || ''}, 'active')
      RETURNING *
    `;
    
    const account = result.rows[0];
    return NextResponse.json({ 
      account: { ...account, api_key: '***' + account.api_key.slice(-4) }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed to create account: ' + error.message }, { status: 500 });
  }
}
