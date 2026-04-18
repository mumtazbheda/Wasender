import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const fileName = searchParams.get("file");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "500");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = `SELECT * FROM gmb_contacts WHERE 1=1`;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND whatsapp_status = $${paramIndex++}`;
      params.push(status);
    }
    if (category) {
      query += ` AND LOWER(category) = LOWER($${paramIndex++})`;
      params.push(category);
    }
    if (city) {
      query += ` AND LOWER(city) = LOWER($${paramIndex++})`;
      params.push(city);
    }
    if (fileName) {
      query += ` AND file_name = $${paramIndex++}`;
      params.push(fileName);
    }
    if (search) {
      query += ` AND (LOWER(business_name) LIKE LOWER($${paramIndex}) OR phone LIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await sql.query(query, params);

    const countQuery = query
      .replace(/SELECT \*/, "SELECT COUNT(*)")
      .replace(/ORDER BY.*$/, "");
    const countParams = params.slice(0, -2);
    const countResult = await sql.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0]?.count || "0");

    const statsResult = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE whatsapp_status = 'not_sent') as not_sent,
        COUNT(*) FILTER (WHERE whatsapp_status = 'sent') as sent,
        COUNT(*) FILTER (WHERE whatsapp_status = 'failed') as failed,
        COUNT(*) FILTER (WHERE whatsapp_status = 'invalid') as invalid
      FROM gmb_contacts
    `;

    const filesResult = await sql`
      SELECT DISTINCT file_name, COUNT(*) as count
      FROM gmb_contacts
      GROUP BY file_name
      ORDER BY file_name
    `;

    const categoriesResult = await sql`
      SELECT DISTINCT category, COUNT(*) as count
      FROM gmb_contacts
      WHERE category != ''
      GROUP BY category
      ORDER BY count DESC
      LIMIT 50
    `;

    const citiesResult = await sql`
      SELECT DISTINCT city, COUNT(*) as count
      FROM gmb_contacts
      WHERE city != ''
      GROUP BY city
      ORDER BY count DESC
      LIMIT 50
    `;

    return NextResponse.json({
      success: true,
      contacts: result.rows,
      totalCount,
      stats: statsResult.rows[0],
      files: filesResult.rows,
      categories: categoriesResult.rows,
      cities: citiesResult.rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { ids, deleteAll, fileName } = await request.json();

    if (deleteAll) {
      if (fileName) {
        await sql`DELETE FROM gmb_contacts WHERE file_name = ${fileName}`;
      } else {
        await sql`DELETE FROM gmb_contacts`;
      }
      return NextResponse.json({ success: true });
    }

    if (ids && ids.length > 0) {
      const placeholders = ids.map((_: number, i: number) => `$${i + 1}`).join(",");
      await sql.query(`DELETE FROM gmb_contacts WHERE id IN (${placeholders})`, ids);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "No ids or deleteAll provided" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
