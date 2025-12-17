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
