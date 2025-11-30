import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Basic email regex + we also run a de-obfuscator
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// Pages we’ll try in addition to the homepage (kept small for free-tier)
const HINT_PATHS = [
  "contact",
  "contacts",
  "about",
  "team",
  "impressum",
  "sponsor",
  "sponsorship",
  "partners",
  "partnership",
  "support",
];

const BAD_EMAIL_SUBSTRINGS = [
  "example.com",
  "test.com",
  "mail.acme.com",
  "acme.com",
];

function normaliseOrigin(input: string) {
  let d = input.trim();
  if (!d) return null;
  if (!/^https?:\/\//i.test(d)) d = "https://" + d;
  try {
    const u = new URL(d);
    return u.origin;
  } catch {
    return null;
  }
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function isBad(email: string) {
  const e = email.toLowerCase();
  return BAD_EMAIL_SUBSTRINGS.some((bad) => e.includes(bad));
}

function deobfuscate(raw: string) {
  let s = raw;

  // Common obfuscations
  s = s.replace(/\s*\[at\]\s*/gi, "@");
  s = s.replace(/\s*\(at\)\s*/gi, "@");
  s = s.replace(/\s+at\s+/gi, "@");

  s = s.replace(/\s*\[dot\]\s*/gi, ".");
  s = s.replace(/\s*\(dot\)\s*/gi, ".");
  s = s.replace(/\s+dot\s+/gi, ".");

  // HTML entity encoded @ and .
  s = s.replace(/&#64;|&commat;/gi, "@");
  s = s.replace(/&#46;|&period;/gi, ".");

  // zero-width chars
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");

  return s;
}

function extractEmailsFromHtml(html: string) {
  const emails = new Set<string>();

  // 1) mailto:
  for (const m of html.matchAll(/mailto:([^"' >]+)/gi)) {
    const decoded = decodeURIComponent(m[1]);
    const cleaned = deobfuscate(decoded);
    const found = cleaned.match(EMAIL_REGEX);
    if (found) found.forEach((e) => emails.add(e));
  }

  // 2) visible strings (including obfuscated)
  const deob = deobfuscate(html);
  const found = deob.match(EMAIL_REGEX);
  if (found) found.forEach((e) => emails.add(e));

  return Array.from(emails);
}

function collectLikelyLinks(origin: string, html: string) {
  const links = new Set<string>();
  const base = new URL(origin);

  // Extract anchor hrefs
  for (const m of html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = m[1];
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

    let url: URL | null = null;
    try {
      url = new URL(href, base);
    } catch {
      url = null;
    }
    if (!url) continue;

    const path = url.pathname.toLowerCase();
    if (HINT_PATHS.some((p) => path.includes(p))) {
      links.add(url.toString());
    }
  }

  // Also try direct hints at root
  HINT_PATHS.forEach((p) => links.add(`${origin}/${p}`));
  return Array.from(links);
}

// Prefer emails on the same org domain; then those containing the brand token
function brandToken(host: string) {
  return host.replace(/^www\./, "").split(".")[0].toLowerCase(); // e.g. hyrox from hyroxsingapore.com
}
function sameOrgDomain(email: string, host: string) {
  const cleanHost = host.replace(/^www\./, "").toLowerCase();
  const emailDomain = email.split("@").pop()?.toLowerCase() || "";
  return (
    emailDomain === cleanHost ||
    emailDomain === `mail.${cleanHost}`
  );
}
function brandMatch(email: string, host: string) {
  const token = brandToken(host);
  if (!token || token.length < 4) return false;
  const emailDomain = email.split("@").pop()?.toLowerCase() || "";
  return emailDomain.includes(token);
}

function rankAndFilterEmails(emails: string[], host: string) {
  const unique = uniq(
    emails.filter((e) => !isBad(e))
  );
  // Score: same-domain first, then brand-match, then others
  return unique.sort((a, b) => {
    const aScore =
      (sameOrgDomain(a, host) ? 2 : 0) + (brandMatch(a, host) ? 1 : 0);
    const bScore =
      (sameOrgDomain(b, host) ? 2 : 0) + (brandMatch(b, host) ? 1 : 0);
    return bScore - aScore;
  });
}

export async function POST(req: Request) {
  try {
    const { domains } = await req.json();
    if (!Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No domains provided." },
        { status: 400 }
      );
    }

    const results: Array<{
      domain: string; // final origin after redirects
      companyName?: string;
      contacts: { email: string; source: string }[];
    }> = [];

    const queue = [...domains];
    const CONCURRENCY = 6;

    async function processOne(raw: string) {
      const origin = normaliseOrigin(raw);
      if (!origin) {
        results.push({ domain: raw, contacts: [] });
        return;
      }

      try {
        // 1) fetch homepage
        const res = await fetch(origin, {
          headers: {
            "user-agent": "Mozilla/5.0 (compatible; SponsoPilotEmailFinder/1.2)",
          },
          redirect: "follow",
        });
        const html = await res.text();

        // Record final origin after redirects (important for brand/host logic)
        let finalOrigin = origin;
        try {
          finalOrigin = new URL(res.url).origin;
        } catch {}

        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const companyName = titleMatch?.[1]?.trim();

        const homepageEmails = extractEmailsFromHtml(html).map((e) => ({
          email: e,
          source: finalOrigin,
        }));

        // 2) try a few likely subpages
        const links = collectLikelyLinks(finalOrigin, html).slice(0, 3);
        const subEmails: { email: string; source: string }[] = [];
        for (const url of links) {
          try {
            const r = await fetch(url, {
              headers: {
                "user-agent": "Mozilla/5.0 (compatible; SponsoPilotEmailFinder/1.2)",
              },
              redirect: "follow",
            });
            const h = await r.text();
            const found = extractEmailsFromHtml(h).map((e) => ({
              email: e,
              source: url,
            }));
            subEmails.push(...found);
            await new Promise((r) => setTimeout(r, 120)); // polite pause
          } catch {
            // ignore subpage errors
          }
        }

        const all = [...homepageEmails, ...subEmails];

        // Filter + rank using final host
        const host = new URL(finalOrigin).hostname;
        const ranked = rankAndFilterEmails(all.map((x) => x.email), host);

        // Re-map to include first-seen source for each email
        const withSource: { email: string; source: string }[] = [];
        const seen = new Set<string>();
        for (const e of ranked) {
          if (seen.has(e)) continue;
          seen.add(e);
          const src = all.find((x) => x.email === e)?.source ?? finalOrigin;
          withSource.push({ email: e, source: src });
        }

        results.push({
          domain: finalOrigin,
          companyName,
          contacts: withSource,
        });
      } catch {
        results.push({ domain: origin, contacts: [] });
      }
    }

    async function worker() {
      while (queue.length) {
        const d = queue.shift()!;
        await processOne(d);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, domains.length) }, worker)
    );

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
