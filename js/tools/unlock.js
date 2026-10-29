// Unlock PDF Tool Module (Remove password encryption)
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.unlock = {
  file: null,
  arrayBuffer: null,

  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropZone = document.getElementById('unlockDropZone');
    const fileInput = document.getElementById('unlockFileInput');
    const processBtn = document.getElementById('unlockProcessBtn');

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
      this.file = file;
      this.arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(file);

      document.getElementById('unlockFileName').textContent = file.name;
      document.getElementById('unlockFileMeta').textContent = `${window.PDFCraftHelpers.formatBytes(file.size)}`;

      document.getElementById('unlockFileDetails').classList.remove('hidden');
      document.getElementById('unlockControls').classList.remove('hidden');

      window.PDFCraftApp.showToast(`Loaded "${file.name}". Enter password to unlock.`, 'info');
    } catch (err) {
      window.PDFCraftApp.showToast(`Error: ${err.message}`, 'error');
      console.error(err);
    }
  },

  async process() {
    const password = document.getElementById('unlockPasswordInput')?.value || '';

    try {
      window.PDFCraftApp.showLoader('Unlocking and decrypting document...');

      // First try local backend if available
      let unlockedBytes = null;
      try {
        const formData = new FormData();
        formData.append('file', this.file);
        formData.append('password', password);

        const res = await fetch('http://localhost:8000/api/pdf/unlock', {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(3000)
        });

        if (res.ok) {
          const blob = await res.blob();
          unlockedBytes = new Uint8Array(await blob.arrayBuffer());
        }
      } catch (e) {
        // Fallback to client-side unlock
      }

      if (!unlockedBytes) {
        // Client-side unlock using PDF.js authenticated session + PDF-lib canvas rebuild
        const pdfJsDoc = await window.PDFCraftHelpers.loadPdfJsDoc(this.arrayBuffer, password);
        const total = pdfJsDoc.numPages;

        const newDoc = await window.PDFLib.PDFDocument.create();

        for (let i = 1; i <= total; i++) {
          const canvas = await window.PDFCraftHelpers.renderPageToCanvas(pdfJsDoc, i, 2.0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          const base64 = dataUrl.split(',')[1];
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          const embeddedImg = await newDoc.embedJpg(bytes);

          const page = newDoc.addPage([canvas.width / 2, canvas.height / 2]);
          page.drawImage(embeddedImg, {
            x: 0,
            y: 0,
            width: page.getWidth(),
            height: page.getHeight()
          });
        }

        unlockedBytes = await newDoc.save();
      }

      const baseName = this.file.name.replace(/\.pdf$/i, '');
      window.PDFCraftDownload.downloadPdfBytes(unlockedBytes, `${baseName}_unlocked.pdf`);
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast('Document unlocked successfully!', 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Unlock failed. Please verify password. (${err.message})`, 'error');
      console.error(err);
    }
  }
};
