"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";

interface Contact {
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
  project_name_en?: string;
  bayut_rent: string;
  bayut_sale: string;
  pf_rent: string;
  pf_sale: string;
  bayut_rent_prices: string;
  bayut_sale_prices: string;
  pf_rent_prices: string;
  pf_sale_prices: string;
  bayut_links: string;
  pf_links: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
}

type SortOrder = "none" | "low-to-high" | "high-to-low";

// ─── Column mapping for Google Sheet edits ─────────────────────────────────
// Maps Contact field names to 0-based column indices in the Google Sheet.
// IMPORTANT: Adjust these indices to match your actual Google Sheet column order.
const FIELD_COLUMN_INDEX: Record<string, number> = {
  unit: 0,
  owner1_name: 1,
  owner1_mobile: 2,
  owner1_email: 3,
  owner2_name: 4,
  owner2_mobile: 5,
  owner2_email: 6,
  owner3_name: 7,
  owner3_mobile: 8,
  owner3_email: 9,
  rooms_en: 10,
  actual_area: 11,
  unit_balcony_area: 12,
  unit_parking_number: 13,
  rent_end_date: 14,
  listing_status: 15,
  rental_contract_status: 16,
  purpose: 17,
  zoha_feedback_1: 18,
  zoha_feedback_2: 19,
  zoha_feedback_3: 20,
  ahmed_feedback_1: 21,
  ahmed_feedback_2: 22,
  ahmed_feedback_3: 23,
  zoha_email_feedback_1: 24,
  zoha_email_feedback_2: 25,
  zoha_email_feedback_3: 26,
  status: 27,
  latest_transaction_date: 28,
  latest_transaction_amount: 29,
  occupancy_status: 30,
  rent_start_date: 31,
  rent_duration: 32,
  rent_price: 33,
  rental_status_date: 34,
  rental_months_pending_expired: 35,
  furnishing: 36,
  asking_sale_price: 37,
  asking_rent_price: 38,
  images: 39,
  videos: 40,
  documents: 41,
  vacancy_status: 42,
  vam_listing_status: 43,
  listing_link: 44,
  owner_dob: 45,
  crm_listing_link: 46,
  contract_a: 47,
  rental_cheques: 48,
  available_from: 49,
  view: 50,
  project_name_en: 51,
};

// ─── Edit modal field groups ────────────────────────────────────────────────
const EDIT_FIELD_GROUPS = [
  {
    title: "🏠 Property Info",
    fields: [
      { key: "unit", label: "Unit" },
      { key: "rooms_en", label: "Rooms" },
      { key: "actual_area", label: "Actual Area (sqm)" },
      { key: "unit_balcony_area", label: "Balcony Area (sqm)" },
      { key: "unit_parking_number", label: "Parking Number" },
      { key: "furnishing", label: "Furnishing" },
      { key: "view", label: "View" },
    ],
  },
  {
    title: "👤 Owner 1",
    fields: [
      { key: "owner1_name", label: "Name" },
      { key: "owner1_mobile", label: "Mobile" },
      { key: "owner1_email", label: "Email" },
    ],
  },
  {
    title: "👤 Owner 2",
    fields: [
      { key: "owner2_name", label: "Name" },
      { key: "owner2_mobile", label: "Mobile" },
      { key: "owner2_email", label: "Email" },
    ],
  },
  {
    title: "👤 Owner 3",
    fields: [
      { key: "owner3_name", label: "Name" },
      { key: "owner3_mobile", label: "Mobile" },
      { key: "owner3_email", label: "Email" },
    ],
  },
  {
    title: "📅 Rental Info",
    fields: [
      { key: "rent_start_date", label: "Rent Start Date" },
      { key: "rent_end_date", label: "Rent End Date" },
      { key: "rent_duration", label: "Rent Duration" },
      { key: "rent_price", label: "Rent Price" },
      { key: "rental_contract_status", label: "Rental Contract Status" },
    ],
  },
  {
    title: "📋 Listing Info",
    fields: [
      { key: "listing_status", label: "Listing Status" },
      { key: "purpose", label: "Purpose" },
      { key: "asking_sale_price", label: "Asking Sale Price" },
      { key: "asking_rent_price", label: "Asking Rent Price" },
      { key: "vam_listing_status", label: "VAM Listing Status" },
    ],
  },
  {
    title: "💬 Feedback",
    fields: [
      { key: "ahmed_feedback_1", label: "Ahmed Feedback 1" },
      { key: "ahmed_feedback_2", label: "Ahmed Feedback 2" },
      { key: "ahmed_feedback_3", label: "Ahmed Feedback 3" },
      { key: "zoha_feedback_1", label: "Zoha Feedback 1" },
      { key: "zoha_feedback_2", label: "Zoha Feedback 2" },
      { key: "zoha_feedback_3", label: "Zoha Feedback 3" },
    ],
  },
  {
    title: "📊 Status",
    fields: [
      { key: "status", label: "Status" },
      { key: "occupancy_status", label: "Occupancy Status" },
      { key: "vacancy_status", label: "Vacancy Status" },
      { key: "available_from", label: "Available From" },
    ],
  },
  {
    title: "📁 Other",
    fields: [
      { key: "latest_transaction_date", label: "Latest Transaction Date" },
      { key: "latest_transaction_amount", label: "Latest Transaction Amount" },
      { key: "images", label: "Images" },
      { key: "videos", label: "Videos" },
      { key: "documents", label: "Documents" },
      { key: "listing_link", label: "Listing Link" },
      { key: "crm_listing_link", label: "CRM Listing Link" },
      { key: "contract_a", label: "Contract A" },
      { key: "rental_cheques", label: "Rental Cheques" },
      { key: "owner_dob", label: "Owner DOB" },
      { key: "project_name_en", label: "Project Name" },
    ],
  },
];


function isUAEPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('971')) return true;
  if (cleaned.startsWith('05') && cleaned.length === 10) return true;
  if (cleaned.startsWith('5') && cleaned.length === 9) return true;
  return false;
}

export default function ContactsPage() {
  const { data: session, status } = useSession();
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [sheets, setSheets] = useState<string[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: prev[key] === false ? true : false }));
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappStep, setWhatsappStep] = useState<1 | 2 | 3>(1);
  const [selectedWhatsappOwner, setSelectedWhatsappOwner] = useState<1 | 2 | 3 | null>(null);
  const [selectedWhatsappAccount, setSelectedWhatsappAccount] = useState<number | null>(null);
  const [selectedWhatsappTemplate, setSelectedWhatsappTemplate] = useState<string | null>(null);
  const [whatsappAccounts, setWhatsappAccounts] = useState<Account[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<Template[]>([]);
  const [whatsappSelection, setWhatsappSelection] = useState<{
    ownerNumber: 1 | 2 | 3;
    phone: string;
  } | null>(null);
  const [selectedWhatsappOwner, setSelectedWhatsappOwner] = useState<1 | 2 | 3>(1);
  const [selectedMobile, setSelectedMobile] = useState<string>("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");

  // Cache state
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [cacheTime, setCacheTime] = useState<string>("");

  // Edit modal state
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Filters state
  const [filters, setFilters] = useState({
    purpose: [] as string[],
    rooms: [] as string[],
    listing_status: [] as string[],
    rental_contract_status: [] as string[],
    ahmed_feedback_1: [] as string[],
    ahmed_feedback_2: [] as string[],
    ahmed_feedback_3: [] as string[],
    zoha_feedback_1: [] as string[],
    zoha_feedback_2: [] as string[],
    zoha_feedback_3: [] as string[],
    owner1Mobile: '' as string,
    owner2Mobile: '' as string,
    owner3Mobile: '' as string,
    owner1CountryCode: '' as string,
    owner2CountryCode: '' as string,
    owner3CountryCode: '' as string,
  });

  // ─── Load sheets on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const loadSheets = async () => {
      setSheetsLoading(true);
      setSheetsError("");
      try {
        const res = await fetch("/api/sheet-tabs");
        const data = await res.json();

        if (!res.ok || !data.success) {
          setSheetsError(data.error || "Failed to load sheets");
          setSheets([]);
        } else {
          const tabsList = data.tabs || [];
          setSheets(tabsList);
          if (tabsList.length === 0) {
            setSheetsError("No sheets found in Google Sheet");
          }
        }
      } catch (err) {
        setSheetsError(
          "Error loading sheets: " +
            (err instanceof Error ? err.message : "Unknown error")
        );
        setSheets([]);
        console.error("Failed to load sheets:", err);
      } finally {
        setSheetsLoading(false);
      }
    };

    if (status === "authenticated") {
      loadSheets();
    }
  }, [status]);

  // ─── Load templates on mount ───────────────────────────────────────────────
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetch("/api/templates");
        const data = await res.json();
        setTemplates(data.templates || []);
      } catch (err) {
        console.error("Failed to load templates:", err);
      }
    };
    loadTemplates();
  }, []);

  // ─── Check localStorage cache when sheet is selected ───────────────────────
  useEffect(() => {
    if (!selectedSheet) {
      setCacheLoaded(false);
      setCacheTime("");
      return;
    }

    try {
      const cacheKey = `wasender_cache_${selectedSheet}`;
      const cacheTimeKey = `wasender_cache_${selectedSheet}_time`;
      const cached = localStorage.getItem(cacheKey);
      const cachedTimeStr = localStorage.getItem(cacheTimeKey);

      if (cached) {
        const parsedContacts: Contact[] = JSON.parse(cached);
        setContacts(parsedContacts);
        setCacheLoaded(true);
        setCacheTime(
          cachedTimeStr
            ? new Date(parseInt(cachedTimeStr)).toLocaleString()
            : ""
        );
        setError("");
      } else {
        // No cache — user needs to click Load / Sync
        setCacheLoaded(false);
        setCacheTime("");
      }
    } catch (e) {
      console.error("Cache load error:", e);
      setCacheLoaded(false);
      setCacheTime("");
    }
  }, [selectedSheet]);

  // ─── Load contacts from Google Sheet (& save to cache) ─────────────────────
  const loadContacts = async () => {
    if (!selectedSheet) {
      setError("Please select a sheet");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/sheet-data?sheetName=${encodeURIComponent(selectedSheet)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load contacts");
        setContacts([]);
      } else {
        const loadedContacts: Contact[] = data.contacts || [];
        setContacts(loadedContacts);
        setError("");

        // Save to localStorage cache
        try {
          const cacheKey = `wasender_cache_${selectedSheet}`;
          const cacheTimeKey = `wasender_cache_${selectedSheet}_time`;
          localStorage.setItem(cacheKey, JSON.stringify(loadedContacts));
          localStorage.setItem(cacheTimeKey, Date.now().toString());
          setCacheLoaded(false); // Fresh data, not from cache
          setCacheTime("");
        } catch {
          // localStorage may be full or unavailable
        }
      }
    } catch (err) {
      setError(
        "Error loading contacts: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
      setContacts([]);
      console.error("Failed to load contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Sync to database ──────────────────────────────────────────────────────
  const syncToDatabase = async () => {
    if (!selectedSheet) {
      setError("Please select a sheet");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sync-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetName: selectedSheet }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to sync to database");
      } else {
        setError(
          "✅ Successfully synced " + data.count + " contacts to database"
        );
      }
    } catch (err) {
      setError(
        "Error syncing: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
      console.error("Failed to sync:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Calculate days remaining ──────────────────────────────────────────────
  const calculateDaysRemaining = (
    endDate: string
  ): { days: number; text: string } => {
    if (!endDate) return { days: -1, text: "No end date" };

    const end = new Date(endDate);
    const today = new Date();
    const diff = end.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));

    if (days < 0) {
      return { days: 0, text: `Expired ${Math.abs(days)} days ago` };
    }

    const months = Math.floor(days / 30);
    const remainingDays = days % 30;

    if (months > 0 && remainingDays > 0) {
      return { days, text: `${months} months ${remainingDays} days` };
    } else if (months > 0) {
      return { days, text: `${months} months` };
    } else {
      return { days, text: `${days} days` };
    }
  };

  // ─── Get unique values for filters ─────────────────────────────────────────
  const getUniqueValues = (field: keyof Contact) => {
    const values = contacts.map((c) => String(c[field] || ''));
    const nonEmpty = [...new Set(values.filter(v => v !== ''))].sort();
    const hasBlank = values.some(v => v === '');
    return hasBlank ? ['(Blank)', ...nonEmpty] : nonEmpty;
  };

  // ─── Apply filters and sorting ─────────────────────────────────────────────
  useEffect(() => {
    let result = contacts.filter((contact) => {
      const matchSearch =
        !searchQuery ||
        contact.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.owner1_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        contact.owner1_mobile.includes(searchQuery);

      // Helper: match filter with (Blank) support
      const mf = (fv: string[], cv: string) => {
        if (fv.length === 0) return true;
        if (fv.includes('(Blank)') && (!cv || cv === '')) return true;
        return fv.includes(cv);
      };
      const matchFilters =
        mf(filters.purpose, contact.purpose) &&
        mf(filters.rooms, contact.rooms_en) &&
        mf(filters.listing_status, contact.listing_status) &&
        mf(filters.rental_contract_status, contact.rental_contract_status) &&
        mf(filters.ahmed_feedback_1, contact.ahmed_feedback_1) &&
        mf(filters.ahmed_feedback_2, contact.ahmed_feedback_2) &&
        mf(filters.ahmed_feedback_3, contact.ahmed_feedback_3) &&
        mf(filters.zoha_feedback_1, contact.zoha_feedback_1) &&
        mf(filters.zoha_feedback_2, contact.zoha_feedback_2) &&
        mf(filters.zoha_feedback_3, contact.zoha_feedback_3) &&
        (!filters.owner1Mobile ||
          (filters.owner1Mobile === 'blank' && (!contact.owner1_mobile || String(contact.owner1_mobile).trim() === '')) ||
          (filters.owner1Mobile === 'zero' && String(contact.owner1_mobile || '').trim() === '0') ||
          (filters.owner1Mobile === 'nonblank' && contact.owner1_mobile && String(contact.owner1_mobile).trim() !== '' && String(contact.owner1_mobile).trim() !== '0')) &&
        (!filters.owner2Mobile ||
          (filters.owner2Mobile === 'blank' && (!contact.owner2_mobile || String(contact.owner2_mobile).trim() === '')) ||
          (filters.owner2Mobile === 'zero' && String(contact.owner2_mobile || '').trim() === '0') ||
          (filters.owner2Mobile === 'nonblank' && contact.owner2_mobile && String(contact.owner2_mobile).trim() !== '' && String(contact.owner2_mobile).trim() !== '0')) &&
        (!filters.owner3Mobile ||
          (filters.owner3Mobile === 'blank' && (!contact.owner3_mobile || String(contact.owner3_mobile).trim() === '')) ||
          (filters.owner3Mobile === 'zero' && String(contact.owner3_mobile || '').trim() === '0') ||
          (filters.owner3Mobile === 'nonblank' && contact.owner3_mobile && String(contact.owner3_mobile).trim() !== '' && String(contact.owner3_mobile).trim() !== '0')) &&
        (!filters.owner1CountryCode ||
          (filters.owner1CountryCode === 'uae' && isUAEPhone(contact.owner1_mobile)) ||
          (filters.owner1CountryCode === 'nonuae' && contact.owner1_mobile && String(contact.owner1_mobile).trim() !== '' && !isUAEPhone(contact.owner1_mobile))) &&
        (!filters.owner2CountryCode ||
          (filters.owner2CountryCode === 'uae' && isUAEPhone(contact.owner2_mobile)) ||
          (filters.owner2CountryCode === 'nonuae' && contact.owner2_mobile && String(contact.owner2_mobile).trim() !== '' && !isUAEPhone(contact.owner2_mobile))) &&
        (!filters.owner3CountryCode ||
          (filters.owner3CountryCode === 'uae' && isUAEPhone(contact.owner3_mobile)) ||
          (filters.owner3CountryCode === 'nonuae' && contact.owner3_mobile && String(contact.owner3_mobile).trim() !== '' && !isUAEPhone(contact.owner3_mobile)));

      return matchSearch && matchFilters;
    });

    // Apply sorting
    if (sortOrder !== "none") {
      result.sort((a, b) => {
        const daysA = calculateDaysRemaining(a.rent_end_date).days;
        const daysB = calculateDaysRemaining(b.rent_end_date).days;

        if (sortOrder === "low-to-high") {
          return daysA - daysB;
        } else {
          return daysB - daysA;
        }
      });
    }

    setFilteredContacts(result);
  }, [contacts, searchQuery, filters, sortOrder]);

  // ─── Edit modal helpers ────────────────────────────────────────────────────
  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    const formData: Record<string, string> = {};
    for (const group of EDIT_FIELD_GROUPS) {
      for (const field of group.fields) {
        formData[field.key] = String(
          (contact as any)[field.key] ?? ""
        );
      }
    }
    setEditFormData(formData);
    setEditError("");
    setEditSuccess("");
  };

  const closeEditModal = () => {
    setEditingContact(null);
    setEditFormData({});
    setEditError("");
    setEditSuccess("");
  };

  const updateEditField = (key: string, value: string) => {
    setEditFormData((prev) => ({ ...prev, [key]: value }));
  };

  const saveEdit = async () => {
    if (!editingContact || !selectedSheet) return;

    setEditSaving(true);
    setEditError("");
    setEditSuccess("");

    // Find changed fields
    const updates: { rowIndex: number; columnIndex: number; value: string }[] =
      [];
    for (const [field, value] of Object.entries(editFormData)) {
      const original = String((editingContact as any)[field] ?? "");
      if (value !== original && FIELD_COLUMN_INDEX[field] !== undefined) {
        updates.push({
          rowIndex: editingContact.rowIndex,
          columnIndex: FIELD_COLUMN_INDEX[field],
          value: value,
        });
      }
    }

    if (updates.length === 0) {
      setEditError("No changes detected");
      setEditSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/sheet-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetTab: selectedSheet, updates }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Build updated contact
        const updatedContact: Contact = { ...editingContact };
        for (const [field, value] of Object.entries(editFormData)) {
          (updatedContact as any)[field] = value;
        }

        // Update contacts state
        setContacts((prev) =>
          prev.map((c) =>
            c.rowIndex === editingContact.rowIndex ? updatedContact : c
          )
        );

        // Update localStorage cache
        try {
          const cacheKey = `wasender_cache_${selectedSheet}`;
          const updatedContacts = contacts.map((c) =>
            c.rowIndex === editingContact.rowIndex ? updatedContact : c
          );
          localStorage.setItem(cacheKey, JSON.stringify(updatedContacts));
          localStorage.setItem(
            `wasender_cache_${selectedSheet}_time`,
            Date.now().toString()
          );
        } catch {}

        setEditSuccess("✅ Changes saved successfully!");
        setTimeout(() => {
          closeEditModal();
        }, 1200);
      } else {
        setEditError(data.error || "Failed to save changes to Google Sheet");
      }
    } catch (err) {
      setEditError(
        "Error saving: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Helper components ─────────────────────────────────────────────────────
  const LabelValue = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-gray-600 font-medium min-w-[120px]">
        {label}:
      </span>
      <span className="text-gray-900 text-right break-all">
        {value || "N/A"}
      </span>
    </div>
  );

  const PhoneLink = ({ phone }: { phone: string }) =>
    phone ? (
      <a
        href={`tel:${phone}`}
        className="text-blue-600 hover:text-blue-800 font-medium no-underline hover:underline flex items-center gap-2 justify-end"
      >
        <span className="text-lg">📞</span>
        {phone}
      </a>
    ) : (
      <span className="text-gray-400">Not provided</span>
    );

  const ViewSection = ({ title, isOpen, onToggle, children }: { title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) => (
    <section className="border border-gray-200 rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <span className="text-gray-500 text-xl">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className="p-4 space-y-3">{children}</div>}
    </section>
  );

  // ─── WhatsApp Selection Modal ────────────────────────────────────────────────
  const WhatsAppModal = () => {
    if (!showWhatsAppModal || !selectedContact) return null;

    const availableOwners = [
      { num: 1, name: selectedContact.owner1_name, phone: selectedContact.owner1_mobile },
      { num: 2, name: selectedContact.owner2_name, phone: selectedContact.owner2_mobile },
      { num: 3, name: selectedContact.owner3_name, phone: selectedContact.owner3_mobile },
    ].filter(o => o.phone);

    const handleLoadAccountsAndTemplates = async () => {
      try {
        // Load accounts
        const accRes = await fetch("/api/accounts");
        const accData = await accRes.json();
        setWhatsappAccounts(accData.accounts || []);

        // Load templates
        const tplRes = await fetch("/api/templates");
        const tplData = await tplRes.json();
        setWhatsappTemplates(tplData.templates || []);
      } catch (err) {
        console.error("Failed to load accounts/templates:", err);
      }
    };

    const handleSelectOwner = (ownerNum: 1 | 2 | 3) => {
      setSelectedWhatsappOwner(ownerNum);
      handleLoadAccountsAndTemplates();
      setWhatsappStep(2);
    };

    const handleSelectAccount = (accountId: number) => {
      setSelectedWhatsappAccount(accountId);
      setWhatsappStep(3);
    };

    const handleSelectTemplate = async (templateId: string) => {
      setSelectedWhatsappTemplate(templateId);
      
      // Get owner phone and send message
      const ownerNum = selectedWhatsappOwner;
      const phone = ownerNum === 1 ? selectedContact.owner1_mobile :
                    ownerNum === 2 ? selectedContact.owner2_mobile :
                    selectedContact.owner3_mobile;

      const template = whatsappTemplates.find(t => String(t.id) === templateId);
      
      if (phone && template) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const messageText = template.body;
        
        // Open WhatsApp with template text
        const encodedMessage = encodeURIComponent(messageText);
        window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
        
        // TODO: Record in database that message was sent from account
        // Optional: await fetch('/api/send-message', { method: 'POST', body: JSON.stringify({...}) })
      }
      
      // Close modal and reset
      setShowWhatsAppModal(false);
      setWhatsappStep(1);
      setSelectedWhatsappOwner(null);
      setSelectedWhatsappAccount(null);
      setSelectedWhatsappTemplate(null);
    };

    const handleBack = () => {
      if (whatsappStep === 1) {
        setShowWhatsAppModal(false);
        setWhatsappStep(1);
        setSelectedWhatsappOwner(null);
        setSelectedWhatsappAccount(null);
        setSelectedWhatsappTemplate(null);
      } else {
        setWhatsappStep((whatsappStep - 1) as 1 | 2 | 3);
        if (whatsappStep === 3) setSelectedWhatsappTemplate(null);
        if (whatsappStep === 2) setSelectedWhatsappAccount(null);
      }
    };

    const selectedTemplate = whatsappTemplates.find(t => String(t.id) === String(selectedWhatsappTemplate));
    const selectedAccount = whatsappAccounts.find(a => a.id === selectedWhatsappAccount);
    const selectedOwnerData = selectedWhatsappOwner === 1 ? { name: selectedContact.owner1_name, phone: selectedContact.owner1_mobile } :
                              selectedWhatsappOwner === 2 ? { name: selectedContact.owner2_name, phone: selectedContact.owner2_mobile } :
                              { name: selectedContact.owner3_name, phone: selectedContact.owner3_mobile };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition ${whatsappStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>1</div>
              <span className={`text-sm font-medium ${whatsappStep >= 1 ? 'text-green-600' : 'text-gray-500'}`}>Owner</span>
              <div className={`flex-1 h-1 mx-2 transition ${whatsappStep >= 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition ${whatsappStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>2</div>
              <span className={`text-sm font-medium ${whatsappStep >= 2 ? 'text-green-600' : 'text-gray-500'}`}>Account</span>
              <div className={`flex-1 h-1 mx-2 transition ${whatsappStep >= 3 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition ${whatsappStep >= 3 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>3</div>
              <span className={`text-sm font-medium ${whatsappStep >= 3 ? 'text-green-600' : 'text-gray-500'}`}>Template</span>
            </div>
          </div>

          {/* Step 1: Select Owner */}
          {whatsappStep === 1 && (
            <>
              <h2 className="text-xl font-bold mb-2 text-gray-900">📱 Step 1: Select Owner</h2>
              <p className="text-sm text-gray-600 mb-4">Which owner would you like to send a WhatsApp message to?</p>
              <div className="space-y-2 mb-6">
                {availableOwners.length > 0 ? (
                  availableOwners.map((owner) => (
                    <button
                      key={owner.num}
                      onClick={() => handleSelectOwner(owner.num as 1 | 2 | 3)}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
                    >
                      <div className="font-medium text-gray-900">Owner {owner.num}</div>
                      <div className="text-sm text-gray-600">{owner.name || 'N/A'}</div>
                      <div className="text-sm text-green-600 font-mono">{owner.phone}</div>
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No phone numbers available</p>
                )}
              </div>
            </>
          )}

          {/* Step 2: Select Account */}
          {whatsappStep === 2 && (
            <>
              <h2 className="text-xl font-bold mb-2 text-gray-900">👤 Step 2: Select Account</h2>
              <p className="text-sm text-gray-600 mb-2">Which account should send this message?</p>
              <p className="text-xs text-gray-500 mb-4">Selected Owner: <span className="font-bold text-gray-700">{selectedOwnerData.name || 'N/A'}</span></p>
              <div className="space-y-2 mb-6">
                {whatsappAccounts.length > 0 ? (
                  whatsappAccounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleSelectAccount(account.id)}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                    >
                      <div className="font-medium text-gray-900">{account.account_name}</div>
                      <div className="text-sm text-gray-600">{account.primary_email}</div>
                      <div className="text-sm text-blue-600 font-mono">{account.phone_number}</div>
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No accounts available</p>
                )}
              </div>
            </>
          )}

          {/* Step 3: Select Template */}
          {whatsappStep === 3 && (
            <>
              <h2 className="text-xl font-bold mb-2 text-gray-900">📝 Step 3: Select Template</h2>
              <p className="text-sm text-gray-600 mb-2">Choose a message template to send</p>
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="text-xs bg-gray-100 p-2 rounded">
                  <span className="font-bold text-gray-700">Owner:</span> {selectedOwnerData.name}
                </div>
                <div className="text-xs bg-gray-100 p-2 rounded">
                  <span className="font-bold text-gray-700">Account:</span> {selectedAccount?.account_name}
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                {whatsappTemplates.length > 0 ? (
                  whatsappTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(String(template.id))}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left"
                    >
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-sm text-gray-600 line-clamp-2">{template.body}</div>
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No templates available. Please create one first.</p>
                )}
              </div>
            </>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition font-medium"
            >
              {whatsappStep === 1 ? 'Cancel' : 'Back'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Auth guards ───────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <h1 className="text-2xl font-bold">Welcome to Wasender</h1>
        <button
          onClick={() => signIn("google")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  // ─── Main Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📞 Contacts Manager
        </h1>
        <p className="text-gray-600 mb-6">
          Manage and reach out to your property owners
        </p>

        {/* ─── Controls Section ────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* Sheet Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Sheet
              </label>
              <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                disabled={sheetsLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a sheet...</option>
                {sheets.map((sheet) => (
                  <option key={sheet} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
              {sheetsError && (
                <p className="text-red-600 text-xs mt-1">{sheetsError}</p>
              )}
            </div>

            <button
              onClick={loadContacts}
              disabled={loading || !selectedSheet}
              className="self-end px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition"
            >
              {loading
                ? "Loading..."
                : cacheLoaded
                ? "🔄 Re-sync from Sheet"
                : "📥 Load Contacts"}
            </button>

            <button
              onClick={syncToDatabase}
              disabled={loading || contacts.length === 0}
              className="self-end px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition"
            >
              {loading ? "Syncing..." : "Sync to Database"}
            </button>
          </div>

          {/* Cache indicator */}
          {cacheLoaded && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg text-sm mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span>
                📦 Loaded from cache ({contacts.length} contacts)
                {cacheTime && (
                  <span className="text-blue-500 ml-1">
                    — cached at {cacheTime}
                  </span>
                )}
              </span>
              <button
                onClick={loadContacts}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition"
              >
                🔄 Re-sync
              </button>
            </div>
          )}

          {error && (
            <div
              className={`p-3 rounded-lg text-sm ${
                error.includes("✅")
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {error}
            </div>
          )}
        </div>

        {/* ─── Filters & Sorting Section ───────────────────────────────── */}
        {contacts.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            {/* Search and Sorting Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by unit, owner, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort by Days Remaining
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">No sorting</option>
                  <option value="low-to-high">
                    Low to High (Expiring Soon)
                  </option>
                  <option value="high-to-low">High to Low (Far Away)</option>
                </select>
              </div>
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose
                </label>
                <select
                  multiple
                  value={filters.purpose}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      purpose: Array.from(
                        e.target.selectedOptions,
                        (opt) => opt.value
                      ),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {getUniqueValues("purpose").map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rooms
                </label>
                <select
                  multiple
                  value={filters.rooms}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      rooms: Array.from(
                        e.target.selectedOptions,
                        (opt) => opt.value
                      ),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {getUniqueValues("rooms_en").map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Listing Status
                </label>
                <select
                  multiple
                  value={filters.listing_status}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      listing_status: Array.from(
                        e.target.selectedOptions,
                        (opt) => opt.value
                      ),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {getUniqueValues("listing_status").map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rental Status
                </label>
                <select
                  multiple
                  value={filters.rental_contract_status}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      rental_contract_status: Array.from(
                        e.target.selectedOptions,
                        (opt) => opt.value
                      ),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {getUniqueValues("rental_contract_status").map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ahmed Feedback Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ahmed Feedback 1
                </label>
                <select
                  multiple
                  value={filters.ahmed_feedback_1}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      ahmed_feedback_1: Array.from(
                        e.target.selectedOptions,
                        (opt) => opt.value
                      ),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {getUniqueValues("ahmed_feedback_1").map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ahmed Feedback 2
                </label>
                <select
                  multiple
                  value={filters.ahmed_feedback_2}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      ahmed_feedback_2: Array.from(
                        e.target.selectedOptions,
                        (opt) => opt.value
                      ),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {getUniqueValues("ahmed_feedback_2").map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ahmed Feedback 3
                </label>
                <select
                  multiple
                  value={filters.ahmed_feedback_3}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      ahmed_feedback_3: Array.from(
                        e.target.selectedOptions,
                        (opt) => opt.value
                      ),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {getUniqueValues("ahmed_feedback_3").map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zoha Feedback Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zoha Feedback 1
                </label>
                <select
                  multiple
                  value={filters.zoha_feedback_1}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      zoha_feedback_1: Array.from(
                        e.target.selectedOptions,
                        (opt) => opt.value
                      ),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {getUniqueValues("zoha_feedback_1").map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zoha Feedback 2
                </label>
                <select
                  multiple
                  value={filters.zoha_feedback_2}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      zoha_feedback_2: Array.from(
                        e.target.selectedOptions,
                        (opt) => opt.value
                      ),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {getUniqueValues("zoha_feedback_2").map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zoha Feedback 3
                </label>
                <select
                  multiple
                  value={filters.zoha_feedback_3}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      zoha_feedback_3: Array.from(
                        e.target.selectedOptions,
                        (opt) => opt.value
                      ),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {getUniqueValues("zoha_feedback_3").map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Owner Mobile Filters */}
            <div className="mt-4">
              <h4 className="text-sm font-bold text-gray-700 mb-2">📱 Owner Mobile Filters</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Owner 1 Mobile</label>
                  <select value={filters.owner1Mobile} onChange={(e) => setFilters({...filters, owner1Mobile: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">All</option>
                    <option value="blank">Blank ({contacts.filter(c => !c.owner1_mobile || String(c.owner1_mobile).trim() === '').length})</option>
                    <option value="zero">Zero - 0 ({contacts.filter(c => String(c.owner1_mobile || '').trim() === '0').length})</option>
                    <option value="nonblank">Non-blank ({contacts.filter(c => c.owner1_mobile && String(c.owner1_mobile).trim() !== '' && String(c.owner1_mobile).trim() !== '0').length})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Owner 2 Mobile</label>
                  <select value={filters.owner2Mobile} onChange={(e) => setFilters({...filters, owner2Mobile: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">All</option>
                    <option value="blank">Blank ({contacts.filter(c => !c.owner2_mobile || String(c.owner2_mobile).trim() === '').length})</option>
                    <option value="zero">Zero - 0 ({contacts.filter(c => String(c.owner2_mobile || '').trim() === '0').length})</option>
                    <option value="nonblank">Non-blank ({contacts.filter(c => c.owner2_mobile && String(c.owner2_mobile).trim() !== '' && String(c.owner2_mobile).trim() !== '0').length})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Owner 3 Mobile</label>
                  <select value={filters.owner3Mobile} onChange={(e) => setFilters({...filters, owner3Mobile: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">All</option>
                    <option value="blank">Blank ({contacts.filter(c => !c.owner3_mobile || String(c.owner3_mobile).trim() === '').length})</option>
                    <option value="zero">Zero - 0 ({contacts.filter(c => String(c.owner3_mobile || '').trim() === '0').length})</option>
                    <option value="nonblank">Non-blank ({contacts.filter(c => c.owner3_mobile && String(c.owner3_mobile).trim() !== '' && String(c.owner3_mobile).trim() !== '0').length})</option>
                  </select>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600 font-medium">
              Showing {filteredContacts.length} of {contacts.length} contacts
            </p>
          </div>
        )}

        {/* ─── Contacts Grid ───────────────────────────────────────────── */}
        {filteredContacts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              📋 Contacts ({filteredContacts.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContacts.map((contact) => {
                const daysInfo = calculateDaysRemaining(contact.rent_end_date);
                return (
                  <div
                    key={contact.rowIndex}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4 border-blue-500"
                  >
                    {/* Card Header */}
                    <div
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 cursor-pointer"
                      onClick={() => setSelectedContact(contact)}
                    >
                      <h3 className="text-xl font-bold">
                        {contact.unit || "N/A"}
                      </h3>
                      <p className="text-blue-100 text-sm mt-1">
                        {contact.owner1_name || "No owner"}
                      </p>
                    </div>

                    {/* Card Body */}
                    <div
                      className="p-5 space-y-3 cursor-pointer"
                      onClick={() => setSelectedContact(contact)}
                    >
                      {/* Room Type */}
                      <div className="flex justify-between items-center border-b pb-3">
                        <span className="text-gray-600 font-medium">
                          Rooms:
                        </span>
                        <span className="text-gray-900 font-semibold">
                          {contact.rooms_en || "N/A"}
                        </span>
                      </div>

                      {/* Property Size */}
                      <div className="flex justify-between items-center border-b pb-3">
                        <span className="text-gray-600 font-medium">
                          Property Size:
                        </span>
                        <span className="text-gray-900 font-semibold">
                          {contact.actual_area
                            ? (contact.actual_area * 10.764).toFixed(0)
                            : "N/A"}{" "}
                          sqft
                        </span>
                      </div>

                      {/* Balcony Size */}
                      <div className="flex justify-between items-center border-b pb-3">
                        <span className="text-gray-600 font-medium">
                          Balcony Size:
                        </span>
                        <span className="text-gray-900 font-semibold">
                          {contact.unit_balcony_area
                            ? (contact.unit_balcony_area * 10.764).toFixed(0)
                            : "N/A"}{" "}
                          sqft
                        </span>
                      </div>

                      {/* Days Remaining */}
                      <div
                        className={`flex justify-between items-center p-3 rounded-lg ${
                          daysInfo.days < 30
                            ? "bg-red-100"
                            : daysInfo.days < 90
                            ? "bg-yellow-100"
                            : "bg-green-100"
                        }`}
                      >
                        <span className="text-gray-600 font-medium">
                          Days Remaining:
                        </span>
                        <span
                          className={`font-bold ${
                            daysInfo.days < 30
                              ? "text-red-700"
                              : daysInfo.days < 90
                              ? "text-yellow-700"
                              : "text-green-700"
                          }`}
                        >
                          {daysInfo.text}
                        </span>
                      </div>

                      {/* Listing Status */}
                      <div className="flex justify-between items-center border-b pb-3">
                        <span className="text-gray-600 font-medium">
                          Status:
                        </span>
                        <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                          {contact.listing_status || "N/A"}
                        </span>
                      </div>

                      {/* Contact Number */}
                      {contact.owner1_mobile && (
                        <div className="flex justify-between items-center border-t pt-3 mt-3">
                          <span className="text-gray-600 font-medium">
                            Contact:
                          </span>
                          <a
                            href={`tel:${contact.owner1_mobile}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                          >
                            <span className="text-lg">📞</span>
                            {contact.owner1_mobile}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Card Footer - View + Edit buttons */}
                    <div className="bg-gray-50 px-5 py-3 border-t flex gap-2">
                      <button
                        onClick={() => setSelectedContact(contact)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition font-medium text-sm"
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => openEditModal(contact)}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg transition font-medium text-sm"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Detail Modal (View) ─────────────────────────────────────── */}
        {selectedContact && !showWhatsAppModal && !editingContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-3xl font-bold">{selectedContact.unit}</h2>
                  <p className="text-blue-100 text-sm mt-1">{selectedContact.owner1_name || "No owner"}</p>
                </div>
                <button onClick={() => setSelectedContact(null)} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition">✕</button>
              </div>
              <div className="p-6 space-y-3">
                <ViewSection title="🏠 Property Details" isOpen={openSections['prop'] !== false} onToggle={() => toggleSection('prop')}>
                  <LabelValue label="Unit Number" value={selectedContact.unit} />
                  <LabelValue label="Rooms" value={selectedContact.rooms_en} />
                  <LabelValue label="Property Size" value={selectedContact.actual_area ? `${(selectedContact.actual_area * 10.764).toFixed(0)} sqft` : "—"} />
                  <LabelValue label="Balcony Size" value={selectedContact.unit_balcony_area ? `${(selectedContact.unit_balcony_area * 10.764).toFixed(0)} sqft` : "—"} />
                  <LabelValue label="Parking Number" value={selectedContact.unit_parking_number || "—"} />
                  <LabelValue label="Project Name" value={selectedContact.project_name_en || "—"} />
                </ViewSection>
                <ViewSection title="👤 Owner 1" isOpen={openSections['o1'] !== false} onToggle={() => toggleSection('o1')}>
                  <LabelValue label="Name" value={selectedContact.owner1_name || "—"} />
                  <LabelValue label="Mobile" value={selectedContact.owner1_mobile ? <PhoneLink phone={selectedContact.owner1_mobile} /> : "—"} />
                  <LabelValue label="Email" value={selectedContact.owner1_email ? <span className="break-all">{selectedContact.owner1_email}</span> : "—"} />
                </ViewSection>
                <ViewSection title="👤 Owner 2" isOpen={openSections['o2'] !== false} onToggle={() => toggleSection('o2')}>
                  <LabelValue label="Name" value={selectedContact.owner2_name || "—"} />
                  <LabelValue label="Mobile" value={selectedContact.owner2_mobile ? <PhoneLink phone={selectedContact.owner2_mobile} /> : "—"} />
                  <LabelValue label="Email" value={selectedContact.owner2_email ? <span className="break-all">{selectedContact.owner2_email}</span> : "—"} />
                </ViewSection>
                <ViewSection title="👤 Owner 3" isOpen={openSections['o3'] !== false} onToggle={() => toggleSection('o3')}>
                  <LabelValue label="Name" value={selectedContact.owner3_name || "—"} />
                  <LabelValue label="Mobile" value={selectedContact.owner3_mobile ? <PhoneLink phone={selectedContact.owner3_mobile} /> : "—"} />
                  <LabelValue label="Email" value={selectedContact.owner3_email ? <span className="break-all">{selectedContact.owner3_email}</span> : "—"} />
                </ViewSection>
                <ViewSection title="📅 Rental Details" isOpen={openSections['rent'] !== false} onToggle={() => toggleSection('rent')}>
                  <LabelValue label="Rent Start Date" value={selectedContact.rent_start_date || "—"} />
                  <LabelValue label="Rent End Date" value={selectedContact.rent_end_date || "—"} />
                  <LabelValue label="Rent Price" value={selectedContact.rent_price || "—"} />
                  <LabelValue label="Rent Duration" value={selectedContact.rent_duration || "—"} />
                  <LabelValue label="Days Remaining" value={selectedContact.rent_end_date ? <span className={`font-bold ${calculateDaysRemaining(selectedContact.rent_end_date).days < 30 ? "text-red-600" : calculateDaysRemaining(selectedContact.rent_end_date).days < 90 ? "text-yellow-600" : "text-green-600"}`}>{calculateDaysRemaining(selectedContact.rent_end_date).text}</span> : "—"} />
                  <LabelValue label="Rental Status Date" value={selectedContact.rental_status_date || "—"} />
                  <LabelValue label="Contract A" value={selectedContact.contract_a || "—"} />
                  <LabelValue label="Rental Months Pending/Expired" value={selectedContact.rental_months_pending_expired || "—"} />
                  <LabelValue label="Rental Cheques" value={selectedContact.rental_cheques || "—"} />
                </ViewSection>
                <ViewSection title="🏷️ Listing Info" isOpen={openSections['list'] !== false} onToggle={() => toggleSection('list')}>
                  <LabelValue label="Bayut Rent" value={selectedContact.bayut_rent || "—"} />
                  <LabelValue label="Bayut Sale" value={selectedContact.bayut_sale || "—"} />
                  <LabelValue label="PF Rent" value={selectedContact.pf_rent || "—"} />
                  <LabelValue label="PF Sale" value={selectedContact.pf_sale || "—"} />
                  <LabelValue label="Bayut Rent Prices" value={selectedContact.bayut_rent_prices || "—"} />
                  <LabelValue label="Bayut Sale Prices" value={selectedContact.bayut_sale_prices || "—"} />
                  <LabelValue label="PF Rent Prices" value={selectedContact.pf_rent_prices || "—"} />
                  <LabelValue label="PF Sale Prices" value={selectedContact.pf_sale_prices || "—"} />
                  <LabelValue label="Bayut Links" value={selectedContact.bayut_links || "—"} />
                  <LabelValue label="PF Links" value={selectedContact.pf_links || "—"} />
                </ViewSection>
                <ViewSection title="💰 Sales Transaction Details" isOpen={openSections['sales'] !== false} onToggle={() => toggleSection('sales')}>
                  <LabelValue label="Latest Transaction Date" value={selectedContact.latest_transaction_date || "—"} />
                  <LabelValue label="Latest Transaction Amount" value={selectedContact.latest_transaction_amount || "—"} />
                  <LabelValue label="Occupancy Status (At time of sale)" value={selectedContact.occupancy_status || "—"} />
                </ViewSection>
                <ViewSection title="💬 Feedback" isOpen={openSections['fb'] !== false} onToggle={() => toggleSection('fb')}>
                  <LabelValue label="Ahmed Feedback 1" value={selectedContact.ahmed_feedback_1 || "—"} />
                  <LabelValue label="Ahmed Feedback 2" value={selectedContact.ahmed_feedback_2 || "—"} />
                  <LabelValue label="Ahmed Feedback 3" value={selectedContact.ahmed_feedback_3 || "—"} />
                  <LabelValue label="Zoha Feedback 1" value={selectedContact.zoha_feedback_1 || "—"} />
                  <LabelValue label="Zoha Feedback 2" value={selectedContact.zoha_feedback_2 || "—"} />
                  <LabelValue label="Zoha Feedback 3" value={selectedContact.zoha_feedback_3 || "—"} />
                  <LabelValue label="Zoha Email Feedback 1" value={selectedContact.zoha_email_feedback_1 || "—"} />
                  <LabelValue label="Zoha Email Feedback 2" value={selectedContact.zoha_email_feedback_2 || "—"} />
                  <LabelValue label="Zoha Email Feedback 3" value={selectedContact.zoha_email_feedback_3 || "—"} />
                </ViewSection>
                <ViewSection title="📁 Other" isOpen={openSections['other'] !== false} onToggle={() => toggleSection('other')}>
                  <LabelValue label="Furnishing" value={selectedContact.furnishing || "—"} />
                  <LabelValue label="View" value={selectedContact.view || "—"} />
                  <LabelValue label="Purpose" value={selectedContact.purpose || "—"} />
                  <LabelValue label="VAM Listing Status" value={selectedContact.vam_listing_status || "—"} />
                  <LabelValue label="Listing Status" value={selectedContact.listing_status || "—"} />
                  <LabelValue label="Status" value={selectedContact.status || "—"} />
                  <LabelValue label="Vacancy Status" value={selectedContact.vacancy_status || "—"} />
                  <LabelValue label="Available From" value={selectedContact.available_from || "—"} />
                  <LabelValue label="Images" value={selectedContact.images || "—"} />
                  <LabelValue label="Videos" value={selectedContact.videos || "—"} />
                  <LabelValue label="Documents" value={selectedContact.documents || "—"} />
                  <LabelValue label="Listing Link" value={selectedContact.listing_link || "—"} />
                  <LabelValue label="CRM Listing Link" value={selectedContact.crm_listing_link || "—"} />
                  <LabelValue label="Contract A" value={selectedContact.contract_a || "—"} />
                  <LabelValue label="Owner DOB" value={selectedContact.owner_dob || "—"} />
                </ViewSection>
              </div>
              <div className="bg-gray-50 p-4 border-t flex gap-3 sticky bottom-0">
                <button onClick={() => setSelectedContact(null)} className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition font-medium">Close</button>
                <button onClick={() => { openEditModal(selectedContact); }} className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition font-medium">✏️ Edit</button>
                <button onClick={() => setShowWhatsAppModal(true)} disabled={!selectedContact.owner1_mobile && !selectedContact.owner2_mobile && !selectedContact.owner3_mobile} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium">💬 WhatsApp</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Edit Contact Modal (Full-screen) ────────────────────────── */}
        {editingContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
              {/* Edit Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-5 sm:p-6 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold">
                    ✏️ Edit Contact
                  </h2>
                  <p className="text-yellow-100 text-sm mt-1">
                    {editingContact.unit} — {editingContact.owner1_name || "No owner"}
                  </p>
                </div>
                <button
                  onClick={closeEditModal}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
                >
                  ✕
                </button>
              </div>

              {/* Edit messages */}
              {editError && (
                <div className="mx-6 mt-4 bg-red-100 text-red-800 p-3 rounded-lg text-sm">
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="mx-6 mt-4 bg-green-100 text-green-800 p-3 rounded-lg text-sm">
                  {editSuccess}
                </div>
              )}

              {/* Edit Form Body - Grouped Fields */}
              <div className="p-5 sm:p-6 space-y-6">
                {EDIT_FIELD_GROUPS.map((group) => (
                  <section key={group.title}>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-yellow-400">
                      {group.title}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {group.fields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            {field.label}
                          </label>
                          <input
                            type="text"
                            value={editFormData[field.key] || ""}
                            onChange={(e) =>
                              updateEditField(field.key, e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              {/* Edit Modal Footer */}
              <div className="sticky bottom-0 bg-gray-50 p-5 sm:p-6 border-t flex gap-3">
                <button
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={editSaving}
                  className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
                >
                  {editSaving ? "Saving..." : "💾 Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Selection Modal */}
        <WhatsAppModal />
      </div>
    </div>
  );
}
