"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/StatCard";

interface Stats {
  totalContacts: number;
  totalMessages: number;
  incoming: number;
  outgoing: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalContacts: 0,
    totalMessages: 0,
    incoming: 0,
    outgoing: 0,
  });
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  async function setupDb() {
    const res = await fetch("/api/setup-db", { method: "POST" });
    const data = await res.json();
    setDbReady(data.success);
    return data.success;
  }

  async function loadStats() {
    try {
      const [contactsRes, messagesRes] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/messages?limit=1000"),
      ]);
      const contacts = await contactsRes.json();
      const messages = await messagesRes.json();

      if (contacts.success && messages.success) {
        const msgs = messages.messages || [];
        setStats({
          totalContacts: contacts.contacts?.length || 0,
          totalMessages: msgs.length,
          incoming: msgs.filter((m: { direction: string }) => m.direction === "incoming").length,
          outgoing: msgs.filter((m: { direction: string }) => m.direction === "outgoing").length,
        });
      }
    } catch {
      // Stats will remain at defaults
    }
    setLoading(false);
  }

  useEffect(() => {
    setupDb().then((ok) => {
      if (ok) loadStats();
      else setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {dbReady === false && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          Database setup failed. Make sure POSTGRES_URL is configured in your environment.
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Contacts" value={stats.totalContacts} color="blue" />
            <StatCard title="Messages Sent" value={stats.outgoing} color="green" />
            <StatCard title="Messages Received" value={stats.incoming} color="yellow" />
            <StatCard title="Total Messages" value={stats.totalMessages} color="gray" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <a href="/send" className="block w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 transition-colors">
                  Send a WhatsApp Message
                </a>
                <a href="/contacts" className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors">
                  View Contacts
                </a>
                <a href="/campaigns" className="block w-full text-left px-4 py-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-yellow-700 transition-colors">
                  Start a Campaign
                </a>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">System Status</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Database</span>
                  <span className={dbReady ? "text-green-600" : "text-red-600"}>
                    {dbReady ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">WAsenderAPI</span>
                  <span className="text-green-600">Configured</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Webhook Endpoint</span>
                  <span className="text-green-600 font-mono text-xs">/api/webhook</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
