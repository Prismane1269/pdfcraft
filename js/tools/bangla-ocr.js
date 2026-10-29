// Bengali PDF OCR Tool Module - Powered by bangla-pdf-ocr Engine
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.banglaOcr = {
  file: null,
  arrayBuffer: null,
  pdfJsDoc: null,
  totalPages: 0,
  ocrWorker: null,
  isProcessing: false,
  results: [], // Array of { pageNum, text, confidence, imageURL }
  hasLocalServer: false,

  async init() {
    this.bindEvents();
    this.checkLocalServer();
  },

  async checkLocalServer() {
    try {
      const res = await fetch('http://localhost:8000/api/status', { method: 'GET', signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        this.hasLocalServer = true;
        const badge = document.getElementById('banglaServerStatusBadge');
        if (badge) {
          badge.innerHTML = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            Local bangla-pdf-ocr Connected
          </span>`;
        }
        const select = document.getElementById('banglaOcrEngineSelect');
        if (select) {
          select.value = 'local';
        }
      }
    } catch (e) {
      this.hasLocalServer = false;
      const badge = document.getElementById('banglaServerStatusBadge');
      if (badge) {
        badge.innerHTML = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5"></span>
          Browser WebAssembly Engine Active
        </span>`;
      }
    }
  },

  bindEvents() {
    const dropZone = document.getElementById('banglaDropZone');
    const fileInput = document.getElementById('banglaFileInput');
    const startBtn = document.getElementById('banglaStartBtn');
    const stopBtn = document.getElementById('banglaStopBtn');
    const copyBtn = document.getElementById('banglaCopyBtn');
    const downloadTxtBtn = document.getElementById('banglaDownloadTxtBtn');
    const downloadDocBtn = document.getElementById('banglaDownloadDocBtn');
    const sampleBtn = document.getElementById('banglaSampleBtn');

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

    if (startBtn) {
      startBtn.addEventListener('click', () => this.startOcr());
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopOcr());
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyText());
    }

    if (downloadTxtBtn) {
      downloadTxtBtn.addEventListener('click', () => this.downloadTxt());
    }

    if (downloadDocBtn) {
      downloadDocBtn.addEventListener('click', () => this.downloadDoc());
    }

    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => this.loadSamplePdf());
    }
  },

  async loadSamplePdf() {
    try {
      window.PDFCraftApp.showLoader('Loading official Bengali sample PDF...');
      const res = await fetch('./sample_pdfs/sample_bangla.pdf');
      if (!res.ok) throw new Error('Could not load sample PDF');
      const blob = await res.blob();
      const file = new File([blob], 'Freedom Fight.pdf', { type: 'application/pdf' });
      await this.handleFile(file);
    } catch (e) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Sample load failed: ${e.message}`, 'error');
    }
  },

  async handleFile(file) {
    if (!file || (file.type !== 'application/pdf' && !file.name.endsWith('.pdf'))) {
      window.PDFCraftApp.showToast('Please upload a valid PDF document.', 'error');
      return;
    }

    try {
      window.PDFCraftApp.showLoader('Loading Bengali PDF document...');
      this.file = file;
      this.arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(file);
      this.pdfJsDoc = await window.PDFCraftHelpers.loadPdfJsDoc(this.arrayBuffer);
      this.totalPages = this.pdfJsDoc.numPages;

      document.getElementById('banglaFileName').textContent = file.name;
      document.getElementById('banglaFileMeta').textContent = `${this.totalPages} pages • ${window.PDFCraftHelpers.formatBytes(file.size)}`;
      document.getElementById('banglaRangeInput').value = `1-${Math.min(this.totalPages, 3)}`;
      document.getElementById('banglaRangeHelp').textContent = `Total ${this.totalPages} pages in document. Example: 1-${this.totalPages}`;

      // Render page 1 preview
      const canvas = document.getElementById('banglaPreviewCanvas');
      if (canvas) {
        await window.PDFCraftHelpers.renderPageToCanvas(this.pdfJsDoc, 1, 0.7, canvas);
      }

      document.getElementById('banglaFileDetails').classList.remove('hidden');
      document.getElementById('banglaControls').classList.remove('hidden');

      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Loaded "${file.name}" ready for Bengali OCR!`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Failed to parse PDF: ${err.message}`, 'error');
      console.error(err);
    }
  },

  async startOcr() {
    if (!this.file || !this.pdfJsDoc) {
      window.PDFCraftApp.showToast('Please upload a Bengali PDF first.', 'warning');
      return;
    }

    const engine = document.getElementById('banglaOcrEngineSelect')?.value || 'wasm';
    const lang = document.getElementById('banglaLangSelect')?.value || 'ben';
    const rangeStr = document.getElementById('banglaRangeInput')?.value || '';
    const pageIndices = window.PDFCraftHelpers.parsePageRanges(rangeStr, this.totalPages);

    if (pageIndices.length === 0) {
      window.PDFCraftApp.showToast('No valid pages to process in selected range.', 'error');
      return;
    }

    this.isProcessing = true;
    this.results = [];

    // UI Updates
    document.getElementById('banglaProgressContainer').classList.remove('hidden');
    document.getElementById('banglaStartBtn').classList.add('hidden');
    document.getElementById('banglaStopBtn').classList.remove('hidden');
    document.getElementById('banglaOutputSection').classList.remove('hidden');
    document.getElementById('banglaOutputTextarea').value = '';

    if (engine === 'local' && this.hasLocalServer) {
      await this.runLocalServerOcr(lang, pageIndices);
    } else {
      await this.runWasmOcr(lang, pageIndices);
    }
  },

  async runLocalServerOcr(lang, pageIndices) {
    try {
      this.updateProgress(10, `Sending to local bangla-pdf-ocr server (Language: ${lang})...`);
      const formData = new FormData();
      formData.append('file', this.file);
      formData.append('language', lang);
      formData.append('pages', pageIndices.map(i => i + 1).join(','));

      const response = await fetch('http://localhost:8000/api/ocr/bangla', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Local server OCR failed.');
      }

      this.updateProgress(85, 'Finalizing Bengali text extraction from native engine...');
      const data = await response.json();

      let combinedText = '';
      if (data.pages && Array.isArray(data.pages)) {
        for (const p of data.pages) {
          combinedText += `\n--- Page ${p.page} ---\n${p.text}\n`;
        }
      } else if (data.text) {
        combinedText = data.text;
      }

      document.getElementById('banglaOutputTextarea').value = combinedText.trim();
      this.updateProgress(100, 'Bengali OCR completed successfully via bangla-pdf-ocr!');
      this.finalizeOcr(true);
    } catch (err) {
      console.warn('Local OCR fallback to WASM:', err);
      window.PDFCraftApp.showToast(`Local server failed (${err.message}). Falling back to Browser WebAssembly...`, 'warning');
      await this.runWasmOcr(lang, pageIndices);
    }
  },

  async runWasmOcr(lang, pageIndices) {
    try {
      this.updateProgress(5, 'Initializing Tesseract WebAssembly engine with Bengali models...');
      
      // Initialize Tesseract Worker
      if (!this.ocrWorker) {
        this.ocrWorker = await Tesseract.createWorker(lang, 1, {
          logger: m => {
            if (m.status === 'recognizing text' && m.progress) {
              const currentOverall = Math.floor(this.currentBaseProgress + (m.progress * this.perPageProgressShare));
              this.updateProgress(currentOverall, `Recognizing Bengali characters: ${(m.progress * 100).toFixed(0)}%`);
            }
          }
        });
      }

      const totalToProcess = pageIndices.length;
      this.perPageProgressShare = 85 / totalToProcess;

      let fullExtractedText = '';

      for (let i = 0; i < totalToProcess; i++) {
        if (!this.isProcessing) break;

        const pageNum = pageIndices[i] + 1;
        this.currentBaseProgress = 10 + (i * this.perPageProgressShare);
        this.updateProgress(
          this.currentBaseProgress,
          `Rendering Page ${pageNum} of ${this.totalPages} (Poppler-style 2x scale)...`
        );

        // Render page at 2.0x scale for crisp Bengali font/conjunct recognition
        const pageCanvas = await window.PDFCraftHelpers.renderPageToCanvas(this.pdfJsDoc, pageNum, 2.0);

        // Update live preview canvas
        const liveCanvas = document.getElementById('banglaPreviewCanvas');
        if (liveCanvas) {
          const ctx = liveCanvas.getContext('2d');
          liveCanvas.width = pageCanvas.width / 3;
          liveCanvas.height = pageCanvas.height / 3;
          ctx.drawImage(pageCanvas, 0, 0, liveCanvas.width, liveCanvas.height);
        }

        this.updateProgress(
          this.currentBaseProgress + (this.perPageProgressShare * 0.2),
          `Running bangla-pdf-ocr engine on Page ${pageNum}...`
        );

        // Run OCR on page canvas
        const { data } = await this.ocrWorker.recognize(pageCanvas);
        const pageText = data.text ? data.text.trim() : '';

        const formattedPage = `\n--- Page ${pageNum} ---\n${pageText}\n`;
        fullExtractedText += formattedPage;

        // Stream output directly into textarea
        document.getElementById('banglaOutputTextarea').value = fullExtractedText.trim();
        this.updateStats();
      }

      this.updateProgress(100, `Completed OCR on ${totalToProcess} page(s)!`);
      this.finalizeOcr(true);
    } catch (err) {
      this.finalizeOcr(false);
      window.PDFCraftApp.showToast(`OCR error: ${err.message}`, 'error');
      console.error(err);
    }
  },

  updateProgress(percent, message) {
    const bar = document.getElementById('banglaProgressBar');
    const msg = document.getElementById('banglaProgressText');
    const percentEl = document.getElementById('banglaProgressPercent');

    if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (msg) msg.textContent = message;
    if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
  },

  updateStats() {
    const text = document.getElementById('banglaOutputTextarea')?.value || '';
    const statsEl = document.getElementById('banglaOutputStats');
    if (statsEl) {
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      statsEl.textContent = `${words} Bengali words • ${chars} characters`;
    }
  },

  stopOcr() {
    this.isProcessing = false;
    this.finalizeOcr(false);
    window.PDFCraftApp.showToast('OCR operation stopped.', 'warning');
  },

  finalizeOcr(success) {
    this.isProcessing = false;
    document.getElementById('banglaStartBtn').classList.remove('hidden');
    document.getElementById('banglaStopBtn').classList.add('hidden');
    this.updateStats();
    if (success) {
      window.PDFCraftApp.showToast('Bengali text extraction complete!', 'success');
    }
  },

  copyText() {
    const textarea = document.getElementById('banglaOutputTextarea');
    if (!textarea || !textarea.value) {
      window.PDFCraftApp.showToast('No text to copy.', 'warning');
      return;
    }
    navigator.clipboard.writeText(textarea.value).then(() => {
      window.PDFCraftApp.showToast('Bengali text copied to clipboard!', 'success');
    });
  },

  downloadTxt() {
    const text = document.getElementById('banglaOutputTextarea')?.value;
    if (!text) {
      window.PDFCraftApp.showToast('No text to download.', 'warning');
      return;
    }
    const baseName = this.file ? this.file.name.replace(/\.pdf$/i, '') : 'bangla_doc';
    window.PDFCraftDownload.downloadText(text, `${baseName}_bangla_ocr.txt`);
    window.PDFCraftApp.showToast('Bengali text downloaded as .txt!', 'success');
  },

  downloadDoc() {
    const text = document.getElementById('banglaOutputTextarea')?.value;
    if (!text) {
      window.PDFCraftApp.showToast('No text to download.', 'warning');
      return;
    }
    const baseName = this.file ? this.file.name.replace(/\.pdf$/i, '') : 'bangla_doc';
    window.PDFCraftDownload.downloadDoc(text, `${baseName}_bangla_ocr.doc`);
    window.PDFCraftApp.showToast('Downloaded as Word Document (.doc)!', 'success');
  }
};
