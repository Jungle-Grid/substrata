from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from backends.fireworks_backend import FireworksBackend
from capabilities import derive_capability_signals
from classification_heuristics import evaluate
from extract_specs import extract_specs
from main import _dedupe_interface_facts, _ensure_profile_specs, _merge_ai_specs
from memo import generate_memo
from schemas import validate_ai_extraction_payload


FIXTURES = {
    "ax920": ROOT / "samples" / "ax920-datasheet.txt",
    "secure_network_card": ROOT / "samples" / "secure-network-card.txt",
    "rf_transceiver": ROOT / "samples" / "rf-transceiver.txt",
    "adc_dac": ROOT / "samples" / "adc32rf45-datasheet.txt",
    "fpga_board": ROOT / "samples" / "fpga-board.txt",
    "rugged_sensor": ROOT / "samples" / "rugged-aerospace-sensor.txt",
}


def signatures(result):
    candidates = [*result.review_candidates, *result.fallback_candidates, *result.blocked_candidates]
    return {
        "primaryProfile": result.primary_profile,
        "reviewPaths": sorted(result.classification_trace["reviewPathsOpened"]),
        "candidateFamilies": sorted(
            (item.get("candidateCode") or item.get("candidateFamily"), item["candidateType"])
            for item in candidates
        ),
    }


backend = FireworksBackend()
results = []
selected = {
    value.strip()
    for value in os.getenv("FIREWORKS_FIXTURES", ",".join(FIXTURES)).split(",")
    if value.strip()
}
for name, path in FIXTURES.items():
    if name not in selected:
        continue
    print(f"running:{name}", file=sys.stderr, flush=True)
    text = path.read_text()
    fallback_specs = _dedupe_interface_facts(_ensure_profile_specs(extract_specs(text)))
    _, fallback_candidates, fallback_result = evaluate(
        fallback_specs,
        text,
        source_label="Fallback fixture",
    )

    backend_result = backend.run_classification(
        text,
        {
            "document_id": f"fireworks_{name}",
            "document_title": name.replace("_", " ").title(),
            "file_name": path.name,
            "selected_backend": "fireworks",
            "backend_reason": "Post-implementation hardening fixture comparison.",
        },
    )
    if backend_result.status != "completed":
        raise RuntimeError(f"{name}: Fireworks did not complete: {backend_result.error}")
    extraction = validate_ai_extraction_payload(backend_result.output)
    assisted_specs = _dedupe_interface_facts(_merge_ai_specs(extraction))
    assisted_specs, assisted_candidates, assisted_result = evaluate(
        assisted_specs,
        text,
        source_label="Fireworks-extracted fixture",
    )
    fallback_signature = signatures(fallback_result)
    assisted_signature = signatures(assisted_result)
    if fallback_signature != assisted_signature:
        raise AssertionError(
            f"{name}: deterministic routing changed by extraction mode\n"
            f"fallback={fallback_signature}\nassisted={assisted_signature}"
        )
    memo = generate_memo(
        f"fireworks_{name}",
        name.replace("_", " ").title(),
        {"fileName": path.name},
        assisted_specs,
        assisted_candidates,
        ["requires_engineering_confirmation"],
        derive_capability_signals(assisted_specs),
    )
    if assisted_result.primary_profile not in memo:
        raise AssertionError(f"{name}: memo omitted heuristic primary profile")
    if not all(code in memo for code in [item[0] for item in assisted_signature["candidateFamilies"] if item[0][0].isdigit()]):
        raise AssertionError(f"{name}: memo omitted a heuristic candidate")
    record = {
        "fixture": name,
        "backendStatus": backend_result.status,
        "backendProfileGuess": extraction.product_profile.profile,
        "heuristicPrimaryProfile": assisted_result.primary_profile,
        "extractedFactCount": len(assisted_specs),
        "reviewPaths": assisted_signature["reviewPaths"],
        "candidateFamilies": assisted_signature["candidateFamilies"],
        "memoValidatedAgainstHeuristics": True,
    }
    results.append(record)
    print(f"completed:{name}", file=sys.stderr, flush=True)
    print(json.dumps(record), flush=True)

print(json.dumps(results, indent=2))
