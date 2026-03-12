"use client";

import { useState, useEffect } from "react";

interface Template {
  id: number;
  name: string;
  body: string;
  created_at: string;
}

const VARIABLES = [
  { key: "{unit}", label: "Unit Number" },
  { key: "{rooms_en}", label: "Rooms" },
  { key: "{project_name_en}", label: "Project Name" },
  { key: "{name}", label: "Owner Name" },
  { key: "{mobile1}", label: "Mobile 1" },
  { key: "{mobile2}", label: "Mobile 2" },
  { key: "{mobile3}", label: "Mobile 3" },
  { key: "{feedback1}", label: "Ahmed Feedback 1" },
  { key: "{feedback2}", label: "Ahmed Feedback 2" },
  { key: "{feedback3}", label: "Ahmed Feedback 3" },
  { key: "{zoha_feedback1}", label: "Zoha Feedback 1" },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bodyRef, setBodyRef] = useState<HTMLTextAreaElement | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function loadTemplates() {
    const res = await fetch("/api/templates");
    const data = await res.json();
    if (data.success) setTemplates(data.templates);
    setLoading(false);
  }

  useEffect(() => { loadTemplates(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    setMessage(null);
    
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/templates/${editingId}` : "/api/templates";
    
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), body: body.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      setMessage({ 
        type: "success", 
        text: editingId ? `Template "${name}" updated.` : `Template "${name}" saved.`
      });
      setName("");
      setBody("");
      setEditingId(null);
      loadTemplates();
    } else {
      setMessage({ type: "error", text: data.error });
    }
    setSaving(false);
  }

  function startEdit(template: Template) {
    setEditingId(template.id);
    setName(template.name);
    setBody(template.body);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setBody("");
    setMessage(null);
  }

  async function handleDelete(id: number, tplName: string) {
    if (!confirm(`Delete template "${tplName}"?`)) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    loadTemplates();
  }

  function insertVariable(variable: string) {
    if (!bodyRef) {
      setBody((prev) => prev + variable);
      return;
    }
    const start = bodyRef.selectionStart;
    const end = bodyRef.selectionEnd;
    const newBody = body.slice(0, start) + variable + body.slice(end);
    setBody(newBody);
    setTimeout(() => {
      bodyRef.focus();
      bodyRef.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Message Templates</h1>
      <p className="text-sm text-gray-500 mb-6">
        Create reusable templates for campaigns. Use variables like <code className="bg-gray-100 px-1 rounded">{"{'unit'}"}</code> that get replaced with real contact data when sending.
        WhatsApp formatting: <code className="bg-gray-100 px-1 rounded">*bold*</code> &nbsp; <code className="bg-gray-100 px-1 rounded">_italic_</code>
      </p>

      {/* Create/Edit form */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {editingId ? "Edit Template" : "Create New Template"}
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Initial Outreach, Follow-up, Viewing Confirmation"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
            {/* Variable insertion buttons */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
                >
                  + {v.label}
                </button>
              ))}
            </div>
            <textarea
              ref={(el) => setBodyRef(el)}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Hi {name}! 👋\n\nThis is Ahmed from Mumtaz Properties regarding Unit *{unit}*.\n\nI wanted to follow up with you. Are you available for a quick chat?\n\nBest regards,\nAhmed"}
              rows={8}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none font-mono"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Click the buttons above to insert variables at cursor position. Use *text* for bold, _text_ for italic.
            </p>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {message.text}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !name.trim() || !body.trim()}
              className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
            >
              {saving ? "Saving..." : editingId ? "Update Template" : "Save Template"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Saved templates */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Saved Templates ({templates.length})</h2>
        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-xl border p-6 text-center text-gray-400 text-sm">
            No templates yet. Create one above.
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((tpl) => (
              <div key={tpl.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{tpl.name}</p>
                    <pre className="mt-2 text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed border-l-2 border-gray-200 pl-3">
                      {tpl.body}
                    </pre>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(tpl)}
                      className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tpl.id, tpl.name)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}