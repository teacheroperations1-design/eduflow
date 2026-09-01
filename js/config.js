// js/config.js
const EduFlowConfig = {
  appName: "EduFlow",
  company: "NEXORA Digital",
  version: "2.1.0",

  // 🔥 false = وضع محلي تجريبي | true = إنتاج بـ Firebase
  useFirebase: false,

  firebase: {
    apiKey: "AIzaSyBj2wM0CgWbXVohSTI8y5fIPmT1vNw3Jl8",
    authDomain: "follow-up-ee4cc.firebaseapp.com",
    databaseURL: "https://follow-up-ee4cc-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "follow-up-ee4cc",
    storageBucket: "follow-up-ee4cc.firebasestorage.app",
    messagingSenderId: "470554698600",
    appId: "1:470554698600:web:0ae9fa5a6f263930fe2cdd",
    measurementId: "G-B31RT3KJDP"
  },

  demoMode: true,

  featureFlags: {
    vocabulary: { enabled: true, status: "active", name: "نظام المفردات", desc: "بنك الكلمات والصوتيات" },
    payments: { enabled: true, status: "active", name: "التحصيل المالي", desc: "المدفوعات الشهرية" },
    materials: { enabled: true, status: "active", name: "المواد والملازم", desc: "الطلبات والمخزون" },
    homework: { enabled: true, status: "active", name: "الواجبات", desc: "إنشاء وتصحيح" },
    exams: { enabled: true, status: "active", name: "الامتحانات", desc: "منزلي + داخل الحصة" },
    attendance: { enabled: true, status: "active", name: "الحضور والغياب", desc: "تتبع يومي" },
    reports: { enabled: true, status: "active", name: "التقارير", desc: "تحليلات شاملة" },
    notifications: { enabled: true, status: "active", name: "الإشعارات", desc: "تنبيهات داخلية" },
    schedule: { enabled: true, status: "ready", name: "الجداول", desc: "حصص ومواعيد" },
    tasks: { enabled: true, status: "ready", name: "المهام", desc: "متابعات ومهام" },
    rewards: { enabled: false, status: "coming_soon", name: "المكافآت", desc: "نقاط وشارات" },
    certificates: { enabled: false, status: "coming_soon", name: "الشهادات", desc: "شهادات إنجاز" },
    achievements: { enabled: false, status: "coming_soon", name: "الإنجازات", desc: "نظام إنجازات" },
    branches: { enabled: false, status: "coming_soon", name: "الفروع", desc: "فروع متعددة" },
    whatsapp: { enabled: false, status: "coming_soon", name: "واتساب", desc: "رسائل واتساب" },
    aiInsights: { enabled: false, status: "coming_soon", name: "رؤى AI", desc: "تحليلات ذكية" },
    qrAttendance: { enabled: false, status: "coming_soon", name: "حضور QR", desc: "تسجيل بـ QR" }
  },

  defaultPermissions: {
    assistant: {
      students: { view: true, create: true, edit: true, delete: false, export: true },
      attendance: { view: true, create: true, edit: true, approve: true },
      homework: { view: true, create: true, edit: true, grade: true, publish: true },
      exams: { view: true, create: true, edit: true, grade: true, approve: true },
      payments: { view: true, create: true, edit: true, delete: false },
      materials: { view: true, create: true, edit: true, delete: false },
      reports: { view: true, export: true, send: true },
      vocabulary: { view: true, create: true, edit: true, delete: true },
      notifications: { view: true, send: true },
      settings: { view: false, edit: false }
    },
    teacher: {
      students: { view: true, create: false, edit: false, delete: false, export: false },
      attendance: { view: true, create: true, edit: false, approve: false },
      homework: { view: true, create: true, edit: true, grade: false, publish: false },
      exams: { view: true, create: true, edit: true, grade: false, approve: false },
      payments: { view: false, create: false, edit: false, delete: false },
      materials: { view: true, create: false, edit: false, delete: false },
      reports: { view: true, export: false, send: false },
      vocabulary: { view: true, create: true, edit: true, delete: false },
      notifications: { view: true, send: false },
      settings: { view: false, edit: false }
    }
  }
};