export type Company = {
  name: string;
  email: string;
  industry?: string;
  notes?: string;
  reasoning?: string; // Why this company should sponsor
};

export type SendLog = {
  id: string;               // email or generated id
  company: Company;
  status: "success" | "fail";
  message: string;          // provider id or error text
  timestamp: string;        // ISO
};

export type User = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
};

export type Session = {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  };
};

export type CampaignBrief = {
  eventName: string;
  eventType: string; // e.g., "conference", "workshop", "webinar", "festival", "sports event", etc.
  description: string;
  targetAudience: string;
  goals: string; // What they want to achieve
  industryPreferences: string[]; // Preferred industries to target
  budget: string; // e.g., "small", "medium", "large", "enterprise"
  location: string;
  date: string;
  expectedAttendees: string;
  valueProposition: string; // What sponsors get
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectData = {
  companies: Company[];
  reasoning: Record<string, string>; // email -> reasoning
  logs: SendLog[];
  emailTemplate: {
    from: string;
    subject: string;
    body: string;
  };
};
