import { NextRequest, NextResponse } from "next/server";
import { sql, initializeDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initializeDatabase();
    const result = await sql`SELECT * FROM templates ORDER BY created_at DESC`;
    return NextResponse.json({ success: true, templates: result.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    const { name, body } = await request.json();
    if (!name || !body) {
      return NextResponse.json({ success: false, error: "name and body are required" }, { status: 400 });
    }
    const result = await sql`
      INSERT INTO templates (name, body) VALUES (${name}, ${body}) RETURNING *
    `;
    return NextResponse.json({ success: true, template: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
