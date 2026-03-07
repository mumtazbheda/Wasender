import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

function getCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY environment variables are required"
    );
  }
  return { email, privateKey };
}

export interface SheetContact {
  unitNumber: string;
  ownerName: string;
  phone: string;
  ahmedFeedback1: string;
  ahmedFeedback2: string;
  ahmedFeedback3: string;
}

export async function fetchContactsFromSheet(): Promise<SheetContact[]> {
  const { email, privateKey } = getCredentials();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  const auth = new JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();

  const sheetName = process.env.GOOGLE_SHEET_TAB || "Time 1 New";
  const sheet = doc.sheetsByTitle[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  const contacts: SheetContact[] = [];
  for (const row of rows) {
    const phone = row.get("Phone Number") || row.get("phone") || "";
    if (!phone) continue;

    contacts.push({
      unitNumber: row.get("Unit Number") || row.get("unit_number") || "",
      ownerName: row.get("Owner Name") || row.get("owner_name") || "",
      phone: phone.toString().replace(/[^0-9+]/g, ""),
      ahmedFeedback1: row.get("Ahmed Feedback 1") || "",
      ahmedFeedback2: row.get("Ahmed Feedback 2") || "",
      ahmedFeedback3: row.get("Ahmed Feedback 3") || "",
    });
  }

  return contacts;
}
