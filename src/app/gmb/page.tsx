"use client";

import { useState, useEffect, useCallback } from "react";

interface GmbContact {
  id: number;
  file_name: string;
  business_name: string;
  phone: string;
  category: string;
  address: string;
  city: string;
  rating: string;
  reviews: string;
  website: string;
  whatsapp_status: "not_sent" | "sent" | "failed" | "invalid";
  sent_at: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  not_sent: number;
  sent: number;
  failed: number;
  invalid: number;
}

interface FilterOption {
  category?: string;
  count: number;
  city?: string;
  file_name?: string;
}

export default function GmbPage() {
  const [contacts, setContacts] = useState<GmbContact[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, not_sent: 0, sent: 0, failed: 0, invalid: 0 });
  const [files, setFiles] = useState<FilterOption[]>([]);
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [cities, setCities] = useState<FilterOption[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterFile, setFilterFile] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterCategory) params.set("category", filterCategory);
    if (filterCity) params.set("city", filterCity);
    if (filterFile) params.set("file", filterFile);
    if (search) params.set("search", search);
    params.set("limit", pageSize.toString());
    params.set("offset", (page * pageSize).toString());

    const res = await fetch(`/api/gmb-contacts?${params.toString()}`);
    const data = await res.json();
    if (data.success) {
      setContacts(data.contacts);
      setStats(data.stats);
      setFiles(data.files);
      setCategories(data.categories);
      setCities(data.cities);
      setTotalCount(data.totalCount);
    }
    setLoading(false);
  }, [filterStatus, filterCategory, filterCity, filterFile, search, page]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("csvFile") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/gmb-upload", { method: "POST", body: formData });
    const data = await res.json();

    if (data.success) {
      setUploadResult({
        success: true,
        message: `Uploaded ${data.inserted} contacts (${data.skipped} skipped, no phone). File: ${file.name}`,
      });
      form.reset();
      setPage(0);
      loadContacts();
    } else {
      setUploadResult({ success: false, message: data.error });
    }
    setUploading(false);
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllOnPage() {
    setSelectedIds(new Set(contacts.map((c) => c.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  async function updateStatus(status: string) {
    if (selectedIds.size === 0) return;
    await fetch("/api/gmb-update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds), whatsapp_status: status }),
    });
    setSelectedIds(new Set());
    loadContacts();
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    await fetch("/api/gmb-contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    setSelectedIds(new Set());
    loadContacts();
  }

  async function deleteByFile(fileName: string) {
    await fetch("/api/gmb-contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteAll: true, fileName }),
    });
    setFilterFile("");
    loadContacts();
  }

  const statusColors: Record<string, string> = {
    not_sent: "bg-gray-100 text-gray-700",
    sent: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    invalid: "bg-yellow-100 text-yellow-700",
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Google My Business</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-gray-600">{stats.not_sent}</p>
          <p className="text-xs text-gray-500">Not Sent</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
          <p className="text-xs text-gray-500">Sent</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          <p className="text-xs text-gray-500">Failed</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.invalid}</p>
          <p className="text-xs text-gray-500">Invalid</p>
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Upload CSV File</h2>
        <p className="text-sm text-gray-500 mb-3">
          Upload a CSV file exported from Google Maps. The system will auto-detect columns like phone, business name, category, city, etc.
        </p>
        <form onSubmit={handleUpload} className="flex items-center gap-3">
          <input
            type="file"
            name="csvFile"
            accept=".csv,.txt"
            className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium file:cursor-pointer hover:file:bg-blue-100"
            required
          />
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
        {uploadResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${uploadResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {uploadResult.message}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Filters</h2>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
              className="px-3 py-2 border rounded-lg text-sm bg-white min-w-[130px]"
            >
              <option value="">All</option>
              <option value="not_sent">Not Sent</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="invalid">Invalid</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">File</label>
            <select
              value={filterFile}
              onChange={(e) => { setFilterFile(e.target.value); setPage(0); }}
              className="px-3 py-2 border rounded-lg text-sm bg-white min-w-[150px]"
            >
              <option value="">All Files</option>
              {files.map((f) => (
                <option key={f.file_name} value={f.file_name}>
                  {f.file_name} ({f.count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(0); }}
              className="px-3 py-2 border rounded-lg text-sm bg-white min-w-[150px]"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category} ({c.count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">City</label>
            <select
              value={filterCity}
              onChange={(e) => { setFilterCity(e.target.value); setPage(0); }}
              className="px-3 py-2 border rounded-lg text-sm bg-white min-w-[150px]"
            >
              <option value="">All Cities</option>
              {cities.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city} ({c.count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Name or phone..."
              className="px-3 py-2 border rounded-lg text-sm min-w-[180px]"
            />
          </div>
        </div>
        {filterFile && (
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm text-gray-500">File: {filterFile}</span>
            <button
              onClick={() => deleteByFile(filterFile)}
              className="text-xs text-red-600 hover:text-red-700 underline"
            >
              Delete all from this file
            </button>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-blue-700">{selectedIds.size} selected</span>
          <button
            onClick={() => updateStatus("sent")}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
          >
            Mark Sent
          </button>
          <button
            onClick={() => updateStatus("not_sent")}
            className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-xs font-medium hover:bg-gray-700"
          >
            Mark Not Sent
          </button>
          <button
            onClick={() => updateStatus("invalid")}
            className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-xs font-medium hover:bg-yellow-700"
          >
            Mark Invalid
          </button>
          <button
            onClick={deleteSelected}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
          >
            Delete
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1.5 bg-white text-gray-600 border rounded-lg text-xs font-medium hover:bg-gray-50"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border overflow-hidden mb-4">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No contacts found. Upload a CSV file to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === contacts.length && contacts.length > 0}
                      onChange={() => {
                        if (selectedIds.size === contacts.length) deselectAll();
                        else selectAllOnPage();
                      }}
                    />
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Business Name</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Category</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">City</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Rating</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">File</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contacts.map((c) => (
                  <tr key={c.id} className={`hover:bg-gray-50 ${selectedIds.has(c.id) ? "bg-blue-50" : ""}`}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium max-w-[200px] truncate">{c.business_name || "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{c.phone}</td>
                    <td className="px-3 py-2 text-xs max-w-[150px] truncate">{c.category || "-"}</td>
                    <td className="px-3 py-2 text-xs">{c.city || "-"}</td>
                    <td className="px-3 py-2 text-xs">{c.rating || "-"}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.whatsapp_status]}`}>
                        {c.whatsapp_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 max-w-[120px] truncate">{c.file_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
          <span>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 border rounded-lg disabled:opacity-30 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 border rounded-lg disabled:opacity-30 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
