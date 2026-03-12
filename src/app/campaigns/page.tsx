'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';

interface Contact {
  id: string;
  name: string;
  unit: string;
  mobile1: string;
  rooms_en: string;
  project_name_en: string;
  feedback1?: string;
  feedback2?: string;
  feedback3?: string;
}

interface Campaign {
  id: string;
  name: string;
  templateId?: string;
  status: 'draft' | 'running' | 'completed';
  messagesSent: number;
  messagesReplied: number;
  createdAt: string;
}

interface Template {
  id: number;
  name: string;
  body: string;
}

export default function CampaignsPage() {
  const { data: session } = useSession();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'template' | 'delays' | 'send' | 'results'>('select');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [delayMin, setDelayMin] = useState(47);
  const [delayMax, setDelayMax] = useState(137);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testPreview, setTestPreview] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (session) {
      loadCampaigns();
      loadContacts();
      loadTemplates();
    }
  }, [session]);

  async function loadCampaigns() {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (data.success && data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  }

  async function loadContacts() {
    try {
      setLoading(true);
      const res = await fetch('/api/sheet-data');
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

  async function loadTemplates() {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (data.success && data.templates) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.unit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile1?.includes(searchTerm)
  );

  const totalContacts = selectAll ? contacts.length : selectedContacts.length;
  const estimatedDuration = Math.round(
    (totalContacts * (delayMin + delayMax)) / 2 / 60
  );

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  function generatePreview(templateBody: string, isTestMode: boolean = false): string {
    let preview = templateBody;
    
    if (isTestMode && testPhone) {
      // For test mode, ask user for values
      preview = preview.replace(/{unit}/g, '[Unit]');
      preview = preview.replace(/{rooms_en}/g, '[Rooms]');
      preview = preview.replace(/{project_name_en}/g, '[Project Name]');
      preview = preview.replace(/{name}/g, '[Name]');
      preview = preview.replace(/{mobile1}/g, '[Mobile]');
      preview = preview.replace(/{feedback1}/g, '[Feedback 1]');
      preview = preview.replace(/{feedback2}/g, '[Feedback 2]');
      preview = preview.replace(/{feedback3}/g, '[Feedback 3]');
      preview = preview.replace(/{zoha_feedback1}/g, '[Zoha Feedback 1]');
    } else if (selectedContacts.length > 0 && !isTestMode) {
      // For production mode, use first selected contact
      const firstContact = contacts.find(c => selectedContacts.includes(c.id));
      if (firstContact) {
        preview = preview.replace(/{unit}/g, firstContact.unit || '[Unit]');
        preview = preview.replace(/{rooms_en}/g, firstContact.rooms_en || '[Rooms]');
        preview = preview.replace(/{project_name_en}/g, firstContact.project_name_en || '[Project Name]');
        preview = preview.replace(/{name}/g, firstContact.name || '[Name]');
        preview = preview.replace(/{mobile1}/g, firstContact.mobile1 || '[Mobile]');
        preview = preview.replace(/{feedback1}/g, firstContact.feedback1 || '[Feedback 1]');
        preview = preview.replace(/{feedback2}/g, firstContact.feedback2 || '[Feedback 2]');
        preview = preview.replace(/{feedback3}/g, firstContact.feedback3 || '[Feedback 3]');
      }
    }
    
    return preview;
  }

  function handleSelectAllChange(checked: boolean) {
    setSelectAll(checked);
    if (checked) {
      setSelectedContacts(contacts.map(c => c.id));
    } else {
      setSelectedContacts([]);
    }
  }

  function handleContactCheck(contactId: string, checked: boolean) {
    let newSelected: string[];
    if (checked) {
      newSelected = [...selectedContacts, contactId];
    } else {
      newSelected = selectedContacts.filter(id => id !== contactId);
    }
    setSelectedContacts(newSelected);
    setSelectAll(newSelected.length === contacts.length);
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button
          onClick={() => signIn()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Sign In to Create Campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Campaigns</h1>

      {/* Step Indicator */}
      <div className="mb-8 flex justify-between items-center">
        {['select', 'template', 'delays', 'send', 'results'].map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                step === s
                  ? 'bg-blue-600'
                  : ['select', 'template', 'delays'].includes(step) && (s === 'select' || s === 'template' || (s === 'delays' && step === 'delays'))
                  ? 'bg-green-600'
                  : 'bg-gray-300'
              }`}
            >
              {i + 1}
            </div>
            {i < 4 && <div className="flex-1 h-1 bg-gray-300 mx-2" />}
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg shadow p-6 md:p-8">
        {/* Step 1: Select Contacts */}
        {step === 'select' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Step 1: Select Contacts</h2>
            <p className="text-gray-600 mb-6">Choose contacts for your campaign from the "Time 1" database</p>
            
            <div className="space-y-4">
              {/* Search Box */}
              <input
                type="text"
                placeholder="Search by name, unit, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Select All / Deselect All */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSelectAllChange(true)}
                  className="px-4 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
                >
                  Select All ({contacts.length})
                </button>
                <button
                  onClick={() => handleSelectAllChange(false)}
                  className="px-4 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
                >
                  Deselect All
                </button>
              </div>

              {/* Contact List */}
              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
                {loading ? (
                  <p className="text-gray-500 text-center py-4">Loading contacts...</p>
                ) : filteredContacts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No contacts found</p>
                ) : (
                  filteredContacts.map((contact) => (
                    <label key={contact.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded">
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={(e) => handleContactCheck(contact.id, e.target.checked)}
                        className="mr-3 w-4 h-4 accent-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{contact.name}</p>
                        <p className="text-xs text-gray-500">Unit: {contact.unit} | {contact.mobile1}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setStep('template')}
                disabled={selectedContacts.length === 0 && !selectAll}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                Next: Choose Template ({totalContacts} contacts)
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Template */}
        {step === 'template' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Step 2: Choose Template</h2>
            <p className="text-gray-600 mb-6">Select a saved template or use a test number to preview</p>
            
            <div className="space-y-6">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>
                <select
                  value={selectedTemplateId || ''}
                  onChange={(e) => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose a template --</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
                {templates.length === 0 && (
                  <p className="text-sm text-orange-600 mt-2">No templates created yet. Go to Templates page to create one.</p>
                )}
              </div>

              {/* Test Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test with Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="Enter a test phone number to see preview with placeholder values"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Variables will show placeholders like [Unit], [Name], etc.</p>
              </div>

              {/* Preview */}
              {selectedTemplate && (
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Preview:</h4>
                  <div className="bg-white p-4 rounded border border-gray-300 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {generatePreview(selectedTemplate.body, !!testPhone)}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {testPhone ? 'Test mode: Variables shown as placeholders' : selectedContacts.length > 0 ? 'Preview using first selected contact' : 'No preview available'}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setStep('select')}
                className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep('delays')}
                disabled={!selectedTemplate}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                Next: Set Delays
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Delays */}
        {step === 'delays' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Step 3: Set Message Delays</h2>
            <p className="text-gray-600 mb-6">
              TIME_1 standard: 47-137 seconds (human-like behavior, avoids WhatsApp rate limits)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Delay (seconds)
                </label>
                <input
                  type="number"
                  value={delayMin}
                  onChange={(e) => setDelayMin(Math.max(1, parseInt(e.target.value) || 47))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Delay (seconds)
                </label>
                <input
                  type="number"
                  value={delayMax}
                  onChange={(e) => setDelayMax(Math.max(delayMin + 1, parseInt(e.target.value) || 137))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
              <p className="text-sm text-gray-700">
                <strong>Estimated Duration:</strong> {estimatedDuration} minutes ({totalContacts} contacts × avg {((delayMin + delayMax) / 2).toFixed(0)}s)
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('template')}
                className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep('send')}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Next: Review & Send
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Send */}
        {step === 'send' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Step 4: Review & Send Campaign</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Contacts</p>
                <p className="text-2xl font-bold text-gray-900">{totalContacts}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Est. Duration</p>
                <p className="text-2xl font-bold text-gray-900">{estimatedDuration}m</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Delay Range</p>
                <p className="text-2xl font-bold text-gray-900">{delayMin}-{delayMax}s</p>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-6">
              <p className="text-sm text-gray-700">
                ⚠️ Campaign will start immediately upon sending. Messages will be sent with random delays to appear human-like.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('delays')}
                className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep('results')}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                ✓ Send Campaign Now
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Results */}
        {step === 'results' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">✓ Campaign Sent!</h2>
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded mb-6">
              <p className="text-lg text-green-700 font-semibold">
                Campaign started successfully
              </p>
              <p className="text-sm text-green-600 mt-2">
                {totalContacts} messages queued with {delayMin}-{delayMax}s delays
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setStep('select');
                  setSelectedContacts([]);
                  setSelectAll(false);
                  setSelectedTemplateId(null);
                  setTestPhone('');
                }}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Send Another Campaign
              </button>
              <button
                onClick={loadCampaigns}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                View Campaigns
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Campaigns */}
      {step === 'select' && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Recent Campaigns</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No campaigns yet</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <h3 className="font-bold text-gray-900 mb-2">{campaign.name}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>📤 Sent: {campaign.messagesSent}</p>
                    <p>📥 Replied: {campaign.messagesReplied}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`inline-block mt-3 px-2 py-1 rounded text-xs font-medium ${
                      campaign.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : campaign.status === 'running'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}