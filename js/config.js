// js/config.js — إعدادات منصة EduFlow (نسخة Compat صحيحة)
// ⚠️ ممنوع نهائيًا استخدام import / export في ملفات هذا المشروع
//    لأن كل الصفحات بتحمّلها كـ Classic Scripts

window.EduFlowConfig = {

  // 🔥 تفعيل المزامنة السحابية
  useFirebase: true,

  // إعدادات مشروع Firebase (Compat Style — بدون import)
  firebaseConfig: {
    apiKey: "AIzaSyBj2wM0CgWbXVohSTI8y5fIPmT1vNw3Jl8",
    authDomain: "follow-up-ee4cc.firebaseapp.com",
    databaseURL: "https://follow-up-ee4cc-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "follow-up-ee4cc",
    storageBucket: "follow-up-ee4cc.firebasestorage.app",
    messagingSenderId: "470554698600",
    appId: "1:470554698600:web:0ae9fa5a6f263930fe2cdd",
    measurementId: "G-B31RT3KJDP"
  },

  // ⏰ صيغة الوقت
  timeFormat: '12h',

  // 💰 إعدادات الفوترة
  billing: {
    defaultSessionsPerMonth: 8,
    sessionsBeforePayment: 8
  },

  // 🏆 نظام النقاط
  pointsSystem: {
    attendance: 1,
    homeworkPass: 1,
    examPass: 1,
    passThreshold: 75,
    recitation: { basePoints: 2 }
  },

  // ⚙️ إعدادات عامة
  settings: {
    qrSessionDuration: 7200000,          // مدة صلاحية كود الحضور (ساعتين)
    teacherRegisterLinkDuration: 48      // مدة رابط دعوة مدرس (ساعات)
  },

  // 🚩 FLAGS الميزات
  featureFlags: {},

  // 📚 إعدادات منصة حصتك
  hesetak: {}
};