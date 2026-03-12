'use client';

import React, { useState, useEffect } from 'react';

interface Contact {
  unit: string;
  owner1_name: string;
  owner1_mobile: string;
  rooms_en: string;
  actual_area: string;
  unit_balcony_area: string;
  rent_end_date: string;
  listing_status: string;
  rental_contract_status: string;
  [key: string]: any;
}

interface Template {
  id: string;
  name: string;
  body: string;
}

interface Account {
  id: string;
  name: string;
  phone: string;
  status: string;
}

export default function CampaignsPage() {
  const [step, setStep] = useState(1);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<Template[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Step 1 states
  const [sheetName, setSheetName] = useState('Time 1');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    purpose: '',
    rooms: '',
    listingStatus: '',
    rentalStatus: '',
    ahmedFeedback1: '',
    ahmedFeedback2: '',
    ahmedFeedback3: '',
    zohaFeedback1: '',
    zohaFeedback2: '',
    zohaFeedback3: '',
  });
  const [sortBy, setSortBy] = useState('default');

  // Step 2 states
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testSent, setTestSent] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  // Step 3 states
  const [delayBefore, setDelayBefore] = useState('0');
  const [delayBetween, setDelayBetween] = useState('5');
  const [delayUnit, setDelayUnit] = useState('minutes');
  const [randomizeDelay, setRandomizeDelay] = useState(false);

  // Step 4 states
  const [selectedAccount, setSelectedAccount] = useState('');

  // Load contacts from API
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const res = await fetch('/api/sheet-data', {
          method: 'POST',
          body: JSON.stringify({ sheetName }),
        });
        if (res.ok) {
          const data = await res.json();
          const contactsList = data.contacts || [];
          setContacts(contactsList);
          setFilteredContacts(contactsList);
        }
      } catch (error) {
        console.error('Failed to load contacts:', error);
      }
    };

    if (sheetName) {
      loadContacts();
    }
  }, [sheetName]);

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetch('/api/templates');
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };

    loadTemplates();
  }, []);

  // Load accounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await fetch('/api/accounts');
        if (res.ok) {
          const data = await res.json();
          setAccounts(data.accounts || []);
          if (data.accounts?.length > 0) {
            setSelectedAccount(data.accounts[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load accounts:', error);
      }
    };

    loadAccounts();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = contacts.filter(contact => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        contact.unit?.toLowerCase().includes(searchLower) ||
        contact.owner1_name?.toLowerCase().includes(searchLower) ||
        contact.owner1_mobile?.includes(searchTerm);

      const matchesFilters =
        (!filters.purpose || contact.purpose === filters.purpose) &&
        (!filters.rooms || contact.rooms_en === filters.rooms) &&
        (!filters.listingStatus || contact.listing_status === filters.listingStatus) &&
        (!filters.rentalStatus || contact.rental_contract_status === filters.rentalStatus) &&
        (!filters.ahmedFeedback1 || contact.ahmed_feedback_1 === filters.ahmedFeedback1) &&
        (!filters.ahmedFeedback2 || contact.ahmed_feedback_2 === filters.ahmedFeedback2) &&
        (!filters.ahmedFeedback3 || contact.ahmed_feedback_3 === filters.ahmedFeedback3) &&
        (!filters.zohaFeedback1 || contact.zoha_feedback_1 === filters.zohaFeedback1) &&
        (!filters.zohaFeedback2 || contact.zoha_feedback_2 === filters.zohaFeedback2) &&
        (!filters.zohaFeedback3 || contact.zoha_feedback_3 === filters.zohaFeedback3);

      return matchesSearch && matchesFilters;
    });

    // Apply sorting
    if (sortBy === 'urgency-asc') {
      filtered = filtered.sort((a, b) => {
        const daysA = calculateDaysRemaining(a.rent_end_date);
        const daysB = calculateDaysRemaining(b.rent_end_date);
        return daysA - daysB;
      });
    } else if (sortBy === 'urgency-desc') {
      filtered = filtered.sort((a, b) => {
        const daysA = calculateDaysRemaining(a.rent_end_date);
        const daysB = calculateDaysRemaining(b.rent_end_date);
        return daysB - daysA;
      });
    }

    setFilteredContacts(filtered);
  }, [contacts, searchTerm, filters, sortBy]);

  const calculateDaysRemaining = (endDate: string): number => {
    if (!endDate) return Infinity;
    const end = new Date(endDate);
    const today = new Date();
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const toggleContactSelection = (unit: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(unit)) {
      newSelected.delete(unit);
    } else {
      newSelected.add(unit);
    }
    setSelectedContacts(newSelected);
  };

  const selectAll = () => {
    setSelectedContacts(new Set(filteredContacts.map(c => c.unit)));
  };

  const deselectAll = () => {
    setSelectedContacts(new Set());
  };

  const handleSendTest = async () => {
    if (!testPhone || !selectedTemplate) return;

    setTestLoading(true);
    try {
      const template = templates.find(t => t.id === selectedTemplate);
      const firstContact = Array.from(selectedContacts)
        .map(unit => contacts.find(c => c.unit === unit))
        .filter(Boolean)[0];

      if (!template || !firstContact) return;

      const res = await fetch('/api/send-test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          template: template.body,
          contact: firstContact,
          accountId: selectedAccount,
        }),
      });

      if (res.ok) {
        setTestSent(true);
      }
    } catch (error) {
      console.error('Failed to send test message:', error);
    } finally {
      setTestLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    try {
      const selectedContactsList = Array.from(selectedContacts)
        .map(unit => contacts.find(c => c.unit === unit))
        .filter(Boolean);

      const template = templates.find(t => t.id === selectedTemplate);

      if (!template || selectedContactsList.length === 0) return;

      const res = await fetch('/api/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: selectedContactsList,
          template: template.body,
          delayBefore: parseInt(delayBefore),
          delayBetween: parseInt(delayBetween),
          delayUnit,
          randomizeDelay,
          accountId: selectedAccount,
        }),
      });

      if (res.ok) {
        alert('Campaign sent successfully!');
        setStep(1);
        setSelectedContacts(new Set());
      }
    } catch (error) {
      console.error('Failed to send campaign:', error);
      alert('Failed to send campaign');
    }
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Step 1: Select Contacts</h2>

          {/* Sheet Selection */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <label className="block font-semibold mb-2">📊 Select Sheet to Load Contacts From</label>
            <select
              value={sheetName}
              onChange={e => {
                setSheetName(e.target.value);
                setSelectedContacts(new Set());
              }}
              className="w-full px-4 py-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold"
            >
              <option value="Time 1">Time 1</option>
              <option value="Time 1 New">Time 1 New</option>
              <option value="Active">Active</option>
              <option value="Listing">Listing</option>
              <option value="Contact">Contact</option>
            </select>
            <p className="text-sm text-gray-600 mt-2">⏳ Loading {filteredContacts.length} contacts from "{sheetName}" sheet...</p>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search by unit, owner, or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(filters).map(key => (
              <select
                key={key}
                value={filters[key as keyof typeof filters]}
                onChange={e => setFilters({ ...filters, [key]: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </option>
                {key === 'rooms' && (
                  <>
                    <option value="Studio">Studio</option>
                    <option value="1BHK">1BHK</option>
                    <option value="2BHK">2BHK</option>
                    <option value="3BHK">3BHK</option>
                  </>
                )}
              </select>
            ))}
          </div>

          {/* Sorting */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="default">Sort by: Default</option>
            <option value="urgency-asc">Days Remaining: Low to High (Urgent)</option>
            <option value="urgency-desc">Days Remaining: High to Low</option>
          </select>

          {/* Select All / Deselect All */}
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Select All ({filteredContacts.length})
            </button>
            <button
              onClick={deselectAll}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Deselect All
            </button>
          </div>

          {/* Contact List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredContacts.map(contact => (
              <div
                key={contact.unit}
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-blue-50"
              >
                <input
                  type="checkbox"
                  checked={selectedContacts.has(contact.unit)}
                  onChange={() => toggleContactSelection(contact.unit)}
                  className="w-5 h-5 mr-3 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-semibold">{contact.unit}</div>
                  <div className="text-sm text-gray-600">{contact.owner1_name}</div>
                </div>
                <div className="text-sm text-gray-500">{contact.owner1_mobile}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <button disabled className="px-6 py-2 bg-gray-400 text-white rounded-lg">
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={selectedContacts.size === 0}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              Next: Select Template ({selectedContacts.size})
            </button>
          </div>
        </div>
      );
    }

    if (step === 2) {
      const currentTemplate = templates.find(t => t.id === selectedTemplate);
      const firstContact = Array.from(selectedContacts)
        .map(unit => contacts.find(c => c.unit === unit))
        .filter(Boolean)[0];

      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Step 2: Select Template & Preview</h2>

          <div>
            <label className="block font-semibold mb-2">Select Template</label>
            <select
              value={selectedTemplate}
              onChange={e => {
                setSelectedTemplate(e.target.value);
                setTestSent(false);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {currentTemplate && (
            <>
              {/* Test Mode */}
              <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <label className="block font-semibold">Test Mode (Optional)</label>
                <input
                  type="text"
                  placeholder="Enter test phone number"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendTest}
                  disabled={!testPhone || testLoading || !selectedTemplate}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {testLoading ? 'Sending...' : 'Send Test Message'}
                </button>
                {testSent && (
                  <div className="p-3 bg-green-100 border border-green-300 rounded text-green-800">
                    ✅ Test message sent! You should receive it shortly.
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
                <h3 className="font-semibold mb-3">Preview</h3>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {currentTemplate.body
                    .replace(/{name}/g, firstContact?.owner1_name || '[Name]')
                    .replace(/{unit}/g, firstContact?.unit || '[Unit]')
                    .replace(/{rooms_en}/g, firstContact?.rooms_en || '[Rooms]')
                    .replace(/{project_name_en}/g, firstContact?.project_name_en || '[Project]')
                    .replace(/{phone}/g, firstContact?.owner1_mobile || '[Phone]')}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedTemplate}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              Next: Set Delays
            </button>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Step 3: Set Delays</h2>

          <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <label className="block font-semibold mb-2">Delay Before Sending</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={delayBefore}
                  onChange={e => setDelayBefore(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={delayUnit}
                  onChange={e => setDelayUnit(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
              <p className="text-sm text-gray-600 mt-1">Wait this long before starting the campaign</p>
            </div>

            <div>
              <label className="block font-semibold mb-2">Delay Between Messages</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={delayBetween}
                  onChange={e => setDelayBetween(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={delayUnit}
                  onChange={e => setDelayUnit(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
              <p className="text-sm text-gray-600 mt-1">Wait this long between each message</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={randomizeDelay}
                onChange={e => setRandomizeDelay(e.target.checked)}
                className="w-5 h-5 cursor-pointer"
              />
              <label className="font-semibold">Randomize delays (±20%)</label>
            </div>

            <div className="p-3 bg-white border border-blue-200 rounded text-sm">
              <strong>Example:</strong> If delay is 5 minutes and you have 50 contacts, the campaign will take approximately 250 minutes (4+ hours) to complete.
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Next: Review & Send
            </button>
          </div>
        </div>
      );
    }

    if (step === 4) {
      const selectedContactsList = Array.from(selectedContacts)
        .map(unit => contacts.find(c => c.unit === unit))
        .filter(Boolean);
      const currentTemplate = templates.find(t => t.id === selectedTemplate);
      const currentAccount = accounts.find(a => a.id === selectedAccount);

      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Step 4: Review & Send Campaign</h2>

          <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-lg">Campaign Summary</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white border border-green-200 rounded">
                <div className="text-sm text-gray-600">Selected Contacts</div>
                <div className="text-2xl font-bold text-green-600">{selectedContactsList.length}</div>
              </div>

              <div className="p-3 bg-white border border-green-200 rounded">
                <div className="text-sm text-gray-600">Template</div>
                <div className="font-semibold">{currentTemplate?.name}</div>
              </div>

              <div className="p-3 bg-white border border-green-200 rounded">
                <div className="text-sm text-gray-600">Account</div>
                <div className="font-semibold">{currentAccount?.name || 'Not selected'}</div>
              </div>

              <div className="p-3 bg-white border border-green-200 rounded">
                <div className="text-sm text-gray-600">Estimated Duration</div>
                <div className="font-semibold">
                  {selectedContactsList.length * parseInt(delayBetween)} {delayUnit}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-2">Select Account to Send From</label>
              <select
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Choose an account...</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-white border border-yellow-300 rounded text-sm text-yellow-800">
              ⚠️ <strong>Important:</strong> This will send {selectedContactsList.length} messages. Make sure your account is not blocked and delays are appropriate.
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Back
            </button>
            <button
              onClick={handleSendCampaign}
              disabled={!selectedAccount || selectedContactsList.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold"
            >
              Send Campaign ({selectedContactsList.length} messages)
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">🚀 Campaign Manager</h1>
        <div className="text-center text-gray-600 mb-8">Step {step} of 4</div>

        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
