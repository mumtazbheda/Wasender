import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { parseWebhookMessage, WebhookPayload } from "@/lib/wasender";
import crypto from "crypto";

function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env.WASENDER_WEBHOOK_SECRET;
  if (!secret || !signature) return !secret; // skip verification if no secret configured
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature");

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload: WebhookPayload = JSON.parse(rawBody);

    if (payload.event !== "messages.update") {
      return NextResponse.json({ success: true, message: "Event ignored" });
    }

    const { senderPhone, messageText, messageId, fromMe } =
      parseWebhookMessage(payload);

    if (fromMe || !messageText) {
      return NextResponse.json({ success: true, message: "Skipped" });
    }

    await sql`
      INSERT INTO messages (message_id, direction, phone, message_text, status)
      VALUES (${messageId}, 'incoming', ${senderPhone}, ${messageText}, 'received')
      ON CONFLICT (message_id) DO NOTHING
    `;

    return NextResponse.json({ success: true, message: "Message logged" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
