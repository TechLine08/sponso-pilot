import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Basic email regex + we also run a de-obfuscator
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?:\.[A-Z]{2,})?/gi;

// Pages we'll try in addition to the homepage (expanded list)
const HINT_PATHS = [
  "contact",
  "contacts",
  "contact-us",
  "contactus",
  "pages/contact-us",
  "pages/contact",
  "pages/support",
  "pages/customer-service",
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

function makeBrowserHeaders(origin: string) {
  return {
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "accept-language": "en-AU,en;q=0.9",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "upgrade-insecure-requests": "1",
    "referer": origin + "/",
  };
}

function looksTrashy(email: string) {
  return (
    email.startsWith("u0") ||               // u003eprivacy@...
    email.includes("@2x.") ||               // bg-info@2x.png
    email.includes(".png") ||
    email.includes(".jpg") ||
    email.includes(".svg") ||
    email.includes("your@email.com")
  );
}

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

  function extractEmailsFromHtml(html: string) {
    const emails = new Set<string>();
    const textOnly = html.replace(/<[^>]+>/g, " ");
    const foundText = textOnly.match(EMAIL_REGEX);
    if (foundText) foundText.forEach((e) => emails.add(e));

  // 1) mailto: links (highest priority)
  for (const m of html.matchAll(/mailto:([^"' >?&]+)/gi)) {
    try {
      const decoded = decodeURIComponent(m[1]);
      const cleaned = deobfuscate(decoded).toLowerCase().trim();
      if (cleaned && EMAIL_REGEX.test(cleaned)) {
        emails.add(cleaned);
      }
    } catch {
      // Skip invalid mailto links
    }
  }

  // 2) data-email, email attributes, and other data attributes
  for (const m of html.matchAll(/(?:data-)?(?:email|contact-email|support-email)=["']([^"']+)["']/gi)) {
    const cleaned = deobfuscate(m[1]).toLowerCase().trim();
    if (cleaned && EMAIL_REGEX.test(cleaned)) {
      emails.add(cleaned);
    }
  }

  // 3) Look for common patterns like "Email: contact@example.com" or "contact us: email@example.com"
  // Only in visible text content, not in scripts
  for (const m of html.matchAll(/(?:email|e-mail|contact|reach|write|send)[\s:]+(?:us|to)?[\s:]*([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi)) {
    const cleaned = deobfuscate(m[1]).toLowerCase().trim();
    if (cleaned && EMAIL_REGEX.test(cleaned)) {
      emails.add(cleaned);
    }
  }

  // 4) Visible strings (including obfuscated) - look in text content areas
  // Remove script and style tags first to avoid third-party service emails
  // But keep the content to extract emails from visible text
  const cleanedHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, ''); // Remove iframes too
  
  const deob = deobfuscate(cleanedHtml);
  const found = deob.match(EMAIL_REGEX);
  if (found) {
    found.forEach((e) => {
      const cleaned = e.toLowerCase().trim();
      // Remove any trailing punctuation that might have been captured
      const finalEmail = cleaned.replace(/[.,;:!?)\]]+$/, '');
      if (finalEmail && EMAIL_REGEX.test(finalEmail)) {
        emails.add(finalEmail);
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
  if (!email || !host) return false;
  
  const cleanHost = host.replace(/^www\./, "").toLowerCase().trim();
  const emailDomain = email.split("@").pop()?.toLowerCase().trim() || "";
  
  if (!emailDomain || !cleanHost) return false;
  
  // Exact match (e.g., contact@company.com for company.com)
  if (emailDomain === cleanHost) return true;
  
  // Common mail subdomains (e.g., mail.company.com, contact.company.com)
  const mailSubdomains = [
    "mail", "email", "contact", "info", "hello", "hi", "support", "sales", 
    "business", "partnership", "sponsor", "sponsorship", "partners",
    "press", "media", "marketing", "team", "hr", "careers", "jobs"
  ];
  for (const sub of mailSubdomains) {
    if (emailDomain === `${sub}.${cleanHost}`) return true;
  }
  
  // Check if it's a subdomain of the main domain (e.g., company.com and mail.company.com)
  if (emailDomain.endsWith(`.${cleanHost}`)) return true;
  
  // Handle multi-part TLDs (e.g., company.co.uk, company.com.au)
  // Extract the main domain part (e.g., "company" from "company.co.uk")
  const hostParts = cleanHost.split(".");
  if (hostParts.length >= 2) {
    const mainDomain = hostParts[0]; // e.g., "company"
    const tld = hostParts.slice(1).join("."); // e.g., "co.uk" or "com"
    
    // Check if email domain matches: mainDomain.tld or subdomain.mainDomain.tld
    const emailParts = emailDomain.split(".");
    if (emailParts.length >= 2) {
      const emailTld = emailParts.slice(-hostParts.length + 1).join("."); // e.g., "co.uk"
      const emailMain = emailParts[0]; // e.g., "contact" or "company"
      
      // Match like contact@company.co.uk for company.co.uk
      if (emailTld === tld && emailParts.includes(mainDomain)) {
        return true;
      }
      
      // Match like contact@mail.company.co.uk for company.co.uk
      if (emailTld === tld && emailDomain.includes(`.${mainDomain}.`)) {
        return true;
      }
    }
  }
  
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
      !isThirdPartyEmail(e) &&
      !looksTrashy(e)
    )
  );
  
  if (unique.length === 0) return [];
  
  // Filter to only domain-matching emails (strict by default)
  const domainMatches = unique.filter((e) => {
    const matches = sameOrgDomain(e, host);
    return matches;
  });
  
  // If we have domain matches, return them sorted by preference
  if (domainMatches.length > 0) {
    return domainMatches.sort((a, b) => {
      // Prefer business emails (contact, info, hello, etc.)
      const aIsBusiness = isBusinessEmail(a);
      const bIsBusiness = isBusinessEmail(b);
      if (aIsBusiness && !bIsBusiness) return -1;
      if (!aIsBusiness && bIsBusiness) return 1;
      // If both are business or both aren't, sort alphabetically
      return a.localeCompare(b);
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
    let body: any;
    try {
      body = await req.json();
    } catch (jsonError) {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    
    const { domains, includeLinkedIn, strictDomainMatch = true } = body || {};
    
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
    const CONCURRENCY = Math.min(2, domains.length); // Reduced for better reliability and to avoid rate limiting

    async function processOne(raw: string) {
      const origin = normaliseOrigin(raw);
      
      if (!origin) {
        
        results.push({ domain: raw, contacts: [] });
        return;
      }

      try {
        // 1) fetch homepage
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let res: Response;

      try {
        res = await fetch(origin, {
          headers: makeBrowserHeaders(origin),
          redirect: "follow",
          signal: controller.signal,
        });
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError?.name === "AbortError") {
          results.push({
            domain: origin,
            companyName: undefined,
            contacts: [{ email: "", source: origin, note: "timeout" }],
          } as any);
          return;
        }

        results.push({
          domain: origin,
          companyName: undefined,
          contacts: [{ email: "", source: origin, note: "unreachable" }],
        } as any);
        return;
      } finally {
        clearTimeout(timeoutId);
      }

      console.log(
        "[EMAIL EXTRACT]",
        "URL:", origin,
        "STATUS:", res.status,
        "FINAL URL:", res.url
      );

      const statusToNote = (status: number) => {
        if (status >= 200 && status < 300) return "ok";
        if (status === 301 || status === 302 || status === 307 || status === 308) return "redirected";
        if (status === 400) return "bad_request";
        if (status === 401) return "unauthorized";
        if (status === 403) return "forbidden";
        if (status === 404) return "not_found";
        if (status === 408) return "timeout";
        if (status === 409) return "conflict";
        if (status === 410) return "gone";
        if (status === 418) return "blocked";
        if (status === 429) return "rate_limited";
        if (status >= 400 && status < 500) return "client_error";
        if (status >= 500) return "server_error";
        return "unknown_error";
      };

      console.log(
        "[EMAIL EXTRACT]",
        "URL:", origin,
        "STATUS:", res.status,
        "FINAL URL:", res.url
      );


      if (!res.ok) {
        results.push({
          domain: origin,
          companyName: undefined,
          contacts: [{ email: "", source: origin, note: statusToNote(res.status) }],
        } as any);
        return;
      }

      const html = await res.text();
      console.log(
        "[EMAIL EXTRACT]",
        origin,
        "HTML length:",
        html.length,
        "Contains @:",
        html.includes("@")
      );


        // Record final origin after redirects (important for brand/host logic)
        let finalOrigin = origin;
        try {
          finalOrigin = new URL(res.url).origin;
        } catch {}

        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const companyName = titleMatch?.[1]?.trim();

        // Get the host for domain matching
        const host = new URL(finalOrigin).hostname;

        const homepageRaw = extractEmailsFromHtml(html);

        const homepageEmails =
          homepageRaw.length === 0
            ? [{ email: "N/A", source: finalOrigin }]
            : homepageRaw.map((e) => {
                const clean = String(e ?? "")
                  .replace(/\u00A0/g, " ")
                  .replace(/[\u200B-\u200D\uFEFF]/g, "")
                  .trim();

                return { email: clean || "N/A", source: finalOrigin };
              });


        // 2) try more likely subpages (increased to 12 for better coverage)
        const links = collectLikelyLinks(finalOrigin, html).slice(0, 12);
        const subEmails: { email: string; source: string }[] = [];
        for (const url of links) {
          try {
            const subController = new AbortController();
            const subTimeoutId = setTimeout(() => {
              subController.abort();
            }, 10000);
            
            let r: Response;
            try {
              r = await fetch(url, {
                    headers: makeBrowserHeaders(finalOrigin),
                    redirect: "follow",
                    signal: subController.signal,
                  });

              clearTimeout(subTimeoutId);
            } catch (fetchError: any) {
              clearTimeout(subTimeoutId);
              if (fetchError.name === 'AbortError') {
                continue; // Skip timeout errors
              }
              continue; // Skip other fetch errors
            }
            
            if (r.ok) {
              try {
                const h = await r.text();
                const foundRaw = extractEmailsFromHtml(h);

                const found =
                  foundRaw.length === 0
                    ? [{ email: "N/A", source: url }]
                    : foundRaw.map((e) => {
                        const clean = String(e ?? "")
                          .replace(/\u00A0/g, " ")
                          .replace(/[\u200B-\u200D\uFEFF]/g, "")
                          .trim();

                        return { email: clean || "N/A", source: url };
                      });

                subEmails.push(...found);
              } catch (textError) {
                // Skip if we can't read the text
                continue;
              }
            }
            await new Promise((r) => setTimeout(r, 300)); // polite pause
          } catch (subError) {
            // ignore subpage errors
            continue;
          }
        }

        // 3) Try LinkedIn if enabled (placeholder for now)
        let linkedInEmails: { email: string; source: string }[] = [];
        if (includeLinkedIn && companyName) {
          linkedInEmails = await searchLinkedIn(companyName, host);
        }

        const all = [...homepageEmails, ...subEmails, ...linkedInEmails];
        // Debuging raw emails
        const rawEmails = all.map((x) => x.email);

        console.log(
          "[EMAIL EXTRACT]",
          origin,
          "RAW count:",
          rawEmails.length,
          "RAW sample:",
          rawEmails.slice(0, 20)
        );

        const ranked = rankAndFilterEmails(
          all.map((x) => x.email),
          host,
          strictDomainMatch
        );

        const contacts: { email: string; source: string }[] = [];
        const seen = new Set<string>();

        for (const email of ranked) {
          if (seen.has(email)) continue;
          seen.add(email);

          const src = all.find((x) => x.email === email)?.source ?? finalOrigin;
          contacts.push({ email, source: src });
        }

        if (contacts.length === 0) {
          contacts.push({
            email: "N/A",
            source: finalOrigin,
          });
        }

        results.push({
          domain: finalOrigin,
          companyName,
          contacts,
        });

      } catch (err: any) {
        // Log error for debugging but don't fail the entire request
        console.error(`Error processing ${origin}:`, err?.message || err);
        results.push({ domain: origin, contacts: [] });
      }
    }

    async function worker() {
      while (queue.length > 0) {
        const d = queue.shift();
        if (d) {
          try {
            await processOne(d);
          } catch (workerError: any) {
            console.error("Worker error processing domain:", workerError?.message || workerError);
            // Continue processing other domains
          }
        }
      }
    }

    // Process domains with limited concurrency
    const workerCount = Math.min(CONCURRENCY, domains.length);
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers).catch((err) => {
      console.error("Worker pool error:", err);
      // Continue anyway - some results might be available
    });

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    console.error("Extract email error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}