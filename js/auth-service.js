// js/auth-service.js — إدارة المصادقة والصلاحيات (نسخة نهائية مصححة)
// ✅ تخزين موحّد (session + local) + جلسة باركود سريعة + دعم Firebase الصحيح

const QR_SESSION_KEY = 'eduflow_qr_session_v1';

// ═══════════════ دوال التخزين الموحّدة ═══════════════
window.setEduUser = function(u){
  try {
    if (!u) return;
    const raw = JSON.stringify(u);
    sessionStorage.setItem('eduflow_user', raw);
    localStorage.setItem('eduflow_user', raw);
  } catch(e){ console.warn('setEduUser failed:', e); }
};

window.clearEduUser = function(){
  try {
    sessionStorage.removeItem('eduflow_user');
    localStorage.removeItem('eduflow_user');
    sessionStorage.removeItem('eduflow_view_as');
    localStorage.removeItem('eduflow_view_as');
    if (window.clearQrQuickSession) window.clearQrQuickSession();
  } catch(e){}
};

// ═══════════════ جلسة الباركود السريعة ═══════════════
window.setQrQuickSession = function(role = 'assistant', hours = 12){
  const session = { role, ts: Date.now(), exp: Date.now() + (hours*60*60*1000), via: 'qr' };
  try {
    localStorage.setItem(QR_SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem(QR_SESSION_KEY, JSON.stringify(session));
  } catch(e){}
  return session;
};

window.clearQrQuickSession = function(){
  try {
    localStorage.removeItem(QR_SESSION_KEY);
    sessionStorage.removeItem(QR_SESSION_KEY);
  } catch(e){}
};

window.getQrQuickSession = function(){
  try {
    const raw = sessionStorage.getItem(QR_SESSION_KEY) || localStorage.getItem(QR_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.exp && s.exp > Date.now()) return s;
    window.clearQrQuickSession();
    return null;
  } catch(e){ return null; }
};

// ═══════════════ AuthService ═══════════════
const AuthService = {

  async waitAuth() {
    if (!(window.firebase && firebase.apps.length)) return null;
    return new Promise(resolve => {
      const un = firebase.auth().onAuthStateChanged(
        u => { un(); resolve(u); },
        () => { un(); resolve(null); }
      );
    });
  },

  /** تسجيل دخول (أدمن/مساعد/مدرس/طالب) — Firebase أولاً ثم محلي */
  async login(identifier, password) {
    if (!identifier || !password) return { success:false, message:'أكمل البيانات' };
    const id = String(identifier).trim();

    // 1) Firebase Firestore
    if (window.firebase && firebase.apps.length) {
      try {
        let doc = null;
        const strategies = [
          { field:'email',    value: id.toLowerCase() },
          { field:'code',     value: id.toUpperCase() },
          { field:'phone',    value: id.replace(/\D/g,'') },
          { field:'username', value: id.toLowerCase() }
        ];
        for (const s of strategies) {
          if (!s.value) continue;
          try {
            const snap = await firebase.firestore().collection('users')
              .where(s.field,'==',s.value).limit(1).get();
            if (!snap.empty) { doc = snap.docs[0]; break; }
          } catch(e) {}
        }
        if (doc) {
          const u = { id: doc.id, ...doc.data() };
          if (String(u.password||'') === String(password)) {
            window.setEduUser(u);
            return { success:true, user:u, source:'firebase' };
          }
          return { success:false, message:'كلمة المرور غير صحيحة' };
        }
      } catch(e) { console.warn('Firebase login error:', e); }
    }

    // 2) محلي
    if (typeof DataService?.authenticate === 'function') {
      const local = DataService.authenticate(id, password);
      if (local) { window.setEduUser(local); return { success:true, user:local, source:'local' }; }
    }
    return { success:false, message:'بيانات الدخول غير صحيحة' };
  },

  async loginStudent(code, password) {
    const s = typeof DataService?.findStudentByCode === 'function' ? DataService.findStudentByCode(code) : null;
    if (!s) return { success:false, message:'كود الطالب غير صحيح' };
    if (s.password && s.password !== password) return { success:false, message:'كلمة المرور غير صحيحة' };
    window.setEduUser(s);
    return { success:true, user:s };
  },

  async loginParent(code, password) {
    const s = typeof DataService?.findStudentByCode === 'function' ? DataService.findStudentByCode(code) : null;
    if (!s) return { success:false, message:'كود الابن غير صحيح' };
    if ((s.parentAccess||'') !== password) return { success:false, message:'كلمة مرور ولي الأمر غير صحيحة' };
    const parent = {
      id:'parent_'+s.id, role:'parent', name:'ولي أمر '+s.name,
      phone:s.parentPhone, studentIds:[s.id], viaChildCode:true, parentOf:s.name
    };
    window.setEduUser(parent);
    return { success:true, user:parent };
  },

  async logout() {
    window.clearEduUser();
    if (window.FirebaseService?.connected) {
      try { await firebase.auth().signOut(); } catch(e) {}
    }
    location.href = 'login.html';
  },

  /** المستخدم الحالي: View As ← جلسة باركود ← session ← local */
  getCurrentUser() {
    try {
      const viewAs = sessionStorage.getItem('eduflow_view_as') || localStorage.getItem('eduflow_view_as');
      if (viewAs) { try { return JSON.parse(viewAs); } catch(e){} }

      const qr = window.getQrQuickSession ? window.getQrQuickSession() : null;
      if (qr) {
        return { uid:'qr_'+qr.role, role:qr.role, name:'📷 مستخدم الباركود', isQrUser:true, code:qr.code };
      }

      const sessionUser = sessionStorage.getItem('eduflow_user');
      if (sessionUser) { try { return JSON.parse(sessionUser); } catch(e){} }

      const localUser = localStorage.getItem('eduflow_user');
      if (localUser) {
        try {
          const user = JSON.parse(localUser);
          sessionStorage.setItem('eduflow_user', localUser);
          return user;
        } catch(e){}
      }
    } catch(e) {}
    return null;
  },

  getRealUser() {
    try {
      const s = sessionStorage.getItem('eduflow_user') || localStorage.getItem('eduflow_user');
      return s ? JSON.parse(s) : null;
    } catch(e){ return null; }
  },

  /** تحديث بيانات المستخدم من Firestore */
  async refreshAuth() {
    const user = this.getRealUser();
    if (!user?.id || !(window.firebase && firebase.apps.length)) return user;
    try {
      const snap = await firebase.firestore().collection('users').doc(user.id).get();
      if (snap.exists) {
        const fresh = { id: snap.id, ...snap.data() };
        window.setEduUser(fresh);
        return fresh;
      }
    } catch(e) {}
    return user;
  },

  setViewAs(user) {
    try {
      const raw = JSON.stringify(user);
      sessionStorage.setItem('eduflow_view_as', raw);
      localStorage.setItem('eduflow_view_as', raw);
    } catch(e){}
  },
  clearViewAs() {
    try {
      sessionStorage.removeItem('eduflow_view_as');
      localStorage.removeItem('eduflow_view_as');
    } catch(e){}
  },

  requireRole(roles) {
    const u = this.getCurrentUser();
    if (u?.isQrUser) {
      if (!roles) return true;
      const arr = Array.isArray(roles) ? roles : [roles];
      return arr.includes(u.role);
    }
    if (!u) { location.href = 'login.html'; return false; }
    if (roles) {
      const arr = Array.isArray(roles) ? roles : [roles];
      if (!arr.includes(u.role)) { this.redirectToDashboard(u.role); return false; }
    }
    return true;
  },

  redirectToDashboard(role) {
    const map = {
      super_admin:'admin-dashboard.html', admin:'admin-dashboard.html',
      assistant:'assistant-dashboard.html', teacher:'teacher-dashboard.html',
      student:'student-dashboard.html', parent:'parent-dashboard.html'
    };
    location.href = map[role] || 'login.html';
  },

  hasPermission(module, action) {
    const u = this.getCurrentUser();
    if (!u) return false;
    if (u.role === 'super_admin' || u.role === 'admin') return true;
    return (u.permissions||{})[module]?.[action] === true;
  },

  async registerTeacherViaLink(linkCode, teacherData) {
    const validation = typeof DataService?.validateTeacherRegisterLink === 'function'
      ? DataService.validateTeacherRegisterLink(linkCode)
      : { valid:false, message:'غير مدعوم' };
    if (!validation.valid) return { success:false, message:validation.message };
    const teacher = await DataService.addUser({ ...teacherData, role:'teacher' });
    if (typeof DataService?.markTeacherRegisterLinkUsed === 'function') {
      await DataService.markTeacherRegisterLinkUsed(linkCode, teacher.id);
    }
    window.setEduUser(teacher);
    return { success:true, user:teacher, code:teacher.id };
  },

  /** دخول آمن عبر QR Token (مرحلة لاحقة) */
  async loginWithQrToken(token) {
    if (!(window.firebase && firebase.apps.length)) return { success:false, message:'Firebase غير متصل' };
    try {
      const snap = await firebase.firestore().collection('qr_tokens')
        .where('token','==',token).where('used','==',false).limit(1).get();
      if (snap.empty) return { success:false, message:'رمز غير صالح أو مستخدم' };
      const td = snap.docs[0].data();
      if (td.exp && td.exp < Date.now()) return { success:false, message:'انتهت صلاحية الرمز' };
      const userSnap = await firebase.firestore().collection('users').doc(td.userId).get();
      if (!userSnap.exists) return { success:false, message:'المستخدم غير موجود' };
      await snap.docs[0].ref.update({ used:true, usedAt:Date.now() });
      const user = { id:userSnap.id, ...userSnap.data() };
      window.setEduUser(user);
      return { success:true, user, source:'qr_token' };
    } catch(e) {
      return { success:false, message:'فشل تسجيل الدخول' };
    }
  },

  checkSession() {
    const u = this.getCurrentUser();
    return {
      isLoggedIn: !!u, isQrUser: !!u?.isQrUser,
      isViewingAs: !!sessionStorage.getItem('eduflow_view_as'),
      role: u?.role || null, name: u?.name || null
    };
  }
};

window.AuthService = AuthService;

// تحديث تلقائي عند العودة للتبويب أو رجوع النت
(function(){
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && AuthService.getRealUser()) { try { await AuthService.refreshAuth(); } catch(e){} }
  });
  window.addEventListener('online', async () => {
    if (AuthService.getRealUser()) { try { await AuthService.refreshAuth(); } catch(e){} }
  });
})();