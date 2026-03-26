import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { unitName, ownerName, sentMessage, replies } = await request.json();

    if (!replies || replies.length === 0) {
      return NextResponse.json({ success: false, error: 'No replies to summarize' }, { status: 400 });
    }

    const conversationText = [
      `[You sent]: ${sentMessage}`,
      ...replies.map((r: any) => `[${ownerName || 'Owner'} replied]: ${r.text}`),
    ].join('\n');

    const prompt = `You are a real estate assistant summarizing a WhatsApp conversation for a CRM status update.

Unit: ${unitName || 'Unknown'}
Owner: ${ownerName || 'Unknown'}

Conversation:
${conversationText}

Write a short, factual 1-2 sentence status summary of this conversation for the CRM status field.
Focus on: their current situation, intentions (sell/rent/hold), any property mentioned, and next action needed.
Be concise and professional. Examples:
- "Owner not interested in selling. Has another unit in Costa Brava."
- "Interested in renting out. Requested callback next week."
- "Confirmed unit is vacant, open to listing. Follow up needed."

Write only the status summary, nothing else.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = (message.content[0] as any).text?.trim() || '';
    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
