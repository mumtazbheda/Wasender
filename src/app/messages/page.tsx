"use client";

import { useEffect, useState } from "react";

interface Message {
  id: number;
  message_id: string;
  direction: "incoming" | "outgoing";
  phone: string;
  message_text: string;
  status: string;
  created_at: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "incoming" | "outgoing">("all");

  async function loadMessages() {
    const params = filter !== "all" ? `?direction=${filter}` : "";
    const res = await fetch(`/api/messages${params}`);
    const data = await res.json();
    if (data.success) setMessages(data.messages);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    loadMessages();
  }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <div className="flex gap-2">
          {(["all", "incoming", "outgoing"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                filter === f
                  ? "bg-gray-900 text-white"
                  : "bg-white border text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading messages...</p>
      ) : messages.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          No messages found.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`bg-white rounded-xl border p-4 ${
                m.direction === "incoming" ? "border-l-4 border-l-yellow-400" : "border-l-4 border-l-green-400"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    m.direction === "incoming"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {m.direction === "incoming" ? "Received" : "Sent"}
                  </span>
                  <span className="font-mono text-sm text-gray-600">{m.phone}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-800">{m.message_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
