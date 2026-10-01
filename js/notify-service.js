/* ================================================================
🔔 Notify Service V3 — سياسة إشعارات لكل دور + تفضيلات لكل مستخدم
• مصفوفة تحكم للأدمن (حدث × دور) بتتحقن تلقائياً في لوحة الأدمن
• كل مستخدم يقفل اللي مش عاوزه من الأحداث المسموحة لدوره
• صوت مميز لكل فئة + إشعار متصفح + اهتزاز + عدّاد غير مقروء
• سكانر أحداث المنصة كل 20 ثانية (واجب/امتحان/فيديو/بوست/مادة/تحدي/موعد/غياب)
================================================================ */
(function(){
"use strict";
var ROLES=[{k:'student',l:'🎓 طالب'},{k:'parent',l:'👨‍👩‍👦 ولي أمر'},{k:'teacher',l:'👨‍🏫 أستاذ'},{k:'assistant',l:'🧑💼 مساعد'},{k:'admin',l:'🛡️ أدمن'}];
var EVENTS=[
{k:'hw_new',c:'grades',i:'📝',l:'واجب جديد',r:['student','parent']},
{k:'exam_new',c:'grades',i:'🎓',l:'امتحان جديد',r:['student','parent']},
{k:'points',c:'points',i:'🏆',l:'نقاط / تسميع / تفاعل / سلسلة',r:['student','parent']},
{k:'praise',c:'points',i:'🌟',l:'ثناء وإشادة',r:['student','parent']},
{k:'absent',c:'attendance',i:'❌',l:'تسجيل غياب',r:['student','parent']},
{k:'late',c:'attendance',i:'⏰',l:'تسجيل تأخر',r:['student','parent']},
{k:'session_cancel',c:'schedule',i:'🚫',l:'إلغاء حصة / تعويض',r:['student','parent','assistant']},
{k:'schedule_change',c:'schedule',i:'🗓️',l:'تعديل موعد حصة',r:['student','parent','teacher','assistant']},
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
  // 1. افتراضي: كل الأحداث مقفولة لكل الأدوار
  ROLES.forEach(function(r){
    base[r.k]={};
    EVENTS.forEach(function(e){ base[r.k][e.k]=false; });
  });

  // 2. تفعيل الأحداث الخاصة بكل دور فقط (القائمة البيضاء)
  
  // 🎓 الطالب: كل الأحداث الأكاديمية والمحتوى
  var studentEvents=['hw_new','exam_new','points','praise','absent','late','session_cancel','schedule_change','video_new','post_new','material_new','challenge_new','general'];
  studentEvents.forEach(function(k){ base.student[k]=true; });

  // 👨‍👩‍👦 ولي الأمر: نفس أحداث الطالب + أحداث الدفعات والشهرية
  studentEvents.forEach(function(k){ base.parent[k]=true; });
  ['due_warn','due_now','payment_received'].forEach(function(k){ base.parent[k]=true; });

  // 👨‍🏫 الأستاذ: المواعيد، الإلغاءات، والرسائل العامة
  ['schedule_change','session_cancel','general'].forEach(function(k){ base.teacher[k]=true; });

  // 🧑💼 المساعد: الدفتر، الدفعات، المواعيد، والرسائل العامة
  ['ledger_act','payment_received','schedule_change','general'].forEach(function(k){ base.assistant[k]=true; });

  // 🛡️ الأدمن: الدفتر، الدفعات، المواعيد، والرسائل العامة (ويمكنه تعديل أي شيء من المصفوفة)
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

/* ========== تصنيف الإشعار لحدث ========== */
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
var fired={};
function iconUrl(){ try{ var b=(window.DataService&&DataService.getBranding)?DataService.getBranding():{}; if(b.logoUrl&&window.driveThumb) return window.driveThumb(b.logoUrl); if(b.logo) return b.logo; }catch(e){} return ''; }
function fire(n){
if(!n) return;
var u=cur(); if(!u) return;
var ev=eventOf(n);
/* 🔄 الأحداث المتكررة: ليها TTL بدل ما تتحظر نهائي */
var repeatableTTL={
  'due_warn':24*3600*1000,  /* كل 24 ساعة */
  'due_now':6*3600*1000,     /* كل 6 ساعات */
  'absent':12*3600*1000,     /* كل 12 ساعة */
  'late':12*3600*1000        /* كل 12 ساعة */
};
var fid=n.id||('x'+Date.now());
if(fired[fid]){
  var ttl=repeatableTTL[ev]||0;
  if(!ttl) return; /* مش متكرر → اخرج */
  var lastFire=+fired[fid];
  if(Date.now()-lastFire<ttl) return; /* لسه في فترة التهدئة */
}
fired[fid]=Date.now();
var ev=eventOf(n);
if(!allowedForRole(ev,u.role)) return;
var p=getPrefs();
if(p.events&&p.events[ev]===false) return;
if(inQuiet(p)) return;
if(p.sound) playSound(catOfEvent(ev));
try{ if(navigator.vibrate) navigator.vibrate([220,110,220]); }catch(e){}
if(p.browser&&('Notification' in window)&&Notification.permission==='granted'){
try{
var nf=new Notification(n.title||'EduFlow',{body:n.message||'',icon:iconUrl()||undefined,tag:n.id||('n'+Date.now()),dir:'rtl',lang:'ar'});
nf.onclick=function(){ try{ window.focus(); nf.close(); }catch(e){} };
setTimeout(function(){ try{ nf.close(); }catch(e){} },15000);
}catch(e){}
}
bumpBadge();
}
function hookAdd(){
if(!window.DataService||typeof DataService.addNotification!=='function'||DataService.__notifyHooked) return;
DataService.__notifyHooked=true;
var orig=DataService.addNotification.bind(DataService);
DataService.addNotification=function(n){
var r=orig(n);
try{ if(n&&targets().indexOf(n.targetUserId)>=0) fire(n); }catch(e){}
return r;
};
}

/* ========== سكانر أحداث المنصة ========== */
function studentsOfGroup(gid){
var out=[],ids={},d=db();
(d.enrollments||[]).forEach(function(e){ if(e.groupId===gid&&e.status==='active'&&!ids[e.studentId]){ ids[e.studentId]=1; out.push(e.studentId); } });
if(!out.length&&DataService.getStudentsByGroup){ (DataService.getStudentsByGroup(gid)||[]).forEach(function(s){ out.push(s.id); }); }
return out;
}
function gById(gid){ return (DataService.getGroups?DataService.getGroups():[]).find(function(g){return g.id===gid;}); }
function scanEvents(){
try{
var d=db(); d.notifyEmitted=d.notifyEmitted||{};
if(Object.keys(d.notifyEmitted).length>3000) d.notifyEmitted={};
var last=+localStorage.getItem('eduNotifyScanAt')||0;
var now=Date.now();
var emits=[];
function isNew(x){ if(!x||!x.id) return false; if(d.notifyEmitted[x.id]) return false; var ct=Date.parse(x.createdAt||x.addedAt||x.at||'')||0; return ct>last&&ct<=now+5000; }
function mark(x){ d.notifyEmitted[x.id]=1; }
function push(sid,ev,title,msg,extra){ var n={targetUserId:sid,type:extra&&extra.type||'general',title:title,message:msg,meta:{event:ev}}; if(extra&&extra.kind) n.meta.kind=extra.kind; emits.push(n); }
(d.homework||[]).forEach(function(h){ if(isNew(h)){ mark(h); studentsOfGroup(h.groupId).forEach(function(sid){ push(sid,'hw_new','📝 واجب جديد: '+h.title,'المجموعة: '+((gById(h.groupId)||{}).name||'-')+' · التسليم: '+(h.deadline||'-'),{type:'grade'}); }); } });
(d.exams||[]).forEach(function(x){ if(isNew(x)){ mark(x); studentsOfGroup(x.groupId).forEach(function(sid){ push(sid,'exam_new','🎓 امتحان جديد: '+x.title,'المجموعة: '+((gById(x.groupId)||{}).name||'-'),{type:'grade'}); }); } });
(d.videos||[]).forEach(function(v){ if(isNew(v)){ mark(v); (v.targetType==='group'?studentsOfGroup(v.targetValue):[]).forEach(function(sid){ push(sid,'video_new','🎬 فيديو جديد',v.title||'',{type:'general'}); }); } });
(d.classPosts||[]).forEach(function(cp){ if(isNew(cp)){ mark(cp); studentsOfGroup(cp.groupId).forEach(function(sid){ push(sid,'post_new','📰 بوست حصة جديد',(cp.title||'')+' — '+((gById(cp.groupId)||{}).name||''),{type:'general'}); }); } });
(d.interactiveMaterials||[]).forEach(function(m){ if(isNew(m)){ mark(m); studentsOfGroup(m.groupId).forEach(function(sid){ push(sid,'material_new','🧩 مادة تفاعلية جديدة',m.title||'',{type:'general'}); }); } });
(d.challenges||[]).forEach(function(ch){ if(isNew(ch)){ mark(ch); (DataService.getStudents?DataService.getStudents():[]).slice(0,200).forEach(function(s){ push(s.id,'challenge_new','🏆 تحدي جديد: '+ch.title,'جائزة: '+(ch.basePoints||0)+' نقطة',{type:'general'}); }); } });
(d.scheduleChangeLog||[]).forEach(function(l){ if(isNew(l)){ mark(l); var g=gById(l.groupId);
if(g&&g.teacherId) push(g.teacherId,'schedule_change','🗓️ تعديل موعد مجموعة',(l.groupName||'')+': '+(l.oldDay||'')+' '+(l.oldTime||'')+' → '+(l.newDay||'')+' '+(l.newTime||''),{kind:'schedule_change'});
studentsOfGroup(l.groupId).forEach(function(sid){ push(sid,'schedule_change','🗓️ موعد حصة اتغير',(l.groupName||'')+' بقى '+(l.newDay||'')+' '+(l.newTime||''),{kind:'schedule_change'}); }); } });
(d.cancelledSessions||[]).forEach(function(c){ if(isNew(c)){ mark(c); studentsOfGroup(c.groupId).forEach(function(sid){ push(sid,'session_cancel','🚫 حصة اتلغت',(c.reason||'')+' — '+(gById(c.groupId)||{}).name||'',{type:'general'}); }); } });
(d.attendance||[]).forEach(function(a){ if(isNew(a)&&a.status==='approved'){ mark(a); (a.records||[]).forEach(function(r){ if(r.status==='absent') push(r.studentId,'absent','❌ تسجيل غياب','حصة '+(a.groupName||'')+' — '+(a.date||''),{type:'attendance'}); else if(r.status==='late') push(r.studentId,'late','⏰ تسجيل تأخر','حصة '+(a.groupName||'')+' — '+(a.date||''),{type:'attendance'}); }); } });
/* 🔄 إعادة إطلاق due_warn و due_now بشكل دوري (للطالب وولي الأمر) */
try{
  var groups=(DataService.getGroups?DataService.getGroups():[]);
  var curMonth=new Date().toISOString().slice(0,7);
  groups.forEach(function(g){
    var fee=g.monthlyFee||0; if(!fee) return;
    var ses=LU?LU.groupSessions: null;
    if(!ses) return;
    /* عداد الحصص — نفس منطق دفتر التحصيل */
    var att=(DataService.getAttendance?DataService.getAttendance():[]).filter(a=>a.groupId===g.id&&a.status==='approved'&&(a.date||'').startsWith(curMonth));
    var done=att.length;
    var req=(g.sessionsPerMonth)||(window.EduFlowConfig?.billing?.sessionsBeforePayment)||8;
    studentsOfGroup(g.id).forEach(function(sid){
      /* 7/8 متكرر كل 24 ساعة */
      if(done===req-1){
        var lastKey='scan78_'+g.id+'_'+curMonth+'_'+sid;
        var last=+(d.notifyEmitted[lastKey]||0);
        if(now-last>24*3600*1000){
          d.notifyEmitted[lastKey]=now;
          emits.push({targetUserId:sid,type:'payment',title:'🔔 الحصة الجايه الدفع',message:'مجموعة '+g.name+' — باقي حصة واحدة ('+done+'/'+req+') على الشهرية ('+fee+' ج.م)',meta:{event:'due_warn'}});
        }
      }
      /* 8/8 متكرر كل 6 ساعات لو مش مسدد */
      if(done>=req){
        var p=(d.payments||[]).find(function(x){return x.studentId===sid&&x.groupId===g.id&&(x.month||'')===curMonth;});
        var paid=p?((p.paidAmount)||0):0;
        if(paid<fee){
          var lastKey2='scan88_'+g.id+'_'+curMonth+'_'+sid;
          var last2=+(d.notifyEmitted[lastKey2]||0);
          if(now-last2>6*3600*1000){
            d.notifyEmitted[lastKey2]=now;
            emits.push({targetUserId:sid,type:'payment',title:'💰 الشهرية مستحقة الآن',message:'مجموعة '+g.name+' — الشهرية '+fee+' ج.م (متبقي '+(fee-paid)+' ج.م)',meta:{event:'due_now'}});
          }
        }
      }
    });
  });
}catch(e){}
if(emits.length){ saveD(d); emits.slice(0,50).forEach(function(n){ try{ DataService.addNotification(n); }catch(e){} }); }
localStorage.setItem('eduNotifyScanAt',String(now));
}catch(e){}
}
function pollFire(){
try{
var ts=targets(); if(!ts.length) return;
var last=localStorage.getItem('eduNotifyFireAt')||'1970-01-01';
var list=(db().notifications||[]).filter(function(x){ return ts.indexOf(x.targetUserId)>=0&&(x.createdAt||'')>last; });
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
if(locked) return; // ✨ إخفاء تام — المستخدم ما يشوفش الحاجات المقفولة لدوره
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
function close(){ var o=document.getElementById('nsOverlay'); if(o) o.remove(); try{ var uu=cur(); if(uu) localStorage.setItem('eduNotifyReadAt_'+uu.id,new Date().toISOString()); }catch(e){} bumpBadge(); }
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
      existing.onclick=function(e){ e&&e.stopPropagation&&e.stopPropagation(); ctx(); openSettings(); };
      existing.style.position='relative';
    }
    cleanBell(existing);
    bumpBadge();
    if(!existing.__badgeInt){ existing.__badgeInt=setInterval(bumpBadge,15000); }
    return true;
  }
  /* مفيش زرار؟ اعمله وركّبه جنب زرار الثيم تلقائياً */
  var b=document.createElement('button'); b.id='notifyBell'; b.type='button'; b.title='الإشعارات';
  b.style.cssText='position:relative;border:1px solid var(--border);background:var(--surface-hover);border-radius:12px;width:42px;height:42px;font-size:19px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;margin-inline-end:6px;';
  b.innerHTML='🔔';
  b.onclick=function(e){ e&&e.stopPropagation&&e.stopPropagation(); ctx(); openSettings(); };
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

/* ========== 🛡️ صفحة سياسة الأدمن (حقن تلقائي) ========== */
function injectPolicySection(){
try{
var u=cur(); if(!u||(u.role!=='admin'&&u.role!=='super_admin')) return;
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

/* ========== تهيئة ========== */
function init(){
  injectCss(); hookAdd();
  setTimeout(bell,200); setTimeout(bell,800); setTimeout(bell,2000);
  setTimeout(scanEvents,2500);
  setInterval(scanEvents,20000);
  setInterval(pollFire,15000);
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
})();