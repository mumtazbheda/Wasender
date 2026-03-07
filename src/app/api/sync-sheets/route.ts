import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sql } from "@/lib/db";
import { fetchContactsFromSheet } from "@/lib/sheets";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (session as any)?.accessToken as string | undefined;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Not authenticated with Google. Please click 'Connect Google Account' first." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const sheetTab = body.sheetTab || "Time 1 New";

    const contacts = await fetchContactsFromSheet(accessToken, sheetTab);
    let synced = 0;

    for (const contact of contacts) {
      await sql`
        INSERT INTO contacts (unit_number, owner_name, phone, mobile2, mobile3, ahmed_feedback_1, ahmed_feedback_2, ahmed_feedback_3, contact_status)
        VALUES (${contact.unitNumber}, ${contact.ownerName}, ${contact.phone}, ${contact.mobile2 || null}, ${contact.mobile3 || null}, ${contact.ahmedFeedback1}, ${contact.ahmedFeedback2}, ${contact.ahmedFeedback3}, 'Synced')
        ON CONFLICT (unit_number) DO UPDATE SET
          owner_name = COALESCE(EXCLUDED.owner_name, contacts.owner_name),
          phone = EXCLUDED.phone,
          mobile2 = COALESCE(EXCLUDED.mobile2, contacts.mobile2),
          mobile3 = COALESCE(EXCLUDED.mobile3, contacts.mobile3),
          ahmed_feedback_1 = COALESCE(EXCLUDED.ahmed_feedback_1, contacts.ahmed_feedback_1),
          ahmed_feedback_2 = COALESCE(EXCLUDED.ahmed_feedback_2, contacts.ahmed_feedback_2),
          ahmed_feedback_3 = COALESCE(EXCLUDED.ahmed_feedback_3, contacts.ahmed_feedback_3),
          last_updated = NOW()
      `;
      synced++;
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} contacts from "${sheetTab}" tab`,
      count: synced,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
