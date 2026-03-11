import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { fetchSheetRows } from "@/lib/sheets";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (session as any)?.accessToken as string | undefined;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Not authenticated with Google." },
        { status: 401 }
      );
    }

    const sheetTab = request.nextUrl.searchParams.get("tab") || "Time 1";
    const data = await fetchSheetRows(accessToken, sheetTab);

    return NextResponse.json({
      success: true,
      headers: data.headers,
      rows: data.rows,
      feedbackColumnIndices: data.feedbackColumnIndices,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
