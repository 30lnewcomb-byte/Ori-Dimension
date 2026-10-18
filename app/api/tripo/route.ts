import { NextRequest, NextResponse } from "next/server";
import comparisonObjects from "../../../data/comparison-objects.json";

export const runtime = "nodejs";
export const maxDuration = 60;

type ComparisonObject = {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  note: string;
  prompt: string;
  material: string;
  color: string;
  detail: string;
  pose: string;
};

/**
 * Prompt template variables Ori can swap without rewriting the whole prompt:
 * {{OBJECT_DESCRIPTION}}, {{MATERIAL}}, {{COLOR}}, {{DETAIL}}, {{POSE}},
 * {{WIDTH_MM}}, {{HEIGHT_MM}}, and {{DEPTH_MM}}.
 * Dimensions are X (width), Y (vertical height), Z (depth), all in millimetres.
 */
const OBJECT_PROMPT_TEMPLATE = [
  "Create one recognizable realistic 3D model of {{OBJECT_DESCRIPTION}}.",
  "Material: {{MATERIAL}}; color: {{COLOR}}; details: {{DETAIL}}.",
  "Target outer size: X width {{WIDTH_MM}} mm, Y height {{HEIGHT_MM}} mm, Z depth {{DEPTH_MM}} mm.",
  "Orientation: {{POSE}}. Preserve ordinary proportions and a clear silhouette.",
  "Only the single object; no people, extra objects, environment, ground plane, text, logos, or separate pedestal.",
  "Centered product-model view; lowest point at ground level. Dimensions are authoritative for the viewer's final scale."
].join(" ");

const OBJECTS = comparisonObjects as ComparisonObject[];

function buildObjectPrompt(object: ComparisonObject): string {
  const variables: Record<string, string> = {
    OBJECT_DESCRIPTION: object.prompt,
    MATERIAL: object.material,
    COLOR: object.color,
    DETAIL: object.detail,
    POSE: object.pose,
    WIDTH_MM: String(object.widthMm),
    HEIGHT_MM: String(object.heightMm),
    DEPTH_MM: String(object.depthMm)
  };
  const prompt = OBJECT_PROMPT_TEMPLATE.replace(/{{([A-Z_]+)}}/g, (_match, key: string) => variables[key] ?? "");
  if (prompt.length > 1024) throw new Error(`Generated Tripo prompt exceeds the 1024-character limit (${prompt.length}).`);
  return prompt;
}

function fail(message: string, status = 500, details?: string) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.TRIPO_API_KEY;
  if (!apiKey) return fail("Tripo is not connected yet. Add TRIPO_API_KEY to the Vercel project environment variables.", 503);
  let body: { plateWidthMm?: number; plateDepthMm?: number };
  try { body = await request.json(); } catch { return fail("Request body must be valid JSON.", 400); }
  const width = Number(body.plateWidthMm), depth = Number(body.plateDepthMm);
  if (!Number.isFinite(width) || !Number.isFinite(depth) || width < 50 || width > 1000 || depth < 50 || depth > 1000) {
    return fail("Build plate width and depth must each be between 50 and 1000 mm.", 400);
  }
  const plateSpan = Math.max(width, depth);
  // Compare the plate against the object's footprint, not its vertical height.
  // Keep the scale object in a useful range but permit very large references
  // (billboards, buildings, aircraft) when they genuinely help show the plate scale.
  const suitable = OBJECTS.filter((item) => {
    const footprintSpan = Math.max(item.widthMm, item.depthMm);
    const ratio = footprintSpan / plateSpan;
    return ratio >= 0.4 && ratio <= 12;
  });
  const pool = suitable.length ? suitable : [OBJECTS.reduce((best, item) => {
    const score = Math.abs(Math.log(Math.max(item.widthMm, item.depthMm) / plateSpan));
    const bestScore = Math.abs(Math.log(Math.max(best.widthMm, best.depthMm) / plateSpan));
    return score < bestScore ? item : best;
  }, OBJECTS[0])];
  // Favor objects whose footprint is closest to the plate, with a small random
  // choice among near-matches so repeated generations are not identical.
  const ranked = pool.map((item) => ({
    item,
    score: Math.abs(Math.log(Math.max(item.widthMm, item.depthMm) / plateSpan))
  })).sort((a, b) => a.score - b.score);
  const nearMatches = ranked.filter((candidate) => candidate.score <= ranked[0].score + 0.55).slice(0, 12);
  const object = nearMatches[Math.floor(Math.random() * nearMatches.length)].item;
  const prompt = buildObjectPrompt(object);
  try {
    const response = await fetch("https://openapi.tripo3d.ai/v3/generation/text-to-model", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        model: "v3.1-20260211",
        texture: true,
        pbr: true,
        auto_size: true,
        negative_prompt: "multiple objects, collage, scene, pedestal, display stand, extreme perspective, exaggerated proportions"
      }),
      signal: AbortSignal.timeout(25000)
    });
    const payload = await response.json() as { code?: number; message?: string; suggestion?: string; data?: { task_id?: string } };
    if (!response.ok || payload.code !== 0 || !payload.data?.task_id) {
      return fail(
        payload.message || "Tripo did not accept the generation request.",
        response.status >= 400 ? response.status : 502,
        payload.suggestion
      );
    }
    return NextResponse.json({ taskId: payload.data.task_id, object });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not reach Tripo.", 502);
  }
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.TRIPO_API_KEY;
  if (!apiKey) return fail("Tripo is not connected yet. Add TRIPO_API_KEY to the Vercel project environment variables.", 503);
  const taskId = request.nextUrl.searchParams.get("taskId") || "";
  if (!/^[A-Za-z0-9_-]{6,120}$/.test(taskId)) return fail("A valid Tripo task ID is required.", 400);
  try {
    const response = await fetch("https://openapi.tripo3d.ai/v3/tasks/" + encodeURIComponent(taskId), {
      headers: { "Authorization": "Bearer " + apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(15000)
    });
    const payload = await response.json() as {
      code?: number; message?: string; data?: { status?: string; progress?: number; error_message?: string; output?: { model_url?: string } }
    };
    if (!response.ok || payload.code !== 0 || !payload.data) return fail(payload.message || "Could not read Tripo task status.", response.status >= 400 ? response.status : 502);
    const task = payload.data;
    if (request.nextUrl.searchParams.get("download") === "1") {
      if (task.status !== "success" || !task.output?.model_url) return fail("Tripo has not finished this model yet.", 409);
      const modelUrl = new URL(task.output.model_url);
      if (modelUrl.protocol !== "https:" || !modelUrl.hostname.endsWith("tripo3d.ai")) return fail("Tripo returned an unexpected model URL.", 502);
      const modelResponse = await fetch(modelUrl, { cache: "no-store", signal: AbortSignal.timeout(30000) });
      if (!modelResponse.ok || !modelResponse.body) return fail("Could not download the generated GLB model.", 502);
      return new Response(modelResponse.body, { headers: { "Content-Type": "model/gltf-binary", "Cache-Control": "no-store", "Content-Disposition": 'inline; filename="ori-comparison.glb"' } });
    }
    return NextResponse.json({ status: task.status, progress: task.progress ?? 0, error: task.error_message ?? null });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not reach Tripo.", 502);
  }
}
