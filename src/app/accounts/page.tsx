"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Account {
  id: number;
  name: string;
  phone: string;
  api_key: string;
  account_type: string;
  business_account_id: string;
  phone_number_id: string;
  status: string;
  connected_at: string;
}

export default function AccountsPage() {
  const { data: session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formType, setFormType] = useState("wasender");
  const [formBusinessId, setFormBusinessId] = useState("");
  const [formPhoneNumberId, setFormPhoneNumberId] = useState("");
  const [saving, setSaving] = useState(false);

  // Load accounts from API
  const loadAccounts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (res.ok) {
        const mapped = (data.accounts || []).map((a: any) => ({
          id: a.id,
          name: a.name || "",
          phone: a.phone || "",
          api_key: a.accessToken || a.api_key || "",
          account_type: a.account_type || a.accountType || "wasender",
          business_account_id: a.businessAccountId || a.business_account_id || "",
          phone_number_id: a.phoneNumberId || a.phone_number_id || "",
          status: a.status || "active",
          connected_at: a.connectedAt || a.connected_at || new Date().toISOString(),
        }));
        setAccounts(mapped);
      } else {
        setError(data.message || "Failed to load accounts");
      }
    } catch (err) {
      setError("Error loading accounts: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) loadAccounts();
  }, [session]);

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormApiKey("");
    setFormType("wasender");
    setFormBusinessId("");
    setFormPhoneNumberId("");
  };

  const openAddForm = () => {
    resetForm();
    setEditingId(null);
    setShowForm(true);
    setError("");
  };

  const openEditForm = (account: Account) => {
    setFormName(account.name);
    setFormPhone(account.phone);
    setFormApiKey(account.api_key);
    setFormType(account.account_type);
    setFormBusinessId(account.business_account_id);
    setFormPhoneNumberId(account.phone_number_id);
    setEditingId(account.id);
    setShowForm(true);
    setError("");
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
    setEditingId(null);
  };

  const saveAccount = async () => {
    if (!formName || !formPhone || !formApiKey) {
      setError("Name, Phone, and API Key are required");
      return;
    }
    if (formType === "whatsapp_business" && (!formBusinessId || !formPhoneNumberId)) {
      setError("Business Account ID and Phone Number ID are required for WhatsApp Business");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMsg("");

    const payload = {
      name: formName,
      phone: formPhone,
      accessToken: formApiKey,
      account_type: formType,
      businessAccountId: formType === "whatsapp_business" ? formBusinessId : "N/A",
      phoneNumberId: formType === "whatsapp_business" ? formPhoneNumberId : "N/A",
    };

    try {
      if (editingId !== null) {
        // Try PUT for update
        const res = await fetch("/api/accounts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        if (res.ok) {
          setSuccessMsg("✅ Account updated successfully!");
          closeForm();
          loadAccounts();
        } else {
          // Fallback: if PUT not supported, delete + recreate
          const delRes = await fetch("/api/accounts", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId }),
          });
          if (delRes.ok) {
            const createRes = await fetch("/api/accounts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (createRes.ok) {
              setSuccessMsg("✅ Account updated successfully!");
              closeForm();
              loadAccounts();
            } else {
              setError("Failed to update account");
            }
          } else {
            setError("Failed to update account. Try deleting and re-adding.");
          }
        }
      } else {
        // Create new
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMsg("✅ Account added successfully!");
          closeForm();
          loadAccounts();
        } else {
          setError(data.message || "Failed to add account");
        }
      }
    } catch (err) {
      setError("Error saving account: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (id: number) => {
    try {
      const res = await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setSuccessMsg("✅ Account deleted successfully!");
        setDeleteConfirmId(null);
        loadAccounts();
      } else {
        setError("Failed to delete account");
      }
    } catch {
      setError("Error deleting account");
    }
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return "••••••••";
    return key.substring(0, 4) + "••••••••" + key.substring(key.length - 4);
  };

  if (!session) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <p className="text-gray-500 text-lg">Please sign in to manage accounts.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📱 WhatsApp Accounts</h1>
            <p className="text-gray-600 mt-1">Manage your connected WhatsApp accounts</p>
          </div>
          <button
            onClick={openAddForm}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium shadow-md"
          >
            ➕ Add Account
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-4 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-4 font-bold text-red-600 hover:text-red-800">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-4 text-sm flex justify-between items-center">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg("")} className="ml-4 font-bold text-green-600 hover:text-green-800">✕</button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-4xl mb-4">⏳</p>
            <p className="text-gray-500 text-lg">Loading accounts...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && accounts.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-6xl mb-4">📱</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Accounts Connected</h2>
            <p className="text-gray-600 mb-6">Add your first WhatsApp account to get started sending messages</p>
            <button
              onClick={openAddForm}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium shadow-md"
            >
              ➕ Add Your First Account
            </button>
          </div>
        )}

        {/* Accounts List */}
        {!loading && accounts.length > 0 && (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-blue-500 hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  {/* Account Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{account.name}</h3>
                      <p className="text-gray-600 text-sm mt-1">📞 {account.phone}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        account.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {account.status === "active" ? "🟢 Active" : "⚪ Inactive"}
                    </span>
                  </div>

                  {/* Account Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 font-medium block mb-1">API Key</span>
                      <p className="text-gray-900 font-mono bg-gray-50 px-3 py-1.5 rounded">{maskApiKey(account.api_key)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium block mb-1">Account Type</span>
                      <p className="text-gray-900">
                        {account.account_type === "whatsapp_business"
                          ? "📘 WhatsApp Business API"
                          : "📗 WAsender API"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium block mb-1">Connected</span>
                      <p className="text-gray-900">
                        📅 {account.connected_at ? new Date(account.connected_at).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    {account.account_type === "whatsapp_business" && (
                      <>
                        <div>
                          <span className="text-gray-500 font-medium block mb-1">Business Account ID</span>
                          <p className="text-gray-900 font-mono text-xs bg-gray-50 px-3 py-1.5 rounded truncate">
                            {account.business_account_id && account.business_account_id !== "N/A"
                              ? account.business_account_id
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium block mb-1">Phone Number ID</span>
                          <p className="text-gray-900 font-mono text-xs bg-gray-50 px-3 py-1.5 rounded truncate">
                            {account.phone_number_id && account.phone_number_id !== "N/A"
                              ? account.phone_number_id
                              : "—"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-5 pt-4 border-t">
                    <button
                      onClick={() => openEditForm(account)}
                      className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition text-sm font-medium"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(account.id)}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition text-sm font-medium"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">⚠️ Delete Account?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this account? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteAccount(deleteConfirmId)}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  {editingId !== null ? "✏️ Edit Account" : "➕ Add Account"}
                </h2>
                <button
                  onClick={closeForm}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Account Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="wasender">📗 WAsender (wasenderapi.com)</option>
                    <option value="whatsapp_business">📘 WhatsApp Business (Meta Graph API)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {formType === "wasender"
                      ? "Uses wasenderapi.com. Only needs API Key."
                      : "Uses Meta Graph API. Needs Access Token + Business Account ID + Phone Number ID."}
                  </p>
                </div>

                {/* Account Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. My Business Account"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +971501234567"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formType === "whatsapp_business" ? "Access Token" : "API Key"}
                  </label>
                  <input
                    type="password"
                    value={formApiKey}
                    onChange={(e) => setFormApiKey(e.target.value)}
                    placeholder={
                      formType === "whatsapp_business"
                        ? "Enter Meta Access Token"
                        : "Enter WAsender API Key"
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* WhatsApp Business Fields */}
                {formType === "whatsapp_business" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Account ID
                      </label>
                      <input
                        type="text"
                        value={formBusinessId}
                        onChange={(e) => setFormBusinessId(e.target.value)}
                        placeholder="Enter Business Account ID"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number ID
                      </label>
                      <input
                        type="text"
                        value={formPhoneNumberId}
                        onChange={(e) => setFormPhoneNumberId(e.target.value)}
                        placeholder="Enter Phone Number ID"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 p-6 border-t flex gap-3">
                <button
                  onClick={closeForm}
                  className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAccount}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Update Account"
                    : "Add Account"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
