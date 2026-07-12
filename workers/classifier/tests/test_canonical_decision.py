from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from classification_heuristics import evaluate
from decision import build_classification_decision, semantic_validation_results
from extract_specs import extract_specs
from main import _identity_specs
from memo import generate_canonical_memo
from schemas import AIExtractionResult, ProductIdentity, ProductProfile


def canonical(text: str, *, provider_profile: str | None = None, prior: list[str] | None = None):
    specs = extract_specs(text)
    specs, candidates, heuristic = evaluate(specs, text, source_label="test source")
    decision = build_classification_decision(
        run_id="run_test",
        document_id="doc_test",
        source_text=text,
        specs=specs,
        candidates=candidates,
        heuristic_result=heuristic,
        backend_proposed_profile=provider_profile,
        backend_provider="test-provider",
        prior_stage_candidates=prior or [],
    )
    memo = generate_canonical_memo(
        document_title="Arbitrary renamed upload",
        document_metadata={"fileName": "arbitrary-name.txt"},
        specs=specs,
        decision=decision,
    )
    return specs, decision, memo


class CanonicalDecisionTests(unittest.TestCase):
    def test_embedded_processor_is_component_not_complete_product_profile(self):
        _, decision, memo = canonical("Industrial sensor gateway containing an ARM Cortex-A53 application processor and Ethernet.")
        self.assertEqual(decision.exported_product_form["value"], "gateway")
        self.assertEqual(decision.product_level_profile["profile"], "sensor_gateway")
        self.assertIn("mcu_or_soc", {item["profile"] for item in decision.component_level_profiles})
        self.assertIn("Canonical product profile: sensor_gateway", memo)

    def test_server_gpu_router_crypto_and_evaluation_kit_keep_product_form(self):
        cases = [
            ("Rack server containing four GPU accelerator cards rated at 96 TOPS.", "server"),
            ("Enterprise router containing a cryptographic processor for TLS transport.", "router"),
            ("Evaluation kit includes an optional NPU accelerator module.", "evaluation_kit"),
        ]
        for text, expected_form in cases:
            with self.subTest(form=expected_form):
                _, decision, _ = canonical(text)
                self.assertEqual(decision.exported_product_form["value"], expected_form)

    def test_tls_presence_is_distinct_from_specific_candidate_sufficiency(self):
        _, decision, memo = canonical("Industrial gateway supports MQTT over TLS in the shipped firmware.")
        transport = next(item for item in decision.capabilities if item["key"] == "transport_security")
        self.assertEqual(transport["presence"], "present")
        self.assertEqual(transport["implementation"], "unknown")
        self.assertFalse(decision.eligible_candidates)
        self.assertTrue(decision.blocked_candidate_hypotheses)
        self.assertNotIn("does not affirm network cryptography", memo.lower())

    def test_regulatory_unavailability_is_system_owned_and_negative_evidence_is_rendered(self):
        _, decision, memo = canonical("Industrial gateway supports MQTT over TLS. No AI accelerator is included.")
        self.assertTrue(any(item["code"] == "OFFICIAL_REGULATORY_TEXT_UNAVAILABLE" and item["resolutionOwner"] == "system" for item in decision.system_limitations))
        self.assertFalse(any("official control text" in question.lower() for question in decision.reviewer_questions))
        self.assertIn("## Decisive negative source evidence", memo)
        self.assertIn("No AI accelerator", memo)

    def test_platform_metadata_cannot_become_manufacturer(self):
        extraction = AIExtractionResult(
            product_profile=ProductProfile("networking_hardware", "high", "Gateway", ["Industrial gateway with Ethernet."], []),
            product_identity=ProductIdentity("Substrata", "Example Gateway", None, None, None, "engineering note", False),
            extracted_facts=[], missing_facts=[], warnings=[], raw={},
        )
        specs = _identity_specs(extraction)
        self.assertFalse(any(spec.name == "manufacturer" for spec in specs))

    def test_provider_profiles_cannot_change_canonical_product_profile(self):
        text = "Industrial gateway containing an ARM Cortex-A53 processor and MQTT over TLS."
        profiles = []
        for proposal in ("secure_networking_hardware", "mcu_or_soc", "general_electronics"):
            _, decision, _ = canonical(text, provider_profile=proposal)
            profiles.append(decision.product_level_profile["profile"])
            self.assertTrue(decision.profile_resolution_records)
        self.assertEqual(profiles, ["sensor_gateway"] * 3)

    def test_candidate_transitions_explain_stage_differences(self):
        _, decision, _ = canonical("Industrial gateway with MQTT over TLS.", prior=["Category 3", "3A991"])
        transitioned = {item["candidate"] for item in decision.candidate_transitions}
        self.assertTrue({"Category 3", "3A991"}.issubset(transitioned))

    def test_stale_category_and_profile_text_fail_semantic_validation(self):
        specs, decision, memo = canonical("Industrial gateway with Ethernet.")
        stale = memo.replace("Canonical product profile: sensor_gateway", "Canonical product profile: mcu_or_soc") + "\nAdvanced computing recommendation."
        results = semantic_validation_results(
            decision=decision, memo=stale, specs=specs,
            backend_proposed_profile=None, prior_stage_candidates=[],
        )
        failed = {item["code"] for item in results if not item["passed"]}
        self.assertIn("MEMO_PROFILE_MATCHES_CANONICAL", failed)
        self.assertIn("MEMO_REFERENCES_CLOSED_ADVANCED_PATH", failed)

    def test_open_path_without_missing_evidence_fails_and_blocked_is_not_eligible(self):
        specs, decision, memo = canonical("Industrial gateway with MQTT over TLS.")
        broken = copy.deepcopy(decision)
        broken.open_review_paths[0]["missingEvidence"] = []
        results = semantic_validation_results(
            decision=broken, memo=memo, specs=specs,
            backend_proposed_profile=None, prior_stage_candidates=[],
        )
        self.assertIn("OPEN_PATH_MISSING_EVIDENCE_COMPLETE", {item["code"] for item in results if not item["passed"]})
        self.assertFalse(decision.eligible_candidates)
        self.assertTrue(all(item["status"] == "blocked" for item in decision.blocked_candidate_hypotheses))

    def test_product_and_file_names_do_not_change_canonical_decision(self):
        facts = "Industrial gateway with Ethernet and MQTT over TLS."
        _, left, _ = canonical("Product Alpha. " + facts)
        _, right, _ = canonical("Product Omega. " + facts)
        self.assertEqual(left.product_level_profile, right.product_level_profile)
        self.assertEqual([item["pathKey"] for item in left.open_review_paths], [item["pathKey"] for item in right.open_review_paths])


if __name__ == "__main__":
    unittest.main()
