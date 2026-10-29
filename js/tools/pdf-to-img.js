// PDF to Images Tool Module
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.pdfToImg = {
  file: null,
  pdfJsDoc: null,
  totalPages: 0,

  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropZone = document.getElementById('pdfToImgDropZone');
    const fileInput = document.getElementById('pdfToImgFileInput');
    const processBtn = document.getElementById('pdfToImgProcessBtn');

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
      window.PDFCraftApp.showLoader('Loading PDF pages for image conversion...');
      this.file = file;
      const arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(file);
      this.pdfJsDoc = await window.PDFCraftHelpers.loadPdfJsDoc(arrayBuffer);
      this.totalPages = this.pdfJsDoc.numPages;

      document.getElementById('pdfToImgFileName').textContent = file.name;
      document.getElementById('pdfToImgFileMeta').textContent = `${this.totalPages} pages • ${window.PDFCraftHelpers.formatBytes(file.size)}`;
      document.getElementById('pdfToImgRangeInput').value = `1-${this.totalPages}`;
      document.getElementById('pdfToImgRangeHelp').textContent = `Document has ${this.totalPages} pages.`;

      document.getElementById('pdfToImgFileDetails').classList.remove('hidden');
      document.getElementById('pdfToImgControls').classList.remove('hidden');

      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Loaded ${file.name} (${this.totalPages} pages)`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Error reading PDF: ${err.message}`, 'error');
      console.error(err);
    }
  },

  async process() {
    if (!this.pdfJsDoc) {
      window.PDFCraftApp.showToast('Please select a PDF first.', 'warning');
      return;
    }

    const format = document.getElementById('pdfToImgFormatSelect')?.value || 'image/png';
    const scale = parseFloat(document.getElementById('pdfToImgScaleSelect')?.value || '2.0');
    const rangeStr = document.getElementById('pdfToImgRangeInput')?.value || '';
    const pageIndices = window.PDFCraftHelpers.parsePageRanges(rangeStr, this.totalPages);

    if (pageIndices.length === 0) {
      window.PDFCraftApp.showToast('No pages selected.', 'error');
      return;
    }

    const ext = format === 'image/jpeg' ? 'jpg' : 'png';
    const baseName = this.file.name.replace(/\.pdf$/i, '');

    try {
      window.PDFCraftApp.showLoader(`Converting ${pageIndices.length} page(s) to ${ext.toUpperCase()}...`);

      if (pageIndices.length === 1) {
        // Single page download
        const pageNum = pageIndices[0] + 1;
        const canvas = await window.PDFCraftHelpers.renderPageToCanvas(this.pdfJsDoc, pageNum, scale);
        canvas.toBlob(blob => {
          window.PDFCraftDownload.downloadBlob(blob, `${baseName}_page_${pageNum}.${ext}`);
          window.PDFCraftApp.hideLoader();
          window.PDFCraftApp.showToast(`Downloaded Page ${pageNum} as ${ext.toUpperCase()}!`, 'success');
        }, format, 0.95);
      } else {
        // Multiple pages bundled into ZIP
        const zipFiles = [];
        for (let i = 0; i < pageIndices.length; i++) {
          const pageNum = pageIndices[i] + 1;
          const canvas = await window.PDFCraftHelpers.renderPageToCanvas(this.pdfJsDoc, pageNum, scale);
          const dataUrl = canvas.toDataURL(format, 0.95);
          const base64Data = dataUrl.split(',')[1];
          zipFiles.push({
            name: `${baseName}_page_${pageNum}.${ext}`,
            data: base64Data
          });
        }

        // Convert base64 data to binary inside JSZip
        if (!window.JSZip) throw new Error('JSZip not found');
        const zip = new window.JSZip();
        zipFiles.forEach(f => zip.file(f.name, f.data, { base64: true }));

        const content = await zip.generateAsync({ type: 'blob' });
        window.PDFCraftDownload.downloadBlob(content, `${baseName}_images.zip`);
        window.PDFCraftApp.hideLoader();
        window.PDFCraftApp.showToast(`Converted ${pageIndices.length} pages to images (ZIP downloaded)!`, 'success');
      }
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Conversion failed: ${err.message}`, 'error');
      console.error(err);
    }
  }
};
