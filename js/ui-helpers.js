// js/ui-helpers.js — أدوات مشتركة لكل الصفحات (نسخة كاملة مع نظام رفع الصور)
const UI = {
  // بحث داخل أي قائمة منسدلة
  attachSearch(sel){
    if(!sel||sel.dataset.searchable)return; sel.dataset.searchable='1';
    const wrap=document.createElement('div');wrap.className='search-bar';wrap.style.marginBottom='6px';
    const inp=document.createElement('input');inp.className='form-input';inp.placeholder='🔍 بحث...';
    wrap.appendChild(inp);sel.parentNode.insertBefore(wrap,sel);
    inp.addEventListener('input',()=>{const q=inp.value.toLowerCase();[...sel.options].forEach(o=>{o.style.display=(!q||o.text.toLowerCase().includes(q))?'':'none';});});
  },

  // ===== اختيار الوقت (select) بـ :00/:15/:30/:45 + AM/PM =====
  _pad(n){return (n<10?'0':'')+n;},
  timeLabel(hhmm){
    if(!hhmm)return '';
    const [h,m]=hhmm.split(':').map(Number);
    const period=h<12?'ص':'م';
    const note=h<12?'(بالنهار)':'(بعد الظهر)';
    let h12=h%12; if(h12===0)h12=12;
    return `${h12}:${this._pad(m)} ${period} ${note}`;
  },
  buildTimeOptions(selected){
    let html='';
    for(let h=0;h<24;h++){
      for(const m of [0,15,30,45]){
        const val=this._pad(h)+':'+this._pad(m);
        html+=`<option value="${val}" ${val===selected?'selected':''}>${this.timeLabel(val)}</option>`;
      }
    }
    return html;
  },
  timeSelect(id, selected, label){
    return `<div class="form-group"><label>${label||'الوقت'}</label><select id="${id}" class="form-select">${this.buildTimeOptions(selected)}</select></div>`;
  },

  // ===== صور Google Drive (تتعرض في المكان بدون سيرفر) =====
  driveId(url){
    if(!url)return null;
    let m=url.match(/\/d\/([a-zA-Z0-9_-]+)/)||url.match(/[?&]id=([a-zA-Z0-9_-]+)/)||url.match(/^([a-zA-Z0-9_-]{20,})$/);
    return m?m[1]:null;
  },
  driveImg(url, alt){
    const id=this.driveId(url);
    if(!id)return `<img src="${url}" alt="${alt||''}" style="max-width:100%;border-radius:10px;">`;
    return `<img src="https://drive.google.com/thumbnail?id=${id}&sz=w1600" alt="${alt||''}" style="max-width:100%;border-radius:10px;" onerror="this.src='${url}'">`;
  },
  driveLink(url){
    const id=this.driveId(url);
    return id?`https://drive.google.com/file/d/${id}/view`:url;
  },

  money(n){return (n||0)+' '+(EduFlowConfig?.billing?.currency||'ج.م');},

  // ===== تسوية مبسّطة =====
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
    return {
      group:g, students, cancelled, held, collected, perStudent, teacherShare, teacherDue,
      centerNet: collected-teacherDue,
      paidList: students.map(s=>{const p=pays.find(x=>x.studentId===s.id);return {student:s, paid:p?.paidAmount||0, due:Math.round(perStudent*(held/(g.sessionsPerMonth||4)))};})
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔄 أزرار المزامنة اليدوية
// ═══════════════════════════════════════════════════════════════
window.renderSyncButtons = function() {
  return `
    <div style="display:flex;gap:8px;margin:10px 0;flex-wrap:wrap;">
      <button class="btn btn-sm btn-primary" onclick="window.manualSync()">
        🔄 مزامنة
      </button>
      <button class="btn btn-sm btn-success" onclick="window.pushToCloud()">
        ⬆️ رفع للسحابة
      </button>
      <button class="btn btn-sm btn-info" onclick="window.pullFromCloud()">
        ⬇️ جلب من السحابة
      </button>
      <button class="btn btn-sm btn-ghost" onclick="window.showQueueInfo()">
        📦 الطابور (${FirebaseService?.getQueueSize?.() || 0})
      </button>
    </div>
  `;
};

window.manualSync = async function() {
  if(typeof safeToast === 'function') safeToast('🔄 جاري المزامنة...', 'info');
  const result = await FirebaseService.manualSync();
  if(typeof safeToast === 'function') safeToast(result.message, result.success ? 'success' : 'error');
};

window.pushToCloud = async function() {
  if(typeof safeToast === 'function') safeToast('⬆️ جاري الرفع...', 'info');
  const result = await FirebaseService.pushLocalToCloud();
  if(typeof safeToast === 'function') safeToast(result.message, result.success ? 'success' : 'error');
};

window.pullFromCloud = async function() {
  if(typeof safeToast === 'function') safeToast('⬇️ جاري الجلب...', 'info');
  const result = await FirebaseService.pullFromCloud();
  if(typeof safeToast === 'function') safeToast(result.success ? 'تم جلب البيانات بنجاح' : 'فشل الجلب', result.success ? 'success' : 'error');
};

window.showQueueInfo = function() {
  const size = FirebaseService?.getQueueSize?.() || 0;
  if(typeof ThemeManager?.openModal === 'function'){
    ThemeManager.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">📦 معلومات الطابور</h3>
        <button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p><strong>عدد العمليات المؤجلة:</strong> ${size}</p>
        <p><strong>حالة الاتصال:</strong> ${FirebaseService?.connected ? '✅ متصل' : '❌ غير متصل'}</p>
        ${size > 0 ? `
          <button class="btn btn-primary w-full" onclick="window.manualSync();ThemeManager.closeModal();" style="margin-top:10px;">
            🔄 مزامنة الآن
          </button>
        ` : ''}
      </div>
    `, 'modal-sm');
  }
};
/* ================================================================
   🖼️ IMAGE FIX SYSTEM v2 — إصلاح شامل لصور Drive
   ================================================================ */
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

// 🔒 قفل driveThumb على النسخة المحسّنة (منع الصفحات من استبداله بالنسخة القديمة)
(function(){
  const impl = function(url){ return window.resolveImageUrl(url, 400); };
  try{
    Object.defineProperty(window, 'driveThumb', {
      configurable: true,
      get: function(){ return impl; },
      set: function(){ /* تجاهل أي محاولة استبدال من الصفحات */ }
    });
  }catch(e){ window.driveThumb = impl; }
})();

// 🔄 مصحح تلقائي v2: يعطّل onerror الداخلي القاتل + يجرب كل المصادر بالترتيب
document.addEventListener('error', function(e){
  const t = e.target;
  if(!t || t.tagName !== 'IMG' || !t.src) return;
  const id = window.extractDriveId(t.src);
  if(!id) return;

  // تعطيل الـ onerror الداخلي اللي بيستبدل الصورة بحرف قبل ما نجرب البدائل
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

  // استنفدنا المحاولات → الملف غالبًا مش عام في Drive
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

// 🆕 وسم img ذكي للاستخدام في أي كود جديد
window.smartImg = function(url, cls, style, fallbackEmoji){
  const src = window.resolveImageUrl(url, 800);
  if(!src){
    return `<div class="${cls||''}" style="${style||''};display:flex;align-items:center;justify-content:center;background:var(--surface-hover);font-size:26px;">${fallbackEmoji||'🖼️'}</div>`;
  }
  return `<img src="${src}" class="${cls||''}" style="${style||''}" loading="lazy" alt="">`;
};

// 🧪 أداة تشخيص من الـ Console: testImage('رابط Drive هنا')
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

// 🆕 وسم img ذكي مع سلسلة احتياطية
window.smartImg = function(url, cls, style, fallbackEmoji){
  const src = window.resolveImageUrl(url, 800);
  if(!src){
    return `<div class="${cls||''}" style="${style||''};display:flex;align-items:center;justify-content:center;background:var(--surface-hover);font-size:26px;">${fallbackEmoji||'🖼️'}</div>`;
  }
  return `<img src="${src}" class="${cls||''}" style="${style||''}" loading="lazy" alt="">`;
};

// ═══════════════════════════════════════════════════════════════
// ☁️ UPLOAD SYSTEM — رفع صور على Firebase Storage
// ═══════════════════════════════════════════════════════════════

/**
 * رفع صورة إلى Firebase Storage
 * @param {File} file - الملف المرفوع
 * @param {string} folder - المجلد (اختياري)
 * @returns {Promise<string>} رابط الصورة المرفوعة
 */
window.uploadImageToStorage = async function(file, folder){
  if(!window.firebase || !firebase.apps.length){
    throw new Error('Firebase غير مهيأ - تأكد من تحميل firebase-storage-compat.js');
  }
  if(!firebase.storage){
    throw new Error('أضف سكربت firebase-storage-compat.js في الصفحة');
  }
  if(!file){
    throw new Error('لا يوجد ملف للرفع');
  }
  
  const folderName = folder || 'eduflow-images';
  const timestamp = Date.now();
  const safeName = (file.name || 'image').replace(/[^\w.\-]/g, '_');
  const fileName = `${folderName}/${timestamp}_${safeName}`;
  
  try {
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(fileName);
    const snapshot = await fileRef.put(file);
    const downloadURL = await snapshot.ref.getDownloadURL();
    return downloadURL;
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('فشل الرفع: ' + (error.message || 'خطأ غير معروف'));
  }
};

/**
 * فتح مودال رفع الصور الذكي
 * @param {Function} onDone - دالة تُستدعى عند نجاح الرفع (ترسل الرابط)
 * @param {string} title - عنوان المودال (اختياري)
 */
window.openImageUploadModal = function(onDone, title){
  window._uploadCallback = onDone;
  
  const modalHTML = `
    <div class="modal-header">
      <h3 class="modal-title">📸 ${title || 'رفع صورة'}</h3>
      <button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="filter-info" style="margin-bottom:16px;">
        💡 <strong>طريقتان للرفع:</strong>
        <br>1. ارفع صورة من جهازك (تتحفظ على Firebase Storage)
        <br>2. الصق رابط صورة مباشرة (Drive أو أي رابط آخر)
      </div>
      
      <div class="form-group">
        <label>📁 صورة من الجهاز</label>
        <input type="file" id="uploadFileInput" accept="image/*" class="form-input">
      </div>
      
      <div id="uploadPreview" style="margin:12px auto;max-width:220px;text-align:center;"></div>
      
      <div class="form-group" style="margin-top:16px;">
        <label>🔗 أو رابط خارجي</label>
        <input type="text" id="uploadUrlInput" class="form-input" placeholder="https://... أو رابط Google Drive">
      </div>
      
      <div class="filter-info" style="background:var(--warning-bg);border-color:var(--warning);margin-top:12px;">
        ⚠️ <strong>ملاحظة لصور Drive:</strong> يجب أن يكون الملف "عام" (Anyone with the link) حتى تظهر الصورة بشكل صحيح.
      </div>
      
      <button class="btn btn-primary w-full" style="margin-top:16px;padding:14px;font-size:15px;" onclick="window.confirmImageUpload()">
        ✅ اعتماد الصورة
      </button>
    </div>
  `;
  
  if(typeof ThemeManager?.openModal === 'function'){
    ThemeManager.openModal(modalHTML, 'modal-md');
    
    // إضافة listener لمعاينة الصورة المرفوعة
    setTimeout(() => {
      const fileInput = document.getElementById('uploadFileInput');
      if(fileInput){
        fileInput.addEventListener('change', function(e){
          const file = e.target.files[0];
          if(!file) return;
          
          const reader = new FileReader();
          reader.onload = function(ev){
            const preview = document.getElementById('uploadPreview');
            if(preview){
              preview.innerHTML = `<img src="${ev.target.result}" style="width:100%;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.2);">`;
            }
          };
          reader.readAsDataURL(file);
        });
      }
    }, 200);
  }
};

/**
 * تأكيد الرفع واعتماد الصورة
 */
window.confirmImageUpload = async function(){
  try {
    const fileInput = document.getElementById('uploadFileInput');
    const urlInput = document.getElementById('uploadUrlInput');
    
    let finalUrl = '';
    
    // الأولوية للملف المرفوع
    if(fileInput && fileInput.files && fileInput.files[0]){
      if(typeof safeToast === 'function') safeToast('⏳ جاري الرفع للسحابة...', 'info');
      
      try {
        finalUrl = await window.uploadImageToStorage(fileInput.files[0], 'eduflow-images');
      } catch (uploadError) {
        if(typeof safeToast === 'function') safeToast('فشل الرفع: ' + uploadError.message, 'error');
        return;
      }
    } 
    // أو الرابط المباشر
    else if(urlInput && urlInput.value.trim()){
      finalUrl = urlInput.value.trim();
    } 
    // لا يوجد أي منهما
    else {
      if(typeof safeToast === 'function') safeToast('اختار صورة أو اكتب رابط', 'error');
      return;
    }
    
    // إغلاق المودال
    if(typeof ThemeManager?.closeModal === 'function'){
      ThemeManager.closeModal();
    }
    
    // استدعاء الدالة المحددة
    if(typeof window._uploadCallback === 'function'){
      window._uploadCallback(finalUrl);
    }
    
    if(typeof safeToast === 'function') safeToast('✅ تم اعتماد الصورة', 'success');
    
  } catch (error) {
    console.error('Confirm upload error:', error);
    if(typeof safeToast === 'function') safeToast('فشل الرفع: ' + error.message, 'error');
  }
};

/**
 * 🆕 زر رفع صورة جاهز (يمكن استخدامه في أي مكان)
 * @param {string} inputId - ID حقل الإدخال الذي سيستقبل الرابط
 * @param {string} previewId - ID عنصر المعاينة (اختياري)
 * @param {string} title - عنوان المودال (اختياري)
 */
window.createUploadButton = function(inputId, previewId, title){
  return `
    <button type="button" class="btn btn-secondary btn-sm" onclick="window.openImageUploadModal(function(url){
      const input = document.getElementById('${inputId}');
      if(input) input.value = url;
      ${previewId ? `
        const preview = document.getElementById('${previewId}');
        if(preview) {
          const resolvedUrl = window.resolveImageUrl(url, 400);
          preview.innerHTML = '<img src=\"' + resolvedUrl + '\" style=\"max-width:200px;border-radius:10px;margin-top:8px;\">';
        }
      ` : ''}
    }, '${title || 'رفع صورة'}')">
      📸 رفع صورة
    </button>
  `;
};

// ═══════════════════════════════════════════════════════════════
// 📋 تصدير UI
// ═══════════════════════════════════════════════════════════════
window.UI = UI;

console.log('✅ UI Helpers loaded with Image Upload System');