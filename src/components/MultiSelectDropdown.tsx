"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export default function MultiSelectDropdown({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const buttonLabel =
    selected.length === 0
      ? "All"
      : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-lg bg-white text-sm transition
          ${open ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300 hover:border-gray-400"}
          ${selected.length > 0 ? "text-blue-700 font-medium" : "text-gray-500"}`}
      >
        <span className="truncate">{buttonLabel}</span>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {selected.length > 0 && (
            <span
              onClick={clearAll}
              className="text-gray-400 hover:text-red-500 text-xs px-1 rounded hover:bg-red-50 transition"
              title="Clear"
            >
              ✕
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400 italic">No options</div>
          ) : (
            options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-blue-50 transition text-sm
                    ${checked ? "bg-blue-50 text-blue-800 font-medium" : "text-gray-700"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt)}
                    className="accent-blue-600 w-4 h-4 flex-shrink-0"
                  />
                  <span className="truncate">{opt}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
