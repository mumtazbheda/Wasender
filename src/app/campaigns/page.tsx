"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";

interface SheetRow {
  rowIndex: number;
  unitNumber: string;
  ownerName: string;
  phone: string;
  ahmedFeedback1: string;
  ahmedFeedback2: string;
  ahmedFeedback3: string;
}

interface GmbContact {
  id: number;
  business_name: string;
  phone: string;
  category: string;
  city: string;
  whatsapp_status: string;
}

type Step = "filter" | "select" | "compose" | "test" | "send";
type DataSource = "sheets" | "gmb";

export default function CampaignsPage() {
  const { data: session, status } = useSession();
  const isConnected = status === "authenticated" && session;

  // Data source
  const [dataSource, setDataSource] = useState<DataSource>("sheets");

  // Data state (Sheets)
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [feedbackColIndices, setFeedbackColIndices] = useState({ fb1: -1, fb2: -1, fb3: -1 });
  const [tabs, setTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState("Time 1 New");
  const [loading, setLoading] = useState(false);
  const [loadingTabs, setLoadingTabs] = useState(false);

  // Data state (GMB)
  const [gmbContacts, setGmbContacts] = useState<GmbContact[]>([]);
  const [gmbCategories, setGmbCategories] = useState<{ category: string; count: number }[]>([]);
  const [gmbCities, setGmbCities] = useState<{ city: string; count: number }[]>([]);
  const [gmbFilterCategory, setGmbFilterCategory] = useState("");
  const [gmbFilterCity, setGmbFilterCity] = useState("");
  const [loadingGmb, setLoadingGmb] = useState(false);

  // Filter state
  const [filterColumn, setFilterColumn] = useState<"ahmedFeedback1" | "ahmedFeedback2" | "ahmedFeedback3">("ahmedFeedback1");
  const [filterValue, setFilterValue] = useState("");

  // Selection state
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState<"individual" | "range" | "all">("individual");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  // Message state
  const [message, setMessage] = useState("");
  const [delayMin, setDelayMin] = useState(3);
  const [delayMax, setDelayMax] = useState(7);

  // Sending state
  const [step, setStep] = useState<Step>("filter");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, sent: 0, failed: 0 });
  const [sendComplete, setSendComplete] = useState(false);

  // Get unique filter values for the selected feedback column
  const filterOptions = useMemo(() => {
    const values = rows.map((r) => r[filterColumn]).filter(Boolean);
    return [...new Set(values)].sort();
  }, [rows, filterColumn]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!filterValue) return rows;
    return rows.filter((r) => r[filterColumn] === filterValue);
  }, [rows, filterColumn, filterValue]);

  // Deduplicated selected rows (unique phone numbers)
  const selectedRows = useMemo(() => {
    const selected = filteredRows.filter((_, i) => selectedIndices.has(i));
    const seenPhones = new Set<string>();
    return selected.filter((r) => {
      const phone = r.phone;
      if (seenPhones.has(phone)) return false;
      seenPhones.add(phone);
      return true;
    });
  }, [filteredRows, selectedIndices]);

  async function loadTabs() {
    setLoadingTabs(true);
    const res = await fetch("/api/sheet-tabs");
    const data = await res.json();
    if (data.success && data.tabs.length > 0) {
      setTabs(data.tabs);
      if (data.tabs.includes("Time 1 New")) setSelectedTab("Time 1 New");
      else setSelectedTab(data.tabs[0]);
    }
    setLoadingTabs(false);
  }

  async function loadSheetData() {
    setLoading(true);
    const res = await fetch(`/api/sheet-data?tab=${encodeURIComponent(selectedTab)}`);
    const data = await res.json();
    if (data.success) {
      setRows(data.rows);
      setFeedbackColIndices(data.feedbackColumnIndices);
    }
    setLoading(false);
  }

  // GMB data loader
  async function loadGmbData() {
    setLoadingGmb(true);
    const params = new URLSearchParams();
    params.set("status", "not_sent");
    if (gmbFilterCategory) params.set("category", gmbFilterCategory);
    if (gmbFilterCity) params.set("city", gmbFilterCity);
    params.set("limit", "2000");
    const res = await fetch(`/api/gmb-contacts?${params.toString()}`);
    const data = await res.json();
    if (data.success) {
      setGmbContacts(data.contacts);
      setGmbCategories(data.categories);
      setGmbCities(data.cities);
    }
    setLoadingGmb(false);
  }

  // GMB filtered contacts
  const gmbFilteredContacts = useMemo(() => {
    return gmbContacts;
  }, [gmbContacts]);

  // GMB deduplicated selected contacts
  const gmbSelectedContacts = useMemo(() => {
    const selected = gmbFilteredContacts.filter((_, i) => selectedIndices.has(i));
    const seenPhones = new Set<string>();
    return selected.filter((c) => {
      if (seenPhones.has(c.phone)) return false;
      seenPhones.add(c.phone);
      return true;
    });
  }, [gmbFilteredContacts, selectedIndices]);

  useEffect(() => {
    if (isConnected) loadTabs();
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && selectedTab && dataSource === "sheets") loadSheetData();
  }, [isConnected, selectedTab, dataSource]);

  useEffect(() => {
    if (dataSource === "gmb") loadGmbData();
  }, [dataSource, gmbFilterCategory, gmbFilterCity]);

  // Selection helpers
  function toggleIndex(i: number) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function selectAll() {
    setSelectedIndices(new Set(filteredRows.map((_, i) => i)));
  }

  function deselectAll() {
    setSelectedIndices(new Set());
  }

  function applyRange() {
    const start = parseInt(rangeStart) - 1;
    const end = parseInt(rangeEnd) - 1;
    const maxLen = dataSource === "sheets" ? filteredRows.length : gmbFilteredContacts.length;
    if (isNaN(start) || isNaN(end) || start < 0 || end < start || end >= maxLen) return;
    const indices = new Set<number>();
    for (let i = start; i <= end; i++) indices.add(i);
    setSelectedIndices(indices);
  }

  // Build the personalized message for a row
  function buildMessage(row: SheetRow): string {
    return message.replace(/\{101\}/g, row.unitNumber);
  }

  function buildGmbMessage(contact: GmbContact): string {
    return message
      .replace(/\{name\}/g, contact.business_name)
      .replace(/\{category\}/g, contact.category)
      .replace(/\{city\}/g, contact.city);
  }

  // Test send
  async function handleTestSend() {
    if (!selectedRows.length || !message) return;
    setTestResult(null);

    const firstRow = selectedRows[0];
    const personalizedMsg = buildMessage(firstRow);

    const res = await fetch("/api/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: firstRow.phone, text: personalizedMsg }),
    });
    const data = await res.json();

    if (data.success) {
      setTestResult({ success: true, message: `Test sent to ${firstRow.phone} (Unit: ${firstRow.unitNumber})` });
    } else {
      setTestResult({ success: false, message: `Test failed: ${data.error}` });
    }
  }

  // GMB test send
  async function handleGmbTestSend() {
    if (!gmbSelectedContacts.length || !message) return;
    setTestResult(null);

    const first = gmbSelectedContacts[0];
    const personalizedMsg = buildGmbMessage(first);

    const res = await fetch("/api/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: first.phone, text: personalizedMsg }),
    });
    const data = await res.json();

    if (data.success) {
      setTestResult({ success: true, message: `Test sent to ${first.phone} (${first.business_name})` });
    } else {
      setTestResult({ success: false, message: `Test failed: ${data.error}` });
    }
  }

  // GMB bulk send
  async function handleGmbBulkSend() {
    if (!gmbSelectedContacts.length || !message) return;
    setSending(true);
    setSendComplete(false);
    setSendProgress({ current: 0, total: gmbSelectedContacts.length, sent: 0, failed: 0 });

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < gmbSelectedContacts.length; i++) {
      const contact = gmbSelectedContacts[i];
      const personalizedMsg = buildGmbMessage(contact);

      if (i > 0) {
        const delay = (Math.random() * (delayMax - delayMin) + delayMin) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: contact.phone, text: personalizedMsg }),
      });
      const data = await res.json();

      if (data.success) {
        sent++;
        await fetch("/api/gmb-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: contact.id, whatsapp_status: "sent" }),
        }).catch(() => {});
      } else {
        failed++;
        await fetch("/api/gmb-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: contact.id, whatsapp_status: "failed" }),
        }).catch(() => {});
      }

      setSendProgress({ current: i + 1, total: gmbSelectedContacts.length, sent, failed });
    }

    setSending(false);
    setSendComplete(true);
    loadGmbData();
  }

  // Bulk send
  async function handleBulkSend() {
    if (!selectedRows.length || !message) return;
    setSending(true);
    setSendComplete(false);
    setSendProgress({ current: 0, total: selectedRows.length, sent: 0, failed: 0 });

    const feedbackColumnMap: Record<string, number> = {
      ahmedFeedback1: feedbackColIndices.fb1,
      ahmedFeedback2: feedbackColIndices.fb2,
      ahmedFeedback3: feedbackColIndices.fb3,
    };
    const feedbackColIdx = feedbackColumnMap[filterColumn];

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];
      const personalizedMsg = buildMessage(row);

      // Random delay between delayMin and delayMax seconds
      if (i > 0) {
        const delay = (Math.random() * (delayMax - delayMin) + delayMin) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: row.phone, text: personalizedMsg }),
      });
      const data = await res.json();

      if (data.success) {
        sent++;

        // Update Google Sheet: change feedback to "No Reply"
        if (feedbackColIdx >= 0) {
          await fetch("/api/sheet-update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sheetTab: selectedTab,
              updates: [{ rowIndex: row.rowIndex, columnIndex: feedbackColIdx, value: "No Reply" }],
            }),
          }).catch(() => {}); // Don't block on sheet update failure
        }
      } else {
        failed++;
      }

      setSendProgress({ current: i + 1, total: selectedRows.length, sent, failed });
    }

    setSending(false);
    setSendComplete(true);

    // Reload sheet data to reflect updated feedback
    loadSheetData();
  }

  const feedbackColumnLabel: Record<string, string> = {
    ahmedFeedback1: "Ahmed Feedback 1",
    ahmedFeedback2: "Ahmed Feedback 2",
    ahmedFeedback3: "Ahmed Feedback 3",
  };

  if (!isConnected) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Campaigns</h1>
        <div className="bg-white rounded-xl border p-8 text-center">
          <p className="text-gray-500 mb-4">Connect your Google Account to access sheet data.</p>
          <button
            onClick={() => signIn("google")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Connect Google Account
          </button>
        </div>
      </div>
    );
  }

  const activeRows = dataSource === "sheets" ? filteredRows : gmbFilteredContacts;
  const activeSelectedRows = dataSource === "sheets" ? selectedRows : gmbSelectedContacts;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Campaigns</h1>

      {/* Data Source Selector */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium text-gray-600">Data Source:</span>
        <button
          onClick={() => { setDataSource("sheets"); setStep("filter"); setSelectedIndices(new Set()); setMessage(""); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            dataSource === "sheets" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Google Sheets
        </button>
        <button
          onClick={() => { setDataSource("gmb"); setStep("filter"); setSelectedIndices(new Set()); setMessage(""); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            dataSource === "gmb" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Google My Business
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {(["filter", "select", "compose", "test", "send"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-300">→</span>}
            <button
              onClick={() => setStep(s)}
              className={`px-3 py-1 rounded-full font-medium ${
                step === s
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          </div>
        ))}
      </div>

      {/* Tab selector (Sheets only) */}
      {dataSource === "sheets" && (
        <div className="flex items-center gap-3 mb-4">
          {loadingTabs ? (
            <span className="text-sm text-gray-400">Loading tabs...</span>
          ) : (
            <select
              value={selectedTab}
              onChange={(e) => setSelectedTab(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              {tabs.map((tab) => (
                <option key={tab} value={tab}>{tab}</option>
              ))}
            </select>
          )}
          <button
            onClick={loadSheetData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loading ? "Loading..." : "Refresh Data"}
          </button>
          <span className="text-sm text-gray-500">{rows.length} rows loaded</span>
        </div>
      )}

      {/* GMB filter bar */}
      {dataSource === "gmb" && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select
            value={gmbFilterCategory}
            onChange={(e) => { setGmbFilterCategory(e.target.value); setSelectedIndices(new Set()); }}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="">All Categories</option>
            {gmbCategories.map((c) => (
              <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
            ))}
          </select>
          <select
            value={gmbFilterCity}
            onChange={(e) => { setGmbFilterCity(e.target.value); setSelectedIndices(new Set()); }}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="">All Cities</option>
            {gmbCities.map((c) => (
              <option key={c.city} value={c.city}>{c.city} ({c.count})</option>
            ))}
          </select>
          <button
            onClick={loadGmbData}
            disabled={loadingGmb}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loadingGmb ? "Loading..." : "Refresh"}
          </button>
          <span className="text-sm text-gray-500">{gmbContacts.length} contacts (not sent)</span>
        </div>
      )}

      {/* STEP 1: Filter */}
      {step === "filter" && dataSource === "sheets" && (
        <div className="bg-white rounded-xl border p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">Step 1: Filter by Feedback Column</h2>

          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Feedback Column</label>
              <select
                value={filterColumn}
                onChange={(e) => {
                  setFilterColumn(e.target.value as typeof filterColumn);
                  setFilterValue("");
                  setSelectedIndices(new Set());
                }}
                className="px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="ahmedFeedback1">Ahmed Feedback 1</option>
                <option value="ahmedFeedback2">Ahmed Feedback 2</option>
                <option value="ahmedFeedback3">Ahmed Feedback 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Filter Value</label>
              <select
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  setSelectedIndices(new Set());
                }}
                className="px-3 py-2 border rounded-lg text-sm bg-white min-w-[200px]"
              >
                <option value="">All ({rows.length})</option>
                {filterOptions.map((v) => (
                  <option key={v} value={v}>
                    {v} ({rows.filter((r) => r[filterColumn] === v).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Showing <strong>{filteredRows.length}</strong> rows
            {filterValue && <> with {feedbackColumnLabel[filterColumn]} = &quot;{filterValue}&quot;</>}
          </p>

          {filteredRows.length > 0 && (
            <div className="max-h-64 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Unit</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Owner</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Phone</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">{feedbackColumnLabel[filterColumn]}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-mono">{r.unitNumber || "-"}</td>
                      <td className="px-3 py-2">{r.ownerName || "-"}</td>
                      <td className="px-3 py-2 font-mono">{r.phone}</td>
                      <td className="px-3 py-2">{r[filterColumn] || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length > 50 && (
                <p className="text-xs text-gray-400 p-2 text-center">Showing first 50 of {filteredRows.length}</p>
              )}
            </div>
          )}

          <button
            onClick={() => setStep("select")}
            disabled={filteredRows.length === 0}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            Next: Select Rows →
          </button>
        </div>
      )}

      {/* STEP 1: Filter (GMB) */}
      {step === "filter" && dataSource === "gmb" && (
        <div className="bg-white rounded-xl border p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">Step 1: GMB Contacts (Not Sent)</h2>

          <p className="text-sm text-gray-500 mb-4">
            Showing <strong>{gmbFilteredContacts.length}</strong> contacts with status &quot;not sent&quot;.
            Use the category and city filters above to narrow down.
          </p>

          {gmbFilteredContacts.length > 0 && (
            <div className="max-h-64 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Business Name</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Phone</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Category</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">City</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {gmbFilteredContacts.slice(0, 50).map((c, i) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{c.business_name || "-"}</td>
                      <td className="px-3 py-2 font-mono">{c.phone}</td>
                      <td className="px-3 py-2 text-xs">{c.category || "-"}</td>
                      <td className="px-3 py-2 text-xs">{c.city || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {gmbFilteredContacts.length > 50 && (
                <p className="text-xs text-gray-400 p-2 text-center">Showing first 50 of {gmbFilteredContacts.length}</p>
              )}
            </div>
          )}

          <button
            onClick={() => setStep("select")}
            disabled={gmbFilteredContacts.length === 0}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            Next: Select Contacts →
          </button>
        </div>
      )}

      {/* STEP 2: Select */}
      {step === "select" && (
        <div className="bg-white rounded-xl border p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">Step 2: Select {dataSource === "sheets" ? "Rows" : "Contacts"} to Send</h2>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="selectionMode"
                checked={selectionMode === "all"}
                onChange={() => { setSelectionMode("all"); setSelectedIndices(new Set(activeRows.map((_, i) => i))); }}
              />
              <span className="text-sm">Select All ({activeRows.length})</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="selectionMode"
                checked={selectionMode === "range"}
                onChange={() => { setSelectionMode("range"); deselectAll(); }}
              />
              <span className="text-sm">Range</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="selectionMode"
                checked={selectionMode === "individual"}
                onChange={() => { setSelectionMode("individual"); deselectAll(); }}
              />
              <span className="text-sm">Individual</span>
            </label>
          </div>

          {selectionMode === "range" && (
            <div className="flex items-center gap-3 mb-4">
              <input
                type="number"
                min={1}
                max={activeRows.length}
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                placeholder="From #"
                className="px-3 py-2 border rounded-lg text-sm w-28"
              />
              <span className="text-gray-400">to</span>
              <input
                type="number"
                min={1}
                max={activeRows.length}
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                placeholder="To #"
                className="px-3 py-2 border rounded-lg text-sm w-28"
              />
              <button
                onClick={applyRange}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Apply Range
              </button>
            </div>
          )}

          <p className="text-sm text-gray-600 mb-3">
            <strong>{selectedIndices.size}</strong> selected →{" "}
            <strong>{activeSelectedRows.length}</strong> unique phone numbers (after dedup)
          </p>

          <div className="max-h-72 overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  {selectionMode === "individual" && (
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIndices.size === activeRows.length && activeRows.length > 0}
                        onChange={() => {
                          if (selectedIndices.size === activeRows.length) deselectAll();
                          else setSelectedIndices(new Set(activeRows.map((_, i) => i)));
                        }}
                      />
                    </th>
                  )}
                  <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                  {dataSource === "sheets" ? (
                    <>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Unit</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Phone</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">{feedbackColumnLabel[filterColumn]}</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Business</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Phone</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Category</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {dataSource === "sheets"
                  ? filteredRows.map((r, i) => (
                      <tr
                        key={i}
                        className={`hover:bg-gray-50 ${selectedIndices.has(i) ? "bg-green-50" : ""}`}
                        onClick={() => selectionMode === "individual" && toggleIndex(i)}
                      >
                        {selectionMode === "individual" && (
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={selectedIndices.has(i)} onChange={() => toggleIndex(i)} />
                          </td>
                        )}
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-mono font-medium">{r.unitNumber || "-"}</td>
                        <td className="px-3 py-2 font-mono">{r.phone}</td>
                        <td className="px-3 py-2">{r[filterColumn] || "-"}</td>
                      </tr>
                    ))
                  : gmbFilteredContacts.map((c, i) => (
                      <tr
                        key={c.id}
                        className={`hover:bg-gray-50 ${selectedIndices.has(i) ? "bg-green-50" : ""}`}
                        onClick={() => selectionMode === "individual" && toggleIndex(i)}
                      >
                        {selectionMode === "individual" && (
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={selectedIndices.has(i)} onChange={() => toggleIndex(i)} />
                          </td>
                        )}
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{c.business_name || "-"}</td>
                        <td className="px-3 py-2 font-mono">{c.phone}</td>
                        <td className="px-3 py-2 text-xs">{c.category || "-"}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setStep("filter")}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep("compose")}
              disabled={activeSelectedRows.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              Next: Compose Message →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Compose */}
      {step === "compose" && (
        <div className="bg-white rounded-xl border p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">Step 3: Compose Message</h2>

          <p className="text-sm text-gray-600 mb-3">
            Sending to <strong>{activeSelectedRows.length}</strong> unique phone numbers.
            {dataSource === "sheets" ? (
              <> Use <code className="bg-gray-100 px-1 rounded">{"{101}"}</code> as a variable — it will be replaced with the unit number.</>
            ) : (
              <> Use <code className="bg-gray-100 px-1 rounded">{"{name}"}</code>, <code className="bg-gray-100 px-1 rounded">{"{category}"}</code>, <code className="bg-gray-100 px-1 rounded">{"{city}"}</code> as variables.</>
            )}
          </p>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={dataSource === "sheets"
              ? `Example: Hello, this is regarding unit {101}. We would like to follow up with you.`
              : `Example: Hi {name}, we noticed your business in {city}. We'd love to discuss a potential collaboration!`
            }
            rows={6}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none mb-4"
            required
          />

          {/* Preview */}
          {message && activeSelectedRows.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Preview (first contact):</h3>
              <div className="bg-white rounded-lg p-3 border text-sm whitespace-pre-wrap">
                {dataSource === "sheets"
                  ? buildMessage(selectedRows[0])
                  : buildGmbMessage(gmbSelectedContacts[0])
                }
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {dataSource === "sheets"
                  ? `→ ${selectedRows[0]?.phone} (Unit: ${selectedRows[0]?.unitNumber})`
                  : `→ ${gmbSelectedContacts[0]?.phone} (${gmbSelectedContacts[0]?.business_name})`
                }
              </p>
            </div>
          )}

          {/* Delay settings */}
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm text-gray-600">Random delay between messages:</label>
            <input
              type="number"
              min={1}
              max={60}
              value={delayMin}
              onChange={(e) => setDelayMin(parseInt(e.target.value) || 1)}
              className="px-2 py-1 border rounded text-sm w-16 text-center"
            />
            <span className="text-sm text-gray-400">to</span>
            <input
              type="number"
              min={1}
              max={120}
              value={delayMax}
              onChange={(e) => setDelayMax(parseInt(e.target.value) || 7)}
              className="px-2 py-1 border rounded text-sm w-16 text-center"
            />
            <span className="text-sm text-gray-500">seconds</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("select")}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep("test")}
              disabled={!message}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              Next: Test Message →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Test */}
      {step === "test" && (
        <div className="bg-white rounded-xl border p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">Step 4: Send Test Message</h2>

          <p className="text-sm text-gray-600 mb-4">
            Send a test message to the first contact to verify everything works correctly before bulk sending.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            {dataSource === "sheets" ? (
              <>
                <p className="text-sm"><strong>To:</strong> {selectedRows[0]?.phone} (Unit: {selectedRows[0]?.unitNumber})</p>
                <p className="text-sm mt-2"><strong>Message:</strong></p>
                <div className="bg-white rounded-lg p-3 border text-sm whitespace-pre-wrap mt-1">
                  {selectedRows[0] ? buildMessage(selectedRows[0]) : ""}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm"><strong>To:</strong> {gmbSelectedContacts[0]?.phone} ({gmbSelectedContacts[0]?.business_name})</p>
                <p className="text-sm mt-2"><strong>Message:</strong></p>
                <div className="bg-white rounded-lg p-3 border text-sm whitespace-pre-wrap mt-1">
                  {gmbSelectedContacts[0] ? buildGmbMessage(gmbSelectedContacts[0]) : ""}
                </div>
              </>
            )}
          </div>

          <button
            onClick={dataSource === "sheets" ? handleTestSend : handleGmbTestSend}
            className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium mb-4"
          >
            Send Test Message
          </button>

          {testResult && (
            <div
              className={`p-3 rounded-lg mb-4 text-sm ${
                testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}
            >
              {testResult.message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("compose")}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep("send")}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Next: Bulk Send →
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Send */}
      {step === "send" && (
        <div className="bg-white rounded-xl border p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">Step 5: Bulk Send</h2>

          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
            <p><strong>Source:</strong> {dataSource === "sheets" ? "Google Sheets" : "Google My Business"}</p>
            <p><strong>Total unique contacts:</strong> {activeSelectedRows.length}</p>
            <p><strong>Delay:</strong> {delayMin}–{delayMax} seconds between messages</p>
            {dataSource === "sheets" && (
              <p><strong>After sending:</strong> {feedbackColumnLabel[filterColumn]} will be updated to &quot;No Reply&quot;</p>
            )}
            {dataSource === "gmb" && (
              <p><strong>After sending:</strong> Contact status will be updated to &quot;sent&quot; or &quot;failed&quot;</p>
            )}
          </div>

          {!sending && !sendComplete && (
            <button
              onClick={dataSource === "sheets" ? handleBulkSend : handleGmbBulkSend}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Start Sending to {activeSelectedRows.length} Contacts
            </button>
          )}

          {sending && (
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all"
                    style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-mono whitespace-nowrap">
                  {sendProgress.current}/{sendProgress.total}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Sent: <span className="text-green-600 font-medium">{sendProgress.sent}</span>
                {sendProgress.failed > 0 && (
                  <> | Failed: <span className="text-red-600 font-medium">{sendProgress.failed}</span></>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">Sending in progress... please do not close this page.</p>
            </div>
          )}

          {sendComplete && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg mb-4">
              <h3 className="font-semibold">Campaign Complete!</h3>
              <p className="text-sm mt-1">
                Sent: {sendProgress.sent} | Failed: {sendProgress.failed} | Total: {sendProgress.total}
              </p>
              <p className="text-sm mt-1">
                Google Sheet feedback column has been updated to &quot;No Reply&quot; for successfully sent messages.
              </p>
            </div>
          )}

          {!sending && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setStep("test")}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                ← Back
              </button>
              {sendComplete && (
                <button
                  onClick={() => {
                    setStep("filter");
                    setSelectedIndices(new Set());
                    setMessage("");
                    setTestResult(null);
                    setSendComplete(false);
                    setSendProgress({ current: 0, total: 0, sent: 0, failed: 0 });
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Start New Campaign
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
