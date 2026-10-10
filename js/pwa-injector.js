/* ================================================================
📲 PWA Injector — تحويل الموقع لتطبيق قابل للتثبيت
• يحط manifest.json ديناميكياً
• يحط meta tags للـ PWA
• يحط أيقونات من branding
• يحط "Add to Home Screen" prompt
================================================================ */
(function(){
"use strict";

function getBranding(){
  try{
    var b=(window.DataService&&DataService.getBranding)?DataService.getBranding():{};
    return b||{};
  }catch(e){ return {}; }
}

function driveThumb(url){
  try{
    if(!url) return '';
    var u=String(url);
    var m=u.match(/\/d\/([\w-]+)/)||u.match(/[?&]id=([\w-]+)/)||u.match(/^([\w-]{20,})$/);
    return m?('https://drive.google.com/thumbnail?id='+m[1]+'&sz=w200'):u;
  }catch(e){ return url||''; }
}

function injectManifest(){
  var b=getBranding();
  var name=b.name||'EduFlow';
  var shortName=b.shortName||name.slice(0,12);
  var logoUrl=b.logoUrl?driveThumb(b.logoUrl):(b.logo||'/icon-192.png');
  
  var manifest={
    name:name,
    short_name:shortName,
    description:'منصة إدارة المراكز التعليمية',
    start_url:location.pathname,
    display:'standalone',
    background_color:'#0a0f1e',
    theme_color:'#6366f1',
    orientation:'portrait',
    icons:[
      {src:logoUrl,sizes:'192x192',type:'image/png',purpose:'any'},
      {src:logoUrl,sizes:'512x512',type:'image/png',purpose:'any'},
      {src:logoUrl,sizes:'192x192',type:'image/png',purpose:'maskable'},
      {src:logoUrl,sizes:'512x512',type:'image/png',purpose:'maskable'}
    ]
  };
  
  var blob=new Blob([JSON.stringify(manifest)],{type:'application/manifest+json'});
  var murl=URL.createObjectURL(blob);
  
  var link=document.querySelector('link[rel="manifest"]');
  if(!link){
    link=document.createElement('link');
    link.rel='manifest';
    document.head.appendChild(link);
  }
  link.href=murl;
}

function injectMetaTags(){
  var b=getBranding();
  var logoUrl=b.logoUrl?driveThumb(b.logoUrl):(b.logo||'/icon-192.png');
  
  /* Apple Touch Icon */
  var apple=document.querySelector('link[rel="apple-touch-icon"]');
  if(!apple){
    apple=document.createElement('link');
    apple.rel='apple-touch-icon';
    document.head.appendChild(apple);
  }
  apple.href=logoUrl;
  
  /* Favicon */
  var icon=document.querySelector('link[rel="icon"]');
  if(!icon){
    icon=document.createElement('link');
    icon.rel='icon';
    document.head.appendChild(icon);
  }
  icon.href=logoUrl;
  
  /* Meta tags */
  var metas=[
    {name:'apple-mobile-web-app-capable',content:'yes'},
    {name:'apple-mobile-web-app-status-bar-style',content:'black-translucent'},
    {name:'apple-mobile-web-app-title',content:b.name||'EduFlow'},
    {name:'mobile-web-app-capable',content:'yes'},
    {name:'theme-color',content:'#6366f1'}
  ];
  
  metas.forEach(function(m){
    var el=document.querySelector('meta[name="'+m.name+'"]');
    if(!el){
      el=document.createElement('meta');
      el.name=m.name;
      document.head.appendChild(el);
    }
    el.content=m.content;
  });
}

function promptInstall(){
  if(localStorage.getItem('pwaPromptDismissed')==='1') return;
  if(document.getElementById('pwaInstallPrompt')) return;
  
  var deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault();
    deferredPrompt=e;
    showPrompt();
  });
  
  function showPrompt(){
    if(!deferredPrompt) return;
    if(document.getElementById('pwaInstallPrompt')) return;
    
    var c=document.createElement('div');
    c.id='pwaInstallPrompt';
    c.style.cssText='position:fixed;bottom:80px;inset-inline-start:16px;z-index:4500;max-width:330px;background:var(--surface,#1e293b);border:1px solid rgba(99,102,241,.5);border-radius:16px;padding:14px;box-shadow:0 12px 32px rgba(0,0,0,.35);color:var(--text,#fff);';
    c.innerHTML='<div style="display:flex;gap:10px;align-items:flex-start;"><span style="font-size:26px;">📲</span><div style="flex:1;"><strong style="font-size:13px;">ثبّت التطبيق على جهازك</strong><div style="font-size:11px;opacity:.75;margin:4px 0 8px;">افتح المنصة بسرعة من الشاشة الرئيسية — شغالة حتى لو النت قطع.</div><div style="display:flex;gap:6px;"><button class="btn btn-primary btn-sm" id="pwaInstallBtn">📲 تثبيت</button><button class="btn btn-ghost btn-sm" id="pwaDismissBtn">لاحقاً</button></div></div></div>';
    document.body.appendChild(c);
    
    c.querySelector('#pwaInstallBtn').onclick=async function(){
      if(!deferredPrompt) return;
      deferredPrompt.prompt();
      var choice=await deferredPrompt.userChoice;
      if(choice.outcome==='accepted'){
        c.remove();
        localStorage.setItem('pwaInstalled','1');
      }
      deferredPrompt=null;
    };
    
    c.querySelector('#pwaDismissBtn').onclick=function(){
      localStorage.setItem('pwaPromptDismissed','1');
      c.remove();
    };
  }
  
  /* لو التطبيق متثبت بالفعل، مش نعرض الـ prompt */
  if(localStorage.getItem('pwaInstalled')==='1') return;
  
  /* لو مش في beforeinstallprompt (مثلاً على iOS)، نعرض instructions */
  setTimeout(function(){
    if(!deferredPrompt&&!document.getElementById('pwaInstallPrompt')){
      var isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
      if(isIOS){
        var c=document.createElement('div');
        c.id='pwaInstallPrompt';
        c.style.cssText='position:fixed;bottom:80px;inset-inline-start:16px;z-index:4500;max-width:330px;background:var(--surface,#1e293b);border:1px solid rgba(99,102,241,.5);border-radius:16px;padding:14px;box-shadow:0 12px 32px rgba(0,0,0,.35);color:var(--text,#fff);';
        c.innerHTML='<div style="display:flex;gap:10px;align-items:flex-start;"><span style="font-size:26px;">📲</span><div style="flex:1;"><strong style="font-size:13px;">ثبّت التطبيق على iOS</strong><div style="font-size:11px;opacity:.75;margin:4px 0 8px;">1. دوس على زر المشاركة (⬆️)<br>2. اختار "إضافة إلى الشاشة الرئيسية"<br>3. دوس "إضافة"</div><button class="btn btn-ghost btn-sm" id="pwaDismissBtn">فهمت</button></div></div>';
        document.body.appendChild(c);
        c.querySelector('#pwaDismissBtn').onclick=function(){
          localStorage.setItem('pwaPromptDismissed','1');
          c.remove();
        };
      }
    }
  },5000);
}

function init(){
  injectManifest();
  injectMetaTags();
  promptInstall();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){ setTimeout(init,1200); });
}else{
  setTimeout(init,1200);
}

/* إعادة التشغيل لو branding اتغير */
window.addEventListener('storage',function(e){
  if(e.key==='eduflow_branding'){
    setTimeout(function(){
      injectManifest();
      injectMetaTags();
    },500);
  }
});
})();