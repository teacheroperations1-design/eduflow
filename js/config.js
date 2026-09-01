// js/config.js — إعدادات EduFlow + Firebase
const EduFlowConfig = {
  // ===== إعدادات عامة =====
  appName: 'EduFlow',
  appVersion: '2.1.0',
  companyName: 'EduFlow',
  
  // ===== وضع التشغيل =====
  demoMode: false,          // ❌ مش demo — production
  useFirebase: true,        // ✅ استخدم Firebase
  useLocalStorageFallback: true, // لو Firebase فشل، ارجع لـ localStorage

  // ===== Firebase Config =====
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

  // ===== Feature Flags =====
  featureFlags: {
    gamification:     { enabled: false, name: 'نظام النقاط والإنجازات', desc: 'نقاط، شارات، ترتيب طلاب', status: 'coming_soon' },
    live_chat:        { enabled: false, name: 'الدردشة المباشرة', desc: 'محادثة داخل التطبيق', status: 'coming_soon' },
    pdf_reports:      { enabled: false, name: 'تقارير PDF', desc: 'تصدير تقارير وشهادات', status: 'coming_soon' },
    online_lessons:   { enabled: false, name: 'حصص أونلاين', desc: 'Zoom / Google Meet مدمج', status: 'coming_soon' },
    parent_app:       { enabled: false, name: 'تطبيق ولي الأمر', desc: 'تطبيق موبايل منفصل', status: 'coming_soon' },
    analytics_ai:     { enabled: false, name: 'تحليلات ذكية', desc: 'توقعات وتوصيات AI', status: 'coming_soon' },
    multi_language:   { enabled: false, name: 'متعدد اللغات', desc: 'عربي/إنجليزي', status: 'coming_soon' }
  },

  // ===== الإعدادات الافتراضية =====
  settings: {
    defaultLanguage: 'ar',
    defaultTheme: 'dark',
    currency: 'EGP',
    currencySymbol: 'ج.م',
    timezone: 'Africa/Cairo',
    academicYear: '2025-2026',
    studentIdPrefix: 'STU-',
    codePrefix: 'EDU-',
    supportPhone: '',
    allowSelfRegistration: true,
    paymentMethods: ['cash', 'vodafone_cash', 'bank_transfer']
  },

  // ===== حد أقصى =====
  limits: {
    maxStudentsPerGroup: 50,
    maxHomeworkAttempts: 5,
    maxExamAttempts: 3,
    maxFileSizeMB: 10,
    maxActivityLogs: 1000
  }
};

// تصدير عالمي
window.EduFlowConfig = EduFlowConfig;

// ===== تحذير: لو apiKey ظاهرة في الـ frontend، لازم تضبط Firestore Security Rules =====
console.log('✅ EduFlow Config loaded — Firebase project:', EduFlowConfig.firebase.projectId);