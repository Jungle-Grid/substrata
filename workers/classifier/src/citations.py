from __future__ import annotations

from labels import display_name_for_spec_name
from schemas import ExtractedSpec, RegulatoryCitation


def build_regulatory_citation(
    label: str,
    text: str,
    relevance: str,
    source: str = "15 CFR Part 774, Supplement No. 1, Category 3",
) -> RegulatoryCitation:
    return RegulatoryCitation(
        citation_label=label,
        citation_text=text,
        source=source,
        relevance=relevance,
    )


def build_document_citation(spec: ExtractedSpec) -> RegulatoryCitation:
    return RegulatoryCitation(
        citation_label=f"Datasheet evidence — {display_name_for_spec_name(spec.name)}",
        citation_text=spec.source_snippet,
        source="Uploaded or bundled datasheet text",
        relevance=spec.importance,
    )
