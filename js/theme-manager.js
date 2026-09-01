// js/theme-manager.js — EduFlow 2.1 (ثيم + Sidebar + Refresh + Toast + Modal)
const ThemeManager = {
  defaultLogo: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`,

  roleMenus: {
    super_admin: [
      { section: "نظرة عامة", items: [{ id: "overview", label: "الرئيسية", icon: "🏠" }] },
      { section: "الأشخاص", items: [
        { id: "students", label: "الطلاب", icon: "🎓" },
        { id: "parents", label: "أولياء الأمور", icon: "👨‍👩‍👧" },
        { id: "teachers", label: "المدرسون", icon: "👨‍🏫" },
        { id: "assistants", label: "المساعدون", icon: "🧑‍💼" }
      ]},
      { section: "الأكاديمي", items: [
        { id: "groups", label: "المجموعات", icon: "👥" },
        { id: "attendance", label: "الحضور", icon: "📋" },
        { id: "homework", label: "الواجبات", icon: "📝" },
        { id: "exams", label: "الامتحانات", icon: "🎓" },
        { id: "vocabulary", label: "المفردات", icon: "📚" },
        { id: "materials", label: "المواد", icon: "📦" }
      ]},
      { section: "العمليات", items: [
        { id: "tasks", label: "المهام", icon: "✅" },
        { id: "followups", label: "المتابعات", icon: "📌" }
      ]},
      { section: "المالية", items: [
        { id: "payments", label: "المدفوعات", icon: "💰" },
        { id: "orders", label: "الطلبات", icon: "🛒" }
      ]},
      { section: "الإدارة", items: [
        { id: "permissions", label: "الصلاحيات", icon: "🔐" },
        { id: "settings", label: "الإعدادات", icon: "⚙️" },
        { id: "features", label: "الخصائص", icon: "🚩" },
        { id: "logs", label: "سجل النشاط", icon: "📜" }
      ]}
    ],
    assistant: [
      { section: "الرئيسية", items: [{ id: "overview", label: "نظرة عامة", icon: "🏠" }] },
      { section: "الأكاديمي", items: [
        { id: "attendance", label: "الحضور", icon: "📋" },
        { id: "homework", label: "الواجبات", icon: "📝" },
        { id: "exams", label: "الامتحانات", icon: "🎓" },
        { id: "students", label: "الطلاب", icon: "🎓" },
        { id: "groups", label: "المجموعات", icon: "👥" }
      ]},
      { section: "العمليات", items: [
        { id: "tasks", label: "مهامي", icon: "✅" },
        { id: "inbox", label: "البريد الوارد", icon: "📥" },
        { id: "attention", label: "مركز المتابعة", icon: "🚨" },
        { id: "calendar", label: "التقويم", icon: "📆" }
      ]},
      { section: "المالية", items: [{ id: "payments", label: "المدفوعات", icon: "💰" }] },
      { section: "أخرى", items: [
        { id: "reports", label: "التقارير", icon: "📊" },
        { id: "notifications", label: "الإشعارات", icon: "🔔" }
      ]}
    ],
    teacher: [
      { section: "الرئيسية", items: [
        { id: "overview", label: "نظرة عامة", icon: "🏠" },
        { id: "now", label: "الحصة الحالية", icon: "⏰" }
      ]},
      { section: "التدريس", items: [
        { id: "groups", label: "مجموعاتي", icon: "👥" },
        { id: "students", label: "طلابي", icon: "🎓" },
        { id: "attendance", label: "الحضور", icon: "📋" },
        { id: "homework", label: "الواجبات", icon: "📝" },
        { id: "exams", label: "الامتحانات", icon: "🎓" },
        { id: "vocabulary", label: "المفردات", icon: "📚" }
      ]},
      { section: "التحليلات", items: [{ id: "performance", label: "أداء الطلاب", icon: "📊" }] },
      { section: "التواصل", items: [{ id: "notifications", label: "الإشعارات", icon: "🔔" }] }
    ],
    student: [
      { section: "الرئيسية", items: [{ id: "overview", label: "نظرة عامة", icon: "🏠" }] },
      { section: "التعلم", items: [
        { id: "homework", label: "الواجبات", icon: "📝" },
        { id: "exams", label: "الامتحانات", icon: "🎓" },
        { id: "vocabulary", label: "المفردات", icon: "📚" },
        { id: "materials", label: "المواد", icon: "📦" }
      ]},
      { section: "أخرى", items: [
        { id: "schedule", label: "جدولي", icon: "📅" },
        { id: "notifications", label: "الإشعارات", icon: "🔔" }
      ]}
    ],
    parent: [
      { section: "الرئيسية", items: [{ id: "overview", label: "نظرة عامة", icon: "🏠" }] },
      { section: "المتابعة", items: [
        { id: "attendance", label: "الحضور", icon: "📋" },
        { id: "homework", label: "الواجبات", icon: "📝" },
        { id: "exams", label: "الامتحانات", icon: "🎓" },
        { id: "payments", label: "المدفوعات", icon: "💰" }
      ]},
      { section: "أخرى", items: [{ id: "notifications", label: "الإشعارات", icon: "🔔" }] }
    ]
  },

  init() {
    const t = localStorage.getItem('eduflow_theme') || 'dark';
    document.body.setAttribute('data-theme', t);
    this.applyBranding();
    this.setupToggle();
    this.setupRefreshButton();   // 🆕 زر ريفريش تلقائي
    this.setupAutoRefresh();     // 🆕 تحديث تلقائي عند تغيير البيانات
    this.setupBackground();
    console.log('✅ ThemeManager initialized');
  },

  applyBranding() {
    const b = JSON.parse(localStorage.getItem('eduflow_branding') || 'null');
    document.querySelectorAll('[data-logo]').forEach(el => {
      el.innerHTML = b?.logo ? `<img src="${b.logo}" alt="Logo">` : this.defaultLogo;
    });
    document.querySelectorAll('[data-brand-name]').forEach(el => {
      el.textContent = b?.companyName || 'EduFlow';
    });
  },

  setupToggle() {
    const t = document.getElementById('themeToggle');
    if (!t) return;
    t.addEventListener('click', () => {
      const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', next);
      localStorage.setItem('eduflow_theme', next);
      this.updateToggleIcon(next);
    });
    this.updateToggleIcon(document.body.getAttribute('data-theme'));
  },

  updateToggleIcon(theme) {
    const t = document.getElementById('themeToggle');
    if (!t) return;
    t.innerHTML = theme === 'dark'
      ? `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
      : `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
  },

  // 🆕 زر Refresh التلقائي — بيتضاف في كل الصفحات لوحده
  setupRefreshButton() {
    const actions = document.querySelector('.header-actions');
    if (!actions) {
      console.warn('⚠️ header-actions not found - refresh button not added');
      return;
    }
    if (actions.querySelector('#refreshBtn')) return;

    const btn = document.createElement('button');
    btn.className = 'icon-btn';
    btn.id = 'refreshBtn';
    btn.title = 'تحديث الصفحة (F5)';
    btn.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`;
    btn.addEventListener('click', () => this.refreshPage());

    actions.insertBefore(btn, actions.firstChild);
  },

  refreshPage() {
    this.toast('🔄 جاري التحديث...', 'info', 800);
    setTimeout(() => location.reload(), 300);
  },

  // 🆕 Auto-refresh: لو اتفتحت صفحة تانية وعدّلت البيانات، الصفحة دي بتتحدث لوحدها
  setupAutoRefresh() {
    let lastVersion = localStorage.getItem('eduflow_db_version') || '0';

    window.addEventListener('storage', (e) => {
      if (e.key === 'eduflow_db') {
        const newVersion = localStorage.getItem('eduflow_db_version') || '0';
        if (newVersion !== lastVersion) {
          console.log('🔄 Data changed in another tab, auto-refreshing...');
          this.toast('🔄 تم تحديث البيانات من تابة أخرى', 'info', 1500);
          setTimeout(() => location.reload(), 1000);
        }
      }
    });
  },

  setupBackground() {
    if (!document.querySelector('.bg-grid')) {
      const g = document.createElement('div');
      g.className = 'bg-grid';
      document.body.insertBefore(g, document.body.firstChild);
    }
    if (!document.querySelector('.orb')) {
      ['orb-1', 'orb-2', 'orb-3'].forEach(c => {
        const o = document.createElement('div');
        o.className = `orb ${c}`;
        document.body.insertBefore(o, document.body.firstChild);
      });
    }
  },

  // ✅ Sidebar محسّن — بيعمل rebuild لو المحتوى مش مكتمل
  buildSidebar() {
    const nav = document.getElementById('sidebarNav');
    if (!nav) {
      console.warn('⚠️ sidebarNav element not found');
      return;
    }

    // نتأكد إن الـ nav فعلاً محتاج rebuild (مش بس فيه عناصر)
    const hasValidContent = nav.children.length > 0 &&
      nav.querySelector('.sidebar-item');

    if (hasValidContent) return;

    let role = null;
    if (typeof AuthService !== 'undefined') {
      const u = AuthService.getCurrentUser();
      if (u) role = u.role;
    }
    if (!role) role = this._guessRole();

    const menu = this.roleMenus[role] || this.roleMenus.super_admin;

    nav.innerHTML = menu.map((sec, si) => `
      <div class="sidebar-section">
        <div class="sidebar-section-title">${sec.section}</div>
        ${sec.items.map((item, ii) => `
          <div class="sidebar-item ${si === 0 && ii === 0 ? 'active' : ''}" data-section="${item.id}" onclick="showSection('${item.id}')">
            <span class="sidebar-item-icon">${item.icon}</span>
            <span class="sidebar-item-label">${item.label}</span>
          </div>`).join('')}
      </div>`).join('');

    console.log(`✅ Sidebar built for role: ${role} (${menu.length} sections)`);
  },

  _guessRole() {
    const p = location.pathname;
    if (p.includes('admin')) return 'super_admin';
    if (p.includes('assistant')) return 'assistant';
    if (p.includes('teacher')) return 'teacher';
    if (p.includes('student')) return 'student';
    if (p.includes('parent')) return 'parent';
    return 'super_admin';
  },

  setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('menuToggle');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;

    if (window.innerWidth > 1024) sidebar.style.transform = 'translateX(0)';

    if (toggle && !toggle.dataset.bound) {
      toggle.dataset.bound = '1';
      toggle.addEventListener('click', e => {
        e.stopPropagation();
        const open = sidebar.classList.toggle('open');
        sidebar.style.transform = open ? 'translateX(0)' : '';
        if (overlay) overlay.classList.toggle('show', open);
      });
    }

    if (overlay && !overlay.dataset.bound) {
      overlay.dataset.bound = '1';
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebar.style.transform = '';
        overlay.classList.remove('show');
      });
    }
  },

  setupShortcuts() {
    document.addEventListener('keydown', e => {
      // Ctrl+D = تبديل الثيم
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        document.getElementById('themeToggle')?.click();
      }

      // F5 = Refresh مع رسالة
      if (e.key === 'F5') {
        e.preventDefault();
        this.refreshPage();
      }

      // Ctrl+R = Refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        this.refreshPage();
      }

      // Escape = إغلاق المودال والسايدبار
      if (e.key === 'Escape') {
        this.closeModal();
        const s = document.getElementById('sidebar');
        const o = document.getElementById('sidebarOverlay');
        if (s && s.classList.contains('open')) {
          s.classList.remove('open');
          s.style.transform = '';
          if (o) o.classList.remove('show');
        }
      }
    });
  },

  toast(message, type = 'info', duration = 4000) {
    let c = document.querySelector('.toast-container');
    if (!c) {
      c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    const icons = {
      success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
      error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
      warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
      info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
    };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icons[type]}</svg><span class="toast-message">${message}</span>`;
    c.appendChild(t);
    setTimeout(() => {
      t.classList.add('hiding');
      setTimeout(() => t.remove(), 300);
    }, duration);
  },

  openModal(content) {
    let o = document.querySelector('.modal-overlay');
    if (!o) {
      o = document.createElement('div');
      o.className = 'modal-overlay';
      document.body.appendChild(o);
    }
    o.innerHTML = `<div class="modal">${content}</div>`;
    o.classList.add('show');
    o.onclick = e => { if (e.target === o) this.closeModal(); };
  },

  closeModal() {
    const o = document.querySelector('.modal-overlay');
    if (o) {
      o.classList.remove('show');
      setTimeout(() => o.remove(), 200);
    }
  }
};

function _bootTM() {
  ThemeManager.init();
  ThemeManager.setupShortcuts();
  ThemeManager.setupSidebar();
  ThemeManager.buildSidebar();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bootTM);
} else {
  _bootTM();
}