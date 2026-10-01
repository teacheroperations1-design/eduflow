/* ================================================================
📱 PWA Injector — زرار عائم جانبي + تصغير فوق الفوتر
================================================================ */
(function(){
  "use strict";

  const ICON_SVG_512 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM2MzY2ZjEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM4YjVjZjYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgcng9IjExMiIgZmlsbD0idXJsKCNnKSIvPjx0ZXh0IHg9IjI1NiIgeT0iMzQwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjgwIiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn46TPC90ZXh0Pjwvc3ZnPg==';
  const ICON_SVG_32 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjNjM2NmYxIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjOGI1Y2Y2Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNyIgZmlsbD0idXJsKCNnKSIvPjx0ZXh0IHg9IjE2IiB5PSIyMiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn46TPC90ZXh0Pjwvc3ZnPg==';

  /* ---------- 1) meta + أيقونات ---------- */
  function injectMeta() {
    if (document.querySelector('link[rel="manifest"]')) return;
    const manifest = document.createElement('link');
    manifest.rel = 'manifest'; manifest.href = './manifest.json';
    document.head.appendChild(manifest);
    if (!document.querySelector('meta[name="theme-color"]')) {
      const t = document.createElement('meta'); t.name='theme-color'; t.content='#6366f1'; document.head.appendChild(t);
    }
    [['apple-mobile-web-app-capable','yes'],['apple-mobile-web-app-status-bar-style','black-translucent'],['apple-mobile-web-app-title','EduFlow'],['mobile-web-app-capable','yes']].forEach(m=>{
      if(!document.querySelector(`meta[name="${m[0]}"]`)){ const el=document.createElement('meta'); el.name=m[0]; el.content=m[1]; document.head.appendChild(el); }
    });
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const i=document.createElement('link'); i.rel='apple-touch-icon'; i.href=ICON_SVG_512; document.head.appendChild(i);
    }
    let fav=document.querySelector('link[rel="icon"]');
    if(!fav){ fav=document.createElement('link'); fav.rel='icon'; fav.type='image/svg+xml'; document.head.appendChild(fav); }
    fav.href=ICON_SVG_32;
    let sc=document.querySelector('link[rel="shortcut icon"]');
    if(!sc){ sc=document.createElement('link'); sc.rel='shortcut icon'; sc.type='image/svg+xml'; document.head.appendChild(sc); }
    sc.href=ICON_SVG_32;
  }

  /* ---------- 2) الويدجت: عائم جانبي + مصغر فوق الفوتر ---------- */
  let deferredPrompt=null, card=null, mini=null, built=false;

  function pstate(){ try{ return sessionStorage.getItem('pwaInstallState')||'expanded'; }catch(e){ return 'expanded'; } }
  function setPState(s){ try{ sessionStorage.setItem('pwaInstallState',s); }catch(e){} render(); }

  function render(){
    if(!card||!mini) return;
    const s=pstate();
    card.style.display = (s==='expanded') ? 'flex' : 'none';
    mini.style.display = (s==='mini') ? 'flex' : 'none';
  }

  function doInstall(){
    if(!deferredPrompt){
      alert('لتثبيت التطبيق:\n\n• Chrome (أندرويد): القائمة ⋮ ← "إضافة إلى الشاشة الرئيسية"\n• Safari (iOS): زر المشاركة ← "إضافة إلى الشاشة الرئيسية"\n• Chrome (كمبيوتر): أيقونة التثبيت في شريط العنوان');
      return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(({outcome})=>{
      if(outcome==='accepted'){ setPState('installed'); if(window.safeToast) window.safeToast('✅ تم تثبيت التطبيق!','success'); }
      deferredPrompt=null;
    });
  }

  function isInstalled(){ try{ return (window.matchMedia&&(matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: window-controls-overlay)').matches))||navigator.standalone===true; }catch(e){ return false; } }
  function build(){
    if(built||isInstalled()) return; built=true;
    const st=document.createElement('style');
    st.textContent='@keyframes pwaPop{from{opacity:0;transform:translateY(14px) scale(.9);}to{opacity:1;transform:none;}}';
    document.head.appendChild(st);

    /* الكارت العائم الجانبي */
    card=document.createElement('div'); card.id='pwaInstallCard';
    card.style.cssText='position:fixed;left:16px;bottom:110px;z-index:9997;display:none;align-items:center;gap:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:9999px;padding:10px 12px 10px 10px;box-shadow:0 10px 30px rgba(99,102,241,.45);animation:pwaPop .35s ease both;font-family:inherit;';
    card.innerHTML='<button id="pwaInstallGo" style="display:flex;align-items:center;gap:8px;background:transparent;border:none;color:#fff;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit;padding:2px 6px;"><span style="font-size:18px;">📱</span><span>تثبيت التطبيق</span></button>'
      +'<button id="pwaInstallX" title="تصغير" style="width:26px;height:26px;border-radius:50%;border:none;background:rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;">✕</button>';
    document.body.appendChild(card);

    /* الأيقونة المصغرة تحت خالص فوق الفوتر */
    mini=document.createElement('button'); mini.id='pwaInstallMini'; mini.title='تثبيت التطبيق';
    mini.style.cssText='position:fixed;left:12px;bottom:66px;z-index:9997;width:44px;height:44px;border-radius:50%;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:20px;cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(99,102,241,.4);animation:pwaPop .3s ease both;';
    mini.textContent='📱';
    document.body.appendChild(mini);

    card.querySelector('#pwaInstallGo').addEventListener('click',doInstall);
    card.querySelector('#pwaInstallX').addEventListener('click',function(){
      setPState('mini');
      if(window.safeToast) window.safeToast('تم التصغير — الأيقونة 📱   ','info');
    });
    mini.addEventListener('click',function(){ setPState('expanded'); });
    render();
  }

  window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt=e; setTimeout(build,400); });
  window.addEventListener('appinstalled',()=>{ deferredPrompt=null; setPState('installed'); try{ var c=document.getElementById('pwaInstallCard'); var m=document.getElementById('pwaInstallMini'); if(c)c.remove(); if(m)m.remove(); built=false; }catch(e){} });

  /* ---------- 3) بانر الأوفلاين ---------- */
  function checkOnline(){
    if(!navigator.onLine){
      document.body.classList.add('offline');
      if(!document.getElementById('offlineBanner')){
        const b=document.createElement('div'); b.id='offlineBanner';
        b.innerHTML='📴 أنت غير متصل بالإنترنت — بعض البيانات قد لا تكون محدّثة';
        b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;background:var(--warning,#f59e0b);color:#fff;text-align:center;padding:8px 12px;font-size:12px;font-weight:700;font-family:inherit;';
        document.body.appendChild(b);
      }
    }else{
      document.body.classList.remove('offline');
      const b=document.getElementById('offlineBanner'); if(b) b.remove();
    }
  }
  window.addEventListener('online',checkOnline);
  window.addEventListener('offline',checkOnline);

  /* ---------- 4) تحديث الأيقونة من البراندينج ---------- */
  function updateFaviconFromBranding(){
    try{
      const b=(window.DataService&&typeof DataService.getBranding==='function')?DataService.getBranding():{};
      const url=b.logoUrl||b.logo||''; if(!url) return;
      const src=window.driveThumb?window.driveThumb(url):url;
      ['icon','apple-touch-icon','shortcut icon'].forEach(rel=>{
        const l=document.querySelector('link[rel="'+rel+'"]');
        if(l){ const img=new Image(); img.onload=()=>{ l.href=src; }; img.src=src; }
      });
    }catch(e){}
  }

  /* ---------- 5) تهيئة ---------- */
  function init(){
    injectMeta(); checkOnline();
    setTimeout(build,800);           /* الويدجت يظهر عائم جانبي */
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('./sw.js').then(reg=>{
        reg.addEventListener('updatefound',()=>{
          const nw=reg.installing;
          nw.addEventListener('statechange',()=>{
            if(nw.state==='installed'&&navigator.serviceWorker.controller){
              if(confirm('🔄 توجد نسخة جديدة من EduFlow. تحديث الآن؟')){ nw.postMessage({type:'SKIP_WAITING'}); location.reload(); }
            }
          });
        });
      }).catch(e=>console.warn('[PWA] SW failed:',e));
    }
    setTimeout(updateFaviconFromBranding,1500);
    setTimeout(updateFaviconFromBranding,4000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();