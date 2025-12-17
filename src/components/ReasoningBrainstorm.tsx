"use client";

import { useEffect, useState, useMemo } from "react";
import type { Company, CampaignBrief } from "@/types";

export default function ReasoningBrainstorm({
  companies,
  updateReasoning,
}: {
  companies: Company[];
  updateReasoning: (email: string, reasoning: string) => void;
}) {
  const [brief, setBrief] = useState<CampaignBrief | null>(null);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sponso_campaign_brief");
      if (saved) {
        setBrief(JSON.parse(saved) as CampaignBrief);
      }
    } catch {}
  }, []);

  const companiesWithReasoning = companies.filter((c) => c.reasoning?.trim()).length;
  const totalCompanies = companies.length;

  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedCompany(null);
    } else {
      const firstWithoutReasoning = companies.find((c) => !c.reasoning?.trim());
      setExpandedCompany(firstWithoutReasoning?.email || companies[0]?.email || null);
    }
    setExpandAll(!expandAll);
  };

  const brainstormingPrompts = useMemo(() => {
    const basePrompts = [
      "What is their target audience and how does it align with yours?",
      "Have they sponsored similar events or causes before?",
      "What are their brand values and how do they match your mission?",
      "What marketing benefits could they gain from sponsoring?",
      "What's their geographic presence and does it align with your event?",
      "What's their company size and budget capacity?",
    ];

    if (!brief) return basePrompts;

    const personalized: string[] = [];
    if (brief.targetAudience) {
      personalized.push(`How does their target audience align with "${brief.targetAudience}"?`);
    }
    if (brief.location) {
      personalized.push(`Do they have a presence or interest in ${brief.location}?`);
    }
    if (brief.eventType) {
      personalized.push(`Have they sponsored ${brief.eventType}s before?`);
    }
    if (brief.valueProposition) {
      personalized.push(`How can they benefit from: ${brief.valueProposition}?`);
    }
    if (brief.goals) {
      personalized.push(`How can they help achieve: ${brief.goals}?`);
    }

    return [...personalized, ...basePrompts];
  }, [brief]);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 md:p-6 dark:border-slate-700/50 dark:bg-slate-800/50 shadow-sm overflow-hidden w-full max-w-full box-border">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-white break-words">
              Brainstorm Sponsorship Reasoning
            </h3>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 break-words">
            Think about why each company should sponsor and what makes them a good fit. This will help you personalize your outreach and craft more compelling pitches.
          </p>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 break-words">
              <span className="font-medium">{companiesWithReasoning}</span> of{" "}
              <span className="font-medium">{totalCompanies}</span> companies have reasoning notes
            </div>
            {companiesWithReasoning < totalCompanies && (
              <button
                onClick={toggleExpandAll}
                className="text-xs text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 touch-manipulation w-fit"
              >
                {expandAll ? "Collapse all" : "Start brainstorming"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-slate-200/80 bg-slate-50 p-3 sm:p-4 dark:border-slate-700/50 dark:bg-slate-700/30">
        <p className="mb-2 text-xs font-medium text-slate-800 dark:text-white">
          💡 Consider these questions when brainstorming:
        </p>
        <ul className="grid grid-cols-1 gap-1.5 text-xs text-slate-700 dark:text-slate-300 sm:grid-cols-2">
          {brainstormingPrompts.map((prompt, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="mt-0.5 text-blue-500 flex-shrink-0">•</span>
              <span className="break-words">{prompt}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="max-h-[500px] overflow-auto rounded-lg border border-slate-200/80 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
        <div className="divide-y divide-indigo-100 dark:divide-indigo-900/30">
          {companies.map((company, idx) => {
            const isExpanded = expandedCompany === company.email || expandAll;
            const hasReasoning = !!company.reasoning?.trim();

            return (
              <div
                key={idx}
                className="bg-white/70 transition-colors hover:bg-white/90 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <button
                  onClick={() => setExpandedCompany(isExpanded ? null : company.email)}
                  className="w-full p-3 sm:p-4 text-left touch-manipulation"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-slate-900 dark:text-white break-words text-sm sm:text-base">
                          {company.name}
                        </div>
                        {!hasReasoning && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 flex-shrink-0">
                            Needs reasoning
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 break-words">
                        <span className="break-all">{company.email}</span> {company.industry && <span>• {company.industry}</span>}
                        {company.notes && <span> • {company.notes}</span>}
                      </div>
                    </div>
                    <div className="ml-2 sm:ml-4 flex items-center gap-2 flex-shrink-0">
                      {hasReasoning && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                          ✓ Has notes
                        </span>
                      )}
                      <svg
                        className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-blue-200/50 p-3 sm:p-4 dark:border-blue-800/30">
                    <label className="mb-2 block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
                      Why should <span className="font-semibold">{company.name}</span> sponsor? What makes them a good fit{brief ? ` for "${brief.eventName}"` : ""}?
                    </label>
                    {brief && (
                      <div className="mb-2 rounded-lg border border-slate-200/80 bg-slate-50 p-2 text-xs dark:border-slate-700/50 dark:bg-slate-700/30">
                        <span className="font-medium text-slate-800 dark:text-white">Context:</span>{" "}
                        <span className="text-slate-700 dark:text-slate-300 break-words">
                          {brief.description.substring(0, 100)}...
                        </span>
                      </div>
                    )}
                    <textarea
                      value={company.reasoning || ""}
                      onChange={(e) => updateReasoning(company.email, e.target.value)}
                      placeholder={
                        brief
                          ? `Brainstorm ideas here... Consider how ${company.name} aligns with "${brief.eventName}" - their target audience (${brief.targetAudience}), location (${brief.location || "any"}), and how they can benefit from: ${brief.valueProposition.substring(0, 50)}...`
                          : "Brainstorm ideas here... e.g., Their target audience aligns with our event demographics, they've sponsored similar events before, their brand values match our mission, they have a strong presence in our target market..."
                      }
                      rows={6}
                      className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-white/10 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20 box-border"
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 break-words">
                      💡 Tip: Be specific about alignment points, past sponsorships, and mutual benefits. This reasoning can be used to personalize your outreach emails.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
