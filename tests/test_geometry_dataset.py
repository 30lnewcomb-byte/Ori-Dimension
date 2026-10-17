from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from src.geometry.generate_dataset import generate
from src.geometry.validate_dataset import validate_file, validate_record


class GeometryDatasetTests(unittest.TestCase):
    def test_generator_creates_valid_records(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "triangles.jsonl"
            count = generate(path, count=250, seed=42)
            checked_count, errors = validate_file(path)
            self.assertEqual(count, 250)
            self.assertEqual(checked_count, 250)
            self.assertEqual(errors, [])

    def test_generator_is_reproducible_for_same_seed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "first.jsonl"
            second = Path(directory) / "second.jsonl"
            generate(first, count=25, seed=17)
            generate(second, count=25, seed=17)
            self.assertEqual(first.read_text(encoding="utf-8"), second.read_text(encoding="utf-8"))

    def test_validator_rejects_impossible_triangle(self) -> None:
        record = {
            "id": "bad-triangle",
            "input": {"sides": [2, 3, 8]},
            "target": {"perimeter": 13, "area": 0, "angles_degrees": [1, 2, 177],
                       "side_type": "scalene", "valid_triangle": True},
        }
        errors = validate_record(record)
        self.assertTrue(any("triangle inequality" in error for error in errors))

    def test_validator_reports_malformed_json(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "broken.jsonl"
            path.write_text('{"id":\n', encoding="utf-8")
            count, errors = validate_file(path)
            self.assertEqual(count, 0)
            self.assertTrue(any("invalid JSON" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
