import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { updateSheetCell, getSheetHeadersWithAuth, getFeedbackColumnIndices } from "@/lib/sheets";

// This endpoint handles both:
// 1. Internal calls from send-campaign (using x-internal-key header)
// 2. Direct calls with session auth
export async function POST(request: NextRequest) {
  try {
    const internalKey = request.headers.get('x-internal-key');
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (session as any)?.accessToken as string | undefined;

    // Must have either internal key or session
    if (!internalKey && !accessToken) {
      return NextResponse.json(
        { success: false, error: "Not authenticated." },
        { status: 401 }
      );
    }

    // For internal calls, we need the session token to access Google Sheets
    // If no access token, we can't update the sheet
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "No Google access token available. Sheet update skipped." },
        { status: 200 } // Not an error - just can't update
      );
    }

    const body = await request.json();
    
    // Simple cell update
    if (body.sheetTab && body.rowIndex !== undefined && body.columnIndex !== undefined && body.value !== undefined) {
      await updateSheetCell(accessToken, body.sheetTab, body.rowIndex, body.columnIndex, body.value);
      return NextResponse.json({ success: true, message: "Cell updated" });
    }

    // Batch feedback update after campaign
    if (body.action === 'update-feedback') {
      const { sheetTab, accountName, updates } = body;
      // updates: [{ rowIndex, ownerNum }]
      
      if (!sheetTab || !accountName || !updates?.length) {
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
      }

      const headers = await getSheetHeadersWithAuth(accessToken, sheetTab);
      const feedbackCols = getFeedbackColumnIndices(headers, accountName);
      
      let updated = 0;
      for (const update of updates) {
        const colIndex = feedbackCols[update.ownerNum as number];
        if (colIndex >= 0) {
          const timestamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          await updateSheetCell(accessToken, sheetTab, update.rowIndex, colIndex, `Message Sent - ${timestamp}`);
          updated++;
        }
      }

      return NextResponse.json({ success: true, message: `Updated ${updated} feedback cells` });
    }

    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
