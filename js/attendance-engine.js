/* ================================================================
✅ Attendance Engine V1 — تشيك-إن حقيقي + اعتماد ذكي + باركود باب
• d.checkIns = سجلات التشيك-إن (door/qr/code/dash) بتوقيت لحظي
• نافذة التشيك-إن: قبل الحصة بـ15 د لحد بعدها بـ40 د (قابل للتعديل)
• الطالب: زرار بضغطة واحدة في صفحة حضوري + باركود الباب checkin.html
• الأستاذ/المساعد: اختصارات على كارت الحصة الجارية + اعتماد متعبّي مسبقاً
• مسح غير مسجل لباركود الباب → about.html تلقائياً
================================================================ */
(function(){
"use strict";
var AE=window.AttendEngine=window.AttendEngine||{};
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function saveD(d){if(DataService._saveData)DataService._saveData(d);}
function cloudDoc(col,o){try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc(col,o.id,o);}catch(e){}}
function cur(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null);}catch(e){return null;}}
function pad(n){return String(n).padStart(2,'0');}
function todayStr(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function nowMin(){var d=new Date();return d.getHours()*60+d.getMinutes();}
function minOf(t){var p=String(t||'0:00').split(':');return (+p[0]||0)*60+(+p[1]||0);}
var DAYEN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function cfg(){var c=db().attendanceConfig||{};return {openBefore:c.openBefore!=null?c.openBefore:15,openAfter:c.openAfter!=null?c.openAfter:40};}
function groups(){return (DataService.getGroups?DataService.getGroups():[]);}
function gById(id){return groups().find(function(g){return g.id===id;});}
function schedOf(g){return (g.schedules&&g.schedules.length)?g.schedules:(g.day?[{day:g.day,time:g.time}]:[]);}
function deviceId(){try{var id=localStorage.getItem('eduflowDeviceId');if(!id){id='dev_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);localStorage.setItem('eduflowDeviceId',id);}return id;}catch(e){return 'dev_unknown';}}
AE.suspiciousDevices=function(){
  var m={};(db().checkIns||[]).forEach(function(x){ if(x.date!==todayStr())return; var k=x.deviceId||'?'; (m[k]=m[k]||{})[x.studentId]=1; });
  return Object.keys(m).map(function(k){ var ids=Object.keys(m[k]); return {device:k,students:ids,count:ids.length}; }).filter(function(r){return r.count>1;});
};
function myGroupsOf(uid){var u=uid?{id:uid,role:'student'}:cur();try{return (DataService.getStudentTeachers?DataService.getStudentTeachers(u.id):[]).map(function(t){return t.group;}).filter(Boolean);}catch(e){return [];}}

/* ========== جلسات اليوم + نافذة التشيك-إن ========== */
AE.todaySessions=function(){
  var out=[],todayEn=DAYEN[new Date().getDay()],nm=nowMin(),c=cfg();
  groups().forEach(function(g){
    schedOf(g).forEach(function(s){
      if(s.day!==todayEn)return;
      var st=minOf(s.time);
      out.push({g:g,time:s.time,st:st,
        status:(nm<st?'next':(nm<=st+(parseInt(g.duration)||60)?'live':'done')),
        windowOpen:(nm>=st-c.openBefore&&nm<=st+c.openAfter)});
    });
  });
  return out;
};
AE.checkInWindow=function(g){
  var c=cfg(),todayEn=DAYEN[new Date().getDay()],nm=nowMin();
  var sc=schedOf(g).filter(function(s){return s.day===todayEn;});
  if(!sc.length)return{open:false,msg:'مفيش حصة مجدولة للمجموعة دي النهارده.'};
  var st=minOf(sc[0].time);
  if(nm<st-c.openBefore)return{open:false,msg:'الحصة الساعة '+sc[0].time+' — التشيك-إن يفتح قبلها بـ'+c.openBefore+' دقيقة.'};
  if(nm>st+c.openAfter)return{open:false,msg:'نافذة التشيك-إن للحصة دي اتقفلت — لو كنت حاضر اطلب من المساعد يعتمدك.'};
  return{open:true};
};

/* ========== سجل التشيك-إن ========== */
AE.checkInsFor=function(gid,date){return (db().checkIns||[]).filter(function(x){return x.groupId===gid&&x.date===(date||todayStr());});};
AE.hasCheckIn=function(sid,gid,date){return AE.checkInsFor(gid,date).some(function(x){return x.studentId===sid;});};
AE.checkIn=function(sid,gid,method){
  var d=db();d.checkIns=d.checkIns||[];
  if(d.checkIns.some(function(x){return x.studentId===sid&&x.groupId===gid&&x.date===todayStr();}))return{ok:false,msg:'انت متسجل حضورك بالفعل في الحصة دي ✅'};
  var rec={id:'ci_'+Date.now()+'_'+sid,studentId:sid,groupId:gid,date:todayStr(),at:new Date().toISOString(),method:method||'dash',deviceId:deviceId()};
  d.checkIns.push(rec);saveD(d);cloudDoc('checkIns',rec);
  try{localStorage.setItem('eduflowLedgerPing',String(Date.now()));}catch(e){}
  return{ok:true,rec:rec};
};
/* لفّ checkInByCode الموجود عشان يسجل checkIns برضه */
(function(){
  if(!window.DataService||typeof DataService.checkInByCode!=='function'||DataService.__ciWrapped)return;
  DataService.__ciWrapped=1;
  var orig=DataService.checkInByCode.bind(DataService);
  DataService.checkInByCode=function(sid,code){
    var p=orig(sid,code);
    try{Promise.resolve(p).then(function(res){
      try{
        var gid=(res&&(res.groupId||(res.group&&res.group.id)))||null;
        if(!gid&&code){var g=groups().find(function(x){return x.id===code||x.checkCode===code;});gid=g?g.id:null;}
        if(gid)AE.checkIn(sid,gid,'code');
      }catch(e){}
    });}catch(e){}
    return p;
  };
})();

/* ========== 🚪 باركود الباب ========== */
AE.doorUrl=function(gid){
  var base='https://eduflow-nine-dusky.vercel.app/';
  try{if(location.origin&&location.origin.indexOf('127.0.0.1')<0&&location.origin.indexOf('localhost')<0)base=location.origin+'/';}catch(e){}
  return base+'checkin.html?gid='+gid;
};
AE.openDoorQr=function(gid){
  var g=gById(gid);if(!g)return;
  var url=AE.doorUrl(gid);
  var img='https://api.qrserver.com/v1/create-qr-code/?size=300x300&data='+encodeURIComponent(url);
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🚪 باركود باب القاعة: '+g.name+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body" style="text-align:center;">'+
  '<div class="filter-info">💡 اطبعه وعلّقه على باب القاعة — كل طالب يمسحه من موبايله يتحضر فوراً. أي حد مش مسجل في المجموعة هيروح لصفحة "من نحن" تلقائياً.</div>'+
  '<img src="'+img+'" alt="QR" style="width:220px;height:220px;background:#fff;padding:10px;border-radius:12px;">'+
  '<div class="text-xs text-muted" style="margin-top:8px;direction:ltr;font-family:var(--font-en);">'+url+'</div>'+
  '<div style="display:flex;gap:8px;margin-top:12px;"><button class="btn btn-secondary" style="flex:1;" onclick="window.print()">🖨️ طباعة</button></div></div>','modal-sm');
};

/* ========== ⚡ اختصارات على كارت الحصة الجارية (للمساعد — الأستاذ عنده بالفعل) ========== */
function liveActionsHtml(gid,date){
  return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;" class="aeLiveActions">'+
  '<button class="btn btn-success btn-sm" onclick="LedgerUI.confirmSession(\''+gid+'\',\''+date+'\')">✅ اعتماد الحضور</button>'+
  '<button class="btn btn-warning btn-sm" onclick="window.openQuickEval&&window.openQuickEval(\''+gid+'\')">⚡ تقييم سريع</button>'+
  '<button class="btn btn-secondary btn-sm" onclick="window.openAsClassPostModal&&window.openAsClassPostModal(\''+gid+'\')">📰 بوست الحصة</button>'+
  '<button class="btn btn-danger btn-sm" onclick="LedgerUI.cancelSessionQuick&&LedgerUI.cancelSessionQuick(\''+gid+'\',\''+date+'\')">🚫 إلغاء</button></div>';
}
function enhanceLiveCards(){
  try{
    var u=cur();if(!u||['teacher','assistant','admin','super_admin'].indexOf(u.role)<0)return;
    var ses=AE.todaySessions().filter(function(s){return s.status==='live'||s.status==='next';});
    if(!ses.length)return;
    var names=ses.map(function(s){return{n:s.g.name,g:s.g};}).sort(function(a,b){return b.n.length-a.n.length;});
    document.querySelectorAll('.livecard,.card,[class*="live"]').forEach(function(card){
      if(card.querySelector('.aeLiveActions'))return;
      var txt=card.textContent||'';
      if(txt.indexOf('جارية الآن')<0&&txt.indexOf('حصة جارية')<0)return;
      if(txt.indexOf('تسجيل الحضور')>=0)return; /* كارت الأستاذ مجهز بالفعل — مبنكررش */
      var g=null;for(var i=0;i<names.length;i++){if(txt.indexOf(names[i].n)>=0){g=names[i].g;break;}}
      if(!g)return;
      card.insertAdjacentHTML('beforeend',liveActionsHtml(g.id,todayStr()));
    });
  }catch(e){}
}
if(window.LG) LG.tick('liveCards',enhanceLiveCards,3000); else setInterval(enhanceCards,3000);

/* ========== 🎓 زرار التشيك-إن بضغطة واحدة للطالب ========== */
AE.renderOneTap=function(){
  var host=document.getElementById('oneTapCheckin');if(!host)return;
  var u=cur();if(!u||u.role!=='student'){host.innerHTML='';return;}
  var mine=AE.todaySessions().filter(function(s){return s.windowOpen&&myGroupsOf(u.id).some(function(g){return g.id===s.g.id;});});
  if(!mine.length){host.innerHTML='<div class="text-xs text-muted">مفيش نافذة تشيك-إن مفتوحة دلوقتي — بتفتح قبل الحصة بـ15 دقيقة وتقفل بعدها بـ40.</div>';return;}
  host.innerHTML=mine.map(function(s){
    var done=AE.hasCheckIn(u.id,s.g.id,todayStr());
    return '<div class="sub-row" style="border-right:3px solid '+(done?'var(--success)':'var(--primary)')+';"><div style="flex:1;"><strong>📚 '+s.g.name+'</strong><div class="text-xs text-muted">🕐 '+s.time+' · '+(done?'✅ انت متسجل حاضر':'النافذة مفتوحة الآن')+'</div></div>'+
    (done?'<span class="badge badge-success">✓ حاضر</span>':'<button class="btn btn-success btn-sm" onclick="AttendEngine.oneTap(\''+s.g.id+'\')">✅ سجّل حضوري</button>')+'</div>';
  }).join('');
};
AE.oneTap=function(gid){
  var u=cur();if(!u)return;
  var r=AE.checkIn(u.id,gid,'dash');
  if(window.safeToast)window.safeToast(r.ok?'✅ اتسجل حضورك — مع السلامة في الحصة!':r.msg,r.ok?'success':'info');
  AE.renderOneTap();
};
setInterval(function(){try{var sec=document.getElementById('section-attendance');if(sec&&sec.classList.contains('active'))AE.renderOneTap();}catch(e){}},4000);

/* ========== 🧹 تنظيفات واجهة المساعد ========== */
/* 1) شريط الاختصارات المكرر (الحبوب) — البناتيل اللي تحتها هي الأصل */
function killDupPills(){
  try{
    document.querySelectorAll('#section-command .card,#section-command > div').forEach(function(el){
      if(el.__aeKilled)return;
      var t=el.textContent||'';
      var btns=el.querySelectorAll('button').length;
      if(t.indexOf('اختصارات سريعة')>=0&&t.indexOf('حصة للمعاد')>=0&&t.indexOf('محاسبة')>=0&&btns>=6&&btns<=12&&!el.querySelector('.quick-action')){
        el.__aeKilled=1;el.remove();
      }
    });
  }catch(e){}
}
setInterval(killDupPills,2500);
/* 2) سلكت المجموعات في صفحة الحضور لو فاضي */
function fixAttSelect(){
  try{
    var sel=document.getElementById('attGroup');if(!sel||sel.options.length>1)return;
    var u=cur();if(!u)return;
    var gs=(u.role==='assistant'&&window.Ops&&Ops.groupsInScope)?Ops.groupsInScope(u.id):((u.role==='teacher')?groups().filter(function(g){return g.teacherId===u.id;}):groups());
    if(!gs.length)return;
    sel.innerHTML='<option value="">--</option>'+gs.map(function(g){return '<option value="'+g.id+'">'+g.name+'</option>';}).join('');
    if(window.renderManualAtt)window.renderManualAtt();
  }catch(e){}
}
setInterval(fixAttSelect,3000);
/* ========== ⚡ فتح التقييم السريع بمجموعة محددة (إصلاح زرار الحصة الجارية) ========== */
window.openQuickEval=function(gid){
  window.__qePreset=gid||'';
  try{ if(window.showSection) window.showSection('quickEval'); }catch(e){}
  setTimeout(function(){
    try{
      if(!window.__qePreset) return;
      var sec=document.getElementById('section-quickEval'); if(!sec) return;
      var sels=sec.querySelectorAll('select');
      for(var i=0;i<sels.length;i++){
        var has=false; for(var j=0;j<sels[i].options.length;j++){ if(sels[i].options[j].value===window.__qePreset){has=true;break;} }
        if(has){ sels[i].value=window.__qePreset; sels[i].dispatchEvent(new Event('change')); break; }
      }
      window.__qePreset='';
    }catch(e){}
  },450);
};

/* ========== ⚙️ إعدادات النوافذ (أدمن) ========== */
AE.openConfig=function(){
  var c=cfg();
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">⚙️ إعدادات التشيك-إن</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="form-group"><label>يفتح قبل الحصة بـ (دقيقة)</label><input type="number" id="aeBefore" class="form-input" value="'+c.openBefore+'"></div>'+
  '<div class="form-group"><label>يقفل بعد بداية الحصة بـ (دقيقة)</label><input type="number" id="aeAfter" class="form-input" value="'+c.openAfter+'"></div>'+
  '<button class="btn btn-primary w-full" onclick="AttendEngine.saveCfg()">💾 حفظ</button></div>','modal-sm');
};
AE.saveCfg=function(){
  var d=db();d.attendanceConfig={openBefore:parseInt((document.getElementById('aeBefore')||{}).value)||15,openAfter:parseInt((document.getElementById('aeAfter')||{}).value)||40};
  saveD(d);try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc('meta','attendanceConfig',d.attendanceConfig);}catch(e){}
  ThemeManager.closeModal();if(window.safeToast)window.safeToast('✅ اتحفظت إعدادات النوافذ','success');
};
})();
