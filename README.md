# PDFCraft Studio 🛠️📄
### All-in-One PDF Suite & High-Accuracy Bengali OCR

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-indigo.svg)](https://prismane1269.github.io/pdfcraft)
[![Bengali OCR](https://img.shields.io/badge/Powered%20By-bangla--pdf--ocr-emerald.svg)](https://github.com/Bangla-RAG/PoRAG)
[![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Client--Side-blue.svg)](#privacy--security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**PDFCraft** is a modern, fast, and privacy-first web application for all essential PDF operations. It includes a dedicated **Bengali PDF OCR Studio** powered by the open-source [bangla-pdf-ocr](https://github.com/Bangla-RAG/PoRAG) pipeline to accurately extract text from scanned Bengali documents, books, and manuscripts.

---

## 🌟 Key Features

### 🇧🇩 1. Bengali PDF OCR (Powered by `bangla-pdf-ocr`)
- **Dual Engine Execution**:
  - **Browser WebAssembly Mode**: Runs 100% in your browser using client-side Tesseract.js with Bengali traineddata (`ben` / `ben+eng`). Zero uploads, works anywhere (including GitHub Pages).
  - **Native Local Python Mode**: Automatically connects to local Python `bangla-pdf-ocr` engine via Poppler (`pdftoppm`) and native Tesseract C++ engine for lightning speed.
- **Complex Conjunct Recognition**: Accurately recognizes Bengali glyphs and conjuncts (e.g. ক্ষ, জ্ঞ, ষ্ণ, ক্ত, ঙ্গ).
- **Poppler-Style High-DPI Rendering**: 2.0x / 3.0x canvas sampling for crystal-clear character edges.
- **Real-Time Streaming**: Live page-by-page progress bar and instant text preview.
- **Export Options**: Copy to clipboard, download as UTF-8 `.txt`, or formatted Word document (`.doc`).

### ✂️ 2. Core PDF Tools
- **Split PDF**: Extract page ranges (e.g. `1-3, 5`) or split every page into separate individual PDFs bundled in a `.zip`.
- **Merge PDF**: Combine multiple PDFs into one document with interactive file reordering and drag-and-drop.
- **Extract Text**: Real-time selectable text extraction with search, word counts, and page filtering.
- **PDF to Images**: High-DPI export to PNG or JPEG, single-page or bulk ZIP download.
- **Images to PDF**: Convert JPG, PNG, and WebP into clean PDFs with orientation, margins, and A4/Letter formats.
- **Visual Organize & Delete**: Interactive thumbnail grid to reorder pages, rotate individual pages, or delete pages before saving.
- **Rotate PDF**: Rotate all or odd/even pages by 90°, 180°, or 270° with live canvas preview.
- **Protect PDF**: Add standard password protection with military-grade AES encryption.
- **Unlock PDF**: Remove password security from protected PDFs.
- **Watermark PDF**: Stamp custom text watermarks with custom angle, opacity, font size, and color.
- **Page Numbers**: Add headers or footers with dynamic numbering (`Page X of Y`).
- **Compress PDF**: Optimize and shrink PDF file size with balanced quality presets.
- **Sign PDF**: Interactive signature drawing pad with pen width and color controls, stamp placement, and image signature upload.
- **Metadata Editor**: View and update Title, Author, Subject, Keywords, Creator, and Producer.

---

## 🔒 Privacy & Security

PDFCraft runs **100% client-side** in your browser using modern WebAssembly (`pdf-lib`, `pdfjs-dist`, `tesseract.js`).
- **No documents or images are ever uploaded to any third-party server.**
- Your data never leaves your computer.
- Completely free and unlimited.

---

## 🚀 Quick Start

### Option A: Online on GitHub Pages
Visit: **[https://prismane1269.github.io/pdfcraft](https://prismane1269.github.io/pdfcraft)**

### Option B: Run Locally with Python & Native bangla-pdf-ocr
```bash
# Clone the repository
git clone https://github.com/Prismane1269/pdfcraft.git
cd pdfcraft

# Run the local backend (Flask)
python3 server.py
```
Open **`http://localhost:8000`** in your browser. The app will automatically detect your local `bangla-pdf-ocr` engine!

---

## 🧪 Testing

Run the automated test suite:
```bash
python3 test_tools.py
```

---

## 📄 License
MIT License. Created by [Taseen (Prismane1269)](https://github.com/Prismane1269).
