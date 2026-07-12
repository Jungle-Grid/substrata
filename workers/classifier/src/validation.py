from __future__ import annotations

import re
from dataclasses import dataclass

from labels import display_name_for_spec_name
from schemas import (
    ECCNCandidate,
    ExtractedSpec,
    ValidationIssueRecord,
    WorkerCapabilitySignal,
    WorkerOutput,
)


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
# Reject unresolved template markers, not ordinary source prose that happens to
# use words such as "placeholder" or "mock" in a legitimate technical context.
UNRESOLVED_TEMPLATE_PATTERNS = (
    r"\[\s*(?:placeholder|todo|insert[^\]]*(?:here|text)|tbd)\s*\]",
    r"\{\{[^}]+\}\}",
    r"\b(?:TODO|TBD)\s*:",
    r"\bINSERT\s+.+\s+HERE\b",
)
WEAK_MANUFACTURER_SNIPPET_TERMS = (
    "creating an environment where employees",
    "removing noninclusive language",
    "consequential damages",
    "expressly advised",
    "warranty",
    "liability",
)
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
WEAK_IMPORTANCE_VALUES = {"high", "medium", "low"}
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


def _has_profile(specs: list[ExtractedSpec], profile: str) -> bool:
    return any(spec.name == "product_profile" and spec.value == profile for spec in specs)


def _extracted_fact_blob(specs: list[ExtractedSpec]) -> str:
    return _normalize(" ".join(f"{spec.name} {spec.value} {spec.source_snippet}" for spec in specs))


def _interface_family(spec: ExtractedSpec) -> str:
    if spec.name == "ethernet_mac" or spec.value.lower() == "ethernet":
        return "ethernet"
    if spec.name == "pcie_interface" or spec.value.lower() == "pcie":
        return "pcie"
    if spec.name == "i2c_interface" or spec.value.lower() == "i2c":
        return "i2c"
    if spec.name == "uart_interface" or spec.value.lower() == "uart":
        return "uart"
    if spec.name == "jtag_interface" or spec.value.lower() == "jtag":
        return "jtag"
    if spec.name in {"displayport_interface", "displayport_lane_rate"} or "displayport" in spec.value.lower():
        return "displayport"
    return spec.value.lower()


def _markdown_looks_malformed(markdown: str) -> str | None:
    if markdown.count("```") % 2:
        return "unbalanced fenced code block"
    lines = markdown.splitlines()
    if any(line.startswith("#### ") and not any(previous.startswith("### ") for previous in lines[:index]) for index, line in enumerate(lines)):
        return "fourth-level heading appears before third-level heading"
    required_order = [
        "## 1. Document Summary",
        "## 2. Extracted Technical Facts",
        "## 3. Recommended Review Paths",
        "## 4. Potential Review Candidates",
        "## 5. Open Questions and Missing Evidence",
        "## 6. Key Uncertainties",
        "## 7. Reviewer Questions",
        "## 8. ECCN Review Recommendation",
        "## 9. Review State",
    ]
    canonical_order = [
        "## Document and canonical product model",
        "## Extracted source facts",
        "## Capability assessment",
        "## Open review paths",
        "## Eligible candidate ECCNs",
        "## Specific candidates not yet supportable",
        "## Reviewer questions",
        "## ECCN review recommendation",
        "## Review state",
    ]
    positions = [markdown.find(section) for section in required_order]
    canonical_positions = [markdown.find(section) for section in canonical_order]
    legacy_valid = all(position != -1 for position in positions) and positions == sorted(positions)
    canonical_valid = all(position != -1 for position in canonical_positions) and canonical_positions == sorted(canonical_positions)
    if not legacy_valid and not canonical_valid:
        return "required memo sections are missing or out of order"
    return None


def _weak_source_boilerplate_lines(markdown: str) -> list[str]:
    weak_lines: list[str] = []
    source_markers = ("source snippet", "citation note", "manufacturer evidence", "source:")
    for line in markdown.splitlines():
        normalized = _normalize(line)
        if not any(marker in normalized for marker in source_markers):
            continue
        if any(_contains_weak_boilerplate_term(normalized, term) for term in WEAK_MANUFACTURER_SNIPPET_TERMS):
            weak_lines.append(line.strip())
    return weak_lines


def _contains_weak_boilerplate_term(normalized: str, term: str) -> bool:
    if " " in term:
        return term in normalized
    return re.search(rf"\b{re.escape(term)}\b", normalized) is not None


def _memo_has_source_evidence(markdown: str) -> bool:
    normalized = _normalize(markdown)
    return any(
        marker in normalized
        for marker in (
            "source snippet",
            "citation note",
            "datasheet evidence",
            "source:",
            "source -",
        )
    )


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
    normalized_memo = _normalize(output.memo_markdown)
    extracted_fact_strings = {_normalize(_format_spec(spec)) for spec in output.extracted_specs}
    extracted_source_snippets = {_normalize(spec.source_snippet) for spec in output.extracted_specs}
    extracted_blob = _extracted_fact_blob(output.extracted_specs)
    is_mcu_processor_soc = _has_profile(output.extracted_specs, "mcu_processor_soc")

    if len(output.extracted_specs) < 8:
        issues.append(
            ValidationIssue(
                bad_string=str(len(output.extracted_specs)),
                section="worker_output.extracted_specs",
                reason="The worker emitted fewer than 8 extracted facts.",
                remediation="Tighten extraction so the memo is grounded in a broader set of current-document facts.",
            )
        )

    for pattern in UNRESOLVED_TEMPLATE_PATTERNS:
        if re.search(pattern, output.memo_markdown, flags=re.IGNORECASE):
            issues.append(
                ValidationIssue(
                    bad_string=pattern,
                    section="memo_markdown",
                    reason="The memo still contains an unresolved template marker.",
                    remediation="Resolve template markers and regenerate the memo from current extracted facts only.",
                )
            )

    for weak_value in WEAK_IMPORTANCE_VALUES:
        weak_phrase = f"why it matters: {weak_value}"
        if weak_phrase in normalized_memo:
            issues.append(
                ValidationIssue(
                    bad_string=weak_phrase,
                    section="memo_markdown.extracted_technical_facts",
                    reason="The memo contains a weak importance label instead of an explanatory sentence.",
                    remediation="Replace importance values with profile-specific explanatory sentences.",
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

    for pattern in FINAL_DETERMINATION_PATTERNS:
        if re.search(pattern, normalized_memo, flags=re.IGNORECASE):
            issues.append(
                ValidationIssue(
                    bad_string=pattern,
                    section="memo_markdown",
                    reason="The memo appears to present Substrata as assigning an ECCN.",
                    remediation="Keep the memo draft-only and require qualified expert review.",
                )
            )

    malformed_reason = _markdown_looks_malformed(output.memo_markdown)
    if malformed_reason:
        issues.append(
            ValidationIssue(
                bad_string=malformed_reason,
                section="memo_markdown",
                reason="The memo Markdown appears malformed.",
                remediation="Regenerate a clean Markdown memo with ordered sections and balanced Markdown syntax.",
            )
        )

    specific_interface_names = {
        "ethernet_mac",
        "pcie_interface",
        "i2c_interface",
        "uart_interface",
        "jtag_interface",
        "displayport_interface",
        "displayport_lane_rate",
    }
    specific_interface_families = {
        _interface_family(spec)
        for spec in output.extracted_specs
        if spec.name in specific_interface_names
    }
    for spec in output.extracted_specs:
        if spec.name == "digital_interface" and _interface_family(spec) in specific_interface_families:
            issues.append(
                ValidationIssue(
                    bad_string=f"Digital Interface: {spec.value}",
                    section="extracted_specs.digital_interface",
                    reason="A generic interface fact duplicates a richer interface-specific fact.",
                    remediation="Suppress generic digital_interface facts when a richer interface-specific fact exists for the same interface family.",
                )
            )

    candidate_question_counts: dict[str, int] = {}
    for candidate in output.eccn_candidates:
        for question in candidate.reviewer_questions:
            candidate_question_counts[question] = candidate_question_counts.get(question, 0) + 1
    for question, count in candidate_question_counts.items():
        if count > 2:
            issues.append(
                ValidationIssue(
                    bad_string=question,
                    section="eccn_candidates.reviewer_questions",
                    reason="The same reviewer question appears under too many candidate sections.",
                    remediation="Keep candidate reviewer questions path-specific and put the full deduplicated set only in the global Reviewer Questions section.",
                )
            )

    has_security_or_crypto_facts = any(
        spec.name in {"secure_boot", "cryptographic_algorithm", "crypto_key_size", "security_feature"}
        or spec.category == "security_cryptography"
        for spec in output.extracted_specs
    )
    if has_security_or_crypto_facts:
        conclusion_start = output.memo_markdown.lower().find("## 8. eccn review recommendation")
        conclusion_text = output.memo_markdown[conclusion_start:].lower() if conclusion_start != -1 else output.memo_markdown.lower()
        if "category 5 part 2" not in conclusion_text:
            issues.append(
                ValidationIssue(
                    bad_string="Category 5 Part 2",
                    section="memo_markdown.eccn_review_recommendation",
                    reason="Security or cryptography facts are present but the conclusion does not mention the Category 5 Part 2 review path.",
                    remediation="Mention Category 5 Part 2 security/cryptography review before broader fallback classifications.",
                )
            )

    if is_mcu_processor_soc:
        review_path_titles = " ".join(path.title for path in output.review_paths).lower()
        reviewer_questions = " ".join(
            question
            for path in output.review_paths
            for question in path.reviewer_questions
        ).lower()
        candidate_text = " ".join(
            [
                *(path.title for path in output.review_paths),
                *(path.why_triggered for path in output.review_paths),
                *(item for path in output.review_paths for item in path.missing_information),
                *(question for path in output.review_paths for question in path.reviewer_questions),
            ]
        ).lower()
        has_processor_or_interface_facts = any(
            spec.name
            in {
                "processor_architecture",
                "cpu_core",
                "clock_speed",
                "cpu_clock_speed",
                "cache_tcm",
                "on_chip_ram",
                "memory_cache",
                "memory_integrity",
                "memory_controller_interface",
                "external_memory_interface",
                "external_memory_interfaces",
                "ethernet_mac",
                "usb_interface",
                "can_interface",
                "spi_interface",
                "i2c_interface",
                "uart_interface",
                "displayport_interface",
                "digital_interface",
            }
            for spec in output.extracted_specs
        )
        if "category 3 electronics / mcu / processor / soc review path" not in review_path_titles:
            issues.append(
                ValidationIssue(
                    bad_string=review_path_titles or "missing",
                    section="review_paths.title",
                    reason="MCU/processor output is missing the profile-specific Category 3 title.",
                    remediation="Use 'Category 3 electronics / MCU / processor / SoC review path' for mcu_processor_soc.",
                )
            )
        if "category 3" in review_path_titles and "programmable logic" in review_path_titles:
            issues.append(
                ValidationIssue(
                    bad_string="programmable logic",
                    section="review_paths.title",
                    reason="MCU/processor Category 3 title leaks programmable-logic wording.",
                    remediation="Use MCU/processor/SoC-specific wording unless programmable logic is extracted from the current document.",
                )
            )
        for term in ("programmable logic", "fpga fabric"):
            if term in normalized_memo and term not in extracted_blob:
                issues.append(
                    ValidationIssue(
                        bad_string=term,
                        section="memo_markdown",
                        reason="MCU/processor memo contains programmable-logic wording not supported by extracted facts.",
                        remediation="Remove FPGA/programmable-logic wording from MCU/processor memos unless the current document contains that fact.",
                    )
                )
        for term in ("zynq", "pl/ps"):
            if term in normalized_memo:
                issues.append(
                    ValidationIssue(
                        bad_string=term,
                        section="memo_markdown",
                        reason="MCU/processor memo contains stale Zynq or PL/PS wording.",
                        remediation="Remove stale Zynq/PL/PS wording from MCU/processor output.",
                    )
                )
        if "programmable logic" in reviewer_questions:
            issues.append(
                ValidationIssue(
                    bad_string="programmable logic",
                    section="eccn_candidates.reviewer_questions",
                    reason="MCU/processor reviewer questions reuse programmable-logic wording.",
                    remediation="Generate i.MX/MCU-specific processor, interface, and security reviewer questions.",
                )
            )
        for stale_crypto in ("aes-gcm", "sha-3/384", "rsa 4096"):
            if stale_crypto in candidate_text and stale_crypto not in extracted_blob:
                issues.append(
                    ValidationIssue(
                        bad_string=stale_crypto,
                        section="eccn_candidates",
                        reason="Category 5 text mentions a crypto example not extracted from the current MCU document.",
                        remediation="Build Category 5 wording only from current extracted security facts.",
                    )
                )
        if "ear99" in normalized_memo and has_security_or_crypto_facts:
            issues.append(
                ValidationIssue(
                    bad_string="EAR99",
                    section="memo_markdown",
                    reason="EAR99 appears despite security/cryptography facts in an MCU/processor memo.",
                    remediation="Suppress EAR99 until no meaningful Category 3, security, processor, interface, or high-performance indicators exist.",
                )
            )
        if "ear99" in normalized_memo and has_processor_or_interface_facts:
            issues.append(
                ValidationIssue(
                    bad_string="EAR99",
                    section="memo_markdown",
                    reason="EAR99 appears despite meaningful processor/interface facts in an MCU/processor memo.",
                    remediation="Use Category 3, Category 5 Part 2, and general-electronics comparison paths for this memo.",
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
        if spec.name == "manufacturer" and any(_contains_weak_boilerplate_term(_normalize(spec.source_snippet), term) for term in WEAK_MANUFACTURER_SNIPPET_TERMS):
            issues.append(
                ValidationIssue(
                    bad_string=spec.source_snippet,
                    section=f"extracted_specs[{index}].source_snippet",
                    reason="Manufacturer evidence comes from weak boilerplate language.",
                    remediation="Use title/header/footer/product-page evidence or omit the manufacturer snippet from the main memo.",
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
        if spec.name == "modulation_feature" and "pwm" in _normalize(f"{spec.value} {spec.source_snippet}"):
            issues.append(
                ValidationIssue(
                    bad_string=spec.source_snippet,
                    section=f"extracted_specs[{index}]",
                    reason="PWM was labeled as an RF modulation feature.",
                    remediation="Treat PWM as a timer/control peripheral unless RF modulation context is explicit.",
                )
            )
        if spec.name in {"processing_system", "ps_pl_integration"} and re.search(r"\bps\b", _normalize(spec.source_snippet)) and "picosecond" in _normalize(spec.source_snippet):
            issues.append(
                ValidationIssue(
                    bad_string=spec.source_snippet,
                    section=f"extracted_specs[{index}]",
                    reason="ps from picoseconds was labeled as processing-system wording.",
                    remediation="Only extract PS/PL facts when the source explicitly discusses processing system and programmable logic.",
                )
            )
        if spec.name == "enob" and any(term in _normalize(spec.source_snippet) for term in ("formula", "equation", "calculate", "computed as", "sinad =")):
            issues.append(
                ValidationIssue(
                    bad_string=spec.source_snippet,
                    section=f"extracted_specs[{index}]",
                    reason="ENOB formula text was treated as product converter performance.",
                    remediation="Only extract ENOB when a current-document value is presented as the product's measured or specified performance.",
                )
            )

    for candidate_index, candidate in enumerate(output.eccn_candidates):
        identity_fact_count = sum(
            1
            for fact in candidate.matched_technical_facts
            if fact.lower().startswith(
                (
                    "document number:",
                    "document type:",
                    "part number:",
                    "product name:",
                    "family overview:",
                    "detected product profile:",
                    "profile confidence:",
                    "profile rationale:",
                )
            )
        )
        technical_fact_count = len(candidate.matched_technical_facts) - identity_fact_count
        if identity_fact_count > technical_fact_count and len(candidate.matched_technical_facts) >= 3:
            issues.append(
                ValidationIssue(
                    bad_string=", ".join(candidate.matched_technical_facts[:4]),
                    section=f"eccn_candidates[{candidate_index}].matched_technical_facts",
                    reason="Candidate matched facts are dominated by document identity fields instead of technical facts.",
                    remediation="Move document identity facts to summary or missing information and keep candidate facts focused on technical features.",
                )
            )
        if is_zynq_soc and candidate.review_path_id == "category_3_programmable_logic_soc":
            technical_markers = ("processor architecture:", "cpu core:", "real-time cpu:", "programmable logic:", "processing system:", "ps/pl integration", "ethernet macs:", "pcie interface:", "displayport lane rate:", "gpu:")
            if sum(1 for fact in candidate.matched_technical_facts if fact.lower().startswith(technical_markers)) < 5:
                issues.append(
                    ValidationIssue(
                        bad_string=", ".join(candidate.matched_technical_facts),
                        section=f"eccn_candidates[{candidate_index}].matched_technical_facts",
                        reason="Category 3 SoC candidate contains too few technical SoC facts.",
                        remediation="Prioritize product family plus processor, programmable-logic, PS/PL, and high-speed I/O facts.",
                    )
                )
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
                citation_text = _normalize(citation.citation_text)
                if citation_text not in normalized_text and citation_text not in extracted_source_snippets:
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


_NEGATIVE_CRYPTO_PATTERNS = (
    "no cryptographic features were identified",
    "security functionality was not found",
    "no encryption capability was detected",
    "cryptographic functionality was not identified",
)


def validate_narrative_consistency(
    *,
    capability_signals: list[WorkerCapabilitySignal],
    review_paths: list,
    eccn_candidates: list[ECCNCandidate],
    uncertainty_flags: list[str],
    memo_markdown: str,
) -> list[ValidationIssueRecord]:
    issues: list[ValidationIssueRecord] = []
    crypto_signal = next(
        (signal for signal in capability_signals if signal.key == "hasCryptography"),
        None,
    )
    secure_boot_signal = next(
        (signal for signal in capability_signals if signal.key == "hasSecureBoot"),
        None,
    )
    crypto_accelerator_signal = next(
        (signal for signal in capability_signals if signal.key == "hasCryptographicAccelerator"),
        None,
    )
    memo_normalized = _normalize(memo_markdown)
    review_text = " ".join(
        [path.why_triggered for path in review_paths]
        + [candidate.why_it_may_apply for candidate in eccn_candidates]
        + [candidate.why_it_may_not_apply for candidate in eccn_candidates]
    )
    review_normalized = _normalize(review_text)

    if crypto_signal and crypto_signal.detected:
        for phrase in _NEGATIVE_CRYPTO_PATTERNS:
            if phrase in memo_normalized or phrase in review_normalized:
                issues.append(
                    ValidationIssueRecord(
                        code="CRYPTO_NARRATIVE_CONTRADICTION",
                        severity="error",
                        message="Cryptographic functionality was detected, but the narrative still denies it.",
                        path="memo_markdown",
                        supporting_fact_names=crypto_signal.supporting_fact_names,
                        supporting_citation_labels=crypto_signal.supporting_citation_labels,
                    )
                )
                break

    if secure_boot_signal and secure_boot_signal.detected:
        if "security functionality was not found" in memo_normalized:
            issues.append(
                ValidationIssueRecord(
                    code="SECURE_BOOT_NARRATIVE_CONTRADICTION",
                    severity="error",
                    message="Secure-boot functionality was detected, but the memo still states that security functionality was not found.",
                    path="memo_markdown",
                    supporting_fact_names=secure_boot_signal.supporting_fact_names,
                    supporting_citation_labels=secure_boot_signal.supporting_citation_labels,
                )
            )

    if crypto_accelerator_signal and crypto_accelerator_signal.detected:
        has_crypto_review_path = any("category 5 part 2" in path.title.lower() or "cryptograph" in path.title.lower() for path in review_paths)
        has_crypto_uncertainty = "crypto_relevance_requires_qualified_review" in uncertainty_flags
        if not has_crypto_review_path and not has_crypto_uncertainty:
            issues.append(
                ValidationIssueRecord(
                    code="CRYPTO_REVIEW_PATH_MISSING",
                    severity="error",
                    message="Cryptographic acceleration was detected without a corresponding cryptography review path or uncertainty flag.",
                    path="review_paths",
                    supporting_fact_names=crypto_accelerator_signal.supporting_fact_names,
                    supporting_citation_labels=crypto_accelerator_signal.supporting_citation_labels,
                )
            )

    requires_review_language = (
        "qualified reviewer" in memo_normalized
        or "expert review required" in memo_normalized
        or "expert review" in memo_normalized
    )
    if any(signal.detected for signal in capability_signals) and not requires_review_language:
        issues.append(
            ValidationIssueRecord(
                code="REVIEW_LANGUAGE_MISSING",
                severity="error",
                message="The memo must explicitly require qualified review when controlled capabilities or uncertainty signals are present.",
                path="memo_markdown",
                supporting_fact_names=[],
                supporting_citation_labels=[],
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

    lines = ["Memo validation needs attention:"]
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
    for pattern in UNRESOLVED_TEMPLATE_PATTERNS:
        if re.search(pattern, memo_markdown, flags=re.IGNORECASE):
            issues.append(f"memo contains unresolved template marker: {pattern}")
    for line in _weak_source_boilerplate_lines(memo_markdown):
        issues.append(f"memo contains weak source-evidence boilerplate: {line[:180]}")
    for pattern in FINAL_DETERMINATION_PATTERNS:
        if re.search(pattern, normalized, flags=re.IGNORECASE):
            issues.append(f"memo appears to overstate the review recommendation: {pattern}")
    malformed_reason = _markdown_looks_malformed(memo_markdown)
    if malformed_reason:
        issues.append(f"memo markdown appears malformed: {malformed_reason}")
    required_sections = [
        "document summary",
        "extracted technical facts",
        "recommended review paths",
        "potential review candidates",
        "open questions and missing evidence",
        "key uncertainties",
        "reviewer questions",
        "eccn review recommendation",
        "review state",
    ]
    for section in required_sections:
        if section not in normalized:
            issues.append(f"memo is missing section: {section}")
    if not _memo_has_source_evidence(memo_markdown):
        issues.append("memo does not include source evidence")
    if "expert review" not in normalized:
        issues.append("memo does not clearly require expert review")

    if issues:
        raise ValueError("Memo Markdown validation needs attention: " + "; ".join(issues))
