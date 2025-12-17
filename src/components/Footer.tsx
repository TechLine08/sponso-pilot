"use client";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-slate-200/60 bg-white/95 backdrop-blur dark:border-slate-700/50 dark:bg-slate-900/95 mt-auto">
      <div className="mx-auto max-w-full px-4 sm:px-6 md:px-8 py-3 sm:py-4">
        <div className="text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          © {currentYear} SponsoPilot. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
