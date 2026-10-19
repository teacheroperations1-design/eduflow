/* ================================================================
📝 Legendary Exams V8 — النهائي
• تصنيف صحيح: (امتحان/واجب) × (أونلاين/أوفلاين) — مفيش أزرار ميتة
• تعديل أونلاين حقيقي (بيفتح البناء بالأسئلة الموجودة) + تعديل أوفلاين بمودال
• مراجعة واجبات أونلاين (اعتماد/واتساب/ولي أمر)
• كنس + تعطيل كل الرندر القديم في داشبورد المساعد (examsCreateList/gradesList/فلاتر قديمة)
• كل دوال الملف متسجلة على window — أي onclick هيشتغل
================================================================ */
(function(){
"use strict";
var EX=window.LG=window.LG||{}; window.EX=EX; /* 🎯 عشان أزرار الفلاتر اللي بتنادي EX تشتغل */
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function saveD(d){if(DataService._saveData)DataService._saveData(d);}
function cloudDoc(c,o){try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc(c,o.id,o);}catch(e){}}
function cur(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null);}catch(e){return null;}}
function role(){var u=cur();return u?u.role:'';}
function toast(m,t){try{if(window.safeToast)window.safeToast(m,t||'info');}catch(e){}}
function tick(n,f,ms){ if(EX.tick) EX.tick(n,f,ms); else setInterval(f,ms); }
function gById(id){ return (DataService.getGroups?DataService.getGroups():[]).find(function(g){return g.id===id;}); }
function escS(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function waLink(ph,txt){ return 'https://wa.me/2'+String(ph).replace(/\D/g,'')+'?text='+encodeURIComponent(txt); }
function stLabel(k){ try{ return ((typeof EduFlowConfig!=='undefined'?EduFlowConfig.educationLevels:{})[k]||{}).nameAr||k; }catch(e){ return k; } }

/* 🔕 Dedupe إشعارات 45 ثانية */
if(window.DataService&&DataService.addNotification&&!DataService.__lgDedup){
  DataService.__lgDedup=1;
  var origN=DataService.addNotification.bind(DataService); var seenN={};
  DataService.addNotification=function(n){
    try{
      var k=(n&&n.targetUserId||'')+'|'+(n&&n.title||'')+'|'+(n&&n.message||'');
      var now=Date.now();
      if(seenN[k]&&now-seenN[k]<45000) return Promise.resolve(null);
      seenN[k]=now;
      var ks=Object.keys(seenN); if(ks.length>800){ for(var i=0;i<400;i++) delete seenN[ks[i]]; }
    }catch(e){}
    return origN(n);
  };
}
/* 🧬 حقن إعدادات المودال في أي إنشاء */
['addExam','addHomework'].forEach(function(fn){
  if(!window.DataService||typeof DataService[fn]!=='function'||DataService[fn].__lgMeta) return;
  var o=DataService[fn].bind(DataService);
  DataService[fn]=function(data){
    try{ if(window.__lgPendingMeta&&data){ Object.keys(window.__lgPendingMeta).forEach(function(k){ data[k]=window.__lgPendingMeta[k]; }); } }catch(e){}
    window.__lgPendingMeta=null;
    return o(data);
  };
  DataService[fn].__lgMeta=1;
});
function gradeAnswers(questions, answers, totalPoints){
  var qs=questions||[];
  var any=qs.some(function(q){return q.points;});
  var w=(!any&&qs.length&&totalPoints)?(totalPoints/qs.length):null; /* توزيع الدرجة الكلية بالتساوي */
  var total=0;
  qs.forEach(function(q){
    if(q.type==='essay'||q.type==='short') return;
    var a=(answers||[]).find(function(x){return x.questionId===q.id;});
    if(!a||a.answer==null||a.answer==='') return;
    var av=String(a.answer).trim();
    var corr=(q.correct!=null&&q.correct!=='')?q.correct:q.correctAnswer;
    var ok= av===String(corr).trim() || (q.options&&q.options[corr]&&av===String(q.options[corr]).trim()) || (q.type==='truefalse'&&((av==='true'&&(corr===true||corr==='true'))||(av==='false'&&(corr===false||corr==='false'))));
    if(ok) total += (w!=null?w:(q.points||1));
  });
  return Math.round(total*100)/100;
}
function examMaxPoints(ex){
  var qs=ex.questions||[];
  if(!qs.length) return ex.totalPoints||100;
  var any=qs.some(function(q){return q.points;});
  if(any) return qs.reduce(function(s,q){return s+(q.points||0);},0);
  return ex.totalPoints||qs.length;
}


/* 🎯 إعادة تصحيح المحاولات — force=true يعدّل حتى المعتمد */
EX.regradeAll=function(force){
  var d=db(); var changed=[];
  (d.examAttempts||[]).forEach(function(att){
    if(!att.answers||!att.answers.length) return;
    var ex=(d.exams||[]).find(function(x){return x.id===att.examId;}); if(!ex) return;
    var manual=hasManualQuestions(ex);
    /* المعتمد يدويًا من الأستاذ ميتلمسش إلا بالقوة ومن غير مقالي */
    if(att.status==='approved'){ if(!force||manual) return; }
    var computed=gradeAnswers(ex.questions, att.answers, ex.totalPoints);
    var maxPts=examMaxPoints(ex);
    if(att.score!==computed||att.maxScore!==maxPts){
      att.score=computed; att.maxScore=maxPts; att.autoGraded=true; changed.push(att);
    }
  });
  if(changed.length){ saveD(d); changed.slice(0,80).forEach(function(a){ cloudDoc('examAttempts',a); }); }
  return changed.length;
};
/* 🧬 لفّ submitExamAttempt: التصحيح الصح لحظة التسليم */
if(window.DataService&&typeof DataService.submitExamAttempt==='function'&&!DataService.__lgGradeWrap){
  DataService.__lgGradeWrap=1;
  var _osa=DataService.submitExamAttempt.bind(DataService);
  DataService.submitExamAttempt=async function(payload){
    var res=await _osa(payload);
    try{
      var d=db();
      var ex=(d.exams||[]).find(function(x){return x.id===payload.examId;});
      if(ex&&!hasManualQuestions(ex)){
        var att=(d.examAttempts||[]).filter(function(a){return a.examId===payload.examId&&a.studentId===payload.studentId;})
          .sort(function(a,b){return String(b.submittedAt||'').localeCompare(String(a.submittedAt||''));})[0];
        if(att){
          att.score=gradeAnswers(ex.questions, payload.answers||att.answers||[], ex.totalPoints);
          att.maxScore=examMaxPoints(ex);
          att.autoGraded=true;
          saveD(d); cloudDoc('examAttempts',att);
        }
      }
    }catch(e){}
    return res;
  };
}
/* ========== 🧮 محرك التصحيح المتسامح (نص vs رقم) ========== */
function gradeAnswers(questions, answers){
  var total = 0;
  (questions||[]).forEach(function(q){
    if(q.type === 'essay' || q.type === 'short') return; /* مقالي = يدوي */
    var a = (answers||[]).find(function(x){ return x.questionId === q.id; });
    if(!a || a.answer == null || a.answer === '') return;
    var av = String(a.answer).trim();
    /* 🎯 الصح ممكن يكون مخزن في correct أو correctAnswer */
    var corr = (q.correct != null && q.correct !== '') ? q.correct : q.correctAnswer;
    var ok = false;
    if(av === String(corr).trim()) ok = true;                                   /* رقم/نص مباشر */
    else if(q.options && q.options[corr] && av === String(q.options[corr]).trim()) ok = true; /* الإجابة محفوظة كنص الخيار */
    else if(q.type === 'truefalse'){
      if((av === 'true' && (corr === true || corr === 'true')) || (av === 'false' && (corr === false || corr === 'false'))) ok = true;
    }
    if(ok) total += (q.points || 1);
  });
  return total;
}
function examMaxPoints(ex){
  var s = (ex.questions||[]).reduce(function(t,q){ return t + (q.points||1); }, 0);
  return s || ex.totalPoints || 100;
}
function hasManualQuestions(ex){
  return (ex.questions||[]).some(function(q){ return q.type === 'essay' || q.type === 'short'; });
}
/* 🎯 إعادة تصحيح كل المحاولات */
EX.regradeAll = function(force){
  var d = db(); var changed = [];
  (d.examAttempts||[]).forEach(function(att){
    if(!force && att.status === 'approved') return;
    if(!att.answers || !att.answers.length) return;
    var ex = (d.exams||[]).find(function(x){ return x.id === att.examId; }); if(!ex) return;
    if(hasManualQuestions(ex)) return;
    var computed = gradeAnswers(ex.questions, att.answers, ex.totalPoints);
    var maxPts = examMaxPoints(ex);
    if(att.score !== computed || att.maxScore !== maxPts){
      att.score = computed; att.maxScore = maxPts; att.autoGraded = true; changed.push(att);
    }
  });
  if(changed.length){ saveD(d); changed.slice(0,80).forEach(function(a){ cloudDoc('examAttempts',a); }); }
  return changed.length;
};
window.regradeAllExams = function(){ 
  var n = EX.regradeAll(true); 
  toast('🧮 تم إعادة تصحيح '+n+' محاولة', 'success'); 
  EX.renderGradesPage(); EX.renderExamsPage(); 
  return n; 
};

/* 🧬 لفّ submitExamAttempt: التصحيح الصح لحظة التسليم */
if(window.DataService && typeof DataService.submitExamAttempt === 'function' && !DataService.__lgGradeWrap){
  DataService.__lgGradeWrap = 1;
  var _osa = DataService.submitExamAttempt.bind(DataService);
  DataService.submitExamAttempt = async function(payload){
    var res = await _osa(payload);
    try{
      var d = db();
      var ex = (d.exams||[]).find(function(x){ return x.id === payload.examId; });
      if(ex && !hasManualQuestions(ex)){
        var att = (d.examAttempts||[]).filter(function(a){ return a.examId === payload.examId && a.studentId === payload.studentId; })
          .sort(function(a,b){ return String(b.submittedAt||'').localeCompare(String(a.submittedAt||'')); })[0];
        if(att){
          att.score = gradeAnswers(ex.questions, payload.answers || att.answers || []);
          att.maxScore = examMaxPoints(ex);
          att.autoGraded = true;
          saveD(d); cloudDoc('examAttempts', att);
        }
      }
    }catch(e){}
    return res;
  };
}

/* 🎯 نقاط الحضور من إعدادات الأدمن (القواعد أولاً ثم إعدادات التقييم) */
EX.attendancePoints=function(){
  try{
    var r=(typeof Ops!=='undefined'&&Ops.getPointsRules)?(Ops.getPointsRules()||{}):{};
    if(r.attendance!=null) return +r.attendance;
    var g=(db().gamification||{});
    if(g.pointsRules&&g.pointsRules.attendance!=null) return +g.pointsRules.attendance;
    if(g.evalPoints&&g.evalPoints.attendance!=null) return +g.evalPoints.attendance;
  }catch(e){}
  return 5;
};

function linkedTeacherId(){
  var u=cur(); if(!u) return null;
  try{ if(window.getMyTeacherId){ var t=window.getMyTeacherId(); if(t) return t; } }catch(e){}
  try{ if(window.Ops&&Ops.getAssignment){ var a=Ops.getAssignment(u.id); if(a&&a.teacherId) return a.teacherId; } }catch(e){}
  return null;
}
function myGroups(){
  var u=cur(); 
  if(!u) return [];
  
  /* 🆕 استخدم ScopedData لو موجود (بيضمن الفلتر المركزي) */
  if(window.ScopedData && typeof ScopedData.groups === 'function'){
    return ScopedData.groups();
  }
  
  /* Fallback لو ScopedData مش موجود */
  var gs=(DataService.getGroups?DataService.getGroups():[]);
  if(u.role==='assistant'){ 
    var tid=linkedTeacherId(); 
    if(tid) gs=gs.filter(function(g){return g.teacherId===tid;}); 
    else if(window.Ops&&Ops.groupsInScope) gs=Ops.groupsInScope(u.id)||[]; 
  }
  if(u.role==='teacher') gs=gs.filter(function(g){return g.teacherId===u.id;});
  return gs;
}
function isOfflineRec(kind,r){ return kind==='exam'?(r.mode==='offline'||!!r.paper):!!r.paper; }

/* 🆕 دوال فحص حالة الإصدار (بتحترم releasePolicy بدقة) */
/* 🎯 دوال فحص حالة الإصدار - V3 (دقيقة 100%) */
function hasScore(att){
  return att && att.score !== null && att.score !== undefined && att.score !== '';
}
function isInstantReleased(rec, att){
  var pol = rec.releasePolicy || 'approve';
  if (pol !== 'instant') return false;
  if (!att) return false;
  if (att.status === 'approved') return true;
  if (hasScore(att)) return true;  // 🎯 instant = الدرجة تظهر فوراً لو موجودة (حتى لو 0)
  return false;
}
function isApprovedReleased(rec, att){
  if (!att) return false;
  return att.status === 'approved';
}
function isReleased(rec, att){
  if(att&&att.autoGraded) return true; /* 🆕 المصحح تلقائياً يظهر فوراً */
  return isInstantReleased(rec, att) || isApprovedReleased(rec, att);
}
/* 🎯 حالة العرض: 'available' | 'submitted' | 'review' | 'instant' | 'approved' | 'offline' | 'overdue' */
function getExamStatus(exam, att){
  if (!exam) return 'missing';
  var isOff = exam.mode === 'offline' || !!exam.paper;
  if (isOff) {
    return att && hasScore(att) ? 'offline-graded' : 'offline';
  }
  if (!att) {
    var dl = exam.deadline ? new Date(exam.deadline) : null;
    return (dl && dl < new Date()) ? 'overdue' : 'available';
  }
  var pol = exam.releasePolicy || 'approve';
  if (att.status === 'approved') return 'approved';
  if (pol === 'instant' && hasScore(att)) return 'instant';
  if (hasScore(att)) return 'review';
  if (att.submittedAt) return 'submitted';
  return 'submitted';
}
function getHwStatus(hw, sub){
  if (!hw) return 'missing';
  if (!!hw.paper) {
    return sub && hasScore(sub) ? 'offline-graded' : 'offline';
  }
  if (!sub) {
    var dl = hw.deadline ? new Date(hw.deadline) : null;
    return (dl && dl < new Date()) ? 'overdue' : 'available';
  }
  var pol = hw.releasePolicy || 'approve';
  if (sub.status === 'approved') return 'approved';
  if (pol === 'instant' && hasScore(sub)) return 'instant';
  if (hasScore(sub)) return 'review';
  if (sub.submittedAt) return 'submitted';
  return 'submitted';
}
function studentsOfGroupActive(gid){
  var d=db(), ids={}, out=[];
  (d.enrollments||[]).forEach(function(e){ if(e.groupId===gid&&e.status==='active') ids[e.studentId]=1; });
  var arr=Object.keys(ids);
  if(!arr.length) (DataService.getStudentsByGroup?DataService.getStudentsByGroup(gid):[]).forEach(function(s){ arr.push(s.id); });
  arr.forEach(function(sid){ var s=DataService.getUserById?DataService.getUserById(sid):null; if(s) out.push(s); });
  out.sort(function(a,b){ return String(a.name||'').localeCompare(String(b.name||''),'ar'); });
  return out;
}
function pendingCount(examId){ return (db().examAttempts||[]).filter(function(a){return a.examId===examId&&(a.status==='pending'||a.status==='submitted');}).length; }
function allItems(){
  var d=db(), ids={}, out=[];
  myGroups().forEach(function(g){ids[g.id]=1;});
  (d.exams||[]).forEach(function(e){ if(ids[e.groupId]) out.push({kind:'exam',rec:e,offline:isOfflineRec('exam',e)}); });
  (d.homework||[]).forEach(function(h){ if(ids[h.groupId]) out.push({kind:'hw',rec:h,offline:isOfflineRec('hw',h)}); });
  return out;
}

/* 🧬 ترحيل القديم + stubs */
function migratePaperExams(){
  var d=db(); var pes=d.paperExams||[];
  if(pes.length){
    d.exams=d.exams||[]; d.examAttempts=d.examAttempts||[];
    pes.forEach(function(pe){
      if(d.exams.some(function(x){return x.id===pe.id;})) return;
      var ex={id:pe.id,title:pe.title||'امتحان ورقي',groupId:pe.groupId,mode:'offline',paper:true,totalPoints:pe.total||pe.totalPoints||20,questions:[],date:pe.date||pe.createdAt||'',migratedFrom:'paperExams'};
      d.exams.push(ex);
      var grades=pe.grades||pe.scores||{};
      Object.keys(grades).forEach(function(sid){
        var v=grades[sid]; var score=(v&&typeof v==='object')?(v.score!=null?v.score:v.grade):v;
        if(score==null||score==='') return;
        if(!d.examAttempts.some(function(a){return a.examId===ex.id&&a.studentId===sid;})){
          d.examAttempts.push({id:'att_'+ex.id+'_'+sid,examId:ex.id,studentId:sid,score:+score,maxScore:ex.totalPoints,status:'approved',releasedAt:pe.releasedAt||new Date().toISOString(),visibleToStudent:true,offline:true,migrated:true,pointsAwarded:true});
        }
      });
    });
    delete d.paperExams; saveD(d);
  }
  ['section-paperExams','section-paperGrades','section-offlineGrades'].forEach(function(id){ var el=document.getElementById(id); if(el) el.remove(); });
  ['paperExams','paperGrades','offlineGrades'].forEach(function(id){ var it=document.querySelector('#sidebarNav [data-section="'+id+'"]'); if(it) it.remove(); });
}
/* 🧹 كنس + تعطيل الرندر القديم في داشبورد المساعد */
function killOld(){
  var r0=role();
  if(r0==='student'||r0==='parent') return; /* 🛡️ ميتكتبش فوق دوال الطالب/ولي الأمر أبداً */
  ['examsCreateList','gradesList'].forEach(function(id){ var el=document.getElementById(id); if(el) el.remove(); });
  var sec=document.getElementById('section-grades');
  if(sec) sec.querySelectorAll('.filter-bar').forEach(function(b){ b.remove(); });
  window.loadExams=function(){ EX.renderExamsPage(); };
  window.loadGrades=function(){ EX.renderGradesPage(); };
  window.setGrades=function(){};
  window.loadPaperExams=function(){};
  window.openPaperExamModal=function(){ LG.openUnifiedCreator('ex'); };
  window.gradePaperExam=function(id){ LG.openGradeEntry(id); };
  window.viewPaperExamGrades=function(id){ LG.openGradeEntry(id); };
  window.saveOfflineGrade=function(){ toast('استخدم الرصد الجديد 📝','info'); };
  window.openBulkGradeScan=function(){ toast('استخدم الرصد الجديد 📝','info'); };
}

/* 🧭 القائمة + التابات + تبسيط */
/* ✅ أخفينا الأقسام الورقية القديمة المدمجة في الرصد الجديد — سيبنا exams + homework للطالب */
var HIDE_ITEMS=['makeups','paperGrades','paperExams','offlineGrades'];
var RENAME={exams:'الإنشاء والتجهيز',grades:'رصد الدرجات',followups:'المتابعة والتسويات'};
var RICONS={exams:'🛠️',grades:'📝',followups:'📌'};
function slimSidebar(){
  var nav=document.getElementById('sidebarNav'); if(!nav) return;
  var r=role();
  
 /* ✅ الطالب يشوف الامتحانات والواجبات في القائمة — لا نحذفهم */
/* (كنا بنحذفهم خطأ في V8 عشان الرصد الجديد، لكن الطالب محتاج يدخل الامتحان!) */
if(r==='student'||r==='parent'){
  /* لا نحذف exams ولا homework — الطالب محتاجهم */
  /* بس نتأكد إن الأسماء عربية واضحة */
  var exItem=nav.querySelector('[data-section="exams"]');
  if(exItem){
    var lb=exItem.querySelector('.sidebar-item-label');
    if(lb) lb.textContent=' امتحاناتي';
    var ic=exItem.querySelector('.sidebar-item-icon');
    if(ic) ic.textContent='🎓';
  }
  var hwItem=nav.querySelector('[data-section="homework"]');
  if(hwItem){
    var lb2=hwItem.querySelector('.sidebar-item-label');
    if(lb2) lb2.textContent=' واجباتي';
    var ic2=hwItem.querySelector('.sidebar-item-icon');
    if(ic2) ic2.textContent='📝';
  }
}
  
  HIDE_ITEMS.forEach(function(id){ var it=nav.querySelector('[data-section="'+id+'"]'); if(it) it.remove(); });
  
  /* ✏️ تغيير الأسماء للمساعد/الأستاذ/الأدمن بس (مش الطالب) */
  if(r==='assistant'||r==='admin'||r==='super_admin'||r==='teacher'){
    Object.keys(RENAME).forEach(function(id){
      var it=nav.querySelector('[data-section="'+id+'"]'); if(!it) return;
      var lb=it.querySelector('.sidebar-item-label'); if(lb) lb.textContent=RENAME[id];
      var ic=it.querySelector('.sidebar-item-icon'); if(ic&&RICONS[id]) ic.textContent=RICONS[id];
    });
  }
}
var TABSETS=[ {sections:['followups','makeups'], tabs:[{id:'followups',l:'📌 المتابعات'},{id:'makeups',l:'📅 التعويضيات'}]} ];
function injectTabs(){
  TABSETS.forEach(function(set){
    set.sections.forEach(function(sid){
      var sec=document.getElementById('section-'+sid); if(!sec||sec.querySelector('.lgTabs')) return;
      var bar=document.createElement('div'); bar.className='section-tabs lgTabs';
      bar.style.cssText='display:flex;gap:4px;border-bottom:1px solid var(--border);margin:0 0 14px;overflow-x:auto;';
      bar.innerHTML=set.tabs.map(function(t){ return '<button class="section-tab" data-tabsec="'+t.id+'" onclick="window.showSection(\''+t.id+'\')">'+t.l+'</button>'; }).join('');
      var hdr=sec.querySelector('.section-header');
      if(hdr&&hdr.nextSibling) sec.insertBefore(bar,hdr.nextSibling); else sec.prepend(bar);
    });
  });
  var act=document.querySelector('.section.active'); if(!act) return;
  var aid=act.id.replace('section-','');
  document.querySelectorAll('.lgTabs .section-tab').forEach(function(b){ b.classList.toggle('active',b.getAttribute('data-tabsec')===aid); });
}
if(typeof window.injectGroupFilters==='function'&&!window.__igfWrapped){
  window.__igfWrapped=1; var oigf=window.injectGroupFilters;
  window.injectGroupFilters=function(sid){ if(sid==='grades'||sid==='exams') return; return oigf.apply(this,arguments); };
}
function cleanGradesFilters(){
  ['gfGrade_grades','gfCenter_grades'].forEach(function(id){
    var el=document.getElementById(id);
    if(el){ var bar=el.closest('.card')||el.parentElement.parentElement; if(bar) bar.remove(); }
  });
}
function simplifyGrades(){ if(window.__asGradesPage) return;
  var sec=document.getElementById('section-grades'); if(!sec) return;
  var cards=sec.querySelectorAll('.card');
  for(var i=0;i<cards.length;i++){
    var c=cards[i];
    if(c.id==='lgRecordStrip'||c.querySelector('#lgRecordStrip')) continue;
    if(!c.querySelector('select')) continue;
    if(c.dataset.lgSimple){ refreshCollapse(c); return; }
    c.dataset.lgSimple='1';
    var bar=document.createElement('div');
    bar.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 8px;';
    bar.innerHTML='<button type="button" class="btn btn-ghost btn-sm lgFlip">🔍 الفلاتر <span class="lgArr">‹ عرض</span></button>';
    c.parentNode.insertBefore(bar,c);
    bar.querySelector('.lgFlip').onclick=function(){
      var card=this.closest('div').nextElementSibling;
      var open=card.style.display!=='none';
      card.style.display=open?'none':'';
      this.querySelector('.lgArr').textContent=open?'‹ عرض':'⌃ إخفاء';
      try{ localStorage.setItem('lgGradesFiltersOpen',open?'0':'1'); }catch(e){}
    };
    refreshCollapse(c); return;
  }
}
function refreshCollapse(c){
  var hasActive=false;
  c.querySelectorAll('select').forEach(function(s){ if(s.value&&s.value!=='all') hasActive=true; });
  c.querySelectorAll('input[type="text"]').forEach(function(inp){ if((inp.value||'').trim()) hasActive=true; });
  var openFlag=null; try{ openFlag=localStorage.getItem('lgGradesFiltersOpen'); }catch(e){}
  var bar=c.previousElementSibling; if(!bar||!bar.querySelector('.lgFlip')) return;
  var shouldOpen=hasActive||openFlag==='1';
  c.style.display=shouldOpen?'':'none';
  bar.querySelector('.lgArr').textContent=shouldOpen?'⌃ إخفاء':'‹ عرض';
}
if(!document.getElementById('lgModalStableCss')){
  var stb=document.createElement('style'); stb.id='lgModalStableCss';
  stb.textContent='#globalModal button:hover,#globalModal .btn:hover,#globalModal button:active,#globalModal .btn:active{transform:none!important;}#globalModal .opt-card{transition:background .15s,border-color .15s;}#globalModal .modal-body{overflow-x:hidden!important;}';
  document.head.appendChild(stb);
}

/* ========== 🧩 المودال الموحّد ========== */
var LAST={total:20,pq:0};
function creatorOk(){ var r=role(); return r==='assistant'||r==='admin'||r==='super_admin'; }
EX.openUnifiedCreator=function(pre){
  if(!creatorOk()){ toast('🔐 الإنشاء مسؤولية المساعد المرتبط بالأستاذ','warning'); return; }
  var groups=myGroups();
  if(!groups.length){ toast('⚠️ مفيش مجموعات مرتبطة بأستاذك','error'); return; }
  var tName=(DataService.getUserById?DataService.getUserById(linkedTeacherId()):null)||{};
  function head(t){ return '<div class="modal-header"><h3 class="modal-title">'+t+'</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'; }
  function opt(icon,title,sub,onclick,tone){
    return '<button type="button" class="opt-card" onclick="'+onclick+'" style="width:100%;min-width:0;box-sizing:border-box;display:flex;align-items:center;gap:10px;padding:12px 14px;margin-bottom:8px;border-radius:12px;border:1px solid var(--border);background:'+(tone==='green'?'rgba(16,185,129,.10)':tone==='orange'?'rgba(245,158,11,.10)':'var(--surface-hover)')+';color:var(--text);cursor:pointer;font-family:inherit;text-align:right;white-space:normal;">'+
    '<span style="font-size:22px;flex-shrink:0;">'+icon+'</span>'+
    '<span style="flex:1;min-width:0;"><span style="display:block;font-weight:900;font-size:14px;">'+title+'</span><span style="display:block;font-size:11px;opacity:.75;margin-top:2px;white-space:normal;">'+sub+'</span></span><span style="opacity:.5;">‹</span></button>';
  }
  var list='';
  if(!pre||pre==='ex'){
    list+=opt('🌐','امتحان أونلاين','أسئلة + مدة + زمن لكل سؤال + سياسة الدرجة','window.__ucOnline(\'ex\')','green');
    list+=opt('🎓📄','امتحان أوفلاين','اتأخد في الحصة — سجل البيانات وارصد','window.__ucOfflineForm(\'ex\')','orange');
  }
  if(!pre||pre==='hw'){
    list+=opt('📝🌐','واجب أونلاين','يتنشر ويسلّم من المنصة','window.__ucOnline(\'hw\')','green');
    list+=opt('📝','واجب أوفلاين','ورقي اتسلّم — سجل البيانات وارصد','window.__ucOfflineForm(\'hw\')','orange');
  }
  ThemeManager.openModal(head('🧩 إنشاء جديد')+
  '<div class="filter-info">👨 نطاقك: مجموعات '+(tName.name||'أستاذك')+' فقط ('+groups.length+' مجموعة).</div>'+list+'</div>','modal-sm');

  window.__ucOnline=function(kind){
    ThemeManager.openModal(head('⚙️ إعدادات '+(kind==='ex'?'الامتحان':'الواجب')+' الأونلاين')+
    '<div class="form-group"><label>⏱️ زمن كل سؤال بالثواني (0 = مفتوح)</label><input type="number" id="uqPQ" class="form-input" value="'+LAST.pq+'" min="0"></div>'+
    '<div class="form-group"><label>👁️ سياسة إظهار الدرجة بعد التسليم</label><select id="uqShow" class="form-select"><option value="approve">🔒 تظهر بعد ما الإدارة تعتمد</option><option value="instant">⚡ تظهر للطالب فوراً بعد التسليم</option></select></div>'+
    '<button type="button" class="btn btn-primary w-full" onclick="window.__ucOnlineGo(\''+kind+'\')">➡️ كمّل في المنشئ</button></div>','modal-sm');
  };
  window.__ucOnlineGo=function(kind){
    LAST.pq=parseInt((document.getElementById('uqPQ')||{}).value)||0;
    var pol=(document.getElementById('uqShow')||{}).value||'approve';
    ThemeManager.closeModal();
    EX.openOnlineBuilder(kind,{perQuestionSec:LAST.pq,releasePolicy:pol});
  };
  window.__ucOfflineForm=function(kind){
    var stages=[],grades=[],centers=[];
    groups.forEach(function(g){ if(g.stage&&stages.indexOf(g.stage)<0)stages.push(g.stage); if(g.grade&&grades.indexOf(g.grade)<0)grades.push(g.grade); if(g.center&&centers.indexOf(g.center)<0)centers.push(g.center); });
    var stageOrder=['kg','primary','elementary','prep','middle','secondary','high','university'];
    stages.sort(function(a,b){ return (stageOrder.indexOf(a)<0?99:stageOrder.indexOf(a))-(stageOrder.indexOf(b)<0?99:stageOrder.indexOf(b)); });
    var gNum=function(v){ var m=String(v).match(/(\d+)/); return m?parseInt(m[1]):99; };
    grades.sort(function(a,b){ return gNum(a)-gNum(b)||String(a).localeCompare(String(b)); });
    ThemeManager.openModal(head('📄 '+(kind==='ex'?'امتحان':'واجب')+' أوفلاين')+
    '<div class="filter-info">💡 سجل البيانات الأساسية بس — والرصد بيتم من صفحة 📝 رصد الدرجات.</div>'+
    '<div class="form-group"><label>العنوان *</label><input id="ucTitle" class="form-input" placeholder="مثال: '+(kind==='ex'?'اختبار الفصل':'واجب الدرس')+'"></div>'+
    '<div class="form-group"><label>🎯 الإسناد</label><select id="ucTarget" class="form-select" onchange="window.__ucTarget()"><option value="group">مجموعة معينة</option><option value="grade">صف كامل</option></select></div>'+
    '<div id="ucGroupWrap"><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">'+
    '<div class="form-group"><label>🎓 المرحلة</label><select id="ucStage" class="form-select" onchange="window.__ucFilt()"><option value="">الكل</option>'+stages.map(function(s){return '<option value="'+s+'">'+stLabel(s)+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label>📚 الصف</label><select id="ucGrade" class="form-select" onchange="window.__ucFilt()"><option value="">الكل</option>'+grades.map(function(g){return '<option value="'+g+'">'+g+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label>🏢 السنتر</label><select id="ucCenter" class="form-select" onchange="window.__ucFilt()"><option value="">الكل</option>'+centers.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('')+'</select></div></div>'+
    '<div class="form-group"><label>🔍 بحث مجموعة</label><input id="ucQ" class="form-input" oninput="window.__ucFilt()" placeholder="جزء من الاسم..."></div>'+
    '<div class="form-group"><label>👥 المجموعة * <span id="ucCount" class="badge badge-info"></span></label><select id="ucGroup" class="form-select"></select></div></div>'+
    '<div id="ucGradeWrap" style="display:none;" class="form-group"><label>📚 الصف *</label><select id="ucGradeAll" class="form-select">'+grades.map(function(g){return '<option value="'+g+'">'+g+'</option>';}).join('')+'</select></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
    '<div class="form-group"><label>👁️ سياسة إظهار الدرجة</label><select id="ucShow" class="form-select"><option value="approve">🔒 بعد الاعتماد</option><option value="instant">⚡ فورية بعد الرصد</option></select></div>'+
    (kind==='hw'?'<div class="form-group"><label>📸 صور الحل</label><select id="ucImgs" class="form-select"><option value="auto">🖼️ مع صورة الورقة فقط</option><option value="yes">✅ مسموحة دائماً</option><option value="no">🚫 ممنوعة</option></select></div>':'<div></div>')+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'+
    '<div class="form-group"><label>الدرجة الكلية *</label><input type="number" id="ucTotal" class="form-input" value="'+LAST.total+'" min="1"></div>'+
    '<div class="form-group"><label>التاريخ</label><input type="date" id="ucDate" class="form-input" value="'+new Date().toISOString().slice(0,10)+'"></div></div>'+
    '<button type="button" class="btn btn-primary w-full" onclick="window.__ucSaveOffline(\''+kind+'\')">💾 إنشاء وفتح الرصد</button></div>','modal-md');
    window.__ucFilt();
  };
  window.__ucTarget=function(){
    var t=(document.getElementById('ucTarget')||{}).value;
    document.getElementById('ucGroupWrap').style.display=(t==='group')?'':'none';
    document.getElementById('ucGradeWrap').style.display=(t==='grade')?'':'none';
  };
  window.__ucFilt=function(){
    var st=(document.getElementById('ucStage')||{}).value||'';
    var gr=(document.getElementById('ucGrade')||{}).value||'';
    var ce=(document.getElementById('ucCenter')||{}).value||'';
    var q=((document.getElementById('ucQ')||{}).value||'').toLowerCase();
    var gs=groups.filter(function(g){ return (!st||(g.stage||'')===st)&&(!gr||(g.grade||'')===gr)&&(!ce||(g.center||'')===ce)&&(!q||(g.name||'').toLowerCase().indexOf(q)>=0); });
    var sel=document.getElementById('ucGroup'); if(!sel) return;
    var curV=sel.value;
    sel.innerHTML=gs.length?gs.map(function(g){ return '<option value="'+g.id+'">'+escS(g.name)+(g.grade?' · 📚 '+escS(g.grade):'')+(g.center?' · 🏢 '+escS(g.center):'')+'</option>'; }).join(''):'<option value="">⚠️ مفيش مطابقات — وسّع الفلاتر</option>';
    if(gs.some(function(g){return g.id===curV;})) sel.value=curV;
    var cnt=document.getElementById('ucCount'); if(cnt) cnt.textContent=gs.length+' مطابقة';
  };
  window.__ucSaveOffline=async function(kind){
    try{
      var title=(document.getElementById('ucTitle')||{}).value||'';
      var total=parseInt((document.getElementById('ucTotal')||{}).value)||20;
      var date=(document.getElementById('ucDate')||{}).value||new Date().toISOString().slice(0,10);
      var target=(document.getElementById('ucTarget')||{}).value;
      LAST.total=total;
      var relPol=(document.getElementById('ucShow')||{}).value||'approve';
      var imgsPol=(document.getElementById('ucImgs')||{}).value||'auto';
      if(!title){ toast('اكتب العنوان','error'); return; }
      var list=[];
      if(target==='grade'){
        var grade=(document.getElementById('ucGradeAll')||{}).value;
        if(!grade){ toast('اختار الصف','error'); return; }
        list=groups.filter(function(g){return (g.grade||'')===grade;});
      }else{
        var gid=(document.getElementById('ucGroup')||{}).value;
        if(!gid){ toast('اختار المجموعة','error'); return; }
        list=[gById(gid)];
      }
      list=list.filter(Boolean);
      if(!list.length){ toast('مفيش عناصر مطابقة','error'); return; }
      var fam=(list.length>1)?('fam_'+Date.now()):'';
      var recs=[];
      for(var i=0;i<list.length;i++){
        var g=list[i], rec;
               if(kind==='ex') rec=await DataService.addExam({title:title,groupId:g.id,mode:'offline',duration:0,totalPoints:total,questions:[],paper:true,date:date,showGrade:(relPol==='instant'),releasePolicy:relPol,familyId:fam,grade:g.grade||'',createdBy:(cur()||{}).id||''});
        else rec=await DataService.addHomework({title:title,groupId:g.id,paper:true,totalPoints:total,deadline:date,questions:[],showGrade:(relPol==='instant'),releasePolicy:relPol,allowImages:imgsPol,familyId:fam,createdBy:(cur()||{}).id||''});
        recs.push(rec);
      }
      ThemeManager.closeModal();
      toast('✅ اتأنشأ '+recs.length+' عنصر — بنفتح الرصد','success');
      window.showSection('grades');
      setTimeout(function(){ if(kind==='ex') EX.openGradeEntry(recs[0].id); else EX.openHwGradeEntry(recs[0].id); },350);
    }catch(e){ console.error(e); toast('خطأ إنشاء: '+e.message,'error'); }
  };
};

/* ========== 📝 رصد الامتحان الأوفلاين ========== */
EX.openGradeEntry=function(examId){
  var d=db(); var e=(d.exams||[]).find(function(x){return x.id===examId;}); if(!e) return;
  var max=e.totalPoints||100;
  var sts=studentsOfGroupActive(e.groupId);
  var atts={}; (d.examAttempts||[]).forEach(function(a){ if(a.examId===examId) atts[a.studentId]=a; });
  var st=(e.approvedAt)?'✅ معتمد':(e.releasedAt?'📢 منشور':'📝 مسودة');
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📝 رصد: '+escS(e.title)+'</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">'+
  '<div class="text-xs text-muted">من '+max+' · '+sts.length+' طالب مقيّد · '+escS((gById(e.groupId)||{}).name||'')+' · '+st+'</div>'+
  '<span class="badge badge-muted">👁 الدرجة للإدارة لحد الاعتماد</span></div>'+
  '<div style="max-height:42vh;overflow-y:auto;overflow-x:hidden;">'+sts.map(function(s){ var a=atts[s.id]; return '<div class="sub-row" style="padding:6px 8px;"><div style="flex:1;min-width:0;"><strong style="font-size:13px;">'+escS(s.name)+'</strong><div class="text-xs text-muted">'+(s.code||'')+'</div></div><input type="number" class="form-input ge-score" data-sid="'+s.id+'" min="0" max="'+max+'" style="width:90px;flex-shrink:0;text-align:center;font-weight:800;" placeholder="/'+max+'" value="'+(a&&a.score!=null?a.score:'')+'"></div>'; }).join('')+'</div>'+
  '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">'+
  '<button type="button" class="btn btn-secondary" style="flex:1;" onclick="LG.saveGrades(\''+examId+'\',\'save\')">💾 حفظ فقط</button>'+
  '<button type="button" class="btn btn-primary" style="flex:1;" onclick="LG.saveGrades(\''+examId+'\',\'publish\')">📢 حفظ + نشر</button>'+
  '<button type="button" class="btn btn-success" style="flex:1;" onclick="LG.saveGrades(\''+examId+'\',\'approve\')">✅ اعتماد + نقاط</button></div>'+
  '<div class="text-xs text-muted" style="margin-top:6px;">🎁 النقاط مرة واحدة عند الاعتماد بس.</div>'+
  '<div id="geRank" style="margin-top:10px;"></div></div>','modal-md');
  EX.renderRank(examId,'group');
};
EX.saveGrades=function(examId,action){
  var d=db(); var e=(d.exams||[]).find(function(x){return x.id===examId;}); if(!e) return;
  var max=e.totalPoints||100; var u=cur(); var nowIso=new Date().toISOString();
  d.examAttempts=d.examAttempts||[];
  var saved=[];
  document.querySelectorAll('.ge-score').forEach(function(inp){
    if(inp.value==='') return;
    var sid=inp.getAttribute('data-sid');
    var v=Math.max(0,Math.min(max,+inp.value||0));
    var a=d.examAttempts.find(function(x){return x.examId===examId&&x.studentId===sid;});
    if(!a){ a={id:'att_'+examId+'_'+sid,examId:examId,studentId:sid,answers:[],offline:true}; d.examAttempts.push(a); }
    a.score=v; a.maxScore=max; a.gradedBy=(u||{}).id||''; a.gradedAt=nowIso; a.submittedAt=a.submittedAt||nowIso; a.offline=true;
    a.status=(action==='approve')?'approved':'graded';
    saved.push({sid:sid,score:v,a:a});
  });
  if(!saved.length){ toast('مفيش درجات مكتوبة','warning'); return; }
  if(action!=='save') e.releasedAt=e.releasedAt||nowIso;
  if(action==='approve') e.approvedAt=nowIso;
  var rank=d.examAttempts.filter(function(a){return a.examId===examId&&a.score!=null;}).sort(function(a,b){return b.score-a.score;});
  rank.forEach(function(a,i){ a.rank=i+1; a.rankTotal=rank.length; });
  saveD(d);
  saved.forEach(function(r){ cloudDoc('examAttempts',r.a); });
  cloudDoc('exams',e);
  if(action!=='save'){
    saved.forEach(function(r){
      if(!r.a.nPub){ r.a.nPub=1;
        var pct=Math.round(r.score/max*100);
        var msg='🎓 نتيجة '+e.title+': '+r.score+'/'+max+' ('+pct+'%) · ترتيبك: '+r.a.rank+' من '+rank.length;
        try{ DataService.addNotification({targetUserId:r.sid,title:'🎓 نتيجتك في امتحان',message:msg,type:'grade',priority:'high',meta:{event:'exam_new',score:r.score,max:max}}); }catch(e2){}
        notifyParents(r.sid,msg);
      }
    });
  }
  if(action==='approve'){
    saved.forEach(function(r){
      var pct=Math.round(r.score/max*100);
      if(pct>=75&&!r.a.pointsAwarded){ r.a.pointsAwarded=true; if(window.awardAcademicPoints){ try{ window.awardAcademicPoints(r.sid,'exam',r.score,max,e.title); }catch(e3){} } }
    });
    saveD(d);
  }
  toast(action==='save'?'💾 اتحفظ كمسودة':(action==='publish'?'📢 اتنشر':'✅ معتمد + النقاط مرة واحدة'),'success');
  EX.renderRank(examId,'group');
  setTimeout(function(){ EX.renderGradesPage(); EX.renderExamsPage(); },300);
};
EX.renderRank=function(examId,scope){
  var el=document.getElementById('geRank'); if(!el) return;
  var d=db(); var e=(d.exams||[]).find(function(x){return x.id===examId;}); if(!e) return;
  var atts;
  if(scope==='grade'&&e.familyId){
    var ids={}; (d.exams||[]).forEach(function(x){ if(x.familyId===e.familyId) ids[x.id]=1; });
    var best={};
    (d.examAttempts||[]).forEach(function(a){ if(ids[a.examId]&&a.score!=null){ if(!best[a.studentId]||a.score>best[a.studentId].score) best[a.studentId]=a; } });
    atts=Object.keys(best).map(function(k){return best[k];});
  }else{
    atts=(d.examAttempts||[]).filter(function(a){return a.examId===examId&&a.score!=null;});
  }
  atts=atts.slice().sort(function(a,b){return b.score-a.score;});
  el.innerHTML='<div style="display:flex;gap:6px;margin-bottom:8px;"><button type="button" class="btn btn-ghost btn-sm" onclick="LG.renderRank(\''+examId+'\',\'group\')">👥 ترتيب المجموعة</button><button type="button" class="btn btn-ghost btn-sm" onclick="LG.renderRank(\''+examId+'\',\'grade\')">📚 ترتيب الصف</button></div>'+
  '<div style="max-height:200px;overflow-y:auto;">'+atts.map(function(a,i){
    var s=DataService.getUserById?DataService.getUserById(a.studentId):null;
    var ex=(d.exams||[]).find(function(x){return x.id===a.examId;});
    var gg=ex?gById(ex.groupId):null;
    var pct=Math.round(a.score/(a.maxScore||100)*100);
    return '<div class="sub-row" style="padding:6px 8px;"><div style="flex:1;min-width:0;"><strong>'+(i+1)+'. '+escS(s?s.name:'-')+'</strong>'+(scope==='grade'?'<div class="text-xs text-muted">'+escS((gg||{}).name||'')+'</div>':'')+'</div><span class="grade-badge '+(pct>=75?'success':pct>=50?'warning':'danger')+'">'+a.score+'/'+(a.maxScore||100)+' · '+pct+'%</span></div>';
  }).join('')+'</div>';
};

/* ========== 📝 رصد الواجب الورقي ========== */
EX.openHwGradeEntry=function(hwId){
  var d=db(); var h=(d.homework||[]).find(function(x){return x.id===hwId;}); if(!h) return;
  var max=h.totalPoints||20;
  var sts=studentsOfGroupActive(h.groupId);
  var subs={}; (d.submissions||[]).forEach(function(s){ if(s.homeworkId===hwId) subs[s.studentId]=s; });
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📝 رصد: '+escS(h.title)+' (ورقي)</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="text-xs text-muted" style="margin-bottom:10px;">من '+max+' · '+sts.length+' طالب مقيّد · '+escS((gById(h.groupId)||{}).name||'')+'</div>'+
  '<div style="max-height:42vh;overflow-y:auto;overflow-x:hidden;">'+sts.map(function(s){ var a=subs[s.id]; return '<div class="sub-row" style="padding:6px 8px;"><div style="flex:1;min-width:0;"><strong style="font-size:13px;">'+escS(s.name)+'</strong><div class="text-xs text-muted">'+(s.code||'')+'</div></div><input type="number" class="form-input geHw-score" data-sid="'+s.id+'" min="0" max="'+max+'" style="width:90px;flex-shrink:0;text-align:center;font-weight:800;" placeholder="/'+max+'" value="'+(a&&a.score!=null?a.score:'')+'"></div>'; }).join('')+'</div>'+
  '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">'+
  '<button type="button" class="btn btn-secondary" style="flex:1;" onclick="LG.saveHwGrades(\''+hwId+'\',\'save\')">💾 حفظ فقط</button>'+
  '<button type="button" class="btn btn-primary" style="flex:1;" onclick="LG.saveHwGrades(\''+hwId+'\',\'publish\')">📢 حفظ + نشر</button>'+
  '<button type="button" class="btn btn-success" style="flex:1;" onclick="LG.saveHwGrades(\''+hwId+'\',\'approve\')">✅ اعتماد + نقاط</button></div></div>','modal-md');
};
EX.saveHwGrades=function(hwId,action){
  var d=db(); var h=(d.homework||[]).find(function(x){return x.id===hwId;}); if(!h) return;
  var max=h.totalPoints||20; var u=cur(); var nowIso=new Date().toISOString();
  d.submissions=d.submissions||[];
  var saved=[];
  document.querySelectorAll('.geHw-score').forEach(function(inp){
    if(inp.value==='') return;
    var sid=inp.getAttribute('data-sid');
    var v=Math.max(0,Math.min(max,+inp.value||0));
    var s=d.submissions.find(function(x){return x.homeworkId===hwId&&x.studentId===sid;});
    if(!s){ s={id:'sub_'+hwId+'_'+sid,homeworkId:hwId,studentId:sid,answers:[],paper:true}; d.submissions.push(s); }
    s.score=v; s.maxScore=max; s.status=(action==='approve')?'approved':'graded'; s.gradedBy=(u||{}).id||''; s.gradedAt=nowIso; s.submittedAt=s.submittedAt||nowIso;
    saved.push({sid:sid,score:v,s:s});
  });
  if(!saved.length){ toast('مفيش درجات مكتوبة','warning'); return; }
  if(action!=='save') h.releasedAt=h.releasedAt||nowIso;
  if(action==='approve') h.approvedAt=nowIso;
  saveD(d);
  saved.forEach(function(r){ cloudDoc('submissions',r.s); });
  cloudDoc('homework',h);
  if(action!=='save'){
    saved.forEach(function(r){
      if(!r.s.nPub){ r.s.nPub=1;
        var msg='📝 درجة واجب '+h.title+': '+r.score+'/'+max+' ('+Math.round(r.score/max*100)+'%)';
        try{ DataService.addNotification({targetUserId:r.sid,title:'📝 درجة واجب',message:msg,type:'grade',priority:'normal',meta:{event:'hw_new',score:r.score,max:max}}); }catch(e2){}
        notifyParents(r.sid,msg);
      }
    });
  }
  if(action==='approve'){
    saved.forEach(function(r){
      var pct=Math.round(r.score/max*100);
      if(pct>=75&&!r.s.pointsAwarded){ r.s.pointsAwarded=true; if(window.awardAcademicPoints){ try{ window.awardAcademicPoints(r.sid,'hw',r.score,max,h.title); }catch(e3){} } }
    });
    saveD(d);
  }
  toast(action==='save'?'💾 اتحفظ كمسودة':(action==='publish'?'📢 اتنشر':'✅ معتمد + النقاط مرة واحدة'),'success');
  setTimeout(function(){ EX.renderGradesPage(); EX.renderExamsPage(); },300);
};
function notifyParents(sid,msg){
  try{
    var s=DataService.getUserById?DataService.getUserById(sid):null; if(!s) return;
    var pp=String(s.parentPhone||'').replace(/\D/g,'');
    (DataService.getUsers?DataService.getUsers():[]).forEach(function(pu){
      if(pu.role!=='parent') return;
      var up=String(pu.phone||'').replace(/\D/g,'');
      if((pu.studentIds||[]).indexOf(sid)>=0||(pp&&up&&up===pp)){
        DataService.addNotification({targetUserId:pu.id,title:'📊 متابعة دراسية',message:msg+' (الطالب: '+s.name+')',type:'grade',priority:'normal',meta:{event:'general'}});
      }
    });
  }catch(e){}
}
/* ========== 🌐 مراجعة الأونلاين (امتحانات) ========== */
EX.openOnlineReview=function(examId){
  var d=db(); var e=(d.exams||[]).find(function(x){return x.id===examId;}); if(!e) return;
  var atts=(d.examAttempts||[]).filter(function(a){return a.examId===examId;}).sort(function(a,b){return String(b.submittedAt||'').localeCompare(String(a.submittedAt||''));});
  var html='<div class="filter-info">🌐 '+escS(e.title)+' · '+escS((gById(e.groupId)||{}).name||'')+'</div>'+
  '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;"><button type="button" class="btn btn-success btn-sm" onclick="LG.approveAllOnline(\''+examId+'\')">✅ اعتماد الكل ('+atts.filter(function(a){return a.status!=='approved';}).length+')</button>'+
  '<button type="button" class="btn btn-warning btn-sm" onclick="LG.openToppers(\'exam\',\''+examId+'\')">🏆 الأوائل</button>'+
  '<span class="badge badge-info">📩 '+atts.filter(function(a){return a.status!=='approved'&&a.score!=null;}).length+' منتظر</span>'+
  '<span class="badge badge-success">✅ '+atts.filter(function(a){return a.status==='approved';}).length+' معتمد</span></div>'+
  '<div style="max-height:50vh;overflow-y:auto;">'+atts.map(function(a){
    var s=DataService.getUserById?DataService.getUserById(a.studentId):null;
    var pct=a.score!=null?Math.round(a.score/(a.maxScore||100)*100):null;
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;min-width:0;"><strong>'+escS(s?s.name:'-')+'</strong><div class="text-xs text-muted">'+(a.status==='approved'?'✅ معتمد':(a.score!=null?'📩 منتظر الاعتماد':'⏳'))+(a.suspiciousActivities&&a.suspiciousActivities.length?' · ⚠️ '+a.suspiciousActivities.length:'')+'</div></div>'+
    (pct!=null?'<span class="grade-badge '+(pct>=75?'success':pct>=50?'warning':'danger')+'">'+a.score+'/'+(a.maxScore||100)+'</span>':'')+
    '<button type="button" class="btn btn-ghost btn-sm" onclick="LG.viewAttemptDetails(\''+a.id+'\')">👁 الحل</button>'+
    (a.status!=='approved'?'<button type="button" class="btn btn-success btn-sm" onclick="LG.approveOne(\''+a.id+'\')">✅</button>':'')+
    (s&&s.phone?'<button type="button" class="btn btn-ghost btn-sm" onclick="LG.waStudent(\''+a.id+'\')">📤</button>':'')+
    '<button type="button" class="btn btn-ghost btn-sm" onclick="LG.waParent(\''+a.id+'\')">👨‍👩</button>'+
    ((a.suspiciousActivities&&a.suspiciousActivities.length)?'<button type="button" class="btn btn-warning btn-sm" onclick="LG.viewSuspicious(\''+a.id+'\')">⚠️</button>':'')+
    '</div>';
  }).join('')+'</div>';
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🌐 مراجعة أونلاين</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+html+'</div>','modal-md');
};
function resultMsg(a,e){
  var pct=a.score!=null?Math.round(a.score/(a.maxScore||100)*100):0;
  return '🎓 نتيجة '+e.title+': '+(a.score!=null?a.score+'/'+(a.maxScore||100)+' ('+pct+'%)':'قيد المراجعة')+(a.rank?' · ترتيبك: '+a.rank+' من '+a.rankTotal:'');
}
/* ========== 👁 حل الطالب — تصميم جديد (دايرة نسبة + كروت ملونة) ========== */
EX.viewAttemptDetails=function(attId){
  var d=db(); var a=(d.examAttempts||[]).find(function(x){return x.id===attId;}); if(!a) return;
  var e=(d.exams||[]).find(function(x){return x.id===a.examId;}); if(!e) return;
  var s=DataService.getUserById?DataService.getUserById(a.studentId):null;
  var g=gById(e.groupId);
  var max=a.maxScore||e.totalPoints||100;
  var pct=a.score!=null?Math.round(a.score/max*100):0;
  var col=pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)';
  var grp=(d.examAttempts||[]).filter(function(x){return x.examId===e.id&&x.score!=null;}).sort(function(x,y){return y.score-x.score;});
  var rG=grp.findIndex(function(x){return x.studentId===a.studentId;})+1;
  var gradeGids={}; (DataService.getGroups?DataService.getGroups():[]).forEach(function(x){ if(g&&x.grade===g.grade) gradeGids[x.id]=1; });
  var grL=(d.examAttempts||[]).filter(function(x){return x.score!=null&&(d.exams||[]).some(function(ex2){return ex2.id===x.examId&&gradeGids[ex2.groupId];});}).sort(function(x,y){return y.score-x.score;});
  var rGr=grL.findIndex(function(x){return x.studentId===a.studentId;})+1;
  var head='<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:linear-gradient(135deg,var(--primary-bg),transparent);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:12px;">'+
    '<div style="width:86px;height:86px;border-radius:50%;background:conic-gradient('+col+' '+pct+'%,var(--surface-hover) 0);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><div style="width:64px;height:64px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;font-weight:900;font-family:var(--font-en);font-size:15px;color:'+col+';">'+pct+'%</div></div>'+
    '<div style="flex:1;min-width:150px;"><strong style="font-size:15px;">'+escS(e.title)+'</strong><div class="text-xs text-muted" style="margin:4px 0;">👤 '+escS(s?s.name:'-')+' · 👥 '+escS(g?g.name:'-')+'</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;"><span class="badge badge-info">🎯 '+a.score+'/'+max+'</span><span class="badge badge-success">👥 #'+(rG||'-')+'/'+grp.length+'</span><span class="badge badge-warning">🎓 #'+(rGr||'-')+'/'+grL.length+'</span>'+((a.suspiciousActivities||[]).length?'<span class="badge badge-danger">⚠️ '+a.suspiciousActivities.length+'</span>':'')+'</div></div></div>';
  var qs=(e.questions||[]).map(function(q,i){
    var ans=(a.answers||[]).find(function(x){return x.questionId===q.id;});
    var val=ans?ans.answer:'';
    var corr=(q.correct!=null&&q.correct!=='')?q.correct:q.correctAnswer;
    var manual=(q.type==='essay'||q.type==='short');
    var ok=!manual&&(String(val).trim()===String(corr).trim()||(q.options&&q.options[corr]&&String(val).trim()===String(q.options[corr]).trim()));
    var bc=manual?'var(--primary)':(ok?'var(--success)':'var(--danger)');
    var h='<div class="card" style="padding:12px;margin-bottom:10px;border-right:4px solid '+bc+';">'+
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px;"><div style="flex:1;"><span style="display:inline-flex;width:26px;height:26px;border-radius:8px;background:'+bc+';color:#fff;align-items:center;justify-content:center;font-weight:900;font-family:var(--font-en);font-size:12px;margin-inline-end:6px;">'+(i+1)+'</span><strong style="font-size:13px;">'+escS(q.text||'')+'</strong></div><span class="badge badge-muted">'+(manual?'✍️ مقالي':(ok?'✓ صحيحة':'✗ غلط'))+' · '+(q.points||1)+' د</span></div>';
    if(q.type==='mcq'){
      h+='<div style="display:grid;gap:4px;">'+(q.options||[]).map(function(o,oi){
        var mine=String(val)===String(oi), cr=String(corr)===String(oi);
        var bg=mine?(cr?'var(--success-bg)':'var(--danger-bg)'):(cr?'var(--success-bg)':'var(--surface-hover)');
        var bd=mine?(cr?'var(--success)':'var(--danger)'):(cr?'var(--success)':'var(--border)');
        return '<div style="padding:7px 10px;border-radius:9px;background:'+bg+';border:1.5px solid '+bd+';font-size:12px;">'+(mine?'👈 ':'• ')+escS(o||'')+(mine?' <b>(إجابته)</b>':'')+(cr&&!mine?' <b style="color:var(--success);">(الصحيحة)</b>':'')+'</div>';
      }).join('')+'</div>';
    }else if(q.type==='truefalse'){
      h+='<div style="display:flex;gap:6px;flex-wrap:wrap;"><span class="badge '+(val==='true'?'badge-success':'badge-danger')+'">إجابته: '+(val==='true'?'✓ صح':'✗ خطأ')+'</span><span class="badge badge-success">الصحيحة: '+((corr===true||corr==='true')?'✓ صح':'✗ خطأ')+'</span></div>';
    }else{
      h+='<div style="background:var(--surface-hover);border-radius:10px;padding:10px;font-size:12px;white-space:pre-wrap;">'+escS(val||'(لا إجابة)')+'</div>';
    }
    if(ans&&ans.answerImages&&ans.answerImages.length){
      h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">'+ans.answerImages.map(function(im){return '<img src="'+im+'" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:2px solid '+bc+';">';}).join('')+'</div>';
    }
    return h+'</div>';
  }).join('');
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">👁 حل الطالب</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body" style="max-height:72vh;overflow-y:auto;">'+head+(qs||'<p class="text-muted">لا أسئلة</p>')+'</div>','modal-lg');
};
EX.approveOne=function(attId){
  var d=db(); var a=(d.examAttempts||[]).find(function(x){return x.id===attId;}); if(!a) return;
  var e=(d.exams||[]).find(function(x){return x.id===a.examId;}); if(!e) return;
  a.status='approved'; a.releasedAt=a.releasedAt||new Date().toISOString(); a.visibleToStudent=(e.showGrade!==false);
  var pct=Math.round((a.score||0)/(a.maxScore||100)*100);
  if(pct>=75&&!a.pointsAwarded){ a.pointsAwarded=true; if(window.awardAcademicPoints){ try{ window.awardAcademicPoints(a.studentId,'exam',a.score,a.maxScore,e.title); }catch(e2){} } }
  if(!a.nApp){ a.nApp=1; if(e.showGrade!==false){ try{ DataService.addNotification({targetUserId:a.studentId,title:'✅ نتيجتك اتعمدت',message:resultMsg(a,e),type:'grade',priority:'high',meta:{event:'exam_new',score:a.score,max:a.maxScore}}); }catch(e3){} notifyParents(a.studentId,resultMsg(a,e)); } }
  saveD(d); cloudDoc('examAttempts',a);
  toast('✅ اتعمدت نتيجة '+((DataService.getUserById?DataService.getUserById(a.studentId):null)||{}).name,'success');
  EX.openOnlineReview(e.id);
};
EX.approveAllOnline=function(examId){
  var d=db();
  var list=(d.examAttempts||[]).filter(function(a){return a.examId===examId&&a.status!=='approved';});
  if(!list.length){ toast('مفيش معلق','info'); return; }
  list.forEach(function(a){ EX.approveOne(a.id); });
};
EX.viewSuspicious=function(attId){
  var d=db(); var a=(d.examAttempts||[]).find(function(x){return x.id===attId;}); if(!a) return;
  var s=DataService.getUserById?DataService.getUserById(a.studentId):null;
  var list=a.suspiciousActivities||[];
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📋 ملاحظات: '+escS(s?s.name:'-')+'</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  (list.length?list.map(function(it,i){
    var icon=it.type==='violation'?'⚠️':it.type==='long_time'?'⏱️':'📝';
    return '<div class="sub-row" style="padding:10px;"><div style="flex:1;"><strong>'+icon+' '+escS(it.reason||it.type||'ملاحظة')+'</strong>'+(it.question?'<div class="text-xs text-muted">سؤال: '+escS(it.question)+'</div>':'')+'<div class="text-xs text-muted">🕐 '+(it.at?new Date(it.at).toLocaleString('ar-EG'):'')+'</div></div><span class="badge badge-muted">#'+(i+1)+'</span></div>';
  }).join(''):'<p class="text-muted">مفيش ملاحظات</p>')+'</div>','modal-md');
};
EX.waStudent=function(attId){
  var d=db(); var a=(d.examAttempts||[]).find(function(x){return x.id===attId;}); if(!a) return;
  var s=DataService.getUserById?DataService.getUserById(a.studentId):null; if(!s||!s.phone){ toast('مفيش رقم للطالب','warning'); return; }
  var e=(d.exams||[]).find(function(x){return x.id===a.examId;});
  window.open(waLink(s.phone,resultMsg(a,e||{title:''})),'_blank');
};
EX.waParent=function(attId){
  var d=db(); var a=(d.examAttempts||[]).find(function(x){return x.id===attId;}); if(!a) return;
  var s=DataService.getUserById?DataService.getUserById(a.studentId):null; if(!s||!s.parentPhone){ toast('مفيش رقم ولي أمر','warning'); return; }
  var e=(d.exams||[]).find(function(x){return x.id===a.examId;});
  window.open(waLink(s.parentPhone,resultMsg(a,e||{title:''})+' (الطالب: '+s.name+')'),'_blank');
};

/* ========== 🌐 مراجعة الواجب الأونلاين ========== */
EX.openHwReview=function(hwId){
  var d=db(); var h=(d.homework||[]).find(function(x){return x.id===hwId;}); if(!h) return;
  var subs=(d.submissions||[]).filter(function(s){return s.homeworkId===hwId;}).sort(function(a,b){return String(b.submittedAt||'').localeCompare(String(a.submittedAt||''));});
  var html='<div class="filter-info">🌐 واجب: '+escS(h.title)+' · '+escS((gById(h.groupId)||{}).name||'')+'</div>'+
  '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;"><button type="button" class="btn btn-warning btn-sm" onclick="LG.openToppers(\'hw\',\''+hwId+'\')">🏆 الأوائل</button>'+
  '<span class="badge badge-info">📩 '+subs.filter(function(s){return s.status!=='approved';}).length+' منتظر</span>'+
  '<span class="badge badge-success">✅ '+subs.filter(function(s){return s.status==='approved';}).length+' معتمد</span></div>'+
  '<div style="max-height:50vh;overflow-y:auto;">'+(subs.length?subs.map(function(s){
    var st=DataService.getUserById?DataService.getUserById(s.studentId):null;
    var pct=s.score!=null?Math.round(s.score/(s.maxScore||h.totalPoints||20)*100):null;
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;min-width:0;"><strong>'+escS(st?st.name:'-')+'</strong><div class="text-xs text-muted">'+(s.status==='approved'?'✅ معتمد':(s.status==='graded'?'📝 مرصود':'⏳ مسلّم'))+(s.answerImages&&s.answerImages.length?' · 📸 '+s.answerImages.length:'')+'</div></div>'+
    (pct!=null?'<span class="grade-badge '+(pct>=75?'success':pct>=50?'warning':'danger')+'">'+s.score+'/'+(s.maxScore||h.totalPoints)+'</span>':'')+
    '<button type="button" class="btn btn-ghost btn-sm" onclick="LG.viewSubmissionDetails(\''+s.id+'\')">👁 الحل</button>'+
    (s.status!=='approved'?'<button type="button" class="btn btn-success btn-sm" onclick="LG.approveHwOne(\''+s.id+'\')">✅</button>':'')+
    (st&&st.phone?'<button type="button" class="btn btn-ghost btn-sm" onclick="LG.waHwStudent(\''+s.id+'\')">📤</button>':'')+
    '<button type="button" class="btn btn-ghost btn-sm" onclick="LG.waHwParent(\''+s.id+'\')">👨‍👩‍</button></div>';
  }).join(''):'<p class="text-muted">مفيش تسليمات لسه</p>')+'</div>';
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🌐 مراجعة واجب أونلاين</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+html+'</div>','modal-md');
};

/* ========== 🛡️ سدّ أي دالة ناقصة (بتتعرف بس لو مش موجودة — مش بتكتب فوق شغال) ========== */
if(typeof EX.approveHwOne!=='function'){
EX.approveHwOne=function(subId){
  var d=db(); var s=(d.submissions||[]).find(function(x){return x.id===subId;}); if(!s) return;
  var h=(d.homework||[]).find(function(x){return x.id===s.homeworkId;}); if(!h) return;
  s.status='approved'; s.releasedAt=s.releasedAt||new Date().toISOString();
  var mx=s.maxScore||h.totalPoints||20;
  var pct=Math.round((s.score||0)/mx*100);
  if(pct>=75&&!s.pointsAwarded){ s.pointsAwarded=true; if(window.awardAcademicPoints){ try{ window.awardAcademicPoints(s.studentId,'hw',s.score,mx,h.title); }catch(e){} } }
  if(!s.nApp){ s.nApp=1; var msg='📝 درجة واجب '+h.title+': '+s.score+'/'+mx+' ('+pct+'%)';
    try{ DataService.addNotification({targetUserId:s.studentId,title:'✅ درجة واجب اتعمدت',message:msg,type:'grade',priority:'normal',meta:{event:'hw_new',score:s.score,max:mx}}); }catch(e2){}
    notifyParents(s.studentId,msg); }
  saveD(d); cloudDoc('submissions',s);
  toast('✅ اتعمدت','success');
  EX.openHwReview(h.id);
};
}
if(typeof EX.waHwStudent!=='function'){
EX.waHwStudent=function(subId){
  var d=db(); var s=(d.submissions||[]).find(function(x){return x.id===subId;}); if(!s) return;
  var st=DataService.getUserById?DataService.getUserById(s.studentId):null; if(!st||!st.phone){ toast('مفيش رقم','warning'); return; }
  var h=(d.homework||[]).find(function(x){return x.id===s.homeworkId;});
  window.open(waLink(st.phone,'📝 درجة واجب '+(h?h.title:'')+': '+s.score+'/'+(s.maxScore||(h?h.totalPoints:20))),'_blank');
};
}
if(typeof EX.waHwParent!=='function'){
EX.waHwParent=function(subId){
  var d=db(); var s=(d.submissions||[]).find(function(x){return x.id===subId;}); if(!s) return;
  var st=DataService.getUserById?DataService.getUserById(s.studentId):null; if(!st||!st.parentPhone){ toast('مفيش رقم ولي أمر','warning'); return; }
  var h=(d.homework||[]).find(function(x){return x.id===s.homeworkId;});
  window.open(waLink(st.parentPhone,'📝 درجة واجب '+(h?h.title:'')+' للطالب '+st.name+': '+s.score+'/'+(s.maxScore||(h?h.totalPoints:20))),'_blank');
};
}
if(typeof EX.viewSubmissionDetails!=='function'){
EX.viewSubmissionDetails=function(subId){
  var d=db(); var s=(d.submissions||[]).find(function(x){return x.id===subId;}); if(!s) return;
  var h=(d.homework||[]).find(function(x){return x.id===s.homeworkId;}); if(!h) return;
  var st=DataService.getUserById?DataService.getUserById(s.studentId):null;
  var g=gById(h.groupId);
  var max=s.maxScore||h.totalPoints||20;
  var pct=s.score!=null?Math.round(s.score/max*100):0;
  var col=s.score!=null?(pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)'):'var(--text-muted)';
  var grp=(d.submissions||[]).filter(function(x){return x.homeworkId===h.id&&x.score!=null;}).sort(function(a,b){return b.score-a.score;});
  var rG=grp.findIndex(function(x){return x.studentId===s.studentId;})+1;
  var head='<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:linear-gradient(135deg,var(--success-bg),transparent);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:12px;">'+
    '<div style="width:86px;height:86px;border-radius:50%;background:conic-gradient('+col+' '+pct+'%,var(--surface-hover) 0);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><div style="width:64px;height:64px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;font-weight:900;font-family:var(--font-en);font-size:15px;color:'+col+';">'+(s.score!=null?pct+'%':'—')+'</div></div>'+
    '<div style="flex:1;min-width:150px;"><strong style="font-size:15px;">'+escS(h.title)+'</strong><div class="text-xs text-muted" style="margin:4px 0;">👤 '+escS(st?st.name:'-')+' · 👥 '+escS(g?g.name:'-')+'</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;"><span class="badge badge-info">🎯 '+s.score+'/'+max+'</span><span class="badge badge-success">👥 #'+(rG||'-')+'/'+grp.length+'</span><span class="badge badge-muted">📸 '+(s.answerImages||[]).length+' صورة</span></div></div></div>';
  var imgs=(s.answerImages&&s.answerImages.length)?'<h4 style="margin:10px 0 6px;">📸 صور الحل</h4><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px;">'+s.answerImages.map(function(im){return '<img src="'+im+'" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;border:2px solid var(--success);">';}).join('')+'</div>':'';
  var txt=(s.answers&&s.answers.length)?'<h4 style="margin:10px 0 6px;">✍️ الإجابات</h4>'+s.answers.map(function(a,i){return '<div class="card" style="padding:10px;margin-bottom:6px;"><strong class="text-xs">س'+(i+1)+'</strong><div style="margin-top:4px;font-size:12px;white-space:pre-wrap;">'+escS(a.answer||'(فارغة)')+'</div>'+((a.answerImages&&a.answerImages.length)?'<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;">'+a.answerImages.map(function(im){return '<img src="'+im+'" style="width:44px;height:44px;object-fit:cover;border-radius:6px;">';}).join('')+'</div>':'')+'</div>';}).join(''):'';
  var note=s.note?'<div class="filter-info" style="margin-top:8px;">📝 ملاحظات: '+escS(s.note)+'</div>':'';
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">👁 حل الواجب</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body" style="max-height:72vh;overflow-y:auto;">'+head+imgs+txt+note+'</div>','modal-lg');
};
}
if(typeof EX.openToppers!=='function'){
EX.openToppers=function(kind,id){
  var d=db();
  var rec=(kind==='exam'?(d.exams||[]):(d.homework||[])).find(function(x){return x.id===id;}); if(!rec) return;
  var col=(kind==='exam'?(d.examAttempts||[]):(d.submissions||[]));
  var key=(kind==='exam'?'examId':'homeworkId');
  var g=gById(rec.groupId);
  var max0=rec.totalPoints||100;
  function medal(i){ return i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.'; }
  function row(a,i){
    var s=DataService.getUserById?DataService.getUserById(a.studentId):null;
    var mx=a.maxScore||max0; var pct=Math.round((a.score||0)/mx*100);
    var c=pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)';
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;min-width:0;"><strong style="font-size:13px;">'+medal(i)+' '+escS(s?s.name:'-')+'</strong><div class="text-xs text-muted">'+escS((s&&s.code)||'')+' · '+escS((s&&s.grade)||'')+'</div></div><span class="grade-badge" style="background:'+c+';color:#fff;">'+a.score+'/'+mx+' · '+pct+'%</span></div>';
  }
  var grp=col.filter(function(x){return x[key]===id&&x.score!=null;}).sort(function(a,b){return b.score-a.score;});
  var famIds={};
  if(rec.familyId){ (kind==='exam'?(d.exams||[]):(d.homework||[])).forEach(function(x){ if(x.familyId===rec.familyId) famIds[x.id]=1; }); }
  else { var grade=g?g.grade:''; (kind==='exam'?(d.exams||[]):(d.homework||[])).forEach(function(x){ var xg=gById(x.groupId); if(xg&&grade&&xg.grade===grade&&x.title===rec.title) famIds[x.id]=1; }); }
  var best={};
  col.forEach(function(x){ if(!famIds[x[key]]||x.score==null) return; if(!best[x.studentId]||x.score>best[x.studentId].score) best[x.studentId]=x; });
  var grL=Object.keys(best).map(function(k){return best[k];}).sort(function(a,b){return b.score-a.score;});
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🏆 الأوائل: '+escS(rec.title)+'</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
   '<div style="display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:10px;"><button class="tab-btn active" onclick="window.__tpTab(this,\'g\')">👥 المجموعة ('+grp.length+')</button><button class="tab-btn" onclick="window.__tpTab(this,\'gr\')">🎓 الصف ('+grL.length+')</button></div>'+
   '<div id="tp-g" style="max-height:50vh;overflow:auto;">'+(grp.length?grp.slice(0,20).map(row).join(''):'<p class="text-muted">لا درجات مرصودة</p>')+'</div>'+
   '<div id="tp-gr" style="display:none;max-height:50vh;overflow:auto;">'+(grL.length?grL.slice(0,20).map(row).join(''):'<p class="text-muted">لا درجات لهذا الصف</p>')+'</div></div>','modal-md');
  window.__tpTab=function(btn,t){ btn.parentNode.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');}); btn.classList.add('active'); document.getElementById('tp-g').style.display=(t==='g'?'':'none'); document.getElementById('tp-gr').style.display=(t==='gr'?'':'none'); };
};
}
if(typeof EX.openGradeLeaderboard!=='function'){
EX.openGradeLeaderboard=function(){
  var d=db();
  var grades={}; myGroups().forEach(function(g){ if(g.grade) grades[g.grade]=1; });
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🏆 أوائل الصفوف</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
   '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">'+
   '<div class="form-group"><label>🎓 الصف</label><select id="lbGrade" class="form-select">'+Object.keys(grades).map(function(g){return '<option value="'+g+'">'+g+'</option>';}).join('')+'</select></div>'+
   '<div class="form-group"><label>📚 النوع</label><select id="lbType" class="form-select"><option value="all">الكل</option><option value="online">🌐 أونلاين</option><option value="offline">📄 أوفلاين</option></select></div>'+
   '<div class="form-group"><label>🔢 أقل عدد تقييمات</label><input type="number" id="lbMin" class="form-input" value="1" min="1"></div></div>'+
   '<button class="btn btn-primary w-full" onclick="window.__lbRun()">🏆 اعرض الترتيب</button><div id="lbOut" style="margin-top:12px;max-height:50vh;overflow:auto;"></div></div>','modal-md');
  window.__lbRun=function(){
    var grade=(document.getElementById('lbGrade')||{}).value;
    var type=(document.getElementById('lbType')||{}).value;
    var minN=parseInt((document.getElementById('lbMin')||{}).value)||1;
    var gids={}; (DataService.getGroups?DataService.getGroups():[]).forEach(function(g){ if(g.grade===grade) gids[g.id]=1; });
    function rel(rec,att){ return att&&(att.status==='approved'||att.autoGraded||((rec.releasePolicy||'approve')==='instant'&&att.score!=null)); }
    var per={};
    function push(sid,pct,pts){ per[sid]=per[sid]||{sum:0,n:0,pts:0}; per[sid].sum+=pct; per[sid].n++; per[sid].pts+=pts; }
    (d.exams||[]).forEach(function(e){ if(!gids[e.groupId]) return; var off=(e.mode==='offline'||!!e.paper); if(type!=='all'&&(type==='offline')!==off) return;
      (d.examAttempts||[]).forEach(function(a){ if(a.examId===e.id&&a.score!=null&&rel(e,a)) push(a.studentId, a.score/(a.maxScore||e.totalPoints||100), a.score); }); });
    (d.homework||[]).forEach(function(h){ if(!gids[h.groupId]) return; var off=!!h.paper; if(type!=='all'&&(type==='offline')!==off) return;
      (d.submissions||[]).forEach(function(s){ if(s.homeworkId===h.id&&s.score!=null&&rel(h,s)) push(s.studentId, s.score/(s.maxScore||h.totalPoints||20), s.score); }); });
    var list=Object.keys(per).map(function(sid){ var v=per[sid]; return {sid:sid,avg:v.sum/v.n,n:v.n,pts:v.pts}; }).filter(function(r){return r.n>=minN;}).sort(function(a,b){ return b.avg-a.avg||b.n-a.n||b.pts-a.pts; });
    document.getElementById('lbOut').innerHTML=list.length?list.slice(0,25).map(function(r,i){
      var s=DataService.getUserById?DataService.getUserById(r.sid):null;
      var pct=Math.round(r.avg*100);
      var c=pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)';
      return '<div class="sub-row" style="padding:8px;"><div style="flex:1;min-width:0;"><strong style="font-size:13px;">'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.')+' '+escS(s?s.name:'-')+'</strong><div class="text-xs text-muted">'+escS((s&&s.code)||'')+' · '+r.n+' تقييم · '+Math.round(r.pts)+' نقطة مجموع</div></div><span class="grade-badge" style="background:'+c+';color:#fff;">'+pct+'%</span></div>';
    }).join(''):'<p class="text-muted">لا درجات معتمدة كافية</p>';
  };
};
}

EX.approveHwOne=function(subId){
  var d=db(); var s=(d.submissions||[]).find(function(x){return x.id===subId;}); if(!s) return;
  var h=(d.homework||[]).find(function(x){return x.id===s.homeworkId;}); if(!h) return;
  s.status='approved'; s.releasedAt=s.releasedAt||new Date().toISOString();
  var pct=Math.round((s.score||0)/(s.maxScore||h.totalPoints||20)*100);
  if(pct>=75&&!s.pointsAwarded){ s.pointsAwarded=true; if(window.awardAcademicPoints){ try{ window.awardAcademicPoints(s.studentId,'hw',s.score,s.maxScore||h.totalPoints,h.title); }catch(e){} } }
  if(!s.nApp){ s.nApp=1; var msg='📝 درجة واجب '+h.title+': '+s.score+'/'+(s.maxScore||h.totalPoints)+' ('+pct+'%)'; try{ DataService.addNotification({targetUserId:s.studentId,title:'✅ درجة واجب اعتمدت',message:msg,type:'grade',priority:'normal',meta:{event:'hw_new'}}); }catch(e2){} notifyParents(s.studentId,msg); }
  saveD(d); cloudDoc('submissions',s);
  toast('✅ اعتمدت','success');
  EX.openHwReview(h.id);
};
EX.viewSubmissionDetails=function(subId){
  var d=db(); var s=(d.submissions||[]).find(function(x){return x.id===subId;}); if(!s) return;
  var h=(d.homework||[]).find(function(x){return x.id===s.homeworkId;}); if(!h) return;
  var st=DataService.getUserById?DataService.getUserById(s.studentId):null;
  var g=gById(h.groupId);
  var max=s.maxScore||h.totalPoints||20;
  var pct=s.score!=null?Math.round(s.score/max*100):0;
  var col=s.score!=null?(pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)'):'var(--text-muted)';
  var grp=(d.submissions||[]).filter(function(x){return x.homeworkId===h.id&&x.score!=null;}).sort(function(a,b){return b.score-a.score;});
  var rG=grp.findIndex(function(x){return x.studentId===s.studentId;})+1;
  var head='<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:linear-gradient(135deg,var(--success-bg),transparent);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:12px;">'+
    '<div style="width:86px;height:86px;border-radius:50%;background:conic-gradient('+col+' '+pct+'%,var(--surface-hover) 0);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><div style="width:64px;height:64px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;font-weight:900;font-family:var(--font-en);font-size:15px;color:'+col+';">'+(s.score!=null?pct+'%':'—')+'</div></div>'+
    '<div style="flex:1;min-width:150px;"><strong style="font-size:15px;">'+escS(h.title)+'</strong><div class="text-xs text-muted" style="margin:4px 0;">👤 '+escS(st?st.name:'-')+' · 👥 '+escS(g?g.name:'-')+'</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;"><span class="badge badge-info">🎯 '+s.score+'/'+max+'</span><span class="badge badge-success">👥 #'+(rG||'-')+'/'+grp.length+'</span><span class="badge badge-muted">📸 '+(s.answerImages||[]).length+' صورة</span></div></div></div>';
  var imgs=(s.answerImages&&s.answerImages.length)?'<h4 style="margin:10px 0 6px;">📸 صور الحل</h4><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px;">'+s.answerImages.map(function(im){return '<img src="'+im+'" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;border:2px solid var(--success);">';}).join('')+'</div>':'';
  var txt=(s.answers&&s.answers.length)?'<h4 style="margin:10px 0 6px;">✍️ الإجابات النصية</h4>'+s.answers.map(function(a,i){return '<div class="card" style="padding:10px;margin-bottom:6px;"><strong class="text-xs">س'+(i+1)+'</strong><div style="margin-top:4px;font-size:12px;white-space:pre-wrap;">'+escS(a.answer||'(فارغة)')+'</div></div>';}).join(''):'';
  var note=s.note?'<div class="filter-info" style="margin-top:8px;">📝 ملاحظات: '+escS(s.note)+'</div>':'';
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">👁 حل الواجب</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body" style="max-height:72vh;overflow-y:auto;">'+head+imgs+txt+note+'</div>','modal-lg');
};

EX.waHwStudent=function(subId){
  var d=db(); var s=(d.submissions||[]).find(function(x){return x.id===subId;}); if(!s) return;
  var st=DataService.getUserById?DataService.getUserById(s.studentId):null; if(!st||!st.phone){ toast('مفيش رقم','warning'); return; }
  var h=(d.homework||[]).find(function(x){return x.id===s.homeworkId;});
  window.open(waLink(st.phone,'📝 درجة واجب '+(h?h.title:'')+': '+s.score+'/'+(s.maxScore||h.totalPoints||20)),'_blank');
};
EX.waHwParent=function(subId){
  var d=db(); var s=(d.submissions||[]).find(function(x){return x.id===subId;}); if(!s) return;
  var st=DataService.getUserById?DataService.getUserById(s.studentId):null; if(!st||!st.parentPhone){ toast('مفيش رقم ولي أمر','warning'); return; }
  var h=(d.homework||[]).find(function(x){return x.id===s.homeworkId;});
  window.open(waLink(st.parentPhone,'📝 درجة واجب '+(h?h.title:'')+' للطالب '+st.name+': '+s.score+'/'+(s.maxScore||(h?h.totalPoints:20))),'_blank');
};

/* ========== 🌐 منشئ أونلاين (بينشئ ويعدّل) ========== */
var QB=[]; window.QB=QB;
function qRow(i){
  var q=QB[i];
  return '<div class="card" style="padding:10px;margin-bottom:8px;">'+
  '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;"><strong style="font-size:12px;">س'+(i+1)+'</strong>'+
  '<select class="form-select" style="width:110px;padding:6px;" onchange="QB['+i+'].type=this.value;LG.qRefresh()">'+['mcq','truefalse','essay'].map(function(t){return '<option value="'+t+'" '+(q.type===t?'selected':'')+'>'+({mcq:'اختياري',truefalse:'صح/خطأ',essay:'مقالي'})[t]+'</option>';}).join('')+'</select>'+
  '<input type="number" class="form-input" style="width:80px;padding:6px;" value="'+(q.points||1)+'" min="1" onchange="QB['+i+'].points=+this.value" title="درجات السؤال">'+
  '<button type="button" class="btn btn-danger btn-sm" onclick="QB.splice('+i+',1);LG.qRefresh()">🗑</button></div>'+
  '<input class="form-input" style="margin-bottom:6px;" placeholder="نص السؤال *" value="'+escS(q.text||'')+'" oninput="QB['+i+'].text=this.value">'+
  (q.type==='mcq'?'<div style="display:flex;flex-direction:column;gap:4px;">'+(q.options||[]).map(function(o,oi){ return '<div style="display:flex;gap:4px;"><input type="radio" name="qbc'+i+'" '+(q.correct===oi?'checked':'')+' onchange="QB['+i+'].correct='+oi+'" title="الإجابة الصحيحة"><input class="form-input" style="padding:6px;" value="'+escS(o||'')+'" oninput="QB['+i+'].options['+oi+']=this.value"></div>'; }).join('')+'<button type="button" class="btn btn-ghost btn-sm" onclick="QB['+i+'].options=QB['+i+'].options||[];QB['+i+'].options.push(\'\');LG.qRefresh()">+ خيار</button></div>':'')+
  (q.type==='truefalse'?'<div class="text-xs text-muted">الإجابة: <label><input type="radio" name="qtf'+i+'" '+(q.correct==='true'?'checked':'')+' onchange="QB['+i+'].correct=\'true\'">صح</label> <label><input type="radio" name="qtf'+i+'" '+(q.correct==='false'?'checked':'')+' onchange="QB['+i+'].correct=\'false\'">خطأ</label></div>':'')+
  (q.type==='essay'?'<div class="text-xs text-muted">✍️ مقالي — مراجعة يدوية</div>':'')+
  '</div>';
}
EX.qRefresh=function(){
  var host=document.getElementById('qbList'); if(host) host.innerHTML=QB.length?QB.map(function(q,i){return qRow(i);}).join(''):'<p class="text-muted">مفيش أسئلة — دوس + سؤال</p>';
  var tot=document.getElementById('qbTotal'); if(tot) tot.textContent=QB.reduce(function(s,q){return s+(+q.points||0);},0);
};
EX.openOnlineBuilder=function(kind,meta,editId){
  meta=meta||{}; QB.length=0;
  var editRec=null;
  if(editId){ editRec=(kind==='ex'?(db().exams||[]):(db().homework||[])).find(function(x){return x.id===editId;})||null; if(editRec)(editRec.questions||[]).forEach(function(q){ QB.push(JSON.parse(JSON.stringify(q))); }); }
  var groups=myGroups();
  var grades=[]; groups.forEach(function(g){ if(g.grade&&grades.indexOf(g.grade)<0) grades.push(g.grade); });
  var gNum=function(v){ var m=String(v).match(/(\d+)/); return m?parseInt(m[1]):99; };
  grades.sort(function(a,b){ return gNum(a)-gNum(b); });
  function head(t){ return '<div class="modal-header"><h3 class="modal-title">'+t+'</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'; }
  ThemeManager.openModal(head((editRec?'✏️ تعديل: ':'🌐 بناء ')+(kind==='ex'?'امتحان':'واجب')+' أونلاين')+
  '<div class="form-group"><label>العنوان *</label><input id="qbTitle" class="form-input" value="'+(editRec?escS(editRec.title||''):'')+'"></div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
  '<div class="form-group"><label>🎯 الإسناد</label><select id="qbTarget" class="form-select" onchange="LG.qbTarget()" '+(editRec?'disabled':'')+'><option value="group">مجموعة</option><option value="grade">صف كامل</option></select></div>'+
  '<div class="form-group"><label>👥 المجموعة / 📚 الصف</label><select id="qbGroup" class="form-select" '+(editRec?'disabled':'')+'>'+groups.map(function(g){return '<option value="'+g.id+'" '+(editRec&&editRec.groupId===g.id?'selected':'')+'>'+escS(g.name)+(g.grade?' · '+escS(g.grade):'')+'</option>';}).join('')+'</select><select id="qbGrade" class="form-select" style="display:none;margin-top:6px;" '+(editRec?'disabled':'')+'>'+grades.map(function(g){return '<option value="'+g+'">'+g+'</option>';}).join('')+'</select></div></div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">'+
  '<div class="form-group"><label>⏱️ المدة (دقائق)</label><input type="number" id="qbDur" class="form-input" value="'+(editRec?editRec.duration||30:(kind==='ex'?30:60))+'" min="0"></div>'+
  '<div class="form-group"><label>⏱️ زمن السؤال (ث)</label><input type="number" id="qbPQ" class="form-input" value="'+(editRec?editRec.perQuestionSec||0:(meta.perQuestionSec||0))+'" min="0"></div>'+
  '<div class="form-group"><label>🔁 محاولات</label><input type="number" id="qbAtt" class="form-input" value="'+(editRec?editRec.maxAttempts||1:1)+'" min="1"></div></div>'+
    '<div class="form-group"><label>📸 صور حل الطلاب</label><select id="qbImgs" class="form-select"><option value="auto">🖼️ فقط لو الورقة مرفقة كصورة</option><option value="yes">✅ السماح دايماً برفع صور</option><option value="no">🚫 منع رفع الصور</option></select></div>'+
  '<div class="form-group"><label>👁️ سياسة إظهار الدرجة</label><select id="qbShow" class="form-select"><option value="approve" '+((!editRec||(editRec.releasePolicy||'approve')==='approve')?'selected':'')+'>🔒 تظهر للطالب بعد اعتماد الإدارة</option><option value="instant" '+(editRec&&editRec.releasePolicy==='instant'?'selected':'')+'>⚡ تظهر للطالب فوراً بعد التسليم</option></select></div>'+
  '<div class="filter-info">❓ الأسئلة ('+QB.length+') — الدرجة الكلية: <strong id="qbTotal">0</strong></div>'+
  '<div id="qbList" style="max-height:34vh;overflow-y:auto;"></div>'+
  '<button type="button" class="btn btn-ghost btn-sm" onclick="QB.push({id:\'q\'+Date.now()+Math.random().toString(36).slice(2,6),type:\'mcq\',options:[\'\',\'\',\'\',\'\'],correct:0,points:1,text:\'\'});LG.qRefresh()">+ سؤال</button>'+
  '<button type="button" class="btn btn-primary w-full" style="margin-top:10px;" onclick="LG.qbSave(\''+kind+'\',\''+(editId||'')+'\')">💾 '+(editRec?'حفظ التعديلات':'حفظ ونشر')+'</button></div>','modal-lg');
  EX.qRefresh();
};
EX.qbTarget=function(){
  var t=(document.getElementById('qbTarget')||{}).value;
  document.getElementById('qbGroup').style.display=(t==='group')?'':'none';
  document.getElementById('qbGrade').style.display=(t==='grade')?'':'none';
};
EX.qbSave=async function(kind,editId){
  try{
    var d=db();
    var title=(document.getElementById('qbTitle')||{}).value||'';
    if(!title){ toast('اكتب العنوان','error'); return; }
    if(!QB.length){ toast('ضيف سؤال واحد على الأقل','error'); return; }
    QB.forEach(function(q){ if(q.type==='truefalse'&&(q.correct!=='true'&&q.correct!=='false')) q.correct='true'; if(q.type==='mcq'&&typeof q.correct!=='number') q.correct=0; });
    var bad=QB.some(function(q){ return !q.text||(q.type==='mcq'&&(q.options||[]).filter(function(o){return o&&String(o).trim();}).length<2); });
    if(bad){ toast('في سؤال ناقص نص أو خيارات','error'); return; }
    var total=QB.reduce(function(s,q){return s+(+q.points||0);},0);
    var dur=parseInt((document.getElementById('qbDur')||{}).value)||0;
    var pq=parseInt((document.getElementById('qbPQ')||{}).value)||0;
    var attsN=parseInt((document.getElementById('qbAtt')||{}).value)||1;
    var relPol=(document.getElementById('qbShow')||{}).value||'approve';
    var imgsPol=(document.getElementById('qbImgs')||{}).value||'auto';
    /* مسار التعديل */
    if(editId){
      var r=(kind==='ex'?(d.exams||[]):(d.homework||[])).find(function(x){return x.id===editId;});
      if(!r){ toast('العنصر مش موجود','error'); return; }
      r.title=title; r.totalPoints=total; r.duration=dur; r.perQuestionSec=pq; r.maxAttempts=attsN; r.showGrade=true; r.releasePolicy=relPol; r.questions=JSON.parse(JSON.stringify(QB));
      saveD(d); cloudDoc(kind==='ex'?'exams':'homework',r);
      ThemeManager.closeModal(); toast('✅ تم حفظ التعديلات','success');
      EX.renderExamsPage(); EX.renderGradesPage(); return;
    }
    /* مسار الإنشاء */
    var target=(document.getElementById('qbTarget')||{}).value;
    var list=[];
    if(target==='grade'){ var gr=(document.getElementById('qbGrade')||{}).value; list=myGroups().filter(function(g){return (g.grade||'')===gr;}); }
    else{ list=[gById((document.getElementById('qbGroup')||{}).value)]; }
    list=list.filter(Boolean);
    if(!list.length){ toast('اختار مجموعة/صف صحيح','error'); return; }
    var fam=(list.length>1)?('fam_'+Date.now()):'';
    var created=[];
    for(var i=0;i<list.length;i++){
      var g=list[i];
      var data={title:title,groupId:g.id,totalPoints:total,duration:dur,perQuestionSec:pq,maxAttempts:attsN,showGrade:true,releasePolicy:relPol,allowImages:imgsPol,questions:JSON.parse(JSON.stringify(QB)),familyId:fam,grade:g.grade||'',createdBy:(cur()||{}).id||''};
      var recN=null;
      if(kind==='ex'){ data.mode='home'; recN=await DataService.addExam(data); }
      else{ data.deadline=new Date(Date.now()+7*86400000).toISOString().slice(0,10); recN=await DataService.addHomework(data); }
      created.push({g:g,id:(recN&&recN.id)||''});
    }
    ThemeManager.closeModal();
    toast('✅ اتحفظ ونشر لـ '+created.length+' مجموعة','success');
    /* 🔔 إشعار واحد لكل مجموعة — بـ refId عشان السكانر يعرف إنه اتبعت بالفعل وميكرروش */
    created.forEach(function(c){
      try{ if(window.notifyGroup) window.notifyGroup(c.g.id,(kind==='ex'?'🎓 امتحان جديد: ':'📝 واجب جديد: ')+title,'افتح وحل دلوقتي — بالتوفيق!',kind==='ex'?'exam':'homework',{refId:c.id}); }catch(e){}
    });
    window.showSection('grades');
  }catch(e){ console.error(e); toast('خطأ حفظ: '+e.message,'error'); }
};

/* ========== 📝 صفحة الرصد الكاملة ========== */
var G_FILTERS={stage:'',grade:'',center:'',q:'',status:'',tab:'offline',kind:'all'};
EX.renderGradesPage=function(){
  var host=document.getElementById('lgGradesBody'); if(!host) return;
  var r=role();
  if(r==='student'||r==='parent') return; /* 🚫 الطالب مش بيستخدم صفحة الرصد */
  var d=db();
  var items=allItems().filter(function(it){ if(G_FILTERS.kind&&G_FILTERS.kind!=='all'&&it.kind!==G_FILTERS.kind) return false; return G_FILTERS.tab==='offline'?it.offline:!it.offline; });
  var stages=[],grades=[],centers=[];
  myGroups().forEach(function(g){ if(g.stage&&stages.indexOf(g.stage)<0)stages.push(g.stage); if(g.grade&&grades.indexOf(g.grade)<0)grades.push(g.grade); if(g.center&&centers.indexOf(g.center)<0)centers.push(g.center); });
  var f=G_FILTERS;
  var filtered=items.filter(function(it){
    var g=gById(it.rec.groupId); if(!g) return false;
    if(f.stage&&g.stage!==f.stage) return false;
    if(f.grade&&g.grade!==f.grade) return false;
    if(f.center&&g.center!==f.center) return false;
    if(f.q){ var q=f.q.toLowerCase(); if((it.rec.title||'').toLowerCase().indexOf(q)<0&&g.name.toLowerCase().indexOf(q)<0) return false; }
    if(f.status){ var st=it.rec.approvedAt?'approved':(it.rec.releasedAt?'published':'draft'); if(st!==f.status) return false; }
    return true;
  });
  filtered.sort(function(a,b){ return String(b.rec.date||b.rec.deadline||b.rec.createdAt||'').localeCompare(String(a.rec.date||a.rec.deadline||a.rec.createdAt||'')); });
  var offCount=allItems().filter(function(i){return i.offline;}).length;
  var kindTabs='<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;border-bottom:1px solid var(--border);padding-bottom:8px;"><button type="button" class="btn '+(f.kind==='all'||!f.kind?'btn-primary':'btn-ghost')+' btn-sm" onclick="LG.gfKind(\'all\')">📚 الكل</button><button type="button" class="btn '+(f.kind==='exam'?'btn-primary':'btn-ghost')+' btn-sm" onclick="LG.gfKind(\'exam\')">🎓 امتحانات</button><button type="button" class="btn '+(f.kind==='hw'?'btn-primary':'btn-ghost')+' btn-sm" onclick="LG.gfKind(\'hw\')">📝 واجبات</button></div>';
  var html='<div class="card" style="padding:10px;margin-bottom:12px;">'+kindTabs+
  '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">'+
  '<button type="button" class="btn '+(f.tab==='offline'?'btn-primary':'btn-ghost')+' btn-sm" onclick="LG.gfTab(\'offline\')">📄 رصد أوفلاين ('+offCount+')</button>'+
  '<button type="button" class="btn '+(f.tab==='online'?'btn-primary':'btn-ghost')+' btn-sm" onclick="LG.gfTab(\'online\')">🌐 مراجعة أونلاين ('+(allItems().length-offCount)+')</button>'+
  '<button type="button" class="btn btn-warning btn-sm" style="margin-inline-start:auto;" onclick="LG.openGradeLeaderboard()">🏆 أوائل الصفوف</button>'+
  '<button type="button" class="btn btn-success btn-sm" onclick="LG.openUnifiedCreator()">🧩 إنشاء جديد</button></div>'+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;">'+
  '<select class="form-select" onchange="LG.gfSet(\'stage\',this.value)"><option value="">🎓 كل المراحل</option>'+stages.map(function(s){return '<option value="'+s+'" '+(f.stage===s?'selected':'')+'>'+stLabel(s)+'</option>';}).join('')+'</select>'+
  '<select class="form-select" onchange="LG.gfSet(\'grade\',this.value)"><option value="">📚 كل الصفوف</option>'+grades.map(function(g){return '<option value="'+g+'" '+(f.grade===g?'selected':'')+'>'+g+'</option>';}).join('')+'</select>'+
  '<select class="form-select" onchange="LG.gfSet(\'center\',this.value)"><option value="">🏢 كل السناتر</option>'+centers.map(function(c){return '<option value="'+c+'" '+(f.center===c?'selected':'')+'>'+c+'</option>';}).join('')+'</select>'+
  '<select class="form-select" onchange="LG.gfSet(\'status\',this.value)"><option value="">📋 كل الحالات</option><option value="draft" '+(f.status==='draft'?'selected':'')+'>📝 مسودة</option><option value="published" '+(f.status==='published'?'selected':'')+'>📢 منشور</option><option value="approved" '+(f.status==='approved'?'selected':'')+'>✅ معتمد</option></select>'+
  '<input class="form-input" placeholder="🔍 بحث..." value="'+escS(f.q)+'" oninput="LG.gfSet(\'q\',this.value)">'+
  '</div></div>';
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">';
  if(!filtered.length) html+='<div class="card" style="grid-column:1/-1;text-align:center;padding:30px;"><div style="font-size:36px;">📭</div><strong>مفيش عناصر مطابقة</strong></div>';
  filtered.forEach(function(it){
    var r=it.rec, g=gById(r.groupId);
    var d2=db(); var counted=0, total=studentsOfGroupActive(r.groupId).length, approvedN=0;
    if(it.kind==='exam'){ var at=(d2.examAttempts||[]).filter(function(a){return a.examId===r.id;}); counted=at.filter(function(a){return a.score!=null;}).length; approvedN=at.filter(function(a){return a.status==='approved';}).length; }
    else{ var sb=(d2.submissions||[]).filter(function(s){return s.homeworkId===r.id;}); counted=sb.filter(function(s){return s.status==='graded'||s.status==='approved';}).length; approvedN=sb.filter(function(s){return s.status==='approved';}).length; }
    var st=r.approvedAt?'approved':(r.releasedAt?'published':'draft');
    var badge=st==='approved'?'<span class="badge badge-success">✅ معتمد</span>':(st==='published'?'<span class="badge badge-info">📢 منشور</span>':'<span class="badge badge-muted">📝 مسودة</span>');
    var pct=total?Math.round(counted/total*100):0;
    var mainBtn=it.offline
      ? (it.kind==='exam'?'<button type="button" class="btn btn-primary btn-sm" onclick="LG.openGradeEntry(\''+r.id+'\')">📝 رصد</button>':'<button type="button" class="btn btn-primary btn-sm" onclick="LG.openHwGradeEntry(\''+r.id+'\')">📝 رصد</button>')
      : (it.kind==='exam'?'<button type="button" class="btn btn-primary btn-sm" onclick="LG.openOnlineReview(\''+r.id+'\')">✅ مراجعة</button>':'<button type="button" class="btn btn-primary btn-sm" onclick="LG.openHwReview(\''+r.id+'\')">✅ مراجعة</button>');
    html+='<div class="card" style="padding:12px;">'+
      '<div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start;margin-bottom:6px;"><div style="flex:1;min-width:0;"><strong style="font-size:14px;">'+escS(r.title)+'</strong><div class="text-xs text-muted" style="margin-top:2px;">'+(it.kind==='exam'?'🎓 امتحان':'📝 واجب')+' '+(it.offline?'📄':'')+' · '+escS(g?g.name:'-')+'</div></div>'+badge+'</div>'+
      '<div style="display:flex;gap:10px;font-size:12px;margin:6px 0;"><div><span class="text-muted">الدرجة:</span> <strong>'+r.totalPoints+'</strong></div><div><span class="text-muted">المرصود:</span> <strong>'+counted+'/'+total+'</strong></div><div><span class="text-muted">معتمد:</span> <strong>'+approvedN+'</strong></div></div>'+
      '<div class="progress-bar" style="margin-bottom:8px;"><div class="progress-bar-fill" style="width:'+pct+'%"></div></div>'+
      '<div style="display:flex;gap:4px;flex-wrap:wrap;">'+mainBtn+
      '<button type="button" class="btn btn-ghost btn-sm" onclick="LG.viewItemDetails(\''+it.kind+'\',\''+it.id+'\')">👁</button><button type="button" class="btn btn-warning btn-sm" onclick="LG.openToppers(\''+it.kind+'\',\''+r.id+'\')">🏆</button>'+
      '<button type="button" class="btn btn-secondary btn-sm" onclick="LG.editItem(\''+it.kind+'\',\''+r.id+'\')">✏️</button>'+
      '<button type="button" class="btn btn-danger btn-sm" onclick="LG.deleteItem(\''+it.kind+'\',\''+r.id+'\')">🗑</button></div></div>';
  });
  html+='</div>';
  host.innerHTML=html;
};
EX.gfTab=function(t){ G_FILTERS.tab=t; EX.renderGradesPage(); };
EX.gfKind=function(k){ G_FILTERS.kind=k; EX.renderGradesPage(); };
EX.exKind=function(k){ window._exFilter=window._exFilter||{}; window._exFilter.kind=k; EX.renderExamsPage(); };
EX.gfSet=function(k,v){ G_FILTERS[k]=v; EX.renderGradesPage(); };
EX.viewItemDetails=function(kind,id){
  var d=db(); var r=kind==='exam'?(d.exams||[]).find(function(x){return x.id===id;}):(d.homework||[]).find(function(x){return x.id===id;}); if(!r) return;
  var g=gById(r.groupId); var off=isOfflineRec(kind,r);
  var counted=0,total=studentsOfGroupActive(r.groupId).length,approvedN=0,susp=0;
  if(kind==='exam'){ var at=(d.examAttempts||[]).filter(function(a){return a.examId===id;}); counted=at.filter(function(a){return a.score!=null;}).length; approvedN=at.filter(function(a){return a.status==='approved';}).length; susp=at.reduce(function(s,a){return s+((a.suspiciousActivities||[]).length);},0); }
  else{ var sb=(d.submissions||[]).filter(function(s){return s.homeworkId===id;}); counted=sb.filter(function(s){return s.status==='graded'||s.status==='approved';}).length; approvedN=sb.filter(function(s){return s.status==='approved';}).length; }
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">👁 '+escS(r.title)+'</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="filter-info">'+(kind==='exam'?'🎓 امتحان':'📝 واجب')+' '+(off?'📄 أوفلاين':'🌐 أونلاين')+' · '+escS(g?g.name:'-')+' · 📅 '+(r.date||r.deadline||'-')+'</div>'+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:12px;">'+
  '<div class="card" style="padding:8px;text-align:center;"><div style="font-size:20px;font-weight:900;">'+r.totalPoints+'</div><div class="text-xs">الدرجة</div></div>'+
  '<div class="card" style="padding:8px;text-align:center;"><div style="font-size:20px;font-weight:900;">'+counted+'/'+total+'</div><div class="text-xs">مرصود</div></div>'+
  '<div class="card" style="padding:8px;text-align:center;"><div style="font-size:20px;font-weight:900;">'+approvedN+'</div><div class="text-xs">معتمد</div></div>'+
  (susp?'<div class="card" style="padding:8px;text-align:center;"><div style="font-size:20px;font-weight:900;color:var(--warning);">'+susp+'</div><div class="text-xs">ملاحظات</div></div>':'')+
  '</div><div style="display:flex;gap:6px;flex-wrap:wrap;">'+
  (off?(kind==='exam'?'<button class="btn btn-primary btn-sm" onclick="ThemeManager.closeModal();LG.openGradeEntry(\''+id+'\')">📝 رصد</button>':'<button class="btn btn-primary btn-sm" onclick="ThemeManager.closeModal();LG.openHwGradeEntry(\''+id+'\')">📝 رصد</button>')
      :(kind==='exam'?'<button class="btn btn-success btn-sm" onclick="ThemeManager.closeModal();LG.openOnlineReview(\''+id+'\')">✅ مراجعة</button>':'<button class="btn btn-success btn-sm" onclick="ThemeManager.closeModal();LG.openHwReview(\''+id+'\')">✅ مراجعة</button>'))+
  '<button class="btn btn-secondary btn-sm" onclick="ThemeManager.closeModal();LG.editItem(\''+kind+'\',\''+id+'\')">✏️ تعديل</button>'+
  '<button class="btn btn-danger btn-sm" onclick="ThemeManager.closeModal();LG.deleteItem(\''+kind+'\',\''+id+'\')">🗑 حذف</button></div></div>','modal-md');
};

/* ========== 🏆 الأوائل (دقيق: مجموعة + صف) ========== */
EX.openToppers=function(kind,id){
  var d=db();
  var rec=(kind==='exam'?(d.exams||[]):(d.homework||[])).find(function(x){return x.id===id;}); if(!rec) return;
  var col=(kind==='exam'?(d.examAttempts||[]):(d.submissions||[]));
  var key=(kind==='exam'?'examId':'homeworkId');
  var g=gById(rec.groupId);
  var max0=rec.totalPoints||100;
  function medal(i){ return i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.'; }
  function row(a,i){
    var s=DataService.getUserById?DataService.getUserById(a.studentId):null;
    var mx=a.maxScore||max0; var pct=Math.round((a.score||0)/mx*100);
    var c=pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)';
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;min-width:0;"><strong style="font-size:13px;">'+medal(i)+' '+escS(s?s.name:'-')+'</strong><div class="text-xs text-muted">'+escS((s&&s.code)||'')+' · '+escS((s&&s.grade)||'')+'</div></div><span class="grade-badge" style="background:'+c+';color:#fff;">'+a.score+'/'+mx+' · '+pct+'%</span></div>';
  }
  var grp=col.filter(function(x){return x[key]===id&&x.score!=null;}).sort(function(a,b){return b.score-a.score;});
  /* نطاق الصف: نفس العائلة أو نفس العنوان داخل نفس الصف */
  var famIds={};
  if(rec.familyId){ (kind==='exam'?(d.exams||[]):(d.homework||[])).forEach(function(x){ if(x.familyId===rec.familyId) famIds[x.id]=1; }); }
  else { var grade=g?g.grade:''; (kind==='exam'?(d.exams||[]):(d.homework||[])).forEach(function(x){ var xg=gById(x.groupId); if(xg&&grade&&xg.grade===grade&&x.title===rec.title) famIds[x.id]=1; }); }
  var best={};
  col.forEach(function(x){ if(!famIds[x[key]]||x.score==null) return; if(!best[x.studentId]||x.score>best[x.studentId].score) best[x.studentId]=x; });
  var grL=Object.keys(best).map(function(k){return best[k];}).sort(function(a,b){return b.score-a.score;});
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🏆 الأوائل: '+escS(rec.title)+'</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
   '<div style="display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:10px;"><button class="tab-btn active" onclick="window.__tpTab(this,\'g\')">👥 المجموعة ('+grp.length+')</button><button class="tab-btn" onclick="window.__tpTab(this,\'gr\')">🎓 الصف ('+grL.length+')</button></div>'+
   '<div id="tp-g" style="max-height:50vh;overflow:auto;">'+(grp.length?grp.slice(0,20).map(row).join(''):'<p class="text-muted">لا درجات مرصودة</p>')+'</div>'+
   '<div id="tp-gr" style="display:none;max-height:50vh;overflow:auto;">'+(grL.length?grL.slice(0,20).map(row).join(''):'<p class="text-muted">لا درجات لهذا الصف</p>')+'</div></div>','modal-md');
  window.__tpTab=function(btn,t){ btn.parentNode.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');}); btn.classList.add('active'); document.getElementById('tp-g').style.display=(t==='g'?'':'none'); document.getElementById('tp-gr').style.display=(t==='gr'?'':'none'); };
};
/* ========== 🏆 أوائل الصفوف (أدق: متوسط النسب المعتمدة مش أفضل محاولة) ========== */
EX.openGradeLeaderboard=function(){
  var d=db();
  var grades={}; myGroups().forEach(function(g){ if(g.grade) grades[g.grade]=1; });
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🏆 أوائل الصفوف</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
   '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">'+
   '<div class="form-group"><label>🎓 الصف</label><select id="lbGrade" class="form-select">'+Object.keys(grades).map(function(g){return '<option value="'+g+'">'+g+'</option>';}).join('')+'</select></div>'+
   '<div class="form-group"><label>📚 النوع</label><select id="lbType" class="form-select"><option value="all">الكل</option><option value="online">🌐 أونلاين</option><option value="offline">📄 أوفلاين</option></select></div>'+
   '<div class="form-group"><label>🔢 أقل عدد تقييمات</label><input type="number" id="lbMin" class="form-input" value="1" min="1"></div></div>'+
   '<button class="btn btn-primary w-full" onclick="window.__lbRun()">🏆 اعرض الترتيب</button><div id="lbOut" style="margin-top:12px;max-height:50vh;overflow:auto;"></div></div>','modal-md');
  window.__lbRun=function(){
    var grade=(document.getElementById('lbGrade')||{}).value;
    var type=(document.getElementById('lbType')||{}).value;
    var minN=parseInt((document.getElementById('lbMin')||{}).value)||1;
    var gids={}; (DataService.getGroups?DataService.getGroups():[]).forEach(function(g){ if(g.grade===grade) gids[g.id]=1; });
    function rel(rec,att){ return att&&(att.status==='approved'||att.autoGraded||((rec.releasePolicy||'approve')==='instant'&&att.score!=null)); }
    var per={};
    function push(sid,pct,pts){ per[sid]=per[sid]||{sum:0,n:0,pts:0}; per[sid].sum+=pct; per[sid].n++; per[sid].pts+=pts; }
    (d.exams||[]).forEach(function(e){ if(!gids[e.groupId]) return; var off=(e.mode==='offline'||!!e.paper); if(type!=='all'&&(type==='offline')!==off) return;
      (d.examAttempts||[]).forEach(function(a){ if(a.examId===e.id&&a.score!=null&&rel(e,a)) push(a.studentId, a.score/(a.maxScore||e.totalPoints||100), a.score); }); });
    (d.homework||[]).forEach(function(h){ if(!gids[h.groupId]) return; var off=!!h.paper; if(type!=='all'&&(type==='offline')!==off) return;
      (d.submissions||[]).forEach(function(s){ if(s.homeworkId===h.id&&s.score!=null&&rel(h,s)) push(s.studentId, s.score/(s.maxScore||h.totalPoints||20), s.score); }); });
    var list=Object.keys(per).map(function(sid){ var v=per[sid]; return {sid:sid,avg:v.sum/v.n,n:v.n,pts:v.pts}; }).filter(function(r){return r.n>=minN;}).sort(function(a,b){ return b.avg-a.avg||b.n-a.n||b.pts-a.pts; });
    document.getElementById('lbOut').innerHTML=list.length?list.slice(0,25).map(function(r,i){
      var s=DataService.getUserById?DataService.getUserById(r.sid):null;
      var pct=Math.round(r.avg*100);
      var c=pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)';
      return '<div class="sub-row" style="padding:8px;"><div style="flex:1;min-width:0;"><strong style="font-size:13px;">'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.')+' '+escS(s?s.name:'-')+'</strong><div class="text-xs text-muted">'+escS((s&&s.code)||'')+' · '+r.n+' تقييم · '+Math.round(r.pts)+' نقطة مجموع</div></div><span class="grade-badge" style="background:'+c+';color:#fff;">'+pct+'%</span></div>';
    }).join(''):'<p class="text-muted">لا درجات معتمدة كافية لهذا الصف/النوع</p>';
  };
};
/* ========== 👁 عرض حل الامتحان — تصميم جديد ========== */
EX.viewAttemptDetails=function(attId){
  var d=db(); var a=(d.examAttempts||[]).find(function(x){return x.id===attId;}); if(!a) return;
  var e=(d.exams||[]).find(function(x){return x.id===a.examId;}); if(!e) return;
  var s=DataService.getUserById?DataService.getUserById(a.studentId):null;
  var g=gById(e.groupId);
  var max=a.maxScore||e.totalPoints||100;
  var pct=a.score!=null?Math.round(a.score/max*100):0;
  var col=pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)';
  var grp=(d.examAttempts||[]).filter(function(x){return x.examId===e.id&&x.score!=null;}).sort(function(x,y){return y.score-x.score;});
  var rG=grp.findIndex(function(x){return x.studentId===a.studentId;})+1;
  var gradeGids={}; (DataService.getGroups?DataService.getGroups():[]).forEach(function(x){ if(g&&x.grade===g.grade) gradeGids[x.id]=1; });
  var grL=(d.examAttempts||[]).filter(function(x){return x.score!=null&&(d.exams||[]).some(function(ex2){return ex2.id===x.examId&&gradeGids[ex2.groupId];});}).sort(function(x,y){return y.score-x.score;});
  var rGr=grL.findIndex(function(x){return x.studentId===a.studentId;})+1;
  var head='<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:linear-gradient(135deg,var(--primary-bg),transparent);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:12px;">'+
    '<div style="width:86px;height:86px;border-radius:50%;background:conic-gradient('+col+' '+pct+'%,var(--surface-hover) 0);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><div style="width:64px;height:64px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;font-weight:900;font-family:var(--font-en);font-size:15px;color:'+col+';">'+pct+'%</div></div>'+
    '<div style="flex:1;min-width:150px;"><strong style="font-size:15px;">'+escS(e.title)+'</strong><div class="text-xs text-muted" style="margin:4px 0;">👤 '+escS(s?s.name:'-')+' · 👥 '+escS(g?g.name:'-')+'</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;"><span class="badge badge-info">🎯 '+a.score+'/'+max+'</span><span class="badge badge-success">👥 #'+(rG||'-')+'/'+grp.length+'</span><span class="badge badge-warning">🎓 #'+(rGr||'-')+'/'+grL.length+'</span>'+((a.suspiciousActivities||[]).length?'<span class="badge badge-danger">⚠️ '+(a.suspiciousActivities.length)+' ملاحظة</span>':'')+'</div></div></div>';
  var qs=(e.questions||[]).map(function(q,i){
    var ans=(a.answers||[]).find(function(x){return x.questionId===q.id;});
    var val=ans?ans.answer:'';
    var corr=(q.correct!=null&&q.correct!=='')?q.correct:q.correctAnswer;
    var manual=(q.type==='essay'||q.type==='short');
    var ok=!manual&&(String(val).trim()===String(corr).trim()||(q.options&&q.options[corr]&&String(val).trim()===String(q.options[corr]).trim()));
    var bc=manual?'var(--primary)':(ok?'var(--success)':'var(--danger)');
    var h='<div class="card" style="padding:12px;margin-bottom:10px;border-right:4px solid '+bc+';">'+
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px;"><div style="flex:1;"><span style="display:inline-flex;width:26px;height:26px;border-radius:8px;background:'+bc+';color:#fff;align-items:center;justify-content:center;font-weight:900;font-family:var(--font-en);font-size:12px;margin-inline-end:6px;">'+(i+1)+'</span><strong style="font-size:13px;">'+escS(q.text||'')+'</strong></div><span class="badge badge-muted">'+(manual?'✍️ مقالي':(ok?'✓ صحيحة':'✗ غلط'))+' · '+(q.points||1)+' د</span></div>';
    if(q.type==='mcq'){
      h+='<div style="display:grid;gap:4px;">'+(q.options||[]).map(function(o,oi){
        var mine=String(val)===String(oi), cr=String(corr)===String(oi);
        var bg=mine?(cr?'var(--success-bg)':'var(--danger-bg)'):(cr?'var(--success-bg)':'var(--surface-hover)');
        var bd=mine?(cr?'var(--success)':'var(--danger)'):(cr?'var(--success)':'var(--border)');
        return '<div style="padding:7px 10px;border-radius:9px;background:'+bg+';border:1.5px solid '+bd+';font-size:12px;">'+(mine?'👈 ':'• ')+escS(o||'')+(mine?' <b>(إجابته)</b>':'')+(cr&&!mine?' <b style="color:var(--success);">(الصحيحة)</b>':'')+'</div>';
      }).join('')+'</div>';
    } else if(q.type==='truefalse'){
      h+='<div style="display:flex;gap:6px;flex-wrap:wrap;"><span class="badge '+(val==='true'?'badge-success':'badge-danger')+'">إجابته: '+(val==='true'?'✓ صح':'✗ خطأ')+'</span><span class="badge badge-success">الصحيحة: '+((corr===true||corr==='true')?'✓ صح':'✗ خطأ')+'</span></div>';
    } else {
      h+='<div style="background:var(--surface-hover);border-radius:10px;padding:10px;font-size:12px;white-space:pre-wrap;">'+escS(val||'(لا إجابة)')+'</div>';
    }
    if(ans&&ans.answerImages&&ans.answerImages.length){
      h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">'+ans.answerImages.map(function(im){return '<img src="'+im+'" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:2px solid '+bc+';">';}).join('')+'</div>';
    }
    return h+'</div>';
  }).join('');
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">👁 حل الطالب</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body" style="max-height:72vh;overflow-y:auto;">'+head+(qs||'<p class="text-muted">لا أسئلة</p>')+'</div>','modal-lg');
};

EX.editItem=function(kind,id){
  var d=db(); var r=kind==='exam'?(d.exams||[]).find(function(x){return x.id===id;}):(d.homework||[]).find(function(x){return x.id===id;}); if(!r) return;
  if(!isOfflineRec(kind,r)){ EX.openOnlineBuilder(kind==='exam'?'ex':'hw',{},id); return; }
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">✏️ تعديل: '+escS(r.title)+'</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="form-group"><label>العنوان *</label><input id="ucTitle" class="form-input" value="'+escS(r.title||'')+'"></div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'+
  '<div class="form-group"><label>الدرجة الكلية *</label><input type="number" id="ucTotal" class="form-input" value="'+(r.totalPoints||20)+'" min="1"></div>'+
  '<div class="form-group"><label>التاريخ</label><input type="date" id="ucDate" class="form-input" value="'+(r.date||r.deadline||new Date().toISOString().slice(0,10))+'"></div></div>'+
  '<button type="button" class="btn btn-primary w-full" onclick="LG.saveEditItem(\''+kind+'\',\''+id+'\')">💾 حفظ التعديلات</button></div>','modal-sm');
};
EX.saveEditItem=function(kind,id){
  var d=db(); var r=kind==='exam'?(d.exams||[]).find(function(x){return x.id===id;}):(d.homework||[]).find(function(x){return x.id===id;}); if(!r) return;
  r.title=(document.getElementById('ucTitle')||{}).value||r.title;
  r.totalPoints=parseInt((document.getElementById('ucTotal')||{}).value)||r.totalPoints;
  var dt=(document.getElementById('ucDate')||{}).value;
  if(dt){ if(kind==='exam') r.date=dt; else r.deadline=dt; }
  saveD(d); cloudDoc(kind==='exam'?'exams':'homework',r);
  ThemeManager.closeModal(); toast('✅ تم التعديل','success');
  EX.renderExamsPage(); EX.renderGradesPage();
};
EX.deleteItem=function(kind,id){
  if(!confirm('متأكد من الحذف؟ الدرجات/التسليمات المرتبطة هتتمسح.')) return;
  var d=db();
  var col = kind==='exam' ? 'exams' : 'homework';
  var relCol = kind==='exam' ? 'examAttempts' : 'submissions';
  var relKey = kind==='exam' ? 'examId' : 'homeworkId';
  
  if(kind==='exam'){ d.exams=(d.exams||[]).filter(function(x){return x.id!==id;}); }
  else{ d.homework=(d.homework||[]).filter(function(x){return x.id!==id;}); }
  
  var related = (d[relCol]||[]).filter(function(x){ return x[relKey]===id; });
  d[relCol] = (d[relCol]||[]).filter(function(x){ return x[relKey]!==id; });
  
  saveD(d);
  
  // 🔥 حذف من Firestore (السحابة) — ده اللي بيمنع الرجوع بعد الريفرش
  try{
    if(window.FirebaseService && FirebaseService._db){
      FirebaseService.deleteDoc(col, id);
      related.forEach(function(rec){ FirebaseService.deleteDoc(relCol, rec.id); });
    }
  }catch(e){ console.warn('Cloud delete failed', e); }
  
  toast('🗑 تم الحذف بالكامل','success');
  EX.renderExamsPage(); EX.renderGradesPage();
};

/* ========== 🛠️ صفحة الإنشاء (قائمة إدارة) ========== */
EX.renderExamsPage=function(){
  var host=document.getElementById('lgExamsListBody'); if(!host) return;
  var r=role();
  if(r==='student'||r==='parent') return; /* 🚫 الطالب مش بيستخدم صفحة الإنشاء */
  var f=window._exFilter||(window._exFilter={stage:'',grade:'',center:'',q:'',type:'all',kind:'all'});
  var stages=[],grades=[],centers=[];
  myGroups().forEach(function(g){ if(g.stage&&stages.indexOf(g.stage)<0)stages.push(g.stage); if(g.grade&&grades.indexOf(g.grade)<0)grades.push(g.grade); if(g.center&&centers.indexOf(g.center)<0)centers.push(g.center); });
  var items=allItems().filter(function(it){
    var g=gById(it.rec.groupId); if(!g) return false;
    if(f.kind&&f.kind!=='all'&&it.kind!==f.kind) return false;
    if(f.type!=='all'){
      if(f.type==='ex_online'&&!(it.kind==='exam'&&!it.offline)) return false;
      if(f.type==='ex_offline'&&!(it.kind==='exam'&&it.offline)) return false;
      if(f.type==='hw_online'&&!(it.kind==='hw'&&!it.offline)) return false;
      if(f.type==='hw_offline'&&!(it.kind==='hw'&&it.offline)) return false;
    }
    if(f.stage&&g.stage!==f.stage) return false;
    if(f.grade&&g.grade!==f.grade) return false;
    if(f.center&&g.center!==f.center) return false;
    if(f.q&&(it.rec.title||'').toLowerCase().indexOf(f.q.toLowerCase())<0) return false;
    return true;
  });
  items.sort(function(a,b){ return String(b.rec.date||b.rec.deadline||b.rec.createdAt||'').localeCompare(String(a.rec.date||a.rec.deadline||a.rec.createdAt||'')); });
  var kindTabs='<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;border-bottom:1px solid var(--border);padding-bottom:8px;"><button type="button" class="btn '+(f.kind==='all'||!f.kind?'btn-primary':'btn-ghost')+' btn-sm" onclick="LG.exKind(\'all\')">📚 الكل</button><button type="button" class="btn '+(f.kind==='exam'?'btn-primary':'btn-ghost')+' btn-sm" onclick="LG.exKind(\'exam\')">🎓 امتحانات</button><button type="button" class="btn '+(f.kind==='hw'?'btn-primary':'btn-ghost')+' btn-sm" onclick="LG.exKind(\'hw\')">📝 واجبات</button></div>';
  var html='<div class="card" style="padding:10px;margin-bottom:12px;">'+kindTabs+
  '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;"><strong style="font-size:13px;">📚 الامتحانات والواجبات ('+items.length+')</strong>'+
  '<button type="button" class="btn btn-primary btn-sm" onclick="LG.openUnifiedCreator()">🧩 إنشاء جديد</button></div>'+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;">'+
  '<select class="form-select" onchange="LG._exFilter.type=this.value;LG.renderExamsPage()"><option value="all">كل الأنواع</option><option value="ex_online" '+(f.type==='ex_online'?'selected':'')+'>🎓🌐 امتحان أونلاين</option><option value="ex_offline" '+(f.type==='ex_offline'?'selected':'')+'>🎓📄 امتحان أوفلاين</option><option value="hw_online" '+(f.type==='hw_online'?'selected':'')+'>📝🌐 واجب أونلاين</option><option value="hw_offline" '+(f.type==='hw_offline'?'selected':'')+'>📝📄 واجب أوفلاين</option></select>'+
  '<select class="form-select" onchange="LG._exFilter.stage=this.value;LG.renderExamsPage()"><option value="">🎓 كل المراحل</option>'+stages.map(function(s){return '<option value="'+s+'" '+(f.stage===s?'selected':'')+'>'+stLabel(s)+'</option>';}).join('')+'</select>'+
  '<select class="form-select" onchange="LG._exFilter.grade=this.value;LG.renderExamsPage()"><option value="">📚 كل الصفوف</option>'+grades.map(function(g){return '<option value="'+g+'" '+(f.grade===g?'selected':'')+'>'+g+'</option>';}).join('')+'</select>'+
  '<select class="form-select" onchange="LG._exFilter.center=this.value;LG.renderExamsPage()"><option value="">🏢 كل السناتر</option>'+centers.map(function(c){return '<option value="'+c+'" '+(f.center===c?'selected':'')+'>'+c+'</option>';}).join('')+'</select>'+
  '<input class="form-input" placeholder="🔍 بحث..." value="'+escS(f.q||'')+'" oninput="LG._exFilter.q=this.value;LG.renderExamsPage()">'+
  '</div></div>';
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">';
  if(!items.length) html+='<div class="card" style="grid-column:1/-1;text-align:center;padding:30px;"><div style="font-size:36px;">📭</div><strong>مفيش عناصر</strong><div class="text-xs text-muted" style="margin-top:6px;">دوس 🧩 إنشاء جديد</div></div>';
  items.forEach(function(it){
    var r=it.rec, g=gById(r.groupId);
    var st=r.approvedAt?'approved':(r.releasedAt?'published':'draft');
    var badge=st==='approved'?'<span class="badge badge-success">✅ معتمد</span>':(st==='published'?'<span class="badge badge-info">📢 منشور</span>':'<span class="badge badge-muted">📝 مسودة</span>');
    var actBtn=it.offline
      ? (it.kind==='exam'?'<button type="button" class="btn btn-primary btn-sm" onclick="LG.openGradeEntry(\''+r.id+'\')">📝 رصد</button>':'<button type="button" class="btn btn-primary btn-sm" onclick="LG.openHwGradeEntry(\''+r.id+'\')">📝 رصد</button>')
      : (it.kind==='exam'?'<button type="button" class="btn btn-success btn-sm" onclick="LG.openOnlineReview(\''+r.id+'\')">✅ مراجعة</button>':'<button type="button" class="btn btn-success btn-sm" onclick="LG.openHwReview(\''+r.id+'\')">✅ مراجعة</button>');
    html+='<div class="card" style="padding:12px;">'+
      '<div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start;margin-bottom:6px;"><div style="flex:1;min-width:0;"><strong style="font-size:14px;">'+escS(r.title)+'</strong><div class="text-xs text-muted" style="margin-top:2px;">'+(it.kind==='exam'?'🎓 امتحان':'📝 واجب')+' '+(it.offline?'📄':'🌐')+' · '+escS(g?g.name:'-')+'</div></div>'+badge+'</div>'+
      '<div class="text-xs text-muted" style="margin-bottom:8px;">📅 '+(r.date||r.deadline||'-')+' · 🎯 '+r.totalPoints+' نقطة'+(r.questions&&r.questions.length?' · ❓ '+r.questions.length:'')+'</div>'+
      '<div style="display:flex;gap:4px;flex-wrap:wrap;">'+
      '<button type="button" class="btn btn-ghost btn-sm" onclick="LG.viewItemDetails(\''+it.kind+'\',\''+r.id+'\')">👁</button><button type="button" class="btn btn-warning btn-sm" onclick="LG.openToppers(\''+it.kind+'\',\''+r.id+'\')">🏆</button>'+
      '<button type="button" class="btn btn-secondary btn-sm" onclick="LG.editItem(\''+it.kind+'\',\''+r.id+'\')">✏️ تعديل</button>'+
      actBtn+
      '<button type="button" class="btn btn-danger btn-sm" onclick="LG.deleteItem(\''+it.kind+'\',\''+r.id+'\')">🗑</button>'+
      '</div></div>';
  });
  html+='</div>';
  host.innerHTML=html;
};
function injectExamsPage(){
  var r=role();
  /* ✅ الطالب يشوف قائمة الامتحانات المتاحة ليه */
  if(r==='student'||r==='parent'){
    var sec=document.getElementById('section-exams'); if(!sec) return;
    if(!document.getElementById('lgStudentExamsBody')){
      var body=document.createElement('div'); body.id='lgStudentExamsBody';
      sec.appendChild(body);
    }
    EX.renderStudentExamsList();
    return;
  }
  /* باقي الأدوار: صفحة الإنشاء الكاملة */
  if(r!=='assistant'&&r!=='admin'&&r!=='super_admin'&&r!=='teacher') return;
  var sec=document.getElementById('section-exams'); if(!sec) return;
  if(!document.getElementById('lgExamsListBody')){
    var body=document.createElement('div'); body.id='lgExamsListBody';
    var hdr=sec.querySelector('.section-header');
    if(hdr&&hdr.nextSibling) sec.insertBefore(body,hdr.nextSibling); else sec.appendChild(body);
  }
  EX.renderExamsPage();
}

function injectGradesPage(){
  var r=role();
  /* ✅ الطالب يشوف واجباته المتاحة */
  if(r==='student'||r==='parent'){
    var sec=document.getElementById('section-homework'); if(!sec) return;
    if(!document.getElementById('lgStudentHomeworkBody')){
      var body=document.createElement('div'); body.id='lgStudentHomeworkBody';
      sec.appendChild(body);
    }
    EX.renderStudentHomeworkList();
    return;
  }
  if(r!=='assistant'&&r!=='admin'&&r!=='super_admin'&&r!=='teacher') return;
  var sec=document.getElementById('section-grades'); if(!sec) return;
  if(!document.getElementById('lgGradesBody')){
    var body=document.createElement('div'); body.id='lgGradesBody';
    var hdr=sec.querySelector('.section-header');
    if(hdr&&hdr.nextSibling) sec.insertBefore(body,hdr.nextSibling); else sec.appendChild(body);
  }
  EX.renderGradesPage();
}

/* 🎯 عرض الامتحانات المتاحة للطالب - V3 مع الدرجة الخام + النسبة + مراجعة */
window.__studentExamsFilter = window.__studentExamsFilter || 'all';
EX.renderStudentExamsList=function(){
  var host=document.getElementById('lgStudentExamsBody'); if(!host) return;
  var u=cur(); if(!u) return;
  var sid=u.role==='student'?u.id:(u.studentIds||[])[0];
  if(!sid) return;
  var d=db();
  var myTeachers=(DataService.getStudentTeachers?DataService.getStudentTeachers(sid):[]);
  var gids=myTeachers.map(function(t){return t.group?t.group.id:null;}).filter(Boolean);
  var gMap={}; myTeachers.forEach(function(t){ if(t.group) gMap[t.group.id]=t; });

  var allItems=(d.exams||[]).filter(function(e){ return gids.indexOf(e.groupId)>=0; });
  allItems.sort(function(a,b){ return String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||'')); });

  var stats = { available: 0, review: 0, graded: 0 };
  allItems.forEach(function(e){
    var att=(d.examAttempts||[]).find(function(a){return a.examId===e.id&&a.studentId===sid;});
    var st = getExamStatus(e, att);
    if (st === 'available' || st === 'overdue') stats.available++;
    else if (st === 'submitted' || st === 'review') stats.review++;
    else if (st === 'approved' || st === 'instant' || st === 'offline-graded') stats.graded++;
  });

  var f = window.__studentExamsFilter;
  var items = allItems.filter(function(e){
    var att=(d.examAttempts||[]).find(function(a){return a.examId===e.id&&a.studentId===sid;});
    var st = getExamStatus(e, att);
    if(f==='all') return true;
    if(f==='available') return st==='available'||st==='overdue';
    if(f==='review') return st==='submitted'||st==='review';
    if(f==='graded') return st==='approved'||st==='instant'||st==='offline-graded';
    return true;
  });

  var filtersHtml = '<div class="card" style="padding:10px;margin-bottom:12px;">'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;">'+
    '<button class="btn btn-sm '+(f==='all'?'btn-primary':'btn-ghost')+'" onclick="window.__studentExamsFilter=\'all\';EX.renderStudentExamsList()">📋 الكل ('+allItems.length+')</button>'+
    '<button class="btn btn-sm '+(f==='available'?'btn-primary':'btn-ghost')+'" onclick="window.__studentExamsFilter=\'available\';EX.renderStudentExamsList()">⏳ متاح ('+stats.available+')</button>'+
    '<button class="btn btn-sm '+(f==='review'?'btn-primary':'btn-ghost')+'" onclick="window.__studentExamsFilter=\'review\';EX.renderStudentExamsList()">🕒 مراجعة ('+stats.review+')</button>'+
    '<button class="btn btn-sm '+(f==='graded'?'btn-primary':'btn-ghost')+'" onclick="window.__studentExamsFilter=\'graded\';EX.renderStudentExamsList()">✅ صادر ('+stats.graded+')</button>'+
    '</div></div>';

  if(!items.length){
    host.innerHTML=filtersHtml+'<div class="card" style="text-align:center;padding:40px;"><div style="font-size:48px;">📭</div><strong>لا توجد امتحانات في هذا التصنيف</strong></div>';
    return;
  }

  host.innerHTML=filtersHtml+'<div style="display:grid;gap:12px;">'+items.map(function(e){
    var att=(d.examAttempts||[]).find(function(a){return a.examId===e.id&&a.studentId===sid;});
    var g=gMap[e.groupId];
    var teacher=(g&&g.teacherId)?(DataService.getUserById?DataService.getUserById(g.teacherId):null):null;
    var st = getExamStatus(e, att);
    var pol=e.releasePolicy||'approve';

    /* 🎯 حساب الدرجة من مصدرها الصحيح */
    var max = (att && typeof att.maxScore === 'number' && att.maxScore > 0) ? att.maxScore : (e.totalPoints || 100);
    var score = (att && typeof att.score === 'number') ? att.score : null;
    var pct = (score !== null && max > 0) ? Math.round((score / max) * 100) : null;

    var statusBadge='', actionBtn='', scoreLine='', extraInfo='';

    if (st === 'offline') {
      statusBadge = '<span class="badge badge-info">📄 ورقي - في الحصة</span>';
      actionBtn = '<span class="text-xs text-muted">الدرجة بعد رصد الأستاذ</span>';
    } else if (st === 'offline-graded' || st === 'approved' || st === 'instant') {
      var color = pct!==null ? (pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)') : 'var(--text-muted)';
      var emoji = pct!==null ? (pct>=85?'🏆':pct>=75?'🌟':pct>=50?'👍':'💪') : '✓';
      var isInstant = (st === 'instant');
      statusBadge = '<span class="badge" style="background:'+color+';color:#fff;">'+emoji+' '+(pct!==null?pct+'%':'✓')+(isInstant?' ⚡':'')+'</span>';
      if (score !== null) {
        scoreLine = '<div dir="ltr" style="font-size:22px;font-weight:900;color:'+color+';font-family:var(--font-en);margin-top:6px;text-align:right;">'+score+' / '+max+'</div>';
      }
      if (isInstant) extraInfo += '<div class="text-xs" style="margin-top:4px;color:var(--success);">⚡ درجة فورية</div>';
      if (att && att.rank) extraInfo += '<div class="text-xs text-muted" style="margin-top:4px;">🏅 ترتيبك #'+att.rank+' من '+att.rankTotal+'</div>';
      actionBtn = '<button class="btn btn-primary btn-sm" onclick="LG.reviewPastExam(\''+e.id+'\')">👁 مراجعة الإجابات</button>';
    } else if (st === 'available' || st === 'overdue') {
      statusBadge = st==='overdue'
        ? '<span class="badge badge-danger">⚠️ فات الموعد</span>'
        : '<span class="badge badge-warning">⏳ متاح الآن</span>';
      actionBtn = '<button class="btn btn-primary btn-sm" onclick="window.location.href=\'exam-taker.html?ex='+e.id+'\'">🎮 ابدأ الامتحان</button>';
    } else if (st === 'submitted') {
      statusBadge = '<span class="badge badge-info">📤 مسلّم</span>';
      extraInfo = '<div class="text-xs text-muted" style="margin-top:4px;">بانتظار المراجعة'+(att&&att.submittedAt?' · '+new Date(att.submittedAt).toLocaleDateString('ar-EG'):'')+'</div>';
      actionBtn = '<button class="btn btn-ghost btn-sm" onclick="LG.reviewPastExam(\''+e.id+'\')">👁 مراجعة إجاباتي</button>';
    } else if (st === 'review') {
      statusBadge = '<span class="badge badge-info">🕒 قيد المراجعة</span>';
      if (score !== null) {
        scoreLine = '<div dir="ltr" style="font-size:18px;font-weight:900;color:var(--warning);font-family:var(--font-en);margin-top:4px;text-align:right;">'+score+' / '+max+'</div>';
        extraInfo = '<div class="text-xs text-muted" style="margin-top:4px;">النتيجة النهائية بعد اعتماد الأستاذ</div>';
      }
      actionBtn = '<button class="btn btn-ghost btn-sm" onclick="LG.reviewPastExam(\''+e.id+'\')">👁 مراجعة إجاباتي</button>';
    }

    return '<div class="card" style="padding:14px;"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">'+
      '<div style="flex:1;min-width:200px;"><strong style="font-size:15px;">'+escS(e.title)+'</strong>'+
      '<div class="text-xs text-muted" style="margin-top:4px;">'+(e.mode==='offline'||e.paper?'📄 ورقي':e.mode==='class'?'🏫 حصة':'🏠 أونلاين')+' · 👨‍🏫 '+(teacher?escS(teacher.name):'-')+' · 👥 '+(g?escS(g.name):'-')+'</div>'+
      '<div class="text-xs text-muted" style="margin-top:2px;">⏱️ '+(e.duration||60)+' د · ❓ '+(e.questions||[]).length+' سؤال'+(pol==='instant'?' · ⚡ فوري':'')+'</div>'+
      scoreLine+extraInfo+'</div>'+
      '<div style="text-align:left;display:flex;flex-direction:column;gap:6px;align-items:flex-end;min-width:150px;">'+statusBadge+'<div style="margin-top:4px;">'+actionBtn+'</div></div></div></div>';
  }).join('')+'</div>';
};

/* 🆕 عرض الواجبات المتاحة للطالب - V2 مع مراجعة + فلاتر */
window.__studentHwFilter = window.__studentHwFilter || 'all';
EX.renderStudentHomeworkList=function(){
  var host=document.getElementById('lgStudentHomeworkBody'); if(!host) return;
  var u=cur(); if(!u) return;
  var sid=u.role==='student'?u.id:(u.studentIds||[])[0];
  if(!sid) return;
  var d=db();
  var myTeachers=(DataService.getStudentTeachers?DataService.getStudentTeachers(sid):[]);
  var gids=myTeachers.map(function(t){return t.group?t.group.id:null;}).filter(Boolean);
  var gMap={}; myTeachers.forEach(function(t){ if(t.group) gMap[t.group.id]=t; });

  var allItems=(d.homework||[]).filter(function(h){ return gids.indexOf(h.groupId)>=0; });
  allItems.sort(function(a,b){ return String(b.deadline||b.createdAt||'').localeCompare(String(a.deadline||a.createdAt||'')); });

  var stats = { pending: 0, submitted: 0, graded: 0 };
  allItems.forEach(function(h){
    var sub=(d.submissions||[]).find(function(s){return s.homeworkId===h.id&&s.studentId===sid;});
    if(!sub && !h.paper) stats.pending++;
    else if(sub && isReleased(h,sub)) stats.graded++;
    else stats.submitted++;
  });

  var f = window.__studentHwFilter;
  var items = allItems.filter(function(h){
    var sub=(d.submissions||[]).find(function(s){return s.homeworkId===h.id&&s.studentId===sid;});
    if(f==='all') return true;
    if(f==='pending') return !sub && !h.paper;
    if(f==='submitted') return sub && !isReleased(h,sub);
    if(f==='graded') return isReleased(h,sub);
    return true;
  });

  var filtersHtml = '<div class="card" style="padding:10px;margin-bottom:12px;">'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;">'+
    '<button class="btn btn-sm '+(f==='all'?'btn-primary':'btn-ghost')+'" onclick="window.__studentHwFilter=\'all\';EX.renderStudentHomeworkList()">📋 الكل ('+allItems.length+')</button>'+
    '<button class="btn btn-sm '+(f==='pending'?'btn-primary':'btn-ghost')+'" onclick="window.__studentHwFilter=\'pending\';EX.renderStudentHomeworkList()">⏳ متاح ('+stats.pending+')</button>'+
    '<button class="btn btn-sm '+(f==='submitted'?'btn-primary':'btn-ghost')+'" onclick="window.__studentHwFilter=\'submitted\';EX.renderStudentHomeworkList()">🕒 قيد المراجعة ('+stats.submitted+')</button>'+
    '<button class="btn btn-sm '+(f==='graded'?'btn-primary':'btn-ghost')+'" onclick="window.__studentHwFilter=\'graded\';EX.renderStudentHomeworkList()">✅ مُصدّر ('+stats.graded+')</button>'+
    '</div></div>';

  if(!items.length){
    host.innerHTML=filtersHtml+'<div class="card" style="text-align:center;padding:40px;"><div style="font-size:48px;">📭</div><strong>لا توجد واجبات في هذا التصنيف</strong></div>';
    return;
  }

  host.innerHTML=filtersHtml+'<div style="display:grid;gap:12px;">'+items.map(function(h){
    var sub=(d.submissions||[]).find(function(s){return s.homeworkId===h.id&&s.studentId===sid;});
    var g=gMap[h.groupId];
    var teacher=(g&&g.teacherId)?(DataService.getUserById?DataService.getUserById(g.teacherId):null):null;
    var isOff=!!h.paper;
    var modeBadge=isOff?'📄 ورقي':'🌐 أونلاين';
    var released=isReleased(h, sub);
    var pol=h.releasePolicy||'approve';

    var statusBadge='', actionBtn='', infoLine='';
    if(isOff){
      statusBadge='<span class="badge badge-info">📄 ورقي - يُسلّم في الحصة</span>';
      actionBtn='<span class="text-xs text-muted">الدرجة بعد رصد الأستاذ</span>';
    } else if(sub){
      var pct=sub.maxScore?Math.round(sub.score/sub.maxScore*100):0;
      if(released){
        var color=pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)';
        var emoji=pct>=85?'🏆':pct>=75?'🌟':pct>=50?'👍':'💪';
        statusBadge='<span class="badge" style="background:'+color+';color:#fff;">'+emoji+' '+pct+'%</span>';
        actionBtn='<button class="btn btn-primary btn-sm" onclick="LG.openHomeworkSolver(\''+h.id+'\')">👁 مراجعة</button>';
        infoLine='<div class="text-xs text-muted" style="margin-top:4px;">✓ درجتك: '+sub.score+'/'+sub.maxScore+'</div>';
      } else if(sub.score!=null){
        statusBadge='<span class="badge badge-info">🕒 قيد المراجعة</span>';
        infoLine='<div class="text-xs text-muted" style="margin-top:4px;">بانتظار اعتماد الأستاذ</div>';
      } else {
        statusBadge='<span class="badge badge-success">📤 مسلّم</span>';
        infoLine='<div class="text-xs text-muted" style="margin-top:4px;">بانتظار المراجعة'+(sub.submittedAt?' · '+new Date(sub.submittedAt).toLocaleDateString('ar-EG'):'')+'</div>';
      }
    } else {
      var dl=h.deadline?new Date(h.deadline):null;
      var overdue=dl&&dl<new Date();
      statusBadge=overdue?'<span class="badge badge-danger">⚠️ متأخر</span>':'<span class="badge badge-warning">⏳ متاح</span>';
      actionBtn='<button class="btn btn-primary btn-sm" onclick="window.location.href=\'student-dashboard.html#section-homework-sub-'+h.id+'\'">📝 فتح الواجب</button>';
      if(h.deadline) infoLine='<div class="text-xs text-muted" style="margin-top:4px;">📅 التسليم: '+new Date(h.deadline).toLocaleDateString('ar-EG')+'</div>';
    }

    return '<div class="card" style="padding:14px;"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">'+
      '<div style="flex:1;min-width:200px;"><strong style="font-size:15px;">'+escS(h.title)+'</strong>'+
      '<div class="text-xs text-muted" style="margin-top:4px;">'+modeBadge+' · 👨‍🏫 '+(teacher?teacher.name:'-')+' · 👥 '+(g?g.name:'-')+'</div>'+
      infoLine+'</div>'+
      '<div style="text-align:left;display:flex;flex-direction:column;gap:6px;align-items:flex-end;">'+statusBadge+'<div>'+actionBtn+'</div></div></div></div>';
  }).join('')+'</div>';
};

/* 🆕 مراجعة امتحان سابق - الطالب يقدر يشوف إجاباته والصحيحة (بدون إعادة حل) */
EX.reviewPastExam=function(examId){
  try{
    var u=cur(); if(!u) return;
    var sid=u.role==='student'?u.id:(u.studentIds||[])[0];
    if(!sid) return;
    var d=db();
    var e=(d.exams||[]).find(function(x){return x.id===examId;}); if(!e) return;
    var att=(d.examAttempts||[]).find(function(a){return a.examId===examId&&a.studentId===sid;});
    if(!att){ toast('لم تدخل الامتحان بعد','warning'); return; }
    var g=gById(e.groupId);
    var teacher=(g&&g.teacherId)?(DataService.getUserById?DataService.getUserById(g.teacherId):null):null;
    var released=isReleased(e, att);
    var pol=e.releasePolicy||'approve';

    /* حساب الدرجة */
    var max=e.totalPoints||100;
    var score=att.score||0;
    var pct=att.maxScore?Math.round(att.score/att.maxScore*100):0;

    /* Header */
    var headerHtml='<div class="card" style="background:linear-gradient(135deg,var(--primary-bg),transparent);padding:16px;margin-bottom:14px;">'+
      '<h3 style="margin:0 0 6px;">'+escS(e.title)+'</h3>'+
      '<div class="text-xs text-muted">👨‍🏫 '+(teacher?teacher.name:'-')+' · 👥 '+(g?g.name:'-')+'</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-top:12px;">'+
      '<div style="text-align:center;"><div style="font-size:24px;font-weight:900;color:var(--primary);font-family:var(--font-en);">'+score+'</div><div class="text-xs text-muted">من '+max+'</div></div>'+
      '<div style="text-align:center;"><div style="font-size:24px;font-weight:900;color:'+(pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)')+';font-family:var(--font-en);">'+pct+'%</div><div class="text-xs text-muted">النسبة</div></div>'+
      (att.rank?'<div style="text-align:center;"><div style="font-size:24px;font-weight:900;font-family:var(--font-en);">#'+att.rank+'</div><div class="text-xs text-muted">من '+att.rankTotal+'</div></div>':'')+
      '<div style="text-align:center;"><div style="font-size:24px;font-weight:900;">'+(released?'✅':'🕒')+'</div><div class="text-xs text-muted">'+(released?'معتمد':'قيد المراجعة')+'</div></div>'+
      '</div>'+
      (!released&&pol==='instant'?'<div class="filter-info" style="margin-top:10px;background:var(--warning-bg);border-color:var(--warning);color:var(--warning);">⚠️ الامتحان فوري لكن في انتظار اعتماد الأستاذ النهائي</div>':'')+
      '</div>';

    /* الأسئلة */
    var questionsHtml='';
    var qs=e.questions||[];
    var answers=att.answers||[];
    if(qs.length){
      questionsHtml='<h4 style="margin:14px 0 10px;">❓ الأسئلة والإجابات ('+qs.length+')</h4>'+
        qs.map(function(q,i){
          var myAns=answers.find(function(a){return a.questionId===q.id;});
          var myVal=myAns?myAns.answer:'';
          var correct=released?(q.correct!=null?q.correct:null):null;
          var isCorrect=correct!=null&&String(myVal)===String(correct);
          var statusIcon=correct==null?'⏳':(isCorrect?'✅':'❌');
          var typeLabel={mcq:'📋 اختيار',truefalse:'✔️ صح/خطأ',essay:'✍️ مقالي'}[q.type]||'';

          var qHtml='<div class="card" style="padding:12px;margin-bottom:8px;border-right:3px solid '+(correct==null?'var(--border)':(isCorrect?'var(--success)':'var(--danger)'))+';">'+
            '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px;">'+
            '<strong style="font-size:13px;">س'+(i+1)+'. '+escS(q.text||'')+'</strong>'+
            '<span class="badge badge-muted">'+statusIcon+' '+(q.points||1)+' درجة</span></div>'+
            '<div class="text-xs text-muted" style="margin-bottom:6px;">'+typeLabel+'</div>';

          if(q.type==='mcq'){
            qHtml+='<div style="display:grid;gap:4px;">';
            (q.options||[]).forEach(function(opt,oi){
              var isMine=String(myVal)===String(oi);
              var isCorrectOpt=correct==oi;
              var bg=isMine?(isCorrect?'var(--success-bg)':'var(--danger-bg)'):(isCorrectOpt?'var(--success-bg)':'var(--surface-hover)');
              var border=isMine?'2px solid '+(isCorrect?'var(--success)':'var(--danger)'):(isCorrectOpt?'2px solid var(--success)':'1px solid var(--border)');
              qHtml+='<div style="padding:8px;border-radius:8px;background:'+bg+';border:'+border+';display:flex;gap:8px;align-items:center;">'+
                '<span style="font-weight:700;">'+(isMine?'✓ إجابتك':'')+(isCorrectOpt?' ✓ الصحيحة':'')+'</span>'+
                '<span style="flex:1;">'+escS(opt||'')+'</span></div>';
            });
            qHtml+='</div>';
          } else if(q.type==='truefalse'){
            qHtml+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
            ['صح','خطأ'].forEach(function(lbl,oi){
              var val=oi===0?'true':'false';
              var isMine=String(myVal)===val;
              var isCorrectOpt=correct===val;
              var bg=isMine?(isCorrect?'var(--success-bg)':'var(--danger-bg)'):(isCorrectOpt?'var(--success-bg)':'var(--surface-hover)');
              qHtml+='<div style="padding:10px;border-radius:8px;background:'+bg+';text-align:center;font-weight:700;">'+lbl+(isMine?' ✓':'')+'</div>';
            });
            qHtml+='</div>';
          } else {
            qHtml+='<div style="padding:10px;border-radius:8px;background:var(--surface-hover);">';
            qHtml+='<div class="text-xs text-muted" style="margin-bottom:4px;">إجابتك:</div>';
            qHtml+='<div style="font-weight:600;">'+(myAns?escS(myAns.answer||'(فارغة)'):'<span class="text-muted">لم تُسجّل</span>')+'</div>';
            if(myAns&&myAns.answerImages&&myAns.answerImages.length){
              qHtml+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px;margin-top:8px;">';
              myAns.answerImages.forEach(function(url){ qHtml+='<img src="'+window.driveThumb(url)+'" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;">'; });
              qHtml+='</div>';
            }
            if(!released) qHtml+='<div class="text-xs text-muted" style="margin-top:6px;">⏳ الإجابة النموذجية هتظهر بعد الاعتماد</div>';
            qHtml+='</div>';
          }
          qHtml+='</div>';
          return qHtml;
        }).join('');
    } else {
      questionsHtml='<div class="text-center text-muted" style="padding:20px;">مفيش أسئلة مسجلة</div>';
    }

    /* ملاحظات الغش */
    var suspHtml='';
    if(att.suspiciousActivities&&att.suspiciousActivities.length){
      suspHtml='<div class="card" style="background:var(--warning-bg);padding:12px;margin-top:10px;">'+
        '<strong>⚠️ ملاحظات أمان ('+att.suspiciousActivities.length+')</strong>'+
        '<div style="margin-top:6px;">'+att.suspiciousActivities.map(function(s){
          return '<div class="text-xs" style="margin-top:3px;">• '+(s.reason||s.type)+(s.at?' · '+new Date(s.at).toLocaleTimeString('ar-EG'):'')+'</div>';
        }).join('')+'</div></div>';
    }

    ThemeManager.openModal(
      '<div class="modal-header"><h3 class="modal-title">👁 مراجعة الامتحان</h3>'+
      '<button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>'+
      '<div class="modal-body" style="max-height:75vh;overflow-y:auto;">'+headerHtml+questionsHtml+suspHtml+'</div>',
      'modal-lg'
    );
  }catch(e){ console.error(e); toast('خطأ في المراجعة','error'); }
};

/* 🆕 مراجعة واجب سابق */
EX.reviewPastHomework=function(hwId){
  try{
    var u=cur(); if(!u) return;
    var sid=u.role==='student'?u.id:(u.studentIds||[])[0];
    if(!sid) return;
    var d=db();
    var h=(d.homework||[]).find(function(x){return x.id===hwId;}); if(!h) return;
    var sub=(d.submissions||[]).find(function(s){return s.homeworkId===hwId&&s.studentId===sid;});
    if(!sub){ toast('لم تسلّم الواجب بعد','warning'); return; }
    var g=gById(h.groupId);
    var teacher=(g&&g.teacherId)?(DataService.getUserById?DataService.getUserById(g.teacherId):null):null;
    var released=isReleased(h, sub);
    var max=h.totalPoints||20;
    var score=sub.score||0;
    var pct=sub.maxScore?Math.round(sub.score/sub.maxScore*100):0;

    var body='<div class="card" style="padding:14px;margin-bottom:12px;">'+
      '<h3 style="margin:0 0 6px;">'+escS(h.title)+'</h3>'+
      '<div class="text-xs text-muted">👨‍🏫 '+(teacher?teacher.name:'-')+' · 👥 '+(g?g.name:'-')+'</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-top:10px;">'+
      '<div style="text-align:center;"><div style="font-size:22px;font-weight:900;color:var(--primary);">'+score+'</div><div class="text-xs text-muted">من '+max+'</div></div>'+
      '<div style="text-align:center;"><div style="font-size:22px;font-weight:900;color:'+(pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)')+';">'+pct+'%</div><div class="text-xs text-muted">النسبة</div></div>'+
      '<div style="text-align:center;"><div style="font-size:22px;font-weight:900;">'+(released?'✅':'🕒')+'</div><div class="text-xs text-muted">'+(released?'معتمد':'قيد المراجعة')+'</div></div>'+
      '</div></div>';

    if(sub.answerImages&&sub.answerImages.length){
      body+='<h4 style="margin:12px 0 8px;">📸 إجاباتي ('+sub.answerImages.length+' صورة)</h4>'+
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;">'+
        sub.answerImages.map(function(url){ return '<img src="'+window.driveThumb(url).replace('sz=w400','sz=w800')+'" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;cursor:pointer;" onclick="window.openImageZoom(\''+window.driveThumb(url).replace('sz=w400','sz=w1200')+'\')">'; }).join('')+
        '</div>';
    }
    if(sub.answers&&sub.answers.length){
      body+='<h4 style="margin:12px 0 8px;">✍️ إجاباتي النصية</h4>';
      sub.answers.forEach(function(a,i){
        body+='<div class="card" style="padding:10px;margin-bottom:6px;"><div class="text-xs text-muted">س'+(i+1)+'</div><div style="margin-top:4px;">'+escS(a.answer||'(فارغة)')+'</div></div>';
      });
    }

    ThemeManager.openModal(
      '<div class="modal-header"><h3 class="modal-title">👁 مراجعة الواجب</h3>'+
      '<button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>'+
      '<div class="modal-body" style="max-height:75vh;overflow-y:auto;">'+body+'</div>',
      'modal-md'
    );
  }catch(e){ console.error(e); toast('خطأ في المراجعة','error'); }
};

/* تحديث hook الـ showSection */
if(typeof window.showSection==='function'&&!EX.__studentHook){
  EX.__studentHook=1;
  var _os2=window.showSection;
  window.showSection=function(id){
    var r=_os2.apply(this,arguments);
    setTimeout(function(){
      var role=window.LG&&LG.role?LG.role():'';
      if(role==='student'||role==='parent'){
        if(id==='exams') EX.renderStudentExamsList();
        if(id==='homework') EX.renderStudentHomeworkList();
      }
    },60);
    return r;
  };
}

/* ========== 📝 محرك حل الواجب (تجربة امتحان بتصميم أبسط) ========== */
var HS={};
EX.openHomeworkSolver=function(hwId){
  var d=db(); var h=(d.homework||[]).find(function(x){return x.id===hwId;}); if(!h) return;
  var u=cur(); var sid=u&&u.role==='student'?u.id:null; if(!sid) return;
  var g=gById(h.groupId); var teacher=(g&&g.teacherId)?(DataService.getUserById?DataService.getUserById(g.teacherId):null):null;
  var canUpload=(h.allowImages===true)||(h.allowImages==='yes')||((h.allowImages==null||h.allowImages==='auto')&&!!h.imageUrl);
  var existing=(d.submissions||[]).find(function(s){return s.homeworkId===hwId&&s.studentId===sid;});

  /* ========== 👁 وضع المراجعة: يشوف حله بس من غير تعديل (زي مودال الامتحان) ========== */
  if(existing&&(existing.status==='submitted'||existing.status==='graded'||existing.status==='approved')){
    var max=existing.maxScore||h.totalPoints||20;
    var score=typeof existing.score==='number'?existing.score:null;
    var pct=score!=null?Math.round(score/max*100):null;
    var body='<div class="modal-header"><h3 class="modal-title">👁 مراجعة: '+escS(h.title)+'</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
      '<div class="filter-info" style="background:var(--success-bg);border-color:var(--success);color:var(--success);">🔒 تم التسليم — عرض فقط بدون تعديل</div>'+
      (score!=null
        ? '<div style="text-align:center;margin:10px 0;"><div dir="ltr" style="font-size:34px;font-weight:900;color:'+(pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)')+';font-family:var(--font-en);">'+score+' / '+max+'</div><div class="text-xs text-muted">درجتك (تصحيح تلقائي) · '+pct+'%</div></div>'
        : '<div class="filter-info">🕒 بانتظار رصد الأستاذ</div>');
    var qs=h.questions||[];
    if(qs.length){
      body+=qs.map(function(q,i){
        var ans=(existing.answers||[]).find(function(a){return a.questionId===q.id;});
        var val=ans?ans.answer:'';
        var qh='<div class="card" style="padding:12px;margin-bottom:8px;"><strong style="font-size:13px;">س'+(i+1)+'. '+escS(q.text||'')+'</strong><div style="margin-top:8px;padding:10px;background:var(--surface-hover);border-radius:10px;">';
        if(q.type==='mcq'){
          qh+=(q.options||[]).map(function(o,oi){
            var mine=String(val)===String(oi);
            var corr=String(q.correct!=null?q.correct:q.correctAnswer)===String(oi);
            return '<div style="padding:6px 8px;border-radius:8px;margin-bottom:4px;font-size:12px;background:'+(mine?(corr?'var(--success-bg)':'var(--danger-bg)'):(corr?'var(--success-bg)':'transparent'))+';border:1px solid '+(mine?(corr?'var(--success)':'var(--danger)'):(corr?'var(--success)':'var(--border)'))+';">'+(oi+1)+') '+escS(o||'')+(mine?' ← إجابتك':'')+(corr&&!mine?' ← الصحيحة':'')+'</div>';
          }).join('');
        }else if(q.type==='truefalse'){
          qh+='<div style="font-weight:800;">'+(val==='true'?'✓ صح':val==='false'?'✗ خطأ':'لم يُجاب')+'</div><div class="text-xs text-muted">الصحيحة: '+((q.correct===true||q.correct==='true')?'✓ صح':'✗ خطأ')+'</div>';
        }else{
          qh+='<div style="white-space:pre-wrap;">'+escS(val||'(لا إجابة)')+'</div>';
        }
        qh+='</div>';
        if(ans&&ans.answerImages&&ans.answerImages.length) qh+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">'+ans.answerImages.map(function(im){return '<img src="'+im+'" style="width:56px;height:56px;object-fit:cover;border-radius:8px;">';}).join('')+'</div>';
        return qh+'</div>';
      }).join('');
    }else{
      body+=(existing.note?'<div class="filter-info" style="margin-top:8px;">📝 ملاحظاتك: '+escS(existing.note)+'</div>':'');
    }
    if(existing.answerImages&&existing.answerImages.length){
      body+='<div class="text-xs text-muted" style="margin:10px 0 4px;">📸 صور تسليمك:</div><div style="display:flex;gap:6px;flex-wrap:wrap;">'+existing.answerImages.map(function(im){return '<img src="'+im+'" style="width:70px;height:70px;object-fit:cover;border-radius:8px;cursor:pointer;" onclick="window.openImageZoom&&window.openImageZoom(this.src)">';}).join('')+'</div>';
    }
    ThemeManager.openModal(body+'</div>','modal-lg');
    return;
  }

  /* ========== ✍️ وضع الحل — مرة واحدة بس ========== */
  HS={__extra:[]}; (h.questions||[]).forEach(function(q){ HS[q.id]={value:'',images:[]}; });
  var submitting=false;
  function render(){
    var qs=h.questions||[];
    var body='<div class="modal-header"><h3 class="modal-title">📝 '+escS(h.title)+'</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
    '<div class="filter-info" style="background:var(--success-bg);border-color:var(--success);color:var(--success);">👨‍ '+(teacher?escS(teacher.name):'-')+' · 👥 '+escS(g?g.name:'-')+' · 📅 التسليم: '+(h.deadline||'-')+'</div>'+
    '<div class="filter-info">⚠️ عندك <strong>محاولة واحدة</strong> — بعد التسليم هتقدر تشوف حلك بس من غير تعديل.</div>'+
    (h.imageUrl?'<div style="margin:10px 0;"><div class="text-xs text-muted" style="margin-bottom:4px;">📄 ورقة الواجب:</div><img src="'+(window.driveThumb?driveThumb(h.imageUrl):h.imageUrl)+'" style="width:100%;max-height:260px;object-fit:contain;border-radius:12px;border:2px solid var(--success);background:var(--surface-hover);"></div>':'');
    if(qs.length){
      body+=qs.map(function(q,i){
        var st=HS[q.id];
        var qh='<div class="card" style="padding:12px;margin-bottom:10px;border-right:3px solid var(--success);"><strong style="font-size:13px;">س'+(i+1)+'. '+escS(q.text||'')+'</strong><div class="text-xs text-muted" style="margin:4px 0 8px;">'+({mcq:'📋 اختياري',truefalse:'✔️ صح/خطأ',essay:'✍️ كتابة'}[q.type]||'')+' · '+(q.points||1)+' درجة</div>';
        if(q.type==='mcq'){
          qh+='<div style="display:grid;gap:6px;">'+(q.options||[]).map(function(o,oi){
            return '<button type="button" class="btn '+(String(st.value)===String(oi)?'btn-success':'btn-secondary')+' btn-sm" style="justify-content:flex-start;" onclick="window.__hsPick(\''+q.id+'\',\''+oi+'\')">'+(oi+1)+') '+escS(o||'')+'</button>';
          }).join('')+'</div>';
        }else if(q.type==='truefalse'){
          qh+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;"><button type="button" class="btn '+(st.value==='true'?'btn-success':'btn-secondary')+'" onclick="window.__hsPick(\''+q.id+'\',\'true\')">✓ صح</button><button type="button" class="btn '+(st.value==='false'?'btn-danger':'btn-secondary')+'" onclick="window.__hsPick(\''+q.id+'\',\'false\')">✗ خطأ</button></div>';
        }else{
          qh+='<textarea class="form-input" rows="3" placeholder="اكتب إجابتك..." oninput="window.__hsText(\''+q.id+'\',this.value)">'+escS(st.value||'')+'</textarea>';
        }
        if(canUpload){
          qh+='<label style="display:block;border:2px dashed var(--border);border-radius:10px;padding:10px;text-align:center;cursor:pointer;margin-top:8px;background:var(--surface-hover);"><input type="file" accept="image/*" multiple style="display:none;" onchange="window.__hsImgs(\''+q.id+'\',this)"><div style="font-size:20px;">📷</div><div class="text-xs text-muted">ارفع صورة حلك للسؤال</div></label>'+
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">'+(st.images||[]).map(function(im){return '<img src="'+im+'" style="width:52px;height:52px;object-fit:cover;border-radius:8px;">';}).join('')+'</div>';
        }
        return qh+'</div>';
      }).join('');
    }else{
      body+='<div class="form-group"><label>✍️ ملاحظات / حل نصي</label><textarea id="hsNote" class="form-input" rows="4" placeholder="اكتب حلك أو ملاحظاتك..."></textarea></div>';
      body+=canUpload
        ?'<label style="display:block;border:2px dashed var(--border);border-radius:12px;padding:16px;text-align:center;cursor:pointer;background:var(--surface-hover);"><input type="file" accept="image/*" multiple style="display:none;" onchange="window.__hsImgs(\'__extra\',this)"><div style="font-size:30px;">📷</div><div style="font-weight:700;margin-top:4px;">ارفع صور حلك</div></label><div id="hsExtraImgs" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;"></div>'
        :'<div class="filter-info">🚫 الواجب ده من غير رفع صور — حلّه ورقياً وسلّمه في الحصة أو اكتب في الملاحظات</div>';
    }
    body+='<button type="button" id="hsSubmitBtn" class="btn btn-success w-full" style="margin-top:12px;padding:14px;font-weight:900;" onclick="window.__hsSubmit(\''+hwId+'\')">📤 تسليم الحل (مرة واحدة)</button></div>';
    ThemeManager.openModal(body,'modal-lg');
  }
  window.__hsPick=function(qid,v){ HS[qid].value=String(v); render(); };
  window.__hsText=function(qid,v){ HS[qid].value=v; };
  window.__hsImgs=function(qid,input){
    Array.prototype.slice.call(input.files||[]).forEach(function(f){
      var rd=new FileReader();
      rd.onload=function(e){
        if(qid==='__extra'){ HS.__extra.push(e.target.result); var host=document.getElementById('hsExtraImgs'); if(host) host.insertAdjacentHTML('beforeend','<img src="'+e.target.result+'" style="width:52px;height:52px;object-fit:cover;border-radius:8px;">'); }
        else { HS[qid].images.push(e.target.result); render(); }
      };
      rd.readAsDataURL(f);
    });
  };
  window.__hsSubmit=function(id){
    if(submitting) return; submitting=true;
    var b=document.getElementById('hsSubmitBtn'); if(b){ b.disabled=true; b.textContent='⏳ جاري التسليم...'; }
    var d2=db(); d2.submissions=d2.submissions||[];
    var again=d2.submissions.find(function(s){return s.homeworkId===id&&s.studentId===sid;});
    if(again){ toast('🔒 سلّمت الواجب ده قبل كده — افتح المراجعة','warning'); submitting=false; if(b){b.disabled=false;b.textContent='📤 تسليم الحل (مرة واحدة)';} return; }
    var answers=(h.questions||[]).map(function(q){ var st=HS[q.id]||{}; return {questionId:q.id,answer:st.value||'',answerImages:(st.images||[]).slice()}; });
    var imgsAll=(HS.__extra||[]).concat(answers.reduce(function(a,x){return a.concat(x.answerImages||[]);},[]));
    var sub={id:'sub_'+id+'_'+sid,homeworkId:id,studentId:sid,answers:answers,answerImages:imgsAll,note:((document.getElementById('hsNote')||{}).value)||'',submittedAt:new Date().toISOString()};
    /* 🧮 تصحيح تلقائي فوري للأسئلة الموضوعية */
    var auto=gradeAnswers(h.questions,answers);
    var maxPts=examMaxPoints(h);
    sub.score=auto; sub.maxScore=maxPts; sub.autoGraded=true; sub.status='graded'; sub.gradedBy='auto'; sub.releasedAt=sub.submittedAt;
    d2.submissions.push(sub);
    saveD(d2); cloudDoc('submissions',sub);
    /* 🔔 إشعار واحد بس للأستاذ */
    try{
      if(teacher&&!sub.nTf){ sub.nTf=1;
        DataService.addNotification({targetUserId:teacher.id,title:'📝 تسليم واجب: '+h.title,message:(u.name||'طالب')+' سلّم حلّه — درجة تلقائية '+auto+'/'+maxPts+(imgsAll.length?' ('+imgsAll.length+' صورة)':''),type:'homework',meta:{event:'hw_submit',refId:id+'_'+sid,groupId:h.groupId}});
      }
    }catch(e){}
    ThemeManager.closeModal();
    toast('✅ اتسلّم — درجتك الفورية: '+auto+'/'+maxPts,'success');
    try{ EX.renderStudentHomeworkList&&EX.renderStudentHomeworkList(); }catch(e){}
  };
  render();
};


function hookHomeworkSolver(){
  if(window.__hwSolverHook) return; window.__hwSolverHook=1;
  var ow=window.openHomework;
  window.openHomework=function(id){
    if(role()==='student'){ EX.openHomeworkSolver(id); return; }
    if(ow) return ow.apply(this,arguments);
  };
}



/* ========== 📈 متابعة التقدم ========== */
EX.progressHtml=function(sid){
  var d=db();
  var mine=(d.examAttempts||[]).filter(function(a){return a.studentId===sid&&a.score!=null&&(a.releasedAt||a.visibleToStudent);});
  mine.sort(function(a,b){return String(a.gradedAt||'').localeCompare(String(b.gradedAt||''));});
  if(!mine.length) return '';
  var rows=mine.slice(-4).map(function(a){
    var e=(d.exams||[]).find(function(x){return x.id===a.examId;});
    return {t:(e?e.title:'امتحان'),pct:Math.round(a.score/(a.maxScore||100)*100),rank:a.rank||'-',tot:a.rankTotal||'-'};
  });
  var delta='';
  if(rows.length>=2){ var df=rows[rows.length-1].pct-rows[rows.length-2].pct; delta='<div style="margin-top:8px;font-size:13px;font-weight:900;color:'+(df>=0?'var(--success)':'var(--danger)')+';">'+(df>=0?'▲ تحسّن +'+df+'%':'▼ تراجع '+df+'%')+' عن الامتحان السابق</div>'; }
  var last=rows[rows.length-1];
  return '<div class="card" style="padding:12px;margin-top:12px;"><strong style="font-size:13px;">📈 متابعة مستوى الامتحانات</strong>'+
  '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">'+rows.map(function(r){ return '<span class="badge badge-info">📝 '+escS(r.t.slice(0,20))+': '+r.pct+'%</span>'; }).join('')+'</div>'+
  '<div class="text-xs text-muted" style="margin-top:6px;">آخر امتحان: '+escS(last.t)+' — ترتيبك '+last.rank+' من '+last.tot+'</div>'+delta+
  '<div class="progress-bar" style="margin-top:8px;"><div class="progress-bar-fill" style="width:'+last.pct+'%"></div></div></div>';
};
function injectProgressCard(){
  var u=cur(); if(!u) return;
  var sid=u.role==='student'?u.id:(u.role==='parent'?(u.studentIds||[])[0]:null);
  if(!sid) return;
  var sec=document.querySelector('.section.active'); if(!sec) return;
  if(sec.id!=='section-results'&&sec.id!=='section-grades') return;
  if(document.getElementById('examProgCard')) return;
  var html=EX.progressHtml(sid); if(!html) return;
  var wrap=document.createElement('div'); wrap.id='examProgCard'; wrap.innerHTML=html;
  /* 🎯 fallback: البحث عن أي حاوية موجودة (resultsGrid القديم أو resultsGrouped الجديد) */
  var grid=document.getElementById('resultsGrid')||document.getElementById('resultsGrouped');
  if(grid){ wrap.style.gridColumn='1/-1'; grid.parentNode.insertBefore(wrap, grid); }
  else { var hdr=sec.querySelector('.section-header'); if(hdr&&hdr.nextSibling) sec.insertBefore(wrap,hdr.nextSibling); else sec.appendChild(wrap); }
}
function registerAll(){
  /* 🎯 سجل كل الدوال العامة على window قبل أي استخدام */
  var publicFns = [
    'renderStudentExamsList', 'renderStudentHomeworkList',
    'reviewPastExam', 'reviewPastHomework',
    'renderGradesPage', 'renderExamsPage',
    'openGradeEntry', 'openHwGradeEntry',
    'openOnlineReview', 'openHwReview',
    'approveOne', 'approveAllOnline', 'approveHwOne',
    'saveGrades', 'saveHwGrades',
    'viewItemDetails', 'editItem', 'deleteItem', 'saveEditItem',
    'gfTab', 'gfSet',
    'openUnifiedCreator',
    'renderRank', 'viewSuspicious',
    'waStudent', 'waParent', 'waHwStudent', 'waHwParent',
    'qRefresh', 'qbTarget', 'qbSave',
    'progressHtml'
  ];
  publicFns.forEach(function(k){
    if (typeof EX[k] === 'function') {
      window[k] = EX[k];
      if (!window.LG) window.LG = {};
      window.LG[k] = EX[k];
    }
  });
  /* الاحتياط: سجل أي دالة جديدة في EX */
  Object.keys(EX).forEach(function(k){
    if (typeof EX[k] === 'function' && String(k).indexOf('__') !== 0) {
      if (!window[k]) window[k] = EX[k];
      if (!window.LG[k]) window.LG[k] = EX[k];
    }
  });
}
function organize(){
  migratePaperExams(); killOld(); slimSidebar(); injectTabs(); cleanGradesFilters();
  try{ EX.regradeAll(false); }catch(e){}
  try{ EX.regradeAll(false); }catch(e){}
  
  /* 🚫 منع تنفيذ الـ injection عند الطالب وولي الأمر */
  var r=role();
  if(r!=='student'&&r!=='parent'){
    injectGradesPage();
    injectExamsPage();
  }
  
  simplifyGrades();
  hookHomeworkSolver();
  registerAll();
}
if(typeof window.showSection==='function'&&!EX.__orgHook){
  EX.__orgHook=1;
  var os=window.showSection;
  window.showSection=function(id){
    var r=os.apply(this,arguments);
    setTimeout(function(){
      injectTabs(); slimSidebar(); registerAll();
      
      /* 🚫 منع تنفيذ الـ injection عند الطالب */
      var role=window.LG&&LG.role?LG.role():'';
      if(role!=='student'&&role!=='parent'){
        if(id==='grades'){ cleanGradesFilters(); injectGradesPage(); simplifyGrades(); }
        if(id==='exams'||id==='homework'){ injectExamsPage(); }
      }
      
      if(id==='results'||id==='grades'){ injectProgressCard(); }
    },60);
    return r;
  };
}
/* 🎯 fallback للنتائج - في حالة عدم وجود student-results.js */
if (typeof window.loadResultsV3 !== 'function') {
  window.loadResultsV3 = function(){
    try {
      var u = cur(); if (!u) return;
      var sid = u.role === 'parent' ? ((u.studentIds||[])[0]||null) : u.id;
      if (!sid) return;
      var sec = document.getElementById('section-results');
      if (!sec) return;
      
      /* تنظيف قديم */
      ['resultsGrid','resultsPaperList','resultsOnlineList'].forEach(function(id){
        var el=document.getElementById(id); if(el) el.remove();
      });
      
      /* إنشاء حاوية جديدة */
      var host = document.getElementById('resultsGrouped');
      if (!host) {
        host = document.createElement('div');
        host.id = 'resultsGrouped';
        host.style.cssText = 'display:grid;gap:16px;';
        sec.appendChild(host);
      }
      
      var d = db();
      var ts = (DataService.getStudentTeachers ? DataService.getStudentTeachers(sid) : []);
      var gmap = {};
      ts.forEach(function(t){ if (t.group) gmap[t.group.id] = t; });
      
      /* تجميع الامتحانات + الواجبات */
      var items = [];
      (d.exams||[]).forEach(function(e){
        if (!gmap[e.groupId]) return;
        var att = (d.examAttempts||[]).find(function(a){return a.examId===e.id && a.studentId===sid;});
        var st = getExamStatus(e, att);
        if (st === 'available' || st === 'overdue') return;
        items.push({kind:'exam', rec:e, att:att, st:st, gid:e.groupId});
      });
      (d.homework||[]).forEach(function(h){
        if (!gmap[h.groupId]) return;
        var sub = (d.submissions||[]).find(function(s){return s.homeworkId===h.id && s.studentId===sid;});
        var st = getHwStatus(h, sub);
        if (st === 'available' || st === 'overdue') return;
        items.push({kind:'hw', rec:h, sub:sub, st:st, gid:h.groupId});
      });
      
      items.sort(function(a,b){
        var da = (a.att&&a.att.submittedAt) || (a.sub&&a.sub.submittedAt) || a.rec.date || a.rec.deadline || '';
        var db2 = (b.att&&b.att.submittedAt) || (b.sub&&b.sub.submittedAt) || b.rec.date || b.rec.deadline || '';
        return String(db2).localeCompare(String(da));
      });
      
      /* إحصائيات */
      var graded = items.filter(function(i){return i.st==='approved'||i.st==='instant'||i.st==='offline-graded';});
      var review = items.filter(function(i){return i.st==='submitted'||i.st==='review';});
      var avg = graded.length ? Math.round(graded.reduce(function(s,i){
        var att = i.att || i.sub;
        var max = (att && att.maxScore) || i.rec.totalPoints || 100;
        return s + ((att.score||0)/max*100);
      },0)/graded.length) : 0;
      
      var ov = document.getElementById('resultsOverview');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'resultsOverview';
        ov.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:14px;';
        host.parentNode.insertBefore(ov, host);
      }
      ov.innerHTML = 
        '<div class="card" style="padding:12px;text-align:center;margin:0;"><div style="font-size:22px;font-weight:900;color:var(--primary);">'+items.length+'</div><div class="text-xs text-muted">📚 تقييم</div></div>'+
        '<div class="card" style="padding:12px;text-align:center;margin:0;"><div style="font-size:22px;font-weight:900;color:var(--success);">'+graded.length+'</div><div class="text-xs text-muted">✅ صادر</div></div>'+
        '<div class="card" style="padding:12px;text-align:center;margin:0;"><div style="font-size:22px;font-weight:900;color:var(--warning);">'+review.length+'</div><div class="text-xs text-muted">🕒 مراجعة</div></div>'+
        '<div class="card" style="padding:12px;text-align:center;margin:0;"><div style="font-size:22px;font-weight:900;color:'+(avg>=75?'var(--success)':avg>=50?'var(--warning)':'var(--danger)')+';">'+avg+'%</div><div class="text-xs text-muted">📊 متوسطك</div></div>';
      
      if (!items.length) {
        host.innerHTML = '<div class="card" style="text-align:center;padding:36px;"><div style="font-size:44px;">📭</div><strong>لا توجد نتائج بعد</strong><div class="text-xs text-muted" style="margin-top:6px;">لما تحل امتحان/واجب هتشوفه هنا</div></div>';
        return;
      }
      
      /* تجميع حسب الأستاذ */
      var byT = {};
      items.forEach(function(it){
        var t = gmap[it.gid];
        var tid = (t && t.teacher) ? t.teacher.id : 'x';
        if (!byT[tid]) byT[tid] = {t:(t&&t.teacher)||null, g:(t&&t.group)||null, list:[]};
        byT[tid].list.push(it);
      });
      
      host.innerHTML = Object.keys(byT).map(function(tid){
        var b = byT[tid];
        var gradedList = b.list.filter(function(i){return i.st==='approved'||i.st==='instant'||i.st==='offline-graded';});
        var tAvg = gradedList.length ? Math.round(gradedList.reduce(function(s,i){
          var att = i.att || i.sub;
          var max = (att && att.maxScore) || i.rec.totalPoints || 100;
          return s + ((att.score||0)/max*100);
        },0)/gradedList.length) : 0;
        
        return '<div class="card" style="padding:0;overflow:hidden;">'+
          '<div style="background:linear-gradient(135deg,var(--primary),#8b5cf6);color:#fff;padding:12px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">'+
          '<div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:900;">'+escS(((b.t&&b.t.name)||'؟').charAt(0))+'</div>'+
          '<div style="flex:1;"><strong>'+escS((b.t&&b.t.name)||'أساتذتي')+'</strong><div style="font-size:11px;opacity:.9;">📚 '+escS((b.t&&b.t.subject)||'')+' · 👥 '+escS((b.g&&b.g.name)||'')+'</div></div>'+
          (tAvg?'<span style="background:rgba(255,255,255,.25);padding:4px 12px;border-radius:99px;font-weight:900;">⭐ '+tAvg+'%</span>':'')+
          '</div><div style="padding:10px;display:grid;gap:8px;">'+
          b.list.map(function(it){
            var att = it.att || it.sub;
            var max = (att && att.maxScore) || it.rec.totalPoints || 100;
            var score = att ? att.score : null;
            var pct = score!=null ? Math.round(score/max*100) : null;
            var isGraded = it.st==='approved'||it.st==='instant'||it.st==='offline-graded';
            var badge = isGraded
              ? '<span class="grade-badge '+(pct>=75?'success':pct>=50?'warning':'danger')+'">'+(score!=null?score+'/'+max:'')+' · '+pct+'%</span>'
              : (it.st==='submitted'||it.st==='review'?'<span class="badge badge-warning">🕒 مراجعة</span>':'<span class="badge badge-muted">-</span>');
            var ico = it.kind==='exam' ? (it.rec.mode==='offline'||it.rec.paper?'🎓📄':'🎓🌐') : (it.rec.paper?'📝📄':'📝🌐');
            var onclick = it.kind==='exam' ? 'LG.reviewPastExam(\''+it.rec.id+'\')' : 'LG.openHomeworkSolver(\''+it.rec.id+'\')';
            return '<div class="sub-row" style="padding:10px;cursor:pointer;" onclick="'+onclick+'">'+
              '<div style="flex:1;min-width:0;"><strong style="font-size:13px;">'+ico+' '+escS(it.rec.title)+'</strong><div class="text-xs text-muted">📅 '+escS(String(it.rec.date||it.rec.deadline||'').slice(0,10))+'</div></div>'+badge+'</div>';
          }).join('')+
          '</div></div>';
      }).join('');
    } catch(e) {
      console.error('loadResultsV3 error:', e);
    }
  };
  window.loadResults = window.loadResultsV3;
  window.loadResultsV2 = window.loadResultsV3;
}

/* 🎯 Hook لعرض النتائج تلقائياً */
if (typeof window.showSection === 'function' && !window.__resultsAutoHook) {
  window.__resultsAutoHook = 1;
  var _os3 = window.showSection;
  window.showSection = function(id){
    var r = _os3.apply(this, arguments);
    if (id === 'results') {
      setTimeout(function(){
        if (typeof window.loadResultsV3 === 'function') window.loadResultsV3();
      }, 100);
    }
    return r;
  };
}
setTimeout(organize,600);

/* ========== 🛡️ تعريف نهائي للأوائل (بيكتب فوق أي نسخة قديمة/مكسورة) ========== */
EX.openToppers=function(kind,id){
  var d=db();
  var rec=(kind==='exam'?(d.exams||[]):(d.homework||[])).find(function(x){return x.id===id;});
  if(!rec){ toast('العنصر مش موجود','warning'); return; }
  var col=(kind==='exam'?(d.examAttempts||[]):(d.submissions||[]));
  var key=(kind==='exam'?'examId':'homeworkId');
  var g=gById(rec.groupId);
  var max0=rec.totalPoints||100;
  function medal(i){ return i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.'; }
  function row(a,i){
    var s=DataService.getUserById?DataService.getUserById(a.studentId):null;
    var mx=a.maxScore||max0; var pct=Math.round((a.score||0)/mx*100);
    var c=pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)';
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;min-width:0;"><strong style="font-size:13px;">'+medal(i)+' '+escS(s?s.name:'-')+'</strong><div class="text-xs text-muted">'+escS((s&&s.code)||'')+' · '+escS((s&&s.grade)||'')+'</div></div><span class="grade-badge" style="background:'+c+';color:#fff;">'+a.score+'/'+mx+' · '+pct+'%</span></div>';
  }
  var grp=col.filter(function(x){return x[key]===id&&x.score!=null;}).sort(function(a,b){return b.score-a.score;});
  var famIds={};
  if(rec.familyId){ (kind==='exam'?(d.exams||[]):(d.homework||[])).forEach(function(x){ if(x.familyId===rec.familyId) famIds[x.id]=1; }); }
  else { var grade=g?g.grade:''; (kind==='exam'?(d.exams||[]):(d.homework||[])).forEach(function(x){ var xg=gById(x.groupId); if(xg&&grade&&xg.grade===grade&&x.title===rec.title) famIds[x.id]=1; }); }
  var best={};
  col.forEach(function(x){ if(!famIds[x[key]]||x.score==null) return; if(!best[x.studentId]||x.score>best[x.studentId].score) best[x.studentId]=x; });
  var grL=Object.keys(best).map(function(k){return best[k];}).sort(function(a,b){return b.score-a.score;});
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🏆 الأوائل: '+escS(rec.title)+'</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
   '<div style="display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:10px;"><button class="tab-btn active" onclick="window.__tpTab(this,\'g\')">👥 المجموعة ('+grp.length+')</button><button class="tab-btn" onclick="window.__tpTab(this,\'gr\')">🎓 الصف ('+grL.length+')</button></div>'+
   '<div id="tp-g" style="max-height:50vh;overflow:auto;">'+(grp.length?grp.slice(0,20).map(row).join(''):'<p class="text-muted">لا درجات مرصودة بعد — ارصد الأول</p>')+'</div>'+
   '<div id="tp-gr" style="display:none;max-height:50vh;overflow:auto;">'+(grL.length?grL.slice(0,20).map(row).join(''):'<p class="text-muted">لا درجات لهذا الصف</p>')+'</div></div>','modal-md');
  window.__tpTab=function(btn,t){ btn.parentNode.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');}); btn.classList.add('active'); document.getElementById('tp-g').style.display=(t==='g'?'':'none'); document.getElementById('tp-gr').style.display=(t==='gr'?'':'none'); };
};
EX.openGradeLeaderboard=function(){
  var d=db();
  var grades={}; myGroups().forEach(function(g){ if(g.grade) grades[g.grade]=1; });
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🏆 أوائل الصفوف</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
   '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">'+
   '<div class="form-group"><label>🎓 الصف</label><select id="lbGrade" class="form-select">'+Object.keys(grades).map(function(g){return '<option value="'+g+'">'+g+'</option>';}).join('')+'</select></div>'+
   '<div class="form-group"><label>📚 النوع</label><select id="lbType" class="form-select"><option value="all">الكل</option><option value="online">🌐 أونلاين</option><option value="offline">📄 أوفلاين</option></select></div>'+
   '<div class="form-group"><label>🔢 أقل عدد تقييمات</label><input type="number" id="lbMin" class="form-input" value="1" min="1"></div></div>'+
   '<button class="btn btn-primary w-full" onclick="window.__lbRun()">🏆 اعرض الترتيب</button><div id="lbOut" style="margin-top:12px;max-height:50vh;overflow:auto;"></div></div>','modal-md');
  window.__lbRun=function(){
    var grade=(document.getElementById('lbGrade')||{}).value;
    var type=(document.getElementById('lbType')||{}).value;
    var minN=parseInt((document.getElementById('lbMin')||{}).value)||1;
    var gids={}; (DataService.getGroups?DataService.getGroups():[]).forEach(function(g){ if(g.grade===grade) gids[g.id]=1; });
    function rel(rec,att){ return att&&(att.status==='approved'||att.autoGraded||((rec.releasePolicy||'approve')==='instant'&&att.score!=null)); }
    var per={};
    function push(sid,pct,pts){ per[sid]=per[sid]||{sum:0,n:0,pts:0}; per[sid].sum+=pct; per[sid].n++; per[sid].pts+=pts; }
    (d.exams||[]).forEach(function(e){ if(!gids[e.groupId]) return; var off=(e.mode==='offline'||!!e.paper); if(type!=='all'&&(type==='offline')!==off) return;
      (d.examAttempts||[]).forEach(function(a){ if(a.examId===e.id&&a.score!=null&&rel(e,a)) push(a.studentId, a.score/(a.maxScore||e.totalPoints||100), a.score); }); });
    (d.homework||[]).forEach(function(h){ if(!gids[h.groupId]) return; var off=!!h.paper; if(type!=='all'&&(type==='offline')!==off) return;
      (d.submissions||[]).forEach(function(s){ if(s.homeworkId===h.id&&s.score!=null&&rel(h,s)) push(s.studentId, s.score/(s.maxScore||h.totalPoints||20), s.score); }); });
    var list=Object.keys(per).map(function(sid){ var v=per[sid]; return {sid:sid,avg:v.sum/v.n,n:v.n,pts:v.pts}; }).filter(function(r){return r.n>=minN;}).sort(function(a,b){ return b.avg-a.avg||b.n-a.n||b.pts-a.pts; });
    document.getElementById('lbOut').innerHTML=list.length?list.slice(0,25).map(function(r,i){
      var s=DataService.getUserById?DataService.getUserById(r.sid):null;
      var pct=Math.round(r.avg*100);
      var c=pct>=75?'var(--success)':pct>=50?'var(--warning)':'var(--danger)';
      return '<div class="sub-row" style="padding:8px;"><div style="flex:1;min-width:0;"><strong style="font-size:13px;">'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.')+' '+escS(s?s.name:'-')+'</strong><div class="text-xs text-muted">'+escS((s&&s.code)||'')+' · '+r.n+' تقييم · '+Math.round(r.pts)+' نقطة مجموع</div></div><span class="grade-badge" style="background:'+c+';color:#fff;">'+pct+'%</span></div>';
    }).join(''):'<p class="text-muted">لا درجات معتمدة كافية للصف/النوع ده</p>';
  };
};
registerAll();
})();