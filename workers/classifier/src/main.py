from __future__ import annotations

import json
import sys
from pathlib import Path

from eccn_rules import generate_eccn_candidates
from extract_specs import extract_specs
from extract_text import extract_text
from ingest import load_input
from memo import generate_memo
from schemas import WorkerOutput


def run(payload_path: str) -> WorkerOutput:
    worker_input = load_input(payload_path)
    text = extract_text(worker_input.file_path)
    specs = extract_specs(text)
    candidates, uncertainty_flags, confidence = generate_eccn_candidates(specs)
    memo_markdown = generate_memo(
        worker_input.document_id,
        worker_input.document_title,
        worker_input.document_metadata,
        specs,
        candidates,
        uncertainty_flags,
    )

    sample_dir = Path(payload_path).resolve().parent
    artifacts_dir = sample_dir / "artifacts"
    artifacts_dir.mkdir(exist_ok=True)

    extracted_text_path = artifacts_dir / f"{worker_input.document_id}-extracted.txt"
    structured_output_path = artifacts_dir / f"{worker_input.document_id}-output.json"
    memo_path = artifacts_dir / f"{worker_input.document_id}-memo.md"

    extracted_text_path.write_text(text)
    memo_path.write_text(memo_markdown)

    output = WorkerOutput(
        document_id=worker_input.document_id,
        organization_id=worker_input.organization_id,
        requires_human_review=True,
        confidence=confidence,
        uncertainty_flags=uncertainty_flags,
        extracted_specs=specs,
        eccn_candidates=candidates,
        memo_markdown=memo_markdown,
        artifacts={
            "extracted_text_path": str(extracted_text_path),
            "structured_output_path": str(structured_output_path),
            "memo_path": str(memo_path),
        },
    )

    structured_output_path.write_text(json.dumps(output.to_dict(), indent=2))
    return output


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 src/main.py <input-json-path>")

    try:
        result = run(sys.argv[1])
        print(json.dumps(result.to_dict(), indent=2))
    except FileNotFoundError as error:
        raise SystemExit(f"Input file not found: {error}") from error
    except json.JSONDecodeError as error:
        raise SystemExit(f"Input JSON is invalid: {error}") from error
    except Exception as error:  # pragma: no cover - CLI guardrail
        raise SystemExit(f"Worker execution failed: {error}") from error
