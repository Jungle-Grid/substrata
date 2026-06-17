from __future__ import annotations

import re
from dataclasses import dataclass

from labels import display_name_for_spec_name
from schemas import ECCNCandidate, ExtractedSpec, WorkerOutput


STALE_DEVICE_MARKERS = {
    "ADC32RF45": [
        "ADC12DJ5200RF",
        "12-bit",
        "10.4 GSPS",
        "5.2 GSPS",
        "8 GHz",
        "> 10 GHz",
        "JESD204C",
        "17.16 Gbps",
    ],
    "ADC12DJ5200RF": [
        "ADC32RF45",
        "14-bit",
        "3.0 GSPS",
        "dual-channel 14-bit",
        "JESD204B",
        "12.5 Gbps",
        "VQFN",
        "3.2 W/Ch",
    ],
}
BANNED_MEMO_TERMS = ("placeholder", "\"mock\"", "not extracted")
FINAL_DETERMINATION_PATTERNS = (
    r"\bfinal\s+eccn\s+(?:is|:)",
    r"\bthe\s+eccn\s+is\b",
    r"\bclassified\s+as\s+(?:eccn\s+)?[0-9][a-z][0-9]{3}\b",
    r"\bthis\s+product\s+is\s+ear99\b",
)
LEGAL_PART_NUMBER_TERMS = ("advised", "damages", "consequential", "expressly")
FALSE_ADC_CONTEXT_TERMS = ("cortex", "quad-core", "dual-core", "external inputs", "system monitor")
FALSE_CHANNEL_MODE_TERMS = ("single channel (bit)", "control register", "direction control")
ECC_MEMORY_CONTEXT_TERMS = ("cache with ecc", "nand", "memory", "flash", "error correction")
RADIATION_CONTEXT_TERMS = (
    "single event",
    "single-event",
    "single event latch-up",
    "single-event latch-up",
    "single event upset",
    "single-event upset",
    "radiation",
    "radiation tolerant",
    "radiation hardened",
    "rad-hard",
    "tid",
    "total ionizing dose",
    "heavy ion",
    "latch-up immunity",
    "see",
    "space qualified",
    "space-grade",
)


@dataclass
class ValidationIssue:
    bad_string: str
    section: str
    reason: str
    remediation: str


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().lower()


def _format_spec(spec: ExtractedSpec) -> str:
    return f"{display_name_for_spec_name(spec.name)}: {spec.value}{f' {spec.unit}' if spec.unit else ''}"


def _contains_string(haystack: str, needle: str) -> bool:
    return _normalize(needle) in _normalize(haystack)


def _spec_values(specs: list[ExtractedSpec], name: str) -> list[str]:
    return [spec.value for spec in specs if spec.name == name]


def _extract_question_tokens(question: str) -> list[str]:
    tokens: list[str] = []
    for pattern in (
        r"\bJESD204[A-Z]?\b",
        r"(?:up to|greater than|less than|>|<)?\s*\d+(?:\.\d+)?\s*(?:GSPS|MSPS|KSPS|Gbps|GHz|MHz|bits?|lanes?)",
    ):
        tokens.extend(match.group(0).strip() for match in re.finditer(pattern, question, flags=re.IGNORECASE))
    return tokens


def _current_device_marker(document_title: str, specs: list[ExtractedSpec]) -> str | None:
    title = document_title.upper()
    for device in STALE_DEVICE_MARKERS:
        if device in title:
            return device
    for spec in specs:
        if spec.name == "part_number" and spec.value.upper() in STALE_DEVICE_MARKERS:
            return spec.value.upper()
    return None


def collect_validation_issues(
    *,
    document_title: str,
    extracted_text: str,
    output: WorkerOutput,
) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    normalized_text = _normalize(extracted_text)
    extracted_fact_strings = {_normalize(_format_spec(spec)) for spec in output.extracted_specs}

    if len(output.extracted_specs) < 8:
        issues.append(
            ValidationIssue(
                bad_string=str(len(output.extracted_specs)),
                section="worker_output.extracted_specs",
                reason="The worker emitted fewer than 8 extracted facts.",
                remediation="Tighten extraction so the memo is grounded in a broader set of current-document facts.",
            )
        )

    for term in BANNED_MEMO_TERMS:
        if term in output.memo_markdown.lower():
            issues.append(
                ValidationIssue(
                    bad_string=term,
                    section="memo_markdown",
                    reason="The memo still contains a banned placeholder-like term.",
                    remediation="Remove placeholder text and regenerate the memo from current extracted facts only.",
                )
            )

    if output.memo_markdown.strip().startswith("{"):
        issues.append(
            ValidationIssue(
                bad_string=output.memo_markdown[:20],
                section="memo_markdown",
                reason="The memo looks like raw JSON instead of Markdown.",
                remediation="Render the final memo as Markdown only.",
            )
        )

    current_device = _current_device_marker(document_title, output.extracted_specs)
    if current_device:
        for marker in STALE_DEVICE_MARKERS[current_device]:
            if _contains_string(output.memo_markdown, marker) and _normalize(marker) not in normalized_text:
                issues.append(
                    ValidationIssue(
                        bad_string=marker,
                        section="memo_markdown",
                        reason="The memo contains a known stale cross-document marker that is not present in the current extracted text.",
                        remediation="Remove the stale value from candidate reasoning or reviewer questions and rebuild it from current-run specs.",
                    )
                )

    is_zynq_soc = (
        "zynq ultrascale+ mpsoc" in normalized_text
        or "zynq ultrascale plus" in _normalize(document_title)
        or any("zynq ultrascale+ mpsoc" in _normalize(value) for value in _spec_values(output.extracted_specs, "product_family"))
    )
    if is_zynq_soc:
        product_families = [_normalize(value) for value in _spec_values(output.extracted_specs, "product_family")]
        document_numbers = [_normalize(value) for value in _spec_values(output.extracted_specs, "document_number")]
        part_numbers = [_normalize(value) for value in _spec_values(output.extracted_specs, "part_number")]
        profiles = [_normalize(value) for value in _spec_values(output.extracted_specs, "product_profile")]
        device_types = [_normalize(value) for value in _spec_values(output.extracted_specs, "device_type")]
        candidate_titles = " ".join(candidate.title for candidate in output.eccn_candidates).lower()
        candidate_eccns_titles = " ".join(
            f"{candidate.eccn} {candidate.title}" for candidate in output.eccn_candidates
        ).lower()
        reviewer_questions = " ".join(
            question
            for candidate in output.eccn_candidates
            for question in candidate.reviewer_questions
        ).lower()

        if "zynq ultrascale+ mpsoc" not in product_families:
            issues.append(
                ValidationIssue(
                    bad_string=", ".join(_spec_values(output.extracted_specs, "product_family")) or "missing",
                    section="extracted_specs.product_family",
                    reason="Zynq/SoC output did not identify the Zynq UltraScale+ MPSoC product family.",
                    remediation="Extract productFamily as Zynq UltraScale+ MPSoC from the title or top-level document text.",
                )
            )
        if "ds891" in part_numbers and "ds891" not in document_numbers:
            issues.append(
                ValidationIssue(
                    bad_string="DS891",
                    section="extracted_specs.part_number",
                    reason="DS891 was treated as a part number without also identifying it as the document number.",
                    remediation="Extract DS891 as document_number and use a family-overview part-number value.",
                )
            )
        if not part_numbers or not any("not a single part number" in value for value in part_numbers):
            issues.append(
                ValidationIssue(
                    bad_string=", ".join(_spec_values(output.extracted_specs, "part_number")) or "missing",
                    section="extracted_specs.part_number",
                    reason="Zynq family-overview output did not show that there is no single part number.",
                    remediation="Use 'Not a single part number - family overview' for family overview documents.",
                )
            )
        if "adc" in device_types:
            issues.append(
                ValidationIssue(
                    bad_string="ADC",
                    section="extracted_specs.device_type",
                    reason="Zynq/MPSoC output was classified as an ADC device.",
                    remediation="Keep the primary device type as Processor/SoC and extract the ADC only as a peripheral fact.",
                )
            )
        if "adc_dac_converter" in profiles:
            issues.append(
                ValidationIssue(
                    bad_string="adc_dac_converter",
                    section="extracted_specs.product_profile",
                    reason="Zynq/MPSoC output used the ADC/DAC converter profile.",
                    remediation="Use fpga_programmable_logic_soc or mcu_processor_soc for Zynq MPSoC documents.",
                )
            )
        if not any(profile in {"fpga_programmable_logic_soc", "mcu_processor_soc"} for profile in profiles):
            issues.append(
                ValidationIssue(
                    bad_string=", ".join(_spec_values(output.extracted_specs, "product_profile")) or "missing",
                    section="extracted_specs.product_profile",
                    reason="Zynq/MPSoC output did not use a SoC/programmable-logic product profile.",
                    remediation="Set product_profile to fpga_programmable_logic_soc or mcu_processor_soc.",
                )
            )
        if "high-speed adc" in candidate_titles:
            issues.append(
                ValidationIssue(
                    bad_string="high-speed ADC",
                    section="eccn_candidates.title",
                    reason="Zynq/MPSoC candidate titles still use ADC-dominated review language.",
                    remediation="Use programmable-logic/SoC and security review-path titles for this profile.",
                )
            )
        if "category 3" not in candidate_eccns_titles or "soc" not in candidate_eccns_titles:
            issues.append(
                ValidationIssue(
                    bad_string=candidate_eccns_titles,
                    section="eccn_candidates",
                    reason="Zynq/MPSoC output is missing a Category 3 electronics / SoC review path.",
                    remediation="Emit a Category 3 programmable-logic/SoC review path when processing and PL facts are present.",
                )
            )
        if any(spec.name in {"secure_boot", "cryptographic_algorithm"} for spec in output.extracted_specs) and "category 5 part 2" not in candidate_eccns_titles:
            issues.append(
                ValidationIssue(
                    bad_string=candidate_eccns_titles,
                    section="eccn_candidates",
                    reason="Security facts were extracted but no Category 5 Part 2 review path was emitted.",
                    remediation="Emit a Category 5 Part 2 path when secure boot or named crypto algorithms are present.",
                )
            )
        if len(output.eccn_candidates) == 1 and output.eccn_candidates[0].eccn == "3A991":
            issues.append(
                ValidationIssue(
                    bad_string="3A991 only",
                    section="eccn_candidates",
                    reason="Zynq/MPSoC output only emitted a general-electronics fallback path.",
                    remediation="Add Category 3 SoC and Category 5 Part 2 security paths before fallback.",
                )
            )
        if "programmable" not in reviewer_questions or "category 5 part 2" not in reviewer_questions:
            issues.append(
                ValidationIssue(
                    bad_string=reviewer_questions or "missing",
                    section="eccn_candidates.reviewer_questions",
                    reason="Reviewer questions are not specific to programmable-logic SoC and security review.",
                    remediation="Generate Zynq/SoC-specific reviewer questions about family overview, PL/PS, high-speed I/O, and crypto.",
                )
            )

    if re.search(r"\bSEL\b", output.memo_markdown):
        memo_context = _normalize(output.memo_markdown)
        if not any(term in memo_context for term in RADIATION_CONTEXT_TERMS):
            issues.append(
                ValidationIssue(
                    bad_string="SEL",
                    section="memo_markdown",
                    reason="SEL appears as radiation evidence without single-event or radiation context.",
                    remediation="Do not treat SEL as radiation evidence unless the surrounding source text clearly indicates single-event or radiation context.",
                )
            )

    if "1 channels" in output.memo_markdown:
        issues.append(
            ValidationIssue(
                bad_string="1 channels",
                section="memo_markdown",
                reason="The memo includes malformed channel wording.",
                remediation="Use the source channel-mode wording from the current document instead of synthesized channel counts.",
            )
        )

    for index, spec in enumerate(output.extracted_specs):
        if not spec.source_snippet:
            issues.append(
                ValidationIssue(
                    bad_string=spec.name,
                    section=f"extracted_specs[{index}]",
                    reason="An extracted fact is missing a source snippet.",
                    remediation="Every displayed fact must carry a current-document source snippet.",
                )
            )
        if not spec.importance:
            issues.append(
                ValidationIssue(
                    bad_string=spec.name,
                    section=f"extracted_specs[{index}]",
                    reason="An extracted fact is missing why-it-matters text.",
                    remediation="Populate importance for every extracted fact that can appear in the memo.",
                )
            )
        if spec.name == "part_number" and _normalize(spec.value) in LEGAL_PART_NUMBER_TERMS:
            issues.append(
                ValidationIssue(
                    bad_string=spec.value,
                    section=f"extracted_specs[{index}]",
                    reason="The extracted part number looks like legal boilerplate, not a device identifier.",
                    remediation="Restrict part-number extraction to title or product-header context and reject disclaimer terms.",
                )
            )
        if spec.name == "adc_resolution" and any(term in _normalize(spec.source_snippet) for term in FALSE_ADC_CONTEXT_TERMS):
            issues.append(
                ValidationIssue(
                    bad_string=spec.source_snippet,
                    section=f"extracted_specs[{index}]",
                    reason="ADC resolution was derived from CPU-width or subordinate-monitor context instead of the reviewed product identity.",
                    remediation="Only extract ADC resolution when the document is primarily about a converter or the line clearly describes the reviewed product as an ADC.",
                )
            )
        if spec.name == "channel_modes" and any(term in _normalize(spec.source_snippet) for term in FALSE_CHANNEL_MODE_TERMS):
            issues.append(
                ValidationIssue(
                    bad_string=spec.source_snippet,
                    section=f"extracted_specs[{index}]",
                    reason="Channel-mode text came from register or bitfield language, not converter operating mode language.",
                    remediation="Reject channel-mode matches from register, bit, or control-field context.",
                )
            )
        if spec.name == "cryptographic_algorithm" and spec.value.upper() == "ECC" and any(term in _normalize(spec.source_snippet) for term in ECC_MEMORY_CONTEXT_TERMS):
            issues.append(
                ValidationIssue(
                    bad_string=spec.source_snippet,
                    section=f"extracted_specs[{index}]",
                    reason="ECC was treated as a cryptographic algorithm in memory-integrity context.",
                    remediation="Do not extract ECC as a crypto algorithm unless the surrounding text clearly indicates public-key or cryptographic use.",
                )
            )

    for candidate_index, candidate in enumerate(output.eccn_candidates):
        for fact in candidate.matched_technical_facts:
            if _normalize(fact) not in extracted_fact_strings and "require" not in fact.lower() and "no strong" not in fact.lower():
                issues.append(
                    ValidationIssue(
                        bad_string=fact,
                        section=f"eccn_candidates[{candidate_index}].matched_technical_facts",
                        reason="A matched technical fact does not correspond to a current extracted fact.",
                        remediation="Build matched technical facts directly from the current run’s extracted facts.",
                    )
                )

        for citation in candidate.regulatory_citations:
            if "datasheet evidence" in citation.citation_label.lower():
                if _normalize(citation.citation_text) not in normalized_text:
                    issues.append(
                        ValidationIssue(
                            bad_string=citation.citation_text,
                            section=f"eccn_candidates[{candidate_index}].regulatory_citations",
                            reason="A datasheet citation note is not grounded in the current extracted text.",
                            remediation="Use an exact current-document snippet for every datasheet citation.",
                        )
                    )

        for question in candidate.reviewer_questions:
            for token in _extract_question_tokens(question):
                token_normalized = _normalize(token)
                if token_normalized not in normalized_text and all(token_normalized not in fact for fact in extracted_fact_strings):
                    issues.append(
                        ValidationIssue(
                            bad_string=token,
                            section=f"eccn_candidates[{candidate_index}].reviewer_questions",
                            reason="A reviewer question includes a numeric or interface token not found in the current run.",
                            remediation="Generate reviewer questions only from current extracted facts or directly visible source text.",
                        )
                    )

    return issues


def validate_worker_output(
    *,
    document_title: str,
    extracted_text: str,
    output: WorkerOutput,
) -> None:
    issues = collect_validation_issues(
        document_title=document_title,
        extracted_text=extracted_text,
        output=output,
    )
    if not issues:
        return

    lines = ["Memo validation failed:"]
    for issue in issues:
        lines.append(
            f"- bad string: {issue.bad_string} | section: {issue.section} | reason: {issue.reason} | remediation: {issue.remediation}"
        )
    raise ValueError("\n".join(lines))


def validate_memo_markdown(memo_markdown: str) -> None:
    normalized = _normalize(memo_markdown)
    issues: list[str] = []

    if not memo_markdown.lstrip().startswith("#"):
        issues.append("memo must start with a Markdown heading")
    if normalized.startswith("{") or '"productprofile"' in normalized[:500]:
        issues.append("memo looks like raw JSON")
    for term in BANNED_MEMO_TERMS:
        if term in normalized:
            issues.append(f"memo contains banned term: {term}")
    for pattern in FINAL_DETERMINATION_PATTERNS:
        if re.search(pattern, normalized, flags=re.IGNORECASE):
            issues.append(f"memo appears to make a final determination: {pattern}")
    required_sections = [
        "document summary",
        "extracted technical facts",
        "candidate eccn review paths",
        "key uncertainties",
        "reviewer questions",
        "draft conclusion",
        "review state",
    ]
    for section in required_sections:
        if section not in normalized:
            issues.append(f"memo is missing section: {section}")
    if "source snippet" not in normalized:
        issues.append("memo does not include source snippets")
    if "expert review" not in normalized:
        issues.append("memo does not clearly require expert review")

    if issues:
        raise ValueError("Memo Markdown validation failed: " + "; ".join(issues))
