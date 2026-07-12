from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SignalRule:
    key: str
    profiles: tuple[str, ...]
    weight: int
    terms: tuple[str, ...]


SIGNAL_RULES = (
    SignalRule("gateway_form", (), 0, ("sensor gateway", "industrial gateway", "edge gateway", "gateway")),
    SignalRule("router_form", (), 0, ("router",)),
    SignalRule("network_switch_form", (), 0, ("network switch", "ethernet switch")),
    SignalRule("server_form_identity", (), 0, ("rack server", "gpu server", "compute server")),
    SignalRule("evaluation_kit_form", (), 0, ("evaluation kit", "development kit")),
    SignalRule("board_form", (), 0, ("development board", "evaluation board", "circuit board")),
    SignalRule("ai_accelerator_identity", ("ai_accelerator", "advanced_computing_hardware"), 8, ("ai accelerator", "accelerator card", "npu", "tpu")),
    SignalRule("gpu_identity", ("gpu_accelerator", "advanced_computing_hardware"), 8, ("gpu accelerator", "graphics processing unit", "graphics processing units", "gpu card")),
    SignalRule("ai_workload", ("ai_accelerator", "advanced_computing_hardware"), 3, ("inference", "training", "fine-tuning", "server inference")),
    SignalRule("compute_rate", ("ai_accelerator", "gpu_accelerator", "advanced_computing_hardware"), 5, ("tops", "tflops", "flops")),
    SignalRule("hbm", ("ai_accelerator", "gpu_accelerator", "advanced_computing_hardware", "storage_or_memory_device"), 4, ("high bandwidth memory", "hbm2", "hbm3", "hbm3e")),
    SignalRule("high_speed_compute_interconnect", ("advanced_computing_hardware",), 3, ("pcie gen4", "pcie gen5", "pcie 4.0", "pcie 5.0", "high memory bandwidth")),
    SignalRule("compute_appliance", ("server_or_compute_appliance", "advanced_computing_hardware"), 7, ("compute appliance", "inference server", "rack server", "gpu server")),
    SignalRule("server_form", ("server_or_compute_appliance",), 4, ("server", "appliance", "rackmount", "rack-mount")),
    SignalRule("networking", ("networking_hardware",), 7, ("network interface card", "network adapter", "ethernet switch", "router", "ethernet")),
    SignalRule("high_speed_ethernet", ("networking_hardware",), 4, ("10gbe", "25gbe", "100gbe", "400gbe", "10 gb ethernet", "25 gb ethernet", "100 gb ethernet", "400 gb ethernet")),
    SignalRule("network_security", ("secure_networking_hardware", "encryption_or_crypto_device"), 5, ("macsec", "tls offload", "ipsec", "vpn")),
    SignalRule("transport_security", ("encryption_or_crypto_device",), 2, ("mqtt over tls", "https transport", "tls transport")),
    SignalRule("crypto", ("encryption_or_crypto_device",), 6, ("encryption", "cryptographic acceleration", "cryptographic accelerator", "hsm", "key management", "key storage")),
    SignalRule("platform_security", ("encryption_or_crypto_device", "firmware_or_security_software"), 4, ("secure boot", "remote attestation", "firmware signing", "signed firmware", "secure enclave", "encrypted bitstream", "bitstream encryption")),
    SignalRule("security_software", ("firmware_or_security_software",), 6, ("security firmware", "firmware image", "secure firmware", "software encryption")),
    SignalRule("rf", ("rf_microwave_component",), 7, ("rf front-end", "rf front end", "microwave", "mmwave", "power amplifier", "low noise amplifier", "phased array")),
    SignalRule("radio", ("radio_wireless_device", "rf_microwave_component"), 6, ("radio transceiver", "wireless transceiver", "wi-fi", "wifi", "bluetooth", "ble", "antenna", "modulation")),
    SignalRule("radar", ("rf_microwave_component",), 5, ("radar",)),
    SignalRule("frequency", ("rf_microwave_component", "radio_wireless_device"), 2, ("frequency range", "ghz")),
    SignalRule("converter_identity", ("adc_dac_converter",), 8, ("analog-to-digital converter", "digital-to-analog converter", "adc", "dac")),
    SignalRule("converter_performance", ("adc_dac_converter",), 4, ("gsps", "msps", "enob", "sample rate", "sampling rate", "analog bandwidth")),
    SignalRule("fpga", ("fpga_or_pld",), 8, ("fpga", "programmable logic", "logic cells", "luts", "bitstream")),
    SignalRule("zynq_mpsoc", ("fpga_programmable_logic_soc",), 10, ("zynq ultrascale+ mpsoc", "zynq mpsoc", "processing system", "pl/ps")),
    SignalRule("fpga_io", ("fpga_or_pld",), 3, ("serdes", "high-speed transceivers", "high speed transceivers")),
    SignalRule("mcu", ("mcu_or_soc",), 8, ("microcontroller", "embedded soc", "risc-v", "cortex-m")),
    SignalRule("soc", ("mcu_or_soc",), 5, ("system-on-chip", "system on chip", "processor core", "arm cortex", "cortex-a53", "cortex-a55", "cortex-a72", "cortex-m0", "cortex-m3", "cortex-m4", "cortex-m7")),
    SignalRule("industrial", ("sensor_or_industrial_control",), 7, ("industrial controller", "plc", "inertial measurement", "robotics", "lidar")),
    SignalRule("vision", ("camera_or_vision_system", "sensor_or_industrial_control"), 7, ("machine vision", "camera system", "image sensor", "thermal imaging")),
    SignalRule("navigation_sensor", ("sensor_or_industrial_control",), 5, ("navigation", "imu", "inertial sensor")),
    SignalRule("rugged", ("rugged_special_environment_hardware",), 5, ("radiation tolerant", "radiation hardened", "space qualified", "military grade", "military-grade", "aerospace", "itar")),
    SignalRule("extended_environment", ("rugged_special_environment_hardware",), 3, ("rugged", "extended temperature", "mil-std", "do-160")),
    SignalRule("storage", ("storage_or_memory_device",), 7, ("storage device", "storage appliance", "solid state drive", "solid state drives", "ssd", "memory module", "flash memory")),
)
