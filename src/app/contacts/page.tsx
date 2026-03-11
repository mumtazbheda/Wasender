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
  const [sheets, setSheets] = useState<any[]>([]);
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

  // Load sheets
  useEffect(() => {
    const loadSheets = async () => {
      try {
        const res = await fetch("/api/sheet-tabs");
        const data = await res.json();
        setSheets(data.sheets || []);
      } catch (err) {
        console.error("Failed to load sheets:", err);
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

      if (diff < 0) return `${Math.abs(diff)} days expired`;

      const months = Math.floor(diff / 30);
      const days = diff % 30;

      if (months > 0 && days > 0) {
        return `${months}M ${days}D remaining`;
      } else if (months > 0) {
        return `${months}M remaining`;
      } else {
        return `${days}D remaining`;
      }
    } catch {
      return "Invalid date";
    }
  };

  // Convert sqm to sqft
  const convertToSqft = (sqm: number | string): string => {
    if (!sqm || sqm === "" || sqm === "0") return "N/A";
    const value = typeof sqm === "string" ? parseFloat(sqm) : sqm;
    if (isNaN(value)) return "N/A";
    const sqft = Math.round(value * 10.764);
    return `${sqft} sqft`;
  };

  // Get unique values for filters
  const getUniqueValues = (field: keyof Contact): string[] => {
    return Array.from(new Set(contacts.map((c) => c[field]).filter(Boolean).map(String)))
      .filter((v) => v.trim() !== "")
      .sort();
  };

  // Apply filters
  useEffect(() => {
    let filtered = contacts;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.unit?.toLowerCase().includes(q) ||
          c.owner1_name?.toLowerCase().includes(q) ||
          c.owner1_mobile?.toLowerCase().includes(q) ||
          c.owner2_name?.toLowerCase().includes(q) ||
          c.owner2_mobile?.toLowerCase().includes(q)
      );
    }

    // Apply all filters
    if (filters.purpose.length > 0) {
      filtered = filtered.filter((c) => filters.purpose.includes(c.purpose));
    }
    if (filters.rooms.length > 0) {
      filtered = filtered.filter((c) => filters.rooms.includes(c.rooms_en));
    }
    if (filters.listing_status.length > 0) {
      filtered = filtered.filter((c) => filters.listing_status.includes(c.listing_status));
    }
    if (filters.rental_contract_status.length > 0) {
      filtered = filtered.filter((c) => filters.rental_contract_status.includes(c.rental_contract_status));
    }
    if (filters.zoha_email_feedback_1.length > 0) {
      filtered = filtered.filter((c) => filters.zoha_email_feedback_1.includes(c.zoha_email_feedback_1));
    }
    if (filters.zoha_email_feedback_2.length > 0) {
      filtered = filtered.filter((c) => filters.zoha_email_feedback_2.includes(c.zoha_email_feedback_2));
    }
    if (filters.zoha_email_feedback_3.length > 0) {
      filtered = filtered.filter((c) => filters.zoha_email_feedback_3.includes(c.zoha_email_feedback_3));
    }

    setFilteredContacts(filtered);
  }, [searchQuery, filters, contacts]);

  // Handle WhatsApp
  const handleWhatsAppClick = (contact: Contact) => {
    const mobiles = [
      { label: "Mobile 1", value: contact.owner1_mobile },
      { label: "Mobile 2", value: contact.owner2_mobile },
      { label: "Mobile 3", value: contact.owner3_mobile },
    ].filter((m) => m.value && m.value.trim() !== "");

    if (mobiles.length === 0) {
      setError("No mobile numbers available");
      return;
    }

    if (mobiles.length === 1) {
      setSelectedMobile(mobiles[0].value);
      setShowWhatsAppModal(true);
    } else {
      setSelectedContact(contact);
      setShowWhatsAppModal(true);
    }
  };

  const sendWhatsAppMessage = async () => {
    if (!selectedTemplate || !selectedMobile) {
      setError("Please select both mobile and template");
      return;
    }

    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;

    // Format phone number
    let phone = selectedMobile;
    if (!phone.startsWith("971")) {
      // Add UAE country code if missing
      phone = "971" + phone.replace(/^0+/, "");
    }

    // Open WhatsApp
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(template.body)}`;
    window.open(whatsappUrl, "_blank");

    setShowWhatsAppModal(false);
    setSelectedMobile("");
    setSelectedTemplate("");
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">⏳</div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Sign In to Continue</h2>
        <button
          onClick={() => signIn("google")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          🔐 Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Contacts</h1>
        <p className="text-gray-600">Load and manage contacts from Google Sheets</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Sheet Selector */}
          <select
            value={selectedSheet}
            onChange={(e) => setSelectedSheet(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">📊 Select Sheet...</option>
            {sheets.map((sheet) => (
              <option key={sheet} value={sheet}>
                {sheet}
              </option>
            ))}
          </select>

          {/* Load Button */}
          <button
            onClick={loadContacts}
            disabled={loading || !selectedSheet}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "⏳ Loading..." : "📥 Load"}
          </button>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={loading || !selectedSheet}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? "⏳ Syncing..." : "🔄 Sync"}
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search by unit, owner, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Filters Section */}
      {contacts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            🎯 Filters ({filteredContacts.length} of {contacts.length})
          </h3>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Purpose */}
            <FilterSelect
              label="Purpose"
              options={getUniqueValues("purpose")}
              selected={filters.purpose}
              onChange={(values) => setFilters({ ...filters, purpose: values })}
            />

            {/* Rooms */}
            <FilterSelect
              label="Rooms"
              options={getUniqueValues("rooms_en")}
              selected={filters.rooms}
              onChange={(values) => setFilters({ ...filters, rooms: values })}
            />

            {/* Listing Status */}
            <FilterSelect
              label="Listing Status"
              options={getUniqueValues("listing_status")}
              selected={filters.listing_status}
              onChange={(values) => setFilters({ ...filters, listing_status: values })}
            />

            {/* Rental Contract Status */}
            <FilterSelect
              label="Rental Contract Status"
              options={getUniqueValues("rental_contract_status")}
              selected={filters.rental_contract_status}
              onChange={(values) => setFilters({ ...filters, rental_contract_status: values })}
            />

            {/* Zoha Email Feedback 1 */}
            <FilterSelect
              label="Zoha Email Feedback 1"
              options={getUniqueValues("zoha_email_feedback_1")}
              selected={filters.zoha_email_feedback_1}
              onChange={(values) => setFilters({ ...filters, zoha_email_feedback_1: values })}
            />

            {/* Zoha Email Feedback 2 */}
            <FilterSelect
              label="Zoha Email Feedback 2"
              options={getUniqueValues("zoha_email_feedback_2")}
              selected={filters.zoha_email_feedback_2}
              onChange={(values) => setFilters({ ...filters, zoha_email_feedback_2: values })}
            />

            {/* Zoha Email Feedback 3 */}
            <FilterSelect
              label="Zoha Email Feedback 3"
              options={getUniqueValues("zoha_email_feedback_3")}
              selected={filters.zoha_email_feedback_3}
              onChange={(values) => setFilters({ ...filters, zoha_email_feedback_3: values })}
            />
          </div>

          {/* Clear Filters */}
          <button
            onClick={() =>
              setFilters({
                purpose: [],
                rooms: [],
                listing_status: [],
                rental_contract_status: [],
                zoha_email_feedback_1: [],
                zoha_email_feedback_2: [],
                zoha_email_feedback_3: [],
              })
            }
            className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
          >
            ✕ Clear Filters
          </button>
        </div>
      )}

      {/* Contacts Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin">⏳</div>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {contacts.length === 0 ? "📋 Select and load a sheet to get started" : "🔍 No contacts match your filters"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <div
              key={contact.rowIndex}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
              onClick={() => setSelectedContact(contact)}
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                <h3 className="font-bold text-lg">📍 {contact.unit}</h3>
                <p className="text-blue-100 text-sm mt-1">{contact.owner1_name}</p>
              </div>

              {/* Card Content */}
              <div className="p-4 space-y-3">
                {/* Rooms */}
                <div className="flex items-start gap-3">
                  <span className="text-xl">🏠</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Rooms</p>
                    <p className="font-semibold">{contact.rooms_en || "N/A"}</p>
                  </div>
                </div>

                {/* Property Size */}
                <div className="flex items-start gap-3">
                  <span className="text-xl">📐</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Property Size</p>
                    <p className="font-semibold">{convertToSqft(contact.actual_area)}</p>
                  </div>
                </div>

                {/* Balcony Size */}
                <div className="flex items-start gap-3">
                  <span className="text-xl">🏞️</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Balcony Size</p>
                    <p className="font-semibold">{convertToSqft(contact.unit_balcony_area)}</p>
                  </div>
                </div>

                {/* Days Remaining */}
                <div className="flex items-start gap-3">
                  <span className="text-xl">📅</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Contract Days</p>
                    <p className="font-semibold text-sm">{calculateDaysRemaining(contact.rent_end_date)}</p>
                  </div>
                </div>

                {/* Listing Status */}
                {contact.listing_status && (
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🏷️</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Listing Status</p>
                      <p className="font-semibold text-sm">{contact.listing_status}</p>
                    </div>
                  </div>
                )}

                {/* Rental Contract Status */}
                {contact.rental_contract_status && (
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📋</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Rental Status</p>
                      <p className="font-semibold text-sm">{contact.rental_contract_status}</p>
                    </div>
                  </div>
                )}

                {/* View Details Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContact(contact);
                  }}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  👁️ View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-lg max-h-[90vh] overflow-y-auto w-full md:max-w-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">📍 {selectedContact.unit}</h2>
                <p className="text-blue-100 mt-1">{selectedContact.owner1_name}</p>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="text-white hover:bg-blue-600 p-2 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Group 1: Property Details */}
              <DetailGroup title="🏠 Property Details">
                <DetailField label="Unit" value={selectedContact.unit} />
                <DetailField label="Rooms" value={selectedContact.rooms_en} />
                <DetailField label="Property Size" value={convertToSqft(selectedContact.actual_area)} />
                <DetailField label="Balcony Size" value={convertToSqft(selectedContact.unit_balcony_area)} />
                <DetailField label="Parking Number" value={selectedContact.unit_parking_number} />
              </DetailGroup>

              {/* Group 2: Owners Details */}
              <DetailGroup title="👥 Owners Details">
                {selectedContact.owner1_name && (
                  <>
                    <DetailField label="Owner 1 Name" value={selectedContact.owner1_name} />
                    <DetailField label="Owner 1 Mobile" value={selectedContact.owner1_mobile} />
                    <DetailField label="Owner 1 Email" value={selectedContact.owner1_email} />
                  </>
                )}
                {selectedContact.owner2_name && (
                  <>
                    <DetailField label="Owner 2 Name" value={selectedContact.owner2_name} />
                    <DetailField label="Owner 2 Mobile" value={selectedContact.owner2_mobile} />
                    <DetailField label="Owner 2 Email" value={selectedContact.owner2_email} />
                  </>
                )}
                {selectedContact.owner3_name && (
                  <>
                    <DetailField label="Owner 3 Name" value={selectedContact.owner3_name} />
                    <DetailField label="Owner 3 Mobile" value={selectedContact.owner3_mobile} />
                    <DetailField label="Owner 3 Email" value={selectedContact.owner3_email} />
                  </>
                )}
              </DetailGroup>

              {/* Group 3: Sale Transaction Details */}
              <DetailGroup title="💰 Sale Transaction Details">
                <DetailField label="Latest Transaction Date" value={selectedContact.latest_transaction_date} />
                <DetailField label="Latest Transaction Amount" value={selectedContact.latest_transaction_amount} />
                <DetailField label="Occupancy Status" value={selectedContact.occupancy_status} />
              </DetailGroup>

              {/* Group 4: Rent Transaction Details */}
              <DetailGroup title="📅 Rent Transaction Details">
                <DetailField label="Rent Start Date" value={selectedContact.rent_start_date} />
                <DetailField label="Rent End Date" value={selectedContact.rent_end_date} />
                <DetailField label="Rent Duration" value={selectedContact.rent_duration} />
                <DetailField label="Rent Price" value={selectedContact.rent_price} />
                <DetailField
                  label="Rent Contract Status"
                  value={calculateDaysRemaining(selectedContact.rent_end_date)}
                />
                <DetailField label="Rental Status Date" value={selectedContact.rental_status_date} />
                <DetailField label="Rental Contract Status" value={selectedContact.rental_contract_status} />
                <DetailField label="Rental Months Pending/Expired" value={selectedContact.rental_months_pending_expired} />
              </DetailGroup>

              {/* Group 5: Feedbacks */}
              <DetailGroup title="💬 Feedbacks">
                <DetailField label="Zoha Feedback 1" value={selectedContact.zoha_feedback_1} wrap />
                <DetailField label="Zoha Feedback 2" value={selectedContact.zoha_feedback_2} wrap />
                <DetailField label="Zoha Feedback 3" value={selectedContact.zoha_feedback_3} wrap />
                <DetailField label="Ahmed Feedback 1" value={selectedContact.ahmed_feedback_1} wrap />
                <DetailField label="Ahmed Feedback 2" value={selectedContact.ahmed_feedback_2} wrap />
                <DetailField label="Ahmed Feedback 3" value={selectedContact.ahmed_feedback_3} wrap />
                <DetailField label="Zoha Email Feedback 1" value={selectedContact.zoha_email_feedback_1} wrap />
                <DetailField label="Zoha Email Feedback 2" value={selectedContact.zoha_email_feedback_2} wrap />
                <DetailField label="Zoha Email Feedback 3" value={selectedContact.zoha_email_feedback_3} wrap />
                <DetailField label="Status" value={selectedContact.status} />
              </DetailGroup>

              {/* Group 6: Property Availability Status */}
              <DetailGroup title="🔍 Property Availability Status">
                <DetailField label="Furnishing" value={selectedContact.furnishing} />
                <DetailField label="Asking Sale Price" value={selectedContact.asking_sale_price} />
                <DetailField label="Asking Rent Price" value={selectedContact.asking_rent_price} />
                <DetailField label="Images" value={selectedContact.images} />
                <DetailField label="Videos" value={selectedContact.videos} />
                <DetailField label="Documents" value={selectedContact.documents} />
                <DetailField label="Purpose" value={selectedContact.purpose} />
                <DetailField label="Vacancy Status" value={selectedContact.vacancy_status} />
                <DetailField label="View" value={selectedContact.view} />
                <DetailField label="VAM Listing Status" value={selectedContact.vam_listing_status} />
                <DetailField label="Listing Link" value={selectedContact.listing_link} />
                <DetailField label="Owner DOB" value={selectedContact.owner_dob} />
                <DetailField label="CRM Listing Link" value={selectedContact.crm_listing_link} />
                <DetailField label="Contract A" value={selectedContact.contract_a} />
                <DetailField label="Rental Cheques" value={selectedContact.rental_cheques} />
                <DetailField label="Available From" value={selectedContact.available_from} />
              </DetailGroup>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-gray-50 p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => handleWhatsAppClick(selectedContact)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                💬 Open in WhatsApp
              </button>
              <button
                onClick={() => setSelectedContact(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-6">
            <h2 className="text-xl font-bold">💬 Send WhatsApp Message</h2>

            {/* Mobile Selection - Only show if multiple mobiles */}
            {!selectedMobile && (
              <div>
                <label className="block text-sm font-medium mb-2">Which mobile would you like to send to?</label>
                <select
                  value={selectedMobile}
                  onChange={(e) => setSelectedMobile(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">📱 Select Mobile...</option>
                  {selectedContact?.owner1_mobile && (
                    <option value={selectedContact.owner1_mobile}>
                      Mobile 1: {selectedContact.owner1_mobile}
                    </option>
                  )}
                  {selectedContact?.owner2_mobile && (
                    <option value={selectedContact.owner2_mobile}>
                      Mobile 2: {selectedContact.owner2_mobile}
                    </option>
                  )}
                  {selectedContact?.owner3_mobile && (
                    <option value={selectedContact.owner3_mobile}>
                      Mobile 3: {selectedContact.owner3_mobile}
                    </option>
                  )}
                </select>
              </div>
            )}

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Which template would you like to send?</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">📋 Select Template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Preview */}
            {selectedTemplate && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">Preview:</p>
                <p className="text-sm whitespace-pre-wrap">{templates.find((t) => t.id === selectedTemplate)?.body}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={sendWhatsAppMessage}
                disabled={!selectedTemplate || !selectedMobile}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
              >
                ✓ Send
              </button>
              <button
                onClick={() => {
                  setShowWhatsAppModal(false);
                  setSelectedMobile("");
                  setSelectedTemplate("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-200 pb-6 last:border-0">
      <h3 className="font-semibold text-lg mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DetailField({
  label,
  value,
  wrap = false,
}: {
  label: string;
  value?: string | number;
  wrap?: boolean;
}) {
  if (!value || value === "" || value === "0" || value === "N/A") {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <p className="text-sm text-gray-600 font-medium">{label}:</p>
      <p className={`col-span-2 text-sm ${wrap ? "whitespace-normal break-words" : ""}`}>{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-between"
      >
        <span>{label}</span>
        <span>{selected.length > 0 ? `(${selected.length})` : ""}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-lg bg-white shadow-lg z-10 max-h-48 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm cursor-pointer border-b last:border-0"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggle(option)}
                className="w-4 h-4"
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
