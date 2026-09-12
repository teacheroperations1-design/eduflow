// js/operations-service.js
const Ops = {
  COLLECTIONS: [
    'followUps', 'communicationLogs', 'classSessions',
    'automations', 'automationLogs',
    'teacherEvaluations', 'interactiveMaterials', 'centers',
    'manualPoints', 'interactionPoints', 'manualSessions', 'whatsappTemplates'
  ],

  async init() {
    const d = DataService._getData();
    this.COLLECTIONS.forEach(c => { if (!d[c]) d[c] = []; });
    if (!d.automations?.length) d.automations = this.defaultAutomations();
    if (!d.whatsappTemplates?.length) d.whatsappTemplates = this.defaultWhatsAppTemplates();
    this.migrateAssistants(d);
    DataService._saveData(d);
  },

  migrateAssistants(d) {
    (d.users || []).filter(u => u.role === 'assistant').forEach(a => {
      if (!a.assistant && !d.assignments?.[a.id]) {
        a.assistant = {
          level: 'primary',
          scope: {
            teacherIds: a.assignedTeacherIds || [],
            groupIds: [],
            centerIds: []
          }
        };
      }
    });
  },

  defaultAutomations() {
    return [
      { id: 'auto_absent', name: 'غياب متكرر → متابعة', trigger: 'student_absent_repeat', action: 'create_followup', enabled: true, threshold: 2 },
      { id: 'auto_hw', name: 'واجب متأخر → تذكير', trigger: 'homework_overdue', action: 'create_reminder', enabled: true },
      { id: 'auto_pay', name: 'دفعة متأخرة → متابعة دفع', trigger: 'payment_overdue', action: 'create_payment_followup', enabled: true },
      { id: 'auto_att', name: 'حضور مُرسل → إشعار للمساعد', trigger: 'attendance_submitted', action: 'notify_assistant', enabled: true },
      { id: 'auto_cancel', name: 'حصة ملغاة → إشعار الطلاب', trigger: 'session_cancelled', action: 'notify_students', enabled: true },
      { id: 'auto_points', name: 'نقاط جديدة → إشعار للطالب', trigger: 'points_awarded', action: 'notify_student', enabled: true }
    ];
  },

  // ============  قوالب واتساب الجاهزة ============
  defaultWhatsAppTemplates() {
    return [
      {
        id: 'tpl_congrats',
        name: '🎉 تهنئة طالب متفوق',
        category: 'praise',
        content: 'السلام عليكم {{parentName}}،\n\n🎉 مبروك! ابنك/ابنتك {{studentName}} حقق إنجاز رائع في مادة {{subject}} مع الأستاذ {{teacherName}}.\n\n⭐ النقاط: {{points}}\n📊 الأداء: {{performance}}\n\nنفتخر بيه وبنتمنى له المزيد من التفوق!\n\nمع تحيات,\n{{centerName}}'
      },
      {
        id: 'tpl_absence',
        name: '️ تنبيه غياب',
        category: 'warning',
        content: 'السلام عليكم {{parentName}}،\n\nنود إبلاغكم بأن ابنكم/ابنتكم {{studentName}} تغيب عن حصة {{subject}} اليوم مع الأستاذ {{teacherName}}.\n\n📅 التاريخ: {{date}}\n📚 المجموعة: {{groupName}}\n\nنرجو متابعة الأمر، ويمكن تعويض الحصة في موعد لاحق.\n\nمع تحيات,\n{{centerName}}'
      },
      {
        id: 'tpl_payment',
        name: '💰 تذكير بدفع',
        category: 'payment',
        content: 'السلام عليكم {{parentName}}،\n\nنذكركم بأن شهرية ابنكم/ابنتكم {{studentName}} عن شهر {{month}} لم تُسدد بعد.\n\n💰 المبلغ المستحق: {{amount}} جنيه\n📚 المجموعات: {{groups}}\n\nيمكنكم الدفع عبر:\n• كاش في السنتر\n• فودافون كاش: {{vodafoneNumber}}\n\nشكراً لتعاونكم.\n{{centerName}}'
      },
      {
        id: 'tpl_meeting',
        name: '🤝 طلب مقابلة',
        category: 'meeting',
        content: 'السلام عليكم {{parentName}}،\n\nنود دعوتكم لمقابلة مع الأستاذ {{teacherName}} لمناقشة تقدم ابنكم/ابنتكم {{studentName}}.\n\n📅 الموعد المقترح: {{date}}\n🕐 الساعة: {{time}}\n📍 المكان: {{centerName}}\n\nنرجو تأكيد الحضور أو اقتراح موعد بديل.\n\nمع تحيات,\n{{centerName}}'
      },
      {
        id: 'tpl_hw_overdue',
        name: '📝 واجب متأخر',
        category: 'homework',
        content: 'السلام عليكم {{parentName}}،\n\nنود إبلاغكم بأن الواجب التالي لابنكم/ابنتكم {{studentName}} لم يُسلّم بعد:\n\n📝 عنوان الواجب: {{hwTitle}}\n📚 المادة: {{subject}}\n👨‍🏫 الأستاذ: {{teacherName}}\n📅 موعد التسليم: {{deadline}}\n\nنرجو المتابعة والتسليم في أقرب وقت.\n\n{{centerName}}'
      },
      {
        id: 'tpl_monthly_report',
        name: ' تقرير شهري',
        category: 'report',
        content: 'السلام عليكم {{parentName}}،\n\n📊 التقرير الشهري لابنكم/ابنتكم {{studentName}} عن شهر {{month}}:\n\n{{#each teachers}}\n👨‍🏫 {{teacherName}} ({{groupName}}):\n  • الحضور: {{attendanceRate}}%\n  • متوسط الواجبات: {{hwAvg}}%\n  • متوسط الامتحانات: {{examAvg}}%\n  • النقاط المكتسبة: {{points}}\n{{/each}}\n\nللمزيد من التفاصيل، يرجى زيارة لوحة ولي الأمر.\n\n{{centerName}}'
      },
      {
        id: 'tpl_teacher_report',
        name: '📈 تقرير أداء أستاذ',
        category: 'admin',
        content: 'تقرير الأستاذ {{teacherName}} عن شهر {{month}}:\n\n📚 المجموعات: {{groupsCount}}\n👨‍🎓 الطلاب: {{studentsCount}}\n📝 الواجبات: {{hwCount}}\n🎓 الامتحانات: {{examsCount}}\n متوسط الأداء: {{avgPerformance}}%\n\nأعلى 3 طلاب:\n{{#each top3}}{{rank}}. {{name}} - {{points}} نقطة\n{{/each}}\n\nالمجموعات النشطة:\n{{#each groups}}• {{name}} ({{studentsCount}} طالب)\n{{/each}}'
      }
    ];
  },

  getWhatsAppTemplates() {
    return DataService._getData().whatsappTemplates || this.defaultWhatsAppTemplates();
  },

  async saveWhatsAppTemplate(template) {
    const d = DataService._getData();
    if (!d.whatsappTemplates) d.whatsappTemplates = [];
    const idx = d.whatsappTemplates.findIndex(t => t.id === template.id);
    if (idx >= 0) d.whatsappTemplates[idx] = template;
    else d.whatsappTemplates.push({ ...template, id: 'tpl_' + Date.now() });
    DataService._saveData(d);
  },

  async deleteWhatsAppTemplate(id) {
    const d = DataService._getData();
    d.whatsappTemplates = (d.whatsappTemplates || []).filter(t => t.id !== id);
    DataService._saveData(d);
  },

  // ============  SCOPE & ASSIGNMENT (مصحح - يحل مشكلة ربط المساعد) ============
  
  // 🆕 قراءة ربط المساعد من db.assignments (الذي يحفظه admin-dashboard)
  getAssignment(userId) {
    const d = DataService._getData();
    const assignment = d.assignments?.[userId];
    if (assignment) return assignment;
    
    // Fallback: قراءة من user.assistant
    const u = DataService.getUserById(userId);
    if (u?.assistant) {
      return {
        level: u.assistant.level || 'primary',
        teacherId: u.assistant.scope?.teacherIds?.[0] || null,
        teacherIds: u.assistant.scope?.teacherIds || []
      };
    }
    return null;
  },

  // 🆕 حفظ ربط المساعد في db.assignments
  async setAssignment(userId, assignmentData) {
    const d = DataService._getData();
    d.assignments = d.assignments || {};
    d.assignments[userId] = {
      ...assignmentData,
      teacherId: assignmentData.teacherId || assignmentData.teacherIds?.[0] || null,
      assignedAt: new Date().toISOString()
    };
    DataService._saveData(d);
    
    // مزامنة مع user.assistant أيضاً
    const u = DataService.getUserById(userId);
    if (u) {
      u.assistant = {
        level: assignmentData.level || 'primary',
        scope: {
          teacherIds: assignmentData.teacherId ? [assignmentData.teacherId] : (assignmentData.teacherIds || []),
          groupIds: assignmentData.groupIds || [],
          centerIds: assignmentData.centerIds || []
        }
      };
      await DataService.updateUser(userId, { assistant: u.assistant });
    }
    
    return { success: true };
  },

  // 🆕 قراءة مستوى المساعد
  getLevel(userId) {
    const d = DataService._getData();
    const assignment = d.assignments?.[userId];
    if (assignment?.level) return assignment.level;
    
    const u = DataService.getUserById(userId);
    return u?.assistant?.level || 'primary';
  },

  // ============ SCOPE ============
  getScope(userId) {
    const u = DataService.getUserById(userId);
    if (!u) return { teacherIds: [], groupIds: [], centerIds: [] };
    if (u.role === 'super_admin') return null;

    // 🆕 1. قراءة من db.assignments أولاً (الذي يحفظه admin-dashboard)
    const d = DataService._getData();
    const assignment = d.assignments?.[userId];
    if (assignment) {
      return {
        teacherIds: assignment.teacherId ? [assignment.teacherId] : (assignment.teacherIds || []),
        groupIds: assignment.groupIds || [],
        centerIds: assignment.centerIds || []
      };
    }

    // 🆕 2. قراءة من user.assistant (الهيكل الجديد)
    if (u.assistant?.scope) return u.assistant.scope;

    // 🆕 3. Fallback قديم
    return { teacherIds: u.assignedTeacherIds || [], groupIds: [], centerIds: [] };
  },

  teachersInScope(userId) {
    const scope = this.getScope(userId);
    if (!scope) return DataService.getTeachers();
    return DataService.getTeachers().filter(t => scope.teacherIds.includes(t.id));
  },

  groupsInScope(userId) {
    const scope = this.getScope(userId);
    if (!scope) return DataService.getGroups();
    return DataService.getGroups().filter(g =>
      scope.groupIds.includes(g.id) ||
      scope.teacherIds.includes(g.teacherId) ||
      (g.center && scope.centerIds.includes(g.center))
    );
  },

  studentsInScope(userId) {
    const d = DataService._getData();
    const gids = this.groupsInScope(userId).map(g => g.id);
    const enrolledStudentIds = new Set(
      (d.enrollments || [])
        .filter(e => e.status === 'active' && gids.includes(e.groupId))
        .map(e => e.studentId)
    );
    return DataService.getStudents().filter(s =>
      enrolledStudentIds.has(s.id) || gids.includes(s.groupId)
    );
  },

  inScope(userId, { teacherId, groupId } = {}) {
    const scope = this.getScope(userId);
    if (!scope) return true;
    if (teacherId && scope.teacherIds.includes(teacherId)) return true;
    if (groupId) {
      const g = DataService.getGroups().find(x => x.id === groupId);
      if (scope.groupIds.includes(groupId) ||
        (g && scope.teacherIds.includes(g.teacherId)) ||
        (g && g.center && scope.centerIds.includes(g.center))) return true;
    }
    return false;
  },

  async log(userId, action, target) {
    const u = DataService.getUserById(userId);
    await DataService.logActivity(userId, u?.name || '-', action, target);
  },

  // ============ 🆕 التوجيه المتدرج (Guided Flow) ============
  getTeachersCascade(userId) {
    return this.teachersInScope(userId).map(t => ({
      id: t.id,
      name: t.name,
      photoUrl: t.photoUrl || '',
      subject: t.subject || '',
      groupsCount: DataService.getGroupsByTeacher(t.id).length
    }));
  },

  getTeacherGroupsCascade(teacherId, filters = {}) {
    let groups = DataService.getGroupsByTeacher(teacherId);
    if (filters.stage) groups = groups.filter(g => g.stage === filters.stage);
    if (filters.grade) groups = groups.filter(g => g.grade === filters.grade);
    if (filters.center) groups = groups.filter(g => g.center === filters.center);

    return groups.map(g => ({
      id: g.id,
      name: g.name,
      stage: g.stage,
      grade: g.grade,
      center: g.center || '',
      day: g.day,
      time: DataService.formatTime(g.time),
      studentsCount: DataService.getStudentsByGroup(g.id).length,
      monthlyFee: g.monthlyFee || 0
    }));
  },

  // ============ FOLLOW-UPS ============
  async addFollowUp(f) {
    const d = DataService._getData(); if (!d.followUps) d.followUps = [];
    const id = f.id || 'fu_' + Date.now();
    const item = {
      id, status: 'open', startDate: new Date().toISOString().split('T')[0],
      history: [], createdAt: new Date().toISOString(), ...f
    };
    d.followUps.push(item); DataService._saveData(d);
    if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('followUps', id, item);
    return item;
  },
  async updateFollowUp(id, updates) {
    const d = DataService._getData();
    const f = (d.followUps || []).find(x => x.id === id);
    if (!f) return;
    Object.assign(f, updates); DataService._saveData(d);
    if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('followUps', id, f);
  },
  async addFollowUpHistory(id, note, by) {
    const d = DataService._getData();
    const f = (d.followUps || []).find(x => x.id === id);
    if (!f) return;
    f.history = f.history || [];
    f.history.push({ date: new Date().toISOString(), by, note });
    f.lastContact = new Date().toISOString().split('T')[0];
    DataService._saveData(d);
    if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('followUps', id, f);
  },
  getFollowUps(filter = {}) {
    let r = DataService._getData().followUps || [];
    if (filter.status) r = r.filter(x => x.status === filter.status);
    if (filter.studentId) r = r.filter(x => x.studentId === filter.studentId);
    if (filter.ownerAssistant) r = r.filter(x => x.ownerAssistant === filter.ownerAssistant);
    if (filter.teacherId) {
      r = r.filter(fu => {
        const student = DataService.getUserById(fu.studentId);
        if (!student) return false;
        const teachers = DataService.getStudentTeachers(fu.studentId);
        return teachers.some(t => t.teacher.id === filter.teacherId);
      });
    }
    return r;
  },

  // ============ COMMUNICATION ============
  async addCommunicationLog(c) {
    const d = DataService._getData(); if (!d.communicationLogs) d.communicationLogs = [];
    const id = 'cl_' + Date.now();
    const item = { id, date: new Date().toISOString(), ...c };
    d.communicationLogs.push(item); DataService._saveData(d);
    if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('communicationLogs', id, item);
    return item;
  },

  // ============ CLASS SESSIONS ============
  async ensureClassSession(groupId, date, teacherId) {
    const d = DataService._getData(); if (!d.classSessions) d.classSessions = [];
    let s = d.classSessions.find(x => x.groupId === groupId && x.date === date);
    if (!s) {
      s = { id: 'cs_' + groupId + '_' + date, groupId, teacherId, date, status: 'waiting', createdAt: new Date().toISOString() };
      d.classSessions.push(s); DataService._saveData(d);
      if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('classSessions', s.id, s);
    }
    return s;
  },
  async setClassSessionStatus(id, status, meta = {}) {
    const d = DataService._getData();
    const s = (d.classSessions || []).find(x => x.id === id);
    if (!s) return;
    s.status = status; Object.assign(s, meta); DataService._saveData(d);
    if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('classSessions', id, s);
  },
  getClassSessionsForDate(date) {
    return (DataService._getData().classSessions || []).filter(x => x.date === date);
  },

  // ============ AUTOMATION ============
  async runAutomations(context = {}) {
    const d = DataService._getData();
    const rules = (d.automations || []).filter(r => r.enabled);
    for (const rule of rules) {
      if (rule.trigger === 'attendance_submitted' && context.type === 'attendance_submitted') {
        const att = (d.attendance || []).find(a => a.id === context.attendanceId);
        if (att) {
          const assistants = (d.users || []).filter(u => u.role === 'assistant' && this.inScope(u.id, { groupId: att.groupId }));
          for (const a of assistants) {
            await DataService.addNotification({
              title: 'حضور جديد يحتاج مراجعة',
              message: `${att.groupName} بانتظار اعتمادك`,
              targetUserId: a.id, priority: 'high', type: 'attendance'
            });
          }
        }
      }
    }
  },

  // ============ DAILY BRIEFING ============
  buildDailyBriefing(userId) {
    const d = DataService._getData();
    const today = new Date().toISOString().split('T')[0];
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const groups = this.groupsInScope(userId);
    const gids = groups.map(g => g.id);
    const classesToday = groups.filter(g => g.day === day);
    const pendingAtt = (d.attendance || []).filter(a => a.status === 'pending' && gids.includes(a.groupId)).length;
    const openFu = this.getFollowUps({ ownerAssistant: userId }).filter(f => f.status !== 'resolved').length;
    const myTasks = (d.tasks || []).filter(t => t.assignedTo === userId && t.status !== 'completed').length;
    const overduePayments = (d.payments || []).filter(p =>
      p.status !== 'paid' && this.studentsInScope(userId).some(s => s.id === p.studentId)
    ).length;
    const todayHomework = (d.homework || []).filter(hw =>
      gids.includes(hw.groupId) && (hw.deadline || '').startsWith(today)
    ).length;

    return {
      date: today, classesCount: classesToday.length, classesToday,
      pendingAttendance: pendingAtt, openFollowUps: openFu,
      tasks: myTasks, overdueTasks: myTasks, overduePayments,
      todayHomework,
      summary: `لديك اليوم ${classesToday.length} حصة، ${pendingAtt} حضور يحتاج مراجعة، ${openFu} متابعة مفتوحة، ${overduePayments} دفعة متأخرة.`
    };
  },

  buildEndOfDayReport(userId, date) {
    const d = DataService._getData();
    const groups = this.groupsInScope(userId);
    const gids = groups.map(g => g.id);
    const sessions = (d.classSessions || []).filter(s => gids.includes(s.groupId) && s.date === date);
    const att = (d.attendance || []).filter(a => a.date === date && gids.includes(a.groupId));
    const absentees = att.flatMap(a =>
      (a.records || []).filter(r => r.status === 'absent').map(r => ({
        group: a.groupName,
        student: DataService.getUserById(r.studentId)?.name
      }))
    );
    return { date, sessions, attendance: att, absentees };
  },

  buildWorkload() {
    return DataService.getAssistants().map(a => {
      const scope = this.getScope(a.id);
      const tasks = (DataService._getData().tasks || []).filter(t => t.assignedTo === a.id);
      return {
        assistant: a, level: this.getLevel(a.id),
        teachers: (scope?.teacherIds || []).length,
        groups: this.groupsInScope(a.id).length,
        students: this.studentsInScope(a.id).length,
        openTasks: tasks.filter(t => t.status !== 'completed').length,
        followUps: this.getFollowUps({ ownerAssistant: a.id }).filter(f => f.status !== 'resolved').length
      };
    });
  },

  // ============ BILLING ============
  buildStudentBilling(studentId, month = null) {
    const s = DataService.getUserById(studentId);
    if (!s) return [];

    const teachers = DataService.getStudentTeachers(studentId);
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    return teachers.map(({ group, teacher }) => {
      const billing = DataService.calculateBilling(group.id, targetMonth);
      const pay = (DataService._getData().payments || []).find(p =>
        p.studentId === studentId &&
        p.groupId === group.id &&
        p.month === targetMonth
      );

      //  الحصص اليدوية المضافة
      const manualSessions = (DataService._getData().manualSessions || []).filter(ms =>
        ms.groupId === group.id &&
        ms.studentId === studentId &&
        ms.month === targetMonth
      );
      const manualSessionsCount = manualSessions.reduce((sum, ms) => sum + (ms.sessionsCount || 0), 0);

      return {
        group,
        teacher,
        billing: {
          ...billing,
          manualSessionsCount,
          totalSessions: (billing.actualSessions || 0) + manualSessionsCount
        },
        payment: pay || {
          month: targetMonth,
          groupId: group.id,
          amount: billing.total,
          paidAmount: 0,
          status: 'unpaid',
          history: []
        }
      };
    });
  },

  // 🆕 إضافة حصص يدوية للشهرية
  async addManualSessionsForBilling(groupId, studentId, month, sessionsCount, reason, addedBy) {
    const d = DataService._getData();
    if (!d.manualSessions) d.manualSessions = [];

    const id = 'ms_' + Date.now();
    const item = {
      id,
      groupId,
      studentId,
      month,
      sessionsCount: parseInt(sessionsCount) || 0,
      reason: reason || 'حصص إضافية',
      addedBy: addedBy || 'system',
      addedAt: new Date().toISOString()
    };

    d.manualSessions.push(item);
    DataService._saveData(d);
    if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('manualSessions', id, item);

    await this.log(addedBy, 'إضافة حصص يدوية', `${sessionsCount} حصة للطالب ${studentId} في ${month}`);
    return item;
  },

  isStudentDueForPayment(studentId, groupId, month) {
    const billing = DataService.calculateBilling(groupId, month);
    if (!billing) return false;
    const d = DataService._getData();
    const paid = (d.payments || []).find(p =>
      p.studentId === studentId && p.groupId === groupId && p.month === month
    );
    return billing.shouldCharge && (!paid || paid.status !== 'paid');
  },

  // ============ SEARCH ============
  globalSearch(q) {
    if (!q || q.length < 2) return [];
    const s = q.toLowerCase();
    const d = DataService._getData();
    const res = [];

    (d.users || []).forEach(u => {
      if ((u.name || '').toLowerCase().includes(s) || (u.code || '').toLowerCase().includes(s)) {
        res.push({ type: u.role, id: u.id, label: u.name, sub: u.code || u.role });
      }
    });

    (d.groups || []).forEach(g => {
      if ((g.name || '').toLowerCase().includes(s)) {
        const t = (d.users || []).find(u => u.id === g.teacherId);
        res.push({ type: 'group', id: g.id, label: g.name, sub: `أستاذ: ${t?.name || '-'}` });
      }
    });

    (d.homework || []).forEach(hw => {
      if ((hw.title || '').toLowerCase().includes(s)) {
        const g = (d.groups || []).find(gr => gr.id === hw.groupId);
        res.push({ type: 'homework', id: hw.id, label: hw.title, sub: g?.name || 'واجب' });
      }
    });

    (d.exams || []).forEach(ex => {
      if ((ex.title || '').toLowerCase().includes(s)) {
        const g = (d.groups || []).find(gr => gr.id === ex.groupId);
        res.push({ type: 'exam', id: ex.id, label: ex.title, sub: g?.name || 'امتحان' });
      }
    });

    (d.interactiveMaterials || []).forEach(im => {
      if ((im.title || '').toLowerCase().includes(s)) {
        res.push({ type: 'material', id: im.id, label: im.title, sub: 'مادة تفاعلية' });
      }
    });

    return res.slice(0, 30);
  },

  // ============  نظام النقاط الجديد ============
  getStudentPoints(studentId, teacherId = null, period = 'all') {
    const breakdown = this.getStudentPointsBreakdown(studentId, teacherId, period);
    return breakdown.total;
  },

  getStudentPointsBreakdown(studentId, teacherId = null, period = 'all') {
    const d = DataService._getData();
    const config = window.EduFlowConfig?.pointsSystem || {};

    const isInPeriod = (dateStr) => {
      if (!dateStr) return true;
      if (period === 'all') return true;
      if (period === 'week') return new Date(dateStr) >= DataService.getWeekStart();
      if (period === 'month') return (dateStr || '').startsWith(new Date().toISOString().slice(0, 7));
      return true;
    };

    const isTeacherMatch = (groupId) => {
      if (!teacherId) return true;
      const g = (d.groups || []).find(grp => grp.id === groupId);
      return g && g.teacherId === teacherId;
    };

    // 1. نقاط الحضور
    const attendanceRecords = (d.attendance || [])
      .filter(a => a.status === 'approved' && isInPeriod(a.date))
      .filter(a => isTeacherMatch(a.groupId))
      .flatMap(a => (a.records || []).filter(r => r.studentId === studentId && r.status === 'present'));

    const attendancePoints = attendanceRecords.length * (config.attendance || 1);

    // 2. نقاط الواجبات
    const hwSubmissions = (d.submissions || [])
      .filter(s => s.studentId === studentId && isInPeriod(s.submittedAt))
      .filter(s => {
        const hw = (d.homework || []).find(h => h.id === s.homeworkId);
        return hw && isTeacherMatch(hw.groupId);
      })
      .filter(s => s.status === 'graded' && s.score >= (config.passThreshold || 75));

    const hwPoints = hwSubmissions.length * (config.homeworkPass || 1);

    // 3. نقاط الامتحانات
    const examAttempts = (d.examAttempts || [])
      .filter(a => a.studentId === studentId && isInPeriod(a.endTime))
      .filter(a => {
        const ex = (d.exams || []).find(e => e.id === a.examId);
        return ex && isTeacherMatch(ex.groupId);
      })
      .filter(a => a.status === 'approved' && a.score >= (config.passThreshold || 75));

    const examPoints = examAttempts.length * (config.examPass || 1);

    // 4. نقاط التقييمات (التسميع)
    const evaluations = (d.teacherEvaluations || [])
      .filter(e => e.studentId === studentId && isInPeriod(e.evaluatedAt))
      .filter(e => !teacherId || e.teacherId === teacherId);

    const evalPoints = evaluations.reduce((sum, e) => sum + (e.points || 0), 0);

    // 🆕 5. نقاط التفاعل في الحصة
    const interactions = (d.interactionPoints || [])
      .filter(ip => ip.studentId === studentId && isInPeriod(ip.awardedAt))
      .filter(ip => !teacherId || ip.teacherId === teacherId ||
        (ip.groupId && isTeacherMatch(ip.groupId)));

    const interactionPoints = interactions.reduce((sum, ip) => sum + (ip.points || 0), 0);

    // 🆕 6. النقاط اليدوية (من الأدمن/الأسست)
    const manuals = (d.manualPoints || [])
      .filter(mp => mp.studentId === studentId && isInPeriod(mp.awardedAt))
      .filter(mp => !teacherId || mp.teacherId === teacherId || !mp.teacherId);

    const manualPoints = manuals.reduce((sum, mp) => sum + (mp.points || 0), 0);

    return {
      attendance: { count: attendanceRecords.length, points: attendancePoints },
      homework: { count: hwSubmissions.length, points: hwPoints },
      exams: { count: examAttempts.length, points: examPoints },
      evaluations: { count: evaluations.length, points: evalPoints },
      interactions: { count: interactions.length, points: interactionPoints },
      manual: { count: manuals.length, points: manualPoints },
      total: attendancePoints + hwPoints + examPoints + evalPoints + interactionPoints + manualPoints
    };
  },

  //  إضافة نقاط يدوية (من الأدمن/الأسست)
  async addManualPoints(studentId, points, reason, awardedBy, teacherId = null) {
    const d = DataService._getData();
    if (!d.manualPoints) d.manualPoints = [];

    const id = 'mp_' + Date.now();
    const item = {
      id,
      studentId,
      points: parseInt(points) || 0,
      reason: reason || 'نقاط إضافية',
      awardedBy: awardedBy || 'system',
      teacherId: teacherId || null,
      awardedAt: new Date().toISOString()
    };

    d.manualPoints.push(item);
    DataService._saveData(d);
    if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('manualPoints', id, item);

    const student = DataService.getUserById(studentId);
    const awarder = DataService.getUserById(awardedBy);
    await this.log(awardedBy, 'إضافة نقاط يدوية', `${points} نقطة للطالب ${student?.name || studentId} - السبب: ${reason}`);

    // إشعار للطالب
    await DataService.addNotification({
      title: '🎁 نقاط جديدة!',
      message: `حصلت على ${points} نقطة إضافية. السبب: ${reason}`,
      targetUserId: studentId,
      type: 'points',
      priority: 'high'
    });

    return item;
  },

  async deleteManualPoints(id) {
    const d = DataService._getData();
    d.manualPoints = (d.manualPoints || []).filter(mp => mp.id !== id);
    DataService._saveData(d);
  },

  // 🆕 نقاط تفاعل الحصة (من الأسست/الأستاذ)
  async addInteractionPoints(studentId, groupId, points, note, awardedBy) {
    const d = DataService._getData();
    if (!d.interactionPoints) d.interactionPoints = [];

    const group = DataService.getGroups().find(g => g.id === groupId);
    const id = 'ip_' + Date.now();
    const item = {
      id,
      studentId,
      groupId,
      teacherId: group?.teacherId || null,
      points: parseInt(points) || 0,
      note: note || 'تفاعل في الحصة',
      awardedBy: awardedBy || 'system',
      awardedAt: new Date().toISOString()
    };

    d.interactionPoints.push(item);
    DataService._saveData(d);
    if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('interactionPoints', id, item);

    const student = DataService.getUserById(studentId);
    await this.log(awardedBy, 'نقاط تفاعل', `${points} نقطة للطالب ${student?.name || studentId} في ${group?.name || ''}`);

    // إشعار للطالب
    await DataService.addNotification({
      title: '⭐ تفاعل رائع!',
      message: `حصلت على ${points} نقطة تفاعل في حصة ${group?.name || ''}. ${note}`,
      targetUserId: studentId,
      type: 'points',
      priority: 'medium'
    });

    return item;
  },

  // ============ الترتيب (Ranking) ============
  getGroupRanking(groupId, period = 'all') {
    const students = DataService.getStudentsByGroup(groupId);
    if (!students.length) return { top3: [], studentRank: null };

    const rankings = students.map(s => ({
      student: s,
      points: this.getStudentPoints(s.id, null, period)
    })).sort((a, b) => b.points - a.points);

    const top3 = rankings.slice(0, 3).map((r, idx) => ({
      rank: idx + 1,
      student: r.student,
      points: r.points
    }));

    return { top3, total: rankings.length };
  },

  getGradeRanking(stage, grade, period = 'all') {
    const d = DataService._getData();
    const students = (d.users || []).filter(u =>
      u.role === 'student' && u.stage === stage && u.grade === grade
    );
    if (!students.length) return { top3: [], studentRank: null };

    const rankings = students.map(s => ({
      student: s,
      points: this.getStudentPoints(s.id, null, period)
    })).sort((a, b) => b.points - a.points);

    const top3 = rankings.slice(0, 3).map((r, idx) => ({
      rank: idx + 1,
      student: r.student,
      points: r.points
    }));

    return { top3, total: rankings.length };
  },

  getStudentRanking(studentId, period = 'all') {
    const teachers = DataService.getStudentTeachers(studentId);
    const student = DataService.getUserById(studentId);
    if (!student) return {};

    const result = {};

    teachers.forEach(({ group, teacher }) => {
      const students = DataService.getStudentsByGroup(group.id);
      const rankings = students.map(s => ({
        studentId: s.id,
        points: this.getStudentPoints(s.id, teacher.id, period)
      })).sort((a, b) => b.points - a.points);

      const myRank = rankings.findIndex(r => r.studentId === studentId) + 1;
      const myPoints = this.getStudentPoints(studentId, teacher.id, period);

      result[group.id] = {
        groupId: group.id,
        groupName: group.name,
        teacherId: teacher.id,
        teacherName: teacher.name,
        teacherPhoto: teacher.photoUrl || '',
        rank: myRank,
        total: rankings.length,
        points: myPoints,
        top3: rankings.slice(0, 3).map((r, idx) => {
          const s = DataService.getUserById(r.studentId);
          return {
            rank: idx + 1,
            name: s?.name || '-',
            code: s?.code || '',
            points: r.points
          };
        })
      };
    });

    if (student.stage && student.grade) {
      const gradeStudents = (DataService._getData().users || []).filter(u =>
        u.role === 'student' && u.stage === student.stage && u.grade === student.grade
      );
      const gradeRankings = gradeStudents.map(s => ({
        studentId: s.id,
        points: this.getStudentPoints(s.id, null, period)
      })).sort((a, b) => b.points - a.points);

      const gradeRank = gradeRankings.findIndex(r => r.studentId === studentId) + 1;
      result._grade = {
        stage: student.stage,
        grade: student.grade,
        rank: gradeRank,
        total: gradeRankings.length,
        points: this.getStudentPoints(studentId, null, period),
        top3: gradeRankings.slice(0, 3).map((r, idx) => {
          const s = DataService.getUserById(r.studentId);
          return {
            rank: idx + 1,
            name: s?.name || '-',
            code: s?.code || '',
            points: r.points
          };
        })
      };
    }

    return result;
  },

  // ============ تقييمات المدرس ============
  getTeacherEvaluations(filter = {}) {
    return DataService.getTeacherEvaluations(filter);
  },
  async addTeacherEvaluation(data) {
    const eval_ = await DataService.addTeacherEvaluation(data);
    await this.log(data.evaluatedBy || data.teacherId, 'تقييم طالب', `تقييم ${data.type || 'تسميع'} للطالب ${data.studentId}`);
    return eval_;
  },
  async updateTeacherEvaluation(id, updates) {
    return await DataService.updateTeacherEvaluation(id, updates);
  },
  async deleteTeacherEvaluation(id) {
    return await DataService.deleteTeacherEvaluation(id);
  },

  // ============ المواد التفاعلية ============
  getInteractiveMaterials(filter = {}) {
    return DataService.getInteractiveMaterials(filter);
  },
  getInteractiveMaterialsForStudent(studentId) {
    return DataService.getInteractiveMaterialsForStudent(studentId);
  },
  async addInteractiveMaterial(data) {
    const material = await DataService.addInteractiveMaterial(data);
    await this.log(data.createdBy, 'إضافة مادة تفاعلية', `${data.title} (${data.type})`);
    return material;
  },
  async updateInteractiveMaterial(id, updates) {
    return await DataService.updateInteractiveMaterial(id, updates);
  },
  async deleteInteractiveMaterial(id) {
    return await DataService.deleteInteractiveMaterial(id);
  },

  // ============  ملاحظات الطلاب ============
  getStudentNotes(studentId) {
    return DataService.getStudentNotes(studentId);
  },
  async addStudentNote(data) {
    const note = await DataService.addStudentNote(data);
    await this.log(data.teacherId, 'إضافة ملاحظة', `ملاحظة للطالب ${data.studentId}`);
    return note;
  },

  // ============ إحصائيات الأساتذة للأدمن ============
  getTeachersWithStats(teacherIdFilter = null) {
    const d = DataService._getData();
    const teachers = teacherIdFilter
      ? DataService.getTeachers().filter(t => t.id === teacherIdFilter)
      : DataService.getTeachers();

    return teachers.map(teacher => {
      const groups = DataService.getGroupsByTeacher(teacher.id);
      const groupIds = groups.map(g => g.id);

      const studentIds = new Set(
        (d.enrollments || [])
          .filter(e => groupIds.includes(e.groupId) && e.status === 'active')
          .map(e => e.studentId)
      );
      const studentsCount = studentIds.size;

      const homeworkCount = (d.homework || []).filter(hw => groupIds.includes(hw.groupId)).length;
      const examsCount = (d.exams || []).filter(ex => groupIds.includes(ex.groupId)).length;
      const materialsCount = (d.interactiveMaterials || []).filter(im => groupIds.includes(im.groupId)).length;
      const videosCount = (d.videos || []).filter(v => {
        if (v.targetType === 'group') return groupIds.includes(v.targetValue);
        if (v.createdBy === teacher.id) return true;
        return false;
      }).length;

      return {
        teacher,
        photoUrl: teacher.photoUrl || '',
        groupsCount: groups.length,
        studentsCount,
        homeworkCount,
        examsCount,
        materialsCount,
        videosCount,
        groups: groups.map(g => ({
          id: g.id,
          name: g.name,
          day: g.day,
          time: DataService.formatTime(g.time),
          center: g.center,
          studentsCount: (d.enrollments || []).filter(e => e.groupId === g.id && e.status === 'active').length
        }))
      };
    });
  },

  // ============  إحصائيات الطالب المعزولة لكل أستاذ ============
  getStudentStatsByTeacher(studentId) {
    const teachers = DataService.getStudentTeachers(studentId);
    const d = DataService._getData();

    return teachers.map(({ group, teacher, enrollment }) => {
      // الحضور مع الأستاذ ده
      const attendance = (d.attendance || [])
        .filter(a => a.groupId === group.id && a.status === 'approved')
        .flatMap(a => (a.records || []).filter(r => r.studentId === studentId));

      const presentCount = attendance.filter(r => r.status === 'present').length;
      const absentCount = attendance.filter(r => r.status === 'absent').length;
      const lateCount = attendance.filter(r => r.status === 'late').length;

      // الواجبات مع الأستاذ ده
      const homework = (d.homework || []).filter(hw => hw.groupId === group.id);
      const hwIds = homework.map(hw => hw.id);
      const submissions = (d.submissions || []).filter(s =>
        s.studentId === studentId && hwIds.includes(s.homeworkId) && s.status === 'graded'
      );
      const hwAvg = submissions.length
        ? Math.round(submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length)
        : 0;

      // الامتحانات مع الأستاذ ده
      const exams = (d.exams || []).filter(ex => ex.groupId === group.id);
      const exIds = exams.map(ex => ex.id);
      const attempts = (d.examAttempts || []).filter(a =>
        a.studentId === studentId && exIds.includes(a.examId) && (a.status === 'approved' || a.status === 'graded')
      );
      const examAvg = attempts.length
        ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length)
        : 0;

      // التقييمات
      const evaluations = (d.teacherEvaluations || []).filter(e =>
        e.studentId === studentId && e.teacherId === teacher.id
      );

      // المواد التفاعلية
      const materials = (d.interactiveMaterials || []).filter(im => im.groupId === group.id);

      //  نقاط التفاعل
      const interactions = (d.interactionPoints || []).filter(ip =>
        ip.studentId === studentId && ip.groupId === group.id
      );
      const interactionPoints = interactions.reduce((sum, ip) => sum + (ip.points || 0), 0);

      // 🆕 النقاط اليدوية
      const manualPts = (d.manualPoints || []).filter(mp =>
        mp.studentId === studentId && (mp.teacherId === teacher.id || !mp.teacherId)
      );
      const manualPoints = manualPts.reduce((sum, mp) => sum + (mp.points || 0), 0);

      // الفيديوهات
      const videos = (d.videos || []).filter(v => {
        if (v.targetType === 'group') return v.targetValue === group.id;
        if (v.targetType === 'all') return true;
        return v.createdBy === teacher.id;
      });

      // بوستات الحصة
      const classPosts = (d.classPosts || []).filter(cp => cp.groupId === group.id);

      // النقاط الكلية مع الأستاذ ده
      const points = this.getStudentPoints(studentId, teacher.id, 'all');

      // 🆕 الشهرية مع الأستاذ ده
      const billing = this.buildStudentBilling(studentId).find(b => b.group.id === group.id);

      return {
        teacher: {
          id: teacher.id,
          name: teacher.name,
          photoUrl: teacher.photoUrl || '',
          subject: teacher.subject || ''
        },
        group: {
          id: group.id,
          name: group.name,
          day: group.day,
          time: DataService.formatTime(group.time),
          center: group.center,
          whatsappLink: group.whatsappLink || ''
        },
        enrollment,
        stats: {
          attendance: { present: presentCount, absent: absentCount, late: lateCount, total: attendance.length },
          homework: { count: homework.length, submitted: submissions.length, avg: hwAvg, ungraded: homework.length - submissions.length },
          exams: { count: exams.length, attempted: attempts.length, avg: examAvg },
          evaluations: evaluations.length,
          materials: materials.length,
          videos: videos.length,
          classPosts: classPosts.length,
          interactionPoints,
          manualPoints,
          points
        },
        billing: billing ? {
          total: billing.billing.total,
          paid: billing.payment.paidAmount,
          remaining: Math.max(0, billing.billing.total - billing.payment.paidAmount),
          status: billing.payment.status,
          sessions: billing.billing.totalSessions || billing.billing.actualSessions || 0
        } : null,
        recentHomework: homework.slice(-5).map(hw => {
          const sub = submissions.find(s => s.homeworkId === hw.id);
          return { ...hw, submission: sub };
        }),
        recentExams: exams.slice(-3).map(ex => {
          const att = attempts.find(a => a.examId === ex.id);
          return { ...ex, attempt: att };
        }),
        recentMaterials: materials.slice(-5),
        recentClassPosts: classPosts.slice(-3)
      };
    });
  },

  // ============ الإشعارات الكبيرة ============
  getStudentImportantNotifications(studentId) {
    const d = DataService._getData();
    const teachers = DataService.getStudentTeachers(studentId);
    const groupIds = teachers.map(t => t.group.id);
    const teacherMap = {};
    teachers.forEach(t => { teacherMap[t.group.id] = t.teacher; });

    const notifications = [];

    const recentHw = (d.homework || [])
      .filter(hw => groupIds.includes(hw.groupId))
      .filter(hw => {
        const created = new Date(hw.createdAt);
        const daysDiff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 3;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    recentHw.forEach(hw => {
      const submissions = (d.submissions || []).filter(s =>
        s.homeworkId === hw.id && s.studentId === studentId
      );
      if (submissions.length === 0) {
        const teacher = teacherMap[hw.groupId];
        notifications.push({
          type: 'homework',
          title: '📝 واجب جديد',
          message: hw.title,
          teacher: { name: teacher?.name, photoUrl: teacher?.photoUrl || '' },
          groupId: hw.groupId,
          id: hw.id,
          date: hw.createdAt,
          action: 'homework'
        });
      }
    });

    const recentEx = (d.exams || [])
      .filter(ex => groupIds.includes(ex.groupId) && ex.status === 'published')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    recentEx.forEach(ex => {
      const attempts = (d.examAttempts || []).filter(a =>
        a.examId === ex.id && a.studentId === studentId
      );
      if (attempts.length === 0) {
        const teacher = teacherMap[ex.groupId];
        notifications.push({
          type: 'exam',
          title: '📋 امتحان جديد',
          message: ex.title,
          teacher: { name: teacher?.name, photoUrl: teacher?.photoUrl || '' },
          groupId: ex.groupId,
          id: ex.id,
          date: ex.createdAt,
          action: 'exam'
        });
      }
    });

    const recentMat = (d.interactiveMaterials || [])
      .filter(im => groupIds.includes(im.groupId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    recentMat.forEach(mat => {
      const teacher = teacherMap[mat.groupId];
      notifications.push({
        type: 'material',
        title: ' مادة تفاعلية جديدة',
        message: mat.title,
        teacher: { name: teacher?.name, photoUrl: teacher?.photoUrl || '' },
        groupId: mat.groupId,
        id: mat.id,
        date: mat.createdAt,
        action: 'material'
      });
    });

    const announcements = DataService.getAnnouncements()
      .filter(a => !a.groupId || groupIds.includes(a.groupId))
      .slice(0, 3);

    announcements.forEach(ann => {
      const teacher = ann.groupId ? teacherMap[ann.groupId] : null;
      notifications.push({
        type: 'announcement',
        title: '📢 إعلان',
        message: ann.title || ann.message,
        teacher: teacher ? { name: teacher.name, photoUrl: teacher.photoUrl || '' } : null,
        id: ann.id,
        date: ann.createdAt,
        action: 'announcement'
      });
    });

    return notifications.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  },

  // ============ السناتر ============
  getCenters() {
    return DataService.getCenters();
  },
  getActiveCenters() {
    return DataService.getCenters().filter(c => c.isActive);
  },
  async addCenter(data) {
    const center = await DataService.addCenter(data);
    await this.log(data.createdBy, 'إضافة سنتر', data.name);
    return center;
  },
  async updateCenter(id, updates) {
    return await DataService.updateCenter(id, updates);
  },
  async deleteCenter(id) {
    return await DataService.deleteCenter(id);
  },

  // ============ 🆕 إحصائيات الأدمن العامة ============
  getAdminOverviewStats() {
    const d = DataService._getData();
    const teachers = DataService.getTeachers();
    const assistants = DataService.getAssistants();
    const students = DataService.getStudents();
    const groups = DataService.getGroups();
    const centers = DataService.getCenters();

    const currentMonth = new Date().toISOString().slice(0, 7);

    // الحضور هذا الشهر
    const monthAttendance = (d.attendance || []).filter(a =>
      a.status === 'approved' && (a.date || '').startsWith(currentMonth)
    );
    const totalPresent = monthAttendance.reduce((sum, a) =>
      sum + (a.records || []).filter(r => r.status === 'present').length, 0
    );
    const totalAbsent = monthAttendance.reduce((sum, a) =>
      sum + (a.records || []).filter(r => r.status === 'absent').length, 0
    );

    // الواجبات والامتحانات
    const totalHomework = (d.homework || []).length;
    const totalExams = (d.exams || []).length;
    const gradedHw = (d.submissions || []).filter(s => s.status === 'graded').length;
    const gradedEx = (d.examAttempts || []).filter(a => a.status === 'approved' || a.status === 'graded').length;

    // الدفعات
    const monthPayments = (d.payments || []).filter(p => p.month === currentMonth);
    const totalDue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPaid = monthPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const totalRemaining = totalDue - totalPaid;

    // النقاط
    const totalPointsAwarded = {
      attendance: totalPresent * (window.EduFlowConfig?.pointsSystem?.attendance || 1),
      manual: (d.manualPoints || []).reduce((sum, mp) => sum + (mp.points || 0), 0),
      interaction: (d.interactionPoints || []).reduce((sum, ip) => sum + (ip.points || 0), 0)
    };

    return {
      teachers: teachers.length,
      assistants: assistants.length,
      students: students.length,
      groups: groups.length,
      centers: centers.length,
      attendance: {
        present: totalPresent,
        absent: totalAbsent,
        rate: totalPresent + totalAbsent > 0
          ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100)
          : 0
      },
      academic: {
        homework: totalHomework,
        exams: totalExams,
        gradedHw,
        gradedEx
      },
      financial: {
        due: totalDue,
        paid: totalPaid,
        remaining: totalRemaining
      },
      points: totalPointsAwarded
    };
  },

  // ============ 🆕 أفضل الطلاب على مستوى النظام ============
  getTopStudents(limit = 20, period = 'month') {
    const students = DataService.getStudents();
    const withPoints = students.map(s => ({
      student: s,
      points: this.getStudentPoints(s.id, null, period)
    })).sort((a, b) => b.points - a.points);

    return withPoints.slice(0, limit).map((item, idx) => ({
      rank: idx + 1,
      ...item
    }));
  },

  // ============ 🆕 أفضل الأساتذة ============
  getTopTeachers(limit = 10) {
    const teachers = DataService.getTeachers();
    const d = DataService._getData();

    const withStats = teachers.map(t => {
      const groups = DataService.getGroupsByTeacher(t.id);
      const groupIds = groups.map(g => g.id);
      const studentIds = new Set(
        (d.enrollments || [])
          .filter(e => groupIds.includes(e.groupId) && e.status === 'active')
          .map(e => e.studentId)
      );

      return {
        teacher: t,
        groupsCount: groups.length,
        studentsCount: studentIds.size,
        avgAttendance: 0 // يمكن حسابها لاحقاً
      };
    });

    return withStats.sort((a, b) => b.studentsCount - a.studentsCount).slice(0, limit);
  }
};



window.Ops = Ops;