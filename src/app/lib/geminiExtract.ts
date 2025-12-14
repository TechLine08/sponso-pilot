import { GoogleGenAI } from "google-genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export type AIContact = {
  email: string | null;
  name: string | null;
  position: string | null;
  evidence: string;
  confidence: number;
  notes: string;
};

export type AIResult = {
  companyName: string | null;
  contacts: AIContact[];
  nextUrls: string[];
};

export async function aiExtractFromHtml(args: {
  html: string;
  url: string;
  host: string;
}): Promise<AIResult | null> {
  const { html, url, host } = args;

  try {
    const prompt = `
You are helping a sponsorship outreach tool.

Extract sponsorship or marketing contacts from this company's website HTML.

Return ONLY valid JSON using this schema:
{
  "companyName": string | null,
  "contacts": [
    {
      "email": string | null,
      "name": string | null,
      "position": string | null,
      "evidence": string,
      "confidence": number,
      "notes": string
    }
  ],
  "nextUrls": string[]
}

Rules:
- Prioritize sponsorship, partnerships, brand, marketing, PR, events.
- Prefer emails on the same domain as ${host}.
- If no email is shown but a role or form exists, set email = null.
- evidence must be a short exact text excerpt.
- nextUrls should be internal links worth crawling next.

HTML (truncated):
${html.slice(0, 180_000)}
`;

    const res = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    return JSON.parse(res.text || "");
  } catch {
    return null;
  }
}
