// js/data-service.js — نسخة الإنتاج (بدون أي بيانات تجريبية)
const DataService = {
  _db: {
    organization: { id:"org_1", name:"EduFlow", productName:"EduFlow", logo:null, contactPhone:"", supportEmail:"" },
    branches: [],
    users: [],               // ✅ فاضي تماماً — مفيش أي إيميل/باسورد
    groups: [],
    enrollments: [],
    attendance: [],
    registrationCodes: [],   // ✅ فاضي — الأدمن بيولّد الأكواد
    vocabulary: [],
    homework: [],
    submissions: [],
    reattemptRequests: [],
    exams: [],
    examAttempts: [],
    payments: [],
    materials: [],
    materialOrders: [],
    weeklyReports: [],
    tasks: [],
    notifications: [],
    activityLogs: [],
    settings: { studentIdPrefix:"STU-", codePrefix:"EDU-", supportPhone:"", allowSelfRegistration:true, paymentMethods:["cash","vodafone_cash","bank_transfer"] }
  },

  init(){ if(EduFlowConfig.demoMode && !localStorage.getItem('eduflow_db')) localStorage.setItem('eduflow_db', JSON.stringify(this._db)); },
  _getData(){ return JSON.parse(localStorage.getItem('eduflow_db') || JSON.stringify(this._db)); },
  _saveData(d){ localStorage.setItem('eduflow_db', JSON.stringify(d)); },

  // ✅ هل فيه أدمن؟ (لتحديد عرض Setup أو Login)
  hasAdmin(){ return this._getData().users.some(u => u.role === 'super_admin'); },

  // ✅ إنشاء أول أدمن (أول تشغيل فقط)
  createFirstAdmin(name, email, password){
    const d = this._getData();
    if (d.users.some(u => u.role === 'super_admin')) return { success:false, message:'يوجد أدمن بالفعل' };
    d.users.push({ id:'admin_'+Date.now(), name, email, password, role:'super_admin', phone:'', createdAt:new Date().toISOString() });
    this._saveData(d);
    return { success:true };
  },

  // ✅ توليد كود تسجيل (الأدمن/المساعد بيديه للطالب)
  generateRegistrationCode(){
    const d = this._getData();
    let code;
    do { code = 'REG-' + Math.random().toString(36).slice(2,6).toUpperCase(); } while (d.registrationCodes.includes(code));
    d.registrationCodes.push(code);
    this._saveData(d);
    return code;
  },

  // ===== Auth =====
  authenticate(identifier, password){
    const d = this._getData();
    const idf = (identifier||'').trim().toLowerCase();
    const u = d.users.find(x => (x.email||'').toLowerCase()===idf || (x.phone||'')===(identifier||'').trim() || (x.studentId||'').toLowerCase()===idf || (x.code||'').toLowerCase()===idf);
    if (u && u.password === password) { const {password:_, ...safe} = u; return safe; }
    return null;
  },
  loginParentWithChildCode(code, password){
    const d = this._getData();
    const s = d.users.find(x => x.role==='student' && (x.code||'').toLowerCase()===(code||'').trim().toLowerCase());
    if (!s || s.password !== password) return null;
    return { id:'parent_'+s.id, role:'parent', name:'ولي أمر '+s.name, phone:s.parentPhone, studentIds:[s.studentId], viaChildCode:true };
  },

  // ===== Codes =====
  generateStudentId(){ const d=this._getData(); const n=d.users.filter(u=>u.role==='student').length+1; return `${d.settings.studentIdPrefix}${String(n).padStart(4,'0')}`; },
  generateStudentCode(){ const d=this._getData(); let c; do{ c=`${d.settings.codePrefix}${Math.floor(1000+Math.random()*9000)}`; }while(d.users.some(u=>u.code===c)); return c; },
  findStudentByCode(code){ return this._getData().users.find(u=>u.role==='student' && (u.code||'').toLowerCase()===(code||'').trim().toLowerCase())||null; },

  registerStudent(s){
    const d=this._getData();
    if (d.users.some(u=>u.email && u.email===s.email) || d.users.some(u=>u.phone===s.phone)) return {success:false,message:'البريد أو الرقم مسجل بالفعل'};
    const st={ id:`stu_${Date.now()}`, role:'student', name:s.name, phone:s.phone, email:s.email||s.phone, password:s.password, parentPhone:s.parentPhone, parentRelation:s.parentRelation||'', whatsappOn:s.whatsappOn||'parent', stage:s.stage||'', grade:s.grade||'', studentId:this.generateStudentId(), code:this.generateStudentCode(), groupId:s.groupId||'', teacherId:s.teacherId||'', subject:s.subject||'English', createdAt:new Date().toISOString() };
    d.users.push(st);
    if (s.groupId) { const g=d.groups.find(x=>x.id===s.groupId); d.enrollments.push({id:`enr_${Date.now()}`,studentId:st.id,groupId:s.groupId,teacherId:s.teacherId||g?.teacherId,subject:g?.subject||'English',status:'active',enrolledAt:new Date().toISOString()}); }
    this._saveData(d);
    return {success:true, studentId:st.studentId, code:st.code};
  },
  addStudentByAdmin(s){
    const d=this._getData();
    const st={ id:`stu_${Date.now()}`, role:'student', name:s.name, phone:s.phone, email:s.email||s.phone, password:s.password||'12345678', parentPhone:s.parentPhone||'', parentRelation:s.parentRelation||'', whatsappOn:s.whatsappOn||'parent', stage:s.stage||'', grade:s.grade||'', studentId:this.generateStudentId(), code:this.generateStudentCode(), createdAt:new Date().toISOString() };
    d.users.push(st);
    (s.enrollments||[]).forEach(en=>{ const g=d.groups.find(x=>x.id===en.groupId); d.enrollments.push({id:`enr_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,studentId:st.id,groupId:en.groupId,teacherId:g?.teacherId,subject:g?.subject||'',status:'active',enrolledAt:new Date().toISOString()}); });
    if ((s.enrollments||[]).length) { st.groupId=s.enrollments[0].groupId; st.teacherId=d.groups.find(g=>g.id===s.enrollments[0].groupId)?.teacherId; }
    this._saveData(d);
    return {success:true, studentId:st.studentId, code:st.code};
  },

  // ===== Users =====
  getTeachers(){ return this._getData().users.filter(u=>u.role==='teacher'); },
  getAssistants(){ return this._getData().users.filter(u=>u.role==='assistant'); },
  getStudents(){ return this._getData().users.filter(u=>u.role==='student'); },
  getParents(){ return this._getData().users.filter(u=>u.role==='parent'); },
  getUserById(id){ return this._getData().users.find(u=>u.id===id); },
  addUser(u){ const d=this._getData(); const nu={id:`u_${Date.now()}`,...u}; d.users.push(nu); this._saveData(d); return {success:true,userId:nu.id}; },
  updateUser(id,up){ const d=this._getData(); const u=d.users.find(x=>x.id===id); if(u){Object.assign(u,up); this._saveData(d); return {success:true};} return {success:false}; },
  deleteUser(id){ const d=this._getData(); d.users=d.users.filter(u=>u.id!==id); d.enrollments=d.enrollments.filter(e=>e.studentId!==id); this._saveData(d); return {success:true}; },

  // ===== Assistant scope =====
  assignAssistantTeachers(aid,tids){ const d=this._getData(); const a=d.users.find(u=>u.id===aid); if(a){a.assignedTeacherIds=tids; this._saveData(d); return {success:true};} return {success:false}; },
  getAssistantTeachers(aid){ const d=this._getData(); const a=d.users.find(u=>u.id===aid); return (a?.assignedTeacherIds||[]).map(id=>d.users.find(u=>u.id===id)).filter(Boolean); },
  getAssistantScope(aid){ const d=this._getData(); const a=d.users.find(u=>u.id===aid); const tids=a?.assignedTeacherIds||[]; const groups=d.groups.filter(g=>tids.includes(g.teacherId)); const gids=groups.map(g=>g.id); const students=d.users.filter(u=>u.role==='student'&&gids.includes(u.groupId)); return {teacherIds:tids, groupIds:gids, students:students.map(s=>s.id), teachers:this.getAssistantTeachers(aid)}; },

  // ===== Teacher now =====
  getTeacherNowGroup(tid){ const d=this._getData(); const now=new Date(); const day=now.toLocaleDateString('en-US',{weekday:'long'}); const nowMin=now.getHours()*60+now.getMinutes(); return d.groups.find(g=>{ if(g.teacherId!==tid||g.day!==day) return false; const [h,m]=g.time.split(':').map(Number); const st=h*60+m; return nowMin>=st&&nowMin<=st+(g.duration||120); })||null; },
  getTeacherTodayGroups(tid){ const d=this._getData(); const day=new Date().toLocaleDateString('en-US',{weekday:'long'}); return d.groups.filter(g=>g.teacherId===tid&&g.day===day); },

  // ===== Groups =====
  getGroups(){ return this._getData().groups; },
  getGroupsByTeacher(t){ return this._getData().groups.filter(g=>g.teacherId===t); },
  addGroup(g){ const d=this._getData(); const ng={id:`g_${Date.now()}`,duration:120,maxStudents:30,status:'active',...g}; d.groups.push(ng); this._saveData(d); return {success:true,groupId:ng.id}; },
  updateGroup(id,up){ const d=this._getData(); const g=d.groups.find(x=>x.id===id); if(g){Object.assign(g,up); this._saveData(d); return {success:true};} return {success:false}; },
  deleteGroup(id){ const d=this._getData(); d.groups=d.groups.filter(g=>g.id!==id); this._saveData(d); return {success:true}; },
  getStudentsByGroup(g){ return this._getData().users.filter(u=>u.role==='student'&&u.groupId===g); },
  getStudentTeachers(sid){ const d=this._getData(); return d.enrollments.filter(e=>e.studentId===sid&&e.status==='active').map(e=>({enrollment:e, group:d.groups.find(g=>g.id===e.groupId), teacher:d.users.find(u=>u.id===e.teacherId)})).filter(x=>x.teacher); },

  // ===== Attendance =====
  submitAttendance(a){ const d=this._getData(); d.attendance.push({id:`att_${Date.now()}`,groupId:a.groupId,groupName:a.groupName,date:new Date().toISOString().split('T')[0],submittedBy:a.submittedBy,status:'pending',records:a.records,submittedAt:new Date().toISOString()}); this._saveData(d); return {success:true}; },
  getPendingAttendance(){ return this._getData().attendance.filter(a=>a.status==='pending'); },
  getAttendance(){ return this._getData().attendance; },
  approveAttendance(id,by){ const d=this._getData(); const a=d.attendance.find(x=>x.id===id); if(a){a.status='approved';a.approvedBy=by;a.approvedAt=new Date().toISOString(); this._saveData(d); return {success:true};} return {success:false}; },

  // ===== Vocabulary =====
  addVocabulary(v){ const d=this._getData(); d.vocabulary.push({id:`vocab_${Date.now()}`,...v,createdAt:new Date().toISOString()}); this._saveData(d); return {success:true}; },
  getVocabulary(f={}){ let r=this._getData().vocabulary; if(f.subject) r=r.filter(v=>v.subject===f.subject); if(f.groupId) r=r.filter(v=>v.groupId===f.groupId||!v.groupId); return r.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); },
  deleteVocabulary(id){ const d=this._getData(); d.vocabulary=d.vocabulary.filter(v=>v.id!==id); this._saveData(d); return {success:true}; },

  // ===== Homework =====
  addHomework(h){ const d=this._getData(); const nh={id:`hw_${Date.now()}`,status:'published',...h,createdAt:new Date().toISOString()}; d.homework.push(nh); this._saveData(d); return {success:true,homeworkId:nh.id}; },
  getHomework(f={}){ let r=this._getData().homework; if(f.groupId) r=r.filter(h=>h.groupId===f.groupId); if(f.subject) r=r.filter(h=>h.subject===f.subject); return r.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); },
  getHomeworkById(id){ return this._getData().homework.find(h=>h.id===id); },
  deleteHomework(id){ const d=this._getData(); d.homework=d.homework.filter(h=>h.id!==id); d.submissions=d.submissions.filter(s=>s.homeworkId!==id); this._saveData(d); return {success:true}; },
  submitHomework(sub){
    const d=this._getData(); const hw=d.homework.find(h=>h.id===sub.homeworkId); if(!hw) return {success:false,message:'الواجب غير موجود'};
    const prev=d.submissions.filter(s=>s.homeworkId===sub.homeworkId&&s.studentId===sub.studentId).length;
    if (prev>=hw.maxAttempts) return {success:false,message:`استنفدت المحاولات (${hw.maxAttempts})`};
    let auto=0,total=0,manual=false;
    hw.questions.forEach(q=>{ if(q.type==='mcq'||q.type==='truefalse'){ total+=q.points; const a=sub.answers.find(x=>x.questionId===q.id); if(a&&String(a.answer)===String(q.correctAnswer)) auto+=q.points; } else if(q.requiresManualReview) manual=true; });
    const score=manual?null:Math.round((auto/total)*100);
    d.submissions.push({id:`sub_${Date.now()}`,homeworkId:sub.homeworkId,studentId:sub.studentId,answers:sub.answers,autoScore:auto,totalAutoPoints:total,score,status:manual?'pending_review':'graded',attemptNumber:prev+1,submittedAt:new Date().toISOString()});
    this._saveData(d);
    return {success:true,score};
  },
  getSubmissions(f={}){ let r=this._getData().submissions; if(f.homeworkId) r=r.filter(s=>s.homeworkId===f.homeworkId); if(f.studentId) r=r.filter(s=>s.studentId===f.studentId); if(f.status) r=r.filter(s=>s.status===f.status); return r.sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt)); },
  getSubmissionById(id){ return this._getData().submissions.find(s=>s.id===id); },
  gradeSubmission(id,score,by,notes=''){ const d=this._getData(); const s=d.submissions.find(x=>x.id===id); if(s){s.score=score;s.status='graded';s.gradedBy=by;s.notes=notes;s.gradedAt=new Date().toISOString(); this._saveData(d); return {success:true};} return {success:false}; },
  requestReattempt(sid,stid,hid,reason){ const d=this._getData(); d.reattemptRequests.push({id:`reatt_${Date.now()}`,submissionId:sid,studentId:stid,homeworkId:hid,reason,status:'pending',createdAt:new Date().toISOString()}); this._saveData(d); return {success:true}; },
  getPendingReattemptRequests(){ return this._getData().reattemptRequests.filter(r=>r.status==='pending'); },
  reviewReattemptRequest(id,approved,by){ const d=this._getData(); const r=d.reattemptRequests.find(x=>x.id===id); if(!r) return {success:false}; r.status=approved?'approved':'rejected'; r.reviewedBy=by; if(approved){ const hw=d.homework.find(h=>h.id===r.homeworkId); if(hw) hw.maxAttempts+=1; } this._saveData(d); return {success:true}; },

  // ===== Exams =====
  addExam(e){ const d=this._getData(); const ne={id:`ex_${Date.now()}`,mode:'home',status:'published',...e,createdAt:new Date().toISOString()}; d.exams.push(ne); this._saveData(d); return {success:true,examId:ne.id}; },
  getExams(f={}){ let r=this._getData().exams; if(f.groupId) r=r.filter(e=>e.groupId===f.groupId); if(f.mode) r=r.filter(e=>e.mode===f.mode); return r.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); },
  getExamById(id){ return this._getData().exams.find(e=>e.id===id); },
  deleteExam(id){ const d=this._getData(); d.exams=d.exams.filter(e=>e.id!==id); d.examAttempts=d.examAttempts.filter(a=>a.examId!==id); this._saveData(d); return {success:true}; },
  startClassExam(id,by){ const d=this._getData(); const e=d.exams.find(x=>x.id===id); if(e){e.status='live';e.classStartedAt=new Date().toISOString();e.startedBy=by; this._saveData(d); return {success:true};} return {success:false}; },
  endClassExam(id){ const d=this._getData(); const e=d.exams.find(x=>x.id===id); if(e){e.status='ended';e.classEndedAt=new Date().toISOString(); this._saveData(d); return {success:true};} return {success:false}; },
  startExamAttempt(exid,stid){
    const d=this._getData(); const ex=d.exams.find(e=>e.id===exid); if(!ex) return {success:false,message:'الامتحان غير موجود'};
    const now=new Date();
    if (ex.mode==='home'){ if(now<new Date(ex.startTime)) return {success:false,message:'لم يبدأ بعد'}; if(now>new Date(ex.endTime)) return {success:false,message:'انتهى الوقت'}; }
    else { if(ex.status!=='live') return {success:false,message:'المدرس لم يبدأ الامتحان'}; }
    const prev=d.examAttempts.filter(a=>a.examId===exid&&a.studentId===stid).length;
    if (prev>=ex.maxAttempts) return {success:false,message:`استنفدت المحاولات (${ex.maxAttempts})`};
    const at={id:`eat_${Date.now()}`,examId:exid,studentId:stid,answers:[],startTime:now.toISOString(),endTime:null,score:null,status:'in_progress',attemptNumber:prev+1,suspiciousActivities:[]};
    d.examAttempts.push(at); this._saveData(d);
    return {success:true,attemptId:at.id};
  },
  saveExamAnswer(aid,qid,ans){ const d=this._getData(); const a=d.examAttempts.find(x=>x.id===aid); if(!a) return {success:false}; const ex=a.answers.find(x=>x.questionId===qid); if(ex) ex.answer=ans; else a.answers.push({questionId:qid,answer:ans}); this._saveData(d); return {success:true}; },
  logSuspiciousActivity(aid,type,details=''){ const d=this._getData(); const a=d.examAttempts.find(x=>x.id===aid); if(!a) return {success:false}; a.suspiciousActivities.push({type,timestamp:new Date().toISOString(),details}); this._saveData(d); return {success:true}; },
  submitExamAttempt(aid){
    const d=this._getData(); const a=d.examAttempts.find(x=>x.id===aid); if(!a||a.status==='submitted') return {success:false};
    const ex=d.exams.find(e=>e.id===a.examId); let auto=0,total=0,manual=false;
    ex.questions.forEach(q=>{ if(q.type==='mcq'||q.type==='truefalse'){ total+=q.points; const ans=a.answers.find(x=>x.questionId===q.id); if(ans&&String(ans.answer)===String(q.correctAnswer)) auto+=q.points; } else if(q.requiresManualReview) manual=true; });
    const pct=total>0?Math.round((auto/total)*100):0;
    a.endTime=new Date().toISOString(); a.autoScore=auto; a.totalAutoPoints=total; a.percentage=pct; a.status=manual?'pending_review':'pending_approval';
    this._saveData(d);
    return {success:true,autoScore:auto,totalAutoPoints:total,percentage:pct};
  },
  getExamAttempts(f={}){ let r=this._getData().examAttempts; if(f.examId) r=r.filter(a=>a.examId===f.examId); if(f.studentId) r=r.filter(a=>a.studentId===f.studentId); if(f.status) r=r.filter(a=>a.status===f.status); return r.sort((a,b)=>new Date(b.startTime)-new Date(a.startTime)); },
  getExamAttemptById(id){ return this._getData().examAttempts.find(a=>a.id===id); },
  approveExamAttempt(id,score,by,notes=''){ const d=this._getData(); const a=d.examAttempts.find(x=>x.id===id); if(!a) return {success:false}; a.score=score; a.status='approved'; a.approvedBy=by; a.notes=notes; a.approvedAt=new Date().toISOString(); this._saveData(d); return {success:true}; },

  // ===== Payments =====
  addPayment(p){ const d=this._getData(); d.payments.push({id:`pay_${Date.now()}`,...p,createdAt:new Date().toISOString(),history:[]}); this._saveData(d); return {success:true}; },
  getPayments(f={}){ let r=this._getData().payments; if(f.studentId) r=r.filter(p=>p.studentId===f.studentId); if(f.month) r=r.filter(p=>p.month===f.month); if(f.status) r=r.filter(p=>p.status===f.status); return r; },
  recordPayment(id,amount,method,notes=''){ const d=this._getData(); const p=d.payments.find(x=>x.id===id); if(!p) return {success:false}; p.paidAmount+=amount; p.history.push({date:new Date().toISOString().split('T')[0],amount,method,notes}); p.status=p.paidAmount>=p.amount?'paid':'partially_paid'; this._saveData(d); return {success:true}; },
  getPaymentSummary(f={}){ const ps=this.getPayments(f); const total=ps.reduce((s,p)=>s+p.amount,0); const paid=ps.reduce((s,p)=>s+p.paidAmount,0); return {total,paid,remaining:total-paid,overdue:ps.filter(p=>p.status==='overdue').length,count:ps.length}; },

  // ===== Materials =====
  addMaterial(m){ const d=this._getData(); d.materials.push({id:`mat_${Date.now()}`,...m,createdAt:new Date().toISOString()}); this._saveData(d); return {success:true}; },
  getMaterials(f={}){ let r=this._getData().materials; if(f.subject) r=r.filter(m=>m.subject===f.subject); return r; },
  getMaterialById(id){ return this._getData().materials.find(m=>m.id===id); },
  deleteMaterial(id){ const d=this._getData(); d.materials=d.materials.filter(m=>m.id!==id); d.materialOrders=d.materialOrders.filter(o=>o.materialId!==id); this._saveData(d); return {success:true}; },
  placeOrder(o){ const d=this._getData(); const m=d.materials.find(x=>x.id===o.materialId); if(!m||m.availability!=='available') return {success:false,message:'غير متوفر'}; d.materialOrders.push({id:`ord_${Date.now()}`,materialId:o.materialId,studentId:o.studentId,status:'pending',quantity:o.quantity||1,totalPrice:m.price*(o.quantity||1),notes:o.notes||'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}); this._saveData(d); return {success:true}; },
  getOrders(f={}){ let r=this._getData().materialOrders; if(f.studentId) r=r.filter(o=>o.studentId===f.studentId); if(f.status) r=r.filter(o=>o.status===f.status); return r; },
  updateOrderStatus(id,status){ const d=this._getData(); const o=d.materialOrders.find(x=>x.id===id); if(o){o.status=status;o.updatedAt=new Date().toISOString(); this._saveData(d); return {success:true};} return {success:false}; },

  // ===== Parent =====
  getStudentDataForParent(pid){ const d=this._getData(); const p=d.users.find(u=>u.id===pid&&u.role==='parent'); if(!p) return null; return d.users.filter(u=>u.role==='student'&&(p.studentIds||[]).includes(u.studentId)).map(s=>({...s, group:d.groups.find(g=>g.id===s.groupId), teacher:d.users.find(u=>u.id===(d.groups.find(g=>g.id===s.groupId)||{}).teacherId), attendance:d.attendance.filter(a=>a.status==='approved'&&a.records.some(r=>r.studentId===s.id)), homework:this.getHomework({groupId:s.groupId}), submissions:this.getSubmissions({studentId:s.id}), exams:this.getExams({groupId:s.groupId}), examAttempts:this.getExamAttempts({studentId:s.id}).filter(a=>a.status==='approved'), payments:this.getPayments({studentId:s.id})})); },
  generateWeeklyReport(sid){ const d=this._getData(); const s=d.users.find(u=>u.id===sid); if(!s) return null; const ws=new Date(); ws.setDate(ws.getDate()-7); const att=d.attendance.filter(a=>new Date(a.date)>=ws&&a.status==='approved'&&a.records.some(r=>r.studentId===sid)); const present=att.reduce((n,a)=>n+(a.records.find(r=>r.studentId===sid)?.status==='present'?1:0),0); return {studentId:sid,studentName:s.name,weekStart:ws.toISOString().split('T')[0],weekEnd:new Date().toISOString().split('T')[0],attendance:{present,total:att.length},homeworkCount:d.submissions.filter(x=>new Date(x.submittedAt)>=ws&&x.studentId===sid).length,examCount:d.examAttempts.filter(a=>new Date(a.startTime)>=ws&&a.studentId===sid&&a.status==='approved').length,generatedAt:new Date().toISOString()}; },
  sendWeeklyReport(r){ const d=this._getData(); d.weeklyReports.push({id:`rpt_${Date.now()}`,...r,sentAt:new Date().toISOString()}); this._saveData(d); return {success:true}; },
  getWeeklyReports(f={}){ let r=this._getData().weeklyReports; if(f.studentId) r=r.filter(x=>x.studentId===f.studentId); return r.sort((a,b)=>new Date(b.sentAt)-new Date(a.sentAt)); },

  // ===== Tasks / Notifications / Logs =====
  getTasks(f={}){ let r=this._getData().tasks; if(f.assignedTo) r=r.filter(t=>t.assignedTo===f.assignedTo); if(f.status) r=r.filter(t=>t.status===f.status); if(f.type) r=r.filter(t=>t.type===f.type); return r; },
  addTask(t){ const d=this._getData(); d.tasks.push({id:`task_${Date.now()}`,...t,createdAt:new Date().toISOString()}); this._saveData(d); return {success:true}; },
  updateTask(id,up){ const d=this._getData(); const t=d.tasks.find(x=>x.id===id); if(t){Object.assign(t,up); this._saveData(d); return {success:true};} return {success:false}; },
  getNotifications(f={}){ let r=this._getData().notifications; if(f.targetUserId) r=r.filter(n=>n.targetUserId===f.targetUserId||n.targetUserId==='all'); if(f.isRead!==undefined) r=r.filter(n=>n.isRead===f.isRead); return r.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); },
  addNotification(n){ const d=this._getData(); d.notifications.push({id:`notif_${Date.now()}`,isRead:false,...n,createdAt:new Date().toISOString()}); this._saveData(d); return {success:true}; },
  getUnreadCount(uid){ return this.getNotifications({targetUserId:uid}).filter(n=>!n.isRead).length; },
  logActivity(uid,uname,action,target){ const d=this._getData(); d.activityLogs.push({id:`log_${Date.now()}`,userId:uid,userName:uname,action,target,timestamp:new Date().toISOString()}); if(d.activityLogs.length>500) d.activityLogs=d.activityLogs.slice(-500); this._saveData(d); },
  getActivityLogs(){ return this._getData().activityLogs.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)); },

  // ===== Org / Branches / Features =====
  getOrganization(){ return this._getData().organization; },
  updateOrganization(up){ const d=this._getData(); Object.assign(d.organization,up); this._saveData(d); return {success:true}; },
  getBranches(){ return this._getData().branches; },
  getFeatureFlags(){ const s=localStorage.getItem('eduflow_features'); return s?JSON.parse(s):EduFlowConfig.featureFlags; },
  updateFeatureFlag(k,up){ const f=this.getFeatureFlags(); if(f[k]){Object.assign(f[k],up); localStorage.setItem('eduflow_features',JSON.stringify(f)); return {success:true};} return {success:false}; },

  // ===== Analytics =====
  getStudentsNeedingAttention(){ const d=this._getData(); return d.users.filter(u=>u.role==='student').map(s=>{ const att=d.attendance.filter(a=>a.status==='approved'&&a.records.some(r=>r.studentId===s.id)); const abs=att.filter(a=>a.records.some(r=>r.studentId===s.id&&r.status==='absent')).length; const hws=d.homework.filter(h=>h.groupId===s.groupId); const subs=d.submissions.filter(x=>x.studentId===s.id); const missed=hws.length-subs.length; let status='stable'; const issues=[]; if(abs>=3){status='high_attention';issues.push(`غياب متكرر (${abs})`);} else if(abs>=2){status='needs_attention';issues.push(`غياب (${abs})`);} if(missed>=3){status=status==='stable'?'needs_attention':status;issues.push(`واجبات غير مسلّمة (${missed})`);} return {student:s,status,issues}; }).filter(x=>x.status!=='stable'); }
};
DataService.init();