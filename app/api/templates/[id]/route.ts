import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, body } = await request.json();
    if (!name || !body) {
      return NextResponse.json({ success: false, error: "name and body are required" }, { status: 400 });
    }
    const result = await sql`
      UPDATE templates SET name = ${name}, body = ${body} WHERE id = ${id} RETURNING id, name, body, created_at
    `;
    return NextResponse.json({ success: true, template: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await sql`DELETE FROM templates WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
