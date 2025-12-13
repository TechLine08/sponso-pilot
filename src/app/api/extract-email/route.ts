import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Basic email regex + we also run a de-obfuscator
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// Pages we'll try in addition to the homepage (expanded list)
const HINT_PATHS = [
  "contact",
  "contacts",
  "contact-us",
  "contactus",
  "get-in-touch",
  "getintouch",
  "reach-out",
  "reachout",
  "connect",
  "connect-with-us",
  "about",
  "about-us",
  "aboutus",
  "team",
  "leadership",
  "management",
  "people",
  "staff",
  "impressum",
  "legal",
  "privacy",
  "sponsor",
  "sponsorship",
  "sponsors",
  "partners",
  "partnership",
  "partnerships",
  "support",
  "help",
  "press",
  "media",
  "press-kit",
  "newsroom",
  "careers",
  "jobs",
  "join-us",
  "joinus",
  "careers/contact",
];

const BAD_EMAIL_SUBSTRINGS = [
  "example.com",
  "test.com",
  "mail.acme.com",
  "acme.com",
];

// Known third-party service domains to exclude
const THIRD_PARTY_DOMAINS = [
  "google.com",
  "gmail.com",
  "microsoft.com",
  "msft.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "paddle.com",
  "stripe.com",
  "paypal.com",
  "hcaptcha.com",
  "recaptcha.com",
  "wordpress.org",
  "wordpress.com",
  "vgwort.de",
  "facebook.com",
  "twitter.com",
  "linkedin.com",
  "instagram.com",
  "youtube.com",
  "github.com",
  "npmjs.com",
  "cloudflare.com",
  "amazonaws.com",
  "sentry.io",
  "analytics.google.com",
  "googletagmanager.com",
  "doubleclick.net",
  "adservice.google",
  "facebook.net",
  "twitter.com",
  "pinterest.com",
  "tiktok.com",
  "snapchat.com",
  "mailchimp.com",
  "sendgrid.com",
  "mailgun.com",
  "postmarkapp.com",
  "mandrill.com",
  "zendesk.com",
  "intercom.com",
  "drift.com",
  "hubspot.com",
  "salesforce.com",
  "shopify.com",
  "woocommerce.com",
  "bigcommerce.com",
  "squarespace.com",
  "wix.com",
  "typeform.com",
  "formspree.io",
  "form.io",
  "jotform.com",
  "123formbuilder.com",
];

function isThirdPartyEmail(email: string): boolean {
  const emailDomain = email.split("@").pop()?.toLowerCase() || "";
  return THIRD_PARTY_DOMAINS.some(domain => 
    emailDomain === domain || emailDomain.endsWith(`.${domain}`)
  );
}

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

function extractEmailsFromHtml(html: string, companyHost?: string) {
  const emails = new Set<string>();

  // 1) mailto: links (highest priority) - be more permissive
  for (const m of html.matchAll(/mailto:([^"' >?&]+)/gi)) {
    try {
      const decoded = decodeURIComponent(m[1]);
      const cleaned = deobfuscate(decoded).toLowerCase().trim();
      if (cleaned && EMAIL_REGEX.test(cleaned) && !isThirdPartyEmail(cleaned)) {
        // If we have company host, prioritize domain matches
        if (!companyHost || sameOrgDomain(cleaned, companyHost)) {
          emails.add(cleaned);
        }
      }
    } catch {
      // Skip invalid mailto links
    }
  }

  // 2) data-email, email attributes, and other data attributes
  for (const m of html.matchAll(/(?:data-)?(?:email|contact-email|support-email)=["']([^"']+)["']/gi)) {
    const cleaned = deobfuscate(m[1]).toLowerCase().trim();
    if (cleaned && EMAIL_REGEX.test(cleaned) && !isThirdPartyEmail(cleaned)) {
      if (!companyHost || sameOrgDomain(cleaned, companyHost)) {
        emails.add(cleaned);
      }
    }
  }

  // 3) Look for common patterns like "Email: contact@example.com" or "contact us: email@example.com"
  // Only in visible text content, not in scripts
  for (const m of html.matchAll(/(?:email|e-mail|contact|reach|write|send)[\s:]+(?:us|to)?[\s:]*([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi)) {
    const cleaned = deobfuscate(m[1]).toLowerCase().trim();
    if (cleaned && EMAIL_REGEX.test(cleaned) && !isThirdPartyEmail(cleaned)) {
      if (!companyHost || sameOrgDomain(cleaned, companyHost)) {
        emails.add(cleaned);
      }
    }
  }

  // 4) Visible strings (including obfuscated) - look in text content areas
  // Remove script and style tags first to avoid third-party service emails
  const cleanedHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                          .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  const deob = deobfuscate(cleanedHtml);
  const found = deob.match(EMAIL_REGEX);
  if (found) {
    found.forEach((e) => {
      const cleaned = e.toLowerCase().trim();
      if (cleaned && EMAIL_REGEX.test(cleaned) && !isThirdPartyEmail(cleaned)) {
        // Only add if it matches the company domain
        if (companyHost && sameOrgDomain(cleaned, companyHost)) {
          emails.add(cleaned);
        }
      }
    });
  }

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
  
  // Exact match
  if (emailDomain === cleanHost) return true;
  
  // Common mail subdomains
  const mailSubdomains = ["mail", "email", "contact", "info", "hello", "support", "sales"];
  for (const sub of mailSubdomains) {
    if (emailDomain === `${sub}.${cleanHost}`) return true;
  }
  
  // Check if it's a subdomain of the main domain (e.g., company.com and mail.company.com)
  if (emailDomain.endsWith(`.${cleanHost}`)) return true;
  
  return false;
}
function brandMatch(email: string, host: string) {
  const token = brandToken(host);
  if (!token || token.length < 4) return false;
  const emailDomain = email.split("@").pop()?.toLowerCase() || "";
  return emailDomain.includes(token);
}

function isValidEmailFormat(email: string): boolean {
  // More strict validation
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  if (!emailRegex.test(email)) return false;
  
  // Reject common invalid patterns
  const invalidPatterns = [
    /example\.(com|org|net)/i,
    /test\.(com|org|net)/i,
    /noreply/i,
    /no-reply/i,
    /donotreply/i,
    /@localhost/i,
    /@test/i,
    /\.local$/i,
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(email));
}

function rankAndFilterEmails(emails: string[], host: string, strictDomainMatch: boolean = true) {
  // First filter out third-party emails and invalid formats
  const unique = uniq(
    emails.filter((e) => 
      !isBad(e) && 
      isValidEmailFormat(e) && 
      !isThirdPartyEmail(e)
    )
  );
  
  if (unique.length === 0) return [];
  
  // Filter to only domain-matching emails (strict by default)
  const domainMatches = unique.filter((e) => sameOrgDomain(e, host));
  
  if (domainMatches.length > 0) {
    // Sort domain matches by business email preference
    return domainMatches.sort((a, b) => {
      const aScore = isBusinessEmail(a) ? 1 : 0;
      const bScore = isBusinessEmail(b) ? 1 : 0;
      return bScore - aScore;
    });
  }
  
  // If no domain matches and not strict, show all (but still filtered for third-party)
  if (!strictDomainMatch) {
    return unique.sort((a, b) => {
      const aScore =
        (sameOrgDomain(a, host) ? 20 : 0) +
        (brandMatch(a, host) ? 5 : 0) +
        (isBusinessEmail(a) ? 2 : 0);
      const bScore =
        (sameOrgDomain(b, host) ? 20 : 0) +
        (brandMatch(b, host) ? 5 : 0) +
        (isBusinessEmail(b) ? 2 : 0);
      return bScore - aScore;
    });
  }
  
  // Strict mode with no domain matches: return empty
  return [];
}

function isBusinessEmail(email: string): boolean {
  // Prefer emails that look like business contacts
  const businessPatterns = [
    /^(contact|info|hello|hi|support|sales|business|partnership|sponsor)/i,
    /@.*\.(com|org|net|co\.|io|ai)$/i,
  ];
  return businessPatterns.some(pattern => pattern.test(email));
}

async function searchLinkedIn(companyName: string, domain: string) {
  // Try to find LinkedIn company page and extract contact info
  // Note: LinkedIn's public pages are limited, but we can try
  const linkedInSearchUrl = `https://www.linkedin.com/company/${domain.replace(/\./g, "-")}`;
  const emails: { email: string; source: string }[] = [];
  
  try {
    // Try to find company LinkedIn page
    // In a real implementation, you might use LinkedIn API or scraping
    // For now, we'll return empty as LinkedIn requires authentication
    // This is a placeholder for future enhancement
  } catch {
    // LinkedIn search failed
  }
  
  return emails;
}

export async function POST(req: Request) {
  try {
    const { domains, includeLinkedIn, strictDomainMatch = true } = await req.json();
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
    const CONCURRENCY = 4; // Reduced for better reliability

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
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(15000), // 15s timeout
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const html = await res.text();

        // Record final origin after redirects (important for brand/host logic)
        let finalOrigin = origin;
        try {
          finalOrigin = new URL(res.url).origin;
        } catch {}

        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const companyName = titleMatch?.[1]?.trim();

        // Get the host for domain matching
        const host = new URL(finalOrigin).hostname;

        const homepageEmails = extractEmailsFromHtml(html, host).map((e) => ({
          email: e,
          source: finalOrigin,
        }));

        // 2) try more likely subpages (increased to 12 for better coverage)
        const links = collectLikelyLinks(finalOrigin, html).slice(0, 12);
        const subEmails: { email: string; source: string }[] = [];
        for (const url of links) {
          try {
            const r = await fetch(url, {
              headers: {
                "user-agent": "Mozilla/5.0 (compatible; SponsoPilotEmailFinder/1.2)",
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              },
              redirect: "follow",
              signal: AbortSignal.timeout(10000), // 10s timeout per page
            });
            if (r.ok) {
              const h = await r.text();
              // Get host for domain matching
              const host = new URL(finalOrigin).hostname;
              const found = extractEmailsFromHtml(h, host).map((e) => ({
                email: e,
                source: url,
              }));
              subEmails.push(...found);
            }
            await new Promise((r) => setTimeout(r, 300)); // polite pause
          } catch {
            // ignore subpage errors
          }
        }

        // 3) Try LinkedIn if enabled (placeholder for now)
        let linkedInEmails: { email: string; source: string }[] = [];
        if (includeLinkedIn && companyName) {
          linkedInEmails = await searchLinkedIn(companyName, host);
        }

        const all = [...homepageEmails, ...subEmails, ...linkedInEmails];

        // Filter + rank using final host (prioritize domain-matching emails)
        const host = new URL(finalOrigin).hostname;
        const ranked = rankAndFilterEmails(all.map((x) => x.email), host, strictDomainMatch);

        // Re-map to include first-seen source for each email
        const withSource: { email: string; source: string }[] = [];
        const seen = new Set<string>();
        for (const e of ranked) {
          if (seen.has(e)) continue;
          seen.add(e);
          const src = all.find((x) => x.email === e)?.source ?? finalOrigin;
          withSource.push({ email: e, source: src });
        }

        // Only include results if we found at least one email (or if we want to show empty results)
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
