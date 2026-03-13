"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

interface Account {
  id: number;
  name: string;
  phone: string;
  api_key: string;
  account_type: string;
}

export default function SendMessagePage() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const status = sessionResult?.status ?? "loading";
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/accounts")
        .then((r) => r.json())
        .then((d) => {
          setAccounts(d.accounts || []);
          if (d.accounts?.length > 0) setSelectedAccount(String(d.accounts[0].id));
        })
        .finally(() => setLoading(false));
    }
  }, [status]);

  const handleSend = async () => {
    if (!phone || !message || !selectedAccount) return;
    setSending(true);
    setResult(null);

    try {
      const account = accounts.find((a) => String(a.id) === selectedAccount);
      if (!account) throw new Error("Account not found");

      const cleanPhone = phone.replace(/[^0-9]/g, "");

      // Try WAsender API first
      const res = await fetch("/api/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          message,
          accountId: account.id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, text: `✅ Message sent to ${cleanPhone}` });
      } else {
        setResult({ success: false, text: `❌ Failed: ${data.error || data.message || "Unknown error"}` });
      }
    } catch (err: any) {
      setResult({ success: false, text: `❌ Error: ${err.message}` });
    } finally {
      setSending(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <p>Please sign in to send messages</p>
        <button onClick={() => signIn("google")} className="px-6 py-3 bg-blue-600 text-white rounded-lg">Sign In</button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">💬 Send a Test Message</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Send a quick WhatsApp message to test if your accounts are working correctly.
      </p>

      <div className="space-y-4">
        {/* Account selector */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp Account</label>
          <select
            className="w-full border rounded-lg px-4 py-3 text-sm"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="">Select account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.name} {a.phone ? `(${a.phone})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Phone number */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
          <input
            type="text"
            inputMode="numeric"
            className="w-full border rounded-lg px-4 py-3 text-sm"
            placeholder="97150XXXXXXX or +97150XXXXXXX (9-15 digits)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Format: Any valid international phone (we'll clean it to digits only). Example: 971501234567 or +971 50 123 4567</p>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Message</label>
          <textarea
            className="w-full border rounded-lg px-4 py-3 text-sm"
            rows={4}
            placeholder="Type your test message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending || !phone || !message || !selectedAccount}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition"
        >
          {sending ? "⏳ Sending..." : "📤 Send Message"}
        </button>

        {/* Result */}
        {result && (
          <div className={`p-4 rounded-lg ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <p className={`font-medium ${result.success ? "text-green-800" : "text-red-800"}`}>
              {result.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
