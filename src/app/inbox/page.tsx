"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

interface Reply {
  message_id: number;
  text: string;
  at: string;
}

interface ContactThread {
  phone: string;
  unit_name: string;
  owner_name: string;
  owner_num: number;
  row_index: number;
  campaign_id: number;
  campaign_name: string;
  sheet_tab: string;
  account_name: string;
  sent_text: string;
  sent_at: string;
  replies: Reply[];
}

export default function InboxPage() {
  const { data: session, status } = useSession();
  const [contacts, setContacts] = useState<ContactThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summarizing, setSummarizing] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [editingSummary, setEditingSummary] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/inbox-replies');
        const data = await res.json();
        if (data.success) setContacts(data.contacts || []);
      } catch {}
      setLoading(false);
    };
    if (status === 'authenticated') load();
  }, [status]);

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <h1 className="text-2xl font-bold">Sign in required</h1>
        <button onClick={() => signIn('google')} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
          Sign in with Google
        </button>
      </div>
    );
  }

  const handleSummarize = async (c: ContactThread) => {
    const key = c.phone;
    setSummarizing(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('/api/summarize-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitName: c.unit_name,
          ownerName: c.owner_name,
          sentMessage: c.sent_text,
          replies: c.replies,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSummaries(prev => ({ ...prev, [key]: data.summary }));
        setEditingSummary(prev => ({ ...prev, [key]: data.summary }));
      }
    } catch {}
    setSummarizing(prev => ({ ...prev, [key]: false }));
  };

  const handleSaveStatus = async (c: ContactThread) => {
    const key = c.phone;
    const value = editingSummary[key] || summaries[key];
    if (!value || !c.row_index || !c.sheet_tab) return;
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('/api/sheet-update-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-status',
          sheetTab: c.sheet_tab,
          rowIndex: c.row_index,
          statusValue: value,
        }),
      });
      const data = await res.json();
      if (data.success) setSaved(prev => ({ ...prev, [key]: true }));
    } catch {}
    setSaving(prev => ({ ...prev, [key]: false }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">💬 Replies Inbox</h1>
            <p className="text-gray-600 mt-1">
              Incoming replies from campaign contacts — summarize with AI &amp; update status
            </p>
          </div>
          <a href="/campaigns" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold">
            ← Campaigns
          </a>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center text-gray-500">Loading replies...</div>
        ) : contacts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-xl font-bold text-gray-900 mb-2">No Replies Yet</p>
            <p className="text-gray-500">When campaign contacts reply on WhatsApp, their messages will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 font-medium">{contacts.length} contact{contacts.length !== 1 ? 's' : ''} replied</p>
            {contacts.map((c) => {
              const key = c.phone;
              const isExpanded = expanded === key;
              const summary = summaries[key];
              const editing = editingSummary[key];

              return (
                <div key={key} className="bg-white rounded-xl shadow-md border border-gray-100">
                  {/* Header row */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 rounded-xl transition"
                    onClick={() => setExpanded(isExpanded ? null : key)}
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💬</span>
                        <div>
                          <p className="font-bold text-gray-900">
                            {c.unit_name && <span className="text-blue-600">{c.unit_name}</span>}
                            {c.unit_name && c.owner_name ? ' — ' : ''}
                            {c.owner_name}
                          </p>
                          <p className="text-gray-500 text-sm">📞 {c.phone} &nbsp;·&nbsp; {c.replies.length} repl{c.replies.length === 1 ? 'y' : 'ies'}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        <p className="font-medium text-gray-600">{c.campaign_name}</p>
                        <p>{c.replies[0]?.at ? new Date(c.replies[0].at).toLocaleString() : ''}</p>
                      </div>
                    </div>

                    {/* Latest reply preview */}
                    <div className="mt-2 ml-11 text-sm text-gray-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                      <span className="text-green-700 font-semibold">Latest reply: </span>
                      {c.replies[0]?.text?.slice(0, 120)}{(c.replies[0]?.text?.length || 0) > 120 ? '...' : ''}
                    </div>
                  </div>

                  {/* Expanded: full thread + AI summary */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-4">
                      {/* Sent message */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Message You Sent</p>
                        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-900 whitespace-pre-wrap">
                          {c.sent_text}
                        </div>
                      </div>

                      {/* All replies */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Their Replies ({c.replies.length})</p>
                        <div className="space-y-2">
                          {c.replies.map((r) => (
                            <div key={r.message_id} className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                              <p className="text-sm text-gray-900 whitespace-pre-wrap">{r.text}</p>
                              <p className="text-xs text-gray-400 mt-1">{new Date(r.at).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Summary section */}
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-bold text-purple-800">AI Status Summary</p>
                          <button
                            onClick={() => handleSummarize(c)}
                            disabled={summarizing[key]}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-xs font-bold rounded-lg transition"
                          >
                            {summarizing[key] ? '⏳ Summarizing...' : summary ? '🔄 Re-summarize' : '✨ Summarize with AI'}
                          </button>
                        </div>

                        {summary ? (
                          <div className="space-y-2">
                            <textarea
                              value={editing ?? summary}
                              onChange={(e) => setEditingSummary(prev => ({ ...prev, [key]: e.target.value }))}
                              className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white resize-none focus:ring-2 focus:ring-purple-400"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveStatus(c)}
                                disabled={saving[key]}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-bold rounded-lg transition"
                              >
                                {saving[key] ? '⏳ Saving...' : saved[key] ? '✅ Saved to Sheet!' : '💾 Save to Status Column (BB)'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-purple-600">
                            Click "Summarize with AI" to generate a concise CRM status from this conversation.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
