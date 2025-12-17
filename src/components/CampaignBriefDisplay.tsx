"use client";

import type { CampaignBrief } from "@/types";

export default function CampaignBriefDisplay({
  brief,
  onEdit,
}: {
  brief: CampaignBrief;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 md:p-6 dark:border-slate-700/50 dark:bg-slate-800/50 shadow-sm overflow-hidden w-full max-w-full box-border">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="text-base sm:text-lg font-semibold break-words">{brief.eventName}</h3>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 w-fit">
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
