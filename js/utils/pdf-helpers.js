// PDF Utilities using PDF.js and pdf-lib
window.PDFCraftHelpers = {
  // Ensure PDF.js worker is properly configured
  initPdfJs() {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = './js/vendor/pdf.worker.min.js';
    }
  },

  // Format bytes to human readable string
  formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  // Read file as ArrayBuffer
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  },

  // Read file as Data URL
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  },

  // Load PDF with PDF.js
  async loadPdfJsDoc(arrayBuffer, password = null) {
    this.initPdfJs();
    const loadingTask = window.pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password || undefined,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });
    return await loadingTask.promise;
  },

  // Load PDF with PDF-lib
  async loadPdfLibDoc(arrayBuffer, options = {}) {
    return await window.PDFLib.PDFDocument.load(arrayBuffer, {
      ignoreEncryption: options.ignoreEncryption || false,
      updateMetadata: options.updateMetadata !== false
    });
  },

  // Render a specific page to an HTML5 Canvas
  async renderPageToCanvas(pdfDoc, pageNumber, scale = 1.5, targetCanvas = null) {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = targetCanvas || document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    return canvas;
  },

  // Parse page range string like "1-3, 5, 8-10" to array of 0-based page indices
  parsePageRanges(rangeStr, totalPages) {
    if (!rangeStr || rangeStr.trim() === '') {
      // Default: all pages
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const pages = new Set();
    const parts = rangeStr.split(',');

    for (let part of parts) {
      part = part.trim();
      if (!part) continue;

      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        let start = parseInt(startStr, 10);
        let end = parseInt(endStr, 10);

        if (isNaN(start)) start = 1;
        if (isNaN(end)) end = totalPages;

        start = Math.max(1, Math.min(start, totalPages));
        end = Math.max(1, Math.min(end, totalPages));

        if (start <= end) {
          for (let p = start; p <= end; p++) {
            pages.add(p - 1);
          }
        } else {
          for (let p = start; p >= end; p--) {
            pages.add(p - 1);
          }
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          pages.add(pageNum - 1);
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  }
};
