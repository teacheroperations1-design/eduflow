// js/auth-service.js — إدارة المصادقة والصلاحيات
const AuthService = {
  async waitAuth() {
    if (!window.FirebaseService?.initialized) return null;
    return new Promise(resolve => {
      const un = firebase.auth().onAuthStateChanged(u => { un(); resolve(u); }, () => { un(); resolve(null); });
    });
  },

  async login(identifier, password) {
    // 1) محلي أولاً
    const local = DataService.authenticate(identifier, password);
    if (local) {
      sessionStorage.setItem('eduflow_user', JSON.stringify(local));
      return { success:true, user:local, source:'local' };
    }
    // 2) Firebase
    if (window.FirebaseService?.connected) {
      try {
        const r = await FirebaseService.signIn(identifier, password);
        if (r) {
          sessionStorage.setItem('eduflow_user', JSON.stringify(r));
          return { success:true, user:r, source:'firebase' };
        }
      } catch (e) { console.warn(e); }
    }
    return { success:false, message:'بيانات غير صحيحة' };
  },

  async loginStudent(code, password) {
    const s = DataService.findStudentByCode(code);
    if (!s) return { success:false, message:'كود غير صحيح' };
    if (s.password && s.password !== password) return { success:false, message:'كلمة المرور غير صحيحة' };
    sessionStorage.setItem('eduflow_user', JSON.stringify(s));
    return { success:true, user:s };
  },

  async loginParent(code, password) {
    const s = DataService.findStudentByCode(code);
    if (!s) return { success:false, message:'كود الابن غير صحيح' };
    if ((s.parentAccess||'') !== password) return { success:false, message:'كلمة مرور ولي الأمر غير صحيحة' };
    const parent = {
      id:'parent_'+s.id, role:'parent', name:'ولي أمر '+s.name,
      phone:s.parentPhone, studentIds:[s.studentId], viaChildCode:true
    };
    sessionStorage.setItem('eduflow_user', JSON.stringify(parent));
    return { success:true, user:parent };
  },

  async logout() {
    sessionStorage.removeItem('eduflow_user');
    sessionStorage.removeItem('eduflow_view_as');
    if (window.FirebaseService?.connected) await FirebaseService.signOut();
    location.href = 'login.html';
  },

  getCurrentUser() {
    const viewAs = sessionStorage.getItem('eduflow_view_as');
    if (viewAs) return JSON.parse(viewAs);
    const s = sessionStorage.getItem('eduflow_user');
    return s ? JSON.parse(s) : null;
  },

  getRealUser() {
    const s = sessionStorage.getItem('eduflow_user');
    return s ? JSON.parse(s) : null;
  },

  setViewAs(user) { sessionStorage.setItem('eduflow_view_as', JSON.stringify(user)); },
  clearViewAs() { sessionStorage.removeItem('eduflow_view_as'); },

  requireRole(roles) {
    const u = this.getCurrentUser();
    if (!u) { location.href = 'login.html'; return false; }
    if (!roles.includes(u.role)) { this.redirectToDashboard(u.role); return false; }
    return true;
  },

  redirectToDashboard(role) {
    const map = {
      super_admin:'admin-dashboard.html',
      assistant:'assistant-dashboard.html',
      teacher:'teacher-dashboard.html',
      student:'student-dashboard.html',
      parent:'parent-dashboard.html'
    };
    location.href = map[role] || 'login.html';
  },

  hasPermission(module, action) {
    const u = this.getCurrentUser();
    if (!u) return false;
    if (u.role === 'super_admin') return true;
    return (u.permissions||{})[module]?.[action] === true;
  },

  // ============ تسجيل أستاذ عبر رابط مؤقت ============
  async registerTeacherViaLink(linkCode, teacherData) {
    const validation = DataService.validateTeacherRegisterLink(linkCode);
    if (!validation.valid) return { success:false, message:validation.message };

    const teacher = await DataService.addUser({
      ...teacherData,
      role: 'teacher'
    });

    await DataService.markTeacherRegisterLinkUsed(linkCode, teacher.id);

    sessionStorage.setItem('eduflow_user', JSON.stringify(teacher));
    return { success:true, user:teacher, code: teacher.id };
  }
};

window.AuthService = AuthService;