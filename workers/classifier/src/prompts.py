from __future__ import annotations

import json
from typing import Any


SUPPORTED_PROFILES = "\n".join(
    [
        "- adc_dac_converter",
        "- rf_transceiver",
        "- mcu_processor_soc",
        "- fpga_programmable_logic_soc",
        "- crypto_security_device",
        "- generic_electronics",
    ]
)

EXTRACTION_SYSTEM_PROMPT = """You extract source-grounded technical facts from public semiconductor and advanced-hardware datasheets for a draft ECCN review memo.
You do not make final legal, export-control, ECCN, license, or compliance determinations.
You return strict JSON only."""

EXTRACTION_PROMPT_TEMPLATE = """Given the extracted datasheet text below, identify the product profile and extract classification-relevant facts with source snippets.

Supported product profiles:
{supported_profiles}

Return strict JSON with exactly this shape:
{{
  "productProfile": {{
    "profile": "...",
    "confidence": "high | medium | low",
    "rationale": "...",
    "supportingSnippets": ["..."],
    "secondaryProfiles": ["..."]
  }},
  "productIdentity": {{
    "manufacturer": "...",
    "productName": "...",
    "productFamily": "...",
    "partNumber": "...",
    "documentNumber": "...",
    "documentType": "...",
    "isFamilyOverview": true
  }},
  "extractedFacts": [
    {{
      "name": "...",
      "displayName": "...",
      "value": "...",
      "unit": "...",
      "category": "...",
      "sourceSnippet": "...",
      "importance": "...",
      "confidence": "high | medium | low"
    }}
  ],
  "missingFacts": [
    {{
      "name": "...",
      "category": "...",
      "whyItMatters": "...",
      "status": "not_found_in_provided_text"
    }}
  ],
  "warnings": ["..."]
}}

Extraction rules:
- Only extract facts supported by the provided document text.
- Every extracted fact must include a short exact source snippet from the document.
- Do not invent facts.
- Do not present Substrata as assigning an ECCN.
- Do not quote legal/regulatory text from memory.
- Do not treat document numbers as part numbers.
- Do not classify a product by a minor peripheral.
- For SoC/FPGA docs, an internal ADC peripheral does not make the product an ADC.
- "64-bit Arm Cortex-A53" means processor architecture, not ADC resolution.
- "ECC" near memory/cache/TCM/RAM means error-correcting code, not elliptic-curve cryptography.
- "ECC" only means elliptic-curve cryptography if nearby text says elliptic curve, ECDSA, ECDH, public key, signature, certificate, cryptographic, or key exchange.
- Prefer omitting uncertain facts over showing false facts.
- Keep missingFacts concise; do not let missing facts dominate the result.

Profile-specific extraction guidance:
- ADC/DAC: part number, manufacturer, ADC/DAC type, resolution, sample rate, channel modes, input bandwidth, usable input frequency, JESD interface, serial lane rate, package, power, application examples, radiation/security missing indicators.
- RF transceiver: RF frequency range, Rx/Tx channels, bandwidth, LO/PLL/synthesizer only when RF context is clear, baseband interface, ADC/DAC subcomponents as subcomponents, SDR/radar/communications/application language.
- MCU/processor/SoC: CPU core, architecture bits, core count, clock speed, GPU/NPU/DSP, memory/cache, external memory interfaces, connectivity/display/camera/audio interfaces, secure boot, crypto/security functions, peripheral ADC/DAC only as peripherals. Do not use programmable-logic, FPGA fabric, PL/PS, or Zynq wording for this profile unless those exact terms appear in the document.
- FPGA/programmable logic SoC: product family, programmable logic / FPGA fabric, processing system, CPU cores, GPU, DSP slices / LUTs / BRAM / UltraRAM if present, high-speed transceivers / SerDes, PCIe / Ethernet / USB / DisplayPort, secure boot / AES / SHA / RSA, ECC memory/cache as error correction, peripheral ADC only as peripheral.
- Crypto/security device: secure element / TPM / HSM / authenticator, AES / RSA / ECC only with elliptic context / SHA, key storage, secure boot, certificates/signatures, tamper resistance.

Document title: {document_title}
File name: {file_name}

Datasheet text:
<<<DATASHEET_TEXT
{document_text}
DATASHEET_TEXT
>>>"""

MEMO_SYSTEM_PROMPT = """You draft conservative Markdown ECCN review memos for expert human review.
Use only the provided structured facts and local review paths.
Do not present completed ECCN, legal, compliance, license, exception, or control-status determinations."""

MEMO_PROMPT_TEMPLATE = """Draft a standalone Markdown ECCN review memo from the provided product profile, extracted facts, missing facts, and locally generated review paths.

Memo requirements:
- Be Markdown.
- Include a draft-only disclaimer.
- Use only provided facts and review paths.
- Do not invent ECCN rules, legal conclusions, or control-status outcomes.
- Do not include raw JSON.
- Do not say placeholder, mock, or not extracted.
- Include source-grounded fact summaries.
- Include recommended review paths.
- Include uncertainty flags.
- Include reviewer questions.
- Include review state.
- Keep wording conservative and positive: use "recommended review path", "comparison path", "ECCN review recommendation", and "expert review recommended"; present review recommendations, not completed classifications.

Required structure:
# Draft ECCN Review Memo — [Product Name or Document Title]
## 1. Document Summary
Title, file name, manufacturer, product family / part number / document number, detected product profile, profile confidence, generated timestamp, disclaimer.
## 2. Extracted Technical Facts
Group facts by profile-appropriate categories. For each fact include display name, value, confidence, source snippet, and why it matters.
## 3. Recommended Review Paths
For each review path include title, confidence, why it may apply, why it may not apply, matched facts, citations, missing information, reviewer questions, and uncertainty flags.
## 4. Key Uncertainties
## 5. Reviewer Questions
## 6. ECCN Review Recommendation
Conservative recommendation: summarize the review paths Substrata recommends and the next expert-review confirmations needed.
## 7. Review State
status, reviewer, note.

Input package:
```json
{memo_input_json}
```"""


def build_extraction_prompt(*, document_title: str, file_name: str, document_text: str) -> str:
    return EXTRACTION_PROMPT_TEMPLATE.format(
        supported_profiles=SUPPORTED_PROFILES,
        document_title=document_title,
        file_name=file_name,
        document_text=document_text,
    )


def build_memo_prompt(memo_input: dict[str, Any]) -> str:
    return MEMO_PROMPT_TEMPLATE.format(memo_input_json=json.dumps(memo_input, indent=2))
