// js/drive-service.js — Placeholder (منع خطأ 404)
// خدمة الرفع الفعلية موجودة في js/ui-helpers.js:
//   window.openImageUploadModal(onDone, title)
//   window.uploadImageToStorage(file, folder)
//   window.resolveImageUrl(url, size)
window.DriveService = {
  enabled: false,
  reason: 'تم الاستغناء عن Drive — نستخدم Firebase Storage',
  uploadFile: async function(){ console.warn('DriveService معطّل — استخدم openImageUploadModal'); return null; },
  getFileUrl: function(){ return ''; },
  init: function(){ return Promise.resolve(); }
};