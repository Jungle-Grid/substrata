from __future__ import annotations

from dataclasses import asdict, dataclass, field
import hashlib
import re
from typing import Any, Literal

from schemas import ExtractedSpec


EvidencePolarity = Literal["present", "absent", "unknown", "ambiguous", "not_applicable"]
EvidenceOrigin = Literal["source_document", "user_input", "company_history", "regulatory_source", "derived", "model_generated"]
EvidenceStrength = Literal["explicit", "strong_inference", "weak_inference"]


@dataclass(frozen=True)
class EvidenceRecord:
    id: str
    fact_type: str
    normalized_value: Any
    raw_value: str | None
    polarity: EvidencePolarity
    origin: EvidenceOrigin
    strength: EvidenceStrength
    confidence: float
    document_id: str | None = None
    document_version: str | None = None
    page: int | None = None
    section: str | None = None
    chunk_id: str | None = None
    exact_quote: str | None = None
    character_start: int | None = None
    character_end: int | None = None
    configuration_scope: str | None = None
    product_variant: str | None = None
    source_timestamp: str | None = None
    extraction_method: str = "deterministic_evidence_normalizer"
    extractor_version: str = "evidence_v1"
    model_provider: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class Contradiction:
    id: str
    subject: str
    evidence_a: str
    evidence_b: str
    contradiction_type: Literal[
        "explicit_positive_vs_negative",
        "configuration_conflict",
        "source_conflict",
        "temporal_conflict",
        "profile_requirement_conflict",
        "history_mismatch",
        "regulatory_mismatch",
    ]
    severity: Literal["blocking", "major", "minor"]
    resolution_status: Literal[
        "unresolved", "resolved_by_scope", "resolved_by_source_priority", "resolved_by_reviewer"
    ] = "unresolved"
    resolution_reason: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


NEGATION_PATTERNS = (
    r"\bno\b",
    r"\bnot\s+(?:included|available|present|provided|supported|populated|enabled)\b",
    r"\bwithout\b",
    r"\bdisabled\b",
    r"\bunpopulated\b",
    r"\bexcludes?\b",
    r"\bunavailable\b",
    r"\bdoes\s+not\b",
)
CONDITIONAL_PATTERNS = (
    r"\boptional(?:ly)?\b",
    r"\bavailable\s+(?:separately|in\s+another)\b",
    r"\bif\s+(?:enabled|installed|populated|configured)\b",
    r"\bsome\s+(?:skus?|models?|variants?)\b",
    r"\broadmap\b",
    r"\bfuture\s+(?:model|release|variant)\b",
    r"\bunless\b",
    r"\bexcept\b",
)
UNKNOWN_PATTERNS = (
    r"\bunknown\b",
    r"\bnot\s+(?:specified|provided|documented)\b",
    r"\bto\s+be\s+(?:confirmed|determined)\b",
)
INSTRUCTION_PATTERNS = (
    r"ignore\s+(?:all\s+)?previous\s+instructions",
    r"classify\s+(?:this|the)\s+product\s+as\s+[0-9][a-e][0-9]{3}",
    r"no\s+human\s+review\s+is\s+required",
    r"retrieve\s+only\s+records\s+that\s+confirm",
)


def _stable_id(*parts: str) -> str:
    return "ev_" + hashlib.sha256("\x1f".join(parts).encode()).hexdigest()[:20]


def segment_source(text: str) -> list[tuple[int, int, str]]:
    segments: list[tuple[int, int, str]] = []
    offset = 0
    for line in text.splitlines(keepends=True):
        content = line.rstrip("\r\n")
        for match in re.finditer(r"[^.!?]+(?:[.!?]+|$)", content):
            value = " ".join(match.group(0).split())
            if value:
                segments.append((offset + match.start(), offset + match.end(), value))
        offset += len(line)
    return segments


def classify_polarity(text: str) -> EvidencePolarity:
    normalized = " ".join(text.lower().split())
    if any(re.search(pattern, normalized) for pattern in UNKNOWN_PATTERNS):
        return "unknown"
    if any(re.search(pattern, normalized) for pattern in NEGATION_PATTERNS):
        return "absent"
    if any(re.search(pattern, normalized) for pattern in CONDITIONAL_PATTERNS):
        return "ambiguous"
    return "present"


def configuration_scope(text: str) -> str | None:
    normalized = " ".join(text.lower().split())
    if re.search(r"\b(?:current|export|production)\s+(?:sku|configuration|variant|unit)\b", normalized):
        return "current_configuration"
    if re.search(r"\b(?:another|other|some)\s+(?:sku|model|variant)|\bfamily[- ]level\b", normalized):
        return "other_or_family_configuration"
    if re.search(r"\b(?:development|evaluation|marketing)\s+(?:configuration|kit|variant)\b", normalized):
        return "non_export_configuration"
    if re.search(r"\b(?:optional|available separately|future model|roadmap)\b", normalized):
        return "optional_or_future_configuration"
    return None


def detect_untrusted_instructions(source_text: str) -> list[str]:
    normalized = source_text.lower()
    return [pattern for pattern in INSTRUCTION_PATTERNS if re.search(pattern, normalized)]


def evidence_for_terms(
    *,
    fact_type: str,
    terms: tuple[str, ...],
    source_text: str,
    specs: list[ExtractedSpec],
) -> list[EvidenceRecord]:
    records: list[EvidenceRecord] = []
    seen: set[tuple[str, EvidencePolarity, str | None]] = set()

    for start, end, quote in segment_source(source_text):
        lowered = quote.lower()
        matched = [term for term in terms if re.search(rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", lowered)]
        if not matched:
            continue
        polarity = classify_polarity(quote)
        scope = configuration_scope(quote)
        key = (quote.lower(), polarity, scope)
        if key in seen:
            continue
        seen.add(key)
        records.append(EvidenceRecord(
            id=_stable_id(fact_type, quote, str(start)),
            fact_type=fact_type,
            normalized_value=matched,
            raw_value=quote,
            polarity=polarity,
            origin="source_document",
            strength="explicit",
            confidence=0.98 if polarity in {"present", "absent"} else 0.65,
            exact_quote=quote,
            character_start=start,
            character_end=end,
            configuration_scope=scope,
            warnings=[],
        ))

    # Provider/local extracted facts are admitted only when their quote can be
    # located in the uploaded source. Generated routing fields never become evidence.
    excluded_categories = {"profile_detection", "normalized_technical_signal"}
    for spec in specs:
        if spec.category in excluded_categories or spec.name.startswith("heuristic_signal_"):
            continue
        quote = " ".join((spec.source_snippet or "").split())
        if not quote or quote.lower() not in " ".join(source_text.split()).lower():
            continue
        if len(segment_source(quote)) > 1:
            # A broad multi-sentence snippet transfers negation and scope across
            # unrelated facts. Sentence-level source records above are canonical.
            continue
        lowered = f"{spec.name} {spec.value} {quote}".lower()
        matched = [
            term for term in terms
            if re.search(rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", lowered)
        ]
        if not matched:
            continue
        polarity = classify_polarity(f"{spec.value}. {quote}")
        key = (quote.lower(), polarity, configuration_scope(quote))
        if key in seen:
            continue
        seen.add(key)
        records.append(EvidenceRecord(
            id=_stable_id(fact_type, quote, spec.name),
            fact_type=fact_type,
            normalized_value=matched,
            raw_value=spec.value,
            polarity=polarity,
            origin="source_document",
            strength="explicit" if spec.value_type == "directly_stated" else "strong_inference",
            confidence={"high": 0.9, "medium": 0.7, "low": 0.5}.get(spec.confidence, 0.5),
            page=spec.source_page_from,
            exact_quote=quote,
            configuration_scope=configuration_scope(quote),
            extraction_method=spec.extraction_method,
            extractor_version=spec.extraction_method_version,
            warnings=[],
        ))
    return records


def effective_polarity(records: list[EvidenceRecord]) -> EvidencePolarity:
    current = [record for record in records if record.configuration_scope == "current_configuration"]
    considered = current or [
        record for record in records
        if record.configuration_scope not in {"other_or_family_configuration", "optional_or_future_configuration", "non_export_configuration"}
    ]
    if not considered:
        considered = records
    polarities = {record.polarity for record in considered}
    if "present" in polarities and "absent" in polarities:
        return "ambiguous"
    if "absent" in polarities:
        return "absent"
    if "present" in polarities:
        return "present"
    if "ambiguous" in polarities:
        return "ambiguous"
    return "unknown"


def contradictory_pairs(subject: str, records: list[EvidenceRecord]) -> list[Contradiction]:
    positive = [record for record in records if record.polarity == "present"]
    negative = [record for record in records if record.polarity == "absent"]
    contradictions: list[Contradiction] = []
    for left in positive:
        for right in negative:
            if left.configuration_scope and right.configuration_scope and left.configuration_scope != right.configuration_scope:
                status = "resolved_by_scope"
                severity = "major"
                kind = "configuration_conflict"
                reason = "Evidence applies to different explicitly identified configurations."
            else:
                status = "unresolved"
                severity = "blocking"
                kind = "explicit_positive_vs_negative"
                reason = None
            contradictions.append(Contradiction(
                id="cx_" + hashlib.sha256(f"{subject}:{left.id}:{right.id}".encode()).hexdigest()[:20],
                subject=subject,
                evidence_a=left.id,
                evidence_b=right.id,
                contradiction_type=kind,
                severity=severity,
                resolution_status=status,
                resolution_reason=reason,
            ))
    return contradictions
