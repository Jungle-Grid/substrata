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


def _get_specs(specs: list[ExtractedSpec], names: list[str]) -> list[ExtractedSpec]:
    return [spec for spec in specs if spec.name in names]


def _has_profile(specs: list[ExtractedSpec], profile: str) -> bool:
    return any(spec.name == "product_profile" and spec.value == profile for spec in specs)


def _is_converter_primary_review(specs: list[ExtractedSpec]) -> bool:
    device_type = (_get_spec(specs, "device_type").value.lower() if _get_spec(specs, "device_type") else "")
    has_converter_identity = any(marker in device_type for marker in ("adc", "dac", "converter"))
    has_converter_core_facts = any(
        _get_spec(specs, name)
        for name in (
            "adc_resolution",
            "sample_rate",
            "single_channel_sample_rate",
            "dual_channel_sample_rate",
            "input_bandwidth",
            "usable_input_frequency_range",
            "jesd_interface",
            "serial_lane_rate",
        )
    )
    return has_converter_identity and has_converter_core_facts


def _format_spec(spec: ExtractedSpec) -> str:
    return f"{display_name_for_spec_name(spec.name)}: {spec.value}{f' {spec.unit}' if spec.unit else ''}"


def _candidate_fact_list(specs: list[ExtractedSpec], preferred_names: list[str], limit: int) -> list[str]:
    facts: list[str] = []
    for name in preferred_names:
        spec = _get_spec(specs, name)
        if spec:
            facts.append(_format_spec(spec))
    return facts[:limit]


SOC_FACT_NAMES = [
    "product_family",
    "processor_architecture",
    "cpu_core",
    "clock_speed",
    "cpu_clock_speed",
    "realtime_cpu",
    "cpu_core_count",
    "cache_tcm",
    "on_chip_ram",
    "memory_cache",
    "memory_integrity",
    "memory_controller_interface",
    "external_memory_interface",
    "external_memory_interfaces",
    "programmable_logic",
    "processing_system",
    "ps_pl_integration",
    "ethernet_mac",
    "pcie_interface",
    "displayport_lane_rate",
    "gpu",
    "usb_interface",
    "can_interface",
    "spi_interface",
    "i2c_interface",
    "uart_interface",
    "jtag_interface",
    "displayport_interface",
    "digital_interface",
    "display_camera_interface",
    "camera_interface",
    "display_interface",
    "audio_interface",
    "secure_boot",
    "cryptographic_algorithm",
    "crypto_key_size",
    "peripheral_adc",
    "peripheral_dac",
    "package_type",
]

SECURITY_FACT_NAMES = [
    "secure_boot",
    "cryptographic_algorithm",
    "crypto_key_size",
    "security_feature",
    "key_storage",
    "secure_element",
    "tamper_resistance",
    "certificate_signature",
    "caam",
    "pkha",
    "symmetric_engine",
    "cryptographic_hash_engine",
    "rng4",
    "secure_key_management",
    "inline_encryption_engine",
    "otfad",
    "snvs",
    "zero_master_key",
    "puf",
    "encrypted_boot",
]

RF_FACT_NAMES = [
    "rf_frequency_range",
    "frequency_range",
    "rx_channels",
    "tx_channels",
    "rf_bandwidth",
    "bandwidth",
    "lo_pll_synthesizer",
    "baseband_interface",
    "sdr_application",
    "radar_application",
    "communications_application",
    "adc_subcomponent",
    "dac_subcomponent",
]

GENERIC_ELECTRONICS_FACT_NAMES = [
    "product_family",
    "product_profile",
    "device_type",
    "digital_interface",
    "jesd_interface",
    "pcie_interface",
    "ethernet_mac",
    "usb_interface",
    "clock_speed",
    "package_type",
    "power_consumption",
]


def _candidate_specs_by_names(specs: list[ExtractedSpec], names: list[str], limit: int) -> list[ExtractedSpec]:
    selected: list[ExtractedSpec] = []
    for name in names:
        for spec in specs:
            if spec.name == name and spec not in selected:
                selected.append(spec)
                if len(selected) >= limit:
                    return selected
    return selected[:limit]


def _append_specs_by_category(
    selected: list[ExtractedSpec],
    specs: list[ExtractedSpec],
    categories: set[str],
    limit: int,
) -> list[ExtractedSpec]:
    for spec in specs:
        if spec.category not in categories or spec in selected:
            continue
        selected.append(spec)
        if len(selected) >= limit:
            return selected
    return selected[:limit]


def _candidate_specific_reviewer_questions(
    extracted_facts: list[ExtractedSpec],
    candidate: ECCNCandidate,
) -> list[str]:
    is_fpga_soc_profile = _has_profile(extracted_facts, "fpga_programmable_logic_soc")
    is_mcu_profile = _has_profile(extracted_facts, "mcu_processor_soc")
    if is_mcu_profile:
        product_family = _get_spec(extracted_facts, "product_family")
        family_label = product_family.value if product_family else "this MCU/processor family"
        has_security = any(spec.name in SECURITY_FACT_NAMES or spec.category == "security_cryptography" for spec in extracted_facts)
        if candidate.review_path_id == "category_3_mcu_processor_soc":
            return [
                f"Is this {family_label} datasheet a family-level document requiring ordering-code-specific review before review signoff?",
                "Do the Arm Cortex-M7 and Cortex-M4 processing features, clock rates, memory/cache resources, or external memory interfaces require Category 3 electronics review?",
                "Do Ethernet, USB, display/camera, CAN, SPI, I2C, or other interfaces affect the electronics review path?",
            ]
        if candidate.review_path_id in {"category_5_part_2_security", "category_5_part_2_crypto_security_device"}:
            return [
                "Do HAB/encrypted boot and CAAM require separate Category 5 Part 2 analysis?",
                "Are the cryptographic functions user-accessible, configurable, or limited to boot/storage/authentication?",
                "Does OTFAD AES-128 counter-mode decryption affect the security/cryptography review path?",
                "Are implementation details contained in a separate security reference manual?",
                "Is mass-market/license-exception treatment relevant?",
            ]
        questions = [
            "What documented reasoning supports excluding Category 3 electronics / MCU / processor / SoC and Category 5 Part 2 security review paths before considering a broader general-electronics comparison?"
        ]
        if has_security:
            questions.append("Is additional security documentation required to evaluate mass-market/license-exception treatment?")
        questions.append("Does separate product documentation indicate radiation tolerance, space qualification, military design intent, or special-environment qualification?")
        return questions[:6]

    if is_fpga_soc_profile and candidate.review_path_id == "category_3_programmable_logic_soc":
        document_number = _get_spec(extracted_facts, "document_number")
        doc_label = document_number.value if document_number else "this"
        return [
            f"Is this {doc_label} document a family overview requiring device-specific ordering-code review before review signoff?",
            "Do the programmable-logic and processing-system features require review under Category 3 electronics entries?",
            "Are PCIe, DisplayPort, Ethernet, or other high-speed I/O features relevant to narrower control entries?",
        ]
    if is_fpga_soc_profile and candidate.review_path_id in {"category_5_part_2_security", "category_5_part_2_crypto_security_device"}:
        return [
            "Do secure boot, AES-GCM, SHA-3/384, or RSA 4096 require separate Category 5 Part 2 analysis?",
            "Is the cryptographic functionality user-accessible, configurable, or limited to boot/authentication functions?",
            "Are implementation details in a separate security manual not captured by this overview?",
        ]
    if is_fpga_soc_profile and candidate.review_path_id == "general_electronics_comparison":
        return [
            "What documented reasoning supports excluding narrower Category 3 and Category 5 review paths before considering a broader general-electronics comparison?"
        ]
    return generate_reviewer_questions(extracted_facts, candidate.eccn, [])


def _spec_value(spec: ExtractedSpec | None) -> str | None:
    if not spec:
        return None
    return f"{spec.value}{f' {spec.unit}' if spec.unit else ''}"


def _bit_phrase(spec: ExtractedSpec | None) -> str | None:
    if not spec:
        return None
    return f"{spec.value}-bit"


def _join_phrases(parts: list[str]) -> str:
    if not parts:
        return ""
    if len(parts) == 1:
        return parts[0]
    if len(parts) == 2:
        return f"{parts[0]} and {parts[1]}"
    return f"{', '.join(parts[:-1])}, and {parts[-1]}"


def _question_phrase(*parts: str | None) -> str:
    return _join_phrases([part for part in parts if part])


def generate_reviewer_questions(
    extracted_facts: list[ExtractedSpec],
    candidate_eccn: str,
    matched_specs: list[ExtractedSpec],
) -> list[str]:
    questions: list[str] = []
    matched_names = {spec.name for spec in matched_specs}
    is_fpga_soc_profile = _has_profile(extracted_facts, "fpga_programmable_logic_soc")
    is_mcu_profile = _has_profile(extracted_facts, "mcu_processor_soc")
    is_soc_profile = is_fpga_soc_profile or is_mcu_profile
    is_rf_profile = _has_profile(extracted_facts, "rf_transceiver")
    is_crypto_profile = _has_profile(extracted_facts, "crypto_security_device")

    if is_rf_profile:
        questions.append("Do the RF frequency range, bandwidth, and channel-mode facts require review against current Category 3 electronics thresholds?")
        questions.append("Are ADC/DAC facts in this document subcomponents of the RF transceiver rather than the primary product identity?")
        questions.append("Do SDR, radar, or communications application statements indicate specialized review considerations without becoming final end-use determinations?")
        questions.append("Are there separate security, encryption, or authentication functions that require Category 5 Part 2 analysis?")
        return questions[:6]

    if is_crypto_profile:
        questions.append("Is the security or cryptography functionality user-accessible, configurable, or limited to authentication, boot, or key-management support?")
        questions.append("Do AES, RSA, SHA, elliptic-curve, certificate, signature, or key-storage facts require Category 5 Part 2 analysis?")
        questions.append("Are mass-market, availability, exception, or exemption facts documented outside this datasheet?")
        questions.append("Do any hardware performance facts require a separate Category 3 electronics comparison path?")
        return questions[:6]

    if is_mcu_profile:
        product_family = _get_spec(extracted_facts, "product_family")
        family_label = product_family.value if product_family else "this MCU/processor family"
        has_crypto = any(spec.name in SECURITY_FACT_NAMES or spec.category == "security_cryptography" for spec in extracted_facts)
        questions.append(
            f"Is this {family_label} datasheet a family-level document requiring ordering-code-specific review before review signoff?"
        )
        questions.append(
            "Do the Arm Cortex-M7 and Cortex-M4 processing features, clock rates, memory/cache resources, or external memory interfaces require Category 3 electronics review?"
        )
        if has_crypto:
            questions.append(
                "Do HAB/encrypted boot, CAAM, PKHA, symmetric engines, cryptographic hash engine, RNG4, secure key management, OTFAD, SNVS/ZMK, or PUF require separate Category 5 Part 2 review?"
            )
            questions.append(
                "Are the cryptographic functions user-accessible, configurable, or limited to boot/storage/authentication flows?"
            )
            questions.append(
                "Is additional security documentation required to evaluate mass-market/license-exception treatment?"
            )
        questions.append(
            "Do Ethernet, USB, display/camera, CAN, SPI, I2C, or other interfaces affect the electronics review path?"
        )
        questions.append(
            "Does separate product documentation indicate radiation tolerance, space qualification, military design intent, or special-environment qualification?"
        )
        return questions[:7]

    if is_fpga_soc_profile:
        product_family = _get_spec(extracted_facts, "product_family")
        document_number = _get_spec(extracted_facts, "document_number")
        has_crypto = any(spec.name in SECURITY_FACT_NAMES for spec in extracted_facts)
        has_high_speed_io = any(
            spec.name in {"pcie_interface", "displayport_interface", "displayport_lane_rate", "ethernet_mac"}
            for spec in extracted_facts
        )
        family_label = product_family.value if product_family else "the programmable-logic SoC"
        doc_label = document_number.value if document_number else "this document"
        questions.append(
            f"Is this {doc_label} document a family overview requiring device-specific ordering-code review before review signoff?"
        )
        questions.append(
            f"Do the {family_label} programmable-logic and processing-system features require review under Category 3 electronics entries?"
        )
        if _get_spec(extracted_facts, "cpu_core") or _get_spec(extracted_facts, "realtime_cpu"):
            questions.append(
                "Do the Arm Cortex-A53 / Cortex-R5F processing-system facts affect the applicable electronics review path?"
            )
        if has_high_speed_io:
            questions.append(
                "Are PCIe, DisplayPort, Ethernet, or other high-speed I/O features relevant to narrower control entries?"
            )
        if has_crypto:
            questions.append(
                "Do secure boot, AES-GCM, SHA-3/384, or RSA 4096 require separate Category 5 Part 2 analysis?"
            )
            questions.append(
                "Is the cryptographic functionality user-accessible, configurable, or limited to boot/authentication functions?"
            )
        questions.append(
            "Does separate product documentation indicate radiation tolerance, space qualification, military design intent, or special-environment qualification?"
        )
        return questions[:7]

    adc_resolution = _get_spec(extracted_facts, "adc_resolution")
    sample_rate = _get_spec(extracted_facts, "sample_rate")
    single_channel_rate = _get_spec(extracted_facts, "single_channel_sample_rate")
    dual_channel_rate = _get_spec(extracted_facts, "dual_channel_sample_rate")
    channel_modes = _get_spec(extracted_facts, "channel_modes")
    input_bandwidth = _get_spec(extracted_facts, "input_bandwidth")
    usable_input_range = _get_spec(extracted_facts, "usable_input_frequency_range")
    jesd_interface = _get_spec(extracted_facts, "jesd_interface")
    serial_lane_rate = _get_spec(extracted_facts, "serial_lane_rate")
    lane_count = _get_spec(extracted_facts, "interface_lane_count")
    application_examples = _get_spec(extracted_facts, "application_examples")

    if adc_resolution and (sample_rate or single_channel_rate or dual_channel_rate):
        if sample_rate:
            performance = f"{_bit_phrase(adc_resolution)} ADC resolution and {_spec_value(sample_rate)} sampling performance"
        else:
            modes: list[str] = []
            if single_channel_rate:
                modes.append(f"{_spec_value(single_channel_rate)} single-channel performance")
            if dual_channel_rate:
                modes.append(f"{_spec_value(dual_channel_rate)} dual-channel performance")
            performance = f"{_bit_phrase(adc_resolution)} ADC resolution and {_join_phrases(modes)}"
        questions.append(
            f"Do the {performance} trigger any current Category 3 electronics control thresholds?"
        )

    if channel_modes and channel_modes.name in matched_names:
        questions.append(
            f"Does the {channel_modes.value} configuration affect how the sample-rate claims should be evaluated?"
        )

    analog_performance = _question_phrase(
        f"{_spec_value(input_bandwidth)} analog input bandwidth" if input_bandwidth else None,
        f"{_spec_value(usable_input_range)} usable input frequency range" if usable_input_range else None,
    )
    if analog_performance:
        questions.append(
            f"Does the {analog_performance} support a narrower Category 3 review path?"
        )

    interface_performance = _question_phrase(
        f"{_spec_value(jesd_interface)} interface" if jesd_interface else None,
        f"{lane_count.value} lanes per channel" if lane_count and lane_count.unit == "lanes per channel" else (f"{_spec_value(lane_count)} lane architecture" if lane_count else None),
        f"{_spec_value(serial_lane_rate)} lane-rate claim" if serial_lane_rate else None,
    )
    if interface_performance:
        questions.append(
            f"Are the {interface_performance} relevant to any current controlled interface or converter-output thresholds?"
        )

    if application_examples:
        application_terms = [part.strip() for part in application_examples.value.split("/") if part.strip()]
        if application_terms:
            questions.append(
                f"Do the datasheet’s application examples, including {_join_phrases(application_terms[:4])}, suggest any specialized review considerations, while recognizing they are not final end-use determinations?"
            )

    has_environmental = any(
        spec.category == "environmental_qualification"
        for spec in extracted_facts
    )
    if not has_environmental:
        questions.append(
            "Does any separate product documentation indicate radiation tolerance, space qualification, military design intent, or special-environment qualification not visible in this datasheet?"
        )

    has_security = any(spec.category == "security_cryptography" for spec in extracted_facts)
    if not has_security:
        questions.append(
            "Does the product include any cryptographic, secure-boot, key-storage, or security functionality not visible in this datasheet?"
        )

    if candidate_eccn == "3A991":
        questions = [
            "What documented reasoning supports excluding the narrower Category 3 review paths before considering a broader general-electronics outcome?"
        ]

    if candidate_eccn == "EAR99":
        questions = [
            "Is the available datasheet evidence sufficient to rule out narrower electronics review paths before considering EAR99?"
        ]

    deduped: list[str] = []
    for question in questions:
        if question not in deduped:
            deduped.append(question)
    return deduped[:6]


def generate_eccn_candidates(
    specs: list[ExtractedSpec],
    *,
    source_label: str,
) -> tuple[list[ECCNCandidate], list[str], float]:
    groups = group_specs_for_review(specs)
    missing_points = infer_missing_review_points(specs)
    converter_specs = groups["high_speed_data_converter_facts"]
    digital_specs = groups["high_speed_digital_interface_facts"]
    rf_specs = groups["rf_microwave_facts"]
    app_specs = groups["application_context_facts"]
    environmental_specs = groups["radiation_space_military_facts"]
    security_specs = groups["cryptography_security_facts"]

    is_converter_primary_review = _is_converter_primary_review(specs)
    category_3a001_specs = []
    for name in [
        "adc_resolution",
        "sample_rate",
        "single_channel_sample_rate",
        "dual_channel_sample_rate",
        "channel_modes",
        "input_bandwidth",
        "usable_input_frequency_range",
        "jesd_interface",
        "interface_lane_count",
        "serial_lane_rate",
        "application_examples",
        "package_type",
        "power_consumption",
        ]:
        spec = _get_spec(specs, name)
        if spec and is_converter_primary_review:
            category_3a001_specs.append(spec)

    high_value_facts = [_format_spec(spec) for spec in category_3a001_specs[:10]]

    has_high_speed_adc = is_converter_primary_review and bool(category_3a001_specs)
    has_special_environment = bool(environmental_specs)
    has_application_context = bool(app_specs)
    is_fpga_soc_profile = _has_profile(specs, "fpga_programmable_logic_soc")
    is_mcu_profile = _has_profile(specs, "mcu_processor_soc")
    is_soc_profile = is_fpga_soc_profile or is_mcu_profile
    is_rf_profile = _has_profile(specs, "rf_transceiver")
    is_crypto_profile = _has_profile(specs, "crypto_security_device")
    is_generic_profile = _has_profile(specs, "generic_electronics")
    soc_candidate_specs = _candidate_specs_by_names(specs, SOC_FACT_NAMES, 12)
    soc_candidate_specs = _append_specs_by_category(
        soc_candidate_specs,
        specs,
        {"processing_system_cpu", "compute_processor", "memory_cache_integrity", "digital_interface"},
        12,
    )
    rf_candidate_specs = _candidate_specs_by_names(specs, RF_FACT_NAMES, 10)
    generic_electronics_specs = _candidate_specs_by_names(specs, GENERIC_ELECTRONICS_FACT_NAMES, 3)
    security_candidate_specs = _candidate_specs_by_names(specs, SECURITY_FACT_NAMES, 12)
    for spec in specs:
        if spec in security_candidate_specs:
            continue
        if spec.category in {"security_cryptography", "security", "cryptography"} or any(
            term in f"{spec.name} {spec.value}".lower()
            for term in ("secure boot", "hab", "encrypted boot", "caam", "pkha", "symmetric", "cryptographic hash", "rng4", "key management", "otfad", "snvs", "zmk", "puf", "aes", "rsa", "sha", "key storage", "certificate", "signature", "hsm", "tpm")
        ):
            security_candidate_specs.append(spec)
            if len(security_candidate_specs) >= 12:
                break

    uncertainty_flags = ["limited_regulatory_coverage"]
    if len(high_value_facts) >= 4:
        uncertainty_flags.append("multiple_plausible_eccns")
    if missing_points:
        uncertainty_flags.append("missing_key_specs")
    if has_high_speed_adc or has_special_environment or security_specs:
        uncertainty_flags.append("requires_engineering_confirmation")
    uncertainty_flags = list(dict.fromkeys(uncertainty_flags))

    category_3a001_citations = [
        build_document_citation(spec, source=source_label)
        for spec in category_3a001_specs
        if spec.name
        in {
            "adc_resolution",
            "sample_rate",
            "single_channel_sample_rate",
            "dual_channel_sample_rate",
            "channel_modes",
            "input_bandwidth",
            "usable_input_frequency_range",
            "jesd_interface",
            "serial_lane_rate",
            "application_examples",
        }
    ]
    if not category_3a001_citations and converter_specs and is_converter_primary_review:
        category_3a001_citations.append(build_document_citation(converter_specs[0], source=source_label))
    if is_converter_primary_review:
        category_3a001_citations.append(
        build_regulatory_citation(
            "CCL Category 3 electronics review path",
            "Category 3 contains electronics review paths for certain converters, integrated circuits, high-speed interfaces, and related components. This draft uses Category 3 as the initial review path because the datasheet contains concrete converter and interface facts that should be compared against the current control text by a qualified reviewer.",
            "The extracted converter resolution, sample-rate, bandwidth, and interface facts justify a Category 3 electronics review before considering broader fallback outcomes.",
        )
        )

    apply_specs = [
        _get_spec(specs, "channel_modes"),
        _get_spec(specs, "adc_resolution"),
        _get_spec(specs, "sample_rate"),
        _get_spec(specs, "single_channel_sample_rate"),
        _get_spec(specs, "dual_channel_sample_rate"),
        _get_spec(specs, "input_bandwidth"),
        _get_spec(specs, "usable_input_frequency_range"),
        _get_spec(specs, "jesd_interface"),
        _get_spec(specs, "interface_lane_count"),
        _get_spec(specs, "serial_lane_rate"),
        _get_spec(specs, "application_examples"),
    ]
    apply_summary = ", ".join(_format_spec(spec) for spec in apply_specs if spec and is_converter_primary_review)
    if not apply_summary:
        apply_summary = "the extracted converter and interface facts"

    general_facts = _candidate_fact_list(
        specs,
        [
            "product_family",
            "adc_resolution",
            "sample_rate",
            "single_channel_sample_rate",
            "dual_channel_sample_rate",
            "input_bandwidth",
            "jesd_interface",
            "processor_architecture",
            "cpu_core",
            "programmable_logic",
            "pcie_interface",
            "displayport_lane_rate",
        ],
        4,
    ) or _candidate_fact_list(specs, ["device_type", "part_number", "package_type"], 3)

    general_apply_text = (
        "A broader general-electronics outcome could remain relevant only if a qualified reviewer documents why the extracted converter and interface facts do not satisfy any narrower Category 3 entry."
        if is_converter_primary_review
        else "A broader general-electronics comparison path remains relevant only as fallback after the Category 3 electronics / MCU / processor / SoC and Category 5 Part 2 security review paths are evaluated."
        if is_mcu_profile
        else "A broader general-electronics comparison path remains relevant only as fallback after the programmable-logic/SoC and security review paths are evaluated."
        if is_fpga_soc_profile
        else "A broader general-electronics review path remains relevant because the current extracted facts identify a semiconductor or compute device but do not by themselves establish a narrower converter-specific control path."
    )
    general_not_apply_text = (
        "The datasheet still contains specific high-speed converter performance and interface facts that should be reviewed against narrower Category 3 electronics entries first."
        if is_converter_primary_review
        else "The document contains specific processor, memory/cache, interface, and security facts that should be reviewed under narrower paths before relying on a general fallback comparison."
        if is_mcu_profile
        else "The document contains specific programmable-logic, processing-system, high-speed I/O, and cryptography facts that should be reviewed under narrower paths before relying on a general fallback comparison."
        if is_fpga_soc_profile
        else "A broader general-electronics comparison may still be too broad if a qualified reviewer finds that the device’s security, processing, interface, or design-intent facts map to a narrower current control entry."
    )
    general_missing_information = (
        [
            "Documented reasoning for excluding the narrower Category 3 review paths.",
            *missing_points[:2],
        ]
        if is_converter_primary_review
        else [
            "Documented reasoning for excluding Category 3 electronics / MCU / processor / SoC and Category 5 Part 2 security review paths.",
            *missing_points[:2],
        ]
        if is_mcu_profile
        else [
            "Documented reasoning for excluding Category 3 programmable-logic/SoC and Category 5 Part 2 security review paths.",
            *missing_points[:2],
        ]
        if is_fpga_soc_profile
        else [
            "Documented reasoning for any narrower control entry that could apply to the device’s security, processing, interface, or design-intent facts.",
            *missing_points[:2],
        ]
    )
    general_uncertainty_flags = list(
        dict.fromkeys((["multiple_plausible_eccns"] if is_converter_primary_review else []) + uncertainty_flags)
    )

    candidates: list[ECCNCandidate] = []
    if is_soc_profile and soc_candidate_specs:
        category_3_title = (
            "Category 3 electronics / MCU / processor / SoC review path"
            if is_mcu_profile
            else "Category 3 electronics / programmable logic / SoC review path"
        )
        category_3_review_path_id = "category_3_mcu_processor_soc" if is_mcu_profile else "category_3_programmable_logic_soc"
        category_3_citation_text = (
            "Category 3 electronics review should be considered for an MCU/processor/SoC family with processor cores, memory/cache resources, external memory interfaces, connectivity interfaces, and security-adjacent architecture facts. This draft does not encode final threshold logic."
            if is_mcu_profile
            else "Category 3 electronics review should be considered for a programmable-logic/SoC family with processing-system, programmable logic, high-speed interface, and security-adjacent architecture facts. This draft does not encode final threshold logic."
        )
        category_3_apply_text = (
            "The document identifies an NXP i.MX RT1170 crossover processor family with Arm Cortex-M7 and Cortex-M4 cores, clock rates up to 800 MHz and 400 MHz, on-chip RAM/TCM/cache resources, external memory interfaces, and multiple connectivity/display/camera interfaces. These facts support an electronics/processor review path before relying on broader fallback classification."
            if is_mcu_profile
            else "The document identifies a programmable-logic/SoC family with processing system, programmable logic, high-speed interfaces, and security features. These facts support Category 3 electronics review before fallback classification."
        )
        category_3_missing = (
            [
                "Device-specific ordering code, speed grade, package, and complete variant-specific processor/security/interface details.",
                "Current CCL threshold mapping by a qualified reviewer.",
                *missing_points[:2],
            ]
            if is_mcu_profile
            else [
                "Device-specific ordering code, speed grade, package, and complete variant-specific programmable-logic resources.",
                "Current CCL threshold mapping by a qualified reviewer.",
                *missing_points[:2],
            ]
        )
        candidates.append(
            ECCNCandidate(
                eccn="Category 3",
                title=category_3_title,
                confidence="medium" if len(soc_candidate_specs) >= 6 else "low",
                matched_technical_facts=[_format_spec(spec) for spec in soc_candidate_specs],
                regulatory_citations=[
                    *[
                        build_document_citation(spec, source=source_label)
                        for spec in soc_candidate_specs
                        if spec.name
                        in {
                            "product_family",
                            "processor_architecture",
                            "cpu_core",
                            "clock_speed",
                            "cache_tcm",
                            "memory_integrity",
                            "memory_controller_interface",
                            "programmable_logic",
                            "pcie_interface",
                            "ethernet_mac",
                            "displayport_lane_rate",
                            "usb_interface",
                            "secure_boot",
                        }
                    ],
                    build_regulatory_citation(
                        "CCL Category 3 electronics / SoC review path",
                        category_3_citation_text,
                        "These facts support Category 3 electronics review before fallback classification.",
                    ),
                ],
                why_it_may_apply=category_3_apply_text,
                why_it_may_not_apply=(
                    "The current draft does not encode full CCL thresholds. This is a family overview, so device-specific ordering code and complete specs may be required before review signoff."
                ),
                missing_information=category_3_missing,
                uncertainty_flags=list(dict.fromkeys(["multiple_plausible_eccns", "requires_engineering_confirmation", *uncertainty_flags])),
                reviewer_questions=[],
                review_path_id=category_3_review_path_id,
            )
        )

    if is_rf_profile and rf_candidate_specs:
        candidates.append(
            ECCNCandidate(
                eccn="Category 3",
                title="Category 3 electronics / RF transceiver review path",
                confidence="medium" if len(rf_candidate_specs) >= 4 else "low",
                matched_technical_facts=[_format_spec(spec) for spec in rf_candidate_specs],
                regulatory_citations=[
                    *[build_document_citation(spec, source=source_label) for spec in rf_candidate_specs[:5]],
                    build_regulatory_citation(
                        "CCL Category 3 electronics / RF transceiver review path",
                        "Category 3 electronics review should be considered for RF transceiver, RF frequency, bandwidth, baseband interface, and converter-subcomponent facts. This draft does not encode final threshold logic.",
                        "The extracted RF transceiver facts support Category 3 electronics review before fallback classification.",
                    ),
                ],
                why_it_may_apply="The document identifies RF transceiver behavior with source-grounded RF frequency, channel, bandwidth, or interface facts that require electronics review.",
                why_it_may_not_apply="The current draft does not implement the full CCL threshold analysis, and application language alone is not a final end-use or ECCN determination.",
                missing_information=[
                    "Complete RF operating ranges and bandwidth conditions by mode.",
                    "Reviewer mapping to current Category 3 thresholds.",
                    *missing_points[:2],
                ],
                uncertainty_flags=list(dict.fromkeys(["requires_engineering_confirmation", *uncertainty_flags])),
                reviewer_questions=[],
                review_path_id="category_3_rf_transceiver",
            )
        )

    if is_crypto_profile and security_candidate_specs:
        candidates.append(
            ECCNCandidate(
                eccn="Category 5 Part 2",
                title="Category 5 Part 2 security/cryptography review path",
                confidence="medium",
                matched_technical_facts=[_format_spec(spec) for spec in security_candidate_specs],
                regulatory_citations=[
                    *[build_document_citation(spec, source=source_label) for spec in security_candidate_specs[:5]],
                    build_regulatory_citation(
                        "Category 5 Part 2 security/cryptography review path",
                        "Security devices and named cryptographic capabilities require separate Category 5 Part 2 analysis by a qualified reviewer.",
                        "This path captures source-grounded security facts without determining control status, exceptions, or availability.",
                        source="15 CFR Part 774, Supplement No. 1, Category 5 Part 2",
                    ),
                ],
                why_it_may_apply="The document identifies a security or cryptography-focused device with source-grounded security, key, authentication, or cryptographic facts.",
                why_it_may_not_apply="The draft does not determine whether the cryptographic functionality is controlled, exempt, mass-market eligible, or otherwise outside Category 5 Part 2.",
                missing_information=[
                    "Whether cryptography is user-accessible, configurable, or limited to authentication/boot support.",
                    "Availability, mass-market, and exception facts for expert review.",
                    *missing_points[:2],
                ],
                uncertainty_flags=list(dict.fromkeys(["requires_engineering_confirmation", "missing_key_specs", *uncertainty_flags])),
                reviewer_questions=[],
                review_path_id="category_5_part_2_crypto_security_device",
            )
        )

    if (
        not is_crypto_profile
        and security_candidate_specs
        and any(spec.name in SECURITY_FACT_NAMES or spec.category == "security_cryptography" for spec in security_candidate_specs)
    ):
        security_fact_list = [_format_spec(spec) for spec in security_candidate_specs]
        if is_mcu_profile:
            security_citation_text = "Security and cryptography functions such as secure boot, hardware cryptography acceleration, public-key engines, symmetric engines, hash engines, RNG, secure key management, inline encryption, OTFAD, SNVS/ZMK, or PUF may require separate Category 5 Part 2 analysis by a qualified reviewer."
            security_apply_text = "The document identifies hardware security and cryptography features including HAB/encrypted boot, CAAM, public-key cryptography engine, symmetric engines, cryptographic hash engine, RNG4, secure hardware-only key management, inline encryption, OTFAD AES-128 counter-mode decryption, SNVS/ZMK, and PUF. These facts support a separate Category 5 Part 2 security/cryptography review path."
            security_missing = [
                "Whether cryptographic functions are user-accessible.",
                "Whether features are limited to boot/authentication/storage protection.",
                "Whether mass-market/license exception treatment applies.",
                "Whether details are in a security reference manual.",
                "Exact algorithms/key sizes not visible in this datasheet.",
            ]
        else:
            security_citation_text = "Security and cryptography functions such as secure boot, AES-GCM, SHA-3/384, and RSA 4096 may require separate Category 5 Part 2 analysis by a qualified reviewer."
            security_apply_text = "The document includes secure boot and named cryptographic functions such as AES-GCM, SHA-3/384, and RSA 4096. These may require separate security/cryptography review."
            security_missing = [
                "Whether crypto is user-accessible.",
                "Whether mass-market or license exception treatment applies.",
                "Whether implementation details are in a security manual rather than this overview.",
            ]
        candidates.append(
            ECCNCandidate(
                eccn="Category 5 Part 2",
                title="Category 5 Part 2 security/cryptography review path",
                confidence="medium",
                matched_technical_facts=security_fact_list,
                regulatory_citations=[
                    *[
                        build_document_citation(spec, source=source_label)
                        for spec in security_candidate_specs
                        if spec.name in SECURITY_FACT_NAMES or spec.category == "security_cryptography"
                    ],
                    build_regulatory_citation(
                        "Category 5 Part 2 security/cryptography review path",
                        security_citation_text,
                        "This path captures named security facts for expert review of control status, mass-market eligibility, exceptions, and availability.",
                        source="15 CFR Part 774, Supplement No. 1, Category 5 Part 2",
                    ),
                ],
                why_it_may_apply=security_apply_text,
                why_it_may_not_apply=(
                    "The draft does not determine whether functionality is controlled, mass-market eligible, exempt, or otherwise not controlled. A qualified reviewer must evaluate actual cryptographic functionality, availability, and applicable exceptions."
                ),
                missing_information=security_missing,
                uncertainty_flags=list(dict.fromkeys(["requires_engineering_confirmation", "missing_key_specs", *uncertainty_flags])),
                reviewer_questions=[],
                review_path_id="category_5_part_2_security",
            )
        )

    if is_converter_primary_review:
        candidates.append(
            ECCNCandidate(
                eccn="3A001",
                title="Category 3 electronics review path for high-speed ADC components",
                confidence="medium" if has_high_speed_adc else "low",
                matched_technical_facts=high_value_facts or ["The datasheet contains ADC performance and interface claims that require Category 3 review."],
                regulatory_citations=category_3a001_citations,
                why_it_may_apply=(
                    f"The datasheet identifies {apply_summary}. These facts support using Category 3 electronics entries as the initial expert-review path. A qualified reviewer must compare the extracted converter and interface facts against the current CCL thresholds."
                ),
                why_it_may_not_apply=(
                    "The current draft does not encode complete CCL threshold logic. A qualified reviewer still needs to map the extracted converter resolution, sample-rate, bandwidth, frequency-range, and interface facts to the current control text and confirm whether a narrower entry is actually triggered."
                ),
                missing_information=missing_points + [
                    "A qualified reviewer must map the extracted converter and interface facts to the current CCL thresholds.",
                    "Any omitted security, special-environment, or design-intent details that could narrow or broaden the review path.",
                ],
                uncertainty_flags=uncertainty_flags,
                reviewer_questions=[],
                review_path_id="category_3_high_speed_converter",
            )
        )

    if (is_generic_profile or generic_electronics_specs) and not is_converter_primary_review and not is_soc_profile and not is_rf_profile and not is_crypto_profile:
        candidates.append(
            ECCNCandidate(
                eccn="Category 3",
                title="Category 3 electronics review path",
                confidence="low",
                matched_technical_facts=[_format_spec(spec) for spec in generic_electronics_specs[:8]],
                regulatory_citations=[
                    *[build_document_citation(spec, source=source_label) for spec in generic_electronics_specs[:4]],
                    build_regulatory_citation(
                        "CCL Category 3 electronics review path",
                        "Category 3 electronics review can remain relevant for source-grounded semiconductor performance and interface facts. This draft does not encode final threshold logic.",
                        "The extracted electronics facts support a Category 3 comparison before broader fallback outcomes.",
                    ),
                ],
                why_it_may_apply="The extracted facts identify electronics performance, package, power, or interface characteristics that may require Category 3 comparison.",
                why_it_may_not_apply="The currently extracted facts may be too general to trigger a narrower control path, and the memo leaves threshold mapping for qualified reviewer confirmation.",
                missing_information=["Current CCL threshold mapping by a qualified reviewer.", *missing_points[:2]],
                uncertainty_flags=list(dict.fromkeys(["limited_regulatory_coverage", *uncertainty_flags])),
                reviewer_questions=[],
                review_path_id="category_3_generic_electronics",
            )
        )

    candidates.append(
        ECCNCandidate(
            eccn="3A991",
            title="General electronics comparison path",
            confidence="low",
            matched_technical_facts=general_facts,
            regulatory_citations=[
                build_regulatory_citation(
                    "General electronics fallback review",
                    "A broader general-electronics path should be considered only after the narrower Category 3 electronics review paths are examined and excluded by a qualified reviewer.",
                    "This is a fallback comparison point only. It should not be treated as the likely answer while narrower Category 3 review paths remain open.",
                    source="EAR classification comparison workflow",
                )
            ],
            why_it_may_apply=general_apply_text,
            why_it_may_not_apply=general_not_apply_text,
            missing_information=general_missing_information,
            uncertainty_flags=general_uncertainty_flags,
            reviewer_questions=[],
            review_path_id="general_electronics_comparison",
        ),
    )

    has_meaningful_processor_or_interface_facts = bool(soc_candidate_specs or generic_electronics_specs or digital_specs)
    if not has_high_speed_adc and not has_special_environment and not security_specs and not has_application_context and not has_meaningful_processor_or_interface_facts:
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
                why_it_may_not_apply="The absence of a threshold match in this draft still requires expert review because OCR loss, missing data, or omitted design-intent details could change the review path.",
                missing_information=missing_points + [
                    "Expert confirmation that no narrower Category 3 or security-related review path is triggered by the available datasheet facts."
                ],
                uncertainty_flags=list(dict.fromkeys(["missing_key_specs", *uncertainty_flags])),
                reviewer_questions=[],
                review_path_id="ear99_possible_outcome",
            )
        )

    for candidate in candidates:
        if is_soc_profile:
            candidate.reviewer_questions = _candidate_specific_reviewer_questions(specs, candidate)
            continue
        matched_specs = _get_specs(
            specs,
            [
                "adc_resolution",
                "sample_rate",
                "single_channel_sample_rate",
                "dual_channel_sample_rate",
                "channel_modes",
                "input_bandwidth",
                "usable_input_frequency_range",
                "jesd_interface",
                "interface_lane_count",
                "serial_lane_rate",
                "application_examples",
                "package_type",
                "power_consumption",
                "device_type",
                "part_number",
                *SOC_FACT_NAMES,
            ],
        )
        candidate.reviewer_questions = generate_reviewer_questions(specs, candidate.eccn, matched_specs)

    confidence = max(_confidence_score(candidate.confidence) for candidate in candidates)
    return candidates, uncertainty_flags, confidence
