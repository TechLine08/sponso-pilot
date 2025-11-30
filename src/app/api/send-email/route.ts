import { NextResponse } from "next/server";
import { Resend } from "resend";
import { renderTemplate } from "@/app/lib/template";
import type { Company, SendLog } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Initialize Resend (expects RESEND_API_KEY in env)
const resend = new Resend(process.env.RESEND_API_KEY);

// Small delay to be polite on free tiers
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Helpers
function ok<T>(data: T, init: number = 200) {
  return NextResponse.json(data as any, { status: init });
}
function bad(message: string, code = 400) {
  return NextResponse.json({ ok: false, error: message }, { status: code });
}
function normalizeErr(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  try {
    const j = JSON.stringify(e);
    if (j.length < 800) return j;
  } catch {}
  return String(e);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // -----------------------------
    // SINGLE SEND MODE (compatible)
    // -----------------------------
    if (body?.to && body?.subject && body?.body && body?.from) {
      const personalizedHtml = renderTemplate(body.body, body.variables ?? {});
      if (body?.dryRun) {
        // no external call; good for local tests
        return ok({ ok: true, id: "dry-run", preview: personalizedHtml });
      }
      const { data, error } = await resend.emails.send({
        from: body.from,
        to: body.to,
        subject: body.subject,
        html: personalizedHtml,
      });
      if (error) return bad(normalizeErr(error), 500);
      return ok({ ok: true, id: data?.id ?? "sent" });
    }

    // -----------------------------
    // BULK / CAMPAIGN MODE
    // -----------------------------
    const {
      companies,
      subject,
      body: template,
      from,
      dryRun = false,
      batchSize = 25, // safe default
      paceMs = 250,   // delay between recipients
    } = body || {};

    if (!Array.isArray(companies) || companies.length === 0) {
      return bad("No companies provided.");
    }
    if (!subject || !template || !from) {
      return bad("Missing subject/body/from.");
    }

    const logs: SendLog[] = [];
    const groups: Company[][] = [];
    for (let i = 0; i < companies.length; i += batchSize) {
      groups.push(companies.slice(i, i + batchSize));
    }

    for (const group of groups) {
      for (const c of group as Company[]) {
        // Variables available inside templates:
        // [[Company Name]], [[Company Email]], [[Company Industry]], [[Notes]]
        const variables = {
          "Company Name": c.name,
          "Company Email": c.email,
          "Company Industry": c.industry ?? "",
          Notes: c.notes ?? "",
        };

        try {
          const html = renderTemplate(template, variables);

          if (dryRun) {
            // simulate success locally
            logs.push({
              id: `dry-${c.email}`,
              company: c,
              status: "success",
              message: "dry-run",
              timestamp: new Date().toISOString(),
            });
          } else {
            const { data, error } = await resend.emails.send({
              from,
              to: c.email,
              subject,
              html,
            });
            if (error) {
              logs.push({
                id: c.email,
                company: c,
                status: "fail",
                message: normalizeErr(error),
                timestamp: new Date().toISOString(),
              });
            } else {
              logs.push({
                id: data?.id ?? c.email,
                company: c,
                status: "success",
                message: data?.id ?? "sent",
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (e) {
          logs.push({
            id: c.email,
            company: c,
            status: "fail",
            message: normalizeErr(e),
            timestamp: new Date().toISOString(),
          });
        }

        // gentle pacing (skip if batch has only one)
        if (!dryRun && paceMs > 0) await sleep(paceMs);
      }

      // Optional: small pause between batches
      if (!dryRun && groups.length > 1) await sleep(400);
    }

    return ok({ ok: true, logs });
  } catch (e) {
    return bad(normalizeErr(e), 500);
  }
}
