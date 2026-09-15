/* ================================================================
   🧠 Smart Student Modal Engine (SSM)
   منع تكرار الطلاب + فلترة السنتر + مجموعة واحدة لكل أستاذ
   + عرض توقيتات المجموعات بخط صغير + بحث في المجموعات
================================================================ */
(function(){
  if(document.getElementById('smartStudentCss')) return;
  var st=document.createElement('style');
  st.id='smartStudentCss';
  st.textContent=
  '.sm-box{margin-top:8px;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--surface-hover);}' +
  '.sm-title{padding:8px 12px;font-size:11px;font-weight:800;color:var(--warning);background:var(--warning-bg);}' +
  '.sm-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-top:1px solid var(--border);cursor:pointer;transition:background .15s;}' +
  '.sm-row:hover{background:var(--primary-bg);}' +
  '.sm-code{font-family:var(--font-en);font-size:10px;color:var(--text-muted);}' +
  '.sm-meta{font-size:10px;color:var(--text-muted);margin-top:2px;}' +
  '.sm-pick{font-size:11px;font-weight:800;color:var(--primary);white-space:nowrap;}' +
  '.sm-empty{padding:10px 12px;font-size:11px;color:var(--success);font-weight:700;}' +
  '.sm-new{padding:10px 12px;border-top:1px solid var(--border);font-size:11px;font-weight:800;color:var(--text-secondary);cursor:pointer;background:var(--surface);}' +
  '.sm-new:hover{color:var(--primary);}' +
  '.link-banner{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px;border-radius:10px;background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(5,150,105,.08));border:2px dashed var(--success);margin-bottom:12px;}' +
  '.grp-card{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--surface);cursor:pointer;margin-bottom:6px;transition:border-color .15s;}' +
  '.grp-card:hover{border-color:var(--primary-border);}' +
  '.grp-card input{margin-top:3px;transform:scale(1.15);}' +
  '.grp-name{font-weight:800;font-size:13px;}' +
  '.grp-meta{font-size:10px;color:var(--text-muted);margin-top:2px;}' +
  '.grp-times{font-size:10px;color:var(--primary);font-weight:700;margin-top:3px;}' +
  '.sm-teacher-block{margin-bottom:12px;}' +
  '.sm-teacher-name{font-size:12px;font-weight:800;color:var(--primary);margin-bottom:6px;padding-bottom:4px;border-bottom:1px dashed var(--border);}';
  document.head.appendChild(st);
})();

window.SSM = window.SSM || {};
SSM.cfgs = {};

function _day(en){ try{ return (typeof dayAr==='function')?dayAr(en):en; }catch(e){ return en; } }
function _tm(t){ try{ return (typeof T==='function')?T(t):t; }catch(e){ return t; } }
function _users(){ return (window.DataService&&DataService.getUsers)?DataService.getUsers():[]; }
function _db(){ return (window.DataService&&DataService._getData)?DataService._getData():{}; }
function _save(d){ if(window.DataService&&DataService._saveData) DataService._saveData(d); }
function _tName(tid){ var t=(DataService.getUserById)?DataService.getUserById(tid):null; return (t&&t.name)||'-'; }

/* 🕐 توقيتات المجموعة كلها في سطر واحد صغير */
SSM.groupTimes=function(g){
  if(!g) return '';
  if(g.schedules && g.schedules.length){
    return g.schedules.map(function(s){ return _day(s.day)+' '+_tm(s.time); }).join(' + ');
  }
  return _day(g.day)+' '+_tm(g.time);
};

SSM.register=function(key,cfg){ SSM.cfgs[key]=cfg; };

/* 🧠 بحث حي بالاسم أو رقم ولي الأمر */
SSM.scan=function(cfgKey){
  var cfg=SSM.cfgs[cfgKey]; if(!cfg) return;
  var box=document.getElementById(cfg.boxId); if(!box) return;
  if(window[cfg.linkVar]){ box.innerHTML=''; return; }
  var nameEl=document.getElementById(cfg.nameId);
  var phoneEl=document.getElementById(cfg.parentId);
  var name=(nameEl?nameEl.value:'').trim().toLowerCase();
  var phone=(phoneEl?phoneEl.value:'').replace(/\D/g,'');
  var matches=[];
  if(phone.length>=6){
    matches=_users().filter(function(u){
      if(u.role!=='student') return false;
      var pp=(u.parentPhone||'').replace(/\D/g,'');
      var mp=(u.phone||'').replace(/\D/g,'');
      return pp.indexOf(phone)>=0 || mp.indexOf(phone)>=0;
    });
  } else if(name.length>=3){
    matches=_users().filter(function(u){ return u.role==='student' && (u.name||'').toLowerCase().indexOf(name)>=0; });
    matches.sort(function(a,b){
      var ra=(a.name||'').toLowerCase()===name?0:((a.name||'').toLowerCase().indexOf(name)===0?1:2);
      var rb=(b.name||'').toLowerCase()===name?0:((b.name||'').toLowerCase().indexOf(name)===0?1:2);
      return ra-rb;
    });
  } else { box.innerHTML=''; return; }
  matches=matches.slice(0,6);
  if(!matches.length){
    box.innerHTML='<div class="sm-box"><div class="sm-empty">✅ لا يوجد تشابه — أكمل كطالب جديد</div></div>';
    return;
  }
  box.innerHTML='<div class="sm-box"><div class="sm-title">⚠️ يوجد مشابه في النظام — لو نفس الشخص اختاره بدل التكرار:</div>'+
    matches.map(function(m){
      var gs=(DataService.getStudentTeachers?DataService.getStudentTeachers(m.id):[])||[];
      return '<div class="sm-row" onclick="SSM.pick(\''+cfgKey+'\',\''+m.id+'\')">'+
        '<div style="flex:1;min-width:0;"><strong>'+m.name+'</strong> <span class="sm-code">'+(m.code||'')+'</span>'+
        '<div class="sm-meta">📱 ولي أمر: '+(m.parentPhone||'-')+' · 🎓 '+(m.grade||'-')+' · 👥 '+gs.length+' مجموعة</div></div>'+
        '<span class="sm-pick">↩ اختيار</span></div>';
    }).join('')+
    '<div class="sm-new" onclick="SSM.dismiss(\''+cfgKey+'\')">✋ مش أي حد فيهم — ده طالب جديد، أكمل عادي</div></div>';
};

SSM.dismiss=function(cfgKey){
  var cfg=SSM.cfgs[cfgKey]; if(!cfg) return;
  var box=document.getElementById(cfg.boxId); if(box) box.innerHTML='';
};

/* ↩ اختيار طالب موجود → تعبئة الفورم + وضع الربط */
SSM.pick=function(cfgKey,id){
  var cfg=SSM.cfgs[cfgKey]; if(!cfg) return;
  var s=(DataService.getUserById)?DataService.getUserById(id):null; if(!s) return;
  function set(elId,v){ var el=document.getElementById(elId); if(el) el.value=(v==null?'':v); }
  set(cfg.nameId,s.name); set(cfg.myPhoneId,s.phone); set(cfg.parentId,s.parentPhone);
  set(cfg.stageId,s.stage);
  if(cfg.stageCascade && window[cfg.stageCascade]) window[cfg.stageCascade]();
  set(cfg.gradeId,s.grade);
  window[cfg.linkVar]={id:s.id,name:s.name};
  if(cfg.pickPreFn && window[cfg.pickPreFn]) window[cfg.pickPreFn](id);
  var banner=document.getElementById(cfg.bannerId);
  if(banner){
    banner.style.display='flex';
    banner.innerHTML='<div style="flex:1;min-width:0;"><strong>🔗 وضع الربط:</strong> <span style="font-weight:800;">'+s.name+'</span> <span class="sm-code">'+(s.code||'')+'</span>'+
      '<div class="sm-meta">هيتم إضافة الطالب ده للمجموعات اللي تختارها بدون إنشاء حساب جديد — وتقدر تعدل بياناته فوق</div></div>'+
      '<button type="button" class="btn btn-ghost btn-sm" onclick="SSM.clearLink(\''+cfgKey+'\')">✕ إلغاء الربط</button>';
  }
  SSM.dismiss(cfgKey);
  if(cfg.renderGroups && window[cfg.renderGroups]) window[cfg.renderGroups]();
};

SSM.clearLink=function(cfgKey){
  var cfg=SSM.cfgs[cfgKey]; if(!cfg) return;
  window[cfg.linkVar]=null;
  if(cfg.clearPreFn && window[cfg.clearPreFn]) window[cfg.clearPreFn]();
  var banner=document.getElementById(cfg.bannerId);
  if(banner){ banner.style.display='none'; banner.innerHTML=''; }
  if(cfg.renderGroups && window[cfg.renderGroups]) window[cfg.renderGroups]();
};

/* ✅ قاعدة مجموعة واحدة لكل أستاذ (أو مجموعة واحدة فقط لو single) */
SSM.onCheck=function(cfgKey,el){
  var cfg=SSM.cfgs[cfgKey]; if(!cfg) return;
  if(el.checked){
    var scope=document.getElementById(cfg.listId);
    if(scope){
      scope.querySelectorAll('input.grp-check').forEach(function(o){
        if(o===el) return;
        if(cfg.single || o.getAttribute('data-teacher')===el.getAttribute('data-teacher')) o.checked=false;
      });
    }
    if(!cfg.single && window.safeToast) window.safeToast('📌 مجموعة واحدة فقط لكل أستاذ','info');
  }
  SSM.updateCount(cfgKey);
};

SSM.updateCount=function(cfgKey){
  var cfg=SSM.cfgs[cfgKey]; if(!cfg) return;
  var n=SSM.selected(cfgKey).length;
  var c=document.getElementById(cfg.countId);
  if(c){ c.textContent=n; c.style.display=n?'inline-flex':'none'; }
};

SSM.selected=function(cfgKey){
  var cfg=SSM.cfgs[cfgKey]; if(!cfg) return [];
  var scope=document.getElementById(cfg.listId); if(!scope) return [];
  return Array.prototype.slice.call(scope.querySelectorAll('input.grp-check:checked')).map(function(i){
    return {groupId:i.value, teacherId:i.getAttribute('data-teacher')};
  });
};

/* 🔗 تسجيل / فك تسجيل طالب في مجموعة (بدون تكرار) */
SSM.enroll=async function(sid,groupId,teacherId){
  try{
    if(typeof DataService.enrollStudent==='function') return await DataService.enrollStudent(sid,groupId,teacherId);
    if(typeof DataService.linkStudentToGroup==='function') return await DataService.linkStudentToGroup(sid,groupId,teacherId);
    if(typeof DataService.addEnrollment==='function') return await DataService.addEnrollment(sid,groupId,teacherId);
    if(typeof DataService.addStudentToGroup==='function') return await DataService.addStudentToGroup(sid,groupId,teacherId);
    var d=_db(); var u=(d.users||[]).find(function(x){return x.id===sid;});
    if(u){
      u.enrollments=u.enrollments||[];
      if(!u.enrollments.some(function(en){return en.groupId===groupId;})) u.enrollments.push({groupId:groupId,teacherId:teacherId});
      _save(d);
      if(window.FirebaseService&&FirebaseService.connected){ try{ await FirebaseService.saveDoc('users',sid,u); }catch(e){} }
    }
  }catch(e){ console.error('enroll error',e); }
};

SSM.unenroll=async function(sid,groupId){
  try{
    if(typeof DataService.unenrollStudent==='function') return await DataService.unenrollStudent(sid,groupId);
    if(typeof DataService.removeStudentFromGroup==='function') return await DataService.removeStudentFromGroup(sid,groupId);
    if(typeof DataService.removeEnrollment==='function') return await DataService.removeEnrollment(sid,groupId);
    var d=_db(); var u=(d.users||[]).find(function(x){return x.id===sid;});
    if(u&&u.enrollments){
      u.enrollments=u.enrollments.filter(function(en){return en.groupId!==groupId;});
      _save(d);
      if(window.FirebaseService&&FirebaseService.connected){ try{ await FirebaseService.saveDoc('users',sid,u); }catch(e){} }
    }
  }catch(e){ console.error('unenroll error',e); }
};