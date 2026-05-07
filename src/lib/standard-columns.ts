export type ColumnType = 'text' | 'number' | 'currency' | 'name' | 'string' | 'date' | 'phone' | 'email' | 'url';

export interface StandardColumn {
  field: string;        // internal field key (matches Contact interface)
  label: string;        // display name
  type: ColumnType;
  group: string;        // for grouping in UI
  autoMatchHints: string[]; // substrings to match headers (case-insensitive)
}

export const STANDARD_COLUMNS: StandardColumn[] = [
  // Property Info
  { field: 'unit', label: 'Unit', type: 'text', group: 'Property', autoMatchHints: ['unit'] },
  { field: 'rooms_en', label: 'Rooms', type: 'text', group: 'Property', autoMatchHints: ['rooms', 'rooms_en'] },
  { field: 'actual_area', label: 'Actual Area', type: 'number', group: 'Property', autoMatchHints: ['actual area', 'actual_area'] },
  { field: 'unit_balcony_area', label: 'Balcony Area', type: 'number', group: 'Property', autoMatchHints: ['balcony area', 'unit balcony', 'balcony'] },
  { field: 'unit_parking_number', label: 'Parking Number', type: 'text', group: 'Property', autoMatchHints: ['parking'] },
  { field: 'furnishing', label: 'Furnishing', type: 'text', group: 'Property', autoMatchHints: ['furnish'] },
  { field: 'view', label: 'View', type: 'text', group: 'Property', autoMatchHints: ['view'] },
  { field: 'project_name_en', label: 'Project Name', type: 'name', group: 'Property', autoMatchHints: ['project_name_en', 'project name'] },

  // Owner 1
  { field: 'owner1_name', label: 'Owner 1 Name', type: 'name', group: 'Owner 1', autoMatchHints: ['owner 1 name', 'owner name', 'owner1 name'] },
  { field: 'owner1_mobile', label: 'Owner 1 Mobile', type: 'phone', group: 'Owner 1', autoMatchHints: ['owner 1 mobile', 'owner mobile', 'owner 1 contact', 'owner1 mobile'] },
  { field: 'owner1_email', label: 'Owner 1 Email', type: 'email', group: 'Owner 1', autoMatchHints: ['owner 1 email', 'owner1 email'] },

  // Owner 2
  { field: 'owner2_name', label: 'Owner 2 Name', type: 'name', group: 'Owner 2', autoMatchHints: ['owner 2 name', 'owner2 name'] },
  { field: 'owner2_mobile', label: 'Owner 2 Mobile', type: 'phone', group: 'Owner 2', autoMatchHints: ['owner 2 mobile', 'owner2 mobile', 'owner 2 contact'] },
  { field: 'owner2_email', label: 'Owner 2 Email', type: 'email', group: 'Owner 2', autoMatchHints: ['owner 2 email', 'owner2 email'] },

  // Owner 3
  { field: 'owner3_name', label: 'Owner 3 Name', type: 'name', group: 'Owner 3', autoMatchHints: ['owner 3 name', 'owner3 name'] },
  { field: 'owner3_mobile', label: 'Owner 3 Mobile', type: 'phone', group: 'Owner 3', autoMatchHints: ['owner 3 mobile', 'owner3 mobile', 'owner 3 contact'] },
  { field: 'owner3_email', label: 'Owner 3 Email', type: 'email', group: 'Owner 3', autoMatchHints: ['owner 3 email', 'owner3 email'] },

  // Rental Info
  { field: 'rent_start_date', label: 'Rent Start Date', type: 'date', group: 'Rental', autoMatchHints: ['rent start'] },
  { field: 'rent_end_date', label: 'Rent End Date', type: 'date', group: 'Rental', autoMatchHints: ['rent end', 'end date'] },
  { field: 'rent_duration', label: 'Rent Duration', type: 'text', group: 'Rental', autoMatchHints: ['rent duration', 'duration'] },
  { field: 'rent_price', label: 'Rent Price', type: 'currency', group: 'Rental', autoMatchHints: ['rent price'] },
  { field: 'rental_contract_status', label: 'Rental Contract Status', type: 'text', group: 'Rental', autoMatchHints: ['rental contract', 'contract status'] },
  { field: 'rental_status_date', label: 'Rental Status Date', type: 'date', group: 'Rental', autoMatchHints: ['rental status date'] },
  { field: 'rental_months_pending_expired', label: 'Rental Months Pending/Expired', type: 'text', group: 'Rental', autoMatchHints: ['months pending', 'pending expired'] },
  { field: 'contract_a', label: 'Contract A', type: 'text', group: 'Rental', autoMatchHints: ['contract_a'] },
  { field: 'rental_cheques', label: 'Rental Cheques', type: 'text', group: 'Rental', autoMatchHints: ['cheque', 'cheques'] },
  { field: 'available_from', label: 'Available From', type: 'date', group: 'Rental', autoMatchHints: ['available'] },

  // Listing Info
  { field: 'listing_status', label: 'Listing Status', type: 'text', group: 'Listing', autoMatchHints: ['listing status'] },
  { field: 'purpose', label: 'Purpose', type: 'text', group: 'Listing', autoMatchHints: ['purpose'] },
  { field: 'asking_sale_price', label: 'Asking Sale Price', type: 'currency', group: 'Listing', autoMatchHints: ['sale price', 'asking sale'] },
  { field: 'asking_rent_price', label: 'Asking Rent Price', type: 'currency', group: 'Listing', autoMatchHints: ['asking rent'] },
  { field: 'vam_listing_status', label: 'VAM Listing Status', type: 'text', group: 'Listing', autoMatchHints: ['vam', 'vam status'] },
  { field: 'listing_link', label: 'Listing Link', type: 'url', group: 'Listing', autoMatchHints: ['listing link'] },
  { field: 'crm_listing_link', label: 'CRM Listing Link', type: 'url', group: 'Listing', autoMatchHints: ['crm', 'crm link'] },

  // Status
  { field: 'status', label: 'Status', type: 'text', group: 'Status', autoMatchHints: ['status'] },
  { field: 'occupancy_status', label: 'Occupancy Status', type: 'text', group: 'Status', autoMatchHints: ['occupancy'] },
  { field: 'vacancy_status', label: 'Vacancy Status', type: 'text', group: 'Status', autoMatchHints: ['vacancy'] },

  // Transactions
  { field: 'latest_transaction_date', label: 'Latest Transaction Date', type: 'date', group: 'Transactions', autoMatchHints: ['latest transaction date', 'transaction date'] },
  { field: 'latest_transaction_amount', label: 'Latest Transaction Amount', type: 'currency', group: 'Transactions', autoMatchHints: ['latest transaction amount', 'transaction amount'] },

  // Feedback - Zoha
  { field: 'zoha_feedback_1', label: 'Zoha Feedback 1', type: 'text', group: 'Zoha Feedback', autoMatchHints: ['zoha feedback 1', 'zoha feedback'] },
  { field: 'zoha_feedback_2', label: 'Zoha Feedback 2', type: 'text', group: 'Zoha Feedback', autoMatchHints: ['zoha feedback 2'] },
  { field: 'zoha_feedback_3', label: 'Zoha Feedback 3', type: 'text', group: 'Zoha Feedback', autoMatchHints: ['zoha feedback 3'] },
  { field: 'zoha_email_feedback_1', label: 'Zoha Email Feedback 1', type: 'text', group: 'Zoha Feedback', autoMatchHints: ['zoha email feedback 1', 'zoha email'] },
  { field: 'zoha_email_feedback_2', label: 'Zoha Email Feedback 2', type: 'text', group: 'Zoha Feedback', autoMatchHints: ['zoha email feedback 2'] },
  { field: 'zoha_email_feedback_3', label: 'Zoha Email Feedback 3', type: 'text', group: 'Zoha Feedback', autoMatchHints: ['zoha email feedback 3'] },

  // Feedback - Ahmed
  { field: 'ahmed_feedback_1', label: 'Ahmed Feedback 1', type: 'text', group: 'Ahmed Feedback', autoMatchHints: ['ahmed feedback 1', 'ahmed feedback'] },
  { field: 'ahmed_feedback_2', label: 'Ahmed Feedback 2', type: 'text', group: 'Ahmed Feedback', autoMatchHints: ['ahmed feedback 2'] },
  { field: 'ahmed_feedback_3', label: 'Ahmed Feedback 3', type: 'text', group: 'Ahmed Feedback', autoMatchHints: ['ahmed feedback 3'] },

  // Feedback - Asma
  { field: 'asma_feedback_1', label: 'Asma Feedback 1', type: 'text', group: 'Asma Feedback', autoMatchHints: ['asma feedback 1', 'asma feedback'] },
  { field: 'asma_feedback_2', label: 'Asma Feedback 2', type: 'text', group: 'Asma Feedback', autoMatchHints: ['asma feedback 2'] },
  { field: 'asma_feedback_3', label: 'Asma Feedback 3', type: 'text', group: 'Asma Feedback', autoMatchHints: ['asma feedback 3'] },

  // Portals
  { field: 'bayut_rent', label: 'Bayut Rent', type: 'text', group: 'Portals', autoMatchHints: ['bayut rent'] },
  { field: 'bayut_sale', label: 'Bayut Sale', type: 'text', group: 'Portals', autoMatchHints: ['bayut sale'] },
  { field: 'pf_rent', label: 'PF Rent', type: 'text', group: 'Portals', autoMatchHints: ['pf rent'] },
  { field: 'pf_sale', label: 'PF Sale', type: 'text', group: 'Portals', autoMatchHints: ['pf sale'] },
  { field: 'bayut_rent_prices', label: 'Bayut Rent Prices', type: 'currency', group: 'Portals', autoMatchHints: ['bayut rent price'] },
  { field: 'bayut_sale_prices', label: 'Bayut Sale Prices', type: 'currency', group: 'Portals', autoMatchHints: ['bayut sale price'] },
  { field: 'pf_rent_prices', label: 'PF Rent Prices', type: 'currency', group: 'Portals', autoMatchHints: ['pf rent price'] },
  { field: 'pf_sale_prices', label: 'PF Sale Prices', type: 'currency', group: 'Portals', autoMatchHints: ['pf sale price'] },
  { field: 'bayut_links', label: 'Bayut Links', type: 'url', group: 'Portals', autoMatchHints: ['bayut link'] },
  { field: 'pf_links', label: 'PF Links', type: 'url', group: 'Portals', autoMatchHints: ['pf link'] },

  // Other
  { field: 'owner_dob', label: 'Owner DOB', type: 'date', group: 'Other', autoMatchHints: ['dob', 'date of birth'] },
  { field: 'images', label: 'Images', type: 'url', group: 'Other', autoMatchHints: ['images', 'image'] },
  { field: 'videos', label: 'Videos', type: 'url', group: 'Other', autoMatchHints: ['videos', 'video'] },
  { field: 'documents', label: 'Documents', type: 'url', group: 'Other', autoMatchHints: ['documents', 'document'] },
];

export const STANDARD_FIELD_KEYS = new Set(STANDARD_COLUMNS.map(c => c.field));

export function getStandardColumn(field: string): StandardColumn | undefined {
  return STANDARD_COLUMNS.find(c => c.field === field);
}

/** Auto-match a sheet header to a standard column field key. Returns field key or null. */
export function autoMatchHeader(header: string): string | null {
  const h = header.trim().toLowerCase();
  for (const col of STANDARD_COLUMNS) {
    for (const hint of col.autoMatchHints) {
      if (h.includes(hint.toLowerCase()) || hint.toLowerCase().includes(h)) {
        return col.field;
      }
    }
  }
  return null;
}

/** Group standard columns by their group field. */
export function groupedStandardColumns(): Record<string, StandardColumn[]> {
  const groups: Record<string, StandardColumn[]> = {};
  for (const col of STANDARD_COLUMNS) {
    if (!groups[col.group]) groups[col.group] = [];
    groups[col.group].push(col);
  }
  return groups;
}
