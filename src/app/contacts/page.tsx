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
}

interface Template {
  id: string;
  name: string;
  body: string;
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
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedMobile, setSelectedMobile] = useState<string>("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Filters state
  const [filters, setFilters] = useState({
    purpose: [] as string[],
    rooms: [] as string[],
    listing_status: [] as string[],
    rental_contract_status: [] as string[],
    zoha_email_feedback_1: [] as string[],
    zoha_email_feedback_2: [] as string[],
    zoha_email_feedback_3: [] as string[],
  });

  // Load sheets - FIX: Use correct key name "tabs" not "sheets"
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
          // FIX: Use data.tabs, not data.sheets
          const tabsList = data.tabs || [];
          setSheets(tabsList);
          if (tabsList.length === 0) {
            setSheetsError("No sheets found in Google Sheet");
          }
        }
      } catch (err) {
        setSheetsError("Error loading sheets: " + (err instanceof Error ? err.message : "Unknown error"));
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

  // Load templates
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

  // Load contacts from sheet
  const loadContacts = async () => {
    if (!selectedSheet) {
      setError("Please select a sheet");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/sheet-data?sheetName=${encodeURIComponent(selectedSheet)}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to load data");
        setContacts([]);
        setFilteredContacts([]);
      } else {
        setContacts(data.data || []);
        setFilteredContacts(data.data || []);
        setFilters({
          purpose: [],
          rooms: [],
          listing_status: [],
          rental_contract_status: [],
          zoha_email_feedback_1: [],
          zoha_email_feedback_2: [],
          zoha_email_feedback_3: [],
        });
      }
    } catch (err) {
      setError("Error loading contacts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Sync to database
  const handleSync = async () => {
    if (!selectedSheet) {
      setError("Please select a sheet");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sync-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetName: selectedSheet }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Sync failed");
      } else {
        setError("");
        // Reload contacts after sync
        await loadContacts();
      }
    } catch (err) {
      setError("Sync error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate days remaining
  const calculateDaysRemaining = (endDate: string) => {
    if (!endDate) return "N/A";
    try {
      const end = new Date(endDate);
      const today = new Date();
      const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff > 0) {
        const months = Math.floor(diff / 30);
        const days = diff % 30;
        return `${months}m ${days}d remaining`;
      } else if (diff < 0) {
        const absDiff = Math.abs(diff);
        const months = Math.floor(absDiff / 30);
        const days = absDiff % 30;
        return `${months}m ${days}d expired`;
      } else {
        return "Due today";
      }
    } catch {
      return "N/A";
    }
  };

  // Filter contacts
  useEffect(() => {
    let filtered = contacts.filter((contact) => {
      const matchesSearch =
        (contact.unit || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contact.owner1_name || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPurpose =
        filters.purpose.length === 0 ||
        filters.purpose.includes(contact.purpose);

      const matchesRooms =
        filters.rooms.length === 0 ||
        filters.rooms.includes(contact.rooms_en);

      const matchesListingStatus =
        filters.listing_status.length === 0 ||
        filters.listing_status.includes(contact.listing_status);

      const matchesRentalStatus =
        filters.rental_contract_status.length === 0 ||
        filters.rental_contract_status.includes(contact.rental_contract_status);

      const matchesFeedback1 =
        filters.zoha_email_feedback_1.length === 0 ||
        filters.zoha_email_feedback_1.includes(contact.zoha_email_feedback_1);

      const matchesFeedback2 =
        filters.zoha_email_feedback_2.length === 0 ||
        filters.zoha_email_feedback_2.includes(contact.zoha_email_feedback_2);

      const matchesFeedback3 =
        filters.zoha_email_feedback_3.length === 0 ||
        filters.zoha_email_feedback_3.includes(contact.zoha_email_feedback_3);

      return (
        matchesSearch &&
        matchesPurpose &&
        matchesRooms &&
        matchesListingStatus &&
        matchesRentalStatus &&
        matchesFeedback1 &&
        matchesFeedback2 &&
        matchesFeedback3
      );
    });

    setFilteredContacts(filtered);
  }, [contacts, filters, searchQuery]);

  // Get unique values for filters
  const getUniqueValues = (key: keyof Contact) => {
    return [...new Set(contacts.map((c) => c[key]).filter(Boolean))].sort();
  };

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in Required</h1>
          <p className="text-gray-600 mb-6">Sign in with Google to access your contacts</p>
          <button
            onClick={() => signIn("google")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Sheet Selection Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">📊 Select Sheet</h2>
          
          {sheetsLoading ? (
            <div className="flex items-center text-gray-600">
              <span className="inline-block animate-spin mr-2">⏳</span>
              Loading sheets...
            </div>
          ) : sheetsError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              ❌ {sheetsError}
            </div>
          ) : sheets.length > 0 ? (
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sheet Name
                </label>
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Select a sheet --</option>
                  {sheets.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={loadContacts}
                disabled={!selectedSheet || loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition"
              >
                {loading ? "Loading..." : "📥 Load Contacts"}
              </button>

              <button
                onClick={handleSync}
                disabled={!selectedSheet || loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition"
              >
                {loading ? "Syncing..." : "🔄 Sync to Database"}
              </button>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
              ⚠️ No sheets found. Make sure the Google Sheet is accessible.
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {/* Filters Section */}
        {contacts.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">🎯 Filters</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Unit or Owner
                </label>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Purpose Filter */}
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
                      purpose: Array.from(e.target.selectedOptions, (opt) => opt.value),
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

              {/* Rooms Filter */}
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
                      rooms: Array.from(e.target.selectedOptions, (opt) => opt.value),
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

              {/* Listing Status Filter */}
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
                      listing_status: Array.from(e.target.selectedOptions, (opt) => opt.value),
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

              {/* Rental Contract Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rental Contract Status
                </label>
                <select
                  multiple
                  value={filters.rental_contract_status}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      rental_contract_status: Array.from(e.target.selectedOptions, (opt) => opt.value),
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

              {/* Zoha Email Feedback Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zoha Email Feedback 1
                </label>
                <select
                  multiple
                  value={filters.zoha_email_feedback_1}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      zoha_email_feedback_1: Array.from(e.target.selectedOptions, (opt) => opt.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {getUniqueValues("zoha_email_feedback_1").map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600">
              Showing {filteredContacts.length} of {contacts.length} contacts
            </p>
          </div>
        )}

        {/* Contacts Grid */}
        {filteredContacts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              📋 Contacts ({filteredContacts.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.rowIndex}
                  onClick={() => setSelectedContact(contact)}
                  className="bg-white rounded-lg shadow hover:shadow-lg cursor-pointer transition p-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {contact.unit || "N/A"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {contact.owner1_name || "No owner"}
                  </p>

                  <div className="mt-3 space-y-1 text-sm">
                    <p>
                      🏠 <span className="font-medium">{contact.rooms_en || "N/A"}</span> rooms
                    </p>
                    <p>
                      📐{" "}
                      <span className="font-medium">
                        {contact.actual_area
                          ? (contact.actual_area * 10.764).toFixed(0)
                          : "N/A"}
                      </span>{" "}
                      sqft
                    </p>
                    <p>
                      🏞️{" "}
                      <span className="font-medium">
                        {contact.unit_balcony_area
                          ? (contact.unit_balcony_area * 10.764).toFixed(0)
                          : "N/A"}
                      </span>{" "}
                      sqft balcony
                    </p>
                    <p>
                      📅{" "}
                      <span className="font-medium">
                        {calculateDaysRemaining(contact.rent_end_date)}
                      </span>
                    </p>
                    <p>
                      🏷️{" "}
                      <span className="font-medium">
                        {contact.listing_status || "N/A"}
                      </span>
                    </p>
                    <p>
                      📋{" "}
                      <span className="font-medium">
                        {contact.rental_contract_status || "N/A"}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedContact(contact);
                      setShowWhatsAppModal(false);
                    }}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition text-sm"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedContact && !showWhatsAppModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold">📋 Contact Details</h2>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Group 1: Property Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">
                    🏠 Property Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <p>
                      <span className="font-medium">Unit:</span> {selectedContact.unit}
                    </p>
                    <p>
                      <span className="font-medium">Rooms:</span>{" "}
                      {selectedContact.rooms_en}
                    </p>
                    <p>
                      <span className="font-medium">Property Size:</span>{" "}
                      {selectedContact.actual_area
                        ? (selectedContact.actual_area * 10.764).toFixed(0)
                        : "N/A"}{" "}
                      sqft
                    </p>
                    <p>
                      <span className="font-medium">Balcony Size:</span>{" "}
                      {selectedContact.unit_balcony_area
                        ? (selectedContact.unit_balcony_area * 10.764).toFixed(0)
                        : "N/A"}{" "}
                      sqft
                    </p>
                    <p>
                      <span className="font-medium">Parking:</span>{" "}
                      {selectedContact.unit_parking_number || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Group 2: Owners Details */}
                {(selectedContact.owner1_name ||
                  selectedContact.owner2_name ||
                  selectedContact.owner3_name) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">
                      👥 Owners Details
                    </h3>
                    <div className="space-y-3 text-sm">
                      {selectedContact.owner1_name && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="font-medium">Owner 1</p>
                          <p>Name: {selectedContact.owner1_name}</p>
                          {selectedContact.owner1_mobile && (
                            <p>Mobile: {selectedContact.owner1_mobile}</p>
                          )}
                          {selectedContact.owner1_email && (
                            <p>Email: {selectedContact.owner1_email}</p>
                          )}
                        </div>
                      )}
                      {selectedContact.owner2_name && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="font-medium">Owner 2</p>
                          <p>Name: {selectedContact.owner2_name}</p>
                          {selectedContact.owner2_mobile && (
                            <p>Mobile: {selectedContact.owner2_mobile}</p>
                          )}
                          {selectedContact.owner2_email && (
                            <p>Email: {selectedContact.owner2_email}</p>
                          )}
                        </div>
                      )}
                      {selectedContact.owner3_name && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="font-medium">Owner 3</p>
                          <p>Name: {selectedContact.owner3_name}</p>
                          {selectedContact.owner3_mobile && (
                            <p>Mobile: {selectedContact.owner3_mobile}</p>
                          )}
                          {selectedContact.owner3_email && (
                            <p>Email: {selectedContact.owner3_email}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Group 3: Sale Transaction Details */}
                {(selectedContact.latest_transaction_date ||
                  selectedContact.latest_transaction_amount ||
                  selectedContact.occupancy_status) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">
                      💰 Sale Transaction Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedContact.latest_transaction_date && (
                        <p>
                          <span className="font-medium">Latest Date:</span>{" "}
                          {selectedContact.latest_transaction_date}
                        </p>
                      )}
                      {selectedContact.latest_transaction_amount && (
                        <p>
                          <span className="font-medium">Amount:</span>{" "}
                          {selectedContact.latest_transaction_amount}
                        </p>
                      )}
                      {selectedContact.occupancy_status && (
                        <p>
                          <span className="font-medium">Occupancy:</span>{" "}
                          {selectedContact.occupancy_status}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Group 4: Rent Transaction Details */}
                {(selectedContact.rent_start_date ||
                  selectedContact.rent_end_date ||
                  selectedContact.rent_price) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">
                      🏠 Rent Transaction Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedContact.rent_start_date && (
                        <p>
                          <span className="font-medium">Start Date:</span>{" "}
                          {selectedContact.rent_start_date}
                        </p>
                      )}
                      {selectedContact.rent_end_date && (
                        <p>
                          <span className="font-medium">End Date:</span>{" "}
                          {selectedContact.rent_end_date}
                        </p>
                      )}
                      {selectedContact.rent_duration && (
                        <p>
                          <span className="font-medium">Duration:</span>{" "}
                          {selectedContact.rent_duration}
                        </p>
                      )}
                      {selectedContact.rent_price && (
                        <p>
                          <span className="font-medium">Price:</span>{" "}
                          {selectedContact.rent_price}
                        </p>
                      )}
                      <p className="col-span-2">
                        <span className="font-medium">Status:</span>{" "}
                        {calculateDaysRemaining(selectedContact.rent_end_date)}
                      </p>
                      {selectedContact.rental_status_date && (
                        <p>
                          <span className="font-medium">Status Date:</span>{" "}
                          {selectedContact.rental_status_date}
                        </p>
                      )}
                      {selectedContact.rental_contract_status && (
                        <p>
                          <span className="font-medium">Contract Status:</span>{" "}
                          {selectedContact.rental_contract_status}
                        </p>
                      )}
                      {selectedContact.rental_months_pending_expired && (
                        <p>
                          <span className="font-medium">Months Pending/Expired:</span>{" "}
                          {selectedContact.rental_months_pending_expired}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Group 5: Feedbacks */}
                {(selectedContact.zoha_feedback_1 ||
                  selectedContact.zoha_feedback_2 ||
                  selectedContact.zoha_feedback_3 ||
                  selectedContact.ahmed_feedback_1 ||
                  selectedContact.ahmed_feedback_2 ||
                  selectedContact.ahmed_feedback_3 ||
                  selectedContact.zoha_email_feedback_1 ||
                  selectedContact.zoha_email_feedback_2 ||
                  selectedContact.zoha_email_feedback_3 ||
                  selectedContact.status) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">
                      💬 Feedbacks
                    </h3>
                    <div className="space-y-2 text-sm">
                      {selectedContact.zoha_feedback_1 && (
                        <p className="break-words">
                          <span className="font-medium">Zoha Feedback 1:</span>{" "}
                          {selectedContact.zoha_feedback_1}
                        </p>
                      )}
                      {selectedContact.zoha_feedback_2 && (
                        <p className="break-words">
                          <span className="font-medium">Zoha Feedback 2:</span>{" "}
                          {selectedContact.zoha_feedback_2}
                        </p>
                      )}
                      {selectedContact.zoha_feedback_3 && (
                        <p className="break-words">
                          <span className="font-medium">Zoha Feedback 3:</span>{" "}
                          {selectedContact.zoha_feedback_3}
                        </p>
                      )}
                      {selectedContact.ahmed_feedback_1 && (
                        <p className="break-words">
                          <span className="font-medium">Ahmed Feedback 1:</span>{" "}
                          {selectedContact.ahmed_feedback_1}
                        </p>
                      )}
                      {selectedContact.ahmed_feedback_2 && (
                        <p className="break-words">
                          <span className="font-medium">Ahmed Feedback 2:</span>{" "}
                          {selectedContact.ahmed_feedback_2}
                        </p>
                      )}
                      {selectedContact.ahmed_feedback_3 && (
                        <p className="break-words">
                          <span className="font-medium">Ahmed Feedback 3:</span>{" "}
                          {selectedContact.ahmed_feedback_3}
                        </p>
                      )}
                      {selectedContact.zoha_email_feedback_1 && (
                        <p className="break-words">
                          <span className="font-medium">Zoha Email Feedback 1:</span>{" "}
                          {selectedContact.zoha_email_feedback_1}
                        </p>
                      )}
                      {selectedContact.zoha_email_feedback_2 && (
                        <p className="break-words">
                          <span className="font-medium">Zoha Email Feedback 2:</span>{" "}
                          {selectedContact.zoha_email_feedback_2}
                        </p>
                      )}
                      {selectedContact.zoha_email_feedback_3 && (
                        <p className="break-words">
                          <span className="font-medium">Zoha Email Feedback 3:</span>{" "}
                          {selectedContact.zoha_email_feedback_3}
                        </p>
                      )}
                      {selectedContact.status && (
                        <p className="break-words">
                          <span className="font-medium">Status:</span>{" "}
                          {selectedContact.status}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Group 6: Property Availability Status */}
                {(selectedContact.furnishing ||
                  selectedContact.asking_sale_price ||
                  selectedContact.asking_rent_price ||
                  selectedContact.images ||
                  selectedContact.videos ||
                  selectedContact.documents ||
                  selectedContact.vacancy_status ||
                  selectedContact.vam_listing_status ||
                  selectedContact.listing_link ||
                  selectedContact.owner_dob ||
                  selectedContact.crm_listing_link ||
                  selectedContact.contract_a ||
                  selectedContact.rental_cheques ||
                  selectedContact.available_from ||
                  selectedContact.view) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">
                      🏢 Property Availability Status
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedContact.furnishing && (
                        <p>
                          <span className="font-medium">Furnishing:</span>{" "}
                          {selectedContact.furnishing}
                        </p>
                      )}
                      {selectedContact.asking_sale_price && (
                        <p>
                          <span className="font-medium">Sale Price:</span>{" "}
                          {selectedContact.asking_sale_price}
                        </p>
                      )}
                      {selectedContact.asking_rent_price && (
                        <p>
                          <span className="font-medium">Rent Price:</span>{" "}
                          {selectedContact.asking_rent_price}
                        </p>
                      )}
                      {selectedContact.images && (
                        <p>
                          <span className="font-medium">Images:</span>{" "}
                          {selectedContact.images}
                        </p>
                      )}
                      {selectedContact.videos && (
                        <p>
                          <span className="font-medium">Videos:</span>{" "}
                          {selectedContact.videos}
                        </p>
                      )}
                      {selectedContact.documents && (
                        <p>
                          <span className="font-medium">Documents:</span>{" "}
                          {selectedContact.documents}
                        </p>
                      )}
                      {selectedContact.vacancy_status && (
                        <p>
                          <span className="font-medium">Vacancy:</span>{" "}
                          {selectedContact.vacancy_status}
                        </p>
                      )}
                      {selectedContact.vam_listing_status && (
                        <p>
                          <span className="font-medium">VAM Status:</span>{" "}
                          {selectedContact.vam_listing_status}
                        </p>
                      )}
                      {selectedContact.listing_link && (
                        <p>
                          <span className="font-medium">Listing Link:</span>{" "}
                          {selectedContact.listing_link}
                        </p>
                      )}
                      {selectedContact.owner_dob && (
                        <p>
                          <span className="font-medium">Owner DOB:</span>{" "}
                          {selectedContact.owner_dob}
                        </p>
                      )}
                      {selectedContact.crm_listing_link && (
                        <p>
                          <span className="font-medium">CRM Link:</span>{" "}
                          {selectedContact.crm_listing_link}
                        </p>
                      )}
                      {selectedContact.contract_a && (
                        <p>
                          <span className="font-medium">Contract:</span>{" "}
                          {selectedContact.contract_a}
                        </p>
                      )}
                      {selectedContact.rental_cheques && (
                        <p>
                          <span className="font-medium">Cheques:</span>{" "}
                          {selectedContact.rental_cheques}
                        </p>
                      )}
                      {selectedContact.available_from && (
                        <p>
                          <span className="font-medium">Available From:</span>{" "}
                          {selectedContact.available_from}
                        </p>
                      )}
                      {selectedContact.view && (
                        <p>
                          <span className="font-medium">View:</span>{" "}
                          {selectedContact.view}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 px-4 py-2 rounded-lg transition"
                >
                  Close
                </button>
                <button
                  onClick={() => setShowWhatsAppModal(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                >
                  💬 Open in WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Modal */}
        {showWhatsAppModal && selectedContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-xl font-bold">💬 Send WhatsApp Message</h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Mobile Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Mobile Number
                  </label>
                  <select
                    value={selectedMobile}
                    onChange={(e) => setSelectedMobile(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Select --</option>
                    {selectedContact.owner1_mobile && (
                      <option value={selectedContact.owner1_mobile}>
                        Mobile 1: {selectedContact.owner1_mobile}
                      </option>
                    )}
                    {selectedContact.owner2_mobile && (
                      <option value={selectedContact.owner2_mobile}>
                        Mobile 2: {selectedContact.owner2_mobile}
                      </option>
                    )}
                    {selectedContact.owner3_mobile && (
                      <option value={selectedContact.owner3_mobile}>
                        Mobile 3: {selectedContact.owner3_mobile}
                      </option>
                    )}
                  </select>
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Select Template --</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message Preview */}
                {selectedTemplate && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Message Preview
                    </p>
                    <p className="text-sm text-gray-600 break-words">
                      {templates
                        .find((t) => t.id === selectedTemplate)
                        ?.body.replace("{unit}", selectedContact.unit)}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 p-6 flex gap-3">
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedMobile && selectedTemplate) {
                      const template = templates.find(
                        (t) => t.id === selectedTemplate
                      );
                      if (template) {
                        const message = template.body.replace(
                          "{unit}",
                          selectedContact.unit
                        );
                        window.open(
                          `https://wa.me/${selectedMobile}?text=${encodeURIComponent(
                            message
                          )}`,
                          "_blank"
                        );
                        setShowWhatsAppModal(false);
                      }
                    }
                  }}
                  disabled={!selectedMobile || !selectedTemplate}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition"
                >
                  ✓ Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
