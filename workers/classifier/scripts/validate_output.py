from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from schemas import ECCNCandidate, ExtractedSpec, RegulatoryCitation, WorkerOutput  # noqa: E402
from validation import collect_validation_issues  # noqa: E402


def _load_output(path: Path) -> WorkerOutput:
    payload = json.loads(path.read_text())

    return WorkerOutput(
        document_id=payload["document_id"],
        organization_id=payload["organization_id"],
        requires_human_review=payload["requires_human_review"],
        confidence=payload["confidence"],
        uncertainty_flags=payload["uncertainty_flags"],
        extracted_specs=[ExtractedSpec(**spec) for spec in payload["extracted_specs"]],
        eccn_candidates=[
            ECCNCandidate(
                eccn=candidate["eccn"],
                title=candidate["title"],
                confidence=candidate["confidence"],
                matched_technical_facts=candidate["matched_technical_facts"],
                regulatory_citations=[RegulatoryCitation(**citation) for citation in candidate["regulatory_citations"]],
                why_it_may_apply=candidate["why_it_may_apply"],
                why_it_may_not_apply=candidate["why_it_may_not_apply"],
                missing_information=candidate["missing_information"],
                uncertainty_flags=candidate["uncertainty_flags"],
                reviewer_questions=candidate["reviewer_questions"],
            )
            for candidate in payload["eccn_candidates"]
        ],
        memo_markdown=payload["memo_markdown"],
        artifacts=payload["artifacts"],
    )


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python3 workers/classifier/scripts/validate_output.py <output-json-path>", file=sys.stderr)
        return 1

    output_path = Path(sys.argv[1]).resolve()
    output = _load_output(output_path)
    extracted_text_path = Path(output.artifacts["extracted_text_path"]).resolve()
    extracted_text = extracted_text_path.read_text()

    document_title = output.memo_markdown.splitlines()[0].replace("# Draft ECCN Review Memo — ", "", 1)
    issues = collect_validation_issues(
        document_title=document_title,
        extracted_text=extracted_text,
        output=output,
    )

    if issues:
        for issue in issues:
            print(
                json.dumps(
                    {
                        "bad_string": issue.bad_string,
                        "section": issue.section,
                        "reason": issue.reason,
                        "suggested_remediation": issue.remediation,
                    }
                )
            )
        return 1

    print(
        json.dumps(
            {
                "output_path": str(output_path),
                "extracted_text_path": str(extracted_text_path),
                "status": "ok",
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
