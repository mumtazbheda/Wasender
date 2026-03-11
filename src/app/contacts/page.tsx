'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';

interface Contact {
  rowIndex: number;
  unitNumber: string;
  ownerName: string;
  phone: string;
  mobile2: string;
  mobile3: string;
  ahmedFeedback1: string;
  ahmedFeedback2: string;
  ahmedFeedback3: string;
}

interface FilterOption {
  [key: string]: Set<string>;
}

export default function ContactsPage() {
  const { data: session, status } = useSession();
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('Time 1 New');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setsyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [filterOptions, setFilterOptions] = useState<FilterOption>({});
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch sheet tabs
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchSheetTabs();
    }
  }, [status, session]);

  const fetchSheetTabs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sheet-tabs');
      const data = await res.json();
      if (data.success) {
        setSheets(data.tabs);
        if (data.tabs.includes('Time 1 New')) {
          setSelectedSheet('Time 1 New');
          fetchContacts('Time 1 New');
        }
      }
    } catch (err) {
      setError('Failed to fetch sheets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async (sheetTab: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sheet-data?tab=${encodeURIComponent(sheetTab)}`);
      const data = await res.json();
      if (data.success) {
        setContacts(data.rows);
        buildFilterOptions(data.rows);
        applyFilters(data.rows, filters, searchQuery);
      } else {
        setError(data.error || 'Failed to load contacts');
      }
    } catch (err) {
      setError('Failed to fetch contacts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buildFilterOptions = (rows: Contact[]) => {
    const options: FilterOption = {
      ahmedFeedback1: new Set(),
      ahmedFeedback2: new Set(),
      ahmedFeedback3: new Set(),
    };

    rows.forEach((row) => {
      if (row.ahmedFeedback1) options.ahmedFeedback1.add(row.ahmedFeedback1);
      if (row.ahmedFeedback2) options.ahmedFeedback2.add(row.ahmedFeedback2);
      if (row.ahmedFeedback3) options.ahmedFeedback3.add(row.ahmedFeedback3);
    });

    setFilterOptions(options);
  };

  const applyFilters = (allContacts: Contact[], activeFilters: Record<string, string[]>, search: string) => {
    let filtered = allContacts;

    // Apply text search
    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter((contact) => {
        const phoneMatch = contact.phone.includes(query) || contact.mobile2.includes(query) || contact.mobile3.includes(query);
        const unitMatch = contact.unitNumber.toLowerCase().includes(query);
        const nameMatch = contact.ownerName.toLowerCase().includes(query);
        return phoneMatch || unitMatch || nameMatch;
      });
    }

    // Apply feedback filters
    Object.entries(activeFilters).forEach(([filterKey, filterValues]) => {
      if (filterValues.length > 0) {
        filtered = filtered.filter((contact) => {
          const contactValue = contact[filterKey as keyof Contact];
          return filterValues.includes(contactValue as string);
        });
      }
    });

    setFilteredContacts(filtered);
  };

  const handleFilterChange = (filterKey: string, value: string) => {
    const newFilters = { ...filters };
    if (!newFilters[filterKey]) newFilters[filterKey] = [];

    if (newFilters[filterKey].includes(value)) {
      newFilters[filterKey] = newFilters[filterKey].filter((v) => v !== value);
    } else {
      newFilters[filterKey].push(value);
    }

    setFilters(newFilters);
    applyFilters(contacts, newFilters, searchQuery);
  };

  const handleSync = async () => {
    try {
      setsyncing(true);
      const res = await fetch('/api/sync-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetTab: selectedSheet }),
      });
      const data = await res.json();
      if (data.success) {
        setError(null);
        fetchContacts(selectedSheet);
        alert(data.message);
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err) {
      setError('Failed to sync');
      console.error(err);
    } finally {
      setsyncing(false);
    }
  };

  const handleSheetChange = (newSheet: string) => {
    setSelectedSheet(newSheet);
    setFilters({});
    setSearchQuery('');
    fetchContacts(newSheet);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(contacts, filters, query);
  };

  // WhatsApp link generator
  const getWhatsAppLink = (phone: string) => {
    if (!phone) return '#';
    return `https://wa.me/${phone}`;
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 text-green-500 mx-auto mb-4 text-4xl">💬</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">WhatsApp Contacts</h1>
          <p className="text-gray-600 mb-6">Connect your Google account to manage contacts and send messages</p>
          <button
            onClick={() => signIn('google', { callbackUrl: '/contacts' })}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition duration-200"
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">WhatsApp Contacts</h1>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleSync}
                disabled={syncing || loading}
                className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                <span className={`text-lg ${syncing ? 'animate-spin inline-block' : ''}`}>🔄</span>
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
              {status === 'authenticated' && (
                <button className="flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200">
                  ✓ Connected
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sheet Selector & Error */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <span className="text-xl text-red-500 flex-shrink-0">⚠️</span>
            <div>
              <p className="text-red-700 font-semibold">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Sheet Dropdown */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Table</label>
          <div className="relative">
            <select
              value={selectedSheet}
              onChange={(e) => handleSheetChange(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg py-3 px-4 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {sheets.map((sheet) => (
                <option key={sheet} value={sheet}>
                  {sheet}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by phone, unit, or name..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Object.entries(filterOptions).map(([filterKey, values]) => (
            <div key={filterKey} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedFilters({ ...expandedFilters, [filterKey]: !expandedFilters[filterKey] })}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <span className="font-semibold text-gray-700 text-sm">
                  {filterKey === 'ahmedFeedback1' && 'Ahmed Feedback 1'}
                  {filterKey === 'ahmedFeedback2' && 'Ahmed Feedback 2'}
                  {filterKey === 'ahmedFeedback3' && 'Ahmed Feedback 3'}
                </span>
                <span className={`text-lg transition inline-block ${expandedFilters[filterKey] ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {expandedFilters[filterKey] && (
                <div className="border-t border-gray-200 p-4 space-y-2 max-h-48 overflow-y-auto">
                  {Array.from(values)
                    .sort()
                    .map((value) => (
                      <label key={value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters[filterKey]?.includes(value) || false}
                          onChange={() => handleFilterChange(filterKey, value)}
                          className="w-4 h-4 text-green-500 rounded"
                        />
                        <span className="text-sm text-gray-700">{value}</span>
                      </label>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600 mb-4">
          Showing <span className="font-semibold">{filteredContacts.length}</span> of{' '}
          <span className="font-semibold">{contacts.length}</span> contacts
        </div>

        {/* Contacts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading contacts...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl text-gray-300 mx-auto mb-4">💬</div>
            <p className="text-gray-600 text-lg">No contacts found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact.rowIndex}
                onClick={() => setSelectedContact(contact)}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg hover:border-green-300 cursor-pointer transition duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Unit</p>
                    <p className="text-lg font-bold text-gray-900">{contact.unitNumber || 'N/A'}</p>
                  </div>
                  <span className="text-xl text-green-500">📍</span>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{contact.ownerName}</p>

                <a
                  href={getWhatsAppLink(contact.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold text-sm mb-3"
                >
                  <span>📞</span>
                  {contact.phone}
                </a>

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-semibold mb-1">Status</p>
                  <p className="text-sm text-gray-700">
                    {contact.ahmedFeedback1 || 'No feedback'}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedContact(contact)}
                  className="w-full mt-4 bg-green-50 hover:bg-green-100 text-green-700 font-semibold py-2 rounded-lg transition duration-200"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-lg sm:rounded-lg w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-5 sm:scale-in">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Unit</p>
                <h2 className="text-2xl font-bold">{selectedContact.unitNumber}</h2>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition text-xl"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Owner Info */}
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Owner</p>
                <p className="text-lg font-semibold text-gray-900">{selectedContact.ownerName}</p>
              </div>

              {/* Phone Numbers */}
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase mb-3">Contact Numbers</p>
                <div className="space-y-2">
                  {selectedContact.phone && (
                    <a
                      href={getWhatsAppLink(selectedContact.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
                    >
                      <span className="text-sm font-semibold text-gray-700">Primary</span>
                      <div className="text-right">
                        <p className="font-mono text-green-600 font-semibold">{selectedContact.phone}</p>
                      </div>
                    </a>
                  )}
                  {selectedContact.mobile2 && (
                    <a
                      href={getWhatsAppLink(selectedContact.mobile2)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                    >
                      <span className="text-sm font-semibold text-gray-700">Secondary</span>
                      <div className="text-right">
                        <p className="font-mono text-gray-600 font-semibold">{selectedContact.mobile2}</p>
                      </div>
                    </a>
                  )}
                  {selectedContact.mobile3 && (
                    <a
                      href={getWhatsAppLink(selectedContact.mobile3)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                    >
                      <span className="text-sm font-semibold text-gray-700">Tertiary</span>
                      <div className="text-right">
                        <p className="font-mono text-gray-600 font-semibold">{selectedContact.mobile3}</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>

              {/* Feedback Info */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {selectedContact.ahmedFeedback1 && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Ahmed Feedback 1</p>
                    <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded">{selectedContact.ahmedFeedback1}</p>
                  </div>
                )}
                {selectedContact.ahmedFeedback2 && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Ahmed Feedback 2</p>
                    <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded">{selectedContact.ahmedFeedback2}</p>
                  </div>
                )}
                {selectedContact.ahmedFeedback3 && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Ahmed Feedback 3</p>
                    <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded">{selectedContact.ahmedFeedback3}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <a
                  href={getWhatsAppLink(selectedContact.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition duration-200"
                >
                  <span className="text-lg">💬</span>
                  Open in WhatsApp
                </a>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
