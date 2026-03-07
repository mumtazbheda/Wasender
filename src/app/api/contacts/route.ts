import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const result = await sql`
      SELECT * FROM contacts ORDER BY last_updated DESC
    `;
    return NextResponse.json({ success: true, contacts: result.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { unitNumber, ownerName, phone, contactStatus } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "phone is required" },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO contacts (unit_number, owner_name, phone, contact_status)
      VALUES (${unitNumber || null}, ${ownerName || null}, ${phone}, ${contactStatus || 'New'})
      ON CONFLICT (unit_number) DO UPDATE SET
        owner_name = COALESCE(EXCLUDED.owner_name, contacts.owner_name),
        phone = EXCLUDED.phone,
        contact_status = COALESCE(EXCLUDED.contact_status, contacts.contact_status),
        last_updated = NOW()
      RETURNING *
    `;

    return NextResponse.json({ success: true, contact: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
