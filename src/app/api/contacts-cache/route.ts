import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/contacts-cache            → list all saved sheets
// GET /api/contacts-cache?sheet=X    → return contacts for sheet X
export async function GET(request: NextRequest) {
  try {
    const sheet = request.nextUrl.searchParams.get('sheet');

    if (sheet) {
      // Return contacts for a specific sheet
      const result = await sql`
        SELECT contacts, contact_count, synced_at
        FROM sheets_data_cache
        WHERE sheet_name = ${sheet}
      `;
      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'No cached data for this sheet' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        contacts: result.rows[0].contacts,
        contact_count: result.rows[0].contact_count,
        synced_at: result.rows[0].synced_at,
      });
    }

    // Return list of all cached sheets
    const result = await sql`
      SELECT sheet_name, contact_count, synced_at
      FROM sheets_data_cache
      ORDER BY synced_at DESC
    `;
    return NextResponse.json({ success: true, sheets: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/contacts-cache → save all contacts for a sheet
// Body: { sheetName: string, contacts: Contact[] }
export async function POST(request: NextRequest) {
  try {
    const { sheetName, contacts } = await request.json();

    if (!sheetName || !Array.isArray(contacts)) {
      return NextResponse.json({ success: false, error: 'sheetName and contacts array are required' }, { status: 400 });
    }

    await sql`
      INSERT INTO sheets_data_cache (sheet_name, contacts, contact_count, synced_at)
      VALUES (${sheetName}, ${JSON.stringify(contacts)}, ${contacts.length}, NOW())
      ON CONFLICT (sheet_name) DO UPDATE SET
        contacts = EXCLUDED.contacts,
        contact_count = EXCLUDED.contact_count,
        synced_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      message: `Saved ${contacts.length} contacts for "${sheetName}"`,
      count: contacts.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/contacts-cache → update a single contact in the cache
// Body: { sheetName: string, rowIndex: number, updates: Record<string, any> }
export async function PATCH(request: NextRequest) {
  try {
    const { sheetName, rowIndex, updates } = await request.json();

    if (!sheetName || rowIndex === undefined || !updates) {
      return NextResponse.json({ success: false, error: 'sheetName, rowIndex, and updates are required' }, { status: 400 });
    }

    // Fetch existing contacts
    const result = await sql`
      SELECT contacts FROM sheets_data_cache WHERE sheet_name = ${sheetName}
    `;
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No cached data for this sheet' }, { status: 404 });
    }

    const contacts: any[] = result.rows[0].contacts;
    const idx = contacts.findIndex((c: any) => c.rowIndex === rowIndex);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Contact not found in cache' }, { status: 404 });
    }

    // Merge updates into the contact
    contacts[idx] = { ...contacts[idx], ...updates };

    await sql`
      UPDATE sheets_data_cache
      SET contacts = ${JSON.stringify(contacts)}, synced_at = synced_at
      WHERE sheet_name = ${sheetName}
    `;

    return NextResponse.json({ success: true, message: 'Contact updated in cache' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
