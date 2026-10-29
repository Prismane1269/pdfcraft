// Organize & Delete PDF Pages Tool Module
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.organize = {
  file: null,
  pdfLibDoc: null,
  pdfJsDoc: null,
  pages: [], // Array of { originalIndex, rotation, isDeleted, thumbDataUrl }

  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropZone = document.getElementById('organizeDropZone');
    const fileInput = document.getElementById('organizeFileInput');
    const processBtn = document.getElementById('organizeProcessBtn');
    const resetBtn = document.getElementById('organizeResetBtn');

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

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetAll());
    }
  },

  async handleFile(file) {
    if (!file || (file.type !== 'application/pdf' && !file.name.endsWith('.pdf'))) {
      window.PDFCraftApp.showToast('Please upload a valid PDF.', 'error');
      return;
    }

    try {
      window.PDFCraftApp.showLoader('Rendering page thumbnails...');
      this.file = file;
      const arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(file);
      this.pdfJsDoc = await window.PDFCraftHelpers.loadPdfJsDoc(arrayBuffer);
      this.pdfLibDoc = await window.PDFCraftHelpers.loadPdfLibDoc(arrayBuffer);
      const total = this.pdfJsDoc.numPages;

      this.pages = [];
      for (let i = 1; i <= total; i++) {
        const canvas = await window.PDFCraftHelpers.renderPageToCanvas(this.pdfJsDoc, i, 0.4);
        this.pages.push({
          id: Math.random().toString(36).substring(2, 9),
          originalIndex: i - 1,
          pageNum: i,
          rotation: 0,
          isDeleted: false,
          thumbDataUrl: canvas.toDataURL('image/jpeg', 0.8)
        });
      }

      document.getElementById('organizeFileDetails').classList.remove('hidden');
      document.getElementById('organizeControls').classList.remove('hidden');
      document.getElementById('organizeFileName').textContent = file.name;

      this.renderGrid();
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Loaded ${total} pages for visual organizing!`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Error: ${err.message}`, 'error');
      console.error(err);
    }
  },

  renderGrid() {
    const grid = document.getElementById('organizeGrid');
    const stats = document.getElementById('organizeStats');
    if (!grid) return;

    const activePages = this.pages.filter(p => !p.isDeleted);
    if (stats) {
      stats.textContent = `${activePages.length} of ${this.pages.length} pages will be saved`;
    }

    grid.innerHTML = this.pages.map((p, idx) => `
      <div class="page-thumb-card ${p.isDeleted ? 'deleted' : ''} flex flex-col items-center">
        <div class="relative w-full h-44 bg-gray-950 flex items-center justify-center rounded overflow-hidden">
          <img src="${p.thumbDataUrl}" alt="Page ${p.pageNum}" 
               style="transform: rotate(${p.rotation}deg); transition: transform 0.2s ease;"
               class="max-h-full max-w-full object-contain">
          ${p.isDeleted ? '<div class="absolute inset-0 bg-red-950/70 flex items-center justify-center text-red-400 font-bold text-sm">DELETED</div>' : ''}
          <span class="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">P.${p.pageNum}</span>
        </div>
        <div class="w-full flex items-center justify-between mt-2 pt-1 border-t border-gray-700/60 text-xs">
          <div class="flex items-center space-x-1">
            <button onclick="window.PDFCraftTools.organize.movePage(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} class="p-1 text-gray-400 hover:text-white disabled:opacity-20" title="Move Left">◀</button>
            <button onclick="window.PDFCraftTools.organize.movePage(${idx}, 1)" ${idx === this.pages.length - 1 ? 'disabled' : ''} class="p-1 text-gray-400 hover:text-white disabled:opacity-20" title="Move Right">▶</button>
          </div>
          <div class="flex items-center space-x-1">
            <button onclick="window.PDFCraftTools.organize.rotatePage(${idx})" class="p-1 text-indigo-400 hover:text-indigo-300" title="Rotate 90°">↻</button>
            <button onclick="window.PDFCraftTools.organize.toggleDelete(${idx})" class="p-1 ${p.isDeleted ? 'text-emerald-400 hover:text-emerald-300' : 'text-red-400 hover:text-red-300'}" title="${p.isDeleted ? 'Restore Page' : 'Delete Page'}">
              ${p.isDeleted ? '↶' : '🗑'}
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  movePage(idx, dir) {
    const target = idx + dir;
    if (target < 0 || target >= this.pages.length) return;
    const temp = this.pages[idx];
    this.pages[idx] = this.pages[target];
    this.pages[target] = temp;
    this.renderGrid();
  },

  rotatePage(idx) {
    this.pages[idx].rotation = (this.pages[idx].rotation + 90) % 360;
    this.renderGrid();
  },

  toggleDelete(idx) {
    this.pages[idx].isDeleted = !this.pages[idx].isDeleted;
    this.renderGrid();
  },

  resetAll() {
    this.pages.forEach(p => {
      p.rotation = 0;
      p.isDeleted = false;
    });
    this.pages.sort((a, b) => a.originalIndex - b.originalIndex);
    this.renderGrid();
    window.PDFCraftApp.showToast('Reset all page modifications.', 'info');
  },

  async process() {
    const activePages = this.pages.filter(p => !p.isDeleted);
    if (activePages.length === 0) {
      window.PDFCraftApp.showToast('You must keep at least one page.', 'warning');
      return;
    }

    try {
      window.PDFCraftApp.showLoader(`Exporting ${activePages.length} organized pages...`);
      const newDoc = await window.PDFLib.PDFDocument.create();

      for (const item of activePages) {
        const [copiedPage] = await newDoc.copyPages(this.pdfLibDoc, [item.originalIndex]);
        if (item.rotation !== 0) {
          const currentRotation = copiedPage.getRotation().angle;
          copiedPage.setRotation(window.PDFLib.degrees((currentRotation + item.rotation) % 360));
        }
        newDoc.addPage(copiedPage);
      }

      const pdfBytes = await newDoc.save();
      const baseName = this.file.name.replace(/\.pdf$/i, '');
      window.PDFCraftDownload.downloadPdfBytes(pdfBytes, `${baseName}_organized.pdf`);
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Organized PDF exported successfully!`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Export failed: ${err.message}`, 'error');
      console.error(err);
    }
  }
};
