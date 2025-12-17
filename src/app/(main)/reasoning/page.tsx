"use client";

import { useEffect, useState, useMemo } from "react";
import type { Company, CampaignBrief } from "@/types";
import { useToast } from "@/components/Toast";
import ReasoningBrainstorm from "@/components/ReasoningBrainstorm";

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

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/30 p-4 sm:p-6 dark:border-indigo-800/30 dark:bg-indigo-950/20">
        <div className="text-center py-8">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            No companies loaded yet. Please parse companies in the Campaign tab first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <ReasoningBrainstorm companies={companies} updateReasoning={updateReasoning} />
    </div>
  );
}
