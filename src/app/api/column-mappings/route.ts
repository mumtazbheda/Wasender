import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/column-mappings?sheetTab=xxx  — fetch all mappings for a tab
// GET /api/column-mappings               — fetch all mappings (all tabs)
export async function GET(request: NextRequest) {
  try {
    const sheetTab = request.nextUrl.searchParams.get('sheetTab');

    let rows;
    if (sheetTab) {
      const result = await sql`
        SELECT sheet_tab, source_header, standard_field
        FROM column_mappings
        WHERE sheet_tab = ${sheetTab}
        ORDER BY source_header
      `;
      rows = result.rows;
    } else {
      const result = await sql`
        SELECT sheet_tab, source_header, standard_field
        FROM column_mappings
        ORDER BY sheet_tab, source_header
      `;
      rows = result.rows;
    }

    // Also return list of tabs that have mappings
    const tabsResult = await sql`SELECT DISTINCT sheet_tab FROM column_mappings ORDER BY sheet_tab`;

    return NextResponse.json({
      success: true,
      mappings: rows,
      tabs: tabsResult.rows.map(r => r.sheet_tab),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/column-mappings — upsert mappings for a sheet tab
// Body: { sheetTab: string, mappings: { source_header: string, standard_field: string }[] }
export async function POST(request: NextRequest) {
  try {
    const { sheetTab, mappings } = await request.json();

    if (!sheetTab || !Array.isArray(mappings)) {
      return NextResponse.json({ success: false, error: 'sheetTab and mappings array required' }, { status: 400 });
    }

    let upserted = 0;
    for (const m of mappings) {
      if (!m.source_header || !m.standard_field) continue;
      await sql`
        INSERT INTO column_mappings (sheet_tab, source_header, standard_field)
        VALUES (${sheetTab}, ${m.source_header}, ${m.standard_field})
        ON CONFLICT (sheet_tab, source_header)
        DO UPDATE SET standard_field = EXCLUDED.standard_field
      `;
      upserted++;
    }

    return NextResponse.json({ success: true, upserted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/column-mappings?sheetTab=xxx  — delete all mappings for a tab
export async function DELETE(request: NextRequest) {
  try {
    const sheetTab = request.nextUrl.searchParams.get('sheetTab');
    if (!sheetTab) {
      return NextResponse.json({ success: false, error: 'sheetTab required' }, { status: 400 });
    }

    await sql`DELETE FROM column_mappings WHERE sheet_tab = ${sheetTab}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
