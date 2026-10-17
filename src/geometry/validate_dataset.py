"""Validate triangle JSONL records before they are used for training."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any


def validate_record(record: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    example_id = record.get("id", "<unknown>")
    sides = record.get("input", {}).get("sides")
    target = record.get("target")

    if not isinstance(sides, list) or len(sides) != 3:
        return [f"{example_id}: input.sides must contain exactly 3 values"]
    if any(type(side) is not int or side <= 0 for side in sides):
        return [f"{example_id}: sides must be positive integers"]
    a, b, c = sides
    if sides != sorted(sides):
        errors.append(f"{example_id}: sides must be sorted")
    if a + b <= c:
        errors.append(f"{example_id}: triangle inequality is not satisfied")
    if not isinstance(target, dict):
        return errors + [f"{example_id}: target must be an object"]

    expected_perimeter = a + b + c
    if target.get("perimeter") != expected_perimeter:
        errors.append(f"{example_id}: incorrect perimeter")

    semiperimeter = expected_perimeter / 2
    expected_area = math.sqrt(max(
        0.0, semiperimeter * (semiperimeter - a)
        * (semiperimeter - b) * (semiperimeter - c)
    ))
    area = target.get("area")
    if not isinstance(area, (int, float)) or not math.isclose(
        area, expected_area, abs_tol=0.00001
    ):
        errors.append(f"{example_id}: incorrect area")

    angles = target.get("angles_degrees")
    if not isinstance(angles, list) or len(angles) != 3:
        errors.append(f"{example_id}: angles_degrees must contain 3 values")
    elif (
        any(not isinstance(x, (int, float)) or not 0 < x < 180 for x in angles)
        or not math.isclose(sum(angles), 180.0, abs_tol=0.00002)
        or angles != sorted(angles)
    ):
        errors.append(f"{example_id}: angles must be sorted, valid, and sum to 180")

    expected_type = (
        "equilateral" if a == b == c
        else "isosceles" if a == b or a == c or b == c
        else "scalene"
    )
    if target.get("side_type") != expected_type:
        errors.append(f"{example_id}: incorrect side_type")
    if target.get("valid_triangle") is not True:
        errors.append(f"{example_id}: valid_triangle must be true")
    return errors


def validate_file(path: Path) -> tuple[int, list[str]]:
    count = 0
    errors: list[str] = []
    with path.open("r", encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, start=1):
            if not line.strip():
                errors.append(f"line {line_number}: blank lines are not allowed")
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                errors.append(f"line {line_number}: invalid JSON ({exc.msg})")
                continue
            if not isinstance(record, dict):
                errors.append(f"line {line_number}: record must be a JSON object")
                continue
            count += 1
            errors.extend(f"line {line_number}: {issue}" for issue in validate_record(record))
            if len(errors) >= 100:
                errors.append("Stopped after 100 errors.")
                break
    return count, errors


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", type=Path, help="Path to a JSONL dataset")
    args = parser.parse_args()
    if not args.dataset.is_file():
        parser.error(f"dataset not found: {args.dataset}")
    count, errors = validate_file(args.dataset)
    if errors:
        print(f"FAILED: {len(errors)} issue(s) in {count:,} record(s)")
        for error in errors[:100]:
            print(f"- {error}")
        raise SystemExit(1)
    print(f"PASS: {count:,} triangle records passed structural and math checks")


if __name__ == "__main__":
    main()
