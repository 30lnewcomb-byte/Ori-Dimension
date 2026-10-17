"""Train a small TensorFlow model on validated triangle JSONL data.

The network predicts scaled perimeter, area, and sorted angles. This is a
research baseline, not a printer-control model and not a substitute for exact
geometry calculations.
"""
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path
from typing import Any

import numpy as np
import tensorflow as tf


INPUT_SCALE = 200.0
TARGET_SCALES = np.array([600.0, 20_000.0, 180.0, 180.0, 180.0], dtype=np.float32)


def load_examples(path: Path) -> tuple[np.ndarray, np.ndarray]:
    inputs: list[list[float]] = []
    targets: list[list[float]] = []
    with path.open("r", encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, start=1):
            if not line.strip():
                continue
            record: dict[str, Any] = json.loads(line)
            sides = record["input"]["sides"]
            target = record["target"]
            if len(sides) != 3 or len(target["angles_degrees"]) != 3:
                raise ValueError(f"Invalid triangle shape at line {line_number}")
            inputs.append([float(x) / INPUT_SCALE for x in sides])
            targets.append([
                float(target["perimeter"]),
                float(target["area"]),
                *[float(x) for x in target["angles_degrees"]],
            ])
    if len(inputs) < 20:
        raise ValueError("Need at least 20 validated examples to train and evaluate")
    x = np.asarray(inputs, dtype=np.float32)
    y = np.asarray(targets, dtype=np.float32) / TARGET_SCALES
    if not np.isfinite(x).all() or not np.isfinite(y).all():
        raise ValueError("Dataset contains non-finite values")
    return x, y


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=Path("data/generated/triangles.jsonl"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/ori-geometry.keras"))
    parser.add_argument("--metrics", type=Path, default=Path("artifacts/geometry-metrics.json"))
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if args.epochs < 1 or args.batch_size < 1:
        parser.error("--epochs and --batch-size must be positive")
    if not args.dataset.is_file():
        parser.error(f"dataset not found: {args.dataset}")

    random.seed(args.seed)
    np.random.seed(args.seed)
    tf.keras.utils.set_random_seed(args.seed)
    x, y = load_examples(args.dataset)

    # Deterministic shuffled 80/10/10 split.
    order = np.random.default_rng(args.seed).permutation(len(x))
    x, y = x[order], y[order]
    train_end = int(len(x) * 0.8)
    val_end = int(len(x) * 0.9)
    if train_end == 0 or val_end <= train_end or val_end >= len(x):
        raise ValueError("Dataset is too small for an 80/10/10 split")
    x_train, y_train = x[:train_end], y[:train_end]
    x_val, y_val = x[train_end:val_end], y[train_end:val_end]
    x_test, y_test = x[val_end:], y[val_end:]

    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(3,), name="side_lengths_scaled"),
        tf.keras.layers.Dense(64, activation="relu"),
        tf.keras.layers.Dense(64, activation="relu"),
        tf.keras.layers.Dense(32, activation="relu"),
        tf.keras.layers.Dense(5, activation="sigmoid", name="scaled_geometry"),
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="mse",
        metrics=[tf.keras.metrics.MeanAbsoluteError(name="mae_scaled")],
    )
    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=10, restore_best_weights=True
        )
    ]
    history = model.fit(
        x_train, y_train,
        validation_data=(x_val, y_val),
        epochs=args.epochs,
        batch_size=args.batch_size,
        callbacks=callbacks,
        verbose=2,
    )
    test_loss, test_mae_scaled = model.evaluate(x_test, y_test, verbose=0)
    predictions = model.predict(x_test, verbose=0) * TARGET_SCALES
    actual = y_test * TARGET_SCALES
    labels = ["perimeter", "area", "angle_1_degrees", "angle_2_degrees", "angle_3_degrees"]
    mae_by_target = {
        label: float(np.mean(np.abs(predictions[:, i] - actual[:, i])))
        for i, label in enumerate(labels)
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.metrics.parent.mkdir(parents=True, exist_ok=True)
    model.save(args.output)
    metrics = {
        "model": str(args.output),
        "dataset": str(args.dataset),
        "seed": args.seed,
        "examples_total": int(len(x)),
        "examples_train": int(len(x_train)),
        "examples_validation": int(len(x_val)),
        "examples_test": int(len(x_test)),
        "epochs_completed": len(history.history["loss"]),
        "test_loss_mse_scaled": float(test_loss),
        "test_mae_scaled": float(test_mae_scaled),
        "test_mae_original_units": mae_by_target,
        "note": "Geometry research baseline only; not validated for printer control.",
    }
    args.metrics.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
