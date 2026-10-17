# Ori Dimension

Ori Dimension is the perception, reasoning, and action system for a printer-aware AI.

Its intended loop is:

1. **Find** — confirm the explicitly configured printer.
2. **Look** — collect camera frames and printer telemetry.
3. **Think** — interpret observations using geometry knowledge and task rules.
4. **Do** — prepare an action, validate it through a separate policy, and execute only when the future control layer permits it.

The goal is for Ori to do the work itself. This repository contains the supporting software for data creation, training/evaluation, perception, planning, and bounded device control.

## Safety boundary

A neural network prediction is not a safety guarantee. The current loop is **observe/propose only** and has no command executor. It checks an allowlist and basic connection/fault conditions, then returns a proposal for review. No physical printer command is sent by this code. A real adapter must preserve firmware protections, temperature limits, interlocks, and emergency-stop behavior.

## Current build status

- [x] Project purpose and safety boundary documented.
- [x] Reproducible synthetic triangle dataset generator.
- [x] Mathematical dataset validator.
- [x] TensorFlow geometry training baseline with held-out metrics.
- [x] Automated dataset tests and GitHub Actions checks.
- [x] Printer adapter interface and find/look/think/propose orchestration scaffold.
- [x] Simulated tests for approval gating, unknown actions, missing printer, disconnection, and missing configuration.
- [ ] Run TensorFlow training and inspect its real metrics.
- [ ] Implement and test a camera-capable adapter for the actual printer.
- [ ] Train/evaluate visual perception using correctly labeled printer images.
- [ ] Implement a reasoning model that uses observations and geometry tools.
- [ ] Implement a real printer command adapter behind a strict policy layer.
- [ ] Test hardware control only after simulation and safety checks pass.

## Geometry dataset and training

The generator creates labeled triangle examples from mathematical rules rather than relying on an unverified downloaded database. It writes JSON Lines (`.jsonl`); the validator checks structure and mathematical consistency. Generated data and model artifacts stay local by default.

    python -m pip install -r requirements.txt
    python -m src.geometry.generate_dataset --output data/generated/triangles.jsonl --count 10000 --seed 42
    python -m src.geometry.validate_dataset data/generated/triangles.jsonl
    python -m src.geometry.train_model --dataset data/generated/triangles.jsonl --output artifacts/ori-geometry.keras --metrics artifacts/geometry-metrics.json

The first network predicts triangle perimeter, area, and angles from three side lengths. It is a **geometry research baseline**, not yet a vision model or a printer-control model. The GitHub Actions dataset and orchestration tests have passed; the TensorFlow training run itself has not yet been performed.
