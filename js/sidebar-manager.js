// js/sidebar-manager.js
const SidebarManager = {
  // Initialize sidebar for any dashboard
  init(menuConfig, currentSection = 'overview') {
    console.log('🔧 SidebarManager initializing...');
    
    // 1. Build sidebar
    this.buildSidebar(menuConfig, currentSection);
    
    // 2. Setup mobile toggle
    this.setupMobileToggle();
    
    // 3. Setup overlay
    this.setupOverlay();
    
    console.log('✅ SidebarManager initialized');
  },

  // Build sidebar menu
  buildSidebar(menuConfig, currentSection) {
    const nav = document.getElementById('sidebarNav');
    if (!nav) {
      console.error('❌ sidebarNav element not found!');
      return;
    }

    if (!menuConfig || menuConfig.length === 0) {
      console.error('❌ menuConfig is empty!');
      nav.innerHTML = '<p class="text-muted" style="padding: 20px;">خطأ في تحميل القائمة</p>';
      return;
    }

    nav.innerHTML = menuConfig.map(section => `
      <div class="sidebar-section">
        <div class="sidebar-section-title">${section.section}</div>
        ${section.items.map(item => `
          <div class="sidebar-item ${item.id === currentSection ? 'active' : ''}" 
               data-section="${item.id}" 
               onclick="window.showSection && window.showSection('${item.id}')">
            <span class="sidebar-item-icon">${item.icon || '📄'}</span>
            <span class="sidebar-item-label">${item.label}</span>
          </div>
        `).join('')}
      </div>
    `).join('');

    console.log(`✅ Sidebar built with ${menuConfig.length} sections`);
  },

  // Setup mobile menu toggle
  setupMobileToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
        
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
          overlay.classList.toggle('show', sidebar.classList.contains('open'));
        }
      });
    }
  },

  // Setup overlay click to close
  setupOverlay() {
    const overlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    
    if (overlay && sidebar) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
      });
    }
  },

  // Update active section
  setActiveSection(sectionId) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.section === sectionId) {
        item.classList.add('active');
      }
    });
  }
};

// Auto-export to window
window.SidebarManager = SidebarManager;