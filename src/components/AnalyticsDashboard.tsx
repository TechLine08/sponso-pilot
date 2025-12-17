"use client";

import { useEffect, useState, useMemo } from "react";
import type { SendLog, Company } from "@/types";

export default function AnalyticsDashboard() {
  const [logs, setLogs] = useState<SendLog[]>([]);

  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem("sponso_logs");
      if (savedLogs) {
        const parsed = JSON.parse(savedLogs) as SendLog[];
        setLogs(Array.isArray(parsed) ? parsed : []);
      }
    } catch {}
  }, []);

  const totalSent = logs.length;
  const successful = logs.filter((l) => l.status === "success").length;
  const failed = logs.filter((l) => l.status === "fail").length;
  const successRate = totalSent > 0 ? Math.round((successful / totalSent) * 100) : 0;

  const uniqueCompanies = useMemo(() => {
    const companyMap = new Map<string, Company>();
    logs.forEach((log) => {
      if (!companyMap.has(log.company.email)) {
        companyMap.set(log.company.email, log.company);
      }
    });
    return Array.from(companyMap.values());
  }, [logs]);

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

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 md:p-6 dark:border-slate-700/50 dark:bg-slate-800/50 shadow-sm">
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

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 md:p-6 dark:border-slate-700/50 dark:bg-slate-800/50 shadow-sm">
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

      {uniqueCompanies.length > 0 && (
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <h3 className="text-lg font-semibold mb-4">Companies Contacted</h3>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
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
    indigo: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-6 dark:border-slate-700/50 dark:bg-slate-800/50 shadow-sm">
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
