// js/data-service.js — طبقة البيانات الموحدة (Local + Firebase) + تحسينات السرعة والميزات الجديدة
const DataService = {
  useFirebase:false,
  _cache:null, // ⚡ كاش ذاكري لتسريع القراءة (بدل JSON.parse في كل نداء)

  // ✅ التهيئة: Firebase في الخلفية بدون حجب العرض
  async init(){
    this.useFirebase = !!(window.EduFlowConfig && window.EduFlowConfig.useFirebase);
    this._cache=null;
    if(window.FirebaseService){
      await FirebaseService.init();
      if(FirebaseService.connected){
        await FirebaseService.loadAll();
        this._cache=null; // إعادة قراءة بعد المزامنة
        FirebaseService.startListeners();
      }
    }
  },

  // ⚡ قراءة مع كاش + حماية من JSON تالف
  _getData(){
    if(this._cache) return this._cache;
    let d={};
    try{ d=JSON.parse(localStorage.getItem('eduflow_db')||'{}'); }catch(e){ d={}; }
    this._cache=d;
    return d;
  },
  _saveData(d){
    this._cache=d;
    try{ localStorage.setItem('eduflow_db',JSON.stringify(d)); }catch(e){ console.warn('localStorage save failed',e); }
  },
  invalidateCache(){ this._cache=null; },

  // ===== الوقت =====
  formatTime12(t){
    if(!t)return '';
    const [h,m]=String(t).split(':').map(Number);
    let h12=h%12; if(h12===0)h12=12;
    return `${h12}:${String(m).padStart(2,'0')} ${h<12?'ص':'م'}`;
  },
  formatTime(t){ return (window.EduFlowConfig?.timeFormat==='12h')?this.formatTime12(t):t; },

  // 📅 بداية الأسبوع (السبت) — مستخدمة في ليدربورد الأسبوع
  getWeekStart(){
    const now=new Date();
    const diff=(now.getDay()+1)%7; // السبت=0، الأحد=1، ...
    const start=new Date(now);
    start.setHours(0,0,0,0);
    start.setDate(start.getDate()-diff);
    return start;
  },

  // ===== AUTH =====
  authenticate(email,password){
    const d=this._getData();
    return (d.users||[]).find(u=>(u.email||'').toLowerCase()===String(email).toLowerCase()&&u.password===password)||null;
  },
  findStudentByCode(code){
    const d=this._getData();
    return (d.users||[]).find(u=>u.role==='student'&&(u.code||'').toUpperCase()===String(code).toUpperCase())||null;
  },

  // 🔐 دخول ذكي: إيميل / كود طالب / هاتف الطالب / هاتف ولي الأمر
  findUserByIdentifier(idf){
    const v=String(idf||'').trim().toLowerCase();
    if(!v)return null;
    const digits=v.replace(/\D/g,'');
    return (this._getData().users||[]).find(u=>{
      if((u.email||'').toLowerCase()===v)return true;
      if((u.code||'').toLowerCase()===v)return true;
      if(digits&&digits.length>=6){
        if((u.phone||'').replace(/\D/g,'')===digits)return true;
        if((u.parentPhone||'').replace(/\D/g,'')===digits)return true;
      }
      return false;
    })||null;
  },
  authenticateSmart(identifier,password){
    const u=this.findUserByIdentifier(identifier);
    if(u&&String(u.password)===String(password))return u;
    return null;
  },
  async changePassword(userId,oldPass,newPass){
    const u=this.getUserById(userId);
    if(!u)return{success:false,message:'المستخدم غير موجود'};
    if(String(u.password)!==String(oldPass))return{success:false,message:'كلمة المرور الحالية غير صحيحة'};
    if(!newPass||String(newPass).length<4)return{success:false,message:'كلمة المرور الجديدة لازم تكون 4 أحرف على الأقل'};
    await this.updateUser(userId,{password:String(newPass)});
    return{success:true};
  },

  // ===== USERS =====
  getUsers(){ return this._getData().users||[]; },
  getUserById(id){ return (this._getData().users||[]).find(u=>u.id===id)||null; },
  getStudents(){ return (this._getData().users||[]).filter(u=>u.role==='student'); },
  getTeachers(){ return (this._getData().users||[]).filter(u=>u.role==='teacher'); },
  getAssistants(){ return (this._getData().users||[]).filter(u=>u.role==='assistant'); },

  async addUser(data){
    const d=this._getData(); if(!d.users)d.users=[];
    const id=data.id||('u_'+Date.now()+'_'+Math.random().toString(36).slice(2,6));
    const user={id,createdAt:new Date().toISOString(),...data};
    d.users.push(user); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('users',id,user);
    return user;
  },
  async updateUser(id,updates){
    const d=this._getData();
    const u=(d.users||[]).find(x=>x.id===id); if(!u)return null;
    Object.assign(u,updates,{updatedAt:new Date().toISOString()});
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('users',id,u);
    return u;
  },
  async deleteUser(id){
    const d=this._getData();
    d.users=(d.users||[]).filter(u=>u.id!==id);
    d.enrollments=(d.enrollments||[]).filter(e=>e.studentId!==id);
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.deleteDoc('users',id);
  },

  // 🔑 الباسورد الافتراضي للطلاب 1234 (يتغير من الصفحة الشخصية لاحقاً)
  async addStudentByAdmin(data){
    const code='EDU-'+Math.floor(1000+Math.random()*9000);
    const studentId='STU-'+Date.now().toString().slice(-4);
    const user=await this.addUser({
      password:'1234', ...data, role:'student', code, studentId, status:'active',
      parentAccess:data.parentAccess||String(Math.floor(1000+Math.random()*9000))
    });
    if(data.enrollments&&data.enrollments.length){
      for(const enr of data.enrollments){ await this.addEnrollment({studentId:user.id,groupId:enr.groupId,teacherId:data.teacherId}); }
    }
    return user;
  },

  // ===== GROUPS =====
  getGroups(){ return this._getData().groups||[]; },
  getGroupsByTeacher(tid){ return this.getGroups().filter(g=>g.teacherId===tid); },
  getStudentsByGroup(gid){
    const d=this._getData();
    const enrolled=(d.enrollments||[]).filter(e=>e.groupId===gid&&e.status==='active').map(e=>e.studentId);
    return this.getStudents().filter(s=>enrolled.includes(s.id)||s.groupId===gid);
  },
  // 📱 رابط واتساب المجموعة بيتحفظ هنا ضمن بيانات المجموعة (whatsappLink)
  async addGroup(data){
    const d=this._getData(); if(!d.groups)d.groups=[];
    const id='g_'+Date.now();
    const g={id,createdAt:new Date().toISOString(),sessionFee:0,monthlyFee:0,sessionsPerMonth:(window.EduFlowConfig?.billing?.defaultSessionsPerMonth||4),whatsappLink:'',...data};
    if(g.monthlyFee&&!g.sessionFee)g.sessionFee=Math.round(g.monthlyFee/g.sessionsPerMonth);
    if(g.sessionFee&&!g.monthlyFee)g.monthlyFee=g.sessionFee*g.sessionsPerMonth;
    d.groups.push(g); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('groups',id,g);
    return g;
  },
  async updateGroup(id,updates){
    const d=this._getData();
    const g=(d.groups||[]).find(x=>x.id===id); if(!g)return null;
    Object.assign(g,updates);
    if(updates.monthlyFee!==undefined||updates.sessionsPerMonth!==undefined){
      if(g.monthlyFee&&g.sessionsPerMonth)g.sessionFee=Math.round(g.monthlyFee/g.sessionsPerMonth);
    }
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('groups',id,g);
    return g;
  },
  async deleteGroup(id){
    const d=this._getData();
    d.groups=(d.groups||[]).filter(g=>g.id!==id);
    d.enrollments=(d.enrollments||[]).filter(e=>e.groupId!==id);
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.deleteDoc('groups',id);
  },

  // ===== ENROLLMENTS =====
  async addEnrollment(data){
    const d=this._getData(); if(!d.enrollments)d.enrollments=[];
    const id='enr_'+Date.now()+'_'+Math.random().toString(36).slice(2,5);
    const enr={id,status:'active',enrolledAt:new Date().toISOString(),...data};
    d.enrollments.push(enr); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('enrollments',id,enr);
    return enr;
  },
  getStudentTeachers(sid){
    const d=this._getData();
    const enrs=(d.enrollments||[]).filter(e=>e.studentId===sid&&e.status==='active');
    return enrs.map(e=>({
      enrollment:e,
      group:(d.groups||[]).find(g=>g.id===e.groupId),
      teacher:(d.users||[]).find(u=>u.id===e.teacherId)
    })).filter(x=>x.group&&x.teacher);
  },

  // ===== ATTENDANCE =====
  getAttendance(){ return this._getData().attendance||[]; },
  async submitAttendance(data){
    const d=this._getData(); if(!d.attendance)d.attendance=[];
    const id='att_'+Date.now();
    const att={id,date:new Date().toISOString().split('T')[0],status:'pending',...data};
    d.attendance.push(att); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('attendance',id,att);
    return att;
  },
  async approveAttendance(id,by){
    const d=this._getData();
    const a=(d.attendance||[]).find(x=>x.id===id); if(!a)return;
    a.status='approved'; a.approvedBy=by; a.approvedAt=new Date().toISOString();
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('attendance',id,a);
  },

  // ===== CANCELLED SESSIONS =====
  getCancelledSessions(){ return this._getData().cancelledSessions||[]; },
  async cancelSession(groupId,date,reason,cancelledBy){
    const d=this._getData(); if(!d.cancelledSessions)d.cancelledSessions=[];
    if(d.cancelledSessions.some(c=>c.groupId===groupId&&c.date===date))return{success:false,message:'الحصة ملغية بالفعل'};
    const id='cs_'+Date.now();
    const c={id,groupId,date,reason,cancelledBy,cancelledAt:new Date().toISOString()};
    d.cancelledSessions.push(c);
    d.attendance=(d.attendance||[]).filter(a=>!(a.groupId===groupId&&a.date===date));
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('cancelledSessions',id,c);
    return{success:true,cancellation:c};
  },
  isSessionCancelled(groupId,date){ return (this._getData().cancelledSessions||[]).some(c=>c.groupId===groupId&&c.date===date); },

  // ===== ATTENDANCE CODES =====
  generateAttendanceCode(groupId){
    const d=this._getData(); if(!d.attendanceCodes)d.attendanceCodes=[];
    const code='ATT-'+Math.random().toString(36).slice(2,6).toUpperCase();
    const item={code,groupId,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+(window.EduFlowConfig?.settings?.qrSessionDuration||7200000)).toISOString(),active:true};
    d.attendanceCodes.push(item); this._saveData(d);
    if(window.FirebaseService?.connected) FirebaseService.saveDoc('attendanceCodes',code,item);
    return item;
  },
  checkInByCode(studentId,code){
    const d=this._getData();
    const c=(d.attendanceCodes||[]).find(x=>x.code.toUpperCase()===String(code).toUpperCase()&&x.active);
    if(!c)return{success:false,message:'الكود غير صالح'};
    if(new Date(c.expiresAt)<new Date())return{success:false,message:'الكود منتهي'};
    if(!this.getStudentsByGroup(c.groupId).some(s=>s.id===studentId))return{success:false,message:'لست في هذه المجموعة'};
    if(!c.checkIns)c.checkIns=[];
    if(c.checkIns.some(x=>x.studentId===studentId))return{success:false,message:'سجّلت حضورك بالفعل'};
    c.checkIns.push({studentId,at:new Date().toISOString()});
    this._saveData(d);
    if(window.FirebaseService?.connected) FirebaseService.saveDoc('attendanceCodes',c.code,c);
    return{success:true,groupId:c.groupId,groupName:this.getGroups().find(g=>g.id===c.groupId)?.name};
  },
  getActiveAttendanceCodes(groupId){
    const now=new Date();
    return (this._getData().attendanceCodes||[]).filter(c=>(!groupId||c.groupId===groupId)&&c.active&&new Date(c.expiresAt)>now);
  },

  // ===== HOMEWORK =====
  getHomework(){ return this._getData().homework||[]; },
  getHomeworkById(id){ return this.getHomework().find(h=>h.id===id); },
  getSubmissions(f={}){
    let r=this._getData().submissions||[];
    if(f.homeworkId)r=r.filter(s=>s.homeworkId===f.homeworkId);
    if(f.studentId)r=r.filter(s=>s.studentId===f.studentId);
    return r;
  },
  getSubmissionById(id){ return (this._getData().submissions||[]).find(s=>s.id===id); },
  async addHomework(data){
    const d=this._getData(); if(!d.homework)d.homework=[];
    const id='hw_'+Date.now();
    const hw={id,createdAt:new Date().toISOString(),...data};
    d.homework.push(hw); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('homework',id,hw);
    return hw;
  },
  async updateHomework(id,updates){
    const d=this._getData();
    const h=(d.homework||[]).find(x=>x.id===id); if(!h)return null;
    Object.assign(h,updates); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('homework',id,hw);
    return h;
  },
  async submitHomework(data){
    const d=this._getData(); if(!d.submissions)d.submissions=[];
    const id='sub_'+Date.now();
    const hw=this.getHomeworkById(data.homeworkId);
    let autoScore=0,totalAuto=0;
    if(hw){
      (hw.questions||[]).forEach(q=>{
        if(q.type==='short')return;
        const ans=(data.answers||[]).find(a=>a.questionId===q.id); if(!ans)return;
        totalAuto+=q.points;
        if(String(ans.answer)===String(q.correctAnswer))autoScore+=q.points;
      });
    }
    const hasManual=hw&&(hw.questions||[]).some(q=>q.type==='short');
    const sub={id,homeworkId:data.homeworkId,studentId:data.studentId,answers:data.answers||[],autoScore,totalAutoPoints:totalAuto,score:hasManual?null:(totalAuto?Math.round(autoScore/totalAuto*100):0),status:hasManual?'pending_review':'graded',attemptNumber:data.attemptNumber||1,submittedAt:new Date().toISOString()};
    d.submissions.push(sub); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('submissions',id,sub);
    return sub;
  },
  async deleteHomework(id){
    const d=this._getData();
    d.homework=(d.homework||[]).filter(h=>h.id!==id);
    d.submissions=(d.submissions||[]).filter(s=>s.homeworkId!==id);
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.deleteDoc('homework',id);
  },
  async gradeSubmission(id,score,by,notes){
    const d=this._getData();
    const s=(d.submissions||[]).find(x=>x.id===id); if(!s)return;
    s.status='graded'; s.score=score; s.gradedBy=by; s.gradeNotes=notes; s.gradedAt=new Date().toISOString();
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('submissions',id,s);
  },

  // ===== EXAMS =====
  getExams(){ return this._getData().exams||[]; },
  getExamById(id){ return this.getExams().find(e=>e.id===id); },
  getExamAttempts(f={}){
    let r=this._getData().examAttempts||[];
    if(f.examId)r=r.filter(a=>a.examId===f.examId);
    if(f.studentId)r=r.filter(a=>a.studentId===f.studentId);
    return r;
  },
  async addExam(data){
    const d=this._getData(); if(!d.exams)d.exams=[];
    const id='ex_'+Date.now();
    const backupCode=data.backupCode||('EXAM-'+Math.random().toString(36).slice(2,6).toUpperCase());
    const e={id,backupCode,createdAt:new Date().toISOString(),status:data.status||'published',...data};
    d.exams.push(e); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('exams',id,e);
    return e;
  },
  async updateExam(id,updates){
    const d=this._getData();
    const e=(d.exams||[]).find(x=>x.id===id); if(!e)return null;
    Object.assign(e,updates); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('exams',id,e);
    return e;
  },
  async startClassExam(id){
    const d=this._getData();
    const e=(d.exams||[]).find(x=>x.id===id); if(!e)return;
    e.status='live'; e.startedAt=new Date().toISOString();
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('exams',id,e);
  },
  async endClassExam(id){
    const d=this._getData();
    const e=(d.exams||[]).find(x=>x.id===id); if(!e)return;
    e.status='ended'; e.endedAt=new Date().toISOString();
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('exams',id,e);
  },
  async submitExamAttempt(data){
    const d=this._getData(); if(!d.examAttempts)d.examAttempts=[];
    const id='eat_'+Date.now();
    const ex=this.getExamById(data.examId);
    let autoScore=0,totalAuto=0;
    if(ex){
      (ex.questions||[]).forEach(q=>{
        if(q.type==='short')return;
        const ans=(data.answers||[]).find(a=>a.questionId===q.id); if(!ans)return;
        totalAuto+=q.points;
        if(String(ans.answer)===String(q.correctAnswer))autoScore+=q.points;
      });
    }
    const attempt={id,examId:data.examId,studentId:data.studentId,answers:data.answers||[],autoScore,totalAutoPoints:totalAuto,score:totalAuto?Math.round(autoScore/totalAuto*100):0,percentage:totalAuto?Math.round(autoScore/totalAuto*100):0,status:'approved',attemptNumber:data.attemptNumber||1,startTime:data.startTime,endTime:new Date().toISOString(),suspiciousActivities:data.suspiciousActivities||[]};
    d.examAttempts.push(attempt); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('examAttempts',id,attempt);
    return attempt;
  },
  async deleteExam(id){
    const d=this._getData();
    d.exams=(d.exams||[]).filter(e=>e.id!==id);
    d.examAttempts=(d.examAttempts||[]).filter(a=>a.examId!==id);
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.deleteDoc('exams',id);
  },

  // ===== VOCABULARY =====
  getVocabulary(){ return this._getData().vocabulary||[]; },
  async addVocabulary(data){
    const d=this._getData(); if(!d.vocabulary)d.vocabulary=[];
    const id='v_'+Date.now();
    const v={id,createdAt:new Date().toISOString(),...data};
    d.vocabulary.push(v); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('vocabulary',id,v);
    return v;
  },
  async deleteVocabulary(id){
    const d=this._getData();
    d.vocabulary=(d.vocabulary||[]).filter(v=>v.id!==id);
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.deleteDoc('vocabulary',id);
  },

  // ===== TASKS =====
  getTasks(f={}){
    let r=this._getData().tasks||[];
    if(f.type)r=r.filter(t=>t.type===f.type);
    if(f.assignedTo)r=r.filter(t=>t.assignedTo===f.assignedTo);
    if(f.status)r=r.filter(t=>t.status===f.status);
    return r;
  },
  async addTask(data){
    const d=this._getData(); if(!d.tasks)d.tasks=[];
    const id='task_'+Date.now();
    const t={id,createdAt:new Date().toISOString(),...data};
    d.tasks.push(t); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('tasks',id,t);
    return t;
  },
  async updateTask(id,updates){
    const d=this._getData();
    const t=(d.tasks||[]).find(x=>x.id===id); if(!t)return;
    Object.assign(t,updates); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('tasks',id,t);
    return t;
  },

  // ===== PAYMENTS =====
  getPayments(){ return this._getData().payments||[]; },
  async addPayment(data){
    const d=this._getData(); if(!d.payments)d.payments=[];
    const id='pay_'+Date.now();
    const p={id,createdAt:new Date().toISOString(),...data};
    d.payments.push(p); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('payments',id,p);
    return p;
  },
  async recordPayment(id,amount,method){
    const d=this._getData();
    const p=(d.payments||[]).find(x=>x.id===id); if(!p)return;
    p.paidAmount=(p.paidAmount||0)+amount;
    p.history=p.history||[];
    p.history.push({date:new Date().toISOString(),amount,method});
    p.status=p.paidAmount>=p.amount?'paid':(p.paidAmount>0?'partially_paid':'unpaid');
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('payments',id,p);
  },
  getPaymentSummary(){
    const pays=this.getPayments();
    const total=pays.reduce((s,p)=>s+(p.amount||0),0);
    const paid=pays.reduce((s,p)=>s+(p.paidAmount||0),0);
    return{total,paid,remaining:total-paid};
  },

  // ===== NOTIFICATIONS =====
  getNotifications(f={}){
    let r=this._getData().notifications||[];
    if(f.targetUserId)r=r.filter(n=>n.targetUserId===f.targetUserId||n.targetUserId==='all');
    return r.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  },
  async addNotification(data){
    const d=this._getData(); if(!d.notifications)d.notifications=[];
    const id='notif_'+Date.now();
    const n={id,isRead:false,createdAt:new Date().toISOString(),...data};
    d.notifications.push(n); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('notifications',id,n);
    return n;
  },

  // ===== ACTIVITY LOGS =====
  getActivityLogs(){ return (this._getData().activityLogs||[]).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)); },
  async logActivity(uid,uname,action,target){
    const d=this._getData(); if(!d.activityLogs)d.activityLogs=[];
    const u=this.getUserById(uid);
    const log={id:'log_'+Date.now(),userId:uid,userName:uname,role:u?.role||'-',action,target,timestamp:new Date().toISOString()};
    d.activityLogs.push(log);
    if(d.activityLogs.length>1000)d.activityLogs=d.activityLogs.slice(-1000);
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('activityLogs',log.id,log);
  },

  // ===== ORGANIZATION / BRANDING =====
  getOrganization(){ return this._getData().organization||{name:'EduFlow'}; },
  async updateOrganization(data){
    const d=this._getData();
    d.organization={...(d.organization||{}),...data};
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveMeta('organization',d.organization);
  },
  getBranding(){
    const local=localStorage.getItem('eduflow_branding');
    if(local){ try{ return JSON.parse(local); }catch(e){} }
    return{name:'EduFlow',tagline:'منصة إدارة المراكز التعليمية',logo:null,primaryColor:'#6366f1',accentColor:'#8b5cf6',supportPhone:'01000000000',supportEmail:'support@eduflow.test',whatsappSupport:'01000000000'};
  },
  async updateBranding(data){
    const b=this.getBranding();
    const updated={...b,...data,updatedAt:new Date().toISOString()};
    localStorage.setItem('eduflow_branding',JSON.stringify(updated));
    this.applyBrandingColors(updated);
    if(window.FirebaseService?.connected) await FirebaseService.saveMeta('branding',updated);
    return updated;
  },
  applyBrandingColors(b){
    try{
      if(b.primaryColor)document.documentElement.style.setProperty('--primary',b.primaryColor);
      if(b.accentColor)document.documentElement.style.setProperty('--accent',b.accentColor);
      if(b.primaryColor&&b.accentColor)document.documentElement.style.setProperty('--grad',`linear-gradient(135deg,${b.primaryColor} 0%,${b.accentColor} 100%)`);
    }catch(e){}
  },
  getHesetak(){
    const b=this.getBranding();
    return b.hesetak||(window.EduFlowConfig?.hesetak)||{};
  },
  async updateHesetak(data){
    const b=this.getBranding();
    b.hesetak={...(b.hesetak||{}),...data};
    localStorage.setItem('eduflow_branding',JSON.stringify(b));
    if(window.FirebaseService?.connected) await FirebaseService.saveMeta('branding',b);
    return b.hesetak;
  },

  // ===== BRANCHES =====
  getBranches(){ return this._getData().branches||[]; },
  async addBranch(data){
    const d=this._getData(); if(!d.branches)d.branches=[];
    const id='br_'+Date.now();
    const b={id,isActive:true,createdAt:new Date().toISOString(),...data};
    d.branches.push(b); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('branches',id,b);
    return b;
  },
  async deleteBranch(id){
    const d=this._getData();
    d.branches=(d.branches||[]).filter(b=>b.id!==id);
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.deleteDoc('branches',id);
  },

  // ===== FEATURES =====
  getFeatureFlags(){
    const s=localStorage.getItem('eduflow_features');
    if(s){ try{ return JSON.parse(s); }catch(e){} }
    return (window.EduFlowConfig?.featureFlags)||{};
  },
  async updateFeatureFlag(k,up){
    const f=this.getFeatureFlags(); if(!f[k])return;
    Object.assign(f[k],up);
    localStorage.setItem('eduflow_features',JSON.stringify(f));
    if(window.FirebaseService?.connected) await FirebaseService.saveMeta('features',f);
  },

  // ===== TEACHER REGISTER LINKS =====
  getTeacherRegisterLinks(){ return this._getData().teacherRegisterLinks||[]; },
  generateTeacherRegisterLink(durationHours){
    const d=this._getData(); if(!d.teacherRegisterLinks)d.teacherRegisterLinks=[];
    const dur=durationHours||(window.EduFlowConfig?.settings?.teacherRegisterLinkDuration||48);
    const code='REG-'+Math.random().toString(36).slice(2,8).toUpperCase();
    const link={code,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+dur*3600000).toISOString(),durationHours:dur,active:true,usedBy:null};
    d.teacherRegisterLinks.push(link); this._saveData(d);
    if(window.FirebaseService?.connected) FirebaseService.saveDoc('teacherRegisterLinks',code,link);
    return link;
  },
  validateTeacherRegisterLink(code){
    const d=this._getData();
    const link=(d.teacherRegisterLinks||[]).find(l=>l.code===code&&l.active);
    if(!link)return{valid:false,message:'الرابط غير موجود'};
    if(new Date(link.expiresAt)<new Date())return{valid:false,message:'الرابط منتهي الصلاحية'};
    if(link.usedBy)return{valid:false,message:'تم استخدام الرابط بالفعل'};
    return{valid:true,link};
  },
  async markTeacherRegisterLinkUsed(code,teacherId){
    const d=this._getData();
    const link=(d.teacherRegisterLinks||[]).find(l=>l.code===code);
    if(link){link.usedBy=teacherId;link.usedAt=new Date().toISOString();}
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('teacherRegisterLinks',code,link);
  },
  deactivateTeacherRegisterLink(code){
    const d=this._getData();
    const link=(d.teacherRegisterLinks||[]).find(l=>l.code===code);
    if(link)link.active=false;
    this._saveData(d);
    if(window.FirebaseService?.connected) FirebaseService.saveDoc('teacherRegisterLinks',code,link);
  },

  // ===== BILLING =====
  calculateBilling(groupId,month){
    const g=this.getGroups().find(x=>x.id===groupId); if(!g)return null;
    const d=this._getData();
    const cancelled=(d.cancelledSessions||[]).filter(c=>c.groupId===groupId&&c.date&&c.date.startsWith(month)).length;
    const actual=Math.max(0,(g.sessionsPerMonth||4)-cancelled);
    return{groupId,month,sessionsPerMonth:g.sessionsPerMonth||4,cancelledSessions:cancelled,actualSessions:actual,sessionFee:g.sessionFee||0,total:actual*(g.sessionFee||0),monthlyFee:g.monthlyFee||0};
  },

  // ===== MATERIALS =====
  getMaterials(){ return this._getData().materials||[]; },
  getMaterialById(id){ return this.getMaterials().find(m=>m.id===id); },
  async addMaterial(data){
    const d=this._getData(); if(!d.materials)d.materials=[];
    const id='mat_'+Date.now();
    const m={id,createdAt:new Date().toISOString(),availability:'available',...data};
    d.materials.push(m); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('materials',id,m);
    return m;
  },
  async deleteMaterial(id){
    const d=this._getData();
    d.materials=(d.materials||[]).filter(m=>m.id!==id);
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.deleteDoc('materials',id);
  },

  // ===== ANNOUNCEMENTS =====
  getAnnouncements(f={}){
    let r=this._getData().announcements||[];
    if(f.groupId)r=r.filter(a=>!a.groupId||a.groupId===f.groupId);
    return r.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
  },

  // ============================================================
  //  التحديات والمسابقات (Challenges + Leaderboard)
  // ============================================================
  getChallenges(f={}){
    let r=this._getData().challenges||[];
    if(f.status)r=r.filter(c=>c.status===f.status);
    return r.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
  },
  getChallengeById(id){ return (this._getData().challenges||[]).find(c=>c.id===id)||null; },
  async addChallenge(data){
    const d=this._getData(); if(!d.challenges)d.challenges=[];
    const id='ch_'+Date.now();
    const c={
      id, createdAt:new Date().toISOString(), status:'active',
      basePoints:1, timeBonusMultiplier:3, timeBonusHours:1,
      targetType:'all', targetValue:'', period:'week',
      ...data
    };
    d.challenges.push(c); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('challenges',id,c);
    return c;
  },
  async updateChallenge(id,updates){
    const d=this._getData();
    const c=(d.challenges||[]).find(x=>x.id===id); if(!c)return null;
    Object.assign(c,updates,{updatedAt:new Date().toISOString()});
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('challenges',id,c);
    return c;
  },
  async deleteChallenge(id){
    const d=this._getData();
    d.challenges=(d.challenges||[]).filter(c=>c.id!==id);
    d.challengeAttempts=(d.challengeAttempts||[]).filter(a=>a.challengeId!==id);
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.deleteDoc('challenges',id);
  },
  // التحديات المتاحة لطالب معين (نشطة + ضمن الاستهداف: الكل/الصف/المجموعة)
  getChallengesForStudent(studentId){
    const s=this.getUserById(studentId); if(!s)return[];
    const now=new Date().toISOString();
    return (this._getData().challenges||[]).filter(c=>{
      if(c.status==='closed')return false;
      if(c.startsAt&&c.startsAt>now)return false;
      if(c.endsAt&&c.endsAt<now)return false;
      if(!c.targetType||c.targetType==='all')return true;
      if(c.targetType==='grade')return (c.targetValue||'')===s.grade;
      if(c.targetType==='group')return this.getStudentsByGroup(c.targetValue).some(x=>x.id===studentId);
      return true;
    });
  },
  getChallengeAttempts(f={}){
    let r=this._getData().challengeAttempts||[];
    if(f.challengeId)r=r.filter(a=>a.challengeId===f.challengeId);
    if(f.studentId)r=r.filter(a=>a.studentId===f.studentId);
    return r;
  },
  hasChallengeAttempt(challengeId,studentId){
    return this.getChallengeAttempts({challengeId,studentId}).length>0;
  },
  // ⏱️ حساب النقاط: نقطة أساس لكل إجابة صحيحة × معامل الوقت لو جاوب خلال_window
  calcChallengePoints(challenge,correctCount,finishedAt){
    const base=challenge?.basePoints||1;
    const mult=challenge?.timeBonusMultiplier||3;
    const windowMs=(challenge?.timeBonusHours||1)*3600000;
    const publishedAt=new Date(challenge?.startsAt||challenge?.createdAt||Date.now()).getTime();
    const within=(new Date(finishedAt||Date.now()).getTime()-publishedAt)<=windowMs;
    return { points: correctCount*base*(within?mult:1), timeBonusApplied: within };
  },
  async submitChallengeAttempt({challengeId,studentId,answers}){
    const d=this._getData();
    const c=(d.challenges||[]).find(x=>x.id===challengeId);
    if(!c)return{success:false,message:'التحدي غير موجود'};
    if(this.hasChallengeAttempt(challengeId,studentId))return{success:false,message:'شاركت في التحدي ده بالفعل ✓'};
    let correct=0,total=0;
    (c.questions||[]).forEach(q=>{
      total++;
      const ans=(answers||[]).find(a=>a.questionId===q.id);
      if(ans&&String(ans.answer)===String(q.correctAnswer))correct++;
    });
    const finishedAt=new Date().toISOString();
    const calc=this.calcChallengePoints(c,correct,finishedAt);
    const att={
      id:'ca_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),
      challengeId, studentId, answers:answers||[],
      correctCount:correct, totalQuestions:total,
      points:calc.points, timeBonusApplied:calc.timeBonusApplied,
      finishedAt, status:'done'
    };
    d.challengeAttempts=d.challengeAttempts||[];
    d.challengeAttempts.push(att); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('challengeAttempts',att.id,att);
    return{success:true,attempt:att};
  },
  // 🥇 ليدربورد: scope = {type:'all'|'grade'|'group'|'teacher', value} + period = 'week'|'month'|'all'
  getChallengeLeaderboard(scope={type:'all'},period='all'){
    let list=this._getData().challengeAttempts||[];
    if(period==='week'){ const start=this.getWeekStart(); list=list.filter(a=>new Date(a.finishedAt||0)>=start); }
    else if(period==='month'){ const m=new Date().toISOString().slice(0,7); list=list.filter(a=>(a.finishedAt||'').startsWith(m)); }
    if(scope.type==='grade'){
      list=list.filter(a=>{ const s=this.getUserById(a.studentId); return s&&s.grade===scope.value; });
    }else if(scope.type==='group'){
      const ids=new Set(this.getStudentsByGroup(scope.value).map(s=>s.id));
      list=list.filter(a=>ids.has(a.studentId));
    }else if(scope.type==='teacher'){
      const ids=new Set();
      this.getGroupsByTeacher(scope.value).forEach(g=>this.getStudentsByGroup(g.id).forEach(s=>ids.add(s.id)));
      list=list.filter(a=>ids.has(a.studentId));
    }
    const agg={};
    list.forEach(a=>{ agg[a.studentId]=(agg[a.studentId]||0)+(a.points||0); });
    return Object.entries(agg).map(([sid,pts])=>{
      const s=this.getUserById(sid);
      return{studentId:sid,name:s?.name||'-',code:s?.code||'',grade:s?.grade||'',points:pts};
    }).sort((a,b)=>b.points-a.points);
  },
  getStudentChallengePoints(studentId,period='all'){
    return this.getChallengeLeaderboard({type:'all'},period).find(x=>x.studentId===studentId)?.points||0;
  },

  // ============================================================
  // 🎬 الفيديوهات (يوتيوب / فيسبوك / تيك توك)
  // ============================================================
  getVideos(f={}){
    let r=this._getData().videos||[];
    if(f.category&&f.category!=='all')r=r.filter(v=>v.category===f.category);
    return r.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
  },
  getVideoById(id){ return (this._getData().videos||[]).find(v=>v.id===id)||null; },
  detectVideoPlatform(url){
    const u=String(url||'').toLowerCase();
    if(u.includes('youtu.be')||u.includes('youtube.com'))return 'youtube';
    if(u.includes('facebook.com')||u.includes('fb.watch'))return 'facebook';
    if(u.includes('tiktok.com'))return 'tiktok';
    return 'other';
  },
  getYouTubeId(url){
    const m=String(url||'').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{6,})/);
    return m?m[1]:null;
  },
  getVideoCategories(){
    const def=['شرح','مراجعة','مفردات','واجبات','عام'];
    const extra=(this._getData().videos||[]).map(v=>v.category).filter(c=>c&&!def.includes(c));
    return def.concat([...new Set(extra)]);
  },
  async addVideo(data){
    const d=this._getData(); if(!d.videos)d.videos=[];
    const id='vid_'+Date.now();
    const v={id,createdAt:new Date().toISOString(),category:'عام',targetType:'all',targetValue:'',platform:this.detectVideoPlatform(data.url),...data};
    d.videos.push(v); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('videos',id,v);
    return v;
  },
  async updateVideo(id,updates){
    const d=this._getData();
    const v=(d.videos||[]).find(x=>x.id===id); if(!v)return null;
    Object.assign(v,updates);
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('videos',id,v);
    return v;
  },
  async deleteVideo(id){
    const d=this._getData();
    d.videos=(d.videos||[]).filter(v=>v.id!==id);
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.deleteDoc('videos',id);
  },
  // الفيديوهات الظاهرة لطالب: الكل / صفه / مجموعاته
  getVideosForStudent(studentId){
    const s=this.getUserById(studentId); if(!s)return[];
    return (this._getData().videos||[]).filter(v=>{
      if(!v.targetType||v.targetType==='all')return true;
      if(v.targetType==='grade')return (v.targetValue||'')===s.grade;
      if(v.targetType==='group')return this.getStudentsByGroup(v.targetValue).some(x=>x.id===studentId);
      return true;
    }).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
  },

  // ============================================================
  // 📰 بوستات الحصص — "إيه اللي اتاخد في الحصة"
  // ============================================================
  getClassPosts(f={}){
    let r=this._getData().classPosts||[];
    if(f.groupId)r=r.filter(p=>p.groupId===f.groupId);
    return r.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
  },
  getClassPostById(id){ return (this._getData().classPosts||[]).find(p=>p.id===id)||null; },
  async addClassPost(data){
    const d=this._getData(); if(!d.classPosts)d.classPosts=[];
    const id='cp_'+Date.now();
    const p={id,createdAt:new Date().toISOString(),date:new Date().toISOString().split('T')[0],imageUrl:'',homeworkText:'',...data};
    d.classPosts.push(p); this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('classPosts',id,p);
    return p;
  },
  async updateClassPost(id,updates){
    const d=this._getData();
    const p=(d.classPosts||[]).find(x=>x.id===id); if(!p)return null;
    Object.assign(p,updates);
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.saveDoc('classPosts',id,p);
    return p;
  },
  async deleteClassPost(id){
    const d=this._getData();
    d.classPosts=(d.classPosts||[]).filter(p=>p.id!==id);
    this._saveData(d);
    if(window.FirebaseService?.connected) await FirebaseService.deleteDoc('classPosts',id);
  },
  // بوستات مجموعات الطالب (عشان الغايب يعرف اتاخد إيه والواجب إيه)
  getClassPostsForStudent(studentId){
    const gids=this.getStudentTeachers(studentId).map(x=>x.group.id);
    const d=this._getData();
    return ((d.classPosts||[]).filter(p=>gids.includes(p.groupId)))
      .sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
  },

  // ===== PARENT DATA =====
  getStudentDataForParent(parentId){
    const d=this._getData();
    const parent=(d.users||[]).find(u=>u.id===parentId);
    const ids=parent?.studentIds||[];
    return (d.users||[]).filter(u=>u.role==='student'&&ids.includes(u.studentId)).map(s=>{
      const g=(d.groups||[]).find(x=>x.id===s.groupId);
      const t=g?(d.users||[]).find(u=>u.id===g.teacherId):null;
      return{...s,group:g,teacher:t,
        attendance:(d.attendance||[]).filter(a=>a.groupId===s.groupId),
        homework:(d.homework||[]).filter(h=>h.groupId===s.groupId),
        submissions:(d.submissions||[]).filter(x=>x.studentId===s.id),
        examAttempts:(d.examAttempts||[]).filter(a=>a.studentId===s.id),
        payments:(d.payments||[]).filter(p=>p.studentId===s.id)};
    });
  }
};

// ⚡ مزامنة الكاش بين التبويبات المفتوحة (لو تبويب عدّل البيانات، الباقي يقرأ جديد)
(function(){
  try{
    window.addEventListener('storage',function(e){
      if(e.key==='eduflow_db') DataService._cache=null;
    });
  }catch(e){}
})();

window.DataService = DataService;