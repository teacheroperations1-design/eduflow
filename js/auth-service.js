// js/auth-service.js — دخول حقيقي عبر Firebase Auth
const AuthService = {
  // استنى Firebase Auth يجهز ورجّع المستخدم
  async waitAuth() {
    if (!window.FirebaseService?.initialized) return null;
    return new Promise(resolve => {
      const un = firebase.auth().onAuthStateChanged(u => { un(); resolve(u); }, () => { un(); resolve(null); });
    });
  },

  // تسجيل دخول بالبريد + باسورد عبر Firebase Auth
  async login(identifier, password) {
    try {
      // 1) سجّل دخول في Firebase Auth
      const cred = await firebase.auth().signInWithEmailAndPassword(identifier.trim(), password);
      const uid = cred.user.uid;

      // 2) اقرأ البروفايل من Firestore عشان نعرف الدور
      const doc = await firebase.firestore().collection('users').doc(uid).get();
      let profile = doc.exists ? doc.data() : null;

      // لو مفيش بروفايل بالـ uid، دوّر بالإيميل
      if (!profile) {
        const snap = await firebase.firestore().collection('users').where('email','==',identifier.trim().toLowerCase()).limit(1).get();
        if (!snap.empty) profile = snap.docs[0].data();
      }
      if (!profile) { await firebase.auth().signOut(); return { success:false, message:'لا يوجد حساب مرتبط' }; }

      // 3) خزّن الجلسة محلياً عشان الداشبوردات تشتغل
      sessionStorage.setItem('eduflow_user', JSON.stringify(profile));
      return { success:true, user:profile, source:'firebase' };
    } catch (err) {
      return { success:false, message: this._authError(err.code) };
    }
  },

  // دخول ولي الأمر بكود الابن (قراءة عامة مسموحة)
  async loginParent(code, password) {
    // ولي الأمر مش عنده Auth account، فبنستخدم كود الابن كـ "باسورد مؤقت"
    const student = DataService.findStudentByCode(code);
    if (!student) return { success:false, message:'كود الابن غير صحيح' };
    if (student.parentAccess !== password) return { success:false, message:'كلمة مرور ولي الأمر غير صحيحة' };
    const parent = { id:'parent_'+student.id, role:'parent', name:'ولي أمر '+student.name, phone:student.parentPhone, studentIds:[student.studentId], viaChildCode:true };
    sessionStorage.setItem('eduflow_user', JSON.stringify(parent));
    return { success:true, user:parent };
  },

  async logout() {
    sessionStorage.removeItem('eduflow_user');
    if (window.FirebaseService?.initialized) { try { await firebase.auth().signOut(); } catch(e){} }
    location.href = 'login.html';
  },

  getCurrentUser() {
    const s = sessionStorage.getItem('eduflow_user');
    return s ? JSON.parse(s) : null;
  },

  requireRole(roles) {
    const u = this.getCurrentUser();
    if (!u) { location.href = 'login.html'; return false; }
    if (!roles.includes(u.role)) { this.redirectToDashboard(u.role); return false; }
    return true;
  },

  redirectToDashboard(role) {
    const r = { super_admin:'admin-dashboard.html', assistant:'assistant-dashboard.html', teacher:'teacher-dashboard.html', student:'student-dashboard.html', parent:'parent-dashboard.html' };
    location.href = r[role] || 'login.html';
  },

  hasPermission(m, a) {
    const u = this.getCurrentUser();
    if (!u) return false;
    if (u.role === 'super_admin') return true;
    return (DataService.getUserPermissions(u.id)||{})[m]?.[a] === true;
  },

  _authError(code) {
    const map = {
      'auth/invalid-credential':'بيانات الدخول غير صحيحة',
      'auth/wrong-password':'كلمة المرور غير صحيحة',
      'auth/user-not-found':'لا يوجد حساب بهذا البريد',
      'auth/too-many-requests':'محاولات كثيرة، انتظر قليلاً',
      'auth/invalid-email':'البريد غير صالح'
    };
    return map[code] || 'فشل تسجيل الدخول';
  }
};
window.AuthService = AuthService;