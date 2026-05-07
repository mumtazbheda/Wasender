import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/custom-columns — list all custom columns
export async function GET() {
  try {
    const result = await sql`
      SELECT id, field_key, display_name, column_type, created_at
      FROM custom_columns
      ORDER BY created_at
    `;
    return NextResponse.json({ success: true, columns: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/custom-columns — create a new custom column
// Body: { display_name: string, column_type: string }
export async function POST(request: NextRequest) {
  try {
    const { display_name, column_type } = await request.json();

    if (!display_name) {
      return NextResponse.json({ success: false, error: 'display_name required' }, { status: 400 });
    }

    const validTypes = ['text', 'number', 'currency', 'name', 'string', 'date', 'phone', 'email', 'url'];
    const type = validTypes.includes(column_type) ? column_type : 'text';

    // Generate field_key from display_name (snake_case, prefixed with custom_)
    const field_key = 'custom_' + display_name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 40);

    const result = await sql`
      INSERT INTO custom_columns (field_key, display_name, column_type)
      VALUES (${field_key}, ${display_name}, ${type})
      ON CONFLICT (field_key) DO UPDATE SET display_name = EXCLUDED.display_name, column_type = EXCLUDED.column_type
      RETURNING id, field_key, display_name, column_type
    `;

    return NextResponse.json({ success: true, column: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/custom-columns?fieldKey=xxx — delete a custom column
export async function DELETE(request: NextRequest) {
  try {
    const fieldKey = request.nextUrl.searchParams.get('fieldKey');
    if (!fieldKey) {
      return NextResponse.json({ success: false, error: 'fieldKey required' }, { status: 400 });
    }

    await sql`DELETE FROM custom_columns WHERE field_key = ${fieldKey}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
