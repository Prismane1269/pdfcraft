// Download and export utilities
window.PDFCraftDownload = {
  // Download raw Blob
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },

  // Download Uint8Array (PDF byte stream)
  downloadPdfBytes(bytes, filename = 'document.pdf') {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    this.downloadBlob(blob, filename);
  },

  // Download plain text as file
  downloadText(text, filename = 'extracted_text.txt') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    this.downloadBlob(blob, filename);
  },

  // Download Word doc format (.doc with HTML content)
  downloadDoc(htmlOrText, filename = 'document.doc') {
    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${filename}</title>
      <style>
        body { font-family: 'SolaimanLipi', 'Kalpurush', 'Noto Serif Bengali', Arial, sans-serif; font-size: 14pt; line-height: 1.6; }
        .page-break { page-break-after: always; }
      </style>
      </head>
      <body>
        ${htmlOrText.replace(/\n/g, '<br/>')}
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    this.downloadBlob(blob, filename);
  },

  // Download multiple items as a ZIP file
  async downloadZip(fileList, zipFilename = 'archive.zip') {
    if (!window.JSZip) {
      throw new Error('JSZip library not found.');
    }
    const zip = new window.JSZip();

    for (const item of fileList) {
      // item = { name: 'page-1.png', data: Blob | Uint8Array | string }
      zip.file(item.name, item.data);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    this.downloadBlob(content, zipFilename);
  }
};
