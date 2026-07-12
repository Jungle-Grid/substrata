from __future__ import annotations

from dataclasses import dataclass

PROFILE_ALIASES = {
    "generic_electronics": "general_electronics",
    "rf_transceiver": "rf_microwave_component",
    "mcu_processor_soc": "mcu_or_soc",
    "fpga_programmable_logic_soc": "fpga_or_pld",
    "crypto_security_device": "encryption_or_crypto_device",
}

PROFILES = (
    "unknown",
    "ai_accelerator",
    "gpu_accelerator",
    "advanced_computing_hardware",
    "server_or_compute_appliance",
    "networking_hardware",
    "secure_networking_hardware",
    "encryption_or_crypto_device",
    "firmware_or_security_software",
    "fpga_programmable_logic_soc",
    "fpga_or_pld",
    "mcu_or_soc",
    "adc_dac_converter",
    "rf_microwave_component",
    "radio_wireless_device",
    "sensor_or_industrial_control",
    "rugged_special_environment_hardware",
    "camera_or_vision_system",
    "storage_or_memory_device",
    "general_electronics",
)


@dataclass(frozen=True)
class ProfileContract:
    required_any: tuple[str, ...]
    hard_exclusions: tuple[str, ...] = ()
    minimum_positive_evidence: int = 1
    allow_unknown: bool = True


# Signal keys are evidence capabilities, not profile labels or ECCN strings.
# Scores may rank contracts only after these eligibility requirements pass.
PROFILE_CONTRACTS = {
    "ai_accelerator": ProfileContract(
        required_any=("ai_accelerator_identity",),
        hard_exclusions=("ai_accelerator_identity",),
    ),
    "gpu_accelerator": ProfileContract(required_any=("gpu_identity",)),
    "advanced_computing_hardware": ProfileContract(
        required_any=("compute_rate", "hbm", "compute_appliance"),
    ),
    "server_or_compute_appliance": ProfileContract(required_any=("compute_appliance", "server_form")),
    "networking_hardware": ProfileContract(required_any=("networking", "high_speed_ethernet")),
    "secure_networking_hardware": ProfileContract(required_any=("network_security",)),
    "encryption_or_crypto_device": ProfileContract(required_any=("crypto", "network_security")),
    "firmware_or_security_software": ProfileContract(required_any=("security_software",)),
    "fpga_programmable_logic_soc": ProfileContract(required_any=("zynq_mpsoc",)),
    "fpga_or_pld": ProfileContract(required_any=("fpga",)),
    "mcu_or_soc": ProfileContract(required_any=("mcu", "soc")),
    "adc_dac_converter": ProfileContract(required_any=("converter_identity",)),
    "rf_microwave_component": ProfileContract(required_any=("rf", "radio", "radar")),
    "radio_wireless_device": ProfileContract(required_any=("radio",)),
    "sensor_or_industrial_control": ProfileContract(required_any=("industrial", "navigation_sensor", "vision")),
    "rugged_special_environment_hardware": ProfileContract(required_any=("rugged",)),
    "camera_or_vision_system": ProfileContract(required_any=("vision",)),
    "storage_or_memory_device": ProfileContract(required_any=("storage",)),
    "general_electronics": ProfileContract(required_any=()),
}

PROFILE_THRESHOLDS = {profile: 6 for profile in PROFILES}
PROFILE_THRESHOLDS.update({
    "advanced_computing_hardware": 7,
    "secure_networking_hardware": 7,
    "encryption_or_crypto_device": 4,
    "rugged_special_environment_hardware": 5,
    "general_electronics": 1,
    "mcu_or_soc": 5,
})

PROFILE_PRIORITY = {profile: len(PROFILES) - index for index, profile in enumerate(PROFILES)}


def canonical_profile(value: str) -> str:
    return PROFILE_ALIASES.get(value, value)
