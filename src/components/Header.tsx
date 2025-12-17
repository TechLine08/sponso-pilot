"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function Header() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/60 bg-white/95 backdrop-blur dark:border-slate-700/50 dark:bg-slate-900/95 shadow-sm h-[60px] sm:h-[65px] md:h-[70px] flex items-center">
        <div className="mx-auto max-w-full px-3 sm:px-4 md:px-6 w-full">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isSidebarOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* SponsoPilot Logo */}
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex-shrink-0">
              SponsoPilot
            </h1>
          </div>
        </div>
      </header>

      {/* Sidebar - works on all screen sizes */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}
