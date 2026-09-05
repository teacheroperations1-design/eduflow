// js/drive-service.js — رفع الصور لـ Google Drive (اختياري)
// لو googleClientId فاضي، المنصة بتشتغل بلصق رابط Drive مباشرة (الطريقة الأساسية).
const DriveService = {
  token: null,
  async auth(){
    if(!EduFlowConfig.googleClientId){ ThemeManager.toast('فعّل Drive بحط Client ID في config.js','warning'); return null; }
    // بيستخدم Google Identity Services — محتاج تحميل script خارجي عند الاستخدام
    return new Promise(resolve=>{
      const s=document.createElement('script');
      s.src='https://accounts.google.com/gsi/client';
      s.onload=()=>resolve(true); s.onerror=()=>resolve(false);
      document.head.appendChild(s);
    });
  },
  // الطريقة الأسهل والأسرع: الصق رابط Drive وهيتعرض في المكان
  embed(url, alt){ return UI.driveImg(url, alt); },
  link(url){ return UI.driveLink(url); }
};
window.DriveService = DriveService;