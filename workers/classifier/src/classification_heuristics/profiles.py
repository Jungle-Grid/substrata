from __future__ import annotations

PROFILE_ALIASES = {
    "generic_electronics": "general_electronics",
    "rf_transceiver": "rf_microwave_component",
    "mcu_processor_soc": "mcu_or_soc",
    "fpga_programmable_logic_soc": "fpga_or_pld",
    "crypto_security_device": "encryption_or_crypto_device",
}

PROFILES = (
    "ai_accelerator",
    "gpu_accelerator",
    "advanced_computing_hardware",
    "server_or_compute_appliance",
    "networking_hardware",
    "secure_networking_hardware",
    "encryption_or_crypto_device",
    "firmware_or_security_software",
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

PROFILE_THRESHOLDS = {profile: 6 for profile in PROFILES}
PROFILE_THRESHOLDS.update({
    "advanced_computing_hardware": 7,
    "secure_networking_hardware": 7,
    "encryption_or_crypto_device": 4,
    "rugged_special_environment_hardware": 5,
    "general_electronics": 1,
})

PROFILE_PRIORITY = {profile: len(PROFILES) - index for index, profile in enumerate(PROFILES)}


def canonical_profile(value: str) -> str:
    return PROFILE_ALIASES.get(value, value)
