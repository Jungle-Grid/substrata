from __future__ import annotations

import sys
import unittest
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from entity_resolution import qualify_document


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
        self.assertTrue(all(entity.relationshipToDocument == "instruction_example" for entity in result.entities))

    def test_sparse_label_is_not_a_technical_product_source(self):
        result = qualify_document("ZX100 Advanced Adapter", {"fileName": "rename-does-not-matter.txt"})
        self.assertEqual(result.classifiability, "insufficient_product_evidence")

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


if __name__ == "__main__":
    unittest.main()
