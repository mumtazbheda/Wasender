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

interface Campaign {
  id: string;
  name: string;
  templateId: number;
  createdAt: string;
  status: "draft" | "running" | "completed";
  totalSent: number;
  totalReplies: number;
  replyRate: number;
}

type Step = "select" | "template" | "delay" | "test" | "send" | "analytics";
type SelectionMode = "individual" | "filter" | "range";
type FeedbackKey = "ahmedFeedback1" | "ahmedFeedback2" | "ahmedFeedback3";

const FEEDBACK_LABELS: Record<FeedbackKey, string> = {
  ahmedFeedback1: "Ahmed Feedback 1",
  ahmedFeedback2: "Ahmed Feedback 2",
  ahmedFeedback3: "Ahmed Feedback 3",
};

// TIME_1 inspired delays: 47-137 seconds for human-like behavior
const HUMAN_LIKE_DELAYS = { min: 47, max: 137 };

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
    .replace(/\{101\}/g, row.unitNumber || "");
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
  const [filterColumn, setFilterColumn] = useState<FeedbackKey>("ahmedFeedback1");
  const [filterValue, setFilterValue] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  // Delay settings - NOW with human-like delays
  const [delayMin, setDelayMin] = useState(HUMAN_LIKE_DELAYS.min);
  const [delayMax, setDelayMax] = useState(HUMAN_LIKE_DELAYS.max);

  // Flow
  const [step, setStep] = useState<Step>("select");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, sent: 0, failed: 0 });
  const [sendComplete, setSendComplete] = useState(false);
  const [sendLog, setSendLog] = useState<string[]>([]);
  
  // Campaign history
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

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
        if (d.success) {
          setTabs(d.tabs || []);
        }
      })
      .finally(() => setLoadingTabs(false));
  }, [isConnected]);

  useEffect(() => {
    if (!selectedTab || !isConnected) return;
    setLoadingRows(true);
    fetch(`/api/sheet-rows?tab=${encodeURIComponent(selectedTab)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRows(d.rows || []);
          setFeedbackColIndices(d.feedbackColIndices || { fb1: -1, fb2: -1, fb3: -1 });
          setSelectedIndices(new Set());
        }
      })
      .finally(() => setLoadingRows(false));
  }, [selectedTab, isConnected]);

  useEffect(() => {
    if (!isConnected) return;
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setTemplates(d.templates || []);
        }
      });
  }, [isConnected]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectAll = () => {
    const base = selectionMode === "filter" ? filteredRows : rows;
    const indices = new Set(base.map((_, i) => i));
    setSelectedIndices(indices);
  };

  const handleClearSelection = () => {
    setSelectedIndices(new Set());
  };

  const handleToggleRow = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleTestMessage = async () => {
    if (!activeTemplate || selectedRows.length === 0) return;
    setTestResult(null);
    try {
      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: selectedRows[0].phone,
          message: applyTemplate(activeTemplate, selectedRows[0]),
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? "Test message sent successfully!" : "Failed to send test message"),
      });
    } catch (error) {
      setTestResult({ success: false, message: "Error sending test message" });
    }
  };

  const handleSendCampaign = async () => {
    if (!activeTemplate || selectedRows.length === 0) return;

    setSending(true);
    setSendProgress({ current: 0, total: selectedRows.length, sent: 0, failed: 0 });
    setSendLog([]);

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];
      const message = applyTemplate(activeTemplate, row);

      try {
        const res = await fetch("/api/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: row.phone, message }),
        });
        const data = await res.json();

        if (data.success) {
          sent++;
          setSendLog((prev) => [...prev, `✓ ${row.phone} - ${row.ownerName || "Unknown"}`]);
        } else {
          failed++;
          setSendLog((prev) => [...prev, `✗ ${row.phone} - ${data.message || "Failed"}`]);
        }
      } catch (error) {
        failed++;
        setSendLog((prev) => [...prev, `✗ ${row.phone} - Error`]);
      }

      setSendProgress({ current: i + 1, total: selectedRows.length, sent, failed });

      // TIME_1 inspired: Human-like delay between messages
      if (i < selectedRows.length - 1) {
        const delay = Math.random() * (delayMax - delayMin) + delayMin;
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }
    }

    setSending(false);
    setSendComplete(true);
    
    // Add to campaign history
    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name: `Campaign - ${new Date().toLocaleDateString()}`,
      templateId: selectedTemplateId || 0,
      createdAt: new Date().toISOString(),
      status: "completed",
      totalSent: sent,
      totalReplies: 0, // Will be updated when replies come in
      replyRate: 0,
    };
    setCampaigns((prev) => [newCampaign, ...prev]);
  };

  // ── UI Rendering ──────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button
          onClick={() => signIn()}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Sign in to send campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Campaigns</h1>
        <p className="text-gray-600">Send bulk WhatsApp messages with personalization</p>
      </div>

      {/* Campaign Analytics Tab */}
      {step === "analytics" && (
        <div className="space-y-6">
          <button
            onClick={() => setStep("select")}
            className="text-green-600 hover:text-green-700 font-medium text-sm"
          >
            ← Back to Campaigns
          </button>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <p className="text-gray-600 text-sm mb-1">Total Campaigns</p>
              <p className="text-2xl font-bold">{campaigns.length}</p>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <p className="text-gray-600 text-sm mb-1">Total Messages Sent</p>
              <p className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + c.totalSent, 0)}</p>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <p className="text-gray-600 text-sm mb-1">Total Replies</p>
              <p className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + c.totalReplies, 0)}</p>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <p className="text-gray-600 text-sm mb-1">Avg Reply Rate</p>
              <p className="text-2xl font-bold">
                {campaigns.length > 0
                  ? Math.round(campaigns.reduce((sum, c) => sum + c.replyRate, 0) / campaigns.length)
                  : 0}
                %
              </p>
            </div>
          </div>

          {/* Campaign History Table */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Campaign</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Date</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Sent</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Replies</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Reply Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{campaign.name}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-green-600">
                        {campaign.totalSent}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-blue-600">
                        {campaign.totalReplies}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-yellow-600">
                        {campaign.replyRate}%
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No campaigns yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Main Campaign Wizard */}
      {step !== "analytics" && (
        <>
          {/* Step Indicator */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              {(["select", "template", "delay", "test", "send"] as const).map((s, i) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      step === s
                        ? "bg-green-600 text-white"
                        : ["select", "template", "delay", "test", "send"].indexOf(step) > i
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="hidden md:block ml-2 text-xs font-medium text-gray-600 capitalize">
                    {s}
                  </div>
                  {i < 4 && <div className="flex-1 h-1 mx-2 bg-gray-200 ml-4" />}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Select Rows */}
          {step === "select" && (
            <div className="space-y-4 bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Step 1: Select Recipients</h2>

              {/* Tab Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Sheet Tab</label>
                {loadingTabs ? (
                  <p className="text-gray-500 text-sm">Loading tabs...</p>
                ) : (
                  <select
                    value={selectedTab}
                    onChange={(e) => setSelectedTab(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {tabs.map((tab) => (
                      <option key={tab} value={tab}>
                        {tab}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selection Mode */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Selection Mode</label>
                <div className="flex gap-4">
                  {(["individual", "filter", "range"] as const).map((mode) => (
                    <label key={mode} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value={mode}
                        checked={selectionMode === mode}
                        onChange={(e) => setSelectionMode(e.target.value as SelectionMode)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm capitalize">{mode}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filter Mode */}
              {selectionMode === "filter" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Filter Column</label>
                    <select
                      value={filterColumn}
                      onChange={(e) => setFilterColumn(e.target.value as FeedbackKey)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      {Object.entries(FEEDBACK_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Filter Value</label>
                    <select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">-- Select --</option>
                      {filterOptions.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Range Mode */}
              {selectionMode === "range" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Range Start</label>
                    <input
                      type="number"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Range End</label>
                    <input
                      type="number"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Selection Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">{selectedRows.length}</span> recipients selected (duplicates removed)
                </p>
              </div>

              {/* Row Selection */}
              {!loadingRows && (
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">Recipients</label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700"
                      >
                        Select All
                      </button>
                      <button
                        onClick={handleClearSelection}
                        className="text-xs px-2 py-1 text-red-600 hover:text-red-700"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Recipients List - Mobile Responsive */}
                  <div className="hidden md:block bg-gray-50 rounded-lg border max-h-72 overflow-y-auto">
                    {(selectionMode === "filter" ? filteredRows : rows).map((row, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 px-4 py-3 border-b hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleToggleRow(idx)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIndices.has(idx)}
                          readOnly
                          className="w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{row.ownerName}</p>
                          <p className="text-xs text-gray-600 font-mono">{row.phone}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile view */}
                  <div className="md:hidden space-y-2">
                    {(selectionMode === "filter" ? filteredRows : rows).slice(0, 10).map((row, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleToggleRow(idx)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIndices.has(idx)}
                          readOnly
                          className="w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{row.ownerName}</p>
                          <p className="text-xs text-gray-600 font-mono">{row.phone}</p>
                        </div>
                      </div>
                    ))}
                    {(selectionMode === "filter" ? filteredRows : rows).length > 10 && (
                      <p className="text-xs text-gray-600 p-2">
                        ... and {(selectionMode === "filter" ? filteredRows : rows).length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("template")}
                  disabled={selectedRows.length === 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Next: Choose Template
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Template */}
          {step === "template" && (
            <div className="space-y-4 bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Step 2: Choose Template</h2>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Template</label>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <label key={template.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        checked={selectedTemplateId === template.id && !useCustom}
                        onChange={() => {
                          setSelectedTemplateId(template.id);
                          setUseCustom(false);
                        }}
                        className="w-4 h-4 mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-gray-600 line-clamp-2">{template.body}</p>
                      </div>
                    </label>
                  ))}
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={useCustom}
                      onChange={() => setUseCustom(true)}
                      className="w-4 h-4 mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Custom Message</p>
                      <p className="text-xs text-gray-600">Write your own message</p>
                    </div>
                  </label>
                </div>
              </div>

              {useCustom && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Custom Message</label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter your message. Use {unit}, {name}, {feedback1}, etc. for personalization"
                  />
                </div>
              )}

              {/* Preview */}
              {activeTemplate && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Preview (First Recipient)</label>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-900 whitespace-pre-wrap break-words">
                    {previewMessage || "Select a template first"}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("select")}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("delay")}
                  disabled={!activeTemplate}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  Next: Set Delays
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Delay Settings */}
          {step === "delay" && (
            <div className="space-y-4 bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Step 3: Message Delays (Human-Like Behavior)</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                <p className="font-semibold mb-1">Why delays?</p>
                <p>Delays between messages mimic human behavior and prevent WhatsApp rate limiting. TIME_1 recommended: 47-137 seconds.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Minimum Delay (seconds)</label>
                  <input
                    type="number"
                    value={delayMin}
                    onChange={(e) => setDelayMin(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Maximum Delay (seconds)</label>
                  <input
                    type="number"
                    value={delayMax}
                    onChange={(e) => setDelayMax(Math.max(delayMin + 1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900">
                <p>With {selectedRows.length} recipients and average {Math.round((delayMin + delayMax) / 2)}s delays, this campaign will take approximately {Math.round((selectedRows.length * (delayMin + delayMax) / 2) / 60)} minutes.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("template")}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("test")}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Next: Test Message
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Test Message */}
          {step === "test" && (
            <div className="space-y-4 bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Step 4: Send Test Message</h2>

              <p className="text-sm text-gray-600">Send a test message to the first recipient to verify everything works.</p>

              {testResult && (
                <div
                  className={`p-4 rounded-lg text-sm ${
                    testResult.success
                      ? "bg-green-50 border border-green-200 text-green-900"
                      : "bg-red-50 border border-red-200 text-red-900"
                  }`}
                >
                  {testResult.message}
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-900 whitespace-pre-wrap break-words">
                {previewMessage}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("delay")}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleTestMessage}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send Test
                </button>
                <button
                  onClick={() => setStep("send")}
                  disabled={!testResult?.success}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  Proceed to Send All
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Send Campaign */}
          {step === "send" && (
            <div className="space-y-4 bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Step 5: Send Campaign</h2>

              {!sendComplete && !sending && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900">
                    <p className="font-semibold mb-1">Ready to send?</p>
                    <p>
                      {selectedRows.length} messages will be sent with {Math.round((delayMin + delayMax) / 2)}s average delays.
                    </p>
                  </div>

                  <button
                    onClick={handleSendCampaign}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    🚀 Start Campaign
                  </button>
                </div>
              )}

              {sending && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 font-semibold mb-2">
                      Sending campaign... {sendProgress.current}/{sendProgress.total}
                    </p>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-blue-700 mt-2">
                      <span>✓ Sent: {sendProgress.sent}</span>
                      <span>✗ Failed: {sendProgress.failed}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg border max-h-48 overflow-y-auto p-3 text-xs font-mono text-gray-700 space-y-1">
                    {sendLog.map((log, idx) => (
                      <p key={idx}>{log}</p>
                    ))}
                  </div>
                </div>
              )}

              {sendComplete && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-900 font-semibold">✓ Campaign completed!</p>
                    <p className="text-sm text-green-800 mt-2">
                      Sent: <span className="font-bold">{sendProgress.sent}</span> | Failed:{" "}
                      <span className="font-bold">{sendProgress.failed}</span>
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setStep("select");
                        setSendLog([]);
                        setSendProgress({ current: 0, total: 0, sent: 0, failed: 0 });
                        setSendComplete(false);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Send Another Campaign
                    </button>
                    <button
                      onClick={() => setStep("analytics")}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      View Analytics
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
