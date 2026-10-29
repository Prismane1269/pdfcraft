// Extract Text Tool Module (Standard selectable text extraction)
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.extractText = {
  file: null,
  pdfJsDoc: null,
  pagesText: [], // Array of { pageNum, text }
  currentPageView: 0, // 0 = all pages, 1..N = specific page

  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropZone = document.getElementById('extractDropZone');
    const fileInput = document.getElementById('extractFileInput');
    const copyBtn = document.getElementById('extractCopyBtn');
    const downloadBtn = document.getElementById('extractDownloadBtn');
    const searchInput = document.getElementById('extractSearchInput');
    const pageSelect = document.getElementById('extractPageSelect');

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

    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyToClipboard());
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadText());
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterText(e.target.value));
    }

    if (pageSelect) {
      pageSelect.addEventListener('change', (e) => {
        this.currentPageView = parseInt(e.target.value, 10);
        this.renderOutput();
      });
    }
  },

  async handleFile(file) {
    if (!file || (file.type !== 'application/pdf' && !file.name.endsWith('.pdf'))) {
      window.PDFCraftApp.showToast('Please upload a valid PDF file.', 'error');
      return;
    }

    try {
      window.PDFCraftApp.showLoader('Extracting text content from PDF...');
      this.file = file;
      const arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(file);
      this.pdfJsDoc = await window.PDFCraftHelpers.loadPdfJsDoc(arrayBuffer);
      const totalPages = this.pdfJsDoc.numPages;

      this.pagesText = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await this.pdfJsDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageStrings = textContent.items.map(item => item.str);
        const pageText = pageStrings.join(' ');
        this.pagesText.push({
          pageNum: i,
          text: pageText.trim()
        });
      }

      // Populate page selector
      const pageSelect = document.getElementById('extractPageSelect');
      if (pageSelect) {
        pageSelect.innerHTML = `<option value="0">All Pages (${totalPages})</option>` +
          this.pagesText.map(p => `<option value="${p.pageNum}">Page ${p.pageNum}</option>`).join('');
        this.currentPageView = 0;
      }

      document.getElementById('extractControls').classList.remove('hidden');
      this.renderOutput();

      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Extracted text from ${totalPages} page(s)!`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Extraction failed: ${err.message}`, 'error');
      console.error(err);
    }
  },

  renderOutput(searchQuery = '') {
    const outputBox = document.getElementById('extractOutputBox');
    const statsEl = document.getElementById('extractStats');
    if (!outputBox) return;

    let textToDisplay = '';
    if (this.currentPageView === 0) {
      textToDisplay = this.pagesText.map(p => `--- PAGE ${p.pageNum} ---\n${p.text || '[No selectable text on this page]'}\n`).join('\n');
    } else {
      const pageData = this.pagesText.find(p => p.pageNum === this.currentPageView);
      textToDisplay = pageData ? `--- PAGE ${pageData.pageNum} ---\n${pageData.text || '[No selectable text on this page]'}` : '';
    }

    const words = textToDisplay.trim() ? textToDisplay.trim().split(/\s+/).length : 0;
    const chars = textToDisplay.length;

    if (statsEl) {
      statsEl.textContent = `${words} words • ${chars} characters`;
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const regex = new RegExp(`(${this.escapeRegex(searchQuery.trim())})`, 'gi');
      const highlighted = this.escapeHtml(textToDisplay).replace(regex, '<mark class="bg-yellow-400 text-black px-1 rounded">$1</mark>');
      outputBox.innerHTML = highlighted;
    } else {
      outputBox.textContent = textToDisplay;
    }
  },

  filterText(query) {
    this.renderOutput(query);
  },

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  copyToClipboard() {
    const outputBox = document.getElementById('extractOutputBox');
    if (!outputBox || !outputBox.textContent) {
      window.PDFCraftApp.showToast('No text to copy.', 'warning');
      return;
    }
    navigator.clipboard.writeText(outputBox.textContent).then(() => {
      window.PDFCraftApp.showToast('Text copied to clipboard!', 'success');
    }).catch(err => {
      window.PDFCraftApp.showToast('Failed to copy to clipboard.', 'error');
    });
  },

  downloadText() {
    const outputBox = document.getElementById('extractOutputBox');
    if (!outputBox || !outputBox.textContent) {
      window.PDFCraftApp.showToast('No text to download.', 'warning');
      return;
    }
    const baseName = this.file ? this.file.name.replace(/\.pdf$/i, '') : 'extracted';
    window.PDFCraftDownload.downloadText(outputBox.textContent, `${baseName}_extracted_text.txt`);
    window.PDFCraftApp.showToast('Text file downloaded!', 'success');
  }
};
