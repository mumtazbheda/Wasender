import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/wasender";

export async function POST(request: NextRequest) {
  try {
    const { phones, template, campaignName, delayMs = 1000 } = await request.json();

    if (!phones?.length || !template) {
      return NextResponse.json(
        { success: false, error: "phones array and template are required" },
        { status: 400 }
      );
    }

    // Create campaign record
    const campaignResult = await sql`
      INSERT INTO campaigns (name, template, total_contacts, status)
      VALUES (${campaignName || 'Bulk Send'}, ${template}, ${phones.length}, 'running')
      RETURNING id
    `;
    const campaignId = campaignResult.rows[0].id;

    let sent = 0;
    let failed = 0;
    const errors: { phone: string; error: string }[] = [];

    for (const entry of phones) {
      const phone = typeof entry === "string" ? entry : entry.phone;
      const name = typeof entry === "string" ? "" : entry.name || "";
      const unit = typeof entry === "string" ? "" : entry.unit || "";

      const personalizedText = template
        .replace(/\{name\}/g, name)
        .replace(/\{unit\}/g, unit)
        .replace(/\{phone\}/g, phone);

      const result = await sendWhatsAppMessage(phone, personalizedText);

      if (result.success) {
        sent++;
        await sql`
          INSERT INTO messages (message_id, direction, phone, message_text, wasender_msg_id, status)
          VALUES (${`out_${result.messageId}`}, 'outgoing', ${phone}, ${personalizedText}, ${String(result.messageId)}, 'sent')
        `;
      } else {
        failed++;
        errors.push({ phone, error: result.error || "Unknown error" });
      }

      // Rate limiting delay
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    await sql`
      UPDATE campaigns SET sent_count = ${sent}, failed_count = ${failed}, status = 'completed'
      WHERE id = ${campaignId}
    `;

    return NextResponse.json({ success: true, campaignId, sent, failed, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
