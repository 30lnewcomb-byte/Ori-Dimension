import { NextRequest, NextResponse } from "next/server";
import { Hyperbrowser } from "@hyperbrowser/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

type SearchResult = { title?: string; url?: string; description?: string; snippet?: string };
type Candidate = { widthMm: number; depthMm: number; sourceTitle: string; sourceUrl: string };

export async function POST(request: NextRequest) {
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Hyperbrowser is not connected yet. Add HYPERBROWSER_API_KEY to Vercel environment variables." }, { status: 503 });
  let body: { printerName?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const printerName = String(body.printerName || "").trim().slice(0, 160);
  if (printerName.length < 2) return NextResponse.json({ error: "Enter a printer name or model." }, { status: 400 });

  try {
    const client = new Hyperbrowser({ apiKey });
    const queries = [
      printerName + " official manufacturer build volume build area dimensions",
      printerName + " build plate size manufacturer specifications"
    ];
    const responses = await Promise.all(queries.map((query) => client.web.search({ query, maxAgeSeconds: 0 })));
    const collected: Array<{ title: string; url: string; description: string }> = [];
    for (const response of responses as Array<{ data?: { results?: SearchResult[] }; results?: SearchResult[] }>) {
      for (const item of response.data?.results ?? response.results ?? []) {
        if (!item.url || !/^https?:\/\//i.test(item.url)) continue;
        if (collected.some((known) => known.url === item.url)) continue;
        collected.push({ title: String(item.title || item.url).slice(0, 220), url: item.url, description: String(item.description || item.snippet || "").slice(0, 500) });
      }
    }

    let plateCandidate: Candidate | null = null;
    for (const source of collected.slice(0, 4)) {
      try {
        const fetched = await client.web.fetch({
          url: source.url,
          outputs: {
            formats: [{
              type: "json",
              prompt: "Find the usable 3D printer build plate or printable area dimensions for the exact printer model " + printerName + ". Return widthMm and depthMm in millimetres only when the page clearly states usable X/Y build area dimensions. Never use the printer's external body dimensions. If only a build volume is listed, use its X and Y dimensions only if the page clearly identifies those as the usable print area. If the page does not verify both dimensions, return 0 for both. Include a short evidence quote and confidence (high, medium, or low).",
              schema: {
                type: "object",
                properties: {
                  widthMm: { type: "number" },
                  depthMm: { type: "number" },
                  evidence: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] }
                },
                required: ["widthMm", "depthMm", "evidence", "confidence"],
                additionalProperties: false
              }
            }]
          }
        });
        const extracted = fetched as unknown as { data?: { json?: { widthMm?: unknown; depthMm?: unknown; confidence?: unknown } } };
        const value = extracted.data?.json;
        const widthMm = Number(value?.widthMm), depthMm = Number(value?.depthMm);
        if (value?.confidence === "high" && Number.isFinite(widthMm) && Number.isFinite(depthMm) && widthMm >= 50 && widthMm <= 1000 && depthMm >= 50 && depthMm <= 1000) {
          plateCandidate = { widthMm, depthMm, sourceTitle: source.title, sourceUrl: source.url };
          break;
        }
      } catch {
        // A source that cannot be fetched or parsed remains a link, not an assumed measurement.
      }
    }
    return NextResponse.json({ results: collected.slice(0, 8), plateCandidate });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Hyperbrowser search failed." }, { status: 502 });
  }
}
