"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const menuItems = [
    { name: "Dashboard", path: "/", icon: "📊" },
    { name: "Contacts", path: "/contacts", icon: "👥" },
    { name: "Campaigns", path: "/campaigns", icon: "📧" },
    { name: "Accounts", path: "/accounts", icon: "📱" },
    { name: "Templates", path: "/templates", icon: "📝" },
    { name: "Messages", path: "/messages", icon: "💬" },
  ];

  return (
    <>
      {/* Burger Menu Button - TOP LEFT (Fixed positioning for mobile) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition"
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          /* X icon when open */
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          /* Hamburger icon when closed */
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Sidebar - Desktop Fixed, Mobile Overlay */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-gray-900 text-white shadow-lg transition-all duration-300 z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header - with proper padding to avoid button overlap */}
        <div className="p-6 border-b border-gray-700 pt-8 lg:pt-6">
          <h1 className="text-2xl font-bold truncate pr-2">📱 Wasender</h1>
          <p className="text-sm text-gray-400 mt-1">WhatsApp Automation</p>
        </div>

        {/* Navigation Links */}
        <nav className="mt-6">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsOpen(false)}
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

        {/* User Info */}
        {session && (
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700 bg-gray-800">
            <div className="mb-4">
              <p className="text-sm text-gray-400">Signed in as</p>
              <p className="font-medium truncate text-sm">{session.user?.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Mobile Overlay - Click to close */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Content Padding - Prevent overlap on mobile */}
      <div className="lg:hidden" style={{ height: "60px" }} />
    </>
  );
};

export default Sidebar;
