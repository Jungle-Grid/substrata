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


def build_document_citation(spec: ExtractedSpec, *, source: str) -> RegulatoryCitation:
    specific_labels = {
        "product_family": "product family",
        "processor_architecture": "CPU architecture",
        "cpu_core": "CPU architecture",
        "programmable_logic": "programmable logic",
        "secure_boot": "secure boot",
        "pcie_interface": "PCIe interface",
        "displayport_lane_rate": "DisplayPort lane rate",
    }
    if spec.name == "cryptographic_algorithm":
        label_detail = spec.value
    else:
        label_detail = specific_labels.get(spec.name, display_name_for_spec_name(spec.name))
    return RegulatoryCitation(
        citation_label=f"Datasheet evidence — {label_detail}",
        citation_text=spec.source_snippet,
        source=source,
        relevance=spec.importance,
    )
