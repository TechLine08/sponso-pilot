"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseCompanyList } from "@/app/lib/parseCompanies";
import type { Company, SendLog, CampaignBrief } from "@/types";
import { useToast } from "@/components/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* =========================================================
   Page Shell (gradient bg + tabs)
========================================================= */

type Tab = "campaign" | "research" | "analytics";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/campaign-brief");
  }, [router]);
  return null;
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-1.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm font-medium transition touch-manipulation flex-1 sm:flex-none min-w-0 overflow-hidden text-ellipsis whitespace-nowrap box-border",
        active
          ? "bg-white text-slate-900 dark:bg-white/10 dark:text-white"
          : "text-slate-600 hover:bg-white/60 dark:text-slate-300/80 dark:hover:bg-white/5",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* =========================================================
   RESEARCH (editable list before adding to stash)
========================================================= */

type ExtractResult = {
  domain: string; // final origin after redirects
  companyName?: string;
  contacts: { email: string; source: string }[];
};

type EditableRow = {
  id: string;
  selected: boolean;
  name: string;
  email: string;
  notes: string;
  domain: string; // host only
  source: string; // full URL page where found
};

export function ResearchAssistant() {
  const [brief, setBrief] = useState<CampaignBrief | null>(null);
  const [query, setQuery] = useState("fitness brands in Singapore sponsorship email");
  const [domainPaste, setDomainPaste] = useState("hyroxsingapore.com");
  const [extracting, setExtracting] = useState(false);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const toast = useToast();

  // Load campaign brief
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sponso_campaign_brief");
      if (saved) {
        const parsed = JSON.parse(saved) as CampaignBrief;
        setBrief(parsed);
        // Auto-generate search query based on brief
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
          includeLinkedIn: false, // LinkedIn requires API keys, disabled for now
          strictDomainMatch: true, // Only show emails matching the company's domain
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

  // Generate recommendations based on brief
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
      {/* Campaign Brief Recommendations */}
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
        {/* LEFT CARD - Research controls */}
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-2 sm:p-4 md:p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 overflow-hidden w-full max-w-full box-border">
          <h2 className="text-sm sm:text-base md:text-lg font-semibold break-words">Research</h2>
          <p className="mt-0.5 text-[10px] sm:text-xs md:text-sm text-slate-600 dark:text-slate-300/80 break-words">
            Use search engines to find relevant companies, paste their domains, and extract public emails. The tool searches the homepage and common contact pages (contact, about, team, etc.).
          </p>

        <div className="mt-5">
          <label className="mb-1 block text-sm">Describe the companies</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-indigo-300 dark:border-white/10 dark:bg-white/5 box-border"
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
            className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-indigo-300 dark:border-white/10 dark:bg-white/5 box-border"
            placeholder="acme.com\nglobex.com"
          />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={extractEmails}
            disabled={extracting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 disabled:opacity-50"
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

      {/* RIGHT CARD - Editable table */}
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

        <div className="max-h-[520px] overflow-x-auto overflow-y-auto rounded-xl border border-slate-200/70 dark:border-white/10">
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
                      {!emailValid && <div className="mt-1 text-xs text-rose-600 dark:text-rose-300">Invalid email Test</div>}
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

/* =========================================================
   CAMPAIGN
========================================================= */

function CampaignSender() {
  const [brief, setBrief] = useState<CampaignBrief | null>(null);
  const [showBriefSetup, setShowBriefSetup] = useState(false);
  const [raw, setRaw] = useState<string>("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const [from, setFrom] = useState<string>("no-reply@example.com");
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>(
    `Hi [[Company Name]],

I'm reaching out regarding a potential sponsorship opportunity.
We think your work in [[Company Industry]] aligns well with our audience.

Would you be open to a quick chat? Happy to share details.

Best,
Your Name
Your Org`
  );

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<SendLog[]>([]);

  const toast = useToast();

  // Load campaign brief from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sponso_campaign_brief");
      if (saved) {
        const parsed = JSON.parse(saved) as CampaignBrief;
        setBrief(parsed);
      } else {
        setShowBriefSetup(true);
      }
    } catch {
      setShowBriefSetup(true);
    }
  }, []);

  // Load logs from localStorage after component mounts (client-side only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sponso_logs");
      if (saved) {
        const parsed = JSON.parse(saved) as SendLog[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLogs(parsed);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Auto-load stash from Research
  useEffect(() => {
    const stashKey = "sponso_research_candidates";
    try {
      const s = localStorage.getItem(stashKey);
      if (s) {
        const cands = JSON.parse(s) as Company[];
        if (Array.isArray(cands) && cands.length) {
          const header = "name,email,industry,notes";
          const rows = cands.map(
            (c) =>
              `${escapeCSV(c.name)},${c.email},${escapeCSV(c.industry || "")},${escapeCSV(c.notes || "")}`
          );
          const lines = [header, ...rows].join("\n");
          setRaw((prev) => (prev ? prev + "\n" + lines : lines));
          toast.success("Loaded from Research", `${cands.length} contact(s) added to the paste box.`);
        }
        localStorage.removeItem(stashKey);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sponso_logs", JSON.stringify(logs));
    }
  }, [logs]);

  // Load reasoning from localStorage when companies change
  useEffect(() => {
    if (companies.length > 0 && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sponso_company_reasoning");
        if (saved) {
          const reasoningMap = JSON.parse(saved) as Record<string, string>;
          setCompanies((prev) =>
            prev.map((c) => ({
              ...c,
              reasoning: reasoningMap[c.email] || c.reasoning || "",
            }))
          );
        }
      } catch {
        // Ignore errors
      }
    }
  }, [companies.length]);

  // Save reasoning to localStorage
  useEffect(() => {
    if (companies.length > 0 && typeof window !== "undefined") {
      try {
        const reasoningMap: Record<string, string> = {};
        companies.forEach((c) => {
          if (c.reasoning) {
            reasoningMap[c.email] = c.reasoning;
          }
        });
        localStorage.setItem("sponso_company_reasoning", JSON.stringify(reasoningMap));
      } catch {
        // Ignore errors
      }
    }
  }, [companies]);

  const handleParse = useCallback(() => {
    const { companies, errors } = parseCompanyList(raw);
    setCompanies(companies);
    setParseErrors(errors);
    // Save companies to localStorage for reasoning page
    try {
      localStorage.setItem("sponso_companies", JSON.stringify(companies));
    } catch {}
    if (errors.length) {
      toast.error("Some rows had issues", "Scroll up to 'Parse issues' for details.");
    } else {
      toast.success("Parsed", `${companies.length} contact(s) ready.`);
    }
  }, [raw, toast]);

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    setRaw(text);
    const { companies, errors } = parseCompanyList(text);
    setCompanies(companies);
    setParseErrors(errors);
  }, []);

  const updateCompanyReasoning = useCallback((email: string, reasoning: string) => {
    setCompanies((prev) =>
      prev.map((c) => (c.email === email ? { ...c, reasoning } : c))
    );
  }, []);

  const canSend = useMemo(
    () => companies.length > 0 && subject.trim() && from.trim() && body.trim(),
    [companies.length, subject, from, body]
  );

  const CHUNK_SIZE = 25;

  async function sendCampaign() {
    if (!canSend || sending) return;
    setSending(true);
    setProgress(0);

    const total = companies.length;
    let sent = 0;

    toast.info("Sending campaign", `Dispatching ${total} emails in batches…`, 2000);

    for (let i = 0; i < companies.length; i += CHUNK_SIZE) {
      const batch = companies.slice(i, i + CHUNK_SIZE);

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companies: batch,
          subject,
          from,
          body,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        const failing: SendLog[] = batch.map((c) => ({
          id: c.email,
          company: c,
          status: "fail",
          message: json.error ?? "Batch failed",
          timestamp: new Date().toISOString(),
        }));
        setLogs((prev) => [...failing, ...prev]);
        sent += batch.length;
        toast.error("Batch failed", json.error ?? "See Delivery Logs for details.");
      } else {
        const batchLogs: SendLog[] = json.logs || [];
        setLogs((prev) => [...batchLogs, ...prev]);
        sent += batch.length;
      }

      setProgress(sent / total);
      await new Promise((r) => setTimeout(r, 350));
    }

    toast.success("Campaign complete", "Check Delivery Logs for results.");
    setSending(false);
  }

  function downloadLogsCSV() {
    const header = ["timestamp", "status", "company_name", "company_email", "industry", "message"];
    const rows = logs.map((l) => [
      l.timestamp,
      l.status,
      escapeCSV(l.company.name),
      l.company.email,
      escapeCSV(l.company.industry || ""),
      escapeCSV(l.message),
    ]);
    const csv = header.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sponsopilot-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Campaign Brief Setup/Display */}
      {showBriefSetup ? (
        <CampaignBriefSetup
          brief={brief}
          onSave={(newBrief) => {
            setBrief(newBrief);
            setShowBriefSetup(false);
            localStorage.setItem("sponso_campaign_brief", JSON.stringify(newBrief));
            toast.success("Campaign brief saved", "Your campaign is now personalized!");
          }}
        />
      ) : brief ? (
        <CampaignBriefDisplay
          brief={brief}
          onEdit={() => setShowBriefSetup(true)}
        />
      ) : null}

      {/* Brainstorming Section - Full Width, Always Visible */}
      {companies.length > 0 ? (
        <ReasoningBrainstorm 
          companies={companies} 
          updateReasoning={updateCompanyReasoning}
        />
      ) : (
        <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/30 p-4 sm:p-6 dark:border-indigo-800/30 dark:bg-indigo-950/20">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0"
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
              <h3 className="text-base sm:text-lg font-semibold text-indigo-900 dark:text-indigo-100 break-words">
                Brainstorm Sponsorship Reasoning
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-indigo-700/80 dark:text-indigo-300/80 break-words">
                After you parse your company list, you'll see a dedicated brainstorming section here to help you think about why each company should sponsor and what makes them a good fit for your event or organization.
              </p>
              <p className="mt-2 text-xs text-indigo-600/70 dark:text-indigo-400/70 break-words">
                💡 This will help you personalize your outreach and craft more compelling sponsorship pitches.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 w-full max-w-full">
        {/* LEFT CARD - inputs */}
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-2 sm:p-4 md:p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 overflow-hidden w-full max-w-full box-border">
        <h2 className="text-sm sm:text-base md:text-lg font-semibold break-words">Campaign</h2>
        <p className="mb-2 sm:mb-3 md:mb-4 mt-0.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 break-words">
          Upload a CSV/TSV file or paste your company list below. Required headers:{" "}
          <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">name</span>
          {", "}
          <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">email</span>
          {", "}
          <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">industry</span>
          {", "}
          <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">notes</span>
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Upload CSV</label>
          <input
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="block w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10 box-border"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Or paste list</label>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Paste your data with the header row first, then one company per line
          </p>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={`name, email, industry, notes
ABC Inc., contact@abc.com, Technology, Interested in partnerships`}
            rows={6}
            className="mb-3 w-full max-w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-2 text-xs sm:text-sm placeholder:text-slate-400 dark:border-white/10 dark:bg-white/10 dark:placeholder:text-slate-500 resize-none box-border"
          />
          <button
            onClick={handleParse}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 disabled:opacity-50"
          >
            Parse Companies
          </button>
        </div>

        {parseErrors.length > 0 && (
          <div className="mt-3 rounded-lg border border-rose-300/60 bg-rose-50/70 p-3 text-sm text-rose-800 dark:border-rose-800/50 dark:bg-rose-900/20 dark:text-rose-200">
            <div className="font-medium">Parse issues:</div>
            <ul className="list-inside list-disc">
              {parseErrors.map((e, idx) => (
                <li key={idx}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 grid gap-3">
          <div>
            <label className="mb-1 block text-xs sm:text-sm">From</label>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm dark:border-white/10 dark:bg-white/10 box-border"
              placeholder="you@domain.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium">Subject</label>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400 break-words">
              Use placeholders:{" "}
              <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">[[Company Name]]</span>
              {", "}
              <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">[[Company Industry]]</span>
              {", "}
              <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">[[Company Email]]</span>
              {", "}
              <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">[[Notes]]</span>
            </p>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm dark:border-white/10 dark:bg-white/10 box-border"
              placeholder="Quick sponsorship query for [[Company Name]]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium">Email Body</label>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400 break-words">
              Use placeholders:{" "}
              <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">[[Company Name]]</span>
              {", "}
              <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">[[Company Industry]]</span>
              {", "}
              <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">[[Company Email]]</span>
              {", "}
              <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">[[Notes]]</span>
            </p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm dark:border-white/10 dark:bg-white/10 box-border resize-none"
            />
          </div>

          <button
            onClick={sendCampaign}
            disabled={!canSend || sending}
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 disabled:opacity-50"
          >
            {sending ? "Sending..." : `Send to ${companies.length} companies`}
          </button>

          {sending && (
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
              <div
                style={{ width: `${Math.round(progress * 100)}%` }}
                className="h-2 rounded-full bg-indigo-600 transition-all dark:bg-indigo-400"
              />
            </div>
          )}

          <div className="text-xs text-slate-600 dark:text-slate-400">Sent in batches of 25.</div>
        </div>
      </div>

      {/* RIGHT CARD - preview + logs */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 sm:p-4 md:p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 overflow-hidden w-full max-w-full box-border">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold break-words">Preview</h3>
        <div className="mt-2 max-h-56 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200/70 dark:border-white/10">
          <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
            <thead className="bg-slate-50/80 text-slate-700 dark:bg-white/5 dark:text-slate-200">
              <tr>
                <th className="p-2 sm:p-3">Name</th>
                <th className="p-2 sm:p-3">Email</th>
                <th className="p-2 sm:p-3">Industry</th>
                <th className="p-2 sm:p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {companies.map((c, idx) => (
                <tr key={idx} className="bg-white/70 dark:bg-white/5">
                  <td className="p-2 sm:p-3 break-words">{c.name}</td>
                  <td className="p-2 sm:p-3 break-all">{c.email}</td>
                  <td className="p-2 sm:p-3 break-words">{c.industry ?? "-"}</td>
                  <td className="p-2 sm:p-3 break-words">{c.notes ?? "-"}</td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-slate-500 dark:text-slate-400" colSpan={4}>
                    No companies parsed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <LogsBlock logs={logs} downloadLogsCSV={downloadLogsCSV} clearLogs={() => setLogs([])} />
      </div>
      </div>
    </div>
  );
}

/* =========================================================
   Reasoning Brainstorm
========================================================= */

export function ReasoningBrainstorm({
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
      // Expand first company without reasoning, or first company if all have reasoning
      const firstWithoutReasoning = companies.find((c) => !c.reasoning?.trim());
      setExpandedCompany(firstWithoutReasoning?.email || companies[0]?.email || null);
    }
    setExpandAll(!expandAll);
  };

  // Generate personalized prompts based on brief
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
    <div className="mt-4 sm:mt-6 rounded-xl border border-indigo-200/60 bg-indigo-50/30 p-3 sm:p-4 md:p-5 dark:border-indigo-800/30 dark:bg-indigo-950/20 overflow-hidden w-full max-w-full box-border">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0"
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
            <h3 className="text-base sm:text-lg font-semibold text-indigo-900 dark:text-indigo-100 break-words">
              Brainstorm Sponsorship Reasoning
            </h3>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-indigo-700/80 dark:text-indigo-300/80 break-words">
            Think about why each company should sponsor and what makes them a good fit. This will help you personalize your outreach and craft more compelling pitches.
          </p>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 break-words">
              <span className="font-medium">{companiesWithReasoning}</span> of{" "}
              <span className="font-medium">{totalCompanies}</span> companies have reasoning notes
            </div>
            {companiesWithReasoning < totalCompanies && (
              <button
                onClick={toggleExpandAll}
                className="text-xs text-indigo-600 underline hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 touch-manipulation w-fit"
              >
                {expandAll ? "Collapse all" : "Start brainstorming"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-indigo-200/60 bg-white/60 p-2 sm:p-3 dark:border-indigo-800/30 dark:bg-white/5">
        <p className="mb-2 text-xs font-medium text-indigo-900 dark:text-indigo-100">
          💡 Consider these questions when brainstorming:
        </p>
        <ul className="grid grid-cols-1 gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 sm:grid-cols-2">
          {brainstormingPrompts.map((prompt, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="mt-0.5 text-indigo-500 flex-shrink-0">•</span>
              <span className="break-words">{prompt}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="max-h-[500px] overflow-auto rounded-lg border border-indigo-200/60 bg-white/80 dark:border-indigo-800/30 dark:bg-white/5">
        <div className="divide-y divide-indigo-100 dark:divide-indigo-900/30">
          {companies.map((company, idx) => {
            const isExpanded = expandedCompany === company.email;
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
                  <div className="border-t border-indigo-100 p-3 sm:p-4 dark:border-indigo-900/30">
                    <label className="mb-2 block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
                      Why should <span className="font-semibold">{company.name}</span> sponsor? What makes them a good fit{brief ? ` for "${brief.eventName}"` : ""}?
                    </label>
                    {brief && (
                      <div className="mb-2 rounded-lg border border-indigo-200/60 bg-indigo-50/30 p-2 text-xs dark:border-indigo-800/30 dark:bg-indigo-950/20">
                        <span className="font-medium text-indigo-900 dark:text-indigo-100">Context:</span>{" "}
                        <span className="text-indigo-700 dark:text-indigo-300 break-words">
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
                      className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/10 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 box-border"
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

/* =========================================================
   Logs
========================================================= */

function LogsBlock({
  logs,
  clearLogs,
  downloadLogsCSV,
}: {
  logs: SendLog[];
  clearLogs: () => void;
  downloadLogsCSV: () => void;
}) {
  return (
    <>
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold break-words">Delivery Logs</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadLogsCSV}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15 touch-manipulation"
          >
            Export CSV
          </button>
          <button
            onClick={clearLogs}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15 touch-manipulation"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-2 max-h-64 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200/70 dark:border-white/10">
        <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
          <thead className="bg-slate-50/80 text-slate-700 dark:bg-white/5 dark:text-slate-200">
            <tr>
              <th className="p-2 sm:p-3">Time</th>
              <th className="p-2 sm:p-3">Company</th>
              <th className="p-2 sm:p-3">Email</th>
              <th className="p-2 sm:p-3">Status</th>
              <th className="p-2 sm:p-3">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {logs.map((log, idx) => {
              // Format date consistently to avoid hydration mismatch
              let formattedDate = "";
              try {
                const date = new Date(log.timestamp);
                if (!isNaN(date.getTime())) {
                  formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                } else {
                  formattedDate = log.timestamp || "";
                }
              } catch {
                formattedDate = log.timestamp || "";
              }
              
              const statusClassName = log.status === "success"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200";
              
              // Parse error message if it's JSON
              let displayMessage = log.message || "";
              try {
                const parsed = JSON.parse(displayMessage);
                if (parsed && typeof parsed === "object") {
                  // Extract the actual message from the error object
                  displayMessage = parsed.message || parsed.error || displayMessage;
                }
              } catch {
                // Not JSON, use as-is
              }
              
              return (
                <tr key={idx} className="bg-white/70 dark:bg-white/5">
                  <td className="whitespace-nowrap p-2 sm:p-3 text-xs">{formattedDate}</td>
                  <td className="p-2 sm:p-3 break-words">{log.company?.name || ""}</td>
                  <td className="p-2 sm:p-3 break-all text-xs">{log.company?.email || ""}</td>
                  <td className="p-2 sm:p-3">
                    <span className={`rounded-md px-2 py-0.5 text-xs ${statusClassName}`}>
                      {log.status || "unknown"}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3">
                    <div className="max-w-md">
                      <div className="text-xs sm:text-sm break-words">{displayMessage}</div>
                      {displayMessage.includes("resend.com/domains") && (
                        <a
                          href="https://resend.com/domains"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 underline"
                        >
                          Verify domain →
                        </a>
                      )}
                      {displayMessage.includes("domain is not verified") && (
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Tip: Use a verified domain in your "From" field
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td className="p-6 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                  No logs yet. Send a campaign to see results here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 break-words">
        Logs are stored locally in your browser (localStorage).
      </p>
    </>
  );
}

/* =========================================================
   Campaign Brief Setup
========================================================= */

function CampaignBriefSetup({
  brief,
  onSave,
}: {
  brief: CampaignBrief | null;
  onSave: (brief: CampaignBrief) => void;
}) {
  const [eventName, setEventName] = useState(brief?.eventName || "");
  const [eventType, setEventType] = useState(brief?.eventType || "");
  const [description, setDescription] = useState(brief?.description || "");
  const [targetAudience, setTargetAudience] = useState(brief?.targetAudience || "");
  const [goals, setGoals] = useState(brief?.goals || "");
  const [industryPreferences, setIndustryPreferences] = useState<string[]>(brief?.industryPreferences || []);
  const [budget, setBudget] = useState(brief?.budget || "");
  const [location, setLocation] = useState(brief?.location || "");
  const [date, setDate] = useState(brief?.date || "");
  const [expectedAttendees, setExpectedAttendees] = useState(brief?.expectedAttendees || "");
  const [valueProposition, setValueProposition] = useState(brief?.valueProposition || "");

  const commonIndustries = [
    "Technology",
    "Finance",
    "Healthcare",
    "Education",
    "Sports & Fitness",
    "Food & Beverage",
    "Fashion & Apparel",
    "Travel & Tourism",
    "Entertainment",
    "Real Estate",
    "Automotive",
    "Energy",
    "Retail",
    "Consulting",
    "Non-profit",
  ];

  const toggleIndustry = (industry: string) => {
    setIndustryPreferences((prev) =>
      prev.includes(industry) ? prev.filter((i) => i !== industry) : [...prev, industry]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newBrief: CampaignBrief = {
      eventName,
      eventType,
      description,
      targetAudience,
      goals,
      industryPreferences,
      budget,
      location,
      date,
      expectedAttendees,
      valueProposition,
      createdAt: brief?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(newBrief);
  };

  return (
    <div className="rounded-xl sm:rounded-2xl border border-indigo-200/60 bg-indigo-50/30 p-1.5 sm:p-3 md:p-6 dark:border-indigo-800/30 dark:bg-indigo-950/20 overflow-hidden w-full max-w-full box-border">
      <div className="mb-2 sm:mb-4 md:mb-6">
        <h2 className="text-base sm:text-xl md:text-2xl font-semibold text-indigo-900 dark:text-indigo-100 break-words">
          Campaign Brief Setup
        </h2>
        <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs md:text-sm text-indigo-700/80 dark:text-indigo-300/80 break-words">
          Tell us about your event or activity so we can personalize your sponsorship outreach and provide targeted recommendations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 md:space-y-6 w-full max-w-full">
        <div className="grid gap-1.5 sm:gap-3 md:gap-6 grid-cols-1 md:grid-cols-2 w-full max-w-full">
          <div className="w-full min-w-0">
            <label className="mb-0.5 sm:mb-1.5 md:mb-2 block text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
              Event/Activity Name *
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
              placeholder="e.g., Tech Innovation Summit 2025"
              className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm dark:border-white/10 dark:bg-white/10 box-border"
            />
          </div>

          <div className="w-full min-w-0">
            <label className="mb-0.5 sm:mb-1.5 md:mb-2 block text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
              Event Type *
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              required
              className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm dark:border-white/10 dark:bg-white/10 box-border"
            >
              <option value="">Select type...</option>
              <option value="conference">Conference</option>
              <option value="workshop">Workshop</option>
              <option value="webinar">Webinar</option>
              <option value="festival">Festival</option>
              <option value="sports-event">Sports Event</option>
              <option value="networking">Networking Event</option>
              <option value="exhibition">Exhibition</option>
              <option value="charity">Charity Event</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="w-full min-w-0">
          <label className="mb-0.5 sm:mb-1.5 md:mb-2 block text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={2}
            placeholder="Describe your event, what makes it special, and why sponsors should be interested..."
            className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm dark:border-white/10 dark:bg-white/10 box-border resize-none"
          />
        </div>

        <div className="grid gap-1.5 sm:gap-3 md:gap-6 grid-cols-1 md:grid-cols-2 w-full max-w-full">
          <div className="w-full min-w-0">
            <label className="mb-0.5 sm:mb-1.5 md:mb-2 block text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
              Target Audience *
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              required
              placeholder="e.g., Tech professionals, entrepreneurs, investors"
              className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm dark:border-white/10 dark:bg-white/10 box-border"
            />
          </div>

          <div className="w-full min-w-0">
            <label className="mb-0.5 sm:mb-1.5 md:mb-2 block text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
              Expected Attendees
            </label>
            <input
              type="text"
              value={expectedAttendees}
              onChange={(e) => setExpectedAttendees(e.target.value)}
              placeholder="e.g., 500-1000, 2000+"
              className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm dark:border-white/10 dark:bg-white/10 box-border"
            />
          </div>
        </div>

        <div className="w-full min-w-0">
          <label className="mb-0.5 sm:mb-1.5 md:mb-2 block text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
            Goals & Objectives *
          </label>
          <textarea
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            required
            rows={2}
            placeholder="What do you want to achieve with this event? What are your main goals?"
            className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm dark:border-white/10 dark:bg-white/10 box-border resize-none"
          />
        </div>

        <div className="w-full min-w-0">
          <label className="mb-0.5 sm:mb-1.5 md:mb-2 block text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
            Value Proposition for Sponsors *
          </label>
          <textarea
            value={valueProposition}
            onChange={(e) => setValueProposition(e.target.value)}
            required
            rows={2}
            placeholder="What benefits do sponsors get? (e.g., brand exposure, lead generation, networking opportunities)"
            className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm dark:border-white/10 dark:bg-white/10 box-border resize-none"
          />
        </div>

        <div className="w-full min-w-0">
          <label className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
            Preferred Industries to Target
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {commonIndustries.map((industry) => (
              <button
                key={industry}
                type="button"
                onClick={() => toggleIndustry(industry)}
                className={`rounded-lg px-2 sm:px-2.5 md:px-3 py-1.5 text-xs sm:text-sm transition touch-manipulation whitespace-nowrap ${
                  industryPreferences.includes(industry)
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-white/10 dark:text-slate-300 dark:border-white/10"
                }`}
              >
                {industry}
              </button>
            ))}
          </div>
          {industryPreferences.length > 0 && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 break-words">
              Selected: {industryPreferences.join(", ")}
            </p>
          )}
        </div>

        <div className="grid gap-1.5 sm:gap-3 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-full">
          <div className="w-full min-w-0">
            <label className="mb-0.5 sm:mb-1.5 md:mb-2 block text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Singapore, Virtual, New York"
              className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm dark:border-white/10 dark:bg-white/10 box-border"
            />
          </div>

          <div className="w-full min-w-0">
            <label className="mb-0.5 sm:mb-1.5 md:mb-2 block text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
              Date
            </label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="e.g., March 2025, Q2 2025"
              className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm dark:border-white/10 dark:bg-white/10 box-border"
            />
          </div>

          <div className="w-full min-w-0">
            <label className="mb-0.5 sm:mb-1.5 md:mb-2 block text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 break-words">
              Budget Scale
            </label>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm dark:border-white/10 dark:bg-white/10 box-border"
            >
              <option value="">Select...</option>
              <option value="small">Small ($1K-$10K)</option>
              <option value="medium">Medium ($10K-$50K)</option>
              <option value="large">Large ($50K-$200K)</option>
              <option value="enterprise">Enterprise ($200K+)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="submit"
            className="w-full sm:w-auto rounded-lg bg-indigo-600 px-6 py-3 sm:py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-500 active:bg-indigo-700 touch-manipulation"
          >
            Save Campaign Brief
          </button>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            This information will help us personalize your outreach and provide better recommendations.
          </p>
        </div>
      </form>
    </div>
  );
}

function CampaignBriefDisplay({
  brief,
  onEdit,
}: {
  brief: CampaignBrief;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 sm:p-4 md:p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 overflow-hidden w-full max-w-full box-border">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="text-base sm:text-lg font-semibold break-words">{brief.eventName}</h3>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200 w-fit">
              {brief.eventType}
            </span>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 break-words">{brief.description}</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
            {brief.targetAudience && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Audience:</span>{" "}
                <span className="text-slate-600 dark:text-slate-400">{brief.targetAudience}</span>
              </div>
            )}
            {brief.location && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Location:</span>{" "}
                <span className="text-slate-600 dark:text-slate-400">{brief.location}</span>
              </div>
            )}
            {brief.industryPreferences.length > 0 && (
              <div className="col-span-1 sm:col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">Target Industries:</span>{" "}
                <span className="text-slate-600 dark:text-slate-400 break-words">
                  {brief.industryPreferences.join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onEdit}
          className="sm:ml-4 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:py-1.5 text-xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15 touch-manipulation w-full sm:w-auto"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   Analytics Dashboard
========================================================= */

export function AnalyticsDashboard() {
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem("sponso_logs");
      if (savedLogs) {
        const parsed = JSON.parse(savedLogs) as SendLog[];
        setLogs(Array.isArray(parsed) ? parsed : []);
      }
    } catch {}

    try {
      const savedReasoning = localStorage.getItem("sponso_company_reasoning");
      // We can't get companies directly, but we can extract from logs
    } catch {}
  }, []);

  // Calculate metrics
  const totalSent = logs.length;
  const successful = logs.filter((l) => l.status === "success").length;
  const failed = logs.filter((l) => l.status === "fail").length;
  const successRate = totalSent > 0 ? Math.round((successful / totalSent) * 100) : 0;

  // Get unique companies from logs
  const uniqueCompanies = useMemo(() => {
    const companyMap = new Map<string, Company>();
    logs.forEach((log) => {
      if (!companyMap.has(log.company.email)) {
        companyMap.set(log.company.email, log.company);
      }
    });
    return Array.from(companyMap.values());
  }, [logs]);

  // Group logs by date
  const logsByDate = useMemo(() => {
    const grouped: Record<string, { success: number; fail: number }> = {};
    logs.forEach((log) => {
      const date = new Date(log.timestamp).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = { success: 0, fail: 0 };
      }
      if (log.status === "success") {
        grouped[date].success++;
      } else {
        grouped[date].fail++;
      }
    });
    return grouped;
  }, [logs]);

  // Get last 7 days for chart
  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString());
    }
    return days;
  }, []);

  const chartData = last7Days.map((date) => ({
    date,
    success: logsByDate[date]?.success || 0,
    fail: logsByDate[date]?.fail || 0,
  }));

  const maxValue = Math.max(...chartData.map((d) => d.success + d.fail), 1);

  return (
    <div className="space-y-6">
      {/* Metric Boxes */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricBox
          title="Total Sent"
          value={totalSent}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          color="indigo"
        />
        <MetricBox
          title="Successful"
          value={successful}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="emerald"
        />
        <MetricBox
          title="Failed"
          value={failed}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="rose"
        />
        <MetricBox
          title="Success Rate"
          value={`${successRate}%`}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          color="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Daily Activity Chart */}
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 sm:p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <h3 className="text-base sm:text-lg font-semibold mb-4 break-words">Daily Activity (Last 7 Days)</h3>
          <div className="space-y-3">
            {chartData.map((data, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>{data.date}</span>
                  <span>{data.success + data.fail} sent</span>
                </div>
                <div className="flex gap-1 h-6 rounded overflow-hidden">
                  {data.success > 0 && (
                    <div
                      className="bg-emerald-500 flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${(data.success / maxValue) * 100}%` }}
                    >
                      {data.success}
                    </div>
                  )}
                  {data.fail > 0 && (
                    <div
                      className="bg-rose-500 flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${(data.fail / maxValue) * 100}%` }}
                    >
                      {data.fail}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span className="text-slate-600 dark:text-slate-400">Successful</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-rose-500"></div>
              <span className="text-slate-600 dark:text-slate-400">Failed</span>
            </div>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 sm:p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <h3 className="text-base sm:text-lg font-semibold mb-4 break-words">Status Distribution</h3>
          {totalSent > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">Successful</span>
                  <span className="font-medium">{successful} ({successRate}%)</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${successRate}%` }}
                  ></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">Failed</span>
                  <span className="font-medium">{failed} ({100 - successRate}%)</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all"
                    style={{ width: `${100 - successRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              No data yet. Send a campaign to see analytics.
            </div>
          )}
        </div>
      </div>

      {/* Company Stats */}
      {uniqueCompanies.length > 0 && (
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <h3 className="text-lg font-semibold mb-4">Companies Contacted</h3>
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {uniqueCompanies.length}
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Unique companies reached out to
          </p>
        </div>
      )}
    </div>
  );
}

function MetricBox({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "indigo" | "emerald" | "rose" | "amber";
}) {
  const colorClasses = {
    indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 sm:p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 break-words">{title}</p>
          <p className="mt-1 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white break-words">{value}</p>
        </div>
        <div className={`rounded-lg p-2 sm:p-3 flex-shrink-0 ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

/* =========================================================
   Helpers
========================================================= */

function escapeCSV(val: string) {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// simple but robust enough for UI validation
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
