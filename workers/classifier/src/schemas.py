from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass
class WorkerInput:
    document_id: str
    document_title: str
    file_path: str
    organization_id: str
    document_metadata: dict[str, Any]


@dataclass
class ExtractedSpec:
    name: str
    value: str
    unit: str | None
    source_snippet: str
    importance: str
    category: str
    confidence: str


@dataclass
class RegulatoryCitation:
    citation_label: str
    citation_text: str
    source: str
    relevance: str


@dataclass
class ECCNCandidate:
    eccn: str
    title: str
    confidence: str
    matched_technical_facts: list[str]
    regulatory_citations: list[RegulatoryCitation]
    why_it_may_apply: str
    why_it_may_not_apply: str
    missing_information: list[str]
    uncertainty_flags: list[str]
    reviewer_questions: list[str]


@dataclass
class WorkerOutput:
    document_id: str
    organization_id: str
    requires_human_review: bool
    confidence: float
    uncertainty_flags: list[str]
    extracted_specs: list[ExtractedSpec]
    eccn_candidates: list[ECCNCandidate]
    memo_markdown: str
    artifacts: dict[str, str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
