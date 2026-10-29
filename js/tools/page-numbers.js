// Page Numbers PDF Tool Module
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.pageNumbers = {
  file: null,
  pdfLibDoc: null,
  pdfJsDoc: null,
  totalPages: 0,

  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropZone = document.getElementById('pageNumbersDropZone');
    const fileInput = document.getElementById('pageNumbersFileInput');
    const processBtn = document.getElementById('pageNumbersProcessBtn');

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

    ['pageNumberFormat', 'pageNumberPosition', 'pageNumberSize'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => this.updatePreview());
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
      window.PDFCraftApp.showLoader('Loading document for page numbering...');
      this.file = file;
      const arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(file);
      this.pdfJsDoc = await window.PDFCraftHelpers.loadPdfJsDoc(arrayBuffer);
      this.pdfLibDoc = await window.PDFCraftHelpers.loadPdfLibDoc(arrayBuffer);
      this.totalPages = this.pdfJsDoc.numPages;

      document.getElementById('pageNumbersFileName').textContent = file.name;
      document.getElementById('pageNumbersFileMeta').textContent = `${this.totalPages} pages • ${window.PDFCraftHelpers.formatBytes(file.size)}`;

      document.getElementById('pageNumbersFileDetails').classList.remove('hidden');
      document.getElementById('pageNumbersControls').classList.remove('hidden');

      await this.updatePreview();

      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Loaded ${file.name}`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Error: ${err.message}`, 'error');
      console.error(err);
    }
  },

  async updatePreview() {
    const canvas = document.getElementById('pageNumbersPreviewCanvas');
    if (!canvas || !this.pdfJsDoc) return;

    await window.PDFCraftHelpers.renderPageToCanvas(this.pdfJsDoc, 1, 0.7, canvas);
    const ctx = canvas.getContext('2d');

    const format = document.getElementById('pageNumberFormat')?.value || 'Page {n} of {total}';
    const position = document.getElementById('pageNumberPosition')?.value || 'bottom-center';
    const size = parseInt(document.getElementById('pageNumberSize')?.value || '12', 10);

    const text = format.replace('{n}', '1').replace('{total}', this.totalPages);

    ctx.save();
    ctx.font = `${size}px Inter, sans-serif`;
    ctx.fillStyle = '#1e293b';

    let x = canvas.width / 2;
    let y = canvas.height - 24;
    ctx.textAlign = 'center';

    if (position === 'bottom-left') {
      x = 30;
      ctx.textAlign = 'left';
    } else if (position === 'bottom-right') {
      x = canvas.width - 30;
      ctx.textAlign = 'right';
    } else if (position === 'top-center') {
      y = 30;
      ctx.textAlign = 'center';
    } else if (position === 'top-right') {
      x = canvas.width - 30;
      y = 30;
      ctx.textAlign = 'right';
    }

    ctx.fillText(text, x, y);
    ctx.restore();
  },

  async process() {
    if (!this.pdfLibDoc) return;

    const format = document.getElementById('pageNumberFormat')?.value || 'Page {n} of {total}';
    const position = document.getElementById('pageNumberPosition')?.value || 'bottom-center';
    const fontSize = parseInt(document.getElementById('pageNumberSize')?.value || '12', 10);
    const startNum = parseInt(document.getElementById('pageNumberStart')?.value || '1', 10);

    try {
      window.PDFCraftApp.showLoader(`Numbering ${this.totalPages} pages...`);
      const font = await this.pdfLibDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);
      const pages = this.pdfLibDoc.getPages();

      pages.forEach((page, idx) => {
        const { width, height } = page.getSize();
        const currentNum = startNum + idx;
        const text = format.replace('{n}', currentNum).replace('{total}', this.totalPages);
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        let x = (width - textWidth) / 2;
        let y = 24;

        if (position === 'bottom-left') {
          x = 36;
        } else if (position === 'bottom-right') {
          x = width - textWidth - 36;
        } else if (position === 'top-center') {
          y = height - 36;
        } else if (position === 'top-right') {
          x = width - textWidth - 36;
          y = height - 36;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: window.PDFLib.rgb(0.2, 0.2, 0.2)
        });
      });

      const pdfBytes = await this.pdfLibDoc.save();
      const baseName = this.file.name.replace(/\.pdf$/i, '');
      window.PDFCraftDownload.downloadPdfBytes(pdfBytes, `${baseName}_numbered.pdf`);
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Page numbers added successfully!`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Failed to add page numbers: ${err.message}`, 'error');
      console.error(err);
    }
  }
};
