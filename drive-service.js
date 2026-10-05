// js/drive-service.js — معطّل (نستخدم Firebase Storage بدلاً منه)
// 📌 هذا الملف موجود فقط لتجنب خطأ 404 في الصفحات التي تشير إليه
// 📌 خدمة رفع الصور الفعلية موجودة بالفعل في js/ui-helpers.js:
//     - window.openImageUploadModal(onDone, title)
//     - window.uploadImageToStorage(file, folder)
//     - window.resolveImageUrl(url, size)

window.DriveService = {
  enabled: false,
  reason: 'تم تعطيل خدمة Drive — استخدم Firebase Storage بدلاً منها',
  
  // Placeholder methods لمنع الأخطاء في أي كود ينادي DriveService
  uploadFile: async function() {
    console.warn('DriveService.uploadFile معطّل — استخدم openImageUploadModal من ui-helpers.js');
    return null;
  },
  getFileUrl: function() { return ''; },
  init: function() { return Promise.resolve(); }
};

console.log('ℹ️ DriveService placeholder loaded — use openImageUploadModal() instead');