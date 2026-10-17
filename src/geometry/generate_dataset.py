"""Generate mathematically valid triangle examples as JSON Lines.

Only Python's standard library is required. Dataset records are synthetic,
reproducible when a seed is supplied, and intended for later model training.
"""
from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path
from typing import Any


def triangle_kind(a: int, b: int, c: int) -> str:
    if a == b == c:
        return "equilateral"
    if a == b or a == c or b == c:
        return "isosceles"
    return "scalene"


def make_example(rng: random.Random, example_id: int) -> dict[str, Any]:
    # Rejection sampling ensures strict triangle inequality.
    while True:
        a, b, c = sorted((rng.randint(2, 200), rng.randint(2, 200), rng.randint(2, 200)))
        if a + b > c:
            break

    semiperimeter = (a + b + c) / 2
    area = math.sqrt(
        max(0.0, semiperimeter * (semiperimeter - a)
            * (semiperimeter - b) * (semiperimeter - c))
    )

    # Law of cosines; clamp values to protect acos from floating-point drift.
    def angle_opposite(side: int, side_1: int, side_2: int) -> float:
        cosine = (side_1**2 + side_2**2 - side**2) / (2 * side_1 * side_2)
        return math.degrees(math.acos(max(-1.0, min(1.0, cosine))))

    angles = sorted((
        angle_opposite(a, b, c),
        angle_opposite(b, a, c),
        angle_opposite(c, a, b),
    ))

    return {
        "id": f"triangle-{example_id:07d}",
        "topic": "triangle_geometry",
        "version": 1,
        "input": {"sides": [a, b, c]},
        "target": {
            "valid_triangle": True,
            "perimeter": a + b + c,
            "area": round(area, 6),
            "angles_degrees": [round(x, 6) for x in angles],
            "side_type": triangle_kind(a, b, c),
        },
        "provenance": "synthetic_exact_rules",
    }


def generate(output: Path, count: int, seed: int) -> int:
    if count < 1:
        raise ValueError("count must be at least 1")
    rng = random.Random(seed)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="\n") as stream:
        for index in range(count):
            stream.write(json.dumps(make_example(rng, index + 1), separators=(",", ":")))
            stream.write("\n")
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("data/generated/triangles.jsonl"))
    parser.add_argument("--count", type=int, default=10_000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    written = generate(args.output, args.count, args.seed)
    print(f"Generated {written:,} triangle examples: {args.output}")


if __name__ == "__main__":
    main()
