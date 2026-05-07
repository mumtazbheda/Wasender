import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getSheetHeadersWithAuth } from '@/lib/sheets';
import { autoMatchHeader } from '@/lib/standard-columns';

// GET /api/sheet-headers?sheetTab=xxx
// Returns headers + auto-matched standard fields for mapping UI
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

    return NextResponse.json({ success: true, headers: headerMatches });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
