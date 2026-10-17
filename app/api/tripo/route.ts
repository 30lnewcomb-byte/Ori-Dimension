import { NextRequest, NextResponse } from "next/server";

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
  "Create one clean, recognizable, realistic 3D model of {{OBJECT_DESCRIPTION}}.",
  "Material: {{MATERIAL}}. Main color: {{COLOR}}. Surface/detail level: {{DETAIL}}.",
  "Real-world external dimensions are authoritative: width {{WIDTH_MM}} mm on X, height {{HEIGHT_MM}} mm on Y, depth {{DEPTH_MM}} mm on Z.",
  "Pose and orientation: {{POSE}}. Keep ordinary real-world proportions and a clear, familiar silhouette.",
  "Show only the object itself. No extra objects, hands, people, packaging, environment, text, labels, pedestal, display stand, or ground plane.",
  "Use a centered, single-object product-model composition with the lowest point at ground level.",
  "The viewer will fit the final mesh to the specified width, height, and depth. Prioritize recognizable shape and believable details; do not exaggerate proportions."
].join(" ");

const OBJECTS: ComparisonObject[] = [
  { id: "mug", name: "Coffee mug", widthMm: 95, heightMm: 100, depthMm: 95, note: "Approximate everyday dimensions; mugs vary.", prompt: "a plain everyday coffee mug with one curved handle and a visible open rim", material: "glazed ceramic", color: "muted blue-gray", detail: "smooth glaze, simple handle, clearly hollow rim", pose: "upright, handle turned slightly to the right" },
  { id: "book", name: "Paperback book", widthMm: 130, heightMm: 25, depthMm: 200, note: "Approximate paperback dimensions; book sizes vary.", prompt: "one closed paperback book with a simple blank cover", material: "matte paper and thin card", color: "deep navy blue", detail: "slightly rounded page block and subtle page edges, no readable text", pose: "lying flat with the front cover facing upward" },
  { id: "sneaker", name: "Sneaker", widthMm: 110, heightMm: 120, depthMm: 280, note: "Approximate adult sneaker dimensions; shoe sizes vary.", prompt: "one everyday low-top lace-up sneaker", material: "fabric, rubber, and synthetic trim", color: "white and charcoal gray", detail: "distinct sole, laces, tongue, and heel; avoid logos", pose: "resting naturally on its sole, toe pointing along the depth axis" },
  { id: "basketball", name: "Basketball", widthMm: 240, heightMm: 240, depthMm: 240, note: "Approximate size 7 basketball diameter.", prompt: "one regulation-size basketball with curved panel seams", material: "textured rubber", color: "classic orange with dark seams", detail: "even spherical shape and clear recessed seam lines", pose: "a single sphere centered at ground level" },
  { id: "laptop", name: "Laptop", widthMm: 315, heightMm: 20, depthMm: 220, note: "Approximate closed 14-inch laptop footprint; models vary.", prompt: "one closed slim 14-inch laptop computer", material: "brushed aluminum and glass", color: "dark silver", detail: "thin lid, precise rounded corners, restrained ports; no logos or text", pose: "closed and lying flat, lid facing upward" },
  { id: "water-bottle", name: "Water bottle", widthMm: 75, heightMm: 250, depthMm: 75, note: "Approximate reusable bottle dimensions; bottles vary.", prompt: "one reusable cylindrical water bottle with a screw cap", material: "matte reusable plastic", color: "smoky blue", detail: "simple cap and subtle shoulder transition, no label", pose: "standing upright on its flat base" },
  { id: "soda-can", name: "Soda can", widthMm: 66, heightMm: 122, depthMm: 66, note: "Approximate standard 355 mL can dimensions.", prompt: "one standard 355 mL aluminum drink can", material: "painted aluminum", color: "plain red and silver", detail: "recognizable rolled top rim and indented base, no branding or text", pose: "standing upright" },
  { id: "smartphone", name: "Smartphone", widthMm: 72, heightMm: 9, depthMm: 150, note: "Approximate modern smartphone size; models vary.", prompt: "one modern unbranded smartphone with a flat glass screen", material: "glass and anodized metal", color: "graphite black", detail: "thin rounded rectangular slab, subtle camera lenses, blank screen with no icons or text", pose: "lying flat with its screen facing upward" },
  { id: "computer-mouse", name: "Computer mouse", widthMm: 65, heightMm: 40, depthMm: 110, note: "Approximate standard computer mouse dimensions.", prompt: "one simple ergonomic two-button computer mouse with a scroll wheel", material: "matte plastic", color: "charcoal gray", detail: "clear left and right buttons, centered scroll wheel, no logo or cable", pose: "resting flat with the buttons facing upward" },
  { id: "tennis-ball", name: "Tennis ball", widthMm: 67, heightMm: 67, depthMm: 67, note: "Approximate standard tennis ball diameter.", prompt: "one regulation tennis ball with its curved felt seam", material: "short fuzzy felt over rubber", color: "bright tennis yellow-green", detail: "clean spherical silhouette and one curved seam", pose: "single sphere centered at ground level" },
  { id: "orange", name: "Orange", widthMm: 78, heightMm: 78, depthMm: 78, note: "Representative medium orange; fruit varies.", prompt: "one medium whole orange with a tiny stem scar", material: "natural citrus peel", color: "orange", detail: "subtle dimpled peel and gently irregular natural sphere, no leaves", pose: "resting naturally, centered at ground level" },
  { id: "banana", name: "Banana", widthMm: 35, heightMm: 35, depthMm: 180, note: "Representative medium banana; fruit varies.", prompt: "one whole medium banana with a gentle natural curve", material: "natural fruit peel", color: "yellow with subtle green near the stem", detail: "tapered ends and a smooth gentle curve, no bunch and no extra fruit", pose: "lying on its side, curve clearly visible" },
  { id: "game-controller", name: "Game controller", widthMm: 155, heightMm: 60, depthMm: 100, note: "Approximate standard game controller dimensions; models vary.", prompt: "one unbranded modern game controller with two thumbsticks and a simple button layout", material: "matte molded plastic", color: "black with subtle gray controls", detail: "recognizable grips, thumbsticks, and buttons; no logos or readable labels", pose: "resting naturally with buttons and thumbsticks facing upward" },
  { id: "dice", name: "Six-sided die", widthMm: 16, heightMm: 16, depthMm: 16, note: "Approximate standard tabletop die size.", prompt: "one traditional six-sided gaming die with recessed pips", material: "smooth molded plastic", color: "ivory white with black pips", detail: "clean cube, softly rounded edges, correctly placed pips, no extra dice", pose: "resting on one flat face" },
  { id: "tv-remote", name: "TV remote", widthMm: 45, heightMm: 25, depthMm: 180, note: "Approximate everyday TV remote dimensions.", prompt: "one simple television remote control with a few distinct raised buttons", material: "matte plastic", color: "black", detail: "long rounded body and simple button groups; no logos or readable text", pose: "lying flat with buttons facing upward" },
  { id: "credit-card", name: "Bank card", widthMm: 85.6, heightMm: 0.8, depthMm: 54, note: "Standard card footprint; thickness is visually exaggerated only if needed for legibility.", prompt: "one plain blank bank-card-shaped plastic card with rounded corners", material: "matte plastic", color: "dark blue", detail: "flat rectangular card with subtly rounded corners, no chip, numbers, logo, or text", pose: "lying perfectly flat" }
];

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
  return OBJECT_PROMPT_TEMPLATE.replace(/{{([A-Z_]+)}}/g, (_match, key: string) => variables[key] ?? "");
}

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
  // Compare the plate against the object's footprint, not its vertical height.
  const suitable = OBJECTS.filter((item) => {
    const footprintSpan = Math.max(item.widthMm, item.depthMm);
    return footprintSpan >= plateSpan * 0.45 && footprintSpan <= plateSpan * 2.4;
  });
  const pool = suitable.length ? suitable : OBJECTS;
  const object = pool[Math.floor(Math.random() * pool.length)];
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
