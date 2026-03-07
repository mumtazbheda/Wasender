import { google } from "googleapis";

export interface SheetContact {
  unitNumber: string;
  ownerName: string;
  phone: string;
  ahmedFeedback1: string;
  ahmedFeedback2: string;
  ahmedFeedback3: string;
}

export interface SheetRow {
  rowIndex: number; // 1-based row number in sheet (for updating)
  unitNumber: string;
  ownerName: string;
  phone: string;
  ahmedFeedback1: string;
  ahmedFeedback2: string;
  ahmedFeedback3: string;
}

function getSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

export async function fetchSheetTabs(accessToken: string): Promise<string[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  const sheets = getSheetsClient(accessToken);
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const tabs =
    res.data.sheets?.map((s) => s.properties?.title || "").filter(Boolean) ||
    [];
  return tabs;
}

export async function fetchContactsFromSheet(
  accessToken: string,
  sheetTab: string
): Promise<SheetContact[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  const sheets = getSheetsClient(accessToken);
  const range = `'${sheetTab}'`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) return [];

  // First row is headers
  const headers = rows[0].map((h: string) => h.toString().trim().toLowerCase());
  const getIndex = (names: string[]) =>
    headers.findIndex((h: string) => names.includes(h));

  const unitIdx = getIndex(["unit number", "unit_number"]);
  const nameIdx = getIndex(["owner name", "owner_name"]);
  const phoneIdx = getIndex(["phone number", "phone"]);
  const fb1Idx = getIndex(["ahmed feedback 1"]);
  const fb2Idx = getIndex(["ahmed feedback 2"]);
  const fb3Idx = getIndex(["ahmed feedback 3"]);

  const contacts: SheetContact[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const phone = phoneIdx >= 0 ? (row[phoneIdx] || "").toString() : "";
    if (!phone) continue;

    contacts.push({
      unitNumber: unitIdx >= 0 ? (row[unitIdx] || "").toString() : "",
      ownerName: nameIdx >= 0 ? (row[nameIdx] || "").toString() : "",
      phone: phone.replace(/[^0-9+]/g, ""),
      ahmedFeedback1: fb1Idx >= 0 ? (row[fb1Idx] || "").toString() : "",
      ahmedFeedback2: fb2Idx >= 0 ? (row[fb2Idx] || "").toString() : "",
      ahmedFeedback3: fb3Idx >= 0 ? (row[fb3Idx] || "").toString() : "",
    });
  }

  return contacts;
}

// Fetch raw sheet data with row indices for the campaign system
export async function fetchSheetRows(
  accessToken: string,
  sheetTab: string
): Promise<{ headers: string[]; rows: SheetRow[]; feedbackColumnIndices: { fb1: number; fb2: number; fb3: number } }> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  const sheets = getSheetsClient(accessToken);
  const range = `'${sheetTab}'`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rawRows = res.data.values;
  if (!rawRows || rawRows.length < 2) return { headers: [], rows: [], feedbackColumnIndices: { fb1: -1, fb2: -1, fb3: -1 } };

  const headers = rawRows[0].map((h: string) => h.toString().trim());
  const headersLower = headers.map((h: string) => h.toLowerCase());
  const getIndex = (names: string[]) =>
    headersLower.findIndex((h: string) => names.includes(h));

  const unitIdx = getIndex(["unit number", "unit_number"]);
  const nameIdx = getIndex(["owner name", "owner_name"]);
  const phoneIdx = getIndex(["phone number", "phone"]);
  const fb1Idx = getIndex(["ahmed feedback 1"]);
  const fb2Idx = getIndex(["ahmed feedback 2"]);
  const fb3Idx = getIndex(["ahmed feedback 3"]);

  const rows: SheetRow[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const phone = phoneIdx >= 0 ? (row[phoneIdx] || "").toString() : "";
    if (!phone) continue;

    rows.push({
      rowIndex: i + 1, // 1-based (row 1 is header, data starts at row 2)
      unitNumber: unitIdx >= 0 ? (row[unitIdx] || "").toString() : "",
      ownerName: nameIdx >= 0 ? (row[nameIdx] || "").toString() : "",
      phone: phone.replace(/[^0-9+]/g, ""),
      ahmedFeedback1: fb1Idx >= 0 ? (row[fb1Idx] || "").toString() : "",
      ahmedFeedback2: fb2Idx >= 0 ? (row[fb2Idx] || "").toString() : "",
      ahmedFeedback3: fb3Idx >= 0 ? (row[fb3Idx] || "").toString() : "",
    });
  }

  return { headers, rows, feedbackColumnIndices: { fb1: fb1Idx, fb2: fb2Idx, fb3: fb3Idx } };
}

// Update a specific cell in the Google Sheet
export async function updateSheetCell(
  accessToken: string,
  sheetTab: string,
  rowIndex: number, // 1-based row number
  columnIndex: number, // 0-based column index
  value: string
): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  const sheets = getSheetsClient(accessToken);

  // Convert column index to letter (0=A, 1=B, 25=Z, 26=AA)
  const colLetter = columnIndexToLetter(columnIndex);
  const range = `'${sheetTab}'!${colLetter}${rowIndex}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [[value]],
    },
  });
}

function columnIndexToLetter(index: number): string {
  let letter = "";
  let i = index;
  while (i >= 0) {
    letter = String.fromCharCode((i % 26) + 65) + letter;
    i = Math.floor(i / 26) - 1;
  }
  return letter;
}
