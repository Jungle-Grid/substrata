from __future__ import annotations

from dataclasses import asdict, dataclass
import re
from typing import Any

from schemas import ECCNCandidate, ExtractedSpec


SPECIFIC_ECCN = re.compile(r"\b[0-9][A-Z][0-9]{3}(?:\.[A-Za-z0-9]+|[A-Za-z0-9]*)?\b")


@dataclass
class ClassificationDecision:
    run_id: str
    document_ids: list[str]
    source_facts: list[dict[str, Any]]
    derived_facts: list[dict[str, Any]]
    contradictions: list[dict[str, Any]]
    eligible_profiles: list[dict[str, Any]]
    rejected_profiles: list[dict[str, Any]]
    selected_primary_profile: dict[str, Any] | None
    open_review_paths: list[dict[str, Any]]
    rejected_review_paths: list[dict[str, Any]]
    eccn_candidates: list[dict[str, Any]]
    rejected_candidates: list[dict[str, Any]]
    company_history_matches: list[dict[str, Any]]
    regulatory_evidence: list[dict[str, Any]]
    missing_evidence: list[str]
    reviewer_questions: list[str]
    confidence: dict[str, Any]
    abstention_reason: str | None
    validation_results: list[dict[str, Any]]
    provenance_graph: list[dict[str, str]]
    schema_version: str = "classification_decision_v1"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def build_classification_decision(
    *,
    run_id: str,
    document_id: str,
    specs: list[ExtractedSpec],
    candidates: list[ECCNCandidate],
    heuristic_result: Any,
) -> ClassificationDecision:
    trace = heuristic_result.classification_trace
    source_facts = trace.get("sourceEvidence", [])
    source_ids = {item.get("id") for item in source_facts}
    derived = [
        asdict(spec) for spec in specs
        if spec.category in {"profile_detection", "normalized_technical_signal"}
        or spec.name.startswith("heuristic_signal_")
    ]
    validations: list[dict[str, Any]] = []
    accepted: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    provenance: list[dict[str, str]] = []

    for candidate in candidates:
        candidate_dict = asdict(candidate)
        positive_source_ids = {
            evidence_id
            for signal in trace.get("matchedSignals", [])
            for evidence_id in signal.get("supportingEvidenceIds", [])
            if evidence_id in source_ids
        }
        regulation = candidate.regulation_source
        regulation_available = bool(regulation and regulation.verification_status == "current")
        blocking = [
            item for item in trace.get("contradictions", [])
            if item.get("severity") == "blocking" and item.get("resolution_status") == "unresolved"
        ]
        reasons: list[str] = []
        if not positive_source_ids:
            reasons.append("candidate_has_no_positive_source_evidence")
        if blocking:
            reasons.append("candidate_has_blocking_contradiction")
        if not regulation_available:
            reasons.append("current_regulatory_text_unavailable")
        if reasons:
            candidate.candidate_type = "blocked_candidate"
            candidate.confidence = "low"
            candidate.contradictions = [*blocking, *({"code": reason} for reason in reasons)]
            candidate_dict = asdict(candidate)
            rejected.append({**candidate_dict, "eligibilityState": "incomplete", "rejectionReasons": reasons})
        else:
            accepted.append({**candidate_dict, "eligibilityState": "eligible"})
        for evidence_id in positive_source_ids:
            provenance.append({"from": evidence_id, "to": f"candidate:{candidate.eccn}", "relation": "supports"})

    primary = heuristic_result.primary_profile
    abstention = trace.get("abstentionReason")
    if primary == "unknown" and not abstention:
        abstention = "No eligible profile has sufficient positive source evidence."
    validations.append({
        "code": "PRIMARY_PROFILE_ABSTENTION",
        "passed": primary != "unknown" or bool(abstention),
    })
    validations.append({
        "code": "CANDIDATES_REQUIRE_SOURCE_EVIDENCE_AND_CURRENT_REGULATION",
        "passed": not accepted or all(item.get("eligibilityState") == "eligible" for item in accepted),
    })
    return ClassificationDecision(
        run_id=run_id,
        document_ids=[document_id],
        source_facts=source_facts,
        derived_facts=derived,
        contradictions=trace.get("contradictions", []),
        eligible_profiles=[{"profile": profile, "score": trace.get("profileScores", {}).get(profile, 0)} for profile in heuristic_result.detected_profiles if profile != "unknown"],
        rejected_profiles=trace.get("rejectedProfiles", []),
        selected_primary_profile=None if primary == "unknown" else {"profile": primary, "score": trace.get("profileScores", {}).get(primary, 0)},
        open_review_paths=heuristic_result.review_paths,
        rejected_review_paths=[],
        eccn_candidates=accepted,
        rejected_candidates=rejected,
        company_history_matches=[],
        regulatory_evidence=[asdict(candidate.regulation_source) for candidate in candidates if candidate.regulation_source],
        missing_evidence=heuristic_result.missing_evidence_checks,
        reviewer_questions=heuristic_result.reviewer_questions,
        confidence=heuristic_result.confidence_summary,
        abstention_reason=abstention,
        validation_results=validations,
        provenance_graph=provenance,
    )


def validate_memo_against_decision(memo: str, decision: ClassificationDecision) -> list[dict[str, Any]]:
    allowed_candidates = {
        item["eccn"] for item in [*decision.eccn_candidates, *decision.rejected_candidates]
    }
    mentioned = set(SPECIFIC_ECCN.findall(memo))
    results = [{
        "code": "MEMO_CANDIDATE_MEMBERSHIP",
        "passed": mentioned.issubset(allowed_candidates),
        "details": sorted(mentioned - allowed_candidates),
    }]
    blocking = [
        item for item in decision.contradictions
        if item.get("severity") == "blocking" and item.get("resolution_status") == "unresolved"
    ]
    results.append({
        "code": "MEMO_BLOCKING_CONTRADICTION_DISCLOSURE",
        "passed": not blocking or "contradiction" in memo.lower(),
        "details": [item.get("id") for item in blocking],
    })
    if not all(item["passed"] for item in results):
        failures = ", ".join(item["code"] for item in results if not item["passed"])
        raise ValueError(f"Memo violates validated decision invariants: {failures}")
    return results
