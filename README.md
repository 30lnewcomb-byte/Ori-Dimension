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
- [ ] Generate and validate a reproducible geometry dataset.
- [ ] Train and evaluate a small TensorFlow geometry model.
- [ ] Add camera/printer observation adapters.
- [ ] Build a reasoning and action-planning layer.
- [ ] Add a policy-gated printer adapter and simulated tests.
- [ ] Test against the actual printer only after simulation and safety checks pass.

## Geometry dataset foundation

The first data generator creates labeled triangle examples from mathematical rules rather than scraping an unverified database. It produces JSON Lines (`.jsonl`) so examples can be streamed and inspected. The validator checks structural and mathematical consistency before training.

    python -m pip install -r requirements.txt
    python -m src.geometry.generate_dataset --output data/generated/triangles.jsonl --count 10000 --seed 42
    python -m src.geometry.validate_dataset data/generated/triangles.jsonl

Dataset files are generated locally and are not committed by default.

## Project status

This is an early foundation, not a trained or printer-connected model yet. Training metrics, device support, and safe physical control must be verified before claiming those capabilities.
