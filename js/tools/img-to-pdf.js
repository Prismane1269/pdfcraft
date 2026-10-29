// Images to PDF Tool Module
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.imgToPdf = {
  images: [], // Array of { id, file, name, size, dataUrl, width, height }

  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropZone = document.getElementById('imgToPdfDropZone');
    const fileInput = document.getElementById('imgToPdfFileInput');
    const processBtn = document.getElementById('imgToPdfProcessBtn');
    const clearBtn = document.getElementById('imgToPdfClearBtn');

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
    const validFiles = fileList.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      window.PDFCraftApp.showToast('Please select valid image files (PNG, JPG, WebP).', 'error');
      return;
    }

    try {
      window.PDFCraftApp.showLoader(`Loading ${validFiles.length} image(s)...`);

      for (const file of validFiles) {
        const dataUrl = await window.PDFCraftHelpers.readFileAsDataURL(file);
        const { width, height } = await this.getImageDimensions(dataUrl);

        this.images.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          name: file.name,
          size: file.size,
          dataUrl,
          width,
          height
        });
      }

      this.renderGrid();
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Added ${validFiles.length} image(s)`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Error loading images: ${err.message}`, 'error');
      console.error(err);
    }
  },

  getImageDimensions(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 800, height: 600 });
      img.src = src;
    });
  },

  renderGrid() {
    const grid = document.getElementById('imgToPdfGrid');
    const controls = document.getElementById('imgToPdfControls');
    const countEl = document.getElementById('imgToPdfTotalCount');

    if (!grid) return;

    if (this.images.length === 0) {
      grid.innerHTML = '';
      if (controls) controls.classList.add('hidden');
      return;
    }

    if (controls) controls.classList.remove('hidden');
    if (countEl) countEl.textContent = `${this.images.length} image(s) selected`;

    grid.innerHTML = this.images.map((img, idx) => `
      <div class="relative group bg-gray-800/70 border border-gray-700 rounded-lg p-2 flex flex-col items-center">
        <div class="w-full h-32 flex items-center justify-center bg-gray-900 rounded overflow-hidden mb-2">
          <img src="${img.dataUrl}" alt="${img.name}" class="max-h-full max-w-full object-contain">
        </div>
        <p class="text-xs text-gray-300 font-medium truncate w-full text-center">${img.name}</p>
        <p class="text-[10px] text-gray-400">${img.width}x${img.height} • ${window.PDFCraftHelpers.formatBytes(img.size)}</p>
        <div class="flex items-center space-x-1 mt-2">
          <button onclick="window.PDFCraftTools.imgToPdf.moveItem(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} class="p-1 text-gray-400 hover:text-white disabled:opacity-20 text-xs">◀</button>
          <span class="text-xs text-indigo-400 font-bold px-1">${idx + 1}</span>
          <button onclick="window.PDFCraftTools.imgToPdf.moveItem(${idx}, 1)" ${idx === this.images.length - 1 ? 'disabled' : ''} class="p-1 text-gray-400 hover:text-white disabled:opacity-20 text-xs">▶</button>
          <button onclick="window.PDFCraftTools.imgToPdf.removeItem(${idx})" class="p-1 text-red-400 hover:text-red-300 ml-1 text-xs">✕</button>
        </div>
      </div>
    `).join('');
  },

  moveItem(idx, dir) {
    const target = idx + dir;
    if (target < 0 || target >= this.images.length) return;
    const temp = this.images[idx];
    this.images[idx] = this.images[target];
    this.images[target] = temp;
    this.renderGrid();
  },

  removeItem(idx) {
    this.images.splice(idx, 1);
    this.renderGrid();
  },

  clearAll() {
    this.images = [];
    this.renderGrid();
  },

  async process() {
    if (this.images.length === 0) {
      window.PDFCraftApp.showToast('Please add at least one image.', 'warning');
      return;
    }

    try {
      window.PDFCraftApp.showLoader(`Creating PDF from ${this.images.length} images...`);
      const pdfDoc = await window.PDFLib.PDFDocument.create();

      const pageSizeOption = document.getElementById('imgToPdfPageSize')?.value || 'fit';
      const margin = parseInt(document.getElementById('imgToPdfMargin')?.value || '0', 10);

      for (const item of this.images) {
        let embeddedImage;
        const arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(item.file);

        if (item.file.type === 'image/jpeg' || item.file.name.match(/\.(jpg|jpeg)$/i)) {
          embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
        } else {
          // Fallback or PNG
          try {
            embeddedImage = await pdfDoc.embedPng(arrayBuffer);
          } catch (e) {
            // If WebP or unsupported PNG, convert via canvas to PNG first
            const imgCanvas = document.createElement('canvas');
            imgCanvas.width = item.width;
            imgCanvas.height = item.height;
            const ctx = imgCanvas.getContext('2d');
            const htmlImg = new Image();
            htmlImg.src = item.dataUrl;
            await new Promise(res => { htmlImg.onload = res; });
            ctx.drawImage(htmlImg, 0, 0);
            const pngDataUrl = imgCanvas.toDataURL('image/png');
            const pngBytes = Uint8Array.from(atob(pngDataUrl.split(',')[1]), c => c.charCodeAt(0));
            embeddedImage = await pdfDoc.embedPng(pngBytes);
          }
        }

        let pageWidth, pageHeight;
        if (pageSizeOption === 'a4') {
          pageWidth = 595.28;
          pageHeight = 841.89;
        } else if (pageSizeOption === 'letter') {
          pageWidth = 612.00;
          pageHeight = 792.00;
        } else {
          // Fit image directly
          pageWidth = item.width + (margin * 2);
          pageHeight = item.height + (margin * 2);
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Calculate fitted image dimensions within printable area
        const printableWidth = pageWidth - (margin * 2);
        const printableHeight = pageHeight - (margin * 2);

        const imgScale = Math.min(printableWidth / item.width, printableHeight / item.height);
        const drawWidth = item.width * imgScale;
        const drawHeight = item.height * imgScale;

        const x = margin + (printableWidth - drawWidth) / 2;
        const y = margin + (printableHeight - drawHeight) / 2;

        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight
        });
      }

      const pdfBytes = await pdfDoc.save();
      const outputName = document.getElementById('imgToPdfOutputName')?.value.trim() || 'images_converted.pdf';
      const finalName = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;

      window.PDFCraftDownload.downloadPdfBytes(pdfBytes, finalName);
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Generated PDF from ${this.images.length} image(s)!`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Error creating PDF: ${err.message}`, 'error');
      console.error(err);
    }
  }
};
