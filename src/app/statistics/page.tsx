"use client";

import { useEffect, useState } from "react";

interface Contact {
  rowIndex: number;
  unit: string;
  listing_status: string;
  rental_contract_status: string;
  rent_end_date: string;
  bayut_rent: string;
  bayut_sale: string;
  pf_rent: string;
  pf_sale: string;
  [key: string]: any;
}

interface SavedSheet {
  sheet_name: string;
  contact_count: number;
  synced_at: string;
}

interface Stats {
  totalUnits: number;

  // Listing status
  listedForSale: number;
  listedForRent: number;

  // Portal breakdown
  bayutSale: number;
  pfSale: number;
  bayutRent: number;
  pfRent: number;

  // Rental contract status
  contractActive: number;
  contractExpired: number;
  contractNotRented: number;
}

function isYes(val: string): boolean {
  return (val || "").toString().trim().toLowerCase() === "yes";
}

function computeStats(contacts: Contact[]): Stats {
  let listedForSale = 0;
  let listedForRent = 0;
  let bayutSale = 0;
  let pfSale = 0;
  let bayutRent = 0;
  let pfRent = 0;
  let contractActive = 0;
  let contractExpired = 0;
  let contractNotRented = 0;

  for (const c of contacts) {
    const ls = (c.listing_status || "").toLowerCase();
    if (ls.includes("sale")) listedForSale++;
    if (ls.includes("rent")) listedForRent++;

    if (isYes(c.bayut_sale)) bayutSale++;
    if (isYes(c.pf_sale)) pfSale++;
    if (isYes(c.bayut_rent)) bayutRent++;
    if (isYes(c.pf_rent)) pfRent++;

    const rcs = (c.rental_contract_status || "").toLowerCase().trim();
    if (rcs === "active") contractActive++;
    else if (rcs === "expired") contractExpired++;
    else if (rcs === "not rented" || rcs === "not_rented") contractNotRented++;
  }

  return {
    totalUnits: contacts.length,
    listedForSale,
    listedForRent,
    bayutSale,
    pfSale,
    bayutRent,
    pfRent,
    contractActive,
    contractExpired,
    contractNotRented,
  };
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: number;
  sub?: string;
  color: string;
  icon: string;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-5 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className="text-4xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-500">{value} <span className="text-gray-400">({pct}%)</span></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const [savedSheets, setSavedSheets] = useState<SavedSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [syncedAt, setSyncedAt] = useState("");

  // Load list of saved sheets on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/contacts-cache");
        const data = await res.json();
        if (data.success) setSavedSheets(data.sheets || []);
      } catch {}
    };
    load();
  }, []);

  const loadSheet = async (sheetName: string) => {
    setSelectedSheet(sheetName);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/contacts-cache?sheet=${encodeURIComponent(sheetName)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load data");
        setContacts([]);
      } else {
        setContacts(data.contacts || []);
        setSyncedAt(data.synced_at ? new Date(data.synced_at).toLocaleString() : "");
      }
    } catch (err) {
      setError("Error loading: " + (err instanceof Error ? err.message : "Unknown"));
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = contacts.length > 0 ? computeStats(contacts) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">📈 Statistics</h1>
        <p className="text-gray-500 mb-6">Portfolio analytics from your saved database</p>

        {/* Sheet Selector */}
        <div className="bg-white rounded-xl shadow-md p-5 mb-6">
          {savedSheets.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p className="text-4xl mb-2">📭</p>
              <p className="font-semibold text-gray-700">No saved databases found</p>
              <p className="text-sm mt-1">Go to <a href="/contacts" className="text-blue-600 underline">Contacts</a>, load a sheet, and click <b>"💾 Save to Server DB"</b> first.</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-gray-700 mb-3">Select a saved database:</p>
              <div className="flex flex-wrap gap-2">
                {savedSheets.map((s) => (
                  <button
                    key={s.sheet_name}
                    onClick={() => loadSheet(s.sheet_name)}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition border-2 ${
                      selectedSheet === s.sheet_name
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
                    }`}
                  >
                    {s.sheet_name}
                    <span className="ml-1.5 text-xs opacity-70">({s.contact_count} units)</span>
                  </button>
                ))}
              </div>
              {syncedAt && (
                <p className="text-xs text-gray-400 mt-2">Last synced: {syncedAt}</p>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded-lg text-sm mb-4">{error}</div>
        )}

        {loading && (
          <div className="text-center py-12 text-gray-400 text-lg">Loading statistics...</div>
        )}

        {stats && !loading && (
          <>
            {/* ── Section 1: Overview ─────────────────────────────── */}
            <div className="mb-2">
              <h2 className="text-lg font-bold text-gray-700 mb-3">🏢 Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  label="Total Units"
                  value={stats.totalUnits}
                  sub="All properties in database"
                  color="border-blue-500"
                  icon="🏠"
                />
                <StatCard
                  label="Listed for Sale"
                  value={stats.listedForSale}
                  sub={`${stats.totalUnits > 0 ? Math.round((stats.listedForSale / stats.totalUnits) * 100) : 0}% of total`}
                  color="border-green-500"
                  icon="💰"
                />
                <StatCard
                  label="Listed for Rent"
                  value={stats.listedForRent}
                  sub={`${stats.totalUnits > 0 ? Math.round((stats.listedForRent / stats.totalUnits) * 100) : 0}% of total`}
                  color="border-purple-500"
                  icon="🔑"
                />
              </div>
            </div>

            {/* ── Section 2: Portal Breakdown ─────────────────────── */}
            <div className="bg-white rounded-xl shadow-md p-5 mb-6 mt-6">
              <h2 className="text-lg font-bold text-gray-700 mb-4">🌐 Portal Listings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* For Sale */}
                <div>
                  <p className="text-sm font-bold text-gray-600 mb-3 pb-1 border-b">For Sale</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                      <p className="text-3xl font-bold text-orange-600">{stats.bayutSale}</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">Bayut Sale</p>
                    </div>
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-center">
                      <p className="text-3xl font-bold text-teal-600">{stats.pfSale}</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">Property Finder Sale</p>
                    </div>
                  </div>
                </div>
                {/* For Rent */}
                <div>
                  <p className="text-sm font-bold text-gray-600 mb-3 pb-1 border-b">For Rent</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                      <p className="text-3xl font-bold text-orange-600">{stats.bayutRent}</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">Bayut Rent</p>
                    </div>
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-center">
                      <p className="text-3xl font-bold text-teal-600">{stats.pfRent}</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">Property Finder Rent</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bars */}
              <div className="mt-5 pt-4 border-t">
                <p className="text-xs text-gray-400 mb-3 font-medium">AS % OF TOTAL UNITS ({stats.totalUnits})</p>
                <ProgressBar label="Bayut Sale" value={stats.bayutSale} total={stats.totalUnits} color="bg-orange-400" />
                <ProgressBar label="Property Finder Sale" value={stats.pfSale} total={stats.totalUnits} color="bg-teal-400" />
                <ProgressBar label="Bayut Rent" value={stats.bayutRent} total={stats.totalUnits} color="bg-orange-300" />
                <ProgressBar label="Property Finder Rent" value={stats.pfRent} total={stats.totalUnits} color="bg-teal-300" />
              </div>
            </div>

            {/* ── Section 3: Rental Contract Status ───────────────── */}
            <div className="bg-white rounded-xl shadow-md p-5 mb-6">
              <h2 className="text-lg font-bold text-gray-700 mb-4">📄 Rental Contract Status</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-4xl font-bold text-green-600">{stats.contractActive}</p>
                  <p className="text-sm font-bold text-green-700 mt-1">Active</p>
                  <p className="text-xs text-gray-400 mt-0.5">Contract running</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-4xl font-bold text-red-600">{stats.contractExpired}</p>
                  <p className="text-sm font-bold text-red-700 mt-1">Expired</p>
                  <p className="text-xs text-gray-400 mt-0.5">Contract ended</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-4xl font-bold text-gray-600">{stats.contractNotRented}</p>
                  <p className="text-sm font-bold text-gray-700 mt-1">Not Rented</p>
                  <p className="text-xs text-gray-400 mt-0.5">No contract</p>
                </div>
              </div>

              {/* Visual bar */}
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-3 font-medium">BREAKDOWN</p>
                <ProgressBar label="Active" value={stats.contractActive} total={stats.totalUnits} color="bg-green-500" />
                <ProgressBar label="Expired" value={stats.contractExpired} total={stats.totalUnits} color="bg-red-400" />
                <ProgressBar label="Not Rented" value={stats.contractNotRented} total={stats.totalUnits} color="bg-gray-400" />
              </div>
            </div>

            {/* ── Summary Footer ───────────────────────────────────── */}
            <div className="bg-blue-600 rounded-xl p-5 text-white">
              <p className="text-sm font-bold opacity-80 mb-3">QUICK SUMMARY — {selectedSheet}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold">{stats.totalUnits}</p>
                  <p className="text-xs opacity-70 mt-0.5">Total Units</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.listedForSale + stats.listedForRent}</p>
                  <p className="text-xs opacity-70 mt-0.5">Total Listed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.contractExpired}</p>
                  <p className="text-xs opacity-70 mt-0.5">Expired Contracts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.contractNotRented}</p>
                  <p className="text-xs opacity-70 mt-0.5">Not Rented</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
