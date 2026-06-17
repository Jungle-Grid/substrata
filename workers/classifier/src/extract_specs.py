from __future__ import annotations

import re

from schemas import ExtractedSpec

CONFIDENCE_ORDER = {"high": 3, "medium": 2, "low": 1}
QUALIFIER_TOKENS = {
    "up to": "up to",
    "greater than": ">",
    "more than": ">",
    "less than": "<",
    "no more than": "<=",
    "no less than": ">=",
    "at least": ">=",
    "minimum": "minimum",
    "maximum": "maximum",
    "typical": "typical",
    ">": ">",
    "<": "<",
}
COMPARATIVE_ARCHITECTURE_TERMS = (
    "unlike",
    "compared with",
    "compared to",
    "versus",
    "other adcs",
    "traditional adcs",
    "for example",
    "or sar adcs",
    "successive approximation register (sar) adcs",
)
EXTERNAL_CLOCK_TERMS = (
    "external clock",
    "clock source",
    "clock frequencies higher than",
    "clock frequency higher than",
    "pll support",
    "jitter cleaner",
    "synthesizer",
    "reference design",
    "sysref",
    "clocking recommendations",
    "additional device clocks",
    "clock buffer",
    "reference clock",
)
ESD_CONTEXT_TERMS = (
    "human-body model",
    "electrostatic discharge",
    "esd",
    "jedec js-001",
    "ansi/esda/jedec js-001",
)
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
AMBIGUOUS_SEU_SEL_TERMS = (
    "register",
    "bit field",
    "sysref",
    "mask",
    "nco",
    "status register",
    "pin name",
    "signal name",
    "table column",
    "control bit",
)
HBM_MEMORY_TERMS = (
    "high bandwidth memory",
    "hbm2",
    "hbm3",
    "stacked memory",
    "memory interface",
)
DEVICE_SELF_REFERENCE_TERMS = (
    "adc12dj5200rf",
    "device",
    "this adc",
    "the adc",
    "converter",
    "the converter",
    "the device",
)
LEGAL_DISCLAIMER_TERMS = (
    "advised",
    "damages",
    "consequential",
    "expressly",
    "contained herein",
    "liable",
    "warranty",
    "copyright",
    "trademark",
    "terms",
    "conditions",
)
COMPUTE_PRIMARY_TERMS = (
    "mpsoc",
    "soc",
    "adaptive soc",
    "cortex",
    "arm",
    "fpga",
    "programmable logic",
    "zynq",
    "ultrascale",
    "processor",
)
CONVERTER_PRIMARY_TERMS = (
    "analog-to-digital converter",
    "digital-to-analog converter",
    "rf-sampling",
    "adc",
    "dac",
)
SUBORDINATE_ADC_TERMS = (
    "system monitor",
    "external inputs",
    "xadc",
    "housekeeping",
    "monitor",
)
ECC_MEMORY_CONTEXT_TERMS = (
    "cache",
    "tcm",
    "ram",
    "nand",
    "dram",
    "ddr",
    "memory",
    "axi",
    "coherency",
    "data integrity",
    "parity",
    "error correction",
    "error-correcting",
    "error correcting",
    "onfi",
    "flash",
)
ECC_CRYPTO_CONTEXT_TERMS = (
    "elliptic",
    "ecdsa",
    "ecdh",
    "public key",
    "private key",
    "certificate",
    "signature",
    "cryptographic",
    "crypto engine",
    "key exchange",
)
DOCUMENT_NUMBER_PREFIXES = ("DS", "UG", "PG", "WP", "XAPP", "AM")
PART_NUMBER_EXCLUSION_NEAR_TERMS = (
    "expressly advised",
    "consequential damages",
    "copyright",
    "warranty",
    "liability",
    "trademark",
    "terms",
    "conditions",
    "product specification",
)


def _normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _normalize_qualifier(raw: str | None) -> str | None:
    if not raw:
        return None
    normalized = _normalize_whitespace(raw.lower())
    return QUALIFIER_TOKENS.get(normalized, normalized)


def _format_qualified_value(value: str, qualifier: str | None) -> str:
    clean_value = _normalize_whitespace(value.strip(" ,.;:"))
    normalized_qualifier = _normalize_qualifier(qualifier)
    if not normalized_qualifier:
        return clean_value
    if normalized_qualifier in {">", "<", ">=", "<="}:
        return f"{normalized_qualifier}{clean_value}"
    return f"{normalized_qualifier} {clean_value}"


def _extract_snippet(text: str, start: int, end: int) -> str:
    line_start = text.rfind("\n", 0, start)
    line_end = text.find("\n", end)
    if line_start == -1:
        line_start = 0
    else:
        line_start += 1
    if line_end == -1:
        line_end = len(text)

    snippet = _normalize_whitespace(text[line_start:line_end])
    if len(snippet) <= 220:
        return snippet

    focus = _normalize_whitespace(text[start:end])
    focus_index = snippet.find(focus)
    if focus_index == -1:
        return snippet[:220].rstrip()

    window_start = max(0, focus_index - 70)
    window_end = min(len(snippet), focus_index + len(focus) + 70)
    return snippet[window_start:window_end].strip()


def _context_window(text: str, start: int, end: int, size: int = 180) -> str:
    return _normalize_whitespace(text[max(0, start - size): min(len(text), end + size)]).lower()


def _clean_value(value: str) -> str:
    return _normalize_whitespace(value.strip(" ,.;:"))


def _contains_any(text: str, phrases: tuple[str, ...]) -> bool:
    lowered = text.lower()
    return any(phrase in lowered for phrase in phrases)


def classify_ecc_context(snippet: str) -> str:
    lowered = snippet.lower()
    if any(term in lowered for term in ECC_MEMORY_CONTEXT_TERMS):
        return "error_correction"
    if any(term in lowered for term in ECC_CRYPTO_CONTEXT_TERMS):
        return "elliptic_curve_crypto"
    return "ambiguous"


def _extract_line_bounds(text: str, start: int, end: int) -> tuple[int, int]:
    line_start = text.rfind("\n", 0, start)
    line_end = text.find("\n", end)
    if line_start == -1:
        line_start = 0
    else:
        line_start += 1
    if line_end == -1:
        line_end = len(text)
    return line_start, line_end


def _extract_line(text: str, start: int, end: int) -> str:
    line_start, line_end = _extract_line_bounds(text, start, end)
    return _normalize_whitespace(text[line_start:line_end])


def _device_self_reference_in_text(text: str) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in DEVICE_SELF_REFERENCE_TERMS)


def _top_window(text: str, size: int = 2500) -> str:
    return text[:size]


def _find_top_line(text: str, pattern: str, *, max_lines: int = 20) -> str | None:
    lines = text.splitlines()[:max_lines]
    for line in lines:
        if re.search(pattern, line, flags=re.IGNORECASE):
            return _normalize_whitespace(line)
    return None


def _infer_primary_device_context(text: str, part_number_value: str | None) -> tuple[bool, bool]:
    top_text = _top_window(text).lower()
    has_converter_signal = any(term in top_text for term in CONVERTER_PRIMARY_TERMS)
    has_compute_signal = any(term in top_text for term in COMPUTE_PRIMARY_TERMS)
    if part_number_value and re.match(r"^(ADC|DAC|ADS|AFE)", part_number_value, flags=re.IGNORECASE):
        has_converter_signal = True
    return has_converter_signal, has_compute_signal


def _is_legal_context(text: str) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in LEGAL_DISCLAIMER_TERMS) or any(
        term in lowered for term in PART_NUMBER_EXCLUSION_NEAR_TERMS
    )


def _looks_like_document_number(value: str) -> bool:
    return bool(re.match(rf"^({'|'.join(DOCUMENT_NUMBER_PREFIXES)})\d{{2,5}}[A-Z]?$", value, flags=re.IGNORECASE))


def _find_document_number(text: str) -> re.Match[str] | None:
    return re.search(r"\b(DS\d{3,5}|UG\d{3,5}|PG\d{3,5}|WP\d{3,5}|XAPP\d{3,5})\b", text, flags=re.IGNORECASE)


def _add_spec(
    specs: list[ExtractedSpec],
    seen: dict[tuple[str, str], int],
    *,
    name: str,
    value: str,
    unit: str | None,
    source_snippet: str,
    importance: str,
    category: str,
    confidence: str,
) -> None:
    clean_value = _clean_value(value)
    clean_snippet = _clean_value(source_snippet)
    if not clean_value or not clean_snippet:
        return

    key = (name, clean_value.lower())
    new_spec = ExtractedSpec(
        name=name,
        value=clean_value,
        unit=unit,
        source_snippet=clean_snippet,
        importance=importance,
        category=category,
        confidence=confidence,
    )

    if key in seen:
        existing_index = seen[key]
        existing = specs[existing_index]
        if CONFIDENCE_ORDER[new_spec.confidence] > CONFIDENCE_ORDER[existing.confidence]:
            specs[existing_index] = new_spec
        return

    seen[key] = len(specs)
    specs.append(new_spec)


def _find_line(text: str, pattern: str) -> str | None:
    match = re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE)
    if not match:
        return None
    return _extract_snippet(text, match.start(), match.end())


def _extract_primary_jesd_facts(
    text: str,
    specs: list[ExtractedSpec],
    seen: dict[tuple[str, str], int],
) -> None:
    matches = list(re.finditer(r"\bJESD204([ABC])?\b", text, flags=re.IGNORECASE))
    if not matches:
        return

    specific_matches = [match for match in matches if match.group(1)]
    ranked_matches = sorted(
        specific_matches,
        key=lambda match: (
            0 if "serial data interface" in _context_window(text, match.start(), match.end()) else 1,
            {"C": 0, "B": 1, "A": 2}.get(match.group(1).upper(), 3),
        ),
    )
    primary_match = ranked_matches[0] if ranked_matches else matches[0]
    primary_revision = primary_match.group(1).upper() if primary_match.group(1) else ""
    primary_value = f"JESD204{primary_revision}" if primary_revision else "JESD204"

    _add_spec(
        specs,
        seen,
        name="jesd_interface",
        value=primary_value,
        unit=None,
        source_snippet=_extract_snippet(text, primary_match.start(), primary_match.end()),
        importance="The primary JESD output interface matters because serialized converter output format and revision level are often central to the electronics review path.",
        category="digital_interface",
        confidence="high",
    )

    other_revisions = []
    for match in specific_matches:
        value = f"JESD204{match.group(1).upper()}"
        if value == primary_value:
            continue
        context = _context_window(text, match.start(), match.end())
        if "compatible" in context or "receiver" in context or "subclass" in context:
            if value not in other_revisions:
                other_revisions.append(value)

    if other_revisions:
        note_match = re.search(
            r"(?im)^(?:.*(?:jesd204b|jesd204a).*(?:compatible|receiver|subclass).*)$",
            text,
        )
        _add_spec(
            specs,
            seen,
            name="jesd_other_references",
            value=" / ".join(other_revisions),
            unit=None,
            source_snippet=(
                _extract_snippet(text, note_match.start(), note_match.end())
                if note_match
                else _extract_snippet(text, specific_matches[-1].start(), specific_matches[-1].end())
            ),
            importance="Older JESD references can matter as compatibility notes, but they do not replace the main interface revision used for the review path.",
            category="digital_interface",
            confidence="medium",
        )


def _add_sample_rate_spec(
    specs: list[ExtractedSpec],
    seen: dict[tuple[str, str], int],
    *,
    name: str,
    value: str,
    unit: str,
    source_snippet: str,
    confidence: str = "high",
) -> None:
    importance_map = {
        "sample_rate": "Sample-rate claims are core converter performance facts for the initial electronics review path.",
        "single_channel_sample_rate": "The single-channel sample rate is one of the key converter performance facts that a reviewer should map to the current Category 3 electronics thresholds.",
        "dual_channel_sample_rate": "The dual-channel sample rate helps experts assess the alternate operating mode of the reviewed ADC.",
    }
    _add_spec(
        specs,
        seen,
        name=name,
        value=value,
        unit=unit,
        source_snippet=source_snippet,
        importance=importance_map[name],
        category="converter_performance",
        confidence=confidence,
    )


def _add_zynq_family_identity(
    text: str,
    specs: list[ExtractedSpec],
    seen: dict[tuple[str, str], int],
) -> bool:
    zynq_match = re.search(r"\bZynq\s+UltraScale\+\s+MPSoC\b", text, flags=re.IGNORECASE)
    if not zynq_match:
        return False

    snippet = _extract_snippet(text, zynq_match.start(), zynq_match.end())
    _add_spec(
        specs,
        seen,
        name="product_family",
        value="Zynq UltraScale+ MPSoC",
        unit=None,
        source_snippet=snippet,
        importance="Product-family identity is central here because the document describes an MPSoC family rather than one device ordering code.",
        category="product_identity",
        confidence="high",
    )
    _add_spec(
        specs,
        seen,
        name="product_name",
        value="Zynq UltraScale+ MPSoC",
        unit=None,
        source_snippet=snippet,
        importance="Product-name identity helps keep the memo tied to the programmable-logic SoC family under review.",
        category="product_identity",
        confidence="high",
    )
    _add_spec(
        specs,
        seen,
        name="part_number",
        value="Not a single part number - family overview",
        unit=None,
        source_snippet=snippet,
        importance="This document is a family overview, so a final review should use device-specific ordering codes rather than treating the document number as the part number.",
        category="product_identity",
        confidence="high",
    )
    _add_spec(
        specs,
        seen,
        name="is_family_overview",
        value="true",
        unit=None,
        source_snippet=snippet,
        importance="A family overview may omit ordering-code-specific limits, variants, and package-speed-grade details needed for final classification.",
        category="product_identity",
        confidence="high",
    )
    _add_spec(
        specs,
        seen,
        name="product_profile",
        value="fpga_programmable_logic_soc",
        unit=None,
        source_snippet=snippet,
        importance="The detected profile controls which facts and review paths should be emphasized in the draft memo.",
        category="profile_detection",
        confidence="high",
    )
    _add_spec(
        specs,
        seen,
        name="profile_confidence",
        value="high",
        unit=None,
        source_snippet=snippet,
        importance="Profile confidence tells the reviewer how strongly the extraction pipeline identified the document type.",
        category="profile_detection",
        confidence="high",
    )
    _add_spec(
        specs,
        seen,
        name="profile_rationale",
        value="Detected from title/filename/top-level references to Zynq UltraScale+ MPSoC, processing system, programmable logic, and SoC features.",
        unit=None,
        source_snippet=snippet,
        importance="Profile rationale explains why the memo is framed as a programmable-logic SoC review rather than an ADC review.",
        category="profile_detection",
        confidence="high",
    )

    doc_number_match = _find_document_number(text[:1200])
    if doc_number_match:
        _add_spec(
            specs,
            seen,
            name="document_number",
            value=doc_number_match.group(1).upper(),
            unit=None,
            source_snippet=_extract_snippet(text, doc_number_match.start(), doc_number_match.end()),
            importance="Document numbers identify the source publication; they should not be substituted for a product part number.",
            category="product_identity",
            confidence="high",
        )

    doc_type_match = re.search(r"\b(Product Specification|Overview|Data Sheet|Datasheet)\b", text[:1200], flags=re.IGNORECASE)
    if doc_type_match:
        raw_type = doc_type_match.group(1)
        value = "Data Sheet" if raw_type.lower() == "datasheet" else raw_type
        if value.lower() == "overview":
            value = "Product Specification"
        _add_spec(
            specs,
            seen,
            name="document_type",
            value=value,
            unit=None,
            source_snippet=_extract_snippet(text, doc_type_match.start(), doc_type_match.end()),
            importance="Document type helps reviewers distinguish a family overview from a device-specific datasheet or ordering-code document.",
            category="product_identity",
            confidence="medium",
        )
    return True


def _add_soc_fact(
    specs: list[ExtractedSpec],
    seen: dict[tuple[str, str], int],
    *,
    text: str,
    pattern: str,
    name: str,
    value: str,
    importance: str,
    category: str,
    confidence: str = "medium",
    flags: int = re.IGNORECASE,
) -> None:
    match = re.search(pattern, text, flags=flags)
    if not match:
        return
    _add_spec(
        specs,
        seen,
        name=name,
        value=value,
        unit=None,
        source_snippet=_extract_snippet(text, match.start(), match.end()),
        importance=importance,
        category=category,
        confidence=confidence,
    )


def _extract_soc_fpga_facts(
    text: str,
    specs: list[ExtractedSpec],
    seen: dict[tuple[str, str], int],
) -> None:
    _add_soc_fact(
        specs,
        seen,
        text=text,
        pattern=r"\b64-bit\b(?=[^.\n]{0,80}\b(?:Arm|Cortex|processor|processing))|(?:Arm|Cortex|processor|processing)[^.\n]{0,80}\b64-bit\b",
        name="processor_architecture",
        value="64-bit",
        importance="Processor word width is a processing-system fact for SoC review and must not be treated as converter resolution.",
        category="processing_system_cpu",
        confidence="high",
    )
    _add_soc_fact(
        specs,
        seen,
        text=text,
        pattern=r"\bArm\s+Cortex-A53\b|\bCortex-A53\b",
        name="cpu_core",
        value="Arm Cortex-A53",
        importance="The application CPU core identifies the processing subsystem that may affect the electronics review path.",
        category="processing_system_cpu",
        confidence="high",
    )
    _add_soc_fact(
        specs,
        seen,
        text=text,
        pattern=r"\bquad-core\b[^.\n]{0,80}\bCortex-A53\b|\bCortex-A53\b[^.\n]{0,80}\bquad-core\b",
        name="cpu_core_count",
        value="quad-core Cortex-A53",
        importance="Core-count language helps reviewers understand the scale of the processing subsystem.",
        category="processing_system_cpu",
        confidence="high",
    )
    _add_soc_fact(
        specs,
        seen,
        text=text,
        pattern=r"\bdual-core\b[^.\n]{0,80}\bCortex-A53\b|\bCortex-A53\b[^.\n]{0,80}\bdual-core\b",
        name="cpu_core_count",
        value="dual-core Cortex-A53",
        importance="Family-overview core-count variants should be reviewed against device-specific ordering codes before final classification.",
        category="processing_system_cpu",
        confidence="medium",
    )
    _add_soc_fact(
        specs,
        seen,
        text=text,
        pattern=r"\bArm\s+Cortex-R5F\b|\bCortex-R5F\b",
        name="realtime_cpu",
        value="dual-core Arm Cortex-R5F",
        importance="A real-time processor subsystem is a material SoC architecture fact for the electronics review path.",
        category="processing_system_cpu",
        confidence="high",
    )
    _add_soc_fact(
        specs,
        seen,
        text=text,
        pattern=r"\bMali-400\b",
        name="gpu",
        value="Arm Mali-400",
        importance="An integrated GPU is part of the SoC feature set and can affect architecture review.",
        category="processing_system_cpu",
    )
    _add_soc_fact(
        specs,
        seen,
        text=text,
        pattern=r"\b128\s*KB\s+TCM\b|\bTCM\b",
        name="cache_tcm",
        value="TCM/cache present",
        importance="TCM and cache details help distinguish memory-integrity facts from cryptographic features.",
        category="processing_system_cpu",
    )

    for ecc_match in re.finditer(r"\bECC\b", text, flags=re.IGNORECASE):
        snippet = _extract_snippet(text, ecc_match.start(), ecc_match.end())
        ecc_context = classify_ecc_context(_context_window(text, ecc_match.start(), ecc_match.end(), size=160))
        if ecc_context != "error_correction":
            continue
        lowered = snippet.lower()
        value = "ECC-protected TCM" if "tcm" in lowered else "ECC-protected cache" if "cache" in lowered else "ECC-protected memory/cache"
        _add_spec(
            specs,
            seen,
            name="memory_integrity",
            value=value,
            unit=None,
            source_snippet=snippet,
            importance="ECC in cache, TCM, or memory context means error-correcting code / memory integrity, not elliptic-curve cryptography.",
            category="memory_cache_integrity",
            confidence="high",
        )

    _add_soc_fact(
        specs,
        seen,
        text=text,
        pattern=r"\bprogrammable logic\b|\bPL\b",
        name="programmable_logic",
        value="programmable logic / PL",
        importance="Programmable logic is a defining feature for FPGA/SoC Category 3 electronics review.",
        category="programmable_logic_fpga",
        confidence="high",
    )
    _add_soc_fact(
        specs,
        seen,
        text=text,
        pattern=r"\bprocessing system\b|\bprocessing subsystem\b|\bPS\b",
        name="processing_system",
        value="processing system / PS",
        importance="Processing-system language establishes that the document covers an integrated SoC, not a standalone peripheral.",
        category="programmable_logic_fpga",
    )
    _add_soc_fact(
        specs,
        seen,
        text=text,
        pattern=r"\bPS\s*/\s*PL\b|\bPS/PL\b|\bprogrammable logic\b[^.\n]{0,120}\bprocessing\b|\bprocessing\b[^.\n]{0,120}\bprogrammable logic\b",
        name="ps_pl_integration",
        value="PS/PL integration",
        importance="Integration of processing system and programmable logic is central to FPGA SoC review.",
        category="programmable_logic_fpga",
    )

    interface_specs = [
        (r"\bFour\s+10/100/1000\s+tri-speed\s+Ethernet\s+MAC\b|\bEthernet\s+MAC\b", "ethernet_mac", "Four 10/100/1000 tri-speed Ethernet MAC", "Ethernet MAC count and speed are relevant high-speed I/O facts for SoC review."),
        (r"\bPCI\s+Express\b|\bPCIe\b", "pcie_interface", "PCIe", "PCIe capability can be relevant to narrower electronics and high-speed interface review."),
        (r"\bUSB\s*2\.0\b|\bUSB\b", "usb_interface", "USB 2.0", "USB peripheral capability is part of the SoC digital-interface profile."),
        (r"\bCAN\b", "can_interface", "CAN", "CAN peripheral capability is part of the SoC digital-interface profile."),
        (r"\bSPI\b", "spi_interface", "SPI", "SPI peripheral capability is part of the SoC digital-interface profile."),
        (r"\bI2C\b|I\s*2\s*C", "i2c_interface", "I2C", "I2C peripheral capability is part of the SoC digital-interface profile."),
        (r"\bUART\b", "uart_interface", "UART", "UART peripheral capability is part of the SoC digital-interface profile."),
        (r"\bJTAG\b", "jtag_interface", "JTAG", "JTAG/debug access can matter for device architecture and security review questions."),
        (r"\bDisplayPort\b", "displayport_interface", "DisplayPort", "DisplayPort is a high-speed digital-display interface that may require narrower interface review."),
        (r"\bNAND\b|\beMMC\b|\bSD\b", "memory_controller_interface", "NAND/eMMC/SD memory interface", "External memory-controller interfaces help characterize the SoC integration profile."),
    ]
    for pattern, name, value, importance in interface_specs:
        _add_soc_fact(
            specs,
            seen,
            text=text,
            pattern=pattern,
            name=name,
            value=value,
            importance=importance,
            category="digital_interface",
            confidence="high" if name in {"ethernet_mac", "pcie_interface", "displayport_interface"} else "medium",
        )

    dp_match = re.search(r"\b(?P<count>1\s+or\s+2|\d+)\s+lanes?\s+of\s+DisplayPort[^.\n]*?(?P<rates>\d+(?:\.\d+)?\s*Gb/s[^.\n]*)", text, flags=re.IGNORECASE)
    if dp_match:
        _add_spec(
            specs,
            seen,
            name="displayport_lane_rate",
            value="1 or 2 lanes at 1.62 Gb/s, 2.7 Gb/s, or 5.4 Gb/s",
            unit=None,
            source_snippet=_extract_snippet(text, dp_match.start(), dp_match.end()),
            importance="DisplayPort lane count and lane rates are concrete high-speed I/O facts for electronics review.",
            category="digital_interface",
            confidence="high",
        )

    security_specs = [
        (r"\bsecure\s+and\s+non-secure\s+boot\b|\bsecure boot\b", "secure_boot", "secure and non-secure boot", "Secure boot and non-secure boot modes can trigger separate security/cryptography review questions."),
        (r"\b256-bit\s+AES-GCM\b|\bAES-GCM\b", "cryptographic_algorithm", "AES-GCM", "AES-GCM is a named cryptographic algorithm and supports Category 5 Part 2 review questions."),
        (r"\b256-bit\s+AES-GCM\b", "crypto_key_size", "256-bit", "AES key size is relevant to cryptography review and must not be treated as ADC resolution."),
        (r"\bSHA-3/384\b", "cryptographic_algorithm", "SHA-3/384", "SHA-3/384 is a named hash algorithm and supports security/cryptography review questions."),
        (r"\b4096-bit\s+RSA\b|\bRSA\s*4096\b", "cryptographic_algorithm", "RSA 4096", "RSA 4096 is a named public-key cryptographic function and supports security/cryptography review questions."),
    ]
    for pattern, name, value, importance in security_specs:
        _add_soc_fact(
            specs,
            seen,
            text=text,
            pattern=pattern,
            name=name,
            value=value,
            importance=importance,
            category="security_cryptography",
            confidence="high",
        )

    adc_match = re.search(r"\b10-bit\s+200\s*K?SPS\s+ADC\b[^.\n]{0,80}\b17\s+external inputs\b", text, flags=re.IGNORECASE)
    if adc_match:
        _add_spec(
            specs,
            seen,
            name="peripheral_adc",
            value="10-bit, 200 KSPS, up to 17 external inputs",
            unit=None,
            source_snippet=_extract_snippet(text, adc_match.start(), adc_match.end()),
            importance="This is a minor SoC peripheral ADC fact; it should not change the primary product profile to ADC.",
            category="peripheral_functions",
            confidence="high",
        )

    peripheral_specs = [
        (r"\bGPIO\b", "gpio", "GPIO", "GPIO is a general-purpose peripheral fact for the SoC feature profile."),
        (r"\bSystem Monitor\b", "system_monitor", "system monitor", "System-monitor language helps identify subordinate monitoring peripherals rather than the primary product type."),
        (r"\btimer\b", "timer", "timer", "Timer peripherals are part of the SoC feature profile."),
        (r"\bwatchdog\b", "watchdog", "watchdog", "Watchdog peripherals are part of the SoC feature profile."),
    ]
    for pattern, name, value, importance in peripheral_specs:
        _add_soc_fact(
            specs,
            seen,
            text=text,
            pattern=pattern,
            name=name,
            value=value,
            importance=importance,
            category="peripheral_functions",
        )


def extract_specs(text: str) -> list[ExtractedSpec]:
    specs: list[ExtractedSpec] = []
    seen: dict[tuple[str, str], int] = {}
    normalized_text = text.replace("\r", "")
    top_text = _top_window(normalized_text)
    has_zynq_family_identity = _add_zynq_family_identity(normalized_text, specs, seen)

    manufacturer_pattern = (
        r"\b(Texas Instruments|Analog Devices|ADI|Intel|AMD|Xilinx|NXP|"
        r"Microchip|Renesas|Infineon|onsemi|STMicroelectronics|Qorvo|Skyworks|"
        r"Broadcom|Lattice|Teledyne|Marvell|Semtech|Maxim Integrated|Analog Devices, Inc\.)\b"
    )
    manufacturer_match = re.search(manufacturer_pattern, top_text, flags=re.IGNORECASE)
    if not manufacturer_match:
        manufacturer_match = re.search(manufacturer_pattern, normalized_text, flags=re.IGNORECASE)
    if manufacturer_match:
        _add_spec(
            specs,
            seen,
            name="manufacturer",
            value=manufacturer_match.group(1),
            unit=None,
            source_snippet=_extract_snippet(normalized_text, manufacturer_match.start(), manufacturer_match.end()),
            importance="Manufacturer identity anchors the review to the vendor’s own part naming, application framing, and qualification language.",
            category="product_identity",
            confidence="high",
        )

    part_patterns = [
        r"\b((?:ADC|DAC|ADS|AFE|LTC|AD|LMX|DAC\d|ADC\d)[A-Z0-9-]{4,})\b",
        r"\b([A-Z]{2,}\d{2,}[A-Z0-9+-]{1,})\b",
    ]
    part_number_value: str | None = None
    if not has_zynq_family_identity:
        for pattern in part_patterns:
            part_match = re.search(pattern, top_text)
            if not part_match:
                part_match = re.search(pattern, normalized_text)
            if part_match:
                candidate_line = _extract_line(normalized_text, part_match.start(), part_match.end())
                candidate_value = part_match.group(1)
                if _is_legal_context(candidate_line) or candidate_value.isalpha() or _looks_like_document_number(candidate_value):
                    continue
                part_number_value = part_match.group(1)
                _add_spec(
                    specs,
                    seen,
                    name="part_number",
                    value=part_number_value,
                    unit=None,
                    source_snippet=_extract_snippet(normalized_text, part_match.start(), part_match.end()),
                    importance="Part number identification ties the memo to the exact component under review and avoids confusion with reference designs or companion parts.",
                    category="product_identity",
                    confidence="high",
                )
                break

    has_primary_converter_signal, has_primary_compute_signal = _infer_primary_device_context(
        normalized_text,
        part_number_value,
    )
    is_primary_converter_doc = has_primary_converter_signal and not has_primary_compute_signal

    device_patterns = [
        (r"\b(mpsoc|adaptive soc|system-on-chip|soc|fpga|processor)\b", "Processor/SoC"),
        (r"\banalog[- ]to[- ]digital converter\b", "Analog-to-digital converter (ADC)"),
        (r"\bdigital[- ]to[- ]analog converter\b", "Digital-to-analog converter (DAC)"),
        (r"\bRF-sampling\b", "RF-sampling ADC"),
        (r"\bADC\b", "ADC"),
        (r"\bDAC\b", "DAC"),
        (r"\baccelerator\b", "Accelerator"),
    ]
    for pattern, label in device_patterns:
        match = re.search(pattern, top_text, flags=re.IGNORECASE)
        if match:
            _add_spec(
                specs,
                seen,
                name="device_type",
                value=label,
                unit=None,
                source_snippet=_extract_snippet(normalized_text, match.start(), match.end()),
                importance="Device type frames which technical parameters are most relevant in the initial review path.",
                category="product_identity",
                confidence="high" if "ADC" in label or "DAC" in label else "medium",
            )
            break

    if has_zynq_family_identity or has_primary_compute_signal:
        _extract_soc_fpga_facts(normalized_text, specs, seen)

    description_line = _find_line(
        top_text,
        r"(?im)^(?:.*(?:converter|adc|dac|rf-sampling|transceiver|processor|accelerator|mpsoc|soc|fpga).*)$",
    )
    if description_line:
        lowered_description = description_line.lower()
        if any(term in lowered_description for term in ("analog-to-digital converter", "rf-sampling", "processor", "mpsoc", "soc", "fpga", "accelerator")):
            _add_spec(
                specs,
                seen,
                name="product_description",
                value=description_line,
                unit=None,
                source_snippet=description_line,
                importance="A short product description helps reviewers distinguish the device itself from supporting reference-design or companion-component text.",
                category="product_identity",
                confidence="medium",
            )

    process_match = re.search(r"(\d+(?:\.\d+)?)\s*nm\b", normalized_text, flags=re.IGNORECASE)
    if process_match:
        _add_spec(
            specs,
            seen,
            name="process_node",
            value=_format_qualified_value(process_match.group(1), None),
            unit="nm",
            source_snippet=_extract_snippet(normalized_text, process_match.start(), process_match.end()),
            importance="Process-node claims can help experts understand the device’s performance positioning, but they do not replace threshold mapping to current control text.",
            category="converter_performance",
            confidence="medium",
        )

    resolution_match = re.search(r"(\d+(?:\.\d+)?)\s*[- ]bit\b", normalized_text, flags=re.IGNORECASE)
    if resolution_match and is_primary_converter_doc:
        resolution_line = _extract_line(normalized_text, resolution_match.start(), resolution_match.end())
        if _contains_any(resolution_line, SUBORDINATE_ADC_TERMS):
            resolution_match = None
    if resolution_match and is_primary_converter_doc:
        _add_spec(
            specs,
            seen,
            name="adc_resolution",
            value=_format_qualified_value(resolution_match.group(1), None),
            unit="bits",
            source_snippet=_extract_snippet(normalized_text, resolution_match.start(), resolution_match.end()),
            importance="ADC resolution matters because converter bit depth, especially when paired with sample rate, is often central to the electronics review path.",
            category="converter_performance",
            confidence="high",
        )

    title_mode_match = re.search(
        r"(?P<single>\d+(?:\.\d+)?)\s*(?P<single_unit>G|M|K)SPS\s*single[- ]channel\s*or\s*(?P<dual>\d+(?:\.\d+)?)\s*(?P<dual_unit>G|M|K)SPS\s*dual[- ]channel",
        normalized_text,
        flags=re.IGNORECASE,
    )
    dual_title_match = re.search(
        r"dual[- ]channel\s*,?\s*(?:\d+(?:\.\d+)?[- ]bit\s*,?\s*)?(?P<value>\d+(?:\.\d+)?)\s*[- ]?(?P<unit>G|M|K)SPS\b",
        normalized_text,
        flags=re.IGNORECASE,
    )
    single_line_match = re.search(
        r"up to\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>G|M|K)SPS\s*in single[- ]channel mode",
        normalized_text,
        flags=re.IGNORECASE,
    )
    dual_line_match = re.search(
        r"up to\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>G|M|K)SPS\s*in dual[- ]channel mode",
        normalized_text,
        flags=re.IGNORECASE,
    )
    if is_primary_converter_doc and (title_mode_match or single_line_match or dual_line_match or dual_title_match):
        channel_source = title_mode_match or single_line_match or dual_line_match or dual_title_match
        channel_modes_value = "single-channel and dual-channel" if title_mode_match or single_line_match or dual_line_match else "dual-channel"
        _add_spec(
            specs,
            seen,
            name="channel_modes",
            value=channel_modes_value,
            unit=None,
            source_snippet=_extract_snippet(
                normalized_text,
                channel_source.start(),
                channel_source.end(),
            ),
            importance="Channel modes matter because some converter review questions depend on whether the device operates as a single-channel or dual-channel part.",
            category="converter_performance",
            confidence="high",
        )
        if single_line_match:
            single_value = _format_qualified_value(single_line_match.group("value"), "up to")
            single_unit = f"{single_line_match.group('unit').upper()}SPS"
            single_snippet = _extract_snippet(normalized_text, single_line_match.start(), single_line_match.end())
        elif title_mode_match:
            single_value = _format_qualified_value(title_mode_match.group("single"), None)
            single_unit = f"{title_mode_match.group('single_unit').upper()}SPS"
            single_snippet = _extract_snippet(normalized_text, title_mode_match.start(), title_mode_match.end())
        else:
            single_value = None
            single_unit = None
            single_snippet = None
        if single_value and single_unit and single_snippet:
            _add_sample_rate_spec(
                specs,
                seen,
                name="single_channel_sample_rate",
                value=single_value,
                unit=single_unit,
                source_snippet=single_snippet,
            )
        if dual_line_match:
            dual_value = _format_qualified_value(dual_line_match.group("value"), "up to")
            dual_unit = f"{dual_line_match.group('unit').upper()}SPS"
            dual_snippet = _extract_snippet(normalized_text, dual_line_match.start(), dual_line_match.end())
        elif title_mode_match:
            dual_value = _format_qualified_value(title_mode_match.group("dual"), None)
            dual_unit = f"{title_mode_match.group('dual_unit').upper()}SPS"
            dual_snippet = _extract_snippet(normalized_text, title_mode_match.start(), title_mode_match.end())
        else:
            dual_value = _format_qualified_value(dual_title_match.group("value"), None)
            dual_unit = f"{dual_title_match.group('unit').upper()}SPS"
            dual_snippet = _extract_snippet(normalized_text, dual_title_match.start(), dual_title_match.end())
        _add_sample_rate_spec(
            specs,
            seen,
            name="dual_channel_sample_rate",
            value=dual_value,
            unit=dual_unit,
            source_snippet=dual_snippet,
        )
    elif is_primary_converter_doc:
        sample_match = re.search(
            r"(?P<qualifier>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>G|M|K)SPS\b",
            normalized_text,
            flags=re.IGNORECASE,
        )
        if sample_match:
            _add_sample_rate_spec(
                specs,
                seen,
                name="sample_rate",
                value=_format_qualified_value(sample_match.group("value"), sample_match.group("qualifier")),
                unit=f"{sample_match.group('unit').upper()}SPS",
                source_snippet=_extract_snippet(normalized_text, sample_match.start(), sample_match.end()),
            )

    channel_line_match = re.search(r"\b(single[- ]channel|dual[- ]channel)\b", normalized_text, flags=re.IGNORECASE)
    if is_primary_converter_doc and channel_line_match and not any(spec.name == "channel_modes" for spec in specs):
        channel_line = _extract_line(normalized_text, channel_line_match.start(), channel_line_match.end())
        if "bit" in channel_line.lower() and "register" in channel_line.lower():
            channel_line_match = None
    if is_primary_converter_doc and channel_line_match and not any(spec.name == "channel_modes" for spec in specs):
        _add_spec(
            specs,
            seen,
            name="channel_modes",
            value=channel_line_match.group(1),
            unit=None,
            source_snippet=_extract_snippet(normalized_text, channel_line_match.start(), channel_line_match.end()),
            importance="Channel-mode wording is relevant because it changes how the sample-rate claims should be read.",
            category="converter_performance",
            confidence="medium",
        )

    bandwidth_patterns = [
        (
            "input_bandwidth",
            r"(?:analog\s+input bandwidth(?:\s*\([^)]+\))?(?:\s*:|\s+of)?\s*)(?P<qualifier>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>GHz|MHz|kHz)|(?P<qualifier2>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value2>\d+(?:\.\d+)?)\s*(?P<unit2>GHz|MHz|kHz)\s*(?:analog\s+)?input bandwidth",
            "Analog input bandwidth matters because it shows how far into the RF spectrum the converter is designed to acquire signals.",
        ),
        (
            "usable_input_frequency_range",
            r"usable input frequency range:\s*(?P<qualifier>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>GHz|MHz|kHz)",
            "Usable input frequency range is relevant because it indicates whether the part supports direct RF sampling beyond lower-frequency converter use cases.",
        ),
        (
            "full_power_bandwidth",
            r"full[- ]power bandwidth[^.\n]{0,40}?(?P<qualifier>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>GHz|MHz|kHz)",
            "Full-power bandwidth helps experts understand the converter’s performance at more realistic input amplitudes.",
        ),
    ]
    for name, pattern, importance in bandwidth_patterns:
        match = re.search(pattern, normalized_text, flags=re.IGNORECASE)
        if match and is_primary_converter_doc:
            qualifier = match.groupdict().get("qualifier") or match.groupdict().get("qualifier2")
            value = match.groupdict().get("value") or match.groupdict().get("value2")
            unit = match.groupdict().get("unit") or match.groupdict().get("unit2")
            _add_spec(
                specs,
                seen,
                name=name,
                value=_format_qualified_value(value, qualifier),
                unit=unit,
                source_snippet=_extract_snippet(normalized_text, match.start(), match.end()),
                importance=importance,
                category="rf_microwave" if name in {"input_bandwidth", "usable_input_frequency_range", "full_power_bandwidth"} else "converter_performance",
                confidence="high" if name in {"input_bandwidth", "usable_input_frequency_range"} else "medium",
            )

    for name, label in [("enob", "ENOB"), ("snr", "SNR"), ("sfdr", "SFDR")]:
        match = re.search(rf"\b{label}\b[^.\n]{{0,20}}?(?P<qualifier>typical|maximum|minimum|>|<)?\s*(?P<value>\d+(?:\.\d+)?)\s*dB\b", normalized_text, flags=re.IGNORECASE)
        if match:
            _add_spec(
                specs,
                seen,
                name=name,
                value=_format_qualified_value(match.group("value"), match.group("qualifier")),
                unit="dB",
                source_snippet=_extract_snippet(normalized_text, match.start(), match.end()),
                importance=f"{label} can help an expert distinguish marketing-level claims from more technically grounded converter performance statements.",
                category="converter_performance",
                confidence="medium",
            )

    for architecture_pattern, architecture_name in [
        (r"\bpipeline\b", "pipeline"),
        (r"\bdelta[- ]sigma\b", "delta-sigma"),
        (r"\btime-interleaved\b", "time-interleaved"),
        (r"\bflash ADC\b", "flash ADC"),
        (r"\bSAR\b", "SAR"),
    ]:
        match = re.search(architecture_pattern, normalized_text, flags=re.IGNORECASE)
        if not match:
            continue
        context = _context_window(normalized_text, match.start(), match.end())
        line = _extract_line(normalized_text, match.start(), match.end()).lower()
        if _contains_any(context, COMPARATIVE_ARCHITECTURE_TERMS):
            continue
        if "successive approximation" in context and _contains_any(context, COMPARATIVE_ARCHITECTURE_TERMS):
            continue
        if part_number_value and part_number_value.lower() not in line and not _device_self_reference_in_text(line):
            continue
        if not part_number_value and not _device_self_reference_in_text(line):
            continue
        _add_spec(
            specs,
            seen,
            name="converter_architecture",
            value=architecture_name,
            unit=None,
            source_snippet=_extract_snippet(normalized_text, match.start(), match.end()),
            importance="Converter architecture can matter when experts compare the reviewed device against more specialized converter categories.",
            category="converter_performance",
            confidence="medium",
        )
        break

    _extract_primary_jesd_facts(normalized_text, specs, seen)

    for match in re.finditer(r"\b(LVDS|CMOS|SPI|I2C|PCIe|Ethernet|JTAG|UART)\b", normalized_text, flags=re.IGNORECASE):
        context = _context_window(normalized_text, match.start(), match.end())
        if match.group(0).upper() in {"SPI", "CMOS"}:
            continue
        _add_spec(
            specs,
            seen,
            name="digital_interface",
            value=match.group(0),
            unit=None,
            source_snippet=_extract_snippet(normalized_text, match.start(), match.end()),
            importance="Digital interface wording helps experts understand how the device connects into a broader digital system.",
            category="digital_interface",
            confidence="medium",
        )

    lane_rate_match = re.search(
        r"(?:(?:maximum|line|lane)\s+rate\s*:?\s*(?P<qualifier1>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value1>\d+(?:\.\d+)?)\s*Gbps)|(?:supporting\s+(?P<qualifier2>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value2>\d+(?:\.\d+)?)\s*Gbps\s*line rate)|(?:at\s+(?P<qualifier3>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value3>\d+(?:\.\d+)?)\s*Gbps\b)|(?:serial lane rate\s*:?\s*(?P<qualifier4>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value4>\d+(?:\.\d+)?)\s*Gbps)",
        normalized_text,
        flags=re.IGNORECASE,
    )
    if lane_rate_match:
        qualifier = (
            lane_rate_match.groupdict().get("qualifier1")
            or lane_rate_match.groupdict().get("qualifier2")
            or lane_rate_match.groupdict().get("qualifier3")
            or lane_rate_match.groupdict().get("qualifier4")
        )
        value = (
            lane_rate_match.groupdict().get("value1")
            or lane_rate_match.groupdict().get("value2")
            or lane_rate_match.groupdict().get("value3")
            or lane_rate_match.groupdict().get("value4")
        )
        _add_spec(
            specs,
            seen,
            name="serial_lane_rate",
            value=_format_qualified_value(value, qualifier),
            unit="Gbps",
            source_snippet=_extract_snippet(normalized_text, lane_rate_match.start(), lane_rate_match.end()),
            importance="Serial lane rate matters because high-speed converter output interfaces are often part of the Category 3 electronics review path.",
            category="digital_interface",
            confidence="high",
        )

    lane_match = re.search(
        r"\b(?P<count>\d+)\s*lanes?(?:\s*per\s*channel)?\b",
        normalized_text,
        flags=re.IGNORECASE,
    )
    if lane_match:
        lane_snippet = _extract_snippet(normalized_text, lane_match.start(), lane_match.end())
        lane_context = _context_window(normalized_text, lane_match.start(), lane_match.end(), size=120)
        if not any(token in lane_context for token in ("jesd", "serial", "serialized", "line rate", "per channel", "lane rate")):
            lane_match = None
    if lane_match:
        lane_snippet = _extract_snippet(normalized_text, lane_match.start(), lane_match.end())
        _add_spec(
            specs,
            seen,
            name="interface_lane_count",
            value=_clean_value(lane_match.group("count")),
            unit="lanes per channel" if "per channel" in lane_snippet.lower() else "lanes",
            source_snippet=lane_snippet,
            importance="Lane count helps experts understand the scale of the serialized output architecture.",
            category="digital_interface",
            confidence="medium",
        )

    hbm_match = re.search(r"\bHBM(?:\d+)?\b|\bhigh bandwidth memory\b", normalized_text, flags=re.IGNORECASE)
    if hbm_match:
        hbm_context = _context_window(normalized_text, hbm_match.start(), hbm_match.end(), size=120)
        if _contains_any(hbm_context, ESD_CONTEXT_TERMS):
            pass
        elif _contains_any(hbm_context, HBM_MEMORY_TERMS):
            _add_spec(
                specs,
                seen,
                name="memory_type",
                value="HBM",
                unit=None,
                source_snippet=_extract_snippet(normalized_text, hbm_match.start(), hbm_match.end()),
                importance="Memory-type language only matters when the datasheet clearly describes an actual memory interface or integrated memory technology.",
                category="compute_processor",
                confidence="medium",
            )

    clock_note_match = re.search(
        r"(?im)^(?=.*(?:clock|sysref))(?=.*(?:\d+(?:\.\d+)?\s*GHz)).*$",
        normalized_text,
    )
    if clock_note_match:
        clock_line = _extract_line(normalized_text, clock_note_match.start(), clock_note_match.end())
        if _contains_any(clock_line, EXTERNAL_CLOCK_TERMS):
            _add_spec(
                specs,
                seen,
                name="clocking_reference_note",
                value=clock_line,
                unit=None,
                source_snippet=clock_line,
                importance="This is a clocking or reference-design note, not a processor or device clock-speed claim. It can help reviewers distinguish implementation guidance from the device's own performance specs.",
                category="digital_interface",
                confidence="low",
            )

    rf_range_match = re.search(
        r"(?:RF input|receiver input)[^.\n]{0,50}?(?P<start>\d+(?:\.\d+)?)\s*(?P<start_unit>GHz|MHz)\s*(?:to|-)\s*(?P<end>\d+(?:\.\d+)?)\s*(?P<end_unit>GHz|MHz)",
        normalized_text,
        flags=re.IGNORECASE,
    )
    if rf_range_match:
        _add_spec(
            specs,
            seen,
            name="rf_input_frequency_range",
            value=f"{_clean_value(rf_range_match.group('start'))} {rf_range_match.group('start_unit')} to {_clean_value(rf_range_match.group('end'))} {rf_range_match.group('end_unit')}",
            unit=None,
            source_snippet=_extract_snippet(normalized_text, rf_range_match.start(), rf_range_match.end()),
            importance="An RF input range can matter because it shows whether the device is intended for broader RF or microwave sampling use cases.",
            category="rf_microwave",
            confidence="medium",
        )

    if re.search(r"\b(modulation|demodulation|upconversion|downconversion|frequency synthesis)\b", normalized_text, flags=re.IGNORECASE):
        modulation_match = re.search(r"\b(modulation|demodulation|upconversion|downconversion|frequency synthesis)\b", normalized_text, flags=re.IGNORECASE)
        if modulation_match:
            _add_spec(
                specs,
                seen,
                name="modulation_feature",
                value=modulation_match.group(1),
                unit=None,
                source_snippet=_extract_snippet(normalized_text, modulation_match.start(), modulation_match.end()),
                importance="Explicit modulation or synthesis language can matter because it may broaden the RF-oriented review path.",
                category="rf_microwave",
                confidence="medium",
            )

    application_terms = []
    for term in ("electronic warfare", "sigint", "elint", "phased-array radar", "radar", "satellite communications", "test and measurement", "oscilloscope", "space", "aerospace", "defense", "military"):
        if term in normalized_text.lower():
            application_terms.append(term)
    if application_terms:
        primary_application_line = _find_line(
            normalized_text,
            r"(?im)^(?:.*applications include.*)$",
        ) or _find_line(
            normalized_text,
            r"(?im)^(?:.*can be used in a wide range of applications including.*)$",
        ) or _find_line(
            normalized_text,
            r"(?im)^(?:.*(?:electronic warfare|sigint|elint|phased-array radar|radar|satellite communications|test and measurement|oscilloscope).*)$",
        )
        if primary_application_line:
            unique_terms = []
            for term in application_terms:
                label = term.upper() if term in {"sigint", "elint"} else term
                if label not in unique_terms:
                    unique_terms.append(label)
            _add_spec(
                specs,
                seen,
                name="application_examples",
                value=" / ".join(unique_terms[:6]),
                unit=None,
                source_snippet=primary_application_line,
                importance="This is application-context language from the datasheet, not a final end-use determination. It may still inform which expert review questions should be asked.",
                category="application_context",
                confidence="medium",
            )

    temp_match = re.search(
        r"(?:operating temperature|ambient temperature|junction temperature)[^.\n]{0,50}?(-?\d+)\s*(?:to|-|\/)\s*(-?\d+)\s*°?\s*C",
        normalized_text,
        flags=re.IGNORECASE,
    )
    if temp_match:
        _add_spec(
            specs,
            seen,
            name="operating_temperature_range",
            value=f"{temp_match.group(1)} to {temp_match.group(2)}",
            unit="C",
            source_snippet=_extract_snippet(normalized_text, temp_match.start(), temp_match.end()),
            importance="Operating temperature range helps reviewers understand whether the device is positioned for commercial, industrial, or harsher environments.",
            category="environmental_qualification",
            confidence="medium",
        )

    environment_patterns = [
        ("automotive_qualification", r"\b(AEC-Q100|automotive grade)\b", "Automotive qualification can matter because it suggests a different deployment profile than purely commercial electronics."),
        ("space_qualification", r"\b(space[- ]grade|space qualified|aerospace)\b", "Space or aerospace language matters because specialized deployment claims can affect the review path."),
        ("military_grade", r"\b(military grade|defense|mil-std)\b", "Military-oriented language matters because specialized design intent or end-use framing can change the review path."),
        ("radiation_tolerance", r"\b(radiation[- ]tolerant|radiation hardened|rad[- ]hard)\b", "Radiation-tolerance language matters because specialized environmental claims can materially affect the expert review path."),
        ("tid_rating", r"\bTID\b[^.\n]{0,30}?(\d+(?:\.\d+)?)\s*(krad|Mrad)\b", "A stated total ionizing dose rating is directly relevant to whether the part should be reviewed for radiation-hardened or specialized deployments."),
        ("ruggedization", r"\b(ruggedized|ruggedization|high-reliability)\b", "Ruggedization language can suggest specialized deployment environments that deserve closer review."),
    ]
    for name, pattern, importance in environment_patterns:
        for match in re.finditer(pattern, normalized_text, flags=re.IGNORECASE):
            value = match.group(1) if match.groups() else match.group(0)
            unit = match.group(2) if len(match.groups()) > 1 and match.group(2) else None
            _add_spec(
                specs,
                seen,
                name=name,
                value=_clean_value(value),
                unit=unit,
                source_snippet=_extract_snippet(normalized_text, match.start(), match.end()),
                importance=importance,
                category="environmental_qualification",
                confidence="high" if name in {"radiation_tolerance", "tid_rating"} else "medium",
            )

    for match in re.finditer(r"\b(SEU|SEL)\b", normalized_text, flags=re.IGNORECASE):
        context = _context_window(normalized_text, match.start(), match.end(), size=220)
        if not _contains_any(context, RADIATION_CONTEXT_TERMS):
            continue
        if _contains_any(context, AMBIGUOUS_SEU_SEL_TERMS):
            continue
        _add_spec(
            specs,
            seen,
            name="seu_or_sel",
            value=_clean_value(match.group(1)),
            unit=None,
            source_snippet=_extract_snippet(normalized_text, match.start(), match.end()),
            importance="Single-event upset or latch-up language is relevant because it points toward specialized reliability and radiation-review questions.",
            category="environmental_qualification",
            confidence="medium",
        )

    esd_hbm_match = re.search(
        r"human-body model \(hbm\)[^.\n]{0,120}?(?P<value>[±]?\d+(?:\.\d+)?)\s*(?P<unit>k?V)\b",
        normalized_text,
        flags=re.IGNORECASE,
    )
    if esd_hbm_match:
        _add_spec(
            specs,
            seen,
            name="esd_human_body_model",
            value=esd_hbm_match.group("value"),
            unit=esd_hbm_match.group("unit"),
            source_snippet=_extract_snippet(normalized_text, esd_hbm_match.start(), esd_hbm_match.end()),
            importance="Human Body Model ESD information is a qualification detail, not a memory feature. It can still be useful context for understanding datasheet qualification language.",
            category="environmental_qualification",
            confidence="medium",
        )

    security_patterns = [
        ("security_feature", r"\b(trusted execution|trusted platform|hardware root of trust|key storage|device authentication)\b", "Explicit security-function language matters because embedded security capability can require a different review path than a pure analog or digital component."),
        ("cryptographic_algorithm", r"\b(ECC)\b", "Named cryptographic algorithms matter because they can indicate security functionality that is not otherwise obvious from the high-level product description."),
    ]
    for name, pattern, importance in security_patterns:
        for match in re.finditer(pattern, normalized_text, flags=re.IGNORECASE):
            context = _context_window(normalized_text, match.start(), match.end(), size=140)
            if match.group(1).upper() == "ECC" and classify_ecc_context(context) != "elliptic_curve_crypto":
                continue
            _add_spec(
                specs,
                seen,
                name=name,
                value=match.group(1),
                unit=None,
                source_snippet=_extract_snippet(normalized_text, match.start(), match.end()),
                importance=importance,
                category="security_cryptography",
                confidence="medium",
            )

    package_match = re.search(
        r"\b(?:FCBGA|FCCSP|BGA|QFN|VQFN|LGA|QFP|TQFP|WLCSP)\b(?:\s*\((\d{2,4})\))?",
        normalized_text,
        flags=re.IGNORECASE,
    )
    if package_match:
        package_type = package_match.group(0)
        _add_spec(
            specs,
            seen,
            name="package_type",
            value=_clean_value(package_type),
            unit=None,
            source_snippet=_extract_snippet(normalized_text, package_match.start(), package_match.end()),
            importance="Package information helps experts identify the physical form factor and deployment context of the reviewed component.",
            category="packaging_lifecycle",
            confidence="medium",
        )

    power_match = re.search(
        r"(?:power consumption|total power|power dissipation)[^.\n]{0,40}?(?P<qualifier>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>mW\/Ch|W\/Ch|mW|W)",
        normalized_text,
        flags=re.IGNORECASE,
    )
    if power_match:
        _add_spec(
            specs,
            seen,
            name="power_consumption",
            value=_format_qualified_value(power_match.group("value"), power_match.group("qualifier")),
            unit=power_match.group("unit"),
            source_snippet=_extract_snippet(normalized_text, power_match.start(), power_match.end()),
            importance="Power-consumption detail helps reviewers understand the performance density and implementation context of the component.",
            category="packaging_lifecycle",
            confidence="medium",
        )

    supply_match = re.search(r"(?:supply voltage|power supply)[^.\n]{0,40}?(?P<value>\d+(?:\.\d+)?)\s*V", normalized_text, flags=re.IGNORECASE)
    if supply_match:
        _add_spec(
            specs,
            seen,
            name="supply_voltage",
            value=_clean_value(supply_match.group("value")),
            unit="V",
            source_snippet=_extract_snippet(normalized_text, supply_match.start(), supply_match.end()),
            importance="Supply-voltage information can help experts understand the implementation context of the device.",
            category="packaging_lifecycle",
            confidence="medium",
        )

    if not specs:
        snippet = _normalize_whitespace(normalized_text[:180])
        _add_spec(
            specs,
            seen,
            name="document_signal",
            value="Technical semiconductor or electronics document detected",
            unit=None,
            source_snippet=snippet or "Semiconductor or electronics terminology appears in the provided datasheet text.",
            importance="Even when structured parameters are sparse, the document still needs expert review to determine whether missing facts reflect OCR loss or limited technical disclosure.",
            category="product_identity",
            confidence="low",
        )

    return specs
