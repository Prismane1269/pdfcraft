// Rotate PDF Tool Module
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.rotate = {
  file: null,
  pdfLibDoc: null,
  pdfJsDoc: null,
  totalPages: 0,
  currentAngle: 90,

  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropZone = document.getElementById('rotateDropZone');
    const fileInput = document.getElementById('rotateFileInput');
    const processBtn = document.getElementById('rotateProcessBtn');
    const angleBtns = document.querySelectorAll('.rotate-angle-btn');

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

    angleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        angleBtns.forEach(b => b.classList.remove('bg-indigo-600', 'text-white'));
        btn.classList.add('bg-indigo-600', 'text-white');
        this.currentAngle = parseInt(btn.dataset.angle, 10);
        this.updatePreview();
      });
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
      window.PDFCraftApp.showLoader('Loading PDF for rotation...');
      this.file = file;
      const arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(file);
      this.pdfJsDoc = await window.PDFCraftHelpers.loadPdfJsDoc(arrayBuffer);
      this.pdfLibDoc = await window.PDFCraftHelpers.loadPdfLibDoc(arrayBuffer);
      this.totalPages = this.pdfJsDoc.numPages;

      document.getElementById('rotateFileName').textContent = file.name;
      document.getElementById('rotateFileMeta').textContent = `${this.totalPages} pages • ${window.PDFCraftHelpers.formatBytes(file.size)}`;

      document.getElementById('rotateFileDetails').classList.remove('hidden');
      document.getElementById('rotateControls').classList.remove('hidden');

      await this.updatePreview();

      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Loaded ${file.name} for rotation`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Error: ${err.message}`, 'error');
      console.error(err);
    }
  },

  async updatePreview() {
    const canvas = document.getElementById('rotatePreviewCanvas');
    if (!canvas || !this.pdfJsDoc) return;

    await window.PDFCraftHelpers.renderPageToCanvas(this.pdfJsDoc, 1, 0.6, canvas);
    canvas.style.transform = `rotate(${this.currentAngle}deg)`;
    canvas.style.transition = 'transform 0.3s ease';
  },

  async process() {
    if (!this.pdfLibDoc) return;

    const targetScope = document.querySelector('input[name="rotateScope"]:checked')?.value || 'all';

    try {
      window.PDFCraftApp.showLoader(`Applying ${this.currentAngle}° rotation...`);
      const pages = this.pdfLibDoc.getPages();

      pages.forEach((page, idx) => {
        const pageNum = idx + 1;
        let shouldRotate = false;

        if (targetScope === 'all') shouldRotate = true;
        else if (targetScope === 'odd' && pageNum % 2 !== 0) shouldRotate = true;
        else if (targetScope === 'even' && pageNum % 2 === 0) shouldRotate = true;

        if (shouldRotate) {
          const currentRot = page.getRotation().angle;
          page.setRotation(window.PDFLib.degrees((currentRot + this.currentAngle) % 360));
        }
      });

      const pdfBytes = await this.pdfLibDoc.save();
      const baseName = this.file.name.replace(/\.pdf$/i, '');
      window.PDFCraftDownload.downloadPdfBytes(pdfBytes, `${baseName}_rotated_${this.currentAngle}deg.pdf`);
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Rotated PDF downloaded!`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Rotation failed: ${err.message}`, 'error');
      console.error(err);
    }
  }
};
