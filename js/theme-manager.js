// js/theme-manager.js — الثيم + المودالات + التوست + إصلاح القائمة الجانبية نهائياً
(function() {
  'use strict';

  // 🆕 استخدام الدالة العالمية إذا كانت موجودة لتجنب التكرار
  function getDriveThumb(url) {
    if (window.driveThumb) return window.driveThumb(url);
    try {
      const u = String(url || '');
      const m = u.match(/\/d\/([\w-]+)/) || u.match(/[?&]id=([\w-]+)/) || u.match(/^([\w-]{20,})$/);
      return m ? ('https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w400') : u;
    } catch (e) { return url || ''; }
  }

  const TM = {
    _theme: 'dark',

    init() {
      try {
        const saved = localStorage.getItem('eduflow_theme');
        this.setTheme(saved || (document.body && document.body.dataset.theme) || 'dark', true);
        
        const btn = document.getElementById('themeToggle');
        if (btn && !btn.dataset.tmBound) {
          btn.dataset.tmBound = '1';
          btn.addEventListener('click', () => this.setTheme(this._theme === 'dark' ? 'light' : 'dark'));
        }
      } catch (e) { console.warn('[TM] theme init', e); }
      
      this._fixSidebar();
      this._ensureModalRoot();
      this.applyBranding();
    },

    setTheme(t, silent) {
      try {
        this._theme = (t === 'light') ? 'light' : 'dark';
        document.body?.setAttribute('data-theme', this._theme);
        localStorage.setItem('eduflow_theme', this._theme);
        
        const btn = document.getElementById('themeToggle');
        if (btn) btn.textContent = this._theme === 'dark' ? '☀️' : '🌙';
      } catch (e) {}
    },

    // ✅✅✅ الإصلاح النهائي: يشتغل مع أو بدون sidebarOverlay
    _fixSidebar() {
      try {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('sidebarOverlay');
        const mt = document.getElementById('menuToggle');
        if (!sb) return;
        
        // ترتيب الطبقات inline — فوق أي CSS قديم لضمان العمل دائماً
        sb.style.zIndex = '1201';
        if (ov) ov.style.zIndex = '1200';
        
        const open = () => { sb.classList.add('open'); if (ov) ov.classList.add('show'); };
        const close = () => { sb.classList.remove('open'); if (ov) ov.classList.remove('show'); };
        
        if (mt && !mt.dataset.tmBound) {
          mt.dataset.tmBound = '1';
          mt.addEventListener('click', function(e) { 
            e.stopPropagation(); 
            sb.classList.contains('open') ? close() : open(); 
          });
        }
        if (ov && !ov.dataset.tmBound) {
          ov.dataset.tmBound = '1';
          ov.addEventListener('click', close);
        }
        
        window.addEventListener('resize', function() { 
          if (window.innerWidth > 1024) close(); 
        });
        
        // تنظيف حالة معلّقة قديمة
        setTimeout(function() { 
          if (ov && ov.classList.contains('show') && !sb.classList.contains('open')) close(); 
        }, 300);
      } catch (e) { console.warn('[TM] sidebar fix', e); }
    },

    _ensureModalRoot() {
      try {
        if (document.getElementById('globalModalOverlay')) return;
        
        const ov = document.createElement('div');
        ov.id = 'globalModalOverlay'; 
        ov.className = 'modal-overlay';
        ov.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);z-index:2000;align-items:center;justify-content:center;padding:20px;';
        
        const m = document.createElement('div');
        m.id = 'globalModal'; 
        m.className = 'modal';
        m.setAttribute('role', 'dialog');
        m.setAttribute('aria-modal', 'true');
        m.style.cssText = 'background:var(--surface-solid);border:1px solid var(--border);border-radius:var(--radius-xl);max-width:560px;width:100%;max-height:88vh;overflow-y:auto;position:relative;box-shadow:var(--shadow-lg);';
        
        ov.appendChild(m);
        ov.addEventListener('click', function(e) { 
          if (e.target === ov) TM.closeModal(); 
        });
        
        document.body.appendChild(ov);
      } catch (e) { console.warn('[TM] modal root', e); }
    },

    openModal(content, size) {
      try {
        this._ensureModalRoot();
        const ov = document.getElementById('globalModalOverlay');
        const m = document.getElementById('globalModal');
        if (!ov || !m) return;
        
        m.className = 'modal ' + (size || '');
        m.style.maxWidth = (size === 'modal-lg') ? '820px' : (size === 'modal-md') ? '640px' : (size === 'modal-sm') ? '420px' : '560px';
        m.innerHTML = content || '';
        
        ov.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // تحسين إمكانية الوصول
        m.setAttribute('tabindex', '-1');
        m.focus();
      } catch (e) { console.warn('[TM] openModal', e); }
    },

    closeModal() {
      try {
        const ov = document.getElementById('globalModalOverlay');
        if (ov) ov.style.display = 'none';
        document.body.style.overflow = '';
      } catch (e) {}
    },

    confirm(msg, onOk) {
      try {
        window.__tmConfirmCb = onOk || null;
        this.openModal(
          '<div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid var(--border);">' +
            '<h3 class="modal-title" style="font-size:18px;font-weight:700;margin:0;">تأكيد</h3>' +
            '<button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()" style="width:36px;height:36px;border-radius:8px;">✕</button>' +
          '</div>' +
          '<div class="modal-body" style="padding:24px;">' +
            '<p style="line-height:1.8;margin:0 0 20px 0;">' + msg + '</p>' +
            '<div style="display:flex;gap:8px;">' +
              '<button class="btn btn-primary" style="flex:1;" onclick="ThemeManager._doConfirm()">✅ تأكيد</button>' +
              '<button class="btn btn-secondary" style="flex:1;" onclick="ThemeManager.closeModal()">إلغاء</button>' +
            '</div>' +
          '</div>',
          'modal-sm'
        );
      } catch (e) { console.warn('[TM] confirm', e); }
    },

    _doConfirm() {
      try {
        const cb = window.__tmConfirmCb; 
        window.__tmConfirmCb = null;
        this.closeModal();
        if (typeof cb === 'function') cb();
      } catch (e) { console.warn('[TM] doConfirm', e); }
    },

    toast(msg, type, dur) {
      try {
        type = type || 'info';
        dur = dur || 3000;
        
        let c = document.querySelector('.toast-container');
        if (!c) {
          c = document.createElement('div'); 
          c.className = 'toast-container';
          document.body.appendChild(c);
        }
        
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        
        // 🆕 إضافة أيقونات تعبيرية وتنسيق يتوافق مع CSS
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        t.innerHTML = `<span style="font-size:18px;flex-shrink:0;">${icons[type] || 'ℹ️'}</span><span style="flex:1;line-height:1.4;">${msg}</span>`;
        
        // حركة ظهور سلسة
        t.style.opacity = '0';
        t.style.transform = 'translateX(20px)';
        t.style.transition = 'all 0.3s ease';
        
        c.appendChild(t);
        
        // Trigger reflow
        void t.offsetWidth;
        t.style.opacity = '1';
        t.style.transform = 'translateX(0)';

        setTimeout(function () {
          t.style.opacity = '0';
          t.style.transform = 'translateX(20px)';
          setTimeout(function () { t.remove(); }, 300);
        }, dur);
      } catch (e) { console.warn('[TM] toast', e); }
    },

    applyBranding() {
      try {
        const b = (window.DataService && typeof DataService.getBranding === 'function') ? DataService.getBranding() : null;
        if (!b) return;
        
        if (b.primaryColor) {
          document.documentElement.style.setProperty('--primary', b.primaryColor);
          // 🆕 توليد لون التوهج تلقائياً
          document.documentElement.style.setProperty('--primary-glow', b.primaryColor + '40'); 
        }
        if (b.accentColor) document.documentElement.style.setProperty('--accent', b.accentColor);
        
        if (b.primaryColor && b.accentColor) {
          document.documentElement.style.setProperty('--grad', `linear-gradient(135deg, ${b.primaryColor} 0%, ${b.accentColor} 100%)`);
        }
        
        document.querySelectorAll('[data-brand-name]').forEach(function (el) {
          el.textContent = b.name || 'EduFlow';
        });
        
        document.querySelectorAll('[data-logo]').forEach(function (el) {
          try {
            if (b.logo) {
              const url = /^https?:\/\//.test(b.logo) ? getDriveThumb(b.logo) : b.logo;
              el.innerHTML = `<img src="${url}" alt="logo" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" onerror="this.style.display='none';this.parentNode.textContent='🎓'">`;
            } else {
              el.textContent = '🎓';
            }
          } catch (e) {}
        });
      } catch (e) { console.warn('[TM] branding', e); }
    }
  };

  window.ThemeManager = TM;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { TM.init(); });
  } else {
    TM.init();
  }
})();