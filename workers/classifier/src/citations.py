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


def build_current_control_text_citation(eccn: str) -> RegulatoryCitation:
    category_by_eccn = {
        "3A090": "Category 3",
        "4A090": "Category 4",
        "5A002": "Category 5 Part 2",
        "3A991": "Category 3",
    }
    category = category_by_eccn.get(eccn, "the applicable category")
    return build_regulatory_citation(
        f"{eccn} — Current control-text review required",
        "Current control text has not been retrieved by this run. A qualified reviewer must compare the extracted facts against the current control text and applicable notes.",
        f"Supports opening {eccn} as a review candidate; it is not a completed regulatory citation analysis.",
        source=f"15 CFR Part 774, Supplement No. 1, {category}",
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
