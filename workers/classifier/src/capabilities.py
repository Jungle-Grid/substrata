from __future__ import annotations

from dataclasses import dataclass

from schemas import ExtractedSpec, WorkerCapabilitySignal


@dataclass(frozen=True)
class _SignalRule:
    key: str
    names: tuple[str, ...]
    tokens: tuple[str, ...]
    summary: str


SIGNAL_RULES: tuple[_SignalRule, ...] = (
    _SignalRule(
        key="hasCryptography",
        names=(
            "cryptographic_algorithm",
            "caam",
            "pkha",
            "symmetric_engine",
            "cryptographic_hash_engine",
            "rng4",
            "secure_key_management",
            "inline_encryption_engine",
            "otfad",
            "puf",
        ),
        tokens=("crypto", "cryptograph", "aes", "rsa", "sha", "ecc", "hsm", "tpm", "puf"),
        summary="Cryptographic or security functionality was identified in the reviewed source material.",
    ),
    _SignalRule(
        key="hasEncryption",
        names=("cryptographic_algorithm", "inline_encryption_engine", "encrypted_boot", "otfad"),
        tokens=("encrypt", "aes", "gcm", "cbc", "ctr"),
        summary="Encryption-related functionality was identified in the reviewed source material.",
    ),
    _SignalRule(
        key="hasDecryption",
        names=("otfad", "encrypted_boot", "inline_encryption_engine"),
        tokens=("decrypt", "decryption", "counter-mode"),
        summary="Decryption-related functionality was identified in the reviewed source material.",
    ),
    _SignalRule(
        key="hasKeyManagement",
        names=("secure_key_management", "key_storage", "zero_master_key", "snvs"),
        tokens=("key management", "key derivation", "key wrapping", "key storage", "secure key"),
        summary="Key-management functionality was identified in the reviewed source material.",
    ),
    _SignalRule(
        key="hasCryptographicAccelerator",
        names=("caam", "pkha", "symmetric_engine", "cryptographic_hash_engine", "inline_encryption_engine"),
        tokens=("accelerator", "engine", "caam", "pkha"),
        summary="Hardware cryptographic acceleration was identified in the reviewed source material.",
    ),
    _SignalRule(
        key="hasSecureBoot",
        names=("secure_boot", "encrypted_boot"),
        tokens=("secure boot", "encrypted boot"),
        summary="Secure-boot functionality was identified in the reviewed source material.",
    ),
    _SignalRule(
        key="hasTrustedExecution",
        names=("security_feature",),
        tokens=("trusted execution", "trusted enclave", "tee", "secure enclave"),
        summary="Trusted-execution or isolated security-execution functionality was identified in the reviewed source material.",
    ),
    _SignalRule(
        key="hasSecureKeyStorage",
        names=("key_storage", "secure_key_management", "snvs", "zero_master_key"),
        tokens=("secure key storage", "hardware-only key", "snvs", "zero master key"),
        summary="Secure key-storage behavior was identified in the reviewed source material.",
    ),
    _SignalRule(
        key="hasHardwareSecurityModule",
        names=("security_feature", "secure_element"),
        tokens=("hsm", "hardware security module", "secure element", "tpm"),
        summary="Hardware security module or secure-element functionality was identified in the reviewed source material.",
    ),
    _SignalRule(
        key="hasAuthenticationSecurityFeatures",
        names=("secure_boot", "security_feature", "certificate_signature"),
        tokens=("authentication", "signature", "certificate", "attestation", "secure debug"),
        summary="Authentication or security-attestation functionality was identified in the reviewed source material.",
    ),
    _SignalRule(
        key="hasHighSpeedInterfaces",
        names=("pcie_interface", "displayport_interface", "displayport_lane_rate", "jesd_interface", "serial_lane_rate", "ethernet_mac"),
        tokens=("pcie", "displayport", "jesd", "gbps", "ethernet"),
        summary="High-speed interface capabilities were identified in the reviewed source material.",
    ),
    _SignalRule(
        key="hasProgrammableLogic",
        names=("programmable_logic", "ps_pl_integration"),
        tokens=("programmable logic", "fpga", "pl fabric"),
        summary="Programmable-logic functionality was identified in the reviewed source material.",
    ),
    _SignalRule(
        key="hasAdvancedProcessor",
        names=("cpu_core", "processor_architecture", "realtime_cpu", "processing_system"),
        tokens=("cortex", "processor", "soc", "mpsoc", "64-bit", "quad-core"),
        summary="Advanced processor or SoC functionality was identified in the reviewed source material.",
    ),
    _SignalRule(
        key="hasRFOrWirelessCapability",
        names=("rf_frequency_range", "frequency_range", "rf_bandwidth", "communications_application"),
        tokens=("rf", "wireless", "transceiver", "radar", "radio"),
        summary="RF or wireless capability was identified in the reviewed source material.",
    ),
)


def _confidence_for_match(match_count: int) -> str:
    if match_count >= 3:
        return "high"
    if match_count >= 1:
        return "medium"
    return "low"


def derive_capability_signals(specs: list[ExtractedSpec]) -> list[WorkerCapabilitySignal]:
    signals: list[WorkerCapabilitySignal] = []
    for rule in SIGNAL_RULES:
        supporting_specs: list[ExtractedSpec] = []
        for spec in specs:
            haystack = f"{spec.name} {spec.value} {spec.source_snippet}".lower()
            if spec.name in rule.names or any(token in haystack for token in rule.tokens):
                if spec not in supporting_specs:
                    supporting_specs.append(spec)

        signals.append(
            WorkerCapabilitySignal(
                key=rule.key,
                detected=bool(supporting_specs),
                confidence=_confidence_for_match(len(supporting_specs)),
                summary=rule.summary
                if supporting_specs
                else f"{rule.summary.replace('was identified', 'was not identified')}",
                supporting_fact_names=[spec.name for spec in supporting_specs],
                supporting_citation_labels=[],
            )
        )

    return signals
