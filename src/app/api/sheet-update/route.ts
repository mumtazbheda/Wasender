import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { updateSheetCell } from "@/lib/sheets";

export async function POST(request: NextRequest) {
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

    const { sheetTab, updates } = await request.json();
    // updates is an array of { rowIndex, columnIndex, value }

    if (!sheetTab || !updates?.length) {
      return NextResponse.json(
        { success: false, error: "sheetTab and updates array are required" },
        { status: 400 }
      );
    }

    for (const update of updates) {
      await updateSheetCell(
        accessToken,
        sheetTab,
        update.rowIndex,
        update.columnIndex,
        update.value
      );
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} cells`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
