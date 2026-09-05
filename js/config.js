// js/config.js
const EduFlowConfig = {
  useFirebase: true,
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

  hesetak: {
    url: 'https://hesetak.vercel.app/',
    logo: '',
    title: 'منصة حصتك',
    subtitle: 'منصتك التعليمية الشاملة للدروس والمحتوى',
    stats: [{v:'+500',l:'درس فيديو'},{v:'+50',l:'مادة دراسية'},{v:'24/7',l:'وصول دائم'}],
    features: [
      {i:'🎥',t:'دروس فيديو',d:'شروحات احترافية لكل المواد'},
      {i:'📖',t:'ملازم وملخصات',d:'محتوى منظم للمراجعة'},
      {i:'✍️',t:'اختبارات تفاعلية',d:'قيّم نفسك في أي وقت'},
      {i:'🏆',t:'متابعة التقدم',d:'شاهد تطورك خطوة بخطوة'}
    ]
  },

  billing: { defaultSessionsPerMonth:4, absentIsCharged:true, cancelledIsNotCharged:true, currency:'ج.م' },
  timeFormat: '12h',

  educationLevels: {
    Primary:{nameAr:'ابتدائي',grades:['الأول','الثاني','الثالث','الرابع','الخامس','السادس']},
    Preparatory:{nameAr:'إعدادي',grades:['الأول','الثاني','الثالث']},
    Secondary:{nameAr:'ثانوي',grades:['الأول','الثاني','الثالث']}
  },
  subjects:['English','Math','Physics','Chemistry','Biology','Arabic','French','German'],

  featureFlags: {
    qrAttendance:{name:'حضور QR',enabled:true,status:'active'},
    codeAttendance:{name:'كود حضور',enabled:true,status:'active'},
    onlineExams:{name:'امتحانات أونلاين',enabled:true,status:'active'},
    offlineExams:{name:'امتحانات أوفلاين',enabled:true,status:'active'},
    antiCheat:{name:'منع الغش',enabled:true,status:'active'},
    parentPortal:{name:'بوابة ولي الأمر',enabled:true,status:'active'},
    whatsapp:{name:'واتساب',enabled:true,status:'active'},
    driveImages:{name:'صور Drive',enabled:true,status:'active'},
    fullBranding:{name:'براندنج كامل',enabled:true,status:'active'},
    billingSystem:{name:'نظام التحصيل',enabled:true,status:'active'}
  },

  settings: {
    defaultPassword:'12345678', passwordMinLength:8, maxGroupSize:30,
    qrSessionDuration:2*60*60*1000, teacherRegisterLinkDuration:48, weekStart:'Saturday',
    examAntiCheat:{enableCamera:true,snapshotInterval:30000,enableTabSwitch:true,enableScreenLock:true,randomizeQuestions:true,randomizeOptions:true}
  }
};

// حماية: لو الـ config ناقص، عطّل Firebase (وضع محلي)
(function(){
  const f=EduFlowConfig.firebase;
  if(!f||!f.apiKey||f.apiKey.length<30||!f.appId){EduFlowConfig.useFirebase=false;}
})();

window.EduFlowConfig = EduFlowConfig;