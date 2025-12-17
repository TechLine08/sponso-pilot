"use client";

import { useState } from "react";
import type { CampaignBrief } from "@/types";

export default function CampaignBriefSetup({
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
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 md:p-6 dark:border-slate-700/50 dark:bg-slate-800/50 shadow-sm overflow-hidden w-full max-w-full box-border">
      <div className="mb-4 sm:mb-5 md:mb-6">
        <h2 className="text-base sm:text-xl md:text-2xl font-semibold text-slate-800 dark:text-white break-words">
          Campaign Brief Setup
        </h2>
        <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs md:text-sm text-slate-600 dark:text-slate-300 break-words">
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
            <div className="relative">
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                required
                className="w-full max-w-full appearance-none rounded-lg border-2 border-slate-200 bg-white px-3 sm:px-4 md:px-4 py-2 sm:py-2.5 md:py-3 text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 dark:border-slate-600 dark:bg-slate-800/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all shadow-sm hover:border-slate-300 dark:hover:border-slate-500 cursor-pointer box-border pr-10"
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
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
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
                    ? "bg-blue-600 text-white"
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
            <div className="relative">
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full max-w-full appearance-none rounded-lg border-2 border-slate-200 bg-white px-3 sm:px-4 md:px-4 py-2 sm:py-2.5 md:py-3 text-[10px] sm:text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 dark:border-slate-600 dark:bg-slate-800/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all shadow-sm hover:border-slate-300 dark:hover:border-slate-500 cursor-pointer box-border pr-10"
              >
                <option value="">Select...</option>
                <option value="small">Small ($1K-$10K)</option>
                <option value="medium">Medium ($10K-$50K)</option>
                <option value="large">Large ($50K-$200K)</option>
                <option value="enterprise">Enterprise ($200K+)</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="submit"
            className="w-full sm:w-auto rounded-lg bg-blue-600 px-6 py-3 sm:py-2.5 text-sm font-medium text-white shadow hover:bg-blue-500 active:bg-blue-700 touch-manipulation"
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

