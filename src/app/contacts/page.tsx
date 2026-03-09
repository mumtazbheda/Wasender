'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';

interface Contact {
  id: string;
  phone: string;
  name?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  messageCount: number;
  incomingCount: number;
  outgoingCount: number;
}

interface Message {
  id: string;
  phone: string;
  direction: 'incoming' | 'outgoing';
  message: string;
  timestamp: string;
}

export default function ContactsPage() {
  const { data: session } = useSession();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!session) return;
    loadContacts();
  }, [session]);

  async function loadContacts() {
    try {
      setLoading(true);
      const res = await fetch('/api/contacts');
      const data = await res.json();
      if (data.success && data.contacts) {
        setContacts(data.contacts);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.phone.includes(searchTerm) ||
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || getStatus(contact) === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  function getStatus(contact: Contact): string {
    if (contact.messageCount === 0) return 'no_messages';
    if (contact.incomingCount > 0) return 'active';
    return 'sent';
  }

  function getStatusBadge(status: string) {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      no_messages: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'No Messages' },
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sent' },
    };
    return badges[status] || badges.no_messages;
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button
          onClick={() => signIn()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Sign In to View Contacts
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Contacts</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by phone or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="no_messages">No Messages</option>
          <option value="active">Active Discussion</option>
          <option value="sent">Sent Only</option>
        </select>
      </div>

      {/* Contacts Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Phone</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Messages</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Last Message</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Loading contacts...
                </td>
              </tr>
            ) : filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No contacts found
                </td>
              </tr>
            ) : (
              filteredContacts.map((contact) => {
                const status = getStatus(contact);
                const badge = getStatusBadge(status);
                return (
                  <tr
                    key={contact.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedPhone(contact.phone)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{contact.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{contact.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      📥 {contact.incomingCount} | 📤 {contact.outgoingCount}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contact.lastMessage ? contact.lastMessage.substring(0, 30) + '...' : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Contacts Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No contacts found</div>
        ) : (
          filteredContacts.map((contact) => {
            const status = getStatus(contact);
            const badge = getStatusBadge(status);
            return (
              <div
                key={contact.id}
                onClick={() => setSelectedPhone(contact.phone)}
                className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500 cursor-pointer hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{contact.phone}</h3>
                    <p className="text-sm text-gray-600">{contact.name || 'No name'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>📥 {contact.incomingCount}</span>
                  <span>📤 {contact.outgoingCount}</span>
                </div>
                {contact.lastMessage && (
                  <p className="mt-2 text-xs text-gray-500 italic">"{contact.lastMessage.substring(0, 40)}..."</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={loadContacts}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh Contacts
        </button>
      </div>
    </div>
  );
}
