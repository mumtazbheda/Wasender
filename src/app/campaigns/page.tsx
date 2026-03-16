"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";

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

interface Template {
  id: string;
  name: string;
  body: string;
}

type SortOrder = "none" | "low-to-high" | "high-to-low";
type CampaignStep = 1 | 2 | 3 | 4;


function isUAEPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('971')) return true;
  if (cleaned.startsWith('05') && cleaned.length === 10) return true;
  if (cleaned.startsWith('5') && cleaned.length === 9) return true;
  return false;
}

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
    owner1Mobile: '' as string,
    owner2Mobile: '' as string,
    owner3Mobile: '' as string,
    owner1CountryCode: '' as string,
    owner2CountryCode: '' as string,
    owner3CountryCode: '' as string,
  });

  // Delay settings
  const [delayBefore, setDelayBefore] = useState(0);
  const [delayBetween, setDelayBetween] = useState(5);
  const [delayUnit, setDelayUnit] = useState('seconds');
  const [randomizeDelay, setRandomizeDelay] = useState(false);

  // Account selection
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountsLoading, setAccountsLoading] = useState(false);

  // Test message
  const [testSending, setTestSending] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Campaign sending
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Campaign history
  const [campaignHistory, setCampaignHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [campaignName, setCampaignName] = useState('');

  // Browser-driven campaign processing (Vercel Hobby compatible)
  const [rerunModal, setRerunModal] = useState<{ campaign: any } | null>(null);

  // Server-side DB cache state
  const [savedSheets, setSavedSheets] = useState<{ sheet_name: string; contact_count: number; synced_at: string }[]>([]);
  const [usingServerCache, setUsingServerCache] = useState(false);

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

  // Load accounts
  useEffect(() => {
    const loadAccounts = async () => {
      setAccountsLoading(true);
      try {
        const res = await fetch('/api/accounts');
        const data = await res.json();
        if (data.accounts) {
          setAccounts(data.accounts);
          if (data.accounts.length > 0) {
            setSelectedAccountId(String(data.accounts[0].id));
          }
        }
      } catch {}
      setAccountsLoading(false);
    };
    loadAccounts();
  }, []);

  // Load campaign history
  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await fetch('/api/send-campaign');
        const data = await res.json();
        if (data.campaigns) setCampaignHistory(data.campaigns);
      } catch {}
      setHistoryLoading(false);
    };
    loadHistory();
  }, []);

  // Load list of server-saved sheets
  useEffect(() => {
    const loadSavedSheets = async () => {
      try {
        const res = await fetch('/api/contacts-cache');
        const data = await res.json();
        if (data.success) setSavedSheets(data.sheets || []);
      } catch {}
    };
    loadSavedSheets();
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

  // Load contacts from server-side DB cache
  const loadFromServerCache = async (sheetName: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/contacts-cache?sheet=${encodeURIComponent(sheetName)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load from server database");
        return;
      }
      setContacts(data.contacts || []);
      setSelectedContacts(new Set());
      setSelectedSheet(sheetName);
      setUsingServerCache(true);
      setError("");
    } catch (err) {
      setError("Error loading from server: " + (err instanceof Error ? err.message : "Unknown error"));
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

  // Get unique values for filters (including blank option)
  const getUniqueValues = (field: keyof Contact) => {
    const values = contacts.map((c) => String(c[field] || ''));
    const nonEmpty = [...new Set(values.filter(v => v !== ''))].sort();
    const hasBlank = values.some(v => v === '');
    return hasBlank ? ['(Blank)', ...nonEmpty] : nonEmpty;
  };

  // Apply filters and sorting
  useEffect(() => {
    let result = contacts.filter((contact) => {
      const matchSearch =
        !searchQuery ||
        contact.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.owner1_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.owner1_mobile.includes(searchQuery);

      // Helper: match filter with (Blank) support
      const matchFilter = (filterValues: string[], contactValue: string) => {
        if (filterValues.length === 0) return true;
        if (filterValues.includes('(Blank)') && (!contactValue || contactValue === '')) return true;
        return filterValues.includes(contactValue);
      };

      const matchFilters =
        matchFilter(filters.purpose, contact.purpose) &&
        matchFilter(filters.rooms, contact.rooms_en) &&
        matchFilter(filters.listing_status, contact.listing_status) &&
        matchFilter(filters.rental_contract_status, contact.rental_contract_status) &&
        matchFilter(filters.ahmed_feedback_1, contact.ahmed_feedback_1) &&
        matchFilter(filters.ahmed_feedback_2, contact.ahmed_feedback_2) &&
        matchFilter(filters.ahmed_feedback_3, contact.ahmed_feedback_3) &&
        matchFilter(filters.zoha_feedback_1, contact.zoha_feedback_1) &&
        matchFilter(filters.zoha_feedback_2, contact.zoha_feedback_2) &&
        matchFilter(filters.zoha_feedback_3, contact.zoha_feedback_3) &&
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
    replaced = replaced.replace(/{project_name_en}/g, isTest ? "[Project]" : contact?.project_name_en || "[Project]");
    replaced = replaced.replace(/{phone}/g, isTest ? testPhone || "[Phone]" : contact?.owner1_mobile || "[Phone]");
    return replaced;
  };

  // Send test message
  const handleSendTest = async () => {
    if (!testPhone || !selectedTemplate) return;
    setTestSending(true);
    setTestStatus(null);
    try {
      const selectedTemplateData = templates.find(t => String(t.id) === String(selectedTemplate));
      if (!selectedTemplateData) throw new Error('No template selected');
      
      const selectedContactObjects = filteredContacts.filter(c => selectedContacts.has(c.rowIndex));
      const sampleContact = selectedContactObjects[0] || null;
      const message = sampleContact 
        ? replaceTemplateVariables(selectedTemplateData.body, sampleContact, false)
        : selectedTemplateData.body;
      
      const res = await fetch('/api/send-test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          message,
          accountId: selectedAccountId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestStatus({ type: 'success', message: '✅ Test message sent! Check your phone.' });
      } else {
        setTestStatus({ type: 'error', message: '❌ Failed: ' + (data.message || 'Unknown error') });
      }
    } catch (err: any) {
      setTestStatus({ type: 'error', message: '❌ Error: ' + err.message });
    }
    setTestSending(false);
  };

  // Calculate estimated duration
  const calculateEstimatedDuration = () => {
    const count = selectedContacts.size;
    if (count === 0) return 'No contacts selected';
    const beforeMs = delayBefore * (delayUnit === 'minutes' ? 60 : delayUnit === 'hours' ? 3600 : 1);
    const betweenMs = delayBetween * (count - 1) * (delayUnit === 'minutes' ? 60 : delayUnit === 'hours' ? 3600 : 1);
    const totalSeconds = beforeMs + betweenMs;
    if (totalSeconds < 60) return `~${totalSeconds} seconds`;
    if (totalSeconds < 3600) return `~${Math.ceil(totalSeconds / 60)} minutes`;
    return `~${(totalSeconds / 3600).toFixed(1)} hours`;
  };

  // Get deduplicated phones across Owner 1/2/3 Mobile
  const getDeduplicatedPhones = (contactList: Contact[]) => {
    const phoneMap = new Map<string, { contact: Contact; ownerNum: number; ownerName: string }>();
    for (const contact of contactList) {
      const owners = [
        { phone: contact.owner1_mobile, num: 1, name: contact.owner1_name },
        { phone: contact.owner2_mobile, num: 2, name: contact.owner2_name },
        { phone: contact.owner3_mobile, num: 3, name: contact.owner3_name },
      ];
      for (const { phone, num, name } of owners) {
        const cleaned = (phone || '').replace(/[^0-9+]/g, '');
        if (cleaned && !phoneMap.has(cleaned)) {
          phoneMap.set(cleaned, { contact, ownerNum: num, ownerName: name });
        }
      }
    }
    return phoneMap;
  };

  // Send campaign
  const handleSendCampaign = async () => {
    if (!selectedAccountId || !selectedTemplate || selectedContacts.size === 0) return;
    if (!campaignName.trim()) {
      setSendStatus({ type: 'error', message: '❌ Please enter a campaign name' });
      return;
    }
    setSending(true);
    setSendStatus(null);
    try {
      const selectedTemplateData = templates.find(t => String(t.id) === String(selectedTemplate));
      const selectedContactObjects = filteredContacts.filter(c => selectedContacts.has(c.rowIndex));
      const selectedAccountData = accounts.find((a: any) => String(a.id) === selectedAccountId);
      
      const res = await fetch('/api/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: campaignName.trim(),
          contacts: selectedContactObjects,
          templateName: selectedTemplateData?.name || 'Campaign',
          templateBody: selectedTemplateData?.body || '',
          accountId: selectedAccountId,
          accountName: selectedAccountData?.name || 'Unknown',
          sheetTab: selectedSheet,
          delayBefore,
          delayBetween,
          delayUnit,
          randomizeDelay,
          filtersUsed: JSON.stringify(filters),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendStatus({ type: 'success', message: `✅ Campaign "${campaignName}" started! ${data.uniquePhones} messages queued — running in the background. You can close this tab.` });
        // Refresh history
        const histRes = await fetch('/api/send-campaign');
        const histData = await histRes.json();
        if (histData.campaigns) setCampaignHistory(histData.campaigns);
        // Start browser-driven sending loop
      } else {
        setSendStatus({ type: 'error', message: '❌ Failed: ' + (data.message || 'Unknown error') });
      }
    } catch (err: any) {
      setSendStatus({ type: 'error', message: '❌ Error: ' + err.message });
    }
    setSending(false);
  };

  // Converts delay to milliseconds
  const convertDelayToMs = (amount: number, unit: string): number => {
    switch (unit) {
      case 'seconds': return amount * 1000;
      case 'minutes': return amount * 60 * 1000;
      case 'hours': return amount * 60 * 60 * 1000;
      default: return amount * 1000;
    }
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
            {/* View Saved Server Data */}
            {savedSheets.length > 0 && (
              <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-sm font-bold text-indigo-800 mb-2">📦 View Saved Data</p>
                <div className="flex flex-wrap gap-2">
                  {savedSheets.map((s) => (
                    <button
                      key={s.sheet_name}
                      onClick={() => loadFromServerCache(s.sheet_name)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition flex items-center gap-1"
                    >
                      <span>{s.sheet_name}</span>
                      <span className="text-indigo-200 text-xs">({s.contact_count})</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-indigo-600 mt-1">Click to load contacts from server database (no Google login needed)</p>
              </div>
            )}

            {usingServerCache && (
              <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-sm flex justify-between items-center">
                <span>🗄️ Using server database — {contacts.length} contacts loaded from "{selectedSheet}"</span>
                <button
                  onClick={() => { setUsingServerCache(false); setContacts([]); setSelectedContacts(new Set()); }}
                  className="text-xs px-2 py-1 bg-indigo-200 hover:bg-indigo-300 rounded"
                >
                  Switch to Sheet
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Sheet (from Google)
                </label>
                <select
                  value={selectedSheet}
                  onChange={(e) => { setSelectedSheet(e.target.value); setUsingServerCache(false); }}
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
                <MultiSelectDropdown
                  label="Purpose"
                  options={getUniqueValues("purpose")}
                  selected={filters.purpose}
                  onChange={(vals) => setFilters({ ...filters, purpose: vals })}
                />
                <MultiSelectDropdown
                  label="Rooms"
                  options={getUniqueValues("rooms_en")}
                  selected={filters.rooms}
                  onChange={(vals) => setFilters({ ...filters, rooms: vals })}
                />
                <MultiSelectDropdown
                  label="Listing Status"
                  options={getUniqueValues("listing_status")}
                  selected={filters.listing_status}
                  onChange={(vals) => setFilters({ ...filters, listing_status: vals })}
                />
                <MultiSelectDropdown
                  label="Rental Status"
                  options={getUniqueValues("rental_contract_status")}
                  selected={filters.rental_contract_status}
                  onChange={(vals) => setFilters({ ...filters, rental_contract_status: vals })}
                />
                <MultiSelectDropdown
                  label="Ahmed Feedback 1"
                  options={getUniqueValues("ahmed_feedback_1")}
                  selected={filters.ahmed_feedback_1}
                  onChange={(vals) => setFilters({ ...filters, ahmed_feedback_1: vals })}
                />
                <MultiSelectDropdown
                  label="Ahmed Feedback 2"
                  options={getUniqueValues("ahmed_feedback_2")}
                  selected={filters.ahmed_feedback_2}
                  onChange={(vals) => setFilters({ ...filters, ahmed_feedback_2: vals })}
                />
                <MultiSelectDropdown
                  label="Ahmed Feedback 3"
                  options={getUniqueValues("ahmed_feedback_3")}
                  selected={filters.ahmed_feedback_3}
                  onChange={(vals) => setFilters({ ...filters, ahmed_feedback_3: vals })}
                />
                <MultiSelectDropdown
                  label="Zoha Feedback 1"
                  options={getUniqueValues("zoha_feedback_1")}
                  selected={filters.zoha_feedback_1}
                  onChange={(vals) => setFilters({ ...filters, zoha_feedback_1: vals })}
                />
                <MultiSelectDropdown
                  label="Zoha Feedback 2"
                  options={getUniqueValues("zoha_feedback_2")}
                  selected={filters.zoha_feedback_2}
                  onChange={(vals) => setFilters({ ...filters, zoha_feedback_2: vals })}
                />
                <MultiSelectDropdown
                  label="Zoha Feedback 3"
                  options={getUniqueValues("zoha_feedback_3")}
                  selected={filters.zoha_feedback_3}
                  onChange={(vals) => setFilters({ ...filters, zoha_feedback_3: vals })}
                />
              </div>

              {/* Owner Mobile Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner 1 Mobile</label>
                  <select
                    value={filters.owner1Mobile}
                    onChange={(e) => setFilters({...filters, owner1Mobile: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="blank">Blank ({contacts.filter(c => !c.owner1_mobile || String(c.owner1_mobile).trim() === '').length})</option>
                    <option value="zero">Zero - 0 ({contacts.filter(c => String(c.owner1_mobile || '').trim() === '0').length})</option>
                    <option value="nonblank">Non-blank ({contacts.filter(c => c.owner1_mobile && String(c.owner1_mobile).trim() !== '' && String(c.owner1_mobile).trim() !== '0').length})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner 2 Mobile</label>
                  <select
                    value={filters.owner2Mobile}
                    onChange={(e) => setFilters({...filters, owner2Mobile: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="blank">Blank ({contacts.filter(c => !c.owner2_mobile || String(c.owner2_mobile).trim() === '').length})</option>
                    <option value="zero">Zero - 0 ({contacts.filter(c => String(c.owner2_mobile || '').trim() === '0').length})</option>
                    <option value="nonblank">Non-blank ({contacts.filter(c => c.owner2_mobile && String(c.owner2_mobile).trim() !== '' && String(c.owner2_mobile).trim() !== '0').length})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner 3 Mobile</label>
                  <select
                    value={filters.owner3Mobile}
                    onChange={(e) => setFilters({...filters, owner3Mobile: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="blank">Blank ({contacts.filter(c => !c.owner3_mobile || String(c.owner3_mobile).trim() === '').length})</option>
                    <option value="zero">Zero - 0 ({contacts.filter(c => String(c.owner3_mobile || '').trim() === '0').length})</option>
                    <option value="nonblank">Non-blank ({contacts.filter(c => c.owner3_mobile && String(c.owner3_mobile).trim() !== '' && String(c.owner3_mobile).trim() !== '0').length})</option>
                  </select>
                </div>
              </div>

              <p className="text-sm text-gray-600 font-medium mt-4">
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
                  {/* Feedback History */}
                  <section>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-purple-600">
                      📋 Feedback History
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <span className="text-gray-500 text-sm">Ahmed Feedback 1:</span>
                        <p className="font-bold text-gray-900">{selectedContact.ahmed_feedback_1 || '—'}</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <span className="text-gray-500 text-sm">Ahmed Feedback 2:</span>
                        <p className="font-bold text-gray-900">{selectedContact.ahmed_feedback_2 || '—'}</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <span className="text-gray-500 text-sm">Ahmed Feedback 3:</span>
                        <p className="font-bold text-gray-900">{selectedContact.ahmed_feedback_3 || '—'}</p>
                      </div>
                      <div className="bg-pink-50 p-3 rounded-lg">
                        <span className="text-gray-500 text-sm">Zoha Feedback 1:</span>
                        <p className="font-bold text-gray-900">{selectedContact.zoha_feedback_1 || '—'}</p>
                      </div>
                      <div className="bg-pink-50 p-3 rounded-lg">
                        <span className="text-gray-500 text-sm">Zoha Feedback 2:</span>
                        <p className="font-bold text-gray-900">{selectedContact.zoha_feedback_2 || '—'}</p>
                      </div>
                      <div className="bg-pink-50 p-3 rounded-lg">
                        <span className="text-gray-500 text-sm">Zoha Feedback 3:</span>
                        <p className="font-bold text-gray-900">{selectedContact.zoha_feedback_3 || '—'}</p>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <span className="text-gray-500 text-sm">Zoha Email Feedback 1:</span>
                        <p className="font-bold text-gray-900">{selectedContact.zoha_email_feedback_1 || '—'}</p>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <span className="text-gray-500 text-sm">Zoha Email Feedback 2:</span>
                        <p className="font-bold text-gray-900">{selectedContact.zoha_email_feedback_2 || '—'}</p>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <span className="text-gray-500 text-sm">Zoha Email Feedback 3:</span>
                        <p className="font-bold text-gray-900">{selectedContact.zoha_email_feedback_3 || '—'}</p>
                      </div>
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
    const selectedTemplateData = templates.find((t) => String(t.id) === String(selectedTemplate));

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
                {testPhone && (
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={handleSendTest}
                      disabled={testSending || !selectedAccountId}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition font-bold text-sm"
                    >
                      {testSending ? '⏳ Sending...' : '📤 Send Test Message'}
                    </button>
                    {!selectedAccountId && (
                      <p className="text-sm text-red-500">No WhatsApp account configured. Go to Accounts page first.</p>
                    )}
                  </div>
                )}
                {testStatus && (
                  <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
                    testStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {testStatus.message}
                  </div>
                )}
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
          <p className="text-gray-600 mb-6">Step 3: Configure Delays & Schedule</p>

          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* Delay Before */}
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-2">⏱️ Initial Delay (before sending starts)</label>
              <p className="text-sm text-gray-500 mb-3">Wait this long before sending the first message</p>
              <div className="flex gap-3">
                <input
                  type="number"
                  min={0}
                  value={delayBefore}
                  onChange={(e) => setDelayBefore(parseInt(e.target.value) || 0)}
                  className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                />
                <select
                  value={delayUnit}
                  onChange={(e) => setDelayUnit(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
            </div>

            {/* Delay Between */}
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-2">⏳ Delay Between Messages</label>
              <p className="text-sm text-gray-500 mb-3">Wait this long between each message to avoid detection</p>
              <div className="flex gap-3">
                <input
                  type="number"
                  min={0}
                  value={delayBetween}
                  onChange={(e) => setDelayBetween(parseInt(e.target.value) || 0)}
                  className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                />
                <span className="flex items-center text-gray-600 font-medium">{delayUnit}</span>
              </div>
            </div>

            {/* Randomize */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={randomizeDelay}
                onChange={(e) => setRandomizeDelay(e.target.checked)}
                className="w-5 h-5 cursor-pointer"
              />
              <div>
                <label className="font-bold text-gray-900">🔀 Randomize Delays</label>
                <p className="text-sm text-gray-500">Adds ±20% variation to delay times to appear more natural</p>
              </div>
            </div>

            {/* Schedule Option */}
            <div className="border-t pt-6">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                />
                <div>
                  <label className="font-bold text-gray-900">📅 Schedule Campaign</label>
                  <p className="text-sm text-gray-500">Schedule this campaign to run at a specific date and time</p>
                </div>
              </div>
              {scheduleEnabled && (
                <div className="flex gap-3 ml-8">
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Estimated Duration */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-bold text-gray-900 mb-2">📊 Campaign Summary</p>
              <div className="space-y-1 text-sm">
                <p>📧 Messages to send: <span className="font-bold">{selectedContacts.size}</span></p>
                <p>⏱️ Initial delay: <span className="font-bold">{delayBefore} {delayUnit}</span></p>
                <p>⏳ Between messages: <span className="font-bold">{delayBetween} {delayUnit}</span></p>
                {randomizeDelay && <p>🔀 Randomization: <span className="font-bold">±20%</span></p>}
                <p>⏰ Estimated duration: <span className="font-bold">{calculateEstimatedDuration()}</span></p>
                {scheduleEnabled && scheduledDate && (
                  <p>📅 Scheduled for: <span className="font-bold">{scheduledDate} {scheduledTime}</span></p>
                )}
              </div>
            </div>

            {/* Buttons */}
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
  const selectedContactObjects = filteredContacts.filter((c) => selectedContacts.has(c.rowIndex));
  const selectedTemplateData = templates.find((t) => String(t.id) === String(selectedTemplate));
  const selectedAccountData = accounts.find((a: any) => String(a.id) === selectedAccountId);
  const dedupPhones = getDeduplicatedPhones(selectedContactObjects);
  const duplicatesRemoved = (() => {
    let totalPhones = 0;
    for (const c of selectedContactObjects) {
      if (c.owner1_mobile?.replace(/[^0-9+]/g, '')) totalPhones++;
      if (c.owner2_mobile?.replace(/[^0-9+]/g, '')) totalPhones++;
      if (c.owner3_mobile?.replace(/[^0-9+]/g, '')) totalPhones++;
    }
    return totalPhones - dedupPhones.size;
  })();

  // Poll for in_progress campaigns every 10 seconds
  useEffect(() => {
    const poll = async () => {
      const hasPending = campaignHistory.some(c => c.status === 'in_progress');
      if (!hasPending) return;
      try {
        const res = await fetch('/api/send-campaign');
        const data = await res.json();
        if (data.campaigns) setCampaignHistory(data.campaigns);
      } catch {}
    };
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [campaignHistory]);


  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🚀 Campaign Manager</h1>
        <p className="text-gray-600 mb-6">Step 4: Review & Send</p>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Campaign Name */}
          <div>
            <label className="block text-lg font-bold text-gray-900 mb-2">✏️ Campaign Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., Blue Wave Tower - March Outreach"
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-lg"
            />
          </div>

          {/* Campaign Summary with Dedup Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Campaign Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Selected Contacts</p>
                <p className="text-2xl font-bold text-blue-600">{selectedContacts.size}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Unique Phone Numbers</p>
                <p className="text-2xl font-bold text-green-600">{dedupPhones.size}</p>
                {duplicatesRemoved > 0 && (
                  <p className="text-xs text-orange-600 mt-1">🔄 {duplicatesRemoved} duplicate(s) will be skipped</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Template</p>
                <p className="font-bold text-gray-900">{selectedTemplateData?.name || 'None'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Delay Between</p>
                <p className="font-bold text-gray-900">{delayBetween} {delayUnit} {randomizeDelay ? '(±20%)' : ''}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sheet</p>
                <p className="font-bold text-gray-900">{selectedSheet || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Est. Duration</p>
                <p className="font-bold text-gray-900">{calculateEstimatedDuration()}</p>
              </div>
            </div>
          </div>

          {/* Dedup Detail */}
          {duplicatesRemoved > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-yellow-800 font-medium">🔄 Duplicate Phone Numbers Detected</p>
              <p className="text-yellow-700 text-sm mt-1">
                Found {duplicatesRemoved} duplicate phone number(s) across Owner 1/2/3 Mobile columns. 
                Only the <b>first occurrence</b> will receive a message. Messages will be sent to <b>{dedupPhones.size}</b> unique numbers.
              </p>
            </div>
          )}

          {/* Account Selection */}
          <div>
            <label className="block text-lg font-bold text-gray-900 mb-3">📱 Send From Account</label>
            {accounts.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-yellow-800 font-medium">⚠️ No WhatsApp accounts configured.</p>
                <p className="text-yellow-600 text-sm mt-1">Go to the <a href="/accounts" className="underline font-bold">Accounts</a> page to add one.</p>
              </div>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {accounts.map((acc: any) => (
                  <option key={acc.id} value={String(acc.id)}>
                    {acc.name} ({acc.phone || 'No phone'}) - {acc.status}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Template Preview */}
          <div className="border-2 border-blue-200 bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold text-gray-900 mb-2">📝 Message Preview (First Contact)</h3>
            <div className="bg-white p-4 rounded border border-gray-300 whitespace-pre-wrap text-gray-900 font-mono text-sm">
              {selectedTemplateData && selectedContactObjects.length > 0
                ? replaceTemplateVariables(selectedTemplateData.body, selectedContactObjects[0], false)
                : selectedTemplateData?.body || 'No template selected'}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
            <p className="text-orange-800 font-medium">⚠️ Important Notes:</p>
            <ul className="text-orange-700 text-sm mt-2 list-disc list-inside space-y-1">
              <li>Messages will be sent to <b>{dedupPhones.size}</b> unique phone numbers (from {selectedContacts.size} contacts)</li>
              <li>Phone numbers from Owner 1, Owner 2, and Owner 3 columns are all included</li>
              <li>Duplicate phone numbers across contacts are automatically skipped</li>
              <li>Feedback columns will be updated in Google Sheet after each successful send</li>
              <li>Each message will have variables replaced with actual contact data</li>
              <li>Sending too many messages too quickly may trigger WhatsApp restrictions</li>
              <li>Make sure you&apos;ve tested with a single number first</li>
            </ul>
          </div>

          {/* Send Status */}
          {sendStatus && (
            <div className={`p-4 rounded-lg font-medium ${
              sendStatus.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {sendStatus.message}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setStep(3)}
              className="flex-1 px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white rounded-lg transition font-bold"
            >
              Back
            </button>
            <button
              onClick={handleSendCampaign}
              disabled={sending || !selectedAccountId || selectedContacts.size === 0}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition font-bold text-lg"
            >
              {sending ? '⏳ Sending Campaign...' : `🚀 Send to ${dedupPhones.size} Unique Numbers`}
            </button>
          </div>
        </div>

        {/* Campaign History */}
        {campaignHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Campaign History</h2>
            <div className="space-y-3">
              {campaignHistory.map((campaign: any) => (
                <div key={campaign.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition cursor-pointer" onClick={() => window.open('/campaign-history?id=' + campaign.id, '_blank')}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900">{campaign.name || campaign.template_name}</p>
                      <p className="text-sm text-gray-500">{new Date(campaign.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                      {(campaign.status === 'in_progress' || campaign.status === 'completed' || campaign.status === 'partial' || campaign.status === 'failed') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setRerunModal({ campaign }); }}
                          className={`px-2 py-1 text-white text-xs rounded font-bold ${campaign.status === 'in_progress' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 hover:bg-gray-600'}`}
                        >{campaign.status === 'in_progress' ? '▶ Resume' : '↺ Re-run'}</button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-6 mt-2 text-sm">
                    <span>📧 Total: <b>{campaign.total_contacts}</b></span>
                    <span className="text-green-600">✅ Sent: <b>{campaign.sent_count}</b></span>
                    <span className="text-red-600">❌ Failed: <b>{campaign.failed_count}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
      {/* Rerun Campaign Modal */}
      {rerunModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setRerunModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-2">↺ Re-run Campaign</h2>
            <p className="text-gray-600 mb-6">
              <b>"{rerunModal.campaign.name}"</b><br/>
              {rerunModal.campaign.sent_count || 0} sent, {rerunModal.campaign.failed_count || 0} failed out of {rerunModal.campaign.total_unique_phones || rerunModal.campaign.total_contacts} total.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  const id = rerunModal.campaign.id;
                  setRerunModal(null);
                  try {
                    const res = await fetch('/api/rerun-campaign', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ campaignId: id, mode: 'resume' }),
                    });
                    const data = await res.json();
                    setSendStatus({ type: 'success', message: '✅ ' + data.message });
                    const h = await fetch('/api/send-campaign');
                    const hd = await h.json();
                    if (hd.campaigns) setCampaignHistory(hd.campaigns);
                  } catch (e: any) {
                    setSendStatus({ type: 'error', message: '❌ Failed: ' + e.message });
                  }
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-left px-4"
              >
                <div className="font-bold">▶ Resume from where I left off</div>
                <div className="text-sm font-normal opacity-90">Re-send only failed messages, skip already-sent ones</div>
              </button>
              <button
                onClick={async () => {
                  const id = rerunModal.campaign.id;
                  setRerunModal(null);
                  try {
                    const res = await fetch('/api/rerun-campaign', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ campaignId: id, mode: 'fresh' }),
                    });
                    const data = await res.json();
                    setSendStatus({ type: 'success', message: '✅ ' + data.message });
                    const h = await fetch('/api/send-campaign');
                    const hd = await h.json();
                    if (hd.campaigns) setCampaignHistory(hd.campaigns);
                  } catch (e: any) {
                    setSendStatus({ type: 'error', message: '❌ Failed: ' + e.message });
                  }
                }}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-left px-4"
              >
                <div className="font-bold">↺ Start completely fresh</div>
                <div className="text-sm font-normal opacity-90">Reset everything and send all messages again from the beginning</div>
              </button>
              <button
                onClick={() => setRerunModal(null)}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
