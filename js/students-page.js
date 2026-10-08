/* ================================================================
📋 Students Page Unified V3 — صفحة طلاب موحدة واحترافية (أدمن/مساعد/مدرس)
• تصميم عصري موحد (Unified UI) مع صلاحيات مخصصة لكل دور
• المساعد: يرى طلاب أستاذه فقط + إمكانية الحذف
• الأدمن: يرى الكل + فلاتر متقدمة + إمكانية الحذف
• تحسينات: تجاوب كامل، أزرار اتصال/واتساب، شارات نواقص، ومنع فقدان التركيز
• 🆕 إضافة أداة كشف وحل تكرار المجموعات لنفس الأستاذ (منع تضارب الأرقام)
================================================================ */
(function(){
"use strict";

/* ========== 1. Helpers & State ========== */
const db = () => (window.DataService && DataService._getData) ? DataService._getData() : {};
const cur = () => {
    try { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : ((window.AuthService && AuthService.getCurrentUser) ? AuthService.getCurrentUser() : null); } 
    catch(e) { return null; }
};
const nmz = (x) => String(x || '').toLowerCase().replace(/\s+/g, ' ').trim();
const ens = (sid) => {
    try { return (DataService.getStudentTeachers ? DataService.getStudentTeachers(sid) : []) || []; } 
    catch(e) { return []; }
};
const lv = () => (typeof EduFlowConfig !== 'undefined' && EduFlowConfig.educationLevels) ? EduFlowConfig.educationLevels : {};
const getUser = (id) => (DataService.getUserById ? DataService.getUserById(id) : null);

const isAdmin = () => {
    const u = cur();
    return u && (u.role === 'admin' || u.role === 'super_admin');
};

const isAssistant = () => {
    const u = cur();
    return u && u.role === 'assistant';
};

const getMyTeacherId = () => {
    if (window.getMyTeacherId) return window.getMyTeacherId();
    return null;
};

// Safe phone formatting for WhatsApp and Tel links
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
    if (!ens(s.id).length) m.push('غير مقيّد في مجموعة');
    return m;
};

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
            (DataService.getGroups ? DataService.getGroups() : []).forEach(g => {
                if (g.teacherId === tid) gids[g.id] = 1;
            });
            all = all.filter(s => ens(s.id).some(e => e.group && gids[e.group.id]));
        } else {
            all = []; // Assistant with no teacher assigned sees nothing
        }
    } else if (u && u.role === 'teacher') {
        all = all.filter(s => ens(s.id).some(e => e.teacher && e.teacher.id === u.id));
    }
    return all;
}

function filtered() {
    let list = baseStudents();
    
    // Teacher filter (Admin only)
    if (SP.t.length) {
        list = list.filter(s => {
            const tids = ens(s.id).map(e => e.teacher && e.teacher.id);
            return SP.t.every(t => tids.indexOf(t) >= 0);
        });
    }
    if (SP.c) list = list.filter(s => ens(s.id).some(e => e.group && (e.group.center || '') === SP.c));
    if (SP.st) list = list.filter(s => (s.stage || '') === SP.st);
    if (SP.g) list = list.filter(s => {
        const gv = String(s.grade || '');
        return gv === SP.g || gv.indexOf(SP.g) >= 0 || SP.g.indexOf(gv) >= 0;
    });
    
    if (SP.m) {
        list = list.filter(s => {
            const miss = missingOf(s);
            if (SP.m === 'any') return miss.length > 0;
            if (SP.m === 'ok') return miss.length === 0;
            if (SP.m === 'parent') return !s.parentPhone;
            if (SP.m === 'phone') return !s.phone;
            if (SP.m === 'grade') return !s.grade || !s.stage;
            if (SP.m === 'group') return !ens(s.id).length;
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

/* ========== 3. CSS Injection (Modern Unified UI) ========== */
if(!document.getElementById('spCssV3')){
    const sst = document.createElement('style');
    sst.id = 'spCssV3';
    sst.textContent = `
    .sp-container { display: flex; flex-direction: column; gap: 16px; }
    .sp-filters-card {
        background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
        padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
    }
    .sp-filters-header {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border);
    }
    .sp-filters-title { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .sp-filters-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .sp-form-group { display: flex; flex-direction: column; gap: 6px; }
    .sp-form-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
    .sp-form-control {
        width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
        background: var(--surface-hover); color: var(--text); font-size: 14px; transition: all 0.2s;
    }
    .sp-form-control:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-bg); }
    
    .sp-teacher-dropdown { position: relative; }
    .sp-teacher-trigger {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
        background: var(--surface-hover); cursor: pointer; font-size: 14px;
    }
    .sp-teacher-menu {
        position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
        background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); max-height: 250px; overflow-y: auto;
        margin-top: 4px; display: none;
    }
    .sp-teacher-menu.show { display: block; }
    .sp-teacher-option {
        display: flex; align-items: center; gap: 10px; padding: 10px 12px;
        cursor: pointer; transition: background 0.15s;
    }
    .sp-teacher-option:hover { background: var(--primary-bg); }
    
    .sp-stats-bar {
        display: flex; justify-content: space-between; align-items: center;
        margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 12px;
    }
    .sp-stat-item { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
    .sp-stat-value { font-family: var(--font-en); font-weight: 800; color: var(--primary); }
    .sp-stat-value.warn { color: var(--warning); }
    
    .sp-table-wrap {
        background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
        overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .sp-table { width: 100%; border-collapse: collapse; }
    .sp-table th {
        background: var(--surface-hover); padding: 14px 16px; text-align: right;
        font-size: 12px; font-weight: 700; color: var(--text-secondary);
        text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border);
        position: sticky; top: 0; z-index: 10;
    }
    .sp-table td { padding: 14px 16px; border-bottom: 1px solid var(--border); font-size: 14px; vertical-align: middle; }
    .sp-table tbody tr { transition: background 0.15s; }
    .sp-table tbody tr:hover { background: var(--primary-bg); }
    .sp-table tbody tr:last-child td { border-bottom: none; }
    
    .sp-student-info { display: flex; flex-direction: column; gap: 4px; }
    .sp-student-name { font-weight: 700; font-size: 14px; color: var(--text); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .sp-student-groups { font-size: 12px; color: var(--text-muted); }
    .sp-code-badge {
        display: inline-block; padding: 4px 8px; background: var(--surface-hover);
        border-radius: 6px; font-family: var(--font-en); font-weight: 700; font-size: 12px; color: var(--text-secondary);
    }
    .sp-points-badge {
        display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
        background: linear-gradient(135deg, var(--primary-bg), var(--accent-bg));
        color: var(--primary); border-radius: 20px; font-weight: 800; font-size: 13px; font-family: var(--font-en);
    }
    
    .sp-phone-cell { display: flex; flex-direction: column; gap: 6px; font-family: var(--font-en); direction: ltr; text-align: right; }
    .sp-phone-link { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font-weight: 600; font-size: 13px; }
    .sp-phone-link.student { color: var(--info); }
    .sp-phone-link.parent { color: var(--warning); }
    .sp-wa-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 26px; height: 26px; background: #25d366; color: #fff;
        border-radius: 50%; font-size: 12px; text-decoration: none; transition: transform 0.2s;
    }
    .sp-wa-btn:hover { transform: scale(1.1); }
    
    .sp-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .sp-action-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border);
        background: var(--surface); color: var(--text-secondary); cursor: pointer;
        transition: all 0.2s; font-size: 14px;
    }
    .sp-action-btn:hover { background: var(--surface-hover); border-color: var(--primary); color: var(--primary); }
    .sp-action-btn.danger:hover { border-color: var(--danger); color: var(--danger); background: var(--danger-bg); }
    
    .sp-missing-badge {
        display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
        background: var(--warning-bg); color: var(--warning); border-radius: 12px;
        font-size: 11px; font-weight: 700; animation: spPulse 2s infinite;
    }
    @keyframes spPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
    
    .sp-empty {
        text-align: center; padding: 60px 20px; background: var(--surface);
        border: 1px dashed var(--border); border-radius: 16px;
    }
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
    
    // Header
    html += '<div class="sp-filters-header">';
    html += '<div class="sp-filters-title">🔍 فلاتر البحث والتصفية</div>';
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    html += '<button class="btn btn-warning btn-sm" onclick="window.detectAndResolveDuplicates()" title="كشف الطلاب المكررين في مجموعات نفس الأستاذ">🔍 كشف وحل التكرار</button>';
    html += '<button class="btn btn-primary btn-sm" onclick="window.open(\'print-qr.html\',\'_blank\')" title="طباعة باركودات الطلاب">📱 طباعة باركودات</button>';
    html += '</div>';
    html += '</div>';
    
    // Grid
    html += '<div class="sp-filters-grid">';
    
    // Multi-Teacher Filter (Admin Only)
    if (isAdmin()) {
        html += '<div class="sp-form-group sp-teacher-dropdown" id="spTeacherDropdown">';
        html += `<label class="sp-form-label">فلتر الأساتذة (المشتركين)</label>`;
        html += `<div class="sp-teacher-trigger" onclick="window.toggleTeacherMenu()">`;
        html += `<span>${SP.t.length ? SP.t.length + ' أستاذ محدد' : 'كل الأساتذة'}</span>`;
        html += `<span>⌄</span></div>`;
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
        // Assistant Scope Indicator
        const tid = getMyTeacherId();
        const teacher = tid ? getUser(tid) : null;
        html += `<div class="sp-form-group">
            <label class="sp-form-label">نطاق العرض</label>
            <div style="padding:10px 12px;background:var(--primary-bg);color:var(--primary);border-radius:8px;font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px;">
                👨‍🏫 طلاب الأستاذ: ${teacher ? teacher.name : 'غير محدد'}
            </div>
        </div>`;
    }
    
    // Center
    html += `<div class="sp-form-group">
        <label class="sp-form-label">🏢 السنتر</label>
        <select class="sp-form-control" onchange="window.setFilter('c', this.value)">
            <option value="">كل السناتر</option>
            ${Object.keys(centers).map(c => `<option value="${c}" ${SP.c === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
    </div>`;
    
    // Stage
    html += `<div class="sp-form-group">
        <label class="sp-form-label">🎯 المرحلة</label>
        <select class="sp-form-control" onchange="window.setFilter('st', this.value)">
            <option value="">كل المراحل</option>
            ${Object.keys(lv()).map(k => `<option value="${k}" ${SP.st === k ? 'selected' : ''}>${lv()[k].nameAr}</option>`).join('')}
        </select>
    </div>`;
    
    // Grade
    html += `<div class="sp-form-group">
        <label class="sp-form-label">🎓 الصف</label>
        <select class="sp-form-control" onchange="window.setFilter('g', this.value)">
            <option value="">كل الصفوف</option>
            ${grades.map(g => `<option value="${g}" ${SP.g === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
    </div>`;
    
    // Missing
    html += `<div class="sp-form-group">
        <label class="sp-form-label">⚠️ النواقص</label>
        <select class="sp-form-control" onchange="window.setFilter('m', this.value)">
            <option value="" ${SP.m === '' ? 'selected' : ''}>✅ الكل</option>
            <option value="any" ${SP.m === 'any' ? 'selected' : ''}>أي بيانات ناقصة</option>
            <option value="parent" ${SP.m === 'parent' ? 'selected' : ''}>رقم ولي الأمر</option>
            <option value="phone" ${SP.m === 'phone' ? 'selected' : ''}>رقم الطالب</option>
            <option value="grade" ${SP.m === 'grade' ? 'selected' : ''}>الصف/المرحلة</option>
            <option value="group" ${SP.m === 'group' ? 'selected' : ''}>غير مقيّد</option>
            <option value="name" ${SP.m === 'name' ? 'selected' : ''}>الاسم غير كامل</option>
            <option value="ok" ${SP.m === 'ok' ? 'selected' : ''}>السليمين فقط</option>
        </select>
    </div>`;
    
    // Search
    html += `<div class="sp-form-group" style="grid-column: span 2 / auto;">
        <label class="sp-form-label">🔍 بحث سريع</label>
        <input type="text" class="sp-form-control" id="spSearchInput" placeholder="اسم / كود / رقم..." value="${SP.q || ''}" oninput="window.setFilter('q', this.value)">
    </div>`;
    
    html += '</div>'; // end grid
    
    // Active Filters Tags (Admin)
    if (isAdmin() && SP.t.length) {
        html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:16px;">';
        SP.t.forEach(tid => {
            const t = getUser(tid);
            html += `<span class="badge badge-info" style="padding:6px 10px;display:inline-flex;align-items:center;gap:6px;">
                ${t ? t.name : tid} 
                <b style="cursor:pointer;opacity:0.7;" onclick="window.toggleTeacherFilter('${tid}')">✕</b>
            </span>`;
        });
        html += '</div>';
    }
    
    // Stats Bar
    const list = filtered();
    const missAll = baseStudents().filter(s => missingOf(s).length > 0).length;
    
    html += '<div class="sp-stats-bar">';
    html += `<div style="display:flex;gap:16px;flex-wrap:wrap;">
        <div class="sp-stat-item">معروض: <span class="sp-stat-value">${list.length}</span> طالب</div>
        <div class="sp-stat-item">⚠️ ناقص بيانات: <span class="sp-stat-value warn">${missAll}</span></div>
    </div>`;
    html += '</div>';
    
    html += '</div>';
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
        let pts = 0;
        try { if (typeof Ops !== 'undefined' && Ops.getStudentPoints) pts = Ops.getStudentPoints(s.id, null, 'all') || 0; } catch(e) {}
        const lvName = (lv()[s.stage] && lv()[s.stage].nameAr) || s.stage || '-';
        
        // 🚨 تعديل: جلب الاشتراكات وفحص التكرار
        const enrollments = ens(s.id);
        const groupsTxt = enrollments.map(e => e.group && e.group.name).filter(Boolean).join('، ') || '<span style="color:var(--text-muted);">لا مجموعات</span>';
        
        // كشف إذا كان الطالب مشتركاً في مجموعتين لنفس الأستاذ (خطأ)
        const teacherCounts = {};
        enrollments.forEach(e => {
            const tid = e.teacherId || (e.teacher && e.teacher.id);
            if (tid) {
                teacherCounts[tid] = (teacherCounts[tid] || 0) + 1;
            }
        });
        const hasDuplicateTeacher = Object.values(teacherCounts).some(count => count > 1);
        const dupBadge = hasDuplicateTeacher ? '<span class="sp-missing-badge" style="background:var(--danger-bg);color:var(--danger);margin-inline-start:6px;" title="تحذير: الطالب مشترك في أكثر من مجموعة لنفس الأستاذ (خطأ)">⚠️ تكرار مجموعات</span>' : '';
        
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

        // Actions
        let act = `<div class="sp-actions">`;
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
            <thead>
                <tr>
                    <th>#</th>
                    <th>الكود</th>
                    <th>الاسم</th>
                    <th>المرحلة</th>
                    <th>الصف</th>
                    <th>📱 الطالب</th>
                    <th>👨 ولي الأمر</th>
                    <th>النقاط</th>
                    <th>إجراءات</th>
                </tr>
            </thead>
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
            if (start !== null && restored.setSelectionRange) {
                restored.setSelectionRange(start, end);
            }
        }
    }
};

window.toggleTeacherFilter = function(id) {
    const i = SP.t.indexOf(id);
    if (i >= 0) SP.t.splice(i, 1);
    else SP.t.push(id);
    render();
};

window.toggleTeacherMenu = function() {
    const menu = document.getElementById('spTeacherMenu');
    if (menu) menu.classList.toggle('show');
};

document.addEventListener('click', function(e) {
    const menu = document.getElementById('spTeacherMenu');
    const dropdown = document.getElementById('spTeacherDropdown');
    if (menu && dropdown && !dropdown.contains(e.target)) {
        menu.classList.remove('show');
    }
});

// Override legacy functions
window.loadStudents = render;
window.loadStudentsList = render;
window.renderStudents = render;
window.fillStudentFilters = function() {};
window.updateStudentTeacherFilter = function() { render(); };

function hook() {
    if (typeof window.showSection === 'function' && !window.__spHookV3) {
        window.__spHookV3 = 1;
        const os = window.showSection;
        window.showSection = function(id) {
            const r = os.apply(this, arguments);
            if (id === 'students') setTimeout(render, 150);
            return r;
        };
    }
}

hook();
setTimeout(hook, 800);
setTimeout(hook, 2000);
setTimeout(render, 600);
setTimeout(render, 1500);

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
                    inputs.forEach(function(input) {
                        input.setAttribute('maxlength', '11');
                    });
                    if (node.tagName === 'INPUT' && (node.type === 'tel' || /phone/i.test(node.id) || /01/.test(node.placeholder))) {
                        node.setAttribute('maxlength', '11');
                    }
                }
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

/* ========== 7. 🆕 Duplicate Detection & Resolution Tools ========== */
window.detectAndResolveDuplicates = function() {
    const students = baseStudents();
    const duplicates = [];
    
    students.forEach(s => {
        const enrollments = ens(s.id);
        const teacherGroups = {};
        enrollments.forEach(e => {
            const tid = e.teacherId || (e.teacher && e.teacher.id);
            if(tid) {
                if(!teacherGroups[tid]) teacherGroups[tid] = [];
                teacherGroups[tid].push(e);
            }
        });
        
        Object.keys(teacherGroups).forEach(tid => {
            if(teacherGroups[tid].length > 1) {
                duplicates.push({
                    student: s,
                    teacherId: tid,
                    teacherName: (teacherGroups[tid][0].teacher && teacherGroups[tid][0].teacher.name) || getUser(tid)?.name || 'أستاذ',
                    groups: teacherGroups[tid]
                });
            }
        });
    });
    
    if(!duplicates.length) {
        if(window.safeToast) window.safeToast('✅ لا يوجد طلاب مكررين في مجموعات نفس الأستاذ', 'success');
        return;
    }
    
    let html = `<div class="modal-header"><h3 class="modal-title">⚠️ كشف تكرار المجموعات (${duplicates.length} حالة)</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>`;
    html += `<div class="modal-body"><div class="filter-info" style="background:var(--warning-bg);color:var(--warning);border-color:var(--warning);">تم العثور على طلاب مشتركين في أكثر من مجموعة لنفس الأستاذ. هذا يسبب تضارب في الحسابات والعدادات. يرجى اختيار مجموعة واحدة فقط للإبقاء عليها وحذف الباقي.</div>`;
    
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
        
        html += `</div>
            <button class="btn btn-danger btn-sm" style="margin-top:8px;width:100%;" onclick="window.resolveDuplicate('${dup.student.id}', '${dup.teacherId}', ${idx})">✅ تطبيق الحذف والإبقاء على المختار</button>
        </div>`;
    });
    
    html += `</div>`;
    if(window.ThemeManager && ThemeManager.openModal) ThemeManager.openModal(html, 'modal-lg');
};

/* 🧹 حذف اشتراك من كل أماكن التخزين الممكنة (عام + داخل الطالب + دوال DataService) */
window.spRemoveEnrollmentEverywhere = function(studentId, groupId) {
    let removed = false, removedId = null;
    const d = (window.DataService && DataService._getData) ? DataService._getData() : {};
    // 1) المصفوفة العامة d.enrollments (بـ groupId فقط — مش شرط teacherId)
    if (Array.isArray(d.enrollments)) {
        const hit = d.enrollments.find(en => en && en.studentId === studentId && en.groupId === groupId);
        if (hit) removedId = hit.id || null;
        const before = d.enrollments.length;
        d.enrollments = d.enrollments.filter(en => !(en && en.studentId === studentId && en.groupId === groupId));
        if (d.enrollments.length !== before) removed = true;
    }
    // 2) المخزن داخل كائن الطالب user.enrollments
    const u = (d.users || []).find(x => x && x.id === studentId);
    if (u && Array.isArray(u.enrollments)) {
        const before = u.enrollments.length;
        u.enrollments = u.enrollments.filter(en => !(en && (en.groupId === groupId || en.group === groupId)));
        if (u.enrollments.length !== before) removed = true;
    }
    // 3) لو الاتنين فوق ملقوش حاجة — جرّب دوال DataService الجاهزة
    if (!removed) {
        try {
            if (typeof DataService.unenrollStudent === 'function') { DataService.unenrollStudent(studentId, groupId); removed = true; }
            else if (typeof DataService.removeStudentFromGroup === 'function') { DataService.removeStudentFromGroup(studentId, groupId); removed = true; }
            else if (typeof DataService.removeEnrollment === 'function') { DataService.removeEnrollment(studentId, groupId); removed = true; }
        } catch(e) {}
    }
    // 4) حفظ محلي + مزامنة سحابية
    if (removed || removedId) {
        try { if (DataService._saveData) DataService._saveData(d); } catch(e) {}
        if (removedId && window.FirebaseService && FirebaseService.connected) {
            try { FirebaseService.deleteDoc('enrollments', removedId); } catch(e) {}
        }
        if (u && window.FirebaseService && FirebaseService.connected) {
            try { FirebaseService.saveDoc('users', studentId, u); } catch(e) {}
        }
    }
    return removed;
};

window.resolveDuplicate = async function(studentId, teacherId, idx) {
    const keepRadio = document.querySelector(`input[name="dup_keep_${idx}"]:checked`);
    if(!keepRadio) {
        if(window.safeToast) window.safeToast('يرجى اختيار مجموعة للإبقاء عليها', 'error');
        return;
    }
    const keepGroupId = keepRadio.value;
    // المجموعات اللي هتتمسح = كل مجموعات الطالب عند نفس الأستاذ عدا المختارة
    const ensList = (DataService.getStudentTeachers ? DataService.getStudentTeachers(studentId) : []) || [];
    const toRemove = [];
    ensList.forEach(e => {
        const tid = (e.teacher && e.teacher.id) || e.teacherId || (e.group && e.group.teacherId);
        const gid = (e.group && e.group.id) || e.groupId;
        if (tid === teacherId && gid && gid !== keepGroupId) toRemove.push(gid);
    });
    if(!toRemove.length) {
        if(window.safeToast) window.safeToast('مفيش حاجة تتحذف — الحالة دي اتظبطت قبل كده', 'warning');
        return;
    }
    let removedCount = 0;
    for (const gid of toRemove) {
        if (window.spRemoveEnrollmentEverywhere(studentId, gid)) removedCount++;
    }
    if(window.safeToast) window.safeToast(removedCount ? (`✅ تم حذف ${removedCount} مجموعة مكررة للطالب`) : '⚠️ ملقاش الاشتراك محلياً — حدّث الصفحة وجرب تاني', removedCount ? 'success' : 'warning');
    if(window.ThemeManager) ThemeManager.closeModal();
    window.detectAndResolveDuplicates();
    render();
};

// Intercept Edit Modal to warn about duplicates safely
function patchEditProfile() {
    if (window.openEditStudentProfile && !window.openEditStudentProfile.__v3Patched) {
        const orig = window.openEditStudentProfile;
        window.openEditStudentProfile = function(sid) {
            const enrollments = ens(sid);
            const teacherGroups = {};
            enrollments.forEach(e => {
                const tid = e.teacherId || (e.teacher && e.teacher.id);
                if(tid) {
                    if(!teacherGroups[tid]) teacherGroups[tid] = [];
                    teacherGroups[tid].push(e);
                }
            });
            
            const duplicates = Object.keys(teacherGroups).filter(tid => teacherGroups[tid].length > 1);
            
            if(duplicates.length > 0) {
                let html = `<div class="modal-header"><h3 class="modal-title">⚠️ تحذير: تكرار مجموعات</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>`;
                html += `<div class="modal-body">`;
                html += `<div class="filter-info" style="background:var(--danger-bg);color:var(--danger);border-color:var(--danger);">
                    هذا الطالب مشترك في أكثر من مجموعة لنفس الأستاذ. هذا يسبب تضارب في الحسابات والعدادات. 
                    يرجى حذف المجموعات المكررة أولاً قبل التعديل.
                </div>`;
                
                duplicates.forEach((tid, idx) => {
                    const groups = teacherGroups[tid];
                    const tName = (groups[0].teacher && groups[0].teacher.name) || getUser(tid)?.name || 'أستاذ';
                    html += `<div class="card" style="margin-bottom:12px; border-right:4px solid var(--warning);">
                        <strong>👨‍🏫 ${tName}</strong>
                        <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">`;
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
                
                html += `<button class="btn btn-primary w-full" onclick="ThemeManager.closeModal(); window.openEditStudentProfile('${sid}');" style="margin-top:12px;">✅ تم الحذف، فتح مودال التعديل</button>`;
                html += `</div>`;
                
                if(window.ThemeManager && ThemeManager.openModal) ThemeManager.openModal(html, 'modal-md');
                return;
            }
            
            return orig.call(this, sid);
        };
        window.openEditStudentProfile.__v3Patched = true;
    }
}

setTimeout(patchEditProfile, 500);
setTimeout(patchEditProfile, 1500);
setTimeout(patchEditProfile, 3000);

window.quickRemoveEnrollment = async function(studentId, groupId, teacherId) {
    const ok = window.spRemoveEnrollmentEverywhere(studentId, groupId);
    if(window.safeToast) window.safeToast(ok ? '✅ تم حذف المجموعة المكررة' : '⚠️ ملقاش الاشتراك — حدّث الصفحة وجرب', ok ? 'success' : 'warning');
    window.openEditStudentProfile(studentId);
    render();
};

console.log('✅ Students Page V3 Loaded Successfully');
})();