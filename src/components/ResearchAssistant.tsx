"use client";

import { useEffect, useState, useMemo } from "react";
import type { CampaignBrief, Company } from "@/types";
import { useToast } from "@/components/Toast";
type ExtractResult = {
  domain: string;
  companyName?: string;
  contacts: { email: string; source: string }[];
};

type EditableRow = {
  id: string;
  selected: boolean;
  name: string;
  email: string;
  notes: string;
  domain: string;
  source: string;
};

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function hostFrom(originOrUrl: string) {
  try {
    const u = new URL(safeOrigin(originOrUrl));
    return u.hostname.replace(/^www\./, "");
  } catch {
    return originOrUrl.replace(/^https?:\/\//, "");
  }
}

function safeOrigin(input: string) {
  try {
    if (!/^https?:\/\//i.test(input)) return `https://${input}`;
    return input;
  } catch {
    return input;
  }
}

export default function ResearchAssistant() {
  const [brief, setBrief] = useState<CampaignBrief | null>(null);
  const [query, setQuery] = useState("fitness brands in Singapore sponsorship email");
  const [domainPaste, setDomainPaste] = useState("hyroxsingapore.com");
  const [extracting, setExtracting] = useState(false);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const toast = useToast();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sponso_campaign_brief");
      if (saved) {
        const parsed = JSON.parse(saved) as CampaignBrief;
        setBrief(parsed);
        if (parsed.industryPreferences.length > 0 && parsed.location) {
          const industries = parsed.industryPreferences.slice(0, 2).join(" and ");
          setQuery(`${industries} companies in ${parsed.location} sponsorship email`);
        } else if (parsed.industryPreferences.length > 0) {
          const industries = parsed.industryPreferences.slice(0, 2).join(" and ");
          setQuery(`${industries} companies sponsorship email`);
        }
      }
    } catch {}
  }, []);

  const googleLink = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const bingLink = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

  async function extractEmails() {
    const domains = domainPaste
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (domains.length === 0) return;

    setExtracting(true);
    try {
      const res = await fetch("/api/extract-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          domains,
          includeLinkedIn: false,
          strictDomainMatch: true,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed");

      const out: EditableRow[] = [];
      (json.results as ExtractResult[]).forEach((r) => {
        const host = hostFrom(r.domain);
        const companyName = r.companyName || host;
        r.contacts.forEach((c, idx) => {
          out.push({
            id: `${host}::${c.email}::${idx}`,
            selected: true,
            name: companyName,
            email: c.email,
            notes: `Found on ${c.source}`,
            domain: host,
            source: c.source,
          });
        });
      });
      setRows(out);
      toast.success("Extraction complete", `${out.length} contact(s) found.`);
    } catch (e: any) {
      toast.error("Extraction failed", e?.message || "Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  function toggleRow(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  }
  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }
  function updateRow(id: string, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function selectAll(v: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, selected: v })));
  }

  function addCustomRow() {
    const id = Math.random().toString(36).slice(2);
    setRows((prev) => [
      {
        id,
        selected: true,
        name: "",
        email: "",
        notes: "",
        domain: "",
        source: "",
      },
      ...prev,
    ]);
  }

  function addToCampaign() {
    const stashKey = "sponso_research_candidates";
    const valid = rows.filter((r) => r.selected && isValidEmail(r.email));
    if (valid.length === 0) {
      toast.info("Nothing to add", "Select at least one valid email.");
      return;
    }

    const candidates: Company[] = valid.map((r) => ({
      name: r.name || r.domain || "Unknown",
      email: r.email,
      industry: undefined,
      notes: r.notes || (r.source ? `Found on ${r.source}` : ""),
    }));

    const prev = (() => {
      try {
        const s = localStorage.getItem(stashKey);
        return s ? (JSON.parse(s) as Company[]) : [];
      } catch {
        return [];
      }
    })();

    localStorage.setItem(stashKey, JSON.stringify([...candidates, ...prev]));
    toast.success("Added to stash", `${candidates.length} contact(s) ready in Campaign tab.`);
  }

  const anySelected = rows.some((r) => r.selected);
  const selectedValidCount = rows.filter((r) => r.selected && isValidEmail(r.email)).length;

  const recommendations = useMemo(() => {
    if (!brief) return null;
    const recs: string[] = [];
    if (brief.industryPreferences.length > 0) {
      recs.push(`Target ${brief.industryPreferences.join(", ")} companies`);
    }
    if (brief.location) {
      recs.push(`Focus on companies in ${brief.location}`);
    }
    if (brief.targetAudience) {
      recs.push(`Look for brands targeting ${brief.targetAudience}`);
    }
    if (brief.eventType) {
      recs.push(`Search for ${brief.eventType} sponsors`);
    }
    return recs;
  }, [brief]);

  return (
    <div className="space-y-6">
      {brief && (
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-3 sm:p-4 md:p-5 dark:border-emerald-800/30 dark:bg-emerald-950/20 overflow-hidden">
          <div className="flex items-start gap-2 sm:gap-3">
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0"
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
            <div className="flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-100 break-words">
                Recommendations for "{brief.eventName}"
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-emerald-700 dark:text-emerald-300">
                {recommendations?.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-emerald-600/70 dark:text-emerald-400/70">
                💡 Use these recommendations to refine your search. The query below has been auto-generated based on your campaign brief.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 md:p-6 dark:border-slate-700/50 dark:bg-slate-800/50 shadow-sm overflow-hidden w-full max-w-full box-border">
          <h2 className="text-sm sm:text-base md:text-lg font-semibold break-words">Research</h2>
          <p className="mt-0.5 text-[10px] sm:text-xs md:text-sm text-slate-600 dark:text-slate-300/80 break-words">
            Use search engines to find relevant companies, paste their domains, and extract public emails. The tool searches the homepage and common contact pages (contact, about, team, etc.).
          </p>

        <div className="mt-5">
          <label className="mb-1 block text-sm">Describe the companies</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-300 dark:border-white/10 dark:bg-white/5 box-border"
            placeholder="e.g., fintech startups in Jakarta sponsorship contact"
          />
          <div className="mt-2 flex gap-2">
            <a
              href={googleLink}
              target="_blank"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Google Search
            </a>
            <a
              href={bingLink}
              target="_blank"
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-900 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            >
              Bing Search
            </a>
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-1 block text-sm">Paste domains (one per line)</label>
          <textarea
            value={domainPaste}
            onChange={(e) => setDomainPaste(e.target.value)}
            rows={8}
            className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-300 dark:border-white/10 dark:bg-white/5 box-border"
            placeholder="acme.com\nglobex.com"
          />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={extractEmails}
            disabled={extracting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 disabled:opacity-50"
          >
            {extracting ? "Extracting..." : "Extract Emails"}
          </button>
          <button
            onClick={addCustomRow}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            + Add custom row
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 sm:p-4 md:p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 overflow-hidden w-full max-w-full box-border">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-base sm:text-lg font-semibold break-words">Found Contacts</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => selectAll(true)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              Select all
            </button>
            <button
              onClick={() => selectAll(false)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              Deselect all
            </button>
            <button
              onClick={addToCampaign}
              disabled={!anySelected || selectedValidCount === 0}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-emerald-500 disabled:opacity-50"
              title={
                !anySelected
                  ? "No rows selected"
                  : selectedValidCount === 0
                  ? "No valid emails selected"
                  : `Add ${selectedValidCount} contact(s) to stash`
              }
            >
              Add to Campaign Stash
            </button>
          </div>
        </div>

        <div className="max-h-[520px] overflow-x-auto overflow-y-auto rounded-lg border border-slate-200/80 dark:border-slate-700/50">
          <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
            <thead className="bg-slate-50/80 text-slate-700 dark:bg-white/5 dark:text-slate-200">
              <tr>
                <th className="p-2 sm:p-3"></th>
                <th className="p-2 sm:p-3">Company</th>
                <th className="p-2 sm:p-3">Email</th>
                <th className="p-2 sm:p-3">Notes</th>
                <th className="p-2 sm:p-3">Source</th>
                <th className="p-2 sm:p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {rows.map((r) => {
                const emailValid = isValidEmail(r.email);
                return (
                  <tr key={r.id} className="bg-white/70 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10">
                    <td className="p-2 sm:p-3 align-top">
                      <input type="checkbox" checked={!!r.selected} onChange={() => toggleRow(r.id)} className="touch-manipulation" />
                    </td>
                    <td className="p-2 sm:p-3 align-top">
                      <input
                        value={r.name}
                        onChange={(e) => updateRow(r.id, { name: e.target.value })}
                        className="w-32 sm:w-48 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs sm:text-sm dark:border-white/10 dark:bg-white/10"
                      />
                    </td>
                    <td className="p-2 sm:p-3 align-top">
                      <input
                        value={r.email}
                        onChange={(e) => updateRow(r.id, { email: e.target.value })}
                        className={[
                          "w-40 sm:w-60 rounded-md px-2 py-1 text-xs sm:text-sm",
                          emailValid
                            ? "border border-slate-200 bg-white dark:border-white/10 dark:bg-white/10"
                            : "border border-rose-500/80 bg-rose-50/60 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
                        ].join(" ")}
                      />
                      {!emailValid && <div className="mt-1 text-xs text-rose-600 dark:text-rose-300">Invalid email</div>}
                    </td>
                    <td className="p-2 sm:p-3 align-top">
                      <input
                        value={r.notes}
                        onChange={(e) => updateRow(r.id, { notes: e.target.value })}
                        placeholder="Optional note"
                        className="w-40 sm:w-64 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs sm:text-sm dark:border-white/10 dark:bg-white/10"
                      />
                    </td>
                    <td className="p-2 sm:p-3 align-top text-xs text-slate-500 break-all">
                      {(() => {
                        try {
                          const u = new URL(r.source);
                          return u.pathname && u.pathname !== "/" ? u.pathname : "";
                        } catch {
                          return "";
                        }
                      })()}
                    </td>
                    <td className="p-2 sm:p-3 align-top">
                      <button
                        onClick={() => removeRow(r.id)}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15 touch-manipulation"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-slate-500 dark:text-slate-400" colSpan={6}>
                    No results yet. Extract to see contacts here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 break-words">
          Only public emails are extracted (homepage + likely subpages). You can edit emails and notes here before moving
          them into the campaign.
        </p>
      </div>
      </div>
    </div>
  );
}

