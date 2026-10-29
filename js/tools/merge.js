// Merge PDF Tool Module
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.merge = {
  files: [], // Array of { file, name, size, pages, arrayBuffer, pdfLibDoc }

  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropZone = document.getElementById('mergeDropZone');
    const fileInput = document.getElementById('mergeFileInput');
    const processBtn = document.getElementById('mergeProcessBtn');
    const clearBtn = document.getElementById('mergeClearBtn');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFiles(Array.from(e.target.files)));

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.handleFiles(Array.from(e.dataTransfer.files));
      }
    });

    if (processBtn) {
      processBtn.addEventListener('click', () => this.process());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAll());
    }
  },

  async handleFiles(fileList) {
    const pdfFiles = fileList.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      window.PDFCraftApp.showToast('Please upload valid PDF files.', 'error');
      return;
    }

    try {
      window.PDFCraftApp.showLoader(`Loading ${pdfFiles.length} PDF(s)...`);

      for (const file of pdfFiles) {
        const arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(file);
        const pdfLibDoc = await window.PDFCraftHelpers.loadPdfLibDoc(arrayBuffer);
        const pages = pdfLibDoc.getPageCount();

        this.files.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          name: file.name,
          size: file.size,
          pages,
          arrayBuffer,
          pdfLibDoc
        });
      }

      this.renderFileList();
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Added ${pdfFiles.length} file(s)`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Error adding files: ${err.message}`, 'error');
      console.error(err);
    }
  },

  renderFileList() {
    const listEl = document.getElementById('mergeFileList');
    const controls = document.getElementById('mergeControls');
    const countEl = document.getElementById('mergeTotalCount');

    if (!listEl) return;

    if (this.files.length === 0) {
      listEl.innerHTML = '';
      if (controls) controls.classList.add('hidden');
      return;
    }

    if (controls) controls.classList.remove('hidden');

    const totalPages = this.files.reduce((acc, f) => acc + f.pages, 0);
    const totalSize = this.files.reduce((acc, f) => acc + f.size, 0);
    if (countEl) {
      countEl.textContent = `${this.files.length} files • Total ${totalPages} pages (${window.PDFCraftHelpers.formatBytes(totalSize)})`;
    }

    listEl.innerHTML = this.files.map((item, idx) => `
      <div class="flex items-center justify-between p-3 bg-gray-800/60 border border-gray-700/60 rounded-lg mb-2 hover:border-indigo-500/50 transition">
        <div class="flex items-center space-x-3 overflow-hidden">
          <span class="w-6 h-6 flex items-center justify-center bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-bold">${idx + 1}</span>
          <div class="truncate">
            <p class="font-medium text-sm text-gray-200 truncate">${item.name}</p>
            <p class="text-xs text-gray-400">${item.pages} pages • ${window.PDFCraftHelpers.formatBytes(item.size)}</p>
          </div>
        </div>
        <div class="flex items-center space-x-1 flex-shrink-0">
          <button onclick="window.PDFCraftTools.merge.moveItem(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} class="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
          </button>
          <button onclick="window.PDFCraftTools.merge.moveItem(${idx}, 1)" ${idx === this.files.length - 1 ? 'disabled' : ''} class="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
          <button onclick="window.PDFCraftTools.merge.removeItem(${idx})" class="p-1 text-red-400 hover:text-red-300 ml-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>
    `).join('');
  },

  moveItem(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= this.files.length) return;
    const temp = this.files[index];
    this.files[index] = this.files[target];
    this.files[target] = temp;
    this.renderFileList();
  },

  removeItem(index) {
    this.files.splice(index, 1);
    this.renderFileList();
  },

  clearAll() {
    this.files = [];
    this.renderFileList();
  },

  async process() {
    if (this.files.length < 2) {
      window.PDFCraftApp.showToast('Please add at least 2 PDF files to merge.', 'warning');
      return;
    }

    try {
      window.PDFCraftApp.showLoader('Merging PDFs into a single document...');
      const mergedPdf = await window.PDFLib.PDFDocument.create();

      for (const item of this.files) {
        const srcDoc = item.pdfLibDoc;
        const pageIndices = srcDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);
        copiedPages.forEach(p => mergedPdf.addPage(p));
      }

      const mergedBytes = await mergedPdf.save();
      const filename = document.getElementById('mergeOutputName')?.value.trim() || 'merged_document.pdf';
      const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

      window.PDFCraftDownload.downloadPdfBytes(mergedBytes, finalName);
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Merged ${this.files.length} PDFs successfully!`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Merge failed: ${err.message}`, 'error');
      console.error(err);
    }
  }
};
