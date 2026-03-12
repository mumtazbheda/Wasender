"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalContacts: number;
  totalMessages: number;
  incoming: number;
  outgoing: number;
  activeAccounts: number;
  totalCampaigns: number;
  campaignMessagesSent: number;
  campaignMessagesFailed: number;
}

function StatCard({
  title,
  value,
  emoji,
  color,
}: {
  title: string;
  value: number;
  emoji: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    yellow: "bg-yellow-50 border-yellow-200",
    gray: "bg-gray-50 border-gray-200",
    purple: "bg-purple-50 border-purple-200",
    red: "bg-red-50 border-red-200",
    indigo: "bg-indigo-50 border-indigo-200",
  };
  const textMap: Record<string, string> = {
    blue: "text-blue-700",
    green: "text-green-700",
    yellow: "text-yellow-700",
    gray: "text-gray-700",
    purple: "text-purple-700",
    red: "text-red-700",
    indigo: "text-indigo-700",
  };

  return (
    <div
      className={`rounded-xl border-2 p-5 sm:p-6 ${colorMap[color] || colorMap.gray} ${
        textMap[color] || textMap.gray
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl sm:text-3xl">{emoji}</span>
        <span className="text-2xl sm:text-3xl font-bold">{value.toLocaleString()}</span>
      </div>
      <p className="text-sm font-medium opacity-80">{title}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalContacts: 0,
    totalMessages: 0,
    incoming: 0,
    outgoing: 0,
    activeAccounts: 0,
    totalCampaigns: 0,
    campaignMessagesSent: 0,
    campaignMessagesFailed: 0,
  });
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  async function setupDb() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch("/api/setup-db", {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      setDbReady(data.success);
      return data.success;
    } catch (error) {
      console.warn("Database setup timeout or failed, loading with available data", error);
      setDbReady(false);
      return false;
    }
  }

  async function loadStats() {
    const newStats: Stats = {
      totalContacts: 0,
      totalMessages: 0,
      incoming: 0,
      outgoing: 0,
      activeAccounts: 0,
      totalCampaigns: 0,
      campaignMessagesSent: 0,
      campaignMessagesFailed: 0,
    };

    // Try loading contacts count from localStorage cache first
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith("wasender_cache_") && !key.endsWith("_time")) {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              newStats.totalContacts = Math.max(newStats.totalContacts, parsed.length);
            }
          }
        }
      }
    } catch {
      // localStorage not available
    }

    // Fetch all stats in parallel, handle each independently
    const [contactsRes, messagesRes, accountsRes, campaignsRes] = await Promise.allSettled([
      fetch("/api/contacts"),
      fetch("/api/messages?limit=1000"),
      fetch("/api/accounts"),
      fetch("/api/send-campaign"),
    ]);

    // Contacts from DB
    try {
      if (contactsRes.status === "fulfilled" && contactsRes.value.ok) {
        const data = await contactsRes.value.json();
        if (data.success) {
          newStats.totalContacts = Math.max(
            newStats.totalContacts,
            data.contacts?.length || 0
          );
        }
      }
    } catch {}

    // Messages
    try {
      if (messagesRes.status === "fulfilled" && messagesRes.value.ok) {
        const data = await messagesRes.value.json();
        if (data.success) {
          const msgs = data.messages || [];
          newStats.totalMessages = msgs.length;
          newStats.incoming = msgs.filter(
            (m: { direction: string }) => m.direction === "incoming"
          ).length;
          newStats.outgoing = msgs.filter(
            (m: { direction: string }) => m.direction === "outgoing"
          ).length;
        }
      }
    } catch {}

    // Accounts
    try {
      if (accountsRes.status === "fulfilled" && accountsRes.value.ok) {
        const data = await accountsRes.value.json();
        const accs = data.accounts || [];
        newStats.activeAccounts = accs.filter(
          (a: { status: string }) => a.status === "active"
        ).length;
      }
    } catch {}

    // Campaigns
    try {
      if (campaignsRes.status === "fulfilled" && campaignsRes.value.ok) {
        const data = await campaignsRes.value.json();
        const campaigns = data.campaigns || [];
        newStats.totalCampaigns = campaigns.length;
        for (const c of campaigns) {
          newStats.campaignMessagesSent += c.sentCount || 0;
          newStats.campaignMessagesFailed += c.failedCount || 0;
        }
      }
    } catch {}

    setStats(newStats);
    setLoading(false);
  }

  useEffect(() => {
    setupDb().then(() => {
      loadStats();
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Dashboard</h1>
        <p className="text-gray-600 mb-6">Overview of your WhatsApp automation platform</p>

        {dbReady === false && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-sm">
            ⚠️ Database setup failed. Make sure POSTGRES_URL is configured in your environment.
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-4xl mb-4">⏳</p>
            <p className="text-gray-500 text-lg">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Primary Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Total Contacts"
                value={stats.totalContacts}
                emoji="👥"
                color="blue"
              />
              <StatCard
                title="Active Accounts"
                value={stats.activeAccounts}
                emoji="📱"
                color="green"
              />
              <StatCard
                title="Campaigns Run"
                value={stats.totalCampaigns}
                emoji="🚀"
                color="purple"
              />
              <StatCard
                title="Messages Sent"
                value={stats.outgoing}
                emoji="📤"
                color="indigo"
              />
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Messages Received"
                value={stats.incoming}
                emoji="📥"
                color="yellow"
              />
              <StatCard
                title="Total Messages"
                value={stats.totalMessages}
                emoji="💬"
                color="gray"
              />
              <StatCard
                title="Campaign Msgs Sent"
                value={stats.campaignMessagesSent}
                emoji="✅"
                color="green"
              />
              <StatCard
                title="Campaign Msgs Failed"
                value={stats.campaignMessagesFailed}
                emoji="❌"
                color="red"
              />
            </div>

            {/* Bottom Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl border shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">⚡ Quick Actions</h2>
                <div className="space-y-3">
                  <a
                    href="/contacts"
                    className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors font-medium"
                  >
                    👥 View Contacts
                  </a>
                  <a
                    href="/campaigns"
                    className="block w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 transition-colors font-medium"
                  >
                    🚀 Start a Campaign
                  </a>
                  <a
                    href="/accounts"
                    className="block w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 transition-colors font-medium"
                  >
                    📱 Manage Accounts
                  </a>
                  <a
                    href="/templates"
                    className="block w-full text-left px-4 py-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-yellow-700 transition-colors font-medium"
                  >
                    📝 Message Templates
                  </a>
                  <a
                    href="/send-message"
                    className="block w-full text-left px-4 py-3 bg-teal-50 hover:bg-teal-100 rounded-lg text-teal-700 transition-colors font-medium"
                  >
                    💬 Send a Message
                  </a>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white rounded-xl border shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">🔧 System Status</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Database</span>
                    <span
                      className={`font-semibold ${
                        dbReady ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {dbReady ? "🟢 Connected" : "🔴 Disconnected"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">WhatsApp API</span>
                    <span className="text-green-600 font-semibold">🟢 Configured</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Active Accounts</span>
                    <span
                      className={`font-semibold ${
                        stats.activeAccounts > 0 ? "text-green-600" : "text-yellow-600"
                      }`}
                    >
                      {stats.activeAccounts > 0
                        ? `🟢 ${stats.activeAccounts} active`
                        : "⚠️ None configured"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Webhook Endpoint</span>
                    <span className="text-green-600 font-mono text-xs font-semibold">
                      /api/webhook
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
