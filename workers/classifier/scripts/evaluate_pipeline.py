from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from classification_heuristics import evaluate  # noqa: E402
from schemas import ExtractedSpec  # noqa: E402


def main() -> int:
    corpus = json.loads((ROOT / "fixtures" / "evaluation-corpus.json").read_text())
    totals = {"cases": len(corpus), "profileAssertions": 0, "profileCorrect": 0, "abstentionAssertions": 0, "abstentionCorrect": 0, "unsupportedCandidateRate": 0.0, "promptInjectionCorrect": 0}
    unsupported = 0
    candidates = 0
    failures: list[dict[str, object]] = []
    for case in corpus:
        text = case["text"]
        seed = ExtractedSpec("source_summary", text, None, text, "Evaluation source.", "technical", "high")
        _, generated, result = evaluate([seed], text, source_label=f"fixture:{case['id']}")
        expected = case.get("expectedProfiles", [])
        forbidden = case.get("forbiddenProfiles", [])
        ok = all(profile in result.detected_profiles for profile in expected) and all(profile not in result.detected_profiles for profile in forbidden)
        if expected or forbidden:
            totals["profileAssertions"] += 1
            totals["profileCorrect"] += int(ok)
        if case.get("expectedPrimary"):
            totals["abstentionAssertions"] += 1
            totals["abstentionCorrect"] += int(result.primary_profile == case["expectedPrimary"])
            ok = ok and result.primary_profile == case["expectedPrimary"]
        if case.get("promptInjection"):
            injection_ok = bool(result.classification_trace.get("untrustedDocumentInstructions")) and not generated
            totals["promptInjectionCorrect"] += int(injection_ok)
            ok = ok and injection_ok
        for candidate in generated:
            candidates += 1
            if not candidate.matched_technical_facts:
                unsupported += 1
        if not ok:
            failures.append({"id": case["id"], "profiles": result.detected_profiles, "primary": result.primary_profile})
    totals["unsupportedCandidateRate"] = round(unsupported / candidates, 4) if candidates else 0.0
    report = {"metrics": totals, "failures": failures, "note": "Precision-oriented deterministic fixture harness; recall and citation metrics require reviewer-labeled corpora."}
    print(json.dumps(report, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
