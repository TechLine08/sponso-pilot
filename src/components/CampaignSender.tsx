"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseCompanyList } from "@/app/lib/parseCompanies";
import type { Company, SendLog, CampaignBrief } from "@/types";
import { useToast } from "@/components/Toast";
import CampaignBriefDisplay from "@/components/CampaignBriefDisplay";

function escapeCSV(val: string) {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

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

      <div className="mt-2 max-h-64 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200/80 dark:border-slate-700/50">
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
              
              let displayMessage = log.message || "";
              try {
                const parsed = JSON.parse(displayMessage);
                if (parsed && typeof parsed === "object") {
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
                          className="mt-1 inline-block text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 underline"
                        >
                          Verify domain →
                        </a>
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

export default function CampaignSender() {
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
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Load logs from localStorage
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
      {/* Campaign Brief Display */}
      {brief && (
        <CampaignBriefDisplay
          brief={brief}
          onEdit={() => setShowBriefSetup(true)}
        />
      )}


      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 w-full max-w-full">
        {/* LEFT CARD - inputs */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 md:p-6 dark:border-slate-700/50 dark:bg-slate-800/50 shadow-sm overflow-hidden w-full max-w-full box-border">
          <h2 className="text-sm sm:text-base md:text-lg font-semibold break-words mb-3">Campaign</h2>
          <p className="mb-4 text-xs text-slate-600 dark:text-slate-400 break-words">
            Upload a CSV/TSV file or paste your company list below. Required headers:{" "}
            <span className="font-mono text-blue-600 dark:text-blue-400 break-all">name</span>
            {", "}
            <span className="font-mono text-blue-600 dark:text-blue-400 break-all">email</span>
            {", "}
            <span className="font-mono text-blue-600 dark:text-blue-400 break-all">industry</span>
            {", "}
            <span className="font-mono text-blue-600 dark:text-blue-400 break-all">notes</span>
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-xs sm:text-sm font-medium">Upload CSV</label>
            <input
              type="file"
              accept=".csv,.tsv,text/csv,text/tab-separated-values"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="block w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm dark:border-white/10 dark:bg-white/10 box-border"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium">Or paste list</label>
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
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 disabled:opacity-50"
            >
              Parse Companies
            </button>
          </div>

          {parseErrors.length > 0 && (
            <div className="mt-3 rounded-lg border border-rose-300/60 bg-rose-50/70 p-3 text-xs sm:text-sm text-rose-800 dark:border-rose-800/50 dark:bg-rose-900/20 dark:text-rose-200">
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
              <label className="mb-1 block text-xs sm:text-sm font-medium">From</label>
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
                <span className="font-mono text-blue-600 dark:text-blue-400 break-all">[[Company Name]]</span>
                {", "}
                <span className="font-mono text-blue-600 dark:text-blue-400 break-all">[[Company Industry]]</span>
                {", "}
                <span className="font-mono text-blue-600 dark:text-blue-400 break-all">[[Company Email]]</span>
                {", "}
                <span className="font-mono text-blue-600 dark:text-blue-400 break-all">[[Notes]]</span>
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
                <span className="font-mono text-blue-600 dark:text-blue-400 break-all">[[Company Name]]</span>
                {", "}
                <span className="font-mono text-blue-600 dark:text-blue-400 break-all">[[Company Industry]]</span>
                {", "}
                <span className="font-mono text-blue-600 dark:text-blue-400 break-all">[[Company Email]]</span>
                {", "}
                <span className="font-mono text-blue-600 dark:text-blue-400 break-all">[[Notes]]</span>
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
              className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 disabled:opacity-50"
            >
              {sending ? "Sending..." : `Send to ${companies.length} companies`}
            </button>

            {sending && (
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                <div
                  style={{ width: `${Math.round(progress * 100)}%` }}
                  className="h-2 rounded-full bg-blue-600 transition-all dark:bg-blue-400"
                />
              </div>
            )}

            <div className="text-xs text-slate-600 dark:text-slate-400">Sent in batches of 25.</div>
          </div>
        </div>

        {/* RIGHT CARD - preview + logs */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 md:p-6 dark:border-slate-700/50 dark:bg-slate-800/50 shadow-sm overflow-hidden w-full max-w-full box-border">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold break-words mb-3">Preview</h3>
          <div className="mt-2 max-h-56 overflow-x-auto overflow-y-auto rounded-lg border border-slate-200/80 dark:border-slate-700/50">
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
