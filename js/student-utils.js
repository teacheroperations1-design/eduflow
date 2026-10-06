// js/student-utils.js
(function() {
  "use strict";
  
  window.StudentUtils = {
    // تعديل نقاط الطالب (موحدة لكل الأدوار)
    editStudentPoints: async function(sid) {
      try {
        const s = DataService.getUserById ? DataService.getUserById(sid) : null;
        if (!s) return;
        
        const d = (window.DataService && DataService._getData) ? DataService._getData() : {};
        const rows = [];
        
        // جمع كل مصادر النقاط
        (s.pointsHistory || []).forEach((h, i) => {
          rows.push({src:'user', idx:i, pts:(h.points != null ? h.points : (h.amount || 0)), reason:h.reason || h.note || 'نقطة مسجلة', date:h.awardedAt || h.at || ''});
        });
        
        (d.manualPoints || []).forEach((m, i) => {
          if (m.studentId === sid) rows.push({src:'manualPoints', idx:i, pts:m.points || 0, reason:m.reason || 'نقاط يدوية', date:m.awardedAt || m.createdAt || ''});
        });
        
        ['interactionPoints','interactions'].forEach(key => {
          (d[key] || []).forEach((m, i) => {
            if (m.studentId === sid) rows.push({src:key, idx:i, pts:m.points || 0, reason:m.note || 'تفاعل حصة', date:m.awardedAt || m.createdAt || ''});
          });
        });
        
        rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        const total = rows.reduce((a, r) => a + (r.pts || 0), 0);
        
        // عرض المودال
        const html = `<div class="modal-header"><h3 class="modal-title">✏️ نقاط: ${s.name}</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">` +
          `<div class="filter-info">💡 الإجمالي من كل المصادر: <strong style="font-family:var(--font-en);">${total}</strong> نقطة</div>` +
          (rows.length ? rows.map((r, i) => 
            `<div class="sub-row" style="padding:6px 8px;margin-bottom:4px;"><div style="flex:1;"><strong>${r.reason}</strong><div class="text-xs text-muted">${r.date ? new Date(r.date).toLocaleDateString('ar-EG') : '-'} · ${({user:'سجل الطالب',manualPoints:'يدوي',interactionPoints:'تفاعل',interactions:'تفاعل'}[r.src] || r.src)}</div></div><input type="number" class="form-input" style="width:80px;" id="peRow${i}" value="${r.pts}"><button class="btn btn-ghost btn-sm" onclick="StudentUtils.savePtsRow('${sid}','${r.src}',${r.idx},${i})">💾</button><button class="btn btn-danger btn-sm" onclick="StudentUtils.delPtsRow('${sid}','${r.src}',${r.idx})">🗑</button></div>`
          ).join('') : '<p class="text-muted">مفيش نقاط مسجلة</p>') +
          `<div class="card" style="padding:10px;margin-top:10px;"><strong class="text-sm">➕ إضافة نقاط</strong><div style="display:flex;gap:6px;margin-top:8px;"><input type="number" id="peAddVal" class="form-input" style="width:90px;" value="5"><input type="text" id="peAddReason" class="form-input" placeholder="السبب" style="flex:1;"><button class="btn btn-success btn-sm" onclick="StudentUtils.addPts('${sid}')">➕</button></div></div></div>`;
        
        ThemeManager.openModal(html, 'modal-md');
      } catch(e) { console.error(e); }
    },
    
    // حفظ تعديل نقطة
    savePtsRow: async function(sid, src, idx, inputIdx) {
      try {
        const val = parseInt((document.getElementById('peRow' + inputIdx) || {}).value) || 0;
        if (src === 'user') {
          const s = DataService.getUserById ? DataService.getUserById(sid) : null;
          if (!s || !s.pointsHistory || !s.pointsHistory[idx]) return;
          s.pointsHistory[idx].points = val;
          if (DataService.updateUser) await DataService.updateUser(sid, {pointsHistory: s.pointsHistory});
        } else {
          const d = (window.DataService && DataService._getData) ? DataService._getData() : {};
          const rec = (d[src] || [])[idx];
          if (!rec) return;
          rec.points = val;
          DataService._saveData(d);
          try { if (window.FirebaseService && FirebaseService._db) FirebaseService.saveDoc(src, rec.id, rec); } catch(e) {}
        }
        if (window.safeToast) window.safeToast('✅ تم التعديل', 'success');
        StudentUtils.editStudentPoints(sid);
      } catch(e) { if (window.safeToast) window.safeToast('خطأ', 'error'); }
    },
    
    // حذف نقطة
    delPtsRow: async function(sid, src, idx) {
      try {
        if (!confirm('حذف النقطة دي؟')) return;
        if (src === 'user') {
          const s = DataService.getUserById ? DataService.getUserById(sid) : null;
          if (!s || !s.pointsHistory) return;
          s.pointsHistory.splice(idx, 1);
          if (DataService.updateUser) await DataService.updateUser(sid, {pointsHistory: s.pointsHistory});
        } else {
          const d = (window.DataService && DataService._getData) ? DataService._getData() : {};
          const rec = (d[src] || [])[idx];
          d[src] = (d[src] || []).filter((_, j) => j !== idx);
          DataService._saveData(d);
          try { if (rec && window.FirebaseService && FirebaseService._db) FirebaseService.deleteDoc(src, rec.id); } catch(e) {}
        }
        if (window.safeToast) window.safeToast('🗑 تم الحذف', 'success');
        StudentUtils.editStudentPoints(sid);
      } catch(e) {}
    },
    
    // إضافة نقاط يدوية
    addPts: function(sid) {
      try {
        const pts = parseInt((document.getElementById('peAddVal') || {}).value) || 0;
        if (!pts) { if (window.safeToast) window.safeToast('اكتب العدد', 'error'); return; }
        const reason = (document.getElementById('peAddReason') || {}).value || 'نقاط يدوية';
        const u = (window.AuthService && AuthService.getCurrentUser) ? AuthService.getCurrentUser() : null;
        const d = (window.DataService && DataService._getData) ? DataService._getData() : {};
        d.manualPoints = d.manualPoints || [];
        const rec = {id:'mp_' + Date.now(), studentId:sid, points:pts, reason:reason, awardedBy:(u || {}).id || '', awardedAt:new Date().toISOString()};
        d.manualPoints.push(rec);
        DataService._saveData(d);
        try { if (window.FirebaseService && FirebaseService._db) FirebaseService.saveDoc('manualPoints', rec.id, rec); } catch(e) {}
        try { if (DataService.addNotification) DataService.addNotification({targetUserId:sid, title:'🏆 نقاط جديدة', message:'+' + pts + ' نقطة — ' + reason, type:'points', priority:'medium', meta:{event:'points'}}); } catch(e) {}
        if (window.safeToast) window.safeToast('✅ +' + pts + ' نقطة', 'success');
        StudentUtils.editStudentPoints(sid);
      } catch(e) {}
    },
    
    // إضافة نقاط سريعة (prompt)
    addPtsManual: function(sid) {
      const amt = prompt('عدد النقاط المضافة (سالب للخصم):', '5');
      if (amt === null) return;
      const n = parseInt(amt);
      if (!n) return;
      const reason = prompt('السبب:', 'تعديل يدوي');
      if (typeof Ops !== 'undefined' && Ops.addManualPoints) Ops.addManualPoints(sid, n, reason || 'تعديل يدوي', ((window.AuthService && AuthService.getCurrentUser) ? AuthService.getCurrentUser() : {})?.id || '');
      if (window.safeToast) window.safeToast('✅ تم تعديل النقاط (' + (n > 0 ? '+' : '') + n + ')', 'success');
    }
  };
  
  // Backward compatibility
  window.editStudentPoints = window.StudentUtils.editStudentPoints;
  window.savePtsRow = window.StudentUtils.savePtsRow;
  window.delPtsRow = window.StudentUtils.delPtsRow;
  window.addPtsManual = window.StudentUtils.addPtsManual;
})();