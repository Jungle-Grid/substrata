from __future__ import annotations

from datetime import datetime, UTC
import re

from fact_groups import CATEGORY_DISPLAY_NAMES, group_specs_by_category, infer_missing_review_points
from labels import display_name_for_spec_name
from schemas import ECCNCandidate, ExtractedSpec, WorkerCapabilitySignal


def _profile_value(specs: list[ExtractedSpec]) -> str:
    for spec in specs:
        if spec.name == "product_profile":
            return spec.value
    return ""


SPECIFIC_ECCN_PATTERN = re.compile(r"^[0-9][A-Z][0-9]{3}(?:\.[A-Za-z0-9]+|[A-Za-z0-9]*)$")


def _is_specific_eccn(value: str) -> bool:
    return bool(SPECIFIC_ECCN_PATTERN.fullmatch(value.strip()))


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
    capability_signals: list[WorkerCapabilitySignal],
    review_paths: list[dict[str, object]] | None = None,
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
    advanced_evidence_names = {
        "device_type",
        "pcie_interface",
        "hbm_memory",
        "memory_capacity",
        "peak_int8_performance",
        "peak_fp16_performance",
        "application_examples",
        "workloads",
    }
    advanced_evidence = [
        f"{display_name_for_spec_name(spec.name)}: {spec.value}{f' {spec.unit}' if spec.unit else ''}"
        for spec in specs
        if spec.name in advanced_evidence_names
    ]

    fact_sections: list[str] = []
    for category, category_specs in grouped_specs.items():
        category_specs = [spec for spec in category_specs if not spec.name.startswith("heuristic_signal_")]
        if not category_specs:
            continue
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

    review_path_candidates = [candidate for candidate in candidates if not _is_specific_eccn(candidate.eccn)]
    eccn_candidates = [candidate for candidate in candidates if _is_specific_eccn(candidate.eccn)]

    review_path_sections: list[str] = []
    for candidate in review_path_candidates:
        matched_fact_lines = "\n".join(f"- {fact}" for fact in candidate.matched_technical_facts)
        missing_info_lines = "\n".join(f"- {item}" for item in candidate.missing_information)
        reviewer_question_lines = "\n".join(f"- {item}" for item in candidate.reviewer_questions)
        review_path_sections.append(
            f"""### {candidate.title}
- Control area: {candidate.eccn}
- Confidence: {candidate.confidence}
- Why this path is open: {candidate.why_it_may_apply}

#### Supporting facts
{matched_fact_lines or "- No supporting facts recorded."}

#### Missing information
{missing_info_lines or "- No additional missing information recorded."}

#### Reviewer questions
{reviewer_question_lines or "- No reviewer questions recorded."}
"""
        )

    if review_paths:
        review_path_sections = []
        for path in review_paths:
            path_key = str(path.get("pathKey", ""))
            title = str(path.get("title", "Review path"))
            why = str(path.get("whyTriggered", "Opened from extracted technical evidence."))
            if path_key == "general_electronics_fallback":
                why = "This fallback remains relevant only after narrower review paths are reviewed and excluded."
            missing = path.get("missingInformation", [])
            missing_lines = "\n".join(f"- {item}" for item in missing if isinstance(item, str))
            review_path_sections.append(
                f"### {title}\n- Why this path is open: {why}\n\n#### Missing information\n{missing_lines or '- No additional missing information recorded.'}"
            )

    candidate_sections: list[str] = []
    for candidate in eccn_candidates:
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
            f"""### {candidate.eccn} — {candidate.title.removeprefix(f'{candidate.eccn} — ')}
- Candidate type: {candidate.candidate_type.replace('_', ' ')}
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
    for candidate in [*review_path_candidates, *eccn_candidates]:
        for question in candidate.reviewer_questions:
            if question not in reviewer_questions:
                reviewer_questions.append(question)

    if not reviewer_questions:
        reviewer_questions = [
            "Do the extracted performance and interface facts support any narrower electronics review path?",
            "Are there omitted security, environmental, or end-use details that could change the review path?",
        ]

    active_candidates = [candidate for candidate in eccn_candidates if candidate.candidate_type == "review_candidate"]
    blocked_candidates = [candidate for candidate in eccn_candidates if candidate.candidate_type == "blocked_candidate"]
    fallback_candidates = [candidate for candidate in eccn_candidates if candidate.candidate_type == "fallback_candidate"]
    security_evidence_present = any(
        spec.category == "security_cryptography"
        or any(term in f"{spec.name} {spec.value} {spec.source_snippet}".lower() for term in ("firmware signing", "remote attestation", "secure boot", "encryption", "cryptograph"))
        for spec in specs
    )
    security_summary = (
        "Security indicators open an evidence-required Category 5 Part 2 review path, but the current source does not affirm user-accessible encryption, confidentiality functionality, key management, network cryptography, cryptographic acceleration, or HSM behavior."
        if blocked_candidates or security_evidence_present
        else "Cryptographic or security functionality was not identified in the reviewed source material. This remains a source-limited observation rather than a final exclusion."
    )
    active_codes = [candidate.eccn for candidate in active_candidates]
    conclusion_lines = [
        f"Substrata recommends qualified review of the {' and '.join(active_codes) if active_codes else 'open review'} advanced-computing paths based on the extracted datasheet evidence."
    ]
    if blocked_candidates:
        conclusion_lines.append(
            f"The Category 5 Part 2 / {', '.join(candidate.eccn for candidate in blocked_candidates)} path remains blocked pending evidence of user-accessible encryption, confidentiality functionality, key management, network cryptography, cryptographic acceleration, or HSM behavior."
        )
    elif security_evidence_present:
        conclusion_lines.append(
            "The Category 5 Part 2 security/cryptography review path remains evidence-required pending confirmation of user-accessible encryption, confidentiality functionality, key management, network cryptography, cryptographic acceleration, or HSM behavior."
        )
    if fallback_candidates:
        conclusion_lines.append(
            f"{', '.join(candidate.eccn for candidate in fallback_candidates)} remains a fallback only if narrower controls are reviewed and excluded."
        )

    open_information = []
    for candidate in [*review_path_candidates, *eccn_candidates]:
        for item in candidate.missing_information:
            if item not in open_information:
                open_information.append(item)

    return f"""# Draft ECCN Review Memo — {document_title}

## 1. Document Summary
- Title: {document_title}
- Document ID: {document_id}
- File name: {document_metadata.get("fileName", "Not recorded")}
- Generated timestamp: {generated_at}
{chr(10).join(profile_summary_lines) + chr(10) if profile_summary_lines else ""}- Disclaimer: Draft for expert review only.

### Evidence supporting advanced-computing review
{chr(10).join(f"- {fact}" for fact in advanced_evidence) if advanced_evidence else "- Review-path evidence is summarized from the extracted technical facts below."}

## 2. Extracted Technical Facts
{chr(10).join(fact_sections) if fact_sections else "- No technical facts were extracted from the provided datasheet text."}

## 3. Recommended Review Paths
{chr(10).join(review_path_sections) if review_path_sections else "- No broader review paths were recorded."}

## 4. Potential Review Candidates
- Any ECCN-formatted identifiers below are unverified review candidates, not classifications or legal conclusions. They require current regulation, threshold, citation, and qualified-review confirmation.
{chr(10).join(candidate_sections) if candidate_sections else "- No specific ECCN-formatted candidates were recorded from the available source material."}

## 5. Open Questions and Missing Evidence
- Security and cryptography analysis: {security_summary}
{chr(10).join(f"- {item}" for item in open_information) if open_information else "- No additional missing information recorded."}

## 6. Key Uncertainties
{chr(10).join(f"- {flag.replace('_', ' ')}" for flag in uncertainty_flags) if uncertainty_flags else "- No explicit run-level uncertainties were recorded."}

## 7. Reviewer Questions
{chr(10).join(f"- {question}" for question in reviewer_questions)}

## 8. ECCN Review Recommendation
{chr(10).join(f"- {line}" for line in conclusion_lines)}

## 9. Review State
- Processing status: Completed analysis draft
- Compliance status: Expert review required before classification sign-off
- Reviewer: Unassigned
- Note: No reviewer note recorded yet.
"""
