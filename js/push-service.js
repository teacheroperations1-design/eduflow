/* ================================================================
📲 PushService — إشعارات الهاتف عبر FCM (توصل والتطبيق مقفول)
================================================================ */
(function(){
"use strict";
var VAPID='الصق_هنا_الـ_VAPID_PUBLIC_KEY';   /* مثال شكله: BEl62iUYgUv7F... (سطر واحد طويل) */
function toast(m,t){ try{ if(window.safeToast) window.safeToast(m,t||'info'); else if(typeof ThemeManager!=='undefined'&&ThemeManager.toast) ThemeManager.toast(m,t||'info'); }catch(e){} }
function supported(){ return ('Notification' in window)&&('serviceWorker' in navigator)&&window.firebase&&firebase.messaging; }
function me(){ try{ return (window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null; }catch(e){ return null; } }
function pageFor(role){ return {student:'student-dashboard.html',teacher:'teacher-dashboard.html',assistant:'assistant-dashboard.html',admin:'admin-dashboard.html',super_admin:'admin-dashboard.html',parent:'parent-dashboard.html'}[role]||'index.html'; }
function hash(s){ var h=0; for(var i=0;i<String(s).length;i++){ h=(h*31+s.charCodeAt(i))|0; } return Math.abs(h).toString(36); }
function vapidOk(){ try{ return !!VAPID && VAPID.indexOf('حط_هنا')===-1 && VAPID.length>60; }catch(e){ return false; } }
async function getToken(){
  if(!vapidOk()){ throw new Error('حط الـ VAPID key في أول js/push-service.js (Firebase Console → Project settings → Cloud Messaging → Web Push certificates)'); }
  /* Firebase هيسجل firebase-messaging-sw.js من جذر الموقع تلقائياً */
  var m=firebase.messaging();
  return await m.getToken({vapidKey:VAPID});
}
async function saveToken(t){
  var u=me(); if(!u||!t) return;
  var doc={userId:u.id,role:u.role||'',token:t,page:pageFor(u.role),ua:String(navigator.userAgent).slice(0,90),updatedAt:new Date().toISOString()};
  var docId=u.id+'_'+hash(t);
  try{ if(window.FirebaseService&&FirebaseService._db) await FirebaseService._db.collection('pushTokens').doc(docId).set(doc,{merge:true}); }catch(e){ console.warn('pushTokens save',e); }
  try{ var d=DataService._getData(); d.pushTokens=d.pushTokens||[]; var i=-1; for(var k=0;k<d.pushTokens.length;k++){ if(d.pushTokens[k].token===t){ i=k; break; } } if(i>=0) d.pushTokens[i]=Object.assign({id:docId},doc); else d.pushTokens.push(Object.assign({id:docId},doc)); DataService._saveData(d); }catch(e){}
}
async function dropToken(t){
  var u=me(); if(!u||!t) return;
  try{ if(window.FirebaseService&&FirebaseService._db) await FirebaseService._db.collection('pushTokens').doc(u.id+'_'+hash(t)).delete(); }catch(e){}
}
function foreground(){
  if(window.__pushFg) return; window.__pushFg=1;
  try{
    firebase.messaging().onMessage(function(p){
      var n=p.notification||{}, d=p.data||{};
      var title=n.title||d.title||'🔔 إشعار جديد';
      var body=n.body||d.body||'';
      toast(title+' — '+body,'info');
      try{ if(window.renderFloatNotifs) window.renderFloatNotifs(); }catch(e){}
      try{ if(Notification.permission==='granted') new Notification(title,{body:body,icon:'/icon-192.png'}); }catch(e){}
    });
  }catch(e){}
}
function promptCard(){
  if(document.getElementById('pushPromptCard')) return;
  if(localStorage.getItem('pushPromptDismissed')==='1') return;
  if(!me()) return;
  var c=document.createElement('div'); c.id='pushPromptCard';
  c.style.cssText='position:fixed;bottom:16px;inset-inline-start:16px;z-index:4500;max-width:330px;background:var(--surface,#1e293b);border:1px solid rgba(99,102,241,.5);border-radius:16px;padding:14px;box-shadow:0 12px 32px rgba(0,0,0,.35);color:var(--text,#fff);';
  c.innerHTML='<div style="display:flex;gap:10px;align-items:flex-start;"><span style="font-size:26px;">🔔</span><div style="flex:1;"><strong style="font-size:13px;">فعّل إشعارات الهاتف</strong><div style="font-size:11px;opacity:.75;margin:4px 0 8px;">التنبيهات هتوصلك على هاتفك حتى لو المنصة مقفولة — واضغط عليها تفتحلك المكان بالظبط.</div><div style="display:flex;gap:6px;"><button class="btn btn-primary btn-sm" id="pushEnableBtn">✅ تفعيل</button><button class="btn btn-ghost btn-sm" id="pushDismissBtn">لاحقاً</button></div></div></div>';
  document.body.appendChild(c);
  c.querySelector('#pushEnableBtn').onclick=async function(){ var ok=await window.PushService.enable(); if(ok) c.remove(); };
  c.querySelector('#pushDismissBtn').onclick=function(){ localStorage.setItem('pushPromptDismissed','1'); c.remove(); };
}
window.PushService={
  supported:supported,
  async enable(){
    if(!supported()){ toast('❌ المتصفح ده مش داعم إشعارات الويب','error'); return false; }
    var perm=Notification.permission;
    if(perm==='default') perm=await Notification.requestPermission();
    if(perm!=='granted'){ toast('⚠️ افتح إعدادات المتصفح واسمح بالإشعارات الأول','warning'); return false; }
    try{
      var t=await getToken();
      if(!t){ toast('❌ مأخدش توكين — اتأكد إنك حطيت VAPID key','error'); return false; }
      await saveToken(t);
      localStorage.setItem('pushEnabled','1'); localStorage.removeItem('pushPromptDismissed');
      foreground(); hidePrompt();
      toast('✅ إشعارات الهاتف اتفعت — هتوصلك حتى والتطبيق مقفول','success');
      return true;
    }catch(e){
      console.error(e);
      var msg=(e&&e.message)||'خطأ غير معروف';
      if(e&&e.code==='messaging/failed-service-worker-registration') msg='ملف firebase-messaging-sw.js مش موجود على السيرفر — ارفعه في جذر الموقع واعمل Deploy';
      else if(e&&e.code==='messaging/unsupported-browser') msg='المتصفح ده مش داعم إشعارات الويب';
      else if(e&&e.code==='messaging/permission-blocked') msg='الإشعارات متقفلة من إعدادات المتصفح/النظام';
      toast('❌ '+msg,'error');
      return false;
    }
  },
  async disable(){
    try{ var t=await getToken(); await dropToken(t); localStorage.removeItem('pushEnabled'); toast('🔕 اتوقفت إشعارات الهاتف','info'); }catch(e){}
  },
  async autoInit(){
    if(!supported()) return;
    if(Notification.permission!=='granted'){ promptCard(); return; }
    try{
      var t=await getToken();
      if(t){ await saveToken(t); foreground(); hidePrompt(); }
      else promptCard();
    }catch(e){ promptCard(); }
  }
};
function hidePrompt(){ var c=document.getElementById('pushPromptCard'); if(c) c.remove(); }
function tryAuto(){ if(!me()){ setTimeout(tryAuto,1500); return; } window.PushService.autoInit(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ setTimeout(tryAuto,1200); });
else setTimeout(tryAuto,1200);
})();