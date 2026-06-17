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


def _normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _normalize_qualifier(raw: str | None) -> str | None:
    if not raw:
        return None
    normalized = _normalize_whitespace(raw.lower())
    return QUALIFIER_TOKENS.get(normalized, normalized)


def _format_qualified_value(value: str, qualifier: str | None) -> str:
    clean_value = _normalize_whitespace(value.strip(" ,.;:"))
    if re.fullmatch(r"\d+\.0", clean_value):
        clean_value = clean_value[:-2]

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


def extract_specs(text: str) -> list[ExtractedSpec]:
    specs: list[ExtractedSpec] = []
    seen: dict[tuple[str, str], int] = {}
    normalized_text = text.replace("\r", "")

    manufacturer_pattern = (
        r"\b(Texas Instruments|Analog Devices|ADI|Intel|AMD|Xilinx|NXP|"
        r"Microchip|Renesas|Infineon|onsemi|STMicroelectronics|Qorvo|Skyworks|"
        r"Broadcom|Lattice|Teledyne|Marvell|Semtech|Maxim Integrated|Analog Devices, Inc\.)\b"
    )
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
        r"\b([A-Z]{2,}\d{2,}[A-Z0-9-]{2,})\b",
    ]
    part_number_value: str | None = None
    for pattern in part_patterns:
        part_match = re.search(pattern, normalized_text)
        if part_match:
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

    device_patterns = [
        (r"\banalog[- ]to[- ]digital converter\b", "Analog-to-digital converter (ADC)"),
        (r"\bdigital[- ]to[- ]analog converter\b", "Digital-to-analog converter (DAC)"),
        (r"\bRF-sampling\b", "RF-sampling ADC"),
        (r"\bADC\b", "ADC"),
        (r"\bDAC\b", "DAC"),
        (r"\baccelerator\b", "Accelerator"),
    ]
    for pattern, label in device_patterns:
        match = re.search(pattern, normalized_text, flags=re.IGNORECASE)
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

    description_line = _find_line(
        normalized_text,
        r"(?im)^(?:.*(?:converter|adc|dac|rf-sampling|transceiver|processor|accelerator).*)$",
    )
    if description_line:
        lowered_description = description_line.lower()
        if "analog-to-digital converter" in lowered_description or "rf-sampling" in lowered_description:
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
    if resolution_match:
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
    if title_mode_match or single_line_match or dual_line_match:
        _add_spec(
            specs,
            seen,
            name="channel_modes",
            value="single-channel and dual-channel",
            unit=None,
            source_snippet=_extract_snippet(
                normalized_text,
                (title_mode_match or single_line_match or dual_line_match).start(),
                (title_mode_match or single_line_match or dual_line_match).end(),
            ),
            importance="Channel modes matter because some converter review questions depend on whether the device operates as a single-channel or dual-channel part.",
            category="converter_performance",
            confidence="high",
        )
        if single_line_match:
            single_value = _format_qualified_value(single_line_match.group("value"), "up to")
            single_unit = f"{single_line_match.group('unit').upper()}SPS"
            single_snippet = _extract_snippet(normalized_text, single_line_match.start(), single_line_match.end())
        else:
            single_value = _format_qualified_value(title_mode_match.group("single"), None)
            single_unit = f"{title_mode_match.group('single_unit').upper()}SPS"
            single_snippet = _extract_snippet(normalized_text, title_mode_match.start(), title_mode_match.end())
        _add_spec(
            specs,
            seen,
            name="single_channel_sample_rate",
            value=single_value,
            unit=single_unit,
            source_snippet=single_snippet,
            importance="The single-channel sample rate is one of the key converter performance facts that a reviewer should map to the current Category 3 electronics thresholds.",
            category="converter_performance",
            confidence="high",
        )
        if dual_line_match:
            dual_value = _format_qualified_value(dual_line_match.group("value"), "up to")
            dual_unit = f"{dual_line_match.group('unit').upper()}SPS"
            dual_snippet = _extract_snippet(normalized_text, dual_line_match.start(), dual_line_match.end())
        else:
            dual_value = _format_qualified_value(title_mode_match.group("dual"), None)
            dual_unit = f"{title_mode_match.group('dual_unit').upper()}SPS"
            dual_snippet = _extract_snippet(normalized_text, title_mode_match.start(), title_mode_match.end())
        _add_spec(
            specs,
            seen,
            name="dual_channel_sample_rate",
            value=dual_value,
            unit=dual_unit,
            source_snippet=dual_snippet,
            importance="The dual-channel sample rate helps experts assess the alternate operating mode of the reviewed ADC.",
            category="converter_performance",
            confidence="high",
        )
    else:
        sample_match = re.search(
            r"(?P<qualifier>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>G|M|K)SPS\b",
            normalized_text,
            flags=re.IGNORECASE,
        )
        if sample_match:
            _add_spec(
                specs,
                seen,
                name="sample_rate",
                value=_format_qualified_value(sample_match.group("value"), sample_match.group("qualifier")),
                unit=f"{sample_match.group('unit').upper()}SPS",
                source_snippet=_extract_snippet(normalized_text, sample_match.start(), sample_match.end()),
                importance="Sample-rate claims are core converter performance facts for the initial electronics review path.",
                category="converter_performance",
                confidence="high",
            )

    channel_line_match = re.search(r"\b(single[- ]channel|dual[- ]channel)\b", normalized_text, flags=re.IGNORECASE)
    if channel_line_match and not any(spec.name == "channel_modes" for spec in specs):
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
        if match:
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
        r"(?:maximum lane rate:\s*(?P<qualifier1>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value1>\d+(?:\.\d+)?)\s*Gbps)|(?:supporting\s+(?P<qualifier2>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value2>\d+(?:\.\d+)?)\s*Gbps\s*line rate)",
        normalized_text,
        flags=re.IGNORECASE,
    )
    if lane_rate_match:
        qualifier = lane_rate_match.groupdict().get("qualifier1") or lane_rate_match.groupdict().get("qualifier2")
        value = lane_rate_match.groupdict().get("value1") or lane_rate_match.groupdict().get("value2")
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

    lane_match = re.search(r"\b(?P<count>\d+)\s*lanes?\b", normalized_text, flags=re.IGNORECASE)
    if lane_match:
        _add_spec(
            specs,
            seen,
            name="interface_lane_count",
            value=_clean_value(lane_match.group("count")),
            unit="lanes",
            source_snippet=_extract_snippet(normalized_text, lane_match.start(), lane_match.end()),
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
    for term in ("electronic warfare", "sigint", "elint", "radar", "satellite communications", "test and measurement", "oscilloscope", "space", "aerospace", "defense", "military"):
        if term in normalized_text.lower():
            application_terms.append(term)
    if application_terms:
        primary_application_line = _find_line(
            normalized_text,
            r"(?im)^(?:.*can be used in a wide range of applications including.*)$",
        ) or _find_line(
            normalized_text,
            r"(?im)^(?:.*(?:electronic warfare|sigint|elint|radar|satellite communications|test and measurement|oscilloscope).*)$",
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
        ("seu_or_sel", r"\b(SEU|SEL)\b", "Single-event upset or latch-up language is relevant because it points toward specialized reliability and radiation-review questions."),
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
        ("security_feature", r"\b(secure boot|trusted execution|trusted platform|hardware root of trust|key storage)\b", "Explicit security-function language matters because embedded security capability can require a different review path than a pure analog or digital component."),
        ("cryptographic_algorithm", r"\b(AES(?:-\d+)?|RSA|ECC|SHA-\d+)\b", "Named cryptographic algorithms matter because they can indicate security functionality that is not otherwise obvious from the high-level product description."),
    ]
    for name, pattern, importance in security_patterns:
        for match in re.finditer(pattern, normalized_text, flags=re.IGNORECASE):
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
        r"(?:power consumption|total power|power dissipation)[^.\n]{0,40}?(?P<qualifier>up to|greater than|less than|>|<|typical|maximum|minimum)?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>mW|W)",
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
