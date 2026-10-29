// Compress PDF Tool Module
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.compress = {
  file: null,
  arrayBuffer: null,
  pdfJsDoc: null,
  totalPages: 0,

  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropZone = document.getElementById('compressDropZone');
    const fileInput = document.getElementById('compressFileInput');
    const processBtn = document.getElementById('compressProcessBtn');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFile(e.target.files[0]));

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });

    if (processBtn) {
      processBtn.addEventListener('click', () => this.process());
    }
  },

  async handleFile(file) {
    if (!file || (file.type !== 'application/pdf' && !file.name.endsWith('.pdf'))) {
      window.PDFCraftApp.showToast('Please upload a valid PDF.', 'error');
      return;
    }

    try {
      window.PDFCraftApp.showLoader('Analyzing PDF size and pages...');
      this.file = file;
      this.arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(file);
      this.pdfJsDoc = await window.PDFCraftHelpers.loadPdfJsDoc(this.arrayBuffer);
      this.totalPages = this.pdfJsDoc.numPages;

      document.getElementById('compressFileName').textContent = file.name;
      document.getElementById('compressFileMeta').textContent = `${this.totalPages} pages • Original size: ${window.PDFCraftHelpers.formatBytes(file.size)}`;

      document.getElementById('compressFileDetails').classList.remove('hidden');
      document.getElementById('compressControls').classList.remove('hidden');

      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Loaded ${file.name}`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Error: ${err.message}`, 'error');
      console.error(err);
    }
  },

  async process() {
    if (!this.pdfJsDoc) return;

    const level = document.getElementById('compressLevelSelect')?.value || 'medium';
    let quality = 0.65;
    let scale = 1.4;

    if (level === 'light') {
      quality = 0.85;
      scale = 1.8;
    } else if (level === 'extreme') {
      quality = 0.45;
      scale = 1.0;
    }

    try {
      window.PDFCraftApp.showLoader(`Compressing ${this.totalPages} pages (${level} mode)...`);
      const newDoc = await window.PDFLib.PDFDocument.create();

      for (let i = 1; i <= this.totalPages; i++) {
        const canvas = await window.PDFCraftHelpers.renderPageToCanvas(this.pdfJsDoc, i, scale);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const embeddedImg = await newDoc.embedJpg(bytes);

        const page = newDoc.addPage([canvas.width / scale, canvas.height / scale]);
        page.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: page.getWidth(),
          height: page.getHeight()
        });
      }

      const compressedBytes = await newDoc.save();
      const originalSize = this.file.size;
      const newSize = compressedBytes.length;
      const diffPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

      const baseName = this.file.name.replace(/\.pdf$/i, '');
      window.PDFCraftDownload.downloadPdfBytes(compressedBytes, `${baseName}_compressed.pdf`);

      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Compressed by ~${diffPercent}%! (${window.PDFCraftHelpers.formatBytes(newSize)})`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Compression failed: ${err.message}`, 'error');
      console.error(err);
    }
  }
};
