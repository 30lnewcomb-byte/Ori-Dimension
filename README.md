# Ori Dimension

Ori Dimension is a **Vercel-hosted 3D printer size visualizer**. Its purpose is to help someone see how physically large a 3D printer really is—not just read dimensions in a spec sheet.

This is **not a chatbot**, printer-monitoring dashboard, or printer-control system.

## Main goal

Build a clear 3D view of a printer at a meaningful, consistent scale, using real dimensions (width, depth, and height). The visualizer should make the printer's footprint and overall size understandable at a glance.

## Intended direction

1. **Choose or identify a printer model** and obtain its published physical dimensions.
2. **Represent its size in 3D** with width, depth, and height mapped consistently to the scene.
3. **Show the scale clearly** so users can judge how much space the printer occupies.
4. **Use geometry and TensorFlow only where they help**—for example, organizing dimension data or exploring model recognition later. A neural network is not needed to do basic, exact dimension math.

## Deployment

The web application is intended to be hosted on **Vercel**. Keep the experience focused on visualizing printer size; do not add chat, camera monitoring, or physical printer control unless the project goal is explicitly changed.

## Data and accuracy

- Prefer manufacturer-published dimensions and clearly record units and sources.
- Convert units explicitly and consistently.
- Keep the displayed model proportional to its recorded dimensions.
- Distinguish the printer's external dimensions from build volume; they describe different things.
- Do not invent dimensions when reliable specifications are unavailable.

## Current repository status

The repository currently contains a small Python geometry dataset generator, validator, and TensorFlow training experiment focused on triangles. Those are **not yet a printer-size visualizer**, and the triangle prediction model does not itself make a printer appear at the correct scale.

The next implementation priority is the actual Vercel web experience: printer dimension data, a true-to-scale 3D representation, and readable size references. Keep the project focused on that deliverable.
