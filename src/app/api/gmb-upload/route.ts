import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const text = await file.text();

    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { success: false, error: `CSV parse error: ${parsed.errors[0].message}` },
        { status: 400 }
      );
    }

    const rows = parsed.data as Record<string, string>[];
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "File contains no data rows" },
        { status: 400 }
      );
    }

    const headers = parsed.meta.fields || Object.keys(rows[0]);
    const headersLower = headers.map((h) => h.toLowerCase());

    const findCol = (names: string[]) => {
      const idx = headersLower.findIndex((h) =>
        names.some((n) => h.includes(n))
      );
      return idx >= 0 ? headers[idx] : null;
    };

    const phoneCol = findCol(["phone", "mobile", "whatsapp", "tel", "contact number"]);
    const nameCol = findCol(["business name", "name", "company", "title"]);
    const categoryCol = findCol(["category", "type", "industry"]);
    const addressCol = findCol(["address", "location", "street"]);
    const cityCol = findCol(["city", "area", "district", "region"]);
    const ratingCol = findCol(["rating", "stars", "score"]);
    const reviewsCol = findCol(["reviews", "review count", "total reviews"]);
    const websiteCol = findCol(["website", "url", "web", "site"]);

    if (!phoneCol) {
      return NextResponse.json(
        {
          success: false,
          error: `No phone column found. Available columns: ${headers.join(", ")}`,
          headers,
        },
        { status: 400 }
      );
    }

    const knownCols = new Set(
      [phoneCol, nameCol, categoryCol, addressCol, cityCol, ratingCol, reviewsCol, websiteCol].filter(Boolean)
    );

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const phone = (row[phoneCol] || "").toString().replace(/[^0-9+]/g, "");
      if (!phone) {
        skipped++;
        continue;
      }

      const extraData: Record<string, string> = {};
      for (const h of headers) {
        if (!knownCols.has(h) && row[h]) {
          extraData[h] = row[h];
        }
      }

      await sql`
        INSERT INTO gmb_contacts (file_name, business_name, phone, category, address, city, rating, reviews, website, extra_data)
        VALUES (
          ${fileName},
          ${nameCol ? (row[nameCol] || "") : ""},
          ${phone},
          ${categoryCol ? (row[categoryCol] || "") : ""},
          ${addressCol ? (row[addressCol] || "") : ""},
          ${cityCol ? (row[cityCol] || "") : ""},
          ${ratingCol ? (row[ratingCol] || "") : ""},
          ${reviewsCol ? (row[reviewsCol] || "") : ""},
          ${websiteCol ? (row[websiteCol] || "") : ""},
          ${JSON.stringify(extraData)}
        )
      `;
      inserted++;
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      total: rows.length,
      detectedColumns: {
        phone: phoneCol,
        businessName: nameCol,
        category: categoryCol,
        address: addressCol,
        city: cityCol,
        rating: ratingCol,
        reviews: reviewsCol,
        website: websiteCol,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
