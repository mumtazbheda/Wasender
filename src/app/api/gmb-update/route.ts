import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { id, whatsapp_status } = await request.json();

    if (!id || !whatsapp_status) {
      return NextResponse.json(
        { success: false, error: "id and whatsapp_status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["not_sent", "sent", "failed", "invalid"];
    if (!validStatuses.includes(whatsapp_status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const sentAt = whatsapp_status === "sent" ? new Date().toISOString() : null;

    await sql`
      UPDATE gmb_contacts
      SET whatsapp_status = ${whatsapp_status}, sent_at = ${sentAt}
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { ids, whatsapp_status } = await request.json();

    if (!ids?.length || !whatsapp_status) {
      return NextResponse.json(
        { success: false, error: "ids array and whatsapp_status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["not_sent", "sent", "failed", "invalid"];
    if (!validStatuses.includes(whatsapp_status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const sentAt = whatsapp_status === "sent" ? new Date().toISOString() : null;
    const placeholders = ids.map((_: number, i: number) => `$${i + 1}`).join(",");

    await sql.query(
      `UPDATE gmb_contacts SET whatsapp_status = $${ids.length + 1}, sent_at = $${ids.length + 2} WHERE id IN (${placeholders})`,
      [...ids, whatsapp_status, sentAt]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
