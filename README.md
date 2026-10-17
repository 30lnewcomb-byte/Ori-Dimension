# Ori Dimension

Ori Dimension is the perception, reasoning, and action system for a printer-aware AI.

Its intended loop is:

1. **Find** — connect to an explicitly configured printer and confirm its identity.
2. **Look** — collect camera frames and available printer telemetry.
3. **Think** — combine visual observations, printer state, geometry knowledge, and task rules.
4. **Do** — propose an action, check safety conditions, and execute only actions allowed by the configured control policy.

The long-term goal is for Ori to do the work itself. The supporting software in this repository handles data creation, model training/evaluation, perception, planning, and carefully bounded device control.

## Important design rule

A neural network prediction is not a safety guarantee. Printer commands must pass through a separate, testable policy layer. The first versions should operate in **observe/propose mode**; physical actions require explicit authorization until the action policy has been tested and deliberately configured. Never bypass printer firmware protections, temperature limits, interlocks, or emergency-stop mechanisms.

## Initial build plan

- [x] Establish the project purpose and safety boundary.
- [x] Generate and validate a reproducible geometry dataset.
- [x] Add a small TensorFlow geometry training baseline and held-out metrics.
- [x] Add automated dataset tests and a GitHub Actions check.
- [ ] Add camera/printer observation adapters.
- [ ] Build a reasoning and action-planning layer.
- [ ] Add a policy-gated printer adapter and simulated tests.
- [ ] Test against the actual printer only after simulation and safety checks pass.

## Geometry dataset and training

The generator creates labeled triangle examples from mathematical rules rather than scraping an unverified database. It writes JSON Lines (`.jsonl`); the validator checks structure and mathematical consistency. Generated data and trained artifacts stay local by default.

    python -m pip install -r requirements.txt
    python -m src.geometry.generate_dataset --output data/generated/triangles.jsonl --count 10000 --seed 42
    python -m src.geometry.validate_dataset data/generated/triangles.jsonl
    python -m src.geometry.train_model --dataset data/generated/triangles.jsonl --output artifacts/ori-geometry.keras --metrics artifacts/geometry-metrics.json

The training script uses a deterministic 80/10/10 train/validation/test split, early stopping, and a held-out test report. This first network predicts triangle perimeter, area, and angles from three side lengths. It is a **geometry research baseline**, not a vision model or a printer-control model.

## Project status

The data generator, validator, training script, and CI checks have been added. The GitHub Actions run and an actual TensorFlow training run still need to be observed before calling this batch verified. Printer connection, camera perception, reasoning, and action execution have not been implemented yet.
