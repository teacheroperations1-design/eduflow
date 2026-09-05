// js/theme-manager.js — إدارة الثيم والبراندنج الكامل
const ThemeManager = {
  defaultLogo: '🎓',

  init() {
    this.applyTheme();
    this.applyBranding();
    this.bindEvents();
    this.ensureToastContainer();
  },

  bindEvents() {
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.addEventListener('click', () => this.toggleTheme());

    const menu = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (menu && sidebar) menu.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay?.classList.toggle('show');
    });
    if (overlay) overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  },

  applyTheme() {
    const saved = localStorage.getItem('eduflow_theme') || 'dark';
    document.body.setAttribute('data-theme', saved);
  },
  toggleTheme() {
    const cur = document.body.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('eduflow_theme', next);
  },

  // ============ البراندنج الكامل ============
  applyBranding() {
    if (!window.DataService) return;
    const b = DataService.getBranding();

    // تطبيق الألوان
    DataService.applyBrandingColors(b);

    // اسم المنصة
    document.querySelectorAll('[data-brand-name]').forEach(el => {
      el.textContent = b.name || 'EduFlow';
    });

    // Tagline
    document.querySelectorAll('[data-brand-tagline]').forEach(el => {
      const roleText = el.textContent; // نحافظ على دور المستخدم
      if (b.tagline) el.setAttribute('data-original-tagline', roleText);
    });

    // اللوجو
    document.querySelectorAll('[data-logo]').forEach(el => {
      if (b.logo) el.innerHTML = `<img src="${b.logo}" style="width:100%;height:100%;object-fit:cover;">`;
      else el.textContent = this.defaultLogo;
    });

    // Title tag
    document.title = (b.name || 'EduFlow') + ' — ' + (document.title.split('—')[1] || '');
  },

  // تحديث البراندنج في الـ UI بعد التعديل
  refreshBranding() {
    this.applyBranding();
  },

  // ============ Toast ============
  ensureToastContainer() {
    if (!document.querySelector('.toast-container')) {
      const c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
  },

  toast(message, type='info', duration=3000) {
    this.ensureToastContainer();
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    const icon = { success:'✓', error:'✗', warning:'⚠️', info:'ℹ️' }[type] || 'ℹ️';
    t.innerHTML = `<span style="font-size:18px;">${icon}</span><span>${message}</span>`;
    document.querySelector('.toast-container').appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(-10px)';
      setTimeout(() => t.remove(), 300);
    }, duration);
  },

  // ============ Modals ============
  openModal(html, size='') {
    this.closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'globalModal';
    overlay.innerHTML = `<div class="modal ${size}" onclick="event.stopPropagation()">${html}</div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) this.closeModal(); });
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  },
  closeModal() {
    const m = document.getElementById('globalModal');
    if (m) m.remove();
    document.body.style.overflow = '';
  },

  // ============ Confirm ============
  confirm(message, onYes) {
    this.openModal(`
      <div class="modal-header"><h3 class="modal-title">تأكيد</h3></div>
      <div class="modal-body">
        <p style="margin-bottom:16px;">${message}</p>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary" style="flex:1;" onclick="ThemeManager.closeModal()">إلغاء</button>
          <button class="btn btn-primary" style="flex:1;" id="confirmYes">تأكيد</button>
        </div>
      </div>
    `, 'modal-sm');
    document.getElementById('confirmYes').onclick = () => {
      this.closeModal();
      onYes();
    };
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
  ThemeManager.init();
}

window.ThemeManager = ThemeManager;