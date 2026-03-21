"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Campaign {
  id: number;
  name: string;
  account_name: string;
  template_name: string;
  template_body: string;
  sheet_tab: string;
  total_contacts: number;
  total_unique_phones: number;
  duplicates_removed: number;
  sent_count: number;
  failed_count: number;
  status: string;
  filters_used: string;
  delay_before: number;
  delay_between: number;
  delay_unit: string;
  randomize_delay: boolean;
  started_at: string;
  completed_at: string;
  created_at: string;
}

interface CampaignMessage {
  id: number;
  phone: string;
  unit_name: string;
  owner_name: string;
  owner_num: number;
  message_text: string;
  status: string;
  error_message: string;
  sent_at: string;
  created_at: string;
}

function CampaignHistoryContent() {
  const searchParams = useSearchParams();
  const detailId = searchParams.get("id");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageFilter, setMessageFilter] = useState<'all' | 'sent' | 'failed' | 'queued'>('all');
  const [rerunModal, setRerunModal] = useState<Campaign | null>(null);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [rerunStatus, setRerunStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [browserProcessing, setBrowserProcessing] = useState<{ campaignId: number; sent: number; failed: number; queued: number; lastError?: string } | null>(null);

  // Load all campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/send-campaign');
        const data = await res.json();
        if (data.campaigns) {
          setCampaigns(data.campaigns);
          // Auto-open detail if ID in URL
          if (detailId) {
            const found = data.campaigns.find((c: Campaign) => String(c.id) === detailId);
            if (found) {
              setSelectedCampaign(found);
              loadMessages(found.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load campaigns:', err);
      }
      setLoading(false);
    };
    loadCampaigns();
  }, [detailId]);

  const loadMessages = async (campaignId: number) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/campaign-detail/${campaignId}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
    setMessagesLoading(false);
  };

  const handleCampaignClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setMessages([]);
    loadMessages(campaign.id);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return styles[status] || styles.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: '✅ Completed',
      partial: '⚠️ Partial',
      in_progress: '⏳ In Progress',
      failed: '❌ Failed',
      pending: '⏳ Pending',
    };
    return labels[status] || status;
  };

  const handleRerun = (campaign: Campaign) => {
    setRerunStatus(null);
    setRerunModal(campaign);
  };

  const runBrowserProcessing = async (campaignId: number) => {
    setBrowserProcessing({ campaignId, sent: 0, failed: 0, queued: 0 });
    let isComplete = false;
    while (!isComplete) {
      try {
        const res = await fetch('/api/process-campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId }),
        });
        const data = await res.json();
        isComplete = data.isComplete;
        setBrowserProcessing({ campaignId, sent: data.sentTotal || 0, failed: data.failedTotal || 0, queued: data.queuedRemaining || 0, lastError: data.error || undefined });
        if (!isComplete) {
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch {
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    setBrowserProcessing(null);
    // Update feedback in DB cache + Google Sheet
    try {
      const detailRes = await fetch(`/api/campaign-detail/${campaignId}`);
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const campaign = detail.campaign;
        const sentMessages: any[] = (detail.messages || []).filter((m: any) => m.status === 'sent' && m.row_index != null);
        if (sentMessages.length && campaign?.sheet_tab && campaign?.account_name) {
          const timestamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          const feedbackValue = `Message Sent - ${timestamp}`;
          const acct = (campaign.account_name || '').toLowerCase();
          for (const msg of sentMessages) {
            const ownerNum = msg.owner_num || 1;
            let feedbackKey = '';
            if (acct.includes('ahmed')) feedbackKey = `ahmed_feedback_${ownerNum}`;
            else if (acct.includes('zoha') || acct.includes('soha')) feedbackKey = `zoha_feedback_${ownerNum}`;
            if (!feedbackKey) continue;
            await fetch('/api/contacts-cache', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sheetName: campaign.sheet_tab, rowIndex: msg.row_index, updates: { [feedbackKey]: feedbackValue } }),
            });
          }
          await fetch('/api/sheet-update-direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update-feedback',
              sheetTab: campaign.sheet_tab,
              accountName: campaign.account_name,
              updates: sentMessages.map((m: any) => ({ rowIndex: m.row_index, ownerNum: m.owner_num || 1 })),
            }),
          });
        }
      }
    } catch (err) { console.error('Feedback update failed:', err); }
    // Refresh campaign list after done
    const h = await fetch('/api/send-campaign');
    const hd = await h.json();
    if (hd.campaigns) setCampaigns(hd.campaigns);
  };

  const executeRerun = async (mode: 'resume' | 'fresh') => {
    if (!rerunModal) return;
    setRerunLoading(true);
    setRerunStatus(null);
    try {
      const res = await fetch('/api/rerun-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: rerunModal.id, mode }),
      });
      const data = await res.json();
      if (res.ok) {
        const campaignId = rerunModal.id;
        setRerunStatus({ type: 'success', message: '✅ ' + data.message });
        // Refresh campaigns list
        const h = await fetch('/api/send-campaign');
        const hd = await h.json();
        if (hd.campaigns) setCampaigns(hd.campaigns);
        // Also refresh detail if open
        if (selectedCampaign && selectedCampaign.id === campaignId) {
          const updated = (hd.campaigns || []).find((c: Campaign) => c.id === campaignId);
          if (updated) setSelectedCampaign(updated);
        }
        setRerunModal(null);
        // If GitHub Actions not triggered, process in browser automatically
        if (!data.workflowTriggered) {
          runBrowserProcessing(campaignId);
        }
      } else {
        setRerunStatus({ type: 'error', message: '❌ ' + (data.message || 'Failed') });
      }
    } catch (e: any) {
      setRerunStatus({ type: 'error', message: '❌ Failed: ' + e.message });
    }
    setRerunLoading(false);
  };

  const filteredMessages = messages.filter(m => {
    if (messageFilter === 'all') return true;
    return m.status === messageFilter;
  });

  const processingBanner = browserProcessing && (
    <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="animate-spin">⏳</span>
        <span className="font-bold">Sending messages...</span>
      </div>
      <div className="text-xs opacity-90">
        ✅ Sent: {browserProcessing.sent} &nbsp; ❌ Failed: {browserProcessing.failed} &nbsp; Remaining: {browserProcessing.queued}
      </div>
      {browserProcessing.lastError && (
        <div className="text-xs mt-2 bg-red-500 bg-opacity-80 rounded px-2 py-1">
          Last error: {browserProcessing.lastError}
        </div>
      )}
      <div className="text-xs opacity-75 mt-1">Keep this tab open until complete</div>
    </div>
  );

  // Campaign Detail View
  if (selectedCampaign) {
    const parsedFilters = (() => {
      try { return JSON.parse(selectedCampaign.filters_used || '{}'); } catch { return {}; }
    })();
    const activeFilters = Object.entries(parsedFilters).filter(([, v]: [string, any]) => Array.isArray(v) && v.length > 0);

    return (
      <>
      {processingBanner}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => { setSelectedCampaign(null); setMessages([]); }}
            className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition"
          >
            ← Back to All Campaigns
          </button>

          {/* Campaign Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedCampaign.name || 'Unnamed Campaign'}</h1>
                <p className="text-gray-500 mt-1">Created: {new Date(selectedCampaign.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2 items-center">
                <span className={`px-4 py-2 rounded-full text-sm font-bold border ${getStatusBadge(selectedCampaign.status)}`}>
                  {getStatusLabel(selectedCampaign.status)}
                </span>
                <button
                  onClick={() => handleRerun(selectedCampaign)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold"
                >
                  🔄 Re-run
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-blue-600">{selectedCampaign.total_unique_phones || selectedCampaign.total_contacts}</p>
                <p className="text-xs text-gray-500 mt-1">Unique Phones</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-green-600">{selectedCampaign.sent_count}</p>
                <p className="text-xs text-gray-500 mt-1">Sent</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-red-600">{selectedCampaign.failed_count}</p>
                <p className="text-xs text-gray-500 mt-1">Failed</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-orange-600">{selectedCampaign.duplicates_removed || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Duplicates Skipped</p>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Account:</span>
                  <span className="font-bold">{selectedCampaign.account_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Template:</span>
                  <span className="font-bold">{selectedCampaign.template_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sheet:</span>
                  <span className="font-bold">{selectedCampaign.sheet_tab || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Delay Between:</span>
                  <span className="font-bold">{selectedCampaign.delay_between} {selectedCampaign.delay_unit}{selectedCampaign.randomize_delay ? ' (±20%)' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Started:</span>
                  <span className="font-bold">{selectedCampaign.started_at ? new Date(selectedCampaign.started_at).toLocaleString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Completed:</span>
                  <span className="font-bold">{selectedCampaign.completed_at ? new Date(selectedCampaign.completed_at).toLocaleString() : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Filters Used */}
            {activeFilters.length > 0 && (
              <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-bold text-gray-700 mb-2">Filters Applied:</p>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map(([key, values]: [string, any]) => (
                    <span key={key} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {key}: {Array.isArray(values) ? values.join(', ') : String(values)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Template Body */}
            <div className="mt-4 border-t pt-4">
              <p className="text-sm font-bold text-gray-700 mb-2">Template Body:</p>
              <div className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {selectedCampaign.template_body}
              </div>
            </div>
          </div>

          {/* Messages List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-gray-900">📬 Message Log ({filteredMessages.length})</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setMessageFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition ${messageFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  All ({messages.length})
                </button>
                <button
                  onClick={() => setMessageFilter('sent')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition ${messageFilter === 'sent' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  ✅ Sent ({messages.filter(m => m.status === 'sent').length})
                </button>
                <button
                  onClick={() => setMessageFilter('failed')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition ${messageFilter === 'failed' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  ❌ Failed ({messages.filter(m => m.status === 'failed').length})
                </button>
                {messages.filter(m => m.status === 'queued').length > 0 && (
                  <button
                    onClick={() => setMessageFilter('queued')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition ${messageFilter === 'queued' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    ⏳ Queued ({messages.filter(m => m.status === 'queued').length})
                  </button>
                )}
              </div>
            </div>

            {messagesLoading ? (
              <div className="text-center py-8 text-gray-500">Loading messages...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {selectedCampaign.status === 'in_progress' ? '⏳ Campaign is still running...' : 'No messages found'}
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredMessages.map((msg) => (
                  <div key={msg.id} className={`border rounded-lg p-3 text-sm ${
                    msg.status === 'sent' ? 'border-green-200 bg-green-50' : msg.status === 'queued' ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex flex-col sm:flex-row justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{msg.status === 'sent' ? '✅' : msg.status === 'queued' ? '⏳' : '❌'}</span>
                        <div>
                          <p className="font-bold text-gray-900">
                            {msg.unit_name && <span className="text-blue-600">{msg.unit_name}</span>}
                            {msg.unit_name && msg.owner_name ? ' — ' : ''}
                            {msg.owner_name}
                            {msg.owner_num ? <span className="text-gray-400 text-xs ml-1">(Owner {msg.owner_num})</span> : null}
                          </p>
                          <p className="text-gray-600">📞 {msg.phone}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString() : ''}
                      </div>
                    </div>
                    {msg.status === 'failed' && msg.error_message && (
                      <p className="mt-2 text-xs text-red-700 bg-red-100 p-2 rounded">{msg.error_message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rerun Campaign Modal (detail view) */}
      {rerunModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => !rerunLoading && setRerunModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-2">↺ Re-run Campaign</h2>
            <p className="text-gray-600 mb-1"><b>"{rerunModal.name || 'Unnamed Campaign'}"</b></p>
            <p className="text-sm text-gray-500 mb-6">
              {rerunModal.sent_count || 0} sent, {rerunModal.failed_count || 0} failed out of {rerunModal.total_unique_phones || rerunModal.total_contacts} total.
            </p>
            {rerunStatus && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${rerunStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {rerunStatus.message}
              </div>
            )}
            <div className="flex flex-col gap-3">
              <button disabled={rerunLoading} onClick={() => executeRerun('resume')} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold text-left px-4 transition">
                <div className="font-bold">▶ Resume from where I left off</div>
                <div className="text-sm font-normal opacity-90">Skip already-sent numbers, only send to remaining ones</div>
              </button>
              <button disabled={rerunLoading} onClick={() => executeRerun('fresh')} className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl font-bold text-left px-4 transition">
                <div className="font-bold">↺ Start completely fresh</div>
                <div className="text-sm font-normal opacity-90">Reset everything and send all messages again from the beginning</div>
              </button>
              <button disabled={rerunLoading} onClick={() => setRerunModal(null)} className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition">
                {rerunStatus ? 'Close' : 'Cancel'}
              </button>
            </div>
            {rerunLoading && <p className="text-center text-sm text-gray-500 mt-3">Processing...</p>}
          </div>
        </div>
      )}
      </>
    );
  }

  // Campaign List View
  return (
    <>
    {processingBanner}
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Campaign History</h1>
            <p className="text-gray-600 mt-1">View all past campaigns and their results</p>
          </div>
          <a
            href="/campaigns"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-bold shadow-md"
          >
            ➕ New Campaign
          </a>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center text-gray-500">
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-6xl mb-4">📭</p>
            <p className="text-xl font-bold text-gray-900 mb-2">No Campaigns Yet</p>
            <p className="text-gray-500 mb-6">Run your first campaign to see it here</p>
            <a
              href="/campaigns"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-bold"
            >
              Create Campaign
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                onClick={() => handleCampaignClick(campaign)}
                className="bg-white rounded-xl shadow-md hover:shadow-lg p-6 cursor-pointer transition border border-transparent hover:border-blue-300"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{campaign.name || 'Unnamed Campaign'}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(campaign.created_at).toLocaleString()} • {campaign.sheet_tab || 'N/A'} • via {campaign.account_name || 'Unknown'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${getStatusBadge(campaign.status)}`}>
                    {getStatusLabel(campaign.status)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 mt-3 text-sm items-center">
                  <span className="text-blue-600">📧 Total: <b>{campaign.total_unique_phones || campaign.total_contacts}</b></span>
                  <span className="text-green-600">✅ Sent: <b>{campaign.sent_count}</b></span>
                  <span className="text-red-600">❌ Failed: <b>{campaign.failed_count}</b></span>
                  {(campaign.duplicates_removed || 0) > 0 && (
                    <span className="text-orange-600">🔄 Deduped: <b>{campaign.duplicates_removed}</b></span>
                  )}
                </div>

                {/* Progress bar */}
                {campaign.status === 'in_progress' && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${((campaign.sent_count + campaign.failed_count) / Math.max(campaign.total_unique_phones || campaign.total_contacts, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRerun(campaign); }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                  >
                    🔄 Re-run
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Rerun Campaign Modal */}
    {rerunModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => !rerunLoading && setRerunModal(null)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold text-gray-900 mb-2">↺ Re-run Campaign</h2>
          <p className="text-gray-600 mb-1">
            <b>"{rerunModal.name || 'Unnamed Campaign'}"</b>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {rerunModal.sent_count || 0} sent, {rerunModal.failed_count || 0} failed out of {rerunModal.total_unique_phones || rerunModal.total_contacts} total.
          </p>

          {rerunStatus && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${rerunStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {rerunStatus.message}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              disabled={rerunLoading}
              onClick={() => executeRerun('resume')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold text-left px-4 transition"
            >
              <div className="font-bold">▶ Resume from where I left off</div>
              <div className="text-sm font-normal opacity-90">Skip already-sent numbers, only send to remaining ones</div>
            </button>
            <button
              disabled={rerunLoading}
              onClick={() => executeRerun('fresh')}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl font-bold text-left px-4 transition"
            >
              <div className="font-bold">↺ Start completely fresh</div>
              <div className="text-sm font-normal opacity-90">Reset everything and send all messages again from the beginning</div>
            </button>
            <button
              disabled={rerunLoading}
              onClick={() => setRerunModal(null)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition"
            >
              {rerunStatus ? 'Close' : 'Cancel'}
            </button>
          </div>
          {rerunLoading && <p className="text-center text-sm text-gray-500 mt-3">Processing...</p>}
        </div>
      </div>
    )}
    </>
  );
}

export default function CampaignHistoryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-400">Loading campaign history...</div>}>
      <CampaignHistoryContent />
    </Suspense>
  );
}
