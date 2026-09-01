// js/sidebar-fix.js
// إصلاح شامل للقوائم الجانبية في كل الـ Dashboards

(function() {
  'use strict';

  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  const overlay = document.getElementById('sidebarOverlay');

  if (!sidebar) {
    console.error('❌ Sidebar element not found!');
    return;
  }

  console.log('✅ Sidebar found, initializing...');

  // ============================================
  // Force correct state on load
  // ============================================
  function applyCorrectState() {
    if (window.innerWidth > 1024) {
      // Desktop: Sidebar always visible
      sidebar.classList.remove('open');
      sidebar.style.transform = 'translateX(0)';
      if (overlay) overlay.classList.remove('show');
    } else {
      // Mobile: Sidebar hidden unless open
      if (!sidebar.classList.contains('open')) {
        sidebar.style.transform = 'translateX(100%)';
      }
    }
  }

  // Apply on load
  applyCorrectState();

  // ============================================
  // Toggle function
  // ============================================
  function toggleSidebar() {
    sidebar.classList.toggle('open');
    
    if (sidebar.classList.contains('open')) {
      sidebar.style.transform = 'translateX(0)';
      if (overlay) overlay.classList.add('show');
      console.log('📂 Sidebar opened');
    } else {
      sidebar.style.transform = 'translateX(100%)';
      if (overlay) overlay.classList.remove('show');
      console.log('📁 Sidebar closed');
    }
  }

  // ============================================
  // Bind toggle button
  // ============================================
  if (menuToggle) {
    menuToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      toggleSidebar();
    });
    console.log('✅ Menu toggle button bound');
  } else {
    console.warn('⚠️ Menu toggle button not found');
  }

  // ============================================
  // Close on overlay click
  // ============================================
  if (overlay) {
    overlay.addEventListener('click', function() {
      sidebar.classList.remove('open');
      sidebar.style.transform = 'translateX(100%)';
      overlay.classList.remove('show');
    });
  }

  // ============================================
  // Close on Escape key
  // ============================================
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      sidebar.style.transform = 'translateX(100%)';
      if (overlay) overlay.classList.remove('show');
    }
  });

  // ============================================
  // Handle window resize
  // ============================================
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      applyCorrectState();
    }, 200);
  });

  // ============================================
  // Close sidebar when clicking a nav item (mobile)
  // ============================================
  const navItems = sidebar.querySelectorAll('.sidebar-item');
  navItems.forEach(function(item) {
    item.addEventListener('click', function() {
      if (window.innerWidth <= 1024) {
        setTimeout(function() {
          sidebar.classList.remove('open');
          sidebar.style.transform = 'translateX(100%)';
          if (overlay) overlay.classList.remove('show');
        }, 150);
      }
    });
  });

  console.log('✅ Sidebar fix applied successfully');
})();