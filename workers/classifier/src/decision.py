from __future__ import annotations

from dataclasses import asdict, dataclass
import re
from typing import Any

from schemas import ECCNCandidate, ExtractedSpec


SPECIFIC_ECCN = re.compile(r"\b[0-9][A-Z][0-9]{3}(?:\.[A-Za-z0-9]+|[A-Za-z0-9]*)?\b")

PATH_DEFINITIONS: dict[str, dict[str, Any]] = {
    "advanced_computing": {
        "title": "Advanced computing review path",
        "triggers": ("ai_accelerator_identity", "gpu_identity", "compute_rate", "hbm"),
        "required": ("exported product form", "current performance thresholds", "installed accelerator configuration"),
    },
    "networking_telecom": {
        "title": "Networking and telecommunications review path",
        "triggers": ("networking", "high_speed_ethernet"),
        "required": ("exact shipped interface configuration", "telecommunications function"),
    },
    "category_5_part_2_security": {
        "title": "Security and cryptography review path",
        "triggers": ("transport_security", "network_security", "crypto", "platform_security"),
        "required": ("cryptographic implementation", "user accessibility", "key-management behavior", "exact shipped configuration"),
    },
    "radio_wireless": {
        "title": "Radio and wireless-device review path",
        "triggers": ("radio", "frequency"),
        "required": ("populated radio module", "enabled bands and protocols", "regional/export configuration"),
    },
    "component_electronics": {
        "title": "Installed processor and electronics review path",
        "triggers": ("mcu", "soc", "fpga", "converter_identity"),
        "required": ("component part number", "component function in exported product", "exact shipped configuration"),
    },
    "sensor_industrial": {
        "title": "Sensor and industrial product review path",
        "triggers": ("industrial", "navigation_sensor", "vision", "gateway_form"),
        "required": ("exported product function", "deployment/end-use context"),
    },
}

FORM_REQUIREMENTS = {
    "gateway": ("exact shipped SKU", "wireless module identity", "populated and enabled regional configuration", "cryptographic implementation", "user accessibility", "firmware configuration", "destination/end-use context"),
    "appliance": ("exact shipped SKU", "network interfaces", "cryptographic implementation", "user accessibility", "firmware configuration", "destination/end-use context"),
    "board": ("board function", "populated components", "included firmware", "exact ordering code"),
    "accelerator_card": ("exact ordering code", "installed accelerator configuration", "memory", "performance", "interconnect"),
    "evaluation_kit": ("included controlled components", "bill of materials", "debug features", "bundled software", "production versus development configuration"),
}

SYSTEM_LIMITATION = {
    "code": "OFFICIAL_REGULATORY_TEXT_UNAVAILABLE",
    "severity": "blocking",
    "resolutionOwner": "system",
    "explanation": "Current official regulatory text was unavailable for this run. No specific ECCN candidate can be elevated until the platform attaches and evaluates applicable current official text.",
}

FORM_RULES = (
    ("smartnic", re.compile(r"\bsmart\s*nic\b", re.I)),
    ("network_interface_card", re.compile(r"\b(?:network interface card|network adapter|ethernet adapter|nic)\b", re.I)),
    ("networking_card", re.compile(r"\bnetworking\s+card\b", re.I)),
    ("evaluation_kit", re.compile(r"\b(?:evaluation|development)\s+(?:kit|board)\b", re.I)),
    ("gateway", re.compile(r"\bgateway\b", re.I)),
    ("router", re.compile(r"\brouter\b", re.I)),
    ("network_switch", re.compile(r"\b(?:network|ethernet)\s+switch\b", re.I)),
    ("server", re.compile(r"\b(?:rack|gpu|compute)?\s*server\b", re.I)),
    ("security_appliance", re.compile(r"\b(?:security|encryption)\s+appliance\b", re.I)),
    ("cryptographic_module", re.compile(r"\b(?:hardware security module|hsm|cryptographic module|key vault)\b", re.I)),
    ("appliance", re.compile(r"\bappliance\b", re.I)),
    ("accelerator_card", re.compile(r"\baccelerator\s+card\b", re.I)),
    ("module", re.compile(r"\bmodule\b", re.I)),
    ("board", re.compile(r"\bboard\b", re.I)),
    ("integrated_circuit", re.compile(r"\b(?:integrated circuit|microcontroller|system[- ]on[- ]chip|\bIC\b)\b", re.I)),
)

PRODUCT_PROFILE_BY_FORM = {
    "smartnic": "secure_networking_hardware",
    "network_interface_card": "secure_networking_hardware",
    "networking_card": "secure_networking_hardware",
    "gateway": "sensor_gateway",
    "router": "networking_hardware",
    "network_switch": "networking_hardware",
    "server": "server_or_compute_appliance",
    "appliance": "server_or_compute_appliance",
    "accelerator_card": "ai_accelerator",
    "cryptographic_module": "encryption_or_crypto_device",
    "security_appliance": "encryption_or_crypto_device",
    "evaluation_kit": "evaluation_kit",
}

CANDIDATE_PATH_ALIASES = {
    "converter": "component_electronics",
    "fpga_programmable_logic": "component_electronics",
    "fpga_programmable_logic_soc": "component_electronics",
    "mcu_soc": "component_electronics",
    "category_3_electronics": "component_electronics",
    "rf_microwave": "component_electronics",
}


@dataclass
class ClassificationDecision:
    run_id: str
    document_ids: list[str]
    exported_product_form: dict[str, Any]
    product_level_profile: dict[str, Any]
    component_level_profiles: list[dict[str, Any]]
    installed_components: list[dict[str, Any]]
    optional_components: list[dict[str, Any]]
    capabilities: list[dict[str, Any]]
    configuration_scope: str
    target_entity: dict[str, Any]
    source_facts: list[dict[str, Any]]
    derived_facts: list[dict[str, Any]]
    contradictions: list[dict[str, Any]]
    profile_resolution_records: list[dict[str, Any]]
    open_review_paths: list[dict[str, Any]]
    rejected_review_paths: list[dict[str, Any]]
    eligible_candidates: list[dict[str, Any]]
    blocked_candidate_hypotheses: list[dict[str, Any]]
    rejected_candidates: list[dict[str, Any]]
    candidate_transitions: list[dict[str, Any]]
    company_history_matches: dict[str, Any]
    regulatory_evidence: list[dict[str, Any]]
    system_limitations: list[dict[str, Any]]
    missing_evidence: list[str]
    reviewer_questions: list[str]
    confidence: dict[str, Any]
    abstention_reason: str | None
    validation_results: list[dict[str, Any]]
    provenance_graph: list[dict[str, str]]
    schema_version: str = "classification_decision_v2"

    @property
    def selected_primary_profile(self) -> dict[str, Any]:
        return self.product_level_profile

    @property
    def eccn_candidates(self) -> list[dict[str, Any]]:
        return self.eligible_candidates

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["selected_primary_profile"] = self.selected_primary_profile
        value["eccn_candidates"] = self.eccn_candidates
        return value


def _evidence_index(source_facts: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = {}
    for fact in source_facts:
        result.setdefault(str(fact.get("fact_type")), []).append(fact)
    return result


def _positive(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [item for item in records if item.get("polarity") in {"present", "ambiguous"}]


def _detect_product_form(source_text: str, source_facts: list[dict[str, Any]]) -> dict[str, Any]:
    for form, pattern in FORM_RULES:
        match = pattern.search(source_text)
        if match:
            evidence_ids = [
                item["id"] for item in source_facts
                if match.group(0).lower() in str(item.get("exact_quote", "")).lower()
            ]
            return {"value": form, "confidence": 0.9, "triggeringEvidenceIds": evidence_ids, "status": "resolved"}
    return {"value": "unknown", "confidence": 0.2, "triggeringEvidenceIds": [], "status": "unknown"}


def _component_profiles(heuristic_profiles: list[str], product_profile: str) -> list[dict[str, Any]]:
    component_types = {
        "mcu_or_soc", "fpga_or_pld", "fpga_programmable_logic_soc", "gpu_accelerator",
        "ai_accelerator", "adc_dac_converter", "rf_microwave_component", "encryption_or_crypto_device",
    }
    return [
        {"profile": profile, "relationship": "installed_component", "status": "present"}
        for profile in heuristic_profiles
        if profile in component_types and profile != product_profile
    ]


def _capabilities(evidence: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    """Keep complete-product identity separate from granular security functions."""
    aliases = {
        "network_security": ("network_confidentiality", "link_layer_encryption"),
        "transport_security": ("transport_security", "cryptographic_offload"),
        "platform_security": ("platform_integrity",),
    }
    output: list[dict[str, Any]] = []
    for fact_type, records in evidence.items():
        keys = aliases.get(fact_type, (fact_type,))
        presence = "present" if any(item.get("polarity") == "present" for item in records) else "configuration_dependent" if any(item.get("polarity") == "ambiguous" for item in records) else "absent" if any(item.get("polarity") == "absent" for item in records) else "unknown"
        for key in keys:
            output.append({
                "key": key,
                "presence": presence,
                "implementation": "unknown",
                "userAccessibility": "unknown",
                "classificationSignificance": "unresolved" if key in {"network_confidentiality", "link_layer_encryption", "transport_security", "cryptographic_offload"} else "unknown",
                "evidenceIds": [item["id"] for item in records],
            })
        if fact_type == "platform_security":
            explicit_capabilities = {
                "secure_boot": "secure boot",
                "firmware_signing": "firmware signing",
                "remote_attestation": "remote attestation",
            }
            for capability, term in explicit_capabilities.items():
                supporting = [item for item in records if term in str(item.get("exact_quote", "")).lower()]
                if supporting:
                    output.append({
                        "key": capability,
                        "presence": "present",
                        "implementation": "unknown",
                        "userAccessibility": "unknown",
                        "classificationSignificance": "unknown",
                        "evidenceIds": [item["id"] for item in supporting],
                    })
    has_network_confidentiality = any(
        item["key"] in {"network_confidentiality", "link_layer_encryption", "transport_security"}
        and item["presence"] in {"present", "configuration_dependent"}
        for item in output
    )
    if not has_network_confidentiality and any(item["key"] == "platform_integrity" and item["presence"] == "present" for item in output):
        platform_evidence = next(item["evidenceIds"] for item in output if item["key"] == "platform_integrity")
        output.append({
            "key": "device_integrity_only",
            "presence": "present",
            "implementation": "unknown",
            "userAccessibility": "unknown",
            "classificationSignificance": "unknown",
            "evidenceIds": platform_evidence,
        })
    return output


def _requirement_assessments(required: tuple[str, ...], evidence: dict[str, list[dict[str, Any]]], source_text: str) -> tuple[list[dict[str, Any]], list[str]]:
    source = source_text.lower()
    assessments: list[dict[str, Any]] = []
    missing: list[str] = []
    keyword_map = {
        "exported product function": ("gateway", "aggregates", "telemetry", "router", "server", "appliance"),
        "telecommunications function": ("ethernet", "network", "router", "switch"),
        "cryptographic implementation": ("aes", "rsa", "algorithm", "cipher"),
        "user accessibility": ("user-accessible", "customer-configurable", "api"),
        "key-management behavior": ("key management", "key storage", "key import"),
        "exact shipped configuration": ("export configuration", "shipped configuration", "production configuration"),
        "populated radio module": ("radio module", "wifi module", "ble module"),
        "enabled bands and protocols": ("ghz", "band", "modulation", "protocol"),
        "regional/export configuration": ("regional sku", "export configuration", "production configuration"),
        "component function in exported product": ("processor", "controller", "gateway", "board"),
        "firmware configuration": ("firmware",),
        "network interfaces": ("ethernet", "pcie", "wifi", "ble"),
        "memory": ("memory", "hbm", "ddr"),
        "performance": ("tops", "tflops", "throughput"),
        "interconnect": ("pcie", "interconnect"),
    }
    for requirement in required:
        terms = keyword_map.get(requirement, ())
        supported = [item["id"] for values in evidence.values() for item in values if item.get("polarity") == "present" and any(term in str(item.get("exact_quote", "")).lower() for term in terms)]
        status = "satisfied" if supported else "missing"
        assessments.append({"requirementId": requirement, "status": status, "supportingEvidenceIds": supported, "explanation": "Supported by normalized source evidence." if supported else "No sufficiently specific source evidence was found."})
        if status != "satisfied":
            missing.append(requirement)
    return assessments, missing


def _canonical_paths(evidence: dict[str, list[dict[str, Any]]], product_form: str, source_text: str) -> list[dict[str, Any]]:
    paths: list[dict[str, Any]] = []
    for path_key, definition in PATH_DEFINITIONS.items():
        trigger_records = [
            record for signal in definition["triggers"] for record in _positive(evidence.get(signal, []))
        ]
        if path_key == "sensor_industrial" and product_form == "gateway" and not trigger_records:
            trigger_records = [item for values in evidence.values() for item in values if "gateway" in str(item.get("exact_quote", "")).lower()]
        if not trigger_records:
            continue
        evidence_ids = list(dict.fromkeys(str(item["id"]) for item in trigger_records))
        form_requirements = FORM_REQUIREMENTS.get(product_form, ())
        requirements = tuple(dict.fromkeys((*definition["required"], *form_requirements)))
        assessments, missing = _requirement_assessments(requirements, evidence, source_text)
        paths.append({
            "pathKey": path_key,
            "title": definition["title"],
            "status": "open",
            "triggeringEvidenceIds": evidence_ids,
            "triggerType": "configuration_dependent" if all(item.get("polarity") == "ambiguous" for item in trigger_records) else "direct_positive",
            "whyTriggered": f"Opened by {len(evidence_ids)} normalized source evidence record(s).",
            "requirementAssessments": assessments,
            "missingEvidence": missing,
            "reviewerQuestions": [f"Provide or confirm {item}." for item in missing],
        })
    return paths


def build_classification_decision(
    *,
    run_id: str,
    document_id: str,
    source_text: str,
    specs: list[ExtractedSpec],
    candidates: list[ECCNCandidate],
    heuristic_result: Any,
    backend_proposed_profile: str | None = None,
    backend_provider: str | None = None,
    prior_stage_candidates: list[str] | None = None,
    target_entity: dict[str, Any] | None = None,
) -> ClassificationDecision:
    trace = heuristic_result.classification_trace
    resolved_entity = target_entity or {"id": f"entity:{document_id}", "relationshipToDocument": "primary_subject"}
    source_facts = [
        {
            **fact,
            "subject_entity_id": fact.get("subject_entity_id", resolved_entity["id"]),
            "relationship": fact.get("relationship", "describes_entity"),
        }
        for fact in trace.get("sourceEvidence", [])
    ]
    evidence = _evidence_index(source_facts)
    product_form = _detect_product_form(source_text, source_facts)
    heuristic_primary = heuristic_result.primary_profile
    canonical_profile = PRODUCT_PROFILE_BY_FORM.get(product_form["value"], heuristic_primary)
    profile_evidence = product_form["triggeringEvidenceIds"] or [
        evidence_id for signal in trace.get("matchedSignals", []) for evidence_id in signal.get("supportingEvidenceIds", [])
    ]
    profile_resolution: list[dict[str, Any]] = []
    if backend_proposed_profile and backend_proposed_profile != canonical_profile:
        profile_resolution.append({
            "proposedByStage": "provider_extraction",
            "proposedByProvider": backend_provider,
            "proposedProfile": backend_proposed_profile,
            "canonicalProfile": canonical_profile,
            "status": "overridden",
            "reason": "Canonical product-form resolution separates the exported product from installed components and capabilities.",
            "triggeringEvidenceIds": profile_evidence,
        })
    if heuristic_primary != canonical_profile:
        profile_resolution.append({
            "proposedByStage": "component_profile_heuristics",
            "proposedByProvider": "deterministic",
            "proposedProfile": heuristic_primary,
            "canonicalProfile": canonical_profile,
            "status": "reclassified_as_component",
            "reason": "The heuristic profile describes an installed component rather than the complete exported product.",
            "triggeringEvidenceIds": profile_evidence,
        })

    component_profiles = _component_profiles(heuristic_result.detected_profiles, canonical_profile)
    paths = _canonical_paths(evidence, product_form["value"], source_text)
    path_by_key = {item["pathKey"]: item for item in paths}
    transitions: list[dict[str, Any]] = []
    eligible: list[dict[str, Any]] = []
    blocked: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    prior_codes = prior_stage_candidates or []

    for code in prior_codes:
        if code not in {candidate.eccn for candidate in candidates}:
            transitions.append({"candidate": code, "fromStage": "backend_local_rules", "toStage": "canonical_decision", "fromStatus": "proposed", "toStatus": "withdrawn", "reasons": ["not_reproposed_by_canonical_path_rules"]})

    for candidate in candidates:
        path_key = candidate.review_path_id or candidate.review_path_key or ""
        path_key = CANDIDATE_PATH_ALIASES.get(path_key, path_key)
        path = path_by_key.get(path_key)
        triggering_ids = list(path.get("triggeringEvidenceIds", [])) if path else []
        regulatory_ids: list[str] = []
        blocking_reasons: list[str] = []
        rejection_reasons: list[str] = []
        if not path:
            rejection_reasons.append("review_path_not_open")
        if not triggering_ids:
            blocking_reasons.append("no_positive_path_trigger_evidence")
        regulation = candidate.regulation_source
        if not regulation or regulation.verification_status != "current":
            blocking_reasons.append("current_regulatory_text_unavailable")
        if path:
            for assessment in path["requirementAssessments"]:
                if assessment["status"] != "satisfied":
                    blocking_reasons.append(f"{assessment['requirementId'].replace(' ', '_')}_unknown")
        record = {
            **asdict(candidate),
            "proposedByStage": "deterministic_candidate_rules",
            "proposedByProvider": "deterministic",
            "triggeringEvidenceIds": triggering_ids,
            "eligibilityResult": "rejected" if rejection_reasons else "blocked" if blocking_reasons else "eligible",
            "rejectionReasons": rejection_reasons,
            "blockingReasons": list(dict.fromkeys(blocking_reasons)),
            "regulatoryEvidenceIds": regulatory_ids,
            "status": "rejected" if rejection_reasons else "blocked" if blocking_reasons else "eligible",
        }
        if rejection_reasons:
            rejected.append(record)
        elif blocking_reasons:
            blocked.append(record)
        else:
            eligible.append(record)
        transitions.append({
            "candidate": candidate.eccn,
            "fromStage": "deterministic_candidate_rules",
            "toStage": "canonical_decision",
            "fromStatus": "proposed",
            "toStatus": record["status"],
            "reasons": [*rejection_reasons, *blocking_reasons],
        })

    derived = [asdict(spec) for spec in specs if spec.category in {"profile_detection", "normalized_technical_signal"} or spec.name.startswith("heuristic_signal_")]
    optional_components = [
        {"capability": item["fact_type"], "evidenceId": item["id"], "configurationScope": item.get("configuration_scope")}
        for item in source_facts if item.get("polarity") == "ambiguous"
    ]
    capabilities = _capabilities(evidence)
    missing = list(dict.fromkeys(item for path in paths for item in path["missingEvidence"]))
    limitations: list[dict[str, Any]] = []
    if any("current_regulatory_text_unavailable" in item.get("blockingReasons", []) for item in blocked):
        limitations.append({
            **SYSTEM_LIMITATION,
            "affectedPaths": sorted({path["pathKey"] for path in paths}),
            "affectedCandidates": [item["eccn"] for item in blocked if "current_regulatory_text_unavailable" in item.get("blockingReasons", [])],
        })
    abstention = None if paths else "No review path has sufficient positive source evidence."
    return ClassificationDecision(
        run_id=run_id,
        document_ids=[document_id],
        exported_product_form=product_form,
        product_level_profile={"profile": canonical_profile, "confidence": product_form["confidence"] if product_form["value"] != "unknown" else heuristic_result.confidence_summary["score"], "triggeringEvidenceIds": profile_evidence},
        component_level_profiles=component_profiles,
        installed_components=[{"profile": item["profile"], "status": "installed", "evidenceIds": []} for item in component_profiles],
        optional_components=optional_components,
        capabilities=capabilities,
        configuration_scope="configuration_specific" if any(item.get("configuration_scope") == "current_configuration" for item in source_facts) else "mixed_or_unspecified",
        target_entity={"id": resolved_entity["id"], "relationshipToDocument": resolved_entity.get("relationshipToDocument", "primary_subject")},
        source_facts=source_facts,
        derived_facts=derived,
        contradictions=trace.get("contradictions", []),
        profile_resolution_records=profile_resolution,
        open_review_paths=paths,
        rejected_review_paths=[],
        eligible_candidates=eligible,
        blocked_candidate_hypotheses=blocked,
        rejected_candidates=rejected,
        candidate_transitions=transitions,
        company_history_matches={
            "productPrecedents": [], "technicalComparisons": [], "counselGuidance": [],
            "internalPolicy": [], "regulatoryContext": [], "excludedResults": [],
            "retrievalMetadata": {},
        },
        regulatory_evidence=[],
        system_limitations=limitations,
        missing_evidence=missing,
        reviewer_questions=list(dict.fromkeys(question for path in paths for question in path["reviewerQuestions"])),
        confidence={"score": min(float(heuristic_result.confidence_summary["score"]), 0.85), "humanReviewRequired": True},
        abstention_reason=abstention,
        validation_results=[],
        provenance_graph=[{"from": evidence_id, "to": f"path:{path['pathKey']}", "relation": "opens"} for path in paths for evidence_id in path["triggeringEvidenceIds"]],
    )


def semantic_validation_results(
    *,
    decision: ClassificationDecision,
    memo: str,
    specs: list[ExtractedSpec],
    backend_proposed_profile: str | None,
    prior_stage_candidates: list[str],
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    canonical_profile = decision.product_level_profile["profile"]
    memo_profile_match = re.search(r"Canonical product profile:\s*([^\n]+)", memo, re.I)
    memo_profile = memo_profile_match.group(1).strip() if memo_profile_match else None

    def add(code: str, passed: bool, path: str, details: dict[str, Any]) -> None:
        results.append({"code": code, "severity": "blocking" if not passed else "info", "passed": passed, "path": path, "details": details})

    add("MEMO_PROFILE_MATCHES_CANONICAL", memo_profile == canonical_profile, "memo.profile", {"memoProfile": memo_profile, "canonicalProfile": canonical_profile})
    foreign_evidence = [
        item.get("id") for item in decision.source_facts
        if item.get("relationship") in {"describes_entity", "describes_component"}
        and item.get("subject_entity_id") != decision.target_entity.get("id")
    ]
    add("CROSS_ENTITY_EVIDENCE_USED", not foreign_evidence, "decision.sourceFacts", {"targetEntityId": decision.target_entity.get("id"), "evidenceIds": foreign_evidence})
    resolution_exists = any(item.get("proposedProfile") == backend_proposed_profile and item.get("canonicalProfile") == canonical_profile for item in decision.profile_resolution_records)
    add("BACKEND_PROFILE_DIVERGENCE_EXPLAINED", not backend_proposed_profile or backend_proposed_profile == canonical_profile or resolution_exists, "decision.profileResolutionRecords", {"backendProfile": backend_proposed_profile, "canonicalProfile": canonical_profile})
    memo_codes = set(SPECIFIC_ECCN.findall(memo))
    decision_codes = {item["eccn"] for item in [*decision.eligible_candidates, *decision.blocked_candidate_hypotheses, *decision.rejected_candidates]}
    add("MEMO_CANDIDATE_MEMBERSHIP", memo_codes.issubset(decision_codes), "memo.candidates", {"unexpected": sorted(memo_codes - decision_codes)})
    transitioned = {item["candidate"] for item in decision.candidate_transitions}
    add("CANDIDATE_SET_DIFFERENCE_EXPLAINED", set(prior_stage_candidates).issubset(transitioned), "decision.candidateTransitions", {"unexplained": sorted(set(prior_stage_candidates) - transitioned)})
    open_keys = {item["pathKey"] for item in decision.open_review_paths}
    add("MEMO_REFERENCES_CLOSED_ADVANCED_PATH", "advanced comput" not in memo.lower() or "advanced_computing" in open_keys, "memo.recommendation", {"openPaths": sorted(open_keys)})
    add("MEMO_REFERENCES_CLOSED_SECURITY_PATH", "category 5 part 2" not in memo.lower() or "category_5_part_2_security" in open_keys, "memo.recommendation", {"openPaths": sorted(open_keys)})
    tls_present = any(item["key"] == "transport_security" and item["presence"] in {"present", "configuration_dependent"} for item in decision.capabilities)
    denies_network_crypto = bool(re.search(r"does not affirm (?:network )?crypt", memo, re.I))
    add("MEMO_CAPABILITY_POLARITY_CONSISTENT", not (tls_present and denies_network_crypto), "memo.capabilities", {"transportSecurityPresent": tls_present})
    integrity_only = any(item["key"] == "device_integrity_only" and item["presence"] == "present" for item in decision.capabilities)
    network_crypto = any(item["key"] in {"network_confidentiality", "link_layer_encryption", "transport_security"} and item["presence"] in {"present", "configuration_dependent"} for item in decision.capabilities)
    add("CAPABILITY_EXCLUSIVITY_CONTRADICTION", not (integrity_only and network_crypto), "decision.capabilities", {"deviceIntegrityOnly": integrity_only, "networkCryptography": network_crypto})
    unsupported_capabilities = [
        item["key"] for item in decision.capabilities
        if item["presence"] == "present" and not item.get("evidenceIds")
    ]
    add("UNSUPPORTED_CAPABILITY", not unsupported_capabilities, "decision.capabilities", {"capabilities": unsupported_capabilities})
    network_forms = {"smartnic", "network_interface_card", "networking_card", "router", "network_switch"}
    network_form = decision.exported_product_form.get("value") in network_forms
    add("NETWORK_PRODUCT_FORM_UNRESOLVED", not (any("network interface card" in str(item.get("exact_quote", "")).lower() or "smartnic" in str(item.get("exact_quote", "")).lower() for item in decision.source_facts) and decision.exported_product_form.get("value") == "unknown"), "decision.exportedProductForm", {"form": decision.exported_product_form.get("value")})
    add("CAPABILITY_PROFILE_PROMOTED_TO_PRODUCT", not (network_form and canonical_profile == "encryption_or_crypto_device"), "decision.productLevelProfile", {"form": decision.exported_product_form.get("value"), "profile": canonical_profile})
    has_network_evidence = any(item.get("key") in {"networking", "high_speed_ethernet"} and item.get("presence") in {"present", "configuration_dependent"} for item in decision.capabilities)
    add("NETWORK_PATH_MISSING", not (network_form and has_network_evidence and "networking_telecom" not in open_keys), "decision.openReviewPaths", {"openPaths": sorted(open_keys)})
    manufacturers = [spec for spec in specs if spec.name == "manufacturer"]
    valid_manufacturer = all(spec.value.lower() in spec.source_snippet.lower() for spec in manufacturers)
    add("MANUFACTURER_HAS_SOURCE_PROVENANCE", valid_manufacturer, "facts.manufacturer", {"values": [spec.value for spec in manufacturers]})
    identity_specs = [
        spec for spec in specs
        if spec.name in {"product_name", "product_family", "part_number", "document_number", "document_type"}
        and spec.confidence in {"high", "medium"}
    ]
    unsupported_identity = [
        spec.name for spec in identity_specs
        if spec.value.lower() not in spec.source_snippet.lower()
    ]
    add("FACT_PROVENANCE_UNSUPPORTED", not unsupported_identity, "facts.identity", {"factNames": unsupported_identity})
    material_evidence_ids = {
        str(item.get("id")) for item in decision.source_facts
        if item.get("id") and item.get("polarity") in {"present", "ambiguous", "absent"}
    }
    omitted_evidence_ids = sorted(evidence_id for evidence_id in material_evidence_ids if evidence_id not in memo)
    add("MATERIAL_EVIDENCE_OMITTED", not omitted_evidence_ids, "memo.sourceFacts", {"evidenceIds": omitted_evidence_ids})
    incomplete_paths = [item["pathKey"] for item in decision.open_review_paths if not item.get("missingEvidence")]
    add("OPEN_PATH_MISSING_EVIDENCE_COMPLETE", not incomplete_paths, "decision.openReviewPaths", {"paths": incomplete_paths})
    satisfied_as_missing = [
        assessment["requirementId"]
        for path in decision.open_review_paths
        for assessment in path.get("requirementAssessments", [])
        if assessment.get("status") == "satisfied" and assessment.get("requirementId") in path.get("missingEvidence", [])
    ]
    add("MISSING_EVIDENCE_EXCLUDES_SATISFIED_REQUIREMENTS", not satisfied_as_missing, "decision.openReviewPaths", {"requirements": satisfied_as_missing})
    candidate_blocker_gaps = [
        item["eccn"]
        for item in decision.blocked_candidate_hypotheses
        if any(f"{requirement.replace(' ', '_')}_unknown" not in item.get("blockingReasons", [])
               for path in decision.open_review_paths
               if path.get("pathKey") == CANDIDATE_PATH_ALIASES.get(item.get("review_path_id") or item.get("review_path_key") or "", item.get("review_path_id") or item.get("review_path_key") or "")
               for requirement in path.get("missingEvidence", []))
    ]
    add("CANDIDATE_BLOCKERS_COMPLETE", not candidate_blocker_gaps, "decision.candidates", {"candidates": candidate_blocker_gaps})
    blocking_absence_ids = {
        evidence_id for path in decision.open_review_paths for evidence_id in path.get("triggeringEvidenceIds", [])
    }
    blocking_absence_ids.update(
        str(item.get("id")) for item in decision.source_facts if item.get("polarity") == "absent"
    )
    missing_negative_citations = [
        fact_id for fact_id in blocking_absence_ids
        if fact_id and not any(fact_id in line or any(str(fact_id) == str(fact.get("id")) and str(fact.get("exact_quote") or fact.get("raw_value") or "") in memo for fact in decision.source_facts) for line in [memo])
    ]
    add("DECISIVE_NEGATIVE_EVIDENCE_RENDERED", not missing_negative_citations, "memo.sourceEvidence", {"evidenceIds": missing_negative_citations})
    normal_candidate_codes = {item["eccn"] for item in decision.eligible_candidates}
    add("BLOCKED_HYPOTHESES_NOT_ELIGIBLE", not normal_candidate_codes.intersection(item["eccn"] for item in decision.blocked_candidate_hypotheses), "decision.candidates", {})
    return results


def assert_semantically_valid(results: list[dict[str, Any]]) -> None:
    failures = [item for item in results if not item["passed"] and item["severity"] == "blocking"]
    if failures:
        raise ValueError("Semantic validation failed: " + ", ".join(item["code"] for item in failures))
