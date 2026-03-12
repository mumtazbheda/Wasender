import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, phone, apiKey, accountType, businessAccountId, phoneNumberId, status } = body;
    
    if (apiKey) {
      await sql`
        UPDATE wa_accounts 
        SET name = COALESCE(${name}, name), 
            phone = COALESCE(${phone}, phone),
            api_key = ${apiKey},
            account_type = COALESCE(${accountType}, account_type),
            business_account_id = COALESCE(${businessAccountId}, business_account_id),
            phone_number_id = COALESCE(${phoneNumberId}, phone_number_id),
            status = COALESCE(${status}, status)
        WHERE id = ${parseInt(id)}
      `;
    } else {
      await sql`
        UPDATE wa_accounts 
        SET name = COALESCE(${name}, name), 
            phone = COALESCE(${phone}, phone),
            account_type = COALESCE(${accountType}, account_type),
            business_account_id = COALESCE(${businessAccountId}, business_account_id),
            phone_number_id = COALESCE(${phoneNumberId}, phone_number_id),
            status = COALESCE(${status}, status)
        WHERE id = ${parseInt(id)}
      `;
    }
    
    const result = await sql`SELECT * FROM wa_accounts WHERE id = ${parseInt(id)}`;
    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }
    
    const account = result.rows[0];
    return NextResponse.json({ 
      account: { ...account, api_key: '***' + account.api_key.slice(-4) }
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed to update: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await sql`DELETE FROM wa_accounts WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ message: 'Account deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed to delete: ' + error.message }, { status: 500 });
  }
}
