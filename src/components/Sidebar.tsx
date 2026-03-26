"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const Sidebar = () => {
  // Start open on desktop, closed on mobile
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const { data: session } = useSession();

  const menuItems = [
    { name: "Dashboard", path: "/", icon: "📊" },
    { name: "Contacts", path: "/contacts", icon: "👥" },
    { name: "Statistics", path: "/statistics", icon: "📈" },
    { name: "New Campaign", path: "/campaigns", icon: "🚀" },
    { name: "Campaign History", path: "/campaign-history", icon: "📋" },
    { name: "Accounts", path: "/accounts", icon: "📱" },
    { name: "Templates", path: "/templates", icon: "📝" },
    { name: "Messages", path: "/messages", icon: "💬" },
    { name: "Replies Inbox", path: "/inbox", icon: "📥" },
  ];

  return (
    <>
      {/* ── Burger button: visible on ALL screen sizes when sidebar is closed ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg transition shadow-lg"
          aria-label="Open menu"
        >
          <span className="text-xl leading-none block w-6 h-6 flex items-center justify-center">☰</span>
        </button>
      )}

      {/* ── Sidebar panel ─────────────────────────────────────────────────────
          Mobile  : fixed overlay, slides in/out
          Desktop : static flex item (pushes main content), hidden via lg:hidden
      ── */}
      <div
        className={`
          flex flex-col flex-shrink-0
          fixed inset-y-0 left-0
          lg:static lg:inset-auto
          w-64 bg-gray-900 text-white shadow-lg
          transition-transform duration-300 z-40
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:-translate-x-0"}
          ${!isOpen ? "lg:hidden" : ""}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">📱 Wasender</h1>
            <p className="text-sm text-gray-400 mt-1">WhatsApp Automation</p>
          </div>
          {/* Close button — visible on ALL screen sizes */}
          <button
            onClick={() => setIsOpen(false)}
            className="flex-shrink-0 ml-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg p-2 transition"
            aria-label="Close menu"
          >
            <span className="text-xl leading-none block w-6 h-6 flex items-center justify-center">✕</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => {
                  // On mobile close on nav; on desktop keep open
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
                className={`flex items-center px-6 py-3 transition ${
                  isActive
                    ? "bg-blue-600 text-white border-l-4 border-blue-400"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Sign Out */}
        {session && (
          <div className="flex-shrink-0 p-6 border-t border-gray-700 bg-gray-800">
            <div className="mb-4">
              <p className="text-sm text-gray-400">Signed in as</p>
              <p className="font-medium truncate text-sm">{session.user?.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
            >
              🚪 Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile top spacer so content clears the burger button */}
      <div className="lg:hidden" style={{ height: "60px" }} />
    </>
  );
};

export default Sidebar;
