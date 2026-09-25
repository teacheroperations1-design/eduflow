// js/operations-service.js — نسخة مصححة (Cloud-First)
// ✅ إصلاحات: FirebaseService.initialized → connected + إضافة الدوال المفقودة
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

  defaultWhatsAppTemplates() {
    return [
      {
        id: 'tpl_congrats', name: '🎉 تهنئة طالب متفوق', category: 'praise',
        content: 'السلام عليكم {{parentName}}،\n\n🎉 مبروك! ابنك/ابنتك {{studentName}} حقق إنجاز رائع في مادة {{subject}} مع الأستاذ {{teacherName}}.\n\n⭐ النقاط: {{points}}\n📊 الأداء: {{performance}}\n\nنفتخر بيه وبنتمنى له المزيد من التفوق!\n\nمع تحيات,\n{{centerName}}'
      },
      {
        id: 'tpl_absence', name: '️ تنبيه غياب', category: 'warning',
        content: 'السلام عليكم {{parentName}}،\n\nنود إبلاغكم بأن ابنكم/ابنتكم {{studentName}} تغيب عن حصة {{subject}} اليوم مع الأستاذ {{teacherName}}.\n\n📅 التاريخ: {{date}}\n📚 المجموعة: {{groupName}}\n\nنرجو متابعة الأمر، ويمكن تعويض الحصة في موعد لاحق.\n\nمع تحيات,\n{{centerName}}'
      },
      {
        id: 'tpl_payment', name: '💰 تذكير بدفع', category: 'payment',
        content: 'السلام عليكم {{parentName}}،\n\nنذكركم بأن شهرية ابنكم/ابنتكم {{studentName}} عن شهر {{month}} لم تُسدد بعد.\n\n🔄 الحصص المحسوبة: {{cycleDone}} من {{cycleRequired}}\n💰 المبلغ المستحق: {{amount}} جنيه\n⏳ آخر موعد للسداد: {{dueDate}}\n📚 المجموعات: {{groups}}\n\nيمكنكم الدفع عبر:\n• كاش في السنتر\n• فودافون كاش: {{vodafoneNumber}}\n\nشكراً لتعاونكم.\n{{centerName}}'
      },
      {
        id: 'tpl_meeting', name: '🤝 طلب مقابلة', category: 'meeting',
        content: 'السلام عليكم {{parentName}}،\n\nنود دعوتكم لمقابلة مع الأستاذ {{teacherName}} لمناقشة تقدم ابنكم/ابنتكم {{studentName}}.\n\n📅 الموعد المقترح: {{date}}\n🕐 الساعة: {{time}}\n📍 المكان: {{centerName}}\n\nنرجو تأكيد الحضور أو اقتراح موعد بديل.\n\nمع تحيات,\n{{centerName}}'
      },
      {
        id: 'tpl_hw_overdue', name: '📝 واجب متأخر', category: 'homework',
        content: 'السلام عليكم {{parentName}}،\n\nنود إبلاغكم بأن الواجب التالي لابنكم/ابنتكم {{studentName}} لم يُسلّم بعد:\n\n📝 عنوان الواجب: {{hwTitle}}\n📚 المادة: {{subject}}\n👨‍🏫 الأستاذ: {{teacherName}}\n📅 موعد التسليم: {{deadline}}\n\nنرجو المتابعة والتسليم في أقرب وقت.\n\n{{centerName}}'
      },
      {
        id: 'tpl_monthly_report', name: ' تقرير شهري', category: 'report',
        content: 'السلام عليكم {{parentName}}،\n\n📊 التقرير الشهري لابنكم/ابنتكم {{studentName}} عن شهر {{month}}:\n\n{{#each teachers}}\n👨‍🏫 {{teacherName}} ({{groupName}}):\n  • الحضور: {{attendanceRate}}%\n  • متوسط الواجبات: {{hwAvg}}%\n  • متوسط الامتحانات: {{examAvg}}%\n  • النقاط المكتسبة: {{points}}\n{{/each}}\n\nللمزيد من التفاصيل، يرجى زيارة لوحة ولي الأمر.\n\n{{centerName}}'
      },
      {
        id: 'tpl_teacher_report', name: '📈 تقرير أداء أستاذ', category: 'admin',
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
    if (window.FirebaseService?._db) await FirebaseService.saveDoc('whatsappTemplates', template.id || ('tpl_' + Date.now()), d.whatsappTemplates[d.whatsappTemplates.length - 1]);
  },

  async deleteWhatsAppTemplate(id) {
    const d = DataService._getData();
    d.whatsappTemplates = (d.whatsappTemplates || []).filter(t => t.id !== id);
    DataService._saveData(d);
    if (window.FirebaseService?._db) await FirebaseService.deleteDoc('whatsappTemplates', id);
  },

  // ============  SCOPE & ASSIGNMENT ============
  getAssignment(userId) {
    const d = DataService._getData();
    const assignment = d.assignments?.[userId];
    if (assignment) return assignment;
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

  async setAssignment(userId, assignmentData) {
    const d = DataService._getData();
    d.assignments = d.assignments || {};
    d.assignments[userId] = {
      ...assignmentData,
      teacherId: assignmentData.teacherId || assignmentData.teacherIds?.[0] || null,
      assignedAt: new Date().toISOString()
    };
    DataService._saveData(d);
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

  getLevel(userId) {
    const d = DataService._getData();
    const assignment = d.assignments?.[userId];
    if (assignment?.level) return assignment.level;
    const u = DataService.getUserById(userId);
    return u?.assistant?.level || 'primary';
  },

  getScope(userId) {
    const u = DataService.getUserById(userId);
    if (!u) return { teacherIds: [], groupIds: [], centerIds: [] };
    if (u.role === 'super_admin') return null;
    const d = DataService._getData();
    const assignment = d.assignments?.[userId];
    if (assignment) {
      return {
        teacherIds: assignment.teacherId ? [assignment.teacherId] : (assignment.teacherIds || []),
        groupIds: assignment.groupIds || [],
        centerIds: assignment.centerIds || []
      };
    }
    if (u.assistant?.scope) return u.assistant.scope;
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

  getTeachersCascade(userId) {
    return this.teachersInScope(userId).map(t => ({
      id: t.id, name: t.name, photoUrl: t.photoUrl || '',
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
      id: g.id, name: g.name, stage: g.stage, grade: g.grade,
      center: g.center || '', day: g.day,
      time: DataService.formatTime(g.time),
      studentsCount: DataService.getStudentsByGroup(g.id).length,
      monthlyFee: g.monthlyFee || 0
    }));
  },

  // ============ FOLLOW-UPS (مصحح: initialized → connected) ============
  async addFollowUp(f) {
    const d = DataService._getData(); if (!d.followUps) d.followUps = [];
    const id = f.id || 'fu_' + Date.now();
    const item = {
      id, status: 'open', startDate: new Date().toISOString().split('T')[0],
      history: [], createdAt: new Date().toISOString(), ...f
    };
    d.followUps.push(item); DataService._saveData(d);
    if (window.FirebaseService?._db) await FirebaseService.saveDoc('followUps', id, item);
    return item;
  },
  async updateFollowUp(id, updates) {
    const d = DataService._getData();
    const f = (d.followUps || []).find(x => x.id === id);
    if (!f) return;
    Object.assign(f, updates); DataService._saveData(d);
    if (window.FirebaseService?._db) await FirebaseService.saveDoc('followUps', id, f);
  },
  async addFollowUpHistory(id, note, by) {
    const d = DataService._getData();
    const f = (d.followUps || []).find(x => x.id === id);
    if (!f) return;
    f.history = f.history || [];
    f.history.push({ date: new Date().toISOString(), by, note });
    f.lastContact = new Date().toISOString().split('T')[0];
    DataService._saveData(d);
    if (window.FirebaseService?._db) await FirebaseService.saveDoc('followUps', id, f);
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

  async addCommunicationLog(c) {
    const d = DataService._getData(); if (!d.communicationLogs) d.communicationLogs = [];
    const id = 'cl_' + Date.now();
    const item = { id, date: new Date().toISOString(), ...c };
    d.communicationLogs.push(item); DataService._saveData(d);
    if (window.FirebaseService?._db) await FirebaseService.saveDoc('communicationLogs', id, item);
    return item;
  },

  async ensureClassSession(groupId, date, teacherId) {
    const d = DataService._getData(); if (!d.classSessions) d.classSessions = [];
    let s = d.classSessions.find(x => x.groupId === groupId && x.date === date);
    if (!s) {
      s = { id: 'cs_' + groupId + '_' + date, groupId, teacherId, date, status: 'waiting', createdAt: new Date().toISOString() };
      d.classSessions.push(s); DataService._saveData(d);
      if (window.FirebaseService?._db) await FirebaseService.saveDoc('classSessions', s.id, s);
    }
    return s;
  },
  async setClassSessionStatus(id, status, meta = {}) {
    const d = DataService._getData();
    const s = (d.classSessions || []).find(x => x.id === id);
    if (!s) return;
    s.status = status; Object.assign(s, meta); DataService._saveData(d);
    if (window.FirebaseService?._db) await FirebaseService.saveDoc('classSessions', id, s);
  },
  getClassSessionsForDate(date) {
    return (DataService._getData().classSessions || []).filter(x => x.date === date);
  },

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

buildStudentBilling(studentId, month = null) {
  const s = DataService.getUserById(studentId);
  if (!s) return [];
  const teachers = DataService.getStudentTeachers(studentId);
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  return teachers.map(({ group, teacher }) => {
    const billing = DataService.calculateBilling(group.id, targetMonth);
    const cycle = DataService.getCycleStateForStudent(studentId, group.id);
    const pay = (DataService._getData().payments || []).find(p =>
      p.studentId === studentId && p.groupId === group.id && (p.month === targetMonth || p.cycleStart === cycle?.cycleStartDate)
    );
    const manualSessions = (DataService._getData().manualSessions || []).filter(ms =>
      ms.groupId === group.id && ms.studentId === studentId && ms.month === targetMonth
    );
    const manualSessionsCount = manualSessions.reduce((sum, ms) => sum + (ms.sessionsCount || 0), 0);
    return {
      group, teacher,
      billing: { ...billing, manualSessionsCount, totalSessions: (billing.actualSessions || 0) + manualSessionsCount },
      cycle,
      payment: pay || {
        month: targetMonth, groupId: group.id,
        amount: billing.total, paidAmount: 0, status: 'unpaid', history: [],
        cycleStart: cycle?.cycleStartDate
      }
    };
  });
},

  // 🆕 فحص الدورة بعد كل حصة متعملة
async triggerCycleCheck(studentId, groupId, afterSession) {
  try {
    const cycle = DataService.getCycleStateForStudent(studentId, groupId);
    if (!cycle) return null;
    
    const g = DataService.getGroups().find(x => x.id === groupId);
    const student = DataService.getUserById(studentId);
    const teacher = DataService.getUserById(g?.teacherId);
    
    // إنذار عند الحصة 7 (7 من 8)
    if (cycle.sessionsDone === cycle.sessionsRequired - 1) {
      await DataService.addNotification({
        title: '⚠️ تنبيه: الحصة الجاية الدفع',
        message: `وصلت للحصة ${cycle.sessionsDone} من ${cycle.sessionsRequired} في مجموعة ${g?.name || ''}. الحصة القادمة هتكون موعد دفع الشهرية (${g?.monthlyFee || 0} جنيه).`,
        targetUserId: studentId,
        type: 'cycle_warning',
        priority: 'high',
        meta: { groupId, cycleNumber: cycle.sessionsDone }
      });
      
      // إشعار إحصائي للأدمن
      const admins = (DataService.getUsers ? DataService.getUsers() : []).filter(u => u.role === 'super_admin' || u.role === 'admin');
      for (const admin of admins) {
        await DataService.addNotification({
          title: '📊 إنذار دورة',
          message: `${student?.name || 'طالب'} وصل للحصة ${cycle.sessionsDone} في ${g?.name || 'مجموعة'} — الحصة الجاية الدفع`,
          targetUserId: admin.id,
          type: 'cycle_stats',
          priority: 'low'
        });
      }
      
      // إشعار متابعة للمساعد المرتبط
      const assistants = (DataService.getUsers ? DataService.getUsers() : []).filter(u => u.role === 'assistant');
      for (const a of assistants) {
        try {
          const assignment = this.getAssignment(a.id);
          if (assignment && assignment.teacherId === g?.teacherId) {
            await DataService.addNotification({
              title: '⚠️ متابعة دورة',
              message: `${student?.name || 'طالب'} في ${g?.name || 'مجموعة'} وصل للحصة ${cycle.sessionsDone} — تابع معه موعد الدفع`,
              targetUserId: a.id,
              type: 'cycle_followup',
              priority: 'medium',
              meta: { studentId, groupId }
            });
          }
        } catch (e) {}
      }
      
      return { type: 'warning', cycle };
    }
    
    // فاتورة عند الحصة 8
    if (cycle.sessionsDone >= cycle.sessionsRequired) {
      const invoiceId = 'inv_' + Date.now();
      const invoice = {
        id: invoiceId,
        studentId,
        groupId,
        amount: g?.monthlyFee || 0,
        paidAmount: 0,
        status: 'unpaid',
        cycleStart: cycle.cycleStartDate,
        cycleEnd: new Date().toISOString(),
        sessionsDone: cycle.sessionsDone,
        createdAt: new Date().toISOString(),
        history: []
      };
      
      const d = DataService._getData();
      d.payments = d.payments || [];
      d.payments.push(invoice);
      DataService._saveData(d);
      
      if (window.FirebaseService?.connected) {
        await FirebaseService.saveDoc('payments', invoiceId, invoice);
      }
      
      // إشعار للطالب
      await DataService.addNotification({
        title: '💰 فاتورة مستحقة',
        message: `اكتملت دورة ${cycle.sessionsRequired} حصة في مجموعة ${g?.name || ''}. المبلغ المستحق: ${invoice.amount} جنيه. فترة السماح لحد أول حصة في الدورة الجديدة.`,
        targetUserId: studentId,
        type: 'invoice_due',
        priority: 'high',
        meta: { invoiceId, amount: invoice.amount }
      });
      
      // إشعار إحصائي للأدمن
      const admins = (DataService.getUsers ? DataService.getUsers() : []).filter(u => u.role === 'super_admin' || u.role === 'admin');
      for (const admin of admins) {
        await DataService.addNotification({
          title: '💰 فاتورة جديدة',
          message: `${student?.name || 'طالب'} في ${g?.name || 'مجموعة'} — فاتورة ${invoice.amount} جنيه مستحقة`,
          targetUserId: admin.id,
          type: 'invoice_stats',
          priority: 'low'
        });
      }
      
      // إشعار متابعة للمساعد
      const assistants = (DataService.getUsers ? DataService.getUsers() : []).filter(u => u.role === 'assistant');
      for (const a of assistants) {
        try {
          const assignment = this.getAssignment(a.id);
          if (assignment && assignment.teacherId === g?.teacherId) {
            await DataService.addNotification({
              title: '💰 متابعة فاتورة',
              message: `فاتورة مستحقة على ${student?.name || 'طالب'} في ${g?.name || 'مجموعة'} — ${invoice.amount} جنيه`,
              targetUserId: a.id,
              type: 'invoice_followup',
              priority: 'high',
              meta: { invoiceId, studentId, groupId }
            });
          }
        } catch (e) {}
      }
      
      return { type: 'invoice', invoice, cycle };
    }
    
    return null;
  } catch (e) {
    console.error('triggerCycleCheck error:', e);
    return null;
  }
},

async addManualSessionsForBilling(groupId, studentId, month, sessionsCount, reason, addedBy) {
    const d = DataService._getData();
    if (!d.manualSessions) d.manualSessions = [];
    const id = 'ms_' + Date.now();
    const item = {
      id, groupId, studentId, month,
      sessionsCount: parseInt(sessionsCount) || 0,
      reason: reason || 'حصص إضافية',
      addedBy: addedBy || 'system',
      addedAt: new Date().toISOString()
    };
    d.manualSessions.push(item);
    DataService._saveData(d);
    if (window.FirebaseService?._db) await FirebaseService.saveDoc('manualSessions', id, item);
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
    const attendanceRecords = (d.attendance || [])
      .filter(a => a.status === 'approved' && isInPeriod(a.date))
      .filter(a => isTeacherMatch(a.groupId))
      .flatMap(a => (a.records || []).filter(r => r.studentId === studentId && r.status === 'present'));
    const attendancePoints = attendanceRecords.length * (config.attendance || 1);
    const hwSubmissions = (d.submissions || [])
      .filter(s => s.studentId === studentId && isInPeriod(s.submittedAt))
      .filter(s => {
        const hw = (d.homework || []).find(h => h.id === s.homeworkId);
        return hw && isTeacherMatch(hw.groupId);
      })
      .filter(s => s.status === 'graded' && s.score >= (config.passThreshold || 75));
    const hwPoints = hwSubmissions.length * (config.homeworkPass || 1);
    const examAttempts = (d.examAttempts || [])
      .filter(a => a.studentId === studentId && isInPeriod(a.endTime))
      .filter(a => {
        const ex = (d.exams || []).find(e => e.id === a.examId);
        return ex && isTeacherMatch(ex.groupId);
      })
      .filter(a => a.status === 'approved' && a.score >= (config.passThreshold || 75));
    const examPoints = examAttempts.length * (config.examPass || 1);
    const evaluations = (d.teacherEvaluations || [])
      .filter(e => e.studentId === studentId && isInPeriod(e.evaluatedAt))
      .filter(e => !teacherId || e.teacherId === teacherId);
    const evalPoints = evaluations.reduce((sum, e) => sum + (e.points || 0), 0);
    const interactions = (d.interactionPoints || [])
      .filter(ip => ip.studentId === studentId && isInPeriod(ip.awardedAt))
      .filter(ip => !teacherId || ip.teacherId === teacherId || (ip.groupId && isTeacherMatch(ip.groupId)));
    const interactionPoints = interactions.reduce((sum, ip) => sum + (ip.points || 0), 0);
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

  async addManualPoints(studentId, points, reason, awardedBy, teacherId = null) {
    const d = DataService._getData();
    if (!d.manualPoints) d.manualPoints = [];
    const id = 'mp_' + Date.now();
    const item = {
      id, studentId,
      points: parseInt(points) || 0,
      reason: reason || 'نقاط إضافية',
      awardedBy: awardedBy || 'system',
      teacherId: teacherId || null,
      awardedAt: new Date().toISOString()
    };
    d.manualPoints.push(item);
    DataService._saveData(d);
    if (window.FirebaseService?._db) await FirebaseService.saveDoc('manualPoints', id, item);
    const student = DataService.getUserById(studentId);
    await this.log(awardedBy, 'إضافة نقاط يدوية', `${points} نقطة للطالب ${student?.name || studentId} - السبب: ${reason}`);
    await DataService.addNotification({
      title: '🎁 نقاط جديدة!',
      message: `حصلت على ${points} نقطة إضافية. السبب: ${reason}`,
      targetUserId: studentId, type: 'points', priority: 'high'
    });
    return item;
},

// 🆕 حصة طوارئ إضافية (بتتحسب ضمن الـ 8)
// 🆕 فحص الطلاب اللي فاتت فترة السماح عليهم
async runOverdueGraceScan() {
  try {
    const d = this._getData();
    const groups = DataService.getGroups ? DataService.getGroups() : [];
    const students = DataService.getStudents ? DataService.getStudents() : [];
    let overdueCount = 0;
    
    for (const student of students) {
      for (const g of groups) {
        try {
          const cycle = DataService.getCycleStateForStudent(student.id, g.id);
          if (!cycle) continue;
          
          // لو الحالة overdue ومتعملش متابعة من قبل
          if (cycle.isOverdue) {
            const existingFollowUp = (d.followUps || []).find(fu =>
              fu.studentId === student.id &&
              fu.groupId === g.id &&
              fu.type === 'overdue_payment' &&
              fu.status === 'open'
            );
            
            if (!existingFollowUp) {
              await this.addFollowUp({
                studentId: student.id,
                groupId: g.id,
                type: 'overdue_payment',
                priority: 'high',
                title: '💰 فاتورة متأخرة',
                description: `فاتورة دورة ${cycle.sessionsRequired} حصة متأخرة — فترة السماح انتهت`,
                status: 'open',
                ownerAssistant: null
              });
              overdueCount++;
            }
          }
        } catch (e) {}
      }
    }
    
    return { overdueCount };
  } catch (e) {
    console.error('runOverdueGraceScan error:', e);
    return { overdueCount: 0 };
  }
},

async recordEmergencySession(groupId, date, addedBy) {
  try {
    const g = DataService.getGroups().find(x => x.id === groupId);
    if (!g) return { success: false, message: 'المجموعة غير موجودة' };
    
    const month = date.slice(0, 7);
    const students = DataService.getStudentsByGroup(groupId);
    
    // إضافة حصة يدوية لكل طالب في المجموعة
    for (const student of students) {
      await this.addManualSessionsForBilling(
        groupId,
        student.id,
        month,
        1,
        'حصة طوارئ إضافية',
        addedBy
      );
      
      // فحص الدورة بعد الإضافة
      await this.triggerCycleCheck(student.id, groupId, { type: 'emergency', date });
    }
    
    await this.log(addedBy, 'حصة طوارئ', `حصة إضافية لمجموعة ${g.name} بتاريخ ${date}`);
    
    return { success: true, studentsCount: students.length };
  } catch (e) {
    console.error('recordEmergencySession error:', e);
    return { success: false, message: e.message };
  }
},

  async deleteManualPoints(id) {
    const d = DataService._getData();
    d.manualPoints = (d.manualPoints || []).filter(mp => mp.id !== id);
    DataService._saveData(d);
  },

  async addInteractionPoints(studentId, groupId, points, note, awardedBy) {
    const d = DataService._getData();
    if (!d.interactionPoints) d.interactionPoints = [];
    const group = DataService.getGroups().find(g => g.id === groupId);
    const id = 'ip_' + Date.now();
    const item = {
      id, studentId, groupId,
      teacherId: group?.teacherId || null,
      points: parseInt(points) || 0,
      note: note || 'تفاعل في الحصة',
      awardedBy: awardedBy || 'system',
      awardedAt: new Date().toISOString()
    };
    d.interactionPoints.push(item);
    DataService._saveData(d);
    if (window.FirebaseService?._db) await FirebaseService.saveDoc('interactionPoints', id, item);
    const student = DataService.getUserById(studentId);
    await this.log(awardedBy, 'نقاط تفاعل', `${points} نقطة للطالب ${student?.name || studentId} في ${group?.name || ''}`);
    await DataService.addNotification({
      title: '⭐ تفاعل رائع!',
      message: `حصلت على ${points} نقطة تفاعل في حصة ${group?.name || ''}. ${note}`,
      targetUserId: studentId, type: 'points', priority: 'medium'
    });
    return item;
  },

  getGroupRanking(groupId, period = 'all') {
    const students = DataService.getStudentsByGroup(groupId);
    if (!students.length) return { top3: [], studentRank: null };
    const rankings = students.map(s => ({
      student: s, points: this.getStudentPoints(s.id, null, period)
    })).sort((a, b) => b.points - a.points);
    const top3 = rankings.slice(0, 3).map((r, idx) => ({ rank: idx + 1, student: r.student, points: r.points }));
    return { top3, total: rankings.length };
  },

  getGradeRanking(stage, grade, period = 'all') {
    const d = DataService._getData();
    const students = (d.users || []).filter(u =>
      u.role === 'student' && u.stage === stage && u.grade === grade
    );
    if (!students.length) return { top3: [], studentRank: null };
    const rankings = students.map(s => ({
      student: s, points: this.getStudentPoints(s.id, null, period)
    })).sort((a, b) => b.points - a.points);
    const top3 = rankings.slice(0, 3).map((r, idx) => ({ rank: idx + 1, student: r.student, points: r.points }));
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
        studentId: s.id, points: this.getStudentPoints(s.id, teacher.id, period)
      })).sort((a, b) => b.points - a.points);
      const myRank = rankings.findIndex(r => r.studentId === studentId) + 1;
      const myPoints = this.getStudentPoints(studentId, teacher.id, period);
      result[group.id] = {
        groupId: group.id, groupName: group.name,
        teacherId: teacher.id, teacherName: teacher.name,
        teacherPhoto: teacher.photoUrl || '',
        rank: myRank, total: rankings.length, points: myPoints,
        top3: rankings.slice(0, 3).map((r, idx) => {
          const s = DataService.getUserById(r.studentId);
          return { rank: idx + 1, name: s?.name || '-', code: s?.code || '', points: r.points };
        })
      };
    });
    if (student.stage && student.grade) {
      const gradeStudents = (DataService._getData().users || []).filter(u =>
        u.role === 'student' && u.stage === student.stage && u.grade === student.grade
      );
      const gradeRankings = gradeStudents.map(s => ({
        studentId: s.id, points: this.getStudentPoints(s.id, null, period)
      })).sort((a, b) => b.points - a.points);
      const gradeRank = gradeRankings.findIndex(r => r.studentId === studentId) + 1;
      result._grade = {
        stage: student.stage, grade: student.grade,
        rank: gradeRank, total: gradeRankings.length,
        points: this.getStudentPoints(studentId, null, period),
        top3: gradeRankings.slice(0, 3).map((r, idx) => {
          const s = DataService.getUserById(r.studentId);
          return { rank: idx + 1, name: s?.name || '-', code: s?.code || '', points: r.points };
        })
      };
    }
    return result;
  },

  getTeacherEvaluations(filter = {}) { return DataService.getTeacherEvaluations(filter); },
  async addTeacherEvaluation(data) {
    const eval_ = await DataService.addTeacherEvaluation(data);
    await this.log(data.evaluatedBy || data.teacherId, 'تقييم طالب', `تقييم ${data.type || 'تسميع'} للطالب ${data.studentId}`);
    return eval_;
  },
  async updateTeacherEvaluation(id, updates) { return await DataService.updateTeacherEvaluation(id, updates); },
  async deleteTeacherEvaluation(id) { return await DataService.deleteTeacherEvaluation(id); },

  getInteractiveMaterials(filter = {}) { return DataService.getInteractiveMaterials(filter); },
  getInteractiveMaterialsForStudent(studentId) { return DataService.getInteractiveMaterialsForStudent(studentId); },
  async addInteractiveMaterial(data) {
    const material = await DataService.addInteractiveMaterial(data);
    await this.log(data.createdBy, 'إضافة مادة تفاعلية', `${data.title} (${data.type})`);
    return material;
  },
  async updateInteractiveMaterial(id, updates) { return await DataService.updateInteractiveMaterial(id, updates); },
  async deleteInteractiveMaterial(id) { return await DataService.deleteInteractiveMaterial(id); },

  getStudentNotes(studentId) { return DataService.getStudentNotes(studentId); },
  async addStudentNote(data) {
    const note = await DataService.addStudentNote(data);
    await this.log(data.teacherId, 'إضافة ملاحظة', `ملاحظة للطالب ${data.studentId}`);
    return note;
  },

  getTeachersWithStats(teacherIdFilter = null) {
    const d = DataService._getData();
    const teachers = teacherIdFilter
      ? DataService.getTeachers().filter(t => t.id === teacherIdFilter)
      : DataService.getTeachers();
    return teachers.map(teacher => {
      const groups = DataService.getGroupsByTeacher(teacher.id);
      const groupIds = groups.map(g => g.id);
      const studentIds = new Set(
        (d.enrollments || []).filter(e => groupIds.includes(e.groupId) && e.status === 'active').map(e => e.studentId)
      );
      const homeworkCount = (d.homework || []).filter(hw => groupIds.includes(hw.groupId)).length;
      const examsCount = (d.exams || []).filter(ex => groupIds.includes(ex.groupId)).length;
      const materialsCount = (d.interactiveMaterials || []).filter(im => groupIds.includes(im.groupId)).length;
      const videosCount = (d.videos || []).filter(v => {
        if (v.targetType === 'group') return groupIds.includes(v.targetValue);
        if (v.createdBy === teacher.id) return true;
        return false;
      }).length;
      return {
        teacher, photoUrl: teacher.photoUrl || '',
        groupsCount: groups.length, studentsCount: studentIds.size,
        homeworkCount, examsCount, materialsCount, videosCount,
        groups: groups.map(g => ({
          id: g.id, name: g.name, day: g.day,
          time: DataService.formatTime(g.time), center: g.center,
          studentsCount: (d.enrollments || []).filter(e => e.groupId === g.id && e.status === 'active').length
        }))
      };
    });
  },

  getStudentStatsByTeacher(studentId) {
    const teachers = DataService.getStudentTeachers(studentId);
    const d = DataService._getData();
    return teachers.map(({ group, teacher, enrollment }) => {
      const attendance = (d.attendance || [])
        .filter(a => a.groupId === group.id && a.status === 'approved')
        .flatMap(a => (a.records || []).filter(r => r.studentId === studentId));
      const presentCount = attendance.filter(r => r.status === 'present').length;
      const absentCount = attendance.filter(r => r.status === 'absent').length;
      const lateCount = attendance.filter(r => r.status === 'late').length;
      const homework = (d.homework || []).filter(hw => hw.groupId === group.id);
      const hwIds = homework.map(hw => hw.id);
      const submissions = (d.submissions || []).filter(s =>
        s.studentId === studentId && hwIds.includes(s.homeworkId) && s.status === 'graded'
      );
      const hwAvg = submissions.length
        ? Math.round(submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length) : 0;
      const exams = (d.exams || []).filter(ex => ex.groupId === group.id);
      const exIds = exams.map(ex => ex.id);
      const attempts = (d.examAttempts || []).filter(a =>
        a.studentId === studentId && exIds.includes(a.examId) && (a.status === 'approved' || a.status === 'graded')
      );
      const examAvg = attempts.length
        ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length) : 0;
      const evaluations = (d.teacherEvaluations || []).filter(e => e.studentId === studentId && e.teacherId === teacher.id);
      const materials = (d.interactiveMaterials || []).filter(im => im.groupId === group.id);
      const interactions = (d.interactionPoints || []).filter(ip => ip.studentId === studentId && ip.groupId === group.id);
      const interactionPoints = interactions.reduce((sum, ip) => sum + (ip.points || 0), 0);
      const manualPts = (d.manualPoints || []).filter(mp =>
        mp.studentId === studentId && (mp.teacherId === teacher.id || !mp.teacherId)
      );
      const manualPoints = manualPts.reduce((sum, mp) => sum + (mp.points || 0), 0);
      const videos = (d.videos || []).filter(v => {
        if (v.targetType === 'group') return v.targetValue === group.id;
        if (v.targetType === 'all') return true;
        return v.createdBy === teacher.id;
      });
      const classPosts = (d.classPosts || []).filter(cp => cp.groupId === group.id);
      const points = this.getStudentPoints(studentId, teacher.id, 'all');
      const billing = this.buildStudentBilling(studentId).find(b => b.group.id === group.id);
      return {
        teacher: { id: teacher.id, name: teacher.name, photoUrl: teacher.photoUrl || '', subject: teacher.subject || '' },
        group: { id: group.id, name: group.name, day: group.day, time: DataService.formatTime(group.time), center: group.center, whatsappLink: group.whatsappLink || '' },
        enrollment,
        stats: {
          attendance: { present: presentCount, absent: absentCount, late: lateCount, total: attendance.length },
          homework: { count: homework.length, submitted: submissions.length, avg: hwAvg, ungraded: homework.length - submissions.length },
          exams: { count: exams.length, attempted: attempts.length, avg: examAvg },
          evaluations: evaluations.length, materials: materials.length,
          videos: videos.length, classPosts: classPosts.length,
          interactionPoints, manualPoints, points
        },
        billing: billing ? {
          total: billing.billing.total, paid: billing.payment.paidAmount,
          remaining: Math.max(0, billing.billing.total - billing.payment.paidAmount),
          status: billing.payment.status, sessions: billing.billing.totalSessions || billing.billing.actualSessions || 0
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
      const submissions = (d.submissions || []).filter(s => s.homeworkId === hw.id && s.studentId === studentId);
      if (submissions.length === 0) {
        const teacher = teacherMap[hw.groupId];
        notifications.push({
          type: 'homework', title: '📝 واجب جديد', message: hw.title,
          teacher: { name: teacher?.name, photoUrl: teacher?.photoUrl || '' },
          groupId: hw.groupId, id: hw.id, date: hw.createdAt, action: 'homework'
        });
      }
    });
    const recentEx = (d.exams || [])
      .filter(ex => groupIds.includes(ex.groupId) && ex.status === 'published')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    recentEx.forEach(ex => {
      const attempts = (d.examAttempts || []).filter(a => a.examId === ex.id && a.studentId === studentId);
      if (attempts.length === 0) {
        const teacher = teacherMap[ex.groupId];
        notifications.push({
          type: 'exam', title: '📋 امتحان جديد', message: ex.title,
          teacher: { name: teacher?.name, photoUrl: teacher?.photoUrl || '' },
          groupId: ex.groupId, id: ex.id, date: ex.createdAt, action: 'exam'
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
        type: 'material', title: ' مادة تفاعلية جديدة', message: mat.title,
        teacher: { name: teacher?.name, photoUrl: teacher?.photoUrl || '' },
        groupId: mat.groupId, id: mat.id, date: mat.createdAt, action: 'material'
      });
    });
    const announcements = DataService.getAnnouncements()
      .filter(a => !a.groupId || groupIds.includes(a.groupId))
      .slice(0, 3);
    announcements.forEach(ann => {
      const teacher = ann.groupId ? teacherMap[ann.groupId] : null;
      notifications.push({
        type: 'announcement', title: '📢 إعلان', message: ann.title || ann.message,
        teacher: teacher ? { name: teacher.name, photoUrl: teacher.photoUrl || '' } : null,
        id: ann.id, date: ann.createdAt, action: 'announcement'
      });
    });
    return notifications.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  },

  getCenters() { return DataService.getCenters(); },
  getActiveCenters() { return DataService.getCenters().filter(c => c.isActive); },
  async addCenter(data) {
    const center = await DataService.addCenter(data);
    await this.log(data.createdBy, 'إضافة سنتر', data.name);
    return center;
  },
  async updateCenter(id, updates) { return await DataService.updateCenter(id, updates); },
  async deleteCenter(id) { return await DataService.deleteCenter(id); },

  getAdminOverviewStats() {
    const d = DataService._getData();
    const teachers = DataService.getTeachers();
    const assistants = DataService.getAssistants();
    const students = DataService.getStudents();
    const groups = DataService.getGroups();
    const centers = DataService.getCenters();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthAttendance = (d.attendance || []).filter(a =>
      a.status === 'approved' && (a.date || '').startsWith(currentMonth)
    );
    const totalPresent = monthAttendance.reduce((sum, a) =>
      sum + (a.records || []).filter(r => r.status === 'present').length, 0);
    const totalAbsent = monthAttendance.reduce((sum, a) =>
      sum + (a.records || []).filter(r => r.status === 'absent').length, 0);
    const totalHomework = (d.homework || []).length;
    const totalExams = (d.exams || []).length;
    const gradedHw = (d.submissions || []).filter(s => s.status === 'graded').length;
    const gradedEx = (d.examAttempts || []).filter(a => a.status === 'approved' || a.status === 'graded').length;
    const monthPayments = (d.payments || []).filter(p => p.month === currentMonth);
    const totalDue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPaid = monthPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const totalRemaining = totalDue - totalPaid;
    const totalPointsAwarded = {
      attendance: totalPresent * (window.EduFlowConfig?.pointsSystem?.attendance || 1),
      manual: (d.manualPoints || []).reduce((sum, mp) => sum + (mp.points || 0), 0),
      interaction: (d.interactionPoints || []).reduce((sum, ip) => sum + (ip.points || 0), 0)
    };
    return {
      teachers: teachers.length, assistants: assistants.length,
      students: students.length, groups: groups.length, centers: centers.length,
      attendance: {
        present: totalPresent, absent: totalAbsent,
        rate: totalPresent + totalAbsent > 0 ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100) : 0
      },
      academic: { homework: totalHomework, exams: totalExams, gradedHw, gradedEx },
      financial: { due: totalDue, paid: totalPaid, remaining: totalRemaining },
      points: totalPointsAwarded
    };
  },

  getTopStudents(limit = 20, period = 'month') {
    const students = DataService.getStudents();
    const withPoints = students.map(s => ({
      student: s, points: this.getStudentPoints(s.id, null, period)
    })).sort((a, b) => b.points - a.points);
    return withPoints.slice(0, limit).map((item, idx) => ({ rank: idx + 1, ...item }));
  },

  getTopTeachers(limit = 10) {
    const teachers = DataService.getTeachers();
    const d = DataService._getData();
    const withStats = teachers.map(t => {
      const groups = DataService.getGroupsByTeacher(t.id);
      const groupIds = groups.map(g => g.id);
      const studentIds = new Set(
        (d.enrollments || []).filter(e => groupIds.includes(e.groupId) && e.status === 'active').map(e => e.studentId)
      );
      return { teacher: t, groupsCount: groups.length, studentsCount: studentIds.size, avgAttendance: 0 };
    });
    return withStats.sort((a, b) => b.studentsCount - a.studentsCount).slice(0, limit);
  },

  // ============ 🆕 الدوال المفقودة (Branding / Features / Points Rules / Templates) ============

  getBranding() {
    try {
      if (typeof DataService?.getBranding === 'function') return DataService.getBranding() || {};
      const d = DataService._getData();
      return d.branding || {};
    } catch (e) { return {}; }
  },

  async saveBranding(data) {
    try {
      const d = DataService._getData();
      d.branding = { ...data, updatedAt: new Date().toISOString() };
      DataService._saveData(d);
      localStorage.setItem('eduflow_branding', JSON.stringify(d.branding));
      if (window.FirebaseService?._db) await FirebaseService.saveMeta('branding', d.branding);
      return { success: true };
    } catch (e) {
      console.error('saveBranding error:', e);
      return { success: false, message: e.message };
    }
  },

  getFeatures() {
    try {
      if (typeof DataService?.getFeatureFlags === 'function') return DataService.getFeatureFlags() || {};
      const d = DataService._getData();
      return d.features || {};
    } catch (e) { return {}; }
  },

  async saveFeatures(features) {
    try {
      const d = DataService._getData();
      d.features = features;
      DataService._saveData(d);
      localStorage.setItem('eduflow_features', JSON.stringify(features));
      if (window.FirebaseService?._db) await FirebaseService.saveMeta('features', features);
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  },

  getPointsRules() {
    try {
      const d = DataService._getData();
      return d.pointsRules || {
        attendance: 1, homework: 2, exam: 3,
        evaluation: 2, interaction: 1, perfectAttendance: 10
      };
    } catch (e) { return {}; }
  },

  async savePointsRules(rules) {
    try {
      const d = DataService._getData();
      d.pointsRules = { ...rules, updatedAt: new Date().toISOString() };
      DataService._saveData(d);
      if (window.FirebaseService?._db) await FirebaseService.saveMeta('pointsRules', d.pointsRules);
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  },

  getWhatsAppTemplateById(id) {
    try {
      return (DataService._getData().whatsappTemplates || this.defaultWhatsAppTemplates()).find(t => t.id === id) || null;
    } catch (e) { return null; }
  },

  async addWhatsAppTemplate(data) {
    try {
      const d = DataService._getData();
      if (!d.whatsappTemplates) d.whatsappTemplates = [];
      const id = 'tpl_' + Date.now();
      const item = { id, createdAt: new Date().toISOString(), ...data };
      d.whatsappTemplates.push(item);
      DataService._saveData(d);
      if (window.FirebaseService?._db) await FirebaseService.saveDoc('whatsappTemplates', id, item);
      return item;
    } catch (e) { console.error(e); return null; }
  },

  async updateWhatsAppTemplate(id, updates) {
    try {
      const d = DataService._getData();
      const t = (d.whatsappTemplates || []).find(x => x.id === id);
      if (!t) return null;
      Object.assign(t, updates, { updatedAt: new Date().toISOString() });
      DataService._saveData(d);
      if (window.FirebaseService?._db) await FirebaseService.saveDoc('whatsappTemplates', id, t);
      return t;
    } catch (e) { return null; }
  }
};

window.Ops = Ops;
/* ================================================================
   🔥 STREAK ENGINE — محرك السلسلة الحقيقي (حساب + مكافآت + حماية)
   ================================================================ */
/* ============ 🎰 LOOT BOX (صندوق الحظ) ============ */
Ops.getLootSettings = function(){
  const d = DataService._getData();
  const def = { enabled:true, chancePoints:50, chanceHint:25, chanceBonus:10, minPoints:5, maxPoints:20, fromHour:'08:00', toHour:'22:00', dailyLimit:1 };
  return Object.assign({}, def, (d.gamification||{}).loot || {});
};
Ops.lootEligible = function(studentId){
  const s = this.getLootSettings();
  if(!s.enabled) return { ok:false, reason:'disabled' };
  const now = new Date();
  const hm = (now.getHours()<10?'0':'')+now.getHours()+':'+(now.getMinutes()<10?'0':'')+now.getMinutes();
  if(hm < (s.fromHour||'00:00') || hm > (s.toHour||'23:59')) return { ok:false, reason:'time' };
  const d = DataService._getData();
  const today = new Date().toISOString().slice(0,10);
  const hist = (d.lootHistory||[]).filter(h=>h.studentId===studentId && h.day===today);
  if(hist.length >= (s.dailyLimit||1)) return { ok:false, reason:'limit' };
  return { ok:true };
};
Ops.tryLootBox = async function(studentId){
  try{
    const el = this.lootEligible(studentId);
    if(!el.ok) return { success:false, reason:el.reason };
    const s = this.getLootSettings();
    const roll = Math.random()*100;
    let type='nothing', points=0;
    if(roll < (s.chancePoints||0)) type='points';
    else if(roll < (s.chancePoints||0)+(s.chanceHint||0)) type='hint';
    else if(roll < (s.chancePoints||0)+(s.chanceHint||0)+(s.chanceBonus||0)) type='bonus';
    if(type==='points') points = Math.floor(Math.random()*(((s.maxPoints||20)-(s.minPoints||5))+1))+(s.minPoints||5);
    if(type==='bonus') points = (s.maxPoints||20)*2;
    if(points>0) await this.addManualPoints(studentId, points, type==='bonus'?'🎁 جائزة صندوق الحظ الكبرى':'🎰 مكسب صندوق الحظ', studentId);
    const d = DataService._getData(); d.lootHistory = d.lootHistory||[];
    const entry = { id:'loot_'+Date.now(), studentId, day:new Date().toISOString().slice(0,10), at:new Date().toISOString(), type, points };
    d.lootHistory.push(entry); DataService._saveData(d);
    if(window.FirebaseService&&FirebaseService.connected){ try{ await FirebaseService.saveDoc('lootHistory', entry.id, entry); }catch(e){} }
    if(type==='hint'){
      await DataService.addNotification({ title:'💡 تلميح مجاني', message:'كسبت تلميح من صندوق الحظ — استخدمه في آخر واجب ليك.', targetUserId:studentId, type:'loot', priority:'medium' });
    }
    return { success:true, type, points };
  }catch(e){ console.error('tryLootBox', e); return { success:false, reason:'error' }; }
};
/* ============ 💬 تذكير الدفع مربوط بالدورة ============ */
Ops.buildPaymentReminder = function(studentId, groupId){
  try{
    const s = DataService.getUserById(studentId);
    const g = (DataService.getGroups?DataService.getGroups():[]).find(x=>x.id===groupId);
    const c = (typeof DataService.getCycleStateForStudent==='function')?DataService.getCycleStateForStudent(studentId,groupId):null;
    const b = (typeof this.getBranding==='function')?this.getBranding():{};
    const lines = [];
    lines.push('السلام عليكم،');
    lines.push('');
    lines.push('نذكركم بأن شهرية '+(s?s.name:'الطالب')+' في مجموعة '+(g?g.name:'')+' مستحقة الآن.');
    if(c){ lines.push('🔄 الحصص المحسوبة: '+c.sessionsDone+' من '+c.sessionsRequired); }
    lines.push('💰 المبلغ المستحق: '+((g&&g.monthlyFee)||0)+' جنيه');
    if(c&&c.graceEndDate){ lines.push('⏳ آخر موعد للسداد: '+new Date(c.graceEndDate).toLocaleDateString('ar-EG')); }
    lines.push('');
    lines.push('يمكنكم الدفع كاش في السنتر أو فودافون كاش: '+((b&&b.supportPhone)||''));
    lines.push('شكراً لتعاونكم 🌹');
    return lines.join('\n');
  }catch(e){ return 'تذكير بدفع الشهرية'; }
};
Ops.openPaymentReminderWa = function(studentId, groupId){
  try{
    const s = DataService.getUserById(studentId);
    const phone = String((s&&(s.parentPhone||s.phone))||'').replace(/\D/g,'');
    if(!phone){ if(window.safeToast) window.safeToast('لا يوجد رقم ولي أمر','error'); return; }
    const msg = this.buildPaymentReminder(studentId, groupId);
    window.open('https://wa.me/2'+phone+'?text='+encodeURIComponent(msg),'_blank');
  }catch(e){ console.error(e); }
};
Ops.getStreakSettings = function(){
  const d = DataService._getData();
  const def = window.DEFAULT_GAMIFICATION?.streak || {enabled:true, freezeCost:20, milestoneEvery:7, milestoneBonus:50};
  return Object.assign({}, def, (d.gamification||{}).streak || {});
};

Ops.getStudentStreak = function(studentId){
  const st = this.getStreakSettings();
  if(!st.enabled) return {enabled:false, current:0, longest:0, lastDate:null, freezes:0};
  const d = DataService._getData();
  const teachers = DataService.getStudentTeachers(studentId);
  const gids = teachers.map(t=>t.group.id);
  const groups = DataService.getGroups().filter(g=>gids.includes(g.id));
  const EN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  const attended = new Set(), missed = new Set();
  (DataService.getAttendance()||[]).filter(a=>a.status==='approved' && gids.includes(a.groupId)).forEach(a=>{
    const rec=(a.records||[]).find(r=>r.studentId===studentId);
    if(!rec) return;
    if(rec.status==='present') attended.add(a.date);
    else if(rec.status==='absent') missed.add(a.date);
  });

  // أيام الحصص المقررة خلال آخر 120 يوم (من الأحدث للأقدم)
  const today=new Date(); today.setHours(0,0,0,0);
  const days=[];
  for(let i=0;i<120;i++){
    const dt=new Date(today); dt.setDate(dt.getDate()-i);
    const ds=dt.toISOString().split('T')[0];
    const dayEn=EN[dt.getDay()];
    const hasClass=groups.some(g=>{
      const schs=(g.schedules&&g.schedules.length)?g.schedules:[{day:g.day}];
      return schs.some(s=>s.day===dayEn);
    });
    if(hasClass) days.push(ds);
  }

  // السلسلة الحالية: من الأحدث للأقدم + استهلاك التجميد عند الغياب
  let freezesLeft=(d.streakFreezes||{})[studentId]||0;
  let run=0, lastDate=null;
  for(const ds of days){
    if(attended.has(ds)){ run++; if(!lastDate) lastDate=ds; continue; }
    if(missed.has(ds)){
      if(freezesLeft>0){ freezesLeft--; continue; } // يوم مكسور بس محمي بالتجميد
      break;
    }
    // يوم لسه ملوش رصد (حصة النهارده مثلًا) → نتجاهله
  }
  const current=run;

  // أطول سلسلة تاريخيًا
  let best=0, cur=0;
  for(let i=days.length-1;i>=0;i--){
    const ds=days[i];
    if(attended.has(ds)){ cur++; if(cur>best) best=cur; }
    else if(missed.has(ds)){ cur=0; }
  }

  return {enabled:true, current, longest:best, lastDate, freezes:(d.streakFreezes||{})[studentId]||0};
};

// بيستدعى تلقائيًا عند اعتماد الحضور → بيدي مكافأة الميلستون مرة واحدة لكل محطة
Ops.touchStreak = async function(studentId, byId){
  try{
    const st=this.getStreakSettings();
    if(!st.enabled || !st.milestoneEvery) return null;
    const s=this.getStudentStreak(studentId);
    if(!s.current) return s;
    const d=DataService._getData();
    d.streakMilestones=d.streakMilestones||{};
    const achieved=d.streakMilestones[studentId]||[];
    if(s.current % st.milestoneEvery === 0 && !achieved.includes(s.current)){
      achieved.push(s.current);
      d.streakMilestones[studentId]=achieved;
      DataService._saveData(d);
      if(window.FirebaseService?.connected) await FirebaseService.saveMeta('streakMilestones', d.streakMilestones);
      await this.addManualPoints(studentId, st.milestoneBonus, `🔥 مكافأة سلسلة ${s.current} يوم حضور`, byId||'system');
      await DataService.addNotification({
        title:'🔥 سلسلة إنجاز جديدة!',
        message:`وصلت لسلسلة ${s.current} يوم حضور متتالي — حصلت على ${st.milestoneBonus} نقطة مكافأة 🎉`,
        targetUserId:studentId, type:'streak', priority:'high'
      });
      return {milestone:s.current, bonus:st.milestoneBonus};
    }
    return s;
  }catch(e){ console.error('touchStreak',e); return null; }
};

// حماية الشعلة: شراء تجميد (غياب واحد بدون كسر السلسلة)
Ops.buyStreakFreeze = async function(studentId){
  const d=DataService._getData();
  d.streakFreezes=d.streakFreezes||{};
  d.streakFreezes[studentId]=(d.streakFreezes[studentId]||0)+1;
  DataService._saveData(d);
  if(window.FirebaseService?.connected) await FirebaseService.saveMeta('streakFreezes', d.streakFreezes);
  return d.streakFreezes[studentId];
};

Ops.getStreakLeaderboard = function(limit){
  return DataService.getStudents().map(s=>({student:s, streak:this.getStudentStreak(s.id)}))
    .filter(x=>x.streak.current>0)
    .sort((a,b)=>b.streak.current-a.streak.current)
    .slice(0, limit||10);
};

console.log('✅ Ops Service loaded with all methods');