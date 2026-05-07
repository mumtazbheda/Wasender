import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getSheetHeadersWithAuth, detectColumns } from '@/lib/sheets';
import { autoMatchHeader } from '@/lib/standard-columns';

// GET /api/sheet-headers?sheetTab=xxx
// Returns headers + auto-matched standard fields for mapping UI
// Add ?debug=true to also return full detectColumns mapping
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken as string | undefined;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated. Please sign in with Google.' },
        { status: 401 }
      );
    }

    const sheetTab = request.nextUrl.searchParams.get('sheetTab');
    if (!sheetTab) {
      return NextResponse.json({ success: false, error: 'sheetTab is required' }, { status: 400 });
    }

    const headers = await getSheetHeadersWithAuth(accessToken, sheetTab);

    // Auto-match each header to a standard field
    const headerMatches = headers.map(header => ({
      header,
      autoMatch: autoMatchHeader(header),
    }));

    // Debug mode: also return detectColumns result (field → header name it resolved to)
    const isDebug = request.nextUrl.searchParams.get('debug') === 'true';
    let detectResult: Record<string, { index: number; header: string | null }> | undefined;
    if (isDebug) {
      const indices = detectColumns(headers);
      detectResult = {} as Record<string, { index: number; header: string | null }>;
      for (const [field, idx] of Object.entries(indices)) {
        detectResult[field] = { index: idx, header: idx >= 0 ? headers[idx] : null };
      }
    }

    return NextResponse.json({
      success: true,
      headers: headerMatches,
      ...(isDebug ? { detectColumns: detectResult } : {}),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
