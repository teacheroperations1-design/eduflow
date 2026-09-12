// js/auth-service.js — إدارة المصادقة والصلاحيات
// 🆕 تخزين موحّد (session + local) — إصلاح الدخول على كل الأجهزة والصفحات
window.setEduUser = function(u){
  try {
    const raw = JSON.stringify(u);
    sessionStorage.setItem('eduflow_user', raw);
    localStorage.setItem('eduflow_user', raw);
  } catch(e){}
};
window.clearEduUser = function(){
  try {
    sessionStorage.removeItem('eduflow_user');
    localStorage.removeItem('eduflow_user');
    sessionStorage.removeItem('eduflow_view_as');
  } catch(e){}
};
const AuthService = {
  
  /**
   * انتظار حالة المصادقة من Firebase
   */
  async waitAuth() {
    if (!window.FirebaseService?.initialized) return null;
    return new Promise(resolve => {
      const un = firebase.auth().onAuthStateChanged(
        u => { un(); resolve(u); }, 
        () => { un(); resolve(null); }
      );
    });
  },

  /**
   * تسجيل دخول المستخدمين (أدمن، مساعد، أستاذ)
   */
  async login(identifier, password) {
    // 1) التحقق محلياً أولاً (من قاعدة البيانات المحلية)
    const local = DataService.authenticate(identifier, password);
    if (local) {
      window.setEduUser(local);
      return { success: true, user: local, source: 'local' };
    }
    
    // 2) التحقق عبر Firebase (لو متاح)
    if (window.FirebaseService?.connected) {
      try {
        const r = await FirebaseService.signIn(identifier, password);
        if (r) {
          window.setEduUser(r);
          return { success: true, user: r, source: 'firebase' };
        }
      } catch (e) { 
        console.warn('Firebase login error:', e); 
      }
    }
    
    return { success: false, message: 'بيانات الدخول غير صحيحة' };
  },

  /**
   * تسجيل دخول الطلاب
   */
  async loginStudent(code, password) {
    const s = DataService.findStudentByCode(code);
    if (!s) return { success: false, message: 'كود الطالب غير صحيح' };
    if (s.password && s.password !== password) return { success: false, message: 'كلمة المرور غير صحيحة' };
    
    window.setEduUser(s);
    return { success: true, user: s };
  },

  /**
   * تسجيل دخول أولياء الأمور
   */
  async loginParent(code, password) {
    const s = DataService.findStudentByCode(code);
    if (!s) return { success: false, message: 'كود الابن غير صحيح' };
    if ((s.parentAccess || '') !== password) return { success: false, message: 'كلمة مرور ولي الأمر غير صحيحة' };
    
    const parent = {
      id: 'parent_' + s.id, 
      role: 'parent', 
      name: 'ولي أمر ' + s.name,
      phone: s.parentPhone, 
      studentIds: [s.id], 
      viaChildCode: true
    };
    
    window.setEduUser(parent);
    return { success: true, user: parent };
  },

  /**
   * تسجيل الخروج
   */
  async logout() {
    window.clearEduUser();
    if (window.FirebaseService?.connected) {
      try { await FirebaseService.signOut(); } catch(e) {}
    }
    location.href = 'login.html';
  },

  /**
   * جلب المستخدم الحالي (يدعم ميزة View As للمدير)
   */
  getCurrentUser() {
    const viewAs = sessionStorage.getItem('eduflow_view_as');
    if (viewAs) return JSON.parse(viewAs);
    
    const s = sessionStorage.getItem('eduflow_user');
    return s ? JSON.parse(s) : null;
  },

  /**
   * جلب المستخدم الحقيقي (متجاهلاً ميزة View As)
   */
  getRealUser() {
    const s = sessionStorage.getItem('eduflow_user');
    return s ? JSON.parse(s) : null;
  },

  /**
   * تفعيل وضع المعاينة (View As)
   */
  setViewAs(user) { 
    sessionStorage.setItem('eduflow_view_as', JSON.stringify(user)); 
  },
  
  clearViewAs() { 
    sessionStorage.removeItem('eduflow_view_as'); 
  },

  /**
   * التحقق من الصلاحيات وتوجيه المستخدم
   */
  requireRole(roles) {
    const u = this.getCurrentUser();
    if (!u) { 
      location.href = 'login.html'; 
      return false; 
    }
    if (!roles.includes(u.role)) { 
      this.redirectToDashboard(u.role); 
      return false; 
    }
    return true;
  },

  /**
   * التوجيه إلى لوحة التحكم الخاصة بدور المستخدم
   */
  redirectToDashboard(role) {
    const map = {
      super_admin: 'admin-dashboard.html',
      assistant: 'assistant-dashboard.html',
      teacher: 'teacher-dashboard.html',
      student: 'student-dashboard.html',
      parent: 'parent-dashboard.html'
    };
    location.href = map[role] || 'login.html';
  },

  /**
   * التحقق من صلاحية محددة
   */
  hasPermission(module, action) {
    const u = this.getCurrentUser();
    if (!u) return false;
    if (u.role === 'super_admin') return true;
    return (u.permissions || {})[module]?.[action] === true;
  },

  /**
   * تسجيل أستاذ جديد عبر رابط دعوة مؤقت
   */
  async registerTeacherViaLink(linkCode, teacherData) {
    const validation = DataService.validateTeacherRegisterLink(linkCode);
    if (!validation.valid) return { success: false, message: validation.message };

    const teacher = await DataService.addUser({
      ...teacherData,
      role: 'teacher'
    });

    await DataService.markTeacherRegisterLinkUsed(linkCode, teacher.id);

    window.setEduUser(teacher);
    return { success: true, user: teacher, code: teacher.id };
  }
};

// تصدير الخدمة للنافذة
window.AuthService = AuthService;