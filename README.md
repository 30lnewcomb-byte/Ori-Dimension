# Ori Dimension

Ori Dimension is a **Vercel-hosted 3D printer size visualizer**. It helps people understand how large a printer really is by showing a proportional 3D model beside familiar real-world scale objects.

This is **not a chatbot**, printer-monitoring dashboard, or printer-control system.

## What the web app does

- Shows a rotatable, zoomable 3D scene.
- Lets you change printer width, height, and depth in millimetres.
- Places the printer beside a person, desk, chair, or door reference.
- Keeps the printer and reference object in a shared metre-based coordinate system.
- Calculates the printer's floor footprint.
- Labels reference measurements as estimates and example printer measurements as examples.

**Accuracy note:** the current printer is a schematic model, and its initial dimensions are examples—not verified dimensions for a particular printer. Reference-object dimensions are also estimates. Use verified manufacturer measurements before treating a comparison as exact.

## Tech stack

- Next.js App Router + React + TypeScript
- Three.js + React Three Fiber + Drei
- Vercel Git integration for deployment

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Check the production build locally:

```bash
npx tsc --noEmit
npm run build
```

## Vercel deployment

The GitHub repository is linked to the Vercel project **ori-dimension**.

- **Repository:** https://github.com/30lnewcomb-byte/Ori-Dimension
- **Production branch:** `main`
- **Root directory:** repository root
- **Framework:** Next.js (auto-detected)
- **Build command:** `npm run build`
- **Install command:** `npm install`
- **Environment variables:** none required for the current app

Vercel builds commits from the connected repository. GitHub Actions also runs TypeScript checking and a production build when code is pushed.

## Project direction

1. Add a reliable printer catalogue with manufacturer-sourced external dimensions and links to those sources.
2. Add more useful scale objects with explicit dimensions and labels for estimates.
3. Replace the schematic printer with accurate printer-specific 3D models.
4. Keep all objects proportional and the scale consistent. External dimensions and build volume must remain separate measurements.

## Geometry experiments

The repository includes a separate triangle-geometry experiment. The scale-object TensorFlow selector is used by the Tripo prompt planner; exact dimensional geometry in the viewer still uses deterministic calculations, not neural-network guesses.


## Build plate + generated comparisons

The viewer focuses on the **build plate**, not a full printer model. Width and depth are expressed in millimetres and the plate is rendered in metre-based scene units. The default 180 × 180 mm size is an example until verified for a specific printer.

### Optional server-side integrations

Configure these variables in Vercel Project Settings → Environment Variables:

- `TRIPO_API_KEY` — enables on-demand Tripo text-to-3D generation. The key is used only by server routes and is never sent to browser code.
- `HYPERBROWSER_API_KEY` — enables web search for printer build-area specifications. Results link to sources; verify manufacturer measurements before entering them.

The shared `data/comparison-objects.json` catalogue contains 73 references, ranging from a die and phone to billboards, buildings, aircraft, stadiums, and ships. Every entry includes approximate external dimensions and replaceable prompt fields (description, material, color, detail, pose, width, height, and depth).

A TensorFlow model is trained against synthetic plate/object-size examples to score scale matches. Its trained weights are committed to `data/selector-weights.json` by the GitHub Actions workflow. The server-side route uses those weights to choose a reference, then fills a fixed prompt template for Tripo; the model does not invent raw prompt text. A deterministic size-score fallback remains available if trained weights are not yet present. The viewer fits the generated GLB bounding box to the catalogue dimensions, so generated appearance is not treated as a measurement source. Generation may consume Tripo credits.

Without API keys, the viewer remains usable with a simple procedural comparison preview; the external generation and search actions explain which server key is missing.
