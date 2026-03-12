"use client";

import React, { useState, useEffect } from "react";

interface Account {
  id: string;
  name: string;
  phone: string;
  accessToken: string;
  businessAccountId: string;
  phoneNumberId: string;
  status: "active" | "pending" | "inactive";
  connectionDate: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    accessToken: "",
    businessAccountId: "",
    phoneNumberId: "",
  });

  // Load accounts
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts || []);
      } else {
        setError(data.error || "Failed to load accounts");
      }
    } catch (err) {
      setError("Error loading accounts: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.accessToken) {
      setError("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setAccounts([...accounts, data.account]);
        setFormData({
          name: "",
          phone: "",
          accessToken: "",
          businessAccountId: "",
          phoneNumberId: "",
        });
        setShowAddForm(false);
        setError("")
      } else {
        setError(data.error || "Failed to add account");
      }
    } catch (err) {
      setError("Error adding account: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setAccounts(accounts.map((a) => (a.id === editingId ? data.account : a)));
        setEditingId(null);
        setFormData({
          name: "",
          phone: "",
          accessToken: "",
          businessAccountId: "",
          phoneNumberId: "",
        });
        setError("");
      } else {
        setError(data.error || "Failed to update account");
      }
    } catch (err) {
      setError("Error updating account: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAccounts(accounts.filter((a) => a.id !== id));
        setError("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete account");
      }
    } catch (err) {
      setError("Error deleting account: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (account: Account) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      phone: account.phone,
      accessToken: account.accessToken,
      businessAccountId: account.businessAccountId,
      phoneNumberId: account.phoneNumberId,
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      name: "",
      phone: "",
      accessToken: "",
      businessAccountId: "",
      phoneNumberId: "",
    });
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📱 WhatsApp Accounts</h1>
          <p className="text-gray-600">Manage WhatsApp accounts connected to Wasender</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg border border-red-300">
            {error}
          </div>
        )}

        {/* Add Account Button */}
        {!showAddForm && !editingId && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center gap-2"
            >
              ➕ Add New Account
            </button>
          </div>
        )}

        {/* Add/Edit Form */}
        {(showAddForm || editingId) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-blue-600">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {editingId ? "Edit Account" : "Add New WhatsApp Account"}
            </h2>
            <form onSubmit={editingId ? handleUpdateAccount : handleAddAccount}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Ahmed, Zoha"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp Phone Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., +971501234567"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    placeholder="WhatsApp API Access Token"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Account ID
                  </label>
                  <input
                    type="text"
                    value={formData.businessAccountId}
                    onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={formData.phoneNumberId}
                    onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
                >
                  {loading ? "Processing..." : editingId ? "Update Account" : "Add Account"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Accounts List */}
        {accounts.length > 0 && !showAddForm && !editingId && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Connected Accounts ({accounts.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden border-l-4 border-green-500"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
                    <h3 className="text-xl font-bold">{account.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          account.status === "active"
                            ? "bg-green-400"
                            : account.status === "pending"
                            ? "bg-yellow-400"
                            : "bg-red-400"
                        }`}
                      ></span>
                      <span className="text-sm capitalize text-green-100">
                        {account.status}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3">
                    {/* Phone */}
                    <div className="flex items-start gap-3 border-b pb-3">
                      <span className="text-lg">📱</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                        <p className="text-gray-900 font-semibold break-all">{account.phone}</p>
                      </div>
                    </div>

                    {/* Connected Date */}
                    <div className="flex items-start gap-3 border-b pb-3">
                      <span className="text-lg">📅</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">Connected</p>
                        <p className="text-gray-900 font-semibold">
                          {new Date(account.connectionDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Token Info */}
                    <div className="flex items-start gap-3">
                      <span className="text-lg">🔑</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">API Token</p>
                        <p className="text-gray-900 font-mono text-xs break-all">
                          {account.accessToken.substring(0, 20)}...
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="bg-gray-50 px-5 py-3 border-t flex gap-2">
                    <button
                      onClick={() => startEdit(account)}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition font-medium"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition font-medium"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {accounts.length === 0 && !showAddForm && !editingId && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No accounts yet</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first WhatsApp account</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition inline-flex items-center gap-2"
            >
              ➕ Add Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
