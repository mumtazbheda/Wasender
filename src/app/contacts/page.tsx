"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

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
  const { data: session, status } = useSession();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [tabs, setTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState("Time 1 New");
  const [loadingTabs, setLoadingTabs] = useState(false);

  const isConnected = status === "authenticated" && session;

  async function loadContacts() {
    const res = await fetch("/api/contacts");
    const data = await res.json();
    if (data.success) setContacts(data.contacts);
    setLoading(false);
  }

  async function loadTabs() {
    setLoadingTabs(true);
    const res = await fetch("/api/sheet-tabs");
    const data = await res.json();
    if (data.success && data.tabs.length > 0) {
      setTabs(data.tabs);
      if (data.tabs.includes("Time 1 New")) {
        setSelectedTab("Time 1 New");
      } else {
        setSelectedTab(data.tabs[0]);
      }
    }
    setLoadingTabs(false);
  }

  async function syncFromSheets() {
    setSyncing(true);
    setSyncMessage("");
    const res = await fetch("/api/sync-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetTab: selectedTab }),
    });
    const data = await res.json();
    if (data.success) {
      setSyncMessage(`Synced ${data.count} contacts from "${selectedTab}"`);
      loadContacts();
    } else {
      setSyncMessage(`Sync failed: ${data.error}`);
    }
    setSyncing(false);
  }

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadTabs();
    }
  }, [isConnected]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <div className="flex items-center gap-3">
          {!isConnected ? (
            <button
              onClick={() => signIn("google")}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Connect Google Account
            </button>
          ) : (
            <>
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                Google Connected
              </span>

              {loadingTabs ? (
                <span className="text-xs text-gray-400">Loading tabs...</span>
              ) : tabs.length > 0 ? (
                <select
                  value={selectedTab}
                  onChange={(e) => setSelectedTab(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {tabs.map((tab) => (
                    <option key={tab} value={tab}>
                      {tab}
                    </option>
                  ))}
                </select>
              ) : null}

              <button
                onClick={syncFromSheets}
                disabled={syncing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {syncing ? "Syncing..." : "Sync from Google Sheets"}
              </button>
            </>
          )}
        </div>
      </div>

      {syncMessage && (
        <div
          className={`p-3 rounded-lg mb-4 text-sm ${
            syncMessage.includes("failed")
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {syncMessage}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading contacts...</p>
      ) : contacts.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          <p className="mb-2">No contacts yet.</p>
          <p className="text-sm">
            {isConnected
              ? 'Select a tab and click "Sync from Google Sheets" to import contacts.'
              : 'Click "Connect Google Account" to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Unit
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Owner
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Phone
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Feedback
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">
                    {c.unit_number || "-"}
                  </td>
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
