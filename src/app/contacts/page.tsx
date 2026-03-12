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
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
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
    const values = contacts.map((c) => c[field]).filter(Boolean);
    return [...new Set(values)].sort();
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

      const matchFilters =
        (filters.purpose.length === 0 ||
          filters.purpose.includes(contact.purpose)) &&
        (filters.rooms.length === 0 ||
          filters.rooms.includes(contact.rooms_en)) &&
        (filters.listing_status.length === 0 ||
          filters.listing_status.includes(contact.listing_status)) &&
        (filters.rental_contract_status.length === 0 ||
          filters.rental_contract_status.includes(
            contact.rental_contract_status
          )) &&
        (filters.ahmed_feedback_1.length === 0 ||
          filters.ahmed_feedback_1.includes(contact.ahmed_feedback_1)) &&
        (filters.ahmed_feedback_2.length === 0 ||
          filters.ahmed_feedback_2.includes(contact.ahmed_feedback_2)) &&
        (filters.ahmed_feedback_3.length === 0 ||
          filters.ahmed_feedback_3.includes(contact.ahmed_feedback_3)) &&
        (filters.zoha_feedback_1.length === 0 ||
          filters.zoha_feedback_1.includes(contact.zoha_feedback_1)) &&
        (filters.zoha_feedback_2.length === 0 ||
          filters.zoha_feedback_2.includes(contact.zoha_feedback_2)) &&
        (filters.zoha_feedback_3.length === 0 ||
          filters.zoha_feedback_3.includes(contact.zoha_feedback_3));

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
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold">
                    {selectedContact.unit}
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {selectedContact.owner1_name || "No owner"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 space-y-8">
                {/* Property Details */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                    🏠 Property Details
                  </h3>
                  <div className="space-y-3">
                    <LabelValue
                      label="Unit Number"
                      value={selectedContact.unit}
                    />
                    <LabelValue
                      label="Rooms"
                      value={selectedContact.rooms_en}
                    />
                    <LabelValue
                      label="Property Size"
                      value={
                        selectedContact.actual_area
                          ? `${(selectedContact.actual_area * 10.764).toFixed(0)} sqft`
                          : "N/A"
                      }
                    />
                    <LabelValue
                      label="Balcony Size"
                      value={
                        selectedContact.unit_balcony_area
                          ? `${(selectedContact.unit_balcony_area * 10.764).toFixed(0)} sqft`
                          : "N/A"
                      }
                    />
                    <LabelValue
                      label="Parking Number"
                      value={selectedContact.unit_parking_number}
                    />
                    <LabelValue
                      label="Furnishing"
                      value={selectedContact.furnishing}
                    />
                  </div>
                </section>

                {/* Owner 1 */}
                {selectedContact.owner1_name && (
                  <section>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                      👤 Owner 1
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                      <LabelValue
                        label="Name"
                        value={selectedContact.owner1_name}
                      />
                      <LabelValue
                        label="Mobile"
                        value={
                          <PhoneLink phone={selectedContact.owner1_mobile} />
                        }
                      />
                      <LabelValue
                        label="Email"
                        value={
                          <span className="break-all">
                            {selectedContact.owner1_email}
                          </span>
                        }
                      />
                    </div>
                  </section>
                )}

                {/* Owner 2 */}
                {selectedContact.owner2_name && (
                  <section>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                      👤 Owner 2
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                      <LabelValue
                        label="Name"
                        value={selectedContact.owner2_name}
                      />
                      <LabelValue
                        label="Mobile"
                        value={
                          <PhoneLink phone={selectedContact.owner2_mobile} />
                        }
                      />
                      <LabelValue
                        label="Email"
                        value={
                          <span className="break-all">
                            {selectedContact.owner2_email}
                          </span>
                        }
                      />
                    </div>
                  </section>
                )}

                {/* Owner 3 */}
                {selectedContact.owner3_name && (
                  <section>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                      👤 Owner 3
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                      <LabelValue
                        label="Name"
                        value={selectedContact.owner3_name}
                      />
                      <LabelValue
                        label="Mobile"
                        value={
                          <PhoneLink phone={selectedContact.owner3_mobile} />
                        }
                      />
                      <LabelValue
                        label="Email"
                        value={
                          <span className="break-all">
                            {selectedContact.owner3_email}
                          </span>
                        }
                      />
                    </div>
                  </section>
                )}

                {/* Rental Details */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                    📅 Rental Details
                  </h3>
                  <div className="space-y-3">
                    <LabelValue
                      label="Rent Start Date"
                      value={selectedContact.rent_start_date}
                    />
                    <LabelValue
                      label="Rent End Date"
                      value={selectedContact.rent_end_date}
                    />
                    <LabelValue
                      label="Rent Price"
                      value={selectedContact.rent_price}
                    />
                    <LabelValue
                      label="Rent Duration"
                      value={selectedContact.rent_duration}
                    />
                    <LabelValue
                      label="Days Remaining"
                      value={
                        <span
                          className={`font-bold ${
                            calculateDaysRemaining(
                              selectedContact.rent_end_date
                            ).days < 30
                              ? "text-red-600"
                              : calculateDaysRemaining(
                                  selectedContact.rent_end_date
                                ).days < 90
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          {
                            calculateDaysRemaining(
                              selectedContact.rent_end_date
                            ).text
                          }
                        </span>
                      }
                    />
                    <LabelValue
                      label="Listing Status"
                      value={selectedContact.listing_status}
                    />
                    <LabelValue
                      label="Rental Contract Status"
                      value={selectedContact.rental_contract_status}
                    />
                  </div>
                </section>

                {/* Additional Info */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                    📋 Additional Info
                  </h3>
                  <div className="space-y-3">
                    <LabelValue
                      label="Purpose"
                      value={selectedContact.purpose}
                    />
                    <LabelValue
                      label="Status"
                      value={selectedContact.status}
                    />
                    <LabelValue
                      label="Occupancy Status"
                      value={selectedContact.occupancy_status}
                    />
                  </div>
                </section>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 p-6 border-t flex gap-3">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    openEditModal(selectedContact);
                  }}
                  className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition font-medium"
                >
                  ✏️ Edit Contact
                </button>
                <button
                  onClick={() => {
                    const phone = (selectedContact.owner1_mobile || '').replace(/[^0-9+]/g, '');
                    if (phone) {
                      window.open('https://wa.me/' + phone.replace('+', ''), '_blank');
                    }
                  }}
                  disabled={!selectedContact.owner1_mobile}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
                >
                  💬 WhatsApp
                </button>
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
      </div>
    </div>
  );
}
