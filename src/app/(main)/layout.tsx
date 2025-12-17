"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 overflow-x-hidden w-full max-w-full">
      <Header />
      <main className="flex-1 overflow-y-auto w-full min-w-0 mt-[60px] sm:mt-[65px] md:mt-[70px]">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full box-border">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

