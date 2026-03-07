import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get("phone");
    const direction = request.nextUrl.searchParams.get("direction");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");

    let result;
    if (phone && direction) {
      result = await sql`
        SELECT * FROM messages WHERE phone = ${phone} AND direction = ${direction}
        ORDER BY created_at DESC LIMIT ${limit}
      `;
    } else if (phone) {
      result = await sql`
        SELECT * FROM messages WHERE phone = ${phone}
        ORDER BY created_at DESC LIMIT ${limit}
      `;
    } else if (direction) {
      result = await sql`
        SELECT * FROM messages WHERE direction = ${direction}
        ORDER BY created_at DESC LIMIT ${limit}
      `;
    } else {
      result = await sql`
        SELECT * FROM messages ORDER BY created_at DESC LIMIT ${limit}
      `;
    }

    return NextResponse.json({ success: true, messages: result.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
