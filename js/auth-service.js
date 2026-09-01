// js/auth-service.js — موحّد + محمي
const AuthService = {
  _fbAvailable() { return (typeof FirebaseService !== 'undefined') && FirebaseService.connected === true; },

  // login موحّد: بيقبل إيميل / رقم / كود / StudentID
  // + دعم دخول ولي الأمر بكود الابن
  async login(identifier, password, asParent = false) {
    if (asParent) {
      const parent = DataService.loginParentWithChildCode(identifier, password);
      if (parent) { sessionStorage.setItem('eduflow_user', JSON.stringify(parent)); return { success: true, user: parent, source: 'local' }; }
      return { success: false, message: 'كود الطالب أو كلمة المرور غير صحيحة' };
    }

    if (this._fbAvailable()) {
      try {
        const fb = await FirebaseService.signIn(identifier, password);
        if (fb) { const { password: _, ...safe } = fb; sessionStorage.setItem('eduflow_user', JSON.stringify(safe)); return { success: true, user: safe, source: 'firebase' }; }
      } catch (e) { console.warn(e); }
    }

    const user = DataService.authenticate(identifier, password);
    if (user) { sessionStorage.setItem('eduflow_user', JSON.stringify(user)); return { success: true, user, source: 'local' }; }
    return { success: false, message: 'بيانات الدخول غير صحيحة' };
  },

  async logout() {
    if (this._fbAvailable()) { try { await FirebaseService.signOut(); } catch (e) { console.warn(e); } }
    sessionStorage.removeItem('eduflow_user');
    sessionStorage.removeItem('impersonated_by');
    window.location.href = 'login.html';
  },

  getCurrentUser() { const s = sessionStorage.getItem('eduflow_user'); return s ? JSON.parse(s) : null; },

  requireRole(roles) {
    const u = this.getCurrentUser();
    if (!u) { window.location.href = 'login.html'; return false; }
    if (!roles.includes(u.role)) { this.redirectToDashboard(u.role); return false; }
    return true;
  },

  redirectToDashboard(role) {
    const r = { super_admin: 'admin-dashboard.html', assistant: 'assistant-dashboard.html', teacher: 'teacher-dashboard.html', student: 'student-dashboard.html', parent: 'parent-dashboard.html' };
    window.location.href = r[role] || 'login.html';
  },

  hasPermission(module, action) {
    const u = this.getCurrentUser();
    if (!u) return false;
    if (u.role === 'super_admin') return true;
    return DataService.hasPermission(u.id, module, action);
  }
};