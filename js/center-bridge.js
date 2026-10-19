/* 🏢 center-bridge.js — بيحوّل نسخة لوحة المساعد إلى لوحة مدير السنتر */
(function(){
"use strict";
function dbx(){ try{ return DataService._getData(); }catch(e){ return {}; } }
var U=null; try{ U=AuthService.getCurrentUser(); }catch(e){}
if(!U||U.role!=='center') return;           /* يشتغل لمدير السنتر بس */
window.currentUser=window.currentUser||U;

function center(){ try{ return CM.myCenter(); }catch(e){ return null; } }
function cname(){ var c=center(); return c?c.name:''; }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
function SD(){ return window.ScopedData||{groups:function(){return [];},students:function(){return [];},teachers:function(){return [];}}; }
function allTeachers(){ return DataService.getTeachers?DataService.getTeachers():[]; }
function val(id){ var e=document.getElementById(id); return e?e.value:''; }
function rawGroups(){ try{ return (DataService.__rawGroups?DataService.__rawGroups():DataService.getGroups())||[]; }catch(e){ return []; } }

/* ===== 1) نطاق السنتر ===== */
window.getAllCenters=function(){ var n=cname(); return n?[n]:[]; };
function patchOps(){
  if(!window.Ops||Ops.__cnPatched) return; Ops.__cnPatched=1;
  var os=Ops.studentsInScope, ot=Ops.teachersInScope;
  Ops.studentsInScope=function(uid){ if(uid===U.id) return SD().students(); return os?os.apply(this,arguments):[]; };
  Ops.teachersInScope=function(uid){ if(uid===U.id) return allTeachers(); return ot?ot.apply(this,arguments):[]; };
}
function patchHelpers(){
  window.myGroups=function(){ return SD().groups(); };
  window.myGroupIds=function(){ return SD().groups().map(function(g){return g.id;}); };
  window.myStudents=function(){ return SD().students(); };
}

/* ===== 2) صفحة إدارة المجموعات (كل الأساتذة داخل السنتر) ===== */
function gCard(g){
  var sts=DataService.getStudentsByGroup?DataService.getStudentsByGroup(g.id):[];
  var sched=(g.schedules&&g.schedules.length)?g.schedules.map(function(s){return dayAr(s.day)+' '+T(s.time);}).join(' + '):(dayAr(g.day)+' '+T(g.time));
  return '<div class="group-management-card"><div class="group-header"><div class="group-info"><div class="group-name">'+esc(g.name)+(g.grade?' <span class="badge badge-info">'+esc(g.grade)+'</span>':'')+'</div><div class="group-meta">📅 '+sched+' · ⏱️ '+(g.duration||60)+' د · 💰 '+(g.monthlyFee||0)+'/شهر</div></div><div class="group-actions">'+
  '<button class="btn btn-success btn-sm" onclick="window.openGroupStudentsModal(\''+g.id+'\')">👥 الطلاب ('+sts.length+')</button>'+
  '<button class="btn btn-secondary btn-sm" onclick="window.openSwapModal(\''+g.id+'\')">🔄 تبديل</button>'+
  '<button class="btn btn-ghost btn-sm" onclick="window.openGroupModal(\''+g.id+'\')">✏️ تعديل</button>'+
  '<button class="btn btn-danger btn-sm" onclick="window.deleteGroupConfirm(\''+g.id+'\')">🗑️</button></div></div></div>';
}
window.loadWorkspace=function(){
  try{
    var host=document.getElementById('workspaceView'); if(!host) return;
    var gs=SD().groups();
    try{ if(window.applyGroupFilters) gs=window.applyGroupFilters(gs,'teachers'); }catch(e){}
    var byT={}; gs.forEach(function(g){ (byT[g.teacherId||'-']=byT[g.teacherId||'-']||[]).push(g); });
    var tids=Object.keys(byT);
    var html='<div class="card" style="margin-bottom:16px;border-right:4px solid var(--success);"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;"><div style="flex:1;min-width:200px;"><div style="font-size:15px;font-weight:800;">🏢 سنتر '+esc(cname())+'</div><div class="text-xs text-muted">'+gs.length+' مجموعة · '+tids.length+' أستاذ — أي تعديل بيوصل إشعار لمساعد الأستاذ وللأدمن</div></div><button class="btn btn-primary btn-sm" onclick="window.openGroupModal()">+ مجموعة جديدة</button></div></div>';
    if(!gs.length) html+='<div class="card" style="text-align:center;padding:30px;"><div style="font-size:40px;">📭</div><strong>لا مجموعات في سنترك لسه</strong></div>';
    tids.forEach(function(tid){
      var t=DataService.getUserById?DataService.getUserById(tid):null;
      html+='<h4 style="margin:14px 0 8px;">👨‍🏫 '+esc(t?t.name:'أستاذ')+' <span class="badge badge-muted">'+byT[tid].length+' مجموعة</span></h4>'+byT[tid].map(gCard).join('');
    });
    host.innerHTML=html;
  }catch(e){ console.error('center loadWorkspace',e); }
};
window.addStudentToGroup=async function(groupId){
  try{
    var sid=val('addStudentToGroup'); if(!sid){ window.safeToast('اختر طالب','error'); return; }
    var g=rawGroups().find(function(x){return x.id===groupId;});
    await DataService.addEnrollment({studentId:sid,groupId:groupId,teacherId:g?g.teacherId:null,status:'active'});
    window.safeToast('✅ تم إضافة الطالب للمجموعة','success');
    ThemeManager.closeModal(); window.loadWorkspace(); if(window.loadStudents) window.loadStudents();
  }catch(e){ window.safeToast('خطأ: '+e.message,'error'); }
};

/* ===== 3) جدول المجموعات ===== */
window.loadMyScheduleBoard=function(){
  try{
    var el=document.getElementById('myScheduleBoard'); if(!el) return;
    var gs=SD().groups(); if(!gs.length){ el.innerHTML='<div class="card" style="text-align:center;padding:30px;"><strong>لا مجموعات</strong></div>'; return; }
    var ORDER=['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];
    var today=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
    function mo(t){ var p=String(t||'0:00').split(':'); return (+p[0]||0)*60+(+p[1]||0); }
    el.innerHTML=ORDER.map(function(dEn){
      var items=[]; gs.forEach(function(g){ var sc=(g.schedules&&g.schedules.length)?g.schedules:[{day:g.day,time:g.time}]; sc.forEach(function(s){ if(s.day===dEn) items.push({g:g,s:s}); }); });
      items.sort(function(a,b){return mo(a.s.time)-mo(b.s.time);});
      var isT=dEn===today;
      return '<div class="card" style="margin-bottom:10px;padding:0;overflow:hidden;'+(isT?'border-color:var(--primary);':'')+'"><div style="display:flex;justify-content:space-between;padding:10px 14px;background:'+(isT?'var(--primary-bg)':'var(--surface-hover)')+';"><strong>'+dayAr(dEn)+(isT?' · اليوم':'')+'</strong><span class="points-badge">'+items.length+' حصة</span></div><div style="padding:10px 14px;">'+
      (items.length?items.map(function(it){ var t=DataService.getUserById?DataService.getUserById(it.g.teacherId):null; return '<div class="sub-row"><div><strong>'+esc(it.g.name)+'</strong><div class="text-xs text-muted">👨‍🏫 '+esc(t?t.name:'-')+' · 👥 '+(DataService.getStudentsByGroup?DataService.getStudentsByGroup(it.g.id).length:0)+'</div></div><span style="font-family:var(--font-en);font-weight:800;color:var(--primary);">'+T(it.s.time)+'</span></div>'; }).join(''):'<div class="text-xs text-muted">لا حصص</div>')+'</div></div>';
    }).join('');
  }catch(e){ console.error(e); }
};

/* ===== 4) العالم الافتراضي (أساتذة/طلاب محليين) ===== */
var LOCAL=[['lteachers','أساتذتي (عالمي الافتراضي)','👨‍🏫','ltHost','CM.openLocalTeacherModal()','+ أستاذ'],
['lstudents','طلابي المحليين','🧑‍🎓','lsHost','CM.openLocalStudentModal()','+ طالب'],
['lledger','تحصيلي المحلي','💵','llHost',null],
['latt','حضوري المحلي','📅','laHost','CM.openLocalAttModal()','+ رصد حضور'],
['mgmt','مهامي وملاحظاتي','📝','mgHost',null],
['account','حسابي','👤','acHost',null]];
var RENDER={lteachers:'renderLocalTeachers',lstudents:'renderLocalStudents',lledger:'renderLocalLedger',latt:'renderLocalAttendance',mgmt:'renderMgmt',account:'renderAccount'};
function injectLocal(){
  var nav=document.getElementById('sidebarNav'), host=document.querySelector('.content-area'); if(!nav||!host) return;
  if(!document.getElementById('cnStyle')){
    var st=document.createElement('style'); st.id='cnStyle';
    st.textContent='.cm-zone{border:2px dashed var(--border);border-radius:16px;padding:10px;margin-bottom:16px;}.cm-zone.local{border-color:rgba(245,158,11,.5);background:rgba(245,158,11,.04);}';
    document.head.appendChild(st);
  }
  LOCAL.forEach(function(x){
    if(document.getElementById('section-'+x[0])) return;
    var sec=document.createElement('section'); sec.className='section'; sec.id='section-'+x[0];
    sec.innerHTML='<div class="cm-zone'+(x[0]==='account'?'':' local')+'"><div class="section-header"><div><h2 class="section-title">'+x[2]+' '+x[1]+'</h2>'+(x[0]==='account'?'':'<p class="text-sm text-muted">خاص بسنترك — مش بيوصل للأدمن ولا لداتا المنصة (ومفيش طباعة باركودات للطلاب المحليين)</p>')+'</div>'+(x[4]?'<button class="btn btn-primary btn-sm" onclick="'+x[4]+'">'+x[5]+'</button>':'')+'</div><div id="'+x[3]+'"></div></div>';
    host.appendChild(sec);
  });
  if(!nav.querySelector('[data-section="lteachers"]')){
    nav.insertAdjacentHTML('beforeend','<div class="sidebar-section"><div class="sidebar-section-title">🌍 عالمي الافتراضي (خاص)</div>'+LOCAL.map(function(x){ return '<div class="sidebar-item" data-section="'+x[0]+'" onclick="window.showSection(\''+x[0]+'\')"><span class="sidebar-item-icon">'+x[2]+'</span><span class="sidebar-item-label">'+x[1]+'</span></div>'; }).join('')+'</div>');
  }
}
function hookShow(){
  if(window.__cnShow||typeof window.showSection!=='function') return; window.__cnShow=1;
  var os=window.showSection;
  window.showSection=function(id){ var r=os.apply(this,arguments); try{ if(RENDER[id]&&window.CM&&CM[RENDER[id]]) CM[RENDER[id]](); }catch(e){ console.error(e); } return r; };
}

/* ===== 5) صلاحيات من الأدمن + عناوين ===== */
function applyFlags(){
  var c=center(); var f=(c&&c.features)||{};
  function hide(id){ var i=document.querySelector('#sidebarNav [data-section="'+id+'"]'); if(i) i.style.display='none'; var s=document.getElementById('section-'+id); if(s&&!s.classList.contains('active')) s.style.display='none'; }
  Object.keys(f).forEach(function(id){ if(f[id]===false){ if(id==='local'){ ['lteachers','lstudents','lledger','latt'].forEach(hide); } else hide(id); } });
}
function labels(){
  var n=document.getElementById('userLevel'); if(n&&n.textContent!=='مدير سنتر') n.textContent='مدير سنتر';
  var v=cname(); document.querySelectorAll('[data-brand-name]').forEach(function(el){ if(v&&el.textContent!==v) el.textContent=v; });
  var t=document.querySelector('.sidebar-brand-tagline'); if(t&&t.textContent!=='Center Manager') t.textContent='Center Manager';
  var sub=document.querySelector('#section-mySchedule .section-header p'); if(sub) sub.textContent='حصص كل مجموعات سنترك — مرتبة باليوم';
}

/* ===== 6) إشعارات: أي تعديل من السنتر → مساعد الأستاذ + الأدمن ===== */
var CN=window.CN={};
CN.assistantsOf=function(tid){
  var as=dbx().assignments||{}, out=[];
  Object.keys(as).forEach(function(aid){ var a=as[aid]||{}; if(a.teacherId===tid||(a.teacherIds||[]).indexOf(tid)>=0) out.push(aid); });
  return out;
};
function hash(s){ var h=0; for(var i=0;i<s.length;i++){ h=((h<<5)-h+s.charCodeAt(i))|0; } return h; }
function sig(){
  var d=dbx();
  return hash(JSON.stringify([
    (d.users||[]).length,
    (d.enrollments||[]).map(function(e){return e.id+e.studentId+e.groupId+e.status;}),
    (d.cancelledSessions||[]).map(function(c){return c.id;}),
    (d.manualSessions||[]).map(function(m){return m.id+m.sessionsCount;}),
    (d.attendance||[]).map(function(a){return a.id+(a.records||[]).length;}),
    rawGroups().map(function(g){return [g.id,g.name,g.day,g.time,g.schedules,g.monthlyFee,g.center,g.sessionNow];}),
    d.sessionFlags||{}
  ]));
}
function enrich(info){
  var G=rawGroups(); info.tids=info.tids||[]; info.names=[];
  (info.gids||[]).forEach(function(gid){
    var g=G.find(function(x){return x.id===gid;});
    if(g){ if(g.teacherId&&info.tids.indexOf(g.teacherId)<0) info.tids.push(g.teacherId); if(info.names.indexOf(g.name)<0) info.names.push(g.name); }
  });
}
CN.notify=function(info){
  var text='🏢 سنتر '+cname()+' ('+(U.name||'')+'): '+info.action+(info.details?' — '+info.details:'')+(info.names&&info.names.length?' · '+info.names.join('، '):'');
  (info.tids||[]).forEach(function(tid){
    CN.assistantsOf(tid).forEach(function(aid){
      try{ DataService.addNotification({targetUserId:aid,title:'🏢 تعديل من السنتر',message:text,type:'general',priority:'important',meta:{event:'center_change',centerId:U.centerId}}); }catch(e){}
    });
  });
  try{ CM.notifyAdmins('🏢 نشاط مدير سنتر '+cname(),text); }catch(e){}
  try{ CM.logAct(info.action,info.details||''); }catch(e){}
};
function wrap(path,fn){
  var p=path.split('.'), o=window;
  for(var i=0;i<p.length-1;i++){ o=o&&o[p[i]]; }
  var k=p[p.length-1]; if(!o||typeof o[k]!=='function'||o[k].__cn) return;
  var orig=o[k];
  var w=function(){
    var args=arguments, info=null, before=null;
    try{ info=fn.apply(null,args); if(info){ enrich(info); before=sig(); } }catch(e){}
    var r=orig.apply(this,args);
    var done=function(){ try{ if(info&&sig()!==before) CN.notify(info); }catch(e){} };
    if(r&&typeof r.then==='function') r.then(done,function(){}); else setTimeout(done,60);
    return r;
  };
  w.__cn=1; o[k]=w;
}
function picks(st){ var a=[]; if(st&&st.picks) Object.keys(st.picks).forEach(function(k){ if(st.picks[k]) a.push(st.picks[k]); }); return a; }
function applyWraps(){
  wrap('UST.saveSingle',function(){ var st=window._ustS||{}; return {action:st.target?'تعديل بيانات/مجموعات طالب':'إضافة طالب',details:val('uasName'),gids:picks(st).concat(st.initial||[])}; });
  wrap('UST.saveBulk',function(){ var st=window._ustB||{}; var g=picks(st); (window._ubRows||[]).forEach(function(r){ g=g.concat(r.gids||[]); }); return {action:'إضافة طلاب بالجملة',details:(window._ubRows||[]).length+' طالب',gids:g}; });
  wrap('UST.swpSave',function(){ var sw=window._swp||{}; return {action:'تبديل مجموعة طالب',gids:[val('swpFrom'),sw.toGid]}; });
  wrap('LedgerUI.doCancelSession',function(gid,date,reason){ return {action:'إلغاء حصة',details:date+(reason?' ('+reason+')':''),gids:[gid]}; });
  ['carryInc','carryDec'].forEach(function(f){ wrap('LedgerUI.'+f,function(gid){ return {action:'تعديل عداد الحصص',gids:[gid]}; }); });
  ['sqAdd','sqToggle','sqRemove','sqUncancel','sqRemoveUndated'].forEach(function(f){ wrap('LedgerUI.'+f,function(gid){ return {action:'تعديل مربعات الحصص',gids:[gid]}; }); });
  wrap('window.attSaveAll',function(gid,date){ return {action:'اعتماد حضور',details:date,gids:[gid]}; });
  wrap('window.saveAsAddSessions',function(){ return {action:'إضافة حصص للعداد',details:val('asAddN')+' حصة',gids:[val('asAddG')]}; });
  wrap('window.runBackfill2',function(){ return {action:'ترحيل حصص',details:val('bfCount2')+' حصة',gids:[val('bfGroup2')]}; });
  wrap('window.runBulkBackfill',function(){ return {action:'ترحيل حصص',details:val('bfCount')+' حصة',gids:[val('bfGroup')]}; });
  wrap('window.saveGroup',function(e,editId){ return editId?{action:'تعديل مجموعة',details:val('gName'),gids:[editId]}:null; });
  wrap('DataService.addGroup',function(data){ return {action:'إضافة مجموعة',details:data&&data.name,gids:[],tids:[data&&data.teacherId]}; });
  wrap('DataService.deleteGroup',function(id){ return {action:'حذف مجموعة',gids:[id]}; });
  wrap('LedgerUI.unenroll',function(sid,gid){ return {action:'فصل طالب من مجموعة',gids:[gid]}; });
  wrap('LedgerUI.attachExisting',function(sid,gid){ return {action:'ضم طالب لمجموعة',gids:[gid]}; });
  wrap('LedgerUI.doAddNew',function(gid){ return {action:'إضافة طالب جديد لمجموعة',gids:[gid]}; });
  wrap('LedgerUI.doMove',function(sid,from){ return {action:'نقل طالب بين مجموعات',gids:[from,val('mvToG')]}; });
  wrap('window.addStudentToGroup',function(gid){ return {action:'ضم طالب لمجموعة',gids:[gid]}; });
  wrap('window.removeStudentFromGroup',function(sid,gid){ return {action:'إزالة طالب من مجموعة',gids:[gid]}; });
  wrap('window.sbApplyMove',function(gid){ return {action:'تعديل موعد مجموعة',gids:[gid]}; });
  wrap('SB.confirmMove',function(gid){ return {action:'تعديل موعد مجموعة',gids:[gid]}; });
}

/* ===== تشغيل ===== */
(function(){
  var ob=window.buildMenu;
  if(ob&&!ob.__cn){ window.buildMenu=function(){ var r=ob.apply(this,arguments); try{ injectLocal(); applyFlags(); }catch(e){} return r; }; window.buildMenu.__cn=1; }
})();
function boot(){ patchOps(); patchHelpers(); injectLocal(); hookShow(); applyFlags(); labels(); applyWraps(); }
boot(); setTimeout(boot,500); setTimeout(boot,1500); setTimeout(boot,3000);
setInterval(boot,4000);
console.log('✅ Center bridge loaded');
})();