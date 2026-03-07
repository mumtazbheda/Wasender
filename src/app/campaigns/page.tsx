"use client";

import { useState, useEffect } from "react";

interface Contact {
  id: number;
  phone: string;
  owner_name: string;
  unit_number: string;
}

export default function CampaignsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [template, setTemplate] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setContacts(data.contacts);
      });
  }, []);

  function toggleAll() {
    if (selectedPhones.length === contacts.length) {
      setSelectedPhones([]);
    } else {
      setSelectedPhones(contacts.map((c) => c.phone));
    }
  }

  function togglePhone(phone: string) {
    setSelectedPhones((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPhones.length || !template) return;

    setSending(true);
    setResult(null);

    const phones = contacts
      .filter((c) => selectedPhones.includes(c.phone))
      .map((c) => ({ phone: c.phone, name: c.owner_name || "", unit: c.unit_number || "" }));

    const res = await fetch("/api/send-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phones, template, campaignName: campaignName || "Campaign" }),
    });
    const data = await res.json();

    if (data.success) {
      setResult({ sent: data.sent, failed: data.failed });
    } else {
      setResult({ sent: 0, failed: phones.length });
    }
    setSending(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Campaigns</h1>

      <form onSubmit={handleSend} className="space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-3">Campaign Details</h2>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Campaign name (optional)"
            className="w-full px-3 py-2 border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="Message template. Use {name} and {unit} for personalization."
            rows={4}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Available variables: {"{name}"}, {"{unit}"}, {"{phone}"}
          </p>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Select Contacts ({selectedPhones.length}/{contacts.length})
            </h2>
            <button
              type="button"
              onClick={toggleAll}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {selectedPhones.length === contacts.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          {contacts.length === 0 ? (
            <p className="text-gray-500 text-sm">No contacts. Sync from Google Sheets first.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {contacts.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPhones.includes(c.phone)}
                    onChange={() => togglePhone(c.phone)}
                    className="rounded"
                  />
                  <span className="text-sm">
                    <span className="font-mono text-gray-600">{c.unit_number || "-"}</span>
                    {" - "}
                    {c.owner_name || "Unknown"}{" "}
                    <span className="text-gray-400">({c.phone})</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={sending || !selectedPhones.length || !template}
          className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          {sending
            ? "Sending campaign..."
            : `Send to ${selectedPhones.length} contact${selectedPhones.length !== 1 ? "s" : ""}`}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-4 bg-white rounded-xl border">
          <h3 className="font-semibold mb-2">Campaign Results</h3>
          <p className="text-sm">
            <span className="text-green-600 font-medium">{result.sent} sent</span>
            {result.failed > 0 && (
              <span className="text-red-600 font-medium"> / {result.failed} failed</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
