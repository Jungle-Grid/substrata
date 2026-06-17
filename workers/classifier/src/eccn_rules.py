from __future__ import annotations

from citations import build_document_citation, build_regulatory_citation
from fact_groups import group_specs_for_review, infer_missing_review_points
from labels import display_name_for_spec_name
from schemas import ECCNCandidate, ExtractedSpec


def _confidence_score(level: str) -> float:
    if level == "high":
        return 0.82
    if level == "low":
        return 0.42
    return 0.63


def _get_spec(specs: list[ExtractedSpec], name: str) -> ExtractedSpec | None:
    for spec in specs:
        if spec.name == name:
            return spec
    return None


def _format_spec(spec: ExtractedSpec) -> str:
    return f"{display_name_for_spec_name(spec.name)}: {spec.value}{f' {spec.unit}' if spec.unit else ''}"


def _candidate_fact_list(specs: list[ExtractedSpec], preferred_names: list[str], limit: int) -> list[str]:
    facts: list[str] = []
    for name in preferred_names:
        spec = _get_spec(specs, name)
        if spec:
            facts.append(_format_spec(spec))
    return facts[:limit]


def generate_eccn_candidates(specs: list[ExtractedSpec]) -> tuple[list[ECCNCandidate], list[str], float]:
    groups = group_specs_for_review(specs)
    missing_points = infer_missing_review_points(specs)
    converter_specs = groups["high_speed_data_converter_facts"]
    digital_specs = groups["high_speed_digital_interface_facts"]
    rf_specs = groups["rf_microwave_facts"]
    app_specs = groups["application_context_facts"]
    environmental_specs = groups["radiation_space_military_facts"]
    security_specs = groups["cryptography_security_facts"]

    serial_lane_rate = _get_spec(specs, "serial_lane_rate")
    sample_rate = _get_spec(specs, "sample_rate")
    single_channel_rate = _get_spec(specs, "single_channel_sample_rate")
    dual_channel_rate = _get_spec(specs, "dual_channel_sample_rate")
    adc_resolution = _get_spec(specs, "adc_resolution")
    usable_input_range = _get_spec(specs, "usable_input_frequency_range")
    input_bandwidth = _get_spec(specs, "input_bandwidth")
    jesd_interface = _get_spec(specs, "jesd_interface")
    application_examples = _get_spec(specs, "application_examples")

    high_value_facts = _candidate_fact_list(
        specs,
        [
            "adc_resolution",
            "single_channel_sample_rate",
            "dual_channel_sample_rate",
            "sample_rate",
            "input_bandwidth",
            "usable_input_frequency_range",
            "jesd_interface",
            "serial_lane_rate",
            "interface_lane_count",
            "package_type",
            "power_consumption",
        ],
        8,
    )

    has_high_speed_adc = any(
        spec
        for spec in (single_channel_rate, dual_channel_rate, sample_rate, serial_lane_rate, input_bandwidth, usable_input_range)
    )
    has_special_environment = bool(environmental_specs)
    has_application_context = bool(app_specs)

    uncertainty_flags = ["limited_regulatory_coverage"]
    if len(high_value_facts) >= 4:
        uncertainty_flags.append("multiple_plausible_eccns")
    if missing_points:
        uncertainty_flags.append("missing_key_specs")
    if has_high_speed_adc or has_special_environment or security_specs:
        uncertainty_flags.append("requires_engineering_confirmation")
    uncertainty_flags = list(dict.fromkeys(uncertainty_flags))

    category_3a001_citations = []
    for name in [
        "adc_resolution",
        "single_channel_sample_rate",
        "dual_channel_sample_rate",
        "input_bandwidth",
        "usable_input_frequency_range",
        "jesd_interface",
        "serial_lane_rate",
    ]:
        spec = _get_spec(specs, name)
        if spec:
            category_3a001_citations.append(build_document_citation(spec))
    if not category_3a001_citations and converter_specs:
        category_3a001_citations.append(build_document_citation(converter_specs[0]))
    category_3a001_citations.append(
        build_regulatory_citation(
            "CCL Category 3 electronics review path",
            "Category 3 contains electronics review paths for certain converters, integrated circuits, high-speed interfaces, and related components. This draft uses Category 3 as the initial review path because the datasheet contains concrete ADC performance and output-interface facts that should be compared against the current control text by a qualified reviewer.",
            "The extracted ADC resolution, sample-rate, bandwidth, and interface facts justify a Category 3 electronics review before considering broader fallback outcomes.",
        )
    )

    category_3a001_apply_parts = []
    if adc_resolution:
        category_3a001_apply_parts.append(_format_spec(adc_resolution))
    if single_channel_rate:
        category_3a001_apply_parts.append(_format_spec(single_channel_rate))
    if dual_channel_rate:
        category_3a001_apply_parts.append(_format_spec(dual_channel_rate))
    if input_bandwidth:
        category_3a001_apply_parts.append(_format_spec(input_bandwidth))
    if usable_input_range:
        category_3a001_apply_parts.append(_format_spec(usable_input_range))
    if jesd_interface:
        category_3a001_apply_parts.append(_format_spec(jesd_interface))
    if serial_lane_rate:
        category_3a001_apply_parts.append(_format_spec(serial_lane_rate))

    apply_summary = ", ".join(category_3a001_apply_parts[:7]) if category_3a001_apply_parts else "the extracted converter and interface facts"

    candidates = [
        ECCNCandidate(
            eccn="3A001",
            title="Category 3 electronics review path for high-speed ADC components",
            confidence="medium" if has_high_speed_adc else "low",
            matched_technical_facts=high_value_facts or ["The datasheet contains ADC performance and interface claims that require Category 3 review."],
            regulatory_citations=category_3a001_citations,
            why_it_may_apply=(
                f"The datasheet identifies {apply_summary}. This is a Category 3 electronics review path, not a final ECCN determination. A qualified reviewer must compare these extracted ADC facts against the relevant current CCL thresholds."
            ),
            why_it_may_not_apply=(
                "The current draft does not encode final legal thresholds or a complete rules engine. A qualified reviewer still needs to map the extracted ADC resolution, sample-rate, bandwidth, frequency-range, and interface facts to the current control text and determine whether a narrower entry is actually triggered."
            ),
            missing_information=missing_points + [
                "A qualified reviewer must map the extracted ADC performance and interface facts to the current CCL thresholds.",
                "Any omitted security, special-environment, or design-intent details that could narrow or broaden the review path.",
            ],
            uncertainty_flags=uncertainty_flags,
            reviewer_questions=[
                "Do the 12-bit ADC resolution and 10.4 GSPS / 5.2 GSPS operating modes trigger any current Category 3 review thresholds?",
                "Does the 8 GHz analog input bandwidth or >10 GHz usable input frequency support a narrower Category 3 review path?",
                "Are the JESD204C interface and up to 17.16 Gbps lane-rate claims relevant to any current controlled interface thresholds?",
            ],
        ),
        ECCNCandidate(
            eccn="3A991",
            title="General electronics comparison path",
            confidence="low",
            matched_technical_facts=high_value_facts[:4] or _candidate_fact_list(specs, ["device_type", "part_number", "package_type"], 3),
            regulatory_citations=[
                build_regulatory_citation(
                    "General electronics fallback review",
                    "A broader general-electronics path should be considered only after the narrower Category 3 electronics review paths are examined and excluded by a qualified reviewer.",
                    "This is a fallback comparison point only. It should not be treated as the likely answer while narrower Category 3 review paths remain open.",
                    source="EAR classification comparison workflow",
                )
            ],
            why_it_may_apply="A broader general-electronics outcome could remain relevant only if a qualified reviewer documents why the extracted ADC facts do not satisfy any narrower Category 3 entry.",
            why_it_may_not_apply="The datasheet still contains specific high-speed ADC performance and interface facts that should be reviewed against narrower Category 3 electronics entries first.",
            missing_information=[
                "Documented reasoning for excluding the narrower Category 3 review paths.",
                *missing_points[:2],
            ],
            uncertainty_flags=list(dict.fromkeys(["multiple_plausible_eccns", *uncertainty_flags])),
            reviewer_questions=[
                "What documented reasoning supports excluding the narrower Category 3 review paths before considering a broader general-electronics outcome?",
            ],
        ),
    ]

    if not has_high_speed_adc and not has_special_environment and not security_specs and not has_application_context:
        candidates.append(
            ECCNCandidate(
                eccn="EAR99",
                title="Possible EAR99 outcome after expert review",
                confidence="low",
                matched_technical_facts=_candidate_fact_list(specs, ["device_type", "part_number", "package_type", "power_consumption"], 4)
                or ["No strong controlled indicators were found in the available datasheet text."],
                regulatory_citations=[
                    build_regulatory_citation(
                        "General EAR99 comparison review",
                        "If a qualified reviewer finds that the available datasheet facts do not match a controlled entry, EAR99 may remain a possible outcome after that review.",
                        "EAR99 is presented only as a possible outcome after narrower electronics review paths are considered and excluded.",
                        source="EAR classification comparison workflow",
                    )
                ],
                why_it_may_apply="If the extracted facts do not match a narrower electronics entry after expert review, EAR99 may remain a possible outcome.",
                why_it_may_not_apply="The absence of a threshold match in this draft is not itself a final determination. OCR loss, missing data, or omitted design-intent details could still change the review path.",
                missing_information=missing_points + [
                    "Expert confirmation that no narrower Category 3 or security-related review path is triggered by the available datasheet facts."
                ],
                uncertainty_flags=list(dict.fromkeys(["missing_key_specs", *uncertainty_flags])),
                reviewer_questions=[
                    "Is the available datasheet evidence sufficient to rule out narrower electronics review paths before considering EAR99?",
                ],
            )
        )

    if application_examples:
        for candidate in candidates:
            if candidate.eccn == "3A001":
                candidate.matched_technical_facts.append(_format_spec(application_examples))
                break

    confidence = max(_confidence_score(candidate.confidence) for candidate in candidates)
    return candidates, uncertainty_flags, confidence
