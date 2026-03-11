import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { fetchContactData } from "@/lib/sheets";

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

    const data = await fetchContactData(accessToken, sheetName);

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
