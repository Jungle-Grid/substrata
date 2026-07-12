"""Deterministic mention typing and entity resolution before canonical v2.

Identifiers are only raw mentions.  A value becomes an independently
classifiable product only when its local structure and wording establish it as
the subject of a product description; specifications and internal references
remain attached context.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
import os
import re
from typing import Any

PART_OR_MODEL = re.compile(r"\b[A-Z]{2,}[A-Z0-9-]*\d[A-Z0-9-]*\b")
NON_PRODUCT_IDENTIFIER = re.compile(r"^(?:JESD|JEDEC|ANSI|ISO|IEEE|PCI|PCIE|USB|DDR|HBM|ARM|AES|RSA|SHA|JS)-?[A-Z0-9.-]*$", re.I)
HISTORY_ID = re.compile(r"\b(?:[A-Z]{2,12}-)?(?:19|20)\d{2}-\d{2,8}\b|\b(?:CASE|CLASS|MEMO|REV)[-_]?\d{2,8}\b", re.I)
KEY_VALUE = re.compile(r"^\s*([A-Za-z][A-Za-z /_-]{1,48})\s*:\s*(.+?)\s*$")
LIST_ITEM = re.compile(r"^\s*(?:\d+[.)]|[-*])\s*(.+)$")
INSTRUCTION = re.compile(r"\b(?:should\s+(?:surface|return|show|match)|expected\s+(?:result|behavior)|test\s+(?:case|manifest)|fixture|verify\s+that|use\s+this\s+(?:file|document))\b", re.I)
PRODUCT_CUE = re.compile(r"\b(?:product|model|part number|device|system|module|card|nic|appliance|gateway|adapter|server|switch|router|sensor|accelerator|board|kit)\b", re.I)
HISTORY_CUE = re.compile(r"\b(?:prior|internal|history|precedent|previous|classification|review|case|memo|record|compare(?:d)?\s+with|similar\s+to)\b", re.I)
REFERENCE_CONTEXT = re.compile(
    r"\b(?:compare(?:d)?\s+(?:with|against|to)|comparison\s+(?:with|against|to)|"
    r"should\s+(?:surface|retrieve|trigger)|retrieve\s+(?:the\s+)?prior|similar\s+to|"
    r"prior\s+(?:product|record|memo)|previous\s+model|based\s+on\s+(?:the\s+)?earlier|"
    r"internal\s+record|prior\s+memo|classification\s+precedent|historical\s+review|"
    r"related\s+product|use\s+as\s+comparison|benchmark\s+against|replacement\s+for|"
    r"compatible\s+with)\b",
    re.I,
)
PREDECESSOR_CONTEXT = re.compile(r"\b(?:predecessor|previous\s+generation|succeeds|replaces)\b", re.I)
SUCCESSOR_CONTEXT = re.compile(r"\b(?:successor|next\s+generation)\b", re.I)
COMPETITOR_CONTEXT = re.compile(r"\b(?:competitor|competing\s+(?:product|model))\b", re.I)
EXAMPLE_CONTEXT = re.compile(r"\b(?:example|for\s+example|e\.g\.)\b", re.I)
CONTAINMENT = re.compile(r"\b(?:includes?|contains?|populated with|ships with|integrates?|installed|embedded|included|bill of materials)\b", re.I)
ATTRIBUTE_KEY = re.compile(r"\b(?:memory|capacity|performance|throughput|interface|processor|bandwidth|form factor|configuration|frequency|storage|radio|wireless|encryption|algorithm|firmware|power|voltage|dimension)\b", re.I)
SPECIFICATION = re.compile(
    r"(?:\b\d+(?:\.\d+)?\s*(?:[KMGTPE]?B|bits?|bytes?|GHz|MHz|Gbps|GbE|GSPS|TOPS|TFLOPS|W|V|nm)\b|"
    r"\b(?:HBM\d*[A-Z]*|DDR\d+|PCIe\s*(?:Gen)?\d+(?:\s*x\d+)?|ARM\s+Cortex-[A-Z]\d+|"
    r"(?:Wi-?Fi|BLE|Bluetooth)\s*\d(?:\.\d+)?|NVMe|AES-?\d+|RSA-?\d+)\b)", re.I,
)
MIN_OWNED_PRODUCT_EVIDENCE = max(1, int(os.getenv("SUBSTRATA_MIN_OWNED_PRODUCT_EVIDENCE", "1")))


@dataclass(frozen=True)
class EntityMention:
    id: str
    rawText: str
    normalizedText: str
    sourceSpanId: str
    lineNumber: int
    confidence: float
    proposedType: str


@dataclass(frozen=True)
class ResolvedEntity:
    id: str
    entityType: str
    canonicalName: str | None
    partNumbers: list[str]
    aliases: list[str]
    mentionIds: list[str]
    sourceSpanIds: list[str]
    confidence: float
    relationshipToDocument: str
    independentlyClassifiable: bool
    parentEntityId: str | None
    supportingEvidenceIds: list[str]
    # Compatibility fields used by the worker intake/UI trace.
    productName: str | None
    sourceText: str
    ownedTechnicalEvidenceIds: list[str] = field(default_factory=list)
    referenceEvidenceIds: list[str] = field(default_factory=list)
    ownedTechnicalEvidenceCount: int = 0
    hasDedicatedSection: bool = False
    hasDedicatedSpecificationBlock: bool = False
    classificationEligible: bool = False
    historyRetrievalEligible: bool = False
    comparisonEligible: bool = False
    componentEligible: bool = False
    reasonCodes: list[str] = field(default_factory=list)


ProductEntity = ResolvedEntity


@dataclass(frozen=True)
class DocumentQualification:
    documentRole: str
    classifiability: str
    entities: list[ResolvedEntity]
    independentProductEntityCount: int
    reasons: list[str]
    productMentionCount: int = 0
    historyReferenceCount: int = 0
    comparisonReferenceCount: int = 0
    coherenceIssues: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _role(text: str, file_name: str) -> str:
    lower, name = text.lower(), file_name.lower()
    if INSTRUCTION.search(text) and ("readme" in name or "test" in lower or "expected" in lower): return "test_manifest"
    if re.search(r"\b(?:readme|installation|upload instructions)\b", lower) and not re.search(r"\b(?:datasheet|technical specification)\b", lower): return "readme"
    if re.search(r"\b(?:internal policy|review policy|procedure)\b", lower): return "internal_policy"
    if re.search(r"\b(?:counsel guidance|outside counsel|legal guidance)\b", lower): return "counsel_guidance"
    if re.search(r"\b(?:classification memo|prior classification)\b", lower): return "classification_memo"
    if re.search(r"\b(?:catalog|product index|comparison matrix)\b", lower): return "multi_product_catalog"
    return "unknown"


def _mention_type(value: str, line: str, key: str | None) -> str:
    context = f"{key or ''} {line}"
    if HISTORY_ID.fullmatch(value) or (key and HISTORY_CUE.search(key) and re.fullmatch(r"[A-Z][A-Z0-9-]{3,}", value, re.I)):
        return "history_record_reference"
    if SPECIFICATION.fullmatch(value.strip()) or (ATTRIBUTE_KEY.search(key or "") and SPECIFICATION.search(value)):
        return "specification_value"
    if ATTRIBUTE_KEY.search(key or ""):
        return "technical_attribute"
    if PRODUCT_CUE.search(context) and not HISTORY_CUE.search(context):
        return "product"
    return "part_number"


def _relationship_for_context(line: str) -> tuple[str, bool, list[str]]:
    """Classify a product mention by its document-local relationship, not its shape."""
    if CONTAINMENT.search(line):
        return "included_component", False, ["explicit_containment"]
    if PREDECESSOR_CONTEXT.search(line):
        return "predecessor_reference", False, ["predecessor_successor_language"]
    if SUCCESSOR_CONTEXT.search(line):
        return "successor_reference", False, ["predecessor_successor_language"]
    if COMPETITOR_CONTEXT.search(line):
        return "competitor_reference", False, ["competitor_language"]
    if EXAMPLE_CONTEXT.search(line):
        return "example_reference", False, ["example_language"]
    if re.search(r"\bcompatible\s+with\b", line, re.I):
        return "compatible_product", False, ["compatibility_language"]
    if REFERENCE_CONTEXT.search(line) or HISTORY_CUE.search(line):
        relationship = "history_reference" if re.search(r"\b(?:prior|internal|history|memo|record|precedent|historical)\b", line, re.I) else "comparison_reference"
        return relationship, False, ["comparison_language", "reference_only"]
    if INSTRUCTION.search(line):
        return "instruction_reference", False, ["instruction_language"]
    return "unknown", True, []


def _make_mention(counter: int, value: str, line_number: int, proposed_type: str) -> EntityMention:
    return EntityMention(f"mention:{counter}", value, value.lower(), f"line:{line_number}", line_number, 0.9, proposed_type)


def _cells(line: str, delimiter: str) -> list[str]:
    values = [cell.strip() for cell in line.strip().strip("|").split(delimiter)]
    return values


def _logical_lines(text: str) -> list[tuple[int, str]]:
    """Expand recognized table rows into key/value records with row ownership."""
    lines = text.splitlines()
    logical: list[tuple[int, str]] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        delimiter = "|" if "|" in line else "," if "," in line else None
        header = _cells(line, delimiter) if delimiter else []
        header_text = " ".join(header).lower()
        product_column = next((position for position, cell in enumerate(header) if re.search(r"\b(?:product|model|part number|device)\b", cell, re.I)), None)
        if delimiter and product_column is not None and index + 1 < len(lines):
            # Markdown separator is structural, never a data row.
            cursor = index + 1
            if delimiter == "|" and re.fullmatch(r"[\s|:-]+", lines[cursor]):
                cursor += 1
            row_count = 0
            while cursor < len(lines) and delimiter in lines[cursor]:
                row = _cells(lines[cursor], delimiter)
                if len(row) != len(header):
                    break
                row_id = f"row:{cursor + 1}"
                # Resolve the row subject first even when the product column is
                # not the first displayed column; this prevents attributes
                # leaking to the preceding table row's product.
                ordered_columns = [product_column, *[column for column in range(len(row)) if column != product_column]]
                for column in ordered_columns:
                    value = row[column]
                    if not value:
                        continue
                    logical.append((cursor + 1, f"{header[column]}: {value} [{row_id}]"))
                row_count += 1
                cursor += 1
            if row_count:
                index = cursor
                continue
        logical.append((index + 1, line))
        index += 1
    return logical


def resolve_entities(text: str) -> tuple[list[EntityMention], list[ResolvedEntity]]:
    mentions: list[EntityMention] = []
    entities: list[ResolvedEntity] = []
    products: dict[str, ResolvedEntity] = {}
    current_product_id: str | None = None
    counter = 0
    for line_number, raw_line in _logical_lines(text):
        line = (LIST_ITEM.match(raw_line).group(1) if LIST_ITEM.match(raw_line) else raw_line).strip()
        if not line:
            continue
        keyed = KEY_VALUE.match(line)
        key, value = (keyed.group(1), keyed.group(2)) if keyed else (None, line)
        values = list(dict.fromkeys(PART_OR_MODEL.findall(value)))
        # Values such as HBM3E match the identifier grammar but are explicitly
        # typed as specifications before product promotion.
        if SPECIFICATION.search(value) and (ATTRIBUTE_KEY.search(key or "") or not PRODUCT_CUE.search(value)):
            counter += 1
            mention = _make_mention(counter, value, line_number, "specification_value")
            mentions.append(mention)
            entities.append(ResolvedEntity(
                f"attribute:{counter}", "technical_attribute", value, [], [], [mention.id], [mention.sourceSpanId], .9,
                "technical_attribute", False, current_product_id, [mention.sourceSpanId], None, line,
            ))
            continue
        if key and HISTORY_CUE.search(key):
            values = values or HISTORY_ID.findall(value)
        for identifier in values:
            counter += 1
            proposed = _mention_type(identifier, line, key)
            if NON_PRODUCT_IDENTIFIER.fullmatch(identifier):
                proposed = "technical_attribute"
            mention = _make_mention(counter, identifier, line_number, proposed)
            mentions.append(mention)
            if proposed == "history_record_reference":
                entities.append(ResolvedEntity(f"history:{identifier.lower()}", "history_record", identifier, [], [], [mention.id], [mention.sourceSpanId], .95, "history_reference", False, current_product_id, [mention.sourceSpanId], None, line))
                continue
            if proposed in {"specification_value", "technical_attribute"}:
                entities.append(ResolvedEntity(f"attribute:{counter}", "technical_attribute", identifier, [], [], [mention.id], [mention.sourceSpanId], .9, "technical_attribute", False, current_product_id, [mention.sourceSpanId], None, line))
                continue
            # A valid-looking model identifier is only a raw mention. Its
            # relationship is resolved from the clause that contains it.
            product_context = bool(PRODUCT_CUE.search(line)) or (
                line_number <= 2
                and not NON_PRODUCT_IDENTIFIER.fullmatch(identifier)
                and not REFERENCE_CONTEXT.search(line)
            )
            if not product_context:
                relationship, _, reason_codes = _relationship_for_context(line)
                if relationship in {
                    "comparison_reference", "history_reference", "predecessor_reference",
                    "successor_reference", "competitor_reference", "example_reference",
                    "included_component", "compatible_product", "instruction_reference",
                }:
                    product_key = identifier.lower()
                    if product_key not in products:
                        products[product_key] = ResolvedEntity(
                            f"product:{product_key}", "product", identifier, [identifier], [identifier],
                            [mention.id], [mention.sourceSpanId], .75, relationship, False,
                            current_product_id, [mention.sourceSpanId], identifier, line,
                            referenceEvidenceIds=[mention.sourceSpanId],
                            historyRetrievalEligible=relationship in {"history_reference", "comparison_reference", "predecessor_reference", "successor_reference"},
                            comparisonEligible=relationship in {"comparison_reference", "history_reference", "predecessor_reference", "successor_reference", "compatible_product"},
                            componentEligible=relationship == "included_component",
                            reasonCodes=reason_codes,
                        )
                    continue
                entities.append(ResolvedEntity(f"context:{counter}", "unknown", identifier, [identifier], [], [mention.id], [mention.sourceSpanId], .5, "administrative_context", False, current_product_id, [mention.sourceSpanId], None, line))
                continue
            product_key = identifier.lower()
            existing = products.get(product_key)
            if existing:
                products[product_key] = ResolvedEntity(**{
                    **asdict(existing),
                    "mentionIds": [*existing.mentionIds, mention.id],
                    "sourceSpanIds": [*existing.sourceSpanIds, mention.sourceSpanId],
                    "referenceEvidenceIds": [*existing.referenceEvidenceIds, mention.sourceSpanId]
                    if existing.relationshipToDocument not in {"primary_subject", "secondary_subject"}
                    else existing.referenceEvidenceIds,
                })
                continue
            relationship, subject_candidate, reason_codes = _relationship_for_context(line)
            # "Product includes Ethernet" describes the current product. Only
            # a separately named item in a containment clause is a component.
            if relationship == "included_component" and current_product_id is None:
                relationship, subject_candidate, reason_codes = "unknown", True, []
            # Numbered manifests can enumerate distinct product subjects while
            # also describing expected retrieval behavior for each entry.
            if (
                relationship in {"history_reference", "comparison_reference", "instruction_reference"}
                and re.match(r"^\d+[.)]\s*", raw_line)
                and len(values) == 1
            ):
                relationship, subject_candidate, reason_codes = "unknown", True, ["enumerated_product_subject"]
            # The first non-reference product subject is the provisional
            # primary target. Later independently described products are
            # secondary subjects only after owned-evidence evaluation below.
            if relationship == "unknown":
                relationship = "primary_subject" if not any(
                    item.relationshipToDocument in {"primary_subject", "secondary_subject"}
                    for item in products.values()
                ) else "secondary_subject"
            product = ResolvedEntity(
                f"product:{product_key}", "product", line[:180], [identifier], [identifier],
                [mention.id], [mention.sourceSpanId], .9, relationship, subject_candidate,
                None, [mention.sourceSpanId], line[:180], line,
                referenceEvidenceIds=[mention.sourceSpanId] if not subject_candidate else [],
                classificationEligible=subject_candidate,
                historyRetrievalEligible=relationship in {"history_reference", "comparison_reference", "predecessor_reference", "successor_reference"},
                comparisonEligible=relationship in {"comparison_reference", "history_reference", "predecessor_reference", "successor_reference", "compatible_product"},
                componentEligible=relationship == "included_component",
                reasonCodes=reason_codes,
            )
            products[product_key] = product
            if subject_candidate:
                current_product_id = product.id
    # Replace preliminary product entries with their clustered representations.
    non_products = [entity for entity in entities if entity.entityType != "product"]
    finalized: list[ResolvedEntity] = []
    for product in products.values():
        owned_attributes = [
            entity.sourceSpanIds[0]
            for entity in non_products
            if entity.entityType == "technical_attribute" and entity.parentEntityId == product.id
        ]
        has_section = bool(
            re.search(r"\b(?:product|model|part number|device)\s*:\s*[^\n]*\b" + re.escape(product.partNumbers[0]) + r"\b", text, re.I)
            or any("row:" in span for span in product.sourceSpanIds)
        )
        # A subject owns attributes assigned by source structure. A reference
        # clause never owns nearby attributes merely because it names a model.
        owned_evidence = [*owned_attributes]
        if product.relationshipToDocument in {"primary_subject", "secondary_subject"}:
            # The explicit product declaration is document-local subject
            # evidence. Technical sufficiency is decided separately below.
            owned_evidence = list(dict.fromkeys([*product.sourceSpanIds, *owned_evidence]))
        independently_classifiable = (
            product.relationshipToDocument in {"primary_subject", "secondary_subject"}
            and len(owned_evidence) >= MIN_OWNED_PRODUCT_EVIDENCE
        )
        relationship = product.relationshipToDocument
        if relationship == "secondary_subject" and not independently_classifiable:
            relationship = "unknown"
        finalized.append(ResolvedEntity(**{
            **asdict(product),
            "relationshipToDocument": relationship,
            "independentlyClassifiable": independently_classifiable,
            "classificationEligible": independently_classifiable,
            "ownedTechnicalEvidenceIds": owned_evidence,
            "ownedTechnicalEvidenceCount": len(owned_evidence),
            "hasDedicatedSection": has_section,
            "hasDedicatedSpecificationBlock": bool(owned_attributes),
        }))
    return mentions, [*finalized, *non_products]


def qualify_document(
    text: str,
    metadata: dict[str, Any] | None = None,
    provider_proposals: list[dict[str, Any]] | None = None,
) -> DocumentQualification:
    # Provider proposals are intentionally advisory. Deterministic span/context
    # typing below is the authority for entity type and independent count.
    _ = provider_proposals
    role = _role(text, str((metadata or {}).get("fileName", "")))
    _, entities = resolve_entities(text)
    products = [entity for entity in entities if entity.entityType == "product" and entity.independentlyClassifiable]
    product_mentions = [entity for entity in entities if entity.entityType == "product"]
    history_references = [entity for entity in product_mentions if entity.relationshipToDocument == "history_reference"]
    comparison_references = [entity for entity in product_mentions if entity.relationshipToDocument == "comparison_reference"]
    independent_count = len(products)
    reasons: list[str] = []
    reference_relationships = {
        "comparison_reference", "history_reference", "predecessor_reference",
        "successor_reference", "competitor_reference", "example_reference",
        "included_component", "compatible_product", "instruction_reference",
    }
    coherence_issues: list[str] = []
    for entity in product_mentions:
        if entity.relationshipToDocument in reference_relationships and entity.independentlyClassifiable:
            coherence_issues.append("REFERENCE_PRODUCT_COUNTED_AS_TARGET")
        if entity.relationshipToDocument in {"comparison_reference", "history_reference"} and entity.ownedTechnicalEvidenceIds:
            coherence_issues.append("REFERENCE_FACT_CONTAMINATION")
    if coherence_issues:
        return DocumentQualification(
            role, "entity_reference_coherence_failure", entities, independent_count,
            ["Product-reference coherence validation blocked qualification."],
            len(product_mentions), len(history_references), len(comparison_references),
            list(dict.fromkeys(coherence_issues)),
        )
    if independent_count > 1:
        return DocumentQualification(role if role != "unknown" else "multi_product_catalog", "multi_entity_requires_segmentation", entities, independent_count, [f"Detected {independent_count} independently classifiable product subjects."], len(product_mentions), len(history_references), len(comparison_references))
    if independent_count == 1:
        attributes = [entity for entity in entities if entity.parentEntityId == products[0].id and entity.entityType == "technical_attribute"]
        technical_signals = re.findall(r"\b(?:datasheet|technical specification|ethernet|interface|processor|firmware|throughput|frequency|voltage)\b", text, re.I)
        sufficient = len(attributes) >= 2 or bool(technical_signals and (attributes or CONTAINMENT.search(text) or re.search(r"\b(?:datasheet|technical specification)\b", text, re.I)))
        if sufficient:
            return DocumentQualification("single_product_technical_source" if role == "unknown" else role, "single_product_classifiable", entities, 1, [], len(product_mentions), len(history_references), len(comparison_references))
        return DocumentQualification("product_intake" if role in {"unknown", "test_manifest", "readme"} else role, "single_product_insufficient_evidence", entities, 1, ["One product subject was identified, but its technical evidence is insufficient for classification."], len(product_mentions), len(history_references), len(comparison_references))
    if role in {"test_manifest", "readme", "internal_policy", "counsel_guidance", "administrative"}:
        reasons.append("The document contains instructional, administrative, or non-product context.")
        return DocumentQualification(role, "non_product_context", entities, 0, reasons, len(product_mentions), len(history_references), len(comparison_references))
    return DocumentQualification(role, "insufficient_product_evidence", entities, 0, ["No independently classifiable product subject was identified."], len(product_mentions), len(history_references), len(comparison_references))
