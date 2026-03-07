"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function SendForm() {
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const phoneParam = searchParams.get("phone");
    if (phoneParam) setPhone(phoneParam);
  }, [searchParams]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);

    const res = await fetch("/api/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text }),
    });
    const data = await res.json();

    if (data.success) {
      setResult({ success: true, message: `Message sent! ID: ${data.messageId}` });
      setText("");
    } else {
      setResult({ success: false, message: `Failed: ${data.error}` });
    }
    setSending(false);
  }

  return (
    <>
      <form onSubmit={handleSend} className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+971585796887"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <p className="text-xs text-gray-400 mt-1">Include country code (e.g., +971...)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message here..."
            rows={5}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            required
          />
        </div>

        <button
          type="submit"
          disabled={sending || !phone || !text}
          className="w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
        >
          {sending ? "Sending..." : "Send WhatsApp Message"}
        </button>
      </form>

      {result && (
        <div className={`mt-4 p-4 rounded-lg text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {result.message}
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-3">Message Templates</h2>
        <div className="space-y-2">
          {[
            { label: "Greeting", text: "Hi! I'm Ahmed from Mumtaz Properties. I wanted to reach out about your property. Let me know how I can help!" },
            { label: "Follow-up", text: "Hi! Thanks for your interest. I have some great updates to share. Are you available for a quick call this week?" },
            { label: "Viewing", text: "Hi! Just confirming our viewing appointment. Looking forward to it!" },
          ].map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => setText(tpl.text)}
              className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="font-medium">{tpl.label}:</span>{" "}
              <span className="text-gray-500">{tpl.text.slice(0, 60)}...</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function SendPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Send Message</h1>
      <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
        <SendForm />
      </Suspense>
    </div>
  );
}
