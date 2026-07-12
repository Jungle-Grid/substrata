from __future__ import annotations

import sys
import unittest
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from classification_heuristics import evaluate
from extract_specs import extract_specs


class ES25GeneralInvariantRegression(unittest.TestCase):
    def test_explicit_negative_capability_survives_and_blocks_dependent_paths(self):
        source = Path(__file__).resolve().parents[1] / "fixtures" / "regression" / "es25-sensor-gateway.md"
        text = source.read_text()
        _, candidates, result = evaluate(extract_specs(text), text, source_label="regression source")
        accelerator = [item for item in result.classification_trace["sourceEvidence"] if item["fact_type"] == "ai_accelerator_identity"]
        self.assertTrue(accelerator)
        self.assertTrue(all(item["polarity"] == "absent" for item in accelerator))
        self.assertNotIn("ai_accelerator", result.detected_profiles)
        self.assertNotIn("advanced_computing", result.classification_trace["reviewPathsOpened"])
        self.assertFalse({"3A090", "4A090"} & {candidate.eccn for candidate in candidates})
        self.assertIn("mcu_or_soc", result.detected_profiles)
        self.assertIn("category_5_part_2_security", result.classification_trace["reviewPathsOpened"])

    def test_no_production_branch_mentions_fixture_identity(self):
        source_root = Path(__file__).resolve().parents[1] / "src"
        mentions = [path for path in source_root.rglob("*.py") if "es25" in path.read_text().lower()]
        self.assertEqual(mentions, [])


if __name__ == "__main__":
    unittest.main()
