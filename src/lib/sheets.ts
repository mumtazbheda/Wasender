import { google } from "googleapis";

export interface SheetContact {
  unitNumber: string;
  ownerName: string;
  phone: string;
  mobile2: string;
  mobile3: string;
  ahmedFeedback1: string;
  ahmedFeedback2: string;
  ahmedFeedback3: string;
}

export interface SheetRow {
  rowIndex: number; // 1-based row number in sheet (for updating)
  unitNumber: string;
  ownerName: string;
  phone: string;
  mobile2: string;
  mobile3: string;
  ahmedFeedback1: string;
  ahmedFeedback2: string;
  ahmedFeedback3: string;
}

function getSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

function detectColumns(headers: string[]) {
  const h = headers.map((x) => x.toString().trim().toLowerCase());
  const find = (names: string[]) => h.findIndex((x) => names.includes(x));

  let unitIdx = find(["unit number", "unit_number", "unit", "unit no", "unit#"]);
  let nameIdx = find(["owner name", "owner_name", "owner", "name"]);
  let m1Idx   = find(["mobile 1", "mobile1", "mobile no 1", "mobile no.", "phone number", "phone_number", "phone", "mobile", "contact"]);
  let m2Idx   = find(["mobile 2", "mobile2", "mobile no 2", "phone 2"]);
  let m3Idx   = find(["mobile 3", "mobile3", "mobile no 3", "phone 3"]);
  let fb1Idx  = find(["ahmed feedback 1", "ahmed_feedback_1"]);
  let fb2Idx  = find(["ahmed feedback 2", "ahmed_feedback_2"]);
  let fb3Idx  = find(["ahmed feedback 3", "ahmed_feedback_3"]);

  // Positional fallback if phone column not found by header name:
  // A=unit, B=name, C=mobile1, AV(47)=fb1, AW(48)=fb2, AX(49)=fb3
  if (m1Idx < 0) {
    unitIdx = 0;
    nameIdx = 1;
    m1Idx   = 2;
    fb1Idx  = 47;
    fb2Idx  = 48;
    fb3Idx  = 49;
  }

  return { unitIdx, nameIdx, m1Idx, m2Idx, m3Idx, fb1Idx, fb2Idx, fb3Idx };
}

export async function fetchSheetTabs(accessToken: string): Promise<string[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  const sheets = getSheetsClient(accessToken);
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  return res.data.sheets?.map((s) => s.properties?.title || "").filter(Boolean) || [];
}

export async function fetchContactsFromSheet(
  accessToken: string,
  sheetTab: string
): Promise<SheetContact[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  const sheets = getSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${sheetTab}'` });

  const rows = res.data.values;
  if (!rows || rows.length < 2) return [];

  const { unitIdx, nameIdx, m1Idx, m2Idx, m3Idx, fb1Idx, fb2Idx, fb3Idx } = detectColumns(rows[0]);

  const contacts: SheetContact[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const phone = m1Idx >= 0 ? (row[m1Idx] || "").toString() : "";
    if (!phone) continue;

    contacts.push({
      unitNumber:     unitIdx >= 0 ? (row[unitIdx] || "").toString() : "",
      ownerName:      nameIdx >= 0 ? (row[nameIdx] || "").toString() : "",
      phone:          phone.replace(/[^0-9+]/g, ""),
      mobile2:        m2Idx >= 0  ? (row[m2Idx]  || "").toString().replace(/[^0-9+]/g, "") : "",
      mobile3:        m3Idx >= 0  ? (row[m3Idx]  || "").toString().replace(/[^0-9+]/g, "") : "",
      ahmedFeedback1: fb1Idx >= 0 ? (row[fb1Idx] || "").toString() : "",
      ahmedFeedback2: fb2Idx >= 0 ? (row[fb2Idx] || "").toString() : "",
      ahmedFeedback3: fb3Idx >= 0 ? (row[fb3Idx] || "").toString() : "",
    });
  }

  return contacts;
}

// Fetch raw sheet rows with indices — used by the campaigns page
export async function fetchSheetRows(
  accessToken: string,
  sheetTab: string
): Promise<{
  headers: string[];
  rows: SheetRow[];
  feedbackColumnIndices: { fb1: number; fb2: number; fb3: number };
}> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  const sheets = getSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${sheetTab}'` });

  const rawRows = res.data.values;
  if (!rawRows || rawRows.length < 2) {
    return { headers: [], rows: [], feedbackColumnIndices: { fb1: -1, fb2: -1, fb3: -1 } };
  }

  const headers = rawRows[0].map((h: string) => h.toString().trim());
  const { unitIdx, nameIdx, m1Idx, m2Idx, m3Idx, fb1Idx, fb2Idx, fb3Idx } = detectColumns(headers);

  const rows: SheetRow[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const phone = m1Idx >= 0 ? (row[m1Idx] || "").toString() : "";
    if (!phone) continue;

    rows.push({
      rowIndex:       i + 1,
      unitNumber:     unitIdx >= 0 ? (row[unitIdx] || "").toString() : "",
      ownerName:      nameIdx >= 0 ? (row[nameIdx] || "").toString() : "",
      phone:          phone.replace(/[^0-9+]/g, ""),
      mobile2:        m2Idx >= 0  ? (row[m2Idx]  || "").toString().replace(/[^0-9+]/g, "") : "",
      mobile3:        m3Idx >= 0  ? (row[m3Idx]  || "").toString().replace(/[^0-9+]/g, "") : "",
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
  rowIndex: number,    // 1-based
  columnIndex: number, // 0-based
  value: string
): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  const sheets = getSheetsClient(accessToken);
  const colLetter = columnIndexToLetter(columnIndex);
  const range = `'${sheetTab}'!${colLetter}${rowIndex}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
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
