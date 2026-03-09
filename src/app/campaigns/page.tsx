'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';

interface Campaign {
  id: string;
  name: string;
  templateId?: string;
  status: 'draft' | 'running' | 'completed';
  messagesSent: number;
  messagesReplied: number;
  createdAt: string;
}

export default function CampaignsPage() {
  const { data: session } = useSession();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'select' | 'template' | 'delays' | 'test' | 'send' | 'results'>('select');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [delayMin, setDelayMin] = useState(47);
  const [delayMax, setDelayMax] = useState(137);
  const [templateText, setTemplateText] = useState('Hi {name}, interested in {unit}?');

  useEffect(() => {
    if (session) {
      loadCampaigns();
    }
  }, [session]);

  async function loadCampaigns() {
    try {
      setLoading(true);
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (data.success && data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalContacts = selectedContacts.length;
  const estimatedDuration = Math.round(
    (totalContacts * (delayMin + delayMax)) / 2 / 60
  );

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
        {['select', 'template', 'delays', 'test', 'send', 'results'].map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                step === s
                  ? 'bg-blue-600'
                  : ['select', 'template', 'delays'].includes(step)
                  ? 'bg-gray-300'
                  : 'bg-gray-400'
              }`}
            >
              {i + 1}
            </div>
            {i < 5 && <div className="flex-1 h-1 bg-gray-300 mx-2" />}
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg shadow p-6 md:p-8">
        {/* Step 1: Select Contacts */}
        {step === 'select' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Step 1: Select Contacts</h2>
            <p className="text-gray-600 mb-6">Choose contacts for your campaign</p>
            
            <div className="space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4">
              <label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded">
                <input type="checkbox" className="mr-3 w-4 h-4" onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedContacts(['all']);
                  } else {
                    setSelectedContacts([]);
                  }
                }} />
                <span className="font-medium">Select All Contacts</span>
              </label>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setStep('template')}
                disabled={selectedContacts.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
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
            <p className="text-gray-600 mb-6">
              Use variables: {'{name}'}, {'{unit}'}, {'{mobile1}'}, {'{feedback1}'}, {'{feedback2}'}, {'{feedback3}'}
            </p>
            
            <textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 mb-4"
              placeholder="Enter your message template..."
            />

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold mb-2">Preview:</h4>
              <p className="text-gray-700">{templateText}</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('select')}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Back
              </button>
              <button
                onClick={() => setStep('delays')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next: Set Delays
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Delays (TIME_1 inspired) */}
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
                  onChange={(e) => setDelayMin(parseInt(e.target.value) || 47)}
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
                  onChange={(e) => setDelayMax(parseInt(e.target.value) || 137)}
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
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Back
              </button>
              <button
                onClick={() => setStep('send')}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Next: Review & Send
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Send */}
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
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Back
              </button>
              <button
                onClick={() => setStep('results')}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
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
                  setTemplateText('Hi {name}, interested in {unit}?');
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Send Another Campaign
              </button>
              <button
                onClick={loadCampaigns}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
