// js/operations-service.js — طبقة العمليات
const Ops = {
  COLLECTIONS: ['followUps','communicationLogs','classSessions','automations','automationLogs'],

  async init() {
    const d = DataService._getData();
    this.COLLECTIONS.forEach(c => { if(!d[c]) d[c] = []; });
    if (!d.automations?.length) d.automations = this.defaultAutomations();
    this.migrateAssistants(d);
    DataService._saveData(d);
  },

  migrateAssistants(d) {
    (d.users||[]).filter(u => u.role==='assistant').forEach(a => {
      if (!a.assistant) {
        a.assistant = { level:'primary', scope:{ teacherIds:a.assignedTeacherIds||[], groupIds:[], branchIds:[] } };
      }
    });
  },

  defaultAutomations() {
    return [
      { id:'auto_absent', name:'غياب متكرر → متابعة', trigger:'student_absent_repeat', action:'create_followup', enabled:true, threshold:2 },
      { id:'auto_hw', name:'واجب متأخر → تذكير', trigger:'homework_overdue', action:'create_reminder', enabled:true },
      { id:'auto_pay', name:'دفعة متأخرة → متابعة دفع', trigger:'payment_overdue', action:'create_payment_followup', enabled:true },
      { id:'auto_att', name:'حضور مُرسل → إشعار للمساعد', trigger:'attendance_submitted', action:'notify_assistant', enabled:true },
      { id:'auto_cancel', name:'حصة ملغاة → إشعار الطلاب', trigger:'session_cancelled', action:'notify_students', enabled:true }
    ];
  },

  // ============ SCOPE ============
  getScope(userId) {
    const u = DataService.getUserById(userId);
    if (!u) return { teacherIds:[], groupIds:[], branchIds:[] };
    if (u.role === 'super_admin') return null;
    const a = u.assistant || { scope:{ teacherIds:u.assignedTeacherIds||[], groupIds:[], branchIds:[] } };
    return a.scope || { teacherIds:[], groupIds:[], branchIds:[] };
  },
  getLevel(userId) {
    const u = DataService.getUserById(userId);
    return (u?.assistant?.level) || 'primary';
  },
  async setAssignment(userId, { level, teacherIds, groupIds, branchIds }) {
    const u = DataService.getUserById(userId);
    if (!u) return { success:false };
    u.assistant = { level:level||'primary', scope:{ teacherIds:teacherIds||[], groupIds:groupIds||[], branchIds:branchIds||[] } };
    u.assignedTeacherIds = teacherIds || [];
    await DataService.updateUser(userId, { assistant:u.assistant, assignedTeacherIds:u.assignedTeacherIds });
    return { success:true };
  },
  teachersInScope(userId) {
    const scope = this.getScope(userId);
    if (!scope) return DataService.getTeachers();
    return DataService.getTeachers().filter(t => scope.teacherIds.includes(t.id));
  },
  groupsInScope(userId) {
    const scope = this.getScope(userId);
    if (!scope) return DataService.getGroups();
    return DataService.getGroups().filter(g => scope.groupIds.includes(g.id) || scope.teacherIds.includes(g.teacherId));
  },
  studentsInScope(userId) {
    const gids = this.groupsInScope(userId).map(g => g.id);
    return DataService.getStudents().filter(s => gids.includes(s.groupId));
  },
  inScope(userId, { teacherId, groupId }={}) {
    const scope = this.getScope(userId);
    if (!scope) return true;
    if (teacherId && scope.teacherIds.includes(teacherId)) return true;
    if (groupId) {
      const g = DataService.getGroups().find(x => x.id === groupId);
      if (scope.groupIds.includes(groupId) || (g && scope.teacherIds.includes(g.teacherId))) return true;
    }
    return false;
  },

  async log(userId, action, target) {
    const u = DataService.getUserById(userId);
    await DataService.logActivity(userId, u?.name||'-', action, target);
  },

  // ============ FOLLOW-UPS ============
  async addFollowUp(f) {
    const d = DataService._getData(); if (!d.followUps) d.followUps = [];
    const id = f.id || 'fu_' + Date.now();
    const item = {
      id, status:'open', startDate:new Date().toISOString().split('T')[0],
      history:[], createdAt:new Date().toISOString(), ...f
    };
    d.followUps.push(item); DataService._saveData(d);
    if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('followUps', id, item);
    return item;
  },
  async updateFollowUp(id, updates) {
    const d = DataService._getData();
    const f = (d.followUps||[]).find(x => x.id === id);
    if (!f) return;
    Object.assign(f, updates); DataService._saveData(d);
    if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('followUps', id, f);
  },
  async addFollowUpHistory(id, note, by) {
    const d = DataService._getData();
    const f = (d.followUps||[]).find(x => x.id === id);
    if (!f) return;
    f.history = f.history || [];
    f.history.push({ date:new Date().toISOString(), by, note });
    f.lastContact = new Date().toISOString().split('T')[0];
    DataService._saveData(d);
    if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('followUps', id, f);
  },
  getFollowUps(filter={}) {
    let r = DataService._getData().followUps || [];
    if (filter.status) r = r.filter(x => x.status === filter.status);
    if (filter.studentId) r = r.filter(x => x.studentId === filter.studentId);
    if (filter.ownerAssistant) r = r.filter(x => x.ownerAssistant === filter.ownerAssistant);
    return r;
  },

  // ============ COMMUNICATION ============
  async addCommunicationLog(c) {
    const d = DataService._getData(); if (!d.communicationLogs) d.communicationLogs = [];
    const id = 'cl_' + Date.now();
    const item = { id, date:new Date().toISOString(), ...c };
    d.communicationLogs.push(item); DataService._saveData(d);
    if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('communicationLogs', id, item);
    return item;
  },

  // ============ CLASS SESSIONS ============
  async ensureClassSession(groupId, date, teacherId) {
    const d = DataService._getData(); if (!d.classSessions) d.classSessions = [];
    let s = d.classSessions.find(x => x.groupId===groupId && x.date===date);
    if (!s) {
      s = { id:'cs_'+groupId+'_'+date, groupId, teacherId, date, status:'waiting', createdAt:new Date().toISOString() };
      d.classSessions.push(s); DataService._saveData(d);
      if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('classSessions', s.id, s);
    }
    return s;
  },
  async setClassSessionStatus(id, status, meta={}) {
    const d = DataService._getData();
    const s = (d.classSessions||[]).find(x => x.id === id);
    if (!s) return;
    s.status = status; Object.assign(s, meta); DataService._saveData(d);
    if (window.FirebaseService?.initialized) await FirebaseService.saveDoc('classSessions', id, s);
  },
  getClassSessionsForDate(date) { return (DataService._getData().classSessions||[]).filter(x => x.date === date); },

  // ============ AUTOMATION ============
  async runAutomations(context={}) {
    const d = DataService._getData();
    const rules = (d.automations||[]).filter(r => r.enabled);
    for (const rule of rules) {
      if (rule.trigger==='attendance_submitted' && context.type==='attendance_submitted') {
        const att = (d.attendance||[]).find(a => a.id === context.attendanceId);
        if (att) {
          const assistants = (d.users||[]).filter(u => u.role==='assistant' && this.inScope(u.id, { groupId:att.groupId }));
          for (const a of assistants) {
            await DataService.addNotification({ title:'حضور جديد يحتاج مراجعة', message:`${att.groupName} بانتظار اعتمادك`, targetUserId:a.id, priority:'high', type:'attendance' });
          }
        }
      }
    }
  },

  // ============ DAILY BRIEFING ============
  buildDailyBriefing(userId) {
    const d = DataService._getData();
    const today = new Date().toISOString().split('T')[0];
    const day = new Date().toLocaleDateString('en-US',{weekday:'long'});
    const groups = this.groupsInScope(userId);
    const gids = groups.map(g => g.id);
    const classesToday = groups.filter(g => g.day === day);
    const pendingAtt = (d.attendance||[]).filter(a => a.status==='pending' && gids.includes(a.groupId)).length;
    const openFu = this.getFollowUps({ownerAssistant:userId}).filter(f => f.status!=='resolved').length;
    const myTasks = (d.tasks||[]).filter(t => t.assignedTo===userId && t.status!=='completed').length;
    const overduePayments = (d.payments||[]).filter(p => p.status!=='paid' && this.studentsInScope(userId).some(s => s.id===p.studentId)).length;
    return {
      date: today, classesCount:classesToday.length, classesToday,
      pendingAttendance:pendingAtt, openFollowUps:openFu,
      tasks:myTasks, overdueTasks:myTasks, overduePayments,
      summary:`لديك اليوم ${classesToday.length} حصة، ${pendingAtt} حضور يحتاج مراجعة، ${openFu} متابعة مفتوحة، ${overduePayments} دفعة متأخرة.`
    };
  },

  buildEndOfDayReport(userId, date) {
    const d = DataService._getData();
    const groups = this.groupsInScope(userId);
    const gids = groups.map(g => g.id);
    const sessions = (d.classSessions||[]).filter(s => gids.includes(s.groupId) && s.date===date);
    const att = (d.attendance||[]).filter(a => a.date===date && gids.includes(a.groupId));
    const absentees = att.flatMap(a => a.records.filter(r => r.status==='absent').map(r => ({ group:a.groupName, student:DataService.getUserById(r.studentId)?.name })));
    return { date, sessions, attendance:att, absentees };
  },

  buildWorkload() {
    return DataService.getAssistants().map(a => {
      const scope = this.getScope(a.id);
      const tasks = (DataService._getData().tasks||[]).filter(t => t.assignedTo===a.id);
      return {
        assistant:a, level:this.getLevel(a.id),
        teachers:(scope?.teacherIds||[]).length,
        groups:this.groupsInScope(a.id).length,
        openTasks:tasks.filter(t => t.status!=='completed').length,
        followUps:this.getFollowUps({ownerAssistant:a.id}).filter(f => f.status!=='resolved').length
      };
    });
  },

  // ============ BILLING ============
  buildStudentBilling(studentId) {
    const d = DataService._getData();
    const s = DataService.getUserById(studentId);
    if (!s) return [];
    const groups = DataService.getStudentTeachers(studentId).map(x => x.group).filter(Boolean);
    const currentMonth = new Date().toISOString().slice(0,7);
    return groups.map(g => {
      const billing = DataService.calculateBilling(g.id, currentMonth);
      const pay = (d.payments||[]).find(p => p.studentId===studentId && p.month===currentMonth);
      return {
        group: g,
        billing,
        payment: pay || { month:currentMonth, amount:billing.total, paidAmount:0, status:'unpaid', history:[] }
      };
    });
  },

  globalSearch(q) {
    if (!q || q.length < 2) return [];
    const s = q.toLowerCase();
    const d = DataService._getData();
    const res = [];
    (d.users||[]).forEach(u => {
      if ((u.name||'').toLowerCase().includes(s) || (u.code||'').toLowerCase().includes(s)) {
        res.push({ type:u.role, id:u.id, label:u.name, sub:u.code||u.role });
      }
    });
    (d.groups||[]).forEach(g => { if ((g.name||'').toLowerCase().includes(s)) res.push({ type:'group', id:g.id, label:g.name, sub:'مجموعة' }); });
    return res.slice(0, 30);
  }
};

window.Ops = Ops;