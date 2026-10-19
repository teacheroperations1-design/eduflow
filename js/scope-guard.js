/* ================================================================
🛡️ Scope Guard V1 — الفلتر المركزي للمجموعات/الطلاب/الأساتذة حسب الدور
• مساعد → مجموعات الأستاذ المرتبط بيه بس (ولو مش مرتبط = فاضي)
• أستاذ → مجموعاته هو بس
• مدير سنتر → مجموعات سنتره بس
• أدمن → الكل
• بيلفّ DataService.getGroups + Ops.groupsInScope → أي مودال أو صفحة بتقرأ مقفول تلقائياً
================================================================ */
(function(){
"use strict";
function cur(){ try{ return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null); }catch(e){ return null; } }
function db0(){ return (window.DataService&&DataService._getData)?DataService._getData():{}; }
function rawGroups(){ try{ return (window.DataService&&DataService.__rawGroups)?DataService.__rawGroups():((DataService.getGroups?DataService.getGroups():[])); }catch(e){ return []; } }
function linkedTeacherId(u){
  if(!u) return null;
  if(u.role==='teacher') return u.id;
  if(u.role==='assistant'){
    try{ if(window.Ops&&Ops.getAssignment){ var a=Ops.getAssignment(u.id); if(a&&a.teacherId) return a.teacherId; } }catch(e){}
    if(u.teacherId) return u.teacherId;
    try{ if(u.assistant&&u.assistant.scope&&u.assistant.scope.teacherIds&&u.assistant.scope.teacherIds.length) return u.assistant.scope.teacherIds[0]; }catch(e){}
    if(u.assignedTeacherIds&&u.assignedTeacherIds.length) return u.assignedTeacherIds[0];
    try{ if(window.Ops&&Ops.teachersInScope){ var l=Ops.teachersInScope(u.id); if(l&&l.length) return l[0].id; } }catch(e){}
    try{ if(window.getMyTeacherId){ var t=window.getMyTeacherId(); if(t) return t; } }catch(e){}
  }
  return null;
}
function groups(){
  var u=cur(); var gs=rawGroups();
  if(!u) return gs;
  if(u.role==='admin'||u.role==='super_admin') return gs;
  if(u.role==='teacher') return gs.filter(function(g){ return g.teacherId===u.id; });
  if(u.role==='assistant'){ var tid=linkedTeacherId(u); return tid?gs.filter(function(g){ return g.teacherId===tid; }):[]; }
  if(u.role==='center'){
    var cn=u.centerName||'';
    if(!cn){ var c=(db0().centers||[]).find(function(x){ return x.id===u.centerId; }); cn=c?c.name:''; }
    return cn?gs.filter(function(g){ return g.center===cn; }):[];
  }
  return gs;
}
function students(){
  var gids={}; groups().forEach(function(g){ gids[g.id]=1; });
  var d=db0(), ids={};
  (d.enrollments||[]).forEach(function(e){ if(e.status==='active'&&gids[e.groupId]) ids[e.studentId]=1; });
  return (DataService.getStudents?DataService.getStudents():[]).filter(function(s){ return ids[s.id]; });
}
function studentsForTeacher(tid){
  var d=db0(), ids={};
  (DataService.getGroups?DataService.getGroups():[]).forEach(function(g){ if(g.teacherId===tid)(d.enrollments||[]).forEach(function(e){ if(e.groupId===g.id&&e.status==='active') ids[e.studentId]=1; }); });
  return (DataService.getStudents?DataService.getStudents():[]).filter(function(s){ return ids[s.id]; });
}
function teachers(){
  var ids={}; groups().forEach(function(g){ if(g.teacherId) ids[g.teacherId]=1; });
  return (DataService.getTeachers?DataService.getTeachers():[]).filter(function(t){ return ids[t.id]; });
}
window.ScopedData={
  groups:groups, students:students, teachers:teachers,
  studentsForTeacher:studentsForTeacher,
  linkedTeacherId:function(){ return linkedTeacherId(cur()); },
  role:function(){ var u=cur(); return u?u.role:''; }
};

function wrap(){
  if(window.DataService&&!DataService.__scopeWrapped){
    DataService.__scopeWrapped=1;
    var og=DataService.getGroups.bind(DataService);
    DataService.__rawGroups=function(){ return og(); };
    DataService.getGroups=function(){
      var u=cur();
      if(!u||u.role==='admin'||u.role==='super_admin'||u.role==='student'||u.role==='parent') return og();
      return groups();
    };
  }
  if(window.Ops&&typeof Ops.groupsInScope==='function'&&!Ops.__scopeWrapped){
    Ops.__scopeWrapped=1;
    var os=Ops.groupsInScope;
    Ops.groupsInScope=function(uid){
      var u=(DataService.getUserById?DataService.getUserById(uid):null);
      if(u&&(u.role==='assistant'||u.role==='teacher'||u.role==='center')) return groups();
      return os.apply(this,arguments);
    };
  }
}
/* ========== 🧿 فلتر مستوى DOM: أي مودال يفتح لمساعد/أستاذ/مدير سنتر تتقص قوايم مجموعاتة تلقائياً ========== */
function roleNeedsFilter(){ var u=cur(); if(!u) return false; return u.role==='assistant'||u.role==='center'||u.role==='teacher'; }
function filterStudentSelects(root){
  var u=cur(); if(!u||u.role==='admin'||u.role==='super_admin') return;
  var tid=u.role==='teacher'?u.id:(u.role==='assistant'?linkedTeacherId(u):null);
  if(!tid) return;
  var ok={}; studentsForTeacher(tid).forEach(function(s){ ok[s.id]=1; });
  (root||document).querySelectorAll('select').forEach(function(sel){
    if(sel.dataset.sgStudentFiltered||!sel.id||sel.id.indexOf('student')<0) return;
    var opts=Array.prototype.slice.call(sel.options);
    if(!opts.some(function(o){ return (DataService.getStudents?DataService.getStudents():[]).some(function(s){return s.id===o.value;}); })) return;
    sel.dataset.sgStudentFiltered='1';
    var curV=sel.value;
    sel.innerHTML=opts.filter(function(o){ return o.value===''||ok[o.value]; }).map(function(o){ return o.outerHTML; }).join('');
    if(ok[curV]) sel.value=curV;
  });
}
function filterModalSelects(root){
  if(!roleNeedsFilter()) return;
  var ok={}; groups().forEach(function(g){ ok[g.id]=1; });
  var all={}; rawGroups().forEach(function(g){ all[g.id]=1; });
  (root||document).querySelectorAll('select').forEach(function(sel){
    if(sel.dataset.sgFiltered) return;
    var opts=Array.prototype.slice.call(sel.options);
    if(!opts.some(function(o){ return all[o.value]; })) return; /* مش قائمة مجموعات أصلاً */
    sel.dataset.sgFiltered='1';
    var curV=sel.value;
    sel.innerHTML=opts.filter(function(o){ return o.value===''||ok[o.value]; }).map(function(o){ return o.outerHTML; }).join('');
    if(ok[curV]) sel.value=curV;
  });
}
function wrapModals(){
  if(!window.ThemeManager||ThemeManager.__sgWrap) return;
  ThemeManager.__sgWrap=1;
  var om=ThemeManager.openModal.bind(ThemeManager);
  ThemeManager.openModal=function(html,size){
    var r=om(html,size);
   setTimeout(function(){ filterModalSelects(document); filterStudentSelects(document); },150);
setTimeout(function(){ filterModalSelects(document); filterStudentSelects(document); },600);
    return r;
  };
}
setInterval(function(){ wrapModals(); var m=document.querySelector('.modal-body,#globalModal'); if(m) filterModalSelects(m); },1500);
wrap(); setTimeout(wrap,800); setTimeout(wrap,2000); setInterval(wrap,5000);
setTimeout(wrapModals,600); setTimeout(wrapModals,1800);
})();