// Split PDF Tool Module
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.split = {
  file: null,
  arrayBuffer: null,
  pdfJsDoc: null,
  totalPages: 0,

  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropZone = document.getElementById('splitDropZone');
    const fileInput = document.getElementById('splitFileInput');
    const processBtn = document.getElementById('splitProcessBtn');
    const modeRadios = document.querySelectorAll('input[name="splitMode"]');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.handleFile(e.target.files[0]);
      }
    });

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

    modeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        const rangeContainer = document.getElementById('splitRangeContainer');
        if (rangeContainer) {
          rangeContainer.style.display = radio.value === 'range' ? 'block' : 'none';
        }
      });
    });

    if (processBtn) {
      processBtn.addEventListener('click', () => this.process());
    }
  },

  async handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      window.PDFCraftApp.showToast('Please upload a valid PDF file.', 'error');
      return;
    }

    try {
      window.PDFCraftApp.showLoader('Analyzing PDF document...');
      this.file = file;
      this.arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(file);
      this.pdfJsDoc = await window.PDFCraftHelpers.loadPdfJsDoc(this.arrayBuffer);
      this.totalPages = this.pdfJsDoc.numPages;

      // Update UI
      document.getElementById('splitFileName').textContent = file.name;
      document.getElementById('splitFileMeta').textContent = `${this.totalPages} pages • ${window.PDFCraftHelpers.formatBytes(file.size)}`;
      document.getElementById('splitFileDetails').classList.remove('hidden');
      document.getElementById('splitControls').classList.remove('hidden');
      document.getElementById('splitRangeInput').value = `1-${this.totalPages}`;
      document.getElementById('splitRangeHelp').textContent = `Document has ${this.totalPages} pages. Example: 1-2, 4, 5-${this.totalPages}`;

      // Render thumbnail of first page
      const canvas = document.getElementById('splitThumbCanvas');
      if (canvas) {
        await window.PDFCraftHelpers.renderPageToCanvas(this.pdfJsDoc, 1, 0.5, canvas);
      }

      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Loaded "${file.name}" (${this.totalPages} pages)`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Failed to read PDF: ${err.message}`, 'error');
      console.error('Split handleFile error:', err);
    }
  },

  async process() {
    if (!this.arrayBuffer) {
      window.PDFCraftApp.showToast('Please select a PDF file first.', 'warning');
      return;
    }

    const mode = document.querySelector('input[name="splitMode"]:checked')?.value || 'range';
    const baseName = this.file.name.replace(/\.pdf$/i, '');

    try {
      window.PDFCraftApp.showLoader('Processing PDF split...');
      const sourcePdfDoc = await window.PDFCraftHelpers.loadPdfLibDoc(this.arrayBuffer);

      if (mode === 'range') {
        const rangeStr = document.getElementById('splitRangeInput').value;
        const pageIndices = window.PDFCraftHelpers.parsePageRanges(rangeStr, this.totalPages);

        if (pageIndices.length === 0) {
          window.PDFCraftApp.hideLoader();
          window.PDFCraftApp.showToast('No valid pages found in the specified range.', 'error');
          return;
        }

        const newDoc = await window.PDFLib.PDFDocument.create();
        const copiedPages = await newDoc.copyPages(sourcePdfDoc, pageIndices);
        copiedPages.forEach(p => newDoc.addPage(p));

        const pdfBytes = await newDoc.save();
        const outName = `${baseName}_split_p${pageIndices.map(i => i + 1).join('-')}.pdf`;
        window.PDFCraftDownload.downloadPdfBytes(pdfBytes, outName);
        window.PDFCraftApp.showToast(`Successfully extracted ${pageIndices.length} page(s)!`, 'success');
      } else {
        // Split every page into individual single-page PDFs in a ZIP
        const zipFiles = [];
        for (let i = 0; i < this.totalPages; i++) {
          const singleDoc = await window.PDFLib.PDFDocument.create();
          const [copiedPage] = await singleDoc.copyPages(sourcePdfDoc, [i]);
          singleDoc.addPage(copiedPage);
          const singleBytes = await singleDoc.save();
          zipFiles.push({
            name: `${baseName}_page_${i + 1}.pdf`,
            data: singleBytes
          });
        }

        await window.PDFCraftDownload.downloadZip(zipFiles, `${baseName}_all_pages.zip`);
        window.PDFCraftApp.showToast(`Split into ${this.totalPages} individual PDFs (ZIP downloaded)!`, 'success');
      }

      window.PDFCraftApp.hideLoader();
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Split failed: ${err.message}`, 'error');
      console.error('Split process error:', err);
    }
  }
};
