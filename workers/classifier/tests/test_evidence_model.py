from __future__ import annotations

import itertools
import sys
import unittest
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from classification_heuristics import evaluate
from evidence_model import classify_polarity, effective_polarity, evidence_for_terms
from schemas import ExtractedSpec


def seed(text: str) -> ExtractedSpec:
    return ExtractedSpec("source_summary", text, None, text, "Test evidence.", "technical", "high")


class EvidenceModelPropertyTests(unittest.TestCase):
    def test_polarity_matrix(self):
        cases = {
            "Includes an NPU.": "present",
            "No NPU is included.": "absent",
            "NPU is optional.": "ambiguous",
            "NPU availability is unknown.": "unknown",
            "NPU footprint is unpopulated.": "absent",
            "NPU is available separately.": "ambiguous",
            "Future model may include an NPU.": "ambiguous",
        }
        for text, expected in cases.items():
            with self.subTest(text=text):
                self.assertEqual(classify_polarity(text), expected)

    def test_explicit_absence_never_increases_profile_eligibility(self):
        irrelevant = ["Warranty applies.", "Color is black.", "Contact sales."]
        for suffix_count in range(len(irrelevant) + 1):
            text = "No AI accelerator is included in the current export configuration. " + " ".join(irrelevant[:suffix_count])
            _, _, result = evaluate([seed(text)], text, source_label="property fixture")
            self.assertNotIn("ai_accelerator", result.detected_profiles)

    def test_duplicate_positive_fact_does_not_change_profile_score(self):
        fact = "Includes an integrated NPU rated at 96 TOPS."
        _, _, single = evaluate([seed(fact)], fact, source_label="property fixture")
        _, _, duplicate = evaluate([seed(fact + " " + fact)], fact + " " + fact, source_label="property fixture")
        self.assertEqual(single.profile_scores["ai_accelerator"], duplicate.profile_scores["ai_accelerator"])

    def test_present_absent_unknown_optional_combinations_never_hide_conflict(self):
        forms = {
            "present": "Includes an NPU.",
            "absent": "No NPU is included.",
            "unknown": "NPU availability is unknown.",
            "optional": "An NPU is optional.",
        }
        for left, right in itertools.product(forms, repeat=2):
            text = f"{forms[left]} {forms[right]}"
            records = evidence_for_terms(fact_type="npu", terms=("npu",), source_text=text, specs=[])
            polarity = effective_polarity(records)
            if {left, right} == {"present", "absent"}:
                self.assertEqual(polarity, "ambiguous")


if __name__ == "__main__":
    unittest.main()
