import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { fetchContactData } from "@/lib/sheets";
import { sql } from "@/lib/db";

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

    const sheetName = request.nextUrl.searchParams.get("sheetName");
    if (!sheetName) {
      return NextResponse.json(
        { success: false, error: "Sheet name is required" },
        { status: 400 }
      );
    }

    // Load saved column mappings for this tab from DB
    const savedMappings: Record<string, string> = {};
    try {
      const mappingsRes = await sql`
        SELECT source_header, standard_field FROM column_mappings WHERE sheet_tab = ${sheetName}
      `;
      for (const row of mappingsRes.rows) {
        savedMappings[row.source_header] = row.standard_field;
      }
    } catch { /* table may not exist yet — ignore */ }

    const contacts = await fetchContactData(accessToken, sheetName, savedMappings);

    return NextResponse.json({
      success: true,
      contacts: contacts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
