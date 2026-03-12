'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  phone: string;
  accessToken: string;
  businessAccountId: string;
  phoneNumberId: string;
  status: 'active' | 'inactive' | 'pending';
  connectedAt: string;
}

interface FormData {
  name: string;
  phone: string;
  accessToken: string;
  businessAccountId: string;
  phoneNumberId: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    accessToken: '',
    businessAccountId: '',
    phoneNumberId: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load accounts
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/accounts/${editingId}` : '/api/accounts';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMessage(
          editingId ? '✅ Account updated successfully!' : '✅ Account added successfully!'
        );
        setFormData({
          name: '',
          phone: '',
          accessToken: '',
          businessAccountId: '',
          phoneNumberId: '',
        });
        setEditingId(null);
        setShowForm(false);
        loadAccounts();
      } else {
        const error = await res.json();
        setMessage(`❌ Error: ${error.message}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account: Account) => {
    setFormData({
      name: account.name,
      phone: account.phone,
      accessToken: account.accessToken,
      businessAccountId: account.businessAccountId,
      phoneNumberId: account.phoneNumberId,
    });
    setEditingId(account.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('✅ Account deleted successfully!');
        loadAccounts();
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      phone: '',
      accessToken: '',
      businessAccountId: '',
      phoneNumberId: '',
    });
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📱 WhatsApp Accounts</h1>
          <p className="text-gray-600">Manage your connected WhatsApp accounts for sending campaigns</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅')
              ? 'bg-green-100 border border-green-300 text-green-800'
              : 'bg-red-100 border border-red-300 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accounts List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Connected Accounts</h2>
                {!showForm && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <Plus size={20} />
                    Add Account
                  </button>
                )}
              </div>

              {accounts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No accounts connected yet</p>
                  <p className="text-sm">Click "Add Account" to connect a WhatsApp account</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accounts.map(account => (
                    <div
                      key={account.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{account.name}</h3>
                          <p className="text-gray-600 text-sm">📱 {account.phone}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                account.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : account.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {account.status === 'active'
                                ? '✓ Active'
                                : account.status === 'pending'
                                ? '⏳ Pending'
                                : '✗ Inactive'}
                            </span>
                            <span className="text-xs text-gray-500">
                              Connected {new Date(account.connectedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(account)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                            title="Edit account"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(account.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Delete account"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          {showForm && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
                <h2 className="text-xl font-bold mb-4">
                  {editingId ? '✏️ Edit Account' : '➕ Add New Account'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Account Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Ahmed Account"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Phone Number *</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g., +971501234567"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Access Token *</label>
                    <input
                      type="password"
                      name="accessToken"
                      value={formData.accessToken}
                      onChange={handleInputChange}
                      placeholder="WhatsApp API token"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Business Account ID *</label>
                    <input
                      type="text"
                      name="businessAccountId"
                      value={formData.businessAccountId}
                      onChange={handleInputChange}
                      placeholder="Your WhatsApp Business ID"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Phone Number ID *</label>
                    <input
                      type="text"
                      name="phoneNumberId"
                      value={formData.phoneNumberId}
                      onChange={handleInputChange}
                      placeholder="Your WhatsApp Phone Number ID"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                    <strong>ℹ️ Need help?</strong>
                    <p className="mt-1">
                      Get these credentials from your WhatsApp Business API setup in Meta Business Manager.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-semibold"
                    >
                      {loading ? 'Saving...' : editingId ? 'Update' : 'Add Account'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
