/* ================================================================
📲 PWA Injector V2 — زر عائم أول مرة + بند دائم في الإعدادات
• الزر العائم بيظهر من نفسه (مش مستني beforeinstallprompt)
• لو المستخدم قفله → بيروح يظهر في الإعدادات باسم "📲 تحميل التطبيق"
• لو المتصفح بيدعم الحوار الرسمي بنستخدمه، غير كده شرح يدوي حسب الجهاز
• بيكتشف التثبيت الفعلي ويخفي كل حاجة تلقائياً
================================================================ */
(function(){
"use strict";

var deferred=null;
/* نخطف الحدث الرسمي أول ما ييجي — من غير تأخير */
window.addEventListener('beforeinstallprompt',function(e){ try{ e.preventDefault(); deferred=e; }catch(err){} });
window.addEventListener('appinstalled',function(){
  try{ localStorage.setItem('pwaInstalled','1'); localStorage.removeItem('pwaFabDismissed'); }catch(e){}
  hideFab(); refreshSettingsCard();
  toastMsg('✅ تم تثبيت التطبيق بنجاح — هتلاقي أيقونته على جهازك','success');
});

function toastMsg(m,t){ try{ if(window.safeToast) window.safeToast(m,t||'info'); }catch(e){} }
function isStandalone(){ try{ return (window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true; }catch(e){ return false; } }
function isInstalled(){ try{ return localStorage.getItem('pwaInstalled')==='1'||isStandalone(); }catch(e){ return isStandalone(); } }
function dismissed(){ try{ return localStorage.getItem('pwaFabDismissed')==='1'; }catch(e){ return false; } }
function brand(){ try{ return (window.DataService&&DataService.getBranding)?(DataService.getBranding()||{}):{}; }catch(e){ return {}; } }
function logoUrl(){ var b=brand(); if(b.logoUrl&&window.driveThumb) return window.driveThumb(b.logoUrl); if(b.logo) return b.logo; return 'icon-192.png'; }

/* ========== مانيفست + ميتا (تجهيز المنصة للتثبيت) ========== */
function ensureManifest(){
  try{
    if(document.querySelector('link[rel="manifest"]')) return;
    var b=brand(), url=logoUrl();
    var man={name:b.name||document.title||'EduFlow',short_name:(b.shortName||b.name||'EduFlow').slice(0,12),description:'منصة إدارة المراكز التعليمية',start_url:location.pathname,scope:'./',display:'standalone',orientation:'portrait',background_color:'#0a0f1e',theme_color:'#6366f1',lang:'ar',dir:'rtl',
      icons:[{src:url,sizes:'192x192',type:'image/png',purpose:'any'},{src:url,sizes:'512x512',type:'image/png',purpose:'any'},{src:url,sizes:'192x192',type:'image/png',purpose:'maskable'},{src:url,sizes:'512x512',type:'image/png',purpose:'maskable'}]};
    var blob=new Blob([JSON.stringify(man)],{type:'application/manifest+json'});
    var l=document.createElement('link'); l.rel='manifest'; l.href=URL.createObjectURL(blob); document.head.appendChild(l);
  }catch(e){}
}
function ensureMeta(){
  try{
    var url=logoUrl();
    var metas=[['theme-color','#6366f1'],['apple-mobile-web-app-capable','yes'],['mobile-web-app-capable','yes'],['apple-mobile-web-app-status-bar-style','black-translucent'],['apple-mobile-web-app-title',(brand().name||'EduFlow')]];
    metas.forEach(function(m){ var el=document.querySelector('meta[name="'+m[0]+'"]'); if(!el){ el=document.createElement('meta'); el.name=m[0]; document.head.appendChild(el); } el.content=m[1]; });
    var ai=document.querySelector('link[rel="apple-touch-icon"]'); if(!ai){ ai=document.createElement('link'); ai.rel='apple-touch-icon'; document.head.appendChild(ai); } ai.href=url;
    var ic=document.querySelector('link[rel="icon"]'); if(!ic){ ic=document.createElement('link'); ic.rel='icon'; document.head.appendChild(ic); } ic.href=url;
  }catch(e){}
}
function ensureSw(){ try{ if('serviceWorker' in navigator&&!navigator.serviceWorker.controller){ navigator.serviceWorker.register('sw.js').catch(function(){}); } }catch(e){} }

/* ========== التثبيت: حوار رسمي لو متاح، غير كده شرح يدوي ========== */
window.pwaInstall=function(){
  if(deferred){
    try{
      deferred.prompt();
      deferred.userChoice.then(function(c){ if(c&&c.outcome==='accepted'){ hideFab(); } deferred=null; });
      return;
    }catch(e){}
  }
  openGuideModal();
};
function openGuideModal(){
  var ua=navigator.userAgent;
  var isIOS=/iPad|iPhone|iPod/.test(ua)&&!window.MSStream;
  var isAndroid=/Android/.test(ua);
  var steps;
  if(isIOS) steps='1) افتح المنصة في <b>سفاري</b>.<br>2) دوس زر المشاركة <b>⬆️</b> من الشريط تحت.<br>3) اختار <b>"إضافة إلى الشاشة الرئيسية"</b>.<br>4) دوس <b>إضافة</b> — خلاص التطبيق اتثبت.';
  else if(isAndroid) steps='1) افتح المنصة في <b>كروم</b>.<br>2) من القائمة <b>⋮</b> فوق اختار <b>"تثبيت التطبيق"</b> أو <b>"إضافة إلى الشاشة الرئيسية"</b>.<br>3) أكّد التثبيت — الأيقونة هتظهر مع تطبيقاتك.';
  else steps='1) في شريط العنوان هتلاقي أيقونة تثبيت <b>⊕</b> جنب الرابط، أو من القائمة <b>⋮</b>.<br>2) اختار <b>"تثبيت التطبيق… (Install app)"</b>.<br>3) أكّد — هتلاقي أيقونة المنصة على سطح المكتب.';
  var html='<div class="modal-header"><h3 class="modal-title">📲 تحميل التطبيق</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>'+
  '<div class="modal-body"><div class="filter-info">💡 التطبيق بيفتح بشاشة كاملة زي أي تطبيق عادي، وأسرع في الاستخدام، وأيقونته بتفضل على جهازك.</div>'+
  '<div style="line-height:2.1;font-size:14px;margin:12px 0;">'+steps+'</div>'+
  '<button class="btn btn-primary w-full" onclick="ThemeManager.closeModal()">تمام 👍</button></div>';
  if(typeof ThemeManager!=='undefined'&&ThemeManager.openModal) ThemeManager.openModal(html,'modal-sm');
  else alert(steps.replace(/<[^>]+>/g,''));
}

/* ========== 🎈 الزر العائم (أول مرة) ========== */
function showFab(){
  if(isInstalled()||dismissed()||document.getElementById('pwaFab')) return;
  var w=document.createElement('div'); w.id='pwaFab';
  w.style.cssText='position:fixed;bottom:78px;inset-inline-start:16px;z-index:9997;display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:999px;padding:10px 16px;box-shadow:0 10px 30px rgba(99,102,241,.5);font-weight:800;font-size:13px;cursor:pointer;animation:pwaFabIn .35s ease;';
  w.innerHTML='<span style="font-size:18px;">📲</span><span>ثبّت التطبيق</span><button type="button" id="pwaFabClose" title="لاحقاً" style="background:rgba(255,255,255,.22);border:none;color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1;margin-inline-start:2px;">✕</button>';
  document.body.appendChild(w);
  w.onclick=function(){ window.pwaInstall(); };
  w.querySelector('#pwaFabClose').onclick=function(ev){
    ev.stopPropagation();
    try{ localStorage.setItem('pwaFabDismissed','1'); }catch(e){}
    hideFab(); injectSettingsCard();
    toastMsg('📲 تقدر تثبّت في أي وقت من: الإعدادات ← تحميل التطبيق','info');
  };
}
function hideFab(){ var w=document.getElementById('pwaFab'); if(w) w.remove(); }

/* ========== ️ بند دائم في الإعدادات باسم "تحميل التطبيق" ========== */
function buildSettingsCard(){
  var c=document.createElement('div'); c.id='pwaSettingsCard'; c.className='card';
  c.style.cssText='margin:0 0 14px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;';
  c.innerHTML='<div style="flex:1;min-width:220px;"><strong style="font-size:14px;">📲 تحميل التطبيق</strong>'+
    '<div class="text-xs text-muted" style="margin-top:3px;">ثبّت المنصة على جهازك — تفتح بشاشة كاملة وأسرع من المتصفح</div></div>'+
    (isInstalled()?'<span class="badge badge-success">✅ مثبّت بالفعل</span>':'<button class="btn btn-primary btn-sm" onclick="window.pwaInstall()">📲 تثبيت الآن</button>');
  return c;
}
function injectSettingsCard(){
  try{
    var sec=document.getElementById('section-settings'); if(!sec) return;
    if(document.getElementById('pwaSettingsCard')){ refreshSettingsCard(); return; }
    var card=buildSettingsCard();
    var hdr=sec.querySelector('.section-header');
    if(hdr&&hdr.nextSibling) sec.insertBefore(card,hdr.nextSibling); else sec.appendChild(card);
  }catch(e){}
}
function refreshSettingsCard(){
  try{
    var old=document.getElementById('pwaSettingsCard'); if(old) old.remove();
    var sec=document.getElementById('section-settings');
    if(sec&&sec.classList.contains('active')) injectSettingsCard();
  }catch(e){}
}

/* ========== CSS الأنيميشن ========== */
if(!document.getElementById('pwaFabCss')){
  var st=document.createElement('style'); st.id='pwaFabCss';
  st.textContent='@keyframes pwaFabIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(st);
}

/* ========== دورة حياة ========== */
function tick(){
  try{
    if(isInstalled()){ hideFab(); }
    else{
      showFab();                                   /* يظهر لو لسه متقفش */
      var sec=document.getElementById('section-settings');
      if(sec&&sec.classList.contains('active')&&!document.getElementById('pwaSettingsCard')) injectSettingsCard();
    }
  }catch(e){}
}
function init(){
  ensureManifest(); ensureMeta(); ensureSw();
  setTimeout(showFab,2500);
  setTimeout(injectSettingsCard,3000);
  setInterval(tick,4000);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ setTimeout(init,600); });
else setTimeout(init,600);
})();