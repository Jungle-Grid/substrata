from __future__ import annotations

from datetime import datetime, UTC

from fact_groups import CATEGORY_DISPLAY_NAMES, group_specs_by_category, infer_missing_review_points
from labels import display_name_for_spec_name
from schemas import ECCNCandidate, ExtractedSpec


def _profile_value(specs: list[ExtractedSpec]) -> str:
    for spec in specs:
        if spec.name == "product_profile":
            return spec.value
    return ""


def _recommended_path_summary(candidates: list[ECCNCandidate]) -> str:
    titles: list[str] = []
    for candidate in candidates:
        title = candidate.title
        for prefix in (
            "Category 3 electronics / ",
            "Category 5 Part 2 ",
        ):
            title = title.replace(prefix, prefix)
        if candidate.eccn == "Category 3" and "Category 3" not in title:
            title = f"Category 3 {title}"
        elif candidate.eccn == "Category 5 Part 2" and "Category 5 Part 2" not in title:
            title = f"Category 5 Part 2 {title}"
        elif candidate.eccn not in {"Category 3", "Category 5 Part 2"} and candidate.eccn not in title:
            title = f"{candidate.eccn} {title}"
        titles.append(title)
    return ", ".join(titles[:3])


def generate_memo(
    document_id: str,
    document_title: str,
    document_metadata: dict[str, object],
    specs: list[ExtractedSpec],
    candidates: list[ECCNCandidate],
    uncertainty_flags: list[str],
) -> str:
    generated_at = datetime.now(UTC).replace(microsecond=0).isoformat()
    grouped_specs = group_specs_by_category(specs)
    missing_points = infer_missing_review_points(specs)
    spec_by_name = {spec.name: spec for spec in specs}
    profile_summary_lines: list[str] = []
    if spec_by_name.get("product_profile"):
        profile_value = spec_by_name["product_profile"].value
        if profile_value == "fpga_programmable_logic_soc":
            display_profile = "FPGA / programmable-logic SoC"
        elif profile_value == "mcu_processor_soc":
            display_profile = "MCU/Processor/SoC"
        else:
            display_profile = profile_value
        profile_summary_lines.append(f"- Detected product profile: {display_profile}")
    if spec_by_name.get("profile_confidence"):
        profile_summary_lines.append(f"- Profile confidence: {spec_by_name['profile_confidence'].value}")
    if spec_by_name.get("profile_rationale"):
        profile_summary_lines.append(f"- Profile rationale: {spec_by_name['profile_rationale'].value}")

    fact_sections: list[str] = []
    for category, category_specs in grouped_specs.items():
        display_name = CATEGORY_DISPLAY_NAMES.get(category, category.replace("_", " ").title())
        lines = [f"### {display_name}"]
        for spec in category_specs:
            lines.extend(
                [
                    f"- **{display_name_for_spec_name(spec.name)}**: {spec.value}{f' {spec.unit}' if spec.unit else ''}",
                    f"- Confidence: {spec.confidence}",
                    f"- Source snippet: \"{spec.source_snippet}\"",
                    f"- Why it matters: {spec.importance}",
                    "",
                ]
            )
        fact_sections.append("\n".join(lines).rstrip())

    if missing_points:
        missing_lines = ["### Missing/not found facts"]
        for item in missing_points:
            missing_lines.append(f"- {item}")
        fact_sections.append("\n".join(missing_lines))

    candidate_sections: list[str] = []
    for candidate in candidates:
        citation_lines: list[str] = []
        for citation in candidate.regulatory_citations:
            citation_lines.extend(
                [
                    f"- **{citation.citation_label}**",
                    f"- Source: {citation.source}",
                    f"- Citation note: {citation.citation_text}",
                    f"- Relevance: {citation.relevance}",
                    "",
                ]
            )

        matched_fact_lines = "\n".join(f"- {fact}" for fact in candidate.matched_technical_facts)
        missing_info_lines = "\n".join(f"- {item}" for item in candidate.missing_information)
        reviewer_question_lines = "\n".join(f"- {item}" for item in candidate.reviewer_questions)
        uncertainty_lines = "\n".join(f"- {item}" for item in candidate.uncertainty_flags)

        candidate_sections.append(
            f"""### {candidate.eccn} — {candidate.title}
- Confidence: {candidate.confidence}
- Why it may apply: {candidate.why_it_may_apply}
- Why it may not apply: {candidate.why_it_may_not_apply}

#### Matched facts
{matched_fact_lines or "- No matched facts recorded."}

#### Citations
{chr(10).join(citation_lines).rstrip() or "- No citations recorded."}

#### Missing information
{missing_info_lines or "- No additional missing information recorded."}

#### Reviewer questions
{reviewer_question_lines or "- No reviewer questions recorded."}

#### Uncertainty flags
{uncertainty_lines or "- No uncertainty flags recorded."}
"""
        )

    reviewer_questions = []
    for candidate in candidates:
        for question in candidate.reviewer_questions:
            if question not in reviewer_questions:
                reviewer_questions.append(question)

    if not reviewer_questions:
        reviewer_questions = [
            "Do the extracted performance and interface facts support any narrower electronics review path?",
            "Are there omitted security, environmental, or end-use details that could change the review path?",
        ]

    has_category_3 = any(candidate.eccn in {"3A001", "Category 3"} for candidate in candidates)
    has_category_5 = any(candidate.eccn == "Category 5 Part 2" for candidate in candidates)
    is_family_overview = any(spec.name == "is_family_overview" and spec.value.lower() == "true" for spec in specs)
    profile_value = _profile_value(specs)
    if has_category_3 and has_category_5:
        if profile_value == "mcu_processor_soc":
            conclusion_lines = [
                "Substrata recommends reviewing Category 3 electronics / MCU / processor paths and Category 5 Part 2 security/cryptography paths based on the extracted datasheet evidence.",
                "A qualified reviewer should confirm the applicable ordering code, security functionality, algorithm availability, mass-market/license-exception treatment, and current CCL threshold mapping.",
            ]
        else:
            conclusion_lines = [
                "Substrata recommends reviewing Category 3 electronics / programmable-logic / SoC paths and Category 5 Part 2 security/cryptography paths based on the extracted datasheet evidence.",
                "Because this is a family overview, a qualified reviewer should confirm the exact ordering code, speed grade, package, security functionality, and applicable CCL threshold mapping."
                if is_family_overview
                else "A qualified reviewer should confirm the exact device variant, security functionality, and applicable CCL threshold mapping.",
            ]
    else:
        recommended_paths = _recommended_path_summary(candidates)
        conclusion_lines = [
            f"Substrata recommends reviewing {recommended_paths or 'the extracted technical evidence'} based on the extracted datasheet evidence.",
            "A qualified reviewer should confirm the applicable threshold mapping, specialized design intent, missing information, and current CCL mapping.",
        ]

    return f"""# Draft ECCN Review Memo — {document_title}

## 1. Document Summary
- Title: {document_title}
- Document ID: {document_id}
- File name: {document_metadata.get("fileName", "Not recorded")}
- Generated timestamp: {generated_at}
{chr(10).join(profile_summary_lines) + chr(10) if profile_summary_lines else ""}- Disclaimer: Draft for expert review only.

## 2. Extracted Technical Facts
{chr(10).join(fact_sections) if fact_sections else "- No technical facts were extracted from the provided datasheet text."}

## 3. Recommended Review Paths
{chr(10).join(candidate_sections)}

## 4. Key Uncertainties
{chr(10).join(f"- {flag.replace('_', ' ')}" for flag in uncertainty_flags) if uncertainty_flags else "- No explicit run-level uncertainties were recorded."}

## 5. Reviewer Questions
{chr(10).join(f"- {question}" for question in reviewer_questions)}

## 6. ECCN Review Recommendation
{chr(10).join(f"- {line}" for line in conclusion_lines)}

## 7. Review State
- Status: pending_review
- Reviewer: Unassigned
- Note: No reviewer note recorded yet.
"""
