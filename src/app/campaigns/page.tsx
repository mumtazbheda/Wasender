"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";

interface SheetRow {
  rowIndex: number;
  unitNumber: string;
  ownerName: string;
  phone: string;
  mobile2: string;
  mobile3: string;
  ahmedFeedback1: string;
  ahmedFeedback2: string;
  ahmedFeedback3: string;
}

interface Template {
  id: number;
  name: string;
  body: string;
}

type Step = "select" | "template" | "delay" | "test" | "send";
type SelectionMode = "individual" | "filter" | "range";
type FeedbackKey = "ahmedFeedback1" | "ahmedFeedback2" | "ahmedFeedback3";

const FEEDBACK_LABELS: Record<FeedbackKey, string> = {
  ahmedFeedback1: "Ahmed Feedback 1",
  ahmedFeedback2: "Ahmed Feedback 2",
  ahmedFeedback3: "Ahmed Feedback 3",
};

function applyTemplate(templateBody: string, row: SheetRow): string {
  return templateBody
    .replace(/\{unit\}/g, row.unitNumber || "")
    .replace(/\{name\}/g, row.ownerName || "")
    .replace(/\{mobile1\}/g, row.phone || "")
    .replace(/\{mobile2\}/g, row.mobile2 || "")
    .replace(/\{mobile3\}/g, row.mobile3 || "")
    .replace(/\{feedback1\}/g, row.ahmedFeedback1 || "")
    .replace(/\{feedback2\}/g, row.ahmedFeedback2 || "")
    .replace(/\{feedback3\}/g, row.ahmedFeedback3 || "")
    .replace(/\{101\}/g, row.unitNumber || ""); // legacy variable
}

export default function CampaignsPage() {
  const { data: session, status } = useSession();
  const isConnected = status === "authenticated" && session;

  // Sheet data
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [feedbackColIndices, setFeedbackColIndices] = useState({ fb1: -1, fb2: -1, fb3: -1 });
  const [tabs, setTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState("Time 1 New");
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingTabs, setLoadingTabs] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  // Selection state
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("filter");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  // Filter mode
  const [filterColumn, setFilterColumn] = useState<FeedbackKey>("ahmedFeedback1");
  const [filterValue, setFilterValue] = useState("");
  // Range mode
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  // Delay settings
  const [delayMin, setDelayMin] = useState(3);
  const [delayMax, setDelayMax] = useState(8);

  // Flow
  const [step, setStep] = useState<Step>("select");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, sent: 0, failed: 0 });
  const [sendComplete, setSendComplete] = useState(false);
  const [sendLog, setSendLog] = useState<string[]>([]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const filterOptions = useMemo(() => {
    const vals = rows.map((r) => r[filterColumn]).filter(Boolean);
    return [...new Set(vals)].sort();
  }, [rows, filterColumn]);

  const filteredRows = useMemo(() => {
    if (selectionMode !== "filter" || !filterValue) return rows;
    return rows.filter((r) => r[filterColumn] === filterValue);
  }, [rows, selectionMode, filterColumn, filterValue]);

  const selectedRows = useMemo(() => {
    const base = selectionMode === "filter" ? filteredRows : rows;
    const selected = base.filter((_, i) => selectedIndices.has(i));
    const seen = new Set<string>();
    return selected.filter((r) => {
      if (seen.has(r.phone)) return false;
      seen.add(r.phone);
      return true;
    });
  }, [filteredRows, rows, selectedIndices, selectionMode]);

  const activeTemplate = useMemo(() => {
    if (useCustom) return customMessage;
    return templates.find((t) => t.id === selectedTemplateId)?.body || "";
  }, [useCustom, customMessage, templates, selectedTemplateId]);

  const previewMessage = useMemo(() => {
    if (!activeTemplate || selectedRows.length === 0) return "";
    return applyTemplate(activeTemplate, selectedRows[0]);
  }, [activeTemplate, selectedRows]);

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isConnected) return;
    setLoadingTabs(true);
    fetch("/api/sheet-tabs")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.tabs.length > 0) {
          setTabs(d.tabs);
          setSelectedTab(d.tabs.includes("Time 1 New") ? "Time 1 New" : d.tabs[0]);
        }
      })
      .finally(() => setLoadingTabs(false));
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected || !selectedTab) return;
    loadSheetData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, selectedTab]);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => { if (d.success) setTemplates(d.templates); });
  }, []);

  async function loadSheetData() {
    setLoadingRows(true);
    setSelectedIndices(new Set());
    const res = await fetch(`/api/sheet-data?tab=${encodeURIComponent(selectedTab)}`);
    const data = await res.json();
    if (data.success) {
      setRows(data.rows);
      setFeedbackColIndices(data.feedbackColumnIndices);
    }
    setLoadingRows(false);
  }

  // ── Selection helpers ──────────────────────────────────────────────────────

  const baseRows = selectionMode === "filter" ? filteredRows : rows;

  function toggleIndex(i: number) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function selectAll() { setSelectedIndices(new Set(baseRows.map((_, i) => i))); }
  function deselectAll() { setSelectedIndices(new Set()); }

  function applyRange() {
    const s = parseInt(rangeStart) - 1;
    const e = parseInt(rangeEnd) - 1;
    if (isNaN(s) || isNaN(e) || s < 0 || e < s || e >= baseRows.length) return;
    const idx = new Set<number>();
    for (let i = s; i <= e; i++) idx.add(i);
    setSelectedIndices(idx);
  }

  // ── Send helpers ──────────────────────────────────────────────────────────

  async function handleTestSend() {
    if (!selectedRows.length || !activeTemplate) return;
    setTestResult(null);
    const row = selectedRows[0];
    const text = applyTemplate(activeTemplate, row);
    const res = await fetch("/api/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: row.phone, text }),
    });
    const data = await res.json();
    setTestResult(data.success
      ? { success: true,  message: `Test sent to ${row.phone} (Unit: ${row.unitNumber || "—"})` }
      : { success: false, message: `Test failed: ${data.error}` }
    );
  }

  async function handleBulkSend() {
    if (!selectedRows.length || !activeTemplate) return;
    setSending(true);
    setSendComplete(false);
    setSendLog([]);
    setSendProgress({ current: 0, total: selectedRows.length, sent: 0, failed: 0 });

    const feedbackColMap: Record<FeedbackKey, number> = {
      ahmedFeedback1: feedbackColIndices.fb1,
      ahmedFeedback2: feedbackColIndices.fb2,
      ahmedFeedback3: feedbackColIndices.fb3,
    };
    const feedbackColIdx = selectionMode === "filter" ? feedbackColMap[filterColumn] : -1;

    let sent = 0, failed = 0;

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];

      if (i > 0) {
        const delay = (Math.random() * (delayMax - delayMin) + delayMin) * 1000;
        await new Promise((r) => setTimeout(r, delay));
      }

      const text = applyTemplate(activeTemplate, row);
      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: row.phone, text }),
      });
      const data = await res.json();

      if (data.success) {
        sent++;
        setSendLog((prev) => [...prev, `✓ ${row.phone} (Unit ${row.unitNumber || "—"})`]);
        // Write "No Reply" to feedback column if using filter mode
        if (feedbackColIdx >= 0) {
          fetch("/api/sheet-update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sheetTab: selectedTab,
              updates: [{ rowIndex: row.rowIndex, columnIndex: feedbackColIdx, value: "No Reply" }],
            }),
          }).catch(() => {});
        }
      } else {
        failed++;
        setSendLog((prev) => [...prev, `✗ ${row.phone} — ${data.error}`]);
      }

      setSendProgress({ current: i + 1, total: selectedRows.length, sent, failed });
    }

    setSending(false);
    setSendComplete(true);
    loadSheetData();
  }

  // ── Not connected ──────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Campaigns</h1>
        <div className="bg-white rounded-xl border p-8 text-center">
          <p className="text-gray-500 mb-4">Connect your Google Account to access sheet data for campaigns.</p>
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

  // ── Steps ──────────────────────────────────────────────────────────────────

  const STEPS: { key: Step; label: string }[] = [
    { key: "select",   label: "1. Select" },
    { key: "template", label: "2. Template" },
    { key: "delay",    label: "3. Delay" },
    { key: "test",     label: "4. Test" },
    { key: "send",     label: "5. Send" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <div className="flex items-center gap-3">
          {loadingTabs ? (
            <span className="text-sm text-gray-400">Loading tabs...</span>
          ) : (
            <select
              value={selectedTab}
              onChange={(e) => setSelectedTab(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              {tabs.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <button
            onClick={loadSheetData}
            disabled={loadingRows}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm disabled:opacity-50"
          >
            {loadingRows ? "Loading..." : "Refresh"}
          </button>
          <span className="text-sm text-gray-400">{rows.length} rows</span>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
        {STEPS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStep(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              step === key ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
        {selectedRows.length > 0 && (
          <span className="ml-2 text-xs text-gray-400">{selectedRows.length} contact{selectedRows.length !== 1 ? "s" : ""} selected</span>
        )}
      </div>

      {/* ── STEP 1: SELECT ─────────────────────────────────────────────────── */}
      {step === "select" && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Step 1: Select Contacts</h2>

          {/* Mode selector */}
          <div className="flex gap-3 mb-5">
            {(["filter", "range", "individual"] as SelectionMode[]).map((mode) => (
              <label key={mode} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="selectionMode"
                  checked={selectionMode === mode}
                  onChange={() => { setSelectionMode(mode); deselectAll(); setFilterValue(""); }}
                />
                <span className="text-sm font-medium capitalize">{mode}</span>
              </label>
            ))}
          </div>

          {/* Filter mode */}
          {selectionMode === "filter" && (
            <div className="space-y-3 mb-4">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Feedback Column</label>
                  <select
                    value={filterColumn}
                    onChange={(e) => { setFilterColumn(e.target.value as FeedbackKey); setFilterValue(""); deselectAll(); }}
                    className="px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    {(Object.keys(FEEDBACK_LABELS) as FeedbackKey[]).map((k) => (
                      <option key={k} value={k}>{FEEDBACK_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Filter Value</label>
                  <select
                    value={filterValue}
                    onChange={(e) => { setFilterValue(e.target.value); deselectAll(); }}
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
              <div className="flex gap-3">
                <button onClick={selectAll} className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                  Select All ({filteredRows.length})
                </button>
                <button onClick={deselectAll} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Range mode */}
          {selectionMode === "range" && (
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm text-gray-600">Rows</label>
              <input
                type="number" min={1} max={rows.length} value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                placeholder="From"
                className="px-3 py-2 border rounded-lg text-sm w-24 text-center"
              />
              <span className="text-gray-400">to</span>
              <input
                type="number" min={1} max={rows.length} value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                placeholder="To"
                className="px-3 py-2 border rounded-lg text-sm w-24 text-center"
              />
              <button
                onClick={applyRange}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Apply Range
              </button>
              <span className="text-sm text-gray-400">(sheet has {rows.length} rows)</span>
            </div>
          )}

          {/* Individual mode */}
          {selectionMode === "individual" && (
            <div className="flex gap-3 mb-4">
              <button onClick={selectAll} className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                Select All ({rows.length})
              </button>
              <button onClick={deselectAll} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                Deselect All
              </button>
            </div>
          )}

          {/* Contacts table */}
          <div className="max-h-80 overflow-auto border rounded-lg mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIndices.size === baseRows.length && baseRows.length > 0}
                      onChange={() => selectedIndices.size === baseRows.length ? deselectAll() : selectAll()}
                    />
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Unit</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Owner</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Mobile 1</th>
                  {rows.some((r) => r.mobile2) && <th className="text-left px-3 py-2 font-medium text-gray-600">Mobile 2</th>}
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    {selectionMode === "filter" ? FEEDBACK_LABELS[filterColumn] : "Feedback 1"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {baseRows.map((r, i) => (
                  <tr
                    key={i}
                    className={`hover:bg-gray-50 cursor-pointer ${selectedIndices.has(i) ? "bg-green-50" : ""}`}
                    onClick={() => toggleIndex(i)}
                  >
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selectedIndices.has(i)} onChange={() => toggleIndex(i)} onClick={(e) => e.stopPropagation()} />
                    </td>
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-mono font-medium">{r.unitNumber || "—"}</td>
                    <td className="px-3 py-2">{r.ownerName || "—"}</td>
                    <td className="px-3 py-2 font-mono">{r.phone}</td>
                    {rows.some((rr) => rr.mobile2) && <td className="px-3 py-2 font-mono text-gray-500">{r.mobile2 || "—"}</td>}
                    <td className="px-3 py-2 text-gray-500 max-w-xs truncate">
                      {selectionMode === "filter" ? r[filterColumn] || "—" : r.ahmedFeedback1 || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              <strong>{selectedRows.length}</strong> unique phone number{selectedRows.length !== 1 ? "s" : ""} selected
            </p>
            <button
              onClick={() => setStep("template")}
              disabled={selectedRows.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              Next: Choose Template →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: TEMPLATE ──────────────────────────────────────────────── */}
      {step === "template" && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Step 2: Choose Template</h2>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!useCustom} onChange={() => setUseCustom(false)} />
              <span className="text-sm font-medium">Saved Template</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={useCustom} onChange={() => setUseCustom(true)} />
              <span className="text-sm font-medium">Quick Message</span>
            </label>
          </div>

          {!useCustom ? (
            templates.length === 0 ? (
              <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                No templates saved yet.{" "}
                <a href="/templates" className="text-blue-600 hover:underline">Create one in Templates →</a>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {templates.map((tpl) => (
                  <label
                    key={tpl.id}
                    className={`block p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplateId === tpl.id ? "border-green-500 bg-green-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      checked={selectedTemplateId === tpl.id}
                      onChange={() => setSelectedTemplateId(tpl.id)}
                      className="sr-only"
                    />
                    <p className="font-medium text-sm">{tpl.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{tpl.body.slice(0, 100)}{tpl.body.length > 100 ? "…" : ""}</p>
                  </label>
                ))}
              </div>
            )
          ) : (
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={"Hi {name}! This is regarding Unit {unit}. Use *bold* for bold text."}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none font-mono mb-4"
            />
          )}

          {/* Preview */}
          {previewMessage && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Preview — first contact ({selectedRows[0]?.phone})</p>
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{previewMessage}</pre>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep("select")} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
              ← Back
            </button>
            <button
              onClick={() => setStep("delay")}
              disabled={!activeTemplate}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              Next: Set Delay →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: DELAY ─────────────────────────────────────────────────── */}
      {step === "delay" && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-2">Step 3: Message Delay</h2>
          <p className="text-sm text-gray-500 mb-6">
            A random delay between each message makes the sending look natural and reduces ban risk.
          </p>

          <div className="flex items-center gap-4 mb-6">
            <div className="text-center">
              <label className="block text-xs text-gray-500 mb-1">Min seconds</label>
              <input
                type="number" min={1} max={300} value={delayMin}
                onChange={(e) => setDelayMin(Math.max(1, parseInt(e.target.value) || 1))}
                className="px-3 py-2 border rounded-lg text-sm w-24 text-center font-mono"
              />
            </div>
            <span className="text-gray-400 mt-4">to</span>
            <div className="text-center">
              <label className="block text-xs text-gray-500 mb-1">Max seconds</label>
              <input
                type="number" min={1} max={300} value={delayMax}
                onChange={(e) => setDelayMax(Math.max(delayMin + 1, parseInt(e.target.value) || 8))}
                className="px-3 py-2 border rounded-lg text-sm w-24 text-center font-mono"
              />
            </div>
            <div className="mt-4 text-sm text-gray-500">
              seconds between messages
            </div>
          </div>

          <div className="bg-blue-50 text-blue-700 text-sm rounded-lg p-3 mb-6">
            Estimated time for <strong>{selectedRows.length}</strong> contacts:{" "}
            <strong>{Math.round(selectedRows.length * (delayMin + delayMax) / 2 / 60)}</strong> minutes
            (avg {Math.round((delayMin + delayMax) / 2)}s per message)
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("template")} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
              ← Back
            </button>
            <button onClick={() => setStep("test")} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
              Next: Test Message →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: TEST ──────────────────────────────────────────────────── */}
      {step === "test" && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-2">Step 4: Send Test Message</h2>
          <p className="text-sm text-gray-500 mb-4">
            Send a test to the first contact to confirm everything looks right before bulk sending.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm mb-1"><strong>To:</strong> {selectedRows[0]?.phone} (Unit: {selectedRows[0]?.unitNumber || "—"})</p>
            <p className="text-sm font-medium mt-3 mb-1">Message:</p>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed bg-white border rounded-lg p-3">
              {previewMessage}
            </pre>
          </div>

          <button
            onClick={handleTestSend}
            className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium mb-4"
          >
            Send Test Message
          </button>

          {testResult && (
            <div className={`p-3 rounded-lg text-sm mb-4 ${testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {testResult.message}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep("delay")} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
              ← Back
            </button>
            <button onClick={() => setStep("send")} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
              Next: Bulk Send →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: SEND ──────────────────────────────────────────────────── */}
      {step === "send" && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Step 5: Bulk Send</h2>

          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm space-y-1">
            <p><strong>Contacts:</strong> {selectedRows.length} unique phone numbers</p>
            <p><strong>Delay:</strong> {delayMin}–{delayMax} seconds (random)</p>
            <p><strong>Estimated time:</strong> ~{Math.round(selectedRows.length * (delayMin + delayMax) / 2 / 60)} min</p>
            {selectionMode === "filter" && feedbackColIndices.fb1 >= 0 && (
              <p><strong>After sending:</strong> {FEEDBACK_LABELS[filterColumn]} → updated to &quot;No Reply&quot; in sheet</p>
            )}
          </div>

          {!sending && !sendComplete && (
            <button
              onClick={handleBulkSend}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Start Sending to {selectedRows.length} Contacts
            </button>
          )}

          {(sending || sendProgress.current > 0) && (
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all"
                    style={{ width: `${sendProgress.total > 0 ? (sendProgress.current / sendProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-mono whitespace-nowrap">{sendProgress.current}/{sendProgress.total}</span>
              </div>
              <p className="text-sm text-gray-600">
                Sent: <span className="text-green-600 font-medium">{sendProgress.sent}</span>
                {sendProgress.failed > 0 && <> &nbsp;|&nbsp; Failed: <span className="text-red-600 font-medium">{sendProgress.failed}</span></>}
              </p>
              {sending && <p className="text-xs text-gray-400 mt-1">Sending... do not close this tab.</p>}
            </div>
          )}

          {sendLog.length > 0 && (
            <div className="max-h-40 overflow-auto border rounded-lg p-2 font-mono text-xs text-gray-600 bg-gray-50 mb-4">
              {sendLog.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          )}

          {sendComplete && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg mb-4">
              <p className="font-semibold">Campaign Complete!</p>
              <p className="text-sm mt-1">Sent: {sendProgress.sent} &nbsp;|&nbsp; Failed: {sendProgress.failed} &nbsp;|&nbsp; Total: {sendProgress.total}</p>
            </div>
          )}

          {!sending && (
            <div className="flex gap-3 mt-2">
              {!sendComplete && (
                <button onClick={() => setStep("test")} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                  ← Back
                </button>
              )}
              {sendComplete && (
                <button
                  onClick={() => {
                    setStep("select");
                    setSelectedIndices(new Set());
                    setSelectedTemplateId(null);
                    setCustomMessage("");
                    setTestResult(null);
                    setSendComplete(false);
                    setSendProgress({ current: 0, total: 0, sent: 0, failed: 0 });
                    setSendLog([]);
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
