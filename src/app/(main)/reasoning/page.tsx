"use client";

import { useEffect, useState } from "react";
import type { Company } from "@/types";
import { useToast } from "@/components/Toast";
import ReasoningBrainstorm from "@/components/ReasoningBrainstorm";

function escapeCSV(val: string) {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export default function ReasoningPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const toast = useToast();

  useEffect(() => {
    // Load companies from localStorage (from campaign sender)
    try {
      const saved = localStorage.getItem("sponso_companies");
      if (saved) {
        const parsed = JSON.parse(saved) as Company[];
        // Also load reasoning
        const savedReasoning = localStorage.getItem("sponso_company_reasoning");
        if (savedReasoning) {
          const reasoningMap = JSON.parse(savedReasoning) as Record<string, string>;
          const withReasoning = parsed.map((c) => ({
            ...c,
            reasoning: reasoningMap[c.email] || c.reasoning || "",
          }));
          setCompanies(withReasoning);
        } else {
          setCompanies(parsed);
        }
      }
    } catch {}
  }, []);

  const updateReasoning = (email: string, reasoning: string) => {
    const updated = companies.map((c) => 
      c.email === email ? { ...c, reasoning } : c
    );
    setCompanies(updated);
    
    // Save to localStorage
    try {
      const reasoningMap: Record<string, string> = {};
      updated.forEach((c) => {
        if (c.reasoning) {
          reasoningMap[c.email] = c.reasoning;
        }
      });
      localStorage.setItem("sponso_company_reasoning", JSON.stringify(reasoningMap));
      // Also update companies list
      localStorage.setItem("sponso_companies", JSON.stringify(updated));
    } catch {}
  };

  const exportToCSV = () => {
    if (companies.length === 0) {
      toast.error("No companies", "Please load companies first.");
      return;
    }

    const header = "name,email,industry,notes,reasoning";
    const rows = companies.map((c) =>
      [
        escapeCSV(c.name),
        c.email,
        escapeCSV(c.industry || ""),
        escapeCSV(c.notes || ""),
        escapeCSV(c.reasoning || ""),
      ].join(",")
    );
    const csv = header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sponsopilot-companies-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported", `${companies.length} companies exported to CSV.`);
  };

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 md:p-6 dark:border-slate-700/50 dark:bg-slate-800/50">
        <div className="text-center py-8">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No companies loaded yet. Please parse companies in the Send Campaign page first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-800 dark:text-white">
            Company Reasoning
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Brainstorm why each company should sponsor your event
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export to CSV
        </button>
      </div>
      <ReasoningBrainstorm companies={companies} updateReasoning={updateReasoning} />
    </div>
  );
}

