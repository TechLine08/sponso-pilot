export type Company = {
  name: string;
  email: string;
  industry?: string;
  notes?: string;
};

export type SendLog = {
  id: string;               // email or generated id
  company: Company;
  status: "success" | "fail";
  message: string;          // provider id or error text
  timestamp: string;        // ISO
};
