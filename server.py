#!/usr/bin/env python3
"""
PDFCraft Studio Backend Server (Flask)
- Serves static website on http://localhost:8000
- Integrates directly with native bangla-pdf-ocr package
- Provides PDF protection & decryption endpoints
"""

import os
import sys
import tempfile
from pathlib import Path
from typing import Optional

from flask import Flask, request, jsonify, send_file, send_from_directory, Response

# Add bangla-pdf-ocr to sys.path if available
BANGLA_OCR_DIR = Path("/Users/taseen/Desktop/bangla-pdf-ocr-main")
if BANGLA_OCR_DIR.exists():
    sys.path.insert(0, str(BANGLA_OCR_DIR))

try:
    from bangla_pdf_ocr.ocr import OCRProcessor
    HAS_BANGLA_OCR = True
except ImportError:
    HAS_BANGLA_OCR = False

try:
    import fitz  # PyMuPDF
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False

STATIC_DIR = Path(__file__).resolve().parent

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

@app.route("/")
def index():
    return send_from_directory(str(STATIC_DIR), "index.html")

@app.route("/<path:filename>")
def serve_static(filename):
    return send_from_directory(str(STATIC_DIR), filename)

@app.route("/api/status", methods=["GET"])
def get_status():
    return jsonify({
        "status": "online",
        "engine": "bangla-pdf-ocr" if HAS_BANGLA_OCR else "fallback",
        "has_fitz": HAS_FITZ,
        "message": "PDFCraft local backend is running"
    })

@app.route("/api/ocr/bangla", methods=["POST"])
def ocr_bangla():
    if not HAS_BANGLA_OCR:
        return jsonify({"detail": "bangla-pdf-ocr module not found on host."}), 500

    if "file" not in request.files:
        return jsonify({"detail": "No file uploaded."}), 400

    uploaded_file = request.files["file"]
    language = request.form.get("language", "ben")
    pages_param = request.form.get("pages", None)

    with tempfile.TemporaryDirectory() as tmpdir:
        input_pdf = Path(tmpdir) / (uploaded_file.filename or "input.pdf")
        uploaded_file.save(str(input_pdf))

        processor = OCRProcessor(language=language)

        try:
            images = processor.convert_pdf_to_images(input_pdf)
            total_pages = len(images)

            selected_indices = list(range(total_pages))
            if pages_param:
                requested = []
                for p in pages_param.split(","):
                    p = p.strip()
                    if p.isdigit():
                        idx = int(p) - 1
                        if 0 <= idx < total_pages:
                            requested.append(idx)
                if requested:
                    selected_indices = requested

            page_results = []
            full_text_list = []

            for idx in selected_indices:
                img_path = images[idx]
                page_num = idx + 1
                page_text = processor.process_image(img_path, page_num)
                clean_text = page_text.replace(f"\n--- Page {page_num} ---\n", "").strip()
                page_results.append({
                    "page": page_num,
                    "text": clean_text
                })
                full_text_list.append(f"\n--- Page {page_num} ---\n{clean_text}\n")

            return jsonify({
                "status": "success",
                "filename": uploaded_file.filename,
                "language": language,
                "pages": page_results,
                "text": "".join(full_text_list).strip()
            })
        except Exception as e:
            return jsonify({"detail": f"OCR execution failed: {str(e)}"}), 500

@app.route("/api/pdf/protect", methods=["POST"])
def protect_pdf():
    if not HAS_FITZ:
        return jsonify({"detail": "PyMuPDF not installed."}), 500

    if "file" not in request.files:
        return jsonify({"detail": "No file uploaded."}), 400

    uploaded_file = request.files["file"]
    password = request.form.get("password", "")

    if not password:
        return jsonify({"detail": "Password is required."}), 400

    pdf_bytes = uploaded_file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp_path = tmp.name

    doc.save(
        tmp_path,
        encryption=fitz.PDF_ENCRYPT_AES_256,
        user_pw=password,
        owner_pw=password
    )
    doc.close()

    return send_file(
        tmp_path,
        as_attachment=True,
        download_name=f"protected_{uploaded_file.filename or 'document.pdf'}",
        mimetype="application/pdf"
    )

@app.route("/api/pdf/unlock", methods=["POST"])
def unlock_pdf():
    if not HAS_FITZ:
        return jsonify({"detail": "PyMuPDF not installed."}), 500

    if "file" not in request.files:
        return jsonify({"detail": "No file uploaded."}), 400

    uploaded_file = request.files["file"]
    password = request.form.get("password", "")

    pdf_bytes = uploaded_file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    if doc.is_encrypted:
        auth_status = doc.authenticate(password)
        if auth_status <= 0:
            doc.close()
            return jsonify({"detail": "Incorrect password. Could not authenticate document."}), 400

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp_path = tmp.name

    doc.save(tmp_path)
    doc.close()

    return send_file(
        tmp_path,
        as_attachment=True,
        download_name=f"unlocked_{uploaded_file.filename or 'document.pdf'}",
        mimetype="application/pdf"
    )

if __name__ == "__main__":
    print(f"Starting PDFCraft Studio on http://localhost:8000")
    print(f"Native bangla-pdf-ocr: {'Enabled' if HAS_BANGLA_OCR else 'Disabled (Browser WASM mode active)'}")
    print(f"PyMuPDF Security Engine: {'Enabled' if HAS_FITZ else 'Disabled'}")
    app.run(host="0.0.0.0", port=8000, debug=True)
