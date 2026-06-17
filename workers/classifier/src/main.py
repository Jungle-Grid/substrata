from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from ai_client import GeminiClient, GeminiClientError
from eccn_rules import generate_eccn_candidates
from extract_specs import extract_specs
from extract_text import extract_text
from ingest import load_input
from memo import generate_memo
from prompts import (
    EXTRACTION_SYSTEM_PROMPT,
    MEMO_SYSTEM_PROMPT,
    build_extraction_prompt,
    build_memo_prompt,
)
from schemas import AIExtractionResult, ExtractedSpec, WorkerOutput, validate_ai_extraction_payload
from validation import validate_memo_markdown, validate_worker_output


AI_IDENTITY_IMPORTANCE = {
    "manufacturer": "Manufacturer identity helps reviewers tie the memo to the correct source and product line.",
    "product_name": "Product name anchors the review memo to the device described by the source document.",
    "product_family": "Product family matters when the document covers variants rather than one ordering code.",
    "part_number": "Part-number identity helps reviewers distinguish a device ordering code from a document number.",
    "document_number": "Document numbers identify the source publication and should not be substituted for product part numbers.",
    "document_type": "Document type helps reviewers distinguish a datasheet, overview, or product specification.",
    "is_family_overview": "Family-overview status flags that variant-specific ordering-code details may be required for final review.",
    "product_profile": "Detected product profile controls which technical facts and review paths should be emphasized.",
    "profile_confidence": "Profile confidence tells the reviewer how strongly the extraction identified the document type.",
    "profile_rationale": "Profile rationale explains why the memo follows this product-review path.",
}


def _document_source_label(source_type: object) -> str:
    if source_type == "upload":
        return "Uploaded datasheet text"
    if source_type == "seed":
        return "Bundled sample datasheet text"
    return "Current document text"


def _env_truthy(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _ai_max_input_chars() -> int:
    raw = os.environ.get("AI_MAX_INPUT_CHARS", "120000")
    try:
        return max(4000, int(raw))
    except ValueError:
        return 120000


def _normalize_whitespace(value: str) -> str:
    return " ".join(value.split())


def _window_around_patterns(text: str, patterns: list[str], window: int = 1800) -> list[str]:
    lowered = text.lower()
    chunks: list[str] = []
    used: list[tuple[int, int]] = []
    for pattern in patterns:
        start = lowered.find(pattern.lower())
        if start == -1:
            continue
        chunk_start = max(0, start - window // 3)
        chunk_end = min(len(text), start + window)
        if any(not (chunk_end < left or chunk_start > right) for left, right in used):
            continue
        used.append((chunk_start, chunk_end))
        chunks.append(text[chunk_start:chunk_end])
    return chunks


def truncate_for_ai(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text

    first_pages_budget = max_chars // 3
    chunks = [text[:first_pages_budget]]
    patterns = [
        "features",
        "key features",
        "electrical characteristics",
        "recommended operating conditions",
        "security",
        "secure boot",
        "cryptographic",
        "interfaces",
        "jesd",
        "pcie",
        "ethernet",
        "usb",
        "displayport",
        "package",
        "thermal",
        "qualification",
        "radiation",
        "applications",
    ]
    chunks.extend(_window_around_patterns(text, patterns, window=max(1600, max_chars // 18)))

    joined = "\n\n--- relevant excerpt ---\n\n".join(chunks)
    if len(joined) > max_chars:
        return joined[:max_chars]

    remaining = max_chars - len(joined)
    tail = text[-min(remaining, max_chars // 8):] if remaining > 1000 else ""
    return f"{joined}\n\n--- closing excerpt ---\n\n{tail}"[:max_chars]


def _first_snippet(extraction: AIExtractionResult) -> str:
    if extraction.product_profile.supporting_snippets:
        return extraction.product_profile.supporting_snippets[0]
    if extraction.extracted_facts:
        return extraction.extracted_facts[0].source_snippet
    return "Detected from provided datasheet text."


def _identity_specs(extraction: AIExtractionResult) -> list[ExtractedSpec]:
    identity = extraction.product_identity
    snippet = _first_snippet(extraction)
    values: list[tuple[str, str | None]] = [
        ("manufacturer", identity.manufacturer),
        ("product_name", identity.product_name),
        ("product_family", identity.product_family),
        ("part_number", identity.part_number),
        ("document_number", identity.document_number),
        ("document_type", identity.document_type),
        ("is_family_overview", "true" if identity.is_family_overview else "false"),
        ("product_profile", extraction.product_profile.profile),
        ("profile_confidence", extraction.product_profile.confidence),
        ("profile_rationale", extraction.product_profile.rationale),
    ]
    specs: list[ExtractedSpec] = []
    for name, value in values:
        if value is None or not str(value).strip():
            continue
        specs.append(
            ExtractedSpec(
                name=name,
                value=str(value).strip(),
                unit=None,
                source_snippet=snippet,
                importance=AI_IDENTITY_IMPORTANCE[name],
                category="profile_detection" if name.startswith("profile_") or name == "product_profile" else "product_identity",
                confidence=extraction.product_profile.confidence if name.startswith("profile_") or name == "product_profile" else "medium",
            )
        )
    return specs


def _merge_ai_specs(extraction: AIExtractionResult) -> list[ExtractedSpec]:
    specs: list[ExtractedSpec] = []
    seen: set[tuple[str, str]] = set()
    for spec in [*_identity_specs(extraction), *extraction.extracted_facts]:
        if spec.name == "part_number" and spec.value.upper().startswith(("DS", "UG", "PG", "WP", "XAPP")):
            continue
        if spec.name == "cryptographic_algorithm" and spec.value.upper() == "ECC":
            context = spec.source_snippet.lower()
            has_crypto_context = any(
                marker in context
                for marker in ("elliptic", "ecdsa", "ecdh", "public key", "signature", "certificate", "cryptographic", "key exchange")
            )
            if not has_crypto_context:
                continue
        key = (spec.name.lower(), spec.value.lower())
        if key in seen:
            continue
        seen.add(key)
        specs.append(spec)
    return specs


def _ensure_profile_specs(specs: list[ExtractedSpec]) -> list[ExtractedSpec]:
    if any(spec.name == "product_profile" for spec in specs):
        return specs

    device_text = " ".join(f"{spec.name} {spec.value}" for spec in specs).lower()
    if any(term in device_text for term in ("analog-to-digital converter", "digital-to-analog converter", " adc", " dac", "rf-sampling")):
        profile = "adc_dac_converter"
        confidence = "medium"
        rationale = "Inferred from converter identity and performance facts extracted by the heuristic worker."
    elif any(term in device_text for term in ("zynq", "mpsoc", "programmable logic", "fpga")):
        profile = "fpga_programmable_logic_soc"
        confidence = "medium"
        rationale = "Inferred from programmable-logic/SoC facts extracted by the heuristic worker."
    elif any(term in device_text for term in ("rf transceiver", "receiver", "transmitter")):
        profile = "rf_transceiver"
        confidence = "low"
        rationale = "Inferred from RF transceiver terms extracted by the heuristic worker."
    else:
        profile = "generic_electronics"
        confidence = "low"
        rationale = "Fallback profile because the heuristic worker did not identify a narrower product profile."

    snippet = specs[0].source_snippet if specs else "Detected from provided datasheet text."
    return [
        *specs,
        ExtractedSpec(
            name="product_profile",
            value=profile,
            unit=None,
            source_snippet=snippet,
            importance=AI_IDENTITY_IMPORTANCE["product_profile"],
            category="profile_detection",
            confidence=confidence,
        ),
        ExtractedSpec(
            name="profile_confidence",
            value=confidence,
            unit=None,
            source_snippet=snippet,
            importance=AI_IDENTITY_IMPORTANCE["profile_confidence"],
            category="profile_detection",
            confidence=confidence,
        ),
        ExtractedSpec(
            name="profile_rationale",
            value=rationale,
            unit=None,
            source_snippet=snippet,
            importance=AI_IDENTITY_IMPORTANCE["profile_rationale"],
            category="profile_detection",
            confidence=confidence,
        ),
    ]


def _memo_input_package(
    *,
    worker_input: Any,
    extraction: AIExtractionResult,
    specs: list[ExtractedSpec],
    candidates: list[Any],
    uncertainty_flags: list[str],
    run_mode: str,
) -> dict[str, Any]:
    return {
        "document": {
            "id": worker_input.document_id,
            "title": worker_input.document_title,
            "fileName": worker_input.document_metadata.get("fileName", "Unknown"),
            "generatedTimestamp": datetime.now(UTC).replace(microsecond=0).isoformat(),
        },
        "runMode": run_mode,
        "productProfile": asdict(extraction.product_profile),
        "productIdentity": asdict(extraction.product_identity),
        "extractedFacts": [asdict(spec) for spec in specs],
        "missingFacts": [asdict(item) for item in extraction.missing_facts[:8]],
        "warnings": extraction.warnings,
        "reviewPaths": [asdict(candidate) for candidate in candidates],
        "uncertaintyFlags": uncertainty_flags,
    }


def _run_ai_flow(
    *,
    worker_input: Any,
    text: str,
    source_label: str,
) -> tuple[list[ExtractedSpec], list[Any], list[str], float, str, dict[str, Any], AIExtractionResult]:
    ai_text = truncate_for_ai(text, _ai_max_input_chars())
    client = GeminiClient()
    extraction_prompt = build_extraction_prompt(
        document_title=worker_input.document_title,
        file_name=str(worker_input.document_metadata.get("fileName", "Unknown")),
        document_text=ai_text,
    )
    extraction_payload = client.generate_json(
        prompt_type="extraction",
        system_instruction=EXTRACTION_SYSTEM_PROMPT,
        user_prompt=extraction_prompt,
        input_character_count=len(ai_text),
    )
    extraction = validate_ai_extraction_payload(extraction_payload)
    specs = _merge_ai_specs(extraction)
    candidates, uncertainty_flags, confidence = generate_eccn_candidates(specs, source_label=source_label)
    memo_prompt = build_memo_prompt(
        _memo_input_package(
            worker_input=worker_input,
            extraction=extraction,
            specs=specs,
            candidates=candidates,
            uncertainty_flags=uncertainty_flags,
            run_mode="ai_assisted",
        )
    )
    memo_markdown = client.generate_markdown(
        prompt_type="memo_drafting",
        system_instruction=MEMO_SYSTEM_PROMPT,
        user_prompt=memo_prompt,
        input_character_count=len(memo_prompt),
    )
    validate_memo_markdown(memo_markdown)
    metadata = {
        "classificationMode": "ai_assisted",
        "aiProvider": "gemini",
        "aiModel": client.model,
        "aiInputCharacters": len(ai_text),
        "aiInputTruncated": len(ai_text) < len(text),
        "aiDemoPublicDocsOnly": _env_truthy("AI_DEMO_PUBLIC_DOCS_ONLY", True),
    }
    return specs, candidates, uncertainty_flags, confidence, memo_markdown, metadata, extraction


def _run_heuristic_flow(worker_input: Any, text: str, source_label: str, *, fallback_reason: str | None = None):
    specs = _ensure_profile_specs(extract_specs(text))
    candidates, uncertainty_flags, confidence = generate_eccn_candidates(specs, source_label=source_label)
    memo_markdown = generate_memo(
        worker_input.document_id,
        worker_input.document_title,
        worker_input.document_metadata,
        specs,
        candidates,
        uncertainty_flags,
    )
    metadata = {
        "classificationMode": "heuristic_fallback" if fallback_reason else "heuristic",
        "aiProvider": os.environ.get("AI_PROVIDER", "none"),
        "aiEnabled": _env_truthy("AI_ENABLED", False),
        "fallbackReason": fallback_reason,
    }
    return specs, candidates, uncertainty_flags, confidence, memo_markdown, metadata, None


def _profile_artifact_payload(specs: list[ExtractedSpec], extraction: AIExtractionResult | None) -> dict[str, Any]:
    if extraction:
        return extraction.raw["productProfile"]
    by_name = {spec.name: spec.value for spec in specs}
    return {
        "profile": by_name.get("product_profile", "generic_electronics"),
        "confidence": by_name.get("profile_confidence", "low"),
        "rationale": by_name.get("profile_rationale", "Generated by heuristic fallback."),
        "supportingSnippets": [
            spec.source_snippet
            for spec in specs
            if spec.name in {"product_profile", "device_type", "product_family", "part_number"}
        ][:3],
        "secondaryProfiles": [],
    }


def run(payload_path: str) -> WorkerOutput:
    worker_input = load_input(payload_path)
    text = extract_text(worker_input.file_path)
    source_label = _document_source_label(worker_input.document_metadata.get("sourceType"))
    ai_enabled = _env_truthy("AI_ENABLED", False) and os.environ.get("AI_PROVIDER", "gemini").lower() == "gemini"
    fallback_enabled = _env_truthy("AI_FALLBACK_TO_HEURISTIC", True)
    extraction: AIExtractionResult | None

    if ai_enabled and os.environ.get("GEMINI_API_KEY"):
        try:
            specs, candidates, uncertainty_flags, confidence, memo_markdown, run_metadata, extraction = _run_ai_flow(
                worker_input=worker_input,
                text=text,
                source_label=source_label,
            )
        except (GeminiClientError, ValueError) as error:
            if not fallback_enabled:
                raise
            specs, candidates, uncertainty_flags, confidence, memo_markdown, run_metadata, extraction = _run_heuristic_flow(
                worker_input,
                text,
                source_label,
                fallback_reason=f"AI flow failed: {type(error).__name__}",
            )
            uncertainty_flags = list(dict.fromkeys([*uncertainty_flags, "requires_engineering_confirmation"]))
            run_metadata["aiFailureMessage"] = str(error)[:500]
    else:
        reason = "AI disabled or GEMINI_API_KEY missing" if ai_enabled else None
        specs, candidates, uncertainty_flags, confidence, memo_markdown, run_metadata, extraction = _run_heuristic_flow(
            worker_input,
            text,
            source_label,
            fallback_reason=reason,
        )

    sample_dir = Path(payload_path).resolve().parent
    artifacts_dir = sample_dir / "artifacts"
    artifacts_dir.mkdir(exist_ok=True)

    extracted_text_path = artifacts_dir / f"{worker_input.document_id}-extracted.txt"
    structured_output_path = artifacts_dir / f"{worker_input.document_id}-output.json"
    memo_path = artifacts_dir / f"{worker_input.document_id}-memo.md"
    profile_path = artifacts_dir / f"{worker_input.document_id}-profile.json"
    facts_path = artifacts_dir / f"{worker_input.document_id}-extracted-facts.json"
    review_paths_path = artifacts_dir / f"{worker_input.document_id}-review-paths.json"

    extracted_text_path.write_text(text)
    memo_path.write_text(memo_markdown)
    profile_path.write_text(json.dumps(_profile_artifact_payload(specs, extraction), indent=2))
    facts_path.write_text(json.dumps([asdict(spec) for spec in specs], indent=2))
    review_paths_path.write_text(json.dumps([asdict(candidate) for candidate in candidates], indent=2))

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
            "profile_path": str(profile_path),
            "extracted_facts_path": str(facts_path),
            "review_paths_path": str(review_paths_path),
        },
        run_metadata=run_metadata,
    )

    validate_worker_output(
        document_title=worker_input.document_title,
        extracted_text=text,
        output=output,
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
