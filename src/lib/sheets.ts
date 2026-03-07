import { google } from "googleapis";

export interface SheetContact {
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
