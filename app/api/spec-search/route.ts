import { NextRequest, NextResponse } from "next/server";
import { Hyperbrowser } from "@hyperbrowser/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    for (const response of responses as Array<{ data?: { results?: Array<{ title?: string; url?: string; description?: string; snippet?: string }> }; results?: Array<{ title?: string; url?: string; description?: string; snippet?: string }> }>) {
      const results = response.data?.results ?? response.results ?? [];
      for (const item of results) {
        if (!item.url || !/^https?:\/\//i.test(item.url)) continue;
        if (collected.some((known) => known.url === item.url)) continue;
        collected.push({ title: String(item.title || item.url).slice(0, 220), url: item.url, description: String(item.description || item.snippet || "").slice(0, 500) });
      }
    }
    return NextResponse.json({ results: collected.slice(0, 8) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Hyperbrowser search failed." }, { status: 502 });
  }
}
