/* ================================================================
📋 Students Page Unified V4 — صفحة طلاب موحدة واحترافية (أدمن/مساعد/مدرس)
• تصميم عصري موحد (Unified UI) مع صلاحيات مخصصة لكل دور
• المساعد: يرى طلاب أستاذه فقط + إمكانية الحذف
• الأدمن: يرى الكل + فلاتر متقدمة + إمكانية الحذف
• 🆕 V4: نظام المسودة للإضافة المجمعة (حفظ/تأكيد/استعادة/حذف)
• 🆕 V4: شارة + جرس "🔔 حدّث بياناته" عندما يعدّل الطالب بياناته بنفسه
• 🆕 V4: كاش اشتراكات (سرعة) + تحديث تلقائي + فلتر التحديثات
• أداة كشف وحل تكرار المجموعات لنفس الأستاذ (منع تضارب الأرقام)
================================================================ */
(function(){
"use strict";

/* ========== 1. Helpers & State ========== */
const db = () => (window.DataService && DataService._getData) ? DataService._getData() : {};
const cur = () => {
    try { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : ((window.AuthService && AuthService.getCurrentUser) ? AuthService.getCurrentUser() : null); }
    catch(e) { return null; }
};
const sToast = (m, t) => { try { if (window.safeToast) window.safeToast(m, t || 'info'); } catch(e) {} };
const nmz = (x) => String(x || '').toLowerCase().replace(/\s+/g, ' ').trim();
const ensRaw = (sid) => {
    try { return (DataService.getStudentTeachers ? DataService.getStudentTeachers(sid) : []) || []; }
    catch(e) { return []; }
};
const lv = () => (typeof EduFlowConfig !== 'undefined' && EduFlowConfig.educationLevels) ? EduFlowConfig.educationLevels : {};
const getUser = (id) => (DataService.getUserById ? DataService.getUserById(id) : null);

const isAdmin = () => { const u = cur(); return u && (u.role === 'admin' || u.role === 'super_admin'); };
const isAssistant = () => { const u = cur(); return u && u.role === 'assistant'; };
const getMyTeacherId = () => { if (window.getMyTeacherId) return window.getMyTeacherId(); return null; };

/* 🆕 كاش الاشتراكات — بيتبني تلقائياً أول استخدام وبيتلغى بعد أي تعديل */
let ENS_CACHE = null;
function ensC(sid) {
    if (!ENS_CACHE) {
        ENS_CACHE = {};
        try {
            (DataService.getStudents ? DataService.getStudents() : []).forEach(s => { ENS_CACHE[s.id] = ensRaw(s.id); });
        } catch(e) {}
    }
    if (!ENS_CACHE[sid]) ENS_CACHE[sid] = ensRaw(sid);
    return ENS_CACHE[sid];
}
const invalidateCache = () => { ENS_CACHE = null; };

/* صيغ هاتف آمنة لروابط الاتصال والواتساب */
const formatWaPhone = (phone) => {
    if (!phone) return '';
    let clean = String(phone).replace(/\D/g, '');
    if (clean.startsWith('00')) clean = clean.substring(2);
    if (clean.startsWith('20') && clean.length >= 12) return clean;
    if (clean.startsWith('0')) clean = '2' + clean;
    return clean;
};

const missingOf = (s) => {
    const m = [];
    if (!s.name || nmz(s.name).split(' ').length < 3) m.push('الاسم غير كامل');
    if (!s.parentPhone) m.push('رقم ولي الأمر');
    if (!s.phone) m.push('رقم الطالب');
    if (!s.grade) m.push('الصف');
    if (!s.stage) m.push('المرحلة');
    if (!s.code) m.push('الكود');
    if (!ensC(s.id).length) m.push('غير مقيّد في مجموعة');
    return m;
};

/* 🆕 معلومات تحديث الطالب لبياناته */
const updInfo = (s) => ({
    on: !!(s && s.profileUpdated),
    at: s && (s.profileUpdatedAt || s.profileUpdateAt) || null,
    details: s && (s.profileUpdateDetails || s.profileUpdateLog) || null
});
const FIELD_AR = { name:'الاسم', phone:'هاتف الطالب', parentPhone:'هاتف ولي الأمر', stage:'المرحلة', grade:'الصف', center:'السنتر', password:'كلمة المرور' };

// State
const SP = window._spState = window._spState || { t: [], c: '', st: '', g: '', m: '', q: '' };

/* ========== 2. Data Fetching & Filtering ========== */
function baseStudents() {
    let all = (DataService.getStudents ? DataService.getStudents() : []);
    const u = cur();
    if (u && u.role === 'assistant') {
        const tid = getMyTeacherId();
        if (tid) {
            const gids = {};
            (DataService.getGroups ? DataService.getGroups() : []).forEach(g => { if (g.teacherId === tid) gids[g.id] = 1; });
            all = all.filter(s => ensC(s.id).some(e => e.group && gids[e.group.id]));
        } else { all = []; }
    } else if (u && u.role === 'teacher') {
        all = all.filter(s => ensC(s.id).some(e => e.teacher && e.teacher.id === u.id));
    }
    return all;
}

function filtered() {
    let list = baseStudents();
    if (SP.t.length) {
        list = list.filter(s => {
            const tids = ensC(s.id).map(e => e.teacher && e.teacher.id);
            return SP.t.every(t => tids.indexOf(t) >= 0);
        });
    }
    if (SP.c) list = list.filter(s => ensC(s.id).some(e => e.group && (e.group.center || '') === SP.c));
    if (SP.st) list = list.filter(s => (s.stage || '') === SP.st);
    if (SP.g) list = list.filter(s => {
        const gv = String(s.grade || '');
        return gv === SP.g || gv.indexOf(SP.g) >= 0 || SP.g.indexOf(gv) >= 0;
    });
    if (SP.m) {
        list = list.filter(s => {
            if (SP.m === 'updated') return updInfo(s).on;               /* 🆕 فلتر التحديثات */
            const miss = missingOf(s);
            if (SP.m === 'any') return miss.length > 0;
            if (SP.m === 'ok') return miss.length === 0;
            if (SP.m === 'parent') return !s.parentPhone;
            if (SP.m === 'phone') return !s.phone;
            if (SP.m === 'grade') return !s.grade || !s.stage;
            if (SP.m === 'group') return !ensC(s.id).length;
            if (SP.m === 'name') return nmz(s.name).split(' ').length < 3;
            return true;
        });
    }
    const q = nmz(SP.q);
    if (q) {
        list = list.filter(s =>
            nmz(s.name).indexOf(q) >= 0 ||
            nmz(s.code || '').indexOf(q) >= 0 ||
            String(s.phone || '').indexOf(q) >= 0 ||
            String(s.parentPhone || '').indexOf(q) >= 0
        );
    }
    list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
    return list;
}

/* ========== 3. CSS Injection (Modern Unified UI — V4) ========== */
if(!document.getElementById('spCssV4')){
    const sst = document.createElement('style');
    sst.id = 'spCssV4';
    sst.textContent = `
    .sp-container { display: flex; flex-direction: column; gap: 16px; }
    .sp-filters-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .sp-filters-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 10px; }
    .sp-filters-title { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .sp-filters-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .sp-form-group { display: flex; flex-direction: column; gap: 6px; }
    .sp-form-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
    .sp-form-control { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-hover); color: var(--text); font-size: 14px; transition: all 0.2s; }
    .sp-form-control:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-bg); }
    .sp-teacher-dropdown { position: relative; }
    .sp-teacher-trigger { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-hover); cursor: pointer; font-size: 14px; }
    .sp-teacher-menu { position: absolute; top: 100%; left: 0; right: 0; z-index: 100; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); max-height: 250px; overflow-y: auto; margin-top: 4px; display: none; }
    .sp-teacher-menu.show { display: block; }
    .sp-teacher-option { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; transition: background 0.15s; }
    .sp-teacher-option:hover { background: var(--primary-bg); }
    .sp-stats-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 12px; }
    .sp-stat-item { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: default; }
    .sp-stat-item.clickable { cursor: pointer; padding: 4px 10px; border-radius: 999px; border: 1px dashed var(--border); transition: all .2s; }
    .sp-stat-item.clickable:hover { border-color: var(--primary); background: var(--primary-bg); }
    .sp-stat-value { font-family: var(--font-en); font-weight: 800; color: var(--primary); }
    .sp-stat-value.warn { color: var(--warning); }
    .sp-stat-value.info { color: var(--info); }
    .sp-table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .sp-table { width: 100%; border-collapse: collapse; }
    .sp-table th { background: var(--surface-hover); padding: 14px 16px; text-align: right; font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10; }
    .sp-table td { padding: 14px 16px; border-bottom: 1px solid var(--border); font-size: 14px; vertical-align: middle; }
    .sp-table tbody tr { transition: background 0.15s; }
    .sp-table tbody tr:hover { background: var(--primary-bg); }
    .sp-table tbody tr:last-child td { border-bottom: none; }
    .sp-student-info { display: flex; flex-direction: column; gap: 4px; }
    .sp-student-name { font-weight: 700; font-size: 14px; color: var(--text); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .sp-student-groups { font-size: 12px; color: var(--text-muted); }
    .sp-code-badge { display: inline-block; padding: 4px 8px; background: var(--surface-hover); border-radius: 6px; font-family: var(--font-en); font-weight: 700; font-size: 12px; color: var(--text-secondary); }
    .sp-points-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: linear-gradient(135deg, var(--primary-bg), var(--accent-bg)); color: var(--primary); border-radius: 20px; font-weight: 800; font-size: 13px; font-family: var(--font-en); }
    .sp-phone-cell { display: flex; flex-direction: column; gap: 6px; font-family: var(--font-en); direction: ltr; text-align: right; }
    .sp-phone-link { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font-weight: 600; font-size: 13px; }
    .sp-phone-link.student { color: var(--info); }
    .sp-phone-link.parent { color: var(--warning); }
    .sp-wa-btn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; background: #25d366; color: #fff; border-radius: 50%; font-size: 12px; text-decoration: none; transition: transform 0.2s; }
    .sp-wa-btn:hover { transform: scale(1.1); }
    .sp-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .sp-action-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); cursor: pointer; transition: all 0.2s; font-size: 14px; }
    .sp-action-btn:hover { background: var(--surface-hover); border-color: var(--primary); color: var(--primary); }
    .sp-action-btn.danger:hover { border-color: var(--danger); color: var(--danger); background: var(--danger-bg); }
    .sp-action-btn.bell { color: var(--info); border-color: var(--info); animation: spPulse 2s infinite; }
    .sp-missing-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: var(--warning-bg); color: var(--warning); border-radius: 12px; font-size: 11px; font-weight: 700; animation: spPulse 2s infinite; }
    /* 🆕 شارة تحديث بيانات الطالب */
    .sp-updated-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: var(--info-bg); color: var(--info); border-radius: 12px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all .2s; }
    .sp-updated-badge:hover { background: var(--info); color: #fff; }
    /* 🆕 شريحة المسودة */
    .sp-draft-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--warning-bg); color: var(--warning); border: 1px dashed var(--warning); border-radius: 999px; font-size: 12px; font-weight: 800; cursor: pointer; transition: all .2s; }
    .sp-draft-chip:hover { background: var(--warning); color: #fff; }
    /* 🆕 صفوف تفاصيل التحديث */
    .sp-upd-row { display: flex; justify-content: space-between; gap: 8px; padding: 8px 10px; background: var(--surface-hover); border-radius: 8px; margin-bottom: 6px; font-size: 13px; flex-wrap: wrap; }
    .sp-upd-old { color: var(--danger); text-decoration: line-through; }
    .sp-upd-new { color: var(--success); font-weight: 800; }
    @keyframes spPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
    .sp-empty { text-align: center; padding: 60px 20px; background: var(--surface); border: 1px dashed var(--border); border-radius: 16px; }
    .sp-empty-icon { font-size: 48px; margin-bottom: 16px; }
    .sp-empty-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .sp-empty-desc { font-size: 14px; color: var(--text-muted); }
    @media (max-width: 768px) {
        .sp-filters-grid { grid-template-columns: 1fr; }
        .sp-table-wrap { overflow-x: auto; }
        .sp-table { min-width: 900px; }
    }
    @media (max-width: 480px) {
        .sp-filters-card { padding: 16px; }
        .sp-stats-bar { flex-direction: column; align-items: flex-start; }
    }
    @media print {
        .sp-filters-card, .sp-actions, .sp-wa-btn { display: none !important; }
        body { background: #fff !important; }
        .sp-table-wrap { border: 1px solid #000; box-shadow: none; }
        .sp-table th, .sp-table td { color: #000 !important; background: #fff !important; }
    }
    `;
    document.head.appendChild(sst);
}

/* ========== 4. UI Builders ========== */
function buildFilters() {
    const centers = {};
    (DataService.getGroups ? DataService.getGroups() : []).forEach(g => { if (g.center) centers[g.center] = 1; });
    const grades = [];
    Object.keys(lv()).forEach(k => { (lv()[k].grades || []).forEach(g => { if (grades.indexOf(g) < 0) grades.push(g); }); });

    let html = '<div class="sp-filters-card">';

    // Header (+ 🆕 شريحة المسودة)
    html += '<div class="sp-filters-header">';
    html += '<div class="sp-filters-title">🔍 فلاتر البحث والتصفية</div>';
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">';
    const dft = readDraft();
    if (dft) html += `<span class="sp-draft-chip" onclick="window.spOpenDraftModal()" title="مسودة إضافة مجمعة محفوظة — اضغط للاستعادة أو الحذف">📝 مسودة: ${dft.rows.length} طالب</span>`;
    html += '<button class="btn btn-warning btn-sm" onclick="window.detectAndResolveDuplicates()" title="كشف الطلاب المكررين في مجموعات نفس الأستاذ">🔍 كشف وحل التكرار</button>';
    html += '<button class="btn btn-primary btn-sm" onclick="window.open(\'print-qr.html\',\'_blank\')" title="طباعة باركودات الطلاب">📱 طباعة باركودات</button>';
    html += '</div></div>';

    // Grid
    html += '<div class="sp-filters-grid">';
    if (isAdmin()) {
        html += '<div class="sp-form-group sp-teacher-dropdown" id="spTeacherDropdown">';
        html += `<label class="sp-form-label">فلتر الأساتذة (المشتركين)</label>`;
        html += `<div class="sp-teacher-trigger" onclick="window.toggleTeacherMenu()">`;
        html += `<span>${SP.t.length ? SP.t.length + ' أستاذ محدد' : 'كل الأساتذة'}</span><span>⌄</span></div>`;
        html += `<div class="sp-teacher-menu" id="spTeacherMenu">`;
        (DataService.getTeachers ? DataService.getTeachers() : []).forEach(t => {
            const cnt = (DataService.getGroups ? DataService.getGroups() : []).filter(g => g.teacherId === t.id).length;
            const checked = SP.t.indexOf(t.id) >= 0 ? 'checked' : '';
            html += `<label class="sp-teacher-option">
                <input type="checkbox" style="accent-color:var(--primary);" ${checked} onchange="window.toggleTeacherFilter('${t.id}')">
                <span style="flex:1;font-weight:600;">${t.name}</span>
                <span class="badge badge-muted">${cnt} مجموعة</span>
            </label>`;
        });
        html += `</div></div>`;
    } else if (isAssistant()) {
        const tid = getMyTeacherId();
        const teacher = tid ? getUser(tid) : null;
        html += `<div class="sp-form-group">
            <label class="sp-form-label">نطاق العرض</label>
            <div style="padding:10px 12px;background:var(--primary-bg);color:var(--primary);border-radius:8px;font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px;">
                👨‍🏫 طلاب الأستاذ: ${teacher ? teacher.name : 'غير محدد'}
            </div>
        </div>`;
    }
    html += `<div class="sp-form-group"><label class="sp-form-label">🏢 السنتر</label>
        <select class="sp-form-control" onchange="window.setFilter('c', this.value)"><option value="">كل السناتر</option>
        ${Object.keys(centers).map(c => `<option value="${c}" ${SP.c === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>`;
    html += `<div class="sp-form-group"><label class="sp-form-label">🎯 المرحلة</label>
        <select class="sp-form-control" onchange="window.setFilter('st', this.value)"><option value="">كل المراحل</option>
        ${Object.keys(lv()).map(k => `<option value="${k}" ${SP.st === k ? 'selected' : ''}>${lv()[k].nameAr}</option>`).join('')}</select></div>`;
    html += `<div class="sp-form-group"><label class="sp-form-label">🎓 الصف</label>
        <select class="sp-form-control" onchange="window.setFilter('g', this.value)"><option value="">كل الصفوف</option>
        ${grades.map(g => `<option value="${g}" ${SP.g === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>`;
    html += `<div class="sp-form-group"><label class="sp-form-label">⚠️ النواقص / الحالة</label>
        <select class="sp-form-control" onchange="window.setFilter('m', this.value)">
            <option value="" ${SP.m === '' ? 'selected' : ''}>✅ الكل</option>
            <option value="any" ${SP.m === 'any' ? 'selected' : ''}>أي بيانات ناقصة</option>
            <option value="parent" ${SP.m === 'parent' ? 'selected' : ''}>رقم ولي الأمر</option>
            <option value="phone" ${SP.m === 'phone' ? 'selected' : ''}>رقم الطالب</option>
            <option value="grade" ${SP.m === 'grade' ? 'selected' : ''}>الصف/المرحلة</option>
            <option value="group" ${SP.m === 'group' ? 'selected' : ''}>غير مقيّد</option>
            <option value="name" ${SP.m === 'name' ? 'selected' : ''}>الاسم غير كامل</option>
            <option value="updated" ${SP.m === 'updated' ? 'selected' : ''}>🔔 حدّث بياناته بنفسه</option>
            <option value="ok" ${SP.m === 'ok' ? 'selected' : ''}>السليمين فقط</option>
        </select></div>`;
    html += `<div class="sp-form-group" style="grid-column: span 2 / auto;"><label class="sp-form-label">🔍 بحث سريع</label>
        <input type="text" class="sp-form-control" id="spSearchInput" placeholder="اسم / كود / رقم..." value="${SP.q || ''}" oninput="window.setFilter('q', this.value)"></div>`;
    html += '</div>';

    if (isAdmin() && SP.t.length) {
        html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:16px;">';
        SP.t.forEach(tid => {
            const t = getUser(tid);
            html += `<span class="badge badge-info" style="padding:6px 10px;display:inline-flex;align-items:center;gap:6px;">
                ${t ? t.name : tid}
                <b style="cursor:pointer;opacity:0.7;" onclick="window.toggleTeacherFilter('${tid}')">✕</b></span>`;
        });
        html += '</div>';
    }

    // Stats Bar (+ 🆕 عدّاد التحديثات)
    const list = filtered();
    const base = baseStudents();
    const missAll = base.filter(s => missingOf(s).length > 0).length;
    const updAll = base.filter(s => updInfo(s).on).length;
    const dupAll = base.filter(s => {
        const tc = {}; ensC(s.id).forEach(e => { const t = e.teacherId || (e.teacher && e.teacher.id); if (t) tc[t] = (tc[t] || 0) + 1; });
        return Object.values(tc).some(c => c > 1);
    }).length;

    html += '<div class="sp-stats-bar"><div style="display:flex;gap:12px;flex-wrap:wrap;">';
    html += `<div class="sp-stat-item">معروض: <span class="sp-stat-value">${list.length}</span> طالب</div>`;
    html += `<div class="sp-stat-item clickable" onclick="window.setFilter('m','any')" title="عرض الناقصين فقط">⚠️ ناقص بيانات: <span class="sp-stat-value warn">${missAll}</span></div>`;
    html += `<div class="sp-stat-item clickable" onclick="window.setFilter('m','updated')" title="عرض اللي حدّثوا بياناتهم بنفسهم">🔔 تحديثات طلاب: <span class="sp-stat-value info">${updAll}</span></div>`;
    html += `<div class="sp-stat-item clickable" onclick="window.detectAndResolveDuplicates()" title="فتح أداة حل التكرار">⚔️ تكرار مجموعات: <span class="sp-stat-value" style="color:var(--danger);">${dupAll}</span></div>`;
    html += '</div></div></div>';
    return html;
}

function buildTable(list) {
    if (!list.length) {
        return `<div class="sp-empty">
            <div class="sp-empty-icon">🔍</div>
            <div class="sp-empty-title">لا يوجد طلاب مطابقين للفلاتر</div>
            <div class="sp-empty-desc">جرب تغيير معايير البحث أو الفلاتر</div>
        </div>`;
    }
    let rows = '';
    list.forEach((s, i) => {
        const miss = missingOf(s);
        const up = updInfo(s);
        let pts = 0;
        try { if (typeof Ops !== 'undefined' && Ops.getStudentPoints) pts = Ops.getStudentPoints(s.id, null, 'all') || 0; } catch(e) {}
        const lvName = (lv()[s.stage] && lv()[s.stage].nameAr) || s.stage || '-';

        const enrollments = ensC(s.id);
        const groupsTxt = enrollments.map(e => e.group && e.group.name).filter(Boolean).join('، ') || '<span style="color:var(--text-muted);">لا مجموعات</span>';

        const teacherCounts = {};
        enrollments.forEach(e => {
            const tid = e.teacherId || (e.teacher && e.teacher.id);
            if (tid) teacherCounts[tid] = (teacherCounts[tid] || 0) + 1;
        });
        const hasDuplicateTeacher = Object.values(teacherCounts).some(count => count > 1);
        const dupBadge = hasDuplicateTeacher ? '<span class="sp-missing-badge" style="background:var(--danger-bg);color:var(--danger);" title="تحذير: الطالب مشترك في أكثر من مجموعة لنفس الأستاذ (خطأ)">⚠️ تكرار مجموعات</span>' : '';
        const updBadge = up.on ? `<span class="sp-updated-badge" onclick="window.spOpenUpdateInfo('${s.id}')" title="الطالب عدّل بياناته بنفسه${up.at ? (' — ' + new Date(up.at).toLocaleString('ar-EG')) : ''} — اضغط للتفاصيل">🔔 حدّث بياناته</span>` : '';

        const stuPhoneClean = s.phone ? String(s.phone).replace(/\D/g, '') : '';
        const parentPhoneClean = s.parentPhone ? String(s.parentPhone).replace(/\D/g, '') : '';
        const stuWaPhone = formatWaPhone(s.phone);
        const parentWaPhone = formatWaPhone(s.parentPhone);

        let stuPhoneHtml = s.phone ?
            `<div class="sp-phone-cell">
                <a href="tel:${stuPhoneClean}" class="sp-phone-link student">📞 ${s.phone}</a>
                <a href="https://wa.me/${stuWaPhone}" target="_blank" class="sp-wa-btn" title="واتساب الطالب">💬</a>
            </div>`
            : '<span style="color:var(--text-muted);">—</span>';
        let parentPhoneHtml = s.parentPhone ?
            `<div class="sp-phone-cell">
                <a href="tel:${parentPhoneClean}" class="sp-phone-link parent">📞 ${s.parentPhone}</a>
                <a href="https://wa.me/${parentWaPhone}" target="_blank" class="sp-wa-btn" title="واتساب ولي الأمر">💬</a>
            </div>`
            : '<span style="color:var(--text-muted);">—</span>';

        let act = `<div class="sp-actions">`;
        if (up.on) act += `<button class="sp-action-btn bell" title="🔔 الطالب حدّث بياناته — عرض التفاصيل والإقرار" onclick="window.spOpenUpdateInfo('${s.id}')">🔔</button>`;
        act += `<button class="sp-action-btn" title="الملف الكامل" onclick="window.openStudentProfile&&window.openStudentProfile('${s.id}')">👁️</button>`;
        act += `<button class="sp-action-btn" title="تعديل" onclick="window.openEditStudentProfile&&window.openEditStudentProfile('${s.id}')">✏️</button>`;
        if (window.openUnifiedSwapStudent || window.openSwapStudentModal) {
            act += `<button class="sp-action-btn" title="تبديل مجموعة" onclick="(window.openUnifiedSwapStudent||window.openSwapStudentModal)('${s.id}')">🔄</button>`;
        }
        act += `<button class="sp-action-btn danger" title="حذف" onclick="window.delUser&&window.delUser('${s.id}')">🗑️</button>`;
        act += `</div>`;

        rows += `<tr>
            <td style="font-family:var(--font-en);font-weight:800;color:var(--text-muted);">${i + 1}</td>
            <td><span class="sp-code-badge">${s.code || '-'}</span></td>
            <td>
                <div class="sp-student-info">
                    <div class="sp-student-name">
                        ${s.name}
                        ${miss.length ? `<span class="sp-missing-badge" title="ناقص: ${miss.join(' · ')}">⚠️ ${miss.length}</span>` : ''}
                        ${dupBadge}
                        ${updBadge}
                    </div>
                    <div class="sp-student-groups">👥 ${groupsTxt}</div>
                </div>
            </td>
            <td>${lvName}</td>
            <td>${s.grade || '-'}</td>
            <td>${stuPhoneHtml}</td>
            <td>${parentPhoneHtml}</td>
            <td><span class="sp-points-badge">🏆 ${pts}</span></td>
            <td>${act}</td>
        </tr>`;
    });

    return `<div class="sp-table-wrap">
        <table class="sp-table">
            <thead><tr>
                <th>#</th><th>الكود</th><th>الاسم</th><th>المرحلة</th><th>الصف</th><th>📱 الطالب</th><th>👨 ولي الأمر</th><th>النقاط</th><th>إجراءات</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
}

/* ========== 5. Render & Events ========== */
function render() {
    try {
        const sec = document.getElementById('section-students');
        if (!sec) return;
        let host = document.getElementById('spHost');
        if (!host) {
            host = document.createElement('div');
            host.id = 'spHost';
            host.className = 'sp-container';
            Array.prototype.slice.call(sec.children).forEach(ch => {
                if (ch.classList && ch.classList.contains('section-header')) return;
                if (sec.contains(ch)) sec.removeChild(ch);
            });
            sec.appendChild(host);
        }
        invalidateCache();
        const list = filtered();
        host.innerHTML = buildFilters() + buildTable(list);
    } catch(e) { console.error('studentsPage render error:', e); }
}

window.setFilter = function(k, v) {
    const activeEl = document.activeElement;
    const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    const activeId = isInput ? activeEl.id : null;
    const start = isInput ? activeEl.selectionStart : null;
    const end = isInput ? activeEl.selectionEnd : null;
    SP[k] = v;
    if (k === 'st') SP.g = '';
    render();
    if (isInput && activeId) {
        const restored = document.getElementById(activeId);
        if (restored) {
            restored.focus();
            if (start !== null && restored.setSelectionRange) restored.setSelectionRange(start, end);
        }
    }
};

window.toggleTeacherFilter = function(id) {
    const i = SP.t.indexOf(id);
    if (i >= 0) SP.t.splice(i, 1); else SP.t.push(id);
    render();
};
window.toggleTeacherMenu = function() {
    const menu = document.getElementById('spTeacherMenu');
    if (menu) menu.classList.toggle('show');
};
document.addEventListener('click', function(e) {
    const menu = document.getElementById('spTeacherMenu');
    const dropdown = document.getElementById('spTeacherDropdown');
    if (menu && dropdown && !dropdown.contains(e.target)) menu.classList.remove('show');
});

// Override legacy functions
window.loadStudents = render;
window.loadStudentsList = render;
window.renderStudents = render;
window.fillStudentFilters = function() {};
window.updateStudentTeacherFilter = function() { render(); };

function hook() {
    if (typeof window.showSection === 'function' && !window.__spHookV4) {
        window.__spHookV4 = 1;
        const os = window.showSection;
        window.showSection = function(id) {
            const r = os.apply(this, arguments);
            if (id === 'students') setTimeout(render, 150);
            return r;
        };
    }
}
hook(); setTimeout(hook, 800); setTimeout(hook, 2000);
setTimeout(render, 600); setTimeout(render, 1500);
/* 🆕 تحديث تلقائي خفيف كل 45 ثانية لو الصفحة مفتوحة على الطلاب */
setInterval(function(){
    try {
        const sec = document.getElementById('section-students');
        if (sec && sec.classList.contains('active')) render();
    } catch(e) {}
}, 45000);

/* ========== 6. Global Phone Input Constraints ========== */
document.addEventListener('input', function(e) {
    const target = e.target;
    if (target.tagName === 'INPUT' && (
        target.type === 'tel' ||
        (target.id && /phone/i.test(target.id)) ||
        (target.placeholder && /01/.test(target.placeholder))
    )) {
        target.value = target.value.replace(/[^0-9]/g, '').slice(0, 11);
    }
});
if (window.MutationObserver) {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    const inputs = node.querySelectorAll ? node.querySelectorAll('input[type="tel"], input[id*="Phone"], input[id*="phone"], input[placeholder*="01"]') : [];
                    inputs.forEach(function(input) { input.setAttribute('maxlength', '11'); });
                    if (node.tagName === 'INPUT' && (node.type === 'tel' || /phone/i.test(node.id) || /01/.test(node.placeholder))) {
                        node.setAttribute('maxlength', '11');
                    }
                }
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

/* ========== 7. Duplicate Detection & Resolution ========== */
window.detectAndResolveDuplicates = function() {
    invalidateCache();
    const students = baseStudents();
    const duplicates = [];
    students.forEach(s => {
        const enrollments = ensC(s.id);
        const teacherGroups = {};
        enrollments.forEach(e => {
            const tid = e.teacherId || (e.teacher && e.teacher.id);
            if (tid) { if (!teacherGroups[tid]) teacherGroups[tid] = []; teacherGroups[tid].push(e); }
        });
        Object.keys(teacherGroups).forEach(tid => {
            if (teacherGroups[tid].length > 1) {
                duplicates.push({
                    student: s, teacherId: tid,
                    teacherName: (teacherGroups[tid][0].teacher && teacherGroups[tid][0].teacher.name) || (getUser(tid) || {}).name || 'أستاذ',
                    groups: teacherGroups[tid]
                });
            }
        });
    });
    if (!duplicates.length) { sToast('✅ لا يوجد طلاب مكررين في مجموعات نفس الأستاذ', 'success'); return; }

    let html = `<div class="modal-header"><h3 class="modal-title">⚠️ كشف تكرار المجموعات (${duplicates.length} حالة)</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>`;
    html += `<div class="modal-body"><div class="filter-info" style="background:var(--warning-bg);color:var(--warning);border-color:var(--warning);">تم العثور على طلاب مشتركين في أكثر من مجموعة لنفس الأستاذ — هذا يسبب تضارب في الحسابات والعدادات. اختر مجموعة واحدة للإبقاء عليها واحذف الباقي.</div>`;
    duplicates.forEach((dup, idx) => {
        html += `<div class="card" style="margin-bottom:12px; border-right:4px solid var(--danger);">
            <strong>👤 ${dup.student.name} (${dup.student.code || '-'})</strong>
            <div class="text-xs text-muted" style="margin:4px 0;">👨‍🏫 الأستاذ: ${dup.teacherName}</div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">`;
        dup.groups.forEach((g, gIdx) => {
            const groupName = g.group ? g.group.name : 'مجموعة محذوفة';
            const gid = g.groupId || (g.group && g.group.id);
            html += `<label style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--surface-hover);border-radius:8px;cursor:pointer;border:1px solid var(--border);">
                <input type="radio" name="dup_keep_${idx}" value="${gid}" ${gIdx === 0 ? 'checked' : ''} style="accent-color:var(--success);">
                <span style="flex:1;">📚 ${groupName}</span>
                <span class="text-xs text-muted">${gIdx === 0 ? '(الافتراضي للإبقاء)' : ''}</span>
            </label>`;
        });
        html += `</div><button class="btn btn-danger btn-sm" style="margin-top:8px;width:100%;" onclick="window.resolveDuplicate('${dup.student.id}', '${dup.teacherId}', ${idx})">✅ تطبيق الحذف والإبقاء على المختار</button></div>`;
    });
    html += `</div>`;
    if (window.ThemeManager && ThemeManager.openModal) ThemeManager.openModal(html, 'modal-lg');
};

window.spRemoveEnrollmentEverywhere = function(studentId, groupId) {
    let removed = false, removedId = null;
    const d = (window.DataService && DataService._getData) ? DataService._getData() : {};
    if (Array.isArray(d.enrollments)) {
        const hit = d.enrollments.find(en => en && en.studentId === studentId && en.groupId === groupId);
        if (hit) removedId = hit.id || null;
        const before = d.enrollments.length;
        d.enrollments = d.enrollments.filter(en => !(en && en.studentId === studentId && en.groupId === groupId));
        if (d.enrollments.length !== before) removed = true;
    }
    const u = (d.users || []).find(x => x && x.id === studentId);
    if (u && Array.isArray(u.enrollments)) {
        const before = u.enrollments.length;
        u.enrollments = u.enrollments.filter(en => !(en && (en.groupId === groupId || en.group === groupId)));
        if (u.enrollments.length !== before) removed = true;
    }
    if (!removed) {
        try {
            if (typeof DataService.unenrollStudent === 'function') { DataService.unenrollStudent(studentId, groupId); removed = true; }
            else if (typeof DataService.removeStudentFromGroup === 'function') { DataService.removeStudentFromGroup(studentId, groupId); removed = true; }
            else if (typeof DataService.removeEnrollment === 'function') { DataService.removeEnrollment(studentId, groupId); removed = true; }
        } catch(e) {}
    }
    if (removed || removedId) {
        try { if (DataService._saveData) DataService._saveData(d); } catch(e) {}
        if (removedId && window.FirebaseService && FirebaseService.connected) { try { FirebaseService.deleteDoc('enrollments', removedId); } catch(e) {} }
        if (u && window.FirebaseService && FirebaseService.connected) { try { FirebaseService.saveDoc('users', studentId, u); } catch(e) {} }
    }
    invalidateCache();
    return removed;
};

window.resolveDuplicate = async function(studentId, teacherId, idx) {
    const keepRadio = document.querySelector(`input[name="dup_keep_${idx}"]:checked`);
    if (!keepRadio) { sToast('يرجى اختيار مجموعة للإبقاء عليها', 'error'); return; }
    const keepGroupId = keepRadio.value;
    const ensList = ensC(studentId);
    const toRemove = [];
    ensList.forEach(e => {
        const tid = (e.teacher && e.teacher.id) || e.teacherId || (e.group && e.group.teacherId);
        const gid = (e.group && e.group.id) || e.groupId;
        if (tid === teacherId && gid && gid !== keepGroupId) toRemove.push(gid);
    });
    if (!toRemove.length) { sToast('مفيش حاجة تتحذف — الحالة دي اتظبطت قبل كده', 'warning'); return; }
    let removedCount = 0;
    for (const gid of toRemove) { if (window.spRemoveEnrollmentEverywhere(studentId, gid)) removedCount++; }
    sToast(removedCount ? (`✅ تم حذف ${removedCount} مجموعة مكررة للطالب`) : '⚠️ ملقاش الاشتراك محلياً — حدّث الصفحة وجرب تاني', removedCount ? 'success' : 'warning');
    if (window.ThemeManager) ThemeManager.closeModal();
    window.detectAndResolveDuplicates();
    render();
};

function patchEditProfile() {
    if (window.openEditStudentProfile && !window.openEditStudentProfile.__v4Patched) {
        const orig = window.openEditStudentProfile;
        window.openEditStudentProfile = function(sid) {
            const enrollments = ensC(sid);
            const teacherGroups = {};
            enrollments.forEach(e => {
                const tid = e.teacherId || (e.teacher && e.teacher.id);
                if (tid) { if (!teacherGroups[tid]) teacherGroups[tid] = []; teacherGroups[tid].push(e); }
            });
            const duplicates = Object.keys(teacherGroups).filter(tid => teacherGroups[tid].length > 1);
            if (duplicates.length > 0) {
                let html = `<div class="modal-header"><h3 class="modal-title">⚠️ تحذير: تكرار مجموعات</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">`;
                html += `<div class="filter-info" style="background:var(--danger-bg);color:var(--danger);border-color:var(--danger);">هذا الطالب مشترك في أكثر من مجموعة لنفس الأستاذ — احذف المكرر أولاً قبل التعديل.</div>`;
                duplicates.forEach(tid => {
                    const groups = teacherGroups[tid];
                    const tName = (groups[0].teacher && groups[0].teacher.name) || (getUser(tid) || {}).name || 'أستاذ';
                    html += `<div class="card" style="margin-bottom:12px; border-right:4px solid var(--warning);"><strong>👨‍ ${tName}</strong><div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">`;
                    groups.forEach((g, gIdx) => {
                        const gName = g.group ? g.group.name : 'مجموعة';
                        const gid = g.groupId || (g.group && g.group.id);
                        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--surface-hover);border-radius:8px;">
                            <span>📚 ${gName}</span>
                            ${gIdx > 0 ? `<button class="btn btn-danger btn-sm" onclick="window.quickRemoveEnrollment('${sid}', '${gid}', '${tid}')">🗑️ حذف</button>` : '<span class="badge badge-success">أساسي</span>'}
                        </div>`;
                    });
                    html += `</div></div>`;
                });
                html += `<button class="btn btn-primary w-full" onclick="ThemeManager.closeModal(); window.openEditStudentProfile('${sid}');" style="margin-top:12px;">✅ تم الحذف، فتح مودال التعديل</button></div>`;
                if (window.ThemeManager && ThemeManager.openModal) ThemeManager.openModal(html, 'modal-md');
                return;
            }
            return orig.call(this, sid);
        };
        window.openEditStudentProfile.__v4Patched = true;
    }
}
setTimeout(patchEditProfile, 500); setTimeout(patchEditProfile, 1500); setTimeout(patchEditProfile, 3000);

window.quickRemoveEnrollment = async function(studentId, groupId, teacherId) {
    const ok = window.spRemoveEnrollmentEverywhere(studentId, groupId);
    sToast(ok ? '✅ تم حذف المجموعة المكررة' : '⚠️ ملقاش الاشتراك — حدّث الصفحة وجرب', ok ? 'success' : 'warning');
    invalidateCache();
    window.openEditStudentProfile(studentId);
    render();
};

/* ========== 8. 🆕 Student Self-Update Notifications (🔔) ========== */
window.spOpenUpdateInfo = function(sid) {
    const s = getUser(sid); if (!s) return;
    const u = updInfo(s);
    let detailsHtml = '';
    if (u.details && typeof u.details === 'object') {
        const keys = Object.keys(u.details);
        detailsHtml = keys.length ? keys.map(k => {
            const v = u.details[k];
            if (Array.isArray(v)) {
                return `<div class="sp-upd-row"><span><strong>${FIELD_AR[k] || k}</strong></span><span><span class="sp-upd-old">${v[0] || '-'}</span> ← <span class="sp-upd-new">${v[1] || '-'}</span></span></div>`;
            }
            return `<div class="sp-upd-row"><span><strong>${FIELD_AR[k] || k}</strong></span><span class="sp-upd-new">${v}</span></div>`;
        }).join('') : '<div class="text-xs text-muted">لا تفاصيل مسجلة</div>';
    } else {
        detailsHtml = '<div class="filter-info">الطالب عدّل بياناته من لوحته الشخصية. راجع البيانات الحالية من الملف الكامل أو زر التعديل.</div>';
    }
    const when = u.at ? new Date(u.at).toLocaleString('ar-EG') : 'وقت غير مسجل';
    const html = `<div class="modal-header"><h3 class="modal-title">🔔 تحديث بيانات: ${s.name}</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>
    <div class="modal-body">
        <div class="filter-info" style="background:var(--info-bg);color:var(--info);border-color:var(--info);">📅 تاريخ التحديث: <strong>${when}</strong> — الطالب عدّل بياناته بنفسه من لوحة الطالب بدون رجوع للإدارة.</div>
        <div style="margin:12px 0;">${detailsHtml}</div>
        <div class="sp-upd-row"><span>👤 الاسم الحالي</span><span class="sp-upd-new">${s.name || '-'}</span></div>
        <div class="sp-upd-row"><span>📱 هاتف الطالب</span><span class="sp-upd-new">${s.phone || '-'}</span></div>
        <div class="sp-upd-row"><span>👨 ولي الأمر</span><span class="sp-upd-new">${s.parentPhone || '-'}</span></div>
        <div class="sp-upd-row"><span>🎓 المرحلة / الصف</span><span class="sp-upd-new">${(lv()[s.stage] || {}).nameAr || s.stage || '-'} / ${s.grade || '-'}</span></div>
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
            <button class="btn btn-success" style="flex:1;" onclick="window.spAckProfileUpdate('${s.id}')">✓ تم الاطلاع والإقرار</button>
            <button class="btn btn-secondary" style="flex:1;" onclick="ThemeManager.closeModal();window.openStudentProfile&&window.openStudentProfile('${s.id}')">👁️ الملف الكامل</button>
            <button class="btn btn-primary" style="flex:1;" onclick="ThemeManager.closeModal();window.openEditStudentProfile&&window.openEditStudentProfile('${s.id}')">✏️ تعديل</button>
        </div>
    </div>`;
    if (window.ThemeManager && ThemeManager.openModal) ThemeManager.openModal(html, 'modal-md');
};

window.spAckProfileUpdate = async function(sid) {
    try {
        const d = db();
        const u = (d.users || []).find(x => x && x.id === sid); if (!u) return;
        u.profileUpdated = false;
        u.profileUpdateAckAt = new Date().toISOString();
        u.profileUpdateAckBy = (cur() || {}).id || '';
        if (DataService._saveData) DataService._saveData(d);
        try { if (DataService.updateUser) await DataService.updateUser(sid, { profileUpdated: false, profileUpdateAckAt: u.profileUpdateAckAt, profileUpdateAckBy: u.profileUpdateAckBy }); } catch(e) {}
        if (window.FirebaseService && FirebaseService.connected) { try { FirebaseService.saveDoc('users', sid, u); } catch(e) {} }
        sToast('✅ تم الإقرار — اختفت الشارة من الجدول', 'success');
        if (window.ThemeManager) ThemeManager.closeModal();
        invalidateCache();
        render();
    } catch(e) { sToast('خطأ في الإقرار', 'error'); }
};

/* 🆕 API عام: أي صفحة تانية تقدر تبلّغ عن تحديث طالب (بيستخدمه داشبورد الطالب اختيارياً) */
window.spReportProfileUpdate = async function(sid, changes) {
    try {
        const d = db();
        const u = (d.users || []).find(x => x && x.id === sid); if (!u) return;
        u.profileUpdated = true;
        u.profileUpdatedAt = new Date().toISOString();
        if (changes) u.profileUpdateDetails = changes;
        if (DataService._saveData) DataService._saveData(d);
        if (window.FirebaseService && FirebaseService.connected) { try { FirebaseService.saveDoc('users', sid, u); } catch(e) {} }
        try {
            if (DataService.addNotification) {
                (DataService.getUsers ? DataService.getUsers() : []).filter(x => x.role === 'admin' || x.role === 'super_admin' || x.role === 'assistant').forEach(adm => {
                    DataService.addNotification({ targetUserId: adm.id, title: '🔔 طالب حدّث بياناته', message: `${u.name || ''} (${u.code || ''}) عدّل بياناته من لوحته — راجعها من صفحة الطلاب.`, type: 'profile_update', meta: { studentId: sid } });
                });
            }
        } catch(e) {}
        invalidateCache();
    } catch(e) {}
};

/* ========== 9. 🆕 Bulk-Add Draft System (📝 المسودة) ========== */
const DRAFT_KEY = 'eduflow_bulk_students_draft_v1';
let lastSnap = '';

function liveRows() {
    if (window._ubRows && window._ubRows.length) return { src: 'ub', rows: window._ubRows };
    if (window._bulkRows && window._bulkRows.length) return { src: 'bulk', rows: window._bulkRows };
    return null;
}
function readDraft() {
    try {
        const raw = localStorage.getItem(DRAFT_KEY); if (!raw) return null;
        const d = JSON.parse(raw);
        if (!d || !Array.isArray(d.rows) || !d.rows.length) return null;
        return d;
    } catch(e) { return null; }
}
function saveDraft() {
    const l = liveRows(); if (!l) return false;
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ rows: l.rows, src: l.src, savedAt: new Date().toISOString(), by: ((cur() || {}).name || '') }));
        lastSnap = JSON.stringify(l.rows);
        return true;
    } catch(e) { return false; }
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch(e) {} lastSnap = ''; }

function restoreDraft(d) {
    if (!d) return;
    if (d.src === 'ub') {
        window._ubRows = d.rows.slice();
        if (window.UST && UST.renderRows) UST.renderRows();
    } else {
        window._bulkRows = d.rows.slice();
        if (window.bulkRenderRows) window.bulkRenderRows();
        if (window.assistantRenderBulkList) window.assistantRenderBulkList();
        if (window.renderBulkList) window.renderBulkList();
    }
    lastSnap = JSON.stringify(d.rows);
    invalidateCache();
}

/* مودال اختيار: استعادة / تجاهل / إلغاء */
window.spOpenDraftModal = function(onAfterOpen) {
    const d = readDraft();
    if (!d) { if (onAfterOpen) onAfterOpen(); return; }
    const when = d.savedAt ? new Date(d.savedAt).toLocaleString('ar-EG') : 'وقت غير معروف';
    const html = `<div class="modal-header"><h3 class="modal-title">📝 مسودة محفوظة</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>
    <div class="modal-body">
        <div class="filter-info" style="background:var(--warning-bg);color:var(--warning);border-color:var(--warning);">
            💾 عندك مسودة إضافة مجمعة: <strong>${d.rows.length} طالب</strong>${d.by ? (' — بواسطة ' + d.by) : ''}<br>📅 آخر حفظ: <strong>${when}</strong>
        </div>
        <div style="max-height:180px;overflow-y:auto;margin:10px 0;">
            ${d.rows.slice(0, 8).map((r, i) => `<div class="sp-upd-row"><span>${i + 1}. <strong>${r.name || r.pp || '-'}</strong></span><span class="text-xs text-muted">${r.pp || r.parent || ''}</span></div>`).join('')}
            ${d.rows.length > 8 ? `<div class="text-xs text-muted" style="text-align:center;">+ ${d.rows.length - 8} آخرين...</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-success" style="flex:1;" onclick="window.spDraftRestore()">✅ استعادة وإكمال</button>
            <button class="btn btn-danger" style="flex:1;" onclick="window.spDraftDiscard()">🗑️ حذف المسودة</button>
        </div>
    </div>`;
    window.__spDraftAfter = onAfterOpen || null;
    if (window.ThemeManager && ThemeManager.openModal) ThemeManager.openModal(html, 'modal-sm');
};
window.spDraftRestore = function() {
    const d = readDraft();
    restoreDraft(d);
    if (window.ThemeManager) ThemeManager.closeModal();
    sToast('✅ تم استعادة المسودة — كمّل من مودال الإضافة المجمعة', 'success');
    const fn = window.__spDraftAfter; window.__spDraftAfter = null;
    if (fn) { window.__spDraftSkipPrompt = true; setTimeout(() => { try { fn(); } finally { window.__spDraftSkipPrompt = false; } }, 200); }
    render();
};
window.spDraftDiscard = function() {
    clearDraft();
    if (window.ThemeManager) ThemeManager.closeModal();
    sToast('🗑️ تم حذف المسودة', 'info');
    const fn = window.__spDraftAfter; window.__spDraftAfter = null;
    if (fn) { window.__spDraftSkipPrompt = true; setTimeout(() => { try { fn(); } finally { window.__spDraftSkipPrompt = false; } }, 200); }
    render();
};

/* لفّ أزرار فتح الإضافة المجمعة: اسأل عن المسودة الأول */
function wrapBulkOpeners() {
    ['openUnifiedBulkAdd', 'openBulkAddStudentModal', 'openAssistantBulkAddStudentModal'].forEach(fn => {
        const orig = window[fn];
        if (typeof orig === 'function' && !orig.__draftWrapped) {
            window[fn] = function() {
                const args = arguments;
                if (readDraft() && !window.__spDraftSkipPrompt) {
                    window.spOpenDraftModal(function() { orig.apply(window, args); });
                    return;
                }
                return orig.apply(window, args);
            };
            window[fn].__draftWrapped = true;
        }
    });
}
wrapBulkOpeners(); setTimeout(wrapBulkOpeners, 1000); setTimeout(wrapBulkOpeners, 2500);

/* لفّ دوال الحفظ: امسح المسودة بعد الحفظ الناجح */
function wrapBulkSavers() {
    if (window.UST && UST.saveBulk && !UST.saveBulk.__draftWrapped) {
        const o = UST.saveBulk;
        UST.saveBulk = async function() { const r = await o.apply(this, arguments); clearDraft(); render(); return r; };
        UST.saveBulk.__draftWrapped = true;
    }
    ['saveBulkStudents', 'saveAssistantBulkStudents', 'bulkSaveAll'].forEach(fn => {
        const o = window[fn];
        if (typeof o === 'function' && !o.__draftWrapped) {
            window[fn] = async function() { const r = await o.apply(this, arguments); clearDraft(); render(); return r; };
            window[fn].__draftWrapped = true;
        }
    });
}
wrapBulkSavers(); setTimeout(wrapBulkSavers, 1000); setTimeout(wrapBulkSavers, 2500);

/* حفظ تلقائي كل 2.5 ثانية لو فيه تغيير + مسح لو الكشف فاضي والمودال مفتوح */
setInterval(function() {
    try {
        const l = liveRows();
        if (l) {
            const s = JSON.stringify(l.rows);
            if (s !== lastSnap) saveDraft();
        } else {
            const modalOpen = document.getElementById('ubList') || document.getElementById('bulkRowsList') || document.getElementById('aBulkRowsList');
            if (modalOpen && readDraft()) { clearDraft(); render(); }
        }
    } catch(e) {}
}, 2500);

/* قبل الخروج: احفظ المسودة + اسأل "متأكد؟" */
window.addEventListener('beforeunload', function(e) {
    try {
        const l = liveRows();
        if (l) { saveDraft(); e.preventDefault(); e.returnValue = ''; }
    } catch(err) {}
});
window.addEventListener('pagehide', function() { try { if (liveRows()) saveDraft(); } catch(e) {} });

/* عند دخول الصفحة: لو فيه مسودة قديمة اعرض رسالة الاستعادة */
function promptDraftOnLoad() {
    const d = readDraft(); if (!d) return;
    if (liveRows()) return; // فيه بيانات حية بالفعل — متفتحش رسالة
    const when = d.savedAt ? new Date(d.savedAt).toLocaleString('ar-EG') : 'وقت غير معروف';
    const html = `<div class="modal-header"><h3 class="modal-title">📝 آخر مسودة محفوظة</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>
    <div class="modal-body">
        <div class="filter-info" style="background:var(--warning-bg);color:var(--warning);border-color:var(--warning);">
            💾 دي آخر مسودة إضافة مجمعة اتحفظت: <strong>${d.rows.length} طالب</strong><br>📅 ${when}
        </div>
        <p style="margin:10px 0;font-size:14px;">تحب نستعيدها ونكمّل منها ولا نبدأ من جديد ونتخلص منها؟</p>
        <div style="display:flex;gap:8px;">
            <button class="btn btn-success" style="flex:1;" onclick="window.spLoadRestore()">✅ استعادة</button>
            <button class="btn btn-danger" style="flex:1;" onclick="window.spLoadDiscard()">🗑️ لا — حذفها</button>
        </div>
    </div>`;
    window.spLoadRestore = function() {
        restoreDraft(d);
        if (window.ThemeManager) ThemeManager.closeModal();
        sToast('✅ تم استعادة المسودة', 'success');
        const opener = (d.src === 'bulk') ? (window.openBulkAddStudentModal || window.openAssistantBulkAddStudentModal || window.openUnifiedBulkAdd) : window.openUnifiedBulkAdd;
        window.__spDraftSkipPrompt = true;
        setTimeout(() => { try { if (opener) opener(); } finally { window.__spDraftSkipPrompt = false; } }, 250);
        render();
    };
    window.spLoadDiscard = function() {
        clearDraft();
        if (window.ThemeManager) ThemeManager.closeModal();
        sToast('🗑️ تمام — المسودة اتحذفت', 'info');
        render();
    };
    if (window.ThemeManager && ThemeManager.openModal) ThemeManager.openModal(html, 'modal-sm');
}
setTimeout(promptDraftOnLoad, 2500);

console.log('✅ Students Page V4 Loaded — Draft System + Profile-Update Alerts Ready');
})();