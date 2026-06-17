from __future__ import annotations

from collections import defaultdict

from schemas import ExtractedSpec

CATEGORY_DISPLAY_NAMES = {
    "product_identity": "Product identity",
    "profile_detection": "Profile detection",
    "processing_system_cpu": "Processing system / CPU",
    "programmable_logic_fpga": "Programmable logic / FPGA fabric",
    "converter_performance": "Converter/performance specs",
    "digital_interface": "Digital interfaces / high-speed I/O",
    "rf_microwave": "RF/input-frequency specs",
    "application_context": "Application/context language",
    "compute_processor": "Compute/processor specs",
    "security_cryptography": "Security/cryptography indicators",
    "memory_cache_integrity": "Memory/cache integrity",
    "peripheral_functions": "Peripheral functions",
    "environmental_qualification": "Environmental/qualification specs",
    "packaging_lifecycle": "Power/package specs",
}


def group_specs_by_category(specs: list[ExtractedSpec]) -> dict[str, list[ExtractedSpec]]:
    grouped: dict[str, list[ExtractedSpec]] = defaultdict(list)
    for spec in specs:
        grouped[spec.category].append(spec)

    ordered: dict[str, list[ExtractedSpec]] = {}
    for category in CATEGORY_DISPLAY_NAMES:
        if grouped.get(category):
            ordered[category] = grouped[category]

    for category, values in grouped.items():
        if category not in ordered:
            ordered[category] = values

    return ordered


def _has_name(specs: list[ExtractedSpec], names: set[str]) -> bool:
    return any(spec.name in names for spec in specs)


def infer_missing_review_points(specs: list[ExtractedSpec]) -> list[str]:
    findings: list[str] = []
    device_types = {
        spec.value.lower()
        for spec in specs
        if spec.name == "device_type"
    }

    is_converter = any(
        marker in device_type
        for device_type in device_types
        for marker in ("adc", "analog-to-digital", "dac", "digital-to-analog", "converter")
    )

    if is_converter and not _has_name(specs, {"adc_resolution", "dac_resolution"}):
        findings.append(
            "Resolution was not found in the provided datasheet text. Resolution matters because converter review often depends on the combination of bit depth and sample-rate claims."
        )

    if is_converter and not _has_name(specs, {"sample_rate", "single_channel_sample_rate", "dual_channel_sample_rate"}):
        findings.append(
            "Sample-rate information was not found in the provided datasheet text. Sample-rate claims matter because high-speed converter performance can change the Category 3 review path."
        )

    if is_converter and not _has_name(specs, {"jesd_interface", "digital_interface", "serial_lane_rate", "serdes_rate"}):
        findings.append(
            "A digital output interface or lane-rate detail was not found in the provided datasheet text. Interface details matter because high-speed serial output can be classification-relevant."
        )

    if not _has_name(specs, {"radiation_tolerance", "space_qualification", "military_grade", "operating_temperature_range"}):
        findings.append(
            "Special-environment qualification details were not found in the provided datasheet text. Radiation, military, space, or extended-temperature language matters because specialized design intent can affect the review path."
        )

    if not _has_name(specs, {"security_feature", "cryptographic_algorithm", "secure_boot", "trusted_execution"}):
        findings.append(
            "Security or cryptography features were not found in the provided datasheet text. That matters because embedded cryptographic capability can require a different expert review path."
        )

    return findings[:4]


def group_specs_for_review(specs: list[ExtractedSpec]) -> dict[str, list[ExtractedSpec]]:
    groups = {
        "high_speed_data_converter_facts": [],
        "high_speed_digital_interface_facts": [],
        "rf_microwave_facts": [],
        "application_context_facts": [],
        "compute_processor_facts": [],
        "cryptography_security_facts": [],
        "radiation_space_military_facts": [],
        "fallback_general_electronics_facts": [],
    }

    for spec in specs:
        if spec.category == "converter_performance":
            groups["high_speed_data_converter_facts"].append(spec)
        if spec.category == "digital_interface":
            groups["high_speed_digital_interface_facts"].append(spec)
        if spec.category == "rf_microwave":
            groups["rf_microwave_facts"].append(spec)
        if spec.category == "application_context":
            groups["application_context_facts"].append(spec)
        if spec.category in {"compute_processor", "processing_system_cpu", "programmable_logic_fpga", "memory_cache_integrity", "peripheral_functions"}:
            groups["compute_processor_facts"].append(spec)
        if spec.category == "security_cryptography":
            groups["cryptography_security_facts"].append(spec)
        if spec.category == "environmental_qualification":
            groups["radiation_space_military_facts"].append(spec)
        if spec.category in {"product_identity", "packaging_lifecycle"}:
            groups["fallback_general_electronics_facts"].append(spec)

    if not groups["fallback_general_electronics_facts"]:
        groups["fallback_general_electronics_facts"] = specs[:3]

    return groups
