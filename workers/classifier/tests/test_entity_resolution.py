from __future__ import annotations

import sys
import unittest
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from entity_resolution import qualify_document, resolve_entities


class EntityResolutionTests(unittest.TestCase):
    def test_numbered_products_in_test_manifest_require_segmentation(self):
        text = """# Test manifest
1. AX920 accelerator — should surface prior accelerator records
2. NX120 secure networking adapter — should surface networking records
3. ES25 industrial sensor gateway — should surface gateway records
"""
        result = qualify_document(text, {"fileName": "arbitrary-input.txt"})
        self.assertEqual(result.documentRole, "test_manifest")
        self.assertEqual(result.classifiability, "multi_entity_requires_segmentation")
        self.assertEqual(len(result.entities), 3)
        self.assertEqual(
            {entity.relationshipToDocument for entity in result.entities},
            {"primary_subject", "secondary_subject"},
        )

    def test_sparse_label_is_not_a_technical_product_source(self):
        result = qualify_document("ZX100 Advanced Adapter", {"fileName": "rename-does-not-matter.txt"})
        self.assertEqual(result.classifiability, "single_product_insufficient_evidence")

    def test_single_gateway_technical_source_is_classifiable(self):
        result = qualify_document(
            "GX500 Industrial gateway. Part number GX500. Includes an embedded processor and Ethernet interface.",
            {"fileName": "technical-source.txt"},
        )
        self.assertEqual(result.classifiability, "single_product_classifiable")
        self.assertEqual(len(result.entities), 1)

    def test_filename_alone_cannot_make_a_document_a_test_manifest(self):
        result = qualify_document(
            "GX500 Industrial gateway technical specification. Ethernet interface and firmware details.",
            {"fileName": "README.txt"},
        )
        self.assertEqual(result.classifiability, "single_product_classifiable")

    def test_key_value_attributes_and_prior_records_do_not_create_products(self):
        result = qualify_document("""Product: ZX100 Advanced Accelerator
Memory: 128 GB HBM3E
Performance: 300 TOPS
Prior record: CASE-2026-019
Prior memo: MEMO-2025-12
""")
        self.assertEqual(result.independentProductEntityCount, 1)
        self.assertEqual(result.classifiability, "single_product_classifiable")
        products = [entity for entity in result.entities if entity.entityType == "product"]
        attributes = [entity for entity in result.entities if entity.entityType == "technical_attribute"]
        history = [entity for entity in result.entities if entity.entityType == "history_record"]
        self.assertEqual(products[0].partNumbers, ["ZX100"])
        self.assertEqual(len(attributes), 2)
        self.assertTrue(all(entity.parentEntityId == products[0].id for entity in attributes))
        self.assertEqual(len(history), 2)
        self.assertTrue(all(not entity.independentlyClassifiable for entity in history))

    def test_product_name_and_part_number_cluster(self):
        _, entities = resolve_entities("Product: ZX100 Advanced Adapter\nModel: ZX100\nPart number: ZX100")
        self.assertEqual(len([entity for entity in entities if entity.entityType == "product"]), 1)

    def test_true_product_rows_remain_distinct(self):
        result = qualify_document("""1. ZX100 Gateway
2. QY200 Network Adapter
""")
        self.assertEqual(result.independentProductEntityCount, 2)
        self.assertEqual(result.classifiability, "multi_entity_requires_segmentation")

    def test_markdown_and_csv_rows_bind_attributes_and_history_to_each_product(self):
        markdown = """| Product | Memory | Prior Record |
| --- | --- | --- |
| ZX100 Accelerator | 128 GB HBM3E | CASE-2026-019 |
| QY200 Gateway | 2 GB DDR4 | MEMO-2025-12 |
"""
        csv = """Product,Memory,Prior Record
ZX100 Accelerator,128 GB HBM3E,CASE-2026-019
QY200 Gateway,2 GB DDR4,MEMO-2025-12
"""
        for source in (markdown, csv):
            with self.subTest(source=source[:10]):
                result = qualify_document(source)
                self.assertEqual(result.independentProductEntityCount, 2)
                self.assertEqual(result.classifiability, "multi_entity_requires_segmentation")
                self.assertEqual(len([item for item in result.entities if item.entityType == "history_record"]), 2)
                self.assertEqual(len([item for item in result.entities if item.entityType == "technical_attribute"]), 2)

    def test_provider_proposals_cannot_promote_specification_or_history_reference(self):
        source = """Product: ZX100 Adapter
Memory: 128 GB HBM3E
Prior record: CASE-2026-019
"""
        baseline = qualify_document(source)
        proposed = qualify_document(source, provider_proposals=[
            {"text": "128 GB HBM3E", "type": "product"},
            {"text": "CASE-2026-019", "type": "product"},
        ])
        self.assertEqual(baseline.independentProductEntityCount, 1)
        self.assertEqual(proposed.independentProductEntityCount, 1)
        self.assertEqual(proposed.classifiability, baseline.classifiability)

    def test_product_brief_with_comparison_memo_has_one_target_and_history_hint(self):
        result = qualify_document("""Product: AX920 Secure Network Adapter
Ports: 2 x 200GbE
Security: MACsec, TLS offload, secure boot, signed firmware
Management: web and CLI management
This file should trigger comparison with the uploaded QY100 secure-network-card memo.
""")
        self.assertEqual(result.documentRole, "single_product_technical_source")
        self.assertEqual(result.classifiability, "single_product_classifiable")
        self.assertEqual(result.independentProductEntityCount, 1)
        reference = next(entity for entity in result.entities if entity.partNumbers == ["QY100"])
        self.assertEqual(reference.relationshipToDocument, "history_reference")
        self.assertFalse(reference.independentlyClassifiable)
        self.assertTrue(reference.historyRetrievalEligible)
        self.assertFalse(reference.classificationEligible)
        self.assertEqual(reference.ownedTechnicalEvidenceIds, [])

    def test_title_subject_owns_unlabeled_specifications_not_reference_product(self):
        result = qualify_document("""# AX920 Secure NIC
AX920 is a network interface product for secure traffic offload.
2 x 200GbE ports; MACsec; TLS offload; secure boot; signed firmware.
Compare with QY100 in the prior internal memo.
""")
        self.assertEqual(result.classifiability, "single_product_classifiable")
        target = next(e for e in result.entities if e.partNumbers == ["AX920"])
        reference = next(e for e in result.entities if e.partNumbers == ["QY100"])
        self.assertEqual(target.relationshipToDocument, "primary_subject")
        self.assertEqual(reference.relationshipToDocument, "history_reference")
        self.assertFalse(reference.classificationEligible)

    def test_predecessor_and_included_component_do_not_become_targets(self):
        predecessor = qualify_document("""Product: AX920 Network Adapter
Ports: 2 x 200GbE
AX920 succeeds QY100.
""")
        component = qualify_document("""Product: AX920 Network Adapter
Ports: 2 x 200GbE
AX920 includes a QY100 controller.
""")
        self.assertEqual(predecessor.independentProductEntityCount, 1)
        self.assertEqual(next(e for e in predecessor.entities if e.partNumbers == ["QY100"]).relationshipToDocument, "predecessor_reference")
        self.assertEqual(component.independentProductEntityCount, 1)
        self.assertEqual(next(e for e in component.entities if e.partNumbers == ["QY100"]).relationshipToDocument, "included_component")

    def test_two_dedicated_product_rows_still_require_segmentation(self):
        result = qualify_document("""| Product | Ports | Security |
| --- | --- | --- |
| AX920 Adapter | 2 x 200GbE | MACsec |
| AX930 Adapter | 2 x 200GbE | TLS offload |
""")
        self.assertEqual(result.independentProductEntityCount, 2)
        self.assertEqual(result.classifiability, "multi_entity_requires_segmentation")

    def test_protocol_and_standard_identifiers_do_not_become_product_subjects(self):
        result = qualify_document("""ADC500 converter technical specification
Product: ADC500 converter
Interface: JESD204C
Qualification: ANSI/ESDA/JEDEC JS-001
""")
        self.assertEqual(result.independentProductEntityCount, 1)
        self.assertEqual(result.classifiability, "single_product_classifiable")


if __name__ == "__main__":
    unittest.main()
