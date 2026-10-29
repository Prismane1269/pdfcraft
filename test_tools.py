#!/usr/bin/env python3
"""
PDFCraft Comprehensive Automated Test Suite
Tests all tools, backend APIs, vendor files, and Bengali OCR integration using Flask TestClient.
"""

import os
import sys
import tempfile
import unittest
import io
from pathlib import Path

# Add project root and bangla-pdf-ocr to path
BASE_DIR = Path(__file__).resolve().parent
BANGLA_DIR = Path("/Users/taseen/Desktop/bangla-pdf-ocr-main")
sys.path.insert(0, str(BASE_DIR))
if BANGLA_DIR.exists():
    sys.path.insert(0, str(BANGLA_DIR))

import fitz  # PyMuPDF
from server import app


class TestPDFCraftSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.client = app.test_client()
        cls.sample_en = BASE_DIR / "sample_pdfs" / "sample_english.pdf"
        cls.sample_bn = BASE_DIR / "sample_pdfs" / "sample_bangla.pdf"

    def test_01_assets_exist(self):
        """Verify all critical static assets and tool files exist."""
        required_files = [
            BASE_DIR / "index.html",
            BASE_DIR / "css" / "styles.css",
            BASE_DIR / "js" / "app.js",
            BASE_DIR / "js" / "utils" / "pdf-helpers.js",
            BASE_DIR / "js" / "utils" / "download.js",
            BASE_DIR / "js" / "vendor" / "pdf.min.js",
            BASE_DIR / "js" / "vendor" / "pdf.worker.min.js",
            BASE_DIR / "js" / "vendor" / "pdf-lib.min.js",
            BASE_DIR / "js" / "vendor" / "jszip.min.js",
            BASE_DIR / "js" / "vendor" / "tesseract.min.js",
            BASE_DIR / "js" / "tools" / "split.js",
            BASE_DIR / "js" / "tools" / "merge.js",
            BASE_DIR / "js" / "tools" / "extract-text.js",
            BASE_DIR / "js" / "tools" / "bangla-ocr.js",
            BASE_DIR / "js" / "tools" / "pdf-to-img.js",
            BASE_DIR / "js" / "tools" / "img-to-pdf.js",
            BASE_DIR / "js" / "tools" / "organize.js",
            BASE_DIR / "js" / "tools" / "rotate.js",
            BASE_DIR / "js" / "tools" / "protect.js",
            BASE_DIR / "js" / "tools" / "unlock.js",
            BASE_DIR / "js" / "tools" / "watermark.js",
            BASE_DIR / "js" / "tools" / "page-numbers.js",
            BASE_DIR / "js" / "tools" / "compress.js",
            BASE_DIR / "js" / "tools" / "sign.js",
            BASE_DIR / "js" / "tools" / "metadata.js",
        ]
        for f in required_files:
            self.assertTrue(f.exists(), f"Missing critical asset: {f}")
            self.assertGreater(f.stat().st_size, 0, f"File is empty: {f}")

    def test_02_server_status_api(self):
        """Test API status endpoint."""
        res = self.client.get("/api/status")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("status"), "online")
        self.assertEqual(data.get("engine"), "bangla-pdf-ocr")

    def test_03_static_page_serves(self):
        """Test root serves HTML."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        html = res.data.decode("utf-8")
        self.assertIn("PDFCraft", html)
        self.assertIn("bangla-pdf-ocr", html)

    def test_04_split_functionality(self):
        """Test splitting PDF pages."""
        doc = fitz.open(self.sample_en)
        self.assertEqual(len(doc), 3)

        # Extract page 1
        new_doc = fitz.open()
        new_doc.insert_pdf(doc, from_page=0, to_page=0)
        self.assertEqual(len(new_doc), 1)

        # Extract pages 1 and 3
        new_doc2 = fitz.open()
        new_doc2.insert_pdf(doc, from_page=0, to_page=0)
        new_doc2.insert_pdf(doc, from_page=2, to_page=2)
        self.assertEqual(len(new_doc2), 2)
        doc.close()
        new_doc.close()
        new_doc2.close()

    def test_05_merge_functionality(self):
        """Test merging multiple PDFs."""
        doc1 = fitz.open(self.sample_en)
        doc2 = fitz.open(self.sample_en)
        merged = fitz.open()
        merged.insert_pdf(doc1)
        merged.insert_pdf(doc2)
        self.assertEqual(len(merged), 6)
        doc1.close()
        doc2.close()
        merged.close()

    def test_06_text_extraction(self):
        """Test text extraction from standard PDF."""
        doc = fitz.open(self.sample_en)
        text_page1 = doc[0].get_text()
        self.assertIn("PDFCraft Sample Page 1", text_page1)
        doc.close()

    def test_07_pdf_protection_and_unlock_api(self):
        """Test Protect and Unlock API endpoints."""
        pdf_bytes = self.sample_en.read_bytes()

        # 1. Protect PDF
        res = self.client.post(
            "/api/pdf/protect",
            data={
                "file": (io.BytesIO(pdf_bytes), "sample.pdf"),
                "password": "SecretPassword123"
            },
            content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 200)
        protected_bytes = res.data

        # Verify encrypted
        doc = fitz.open(stream=protected_bytes, filetype="pdf")
        self.assertTrue(doc.is_encrypted)
        auth = doc.authenticate("SecretPassword123")
        self.assertGreater(auth, 0)
        doc.close()

        # 2. Unlock PDF
        res_unlock = self.client.post(
            "/api/pdf/unlock",
            data={
                "file": (io.BytesIO(protected_bytes), "protected.pdf"),
                "password": "SecretPassword123"
            },
            content_type="multipart/form-data"
        )
        self.assertEqual(res_unlock.status_code, 200)
        unlocked_bytes = res_unlock.data

        doc_unlocked = fitz.open(stream=unlocked_bytes, filetype="pdf")
        self.assertFalse(doc_unlocked.is_encrypted)
        doc_unlocked.close()

    def test_08_bengali_ocr_integration(self):
        """Test native Bengali OCR API endpoint using bangla-pdf-ocr."""
        if not self.sample_bn.exists():
            self.skipTest("Bengali sample PDF not found")

        bn_bytes = self.sample_bn.read_bytes()
        res = self.client.post(
            "/api/ocr/bangla",
            data={
                "file": (io.BytesIO(bn_bytes), "Freedom Fight.pdf"),
                "language": "ben",
                "pages": "1"
            },
            content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("pages", data)
        self.assertGreater(len(data["pages"]), 0)

        page1_text = data["pages"][0]["text"]
        print(f"\n[Test] OCR Extracted Bengali Text sample (Page 1):\n{page1_text[:200]}...\n")
        self.assertGreater(len(page1_text.strip()), 10)

    def test_09_rotate_functionality(self):
        """Test PDF page rotation."""
        doc = fitz.open(self.sample_en)
        page = doc[0]
        self.assertEqual(page.rotation, 0)
        page.set_rotation(90)
        self.assertEqual(page.rotation, 90)
        doc.close()

    def test_10_metadata_editing(self):
        """Test modifying PDF metadata."""
        doc = fitz.open(self.sample_en)
        meta = doc.metadata
        meta["title"] = "Updated Test Title"
        meta["author"] = "Taseen (Prismane1269)"
        doc.set_metadata(meta)
        self.assertEqual(doc.metadata["title"], "Updated Test Title")
        self.assertEqual(doc.metadata["author"], "Taseen (Prismane1269)")
        doc.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
