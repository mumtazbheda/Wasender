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
  status: string;
  latest_transaction_date: string;
  latest_transaction_amount: string;
  occupancy_status: string;
  rent_start_date: string;
  rent_duration: string;
  rent_price: string;
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
type CampaignStep = 1 | 2 | 3 | 4;

export default function CampaignsPage() {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<CampaignStep>(1);
  
  // Contacts data
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
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");

  // Campaign selection
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [testPhone, setTestPhone] = useState("");
  const [showPreview, setShowPreview] = useState(false);

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
        setSelectedContacts(new Set());
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
        (filters.ahmed_feedback_1.length === 0 || filters.ahmed_feedback_1.includes(contact.ahmed_feedback_1)) &&
        (filters.ahmed_feedback_2.length === 0 || filters.ahmed_feedback_2.includes(contact.ahmed_feedback_2)) &&
        (filters.ahmed_feedback_3.length === 0 || filters.ahmed_feedback_3.includes(contact.ahmed_feedback_3)) &&
        (filters.zoha_feedback_1.length === 0 || filters.zoha_feedback_1.includes(contact.zoha_feedback_1)) &&
        (filters.zoha_feedback_2.length === 0 || filters.zoha_feedback_2.includes(contact.zoha_feedback_2)) &&
        (filters.zoha_feedback_3.length === 0 || filters.zoha_feedback_3.includes(contact.zoha_feedback_3));

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

  // Toggle contact selection
  const toggleContact = (rowIndex: number) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedContacts(newSelected);
  };

  // Select all filtered contacts
  const selectAll = () => {
    const newSelected = new Set(filteredContacts.map((c) => c.rowIndex));
    setSelectedContacts(newSelected);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedContacts(new Set());
  };

  // Replace template variables
  const replaceTemplateVariables = (template: string, contact: Contact | null, isTest: boolean) => {
    if (!template) return "";
    
    let replaced = template;
    replaced = replaced.replace(/{name}/g, isTest ? "[Name]" : contact?.owner1_name || "[Name]");
    replaced = replaced.replace(/{unit}/g, isTest ? "[Unit]" : contact?.unit || "[Unit]");
    replaced = replaced.replace(/{rooms_en}/g, isTest ? "[Rooms]" : contact?.rooms_en || "[Rooms]");
    replaced = replaced.replace(/{project_name_en}/g, isTest ? "[Project]" : "[Project]");
    replaced = replaced.replace(/{phone}/g, isTest ? testPhone || "[Phone]" : contact?.owner1_mobile || "[Phone]");
    return replaced;
  };

  // Label-value pair component
  const LabelValue = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-gray-600 font-medium min-w-[120px]">{label}:</span>
      <span className="text-gray-900 text-right break-all">{value || "N/A"}</span>
    </div>
  );

  // Phone link component
  const PhoneLink = ({ phone }: { phone: string }) => (
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

  // STEP 1: Select Contacts
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚀 Campaign Manager</h1>
          <p className="text-gray-600 mb-6">Step 1: Select Contacts to Campaign</p>

          {/* Controls Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Sheet
                </label>
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  disabled={sheetsLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

              <div className="self-end text-right text-sm text-gray-600">
                {contacts.length > 0 && `${contacts.length} total contacts`}
              </div>
            </div>

            {error && (
              <div className={`p-3 rounded-lg text-sm ${error.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {error}
              </div>
            )}
          </div>

          {/* Filters & Selection Section */}
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

              {/* Selection Controls */}
              <div className="flex gap-4 mb-6 pb-6 border-b">
                <button
                  onClick={selectAll}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  Select All ({filteredContacts.length})
                </button>
                <button
                  onClick={deselectAll}
                  className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg transition font-medium"
                >
                  Deselect All
                </button>
                <div className="ml-auto text-sm font-medium text-gray-700 flex items-center">
                  Selected: <span className="ml-2 text-blue-600 font-bold">{selectedContacts.size}</span>
                </div>
              </div>

              {/* Filters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                      <option key={val} value={val}>{val}</option>
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
                      <option key={val} value={val}>{val}</option>
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
                      <option key={val} value={val}>{val}</option>
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
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ahmed Feedback 1</label>
                  <select
                    multiple
                    value={filters.ahmed_feedback_1}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        ahmed_feedback_1: Array.from(e.target.selectedOptions, (opt) => opt.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    size={3}
                  >
                    {getUniqueValues("ahmed_feedback_1").map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ahmed Feedback 2</label>
                  <select
                    multiple
                    value={filters.ahmed_feedback_2}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        ahmed_feedback_2: Array.from(e.target.selectedOptions, (opt) => opt.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    size={3}
                  >
                    {getUniqueValues("ahmed_feedback_2").map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ahmed Feedback 3</label>
                  <select
                    multiple
                    value={filters.ahmed_feedback_3}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        ahmed_feedback_3: Array.from(e.target.selectedOptions, (opt) => opt.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    size={3}
                  >
                    {getUniqueValues("ahmed_feedback_3").map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zoha Feedback 1</label>
                  <select
                    multiple
                    value={filters.zoha_feedback_1}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        zoha_feedback_1: Array.from(e.target.selectedOptions, (opt) => opt.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    size={3}
                  >
                    {getUniqueValues("zoha_feedback_1").map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zoha Feedback 2</label>
                  <select
                    multiple
                    value={filters.zoha_feedback_2}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        zoha_feedback_2: Array.from(e.target.selectedOptions, (opt) => opt.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    size={3}
                  >
                    {getUniqueValues("zoha_feedback_2").map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zoha Feedback 3</label>
                  <select
                    multiple
                    value={filters.zoha_feedback_3}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        zoha_feedback_3: Array.from(e.target.selectedOptions, (opt) => opt.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    size={3}
                  >
                    {getUniqueValues("zoha_feedback_3").map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-sm text-gray-600 font-medium">
                Showing {filteredContacts.length} of {contacts.length} contacts
              </p>
            </div>
          )}

          {/* Contacts List */}
          {filteredContacts.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Contacts List</h2>
              <div className="space-y-2">
                {filteredContacts.map((contact) => {
                  const daysInfo = calculateDaysRemaining(contact.rent_end_date);
                  const isSelected = selectedContacts.has(contact.rowIndex);
                  return (
                    <div
                      key={contact.rowIndex}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 transition cursor-pointer ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                      onClick={() => toggleContact(contact.rowIndex)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleContact(contact.rowIndex);
                        }}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Unit</p>
                          <p className="font-bold text-gray-900">{contact.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Owner</p>
                          <p className="font-semibold text-gray-900">{contact.owner1_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Rooms</p>
                          <p className="font-semibold text-gray-900">{contact.rooms_en || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Days Remaining</p>
                          <p className={`font-bold ${
                            daysInfo.days < 30 ? "text-red-600" : daysInfo.days < 90 ? "text-yellow-600" : "text-green-600"
                          }`}>
                            {daysInfo.text}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContact(contact);
                        }}
                        className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition text-sm font-medium"
                      >
                        View
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Next Button */}
          {contacts.length > 0 && (
            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                disabled={selectedContacts.size === 0}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition font-bold"
              >
                Next: Select Template ({selectedContacts.size} selected)
              </button>
            </div>
          )}

          {/* Detail Modal */}
          {selectedContact && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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

                <div className="p-8 space-y-8">
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

                  {selectedContact.owner1_name && (
                    <section>
                      <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                        👤 Owner 1
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                        <LabelValue label="Name" value={selectedContact.owner1_name} />
                        <LabelValue label="Mobile" value={<PhoneLink phone={selectedContact.owner1_mobile} />} />
                        <LabelValue label="Email" value={<span className="break-all">{selectedContact.owner1_email}</span>} />
                      </div>
                    </section>
                  )}

                  <section>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                      📅 Rental Details
                    </h3>
                    <div className="space-y-3">
                      <LabelValue label="Rent Start Date" value={selectedContact.rent_start_date} />
                      <LabelValue label="Rent End Date" value={selectedContact.rent_end_date} />
                      <LabelValue label="Rent Price" value={selectedContact.rent_price} />
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
                </div>

                <div className="bg-gray-50 p-6 border-t flex gap-3">
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP 2: Select Template
  if (step === 2) {
    const selectedContactObjects = filteredContacts.filter((c) => selectedContacts.has(c.rowIndex));
    const selectedTemplateData = templates.find((t) => t.id === selectedTemplate);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚀 Campaign Manager</h1>
          <p className="text-gray-600 mb-6">Step 2: Select Template & Preview</p>

          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* Template Selection */}
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-3">
                Select Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  setShowPreview(false);
                  setTestPhone("");
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="">Choose a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Test Mode */}
            {selectedTemplate && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Test Mode - Enter Test Phone Number (optional)
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Enter phone number to preview with placeholders"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Preview */}
            {selectedTemplate && selectedTemplateData && (
              <div className="border-2 border-blue-200 bg-blue-50 p-6 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-4">Preview</h3>
                <div className="bg-white p-4 rounded border border-gray-300 whitespace-pre-wrap text-gray-900 font-mono text-sm">
                  {replaceTemplateVariables(
                    selectedTemplateData.body,
                    testPhone ? null : selectedContactObjects[0] || null,
                    testPhone ? true : false
                  )}
                </div>
                {selectedContactObjects.length > 0 && !testPhone && (
                  <p className="text-xs text-gray-600 mt-3">
                    Preview showing first contact: {selectedContactObjects[0].unit}
                  </p>
                )}
              </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700">
              <p className="font-medium mb-2">ℹ️ Campaign Info:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Selected Contacts: <span className="font-bold">{selectedContacts.size}</span></li>
                <li>Template: <span className="font-bold">{selectedTemplateData?.name || "None"}</span></li>
                <li>Variables will be replaced for each contact</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white rounded-lg transition font-bold"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedTemplate}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition font-bold"
              >
                Next: Set Delays
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: Set Delays
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚀 Campaign Manager</h1>
          <p className="text-gray-600 mb-6">Step 3: Set Delays</p>

          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 mb-4">Configure delay settings for your campaign</p>
            <p className="text-gray-500 text-sm mb-6">(Coming soon)</p>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white rounded-lg transition font-bold"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-bold"
              >
                Next: Review & Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 4: Review & Send
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🚀 Campaign Manager</h1>
        <p className="text-gray-600 mb-6">Step 4: Review & Send</p>

        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 mb-4">Review your campaign before sending</p>
          <p className="text-gray-500 text-sm mb-6">(Coming soon)</p>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(3)}
              className="flex-1 px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white rounded-lg transition font-bold"
            >
              Back
            </button>
            <button
              onClick={() => alert("Campaign sent successfully!")}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-bold"
            >
              Send Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
