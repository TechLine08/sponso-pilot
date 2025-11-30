import type { Company } from "@/types";

const HEADER_MAP: Record<string, keyof Company> = {
  name: "name",
  email: "email",
  industry: "industry",
  notes: "notes",
};

export function parseCompanyList(input: string): {
  companies: Company[];
  errors: string[];
} {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { companies: [], errors: ["No rows found."] };

  // Detect delimiter (comma or tab)
  const delim = lines[0].includes("\t") ? "\t" : ",";

  const headerParts = lines[0]
    .split(delim)
    .map((h) => h.trim().toLowerCase());

  const headerIdx: Partial<Record<keyof Company, number>> = {};
  headerParts.forEach((h, i) => {
    if (HEADER_MAP[h]) headerIdx[HEADER_MAP[h]] = i;
  });

  const required = ["name", "email"] as const;
  const missingRequired = required.filter((k) => headerIdx[k] == null);
  if (missingRequired.length) {
    return {
      companies: [],
      errors: [
        `Missing required header(s): ${missingRequired.join(
          ", "
        )}. Expected headers: name,email[,industry,notes]`,
      ],
    };
  }

  const companies: Company[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = splitCSVLine(lines[i], delim);
    const name = parts[headerIdx.name!]?.trim() ?? "";
    const email = parts[headerIdx.email!]?.trim() ?? "";
    const industry =
      headerIdx.industry != null ? parts[headerIdx.industry] ?? "" : "";
    const notes = headerIdx.notes != null ? parts[headerIdx.notes] ?? "" : "";

    if (!name || !email) {
      errors.push(`Row ${i + 1}: missing name or email.`);
      continue;
    }
    if (!isValidEmail(email)) {
      errors.push(`Row ${i + 1}: invalid email "${email}".`);
      continue;
    }

    companies.push({ name, email, industry: industry || undefined, notes: notes || undefined });
  }

  return { companies, errors };
}

/**
 * Minimal CSV splitter supporting quoted cells (for commas/tabs inside quotes).
 */
function splitCSVLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // Toggle if next char isn't another quote (escape)
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delim && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
