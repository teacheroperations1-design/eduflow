// js/theme-manager.js — مدير الثيم والـ UI والـ Service Worker
const ThemeManager = {
  initialized: false,
  currentTheme: 'dark',
  modalStack: [],

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    // 1) حمّل الثيم
    const saved = localStorage.getItem('eduflow_theme') || 'dark';
    this.setTheme(saved, false);

    // 2) طبّق البراندنج
    try {
      if (window.DataService && typeof DataService.getBranding === 'function') {
        const b = DataService.getBranding();
        DataService.applyBrandingColors(b);
        this.applyBranding(b);
      }
    } catch (e) { /* ignore */ }

    // 3) اربط زر الثيم لو موجود
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark', true);
      });
    }

    // 4) اربط زر القائمة للموبايل
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sideOverlay = document.getElementById('sidebarOverlay');
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        sideOverlay?.classList.toggle('show');
      });
    }
    if (sideOverlay) {
      sideOverlay.addEventListener('click', () => {
        sidebar?.classList.remove('open');
        sideOverlay.classList.remove('show');
      });
    }

    // 5) أنشئ وعاء Toast لو مش موجود
    if (!document.querySelector('.toast-container')) {
      const tc = document.createElement('div');
      tc.className = 'toast-container';
      document.body.appendChild(tc);
    }

    // 6) ✅ أنشئ وعاء المودال لو مش موجود (مخفي افتراضياً)
    if (!document.getElementById('globalModalOverlay')) {
      const mo = document.createElement('div');
      mo.className = 'modal-overlay';
      mo.id = 'globalModalOverlay';
      // ✅ أخفينا المودال inline style علشان ميظهرش فاضي
      mo.style.display = 'none';
      mo.style.position = 'fixed';
      mo.style.inset = '0';
      mo.style.background = 'rgba(0, 0, 0, 0.6)';
      mo.style.backdropFilter = 'blur(8px)';
      mo.style.WebkitBackdropFilter = 'blur(8px)';
      mo.style.zIndex = '1000';
      mo.style.alignItems = 'center';
      mo.style.justifyContent = 'center';
      mo.style.padding = '20px';
      mo.innerHTML = '<div class="modal" id="globalModal" style="background:var(--surface-solid);border:1px solid var(--border);border-radius:var(--radius);width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg);animation:modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);"></div>';
      document.body.appendChild(mo);

      // إغلاق المودال لما المستخدم يدوس على الخلفية
      mo.addEventListener('click', (e) => {
        if (e.target === mo) this.closeModal();
      });
    }

    // 7) Service Worker للتحميل السريع والأوفلاين
    this._registerSW();
  },

  _registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return; // مش بيشتغل محلياً
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('✅ SW registered:', reg.scope);
      }).catch(err => {
        console.warn('⚠️ SW failed (طبيعي لو مفيش sw.js):', err.message);
      });
    });
  },

  setTheme(theme, save = true) {
    this.currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    if (save) localStorage.setItem('eduflow_theme', theme);
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  },

  applyBranding(b) {
    if (!b) return;
    const set = (sel, val) => {
      document.querySelectorAll(sel).forEach(el => {
        if (el) el.textContent = val || '';
      });
    };
    set('[data-brand-name]', b.name || 'EduFlow');
    set('[data-brand-subtitle]', b.tagline || '');
    const logos = document.querySelectorAll('[data-logo]');
    logos.forEach(el => {
      if (b.logo) {
        const url = b.logo.startsWith('http') ? b.logo : b.logo;
        if (url.includes('drive.google.com')) {
          el.innerHTML = this.driveImg(url);
        } else {
          el.innerHTML = `<img src="${url}" alt="logo">`;
        }
      } else {
        el.innerHTML = '<span style="font-size:24px;">🎓</span>';
      }
    });
    document.title = (b.name || 'EduFlow') + ' - ' + (b.tagline || 'منصة تعليمية');
  },

  driveImg(url) {
    if (!url) return '';
    const m = url.match(/[-\w]{25,}/);
    if (m) return `<img src="https://drive.google.com/thumbnail?id=${m[0]}&sz=w400" alt="logo" style="width:100%;height:100%;object-fit:cover;">`;
    return `<img src="${url}" alt="logo" style="width:100%;height:100%;object-fit:cover;">`;
  },

  // ===== TOAST =====
  toast(message, type = 'info', duration = 3000) {
    // ✅ تأكد إن وعاء الـ toast موجود
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.style.position = 'fixed';
      container.style.top = '24px';
      container.style.left = '24px';
      container.style.zIndex = '2000';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '8px';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = 'background:var(--surface-solid);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 18px;box-shadow:var(--shadow-lg);display:flex;align-items:center;gap:12px;min-width:280px;max-width:400px;pointer-events:auto;animation:toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);';
    if (type === 'error') toast.style.borderRight = '4px solid var(--danger)';
    else if (type === 'success') toast.style.borderRight = '4px solid var(--success)';
    else if (type === 'warning') toast.style.borderRight = '4px solid var(--warning)';
    else toast.style.borderRight = '4px solid var(--info)';
    toast.innerHTML = `<div class="toast-icon" style="width:24px;height:24px;flex-shrink:0;">${icons[type] || 'ℹ'}</div><div class="toast-message" style="flex:1;font-size:14px;font-weight:500;color:var(--text-primary);">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ===== MODAL =====
  openModal(content, sizeClass = '') {
    let overlay = document.getElementById('globalModalOverlay');
    let modal = document.getElementById('globalModal');

    // ✅ لو مش موجود، أنشئه
    if (!overlay || !modal) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'globalModalOverlay';
      overlay.style.display = 'none';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0, 0, 0, 0.6)';
      overlay.style.backdropFilter = 'blur(8px)';
      overlay.style.WebkitBackdropFilter = 'blur(8px)';
      overlay.style.zIndex = '1000';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '20px';
      overlay.innerHTML = '<div class="modal" id="globalModal"></div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal();
      });
      modal = document.getElementById('globalModal');
    }

    // ✅ تطبيق الـ size class
    modal.className = 'modal ' + sizeClass;
    modal.style.cssText = 'background:var(--surface-solid);border:1px solid var(--border);border-radius:var(--radius);width:100%;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg);animation:modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);';
    if (sizeClass === 'modal-sm') modal.style.maxWidth = '400px';
    else if (sizeClass === 'modal-lg') modal.style.maxWidth = '760px';
    else modal.style.maxWidth = '500px';

    modal.innerHTML = content;

    // ✅ إظهار المودال بـ display:flex
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    this.modalStack.push(content);
  },

  closeModal() {
    const overlay = document.getElementById('globalModalOverlay');
    const modal = document.getElementById('globalModal');
    if (overlay) {
      // ✅ إخفاء المودال بدل حذفه
      overlay.style.display = 'none';
    }
    if (modal) modal.innerHTML = '';
    document.body.style.overflow = '';
    if (this.modalStack.length > 0) this.modalStack.pop();
  },

  confirm(message, onYes) {
    this.openModal(`
      <div class="modal-header" style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <h3 class="modal-title" style="font-size:18px;font-weight:700;margin:0;">تأكيد</h3>
        <button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()" style="background:transparent;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;">✕</button>
      </div>
      <div class="modal-body" style="padding:24px;">
        <p style="margin-bottom:16px;line-height:1.7;">${message}</p>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary" style="flex:1;padding:10px 18px;border-radius:var(--radius-sm);background:var(--surface-hover);color:var(--text-primary);border:1px solid var(--border);cursor:pointer;font-weight:600;" onclick="ThemeManager.closeModal()">إلغاء</button>
          <button class="btn btn-danger" style="flex:1;padding:10px 18px;border-radius:var(--radius-sm);background:var(--danger);color:#fff;border:none;cursor:pointer;font-weight:600;" id="confirmYes">تأكيد</button>
        </div>
      </div>
    `, 'modal-sm');
    setTimeout(() => {
      const yesBtn = document.getElementById('confirmYes');
      if (yesBtn) {
        yesBtn.addEventListener('click', () => {
          this.closeModal();
          if (typeof onYes === 'function') onYes();
        });
      }
    }, 50);
  },

  // Escape closes modal
  _bindEscape() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalStack.length > 0) this.closeModal();
    });
  }
};

ThemeManager._bindEscape();
window.ThemeManager = ThemeManager;

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
  ThemeManager.init();
}