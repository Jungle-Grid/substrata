from __future__ import annotations

import os
import sys
from pathlib import Path


SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from backends.jungle_grid_backend import JungleGridBackend
from schemas import validate_ai_extraction_payload


def main() -> None:
    if os.getenv("JUNGLE_GRID_LIVE_TEST_ENABLED", "").lower() not in {"1", "true", "yes"}:
        raise SystemExit("Set JUNGLE_GRID_LIVE_TEST_ENABLED=true before submitting a billable live job.")
    if not os.getenv("JUNGLE_GRID_API_KEY"):
        raise SystemExit("JUNGLE_GRID_API_KEY is required.")

    result = JungleGridBackend().run_classification(
        "Demo Semi DEMO-1 public datasheet. The device includes a PCIe interface.",
        {"document_id": "live_smoke", "document_title": "Public Jungle Grid smoke sample"},
    )
    if result.status != "completed" or not result.job_id:
        raise SystemExit(f"Jungle Grid job did not complete with provenance: {result}")
    validate_ai_extraction_payload(result.output)
    print({
        "jobId": result.job_id,
        "provider": result.underlying_provider,
        "gpuVendor": result.gpu_vendor,
        "gpuName": result.gpu_name,
        "runtimeVersion": result.runtime_version,
        "imageDigest": result.image_digest,
    })


if __name__ == "__main__":
    main()
