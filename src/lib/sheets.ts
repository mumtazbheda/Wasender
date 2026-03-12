import { google } from "googleapis";

export interface Contact {
  rowIndex: number;
  unit: string;
  owner1_name: string;
  owner1_mobile: string;
  owner1_email: string;
  owner2_name: string;
  owner2_mobile: string;
  owner2_email: string;
  owner3_name: string;
  owner3_mobile: string;
  owner3_email: string;
  rooms_en: string;
  actual_area: number;
  unit_balcony_area: number;
  unit_parking_number: string;
  rent_end_date: string;
  listing_status: string;
  rental_contract_status: string;
  purpose: string;
  zoha_feedback_1: string;
  zoha_feedback_2: string;
  zoha_feedback_3: string;
  ahmed_feedback_1: string;
  ahmed_feedback_2: string;
  ahmed_feedback_3: string;
  zoha_email_feedback_1: string;
  zoha_email_feedback_2: string;
  zoha_email_feedback_3: string;
  status: string;
  latest_transaction_date: string;
  latest_transaction_amount: string;
  occupancy_status: string;
  rent_start_date: string;
  rent_duration: string;
  rent_price: string;
  rental_status_date: string;
  rental_months_pending_expired: string;
  furnishing: string;
  asking_sale_price: string;
  asking_rent_price: string;
  images: string;
  videos: string;
  documents: string;
  vacancy_status: string;
  vam_listing_status: string;
  listing_link: string;
  owner_dob: string;
  crm_listing_link: string;
  contract_a: string;
  rental_cheques: string;
  available_from: string;
  view: string;
  project_name_en: string;
}

function getSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

function detectColumns(headers: string[]) {
  const h = headers.map((x) => x.toString().trim().toLowerCase());
  const findByName = (names: string[]) =>
    h.findIndex((x) => names.some((n) => x.includes(n.toLowerCase())));

  return {
    unit: findByName(["unit"]),
    owner1_name: findByName(["owner", "owner 1"]),
    owner1_mobile: findByName(["owner 1 mobile", "owner mobile", "owner 1 contact"]),
    owner1_email: findByName(["owner 1 email"]),
    owner2_name: findByName(["owner 2"]),
    owner2_mobile: findByName(["owner 2 mobile", "owner 2 contact"]),
    owner2_email: findByName(["owner 2 email"]),
    owner3_name: findByName(["owner 3"]),
    owner3_mobile: findByName(["owner 3 mobile", "owner 3 contact"]),
    owner3_email: findByName(["owner 3 email"]),
    rooms_en: findByName(["rooms", "rooms_en"]),
    actual_area: findByName(["actual area", "actual_area"]),
    unit_balcony_area: findByName(["unit balcony", "balcony area", "balcony"]),
    unit_parking_number: findByName(["parking"]),
    rent_end_date: findByName(["rent end", "end date"]),
    listing_status: findByName(["listing status"]),
    rental_contract_status: findByName(["rental contract", "contract status"]),
    purpose: findByName(["purpose"]),
    zoha_feedback_1: findByName(["zoha feedback 1", "zoha feedback"]),
    zoha_feedback_2: findByName(["zoha feedback 2"]),
    zoha_feedback_3: findByName(["zoha feedback 3"]),
    ahmed_feedback_1: findByName(["ahmed feedback 1", "ahmed feedback"]),
    ahmed_feedback_2: findByName(["ahmed feedback 2"]),
    ahmed_feedback_3: findByName(["ahmed feedback 3"]),
    zoha_email_feedback_1: findByName(["zoha email feedback 1", "zoha email"]),
    zoha_email_feedback_2: findByName(["zoha email feedback 2"]),
    zoha_email_feedback_3: findByName(["zoha email feedback 3"]),
    status: findByName(["status"]),
    latest_transaction_date: findByName(["latest transaction date", "transaction date"]),
    latest_transaction_amount: findByName(["latest transaction amount", "transaction amount"]),
    occupancy_status: findByName(["occupancy"]),
    rent_start_date: findByName(["rent start"]),
    rent_duration: findByName(["rent duration", "duration"]),
    rent_price: findByName(["rent price", "price"]),
    rental_status_date: findByName(["rental status date"]),
    rental_months_pending_expired: findByName(["months pending", "pending"]),
    furnishing: findByName(["furnish"]),
    asking_sale_price: findByName(["sale price", "asking sale"]),
    asking_rent_price: findByName(["rent price", "asking rent"]),
    images: findByName(["images", "image"]),
    videos: findByName(["videos", "video"]),
    documents: findByName(["documents", "document"]),
    vacancy_status: findByName(["vacancy"]),
    vam_listing_status: findByName(["vam", "vam status"]),
    listing_link: findByName(["listing link"]),
    owner_dob: findByName(["dob", "date of birth"]),
    crm_listing_link: findByName(["crm", "crm link"]),
    contract_a: findByName(["contract"]),
    rental_cheques: findByName(["cheque", "cheques"]),
    available_from: findByName(["available"]),
    view: findByName(["view"]),
    project_name_en: findByName(["project_name_en", "project name"]),
  };
}

// Convert 0-based column index to A1 notation (A, B, ..., Z, AA, AB, ..., AZ, BA, ...)
function columnToA1(index: number): string {
  let result = '';
  let idx = index;
  while (idx >= 0) {
    result = String.fromCharCode(65 + (idx % 26)) + result;
    idx = Math.floor(idx / 26) - 1;
  }
  return result;
}

export async function fetchSheetTabs(accessToken: string): Promise<string[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  const sheets = getSheetsClient(accessToken);
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  return res.data.sheets?.map((s) => s.properties?.title || "").filter(Boolean) || [];
}

// Main function - used by sheet-data API and contacts page
export async function fetchContactData(
  accessToken: string,
  sheetTab: string
): Promise<Contact[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  const sheets = getSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${sheetTab}'` });

  const rawRows = res.data.values;
  if (!rawRows || rawRows.length < 2) return [];

  const headers = rawRows[0].map((h: string) => h.toString().trim());
  const columnIndices = detectColumns(headers);

  const contacts: Contact[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];

    const getStringValue = (idx: number): string => {
      if (idx < 0) return "";
      return (row[idx] || "").toString().trim();
    };

    const getNumberValue = (idx: number): number => {
      if (idx < 0) return 0;
      const val = (row[idx] || "").toString().trim();
      return parseFloat(val) || 0;
    };

    const owner1Mobile = columnIndices.owner1_mobile >= 0 ? (row[columnIndices.owner1_mobile] || "").toString() : "";

    contacts.push({
      rowIndex: i + 1,
      unit: getStringValue(columnIndices.unit),
      owner1_name: getStringValue(columnIndices.owner1_name),
      owner1_mobile: owner1Mobile.replace(/[^0-9+]/g, ""),
      owner1_email: getStringValue(columnIndices.owner1_email),
      owner2_name: getStringValue(columnIndices.owner2_name),
      owner2_mobile: getStringValue(columnIndices.owner2_mobile).replace(/[^0-9+]/g, ""),
      owner2_email: getStringValue(columnIndices.owner2_email),
      owner3_name: getStringValue(columnIndices.owner3_name),
      owner3_mobile: getStringValue(columnIndices.owner3_mobile).replace(/[^0-9+]/g, ""),
      owner3_email: getStringValue(columnIndices.owner3_email),
      rooms_en: getStringValue(columnIndices.rooms_en),
      actual_area: getNumberValue(columnIndices.actual_area),
      unit_balcony_area: getNumberValue(columnIndices.unit_balcony_area),
      unit_parking_number: getStringValue(columnIndices.unit_parking_number),
      rent_end_date: getStringValue(columnIndices.rent_end_date),
      listing_status: getStringValue(columnIndices.listing_status),
      rental_contract_status: getStringValue(columnIndices.rental_contract_status),
      purpose: getStringValue(columnIndices.purpose),
      zoha_feedback_1: getStringValue(columnIndices.zoha_feedback_1),
      zoha_feedback_2: getStringValue(columnIndices.zoha_feedback_2),
      zoha_feedback_3: getStringValue(columnIndices.zoha_feedback_3),
      ahmed_feedback_1: getStringValue(columnIndices.ahmed_feedback_1),
      ahmed_feedback_2: getStringValue(columnIndices.ahmed_feedback_2),
      ahmed_feedback_3: getStringValue(columnIndices.ahmed_feedback_3),
      zoha_email_feedback_1: getStringValue(columnIndices.zoha_email_feedback_1),
      zoha_email_feedback_2: getStringValue(columnIndices.zoha_email_feedback_2),
      zoha_email_feedback_3: getStringValue(columnIndices.zoha_email_feedback_3),
      status: getStringValue(columnIndices.status),
      latest_transaction_date: getStringValue(columnIndices.latest_transaction_date),
      latest_transaction_amount: getStringValue(columnIndices.latest_transaction_amount),
      occupancy_status: getStringValue(columnIndices.occupancy_status),
      rent_start_date: getStringValue(columnIndices.rent_start_date),
      rent_duration: getStringValue(columnIndices.rent_duration),
      rent_price: getStringValue(columnIndices.rent_price),
      rental_status_date: getStringValue(columnIndices.rental_status_date),
      rental_months_pending_expired: getStringValue(columnIndices.rental_months_pending_expired),
      furnishing: getStringValue(columnIndices.furnishing),
      asking_sale_price: getStringValue(columnIndices.asking_sale_price),
      asking_rent_price: getStringValue(columnIndices.asking_rent_price),
      images: getStringValue(columnIndices.images),
      videos: getStringValue(columnIndices.videos),
      documents: getStringValue(columnIndices.documents),
      vacancy_status: getStringValue(columnIndices.vacancy_status),
      vam_listing_status: getStringValue(columnIndices.vam_listing_status),
      listing_link: getStringValue(columnIndices.listing_link),
      owner_dob: getStringValue(columnIndices.owner_dob),
      crm_listing_link: getStringValue(columnIndices.crm_listing_link),
      contract_a: getStringValue(columnIndices.contract_a),
      rental_cheques: getStringValue(columnIndices.rental_cheques),
      available_from: getStringValue(columnIndices.available_from),
      view: getStringValue(columnIndices.view),
      project_name_en: getStringValue(columnIndices.project_name_en),
    });
  }

  return contacts;
}

// Alias for backward compatibility with sync-sheets API
export const fetchContactsFromSheet = fetchContactData;

// Get sheet headers for feedback column detection
export async function getSheetHeaders(sheetTab: string): Promise<string[] | null> {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) return null;

    // Use service account or cached headers approach
    // For now, we detect from column names
    return null; // Will be populated by getSheetHeadersWithAuth
  } catch {
    return null;
  }
}

// Get sheet headers using auth token
export async function getSheetHeadersWithAuth(accessToken: string, sheetTab: string): Promise<string[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  const sheets = getSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({ 
    spreadsheetId, 
    range: `'${sheetTab}'!1:1` 
  });

  return (res.data.values?.[0] || []).map((h: any) => h.toString().trim());
}

// Get feedback column indices based on account name (Ahmed or Zoha)
// Returns: { 1: colIndex for feedback 1, 2: colIndex for feedback 2, 3: colIndex for feedback 3 }
export function getFeedbackColumnIndices(headers: string[], accountName: string): Record<number, number> {
  const h = headers.map((x) => x.toString().trim().toLowerCase());
  const name = accountName.toLowerCase();
  
  const findCol = (search: string) => h.findIndex((x) => x.includes(search));
  
  if (name.includes('ahmed')) {
    return {
      1: findCol('ahmed feedback 1'),
      2: findCol('ahmed feedback 2'),
      3: findCol('ahmed feedback 3'),
    };
  } else if (name.includes('zoha')) {
    return {
      1: findCol('zoha feedback 1'),
      2: findCol('zoha feedback 2'),
      3: findCol('zoha feedback 3'),
    };
  }
  
  // Default: try to find generic feedback columns
  return {
    1: findCol('feedback 1'),
    2: findCol('feedback 2'),
    3: findCol('feedback 3'),
  };
}

// Update a single cell in Google Sheet - FIXED for multi-letter columns (AA, AB, AV, etc.)
export async function updateSheetCell(
  accessToken: string,
  sheetTab: string,
  rowIndex: number,
  columnIndex: number,
  value: string
): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set");

  const sheets = getSheetsClient(accessToken);
  
  // Use proper A1 notation for ALL column indices (including > 25)
  const columnLetter = columnToA1(columnIndex);
  const cellAddress = `'${sheetTab}'!${columnLetter}${rowIndex}`;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: cellAddress,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[value]],
    },
  });
}
