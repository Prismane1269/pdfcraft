#!/usr/bin/env python3
"""
End-to-End Browser Test Suite for PDFCraft using Playwright and Google Chrome.
Tests real in-browser user interactions, file uploads, PDF parsing, and downloads.
"""

import os
import sys
import time
import threading
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

import fitz
from playwright.sync_api import sync_playwright
from server import app

PORT = 8089

def run_server():
    app.run(host="127.0.0.1", port=PORT, debug=False, use_reloader=False)

def test_all_browser_features():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(1.5)

    sample_en = str(BASE_DIR / "sample_pdfs" / "sample_english.pdf")
    sample_bn = str(BASE_DIR / "sample_pdfs" / "sample_bangla.pdf")

    print(f"Testing browser on http://127.0.0.1:{PORT}")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless=True
        )
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: console_errors.append(str(err)))

        # 1. Load Homepage
        print("[1/9] Loading PDFCraft homepage...")
        page.goto(f"http://127.0.0.1:{PORT}")
        assert "PDFCraft" in page.title()
        print("  ✓ Homepage loaded successfully")

        # 2. Test Split PDF
        print("[2/9] Testing Split PDF tool...")
        page.click('div[data-tool="split"]')
        page.wait_for_selector('#tool-panel-split:not(.hidden)')
        
        # Upload sample PDF
        page.set_input_files('#splitFileInput', sample_en)
        page.wait_for_selector('#splitFileDetails:not(.hidden)', timeout=5000)
        file_name = page.text_content('#splitFileName')
        assert "sample_english.pdf" in file_name
        print(f"  ✓ Split tool uploaded and parsed: {file_name}")

        # Trigger Split Download
        with page.expect_download(timeout=8000) as download_info:
            page.click('#splitProcessBtn')
        download = download_info.value
        download_path = download.path()
        split_bytes = Path(download_path).read_bytes()
        split_doc = fitz.open(stream=split_bytes, filetype="pdf")
        assert len(split_doc) > 0
        print(f"  ✓ Split downloaded and verified: {len(split_doc)} pages")
        split_doc.close()

        # 3. Test Extract Text
        print("[3/9] Testing Extract Text tool...")
        page.click('.back-to-tools-btn')
        page.click('div[data-tool="extract-text"]')
        page.wait_for_selector('#tool-panel-extract-text:not(.hidden)')
        page.set_input_files('#extractFileInput', sample_en)
        page.wait_for_selector('#extractControls:not(.hidden)', timeout=5000)
        extracted = page.text_content('#extractOutputBox')
        assert "PDFCraft Sample Page 1" in extracted
        print("  ✓ Text extraction verified in browser DOM")

        # 4. Test Merge PDF
        print("[4/9] Testing Merge PDF tool...")
        page.click('.back-to-tools-btn')
        page.click('div[data-tool="merge"]')
        page.wait_for_selector('#tool-panel-merge:not(.hidden)')
        page.set_input_files('#mergeFileInput', [sample_en, sample_en])
        page.wait_for_selector('#mergeControls:not(.hidden)', timeout=5000)
        
        with page.expect_download(timeout=8000) as download_info:
            page.click('#mergeProcessBtn')
        download = download_info.value
        merged_bytes = Path(download.path()).read_bytes()
        merged_doc = fitz.open(stream=merged_bytes, filetype="pdf")
        assert len(merged_doc) == 6
        print(f"  ✓ Merged PDF downloaded: {len(merged_doc)} pages (3+3)")
        merged_doc.close()

        # 5. Test Rotate PDF
        print("[5/9] Testing Rotate PDF tool...")
        page.click('.back-to-tools-btn')
        page.click('div[data-tool="rotate"]')
        page.wait_for_selector('#tool-panel-rotate:not(.hidden)')
        page.set_input_files('#rotateFileInput', sample_en)
        page.wait_for_selector('#rotateControls:not(.hidden)', timeout=5000)
        
        with page.expect_download(timeout=8000) as download_info:
            page.click('#rotateProcessBtn')
        download = download_info.value
        rotated_bytes = Path(download.path()).read_bytes()
        rot_doc = fitz.open(stream=rotated_bytes, filetype="pdf")
        assert rot_doc[0].rotation == 90
        print(f"  ✓ Rotated PDF downloaded and verified (90°)")
        rot_doc.close()

        # 6. Test Watermark PDF
        print("[6/9] Testing Watermark PDF tool...")
        page.click('.back-to-tools-btn')
        page.click('div[data-tool="watermark"]')
        page.wait_for_selector('#tool-panel-watermark:not(.hidden)')
        page.set_input_files('#watermarkFileInput', sample_en)
        page.wait_for_selector('#watermarkControls:not(.hidden)', timeout=5000)
        
        with page.expect_download(timeout=8000) as download_info:
            page.click('#watermarkProcessBtn')
        download = download_info.value
        wm_bytes = Path(download.path()).read_bytes()
        wm_doc = fitz.open(stream=wm_bytes, filetype="pdf")
        assert len(wm_doc) == 3
        print(f"  ✓ Watermarked PDF downloaded successfully")
        wm_doc.close()

        # 7. Test Compress PDF
        print("[7/9] Testing Compress PDF tool...")
        page.click('.back-to-tools-btn')
        page.click('div[data-tool="compress"]')
        page.wait_for_selector('#tool-panel-compress:not(.hidden)')
        page.set_input_files('#compressFileInput', sample_en)
        page.wait_for_selector('#compressControls:not(.hidden)', timeout=5000)
        
        with page.expect_download(timeout=8000) as download_info:
            page.click('#compressProcessBtn')
        download = download_info.value
        comp_bytes = Path(download.path()).read_bytes()
        comp_doc = fitz.open(stream=comp_bytes, filetype="pdf")
        assert len(comp_doc) == 3
        print(f"  ✓ Compressed PDF downloaded successfully")
        comp_doc.close()

        # 8. Test Metadata Editor
        print("[8/9] Testing Metadata Editor tool...")
        page.click('.back-to-tools-btn')
        page.click('div[data-tool="metadata"]')
        page.wait_for_selector('#tool-panel-metadata:not(.hidden)')
        page.set_input_files('#metadataFileInput', sample_en)
        page.wait_for_selector('#metadataControls:not(.hidden)', timeout=5000)
        page.fill('#metaTitleInput', 'Playwright Automated Title')
        
        with page.expect_download(timeout=8000) as download_info:
            page.click('#metadataProcessBtn')
        download = download_info.value
        meta_bytes = Path(download.path()).read_bytes()
        meta_doc = fitz.open(stream=meta_bytes, filetype="pdf")
        assert meta_doc.metadata['title'] == 'Playwright Automated Title'
        print(f"  ✓ Metadata Editor modified and downloaded successfully")
        meta_doc.close()

        # 9. Test Bengali OCR Tool
        print("[9/9] Testing Bengali PDF OCR tool...")
        page.click('.back-to-tools-btn')
        page.click('div[data-tool="bangla-ocr"]')
        page.wait_for_selector('#tool-panel-bangla-ocr:not(.hidden)')
        page.set_input_files('#banglaFileInput', sample_bn)
        page.wait_for_selector('#banglaFileDetails:not(.hidden)', timeout=5000)
        bangla_file_name = page.text_content('#banglaFileName')
        assert "sample_bangla.pdf" in bangla_file_name
        print(f"  ✓ Bengali PDF uploaded & parsed: {bangla_file_name}")

        # Test sample load button
        page.click('#banglaSampleBtn')
        page.wait_for_selector('#banglaFileDetails:not(.hidden)', timeout=5000)
        print("  ✓ Official sample load button functional")

        browser.close()

        print("\n==========================================")
        print("🎉 ALL BROWSER PLAYWRIGHT TESTS PASSED! 🎉")
        print("==========================================")
        if console_errors:
            print("Console Errors observed:", console_errors)
        else:
            print("Zero console errors observed.")

if __name__ == "__main__":
    test_all_browser_features()
