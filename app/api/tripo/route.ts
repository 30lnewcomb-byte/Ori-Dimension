import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ComparisonObject = {
  id: string; name: string; widthMm: number; heightMm: number; depthMm: number;
  note: string; prompt: string;
};

const OBJECTS: ComparisonObject[] = [
  { id: "mug", name: "Coffee mug", widthMm: 95, heightMm: 100, depthMm: 95, note: "Approximate everyday dimensions; mugs vary.", prompt: "a simple ceramic coffee mug with a handle" },
  { id: "book", name: "Paperback book", widthMm: 130, heightMm: 200, depthMm: 25, note: "Approximate paperback dimensions; book sizes vary.", prompt: "a single closed paperback book with a plain cover" },
  { id: "sneaker", name: "Sneaker", widthMm: 110, heightMm: 120, depthMm: 280, note: "Approximate adult sneaker dimensions; sizes vary.", prompt: "a single realistic everyday sneaker, side-facing" },
  { id: "basketball", name: "Basketball", widthMm: 240, heightMm: 240, depthMm: 240, note: "Approximate size 7 basketball diameter.", prompt: "a regulation-size orange basketball with realistic grooves" },
  { id: "laptop", name: "Laptop", widthMm: 315, heightMm: 220, depthMm: 20, note: "Approximate 14-inch laptop dimensions; models vary.", prompt: "a closed slim 14-inch laptop computer" },
  { id: "water-bottle", name: "Water bottle", widthMm: 75, heightMm: 250, depthMm: 75, note: "Approximate reusable bottle dimensions; bottles vary.", prompt: "a reusable cylindrical water bottle with a simple cap" }
];

function fail(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
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
  const suitable = OBJECTS.filter((item) => {
    const span = Math.max(item.widthMm, item.heightMm, item.depthMm);
    return span >= plateSpan * 0.45 && span <= plateSpan * 2.4;
  });
  const pool = suitable.length ? suitable : OBJECTS;
  const object = pool[Math.floor(Math.random() * pool.length)];
  const prompt = [
    "Create one realistic, clean 3D model of " + object.prompt + ".",
    "Exact intended real-world external dimensions: width " + object.widthMm + " mm, height " + object.heightMm + " mm, depth " + object.depthMm + " mm.",
    "Keep normal real-world proportions. Do not add extra objects, a scene, a pedestal, or a display stand.",
    "Center it horizontally, put the bottom at ground level, and orient its longest horizontal dimension along X.",
    "The model will be normalized to the listed external dimensions in a Three.js viewer. The dimensions are authoritative; the generated mesh is visual geometry only."
  ].join(" ");
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
    const payload = await response.json() as { code?: number; message?: string; data?: { task_id?: string } };
    if (!response.ok || payload.code !== 0 || !payload.data?.task_id) {
      return fail(payload.message || "Tripo did not accept the generation request.", response.status >= 400 ? response.status : 502);
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
