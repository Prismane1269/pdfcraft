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

  // Safe clone helper to prevent ArrayBuffer detachment issues with Web Workers
  cloneBuffer(input) {
    if (!input) return new ArrayBuffer(0);
    if (input instanceof ArrayBuffer) {
      return input.slice(0);
    }
    if (input.buffer instanceof ArrayBuffer) {
      return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
    }
    return input;
  },

  // Load PDF with PDF.js (always clones to prevent worker detachment of original buffer)
  async loadPdfJsDoc(arrayBuffer, password = null) {
    this.initPdfJs();
    const cloned = this.cloneBuffer(arrayBuffer);
    const loadingTask = window.pdfjsLib.getDocument({
      data: new Uint8Array(cloned),
      password: password || undefined,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });
    return await loadingTask.promise;
  },

  // Load PDF with PDF-lib (always clones to protect original buffer)
  async loadPdfLibDoc(arrayBuffer, options = {}) {
    const cloned = this.cloneBuffer(arrayBuffer);
    return await window.PDFLib.PDFDocument.load(new Uint8Array(cloned), {
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
