from __future__ import annotations

import sys
import unittest
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from classification_heuristics import classify_evidence_polarity, evaluate
from extract_specs import extract_specs
from labels import display_name_for_spec_name
from memo import generate_memo
from schemas import ExtractedSpec
from classification_heuristics.history_signals import build_history_signals


SAMPLES = Path(__file__).resolve().parents[1] / "samples"
FIXTURES = {
    "ax920": SAMPLES / "ax920-datasheet.txt",
    "secure_network": SAMPLES / "secure-network-card.txt",
    "rf": SAMPLES / "rf-transceiver.txt",
    "adc": SAMPLES / "adc32rf45-datasheet.txt",
    "fpga": SAMPLES / "fpga-board.txt",
    "rugged_sensor": SAMPLES / "rugged-aerospace-sensor.txt",
}


def mode_result(text: str, *, simulated_llm: bool):
    specs = [spec for spec in extract_specs(text) if spec.name != "product_profile"]
    if simulated_llm:
        specs.insert(0, ExtractedSpec(
            name="product_profile",
            value="generic_electronics",
            unit=None,
            source_snippet="Generic LLM profile guess.",
            importance="Simulated backend profile that heuristics must not trust as authority.",
            category="profile_detection",
            confidence="low",
            extraction_method="simulated_llm",
        ))
    return evaluate(specs, text, source_label="Mode-comparison fixture")[2]


class ExecutionModeStabilityTests(unittest.TestCase):
    def test_llm_profile_guess_cannot_downgrade_deterministic_outputs(self):
        for name, path in FIXTURES.items():
            with self.subTest(fixture=name):
                text = path.read_text()
                fallback = mode_result(text, simulated_llm=False)
                assisted = mode_result(text, simulated_llm=True)
                self.assertEqual(assisted.primary_profile, fallback.primary_profile)
                self.assertNotEqual(assisted.primary_profile, "general_electronics")
                self.assertEqual(
                    set(assisted.classification_trace["reviewPathsOpened"]),
                    set(fallback.classification_trace["reviewPathsOpened"]),
                )
                self.assertEqual(
                    {(item.get("candidateCode"), item["candidateType"]) for item in [*assisted.review_candidates, *assisted.fallback_candidates, *assisted.blocked_candidates] if item.get("candidateCode")},
                    {(item.get("candidateCode"), item["candidateType"]) for item in [*fallback.review_candidates, *fallback.fallback_candidates, *fallback.blocked_candidates] if item.get("candidateCode")},
                )

    def test_candidate_evidence_uses_canonical_fact_labels(self):
        text = FIXTURES["ax920"].read_text()
        specs = extract_specs(text)
        for spec in specs:
            spec.display_name = f"Backend label: {spec.display_name}"

        normalized_specs, candidates, _ = evaluate(
            specs,
            text,
            source_label="Mode-comparison fixture",
        )
        extracted_fact_strings = {
            f"{display_name_for_spec_name(spec.name)}: {spec.value}{f' {spec.unit}' if spec.unit else ''}"
            for spec in normalized_specs
        }

        self.assertTrue(candidates)
        for candidate in candidates:
            for fact in candidate.matched_technical_facts:
                self.assertIn(fact, extracted_fact_strings)

    def test_ax920_memo_renders_paths_without_recommending_blocked_security_candidate(self):
        text = FIXTURES["ax920"].read_text()
        specs, candidates, result = evaluate(
            extract_specs(text),
            text,
            source_label="AX920 datasheet",
        )
        memo = generate_memo(
            "ax920",
            "AX920 NextGen AI Accelerator Card",
            {"fileName": "ax920-datasheet.txt"},
            specs,
            candidates,
            [],
            [],
            result.review_paths,
        )

        self.assertIn("### Advanced computing review path", memo)
        self.assertIn("### Category 4 computer and electronic assembly review path", memo)
        self.assertIn("### Category 5 Part 2 security and cryptography review path", memo)
        self.assertIn("### General electronics fallback review path", memo)
        self.assertNotIn("No broader review paths were recorded", memo)
        self.assertIn("Substrata recommends qualified review of the 3A090 and 4A090", memo)
        self.assertIn("5A002 path remains blocked", memo)
        self.assertIn("3A991 remains a fallback only", memo)
        self.assertNotIn("3A090 — 3A090", memo)
        self.assertNotIn("Heuristic Signal Ai Accelerator Identity", memo)

    def test_crypto_polarity_does_not_treat_questions_or_negations_as_affirmed(self):
        self.assertEqual(classify_evidence_polarity("Confirm whether encryption is available."), "question")
        self.assertEqual(classify_evidence_polarity("No customer-facing encryption is provided."), "negated")
        self.assertEqual(classify_evidence_polarity("Firmware signing is supported."), "affirmed")

    def test_ax920_history_signal_uses_the_matched_csv_row_only(self):
        ax900_row = "product: AX900\ndescription: AI accelerator card with HBM and PCIe Gen5\nprior_eccn: 3A090"
        signals = build_history_signals([
            {"sourceFileName": "prior-reviews.csv", "excerpt": ax900_row, "score": 0.9, "matchTier": "direct"}
        ])

        self.assertEqual(signals[0]["priorEccns"], ["3A090"])
        self.assertNotIn("5A002", signals[0]["priorEccns"])


if __name__ == "__main__":
    unittest.main()
