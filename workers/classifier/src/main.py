from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from backends import FireworksBackend, JungleGridBackend, LocalBackend
from backends.base import BackendResult
from capabilities import derive_capability_signals
from citations import build_document_citation
from classification_heuristics import evaluate as evaluate_classification_heuristics
from classification_heuristics.rules import PATH_TITLES
from eccn_rules import generate_eccn_candidates
from extract_specs import extract_specs
from extract_text import extract_text
from ingest import load_input
from memo import generate_canonical_memo, generate_memo
from decision import build_classification_decision, semantic_validation_results, assert_semantically_valid
from entity_resolution import qualify_document
from schemas import (
    AIExtractionResult,
    CandidateFactMapping,
    ExtractedSpec,
    FactIssue,
    RegulationSource,
    ReviewPath,
    WorkerOutput,
    validate_ai_extraction_payload,
)
from validation import (
    validate_memo_markdown,
    validate_narrative_consistency,
    validate_worker_output,
)

SPECIFIC_ECCN_PATTERN = re.compile(r"^[0-9][A-Z][0-9]{3}(?:\.[A-Za-z0-9]+|[A-Za-z0-9]*)$")


class BackendExecutionError(RuntimeError):
    def __init__(self, result: BackendResult):
        super().__init__(result.error or f"{result.backend} execution status: {result.status}")
        self.result = result


def _entity_intake_output(worker_input: Any, text: str, qualification: Any, payload_path: str) -> WorkerOutput:
    """Return a non-classification intake report for unsafe upstream sources."""
    entities = [entity for entity in qualification.entities if entity.entityType == "product" and entity.independentlyClassifiable]
    attributes = [entity for entity in qualification.entities if entity.entityType == "technical_attribute"]
    history_references = [entity for entity in qualification.entities if entity.entityType == "history_record"]
    entity_lines = [
        f"{index}. {entity.productName or entity.partNumbers[0]} ({', '.join(entity.partNumbers)}) — {entity.relationshipToDocument}"
        for index, entity in enumerate(entities, 1)
    ]
    memo = "\n".join([
        f"# Document Intake Report — {worker_input.document_title}",
        "", "## Document qualification",
        f"- Document role: {qualification.documentRole}",
        f"- Classifiability: {qualification.classifiability}",
        *[f"- {reason}" for reason in qualification.reasons],
        "", "## Detected product entities",
        *(entity_lines or ["- No coherent product entity was detected."]),
        "", "## Attached context",
        *([f"- Technical attribute: {entity.canonicalName}" for entity in attributes] or ["- No entity-scoped technical attributes were retained."]),
        *([f"- Internal history reference: {entity.canonicalName}" for entity in history_references] or []),
        "", "## Classification outcome",
        "- No single-product ECCN review memo was generated.",
        "- No technical facts, review paths, candidate hypotheses, or company-history query were generated from this document.",
        "", "## Suggested next action",
        "- Select one detected entity and upload a technical source document for that product, or submit separate documents for separate review.",
        "", "## Review state",
        "- Intake requires human review before any product classification workup is started.",
    ])
    sample_dir = Path(payload_path).resolve().parent
    artifacts_dir = sample_dir / "artifacts"
    artifacts_dir.mkdir(exist_ok=True)
    memo_path = artifacts_dir / f"{worker_input.document_id}-memo.md"
    output_path = artifacts_dir / f"{worker_input.document_id}-output.json"
    extracted_text_path = artifacts_dir / f"{worker_input.document_id}-extracted.txt"
    memo_path.write_text(memo)
    extracted_text_path.write_text(text)
    trace = {
        "documentQualification": qualification.to_dict(),
        "validatedDecision": None,
        "entityIsolation": {"status": "blocked_before_extraction", "entityCount": qualification.independentProductEntityCount},
    }
    output = WorkerOutput(
        document_id=worker_input.document_id,
        organization_id=worker_input.organization_id,
        requires_human_review=True,
        confidence=0.0,
        confidence_rationale="No product-level confidence is available because this document was not classifiable as one coherent exported product.",
        # Keep the existing API enum contract; detail is retained in the
        # structured qualification trace rather than invented flag values.
        uncertainty_flags=["missing_key_specs", "ambiguous_datasheet_language"],
        extracted_specs=[], fact_issues=[], review_paths=[], eccn_candidates=[], capability_signals=[], validation_issues=[],
        memo_markdown=memo,
        artifacts={"extracted_text_path": str(extracted_text_path), "memo_path": str(memo_path), "structured_output_path": str(output_path)},
        run_metadata={"classificationMode": "entity_intake", "backendStatus": "unknown", "workerOutputValidated": False, "finalSemanticValidation": "not_applicable"},
        heuristic_result={"documentQualification": qualification.to_dict()},
        classification_trace=trace,
    )
    output_path.write_text(json.dumps(output.to_dict(), indent=2))
    _log_worker_event("worker.entity_intake_finalized", document_id=worker_input.document_id, document_role=qualification.documentRole, classifiability=qualification.classifiability, entity_count=qualification.independentProductEntityCount)
    return output


def _log_worker_event(event: str, **fields: object) -> None:
    print(
        json.dumps(
            {
                "event": event,
                **fields,
            },
            default=str,
        ),
        file=sys.stderr,
    )


AI_IDENTITY_IMPORTANCE = {
    "manufacturer": "Manufacturer identity helps reviewers tie the memo to the correct source and product line.",
    "product_name": "Product name anchors the review memo to the device described by the source document.",
    "product_family": "Product family matters when the document covers variants rather than one ordering code.",
    "part_number": "Part-number identity helps reviewers distinguish a device ordering code from a document number.",
    "document_number": "Document numbers identify the source publication and should not be substituted for product part numbers.",
    "document_type": "Document type helps reviewers distinguish a datasheet, overview, or product specification.",
    "is_family_overview": "Family-overview status flags that variant-specific ordering-code details may be required for review signoff.",
    "product_profile": "Detected product profile controls which technical facts and review paths should be emphasized.",
    "profile_confidence": "Profile confidence tells the reviewer how strongly the extraction identified the document type.",
    "profile_rationale": "Profile rationale explains why the memo follows this product-review path.",
}

SPEC_IMPORTANCE_SENTENCES = {
    "cpu_core": "CPU core type helps reviewers understand the processor architecture and appropriate electronics review path.",
    "processor_architecture": "Processor architecture helps reviewers characterize the processing subsystem before comparing it against electronics control thresholds.",
    "cpu_core_count": "Core-count information helps reviewers understand the scale of the processor subsystem and whether ordering-code-specific review is needed.",
    "clock_speed": "Clock speed helps characterize processing performance and may affect how reviewers compare the product against electronics control thresholds.",
    "cpu_clock_speed": "Clock speed helps characterize processing performance and may affect how reviewers compare the product against electronics control thresholds.",
    "cache_tcm": "Memory and cache resources help characterize the processor subsystem and distinguish general MCU features from specialized compute hardware.",
    "on_chip_ram": "Memory and cache resources help characterize the processor subsystem and distinguish general MCU features from specialized compute hardware.",
    "memory_cache": "Memory and cache resources help characterize the processor subsystem and distinguish general MCU features from specialized compute hardware.",
    "memory_integrity": "Memory and cache resources help characterize the processor subsystem and distinguish general MCU features from specialized compute hardware.",
    "memory_controller_interface": "External memory interfaces help reviewers understand the processor subsystem and the electronics review path.",
    "external_memory_interface": "External memory interfaces help reviewers understand the processor subsystem and the electronics review path.",
    "external_memory_interfaces": "External memory interfaces help reviewers understand the processor subsystem and the electronics review path.",
    "secure_boot": "Secure boot can trigger security/cryptography review questions because it may involve authentication, cryptographic verification, and protected boot flows.",
    "security_feature": "Hardware security features can require separate security/cryptography review depending on accessibility, algorithms, and available exceptions.",
    "cryptographic_algorithm": "Named cryptographic functions can require separate security/cryptography review depending on accessibility, algorithms, and exceptions.",
    "crypto_key_size": "Cryptographic key-size information can affect security/cryptography review and should be tied to a current source fact.",
    "key_storage": "Secure key-management features can require security/cryptography review because protected keys may affect functionality and availability analysis.",
    "caam": "Hardware cryptography accelerators can require separate security/cryptography review because their functions may be controlled depending on accessibility, algorithms, and exceptions.",
    "pkha": "Public-key cryptography engines can require separate security/cryptography review depending on accessibility, algorithms, and exceptions.",
    "symmetric_engine": "Symmetric cryptography engines can require separate security/cryptography review depending on accessibility, algorithms, and exceptions.",
    "cryptographic_hash_engine": "Cryptographic hash engines can require separate security/cryptography review depending on accessibility, algorithms, and exceptions.",
    "rng4": "Random-number generation hardware can matter to security/cryptography review when it supports cryptographic functions.",
    "secure_key_management": "Secure key-management features can require security/cryptography review because protected keys may affect functionality and availability analysis.",
    "inline_encryption_engine": "Inline encryption can require security/cryptography review because it may protect memory or storage traffic with cryptographic functions.",
    "otfad": "OTFAD AES-128 counter-mode decryption can require security/cryptography review because it protects external flash access.",
    "snvs": "Secure non-volatile storage features can matter to security/cryptography review when they protect keys or boot state.",
    "zero_master_key": "Zero Master Key functionality can matter to security/cryptography review when it affects protected key handling.",
    "puf": "PUF functionality can matter to security/cryptography review because it may support device-unique key generation or protection.",
    "encrypted_boot": "Encrypted boot can trigger security/cryptography review questions because it may involve protected boot flows and cryptographic verification.",
    "peripheral_adc": "Peripheral ADC/DAC features should be recorded as subordinate MCU peripherals, not treated as the primary product type.",
    "peripheral_dac": "Peripheral ADC/DAC features should be recorded as subordinate MCU peripherals, not treated as the primary product type.",
    "digital_interface": "Connectivity interfaces help reviewers understand the processor integration profile and whether electronics interface review is needed.",
    "ethernet_mac": "Ethernet interfaces help reviewers understand the processor integration profile and whether electronics interface review is needed.",
    "usb_interface": "USB interfaces help reviewers understand the processor integration profile and whether electronics interface review is needed.",
    "can_interface": "CAN interfaces help reviewers understand the processor integration profile and whether electronics interface review is needed.",
    "spi_interface": "SPI interfaces help reviewers understand the processor integration profile and whether electronics interface review is needed.",
    "i2c_interface": "I2C interfaces help reviewers understand the processor integration profile and whether electronics interface review is needed.",
    "uart_interface": "UART interfaces help reviewers understand the processor integration profile and whether electronics interface review is needed.",
    "display_camera_interface": "Display and camera interfaces help reviewers understand the processor integration profile and whether electronics interface review is needed.",
    "camera_interface": "Camera interfaces help reviewers understand the processor integration profile and whether electronics interface review is needed.",
    "display_interface": "Display interfaces help reviewers understand the processor integration profile and whether electronics interface review is needed.",
    "audio_interface": "Audio interfaces help reviewers understand the processor integration profile and whether electronics interface review is needed.",
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


def select_backend(execution_mode: str, selected_provider: str | None) -> str:
    provider = selected_provider or ("gemma_local" if execution_mode == "local" else "fireworks")
    return {
        "gemma_local": "local",
        "fireworks": "fireworks",
        "junglegrid": "jungle_grid",
        "amd_notebook_manual": "amd_notebook_manual",
    }.get(provider, provider)


def _backend_selection_reason(execution_mode: str, selected_backend: str, document: dict[str, Any]) -> str:
    if execution_mode == "local":
        return "Local execution selected; Gemma Local is required."
    return f"Remote execution selected; Substrata routed this run to {selected_backend}."


def _normalize_whitespace(value: str) -> str:
    return " ".join(value.split())


def _interface_family(spec: ExtractedSpec) -> str:
    if spec.name in {"ethernet_mac"} or spec.value.lower() == "ethernet":
        return "ethernet"
    if spec.name in {"pcie_interface"} or spec.value.lower() == "pcie":
        return "pcie"
    if spec.name in {"i2c_interface"} or spec.value.lower() == "i2c":
        return "i2c"
    if spec.name in {"uart_interface"} or spec.value.lower() == "uart":
        return "uart"
    if spec.name in {"jtag_interface"} or spec.value.lower() == "jtag":
        return "jtag"
    if spec.name in {"displayport_interface", "displayport_lane_rate"} or "displayport" in spec.value.lower():
        return "displayport"
    return spec.value.lower()


def _display_name_for_key(spec: ExtractedSpec) -> str:
    return spec.display_name or spec.name.replace("_", " ").title()


def _dedupe_interface_facts(specs: list[ExtractedSpec]) -> list[ExtractedSpec]:
    specific_interface_names = {
        "ethernet_mac",
        "pcie_interface",
        "i2c_interface",
        "uart_interface",
        "jtag_interface",
        "displayport_interface",
        "displayport_lane_rate",
    }
    specific_families = {
        _interface_family(spec)
        for spec in specs
        if spec.name in specific_interface_names
    }

    deduped: list[ExtractedSpec] = []
    seen: set[tuple[str, str, str, str, str]] = set()
    for spec in specs:
        family = _interface_family(spec) if spec.category == "digital_interface" else ""
        if spec.name == "digital_interface" and family in specific_families:
            continue
        key = (
            spec.category.lower(),
            _display_name_for_key(spec).lower(),
            spec.value.lower(),
            spec.source_snippet.lower(),
            family,
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(spec)
    return deduped


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
    candidate_snippets = [
        *extraction.product_profile.supporting_snippets,
        *(fact.source_snippet for fact in extraction.extracted_facts),
    ]
    source_quotes = "\n".join(
        [*extraction.product_profile.supporting_snippets, *(fact.source_snippet for fact in extraction.extracted_facts)]
    ).lower()
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
        # A document-type qualifier (for example, "Draft Product Brief") is
        # not a publication/document identifier. Keep weak family-overview
        # metadata out of reviewer-facing facts unless it is affirmative.
        if name == "is_family_overview" and str(value).strip().lower() == "false":
            continue
        if name == "document_number" and not re.search(
            r"\b(?:document|drawing|spec(?:ification)?|publication|revision|doc)\s*(?:number|no\.?|id)?\s*[:#-]?\s*[A-Z0-9][A-Z0-9_.-]{2,}\b",
            str(value),
            flags=re.IGNORECASE,
        ) and not re.fullmatch(r"(?:DS|UG|PG|WP|XAPP)\d{3,5}[A-Z]?", str(value).strip(), flags=re.IGNORECASE):
            continue
        if name == "manufacturer" and str(value).strip().lower() not in source_quotes:
            # Platform/workspace/provider identity is prompt context, not product
            # manufacturer evidence. Unverified identity remains unknown.
            continue
        value_text = str(value).strip()
        direct_snippet = next(
            (quote for quote in candidate_snippets if value_text.lower() in quote.lower()),
            None,
        )
        specs.append(
            ExtractedSpec(
                name=name,
                value=value_text,
                unit=None,
                source_snippet=direct_snippet or snippet,
                importance=AI_IDENTITY_IMPORTANCE[name],
                category="profile_detection" if name.startswith("profile_") or name == "product_profile" else "product_identity",
                confidence=extraction.product_profile.confidence if name.startswith("profile_") or name == "product_profile" else ("medium" if direct_snippet else "low"),
                extraction_rationale="Direct source-span match." if direct_snippet else "Inferred identity metadata; source span did not contain the exact value.",
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
        if spec.importance.strip().lower() in {"high", "medium", "low"}:
            spec.importance = SPEC_IMPORTANCE_SENTENCES.get(
                spec.name,
                "This fact helps reviewers understand the device architecture and decide which expert review path should be evaluated.",
            )
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
            "fileName": worker_input.document_metadata.get("fileName", "Not recorded"),
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


def _backend_client(selected_backend: str):
    if selected_backend == "local":
        return LocalBackend()
    if selected_backend == "fireworks":
        return FireworksBackend()
    if selected_backend == "jungle_grid":
        return JungleGridBackend()
    raise ValueError(f"Unsupported execution backend: {selected_backend}")


def _run_backend_flow(
    *,
    worker_input: Any,
    text: str,
    source_label: str,
    execution_mode: str,
    selected_provider: str | None,
) -> tuple[list[ExtractedSpec], list[Any], list[str], float, str, dict[str, Any], AIExtractionResult, BackendResult]:
    backend_text = truncate_for_ai(text, _ai_max_input_chars())
    selected_backend = select_backend(execution_mode, selected_provider)
    selection_reason = _backend_selection_reason(
        execution_mode,
        selected_backend,
        {
            "origin": worker_input.document_metadata.get("origin"),
            "visibility": worker_input.document_metadata.get("visibility"),
        },
    )
    _log_worker_event(
        "backend_flow.started",
        document_id=worker_input.document_id,
        backend=selected_backend,
        execution_mode=execution_mode,
        selected_provider=selected_provider,
        source_text_characters=len(text),
        backend_input_characters=len(backend_text),
        backend_input_truncated=len(backend_text) < len(text),
    )
    backend = _backend_client(selected_backend)
    result = backend.run_classification(
        backend_text,
        {
            "document_id": worker_input.document_id,
            "document_title": worker_input.document_title,
            "file_name": str(worker_input.document_metadata.get("fileName", "Not recorded")),
            "origin": worker_input.document_metadata.get("origin"),
            "visibility": worker_input.document_metadata.get("visibility"),
            "backend_reason": selection_reason,
            "selected_backend": selected_backend,
            "execution_mode": execution_mode,
            "selected_provider": selected_provider,
        },
    )
    if result.status != "completed":
        raise BackendExecutionError(result)
    extraction = validate_ai_extraction_payload(result.output)
    _log_worker_event(
        "backend_flow.extraction_validated",
        document_id=worker_input.document_id,
        backend=selected_backend,
        profile=extraction.product_profile.profile,
        profile_confidence=extraction.product_profile.confidence,
        extracted_fact_count=len(extraction.extracted_facts),
        missing_fact_count=len(extraction.missing_facts),
        warning_count=len(extraction.warnings),
        cost_usd=result.cost_usd,
        latency_ms=result.latency_ms,
        tokens_used=result.tokens_used,
    )
    specs = _dedupe_interface_facts(_merge_ai_specs(extraction))
    candidates, uncertainty_flags, confidence = generate_eccn_candidates(specs, source_label=source_label)
    capability_signals = derive_capability_signals(specs)
    _log_worker_event(
        "backend_flow.local_candidates_generated",
        document_id=worker_input.document_id,
        backend=selected_backend,
        extracted_spec_count=len(specs),
        candidate_count=len(candidates),
        candidate_eccns=[candidate.eccn for candidate in candidates],
    )
    memo_markdown = generate_memo(
        worker_input.document_id,
        worker_input.document_title,
        worker_input.document_metadata,
        specs,
        candidates,
        uncertainty_flags,
        capability_signals,
    )
    validate_memo_markdown(memo_markdown)
    _log_worker_event(
        "backend_flow.memo_validated",
        document_id=worker_input.document_id,
        backend=selected_backend,
        memo_characters=len(memo_markdown),
    )
    metadata = {
        "classificationMode": "local_assisted" if execution_mode == "local" else "remote_assisted",
        "executionMode": execution_mode,
        "selectedProvider": selected_provider or selected_backend,
        "backendUsed": result.backend,
        "backendReason": result.reason,
        "underlyingProvider": result.underlying_provider,
        "backendStatus": result.status,
        "backendModel": (
            (result.runtime_metadata or {}).get("model")
            or os.environ.get("LOCAL_GEMMA_MODEL")
            or os.environ.get("GEMMA_MODEL", "gemma4:e2b")
            if result.backend == "local"
            else os.environ.get("FIREWORKS_MODEL", "accounts/fireworks/models/gpt-oss-120b")
            if result.backend == "fireworks"
            else None
        ),
        "backendInputCharacters": len(backend_text),
        "backendInputTruncated": len(backend_text) < len(text),
        "costUsd": result.cost_usd,
        "latencyMs": result.latency_ms,
        "tokensUsed": result.tokens_used,
        "executionJobId": result.job_id,
        "gpuVendor": result.gpu_vendor,
        "gpuName": result.gpu_name,
        "runtimeVersion": result.runtime_version,
        "imageName": result.image_name,
        "imageDigest": result.image_digest,
        "inputTokens": result.input_tokens,
        "outputTokens": result.output_tokens,
        "logPath": result.log_path,
        "localRuntime": (result.runtime_metadata or {}).get("localRuntime"),
        "localDevice": (result.runtime_metadata or {}).get("device"),
        "localBackend": (result.runtime_metadata or {}).get("backend"),
    }
    return specs, candidates, uncertainty_flags, confidence, memo_markdown, metadata, extraction, result


def _run_heuristic_flow(
    worker_input: Any,
    text: str,
    source_label: str,
    *,
    fallback_reason: str | None = None,
    backend_result: BackendResult | None = None,
):
    specs = _dedupe_interface_facts(_ensure_profile_specs(extract_specs(text)))
    candidates, uncertainty_flags, confidence = generate_eccn_candidates(specs, source_label=source_label)
    capability_signals = derive_capability_signals(specs)
    memo_markdown = generate_memo(
        worker_input.document_id,
        worker_input.document_title,
        worker_input.document_metadata,
        specs,
        candidates,
        uncertainty_flags,
        capability_signals,
    )
    metadata = {
        "classificationMode": "heuristic_fallback" if fallback_reason else "heuristic",
        "fallbackReason": fallback_reason,
        "backendUsed": backend_result.backend if backend_result else None,
        "backendReason": backend_result.reason if backend_result else None,
        "underlyingProvider": backend_result.underlying_provider if backend_result else None,
        "backendStatus": backend_result.status if backend_result else "completed",
        "costUsd": backend_result.cost_usd if backend_result else 0.0,
        "latencyMs": backend_result.latency_ms if backend_result else 0.0,
        "tokensUsed": backend_result.tokens_used if backend_result else None,
        "executionJobId": backend_result.job_id if backend_result else None,
        "gpuVendor": backend_result.gpu_vendor if backend_result else None,
        "gpuName": backend_result.gpu_name if backend_result else None,
        "runtimeVersion": backend_result.runtime_version if backend_result else None,
        "imageName": backend_result.image_name if backend_result else None,
        "imageDigest": backend_result.image_digest if backend_result else None,
        "inputTokens": backend_result.input_tokens if backend_result else None,
        "outputTokens": backend_result.output_tokens if backend_result else None,
        "logPath": backend_result.log_path if backend_result else None,
        "backendModel": (
            os.environ.get("GEMMA_MODEL", "gemma4:e2b")
            if backend_result and backend_result.backend == "local"
            else os.environ.get("FIREWORKS_MODEL", "accounts/fireworks/models/gpt-oss-120b")
            if backend_result and backend_result.backend == "fireworks"
            else None
        ),
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


def _iso_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _regulation_source_from_citation(candidate_eccn: str, citation: Any | None) -> RegulationSource:
    label = getattr(citation, "citation_label", f"{candidate_eccn} regulation source")
    text = getattr(citation, "citation_text", "Primary regulation text should be verified by a qualified reviewer.")
    source = getattr(citation, "source", candidate_eccn)
    return RegulationSource(
        authority="BIS / eCFR",
        regulation_title=label,
        regulation_version="retrieved current",
        citation_text=text,
        citation_url="https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-774",
        source_identifier=source,
        section=source,
        paragraph=None,
        kind="primary_regulation",
        last_verified_at=_iso_now(),
        verification_status="needs_verification",
    )


def _candidate_fact_mapping(specs: list[ExtractedSpec], matched_facts: list[str]) -> list[CandidateFactMapping]:
    mappings: list[CandidateFactMapping] = []
    seen: set[tuple[str, str]] = set()
    for fact in matched_facts[:8]:
        fact_name = fact.split(":", 1)[0].strip().lower().replace(" ", "_")
        spec = next((item for item in specs if item.name == fact_name), None)
        if not spec:
            continue
        mapping_key = (spec.name, spec.display_name or spec.name)
        if mapping_key in seen:
            continue
        seen.add(mapping_key)
        mappings.append(
            CandidateFactMapping(
                fact_name=spec.name,
                criterion_label=spec.display_name or spec.name.replace("_", " ").title(),
                matched_value=f"{spec.value}{f' {spec.unit}' if spec.unit else ''}",
                comparison_result="Source-backed technical fact warrants reviewer comparison.",
            )
        )
    return mappings


def _review_paths_from_candidates(candidates: list[Any], specs: list[ExtractedSpec], heuristic_result: Any | None = None) -> list[ReviewPath]:
    if heuristic_result is not None:
        paths: list[ReviewPath] = []
        for item in heuristic_result.review_paths:
            path_key = item["pathKey"]
            related = next((candidate for candidate in candidates if candidate.review_path_id == path_key), None)
            fact_names = list(dict.fromkeys(
                name
                for signal in heuristic_result.matched_signals
                for name in signal.get("supportingFactNames", [])
            ))[:10] or [spec.name for spec in specs[:6]]
            citations = related.regulatory_citations if related else [
                build_document_citation(spec, source="Current document text") for spec in specs[:3]
            ]
            path_title = item["title"]
            path_type = "encryption_security" if "security" in path_title.lower() or "crypto" in path_title.lower() else "special_environment" if "special-environment" in path_title.lower() else "general_fallback" if "fallback" in path_title.lower() else "product_area"
            paths.append(ReviewPath(
                path_key=path_key,
                title=path_title,
                scope=f"Assess the extracted evidence against the current control text for this {path_title.lower()}.",
                type=path_type,
                status="needs_more_evidence" if item.get("missingInformation") else "open",
                why_triggered=item["whyTriggered"],
                technical_risk_area="Cryptography and hardware security" if path_type == "encryption_security" else "Technical performance, configuration, and current threshold mapping",
                triggered_fact_names=fact_names,
                regulatory_citations=citations,
                missing_information=item.get("missingInformation", []),
                reviewer_questions=heuristic_result.reviewer_questions[:6],
            ))
        return paths

    paths: list[ReviewPath] = []
    seen_path_keys: set[str] = set()
    for index, candidate in enumerate(candidates):
        path_key = candidate.review_path_key or candidate.review_path_id or f"review_path_{index + 1}"
        if path_key in seen_path_keys:
            continue
        seen_path_keys.add(path_key)
        path_title = PATH_TITLES.get(path_key, candidate.title)
        path_type = "encryption_security" if "security" in path_title.lower() or "crypto" in path_title.lower() else "special_environment" if "special-environment" in path_title.lower() else "general_fallback" if "fallback" in path_title.lower() else "product_area"
        fact_names = [
            spec.name
            for spec in specs
            if any(spec.name in fact.lower().replace(" ", "_") for fact in candidate.matched_technical_facts)
        ][:8]
        if not fact_names:
            fact_names = [spec.name for spec in specs[:4]]
        paths.append(
            ReviewPath(
                path_key=path_key,
                title=path_title,
                scope=f"Assess whether the extracted technical evidence supports the {path_title.lower()}.",
                type=path_type,
                status="open",
                why_triggered=candidate.why_it_may_apply,
                technical_risk_area="Cryptography and hardware security" if path_type == "encryption_security" else "Processor architecture and performance",
                triggered_fact_names=fact_names,
                regulatory_citations=candidate.regulatory_citations,
                missing_information=candidate.missing_information,
                reviewer_questions=candidate.reviewer_questions,
            )
        )
    return paths


def _review_paths_from_decision(decision: Any) -> list[ReviewPath]:
    return [
        ReviewPath(
            path_key=path["pathKey"],
            title=path["title"],
            scope=f"Review the canonical source evidence for {path['title'].lower()}.",
            type="encryption_security" if path["pathKey"] == "category_5_part_2_security" else "product_area",
            status="needs_more_evidence" if path["missingEvidence"] else "open",
            why_triggered=path["whyTriggered"],
            triggered_fact_names=path["triggeringEvidenceIds"],
            regulatory_citations=[],
            missing_information=path["missingEvidence"],
            reviewer_questions=path["reviewerQuestions"],
            technical_risk_area=None,
        )
        for path in decision.open_review_paths
    ]


def _fact_issues(specs: list[ExtractedSpec], extraction: AIExtractionResult | None) -> list[FactIssue]:
    issues: list[FactIssue] = []
    if extraction and extraction.product_identity.is_family_overview:
        issues.append(
            FactIssue(
                issue_type="family_scope_warning",
                summary="Family-level source detected",
                details="The source appears to describe a product family rather than a single verified ordering code. Device-specific ordering codes and configuration details may still be required.",
                primary_fact_name="is_family_overview",
            )
        )
    seen: dict[tuple[str, str], ExtractedSpec] = {}
    for spec in specs:
        key = (spec.name, spec.value)
        if key in seen:
            issues.append(
                FactIssue(
                    issue_type="duplicate",
                    summary=f"Duplicate fact detected for {spec.display_name or spec.name}",
                    details="The same fact value appeared more than once in the extracted source-backed technical facts.",
                    primary_fact_name=spec.name,
                    related_fact_name=seen[key].name,
                )
            )
        seen[key] = spec
    return issues


def _specific_eccn_candidates(candidates: list[Any], specs: list[ExtractedSpec]) -> list[Any]:
    specific: list[Any] = []
    seen_candidate_keys: set[str] = set()
    for candidate in candidates:
        if not SPECIFIC_ECCN_PATTERN.fullmatch(candidate.eccn.strip()):
            continue
        candidate_key = f"{candidate.eccn}:{candidate.review_path_id or candidate.title}"
        if candidate_key in seen_candidate_keys:
            continue
        seen_candidate_keys.add(candidate_key)
        regulation_source = _regulation_source_from_citation(
            candidate.eccn,
            candidate.regulatory_citations[0] if candidate.regulatory_citations else None,
        )
        candidate.official_title = candidate.title
        candidate.confidence_rationale = (
            "Confidence reflects evidence completeness, missing technical thresholds, and source specificity rather than generic model confidence."
        )
        candidate.status = "review_required"
        candidate.regulation_source = regulation_source
        candidate.paragraph_reference = regulation_source.section
        candidate.control_criteria = [
            "Specific ECCN comparison requires current regulation text and source-backed technical thresholds."
        ]
        candidate.fact_mappings = _candidate_fact_mapping(specs, candidate.matched_technical_facts)
        candidate.may_apply_reasons = [candidate.why_it_may_apply]
        candidate.may_not_apply_reasons = [candidate.why_it_may_not_apply]
        candidate.alternative_candidates = []
        candidate.review_path_key = candidate.review_path_id or None
        specific.append(candidate)
    return specific


def run(payload_path: str) -> WorkerOutput:
    worker_input = load_input(payload_path)
    text = extract_text(worker_input.file_path)
    qualification = qualify_document(text, worker_input.document_metadata)
    _log_worker_event(
        "document.qualified",
        document_id=worker_input.document_id,
        document_role=qualification.documentRole,
        classifiability=qualification.classifiability,
        product_mention_count=qualification.productMentionCount,
        independent_product_entity_count=qualification.independentProductEntityCount,
        history_reference_count=qualification.historyReferenceCount,
        comparison_reference_count=qualification.comparisonReferenceCount,
    )
    for entity in qualification.entities:
        if entity.entityType == "product" and entity.relationshipToDocument not in {"primary_subject", "secondary_subject"}:
            _log_worker_event(
                "entity.reference_resolved",
                document_id=worker_input.document_id,
                mention=entity.canonicalName,
                relationship=entity.relationshipToDocument,
                independently_classifiable=entity.independentlyClassifiable,
                source_evidence_id=(entity.referenceEvidenceIds or entity.sourceSpanIds)[0] if (entity.referenceEvidenceIds or entity.sourceSpanIds) else None,
                reason_codes=entity.reasonCodes,
            )
    if qualification.classifiability != "single_product_classifiable":
        return _entity_intake_output(worker_input, text, qualification, payload_path)
    source_label = _document_source_label(worker_input.document_metadata.get("sourceType"))
    execution_mode = getattr(worker_input, "execution_mode", "remote")
    selected_provider = getattr(worker_input, "selected_provider", None)
    selected_backend = select_backend(execution_mode, selected_provider)
    fallback_enabled = _env_truthy("AI_FALLBACK_TO_HEURISTIC", True) and execution_mode != "local"
    extraction: AIExtractionResult | None
    backend_result: BackendResult | None = None

    _log_worker_event(
        "worker.backend_gate",
        document_id=worker_input.document_id,
        execution_mode=execution_mode,
        selected_provider=selected_provider,
        selected_backend=selected_backend,
        fallback_enabled=fallback_enabled,
        source_text_characters=len(text),
        document_origin=worker_input.document_metadata.get("origin"),
        document_visibility=worker_input.document_metadata.get("visibility"),
    )

    try:
        (
            specs,
            candidates,
            uncertainty_flags,
            confidence,
            memo_markdown,
            run_metadata,
            extraction,
            backend_result,
        ) = _run_backend_flow(
            worker_input=worker_input,
            text=text,
            source_label=source_label,
            execution_mode=execution_mode,
            selected_provider=selected_provider,
        )
    except BackendExecutionError as error:
        backend_result = error.result
        _log_worker_event(
            "backend_flow.unresolved",
            document_id=worker_input.document_id,
            backend=backend_result.backend,
            backend_status=backend_result.status,
            error_type=type(error).__name__,
            error_message=str(error)[:1000],
            fallback_enabled=fallback_enabled,
        )
        if not fallback_enabled and backend_result.status != "unknown":
            raise
        specs, candidates, uncertainty_flags, confidence, memo_markdown, run_metadata, extraction = _run_heuristic_flow(
            worker_input,
            text,
            source_label,
            fallback_reason=(
                f"{backend_result.backend} backend returned unknown status"
                if backend_result.status == "unknown"
                else f"{backend_result.backend} backend failed"
            ),
            backend_result=backend_result,
        )
        uncertainty_flags = list(dict.fromkeys([*uncertainty_flags, "requires_engineering_confirmation"]))
        run_metadata["backendErrorMessage"] = str(error)[:500]
        if backend_result.status == "unknown":
            run_metadata["backendStatus"] = "unknown"
    except (RuntimeError, ValueError) as error:
        _log_worker_event(
            "backend_flow.failed",
            document_id=worker_input.document_id,
            backend=selected_backend,
            error_type=type(error).__name__,
            error_message=str(error)[:1000],
            fallback_enabled=fallback_enabled,
        )
        if not fallback_enabled:
            raise
        specs, candidates, uncertainty_flags, confidence, memo_markdown, run_metadata, extraction = _run_heuristic_flow(
            worker_input,
            text,
            source_label,
            fallback_reason=f"{selected_backend} backend failed",
        )
        uncertainty_flags = list(dict.fromkeys([*uncertainty_flags, "requires_engineering_confirmation"]))
        run_metadata["backendErrorMessage"] = str(error)[:500]

    # The deterministic engine is authoritative for profiles, review paths, and
    # candidate selection in every execution mode. The LLM extraction remains a
    # source of normalized facts and cited snippets, never the routing authority.
    prior_stage_candidates = [candidate.eccn for candidate in candidates]
    backend_proposed_profile = extraction.product_profile.profile if extraction else None
    specs, candidates, heuristic_result = evaluate_classification_heuristics(
        specs,
        text,
        source_label=source_label,
    )
    confidence = float(heuristic_result.confidence_summary["score"])
    uncertainty_flags = list(
        dict.fromkeys(
            [
                *uncertainty_flags,
                *(("missing_key_specs",) if heuristic_result.missing_evidence_checks else ()),
                *(("multiple_plausible_eccns",) if len(candidates) > 1 else ()),
                "requires_engineering_confirmation",
            ]
        )
    )
    capability_signals = derive_capability_signals(specs)
    decision = build_classification_decision(
        run_id=str(worker_input.document_metadata.get("classificationRunId", worker_input.document_id)),
        document_id=worker_input.document_id,
        source_text=text,
        specs=specs,
        candidates=candidates,
        heuristic_result=heuristic_result,
        backend_proposed_profile=backend_proposed_profile,
        backend_provider=selected_provider or selected_backend,
        prior_stage_candidates=prior_stage_candidates,
        target_entity={
            "id": next(entity.id for entity in qualification.entities if entity.relationshipToDocument == "primary_subject" and entity.classificationEligible),
            "relationshipToDocument": "primary_subject",
        },
    )
    canonical_profile = decision.product_level_profile["profile"]
    for spec in specs:
        if spec.name == "product_profile":
            spec.value = canonical_profile
            spec.extraction_rationale = "Projection of the canonical classification decision."
        elif spec.name == "profile_confidence":
            score = float(decision.product_level_profile["confidence"])
            spec.value = "high" if score >= 0.75 else "medium" if score >= 0.5 else "low"
            spec.extraction_rationale = "Projection of the canonical classification decision."
        elif spec.name == "profile_rationale":
            spec.value = "Resolved from exported product form, component profiles, capabilities, and source-evidence scope."
            spec.extraction_rationale = "Projection of the canonical classification decision."
    heuristic_result.classification_trace["validatedDecision"] = decision.to_dict()
    heuristic_result.classification_trace["detectedProfiles"] = [canonical_profile]
    heuristic_result.classification_trace["componentProfiles"] = [
        item["profile"] for item in decision.component_level_profiles
    ]
    heuristic_result.classification_trace["reviewPathsOpened"] = [
        item["pathKey"] for item in decision.open_review_paths
    ]
    memo_markdown = generate_canonical_memo(
        document_title=worker_input.document_title,
        document_metadata=worker_input.document_metadata,
        specs=specs,
        decision=decision,
    )
    decision.validation_results.extend(semantic_validation_results(
        decision=decision,
        memo=memo_markdown,
        specs=specs,
        backend_proposed_profile=backend_proposed_profile,
        prior_stage_candidates=prior_stage_candidates,
    ))
    semantic_failures = [item for item in decision.validation_results if not item["passed"]]
    if semantic_failures:
        _log_worker_event(
            "worker.semantic_validation_failed",
            document_id=worker_input.document_id,
            failures=semantic_failures,
        )
    assert_semantically_valid(decision.validation_results)
    heuristic_result.classification_trace["validatedDecision"] = decision.to_dict()
    _, _, validated_heuristic_result = evaluate_classification_heuristics(
        specs,
        text,
        source_label=source_label,
        memo_markdown=memo_markdown,
    )
    heuristic_result.contradiction_flags = validated_heuristic_result.contradiction_flags
    heuristic_result.classification_trace["contradictions"] = validated_heuristic_result.contradiction_flags
    heuristic_result.classification_trace.update(
        {
            "backendMode": run_metadata.get("classificationMode", "unknown"),
            "backendSelected": selected_backend,
            "backendStatus": run_metadata.get("backendStatus", "unknown"),
            "extractionSource": (
                "llm_extracted_facts"
                if run_metadata.get("classificationMode") in {"local_assisted", "remote_assisted"}
                else "deterministic_fallback_extractor"
            ),
        }
    )
    run_metadata["classificationTrace"] = heuristic_result.classification_trace
    run_metadata["decisionSchemaVersion"] = decision.schema_version
    run_metadata["executionMode"] = execution_mode
    run_metadata["selectedProvider"] = selected_provider or selected_backend
    heuristic_result.classification_trace["execution"] = {
        "executionMode": execution_mode,
        "selectedProvider": selected_provider or selected_backend,
        "providerSelectionReason": run_metadata.get("backendReason"),
        "fallbackUsed": run_metadata.get("classificationMode") == "heuristic_fallback",
        "fallbackReason": run_metadata.get("fallbackReason"),
        "localRuntime": run_metadata.get("localRuntime"),
        "model": run_metadata.get("backendModel"),
        "device": run_metadata.get("localDevice"),
        "backend": run_metadata.get("localBackend"),
    }
    run_metadata["heuristicResult"] = heuristic_result.to_dict()

    sample_dir = Path(payload_path).resolve().parent
    artifacts_dir = sample_dir / "artifacts"
    artifacts_dir.mkdir(exist_ok=True)

    extracted_text_path = artifacts_dir / f"{worker_input.document_id}-extracted.txt"
    structured_output_path = artifacts_dir / f"{worker_input.document_id}-output.json"
    memo_path = artifacts_dir / f"{worker_input.document_id}-memo.md"
    profile_path = artifacts_dir / f"{worker_input.document_id}-profile.json"
    facts_path = artifacts_dir / f"{worker_input.document_id}-extracted-facts.json"
    review_paths_path = artifacts_dir / f"{worker_input.document_id}-review-paths.json"

    review_paths = _review_paths_from_decision(decision)
    fact_issues = _fact_issues(specs, extraction)
    eligible_codes = {item["eccn"] for item in decision.eligible_candidates}
    specific_candidates = _specific_eccn_candidates(
        [candidate for candidate in candidates if candidate.eccn in eligible_codes], specs
    )
    capability_signals = derive_capability_signals(specs)
    validation_issues = validate_narrative_consistency(
        capability_signals=capability_signals,
        review_paths=review_paths,
        eccn_candidates=specific_candidates,
        uncertainty_flags=uncertainty_flags,
        memo_markdown=memo_markdown,
    )
    confidence_rationale = (
        "Confidence reflects source specificity, missing threshold data, unresolved reviewer questions, and whether the current document appears family-level rather than ordering-code-specific."
    )

    extracted_text_path.write_text(text)
    memo_path.write_text(memo_markdown)
    profile_path.write_text(json.dumps(_profile_artifact_payload(specs, extraction), indent=2))
    facts_path.write_text(json.dumps([asdict(spec) for spec in specs], indent=2))
    review_paths_path.write_text(json.dumps([asdict(path) for path in review_paths], indent=2))

    output = WorkerOutput(
        document_id=worker_input.document_id,
        organization_id=worker_input.organization_id,
        requires_human_review=True,
        confidence=confidence,
        confidence_rationale=confidence_rationale,
        uncertainty_flags=uncertainty_flags,
        extracted_specs=specs,
        fact_issues=fact_issues,
        review_paths=review_paths,
        eccn_candidates=specific_candidates,
        capability_signals=capability_signals,
        validation_issues=validation_issues,
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
        heuristic_result=heuristic_result.to_dict(),
        classification_trace=heuristic_result.classification_trace,
    )

    validate_worker_output(
        document_title=worker_input.document_title,
        extracted_text=text,
        output=output,
    )
    run_metadata.update(
        {
            "backendSelected": selected_backend,
            "backendCompleted": run_metadata.get("backendStatus") == "completed",
            "backendOutputValidated": True,
            "memoValidated": True,
            "workerPreHistoryValidated": True,
            "fallbackEnabled": fallback_enabled,
            "fallbackUsed": run_metadata.get("classificationMode") == "heuristic_fallback",
            "missingFactCount": len(extraction.missing_facts) if extraction else 0,
            "warningCount": (
                (len(extraction.warnings) if extraction else 0)
                + sum(1 for issue in validation_issues if issue.severity == "warning")
            ),
            "evidenceChecksUnresolved": bool(
                validation_issues
                or uncertainty_flags
                or fact_issues
                or (extraction and extraction.missing_facts)
                or (extraction and extraction.warnings)
            ),
        }
    )
    _log_worker_event(
        "worker.pre_history_decision_validated",
        document_id=worker_input.document_id,
        classification_mode=run_metadata.get("classificationMode"),
        extracted_spec_count=len(specs),
        candidate_count=len(specific_candidates),
        memo_characters=len(memo_markdown),
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
