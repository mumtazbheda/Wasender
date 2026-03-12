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

type SortOrder = "none" | "low-to-high" | "high-to-low";

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

  // Load sheets
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

      if (!res.ok) {
        setError(data.error || "Failed to load contacts");
        setContacts([]);
      } else {
        setContacts(data.contacts || []);
        setError("");
      }
    } catch (err) {
      setError("Error loading contacts: " + (err instanceof Error ? err.message : "Unknown error"));
      setContacts([]);
      console.error("Failed to load contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Sync to database
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
        setError("✅ Successfully synced " + data.count + " contacts to database");
      }
    } catch (err) {
      setError("Error syncing: " + (err instanceof Error ? err.message : "Unknown error"));
      console.error("Failed to sync:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate days remaining
  const calculateDaysRemaining = (endDate: string): { days: number; text: string } => {
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

  // Get unique values for filters
  const getUniqueValues = (field: keyof Contact) => {
    const values = contacts.map((c) => c[field]).filter(Boolean);
    return [...new Set(values)].sort();
  };

  // Apply filters and sorting
  useEffect(() => {
    let result = contacts.filter((contact) => {
      const matchSearch =
        !searchQuery ||
        contact.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.owner1_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.owner1_mobile.includes(searchQuery);

      const matchFilters =
        (filters.purpose.length === 0 || filters.purpose.includes(contact.purpose)) &&
        (filters.rooms.length === 0 || filters.rooms.includes(contact.rooms_en)) &&
        (filters.listing_status.length === 0 || filters.listing_status.includes(contact.listing_status)) &&
        (filters.rental_contract_status.length === 0 || filters.rental_contract_status.includes(contact.rental_contract_status)) &&
        (filters.zoha_email_feedback_1.length === 0 || filters.zoha_email_feedback_1.includes(contact.zoha_email_feedback_1)) &&
        (filters.zoha_email_feedback_2.length === 0 || filters.zoha_email_feedback_2.includes(contact.zoha_email_feedback_2)) &&
        (filters.zoha_email_feedback_3.length === 0 || filters.zoha_email_feedback_3.includes(contact.zoha_email_feedback_3));

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

  // Label-value pair component
  const LabelValue = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-gray-600 font-medium min-w-[120px]">{label}:</span>
      <span className="text-gray-900 text-right">{value || "N/A"}</span>
    </div>
  );

  // Phone link component
  const PhoneLink = ({ phone }: { phone: string }) => (
    phone ? (
      <a
        href={`tel:${phone}`}
        className="text-blue-600 hover:text-blue-800 underline font-medium"
      >
        {phone}
        <span className="ml-2 text-xs">📞</span>
      </a>
    ) : (
      <span className="text-gray-400">Not provided</span>
    )
  );

  if (status === "loading") {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📞 Contacts Manager</h1>
        <p className="text-gray-600 mb-6">Manage and reach out to your property owners</p>

        {/* Controls Section */}
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
              {sheetsError && <p className="text-red-600 text-xs mt-1">{sheetsError}</p>}
            </div>

            <button
              onClick={loadContacts}
              disabled={loading || !selectedSheet}
              className="self-end px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition"
            >
              {loading ? "Loading..." : "Load Contacts"}
            </button>

            <button
              onClick={syncToDatabase}
              disabled={loading || contacts.length === 0}
              className="self-end px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition"
            >
              {loading ? "Syncing..." : "Sync to Database"}
            </button>
          </div>

          {error && (
            <div className={`p-3 rounded-lg text-sm ${error.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {error}
            </div>
          )}
        </div>

        {/* Filters & Sorting Section */}
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
                  <option value="low-to-high">Low to High (Expiring Soon)</option>
                  <option value="high-to-low">High to Low (Far Away)</option>
                </select>
              </div>
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rooms</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Listing Status</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rental Status</label>
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
            </div>

            <p className="mt-4 text-sm text-gray-600 font-medium">
              Showing {filteredContacts.length} of {contacts.length} contacts
            </p>
          </div>
        )}

        {/* Contacts Grid - REDESIGNED */}
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
                    onClick={() => setSelectedContact(contact)}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl cursor-pointer transition-all duration-300 overflow-hidden border-l-4 border-blue-500"
                  >
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                      <h3 className="text-xl font-bold">{contact.unit || "N/A"}</h3>
                      <p className="text-blue-100 text-sm mt-1">{contact.owner1_name || "No owner"}</p>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-3">
                      {/* Room Type */}
                      <div className="flex justify-between items-center border-b pb-3">
                        <span className="text-gray-600 font-medium">Rooms:</span>
                        <span className="text-gray-900 font-semibold">{contact.rooms_en || "N/A"}</span>
                      </div>

                      {/* Property Size */}
                      <div className="flex justify-between items-center border-b pb-3">
                        <span className="text-gray-600 font-medium">Property Size:</span>
                        <span className="text-gray-900 font-semibold">
                          {contact.actual_area ? (contact.actual_area * 10.764).toFixed(0) : "N/A"} sqft
                        </span>
                      </div>

                      {/* Balcony Size */}
                      <div className="flex justify-between items-center border-b pb-3">
                        <span className="text-gray-600 font-medium">Balcony Size:</span>
                        <span className="text-gray-900 font-semibold">
                          {contact.unit_balcony_area ? (contact.unit_balcony_area * 10.764).toFixed(0) : "N/A"} sqft
                        </span>
                      </div>

                      {/* Days Remaining - Color coded */}
                      <div className={`flex justify-between items-center p-3 rounded-lg ${
                        daysInfo.days < 30 ? "bg-red-100" : daysInfo.days < 90 ? "bg-yellow-100" : "bg-green-100"
                      }`}>
                        <span className="text-gray-600 font-medium">Days Remaining:</span>
                        <span className={`font-bold ${
                          daysInfo.days < 30 ? "text-red-700" : daysInfo.days < 90 ? "text-yellow-700" : "text-green-700"
                        }`}>
                          {daysInfo.text}
                        </span>
                      </div>

                      {/* Listing Status */}
                      <div className="flex justify-between items-center border-b pb-3">
                        <span className="text-gray-600 font-medium">Status:</span>
                        <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                          {contact.listing_status || "N/A"}
                        </span>
                      </div>

                      {/* Contact Number - Clickable */}
                      {contact.owner1_mobile && (
                        <div className="flex justify-between items-center border-t pt-3 mt-3">
                          <span className="text-gray-600 font-medium">Contact:</span>
                          <a
                            href={`tel:${contact.owner1_mobile}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
                          >
                            {contact.owner1_mobile} 📞
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="bg-gray-50 px-5 py-3 border-t">
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition font-medium text-sm">
                        View Full Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detail Modal - REDESIGNED */}
        {selectedContact && !showWhatsAppModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold">{selectedContact.unit}</h2>
                  <p className="text-blue-100 text-sm mt-1">{selectedContact.owner1_name || "No owner"}</p>
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
                    <LabelValue label="Unit Number" value={selectedContact.unit} />
                    <LabelValue label="Rooms" value={selectedContact.rooms_en} />
                    <LabelValue
                      label="Property Size"
                      value={selectedContact.actual_area ? `${(selectedContact.actual_area * 10.764).toFixed(0)} sqft` : "N/A"}
                    />
                    <LabelValue
                      label="Balcony Size"
                      value={selectedContact.unit_balcony_area ? `${(selectedContact.unit_balcony_area * 10.764).toFixed(0)} sqft` : "N/A"}
                    />
                    <LabelValue label="Parking Number" value={selectedContact.unit_parking_number} />
                    <LabelValue label="Furnishing" value={selectedContact.furnishing} />
                  </div>
                </section>

                {/* Owner 1 */}
                {selectedContact.owner1_name && (
                  <section>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                      👤 Owner 1
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                      <LabelValue label="Name" value={selectedContact.owner1_name} />
                      <LabelValue label="Mobile" value={<PhoneLink phone={selectedContact.owner1_mobile} />} />
                      <LabelValue label="Email" value={selectedContact.owner1_email} />
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
                      <LabelValue label="Name" value={selectedContact.owner2_name} />
                      <LabelValue label="Mobile" value={<PhoneLink phone={selectedContact.owner2_mobile} />} />
                      <LabelValue label="Email" value={selectedContact.owner2_email} />
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
                      <LabelValue label="Name" value={selectedContact.owner3_name} />
                      <LabelValue label="Mobile" value={<PhoneLink phone={selectedContact.owner3_mobile} />} />
                      <LabelValue label="Email" value={selectedContact.owner3_email} />
                    </div>
                  </section>
                )}

                {/* Rental Details */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                    📅 Rental Details
                  </h3>
                  <div className="space-y-3">
                    <LabelValue label="Rent Start Date" value={selectedContact.rent_start_date} />
                    <LabelValue label="Rent End Date" value={selectedContact.rent_end_date} />
                    <LabelValue label="Rent Price" value={selectedContact.rent_price} />
                    <LabelValue label="Rent Duration" value={selectedContact.rent_duration} />
                    <LabelValue
                      label="Days Remaining"
                      value={
                        <span className={`font-bold ${
                          calculateDaysRemaining(selectedContact.rent_end_date).days < 30 ? "text-red-600" : 
                          calculateDaysRemaining(selectedContact.rent_end_date).days < 90 ? "text-yellow-600" : "text-green-600"
                        }`}>
                          {calculateDaysRemaining(selectedContact.rent_end_date).text}
                        </span>
                      }
                    />
                    <LabelValue label="Listing Status" value={selectedContact.listing_status} />
                    <LabelValue label="Rental Contract Status" value={selectedContact.rental_contract_status} />
                  </div>
                </section>

                {/* Purpose & Status */}
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                    📋 Additional Info
                  </h3>
                  <div className="space-y-3">
                    <LabelValue label="Purpose" value={selectedContact.purpose} />
                    <LabelValue label="Status" value={selectedContact.status} />
                    <LabelValue label="Occupancy Status" value={selectedContact.occupancy_status} />
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
                    setSelectedMobile(selectedContact.owner1_mobile);
                    setShowWhatsAppModal(true);
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
      </div>
    </div>
  );
}
