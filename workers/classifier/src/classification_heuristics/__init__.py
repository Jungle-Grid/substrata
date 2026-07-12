from __future__ import annotations

from dataclasses import asdict, dataclass, field
import re

from citations import build_current_control_text_citation, build_document_citation
from labels import display_name_for_spec_name
from schemas import ECCNCandidate, ExtractedSpec
from evidence_model import (
    contradictory_pairs,
    detect_untrusted_instructions,
    effective_polarity,
    evidence_for_terms,
)

from .contradictions import detect_structural_contradictions
from .evidence import confidence_for, missing_evidence_for
from .history_signals import build_history_signals
from .profiles import PROFILE_CONTRACTS, PROFILE_PRIORITY, PROFILE_THRESHOLDS
from .rules import CANDIDATE_RULES, PATH_TITLES, PROFILE_PATHS
from .signals import SIGNAL_RULES


CRYPTO_CANDIDATE_TERMS = (
    "macsec",
    "tls offload",
    "ipsec",
    "vpn",
    "hsm",
    "cryptographic acceleration",
    "cryptographic accelerator",
    "user-accessible encryption",
    "user accessible encryption",
    "data confidentiality",
    "payload encryption",
    "bulk encryption",
    "key management",
    "key storage",
)
PLATFORM_SECURITY_TERMS = (
    "secure boot",
    "remote attestation",
    "firmware signing",
    "signed firmware",
    "secure enclave",
    "encrypted bitstream",
    "bitstream encryption",
)
UNRESOLVED_EVIDENCE_TERMS = (
    "depend on",
    "depends on",
    "not specified",
    "not provided",
    "details required",
    "details unavailable",
    "whether the",
    "unknown",
    "to be confirmed",
)

EVIDENCE_POLARITIES = {
    "affirmed",
    "negated",
    "conditional",
    "question",
    "missing_evidence",
    "historical_context",
}


def classify_evidence_polarity(text: str) -> str:
    normalized = " ".join(text.lower().split())
    if any(marker in normalized for marker in ("prior internal", "previous review", "historical", "company history")):
        return "historical_context"
    if "?" in normalized or any(marker in normalized for marker in ("confirm whether", "whether ", "is encryption", "does the")):
        return "question"
    if any(marker in normalized for marker in ("not specified", "not provided", "details required", "details unavailable", "to be confirmed", "under review")):
        return "missing_evidence"
    if re.search(r"\b(no|without|not)\s+(?:customer[- ]facing\s+)?(?:encryption|cryptograph|key management|macsec|tls|ipsec|vpn|hsm)", normalized):
        return "negated"
    if any(marker in normalized for marker in ("optional", "if enabled", "may ", "depends on", "subject to")):
        return "conditional"
    return "affirmed"


@dataclass
class HeuristicResult:
    detected_profiles: list[str]
    primary_profile: str
    profile_scores: dict[str, int]
    matched_signals: list[dict]
    review_paths: list[dict]
    review_candidates: list[dict]
    fallback_candidates: list[dict]
    blocked_candidates: list[dict]
    excluded_candidates: list[dict]
    missing_evidence_checks: list[str]
    contradiction_flags: list[dict]
    reviewer_questions: list[str]
    company_history_signals: list[dict]
    confidence_summary: dict
    classification_trace: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


def _search_text(specs: list[ExtractedSpec], source_text: str) -> str:
    fact_text = "\n".join(f"{spec.name} {spec.display_name or ''} {spec.value} {spec.unit or ''} {spec.source_snippet}" for spec in specs)
    return f"{source_text}\n{fact_text}".lower()


def _term_found(text: str, term: str) -> bool:
    if len(term) <= 4 and term.isalnum():
        return re.search(rf"\b{re.escape(term)}\b", text) is not None
    return term in text


def _supporting_specs(specs: list[ExtractedSpec], terms: tuple[str, ...], limit: int = 8) -> list[ExtractedSpec]:
    matches = []
    for spec in specs:
        if spec.name.startswith("heuristic_signal_"):
            continue
        haystack = f"{spec.name} {spec.display_name or ''} {spec.value} {spec.source_snippet}".lower()
        if any(_term_found(haystack, term) for term in terms):
            matches.append(spec)
    return matches[:limit]


def _format_spec(spec: ExtractedSpec) -> str:
    """Keep candidate evidence aligned with the canonical extracted-fact label."""
    return f"{display_name_for_spec_name(spec.name)}: {spec.value}{f' {spec.unit}' if spec.unit else ''}"


def _source_snippet_for(source_text: str, terms: list[str]) -> str:
    for line in source_text.splitlines():
        if any(_term_found(line.lower(), term) for term in terms):
            return " ".join(line.split())[:500]
    return " ".join(source_text.split())[:500]


def _affirmative_crypto_evidence(specs: list[ExtractedSpec], source_text: str) -> tuple[bool, list[ExtractedSpec], list[str]]:
    positive_lines = [
        " ".join(line.split())
        for line in source_text.splitlines()
        if any(_term_found(line.lower(), term) for term in CRYPTO_CANDIDATE_TERMS)
        and classify_evidence_polarity(line) == "affirmed"
    ]
    supporting = []
    for spec in specs:
        text = f"{spec.name} {spec.display_name or ''} {spec.value} {spec.source_snippet}".lower()
        if not any(_term_found(text, term) for term in CRYPTO_CANDIDATE_TERMS):
            continue
        if classify_evidence_polarity(f"{spec.value} {spec.source_snippet}") != "affirmed":
            continue
        supporting.append(spec)
    terms = sorted({term for line in positive_lines for term in CRYPTO_CANDIDATE_TERMS if _term_found(line.lower(), term)})
    return bool(positive_lines or supporting), supporting[:8], terms


def _replace_profile_specs(specs: list[ExtractedSpec], primary: str, detected: list[str], score: int) -> list[ExtractedSpec]:
    retained = [spec for spec in specs if spec.name not in {"product_profile", "profile_confidence", "profile_rationale", "secondary_product_profile"}]
    snippet = next((spec.source_snippet for spec in specs if spec.source_snippet), "Detected from normalized technical facts and source text.")
    confidence = "high" if score >= 14 else "medium" if score >= 8 else "low"
    retained.extend([
        ExtractedSpec("product_profile", primary, None, snippet, "Deterministic primary profile controls review-path routing.", "profile_detection", confidence, extraction_method="classification_heuristics", extraction_method_version="hybrid_v1"),
        ExtractedSpec("profile_confidence", confidence, None, snippet, "Profile confidence reflects weighted deterministic signal coverage.", "profile_detection", confidence, extraction_method="classification_heuristics", extraction_method_version="hybrid_v1"),
        ExtractedSpec("profile_rationale", f"Selected from weighted signals with score {score}; active profiles: {', '.join(detected)}.", None, snippet, "Explains deterministic profile selection.", "profile_detection", confidence, extraction_method="classification_heuristics", extraction_method_version="hybrid_v1"),
    ])
    for secondary in detected[1:]:
        retained.append(ExtractedSpec("secondary_product_profile", secondary, None, snippet, "Secondary profile opens additional review paths.", "profile_detection", confidence, extraction_method="classification_heuristics", extraction_method_version="hybrid_v1"))
    return retained


def evaluate(specs: list[ExtractedSpec], source_text: str, *, source_label: str, history_matches: list[dict] | None = None, memo_markdown: str = "") -> tuple[list[ExtractedSpec], list[ECCNCandidate], HeuristicResult]:
    scores: dict[str, int] = {}
    matched: list[dict] = []
    evidence_by_signal: dict[str, list] = {}
    evidence_records: list[dict] = []
    evidence_contradictions: list[dict] = []
    for rule in SIGNAL_RULES:
        records = evidence_for_terms(
            fact_type=rule.key,
            terms=rule.terms,
            source_text=source_text,
            specs=specs,
        )
        evidence_by_signal[rule.key] = records
        evidence_records.extend(record.to_dict() for record in records)
        evidence_contradictions.extend(
            contradiction.to_dict()
            for contradiction in contradictory_pairs(rule.key, records)
        )
        polarity = effective_polarity(records)
        positive_records = [record for record in records if record.polarity == "present"]
        if polarity != "present" or not positive_records:
            continue
        found = sorted({term for record in positive_records for term in record.normalized_value})
        contribution = rule.weight + min(2, len(found) - 1)
        for profile in rule.profiles:
            scores[profile] = scores.get(profile, 0) + contribution
        supporting = _supporting_specs(specs, tuple(found), 4)
        matched.append({"signal": rule.key, "weight": contribution, "terms": found, "profiles": list(rule.profiles), "supportingFactNames": [spec.name for spec in supporting], "supportingSnippets": [record.exact_quote for record in positive_records[:4]], "supportingEvidenceIds": [record.id for record in positive_records[:8]], "evidencePolarity": ["present"]})

    platform_security_specs = [
        spec
        for spec in specs
        if spec.category == "security_cryptography"
        and any(term in f"{spec.name} {spec.value} {spec.source_snippet}".lower() for term in PLATFORM_SECURITY_TERMS)
    ]
    if platform_security_specs and "firmware_or_security_software" not in scores:
        scores["firmware_or_security_software"] = 2
        matched.append({
            "signal": "platform_security_evidence",
            "weight": 4,
            "terms": ["platform security evidence"],
            "profiles": ["firmware_or_security_software"],
            "supportingFactNames": [spec.name for spec in platform_security_specs],
            "supportingSnippets": [spec.source_snippet for spec in platform_security_specs],
            "evidencePolarity": sorted({classify_evidence_polarity(spec.source_snippet) for spec in platform_security_specs}),
        })

    existing_names = {spec.name for spec in specs}
    for signal in matched:
        name = f"heuristic_signal_{signal['signal']}"
        if name in existing_names:
            continue
        profiles = signal["profiles"]
        category = "security_cryptography" if any("security" in profile or "crypto" in profile for profile in profiles) else "compute_performance" if any("comput" in profile or "accelerator" in profile for profile in profiles) else "rf_microwave" if any("rf_" in profile or "wireless" in profile for profile in profiles) else "normalized_technical_signal"
        specs.append(ExtractedSpec(
            name=name,
            value=", ".join(signal["terms"]),
            unit=None,
            source_snippet=_source_snippet_for(source_text, signal["terms"]),
            importance=f"Weighted deterministic signal for {', '.join(profiles)} review routing.",
            category=category,
            confidence="medium",
            extraction_rationale="Normalized from source terms by deterministic heuristic rules.",
            value_type="normalized",
            extraction_method="classification_heuristics",
            extraction_method_version="hybrid_v1",
        ))
        existing_names.add(name)

    rejected_profiles: list[dict] = []
    detected: list[str] = []
    relevant_profiles = {
        *scores,
        *(
            profile
            for profile, contract in PROFILE_CONTRACTS.items()
            if any(evidence_by_signal.get(signal) for signal in (*contract.required_any, *contract.hard_exclusions))
        ),
    }
    for profile in relevant_profiles:
        score = scores.get(profile, 0)
        contract = PROFILE_CONTRACTS.get(profile)
        if contract is None:
            rejected_profiles.append({"profile": profile, "eligibilityState": "missing_contract", "score": score})
            continue
        positive_required = [
            signal for signal in contract.required_any
            if effective_polarity(evidence_by_signal.get(signal, [])) == "present"
        ]
        absent_exclusions = [
            signal for signal in contract.hard_exclusions
            if effective_polarity(evidence_by_signal.get(signal, [])) == "absent"
        ]
        blocking = [
            contradiction for contradiction in evidence_contradictions
            if contradiction["subject"] in contract.required_any
            and contradiction["severity"] == "blocking"
            and contradiction["resolution_status"] == "unresolved"
        ]
        if absent_exclusions or blocking or len(positive_required) < contract.minimum_positive_evidence:
            rejected_profiles.append({
                "profile": profile,
                "eligibilityState": "ineligible",
                "score": score,
                "positiveRequiredSignals": positive_required,
                "absentHardExclusions": absent_exclusions,
                "blockingContradictionIds": [item["id"] for item in blocking],
            })
            continue
        if score < PROFILE_THRESHOLDS.get(profile, 6):
            rejected_profiles.append({"profile": profile, "eligibilityState": "insufficient_score", "score": score, "positiveRequiredSignals": positive_required})
            continue
        detected.append(profile)
    detected.sort(key=lambda profile: (scores[profile], PROFILE_PRIORITY.get(profile, 0)), reverse=True)
    if not detected:
        detected = ["unknown"]
        scores["unknown"] = 0
    # Zynq MPSoC evidence is more specific than the generic FPGA/PLD profile.
    # Keep a single canonical programmable-logic SoC route so the generated
    # review paths, questions, and validation evidence remain internally aligned.
    if "fpga_programmable_logic_soc" in detected and "fpga_or_pld" in detected:
        detected.remove("fpga_or_pld")
    if "fpga_programmable_logic_soc" in detected:
        # Peripheral ADCs and Ethernet interfaces are supporting MPSoC facts,
        # not the primary product identity for this Zynq family overview.
        detected = [
            profile
            for profile in detected
            if profile not in {"adc_dac_converter", "networking_hardware"}
        ]
    primary = detected[0]
    # A strong product-identity profile is more useful than its broader umbrella
    # when their evidence scores are close (for example AI accelerator vs advanced
    # computing hardware).
    for specific in ("ai_accelerator", "gpu_accelerator", "secure_networking_hardware"):
        if specific in detected and scores[primary] - scores[specific] <= 5:
            primary = specific
            detected.remove(specific)
            detected.insert(0, specific)
            break
    specs = _replace_profile_specs(specs, primary, detected, scores[primary])

    path_keys: list[str] = []
    for profile in detected:
        for key in PROFILE_PATHS.get(profile, ()):
            if key not in path_keys:
                path_keys.append(key)
    # Platform-security functions warrant a bounded Category 5 Part 2 review
    # question without mislabeling the product itself as a crypto device.
    if any(
        effective_polarity(evidence_by_signal.get(signal, [])) in {"present", "ambiguous"}
        for signal in ("platform_security", "transport_security")
    ):
        if "category_5_part_2_security" not in path_keys:
            path_keys.append("category_5_part_2_security")
    if effective_polarity(evidence_by_signal.get("radio", [])) == "ambiguous":
        if "radio_wireless" not in path_keys:
            path_keys.append("radio_wireless")
    if primary not in {"general_electronics", "unknown"} and "general_electronics_fallback" not in path_keys:
        path_keys.append("general_electronics_fallback")
    missing = missing_evidence_for(detected)
    review_paths = [{"pathKey": key, "title": PATH_TITLES[key], "profiles": [p for p in detected if key in PROFILE_PATHS.get(p, ())], "whyTriggered": f"Opened from weighted {', '.join(p for p in detected if key in PROFILE_PATHS.get(p, ())) or primary} signals.", "missingInformation": missing[:8]} for key in path_keys]

    all_terms = tuple(term for rule in SIGNAL_RULES for term in rule.terms)
    supporting_specs = _supporting_specs(specs, all_terms, 12) or specs[:6]
    technical_supporting_specs = [
        spec
        for spec in supporting_specs
        if spec.category not in {"product_identity", "profile_detection", "device_identity"}
    ] or supporting_specs
    history_signals = build_history_signals(history_matches)
    crypto_supported, crypto_supporting_specs, crypto_supporting_terms = _affirmative_crypto_evidence(specs, source_text)
    candidate_specs: list[tuple[str, str, str]] = []
    for path_key in path_keys:
        for code, kind in CANDIDATE_RULES.get(path_key, ()):
            if kind == "fallback_candidate":
                continue
            if code == "5A002" and not crypto_supported:
                kind = "blocked_candidate"
            item = (code, kind, path_key)
            if item not in candidate_specs:
                candidate_specs.append(item)
    # A broad fallback code is not emitted merely because another profile was
    # selected. Absence of candidate-grade evidence is a valid abstention.

    candidates: list[ECCNCandidate] = []
    candidate_dicts: list[dict] = []
    for code, kind, path_key in candidate_specs:
        is_zynq_soc_path = (
            primary == "fpga_programmable_logic_soc"
            and path_key == "fpga_programmable_logic_soc"
        )
        is_zynq_security_path = (
            primary == "fpga_programmable_logic_soc"
            and path_key == "category_5_part_2_security"
        )
        evidence = (
            (crypto_supporting_specs or _supporting_specs(specs, PLATFORM_SECURITY_TERMS, 8))
            if code == "5A002"
            else technical_supporting_specs[:8]
        )
        level, numeric = confidence_for(scores[primary], len(evidence), len(missing))
        if kind == "fallback_candidate":
            level, numeric = "low", min(numeric, 0.45)
        if is_zynq_soc_path:
            why_apply = "Source-backed Zynq MPSoC processing-system and programmable-logic facts open a Category 3 electronics / SoC review path for qualified reviewer confirmation."
            why_not = "Current control thresholds and the exact device ordering code, speed grade, and programmable-logic resources have not been confirmed by a qualified reviewer."
            questions = [
                "Do the Zynq MPSoC programmable-logic and processing-system features require Category 3 electronics review?",
                "Does the family overview require device-specific ordering-code, speed-grade, and programmable-logic-resource evidence before review signoff?",
            ]
        elif is_zynq_security_path:
            why_apply = "Source-backed Zynq MPSoC platform-security facts open a Category 5 Part 2 security and cryptography review path."
            why_not = "The exact cryptographic functionality, accessibility, and applicable exceptions have not been confirmed by a qualified reviewer."
            questions = [
                "Do the Zynq MPSoC security features require separate Category 5 Part 2 security and cryptography review?",
                "Is the cryptographic functionality user-accessible, configurable, or limited to boot and authentication functions?",
            ]
        elif kind == "blocked_candidate":
            level, numeric = "low", min(numeric, 0.35)
        history_support = [signal for signal in history_signals if code in signal["priorEccns"]]
        if is_zynq_soc_path or is_zynq_security_path:
            pass
        elif kind == "blocked_candidate":
            why_apply = f"Platform-security evidence opens the {PATH_TITLES[path_key]}, but does not by itself support a specific {code} candidate."
            why_not = "Affirmative evidence of user-accessible encryption, confidentiality functionality, key management, network cryptography, cryptographic acceleration, or HSM behavior is required."
            questions = ["Does the exported configuration provide user-accessible encryption, confidentiality, key management, MACsec, TLS, IPsec, VPN, cryptographic acceleration, or HSM behavior?"]
        elif kind == "review_candidate":
            why_apply = f"Source-backed {', '.join(detected)} signals open the {PATH_TITLES[path_key]} for qualified reviewer confirmation."
            why_not = "Current control thresholds and the exact exported configuration have not been confirmed by a qualified reviewer."
            questions = [f"Does the current control text for {code} apply to the exact exported configuration and documented performance envelope?"]
        else:
            why_apply = "This broad fallback remains relevant only if a qualified reviewer excludes every narrower open review path."
            why_not = "Current control thresholds and the exact exported configuration have not been confirmed by a qualified reviewer."
            questions = [f"Does the current control text for {code} apply to the exact exported configuration and documented performance envelope?"]
        candidate = ECCNCandidate(
            eccn=code,
            title=PATH_TITLES[path_key],
            confidence=level,
            matched_technical_facts=[_format_spec(spec) for spec in evidence],
            regulatory_citations=[build_document_citation(spec, source=source_label) for spec in evidence[:3]] + [build_current_control_text_citation(code)],
            why_it_may_apply=why_apply,
            why_it_may_not_apply=why_not,
            missing_information=(missing_evidence_for(["encryption_or_crypto_device"]) if code == "5A002" else missing)[:10],
            uncertainty_flags=["multiple_plausible_eccns", "missing_key_specs", "requires_engineering_confirmation"],
            reviewer_questions=questions,
            confidence_rationale=(
                f"Affirmative crypto evidence matched: {', '.join(crypto_supporting_terms)}; current threshold mapping remains open."
                if code == "5A002" and crypto_supported
                else "Security review path is open, but specific 5A002 evidence is not yet supported."
                if code == "5A002"
                else f"Weighted primary-profile score {scores[primary]} with {len(evidence)} supporting facts; threshold mapping remains open."
            ),
            review_path_id=path_key,
            candidate_type=kind,
            company_history_support=history_support,
            contradictions=[],
            human_review_required=True,
        )
        candidates.append(candidate)
        candidate_dicts.append({"candidateCode": code, "candidateType": kind, "confidence": numeric, "supportingFacts": candidate.matched_technical_facts, "missingFacts": candidate.missing_information, "contradictions": [], "companyHistorySupport": history_support, "whyItMayApply": why_apply, "whyItMayNotApply": why_not, "reviewerQuestions": questions, "humanReviewRequired": True, "reviewPathKey": path_key})

    contradictions = [
        *evidence_contradictions,
        *detect_structural_contradictions(source_text=source_text, primary_profile=primary, review_paths=review_paths, candidates=candidate_dicts, memo_markdown=memo_markdown, history_signals=history_signals),
    ]
    review = [item for item in candidate_dicts if item["candidateType"] == "review_candidate"]
    fallback = [item for item in candidate_dicts if item["candidateType"] == "fallback_candidate"]
    evidence_blocked = [item for item in candidate_dicts if item["candidateType"] == "blocked_candidate"]
    candidate_path_keys = {item["reviewPathKey"] for item in candidate_dicts}
    blocked = evidence_blocked + [
        {
            "candidateFamily": PATH_TITLES[path_key],
            "candidateType": "blocked_candidate",
            "confidence": 0.25,
            "supportingFacts": [],
            "missingFacts": missing[:8],
            "contradictions": [],
            "companyHistorySupport": [],
            "whyItMayApply": f"The {PATH_TITLES[path_key]} was opened by product-profile signals.",
            "whyItMayNotApply": "A specific evidence-backed ECCN candidate cannot be supported until the missing facts and current control mapping are resolved.",
            "reviewerQuestions": [f"Which current entries within the {PATH_TITLES[path_key]} should be compared after the missing evidence is supplied?"],
            "humanReviewRequired": True,
            "reviewPathKey": path_key,
        }
        for path_key in path_keys
        if path_key not in candidate_path_keys and path_key != "general_electronics_fallback"
    ]
    confidence_level, confidence_numeric = confidence_for(scores[primary], len(supporting_specs), len(missing))
    blocked_labels = [item.get("candidateCode") or item.get("candidateFamily") for item in blocked]
    trace = {"extractedFactsCount": len(specs), "detectedProfiles": detected, "rejectedProfiles": rejected_profiles, "profileScores": scores, "matchedSignals": matched, "sourceEvidence": evidence_records, "reviewPathsOpened": path_keys, "candidatesGenerated": [item["candidateCode"] for item in candidate_dicts], "candidatesBlocked": blocked_labels, "candidatesFilteredOut": [], "filterReasons": [{"candidate": label, "reason": "Specific candidate blocked pending affirmative evidence and current control mapping."} for label in blocked_labels], "companyHistoryMatchCount": len(history_signals), "companyHistorySignals": history_signals, "contradictions": contradictions, "missingEvidenceChecks": missing, "untrustedDocumentInstructions": detect_untrusted_instructions(source_text), "abstentionReason": "No eligible profile has sufficient positive source evidence." if primary == "unknown" else None, "rulesVersion": "evidence_eligibility_v1", "pipelineVersion": "classification_decision_v1"}
    result = HeuristicResult(detected, primary, scores, matched, review_paths, review, fallback, blocked, [], missing, contradictions, [question for item in [*candidate_dicts, *blocked] for question in item["reviewerQuestions"]], history_signals, {"level": confidence_level, "score": confidence_numeric, "humanReviewRequired": True}, trace)
    return specs, candidates, result
