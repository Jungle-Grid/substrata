"""Conservative document qualification and product-entity boundary detection.

This runs before extraction.  It intentionally prefers entity discovery over a
speculative single-product memo whenever a source contains independently listed
products or instructional/test language.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
import re
from typing import Any


ROLE_VALUES = {
    "single_product_technical_source", "multi_product_catalog", "product_family_overview",
    "product_index", "test_manifest", "classification_history", "classification_memo",
    "review_worksheet", "internal_policy", "counsel_guidance", "regulatory_material",
    "administrative", "readme", "unknown",
}

PART_NUMBER = re.compile(r"\b[A-Z]{2,}[A-Z0-9-]*\d[A-Z0-9-]*\b")
LIST_ITEM = re.compile(r"^\s*(?:\d+[.)]|[-*])\s*(.+)$")
INSTRUCTION = re.compile(r"\b(?:should\s+(?:surface|return|show|match)|use\s+this\s+(?:file|document)\s+to\s+test|expected\s+(?:result|behavior)|test\s+(?:case|manifest)|fixture)\b", re.I)
CONTAINMENT = re.compile(r"\b(?:includes?|contains?|populated with|ships with|integrates?|installed module|embedded processor|included card|bill of materials)\b", re.I)


@dataclass(frozen=True)
class ProductEntity:
    id: str
    productName: str | None
    partNumbers: list[str]
    aliases: list[str]
    entityType: str
    sourceSpanIds: list[str]
    confidence: float
    relationshipToDocument: str
    sourceText: str


@dataclass(frozen=True)
class DocumentQualification:
    documentRole: str
    classifiability: str
    entities: list[ProductEntity]
    reasons: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {**asdict(self), "entities": [asdict(entity) for entity in self.entities]}


def _role(text: str, file_name: str) -> str:
    lower = text.lower()
    name = file_name.lower()
    # Filename is only corroborating evidence: content markers decide the role.
    if INSTRUCTION.search(text) and ("readme" in name or "test" in lower or "expected" in lower):
        return "test_manifest"
    if re.search(r"\b(?:readme|installation|upload instructions)\b", lower) and not re.search(r"\b(?:datasheet|technical specification)\b", lower):
        return "readme"
    if re.search(r"\b(?:internal policy|review policy|procedure)\b", lower):
        return "internal_policy"
    if re.search(r"\b(?:counsel guidance|outside counsel|legal guidance)\b", lower):
        return "counsel_guidance"
    if re.search(r"\b(?:classification memo|prior classification)\b", lower):
        return "classification_memo"
    if re.search(r"\b(?:catalog|product index|comparison matrix)\b", lower):
        return "multi_product_catalog"
    return "unknown"


def _entities(text: str) -> list[ProductEntity]:
    entities: list[ProductEntity] = []
    offset = 0
    for line_number, line in enumerate(text.splitlines(), 1):
        candidate = LIST_ITEM.match(line)
        line_text = candidate.group(1) if candidate else line
        part_numbers = list(dict.fromkeys(PART_NUMBER.findall(line_text)))
        if not part_numbers:
            offset += len(line) + 1
            continue
        # A line containing a product identifier is an entity candidate.  The
        # instruction marker makes it metadata, never product evidence.
        relationship = "instruction_example" if INSTRUCTION.search(line_text) else "listed_item"
        if CONTAINMENT.search(line_text):
            relationship = "primary_subject" if len(entities) == 0 else "listed_item"
        product_name = line_text.strip(" -:*\t")[:160]
        entities.append(ProductEntity(
            id=f"entity_{line_number}_{part_numbers[0].lower()}",
            productName=product_name,
            partNumbers=part_numbers,
            aliases=[],
            entityType="product",
            sourceSpanIds=[f"line:{line_number}"],
            confidence=0.88 if candidate else 0.7,
            relationshipToDocument=relationship,
            sourceText=line_text,
        ))
        offset += len(line) + 1
    # Preserve independent identifiers only once, even where a line repeats it.
    deduped: dict[str, ProductEntity] = {}
    for entity in entities:
        key = entity.partNumbers[0].lower()
        deduped.setdefault(key, entity)
    return list(deduped.values())


def qualify_document(text: str, metadata: dict[str, Any] | None = None) -> DocumentQualification:
    metadata = metadata or {}
    role = _role(text, str(metadata.get("fileName", "")))
    entities = _entities(text)
    reasons: list[str] = []
    if len(entities) > 1:
        reasons.append(f"Detected {len(entities)} independently listed product entities.")
        if role in {"test_manifest", "readme"}:
            reasons.append("Entries occur in instructional/test context and require separate technical sources.")
        return DocumentQualification("multi_product_catalog" if role == "unknown" else role, "multi_entity_requires_segmentation", entities, reasons)
    if role in {"test_manifest", "readme", "internal_policy", "counsel_guidance", "administrative"}:
        reasons.append("The document contains instructional, administrative, or non-product context.")
        return DocumentQualification(role, "non_product_context", entities, reasons)
    if len(entities) == 1:
        source = entities[0].sourceText
        technical = re.search(r"\b(?:datasheet|technical specification|ethernet|memory|processor|throughput|frequency|interface|voltage|firmware)\b", text, re.I)
        if not technical or len(source.split()) < 3:
            return DocumentQualification(role, "insufficient_product_evidence", entities, ["Only sparse product identity was found; technical evidence is insufficient."])
        return DocumentQualification("single_product_technical_source" if role == "unknown" else role, "single_product_classifiable", entities, [])
    return DocumentQualification(role, "insufficient_product_evidence", [], ["No primary exported product could be identified."])
