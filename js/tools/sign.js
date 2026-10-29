// Sign PDF Tool Module
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.sign = {
  file: null,
  pdfLibDoc: null,
  pdfJsDoc: null,
  totalPages: 0,
  targetPageNum: 1,
  stampPosition: { x: 50, y: 50 }, // percentage 0..100
  stampSize: { width: 140, height: 60 },
  signatureDataUrl: null,

  async init() {
    this.bindEvents();
    this.initSignaturePad();
  },

  bindEvents() {
    const dropZone = document.getElementById('signDropZone');
    const fileInput = document.getElementById('signFileInput');
    const processBtn = document.getElementById('signProcessBtn');
    const clearPadBtn = document.getElementById('signClearPadBtn');
    const signImgInput = document.getElementById('signImageUploadInput');
    const pageSelect = document.getElementById('signPageSelect');

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

    if (clearPadBtn) {
      clearPadBtn.addEventListener('click', () => this.clearPad());
    }

    if (signImgInput) {
      signImgInput.addEventListener('change', (e) => this.handleSignatureImage(e.target.files[0]));
    }

    if (pageSelect) {
      pageSelect.addEventListener('change', (e) => {
        this.targetPageNum = parseInt(e.target.value, 10);
        this.updateDocPreview();
      });
    }

    if (processBtn) {
      processBtn.addEventListener('click', () => this.process());
    }
  },

  initSignaturePad() {
    const canvas = document.getElementById('signaturePadCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const startDraw = (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      lastX = (clientX - rect.left) * (canvas.width / rect.width);
      lastY = (clientY - rect.top) * (canvas.height / rect.height);
    };

    const draw = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const curX = (clientX - rect.left) * (canvas.width / rect.width);
      const curY = (clientY - rect.top) * (canvas.height / rect.height);

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(curX, curY);
      ctx.stroke();

      lastX = curX;
      lastY = curY;
    };

    const stopDraw = () => {
      if (isDrawing) {
        isDrawing = false;
        this.signatureDataUrl = canvas.toDataURL('image/png');
        this.updateDocPreview();
      }
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDraw);
  },

  clearPad() {
    const canvas = document.getElementById('signaturePadCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.signatureDataUrl = null;
      this.updateDocPreview();
    }
  },

  async handleSignatureImage(file) {
    if (!file) return;
    this.signatureDataUrl = await window.PDFCraftHelpers.readFileAsDataURL(file);
    this.updateDocPreview();
    window.PDFCraftApp.showToast('Signature image loaded!', 'success');
  },

  async handleFile(file) {
    if (!file || (file.type !== 'application/pdf' && !file.name.endsWith('.pdf'))) {
      window.PDFCraftApp.showToast('Please upload a valid PDF.', 'error');
      return;
    }

    try {
      window.PDFCraftApp.showLoader('Loading document for signing...');
      this.file = file;
      const arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(file);
      this.pdfJsDoc = await window.PDFCraftHelpers.loadPdfJsDoc(arrayBuffer);
      this.pdfLibDoc = await window.PDFCraftHelpers.loadPdfLibDoc(arrayBuffer);
      this.totalPages = this.pdfJsDoc.numPages;

      document.getElementById('signFileName').textContent = file.name;
      document.getElementById('signFileMeta').textContent = `${this.totalPages} pages • ${window.PDFCraftHelpers.formatBytes(file.size)}`;

      const pageSelect = document.getElementById('signPageSelect');
      if (pageSelect) {
        pageSelect.innerHTML = Array.from({ length: this.totalPages }, (_, i) => `<option value="${i + 1}">Page ${i + 1}</option>`).join('');
        this.targetPageNum = 1;
      }

      document.getElementById('signFileDetails').classList.remove('hidden');
      document.getElementById('signControls').classList.remove('hidden');

      await this.updateDocPreview();

      // Bind click on preview canvas for position placement
      const previewCanvas = document.getElementById('signPreviewCanvas');
      if (previewCanvas) {
        previewCanvas.onclick = (e) => {
          const rect = previewCanvas.getBoundingClientRect();
          this.stampPosition.x = ((e.clientX - rect.left) / rect.width) * 100;
          this.stampPosition.y = ((e.clientY - rect.top) / rect.height) * 100;
          this.updateDocPreview();
        };
      }

      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Loaded ${file.name}. Place signature stamp.`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Error: ${err.message}`, 'error');
      console.error(err);
    }
  },

  async updateDocPreview() {
    const canvas = document.getElementById('signPreviewCanvas');
    if (!canvas || !this.pdfJsDoc) return;

    await window.PDFCraftHelpers.renderPageToCanvas(this.pdfJsDoc, this.targetPageNum, 0.75, canvas);
    const ctx = canvas.getContext('2d');

    if (this.signatureDataUrl) {
      const img = new Image();
      img.onload = () => {
        const stampW = (this.stampSize.width / 100) * 80;
        const stampH = (this.stampSize.height / 100) * 80;
        const posX = (this.stampPosition.x / 100) * canvas.width - (stampW / 2);
        const posY = (this.stampPosition.y / 100) * canvas.height - (stampH / 2);

        ctx.drawImage(img, posX, posY, stampW, stampH);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(posX, posY, stampW, stampH);
      };
      img.src = this.signatureDataUrl;
    }
  },

  async process() {
    if (!this.pdfLibDoc) return;
    if (!this.signatureDataUrl) {
      window.PDFCraftApp.showToast('Please draw or upload a signature first.', 'warning');
      return;
    }

    try {
      window.PDFCraftApp.showLoader(`Placing signature stamp on Page ${this.targetPageNum}...`);

      const pngBytes = Uint8Array.from(atob(this.signatureDataUrl.split(',')[1]), c => c.charCodeAt(0));
      const embeddedImg = await this.pdfLibDoc.embedPng(pngBytes);

      const page = this.pdfLibDoc.getPage(this.targetPageNum - 1);
      const { width, height } = page.getSize();

      const stampW = this.stampSize.width;
      const stampH = this.stampSize.height;

      const posX = (this.stampPosition.x / 100) * width - (stampW / 2);
      // In PDF coordinate space, (0,0) is bottom-left
      const posY = height - ((this.stampPosition.y / 100) * height) - (stampH / 2);

      page.drawImage(embeddedImg, {
        x: Math.max(0, posX),
        y: Math.max(0, posY),
        width: stampW,
        height: stampH
      });

      const pdfBytes = await this.pdfLibDoc.save();
      const baseName = this.file.name.replace(/\.pdf$/i, '');
      window.PDFCraftDownload.downloadPdfBytes(pdfBytes, `${baseName}_signed.pdf`);
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast('Signed PDF exported successfully!', 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Signing failed: ${err.message}`, 'error');
      console.error(err);
    }
  }
};
