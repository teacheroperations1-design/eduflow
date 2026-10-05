// js/config.js — إعدادات منصة EduFlow (نسخة كاملة نهائية)
window.EduFlowConfig = {

  useFirebase: true,

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

  timeFormat: '12h',

  // 🆕 ده القسم اللي كان ناقص — بدونه قوائم المرحلة والصفوف فاضية في كل الصفحات
  educationLevels: {
    kg:        { nameAr: 'رياض الأطفال',   grades: ['KG1','KG2'] },
    primary:   { nameAr: 'المرحلة الابتدائية', grades: ['الأول الابتدائي','الثاني الابتدائي','الثالث الابتدائي','الرابع الابتدائي','الخامس الابتدائي','السادس الابتدائي'] },
    prep:      { nameAr: 'المرحلة الإعدادية',  grades: ['الأول الإعدادي','الثاني الإعدادي','الثالث الإعدادي'] },
    secondary: { nameAr: 'المرحلة الثانوية',   grades: ['الأول الثانوي','الثاني الثانوي','الثالث الثانوي'] }
  },

  billing: {
    currency: 'ج.م',
    defaultSessionsPerMonth: 8,
    sessionsBeforePayment: 8
  },

  pointsSystem: {
    attendance: 1,
    homeworkPass: 1,
    examPass: 1,
    passThreshold: 75,
    recitation: { basePoints: 2 }
  },

  settings: {
    qrSessionDuration: 7200000,
    teacherRegisterLinkDuration: 48
  },

  featureFlags: {},
  hesetak: {}
};