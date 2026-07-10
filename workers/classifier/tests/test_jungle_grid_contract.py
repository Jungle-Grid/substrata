from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from backends import jungle_grid_backend as jungle
from schemas import validate_ai_extraction_payload


VALID_EXTRACTION = {
    "productProfile": {
        "profile": "generic_electronics",
        "confidence": "medium",
        "rationale": "Public semiconductor document.",
        "supportingSnippets": ["Public device data."],
        "secondaryProfiles": [],
    },
    "productIdentity": {
        "manufacturer": "Demo Semi",
        "productName": "Demo device",
        "productFamily": None,
        "partNumber": "DEMO-1",
        "documentNumber": None,
        "documentType": "Datasheet",
        "isFamilyOverview": False,
    },
    "extractedFacts": [
        {
            "name": "part_number",
            "displayName": "Part number",
            "value": "DEMO-1",
            "unit": None,
            "category": "product_identity",
            "sourceSnippet": "DEMO-1 public datasheet",
            "importance": "Identifies the reviewed component.",
            "confidence": "high",
        }
    ],
    "missingFacts": [],
    "warnings": [],
}


class JungleGridContractTests(unittest.TestCase):
    def test_payload_runs_explicit_runner_with_rocm_environment(self) -> None:
        payload = jungle._build_payload("Public device data.", {"document_id": "doc_1"})
        self.assertEqual(payload["command"], ["/app/run-extraction.sh"])
        self.assertEqual(payload["environment"]["SUBSTRATA_MODEL"], "gemma4:12b")
        self.assertIn("SUBSTRATA_PROMPT", payload["environment"])
        self.assertEqual(payload["resources"]["gpu_vendor"], "AMD")

    def test_completed_job_persists_external_id_and_validates_extraction_contract(self) -> None:
        result_payload = {
            "status": "completed",
            "output": json.dumps(VALID_EXTRACTION),
            "provider": "jungle-grid-amd",
            "gpu": {"vendor": "AMD", "name": "MI300X", "runtime_version": "ROCm 7"},
            "usage": {"prompt_tokens": 12, "completion_tokens": 8},
            "image": {"digest": "sha256:demo"},
        }
        with patch.object(jungle, "estimate_job", return_value={}), patch.object(
            jungle, "submit_job", return_value={"job_id": "jg_demo_123"}
        ), patch.object(jungle, "poll_until_resolved", return_value=result_payload), patch.object(
            jungle, "get_job_logs", return_value={"items": []}
        ):
            result = jungle.JungleGridBackend().run_classification(
                "Public device data.", {"document_id": "doc_1", "document_title": "Demo"}
            )

        self.assertEqual(result.status, "completed")
        self.assertEqual(result.job_id, "jg_demo_123")
        self.assertEqual(result.gpu_vendor, "AMD")
        self.assertEqual(result.gpu_name, "MI300X")
        self.assertEqual(result.image_digest, "sha256:demo")
        validate_ai_extraction_payload(result.output)


if __name__ == "__main__":
    unittest.main()
