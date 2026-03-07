import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/wasender";

export async function POST(request: NextRequest) {
  try {
    const { phone, text } = await request.json();

    if (!phone || !text) {
      return NextResponse.json(
        { success: false, error: "phone and text are required" },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessage(phone, text);

    if (result.success) {
      await sql`
        INSERT INTO messages (message_id, direction, phone, message_text, wasender_msg_id, status)
        VALUES (${`out_${result.messageId}`}, 'outgoing', ${phone}, ${text}, ${String(result.messageId)}, ${result.status || 'sent'})
      `;
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
