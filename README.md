# Ori Dimension

Ori Dimension is a **Vercel-hosted 3D printer size visualizer**. Its purpose is to help someone see how physically large a 3D printer really is—not just read dimensions in a spec sheet.

This is **not a chatbot**, printer-monitoring dashboard, or printer-control system.

## Main goal

Show a printer in a 3D scene at a consistent, meaningful scale, alongside **real-world scale objects** that make its size easy to understand. Instead of seeing a printer floating alone, users should be able to compare it with familiar things.

## Intended experience

1. **Choose a printer** and use reliable published external dimensions.
2. **Place it in a 3D scene** with width, depth, and height represented proportionally.
3. **Add scale objects**—for example, a desk, chair, person, or door—using documented or user-specified dimensions.
4. **Compare sizes honestly:** keep the printer and all reference objects in the same scale, and make it clear when an object's dimensions are estimates.
5. **Make the footprint visible** so users can judge how much room the printer occupies.

Scale objects are central to the project, not decorative extras. Their purpose is to give users an intuitive sense of the printer's real size.

## Deployment

The web application is intended to be hosted on **Vercel**. Keep the experience focused on visualizing printer size; do not add chat, camera monitoring, or physical printer control unless the project goal is explicitly changed.

## Data and accuracy

- Prefer manufacturer-published printer dimensions and record units and sources.
- Convert units explicitly and consistently.
- Distinguish external dimensions from build volume; they describe different things.
- Use known dimensions for scale objects where possible; label estimates clearly.
- Never stretch objects independently just to make the scene look better. All objects must obey the same scene scale.
- Do not invent specifications when reliable dimensions are unavailable.

## Current repository status

The repository currently contains a small Python geometry dataset generator, validator, and TensorFlow training experiment focused on triangles. Those are **not yet the printer-size visualizer**, and the triangle prediction model does not itself make a printer appear at the correct scale.

The next implementation priority is the actual Vercel web experience: printer dimension data, a true-to-scale 3D representation, and familiar scale objects. Keep the project focused on that deliverable.
