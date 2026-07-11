from __future__ import annotations


SECURITY_TERMS = ("encrypt", "crypto", "tls", "ipsec", "macsec", "secure boot", "key management", "firmware signing", "remote attestation")
AI_TERMS = ("ai accelerator", "tops", "tflops", "hbm3", "hbm3e")


def detect_structural_contradictions(*, source_text: str, primary_profile: str, review_paths: list[dict], candidates: list[dict], memo_markdown: str = "", history_signals: list[dict] | None = None) -> list[dict]:
    combined = source_text.lower()
    memo = memo_markdown.lower()
    path_text = " ".join(path["title"] for path in review_paths).lower()
    flags: list[dict] = []
    if any(term in combined for term in AI_TERMS) and primary_profile == "general_electronics":
        flags.append({"code": "specific_compute_signals_with_generic_profile", "severity": "error", "message": "AI/advanced-computing signals conflict with a general-electronics primary profile."})
    if any(term in combined for term in SECURITY_TERMS) and "security" not in path_text and "crypto" not in path_text:
        flags.append({"code": "security_features_without_review_path", "severity": "error", "message": "Security features were extracted but no security/cryptography review path was opened."})
    if any(term in combined for term in SECURITY_TERMS) and ("no security features" in memo or "cryptography features were not found" in memo):
        flags.append({"code": "memo_denies_extracted_security", "severity": "error", "message": "The memo denies security features that appear in source evidence."})
    if candidates and ("no specific eccn candidates" in memo or "no review candidates" in memo):
        flags.append({"code": "memo_denies_generated_candidates", "severity": "error", "message": "The memo says no candidates exist even though heuristic candidates were generated."})
    if history_signals and "no comparable prior company history" in memo:
        flags.append({"code": "memo_denies_company_history", "severity": "error", "message": "The memo says no company history was found even though relevant matches exist."})
    return flags
