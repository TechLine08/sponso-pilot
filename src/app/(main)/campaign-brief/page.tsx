"use client";

import { useEffect, useState } from "react";
import type { CampaignBrief } from "@/types";
import { useToast } from "@/components/Toast";
import CampaignBriefSetup from "@/components/CampaignBriefSetup";
import CampaignBriefDisplay from "@/components/CampaignBriefDisplay";

export default function CampaignBriefPage() {
  const [brief, setBrief] = useState<CampaignBrief | null>(null);
  const [showBriefSetup, setShowBriefSetup] = useState(false);
  const toast = useToast();

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

  return (
    <div className="space-y-4 sm:space-y-6">
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
    </div>
  );
}

