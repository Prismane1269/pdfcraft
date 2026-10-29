// PDF Metadata Editor Tool Module
window.PDFCraftTools = window.PDFCraftTools || {};

window.PDFCraftTools.metadata = {
  file: null,
  pdfLibDoc: null,
  arrayBuffer: null,

  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropZone = document.getElementById('metadataDropZone');
    const fileInput = document.getElementById('metadataFileInput');
    const processBtn = document.getElementById('metadataProcessBtn');

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
      window.PDFCraftApp.showLoader('Extracting document metadata...');
      this.file = file;
      this.arrayBuffer = await window.PDFCraftHelpers.readFileAsArrayBuffer(file);
      this.pdfLibDoc = await window.PDFCraftHelpers.loadPdfLibDoc(this.arrayBuffer);

      document.getElementById('metaTitleInput').value = this.pdfLibDoc.getTitle() || '';
      document.getElementById('metaAuthorInput').value = this.pdfLibDoc.getAuthor() || '';
      document.getElementById('metaSubjectInput').value = this.pdfLibDoc.getSubject() || '';
      document.getElementById('metaKeywordsInput').value = (this.pdfLibDoc.getKeywords() || []).join(', ');
      document.getElementById('metaCreatorInput').value = this.pdfLibDoc.getCreator() || 'PDFCraft Studio';
      document.getElementById('metaProducerInput').value = this.pdfLibDoc.getProducer() || 'PDFCraft';

      document.getElementById('metadataFileName').textContent = file.name;
      document.getElementById('metadataFileMeta').textContent = `${this.pdfLibDoc.getPageCount()} pages • ${window.PDFCraftHelpers.formatBytes(file.size)}`;

      document.getElementById('metadataFileDetails').classList.remove('hidden');
      document.getElementById('metadataControls').classList.remove('hidden');

      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Extracted metadata from ${file.name}`, 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Error: ${err.message}`, 'error');
      console.error(err);
    }
  },

  async process() {
    if (!this.pdfLibDoc) return;

    try {
      window.PDFCraftApp.showLoader('Saving updated metadata...');

      const title = document.getElementById('metaTitleInput')?.value || '';
      const author = document.getElementById('metaAuthorInput')?.value || '';
      const subject = document.getElementById('metaSubjectInput')?.value || '';
      const keywordsStr = document.getElementById('metaKeywordsInput')?.value || '';
      const creator = document.getElementById('metaCreatorInput')?.value || 'PDFCraft Studio';
      const producer = document.getElementById('metaProducerInput')?.value || 'PDFCraft';

      const keywords = keywordsStr.split(',').map(s => s.trim()).filter(Boolean);

      this.pdfLibDoc.setTitle(title);
      this.pdfLibDoc.setAuthor(author);
      this.pdfLibDoc.setSubject(subject);
      this.pdfLibDoc.setKeywords(keywords);
      this.pdfLibDoc.setCreator(creator);
      this.pdfLibDoc.setProducer(producer);
      this.pdfLibDoc.setModificationDate(new Date());

      const pdfBytes = await this.pdfLibDoc.save();
      const baseName = this.file.name.replace(/\.pdf$/i, '');
      window.PDFCraftDownload.downloadPdfBytes(pdfBytes, `${baseName}_metadata_updated.pdf`);

      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast('Metadata updated and PDF downloaded!', 'success');
    } catch (err) {
      window.PDFCraftApp.hideLoader();
      window.PDFCraftApp.showToast(`Update failed: ${err.message}`, 'error');
      console.error(err);
    }
  }
};
