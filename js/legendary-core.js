/* ================================================================
⚡ Legendary Core V1 — الموجة 1 من الإضافات الأسطورية
• 📴 طابور أوفلاين: أي حفظ سحابي والنت واقع → يتخزن ويتزامن لوحه
• 🧹 Ticker موحّد: مؤقّت واحد بيدير كل المهام الدورية (بدل 15 setInterval)
• 📄 ترقيم تلقائي: أي قائمة طويلة بتتقسم صفحات لوحدها
• ✅ تحديد جماعي: checkboxes بتتحقن في كروت الطلاب + شريط إجراءات عائم
================================================================ */
(function(){
"use strict";
var LG=window.LG=window.LG||{};

/* ========== 1) 📴 طابور الأوفلاين ========== */
var QKEY='eduflow_offline_queue';
function qLoad(){ try{ return JSON.parse(localStorage.getItem(QKEY)||'[]'); }catch(e){ return []; } }
function qSave(q){ try{ localStorage.setItem(QKEY, JSON.stringify(q.slice(-200))); }catch(e){} }
function online(){ return navigator.onLine!==false; }

LG.installOfflineQueue=function(){
  if(!(window.FirebaseService&&FirebaseService._db)||FirebaseService.__lgQ) return;
  FirebaseService.__lgQ=1;
  ['saveDoc','deleteDoc'].forEach(function(fn){
    var orig=FirebaseService[fn];
    if(typeof orig!=='function') return;
    FirebaseService[fn]=function(col,id,data){
      if(!online()){
        var q=qLoad();
        q.push({fn:fn,col:col,id:id,data:data||null,at:Date.now()});
        qSave(q); LG.updateQueueChip();
        return Promise.resolve({queued:true});
      }
      return orig.apply(this,arguments);
    };
  });
};
LG.flushQueue=function(){
  var q=qLoad(); if(!q.length||!online()) return;
  if(!(window.FirebaseService&&FirebaseService._db)) return;
  qSave([]);
  var i=0;
  (function next(){
    if(i>=q.length){ LG.updateQueueChip(); if(window.safeToast) window.safeToast('☁️ تم مزامنة '+q.length+' عملية كانت مستنية النت','success'); return; }
    var op=q[i++]; var p;
    try{ p=(op.fn==='saveDoc')?FirebaseService.saveDoc(op.col,op.id,op.data):FirebaseService.deleteDoc(op.col,op.id); }catch(e){ p=Promise.resolve(); }
    Promise.resolve(p).catch(function(){}).then(next);
  })();
};
LG.updateQueueChip=function(){
  var n=qLoad().length;
  var chip=document.getElementById('lgOfflineChip');
  if(!n){ if(chip) chip.remove(); return; }
  if(!chip){
    chip=document.createElement('div'); chip.id='lgOfflineChip';
    chip.style.cssText='position:fixed;bottom:96px;inset-inline-start:16px;z-index:9998;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:9px 16px;border-radius:999px;font-weight:800;font-size:12px;box-shadow:0 8px 20px rgba(245,158,11,.45);cursor:pointer;';
    chip.onclick=function(){ LG.flushQueue(); };
    document.body.appendChild(chip);
  }
  chip.innerHTML='📴 '+n+' عملية مستنية النت — دوس للمزامنة';
  if(online()) setTimeout(LG.flushQueue,800);
};

/* ========== 2) 🧹 الـ Ticker الموحّد ========== */
var tasks={}, lastRun={};
LG.tick=function(name,fn,ms){ tasks[name]={fn:fn,ms:ms||1000}; };
LG.untick=function(name){ delete tasks[name]; delete lastRun[name]; };
setInterval(function(){
  var now=Date.now();
  Object.keys(tasks).forEach(function(k){
    var t=tasks[k];
    if(!lastRun[k]||now-lastRun[k]>=t.ms){ lastRun[k]=now; try{ t.fn(); }catch(e){} }
  });
},1000);

/* ========== 3) 📄 الترقيم التلقائي ========== */
LG.pager=function(st){
  var pages=Math.max(1,Math.ceil(st.total/st.per));
  var cur=Math.min(Math.max(1,st.page),pages);
  var h='<div style="display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;margin:12px 0;">';
  h+='<button class="btn btn-ghost btn-sm" '+(cur<=1?'disabled':'')+' onclick="LG.pageGo('+(cur-1)+')">› السابق</button>';
  var s=Math.max(1,cur-2), e=Math.min(pages,cur+2);
  if(s>1) h+='<button class="btn btn-ghost btn-sm" onclick="LG.pageGo(1)">1</button><span class="text-muted">…</span>';
  for(var i=s;i<=e;i++) h+='<button class="btn btn-sm '+(i===cur?'btn-primary':'btn-ghost')+'" onclick="LG.pageGo('+i+')">'+i+'</button>';
  if(e<pages) h+='<span class="text-muted">…</span><button class="btn btn-ghost btn-sm" onclick="LG.pageGo('+pages+')">'+pages+'</button>';
  h+='<button class="btn btn-ghost btn-sm" '+(cur>=pages?'disabled':'')+' onclick="LG.pageGo('+(cur+1)+')">‹ التالي</button>';
  h+='<span class="text-xs text-muted" style="margin-inline-start:8px;">صفحة '+cur+' من '+pages+' · '+st.total+' سجل</span></div>';
  return h;
};
LG.pageGo=function(p){ window.__lgPage=p; if(window.__lgPageCb) window.__lgPageCb(p); };
LG.autoPaginate=function(hostSel,rowSel,per){
  per=per||50;
  var host=document.querySelector(hostSel); if(!host) return;
  var rows=Array.prototype.slice.call(host.querySelectorAll(rowSel));
  var old=document.getElementById('lgPager');
  if(rows.length<=per){ if(old) old.remove(); rows.forEach(function(r){ r.style.display=''; }); return; }
  var pages=Math.ceil(rows.length/per);
  var page=Math.min(Math.max(1,window.__lgPage||1),pages);
  rows.forEach(function(r,i){ r.style.display=(i>=(page-1)*per&&i<page*per)?'':'none'; });
  var pg=old;
  if(!pg){ pg=document.createElement('div'); pg.id='lgPager'; host.parentNode.appendChild(pg); }
  window.__lgPageCb=function(p){ window.__lgPage=p; LG.autoPaginate(hostSel,rowSel,per); LG.autoBulk(hostSel); };
  pg.innerHTML=LG.pager({page:page,per:per,total:rows.length});
};

/* ========== 4) ✅ التحديد الجماعي ========== */
LG.bulk={
  set:{},
  toggle:function(id,on){ if(on) this.set[id]=1; else delete this.set[id]; this.renderBar(); },
  clear:function(){ this.set={}; this.renderBar(); document.querySelectorAll('.lgBulkChk').forEach(function(c){c.checked=false;}); },
  ids:function(){ return Object.keys(this.set); },
  renderBar:function(){
    var bar=document.getElementById('lgBulkBar');
    if(!bar){
      bar=document.createElement('div'); bar.id='lgBulkBar';
      bar.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9998;background:var(--surface,#1e293b);border:1px solid var(--primary,#6366f1);border-radius:16px;padding:10px 16px;display:none;gap:8px;align-items:center;box-shadow:0 12px 32px rgba(0,0,0,.4);flex-wrap:wrap;justify-content:center;';
      document.body.appendChild(bar);
    }
    var ids=this.ids();
    if(!ids.length){ bar.style.display='none'; bar.innerHTML=''; return; }
    bar.style.display='flex';
    bar.innerHTML='<strong style="font-size:13px;">✅ '+ids.length+' محدد</strong>'+
      '<button class="btn btn-primary btn-sm" onclick="lgBulkAction(\'notify\')">📢 إشعار جماعي</button>'+
      '<button class="btn btn-secondary btn-sm" onclick="lgBulkAction(\'enroll\')">👥 ضم لمجموعة</button>'+
      '<button class="btn btn-success btn-sm" onclick="lgBulkAction(\'export\')">📊 تصدير CSV</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="LG.bulk.clear()">✕ إلغاء</button>';
  }
};
window.lgBulkAction=function(kind){
  var ids=LG.bulk.ids(); if(!ids.length) return;
  if(kind==='export'){
    var rows=[['الاسم','الكود','الصف','الهاتف']];
    ids.forEach(function(id){ var s=(DataService.getUserById?DataService.getUserById(id):null); if(s) rows.push([s.name||'',s.code||'',s.grade||'',s.phone||s.parentPhone||'']); });
    var csv='\uFEFF'+rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
    var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download='EduFlow-students-'+Date.now()+'.csv'; a.click();
    LG.bulk.clear(); return;
  }
  if(kind==='notify'){
    var msg=prompt('📢 نص الإشعار الجماعي لـ '+ids.length+' طالب:'); if(!msg) return;
    ids.forEach(function(id){ try{ DataService.addNotification({targetUserId:id,title:'📢 إعلان من الإدارة',message:msg,type:'general',priority:'medium',meta:{event:'general'}}); }catch(e){} });
    if(window.safeToast) window.safeToast('📢 وصل الإشعار لـ '+ids.length+' طالب','success');
    LG.bulk.clear(); return;
  }
  if(kind==='enroll'){
    var gs=(DataService.getGroups?DataService.getGroups():[]);
    var pick=prompt('👥 اكتب اسم المجموعة لضم '+ids.length+' طالب:\nمثال: '+gs.slice(0,5).map(function(g){return g.name;}).join(' / '));
    if(!pick) return;
    var g=gs.find(function(x){ return (x.name||'').trim()===pick.trim(); });
    if(!g){ if(window.safeToast) window.safeToast('مجموعة مش موجودة — اكتب الاسم بالظبط','error'); return; }
    var d=DataService._getData(); d.enrollments=d.enrollments||[]; var added=0;
    ids.forEach(function(sid){
      if(!d.enrollments.some(function(e){return e.studentId===sid&&e.groupId===g.id&&e.status==='active';})){
        d.enrollments.push({id:'en_'+Date.now()+'_'+sid,studentId:sid,groupId:g.id,teacherId:g.teacherId||null,status:'active',createdAt:new Date().toISOString()});
        added++;
      }
    });
    DataService._saveData(d);
    if(window.safeToast) window.safeToast('👥 اتضم '+added+' طالب لمجموعة '+g.name,'success');
    LG.bulk.clear(); return;
  }
};
LG.autoBulk=function(hostSel){
  var host=document.querySelector(hostSel); if(!host) return;
  host.querySelectorAll('.user-card,tr[data-id]').forEach(function(card){
    if(card.querySelector('.lgBulkChk')) return;
    var id=card.getAttribute('data-id')||'';
    if(!id){ var m=(card.getAttribute('onclick')||'').match(/\('([\w-]+)'/); if(m) id=m[1]; }
    if(!id){ var m2=(card.innerHTML||'').match(/(?:openStudentProfile|pointsEditor|editStudent)\('([\w-]+)'/); if(m2) id=m2[1]; }
    if(!id) return;
    var chk=document.createElement('input');
    chk.type='checkbox'; chk.className='lgBulkChk'; chk.title='تحديد';
    chk.style.cssText='position:absolute;top:8px;inset-inline-end:8px;width:16px;height:16px;accent-color:var(--primary);z-index:5;cursor:pointer;';
    chk.checked=!!LG.bulk.set[id];
    chk.onchange=function(){ LG.bulk.toggle(id,chk.checked); };
    if(getComputedStyle(card).position==='static') card.style.position='relative';
    card.appendChild(chk);
  });
};

/* ========== 🔌 تشغيل تلقائي على صفحة الطلاب ========== */
LG.tick('stuEnhance',function(){
  var sec=document.getElementById('section-students');
  if(!sec||!sec.classList.contains('active')) return;
  var hostSel=['#studentsList','#studentsTable','#stuList'].filter(function(s){return document.querySelector(s);})[0];
  if(!hostSel) return;
  var rowSel=(hostSel==='#studentsTable')?'tbody tr':'.user-card';
  LG.autoPaginate(hostSel,rowSel,50);
  LG.autoBulk(hostSel);
},3000);
LG.tick('qInstall',function(){
  if(window.FirebaseService&&FirebaseService._db&&!FirebaseService.__lgQ){ LG.installOfflineQueue(); LG.untick('qInstall'); }
},2000);
LG.tick('qChip',function(){ LG.updateQueueChip(); if(online()&&qLoad().length) LG.flushQueue(); },6000);
window.addEventListener('online',function(){ LG.flushQueue(); });
window.addEventListener('offline',function(){ LG.updateQueueChip(); if(window.safeToast) window.safeToast('📴 النت وقع — أي حفظ هيتخزن ويتزامن لوحه','warning'); });

function boot(){ LG.installOfflineQueue(); LG.updateQueueChip(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();