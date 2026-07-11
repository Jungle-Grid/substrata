from __future__ import annotations

PROFILE_PATHS = {
    "ai_accelerator": ("advanced_computing", "category_3_electronics", "category_4_compute_assemblies"),
    "gpu_accelerator": ("advanced_computing", "category_3_electronics", "category_4_compute_assemblies"),
    "advanced_computing_hardware": ("advanced_computing", "category_3_electronics", "category_4_compute_assemblies"),
    "server_or_compute_appliance": ("category_4_compute_assemblies", "advanced_computing"),
    "networking_hardware": ("networking_telecom", "category_5_part_1"),
    "secure_networking_hardware": ("networking_telecom", "category_5_part_2_security"),
    "encryption_or_crypto_device": ("category_5_part_2_security",),
    "firmware_or_security_software": ("category_5_part_2_security", "software_security"),
    "fpga_or_pld": ("fpga_programmable_logic", "category_3_electronics"),
    "mcu_or_soc": ("mcu_soc", "category_3_electronics"),
    "adc_dac_converter": ("converter", "category_3_electronics"),
    "rf_microwave_component": ("rf_microwave", "category_3_electronics"),
    "radio_wireless_device": ("radio_wireless", "category_5_part_1"),
    "sensor_or_industrial_control": ("sensor_industrial",),
    "rugged_special_environment_hardware": ("special_environment",),
    "camera_or_vision_system": ("camera_vision",),
    "storage_or_memory_device": ("storage_memory", "category_3_electronics"),
    "general_electronics": ("general_electronics_fallback",),
}

PATH_TITLES = {
    "advanced_computing": "Advanced computing review path",
    "category_3_electronics": "Category 3 electronics review path",
    "category_4_compute_assemblies": "Category 4 computer and electronic assembly review path",
    "networking_telecom": "Networking hardware and telecommunications review path",
    "category_5_part_1": "Category 5 Part 1 telecommunications review path",
    "category_5_part_2_security": "Category 5 Part 2 security and cryptography review path",
    "software_security": "Firmware and security software review path",
    "fpga_programmable_logic": "FPGA and programmable-logic review path",
    "mcu_soc": "MCU and embedded SoC review path",
    "converter": "ADC/DAC converter review path",
    "rf_microwave": "RF and microwave component review path",
    "radio_wireless": "Radio and wireless-device review path",
    "sensor_industrial": "Sensor and industrial-control review path",
    "special_environment": "Special-environment hardware review path",
    "camera_vision": "Camera and machine-vision review path",
    "storage_memory": "Storage and memory-device review path",
    "general_electronics_fallback": "General electronics fallback review path",
}

CANDIDATE_RULES = {
    "advanced_computing": (("3A090", "review_candidate"), ("4A090", "review_candidate")),
    "category_5_part_2_security": (("5A002", "review_candidate"),),
    "converter": (("3A001", "review_candidate"),),
    "fpga_programmable_logic": (("3A001", "review_candidate"),),
    "rf_microwave": (("3A001", "review_candidate"),),
    "networking_telecom": (("5A991", "review_candidate"),),
    "general_electronics_fallback": (("3A991", "fallback_candidate"),),
}
