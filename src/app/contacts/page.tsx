"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";

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
  direction: "incoming" | "outgoing";
  message: string;
  timestamp: string;
}

type ContactStatus = "no_messages" | "active_discussion" | "price_negotiation" | "closed";
type ViewMode = "list" | "conversation";

function getContactStatus(contact: Contact): ContactStatus {
  if (contact.messageCount === 0) return "no_messages";
  if (contact.incomingCount > 0) return "active_discussion";
  if (contact.outgoingCount > 2) return "price_negotiation";
  return "active_discussion";
}

function getStatusColor(status: ContactStatus): string {
  switch (status) {
    case "no_messages":
      return "bg-gray-100 text-gray-700";
    case "active_discussion":
      return "bg-green-100 text-green-700";
    case "price_negotiation":
      return "bg-yellow-100 text-yellow-700";
    case "closed":
      return "bg-red-100 text-red-700";
  }
}

function getStatusLabel(status: ContactStatus): string {
  switch (status) {
    case "no_messages":
      return "No Messages";
    case "active_discussion":
      return "Active Discussion";
    case "price_negotiation":
      return "Price Negotiation";
    case "closed":
      return "Closed";
  }
}

export default function ContactsPage() {
  const { data: session, status } = useSession();
  const isConnected = status === "authenticated" && session;

  // State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"recent" | "active" | "name">("recent");

  // Load contacts and messages
  useEffect(() => {
    if (!isConnected) return;

    async function loadData() {
      try {
        const [contactsRes, messagesRes] = await Promise.all([
          fetch("/api/contacts"),
          fetch("/api/messages?limit=5000"),
        ]);

        const contactsData = await contactsRes.json();
        const messagesData = await messagesRes.json();

        if (contactsData.success && messagesData.success) {
          const msgs = messagesData.messages || [];
          setMessages(msgs);

          // Group messages by phone to enrich contacts
          const phoneGroups = msgs.reduce((acc: Record<string, Message[]>, msg: Message) => {
            if (!acc[msg.phone]) acc[msg.phone] = [];
            acc[msg.phone].push(msg);
            return acc;
          }, {});

          // Enrich contacts with message data
          const enrichedContacts = (contactsData.contacts || []).map((contact: any) => {
            const phoneMsgs = phoneGroups[contact.phone] || [];
            const sortedMsgs = phoneMsgs.sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            const lastMsg = sortedMsgs[0];

            return {
              ...contact,
              messageCount: phoneMsgs.length,
              incomingCount: phoneMsgs.filter((m) => m.direction === "incoming").length,
              outgoingCount: phoneMsgs.filter((m) => m.direction === "outgoing").length,
              lastMessage: lastMsg?.message,
              lastMessageTime: lastMsg?.timestamp,
            };
          });

          setContacts(enrichedContacts);
        }
      } catch (error) {
        console.error("Failed to load contacts:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isConnected]);

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let filtered = contacts.filter((c) => {
      const matchesSearch =
        c.phone.includes(searchTerm) || (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === "all" || getContactStatus(c) === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort
    if (sortBy === "recent") {
      filtered.sort(
        (a, b) =>
          new Date(b.lastMessageTime || 0).getTime() -
          new Date(a.lastMessageTime || 0).getTime()
      );
    } else if (sortBy === "active") {
      filtered.sort((a, b) => b.messageCount - a.messageCount);
    } else if (sortBy === "name") {
      filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    return filtered;
  }, [contacts, searchTerm, statusFilter, sortBy]);

  // Get conversation for selected contact
  const selectedConversation = useMemo(() => {
    if (!selectedPhone) return [];
    return messages
      .filter((m) => m.phone === selectedPhone)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [selectedPhone, messages]);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button
          onClick={() => signIn()}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Sign in to view contacts
        </button>
      </div>
    );
  }

  if (viewMode === "conversation" && selectedPhone) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setViewMode("list");
                setSelectedPhone(null);
              }}
              className="text-gray-600 hover:text-gray-900 text-xl"
            >
              ← Back
            </button>
            <div>
              <h2 className="text-lg font-semibold">
                {contacts.find((c) => c.phone === selectedPhone)?.name || selectedPhone}
              </h2>
              <p className="text-sm text-gray-500">{selectedPhone}</p>
            </div>
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedConversation.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No messages yet</div>
          ) : (
            selectedConversation.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                    msg.direction === "outgoing"
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(msg.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action bar */}
        <div className="bg-white border-t p-4 flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg text-sm"
          />
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm whitespace-nowrap">
            Send
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Contacts</h1>
        <p className="text-gray-600">Manage and view all your WhatsApp contacts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-gray-600 text-sm mb-1">Total Contacts</p>
          <p className="text-2xl font-bold">{contacts.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-gray-600 text-sm mb-1">Active Discussions</p>
          <p className="text-2xl font-bold">
            {contacts.filter((c) => getContactStatus(c) === "active_discussion").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-gray-600 text-sm mb-1">Negotiations</p>
          <p className="text-2xl font-bold">
            {contacts.filter((c) => getContactStatus(c) === "price_negotiation").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-gray-600 text-sm mb-1">No Activity</p>
          <p className="text-2xl font-bold">
            {contacts.filter((c) => getContactStatus(c) === "no_messages").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Search</label>
            <input
              type="text"
              placeholder="Phone or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ContactStatus | "all")}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Contacts</option>
              <option value="no_messages">No Messages</option>
              <option value="active_discussion">Active Discussion</option>
              <option value="price_negotiation">Price Negotiation</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="recent">Most Recent</option>
              <option value="active">Most Active</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>

          {/* Results */}
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredContacts.length}</span> of{" "}
              <span className="font-semibold">{contacts.length}</span> contacts
            </div>
          </div>
        </div>
      </div>

      {/* Contacts Table - Desktop */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading contacts...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No contacts found</div>
      ) : (
        <>
          {/* Desktop View */}
          <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Last Message
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredContacts.map((contact) => {
                  const status = getContactStatus(contact);
                  return (
                    <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">
                        {contact.phone}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{contact.name || "-"}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            status
                          )}`}
                        >
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        <div className="flex justify-center gap-2">
                          <span title="Incoming">📥 {contact.incomingCount}</span>
                          <span title="Outgoing">📤 {contact.outgoingCount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>
                          <p className="truncate">{contact.lastMessage || "No messages"}</p>
                          {contact.lastMessageTime && (
                            <p className="text-xs text-gray-500">
                              {new Date(contact.lastMessageTime).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedPhone(contact.phone);
                            setViewMode("conversation");
                          }}
                          className="text-green-600 hover:text-green-700 font-medium text-sm"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {filteredContacts.map((contact) => {
              const status = getContactStatus(contact);
              return (
                <div
                  key={contact.id}
                  className="bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedPhone(contact.phone);
                    setViewMode("conversation");
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{contact.name || "Unknown"}</p>
                      <p className="text-xs font-mono text-gray-600">{contact.phone}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        status
                      )}`}
                    >
                      {getStatusLabel(status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mb-2">
                    {contact.lastMessage || "No messages"}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>📥 {contact.incomingCount} 📤 {contact.outgoingCount}</span>
                    <span className="text-green-600 font-medium">View →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
