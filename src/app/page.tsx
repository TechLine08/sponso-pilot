"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseCompanyList } from "@/app/lib/parseCompanies";
import type { Company, SendLog } from "@/types";
import { useToast } from "@/components/Toast";

/* =========================================================
   Page Shell (gradient bg + tabs)
========================================================= */

type Tab = "campaign" | "research";

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("campaign");

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-fuchsia-50 dark:from-[#0b1020] dark:via-[#0b1628] dark:to-[#111126] text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-10">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">SponsoPilot</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/80">
              Multi-recipient sponsorship outreach with personalization.
            </p>
          </div>

          <nav className="mt-4 sm:mt-0">
            <div className="inline-flex overflow-hidden rounded-xl border border-slate-200/60 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-white/5">
              <TabBtn active={tab === "campaign"} onClick={() => setTab("campaign")}>
                Campaign
              </TabBtn>
              <TabBtn active={tab === "research"} onClick={() => setTab("research")}>
                Research
              </TabBtn>
            </div>
          </nav>
        </header>

        <section className="mt-8">
          {tab === "campaign" ? <CampaignSender /> : <ResearchAssistant />}
        </section>
      </div>
    </main>
  );
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
        "px-4 py-2 text-sm font-medium transition",
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

function ResearchAssistant() {
  const [query, setQuery] = useState("fitness brands in Singapore sponsorship email");
  const [domainPaste, setDomainPaste] = useState("hyroxsingapore.com");
  const [extracting, setExtracting] = useState(false);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const toast = useToast();

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
      const res = await fetch("/api/extract-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains }),
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* LEFT CARD - Research controls */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold">Research</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/80">
          Use search engines to find relevant companies, paste their domains, and extract public emails.
        </p>

        <div className="mt-5">
          <label className="mb-1 block text-sm">Describe the companies</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-indigo-300 dark:border-white/10 dark:bg-white/5"
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
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-indigo-300 dark:border-white/10 dark:bg-white/5"
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
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Found Contacts</h3>
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

        <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-200/70 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-700 dark:bg-white/5 dark:text-slate-200">
              <tr>
                <th className="p-3"></th>
                <th className="p-3">Company</th>
                <th className="p-3">Email</th>
                <th className="p-3">Notes</th>
                <th className="p-3">Source</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {rows.map((r) => {
                const emailValid = isValidEmail(r.email);
                return (
                  <tr key={r.id} className="bg-white/70 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10">
                    <td className="p-3 align-top">
                      <input type="checkbox" checked={!!r.selected} onChange={() => toggleRow(r.id)} />
                    </td>
                    <td className="p-3 align-top">
                      <input
                        value={r.name}
                        onChange={(e) => updateRow(r.id, { name: e.target.value })}
                        className="w-48 rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/10"
                      />
                    </td>
                    <td className="p-3 align-top">
                      <input
                        value={r.email}
                        onChange={(e) => updateRow(r.id, { email: e.target.value })}
                        className={[
                          "w-60 rounded-md px-2 py-1",
                          emailValid
                            ? "border border-slate-200 bg-white dark:border-white/10 dark:bg-white/10"
                            : "border border-rose-500/80 bg-rose-50/60 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
                        ].join(" ")}
                      />
                      {!emailValid && <div className="mt-1 text-xs text-rose-600 dark:text-rose-300">Invalid email</div>}
                    </td>
                    <td className="p-3 align-top">
                      <input
                        value={r.notes}
                        onChange={(e) => updateRow(r.id, { notes: e.target.value })}
                        placeholder="Optional note"
                        className="w-64 rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/10"
                      />
                    </td>
                    <td className="p-3 align-top text-xs text-slate-500">
                      {(() => {
                        try {
                          const u = new URL(r.source);
                          return u.pathname && u.pathname !== "/" ? u.pathname : "";
                        } catch {
                          return "";
                        }
                      })()}
                    </td>
                    <td className="p-3 align-top">
                      <button
                        onClick={() => removeRow(r.id)}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
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

        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          Only public emails are extracted (homepage + likely subpages). You can edit emails and notes here before moving
          them into the campaign.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   CAMPAIGN
========================================================= */

function CampaignSender() {
  const [raw, setRaw] = useState<string>("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const [from, setFrom] = useState<string>("no-reply@example.com");
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>(
    `Hi [[Company Name]],

I’m reaching out regarding a potential sponsorship opportunity.
We think your work in [[Company Industry]] aligns well with our audience.

Would you be open to a quick chat? Happy to share details.

Best,
Your Name
Your Org`
  );

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<SendLog[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("sponso_logs");
      return saved ? (JSON.parse(saved) as SendLog[]) : [];
    } catch {
      return [];
    }
  });

  const toast = useToast();

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

  const handleParse = useCallback(() => {
    const { companies, errors } = parseCompanyList(raw);
    setCompanies(companies);
    setParseErrors(errors);
    if (errors.length) {
      toast.error("Some rows had issues", "Scroll up to ‘Parse issues’ for details.");
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
    <div className="grid gap-6 lg:grid-cols-2">
      {/* LEFT CARD - inputs */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold">Campaign</h2>
        <p className="mb-3 mt-1 text-sm text-slate-600 dark:text-slate-300/80">
          Paste CSV/TSV with headers: <code>name,email,industry,notes</code>
        </p>

        <div className="mb-3">
          <label className="mb-1 block text-sm">Upload CSV</label>
          <input
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10"
          />
        </div>

        <label className="mb-1 block text-sm">Or paste list</label>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="name,email,industry,notes"
          rows={6}
          className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10"
        />
        <button
          onClick={handleParse}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Parse
        </button>

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
            <label className="mb-1 block text-sm">From</label>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10"
              placeholder="you@domain.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10"
              placeholder="Quick sponsorship query for [[Company Name]]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">
              Email Body (supports [[Company Name]], [[Company Industry]], [[Company Email]], [[Notes]])
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10"
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
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <h3 className="text-lg font-semibold">Preview</h3>
        <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200/70 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-700 dark:bg-white/5 dark:text-slate-200">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Industry</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {companies.map((c, idx) => (
                <tr key={idx} className="bg-white/70 dark:bg-white/5">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">{c.email}</td>
                  <td className="p-3">{c.industry ?? "-"}</td>
                  <td className="p-3">{c.notes ?? "-"}</td>
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
      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Delivery Logs</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadLogsCSV}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            Export CSV
          </button>
          <button
            onClick={clearLogs}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200/70 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-700 dark:bg-white/5 dark:text-slate-200">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Company</th>
              <th className="p-3">Email</th>
              <th className="p-3">Status</th>
              <th className="p-3">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {logs.map((log, idx) => (
              <tr key={idx} className="bg-white/70 dark:bg-white/5">
                <td className="whitespace-nowrap p-3">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="p-3">{log.company.name}</td>
                <td className="p-3">{log.company.email}</td>
                <td className="p-3">
                  <span
                    className={[
                      "rounded-md px-2 py-0.5 text-xs",
                      log.status === "success"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
                    ].join(" ")}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="p-3">{log.message}</td>
              </tr>
            ))}
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

      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
        Logs are stored locally in your browser (localStorage).
      </p>
    </>
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
