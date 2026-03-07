"use client";

import { useEffect, useState } from "react";

interface Contact {
  id: number;
  unit_number: string;
  owner_name: string;
  phone: string;
  contact_status: string;
  ahmed_feedback_1: string;
  ahmed_feedback_2: string;
  ahmed_feedback_3: string;
  last_updated: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  async function loadContacts() {
    const res = await fetch("/api/contacts");
    const data = await res.json();
    if (data.success) setContacts(data.contacts);
    setLoading(false);
  }

  async function syncFromSheets() {
    setSyncing(true);
    setSyncMessage("");
    const res = await fetch("/api/sync-sheets", { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setSyncMessage(`Synced ${data.count} contacts from Google Sheets`);
      loadContacts();
    } else {
      setSyncMessage(`Sync failed: ${data.error}`);
    }
    setSyncing(false);
  }

  useEffect(() => {
    loadContacts();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <button
          onClick={syncFromSheets}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {syncing ? "Syncing..." : "Sync from Google Sheets"}
        </button>
      </div>

      {syncMessage && (
        <div className={`p-3 rounded-lg mb-4 text-sm ${syncMessage.includes("failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {syncMessage}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading contacts...</p>
      ) : contacts.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          <p className="mb-2">No contacts yet.</p>
          <p className="text-sm">Click &quot;Sync from Google Sheets&quot; to import contacts, or add them via the API.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Unit</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Feedback</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{c.unit_number || "-"}</td>
                  <td className="px-4 py-3">{c.owner_name || "-"}</td>
                  <td className="px-4 py-3 font-mono">{c.phone}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                      {c.contact_status || "New"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {c.ahmed_feedback_1 || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/send?phone=${encodeURIComponent(c.phone)}`}
                      className="text-green-600 hover:text-green-700 text-xs font-medium"
                    >
                      Send Message
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
