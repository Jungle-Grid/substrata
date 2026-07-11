from __future__ import annotations


MISSING_EVIDENCE = {
    "ai_accelerator": [
        "Current advanced-computing threshold mapping for the exported configuration.",
        "Memory bandwidth and interconnect bandwidth, where relevant.",
        "Whether the export is an IC, card, module, server, appliance, or complete system.",
        "Whether the product contains separately controlled integrated circuits.",
        "Firmware, signing, attestation, and other security-feature details.",
        "Destination and end-use context where required by the review workflow.",
    ],
    "networking_hardware": [
        "Supported encryption algorithms and key lengths.",
        "Key-management behavior and whether cryptography is user-accessible.",
        "Whether secure boot is authentication-only or protects data confidentiality.",
        "MACsec, TLS, IPsec, and VPN support in the exported configuration.",
    ],
    "encryption_or_crypto_device": [
        "Supported algorithms, key lengths, and cryptographic modes.",
        "Key generation, storage, import, export, and management behavior.",
        "Whether cryptographic functions are user-accessible or limited to authentication/boot.",
        "Mass-market or other applicable treatment analysis by a qualified reviewer.",
    ],
    "rf_microwave_component": [
        "Operating frequency range, output power, bandwidth, and modulation.",
        "Radar, military, aerospace, or other specialized intended use.",
        "Operating-temperature range and qualification standards.",
    ],
    "adc_dac_converter": [
        "Sampling rate, resolution, analog bandwidth, channel count, and ENOB.",
        "Radiation, military, or aerospace qualification details.",
    ],
    "fpga_or_pld": [
        "Logic density, LUT or logic-cell count, and transceiver/SERDES performance.",
        "Bitstream encryption, authentication, and key-storage behavior.",
        "Rugged, military, radiation, or space-qualified variants.",
    ],
    "rugged_special_environment_hardware": [
        "Radiation tolerance, total-ionizing-dose, and single-event specifications.",
        "Space, military, aerospace, or extended-temperature qualification standards.",
        "Intended end use and exact qualified product configuration.",
    ],
    "sensor_or_industrial_control": [
        "Sensor performance envelope, navigation capability, and intended industrial use.",
        "Military, aerospace, radiation, or special-environment qualification.",
    ],
    "general_electronics": [
        "Technical details needed to exclude narrower product-specific review paths.",
    ],
}


def missing_evidence_for(profiles: list[str]) -> list[str]:
    values: list[str] = []
    for profile in profiles:
        for item in MISSING_EVIDENCE.get(profile, []):
            if item not in values:
                values.append(item)
    return values


def confidence_for(score: int, support_count: int, missing_count: int) -> tuple[str, float]:
    numeric = min(0.88, 0.35 + score * 0.025 + support_count * 0.025 - min(missing_count, 6) * 0.015)
    level = "high" if numeric >= 0.75 else "medium" if numeric >= 0.55 else "low"
    return level, round(max(0.2, numeric), 2)
