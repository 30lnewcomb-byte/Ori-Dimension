from __future__ import annotations

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data" / "comparison-objects.json"


class ComparisonCatalogueTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.objects = json.loads(CATALOG.read_text(encoding="utf-8"))

    def test_catalogue_has_broad_scale_coverage(self) -> None:
        self.assertGreaterEqual(len(self.objects), 200)
        names = {item["name"].lower() for item in self.objects}
        self.assertTrue(any("billboard" in name for name in names))
        self.assertTrue(any("stadium" in name for name in names))
        self.assertTrue(any("die" in name for name in names))
        self.assertTrue(any("filament spool" in name for name in names))
        self.assertTrue(any("3d printed" in name.lower() or "3d printer" in name.lower() for name in names))
        self.assertGreaterEqual(max(max(x["widthMm"], x["heightMm"], x["depthMm"]) for x in self.objects), 100_000)

    def test_ids_are_unique_and_dimensions_are_positive(self) -> None:
        ids = [item["id"] for item in self.objects]
        self.assertEqual(len(ids), len(set(ids)))
        for item in self.objects:
            for key in ("widthMm", "heightMm", "depthMm"):
                self.assertIsInstance(item[key], (int, float), item["id"])
                self.assertGreater(item[key], 0, item["id"])
            for key in ("name", "note", "prompt", "material", "color", "detail", "pose"):
                self.assertTrue(item[key].strip(), f"{item['id']} is missing {key}")

    def test_every_prompt_fits_tripo_character_limit(self) -> None:
        template = (
            "Create one recognizable realistic 3D model of {prompt}. "
            "Material: {material}; color: {color}; details: {detail}. "
            "Target outer size: X width {widthMm} mm, Y height {heightMm} mm, "
            "Z depth {depthMm} mm. Orientation: {pose}. Preserve ordinary proportions "
            "and a clear silhouette. Only the single object; no people, extra objects, "
            "environment, ground plane, text, logos, or separate pedestal. Centered "
            "product-model view; lowest point at ground level. Dimensions are authoritative "
            "for the viewer's final scale."
        )
        for item in self.objects:
            prompt = template.format(**item)
            self.assertLessEqual(len(prompt), 1024, item["id"])


if __name__ == "__main__":
    unittest.main()
