import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json({ success: false, error: 'AI summarization is not configured.' }, { status: 503 });
}
