// Watermark PDF Tool Module
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.watermark = {
  file: null,
  pdfLibDoc: null,
  pdfJsDoc: null,
  totalPages: 0,

  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropZone = document.getElementById('watermarkDropZone');
    const fileInput = document.getElementById('watermarkFileInput');
    const processBtn = document.getElementById('watermarkProcessBtn');

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

    ['watermarkTextInput', 'watermarkSizeInput', 'watermarkOpacityInput', 'watermarkColorInput'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.updateLivePreview());
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
      window.PDFCraftApp.showLoader('Loading document for watermarking...');
      this.file = file;
      const arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(file);
      this.pdfJsDoc = await window.PDFCraftHelpers.loadPdfJsDoc(arrayBuffer);
      this.pdfLibDoc = await window.PDFCraftHelpers.loadPdfLibDoc(arrayBuffer);
      this.totalPages = this.pdfJsDoc.numPages;

      document.getElementById('watermarkFileName').textContent = file.name;
      document.getElementById('watermarkFileMeta').textContent = `${this.totalPages} pages • ${window.PDFCraftHelpers.formatBytes(file.size)}`;

      document.getElementById('watermarkFileDetails').classList.remove('hidden');
      document.getElementById('watermarkControls').classList.remove('hidden');

      await this.updateLivePreview();

      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Loaded ${file.name}`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Error: ${err.message}`, 'error');
      console.error(err);
    }
  },

  async updateLivePreview() {
    const canvas = document.getElementById('watermarkPreviewCanvas');
    if (!canvas || !this.pdfJsDoc) return;

    await window.PDFCraftHelpers.renderPageToCanvas(this.pdfJsDoc, 1, 0.7, canvas);
    const ctx = canvas.getContext('2d');

    const text = document.getElementById('watermarkTextInput')?.value || 'CONFIDENTIAL';
    const size = parseInt(document.getElementById('watermarkSizeInput')?.value || '48', 10);
    const opacity = parseFloat(document.getElementById('watermarkOpacityInput')?.value || '0.3');
    const color = document.getElementById('watermarkColorInput')?.value || '#ef4444';

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-45 * Math.PI / 180);
    ctx.font = `bold ${size * 0.7}px Inter, sans-serif`;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  },

  async process() {
    if (!this.pdfLibDoc) return;

    const text = document.getElementById('watermarkTextInput')?.value || 'CONFIDENTIAL';
    const fontSize = parseInt(document.getElementById('watermarkSizeInput')?.value || '48', 10);
    const opacity = parseFloat(document.getElementById('watermarkOpacityInput')?.value || '0.3');
    const hexColor = document.getElementById('watermarkColorInput')?.value || '#ef4444';

    // Parse hex color
    const r = parseInt(hexColor.slice(1, 3), 16) / 255;
    const g = parseInt(hexColor.slice(3, 5), 16) / 255;
    const b = parseInt(hexColor.slice(5, 7), 16) / 255;

    try {
      window.PDFCraftApp.showLoader(`Applying watermark across ${this.totalPages} pages...`);
      const font = await this.pdfLibDoc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
      const pages = this.pdfLibDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        page.drawText(text, {
          x: width / 2 - (textWidth / 2) * Math.cos(Math.PI / 4),
          y: height / 2 - (textWidth / 2) * Math.sin(Math.PI / 4),
          size: fontSize,
          font,
          color: window.PDFLib.rgb(r, g, b),
          opacity,
          rotate: window.PDFLib.degrees(45),
        });
      }

      const pdfBytes = await this.pdfLibDoc.save();
      const baseName = this.file.name.replace(/\.pdf$/i, '');
      window.PDFCraftDownload.downloadPdfBytes(pdfBytes, `${baseName}_watermarked.pdf`);
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Watermarked PDF downloaded!`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Watermarking failed: ${err.message}`, 'error');
      console.error(err);
    }
  }
};
