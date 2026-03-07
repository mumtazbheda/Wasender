const WASENDER_BASE_URL = "https://wasenderapi.com/api";

function getApiKey(): string {
  const key = process.env.WASENDER_API_KEY;
  if (!key) throw new Error("WASENDER_API_KEY environment variable is not set");
  return key;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: number;
  status?: string;
  error?: string;
}

export async function sendWhatsAppMessage(
  phone: string,
  text: string
): Promise<SendMessageResult> {
  const response = await fetch(`${WASENDER_BASE_URL}/send-message`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: phone, text }),
  });

  const data = await response.json();

  if (response.ok && data.success) {
    return {
      success: true,
      messageId: data.data.msgId,
      status: data.data.status,
    };
  }

  return {
    success: false,
    error: data.error || `HTTP ${response.status}`,
  };
}

export interface WebhookPayload {
  event: string;
  sessionId: string;
  data: {
    remoteJid: string;
    id: string;
    msgId: number;
    message: {
      conversation?: string;
      extendedTextMessage?: { text: string };
    };
    messageTimestamp: string;
    status: number;
    key?: { fromMe?: boolean };
  };
}

export function parseWebhookMessage(payload: WebhookPayload) {
  const data = payload.data;
  const senderJid = data.remoteJid || "";
  const senderPhone = senderJid.split("@")[0];
  const messageText =
    data.message?.conversation ||
    data.message?.extendedTextMessage?.text ||
    "";
  const messageId = data.id;
  const timestamp = data.messageTimestamp;
  const fromMe = data.key?.fromMe || false;

  return { senderPhone, messageText, messageId, timestamp, fromMe };
}
