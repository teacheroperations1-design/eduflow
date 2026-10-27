/* ================================================================
🔔 Notify Service V4 — الجرس يفتح قائمة الإشعارات + الإعدادات في الآخر
• 🔔 يفتح قائمة فيها كل الإشعارات (الجديد مميز + زر "الكل مقروء")
• تحت خالص في اللوحة: زرار ⚙️ إعدادات الإشعارات
• سياسة إشعارات لكل دور + تفضيلات لكل مستخدم
• صوت مميز + إشعار متصفح + اهتزاز + عدّاد غير مقروء
• سكانر أحداث المنصة كل 20 ثانية
================================================================ */
window.__notifyServiceLoaded=true;
(function(){
"use strict";
var ROLES=[{k:'student',l:'🎓 طالب'},{k:'parent',l:'👨‍👩‍👦 ولي أمر'},{k:'teacher',l:'👨‍🏫 أستاذ'},{k:'assistant',l:'🧑‍💼 مساعد'},{k:'admin',l:'🛡️ أدمن'}];
var EVENTS=[
{k:'hw_new',c:'grades',i:'📝',l:'واجب جديد',r:['student','parent']},
{k:'exam_new',c:'grades',i:'🎓',l:'امتحان جديد',r:['student','parent']},
{k:'points',c:'points',i:'🏆',l:'نقاط / تسميع / تفاعل / سلسلة',r:['student','parent']},
{k:'praise',c:'points',i:'🌟',l:'ثناء وإشادة',r:['student','parent']},
{k:'absent',c:'attendance',i:'❌',l:'تسجيل غياب',r:['student','parent']},
{k:'late',c:'attendance',i:'⏰',l:'تسجيل تأخر',r:['student','parent']},
{k:'session_cancel',c:'schedule',i:'🚫',l:'إلغاء حصة / تعويض',r:['student','parent','assistant']},
{k:'schedule_change',c:'schedule',i:'🗓️',l:'تعديل موعد حصة',r:['student','parent','teacher','assistant']},
{k:'hw_overdue',c:'grades',i:'⏰',l:'تأخر في تسليم واجب/امتحان',r:['student','parent']},
{k:'low_grade',c:'grades',i:'📉',l:'درجة منخفضة تحتاج متابعة',r:['student','parent']},
{k:'absence_repeat',c:'attendance',i:'👀',l:'غياب متكرر (نسبة حضور)',r:['student','parent']},
{k:'due_warn',c:'payment',i:'🔔',l:'إنذار 7/8 — جهز الشهرية',r:['student','parent']},
{k:'due_now',c:'payment',i:'💰',l:'الشهرية مستحقة 8/8',r:['student','parent']},
{k:'payment_received',c:'payment',i:'💵',l:'استلام دفعة / إيصال',r:['student','parent','teacher']},
{k:'ledger_act',c:'payment',i:'📒',l:'نشاط دفتر التحصيل (متابعة)',r:['teacher','assistant','admin']},
{k:'video_new',c:'content',i:'🎬',l:'فيديو جديد',r:['student','parent']},
{k:'post_new',c:'content',i:'📰',l:'بوست حصة جديد',r:['student','parent']},
{k:'material_new',c:'content',i:'🧩',l:'مادة تفاعلية جديدة',r:['student','parent']},
{k:'challenge_new',c:'content',i:'🏆',l:'تحدي أو معركة جديدة',r:['student','parent']},
{k:'general',c:'system',i:'⚙️',l:'رسائل عامة من المركز',r:['student','parent','teacher','assistant','admin']}
];
var CAT_LABEL={payment:'💰 الدفعات والشهرية',attendance:'📋 الحضور والغياب',grades:'📝 الدرجات',points:'🏆 النقاط والثناء',schedule:'🗓️ المواعيد',content:'📚 المحتوى',system:'⚙️ عام'};
function cur(){ try{ return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null); }catch(e){ return null; } }
function targets(){ var u=cur(); if(!u) return []; if(u.role==='parent') return [u.id].concat(u.studentIds||[]); return [u.id]; }
function db(){ return (window.DataService&&DataService._getData)?DataService._getData():{}; }
function saveD(d){ if(DataService._saveData) DataService._saveData(d); }

/* ========== سياسة الأدوار ========== */
function defPolicy(){
  var base={};
  ROLES.forEach(function(r){
    base[r.k]={};
    EVENTS.forEach(function(e){ base[r.k][e.k]=false; });
  });
  var studentEvents=['hw_new','exam_new','points','praise','absent','late','session_cancel','schedule_change','video_new','post_new','material_new','challenge_new','general'];
  studentEvents.forEach(function(k){ base.student[k]=true; });
  studentEvents.forEach(function(k){ base.parent[k]=true; });
  ['due_warn','due_now','payment_received'].forEach(function(k){ base.parent[k]=true; });
  ['hw_overdue','low_grade','absence_repeat'].forEach(function(k){ base.student[k]=true; base.parent[k]=true; });
  ['schedule_change','session_cancel','general'].forEach(function(k){ base.teacher[k]=true; });
  ['ledger_act','payment_received','schedule_change','general'].forEach(function(k){ base.assistant[k]=true; });
  ['ledger_act','payment_received','schedule_change','general'].forEach(function(k){ base.admin[k]=true; });
  return base;
}
function getPolicy(){
var base=defPolicy();
var saved=db().notifyPolicy||{};
ROLES.forEach(function(r){ if(saved[r.k]) Object.assign(base[r.k],saved[r.k]); });
try{ var l=localStorage.getItem('eduNotifyPolicy'); if(l){ var lj=JSON.parse(l); ROLES.forEach(function(r){ if(lj[r.k]) Object.assign(base[r.k],lj[r.k]); }); } }catch(e){}
return base;
}
function savePolicy(pol){
var d=db(); d.notifyPolicy=pol; saveD(d);
try{ localStorage.setItem('eduNotifyPolicy',JSON.stringify(pol)); }catch(e){}
try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('notifyPolicy','policy',pol); }catch(e){}
}

/* ========== تفضيلات المستخدم ========== */
function defPrefs(){ return {sound:true,browser:true,events:{},quiet:{enabled:false,from:'22:00',to:'08:00'}}; }
function getPrefs(){
var u=cur(); if(!u) return defPrefs();
var d=db(); var p=(d.notifyPrefs||{})[u.id];
if(p) return Object.assign(defPrefs(),p);
try{ var l=localStorage.getItem('eduNotifyPrefs_'+u.id); if(l) return Object.assign(defPrefs(),JSON.parse(l)); }catch(e){}
return defPrefs();
}
function savePrefs(p){
var u=cur(); if(!u) return;
var d=db(); d.notifyPrefs=d.notifyPrefs||{}; d.notifyPrefs[u.id]=p; saveD(d);
try{ localStorage.setItem('eduNotifyPrefs_'+u.id,JSON.stringify(p)); }catch(e){}
try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('notifyPrefs',u.id,p); }catch(e){}
}
function inQuiet(p){
if(!p.quiet||!p.quiet.enabled) return false;
var n=new Date(); var hm=(n.getHours()<10?'0':'')+n.getHours()+':'+(n.getMinutes()<10?'0':'')+n.getMinutes();
var f=p.quiet.from||'22:00', t=p.quiet.to||'08:00';
if(f<=t) return hm>=f&&hm<=t;
return hm>=f||hm<=t;
}

/* ========== تصنيف الإشعار ========== */
function eventOf(n){
var k=(n&&n.meta&&n.meta.event)||''; if(k) return k;
var t=(n&&n.type)||''; var ti=(n&&n.title)||''; var mk=(n&&n.meta&&n.meta.kind)||'';
if(mk==='ledger') return 'ledger_act';
if(mk==='schedule_change') return 'schedule_change';
if(ti.indexOf('جهز')>=0||ti.indexOf('باقي حصة')>=0) return 'due_warn';
if(ti.indexOf('مستحق')>=0||mk==='invoice_due'||mk==='cycle_warning') return 'due_now';
if(ti.indexOf('دفعة')>=0||ti.indexOf('تم استلام')>=0) return 'payment_received';
if(t==='payment') return 'due_now';
if(ti.indexOf('واجب')>=0) return 'hw_new';
if(ti.indexOf('امتحان')>=0) return 'exam_new';
if(ti.indexOf('فيديو')>=0) return 'video_new';
if(ti.indexOf('بوست')>=0) return 'post_new';
if(ti.indexOf('مادة')>=0) return 'material_new';
if(ti.indexOf('تحدي')>=0||ti.indexOf('معركة')>=0) return 'challenge_new';
if(ti.indexOf('إلغاء')>=0||ti.indexOf('اتلغت')>=0||ti.indexOf('تعويض')>=0) return 'session_cancel';
if(ti.indexOf('غياب')>=0) return 'absent';
if(ti.indexOf('تأخر')>=0) return 'late';
if(t==='points'||t==='loot'||t==='streak'||ti.indexOf('نقطة')>=0||ti.indexOf('نقاط')>=0||ti.indexOf('تسميع')>=0||ti.indexOf('تفاعل')>=0) return 'points';
if(ti.indexOf('ثناء')>=0||ti.indexOf('يشكر')>=0) return 'praise';
return 'general';
}
function catOfEvent(ev){ for(var i=0;i<EVENTS.length;i++){ if(EVENTS[i].k===ev) return EVENTS[i].c; } return 'system'; }
function allowedForRole(ev,role){ var pol=getPolicy(); return !(pol[role]&&pol[role][ev]===false); }

/* ========== 🔊 الصوت ========== */
var AC=null;
function ctx(){ try{ if(!AC) AC=new (window.AudioContext||window.webkitAudioContext)(); if(AC&&AC.state==='suspended') AC.resume(); return AC; }catch(e){ return null; } }
function tone(c,f0,f1,t0,dur,type,vol){ var o=c.createOscillator(), g=c.createGain(); o.type=type||'sine'; o.frequency.setValueAtTime(f0,t0); if(f1) o.frequency.exponentialRampToValueAtTime(f1,t0+dur); g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol||0.18,t0+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur); o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0+dur+0.05); }
function playSound(cat){
var c=ctx(); if(!c) return;
var t=c.currentTime;
try{
if(cat==='payment'){ tone(c,880,1320,t,0.12); tone(c,1320,1760,t+0.12,0.18); }
else if(cat==='grades'){ tone(c,660,880,t,0.12,'triangle'); tone(c,880,990,t+0.12,0.16,'triangle'); }
else if(cat==='points'){ tone(c,523,0,t,0.09,'square',0.09); tone(c,659,0,t+0.09,0.09,'square',0.09); tone(c,784,0,t+0.18,0.14,'square',0.09); }
else if(cat==='attendance'){ tone(c,440,554,t,0.16); }
else if(cat==='schedule'){ tone(c,740,740,t,0.09); tone(c,740,740,t+0.14,0.09); }
else if(cat==='content'){ tone(c,587,880,t,0.16,'triangle'); }
else { tone(c,880,1174,t,0.18); }
}catch(e){}
}

/* ========== إطلاق الإشعار ========== */
var fired=(function(){ try{ return JSON.parse(localStorage.getItem('eduNotifyFired')||'{}'); }catch(e){ return {}; } })();
function persistFired(){ try{ var ks=Object.keys(fired); if(ks.length>400){ ks.slice(0,200).forEach(function(k){ delete fired[k]; }); } localStorage.setItem('eduNotifyFired',JSON.stringify(fired)); }catch(e){} }
var TAB_ID=Math.random().toString(36).slice(2)+Date.now();
function iconUrl(){ try{ var b=(window.DataService&&DataService.getBranding)?DataService.getBranding():{}; if(b.logoUrl&&window.driveThumb) return window.driveThumb(b.logoUrl); if(b.logo) return b.logo; }catch(e){} return ''; }
function fire(n){
if(!n) return;
try{ var d=db(); if((d.platformMeta||{}).killAllNotifications===true) return; }catch(e){}
var u=cur(); if(!u) return;

/* 🆕 V13: Kill Switch — لو الأدمن قفل الإشعارات، مفيش إشعار يخرج */
try{
  var d=db(); var f=(d.platformMeta||{}).freeze||{};
  if(f.notify===true || f.full===true) return;
  /* 🆕 زر "إيقاف كل الإشعارات" المخصص */
  if((d.platformMeta||{}).killAllNotifications===true) return;
}catch(e){}

var u=cur(); if(!u) return;
/* 🔒 فحص: الإشعار ده موجه للمستخدم الحالي فعلاً؟ */
if(n.targetUserId && n.targetUserId !== u.id) return;
var ev=eventOf(n);
var fid=n.id||('x'+Date.now());
if(fired[fid]) return;
/* 🔒 قفل تاني: نفس النص لنفس الشخص خلال 6 ساعات = ميتعرضش تاني حتى بعد Reload */
var tk='T|'+(n.targetUserId||'')+'|'+(n.title||'')+'|'+(n.message||'');
if(fired[tk] && Date.now()-fired[tk] < 6*3600*1000) return;
fired[fid]=Date.now(); fired[tk]=Date.now(); persistFired();
if(!allowedForRole(ev,u.role)) return;
var p=getPrefs();
if(p.events&&p.events[ev]===false) return;
if(inQuiet(p)) return;
if(p.sound) playSound(catOfEvent(ev));
try{ if(navigator.vibrate) navigator.vibrate([220,110,220]); }catch(e){}
if(p.browser&&('Notification' in window)&&Notification.permission==='granted'&&localStorage.getItem('pushEnabled')!=='1'){
try{
var nf=new Notification(n.title||'EduFlow',{body:n.message||'',icon:iconUrl()||undefined,tag:n.id||('n'+Date.now()),dir:'rtl',lang:'ar'});
nf.onclick=function(){ try{ window.focus(); nf.close(); }catch(e){} };
setTimeout(function(){ try{ nf.close(); }catch(e){} },15000);
}catch(e){}
}
bumpBadge();

/* 🆕 Modal ملء الشاشة للإشعارات المهمة (امتحانات/واجبات جديدة) */
var isUrgentExam = (ev==='exam_new' && n.meta && n.meta.refId);
var isUrgentHw = (ev==='hw_new' && n.meta && n.meta.refId);
var isCustomUrgent = (n.pinned===true || n.priority==='urgent');
if(isUrgentExam || isUrgentHw || isCustomUrgent){
  showUrgentNotification(n, ev);
}
}

function showUrgentNotification(n, ev){
  try{
    if(document.getElementById('urgentNotifOverlay')) return; /* 🔒 مفتوح بالفعل — ممنوع الاستبدال */
    window.__urgentShown=window.__urgentShown||{};
    var uk=(n.id||'')+'|'+(n.targetUserId||'');
    if(window.__urgentShown[uk]) return;
    window.__urgentShown[uk]=1;
    var refId=(n.meta&&n.meta.refId)||'';
    var kind=(ev==='exam_new')?'exam':'homework';
    var ico=(ev==='exam_new')?'🎓':'📝';
    var ov=document.createElement('div');
    ov.id='urgentNotifOverlay';
    ov.style.cssText='position:fixed;inset:0;background:rgba(4,8,20,.92);backdrop-filter:blur(10px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:18px;';
    ov.innerHTML='<div style="max-width:460px;width:100%;background:var(--surface);border:2px solid var(--primary);border-radius:22px;padding:26px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.6);">'+
      '<div style="font-size:64px;margin-bottom:10px;">'+ico+'</div>'+
      '<div style="font-size:20px;font-weight:900;margin-bottom:8px;">'+(n.title||'')+'</div>'+
      '<div style="font-size:14px;color:var(--text-muted);line-height:1.8;margin-bottom:18px;">'+(n.message||'')+'</div>'+
      '<button id="urgentGo" class="btn btn-primary" style="width:100%;padding:14px;font-size:15px;font-weight:900;margin-bottom:8px;">'+(kind==='exam'?'🎮 ادخل الامتحان الآن':'📝 افتح الواجب وحلّه')+'</button>'+
      '<button id="urgentLater" class="btn btn-secondary" style="width:100%;padding:12px;">⏰ تأجيل — أشوفه في صفحته</button>'+
      '<button id="urgentClose" class="btn btn-ghost" style="width:100%;padding:10px;margin-top:6px;font-size:12px;">✕ إغلاق</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('#urgentGo').addEventListener('click',function(){
      window.closeUrgentNotif();
      if(kind==='exam'&&refId){ location.href='exam-taker.html?ex='+refId; }
      else if(refId){ if(window.showSection) window.showSection('homework'); setTimeout(function(){ if(window.openHomework) window.openHomework(refId); },250); }
      else { if(window.showSection) window.showSection('homework'); }
    });
    ov.querySelector('#urgentLater').addEventListener('click',function(){
      window.closeUrgentNotif();
      if(window.showSection) window.showSection(kind==='exam'?'exams':'homework');
    });
    ov.querySelector('#urgentClose').addEventListener('click',function(){ window.closeUrgentNotif(); });
  }catch(e){ console.error(e); }
}

window.closeUrgentNotif=function(){
  var o=document.getElementById('urgentNotifOverlay'); if(o) o.remove();
};


function hookAdd(){
  if(!window.DataService||typeof DataService.addNotification!=='function') return;
  if(!DataService.__notifyListeners) DataService.__notifyListeners=[];
  if(!DataService.__nsListenerAdded){
    DataService.__nsListenerAdded=1;
    DataService.__notifyListeners.push(function(n){ try{ if(n&&targets().indexOf(n.targetUserId)>=0) fire(n); }catch(e){} });
  }
  if(!DataService.__notifyMasterHooked){
    DataService.__notifyMasterHooked=true;
    var orig=DataService.addNotification.bind(DataService);
    var dedup={}; var once={};
function nsLoad(){ try{return JSON.parse(localStorage.getItem('eduNsOnce')||'{}');}catch(e){return {};} }
function nsHas(k){ return !!nsLoad()[k]; }
function nsSet(k){ try{ var o=nsLoad(); o[k]=Date.now(); var ks=Object.keys(o); if(ks.length>2500){ ks.slice(0,1200).forEach(function(x){delete o[x];}); } localStorage.setItem('eduNsOnce',JSON.stringify(o)); }catch(e){} }
try{ dedup=JSON.parse(localStorage.getItem('eduNsDedup')||'{}'); }catch(e){}
    DataService.addNotification=function(n){
try{ if((db().platformMeta||{}).killAllNotifications===true){ return Promise.resolve(null); } }catch(e){}
try{
if(n){
var now=Date.now();
          /* 🔒 أحداث المحتوى (امتحان/واجب/فيديو...) = مرة واحدة لكل طالب مهما اختلفت صيغة الرسالة أو المصدر */
          var EV_ONCE={exam_new:1,hw_new:1,video_new:1,post_new:1,material_new:1,challenge_new:1};
          if(n.meta&&EV_ONCE[n.meta.event]){
            var ek=(n.targetUserId||'')+'|ev|'+n.meta.event+'|'+(n.meta.refId||n.title||'');
            if(once[ek]||nsHas(ek)) return Promise.resolve(null); nsSet(ek);
            once[ek]=1;
          }
          if(n.meta&&n.meta.refId){
            /* 🔒 refId = الحدث ده يحصل مرة واحدة في العمر لكل طالب */
            var rk=(n.targetUserId||'')+'|ref|'+n.meta.refId;
            if(once[rk]||nsHas(rk)) return Promise.resolve(null); nsSet(rk);
            once[rk]=1;
            try{
              var em=JSON.parse(localStorage.getItem('eduNotifyEmitted')||'{}');
              if(!em[n.meta.refId]){ em[n.meta.refId]=1; var ek=Object.keys(em); if(ek.length>3000){ for(var j=0;j<1500;j++) delete em[ek[j]]; } localStorage.setItem('eduNotifyEmitted',JSON.stringify(em)); }
              var dd=db(); dd.notifyEmitted=dd.notifyEmitted||{}; dd.notifyEmitted[n.meta.refId]=1;
            }catch(e){}
          }else{
            /* 🔒 نفس النص لنفس الطالب خلال 6 ساعات = مكرر */
            var k=(n.targetUserId||'')+'|'+(n.title||'')+'|'+(n.message||'');
            if(dedup[k]&&now-dedup[k]<6*3600*1000) return Promise.resolve(null);
            dedup[k]=now; try{ localStorage.setItem('eduNsDedup',JSON.stringify(dedup)); }catch(e){}
            var ks=Object.keys(dedup); if(ks.length>600){ for(var i=0;i<300;i++) delete dedup[ks[i]]; }
          }
        }
      }catch(e){}
      var r=orig(n);
      (DataService.__notifyListeners||[]).forEach(function(L){ try{ L(n); }catch(e){} });
      return r;
    };
  }
}

/* ========== سكانر أحداث المنصة ========== */
function studentsOfGroup(gid){
var out=[],ids={},d=db();
(d.enrollments||[]).forEach(function(e){ if(e.groupId===gid&&e.status==='active'&&!ids[e.studentId]){ ids[e.studentId]=1; out.push(e.studentId); } });
if(!out.length&&DataService.getStudentsByGroup){ (DataService.getStudentsByGroup(gid)||[]).forEach(function(s){ out.push(s.id); }); }
return out;
}
function gById(gid){ return (DataService.getGroups?DataService.getGroups():[]).find(function(g){return g.id===gid;}); }
function parentsOf(sid){ return (db().users||[]).filter(function(u){ return u.role==='parent'&&(u.studentIds||[]).indexOf(sid)>=0; }).map(function(u){ return u.id; }); }
function scanEvents(){
try{
/* 🔒 قفل بين التبويبات: تاب واحد بس هو اللي يمسح */
var now0=Date.now();
try{
  var lock=JSON.parse(localStorage.getItem('eduNotifyScanLock')||'null');
  if(lock&&lock.tab!==TAB_ID&&(now0-lock.t)<15000) return;
  localStorage.setItem('eduNotifyScanLock',JSON.stringify({tab:TAB_ID,t:now0}));
}catch(e){}
var d=db(); d.notifyEmitted=d.notifyEmitted||{};
var lem={}; try{ lem=JSON.parse(localStorage.getItem('eduNotifyEmitted')||'{}'); }catch(e){}
var marked=0;
function emitted(id){ return d.notifyEmitted[id]||lem[id]; }
var last=+localStorage.getItem('eduNotifyScanAt')||0;
if(!last){ /* 🛡️ أول تشغيل: baseline بس — مفيش إشعارات قديمة تتطلق */ localStorage.setItem('eduNotifyScanAt',String(now0)); return; }
var now=Date.now();
var emits=[];
function isNew(x){ if(!x||!x.id) return false; if(emitted(x.id)) return false; var ct=Date.parse(x.createdAt||x.addedAt||x.at||'')||0; return ct>last&&ct<=now+5000; }
function mark(x){ d.notifyEmitted[x.id]=1; lem[x.id]=1; marked++; }
function emittedK(k){ return d.notifyEmitted[k]||lem[k]; }
function markK(k){ d.notifyEmitted[k]=1; lem[k]=1; marked++; }
function attStats(sid){
  var held=0,present=0,absent=0,late=0; var todayK=new Date().toISOString().slice(0,10);
  var gids={}; (DataService.getStudentTeachers?DataService.getStudentTeachers(sid):[]).forEach(function(t){ gids[t.group.id]=1; });
  (d.attendance||[]).forEach(function(a){ if(a.status!=='approved'||a.noAtt||!gids[a.groupId]) return; if((a.date||'')>todayK) return; held++; var r=(a.records||[]).find(function(x){return x.studentId===sid;}); if(r){ if(r.status==='present')present++; else if(r.status==='absent')absent++; else late++; } else absent++; });
  return {held:held,present:present,absent:absent,late:late,pct:held?Math.round(present/held*100):100};
}
function push(sid,ev,title,msg,extra){ var n={targetUserId:sid,type:extra&&extra.type||'general',title:title,message:msg,meta:{event:ev}}; if(extra&&extra.kind) n.meta.kind=extra.kind; if(extra&&extra.refId) n.meta.refId=extra.refId; emits.push(n); }
(d.homework||[]).forEach(function(h){ if(isNew(h)){ mark(h); studentsOfGroup(h.groupId).forEach(function(sid){ push(sid,'hw_new','📝 واجب جديد: '+h.title,'المجموعة: '+((gById(h.groupId)||{}).name||'-')+' · التسليم: '+(h.deadline||'-'),{type:'grade',refId:h.id}); }); } });
(d.exams||[]).forEach(function(x){ if(isNew(x)){ mark(x); studentsOfGroup(x.groupId).forEach(function(sid){ push(sid,'exam_new','🎓 امتحان جديد: '+x.title,'المجموعة: '+((gById(x.groupId)||{}).name||'-'),{type:'grade',refId:x.id}); }); } });
(d.videos||[]).forEach(function(v){ if(isNew(v)){ mark(v); (v.targetType==='group'?studentsOfGroup(v.targetValue):[]).forEach(function(sid){ push(sid,'video_new','🎬 فيديو جديد',v.title||'',{type:'general',refId:v.id}); }); } });
(d.classPosts||[]).forEach(function(cp){ if(isNew(cp)){ mark(cp); studentsOfGroup(cp.groupId).forEach(function(sid){ push(sid,'post_new','📰 بوست حصة جديد',(cp.title||'')+' — '+((gById(cp.groupId)||{}).name||''),{type:'general',refId:cp.id}); }); } });
(d.interactiveMaterials||[]).forEach(function(m){ if(isNew(m)){ mark(m); studentsOfGroup(m.groupId).forEach(function(sid){ push(sid,'material_new','🧩 مادة تفاعلية جديدة',m.title||'',{type:'general',refId:m.id}); }); } });
(d.challenges||[]).forEach(function(ch){ if(isNew(ch)){ mark(ch); (DataService.getStudents?DataService.getStudents():[]).slice(0,200).forEach(function(s){ push(s.id,'challenge_new','🏆 تحدي جديد: '+ch.title,'جائزة: '+(ch.basePoints||0)+' نقطة',{type:'general',refId:ch.id}); }); } });
(d.scheduleChangeLog||[]).forEach(function(l){ if(isNew(l)){ mark(l);
  var already=(d.notifications||[]).some(function(nn){ return nn.meta&&nn.meta.refId===l.id&&nn.meta.event==='schedule_change'; });
  if(already) return; /* 🛡️ ملف تاني (schedule-board/operations) بعت إشعار التغيير ده بالفعل */
  var g=gById(l.groupId);
  if(g&&g.teacherId) push(g.teacherId,'schedule_change','🗓️ تعديل موعد مجموعة',(l.groupName||'')+': '+(l.oldDay||'')+' '+(l.oldTime||'')+' → '+(l.newDay||'')+' '+(l.newTime||''),{kind:'schedule_change',refId:l.id});
  studentsOfGroup(l.groupId).forEach(function(sid){ push(sid,'schedule_change','🗓️ موعد حصة اتغير',(l.groupName||'')+' بقى '+(l.newDay||'')+' '+(l.newTime||''),{kind:'schedule_change',refId:l.id}); }); } });
(d.cancelledSessions||[]).forEach(function(c){ 
  if(isNew(c)){ 
    mark(c); 
    var tStr=new Date().toISOString().slice(0,10);
    if((c.date||'')<=tStr){ /* بس لو الحصة النهارده أو فات موعدها */
      studentsOfGroup(c.groupId).forEach(function(sid){ 
        push(sid,'session_cancel','🚫 حصة اتلغت',(c.reason||'')+' — '+((gById(c.groupId)||{}).name||''),{type:'general'}); 
      }); 
    } else {
      /* حصة في المستقبل: سجلها في بياناتها بس بدون إشعار مزعج */
      var pending=d.pendingCancelledSessions=d.pendingCancelledSessions||[];
      pending.push({id:c.id,date:c.date,groupId:c.groupId,notified:false});
    }
  } 
});
/* فحص الإشعارات المعلقة: لما يوم الحصة ييجي، نبلغ الطالب */
var pending=d.pendingCancelledSessions||[];
var tStr2=new Date().toISOString().slice(0,10);
var remaining=[];
pending.forEach(function(pc){
  if(pc.date<=tStr2 && !pc.notified){
    var c=(d.cancelledSessions||[]).find(function(x){return x.id===pc.id;});
    if(c){
      studentsOfGroup(c.groupId).forEach(function(sid){ 
        push(sid,'session_cancel','🚫 حصة النهارده اتلغت',(c.reason||'')+' — '+((gById(c.groupId)||{}).name||''),{type:'general'}); 
      });
    }
    pc.notified=true;
  }
  if(!pc.notified || pc.date>tStr2) remaining.push(pc);
});
d.pendingCancelledSessions=remaining;

(d.attendance||[]).forEach(function(a){ if(isNew(a)&&a.status==='approved'){ mark(a); (a.records||[]).forEach(function(r){
  if(r.status==='absent'||r.status==='late'){
    var stt=attStats(r.studentId);
    push(r.studentId, r.status==='absent'?'absent':'late', r.status==='absent'?'❌ تسجيل غياب':'⏰ تسجيل تأخر', 'حصة '+(a.groupName||'')+' — '+(a.date||'')+' · 📊 نسبة حضورك الحالية: '+stt.pct+'% ('+stt.present+'/'+stt.held+')', {type:'attendance',refId:a.id});
    if(stt.held>=3&&stt.pct<=75){ parentsOf(r.studentId).forEach(function(pid){ push(pid,'absence_repeat','👀 لوحظ الغياب المتكرر','نسبة حضور ابنك/بنتك '+stt.pct+'% فقط ('+stt.present+'/'+stt.held+' حصص) — نتمنى المتابعة معنا 🌹',{type:'attendance',refId:a.id}); }); }
  }
}); } });
try{
  var groups=(DataService.getGroups?DataService.getGroups():[]);
  d.warn7=d.warn7||{}; d.due8=d.due8||{};
  groups.forEach(function(g){
    var fee=g.monthlyFee||0; if(!fee) return;
    if(!(window.LedgerUI&&LedgerUI.groupSessions&&LedgerUI.cyclesOf&&LedgerUI.paidForCycle)) return; /* المحرك الواحد هو المصدر */
    var cyc=LedgerUI.cyclesOf(g); var open=cyc[cyc.length-1]; if(!open) return;
    var ses=LedgerUI.groupSessions(g.id, open.ck);
    var req=ses.required||8;
    var warnAt=(g.warnAt!=null&&g.warnAt!=='')?+g.warnAt:(req-1);
    var key=g.id+'__'+open.ck;
    if(false){
      d.warn7[key]=1;
      studentsOfGroup(g.id).forEach(function(sid){
        if((LedgerUI.paidForCycle(sid,g.id,open.ck)||0)>=fee) return;
        emits.push({targetUserId:sid,type:'payment',title:'🔔 جهز الشهرية',message:'باقي '+(req-ses.done)+' حصة على اكتمال الدورة الحالية لمجموعة '+g.name+' — الشهرية ('+fee+' ج.م) هتتبطلب لما توصل '+req+'/'+req+'.',meta:{event:'due_warn'}});
      });
    }
    if(false){
      d.due8[key]=1;
      studentsOfGroup(g.id).forEach(function(sid){
        var paid=LedgerUI.paidForCycle(sid,g.id,open.ck)||0;
        if(paid>=fee) return;
        emits.push({targetUserId:sid,type:'payment',title:'💰 الشهرية مستحقة الآن',message:'اكتملت حصص الدورة الحالية لمجموعة '+g.name+' ('+ses.done+'/'+req+') — المستحق: '+fee+' ج.م (متبقي '+(fee-paid)+' ج.م) 🌹',meta:{event:'due_now'}});
      });
    }
  });
}catch(e){}
/* ⏰ تذكير الشهرية: قبل أقرب حصة بيوم + قبلها بساعة (لغير المسدّدين بس) */
try{
  var __DEN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var __nd=new Date();
  (DataService.getGroups?DataService.getGroups():[]).forEach(function(g){
    var fee=g.monthlyFee||0; if(!fee) return;
    if(!(window.LedgerUI&&LedgerUI.groupSessions&&LedgerUI.cyclesOf&&LedgerUI.paidForCycle)) return;
    var cyc=LedgerUI.cyclesOf(g); var open=cyc[cyc.length-1]; if(!open) return;
    var ses=LedgerUI.groupSessions(g.id, open.ck);
    var req=ses.required||8;
    var warnAt=(g.warnAt!=null&&g.warnAt!=='')?+g.warnAt:(req-1);
    if(!(ses.complete||ses.done>=warnAt)) return;
    var sch=(g.schedules&&g.schedules.length)?g.schedules:[{day:g.day,time:g.time}];
    var best=null;
    sch.forEach(function(s){
      if(!s||!s.day||!s.time) return;
      var di=__DEN.indexOf(s.day); if(di<0) return;
      var p=String(s.time).split(':');
      for(var k=0;k<8;k++){
        var dt=new Date(__nd.getFullYear(),__nd.getMonth(),__nd.getDate()+k,+p[0]||0,+p[1]||0,0);
        if(dt.getDay()!==di||dt.getTime()<=now) continue;
        if(!best||dt<best) best=dt; break;
      }
    });
    if(!best) return;
    var ds=best.getFullYear()+'-'+String(best.getMonth()+1).padStart(2,'0')+'-'+String(best.getDate()).padStart(2,'0');
    if((d.cancelledSessions||[]).some(function(c){return c.groupId===g.id&&c.date===ds;})) return;
    var diff=best.getTime()-now, kind=null;
    if(diff<=3600000) kind='h1'; else if(diff<=86400000) kind='d1';
    if(!kind) return;
    studentsOfGroup(g.id).forEach(function(sid){
      var paid=LedgerUI.paidForCycle(sid,g.id,open.ck)||0;
      if(paid>=fee) return;
      var key='payrem|'+kind+'|'+g.id+'|'+sid+'|'+ds;
      if(emittedK(key)) return;
      markK(key);
      emits.push({targetUserId:sid,type:'payment',title:kind==='h1'?'⏰ الحصة بعد ساعة — الشهرية مستحقة':'🔔 تذكير بالشهرية',message:(kind==='h1'?'حصتك في ':'بكرة حصتك في ')+g.name+' ('+ses.done+'/'+req+') — المطلوب '+fee+' ج.م (متبقي '+(fee-paid)+' ج.م). يا ريت تجهزها 🌹',meta:{event:'due_remind',refId:key}});
    });
  });
}catch(e){}
/* 🆕 قواعد ولي الأمر: تأخر تسليم + درجة منخفضة + إحصائية غياب */
var todayS=new Date().toISOString().slice(0,10);
(d.homework||[]).forEach(function(h){
  if(!h.deadline||h.deadline>=todayS) return;
  studentsOfGroup(h.groupId).forEach(function(sid){
    var sub=(d.submissions||[]).find(function(s){return s.homeworkId===h.id&&s.studentId===sid;});
    var k1='od_hw_'+h.id+'_'+sid;
    if(!sub&&!emittedK(k1)){ markK(k1);
      push(sid,'hw_overdue','⏰ واجب متأخر',h.title+' — فات معاد التسليم ('+h.deadline+')',{type:'grade',refId:h.id});
      parentsOf(sid).forEach(function(pid){ push(pid,'hw_overdue','⏰ تأخر في تسليم واجب','ابنك/بنتك لم يسلّم: '+h.title+' (مجموعة '+((gById(h.groupId)||{}).name||'')+')',{type:'grade',refId:h.id}); });
    }
    if(sub&&sub.score!=null){
      var mx=sub.maxScore||h.totalPoints||20; var pc=Math.round(sub.score/mx*100); var k2='lg_hw_'+h.id+'_'+sid;
      if(pc<50&&!emittedK(k2)){ markK(k2);
        push(sid,'low_grade','📉 درجة محتاجة مراجعة','حصلت على '+pc+'% في: '+h.title,{type:'grade',refId:h.id});
        parentsOf(sid).forEach(function(pid){ push(pid,'low_grade','📉 درجة ابنك محتاجة متابعة',pc+'% في '+h.title+' — تواصلوا مع الأستاذ للخطة',{type:'grade',refId:h.id}); });
      }
    }
  });
});
(d.exams||[]).forEach(function(e){
  studentsOfGroup(e.groupId).forEach(function(sid){
    var at=(d.examAttempts||[]).find(function(x){return x.examId===e.id&&x.studentId===sid&&(x.status==='approved'||x.status==='graded');});
    if(at&&at.score!=null){
      var mx2=at.maxScore||e.totalPoints||100; var pc2=Math.round(at.score/mx2*100); var k3='lg_ex_'+e.id+'_'+sid;
      if(pc2<50&&!emittedK(k3)){ markK(k3);
        push(sid,'low_grade','📉 نتيجة محتاجة مراجعة',pc2+'% في امتحان: '+e.title,{type:'grade',refId:e.id});
        parentsOf(sid).forEach(function(pid){ push(pid,'low_grade','📉 نتيجة ابنك محتاجة متابعة',pc2+'% في امتحان: '+e.title,{type:'grade',refId:e.id}); });
      }
    }
  });
});
(DataService.getStudents?DataService.getStudents():[]).forEach(function(s){
  var st=attStats(s.id);
  if(st.held>=4&&st.pct<=75){
    var k4='abs_rep_'+s.id+'_'+Math.floor(st.held/4);
    if(!emittedK(k4)){ markK(k4);
      push(s.id,'absence_repeat','📊 إحصائية حضورك','نسبة حضورك '+st.pct+'% ('+st.present+'/'+st.held+') — حافظ على شعلة الحضور 🔥',{type:'attendance'});
      parentsOf(s.id).forEach(function(pid){ push(pid,'absence_repeat','👀 لوحظ الغياب المتكرر','نسبة حضور ابنك/بنتك '+st.pct+'% فقط ('+st.present+'/'+st.held+' حصص) — نتمنى المتابعة 🌹',{type:'attendance'}); });
    }
  }
});
(d.scheduledNotifs||[]).slice().forEach(function(sn){ if(sn&&sn.sendAt&&Date.parse(sn.sendAt)<=now){ d.scheduledNotifs=(d.scheduledNotifs||[]).filter(function(x){ return x.id!==sn.id; }); emits.push(sn); } });
try{ var lks=Object.keys(lem); if(lks.length>3000){ lks.slice(0,1500).forEach(function(k){ delete lem[k]; }); } localStorage.setItem('eduNotifyEmitted',JSON.stringify(lem)); }catch(e){}
if(emits.length||marked>0){ saveD(d); emits.slice(0,50).forEach(function(n){ try{ DataService.addNotification(n); }catch(e){} }); }
localStorage.setItem('eduNotifyScanAt',String(now));
}catch(e){}
}
function pollFire(){
try{
var ts=targets(); if(!ts.length) return;
var last=localStorage.getItem('eduNotifyFireAt')||'1970-01-01';
var list=(db().notifications||[]).filter(function(x){ return ts.indexOf(x.targetUserId)>=0&&(x.createdAt||'')>last&&!fired[x.id]; });
list.slice(0,5).forEach(fire);
localStorage.setItem('eduNotifyFireAt',new Date().toISOString());
}catch(e){}
}

/* ========== الجرس + العداد ========== */
function unreadCount(){
var u=cur(); if(!u) return 0;
var ts=targets(); if(!ts.length) return 0;
var readAt=localStorage.getItem('eduNotifyReadAt_'+u.id)||'1970-01-01';
return (db().notifications||[]).filter(function(x){ return ts.indexOf(x.targetUserId)>=0&&(x.createdAt||'')>readAt; }).length;
}

function bumpBadge(){
  try{
    var b=document.getElementById('notifyBell'); if(!b) return;
    var n=unreadCount();
    var badge=b.querySelector('.nb-count');
    if(!badge){
      badge=document.createElement('span');
      badge.className='nb-count';
      badge.style.cssText='position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;border-radius:9999px;font-size:10px;font-weight:900;padding:2px 6px;min-width:18px;text-align:center;line-height:1.2;box-shadow:0 2px 6px rgba(239,68,68,.5);pointer-events:none;font-family:var(--font-en);';
      b.appendChild(badge);
    }
    badge.textContent=n>99?'99+':n;
    badge.style.display=n?'inline-block':'none';
  }catch(e){}
}

function injectCss(){
if(document.getElementById('nsCss')) return;
var st=document.createElement('style'); st.id='nsCss';
st.textContent='.nsrow{display:flex;align-items:center;gap:8px;padding:7px 4px;font-size:13px;cursor:pointer;border-bottom:1px dashed rgba(128,128,128,.25);}'+
'.nsrow input{width:18px;height:18px;accent-color:#6366f1;}'+
'.nsrow.locked{opacity:.5;cursor:not-allowed;}'+
'.nsbtn{padding:8px 12px;border:1px solid rgba(128,128,128,.4);border-radius:10px;background:transparent;color:inherit;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;}'+
'.nsgroup{margin:10px 0 2px;font-weight:800;font-size:12px;color:var(--primary,#6366f1);}'+
'.np-table{width:100%;border-collapse:collapse;font-size:12px;}'+
'.np-table th,.np-table td{border:1px solid var(--border,#ddd);padding:6px 8px;text-align:center;}'+
'.np-table td:first-child,.np-table th:first-child{text-align:right;font-weight:700;}'+
'.np-table input{width:17px;height:17px;accent-color:#6366f1;}'+
'.header-actions{display:flex;gap:8px;align-items:center;}'+
'.header-actions .icon-btn{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;font-size:19px;border-radius:12px;}'+
'.header-actions .icon-btn::before,.header-actions .icon-btn::after{content:none!important;}';
document.head.appendChild(st);
}

/* ========== 📋 قائمة الإشعارات (تفتح من الجرس) ========== */
function openNotifPanel(){
injectCss();
var u=cur(); if(!u) return;
var old=document.getElementById('npOverlay'); if(old) old.remove();
var ts=targets();
var readAt=localStorage.getItem('eduNotifyReadAt_'+u.id)||'1970-01-01';
var raw=(db().notifications||[]);
var items=raw.filter(function(x){ return x&&x.targetUserId&&ts.indexOf(x.targetUserId)>=0; })
.sort(function(a,b){ return String(b.createdAt||'').localeCompare(String(a.createdAt||'')); });
var seen={}; var uniq=[];
items.forEach(function(x){ var k=x.id||(x.title+(x.createdAt||'')); if(!seen[k]){ seen[k]=1; uniq.push(x); } });
items=uniq.slice(0,80);
var unreadN=items.filter(function(n){ return ((n.createdAt||'')>readAt)&&!n.read; }).length;
var isLight=document.body.getAttribute('data-theme')==='light';
var solidBg=isLight?'#ffffff':'#161b2e';
var solidTx=isLight?'#111827':'#f1f5f9';
var borderC=isLight?'#c9cfdb':'#3a4160';
/* بناء الصفوف في متغير منفصل — مفيش خلط return مع html+= */
var rowsHtml='';
if(items.length){
items.forEach(function(n){
var unread=((n.createdAt||'')>readAt)&&!n.read;
var bg=unread?(isLight?'#eef2ff':'rgba(99,102,241,.12)'):'transparent';
var border=unread?'border-right:3px solid #6366f1;':'';
var row='<div style="padding:12px;margin-bottom:6px;border-radius:10px;background:'+bg+';'+border+'">';
row+='<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">';
row+='<strong style="font-size:14px;flex:1;line-height:1.5;">'+(n.title||'إشعار')+'</strong>';
if(unread) row+='<span style="background:#6366f1;color:#fff;border-radius:9999px;padding:2px 8px;font-size:10px;white-space:nowrap;flex-shrink:0;">جديد</span>';
row+='</div>';
row+='<div style="font-size:13px;margin-top:4px;opacity:.9;line-height:1.6;">'+(n.message||'')+'</div>';
row+='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;"><span style="font-size:11px;opacity:.6;">🕐 '+new Date(n.createdAt||Date.now()).toLocaleString('ar-EG')+'</span><button type="button" class="nsbtn" style="padding:2px 8px;font-size:11px;" onclick="event.stopPropagation();window.deleteNotif(\''+n.id+'\')">🗑 حذف</button></div>';
if(n.meta&&n.meta.event==='absent'&&n.meta.date&&!n.disputed){row+='<button type="button" class="nsbtn" style="margin-top:8px;background:var(--warning-bg);border-color:var(--warning);color:var(--warning);" onclick="window.disputeAbsent&&window.disputeAbsent(\''+n.id+'\',\''+(n.meta.gid||'')+'\',\''+n.meta.date+'\')">✋ أنا كنت حاضر — اعتراض</button>';}
row+='</div>';
rowsHtml+=row;
});
}else{
rowsHtml='<div style="text-align:center;padding:60px 20px;"><div style="font-size:64px;margin-bottom:10px;">🔔</div><strong style="display:block;font-size:16px;margin-bottom:6px;">مفيش إشعارات حالياً</strong><div style="font-size:13px;opacity:.7;">أي جديد يخصك هيظهر هنا فوراً</div></div>';
}
var html='<div style="font-family:inherit;direction:rtl;text-align:right;max-width:560px;width:100%;background:'+solidBg+';color:'+solidTx+';border:1px solid '+borderC+';border-radius:16px;padding:0;box-shadow:0 24px 70px rgba(0,0,0,.55);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">';
html+='<div style="padding:14px 18px;border-bottom:1px solid '+borderC+';display:flex;justify-content:space-between;align-items:center;gap:10px;">';
html+='<h3 style="margin:0;font-size:16px;font-weight:800;">🔔 الإشعارات'+(unreadN?' <span style="background:#6366f1;color:#fff;border-radius:9999px;padding:2px 8px;font-size:11px;margin-inline-start:6px;">'+unreadN+' جديد</span>':'')+'</h3>';
html+='<div style="display:flex;gap:6px;align-items:center;">';
if(items.length) html+='<button type="button" class="nsbtn" onclick="window.markAllNotifsRead()" style="padding:6px 10px;font-size:11px;">✓ الكل مقروء</button><button type="button" class="nsbtn" onclick="window.clearAllNotifs()" style="padding:6px 10px;font-size:11px;color:#f87171;">🗑 مسح الكل</button>';
html+='<button type="button" class="nsbtn" onclick="window.closeNotifPanel();window.openNotifySettings();" title="إعدادات الإشعارات" style="padding:6px 10px;font-size:13px;">⚙️</button>';
html+='<button type="button" class="nsbtn" onclick="window.closeNotifPanel()" title="إغلاق" style="padding:6px 10px;font-size:13px;color:'+(isLight?'#ef4444':'#f87171')+';">✕</button>';
html+='</div></div>';
html+='<div style="flex:1;overflow-y:auto;padding:10px 14px;min-height:260px;">'+rowsHtml+'</div>';
html+='</div>';
var ov=document.createElement('div'); ov.id='npOverlay';
ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';
ov.innerHTML=html;
ov.addEventListener('click',function(e){ if(e.target===ov) window.closeNotifPanel(); });
document.body.appendChild(ov);
}

window.closeNotifPanel=function(){
var o=document.getElementById('npOverlay'); if(o) o.remove();
};
window.markAllNotifsRead=function(){
try{
var u=cur(); if(!u) return;
localStorage.setItem('eduNotifyReadAt_'+u.id,new Date().toISOString());
var d=db(); var ts=targets(); var changed=[];
(d.notifications||[]).forEach(function(n){ if(ts.indexOf(n.targetUserId)>=0&&!n.read){ n.read=true; changed.push(n); } });
if(changed.length&&DataService._saveData){
DataService._saveData(d);
changed.slice(0,30).forEach(function(n){ try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('notifications',n.id,n); }catch(e){} });
}
bumpBadge();
window.closeNotifPanel();
openNotifPanel();
if(window.safeToast) window.safeToast('✓ تم تحديد الكل كمقروء','success');
}catch(e){}
};

window.deleteNotif=function(id){
try{
var d=db();
d.notifications=(d.notifications||[]).filter(function(x){return x.id!==id;});
saveD(d);
try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.deleteDoc('notifications',id);}catch(e){}
bumpBadge();
var o=document.getElementById('npOverlay');if(o)o.remove();
openNotifPanel();
}catch(e){}
};
window.clearAllNotifs=function(){
try{
if(!confirm('مسح كل إشعاراتك القديمة؟ الجديد هيوصل عادي.'))return;
var ts=targets();var d=db();var keep=[],del=[];
(d.notifications||[]).forEach(function(x){ if(ts.indexOf(x.targetUserId)>=0){del.push(x);}else keep.push(x); });
d.notifications=keep;saveD(d);
del.slice(0,60).forEach(function(x){try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.deleteDoc('notifications',x.id);}catch(e){}});
bumpBadge();
var o=document.getElementById('npOverlay');if(o)o.remove();
openNotifPanel();
if(window.safeToast)window.safeToast('🗑 اتمسحت الإشعارات القديمة','success');
}catch(e){}
};

/* 🆕 V13: مسح جميع إشعارات جميع المستخدمين (للأدمن فقط) */
window.nukeAllNotifications=function(){
try{
  var u=cur();
  if(!u||(u.role!=='admin'&&u.role!=='super_admin')){
    if(window.safeToast)window.safeToast('❌ للأدمن فقط','error');
    return;
  }
  if(!confirm('⚠️ تحذير: هيمسح كل إشعارات كل المستخدمين (طلاب، أساتذة، مساعدين، أولياء أمور).\n\nمتأكد؟'))return;
  var d=db();
  var total=(d.notifications||[]).length;
  /* 🗑️ المسح الشامل */
  var oldNotifs=d.notifications||[];
  d.notifications=[];
  d.notifyEmitted={};
  d.warn7={};
  d.due8={};
  saveD(d);
  /* 🗑️ المسح من Firebase (batch) */
  if(window.FirebaseService&&FirebaseService._db){
    oldNotifs.slice(0,500).forEach(function(nn){
      try{ FirebaseService.deleteDoc('notifications',nn.id); }catch(e){}
    });
    try{ FirebaseService.saveDoc('platformMeta','meta',{notifyEmitted:{},warn7:{},due8:{}}); }catch(e){}
  }
  /* 🧹 تصفير العداد في localStorage */
  Object.keys(localStorage).forEach(function(k){
    if(k.indexOf('eduNotifyReadAt_')===0) localStorage.removeItem(k);
    if(k.indexOf('eduNotifyFired')===0) localStorage.removeItem(k);
  });
  try{ localStorage.setItem('eduNotifyFired','{}'); }catch(e){}
  bumpBadge();
  if(window.safeToast)window.safeToast('🗑️ تم مسح '+total+' إشعار لكل المستخدمين','success');
}catch(e){ if(window.safeToast)window.safeToast('خطأ: '+e.message,'error'); }
};

/* 🆕 V13: Kill Switch — إيقاف/تفعيل كل الإشعارات */
window.toggleKillAllNotifications=function(){
try{
  var u=cur();
  if(!u||(u.role!=='admin'&&u.role!=='super_admin')){
    if(window.safeToast)window.safeToast('❌ للأدمن فقط','error');
    return;
  }
  var d=db(); d.platformMeta=d.platformMeta||{};
  d.platformMeta.killAllNotifications = !d.platformMeta.killAllNotifications;
  saveD(d);
  if(window.FirebaseService&&FirebaseService._db){
    try{ FirebaseService.saveDoc('platformMeta','meta',d.platformMeta); }catch(e){}
  }
  var on=d.platformMeta.killAllNotifications;
  if(window.safeToast)window.safeToast(on?'🔕 تم إيقاف كل الإشعارات — مفيش إشعار هيوصل لأي حد':'🔔 تم تفعيل الإشعارات — الرجوع للوضع الطبيعي',on?'warning':'success');
  /* 🔄 ريفريش أي صفحة مفتوحة */
  try{ localStorage.setItem('eduflowLedgerPing',String(Date.now())); }catch(e){}
}catch(e){}
};

/* 🚨 Kill Switch + مسح شامل */
window.toggleKillAllNotifications=function(){
try{
var u=cur(); if(!u||(u.role!=='admin'&&u.role!=='super_admin')){ if(window.safeToast)window.safeToast('❌ للأدمن فقط','error'); return; }
var d=db(); d.platformMeta=d.platformMeta||{};
d.platformMeta.killAllNotifications=!d.platformMeta.killAllNotifications;
saveD(d);
try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('platformMeta','meta',d.platformMeta); }catch(e){}
if(window.safeToast)window.safeToast(d.platformMeta.killAllNotifications?'🔕 تم إيقاف كل الإشعارات فوراً':'🔔 تم إعادة تفعيل الإشعارات',d.platformMeta.killAllNotifications?'warning':'success');
}catch(e){}
};
window.nukeAllNotifications=function(){
try{
var u=cur(); if(!u||(u.role!=='admin'&&u.role!=='super_admin')){ if(window.safeToast)window.safeToast('❌ للأدمن فقط','error'); return; }
if(!confirm('⚠️ هيمسح كل إشعارات كل المستخدمين نهائياً — متأكد؟')) return;
var d=db(); var total=(d.notifications||[]).length;
var old=d.notifications||[];
d.notifications=[]; d.notifyEmitted={}; d.warn7={}; d.due8={};
saveD(d);
old.slice(0,400).forEach(function(n){ try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.deleteDoc('notifications',n.id); }catch(e){} });
Object.keys(localStorage).forEach(function(k){ if(k.indexOf('eduNotifyReadAt_')===0||k.indexOf('eduNotifyFired')===0) localStorage.removeItem(k); });
try{ localStorage.setItem('eduNotifyFired','{}'); }catch(e){}
bumpBadge();
if(window.safeToast)window.safeToast('🗑 تم مسح '+total+' إشعار لكل المستخدمين','success');
}catch(e){}
};

window.openNotifPanel=openNotifPanel;
/* 🧹 كنس المكررات: نفس الهدف+العنوان+الرسالة = إشعار واحد بس */
window.cleanDupNotifs=function(){
  try{
    var d=db(); var seen={}; var del=[];
    d.notifications=(d.notifications||[]).filter(function(n){
      var k=(n.targetUserId||'')+'|'+(n.title||'')+'|'+(n.message||'');
      if(seen[k]){ del.push(n); return false; }
      seen[k]=1; return true;
    });
    saveD(d);
    del.slice(0,300).forEach(function(n){ try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.deleteDoc('notifications',n.id); }catch(e){} });
    bumpBadge();
    if(window.safeToast) window.safeToast('🧹 اتمسح '+del.length+' إشعار مكرر','success');
    return del.length;
  }catch(e){ return 0; }
};

/* ========== إعدادات المستخدم (تفصيلية بالأحداث) ========== */
function openSettings(){
injectCss();
var old=document.getElementById('nsOverlay'); if(old) old.remove();
var u=cur(); if(!u) return;
var p=getPrefs(); var pol=getPolicy(); var rolePol=pol[u.role]||{};
var isLight=document.body.getAttribute('data-theme')==='light';
var solidBg=isLight?'#ffffff':'#161b2e';
var solidTx=isLight?'#111827':'#f1f5f9';
var html='<div style="font-family:inherit;direction:rtl;text-align:right;max-width:460px;width:100%;background:'+solidBg+';color:'+solidTx+';border:1px solid '+(isLight?'#c9cfdb':'#3a4160')+';border-radius:16px;padding:18px;box-shadow:0 24px 70px rgba(0,0,0,.55);max-height:88vh;overflow-y:auto;">';
html+='<h3 style="margin:0 0 4px;">🔔 إعدادات إشعاراتي</h3>';
html+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;"><button type="button" id="nsPerm" class="nsbtn"></button><button type="button" id="nsTest" class="nsbtn">🔊 جرّب الصوت</button></div>';
html+='<label class="nsrow"><input type="checkbox" id="nsSound" '+(p.sound?'checked':'')+'> <span>🔊 الصوت المميز</span></label>';
html+='<label class="nsrow"><input type="checkbox" id="nsBrowser" '+(p.browser?'checked':'')+'> <span>🖥️ إشعارات المتصفح</span></label>';
html+='<label class="nsrow"><input type="checkbox" id="nsQuiet" '+(p.quiet&&p.quiet.enabled?'checked':'')+'> <span>🌙 عدم الإزعاج من</span> <input type="time" id="nsFrom" value="'+((p.quiet&&p.quiet.from)||'22:00')+'" style="padding:4px;border:1px solid var(--border,#ccc);border-radius:8px;background:transparent;color:inherit;"> <span>لـ</span> <input type="time" id="nsTo" value="'+((p.quiet&&p.quiet.to)||'08:00')+'" style="padding:4px;border:1px solid var(--border,#ccc);border-radius:8px;background:transparent;color:inherit;"></label>';
html+='<div class="nsgroup">📂 الأحداث اللي توصلني:</div>';
var lastCat='';
EVENTS.forEach(function(e){
var locked=rolePol[e.k]===false;
if(locked) return;
if(e.c!==lastCat){ html+='<div class="nsgroup" style="opacity:.8;">'+(CAT_LABEL[e.c]||e.c)+'</div>'; lastCat=e.c; }
var checked=!(p.events&&p.events[e.k]===false);
html+='<label class="nsrow"><input type="checkbox" data-ev="'+e.k+'" '+(checked?'checked':'')+'> <span>'+e.i+' '+e.l+'</span></label>';
});
html+='<button type="button" id="nsSave" style="width:100%;margin-top:14px;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:800;cursor:pointer;font-family:inherit;">💾 حفظ إعداداتي</button>';
html+='</div>';
var ov=document.createElement('div'); ov.id='nsOverlay';
ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';
ov.innerHTML=html;
document.body.appendChild(ov);
ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
function paintPerm(){ var btn=document.getElementById('nsPerm'); if(!btn) return; if(!('Notification' in window)){ btn.textContent='🚫 المتصفح مش داعم'; btn.disabled=true; return; } btn.textContent=Notification.permission==='granted'?'✅ إشعارات المتصفح مفعلة':(Notification.permission==='denied'?'🚫 مرفوضة من المتصفح':'🔕 فعّل إشعارات المتصفح'); }
paintPerm();
document.getElementById('nsPerm').onclick=function(){ ctx(); if(!('Notification' in window)) return; if(Notification.permission==='default') Notification.requestPermission().then(function(){ paintPerm(); }); else if(Notification.permission==='granted') fire({id:'t'+Date.now(),title:'✅ الإشعارات شغالة',message:'أي حدث مسموح هيوصلك فوراً بصوت مميز.',type:'general',meta:{event:'general'}}); };
document.getElementById('nsTest').onclick=function(){ ctx(); playSound('payment'); setTimeout(function(){playSound('grades');},450); setTimeout(function(){playSound('points');},900); };
document.getElementById('nsSave').onclick=function(){
var np=getPrefs();
np.sound=document.getElementById('nsSound').checked;
np.browser=document.getElementById('nsBrowser').checked;
np.quiet={enabled:document.getElementById('nsQuiet').checked,from:document.getElementById('nsFrom').value||'22:00',to:document.getElementById('nsTo').value||'08:00'};
np.events=np.events||{};
var cbs=document.querySelectorAll('#nsOverlay input[data-ev]');
for(var i=0;i<cbs.length;i++){ if(!cbs[i].disabled) np.events[cbs[i].getAttribute('data-ev')]=cbs[i].checked; }
savePrefs(np);
close();
try{ if(window.safeToast) window.safeToast('✅ تم حفظ إعدادات إشعاراتك','success'); }catch(e){}
};
function close(){ var o=document.getElementById('nsOverlay'); if(o) o.remove(); bumpBadge(); }
}

function cleanBell(b){
  try{
    var badge=b.querySelector('.nb-count');
    b.textContent='🔔';
    if(badge) b.appendChild(badge);
  }catch(e){}
}
function fixThemeIcon(){
  try{
    var t=document.getElementById('themeToggle'); if(!t) return;
    var dark=(document.body.getAttribute('data-theme')||'dark')==='dark';
    t.textContent=dark?'🌙':'☀️';
  }catch(e){}
}
function bell(){
  var existing=document.getElementById('notifyBell');
  if(existing){
    if(!existing.__wired){
      existing.__wired=1;
      existing.onclick=function(e){ e&&e.stopPropagation&&e.stopPropagation(); ctx(); openNotifPanel(); }; /* 🔔 يفتح قائمة الإشعارات */
      existing.style.position='relative';
    }
    cleanBell(existing);
    bumpBadge();
    if(!existing.__badgeInt){ existing.__badgeInt=setInterval(bumpBadge,15000); }
    return true;
  }
  var b=document.createElement('button'); b.id='notifyBell'; b.type='button'; b.title='الإشعارات';
  b.style.cssText='position:relative;border:1px solid var(--border);background:var(--surface-hover);border-radius:12px;width:42px;height:42px;font-size:19px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;margin-inline-end:6px;';
  b.innerHTML='🔔';
  b.onclick=function(e){ e&&e.stopPropagation&&e.stopPropagation(); ctx(); openNotifPanel(); }; /* 🔔 يفتح قائمة الإشعارات */
  var anchor=document.getElementById('themeToggle');
  if(anchor&&anchor.parentNode){ anchor.parentNode.insertBefore(b,anchor); }
  else{
    var ha=document.querySelector('.header-actions')||document.querySelector('.main-header-left')||document.querySelector('.main-header');
    if(ha){ ha.appendChild(b); }
    else{
      b.style.cssText='position:fixed;bottom:16px;right:16px;z-index:9990;border:1px solid var(--border);background:var(--surface);border-radius:12px;width:46px;height:46px;font-size:20px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.35);';
      document.body.appendChild(b);
    }
  }
  cleanBell(b); bumpBadge();
  if(!b.__badgeInt){ b.__badgeInt=setInterval(bumpBadge,15000); }
  return true;
}

/* ========== 🛡️ صفحة سياسة الأدمن ========== */
function injectPolicySection(){
try{
var u=cur(); if(!u||(u.role!=='admin'&&u.role!=='super_admin')) return;
/* 🚨 عنصر القائمة الجانبية للتحكم في الإشعارات */
var nav0=document.getElementById('sidebarNav');
if(nav0&&!nav0.querySelector('[data-section="notifControl"]')){
var it0='<div class="sidebar-item" data-section="notifControl" onclick="window.showSection(\'notifControl\')"><span class="sidebar-item-icon">🚨</span><span class="sidebar-item-label">التحكم في الإشعارات</span></div>';
var a0=nav0.querySelector('[data-section="notifyPolicy"]');
if(a0) a0.insertAdjacentHTML('afterend',it0); else nav0.insertAdjacentHTML('beforeend',it0);
}
if(document.getElementById('section-notifyPolicy')) return;
var host=document.querySelector('.content-area')||document.getElementById('mainContent');
if(!host) return;
var sec=document.createElement('section');
sec.className='section'; sec.id='section-notifyPolicy';
sec.innerHTML='<div class="section-header"><div><h2 class="section-title">🔔 سياسة الإشعارات</h2><p class="text-sm text-muted">تحكم كامل: أي حدث يوصل لأي دور — يسري فوراً على كل المستخدمين والأجهزة</p></div><div style="display:flex;gap:8px;"><button class="btn btn-ghost btn-sm" onclick="window.NotifyPolicy.reset()">♻️ افتراضي</button><button class="btn btn-primary btn-sm" onclick="window.NotifyPolicy.saveUI()">💾 حفظ السياسة</button></div></div><div id="notifyPolicyHost"></div>';
host.appendChild(sec);
var nav=document.getElementById('sidebarNav');
if(nav&&!nav.querySelector('[data-section="notifyPolicy"]')){
var item='<div class="sidebar-item" data-section="notifyPolicy" onclick="window.showSection(\'notifyPolicy\')"><span class="sidebar-item-icon">🔔</span><span class="sidebar-item-label">سياسة الإشعارات</span></div>';
var a=nav.querySelector('[data-section="gamification"]')||nav.querySelector('[data-section="logs"]');
if(a) a.insertAdjacentHTML('afterend',item); else nav.insertAdjacentHTML('beforeend',item);
}
if(typeof window.showSection==='function'&&!window.__npHooked){
window.__npHooked=true;
var os=window.showSection;
window.showSection=function(id){ var r=os.apply(this,arguments); if(id==='notifyPolicy') window.NotifyPolicy.render(); return r; };
}
}catch(e){}
}

window.openNotifySettings=openSettings;
window.NotifyPolicy={
render:function(){
try{
var host=document.getElementById('notifyPolicyHost'); if(!host) return;
var pol=getPolicy();
var html='<div class="card" style="padding:12px;overflow-x:auto;"><table class="np-table"><thead><tr><th style="min-width:220px;">الحدث</th>';
ROLES.forEach(function(r){ html+='<th>'+r.l+'</th>'; });
html+='</tr></thead><tbody>';
var lastCat='';
EVENTS.forEach(function(e){
if(e.c!==lastCat){ html+='<tr><td colspan="6" style="background:var(--surface-hover,#f5f5f5);font-weight:800;text-align:right;">'+(CAT_LABEL[e.c]||e.c)+'</td></tr>'; lastCat=e.c; }
html+='<tr><td>'+e.i+' '+e.l+'</td>';
ROLES.forEach(function(r){ html+='<td><input type="checkbox" data-role="'+r.k+'" data-ev="'+e.k+'" '+(pol[r.k][e.k]!==false?'checked':'')+'></td>'; });
html+='</tr>';
});
html+='</tbody></table></div>';
html+='<div class="filter-info" style="margin-top:10px;">💡 المستخدم يقدر يقفل أي حدث مسموح لدوره من زرار 🔔، بس <strong>ميقدرش يفعّل حدث إنت قفله لدوره</strong> — بيظهرله مقفول بقفل 🔒.</div>';
host.innerHTML=html;
}catch(e){ console.error(e); }
},
saveUI:function(){
try{
var pol=getPolicy();
var cbs=document.querySelectorAll('#notifyPolicyHost input[data-role]');
for(var i=0;i<cbs.length;i++){ var r=cbs[i].getAttribute('data-role'), ev=cbs[i].getAttribute('data-ev'); pol[r]=pol[r]||{}; pol[r][ev]=cbs[i].checked; }
savePolicy(pol);
try{ if(window.safeToast) window.safeToast('✅ تم حفظ السياسة — سارية فوراً على كل الأدوار','success'); }catch(e){}
window.NotifyPolicy.render();
}catch(e){}
},
reset:function(){
if(!confirm('رجوع السياسة للافتراضي؟')) return;
savePolicy(defPolicy());
window.NotifyPolicy.render();
}
};

/* ========== 📢 إشعارات مخصصة (للأدمن/المساعد) ========== */
window.openCustomNotifyModal=function(){
try{
var u=cur(); if(!u||(u.role!=='admin'&&u.role!=='super_admin'&&u.role!=='assistant')) return;
var d=db();
var groups=DataService.getGroups?DataService.getGroups():[];
var html='<div class="modal-header"><h3 class="modal-title">📢 إرسال إشعار مخصص</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">';
html+='<div class="form-group"><label>🎯 الهدف *</label><select id="cnTarget" class="form-select" onchange="window.cnTargetChange()"><option value="all">كل الطلاب</option><option value="group">مجموعة معينة</option><option value="grade">صف معين</option><option value="student">طالب معين</option></select></div>';
html+='<div id="cnTargetSelect" style="display:none;"><div class="form-group"><label>🔍 بحث (اسم أو كود)</label><input type="text" id="cnSearch" class="form-input" placeholder="اكتب لتصفية القائمة..." oninput="window.cnTargetChange()"></div><div class="form-group"><label>اختار *</label><select id="cnTargetValue" class="form-select" size="6"></select></div></div>';
html+='<div class="form-group"><label>📝 العنوان *</label><input type="text" id="cnTitle" class="form-input" placeholder="مثال: امتحان مفاجئ بكرة"></div>';
html+='<div class="form-group"><label>💬 الرسالة *</label><textarea id="cnMessage" class="form-input" rows="3" placeholder="اكتب تفاصيل الإشعار..."></textarea></div>';
html+='<div class="form-group"><label>⚡ الأولوية</label><select id="cnPriority" class="form-select"><option value="normal">عادي (في قائمة الإشعارات)</option><option value="important">مهم (يظهر في الهيدر)</option><option value="urgent">عاجل (modal فوري عند الدخول)</option></select></div>';
html+='<div class="filter-info">💡 الإشعارات العاجلة بتظهر للطالب كـ modal أوتوماتيك أول ما يدخل أو يمسح الباركود</div>';
html+='<button class="btn btn-primary w-full" onclick="window.sendCustomNotify()">📤 إرسال الإشعار</button>';
html+='</div>';
ThemeManager.openModal(html,'modal-md');
}catch(e){console.error(e);}
};

/* ========== 📢 إشعارات مخصصة V5 — نطاق مقفول + بحث + اختيار متعدد + معاينة + جدولة ========== */
window.__cnState={mode:'group',sel:{}};
window.cnScopedGroups=function(){
  if(window.ScopedData&&ScopedData.groups) return ScopedData.groups();
  var u=cur();
  if(window.Ops&&Ops.groupsInScope&&u&&u.role==='assistant') return Ops.groupsInScope(u.id);
  return (DataService.getGroups?DataService.getGroups():[]);
};
window.openCustomNotifyModal=function(){
try{
var u=cur(); if(!u||(u.role!=='admin'&&u.role!=='super_admin'&&u.role!=='assistant')) return;
window.__cnState={mode:'group',sel:{}};
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📢 إرسال إشعار مخصص</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
'<div class="form-group"><label>🎯 الهدف *</label><select id="cnTarget" class="form-select" onchange="window.cnTargetChange()">'+
'<option value="group">👥 مجموعة معينة</option><option value="unpaid">💰 غير المسددين في مجموعة</option><option value="grade">🎓 صف معين</option><option value="student">🧑‍🎓 طلاب بالاختيار المتعدد</option><option value="all">⚠️ كل الطلاب (بحذر)</option></select></div>'+
'<div id="cnGroupWrap"><div class="form-group"><label>🔍 بحث مجموعة (اسم/أستاذ/سنتر)</label><input type="text" id="cnGroupSearch" class="form-input" oninput="window.cnFillGroups()" placeholder="اكتب لتصفية..."></div>'+
'<div class="form-group"><label>المجموعة *</label><select id="cnGroup" class="form-select" size="5"></select></div></div>'+
'<div id="cnGradeWrap" style="display:none;" class="form-group"><label>🎓 الصف *</label><select id="cnGrade" class="form-select"></select></div>'+
'<div id="cnStuWrap" style="display:none;"><div class="form-group"><label>🔍 بحث طالب (اسم/كود/رقم)</label><input type="text" id="cnSearch" class="form-input" oninput="window.cnRenderStu()" placeholder="اكتب لتصفية..."></div>'+
'<div id="cnStuList" style="max-height:180px;overflow:auto;border:1px solid var(--border);border-radius:10px;padding:6px;"></div>'+
'<div class="text-xs text-muted" style="margin-top:4px;">المحدد: <strong id="cnSelCount">0</strong> طالب</div></div>'+
'<div class="form-group"><label>📝 العنوان *</label><input type="text" id="cnTitle" class="form-input" placeholder="مثال: امتحان مفاجئ بكرة" oninput="window.cnPreview()"></div>'+
'<div class="form-group"><label>💬 الرسالة *</label><textarea id="cnMessage" class="form-input" rows="3" placeholder="اكتب تفاصيل الإشعار..." oninput="window.cnPreview()"></textarea></div>'+
'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
'<div class="form-group"><label>⚡ الأولوية</label><select id="cnPriority" class="form-select"><option value="normal">عادي</option><option value="important">مهم (الهيدر)</option><option value="urgent">عاجل (مودال فوري)</option></select></div>'+
'<div class="form-group"><label>⏰ الإرسال</label><select id="cnWhen" class="form-select" onchange="document.getElementById(\'cnWhenAt\').style.display=(this.value===\'now\'?\'none\':\'\')"><option value="now">فوراً</option><option value="schedule">مجدول...</option></select><input type="datetime-local" id="cnWhenAt" class="form-input" style="display:none;margin-top:6px;"></div></div>'+
'<div id="cnPreviewBox" class="filter-info" style="display:none;"></div>'+
'<button class="btn btn-primary w-full" onclick="window.sendCustomNotify()">📤 إرسال</button></div>','modal-md');
window.cnFillGroups(); window.cnTargetChange();
}catch(e){console.error(e);}
};
window.cnFillGroups=function(){
var q=((document.getElementById('cnGroupSearch')||{}).value||'').toLowerCase();
var sel=document.getElementById('cnGroup'); if(!sel) return;
var gs=window.cnScopedGroups().filter(function(g){
  var t=(DataService.getUserById?DataService.getUserById(g.teacherId):null);
  return !q||(g.name||'').toLowerCase().indexOf(q)>=0||((t&&t.name)||'').toLowerCase().indexOf(q)>=0||(g.center||'').toLowerCase().indexOf(q)>=0;
});
sel.innerHTML=gs.length?gs.map(function(g){ var t=(DataService.getUserById?DataService.getUserById(g.teacherId):null); return '<option value="'+g.id+'">'+g.name+' · 👨‍ '+(t?t.name:'-')+' · 🏢 '+(g.center||'-')+'</option>'; }).join(''):'<option value="">مفيش مجموعات في نطاقك</option>';
};
window.cnTargetChange=function(){
var t=(document.getElementById('cnTarget')||{}).value||'group';
window.__cnState.mode=t;
document.getElementById('cnGroupWrap').style.display=(t==='group'||t==='unpaid')?'':'none';
document.getElementById('cnGradeWrap').style.display=(t==='grade')?'':'none';
document.getElementById('cnStuWrap').style.display=(t==='student')?'':'none';
if(t==='grade'){
  var gs={}; (window.ScopedData&&ScopedData.students?ScopedData.students():(DataService.getStudents?DataService.getStudents():[])).forEach(function(s){ if(s.grade) gs[s.grade]=1; });
  var gsel=document.getElementById('cnGrade'); if(gsel) gsel.innerHTML=Object.keys(gs).sort().map(function(g){ return '<option value="'+g+'">'+g+'</option>'; }).join('')||'<option value="">مفيش صفوف</option>';
}
if(t==='student') window.cnRenderStu();
};
window.cnRenderStu=function(){
var st=window.__cnState;
var q=((document.getElementById('cnSearch')||{}).value||'').toLowerCase();
var gids={}; window.cnScopedGroups().forEach(function(g){ gids[g.id]=1; });
var u=cur(); var isAssist=u&&u.role==='assistant';
var list=(DataService.getStudents?DataService.getStudents():[]).filter(function(s){
  var inScope=!isAssist||(DataService.getStudentTeachers?DataService.getStudentTeachers(s.id):[]).some(function(tt){ return tt.group&&gids[tt.group.id]; });
  return inScope&&(!q||(s.name||'').toLowerCase().indexOf(q)>=0||(s.code||'').toLowerCase().indexOf(q)>=0||String(s.parentPhone||'').indexOf(q)>=0);
}).slice(0,300);
var box=document.getElementById('cnStuList'); if(!box) return;
box.innerHTML=list.length?list.map(function(s){
  return '<label style="display:flex;gap:8px;align-items:center;padding:6px;border-radius:8px;cursor:pointer;background:var(--surface-hover);margin-bottom:4px;"><input type="checkbox" class="cnStuChk" value="'+s.id+'" '+(st.sel[s.id]?'checked':'')+' onchange="window.cnToggleStu(\''+s.id+'\',this.checked)" style="width:16px;height:16px;"><span style="flex:1;font-size:13px;font-weight:700;">'+s.name+'</span><span class="text-xs text-muted">'+(s.code||'')+' · '+(s.grade||'')+'</span></label>';
}).join(''):'<p class="text-muted" style="text-align:center;padding:10px;">مفيش طلاب مطابقين</p>';
window.cnUpdateCount();
};
window.cnToggleStu=function(id,on){ var st=window.__cnState; if(on) st.sel[id]=1; else delete st.sel[id]; window.cnUpdateCount(); };
window.cnUpdateCount=function(){ var el=document.getElementById('cnSelCount'); if(el) el.textContent=Object.keys(window.__cnState.sel).length; };
window.cnPreview=function(){
var t=(document.getElementById('cnTitle')||{}).value||'', m=(document.getElementById('cnMessage')||{}).value||'';
var box=document.getElementById('cnPreviewBox'); if(!box) return;
if(!t&&!m){ box.style.display='none'; return; }
box.style.display='';
box.innerHTML='👁️ معاينة شكل الإشعار عند الطالب:<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px;margin-top:6px;"><strong style="font-size:13px;">🔔 '+(t||'(العنوان)')+'</strong><div style="font-size:12px;margin-top:4px;opacity:.9;">'+(m||'(الرسالة)')+'</div></div>';
};
window.cnCollectTargets=function(){
var st=window.__cnState, t=st.mode, d=db();
var students=(DataService.getStudents?DataService.getStudents():[]);
if(t==='all') return students.map(function(s){ return s.id; });
if(t==='grade'){ var gr=(document.getElementById('cnGrade')||{}).value; return students.filter(function(s){ return s.grade===gr; }).map(function(s){ return s.id; }); }
if(t==='student') return Object.keys(st.sel);
var gid=(document.getElementById('cnGroup')||{}).value; if(!gid) return [];
var out=[];
students.forEach(function(s){
  var en=(d.enrollments||[]).some(function(e){ return e.studentId===s.id&&e.groupId===gid&&e.status==='active'; });
  if(!en) return;
  if(t==='unpaid'){
    var g=gById(gid);
    var bad=false;
    if(window.BC&&BC.statusOf){ var sst=BC.statusOf(s.id,g); bad=(sst==='due'||sst==='overdue'); }
    else if(window.LedgerUI&&LedgerUI.paidForCycle&&LedgerUI.cyclesOf){ var cyc=LedgerUI.cyclesOf(g); var c0=cyc[cyc.length-1]; bad=c0&&((LedgerUI.paidForCycle(s.id,gid,c0.ck)||0)<(g.monthlyFee||0)); }
    if(!bad) return;
  }
  out.push(s.id);
});
return out;
};
window.sendCustomNotify=function(){
try{
var u=cur(); if(!u) return;
var title=(document.getElementById('cnTitle')||{}).value||'';
var msg=(document.getElementById('cnMessage')||{}).value||'';
var priority=(document.getElementById('cnPriority')||{}).value||'normal';
if(!title||!msg){ if(window.safeToast) window.safeToast('اكتب العنوان والرسالة','error'); return; }
var targets=window.cnCollectTargets();
if(!targets.length){ if(window.safeToast) window.safeToast('مفيش طلاب مطابقين للهدف المختار','error'); return; }
var sendAt=null;
if((document.getElementById('cnWhen')||{}).value==='schedule'){
  var v=(document.getElementById('cnWhenAt')||{}).value;
  if(!v){ if(window.safeToast) window.safeToast('حدد وقت الإرسال','error'); return; }
  sendAt=new Date(v).toISOString();
}
var d=db(); d.notifications=d.notifications||[]; d.scheduledNotifs=d.scheduledNotifs||[];
var count=0;
targets.forEach(function(sid){
  var n={id:'cn_'+Date.now()+'_'+count,targetUserId:sid,title:title,message:msg,type:'custom',priority:priority,pinned:priority==='urgent',createdAt:new Date().toISOString(),createdBy:u.id,createdByName:u.name};
  if(sendAt){ n.sendAt=sendAt; d.scheduledNotifs.push(n); try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('scheduledNotifs',n.id,n); }catch(e){} }
  else d.notifications.push(n);
  count++;
});
saveD(d);
if(!sendAt){ targets.slice(0,30).forEach(function(sid){ try{ if(window.FirebaseService&&FirebaseService._db){ var nn=d.notifications[d.notifications.length-1]; } }catch(e){} }); }
ThemeManager.closeModal();
if(window.safeToast) window.safeToast(sendAt?('⏰ اتجدول الإشعار لـ '+count+' طالب — هيترسل تلقائياً'):('📤 تم إرسال الإشعار لـ '+count+' طالب'),'success');
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
};
/* ========== تهيئة ========== */
/* 🛡️ أول دخول للمستخدم: كل الإشعارات القديمة تتعتبر مقروءة ومُطلقة — مفيش صوت ولا توست ولا عداد قديم */
function ensureBaseline(){
  try{
    var u=cur(); if(!u) return;
    var key='eduNotifyBase_'+u.id;
    if(localStorage.getItem(key)) return;
    localStorage.setItem(key,String(Date.now()));
    var nowIso=new Date().toISOString();
    localStorage.setItem('eduNotifyReadAt_'+u.id,nowIso);  /* العداد يبدأ من اللحظة دي */
    localStorage.setItem('eduNotifyFireAt',nowIso);        /* pollFire يتجاهل كل القديم */
    var ts=targets();
    (db().notifications||[]).forEach(function(n){ if(ts.indexOf(n.targetUserId)>=0){ fired[n.id]=Date.now(); } });
    persistFired();                                         /* لا صوت ولا إشعار ويندوز لأي قديم */
  }catch(e){}
}
function init(){
  injectCss(); hookAdd(); ensureBaseline();
  setTimeout(ensureBaseline,1200); setTimeout(ensureBaseline,2500);
  setTimeout(bell,200); setTimeout(bell,800); setTimeout(bell,2000);
  var __bellTries=0;
  var __bellInt=setInterval(function(){
    __bellTries++;
    if(document.getElementById('notifyBell')||__bellTries>20){ clearInterval(__bellInt); return; }
    bell();
  },1500);
  setTimeout(scanEvents,2500);
  setInterval(scanEvents,45000);
  setInterval(pollFire,30000);
  setTimeout(hookAdd,800); setTimeout(hookAdd,2000);
  injectPolicySection(); setTimeout(injectPolicySection,1000); setTimeout(injectPolicySection,2500);
  document.addEventListener('click',function once(){ ctx(); document.removeEventListener('click',once); });
  fixThemeIcon(); cleanBellNow();
  setInterval(function(){ fixThemeIcon(); cleanBellNow(); },2000);
  document.addEventListener('click',function(e){
    var t=e.target.closest?e.target.closest('#themeToggle'):null;
    if(t) setTimeout(fixThemeIcon,50);
  },true);
}
function cleanBellNow(){
  var b=document.getElementById('notifyBell');
  if(b) cleanBell(b);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
window.toggleKillAllNotifications=function(){
try{
var u=cur(); if(!u||(u.role!=='admin'&&u.role!=='super_admin')){ if(window.safeToast)window.safeToast('❌ للأدمن فقط','error'); return; }
var d=db(); d.platformMeta=d.platformMeta||{};
d.platformMeta.killAllNotifications=!d.platformMeta.killAllNotifications;
saveD(d);
try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('platformMeta','meta',d.platformMeta); }catch(e){}
if(window.safeToast)window.safeToast(d.platformMeta.killAllNotifications?'🔕 تم إيقاف كل الإشعارات':'🔔 تم تفعيل الإشعارات',d.platformMeta.killAllNotifications?'warning':'success');
}catch(e){}
};
window.nukeAllNotifications=function(){
try{
var u=cur(); if(!u||(u.role!=='admin'&&u.role!=='super_admin')){ if(window.safeToast)window.safeToast('❌ للأدمن فقط','error'); return; }
if(!confirm('⚠️ هيمسح كل إشعارات كل المستخدمين — متابعة؟')) return;
var d=db(); var total=(d.notifications||[]).length;
d.notifications=[]; d.notifyEmitted={}; d.warn7={}; d.due8={};
saveD(d);
Object.keys(localStorage).forEach(function(k){ if(k.indexOf('eduNotifyReadAt_')===0||k.indexOf('eduNotifyFired')===0) localStorage.removeItem(k); });
try{ localStorage.setItem('eduNotifyFired','{}'); }catch(e){}
if(window.safeToast)window.safeToast('🗑 تم مسح '+total+' إشعار','success');
}catch(e){}
};
})();