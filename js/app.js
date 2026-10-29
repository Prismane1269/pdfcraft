// PDFCraft Main Application Controller
window.PDFCraftApp = {
  currentTool: null,
  theme: localStorage.getItem('pdfcraft_theme') || 'dark',

  init() {
    this.applyTheme(this.theme);
    this.bindGlobalEvents();
    this.initTools();
    this.handleRouting();
    window.PDFCraftHelpers.initPdfJs();
  },

  applyTheme(theme) {
    this.theme = theme;
    localStorage.setItem('pdfcraft_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.getElementById('themeToggleIcon')?.classList.replace('lucide-sun', 'lucide-moon');
    } else {
      document.documentElement.classList.remove('light-theme');
      document.getElementById('themeToggleIcon')?.classList.replace('lucide-moon', 'lucide-sun');
    }
  },

  toggleTheme() {
    this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
  },

  bindGlobalEvents() {
    // Theme toggle
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => this.toggleTheme());

    // Search bar filter
    const searchInput = document.getElementById('globalToolSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterTools(e.target.value));
    }

    // Category tabs
    document.querySelectorAll('.category-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.category-tab-btn').forEach(b => {
          b.classList.remove('bg-indigo-600', 'text-white');
          b.classList.add('text-gray-400', 'hover:text-white');
        });
        btn.classList.add('bg-indigo-600', 'text-white');
        btn.classList.remove('text-gray-400', 'hover:text-white');
        this.filterCategory(btn.dataset.category);
      });
    });

    // Tool card click
    document.querySelectorAll('.tool-card').forEach(card => {
      card.addEventListener('click', () => {
        const toolName = card.dataset.tool;
        if (toolName) this.openTool(toolName);
      });
    });

    // Back to dashboard
    document.querySelectorAll('.back-to-tools-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showDashboard());
    });

    // Quick jump to bangla ocr
    document.getElementById('heroBanglaOcrBtn')?.addEventListener('click', () => {
      this.openTool('bangla-ocr');
    });

    // Handle hash routing
    window.addEventListener('hashchange', () => this.handleRouting());
  },

  initTools() {
    Object.values(window.PDFCraftTools || {}).forEach(tool => {
      if (typeof tool.init === 'function') {
        tool.init();
      }
    });
  },

  handleRouting() {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash && hash !== 'dashboard') {
      this.openTool(hash, false);
    } else {
      this.showDashboard(false);
    }
  },

  showDashboard(updateHash = true) {
    this.currentTool = null;
    document.getElementById('dashboardSection')?.classList.remove('hidden');
    document.getElementById('toolWorkspaceSection')?.classList.add('hidden');
    document.querySelectorAll('.tool-panel').forEach(p => p.classList.add('hidden'));
    if (updateHash) {
      window.location.hash = 'dashboard';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  openTool(toolName, updateHash = true) {
    const targetPanel = document.getElementById(`tool-panel-${toolName}`);
    if (!targetPanel) {
      this.showDashboard();
      return;
    }

    this.currentTool = toolName;
    document.getElementById('dashboardSection')?.classList.add('hidden');
    document.getElementById('toolWorkspaceSection')?.classList.remove('hidden');
    document.querySelectorAll('.tool-panel').forEach(p => p.classList.add('hidden'));
    targetPanel.classList.remove('hidden');

    if (updateHash) {
      window.location.hash = toolName;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  filterCategory(category) {
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      if (category === 'all' || card.dataset.category.includes(category)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  },

  filterTools(query) {
    const q = query.toLowerCase().trim();
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
      const desc = card.querySelector('p')?.textContent.toLowerCase() || '';
      const tags = card.dataset.tags?.toLowerCase() || '';

      if (title.includes(q) || desc.includes(q) || tags.includes(q)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-600 text-white border-emerald-500',
      error: 'bg-red-600 text-white border-red-500',
      warning: 'bg-amber-600 text-white border-amber-500',
      info: 'bg-indigo-600 text-white border-indigo-500'
    };

    toast.className = `flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
    toast.innerHTML = `
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  showLoader(message = 'Processing document...') {
    const modal = document.getElementById('globalLoaderModal');
    const text = document.getElementById('globalLoaderText');
    if (modal && text) {
      text.textContent = message;
      modal.classList.remove('hidden');
    }
  },

  hideLoader() {
    const modal = document.getElementById('globalLoaderModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.PDFCraftApp.init();
});
