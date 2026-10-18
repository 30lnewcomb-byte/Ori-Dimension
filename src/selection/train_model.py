"""Train Ori's scale-object selector from the shared Tripo prompt catalogue.

The model does not write arbitrary prompts. It learns to score object candidates
for a build-plate size; the trusted prompt template then fills Tripo variables.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import tensorflow as tf

ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = ROOT / "data" / "comparison-objects.json"
DEFAULT_OUTPUT = ROOT / "data" / "selector-weights.json"
MAX_DIMENSION_MM = 300_000.0
MIN_PLATE_MM = 50.0
MAX_PLATE_MM = 1000.0


def features(plate_width: float, plate_depth: float, obj: dict[str, Any]) -> list[float]:
    plate_span = max(plate_width, plate_depth)
    object_span = max(float(obj["widthMm"]), float(obj["depthMm"]))
    ratio = object_span / plate_span
    denom = math.log1p(MAX_DIMENSION_MM)
    return [
        math.log1p(plate_width) / denom,
        math.log1p(plate_depth) / denom,
        math.log1p(float(obj["widthMm"])) / denom,
        math.log1p(float(obj["heightMm"])) / denom,
        math.log1p(float(obj["depthMm"])) / denom,
        math.log1p(ratio) / math.log1p(MAX_DIMENSION_MM / MIN_PLATE_MM),
    ]


def target_score(plate_width: float, plate_depth: float, obj: dict[str, Any]) -> float:
    ratio = max(float(obj["widthMm"]), float(obj["depthMm"])) / max(plate_width, plate_depth)
    if ratio < 0.4 or ratio > 12:
        return 0.015
    return math.exp(-abs(math.log(ratio)))


def make_dataset(objects: list[dict[str, Any]], count: int, seed: int) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    x = np.empty((count, 6), dtype=np.float32)
    y = np.empty((count, 1), dtype=np.float32)
    for i in range(count):
        obj = objects[int(rng.integers(0, len(objects)))]
        # Uniform in log space gives the model examples from tiny plates to
        # the largest supported plate without overwhelming it with 1000 mm.
        plate_width = float(np.exp(rng.uniform(math.log(MIN_PLATE_MM), math.log(MAX_PLATE_MM))))
        plate_depth = float(np.exp(rng.uniform(math.log(MIN_PLATE_MM), math.log(MAX_PLATE_MM))))
        x[i] = features(plate_width, plate_depth, obj)
        y[i, 0] = target_score(plate_width, plate_depth, obj)
    return x, y


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--examples", type=int, default=30_000)
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    if args.examples < 1000 or args.epochs < 1:
        parser.error("--examples must be >= 1000 and --epochs must be positive")

    objects = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    if len(objects) < 50:
        raise ValueError(f"Expected a broad comparison catalogue; found {len(objects)} objects.")
    if len({obj["id"] for obj in objects}) != len(objects):
        raise ValueError("Object IDs in the shared catalogue must be unique.")
    for obj in objects:
        for key in ("widthMm", "heightMm", "depthMm"):
            if not isinstance(obj.get(key), (int, float)) or obj[key] <= 0:
                raise ValueError(f"Invalid {key} for {obj.get('id', '<unknown>')}")

    tf.keras.utils.set_random_seed(args.seed)
    x, y = make_dataset(objects, args.examples, args.seed)
    permutation = np.random.default_rng(args.seed).permutation(len(x))
    x, y = x[permutation], y[permutation]
    split = int(len(x) * 0.9)
    x_train, y_train = x[:split], y[:split]
    x_val, y_val = x[split:], y[split:]

    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(6,), name="plate_and_object_features"),
        tf.keras.layers.Dense(16, activation="relu", name="dense_1"),
        tf.keras.layers.Dense(8, activation="relu", name="dense_2"),
        tf.keras.layers.Dense(1, activation="sigmoid", name="scale_match_score"),
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.002),
        loss="mse",
        metrics=[tf.keras.metrics.MeanAbsoluteError(name="mae")],
    )
    history = model.fit(
        x_train,
        y_train,
        validation_data=(x_val, y_val),
        epochs=args.epochs,
        batch_size=128,
        verbose=2,
        callbacks=[tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=8, restore_best_weights=True
        )],
    )
    loss, mae = model.evaluate(x_val, y_val, verbose=0)
    raw = model.get_weights()
    layers = []
    for i in range(0, len(raw), 2):
        layers.append({
            "kernel": raw[i].astype(float).tolist(),
            "bias": raw[i + 1].astype(float).tolist(),
        })
    metrics = {
        "catalogue_objects": len(objects),
        "examples": len(x),
        "train_examples": len(x_train),
        "validation_examples": len(x_val),
        "epochs_completed": len(history.history["loss"]),
        "validation_loss": float(loss),
        "validation_mae": float(mae),
        "seed": args.seed,
    }
    payload = {
        "version": 1,
        "trained": True,
        "inputSize": 6,
        "layers": layers,
        "metrics": metrics,
        "note": "TensorFlow-trained scale-match scorer; prompt text is assembled from the shared catalogue template.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps(metrics, indent=2))
    print(f"Saved trained selector weights to {args.output}")


if __name__ == "__main__":
    main()
