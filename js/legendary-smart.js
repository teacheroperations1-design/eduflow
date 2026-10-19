/* ================================================================
🧠 Legendary Smart V1 — حارس النماذج + Gemini حقيقي + دايجست + شريط موبايل + ماسح داخلي + سجل تدقيق
================================================================ */
(function(){
"use strict";
var SM=window.LG=window.LG||{};
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function saveD(d){if(DataService._saveData)DataService._saveData(d);}
function cur(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null);}catch(e){return null;}}
function role(){var u=cur();return u?u.role:'';}
function toast(m,t){try{if(window.safeToast)window.safeToast(m,t||'info');}catch(e){}}
function tick(n,f,ms){ if(SM.tick) SM.tick(n,f,ms); else setInterval(f,ms); }
function escS(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}

/* ========== 🛡️ 3) حارس النموذج الوسخ ========== */
var dirty=false;
function modalOpen(){ var ov=document.getElementById('globalModalOverlay'); return !!(ov&&ov.style.display!=='none'); }
document.addEventListener('input',function(e){ if(modalOpen()&&e.target.closest&&e.target.closest('.modal-body')) dirty=true; },true);
document.addEventListener('change',function(e){ if(modalOpen()&&e.target.closest&&e.target.closest('.modal-body')) dirty=true; },true);
function installGuard(){
  if(!window.ThemeManager||ThemeManager.__lgGuard) return;
  ThemeManager.__lgGuard=1;
  var oo=ThemeManager.openModal, oc=ThemeManager.closeModal;
  ThemeManager.openModal=function(){ dirty=false; return oo.apply(this,arguments); };
  ThemeManager.closeModal=function(force){
    if(dirty&&!force){ if(!confirm('⚠️ عندك تعديلات مش محفوظة في النافذة دي — تقفل بدون حفظ؟')) return; }
    dirty=false; return oc.apply(this,arguments);
  };
  window.__lgCloseClean=function(){ dirty=false; oc.call(ThemeManager); };
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&modalOpen()){ e.preventDefault(); ThemeManager.closeModal(); } });
  if(window.DataService){
    ['_saveData','updateUser'].forEach(function(fn){
      if(typeof DataService[fn]==='function'&&!DataService[fn].__lgDirty){
        var o=DataService[fn].bind(DataService);
        DataService[fn]=function(){ var r=o.apply(this,arguments); if(modalOpen()) dirty=false; return r; };
        DataService[fn].__lgDirty=1;
      }
    });
  }
}

/* ========== 🤖 4) Gemini حقيقي (تصحيح + ردود واتساب) ========== */
SM.aiKey=function(k){ var d=db(); d.aiConfig=d.aiConfig||{}; if(k!==undefined){ d.aiConfig.geminiKey=String(k||''); saveD(d); } return d.aiConfig.geminiKey||''; };
async function gemini(prompt,jsonMode){
  var key=SM.aiKey(); if(!key) return null;
  var models=['gemini-1.5-flash-latest','gemini-flash-latest','gemini-1.5-flash'];
  for(var i=0;i<models.length;i++){
    try{
      var res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+models[i]+':generateContent?key='+encodeURIComponent(key),{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(jsonMode?{contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.2,responseMimeType:'application/json'}}:{contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.4}})
      });
      if(!res.ok) continue;
      var j=await res.json();
      var parts=(((j.candidates||[])[0]||{}).content||{}).parts||[];
      var out=parts.map(function(p){return p.text||'';}).join('');
      if(!out) continue;
      return jsonMode?out:out;
    }catch(e){}
  }
  return null;
}
SM.aiGradeEssay=async function(essay,question,maxScore){
  var raw=await gemini('انت مدرس عربي دقيق. قيّم الإجابة دي من 0 لـ '+maxScore+' وارجع JSON بس بالشكل: {"score":رقم,"feedback":"تعليق عربي مختصر"}\nالسؤال: '+question+'\nالإجابة: '+essay,true);
  if(!raw) return null;
  try{ var m=raw.match(/\{[\s\S]*\}/); if(!m) return null; var o=JSON.parse(m[0]); return {score:Math.max(0,Math.min(maxScore,Math.round(+o.score||0))),feedback:String(o.feedback||'')}; }catch(e){ return null; }
};
SM.aiWaReply=async function(incoming,ctx){
  var raw=await gemini('انت دعم فني لمركز تعليمي اسمه '+(ctx.center||'EduFlow')+'. اكتب رد واتساب عربي ودود ومحترف مختصر (3-5 سطرات) يعتمد على البيانات دي: '+JSON.stringify(ctx)+'\nرسالة ولي الأمر: '+incoming+'\nاكتب الرد مباشرة بدون مقدمات.',false);
  return raw?raw.trim():null;
};
SM.collectWaContext=function(msg){
  var d=db(); var ctx={center:(d.branding||{}).name||'EduFlow',support:(d.branding||{}).whatsappSupport||(d.branding||{}).supportPhone||''};
  if(/غياب|غاب|حضور|حضر/.test(msg)) ctx.note='الحضور بيتسجل بالباركود/اعتماد الحصة، والغياب بيوصل إشعار فوري ولي الأمر مع زر اعتراض.';
  if(/دفع|شهر|فلوس|مصروف|تحصيل/.test(msg)) ctx.note='الشهرية بتتحسب بنظام دورات الحصص (8 حصص)، وأي مستحق بيظهر في لوحة ولي الأمر لحظة بلحظة.';
  if(/درج|نتيج|امتحان/.test(msg)) ctx.note='النتائج المرصودة بتظهر بعد الاعتماد، وأي درجة لسه مظهره معناها لسه في المراجعة.';
  if(/الغاء|اتلغت|تعويض/.test(msg)) ctx.note='أي حصة ملغية بتتعوض تلقائياً في جدول التعويضيات وبيوصل إشعار.';
  return ctx;
};
SM.testAi=async function(){
  toast('⏳ بنجرّب الاتصال...','info');
  var r=await SM.aiGradeEssay('عاصمة مصر هي القاهرة وعدد سكانها أكبر من 20 مليون نسمة.','ما هي عاصمة مصر؟',10);
  toast(r?('✅ الذكاء رد: '+r.score+'/10 — '+r.feedback):'❌ مفيش مفتاح محفوظ أو الاتصال فشل','info');
};
function injectAiKeyCard(){
  if(role()!=='admin'&&role()!=='super_admin'){ var old=document.getElementById('lgAiKeyCard'); if(old) old.remove(); return; }
  var sec=document.getElementById('section-aiTools'); if(!sec||document.getElementById('lgAiKeyCard')) return;
  var card=document.createElement('div'); card.id='lgAiKeyCard'; card.className='card';
  card.style.cssText='margin-bottom:16px;border:2px solid var(--success);padding:14px;';
  card.innerHTML='<h3 class="card-title" style="margin-bottom:10px;">🔑 ربط Gemini (ذكاء حقيقي للمنصة)</h3>'+
  '<div style="display:flex;gap:6px;flex-wrap:wrap;"><input type="password" id="lgGeminiKey" class="form-input" style="flex:1;min-width:200px;" placeholder="الصق مفتاح Gemini API هنا">'+
  '<button type="button" class="btn btn-primary btn-sm" onclick="LG.aiKey(document.getElementById(\'lgGeminiKey\').value);window.safeToast(\'✅ المفتاح اتحفظ\',\'success\')">💾 حفظ</button>'+
  '<button type="button" class="btn btn-secondary btn-sm" onclick="LG.testAi()">🧪 اختبار</button></div>'+
  '<div class="text-xs text-muted" style="margin-top:6px;">مفتاح مجاني من Google AI Studio · بيشتغل في: تصحيح المقالي + ردود واتساب الدعم + التقارير الذكية</div>';
  sec.appendChild(card);
}
function wrapAiWa(){
  if(typeof window.openAIAssistant!=='function'||window.__lgAiWa) return;
  window.__lgAiWa=1; var o=window.openAIAssistant;
  window.openAIAssistant=function(){
    var r=o.apply(this,arguments);
    setTimeout(function(){
      var body=document.querySelector('#globalModal .modal-body'); if(!body||body.querySelector('#lgGeminiWa')) return;
      var out=document.getElementById('aiWaOutput');
      var b=document.createElement('button'); b.id='lgGeminiWa'; b.type='button'; b.className='btn btn-primary btn-sm'; b.style.marginTop='8px'; b.textContent='🤖 توليد رد بجيميناي';
      b.onclick=async function(){
        var msg=(document.getElementById('aiWaInput')||{}).value||'';
        if(!msg){ toast('اكتب رسالة ولي الأمر الأول','warning'); return; }
        b.disabled=true; b.textContent='⏳ بيولّد...';
        var reply=await SM.aiWaReply(msg,SM.collectWaContext(msg));
        b.disabled=false; b.textContent='🤖 توليد رد بجيميناي';
        if(reply&&out){ out.value=reply; toast('✅ رد الذكاء جاهز — راجعه قبل الإرسال','success'); }
        else toast('🔑 مفتاح Gemini مش مظبوط — كلم الأدمن يضيفه من لوحة AI عنده','warning');
      };
      if(out&&out.parentNode) out.parentNode.insertBefore(b,out);
      else body.appendChild(b);
    },200);
    return r;
  };
}

/* ========== 🌙 7) وضع الدايجست (ملخص يومي بدل الزحمة) ========== */
var URGENT=['due_now','due_warn','session_cancel','absence_marked','exam_new','hw_new','schedule_change','digest'];
var RAWN=null;
function digestCfg(){ var d=db(); d.notifyPolicy=d.notifyPolicy||{}; if(!d.notifyPolicy.digest) d.notifyPolicy.digest={enabled:false,hour:'21:00'}; return d.notifyPolicy.digest; }
SM.openDigestSettings=function(){
  var c=digestCfg();
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🌙 وضع الدايجست</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="filter-info">بدل ما الطالب/ولي الأمر يستقبل كل إشعار عادي لحظياً، بتتجمع وتوصله في ملخص واحد يومياً. الإشعارات العاجلة (مستحقات/إلغاء/نتائج) بتوصل فوراً عادي.</div>'+
  '<label class="switch-label"><input type="checkbox" class="switch-input" id="dgOn" '+(c.enabled?'checked':'')+'><span class="switch"></span><span>تفعيل الدايجست اليومي</span></label>'+
  '<div class="form-group"><label>⏰ ميعاد الإرسال</label><input type="time" id="dgHour" class="form-input" value="'+(c.hour||'21:00')+'"></div>'+
  '<button class="btn btn-primary w-full" onclick="LG.saveDigest()">💾 حفظ</button></div>','modal-sm');
};
SM.saveDigest=function(){
  var d=db(); d.notifyPolicy=d.notifyPolicy||{};
  d.notifyPolicy.digest={enabled:(document.getElementById('dgOn')||{}).checked,hour:(document.getElementById('dgHour')||{}).value||'21:00'};
  saveD(d); ThemeManager.closeModal(); toast('🌙 إعدادات الدايجست اتحفظت','success');
};
function installDigest(){
  if(!window.DataService||DataService.__lgDigest) return;
  DataService.__lgDigest=1;
  var o=DataService.addNotification.bind(DataService); RAWN=o;
  DataService.addNotification=function(n){
    try{
      var c=digestCfg();
      var ev=(n&&n.meta&&n.meta.event)||'';
      if(c.enabled&&n&&n.targetUserId&&URGENT.indexOf(ev)<0&&(n.priority==='low'||n.priority==='normal')){
        var t=DataService.getUserById?DataService.getUserById(n.targetUserId):null;
        if(t&&(t.role==='student'||t.role==='parent')){
          var d=db(); d.digestQueue=d.digestQueue||[];
          d.digestQueue.push({id:'dgq_'+Date.now()+Math.random().toString(36).slice(2,5),target:n.targetUserId,title:n.title||'',message:n.message||'',day:new Date().toISOString().slice(0,10),at:new Date().toISOString()});
          saveD(d); return Promise.resolve({queued:true});
        }
      }
    }catch(e){}
    return o(n);
  };
}
function flushDigest(){
  var c=digestCfg(); if(!c.enabled||!RAWN) return;
  var now=new Date();
  var hm=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  if(hm<(c.hour||'21:00')) return;
  var today=now.toISOString().slice(0,10);
  var d=db(); var q=(d.digestQueue||[]).filter(function(x){return x.day===today;});
  if(!q.length) return;
  var byUser={}; q.forEach(function(x){ (byUser[x.target]=byUser[x.target]||[]).push(x); });
  Object.keys(byUser).forEach(function(uid){
    var list=byUser[uid].slice(0,8);
    RAWN({targetUserId:uid,title:'🌙 ملخصك اليومي',message:list.map(function(x,i){return (i+1)+') '+x.title+(x.message?' — '+x.message:'');}).join('\n'),type:'digest',priority:'normal',meta:{event:'digest'}});
  });
  d.digestQueue=(d.digestQueue||[]).filter(function(x){return x.day!==today;});
  saveD(d);
  toast('🌙 الدايجست اتبعت ('+q.length+' رسالة متجمعة)','success');
}
function injectDigestBtn(){
  var card=document.getElementById('lgCommsCard'); if(!card||card.querySelector('#lgDigestBtn')) return;
  var b=document.createElement('button'); b.id='lgDigestBtn'; b.type='button'; b.className='btn btn-ghost btn-sm'; b.textContent='🌙 الدايجست';
  b.onclick=function(){ SM.openDigestSettings(); }; card.appendChild(b);
}
tick('digestFlush',flushDigest,300000);

/* ========== 🧭 8) شريط تنقل سفلي للموبايل ========== */
var NAVMAP={
  student:[['dashboard','🏠','الرئيسية'],['attendance','📋','حضوري'],['results','📊','درجاتي'],['payments','💰','مدفوعاتي'],['__menu','☰','القائمة']],
  parent:[['overview','🏠','الرئيسية'],['grades','📊','الدرجات'],['attendance','📋','الحضور'],['payments','💰','المدفوعات'],['__menu','☰','القائمة']],
  assistant:[['command','🎯','العمليات'],['attendance','📋','الحضور'],['grades','📝','الرصد'],['monthly','💰','التحصيل'],['__menu','☰','القائمة']],
  teacher:[['overview','🏠','الرئيسية'],['attendance','📋','الحضور'],['grades','📝','الدرجات'],['monthly','💰','التحصيل'],['__menu','☰','القائمة']]
};
SM.bottomNavGo=function(id){
  if(id==='__menu'){ var sb=document.getElementById('sidebar'); if(sb){ sb.classList.toggle('open'); var ov=document.getElementById('sidebarOverlay'); if(ov) ov.classList.toggle('show',sb.classList.contains('open')); } return; }
  if(window.showSection) window.showSection(id);
};
function injectBottomNav(){
  var old=document.getElementById('lgBottomNav');
  if(window.innerWidth>768){ if(old) old.style.display='none'; return; }
  var items=NAVMAP[role()]; if(!items){ if(old) old.style.display='none'; return; }
  var nav=old;
  if(!nav){
    nav=document.createElement('div'); nav.id='lgBottomNav';
    nav.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:9990;display:flex;background:var(--surface);border-top:1px solid var(--border);padding:6px 4px calc(6px + env(safe-area-inset-bottom));box-shadow:0 -8px 24px rgba(0,0,0,.25);';
    document.body.appendChild(nav);
    document.body.style.paddingBottom='72px';
  }
  nav.style.display='flex';
  var act=String((document.querySelector('.section.active')||{}).id||'').replace('section-','');
  nav.innerHTML=items.map(function(it){
    var on=act===it[0];
    return '<button type="button" onclick="LG.bottomNavGo(\''+it[0]+'\')" style="flex:1;border:none;background:'+(on?'var(--primary-bg)':'transparent')+';color:'+(on?'var(--primary)':'var(--text-muted)')+';border-radius:12px;padding:6px 2px;font-family:inherit;font-size:10px;font-weight:800;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;"><span style="font-size:18px;">'+it[1]+'</span>'+it[2]+'</button>';
  }).join('');
}
tick('bottomNav',injectBottomNav,2500);
window.addEventListener('resize',injectBottomNav);

/* ========== 📷 9+) ماسح داخلي بالمودال (بدل ما يروح صفحة تانية) ========== */
SM.openScannerModal=function(onDetect){
  if(!(navigator.mediaDevices&&typeof navigator.mediaDevices.getUserMedia==='function'&&'BarcodeDetector' in window)){ toast('متصفحك مش بيدعم الكاميرا التلقائية','warning'); return; }
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📷 الماسح الداخلي</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body" style="text-align:center;"><video id="lgScanVideo" playsinline muted style="width:100%;max-height:58vh;border-radius:14px;background:#000;"></video><div class="text-xs text-muted" style="margin-top:8px;">وجّه الكاميرا على كارنيه الطالب أو باركود الباب</div></div>','modal-sm');
  var v=document.getElementById('lgScanVideo'); var stream=null, timer=null;
  var det=new BarcodeDetector({formats:['qr_code','code_128','ean_13']});
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(function(s){
    stream=s; v.srcObject=s; v.play();
    timer=setInterval(function(){
      try{ det.detect(v).then(function(codes){
        if(!codes.length) return;
        clearInterval(timer); try{ stream.getTracks().forEach(function(t){t.stop();}); }catch(e){}
        try{ navigator.vibrate&&navigator.vibrate(120); }catch(e){}
        ThemeManager.closeModal();
        var raw=String(codes[0].rawValue||'');
        if(onDetect) onDetect(raw); else SM.scanDefault(raw);
      }).catch(function(){}); }catch(e){}
    },500);
  }).catch(function(){ toast('إذن الكاميرا مرفوض','error'); ThemeManager.closeModal(); });
};
SM.scanDefault=function(raw){
  if(raw.indexOf('checkin.html')>=0){ location.href=raw; return; }
  var m=raw.match(/barcode=([\w-]+)/)||raw.match(/code=([\w-]+)/);
  var code=m?m[1]:raw;
  var u=cur();
  if(u&&u.role==='student'&&DataService.checkInByCode){ DataService.checkInByCode(u.id,code); toast('✅ تشيك-إن بالكود '+code,'success'); return; }
  toast('📖 قرأنا: '+code,'info');
};
function wrapStartScanner(){
  if(typeof window.startQRScanner==='function'&&!window.__lgScanWrap){
    window.__lgScanWrap=1;
    window.startQRScanner=function(){ SM.openScannerModal(); };
  }
}

/* ========== 📜 11+) سجل تدقيق موحّد ========== */
function installAudit(){
  if(!window.DataService||DataService.__lgAudit) return;
  DataService.__lgAudit=1;
  ['addUser','updateUser','addGroup','updateGroup','deleteGroup','addCenter','deleteCenter','addExam','addHomework'].forEach(function(fn){
    if(typeof DataService[fn]!=='function'||DataService[fn].__lgAud) return;
    var o=DataService[fn].bind(DataService);
    DataService[fn]=function(){
      var r=o.apply(this,arguments);
      try{
        var d=db(); d.auditLog=d.auditLog||[];
        var u=cur(); var arg=arguments[0];
        d.auditLog.push({id:'au_'+Date.now()+Math.random().toString(36).slice(2,5),at:new Date().toISOString(),by:u?u.name:'?',role:u?u.role:'?',action:fn,target:(arg&&arg.id)?arg.id:(typeof arg==='string'?arg:'')});
        if(d.auditLog.length>600) d.auditLog=d.auditLog.slice(-500);
        saveD(d);
      }catch(e){}
      return r;
    };
    DataService[fn].__lgAud=1;
  });
}
SM.openAuditLog=function(q){
  q=(q||'').toLowerCase();
  var list=(db().auditLog||[]).slice().reverse().filter(function(x){ return !q||((x.by||'')+(x.action||'')+(x.target||'')).toLowerCase().indexOf(q)>=0; }).slice(0,120);
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📜 سجل التدقيق</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<input type="text" class="form-input" style="margin-bottom:8px;" placeholder="🔍 ابحث باسم المستخدم أو العملية..." value="'+escS(q)+'" oninput="LG.openAuditLog(this.value)">'+
  '<div style="max-height:52vh;overflow-y:auto;">'+(list.length?list.map(function(x){
    return '<div class="sub-row" style="padding:7px 8px;"><div style="flex:1;min-width:0;"><strong style="font-size:12px;">'+escS(x.action)+'</strong> <span class="text-xs text-muted">'+escS(x.target||'')+'</span><div class="text-xs text-muted">👤 '+escS(x.by)+' ('+escS(x.role)+') · 🕐 '+escS(String(x.at).slice(0,16).replace('T',' '))+'</div></div></div>';
  }).join(''):'<p class="text-muted">مفيش عمليات مسجلة لسه</p>')+'</div></div>','modal-md');
};
function injectAuditBtn(){
  var sec=document.getElementById('section-logs'); if(!sec||sec.querySelector('#lgAuditBtn')) return;
  var hdr=sec.querySelector('.section-header div[style]')||sec.querySelector('.section-header');
  var b=document.createElement('button'); b.id='lgAuditBtn'; b.type='button'; b.className='btn btn-secondary btn-sm'; b.textContent='📜 سجل التدقيق';
  b.onclick=function(){ SM.openAuditLog(); };
  if(hdr) hdr.appendChild(b); else sec.appendChild(b);
}

/* ========== 🔌 إقلاع ========== */
function organize(){
  installGuard(); installDigest(); installAudit(); wrapAiWa(); wrapStartScanner();
  injectAiKeyCard(); injectDigestBtn(); injectAuditBtn(); injectBottomNav();
}
setTimeout(organize,1000);
tick('smartOrganize',organize,4000);
})();