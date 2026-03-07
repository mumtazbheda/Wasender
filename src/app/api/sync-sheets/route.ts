import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { fetchContactsFromSheet } from "@/lib/sheets";

export async function POST() {
  try {
    const contacts = await fetchContactsFromSheet();
    let synced = 0;

    for (const contact of contacts) {
      await sql`
        INSERT INTO contacts (unit_number, owner_name, phone, ahmed_feedback_1, ahmed_feedback_2, ahmed_feedback_3, contact_status)
        VALUES (${contact.unitNumber}, ${contact.ownerName}, ${contact.phone}, ${contact.ahmedFeedback1}, ${contact.ahmedFeedback2}, ${contact.ahmedFeedback3}, 'Synced')
        ON CONFLICT (unit_number) DO UPDATE SET
          owner_name = COALESCE(EXCLUDED.owner_name, contacts.owner_name),
          phone = EXCLUDED.phone,
          ahmed_feedback_1 = COALESCE(EXCLUDED.ahmed_feedback_1, contacts.ahmed_feedback_1),
          ahmed_feedback_2 = COALESCE(EXCLUDED.ahmed_feedback_2, contacts.ahmed_feedback_2),
          ahmed_feedback_3 = COALESCE(EXCLUDED.ahmed_feedback_3, contacts.ahmed_feedback_3),
          last_updated = NOW()
      `;
      synced++;
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} contacts from Google Sheets`,
      count: synced,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
