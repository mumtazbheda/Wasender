"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { STANDARD_COLUMNS, ColumnType } from "@/lib/standard-columns";

interface HeaderMatch {
  header: string;
  autoMatch: string | null;
}

interface SavedMapping {
  sheet_tab: string;
  source_header: string;
  standard_field: string;
}

interface CustomColumn {
  id: number;
  field_key: string;
  display_name: string;
  column_type: string;
}

const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'string', label: 'String' },
  { value: 'name', label: 'Name' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'date', label: 'Date' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
];

// Build dropdown options: standard columns + custom columns
function buildFieldOptions(customColumns: CustomColumn[]) {
  const groups: { group: string; options: { value: string; label: string }[] }[] = [];
  const seenGroups = new Map<string, { value: string; label: string }[]>();

  for (const col of STANDARD_COLUMNS) {
    if (!seenGroups.has(col.group)) {
      const arr: { value: string; label: string }[] = [];
      seenGroups.set(col.group, arr);
      groups.push({ group: col.group, options: arr });
    }
    seenGroups.get(col.group)!.push({ value: col.field, label: col.label });
  }

  if (customColumns.length > 0) {
    groups.push({
      group: 'Custom Columns',
      options: customColumns.map(c => ({ value: c.field_key, label: c.display_name + ' (custom)' })),
    });
  }

  return groups;
}

export default function ColumnMappingsPage() {
  const { data: session, status } = useSession();

  const [sheets, setSheets] = useState<string[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('');

  // Headers from sheet
  const [headers, setHeaders] = useState<HeaderMatch[]>([]);
  const [headersLoading, setHeadersLoading] = useState(false);
  const [headersError, setHeadersError] = useState('');

  // Working mappings (source_header -> standard_field)
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // Saved mappings from DB
  const [savedMappings, setSavedMappings] = useState<SavedMapping[]>([]);
  const [savedTabs, setSavedTabs] = useState<string[]>([]);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Custom columns
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<ColumnType>('text');
  const [addingCol, setAddingCol] = useState(false);
  const [colMsg, setColMsg] = useState('');

  // Track which headers have no mapping (for highlighting)
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    loadSheetTabs();
    loadSavedMappings();
    loadCustomColumns();
  }, [status]);

  const loadSheetTabs = async () => {
    setSheetsLoading(true);
    try {
      const res = await fetch('/api/sheet-tabs');
      const data = await res.json();
      setSheets(data.tabs || []);
    } catch {}
    setSheetsLoading(false);
  };

  const loadSavedMappings = async () => {
    try {
      const res = await fetch('/api/column-mappings');
      const data = await res.json();
      if (data.success) {
        setSavedMappings(data.mappings || []);
        setSavedTabs(data.tabs || []);
      }
    } catch {}
  };

  const loadCustomColumns = async () => {
    try {
      const res = await fetch('/api/custom-columns');
      const data = await res.json();
      if (data.success) setCustomColumns(data.columns || []);
    } catch {}
  };

  const loadHeaders = async (tab: string) => {
    if (!tab) return;
    setHeadersLoading(true);
    setHeadersError('');
    setHeaders([]);
    setMappings({});

    try {
      const res = await fetch(`/api/sheet-headers?sheetTab=${encodeURIComponent(tab)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setHeadersError(data.error || 'Failed to load headers');
        setHeadersLoading(false);
        return;
      }

      const headerList: HeaderMatch[] = data.headers || [];
      setHeaders(headerList);

      // Build initial mappings: start with DB saved mappings, then fill gaps with auto-match
      const dbMaps: Record<string, string> = {};
      const tabMappings = savedMappings.filter(m => m.sheet_tab === tab);
      for (const m of tabMappings) {
        dbMaps[m.source_header] = m.standard_field;
      }

      const initial: Record<string, string> = {};
      for (const h of headerList) {
        if (dbMaps[h.header]) {
          initial[h.header] = dbMaps[h.header];
        } else if (h.autoMatch) {
          initial[h.header] = h.autoMatch;
        } else {
          initial[h.header] = '';
        }
      }
      setMappings(initial);
    } catch (e: any) {
      setHeadersError('Error: ' + e.message);
    }
    setHeadersLoading(false);
  };

  const handleTabSelect = (tab: string) => {
    setSelectedTab(tab);
    setSaveMsg('');
    if (tab) loadHeaders(tab);
  };

  const handleMappingChange = (header: string, field: string) => {
    setMappings(prev => ({ ...prev, [header]: field }));
  };

  const saveMappings = async () => {
    if (!selectedTab) return;
    setSaving(true);
    setSaveMsg('');

    // Only save headers that have a mapping
    const toSave = Object.entries(mappings)
      .filter(([, field]) => field !== '')
      .map(([source_header, standard_field]) => ({ source_header, standard_field }));

    try {
      const res = await fetch('/api/column-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetTab: selectedTab, mappings: toSave }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg(`✅ Saved ${data.upserted} mappings for "${selectedTab}"`);
        await loadSavedMappings();
      } else {
        setSaveMsg('❌ ' + (data.error || 'Failed to save'));
      }
    } catch (e: any) {
      setSaveMsg('❌ Error: ' + e.message);
    }
    setSaving(false);
  };

  const clearMappings = async () => {
    if (!selectedTab || !confirm(`Delete all mappings for "${selectedTab}"?`)) return;
    try {
      await fetch(`/api/column-mappings?sheetTab=${encodeURIComponent(selectedTab)}`, { method: 'DELETE' });
      setSaveMsg(`🗑️ Cleared mappings for "${selectedTab}"`);
      await loadSavedMappings();
      // Re-apply auto-match
      const reset: Record<string, string> = {};
      for (const h of headers) {
        reset[h.header] = h.autoMatch || '';
      }
      setMappings(reset);
    } catch {}
  };

  const addCustomColumn = async () => {
    if (!newColName.trim()) return;
    setAddingCol(true);
    setColMsg('');
    try {
      const res = await fetch('/api/custom-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: newColName.trim(), column_type: newColType }),
      });
      const data = await res.json();
      if (data.success) {
        setColMsg(`✅ Created column "${data.column.display_name}" (key: ${data.column.field_key})`);
        setNewColName('');
        await loadCustomColumns();
      } else {
        setColMsg('❌ ' + (data.error || 'Failed'));
      }
    } catch (e: any) {
      setColMsg('❌ ' + e.message);
    }
    setAddingCol(false);
  };

  const deleteCustomColumn = async (fieldKey: string) => {
    if (!confirm('Delete this custom column?')) return;
    try {
      await fetch(`/api/custom-columns?fieldKey=${encodeURIComponent(fieldKey)}`, { method: 'DELETE' });
      await loadCustomColumns();
      setColMsg('🗑️ Column deleted');
    } catch {}
  };

  const fieldOptions = buildFieldOptions(customColumns);

  const displayedHeaders = showUnmappedOnly
    ? headers.filter(h => !mappings[h.header])
    : headers;

  const unmappedCount = headers.filter(h => !mappings[h.header]).length;
  const mappedCount = headers.filter(h => !!mappings[h.header]).length;

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <h1 className="text-2xl font-bold">Sign in Required</h1>
        <button onClick={() => signIn('google')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🗂️ Column Mappings</h1>
        <p className="text-gray-600 mb-6">
          Map Google Sheet column headers to the standard column set. Saved mappings are applied automatically on every sync.
        </p>

        {/* ── Overview: saved tabs ────────────────────────────────────────── */}
        {savedTabs.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <p className="text-sm font-bold text-gray-700 mb-2">Tabs with saved mappings:</p>
            <div className="flex flex-wrap gap-2">
              {savedTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabSelect(tab)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
                    selectedTab === tab
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {tab} ({savedMappings.filter(m => m.sheet_tab === tab).length} mapped)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab Selector ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Select Sheet Tab to Map</h2>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sheet Tab</label>
              {sheetsLoading ? (
                <div className="text-sm text-gray-500">Loading tabs...</div>
              ) : (
                <select
                  value={selectedTab}
                  onChange={e => handleTabSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a tab...</option>
                  {sheets.map(s => (
                    <option key={s} value={s}>{s}{savedTabs.includes(s) ? ' ✓' : ''}</option>
                  ))}
                </select>
              )}
            </div>
            {selectedTab && (
              <button
                onClick={() => loadHeaders(selectedTab)}
                disabled={headersLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:bg-gray-400"
              >
                {headersLoading ? 'Loading...' : '🔄 Refresh Headers'}
              </button>
            )}
          </div>

          {headersError && (
            <div className="mt-3 p-3 bg-red-100 text-red-800 rounded-lg text-sm">{headersError}</div>
          )}
        </div>

        {/* ── Mapping Table ───────────────────────────────────────────────── */}
        {headers.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Map Columns — {selectedTab}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {mappedCount} mapped · {unmappedCount > 0 && (
                    <span className="text-orange-600 font-medium">{unmappedCount} unmapped</span>
                  )}
                  {unmappedCount === 0 && <span className="text-green-600 font-medium">All mapped</span>}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUnmappedOnly}
                    onChange={e => setShowUnmappedOnly(e.target.checked)}
                    className="rounded"
                  />
                  Show unmapped only
                </label>
                <button
                  onClick={clearMappings}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm transition"
                >
                  🗑️ Clear All
                </button>
                <button
                  onClick={saveMappings}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
                >
                  {saving ? 'Saving...' : '💾 Save Mappings'}
                </button>
              </div>
            </div>

            {saveMsg && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${saveMsg.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {saveMsg}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 w-1/3">Sheet Header</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 w-1/3">Maps To (Standard Field)</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 w-1/6">Auto-detected</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 w-1/6">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedHeaders.map((h, i) => {
                    const currentMapping = mappings[h.header] || '';
                    const isMapped = !!currentMapping;
                    const isAutoMatch = isMapped && currentMapping === h.autoMatch;
                    const isSaved = savedMappings.some(m => m.sheet_tab === selectedTab && m.source_header === h.header && m.standard_field === currentMapping);

                    return (
                      <tr key={h.header} className={`border-b ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                        <td className="px-3 py-2">
                          <span className="font-mono text-gray-800">{h.header}</span>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={currentMapping}
                            onChange={e => handleMappingChange(h.header, e.target.value)}
                            className={`w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${
                              !isMapped ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-white'
                            }`}
                          >
                            <option value="">(Not mapped)</option>
                            {fieldOptions.map(group => (
                              <optgroup key={group.group} label={group.group}>
                                {group.options.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {h.autoMatch ? (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {STANDARD_COLUMNS.find(c => c.field === h.autoMatch)?.label || h.autoMatch}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {!isMapped ? (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Unmapped</span>
                          ) : isSaved ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Saved</span>
                          ) : isAutoMatch ? (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Auto</span>
                          ) : (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Modified</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={saveMappings}
                disabled={saving}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
              >
                {saving ? 'Saving...' : '💾 Save All Mappings'}
              </button>
            </div>
          </div>
        )}

        {/* ── Custom Columns ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">➕ Custom Columns</h2>
          <p className="text-sm text-gray-500 mb-4">
            Create your own columns beyond the standard set. These become available in the mapping dropdown.
          </p>

          {/* Add new custom column */}
          <div className="flex gap-3 items-end flex-wrap mb-4">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Column Name</label>
              <input
                type="text"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                placeholder="e.g. DEWA Account Number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                onKeyDown={e => e.key === 'Enter' && addCustomColumn()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={newColType}
                onChange={e => setNewColType(e.target.value as ColumnType)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {COLUMN_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={addCustomColumn}
              disabled={addingCol || !newColName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition text-sm font-medium"
            >
              {addingCol ? 'Adding...' : '+ Add Column'}
            </button>
          </div>

          {colMsg && (
            <div className={`mb-3 p-3 rounded-lg text-sm ${colMsg.startsWith('✅') ? 'bg-green-100 text-green-800' : colMsg.startsWith('🗑️') ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-800'}`}>
              {colMsg}
            </div>
          )}

          {/* Custom columns list */}
          {customColumns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Display Name</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Field Key</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Type</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customColumns.map((col, i) => (
                    <tr key={col.id} className={`border-b ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-2 font-medium text-gray-900">{col.display_name}</td>
                      <td className="px-3 py-2 font-mono text-gray-500 text-xs">{col.field_key}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{col.column_type}</span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => deleteCustomColumn(col.field_key)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No custom columns yet. Create one above.</p>
          )}
        </div>

        {/* ── Standard Columns Reference ──────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📋 Standard Column Reference</h2>
          <p className="text-sm text-gray-500 mb-4">All built-in standard columns available for mapping.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {STANDARD_COLUMNS.map(col => (
              <div key={col.field} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono">{col.type}</span>
                <span className="text-sm text-gray-800 font-medium">{col.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
