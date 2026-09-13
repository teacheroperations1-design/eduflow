// js/ui-helpers.js — أدوات مشتركة + إصلاح الصور + الرفع + سد فجوات Ops (نسخة نهائية)
const UI = {
  attachSearch(sel){
    if(!sel||sel.dataset.searchable)return; sel.dataset.searchable='1';
    const wrap=document.createElement('div');wrap.className='search-bar';wrap.style.marginBottom='6px';
    const inp=document.createElement('input');inp.className='form-input';inp.placeholder='🔍 بحث...';
    wrap.appendChild(inp);sel.parentNode.insertBefore(wrap,sel);
    inp.addEventListener('input',()=>{const q=inp.value.toLowerCase();[...sel.options].forEach(o=>{o.style.display=(!q||o.text.toLowerCase().includes(q))?'':'none';});});
  },
  _pad(n){return (n<10?'0':'')+n;},
  timeLabel(hhmm){
    if(!hhmm)return '';
    const [h,m]=hhmm.split(':').map(Number);
    const period=h<12?'ص':'م';
    let h12=h%12; if(h12===0)h12=12;
    return `${h12}:${this._pad(m)} ${period}`;
  },
  buildTimeOptions(selected){
    let html='';
    for(let h=0;h<24;h++){ for(const m of [0,15,30,45]){ const val=this._pad(h)+':'+this._pad(m); html+=`<option value="${val}" ${val===selected?'selected':''}>${this.timeLabel(val)}</option>`; } }
    return html;
  },
  timeSelect(id, selected, label){
    return `<div class="form-group"><label>${label||'الوقت'}</label><select id="${id}" class="form-select">${this.buildTimeOptions(selected)}</select></div>`;
  },
  driveId(url){
    if(!url)return null;
    let m=url.match(/\/d\/([a-zA-Z0-9_-]+)/)||url.match(/[?&]id=([a-zA-Z0-9_-]+)/)||url.match(/^([a-zA-Z0-9_-]{20,})$/);
    return m?m[1]:null;
  },
  driveImg(url, alt){
    const src = window.resolveImageUrl ? window.resolveImageUrl(url, 800) : url;
    return `<img src="${src}" alt="${alt||''}" style="max-width:100%;border-radius:10px;">`;
  },
  driveLink(url){
    const id=this.driveId(url);
    return id?`https://drive.google.com/file/d/${id}/view`:url;
  },
  money(n){return (n||0)+' '+(window.EduFlowConfig?.billing?.currency||'ج.م');},
  settlement(groupId, month){
    const g=DataService.getGroups().find(x=>x.id===groupId); if(!g)return null;
    const students=DataService.getStudentsByGroup(groupId);
    const cancelled=DataService.getCancelledSessions().filter(c=>c.groupId===groupId&&c.date?.startsWith(month)).length;
    const held=Math.max(0,(g.sessionsPerMonth||4)-cancelled);
    const pays=DataService.getPayments().filter(p=>p.month===month&&students.some(s=>s.id===p.studentId));
    const collected=pays.reduce((s,p)=>s+(p.paidAmount||0),0);
    const perStudent=g.monthlyFee||0;
    const teacherShare=g.teacherSharePerStudent||0;
    const teacherDue=Math.round(teacherShare*students.length*(held/(g.sessionsPerMonth||4)));
    return { group:g, students, cancelled, held, collected, perStudent, teacherShare, teacherDue, centerNet: collected-teacherDue,
      paidList: students.map(s=>{const p=pays.find(x=>x.studentId===s.id);return {student:s, paid:p?.paidAmount||0, due:Math.round(perStudent*(held/(g.sessionsPerMonth||4)))};}) };
  }
};

// ═══════════════ أزرار المزامنة ═══════════════
window.renderSyncButtons = function() {
  return `
    <div style="display:flex;gap:8px;margin:10px 0;flex-wrap:wrap;">
      <button class="btn btn-sm btn-primary" onclick="window.manualSync()">🔄 مزامنة</button>
      <button class="btn btn-sm btn-success" onclick="window.pushToCloud()">⬆️ رفع للسحابة</button>
      <button class="btn btn-sm btn-ghost" onclick="window.showQueueInfo()">📦 الطابور (${FirebaseService?.getQueueSize?.() || 0})</button>
    </div>`;
};
window.manualSync = async function() {
  if(typeof safeToast==='function') safeToast('🔄 جاري المزامنة...', 'info');
  const result = await FirebaseService.manualSync();
  if(typeof safeToast==='function') safeToast(result.message, result.success ? 'success' : 'error');
};
window.pushToCloud = async function() {
  if(typeof safeToast==='function') safeToast('⬆️ جاري الرفع...', 'info');
  const result = await FirebaseService.pushLocalToCloud();
  if(typeof safeToast==='function') safeToast(result.message, result.success ? 'success' : 'error');
};
window.showQueueInfo = function() {
  const size = FirebaseService?.getQueueSize?.() || 0;
  if(typeof ThemeManager?.openModal === 'function'){
    ThemeManager.openModal(`
      <div class="modal-header"><h3 class="modal-title">📦 معلومات الطابور</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>
      <div class="modal-body">
        <p><strong>عدد العمليات المؤجلة:</strong> ${size}</p>
        <p><strong>حالة الاتصال:</strong> ${FirebaseService?.connected ? '✅ متصل' : '❌ غير متصل'}</p>
        ${size > 0 ? `<button class="btn btn-primary w-full" onclick="window.manualSync();ThemeManager.closeModal();" style="margin-top:10px;">🔄 مزامنة الآن</button>` : ''}
      </div>`, 'modal-sm');
  }
};

// ═══════════════ 🖼️ IMAGE FIX SYSTEM v2 ═══════════════
window.extractDriveId = function(url){
  try{
    if(!url) return null;
    const u = String(url).trim();
    let m = u.match(/\/d\/([\w-]{10,})/);
    if(!m) m = u.match(/[?&]id=([\w-]{10,})/);
    if(!m) m = u.match(/open\?id=([\w-]{10,})/);
    if(!m) m = u.match(/^([\w-]{25,45})$/);
    return m ? m[1] : null;
  }catch(e){ return null; }
};

window.resolveImageUrl = function(url, size){
  if(!url) return '';
  const id = window.extractDriveId(url);
  if(id) return 'https://lh3.googleusercontent.com/d/' + id + (size ? ('=w'+size) : '');
  return String(url).trim();
};

// 🔒 قفل driveThumb — أي صفحة تحاول تعرفه من جديد هتتجاهل
(function(){
  const impl = function(url){ return window.resolveImageUrl(url, 400); };
  try{
    Object.defineProperty(window, 'driveThumb', {
      configurable: true,
      get: function(){ return impl; },
      set: function(){ /* تجاهل */ }
    });
  }catch(e){ window.driveThumb = impl; }
})();

// 🔄 مصحح تلقائي: أي صورة Drive تكسر → جرّب سلسلة مصادر بديلة
document.addEventListener('error', function(e){
  const t = e.target;
  if(!t || t.tagName !== 'IMG' || !t.src) return;
  const id = window.extractDriveId(t.src);
  if(!id) return;
  try{ t.removeAttribute('onerror'); t.onerror = null; }catch(err){}
  const chain = [
    'https://lh3.googleusercontent.com/d/' + id,
    'https://lh3.googleusercontent.com/d/' + id + '=w800',
    'https://drive.google.com/thumbnail?id=' + id + '&sz=w800'
  ];
  const tried = (t.dataset.fbTried || '').split('|').filter(Boolean);
  const next = chain.find(c => !tried.includes(c));
  if(next){
    tried.push(next);
    t.dataset.fbTried = tried.join('|');
    t.src = next;
    return;
  }
  if(!t.dataset.fbDone){
    t.dataset.fbDone = '1';
    const ph = document.createElement('div');
    ph.className = t.className;
    ph.setAttribute('style', (t.getAttribute('style')||'') + ';display:flex;align-items:center;justify-content:center;background:var(--surface-hover);border:1px dashed var(--border);border-radius:10px;min-width:40px;min-height:40px;font-size:20px;');
    ph.textContent = '🖼️';
    ph.title = 'الصورة غير عامة في Drive — فعّل "أي شخص لديه الرابط"';
    try{ t.replaceWith(ph); }catch(err){ t.style.display='none'; }
  }
}, true);

window.smartImg = function(url, cls, style, fallbackEmoji){
  const src = window.resolveImageUrl(url, 800);
  if(!src){
    return `<div class="${cls||''}" style="${style||''};display:flex;align-items:center;justify-content:center;background:var(--surface-hover);font-size:26px;">${fallbackEmoji||'🖼️'}</div>`;
  }
  return `<img src="${src}" class="${cls||''}" style="${style||''}" loading="lazy" alt="">`;
};

window.testImage = function(url){
  const id = window.extractDriveId(url);
  const chain = id ? [
    'https://lh3.googleusercontent.com/d/' + id,
    'https://lh3.googleusercontent.com/d/' + id + '=w800',
    'https://drive.google.com/thumbnail?id=' + id + '&sz=w800'
  ] : [url];
  console.log('🧪 اختبار الصورة — الـ ID:', id);
  chain.forEach(src => {
    const i = new Image();
    i.onload = () => console.log('✅ يشتغل:', src);
    i.onerror = () => console.log('❌ فشل:', src);
    i.src = src;
  });
};

// ═══════════════ ☁️ UPLOAD SYSTEM (Firebase Storage) ═══════════════
window.uploadImageToStorage = async function(file, folder){
  if(!window.firebase || !firebase.apps.length) throw new Error('Firebase غير مهيأ');
  if(!firebase.storage) throw new Error('أضف سكربت firebase-storage-compat.js في الصفحة');
  if(!file) throw new Error('لا يوجد ملف');
  const name = (folder||'eduflow-images') + '/' + Date.now() + '_' + (file.name||'image').replace(/[^\w.\-]/g,'_');
  const snap = await firebase.storage().ref(name).put(file);
  return await snap.ref.getDownloadURL();
};

window.openImageUploadModal = function(onDone, title){
  window._uploadCallback = onDone;
  ThemeManager.openModal(`
    <div class="modal-header"><h3 class="modal-title">📸 ${title||'رفع صورة'}</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="filter-info" style="margin-bottom:16px;">💡 ارفع صورة من جهازك (تتحفظ على Firebase Storage) أو الصق رابط صورة / رابط Drive عام.</div>
      <div class="form-group"><label>📁 صورة من الجهاز</label><input type="file" id="uploadFileInput" accept="image/*" class="form-input"></div>
      <div id="uploadPreview" style="margin:12px auto;max-width:220px;text-align:center;"></div>
      <div class="form-group" style="margin-top:16px;"><label>🔗 أو رابط خارجي</label><input type="text" id="uploadUrlInput" class="form-input" placeholder="https://... أو رابط Drive"></div>
      <button class="btn btn-primary w-full" style="margin-top:16px;padding:14px;" onclick="window.confirmImageUpload()">✅ اعتماد الصورة</button>
    </div>`);
  setTimeout(() => {
    const fi = document.getElementById('uploadFileInput');
    if(fi) fi.addEventListener('change', function(e){
      const f = e.target.files[0]; if(!f) return;
      const r = new FileReader();
      r.onload = ev => { const p=document.getElementById('uploadPreview'); if(p) p.innerHTML = `<img src="${ev.target.result}" style="width:100%;border-radius:12px;">`; };
      r.readAsDataURL(f);
    });
  }, 200);
};

window.confirmImageUpload = async function(){
  try{
    const fileInput = document.getElementById('uploadFileInput');
    const urlInput  = document.getElementById('uploadUrlInput');
    let finalUrl = '';
    if(fileInput && fileInput.files && fileInput.files[0]){
      if(typeof safeToast==='function') safeToast('⏳ جاري الرفع للسحابة...', 'info');
      finalUrl = await window.uploadImageToStorage(fileInput.files[0], 'eduflow-images');
    } else if(urlInput && urlInput.value.trim()){
      finalUrl = urlInput.value.trim();
    } else {
      if(typeof safeToast==='function') safeToast('اختار صورة أو اكتب رابط', 'error');
      return;
    }
    ThemeManager.closeModal();
    if(typeof window._uploadCallback === 'function') window._uploadCallback(finalUrl);
    if(typeof safeToast==='function') safeToast('✅ تم اعتماد الصورة', 'success');
  }catch(e){
    console.error('Upload error:', e);
    if(typeof safeToast==='function') safeToast('فشل الرفع: ' + e.message, 'error');
  }
};

window.createUploadButton = function(inputId, previewId, title){
  return `<button type="button" class="btn btn-secondary btn-sm" onclick="window.openImageUploadModal(function(url){
    const input = document.getElementById('${inputId}');
    if(input) input.value = url;
    ${previewId ? `const preview = document.getElementById('${previewId}');
    if(preview) preview.innerHTML = '<img src=\\'' + window.resolveImageUrl(url, 400) + '\\' style=\\'max-width:200px;border-radius:10px;margin-top:8px;\\'>';` : ''}
  }, '${title || 'رفع صورة'}')">📸 رفع صورة</button>`;
};

// ═══════════════ 🩹 سد فجوات Ops (تمنع رسالة "الخدمة غير متوفرة") ═══════════════
(function(){
  if(typeof window.Ops === 'undefined') window.Ops = {};
  const D = () => { try{ return (window.DataService && DataService._getData) ? DataService._getData() : {}; }catch(e){ return {}; } };
  const S = d => { if(window.DataService && DataService._saveData) DataService._saveData(d); };
  const FB = () => window.FirebaseService?.initialized;

  Ops.getBranding = Ops.getBranding || function(){ return D().branding || {}; };
  Ops.saveBranding = Ops.saveBranding || async function(data){
    const d = D(); d.branding = Object.assign({}, data, { updatedAt: new Date().toISOString() }); S(d);
    try{ localStorage.setItem('eduflow_branding', JSON.stringify(d.branding)); }catch(e){}
    if(FB()) await FirebaseService.saveMeta('branding', d.branding);
    return { success: true };
  };
  Ops.getFeatures = Ops.getFeatures || function(){ return D().features || {}; };
  Ops.saveFeatures = Ops.saveFeatures || async function(f){
    const d = D(); d.features = f; S(d);
    if(FB()) await FirebaseService.saveMeta('features', f);
    return { success: true };
  };
  Ops.getPointsRules = Ops.getPointsRules || function(){
    return D().pointsRules || { attendance:1, homework:2, exam:3, evaluation:2, interaction:1, perfectAttendance:10 };
  };
  Ops.savePointsRules = Ops.savePointsRules || async function(rules){
    const d = D(); d.pointsRules = Object.assign({}, rules, { updatedAt: new Date().toISOString() }); S(d);
    if(FB()) await FirebaseService.saveMeta('pointsRules', d.pointsRules);
    return { success: true };
  };
  Ops.getWhatsAppTemplateById = Ops.getWhatsAppTemplateById || function(id){
    return (D().whatsappTemplates||[]).find(t=>t.id===id) || null;
  };
  Ops.addWhatsAppTemplate = Ops.addWhatsAppTemplate || async function(data){
    const d = D(); d.whatsappTemplates = d.whatsappTemplates || [];
    const id = 'tpl_' + Date.now();
    const rec = Object.assign({ id, createdAt: new Date().toISOString() }, data);
    d.whatsappTemplates.push(rec); S(d);
    if(FB()) await FirebaseService.saveDoc('whatsappTemplates', id, rec);
    return rec;
  };
  Ops.updateWhatsAppTemplate = Ops.updateWhatsAppTemplate || async function(id, updates){
    const d = D(); const t = (d.whatsappTemplates||[]).find(x=>x.id===id);
    if(!t) return null;
    Object.assign(t, updates, { updatedAt: new Date().toISOString() }); S(d);
    if(FB()) await FirebaseService.saveDoc('whatsappTemplates', id, t);
    return t;
  };
  Ops.deleteWhatsAppTemplate = Ops.deleteWhatsAppTemplate || async function(id){
    const d = D(); d.whatsappTemplates = (d.whatsappTemplates||[]).filter(t=>t.id!==id); S(d);
    if(FB()) await FirebaseService.deleteDoc('whatsappTemplates', id);
  };
  console.log('✅ Ops bridge loaded — سد فجوات الخدمات');
})();

window.UI = UI;
console.log('✅ UI Helpers loaded with Image Upload System');