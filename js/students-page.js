/* ================================================================
📋 Students Page Unified V2 — صفحة طلاب موحدة ومحسّنة (أدمن/مساعد/مدرس)
• نفس الترتيب والمنطق: فلاتر فوق → جدول تحت
• فلتر الأساتذة المتعدد (تقاطع المشتركين) + سنتر/مرحلة/صف/بحث/نواقص
• ترقيم + رقمين (طالب/ولي أمر) + شارة نواقص + نقاط
• 🆕 تصميم متجاوب للهاتف (بطاقات) + زر طباعة باركودات + منع فقدان التركيز + حصر الهاتف في 11 رقم
================================================================ */
(function(){
"use strict";

/* ========== 1. الثوابت والدوال المساعدة ========== */
function db(){ return (window.DataService && DataService._getData) ? DataService._getData() : {}; }
function cur(){ try{ return (typeof currentUser!=='undefined' && currentUser) ? currentUser : ((window.AuthService && AuthService.getCurrentUser) ? AuthService.getCurrentUser() : null); }catch(e){ return null; } }
function nmz(x){ return String(x||'').toLowerCase().replace(/\s+/g,' ').trim(); }
function ens(sid){ try{ return (DataService.getStudentTeachers ? DataService.getStudentTeachers(sid) : []) || []; }catch(e){ return []; } }
function lv(){ return (typeof EduFlowConfig!=='undefined' && EduFlowConfig.educationLevels) ? EduFlowConfig.educationLevels : {}; }
function isAdmin(){ var u=cur(); return u && (u.role==='admin' || u.role==='super_admin'); }

function missingOf(s){
    var m=[];
    if(!s.name || nmz(s.name).split(' ').length < 3) m.push('الاسم غير كامل');
    if(!s.parentPhone) m.push('رقم ولي الأمر');
    if(!s.phone) m.push('رقم الطالب');
    if(!s.grade) m.push('الصف');
    if(!s.stage) m.push('المرحلة');
    if(!s.code) m.push('الكود');
    if(!ens(s.id).length) m.push('غير مقيّد في مجموعة');
    return m;
}

var SP = window._spState = window._spState || { t:[], c:'', st:'', g:'', m:'', q:'' };

/* ========== 2. منطق جلب وتصفية البيانات ========== */
function baseStudents(){
    var all = (DataService.getStudents ? DataService.getStudents() : []);
    var u = cur();
    if(u && u.role === 'assistant'){
        var tid = (window.getMyTeacherId ? window.getMyTeacherId() : null);
        var gids = {};
        (DataService.getGroups ? DataService.getGroups() : []).forEach(function(g){ if(!tid || g.teacherId === tid) gids[g.id] = 1; });
        all = all.filter(function(s){ return ens(s.id).some(function(e){ return e.group && gids[e.group.id]; }); });
    } else if(u && u.role === 'teacher'){
        all = all.filter(function(s){ return ens(s.id).some(function(e){ return e.teacher && e.teacher.id === u.id; }); });
    }
    return all;
}

function filtered(){
    var list = baseStudents();
    if(SP.t.length){
        list = list.filter(function(s){
            var tids = ens(s.id).map(function(e){ return e.teacher && e.teacher.id; });
            return SP.t.every(function(t){ return tids.indexOf(t) >= 0; });
        });
    }
    if(SP.c) list = list.filter(function(s){ return ens(s.id).some(function(e){ return e.group && (e.group.center||'') === SP.c; }); });
    if(SP.st) list = list.filter(function(s){ return (s.stage||'') === SP.st; });
    if(SP.g) list = list.filter(function(s){ var gv=String(s.grade||''); return gv===SP.g || gv.indexOf(SP.g)>=0 || SP.g.indexOf(gv)>=0; });
    
    if(SP.m){
        list = list.filter(function(s){
            var miss = missingOf(s);
            if(SP.m==='any') return miss.length > 0;
            if(SP.m==='ok') return miss.length === 0;
            if(SP.m==='parent') return !s.parentPhone;
            if(SP.m==='phone') return !s.phone;
            if(SP.m==='grade') return !s.grade || !s.stage;
            if(SP.m==='group') return !ens(s.id).length;
            if(SP.m==='name') return nmz(s.name).split(' ').length < 3;
            return true;
        });
    }
    
    var q = nmz(SP.q);
    if(q) list = list.filter(function(s){ 
        return nmz(s.name).indexOf(q)>=0 || nmz(s.code).indexOf(q)>=0 || String(s.phone||'').indexOf(q)>=0 || String(s.parentPhone||'').indexOf(q)>=0; 
    });
    
    list.sort(function(a,b){ return String(a.name||'').localeCompare(String(b.name||''), 'ar'); });
    return list;
}

/* ========== 3. حقن CSS المحسّن (موبايل + طباعة) ========== */
if(!document.getElementById('spCss')){
    var sst = document.createElement('style');
    sst.id = 'spCss';
    sst.textContent = 
    '.sp-filters-card{padding:14px;margin-bottom:14px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);overflow:visible!important;position:relative;z-index:5;}' +
    '.sp-filters-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;}' +
    '.sp-drop-menu{background:var(--surface);border:1px solid var(--primary-border);border-radius:10px;padding:8px;max-height:260px;overflow:auto;box-shadow:0 16px 40px rgba(0,0,0,0.15);z-index:9999;}' +
    '.sp-wrap{overflow-x:auto;border-radius:12px;border:1px solid var(--border);background:var(--surface);}' +
    '.sp-table{width:100%;border-collapse:collapse;min-width:900px;}' +
    '.sp-table th{background:var(--surface-hover);padding:12px 10px;font-size:12px;font-weight:800;color:var(--text-muted);text-align:right;border-bottom:2px solid var(--border);}' +
    '.sp-table td{padding:12px 10px;font-size:13px;border-bottom:1px solid var(--border);vertical-align:middle;transition:background .15s;}' +
    '.sp-table tbody tr:hover{background:var(--primary-bg);}' +
    '.sp-badge-miss{cursor:help;animation:spPulse 2s infinite;}' +
    '@keyframes spPulse{0%,100%{opacity:1}50%{opacity:.7}}' +
    
    /* 📱 تصميم الموبايل */
    '@media(max-width:768px){' +
        '.sp-filters-grid{grid-template-columns:1fr !important;}' +
        '.sp-wrap{overflow:visible;border:none;background:transparent;}' +
        '.sp-table{min-width:0;display:block;}' +
        '.sp-table thead{display:none;}' +
        '.sp-table tbody tr{display:block;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);}' +
        '.sp-table td{display:flex;justify-content:space-between;align-items:center;border:none;padding:6px 0;font-size:12px;}' +
        '.sp-table td::before{content:attr(data-label);font-weight:800;color:var(--text-muted);font-size:11px;flex-shrink:0;margin-inline-end:8px;}' +
        '.sp-table td:last-child{justify-content:flex-end;margin-top:8px;padding-top:8px;border-top:1px dashed var(--border);}' +
        '.sp-table td:last-child::before{display:none;}' +
    '}' +

    /* 🖨️ تصميم الطباعة */
    '@media print{' +
        '.no-print, .sp-drop-menu, .btn, .sp-filters-card{display:none !important;}' +
        'body{background:white !important;color:black !important;}' +
        '.sp-wrap{border:1px solid #000;overflow:visible;background:white !important;}' +
        '.sp-table{min-width:100%;font-size:10pt !important;}' +
        '.sp-table th{background:#f3f4f6 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;border-bottom:2px solid #000;}' +
        '.sp-table td{border-bottom:1px solid #ccc;color:#000 !important;}' +
        '.sp-table tbody tr:hover{background:transparent !important;}' +
    '}';
    document.head.appendChild(sst);
}

/* ========== 4. بناء واجهة الفلاتر ========== */
function filtersHtml(){
    var centers={}; (DataService.getGroups?DataService.getGroups():[]).forEach(function(g){ if(g.center) centers[g.center]=1; });
    var grades=[]; Object.keys(lv()).forEach(function(k){ (lv()[k].grades||[]).forEach(function(g){ if(grades.indexOf(g)<0) grades.push(g); }); });
    
    var h = '<div class="card sp-filters-card">';
    h += '<div class="sp-filters-grid">';
    
    if(isAdmin()){
        h += '<div id="stuMultiTeacherWrap" class="form-group" style="margin:0;position:relative;overflow:visible!important;">' +
             '<label>👨‍🏫 فلتر الأساتذة (المشتركين)</label>' +
             '<input type="text" class="form-input" readonly style="cursor:pointer;" placeholder="اختر للمقارنة..." value="'+(SP.t.length ? SP.t.length+' أستاذ' : 'الكل')+'" onclick="window.spDrop()">' +
             '<div id="spTDrop" class="sp-drop-menu" style="display:none;position:fixed;">' +
             (DataService.getTeachers?DataService.getTeachers():[]).map(function(t){
                 var cnt = (DataService.getGroups?DataService.getGroups():[]).filter(function(g){ return g.teacherId===t.id; }).length;
                 return '<label style="display:flex;gap:8px;align-items:center;padding:8px;cursor:pointer;border-radius:8px;background:var(--surface-hover);margin-bottom:4px;transition:background .15s;" onmouseover="this.style.background=\'var(--primary-bg)\'" onmouseout="this.style.background=\'var(--surface-hover)\'">' +
                        '<input type="checkbox" style="width:16px;height:16px;accent-color:var(--primary);" '+(SP.t.indexOf(t.id)>=0?'checked':'')+' onchange="window.spToggleTeacher(\''+t.id+'\')">' +
                        '<span style="font-size:12px;font-weight:700;flex:1;">'+t.name+'</span>' +
                        '<span class="badge badge-muted" style="font-size:10px;">'+cnt+' مجموعة</span></label>';
             }).join('') +
             '</div></div>';
    }
    
    h += '<div class="form-group" style="margin:0;"><label>🏢 السنتر</label><select class="form-select" onchange="window.spSet(\'c\',this.value)"><option value="">كل السناتر</option>'+Object.keys(centers).map(function(c){return '<option value="'+c+'" '+(SP.c===c?'selected':'')+'>'+c+'</option>';}).join('')+'</select></div>';
    h += '<div class="form-group" style="margin:0;"><label>🎯 المرحلة</label><select class="form-select" onchange="window.spSet(\'st\',this.value)"><option value="">كل المراحل</option>'+Object.keys(lv()).map(function(k){return '<option value="'+k+'" '+(SP.st===k?'selected':'')+'>'+lv()[k].nameAr+'</option>';}).join('')+'</select></div>';
    h += '<div class="form-group" style="margin:0;"><label>🎓 الصف</label><select class="form-select" onchange="window.spSet(\'g\',this.value)"><option value="">كل الصفوف</option>'+grades.map(function(g){return '<option value="'+g+'" '+(SP.g===g?'selected':'')+'>'+g+'</option>';}).join('')+'</select></div>';
    h += '<div class="form-group" style="margin:0;"><label>⚠️ النواقص</label><select class="form-select" onchange="window.spSet(\'m\',this.value)"><option value="">✅ الكل</option><option value="any" '+(SP.m==='any'?'selected':'')+'>أي بيانات ناقصة</option><option value="parent" '+(SP.m==='parent'?'selected':'')+'>رقم ولي الأمر</option><option value="phone" '+(SP.m==='phone'?'selected':'')+'>رقم الطالب</option><option value="grade" '+(SP.m==='grade'?'selected':'')+'>الصف/المرحلة</option><option value="group" '+(SP.m==='group'?'selected':'')+'>غير مقيّد</option><option value="name" '+(SP.m==='name'?'selected':'')+'>الاسم غير كامل</option><option value="ok" '+(SP.m==='ok'?'selected':'')+'>السليمين فقط</option></select></div>';
    h += '<div class="form-group" style="margin:0;"><label>🔍 بحث سريع</label><input type="text" class="form-input" placeholder="اسم / كود / رقم..." value="'+(SP.q||'')+'" oninput="window.spSet(\'q\',this.value)"></div>';
    h += '</div>'; // end grid

    if(isAdmin() && SP.t.length){
        h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px dashed var(--border);">'+
             SP.t.map(function(tid){ var t=DataService.getUserById?DataService.getUserById(tid):null; return '<span class="badge badge-info" style="padding:4px 8px;">'+(t?t.name:tid)+' <b style="cursor:pointer;margin-inline-start:4px;" onclick="window.spToggleTeacher(\''+tid+'\')">✕</b></span>'; }).join('') +
             '<span class="text-xs text-muted" style="align-self:center;">(عرض المشتركين فقط)</span></div>';
    }
    
    h += '<div class="no-print" style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);flex-wrap:wrap;gap:8px;">' +
         '<div class="text-xs text-muted">معروض: <b id="spCount" style="color:var(--primary);font-size:14px;">-</b> طالب · ⚠️ ناقص بيانات: <b id="spMiss" style="color:var(--warning);font-size:14px;">-</b></div>' +
         '<div style="display:flex;gap:8px;">' +
         '<button class="btn btn-primary btn-sm" onclick="window.open(\'print-qr.html\',\'_blank\')" title="طباعة باركودات الطلاب">📱 طباعة باركودات</button>' +
         '</div></div>';
    h += '</div>';
    return h;
}

/* ========== 5. بناء الجدول ========== */
function tableHtml(list){
    if(!list.length) {
        return '<div class="card" style="text-align:center;padding:40px;"><div style="font-size:48px;margin-bottom:12px;">🔍</div><strong style="font-size:16px;">لا يوجد طلاب مطابقين للفلاتر</strong><div class="text-xs text-muted" style="margin-top:4px;">جرب تغيير معايير البحث أو الفلاتر</div></div>';
    }

    var rows = list.map(function(s, i){
        var miss = missingOf(s);
        var pts = 0; try{ if(typeof Ops!=='undefined' && Ops.getStudentPoints) pts = Ops.getStudentPoints(s.id, null, 'all')||0; }catch(e){}
        var lvName = (lv()[s.stage] && lv()[s.stage].nameAr) || s.stage || '-';
        var groupsTxt = ens(s.id).map(function(e){ return e.group && e.group.name; }).filter(Boolean).join('، ') || '<span class="text-muted">لا مجموعات</span>';
        
        var act = '<button class="btn btn-primary btn-sm" title="الملف الكامل" onclick="window.openStudentProfile&&window.openStudentProfile(\''+s.id+'\')">👁️</button> ' +
                  '<button class="btn btn-ghost btn-sm" title="تعديل" onclick="window.openEditStudentProfile&&window.openEditStudentProfile(\''+s.id+'\')">✏️</button> ' +
                  ((window.openUnifiedSwapStudent||window.openSwapStudentModal) ? '<button class="btn btn-secondary btn-sm" title="تبديل مجموعة" onclick="(window.openUnifiedSwapStudent||window.openSwapStudentModal)(\''+s.id+'\')">🔄</button> ' : '') +
                  (isAdmin() ? '<button class="btn btn-danger btn-sm" title="حذف" onclick="window.delUser&&window.delUser(\''+s.id+'\')">🗑</button>' : '');
        
        return '<tr>' +
            '<td data-label="#" style="font-family:var(--font-en);font-weight:900;color:var(--primary);">'+(i+1)+'</td>' +
            '<td data-label="الكود"><b style="font-family:var(--font-en);">'+(s.code||'-')+'</b></td>' +
            '<td data-label="الاسم"><strong>'+s.name+'</strong>' + (miss.length ? ' <span class="badge badge-warning sp-badge-miss" title="ناقص: '+miss.join(' · ')+'">⚠️ '+miss.length+'</span>' : '') + '<div class="text-xs text-muted" style="margin-top:4px;">👥 '+groupsTxt+'</div></td>' +
            '<td data-label="المرحلة">'+lvName+'</td>' +
            '<td data-label="الصف">'+(s.grade||'-')+'</td>' +
            '<td data-label="📱 الطالب" style="font-family:var(--font-en);direction:ltr;text-align:right;">'+(s.phone||'<span class="text-muted">—</span>')+'</td>' +
            '<td data-label="👨 ولي الأمر" style="font-family:var(--font-en);direction:ltr;text-align:right;">'+(s.parentPhone||'<span class="text-muted">—</span>')+'</td>' +
            '<td data-label="النقاط"><span class="points-badge" style="font-family:var(--font-en);">🏆 '+pts+'</span></td>' +
            '<td data-label="إجراءات" style="white-space:nowrap;">'+act+'</td>' +
            '</tr>';
    }).join('');

    return '<div class="sp-wrap"><table id="studentsTable" class="sp-table"><thead><tr>' +
        '<th>#</th><th>الكود</th><th>الاسم</th><th>المرحلة</th><th>الصف</th><th>📱 الطالب</th><th>👨 ولي الأمر</th><th>النقاط 🏆</th><th>إجراءات</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

/* ========== 6. دالة الرندر الرئيسية ========== */
function render(){
    try{
        var sec = document.getElementById('section-students');
        if(!sec) return;
        
        var host = document.getElementById('spHost');
        if(!host){
            host = document.createElement('div');
            host.id = 'spHost';
            Array.prototype.slice.call(sec.children).forEach(function(ch){
                if(ch.classList && ch.classList.contains('section-header')) return;
                if(sec.contains(ch)) sec.removeChild(ch);
            });
            sec.appendChild(host);
        }
        
        var list = filtered();
        var missAll = 0;
        baseStudents().forEach(function(s){ if(missingOf(s).length) missAll++; });
        
        host.innerHTML = filtersHtml() + tableHtml(list);
        
        var c1 = document.getElementById('spCount'); if(c1) c1.textContent = list.length;
        var c2 = document.getElementById('spMiss'); if(c2) c2.textContent = missAll;
        
    }catch(e){ console.error('studentsPage render error:', e); }
}

/* ========== 7. أحداث التحكم (مع إصلاح فقدان التركيز) ========== */
window.spSet = function(k, v){ 
    // حفظ العنصر النشط ومكان المؤشر لمنع فقدان التركيز أثناء الكتابة
    var activeEl = document.activeElement;
    var isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    var activeId = isInput ? activeEl.id : null;
    var start = isInput ? activeEl.selectionStart : null;
    var end = isInput ? activeEl.selectionEnd : null;
    
    SP[k] = v; 
    if(k === 'st') SP.g = ''; // إعادة تعيين الصف عند تغيير المرحلة
    render(); 
    
    // استعادة التركيز ومكان المؤشر
    if(isInput && activeId){
        var restored = document.getElementById(activeId);
        if(restored){
            restored.focus();
            if(start !== null && restored.setSelectionRange){
                restored.setSelectionRange(start, end);
            }
        }
    }
};

window.spToggleTeacher = function(id){ 
    var i = SP.t.indexOf(id); 
    if(i >= 0) SP.t.splice(i, 1); 
    else SP.t.push(id); 
    render(); 
};

window.spDrop = function(){ 
    var d = document.getElementById('spTDrop'); 
    var wrap = document.getElementById('stuMultiTeacherWrap');
    if(!d || !wrap) return;
    
    if(d.style.display === 'none' || d.style.display === ''){
        var rect = wrap.getBoundingClientRect();
        d.style.position = 'fixed';
        d.style.top = (rect.bottom + 4) + 'px';
        d.style.left = rect.left + 'px';
        d.style.width = rect.width + 'px';
        d.style.display = 'block';
    } else {
        d.style.display = 'none';
    }
};

// إغلاق القائمة عند الضغط خارجها
document.addEventListener('click', function(e){ 
    var d = document.getElementById('spTDrop'); 
    if(!d || d.style.display === 'none') return; 
    if(e.target.closest('#spTDrop')) return; 
    var inp = e.target.closest && e.target.closest('#stuMultiTeacherWrap input[readonly]'); 
    if(inp) return; 
    d.style.display = 'none'; 
});

/* ========== 8. الاستيلاء على الدوال القديمة للتوافق ========== */
window.loadStudents = render;
window.loadStudentsList = render;
window.renderStudents = render;
window.fillStudentFilters = function(){};
window.updateStudentTeacherFilter = function(){ render(); };

function hook(){
    if(typeof window.showSection === 'function' && !window.__spHook){
        window.__spHook = 1;
        var os = window.showSection;
        window.showSection = function(id){ 
            var r = os.apply(this, arguments); 
            if(id === 'students') setTimeout(render, 150); 
            return r; 
        };
    }
}

// تشغيل أولي
hook(); 
setTimeout(hook, 800); 
setTimeout(hook, 2000);
setTimeout(render, 600); 
setTimeout(render, 1500);

/* ========== 9. إصلاحات عامة: حصر أرقام الهاتف في 11 رقماً فقط ========== */
document.addEventListener('input', function(e){
    var target = e.target;
    // تطبيق القيد على أي حقل إدخال يُعتبر رقم هاتف
    if(target.tagName === 'INPUT' && (
        target.type === 'tel' || 
        (target.id && /phone/i.test(target.id)) || 
        (target.placeholder && /01/.test(target.placeholder))
    )){
        // السماح فقط بالأرقام وحصر الطول في 11 خانة
        target.value = target.value.replace(/[^0-9]/g, '').slice(0, 11);
    }
});

// فرض maxlength="11" ديناميكياً عند إنشاء أي مودال جديد
if(window.MutationObserver){
    var observer = new MutationObserver(function(mutations){
        mutations.forEach(function(mutation){
            mutation.addedNodes.forEach(function(node){
                if(node.nodeType === 1){ // عنصر HTML
                    var inputs = node.querySelectorAll ? node.querySelectorAll('input[type="tel"], input[id*="Phone"], input[id*="phone"], input[placeholder*="01"]') : [];
                    inputs.forEach(function(input){
                        input.setAttribute('maxlength', '11');
                    });
                    if(node.tagName === 'INPUT' && (node.type === 'tel' || /phone/i.test(node.id) || /01/.test(node.placeholder))){
                        node.setAttribute('maxlength', '11');
                    }
                }
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

})();