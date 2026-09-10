// js/footer-injector.js
(function() {
  'use strict';
  
  window.injectUnifiedFooter = async function() {
    try {
      // جلب بيانات البراندنج من الأدمن
      const branding = (typeof DataService !== 'undefined' && typeof DataService.getBranding === 'function') 
        ? DataService.getBranding() 
        : { name: 'EduFlow', supportPhone: '', whatsappSupport: '', facebookLink: '' };

      const footerHTML = `
        <footer class="unified-footer" style="
          background: var(--surface);
          border-top: 1px solid var(--border);
          padding: 24px 16px;
          margin-top: 40px;
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
        ">
          <div style="max-width: 800px; margin: 0 auto;">
            <div style="font-weight: 800; font-size: 16px; color: var(--primary); margin-bottom: 8px;">
              ${branding.name || 'EduFlow'}
            </div>
            <p style="margin: 0 0 12px 0; line-height: 1.6;">
              منصة تعليمية متكاملة لإدارة المراكز التعليمية والسناتر.<br>
             جميع الحقوق محفوظة © ${new Date().getFullYear()}
            </p>
             Habbash Group
            <div style="display: flex; justify-content: center; gap: 16px; margin-top: 12px;">
              ${branding.facebookLink ? `<a href="${branding.facebookLink}" target="_blank" style="color: var(--text-secondary); text-decoration: none; font-weight: 600;">فيسبوك</a>` : ''}
              <a href="about.html" style="color: var(--primary); text-decoration: none; font-weight: 700;">من نحن</a>
            </div>
          </div>
        </footer>
      `;
      
      // الحقن في نهاية الـ Body
      document.body.insertAdjacentHTML('beforeend', footerHTML);
      
      // إضافة مساحة في الأسفل إذا كان الفوتر يغطي محتوى
      document.body.style.paddingBottom = '20px';
      
    } catch (e) {
      console.warn('Footer injection failed:', e);
    }
  };

  // تشغيل عند تحميل الصفحة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.injectUnifiedFooter);
  } else {
    window.injectUnifiedFooter();
  }
})();