// js/theme-manager.js — الثيم + المودالات + التوست + ✅ السايدبار بدون overlay
(function(){
  'use strict';

  function driveThumb(url){
    try{
      const u=String(url||'');
      const m=u.match(/\/d\/([\w-]+)/)||u.match(/[?&]id=([\w-]+)/)||u.match(/^([\w-]{20,})$/);
      return m ? ('https://drive.google.com/thumbnail?id='+m[1]+'&sz=w400') : u;
    }catch(e){ return url||''; }
  }

  const TM = {
    _theme:'dark',

    init(){
      try{
        const saved = localStorage.getItem('eduflow_theme');
        this.setTheme(saved || (document.body && document.body.dataset.theme) || 'dark', true);
        const btn=document.getElementById('themeToggle');
        if(btn && !btn.dataset.tmBound){
          btn.dataset.tmBound='1';
          btn.addEventListener('click',()=> this.setTheme(this._theme==='dark'?'light':'dark'));
        }
      }catch(e){ console.warn('[TM] theme init', e); }
      this._initSidebar();
      this._ensureModalRoot();
      this.applyBranding();
    },

    setTheme(t, silent){
      try{
        this._theme = (t==='light')?'light':'dark';
        document.body?.setAttribute('data-theme', this._theme);
        localStorage.setItem('eduflow_theme', this._theme);
        const btn=document.getElementById('themeToggle');
        if(btn) btn.textContent = this._theme==='dark' ? '☀️' : '🌙';
      }catch(e){}
    },

    // ✅✅✅ السايدبار بدون overlay خالص
    _initSidebar(){
      try{
        const sb=document.getElementById('sidebar');
        const mt=document.getElementById('menuToggle');
        const main=document.querySelector('.main-content');
        if(!sb) return;

        sb.style.zIndex='1200';
        const close = () => sb.classList.remove('open');

        // زرار القائمة = toggle
        if(mt && !mt.dataset.tmBound){
          mt.dataset.tmBound='1';
          mt.addEventListener('click', (e) => {
            e.stopPropagation();
            sb.classList.toggle('open');
          });
        }

        // الضغط على المحتوى الرئيسي يقفل القائمة على الموبايل
        if(main && !main.dataset.tmBound){
          main.dataset.tmBound='1';
          main.addEventListener('click', () => {
            if(window.innerWidth<=1024) close();
          });
        }

        // على الشاشات الكبيرة القائمة دايماً مفتوحة
        window.addEventListener('resize', () => {
          if(window.innerWidth>1024) close();
        });
      }catch(e){ console.warn('[TM] sidebar init', e); }
    },

    applyBranding(){
      try{
        const b = (window.DataService && typeof DataService.getBranding==='function') ? DataService.getBranding() : null;
        if(!b) return;
        if(b.primaryColor) document.documentElement.style.setProperty('--primary', b.primaryColor);
        if(b.accentColor) document.documentElement.style.setProperty('--accent', b.accentColor);
        if(b.primaryColor && b.accentColor) document.documentElement.style.setProperty('--grad', 'linear-gradient(135deg,'+b.primaryColor+' 0%,'+b.accentColor+' 100%)');
        document.querySelectorAll('[data-brand-name]').forEach(el=>{ el.textContent = b.name || 'EduFlow'; });
        document.querySelectorAll('[data-logo]').forEach(el=>{
          try{
            if(b.logo){
              const url = /^https?:\/\//.test(b.logo) ? driveThumb(b.logo) : b.logo;
              el.innerHTML = '<img src="'+url+'" alt="logo" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" onerror="this.remove();this.parentNode.textContent=\'🎓\'">';
            }else{ el.textContent = '🎓'; }
          }catch(e){}
        });
      }catch(e){ console.warn('[TM] branding', e); }
    },

    _ensureModalRoot(){
      try{
        if(document.getElementById('globalModalOverlay')) return;
        const ov=document.createElement('div');
        ov.id='globalModalOverlay'; ov.className='modal-overlay';
        ov.style.cssText='display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);z-index:1000;align-items:center;justify-content:center;padding:20px;';
        const m=document.createElement('div');
        m.id='globalModal'; m.className='modal';
        m.style.cssText='background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xl);max-width:560px;width:100%;max-height:88vh;overflow-y:auto;position:relative;';
        ov.appendChild(m);
        ov.addEventListener('click', e=>{ if(e.target===ov) TM.closeModal(); });
        document.body.appendChild(ov);
      }catch(e){ console.warn('[TM] modal root', e); }
    },

    openModal(content, size){
      try{
        this._ensureModalRoot();
        const ov=document.getElementById('globalModalOverlay');
        const m=document.getElementById('globalModal');
        if(!ov||!m) return;
        m.className='modal '+(size||'');
        m.style.maxWidth = (size==='modal-lg')?'820px':(size==='modal-md')?'640px':(size==='modal-sm')?'420px':'560px';
        m.innerHTML=content||'';
        ov.style.display='flex';
        document.body.style.overflow='hidden';
      }catch(e){ console.warn('[TM] openModal', e); }
    },

    closeModal(){
      try{
        const ov=document.getElementById('globalModalOverlay');
        if(ov) ov.style.display='none';
        document.body.style.overflow='';
      }catch(e){}
    },

    confirm(msg, onOk){
      try{
        window.__tmConfirmCb = onOk || null;
        this.openModal(
          '<div class="modal-header"><h3 class="modal-title">تأكيد</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>'+
          '<div class="modal-body"><p style="line-height:1.8;">'+msg+'</p>'+
          '<div style="display:flex;gap:8px;margin-top:16px;">'+
          '<button class="btn btn-primary" style="flex:1;" onclick="ThemeManager._doConfirm()">✅ تأكيد</button>'+
          '<button class="btn btn-secondary" style="flex:1;" onclick="ThemeManager.closeModal()">إلغاء</button>'+
          '</div></div>',
          'modal-sm'
        );
      }catch(e){ console.warn('[TM] confirm', e); }
    },

    _doConfirm(){
      try{
        const cb=window.__tmConfirmCb; window.__tmConfirmCb=null;
        this.closeModal();
        if(typeof cb==='function') cb();
      }catch(e){ console.warn('[TM] doConfirm', e); }
    },

    toast(msg, type, dur){
      try{
        type=type||'info'; dur=dur||2500;
        let c=document.querySelector('.toast-container');
        if(!c){
          c=document.createElement('div'); c.className='toast-container';
          c.style.cssText='position:fixed;top:16px;inset-inline-start:16px;z-index:2000;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
          document.body.appendChild(c);
        }
        const t=document.createElement('div');
        t.className='toast toast-'+type;
        t.style.cssText='padding:12px 18px;border-radius:10px;color:#fff;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:320px;';
        t.style.background = type==='success'?'var(--success)':type==='error'?'var(--danger)':type==='warning'?'var(--warning)':'var(--primary)';
        t.textContent=msg;
        c.appendChild(t);
        setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),320); }, dur);
      }catch(e){ console.warn('[TM] toast', e); }
    }
  };

  window.ThemeManager = TM;

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', ()=>TM.init());
  }else{
    TM.init();
  }
})();