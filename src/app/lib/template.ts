// Simple variable replacement for [[Variable Name]] tokens
// Usage: renderTemplate("Hi [[Company Name]]", { "Company Name": "Reebok" })

export function renderTemplate(template: string, vars: Record<string, string>) {
  if (!template) return template;

  // Normalize keys so you can pass "companyName" or "Company Name"
  const norm = (s: string) => s.toLowerCase().replace(/[_\s-]+/g, " ").trim();

  // Build a map of normalized keys → values
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(vars || {})) {
    map.set(norm(k), v ?? "");
  }

  // Replace [[Variable Name]] tokens in the text
  return template.replace(/\[\[\s*([^\]]+?)\s*\]\]/g, (_, rawKey) => {
    const key = norm(String(rawKey));
    return map.get(key) ?? `[[${rawKey}]]`; // Leave token if not found
  });
}
