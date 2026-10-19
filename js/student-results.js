/* ================================================================
📊 Student Results V4 — نتائج الطالب مجمعة حسب الأستاذ
• يحترم releasePolicy (instant فوري / approve بعد الاعتماد)
• Overview stats + فلاتر + بحث
• مودال تفاصيل بالترتيب والإحصائيات
• 📜 شهادة تقدير A4 للطباعة
================================================================ */
(function(){
"use strict";

function db(){ return (window.DataService && DataService._getData) ? DataService._getData() : {}; }
function cur(){
  try{ return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 
    ((window.AuthService && AuthService.getCurrentUser) ? AuthService.getCurrentUser() : null);
  }catch(e){ return null; }
}
function sid(){
  var u = cur(); if(!u) return null;
  return u.role === 'parent' ? ((u.studentIds || [])[0] || null) : u.id;
}
function escS(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

/* 🎯 دوال فحص حالة الإصدار */
function hasScore(att){
  return att && typeof att.score === 'number';
}
function isReleased(rec, att){
  if(!att) return false;
  if(att.status === 'approved') return true;
  if(att.autoGraded) return true;
  var pol = rec.releasePolicy || 'approve';
  if(pol === 'instant' && hasScore(att)) return true;
  return false;
}

/* ========== الرندر الرئيسي ========== */
window.loadResultsV3 = function(){
  try{
    var me = sid(); if(!me) return;
    var sec = document.getElementById('section-results'); if(!sec) return;
    
    /* إنشاء الحاويات لو مش موجودة */
    var host = document.getElementById('resultsGrouped');
    if(!host){
      ['resultsGrid','resultsPaperList','resultsOnlineList'].forEach(function(id){
        var el = document.getElementById(id); if(el) el.remove();
      });
      host = document.createElement('div');
      host.id = 'resultsGrouped';
      host.style.cssText = 'display:grid;gap:16px;';
      sec.appendChild(host);
    }
    var ov = document.getElementById('resultsOverview');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'resultsOverview';
      ov.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:14px;';
      host.parentNode.insertBefore(ov, host);
    }
    
    var d = db();
    var ts = (DataService.getStudentTeachers ? DataService.getStudentTeachers(me) : []);
    var gmap = {}; ts.forEach(function(t){ if(t.group) gmap[t.group.id] = t; });
    
    /* قراءة الفلاتر */
    var q = ((document.getElementById('resSearch') || {}).value || '').toLowerCase();
    var fT = ((document.getElementById('resTypeFilter') || {}).value || 'all');
    var fS = ((document.getElementById('resStatusFilter') || {}).value || 'all');
    
    /* تجميع العناصر */
    var items = [];
    (d.exams || []).forEach(function(e){
      if(!gmap[e.groupId] || fT === 'hw') return;
      var att = (d.examAttempts || []).find(function(a){ return a.examId === e.id && a.studentId === me; });
      var st = 'draft', score = null, max = e.totalPoints || 100;
      if(att){
        max = att.maxScore || max;
        if(isReleased(e, att)){ st = 'approved'; score = att.score; }
        else if(hasScore(att)){ st = 'pending'; score = att.score; }
        else if(att.submittedAt){ st = 'pending'; }
      }
      items.push({
        kind:'exam', off:(e.mode==='offline'||!!e.paper), rec:e, att:att,
        st:st, score:score, max:max, title:e.title||'', date:e.date||e.createdAt||'', gid:e.groupId
      });
    });
    (d.homework || []).forEach(function(h){
      if(!gmap[h.groupId] || fT === 'exam') return;
      var sub = (d.submissions || []).find(function(s){ return s.homeworkId === h.id && s.studentId === me; });
      var st = 'draft', score = null, max = h.totalPoints || 20;
      if(sub){
        max = sub.maxScore || max;
        if(isReleased(h, sub)){ st = 'approved'; score = sub.score; }
        else if(hasScore(sub)){ st = 'pending'; score = sub.score; }
        else if(sub.submittedAt){ st = 'pending'; }
      }
      items.push({
        kind:'hw', off:!!h.paper, rec:h, att:sub,
        st:st, score:score, max:max, title:h.title||'', date:h.deadline||h.createdAt||'', gid:h.groupId
      });
    });
    
    /* تطبيق الفلاتر */
    items = items.filter(function(it){
      if(fS !== 'all' && it.st !== fS) return false;
      if(q && it.title.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    items.sort(function(a,b){ return String(b.date).localeCompare(String(a.date)); });
    
    /* إحصائيات */
    var app = items.filter(function(i){ return i.st === 'approved' && i.score != null; });
    var avg = app.length ? Math.round(app.reduce(function(s,i){ return s+(i.score/i.max*100); }, 0)/app.length) : 0;
    var pend = items.filter(function(i){ return i.st === 'pending'; }).length;
    var cert = app.filter(function(i){ return (i.score/i.max) >= 0.85; }).length;
    
    function box(v,i,l,c){
      return '<div class="card" style="padding:12px;text-align:center;margin:0;"><div style="font-size:22px;font-weight:900;color:'+c+';font-family:var(--font-en);">'+v+'</div><div class="text-xs text-muted">'+i+' '+l+'</div></div>';
    }
    ov.innerHTML = box(items.length,'📚','تقييم','var(--primary)')
      + box(app.length,'✅','صادر','var(--success)')
      + box(pend,'🕒','مراجعة','var(--warning)')
      + box(avg+'%','📊','متوسطك', avg>=75?'var(--success)':avg>=50?'var(--warning)':'var(--danger)')
      + box(cert,'📜','شهادات','var(--warning)');
    
    if(!items.length){
      host.innerHTML = '<div class="card" style="text-align:center;padding:36px;"><div style="font-size:44px;">📭</div><strong>لا نتائج مطابقة</strong><p class="text-xs text-muted" style="margin-top:6px;">جرّب توسيع الفلاتر</p></div>';
      return;
    }
    
    /* تجميع حسب الأستاذ */
    var byT = {};
    items.forEach(function(it){
      var t = gmap[it.gid];
      var tid = (t && t.teacher) ? t.teacher.id : 'x';
      if(!byT[tid]) byT[tid] = {t:(t&&t.teacher)||null, g:(t&&t.group)||null, list:[]};
      byT[tid].list.push(it);
    });
    
    host.innerHTML = Object.keys(byT).map(function(tid){
      var b = byT[tid];
      var tA = b.list.filter(function(i){ return i.st==='approved' && i.score!=null; });
      var tP = tA.length ? Math.round(tA.reduce(function(s,i){ return s+(i.score/i.max*100); },0)/tA.length) : 0;
      
      return '<div class="card" style="padding:0;overflow:hidden;">'+
        '<div style="background:linear-gradient(135deg,var(--primary),#8b5cf6);color:#fff;padding:12px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">'+
        '<div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:900;">'+escS(((b.t&&b.t.name)||'؟').charAt(0))+'</div>'+
        '<div style="flex:1;"><strong>'+escS((b.t&&b.t.name)||'أساتذتي')+'</strong><div style="font-size:11px;opacity:.9;">📚 '+escS((b.t&&b.t.subject)||'')+' · 👥 '+escS((b.g&&b.g.name)||'')+'</div></div>'+
        (tP?'<span style="background:rgba(255,255,255,.25);padding:4px 12px;border-radius:99px;font-weight:900;">⭐ '+tP+'%</span>':'')+
        '</div><div style="padding:10px;display:grid;gap:8px;">'+
        b.list.map(function(it){
          var pct = it.score != null ? Math.round(it.score/it.max*100) : null;
          var badge = (it.st==='approved' && pct!=null)
            ? '<span class="grade-badge '+(pct>=75?'success':pct>=50?'warning':'danger')+'">'+it.score+'/'+it.max+' · '+pct+'%</span>'
            : (it.st==='pending' ? '<span class="badge badge-warning">🕒 قيد المراجعة</span>' : '<span class="badge badge-muted">لم يُسلّم</span>');
          var ico = it.kind==='exam' ? (it.off?'🎓📄':'🎓🌐') : (it.off?'📝📄':'📝🌐');
          return '<div class="sub-row" style="padding:10px;cursor:pointer;" onclick="window.openResultDetails(\''+it.kind+'\',\''+it.rec.id+'\')">'+
            '<div style="flex:1;min-width:0;"><strong style="font-size:13px;">'+ico+' '+escS(it.title)+'</strong><div class="text-xs text-muted">📅 '+escS(String(it.date).slice(0,10))+((pct!=null && pct>=85 && it.st==='approved')?' · 📜 شهادة':'')+'</div></div>'+badge+'</div>';
        }).join('')+
        '</div></div>';
    }).join('');
  }catch(e){ console.error('loadResultsV3', e); }
};

/* ========== مودال التفاصيل ========== */
window.openResultDetails = function(kind, id){
  try{
    var me = sid(); if(!me) return;
    var d = db();
    var rec = (kind==='exam' ? (d.exams||[]) : (d.homework||[])).find(function(x){ return x.id === id; });
    if(!rec) return;
    var col = (kind==='exam' ? (d.examAttempts||[]) : (d.submissions||[]));
    var key = (kind==='exam' ? 'examId' : 'homeworkId');
    var mine = col.find(function(x){ return x[key] === id && x.studentId === me; });
    var all = col.filter(function(x){ return x[key] === id && x.score != null; }).sort(function(a,b){ return b.score - a.score; });
    var rank = all.findIndex(function(x){ return x.studentId === me; }) + 1;
    var max = rec.totalPoints || 20;
    var avg = all.length ? Math.round(all.reduce(function(s,x){ return s+x.score; },0)/all.length) : 0;
    var released = isReleased(rec, mine);
    
    var sb;
    if(!mine){
      sb = '<div style="text-align:center;padding:16px;"><div style="font-size:44px;">📭</div><strong>لم تسلّم بعد</strong></div>';
    } else if(!released || mine.score == null){
      sb = '<div style="text-align:center;padding:16px;"><div style="font-size:44px;">🕒</div><strong>قيد المراجعة</strong><div class="text-xs text-muted" style="margin-top:6px;">الدرجة تظهر بعد اعتماد الأستاذ</div></div>';
    } else {
      var pct = Math.round(mine.score/max*100);
      var c = pct>=75 ? 'var(--success)' : pct>=50 ? 'var(--warning)' : 'var(--danger)';
      sb = '<div style="text-align:center;padding:14px;">'+
        '<div style="font-size:40px;font-weight:900;color:'+c+';font-family:var(--font-en);">'+mine.score+' / '+max+'</div>'+
        '<div style="font-size:20px;font-weight:800;color:'+c+';">'+pct+'%</div>'+
        ((pct>=85) ? '<button class="btn btn-warning btn-sm" style="margin-top:10px;" onclick="window.printCertificate(\''+kind+'\',\''+id+'\')">📜 طباعة شهادة التقدير</button>' : '')+
        '</div>';
    }
    
    ThemeManager.openModal(
      '<div class="modal-header"><h3 class="modal-title">'+(kind==='exam'?'🎓':'📝')+' '+escS(rec.title)+'</h3>'+
      '<button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>'+
      '<div class="modal-body">'+sb+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-top:10px;">'+
      (rank ? '<div class="card" style="padding:10px;text-align:center;margin:0;"><div style="font-size:20px;font-weight:900;color:var(--primary);">#'+rank+'</div><div class="text-xs text-muted">ترتيبك من '+all.length+'</div></div>' : '')+
      '<div class="card" style="padding:10px;text-align:center;margin:0;"><div style="font-size:20px;font-weight:900;">'+avg+'</div><div class="text-xs text-muted">متوسط المجموعة</div></div>'+
      '<div class="card" style="padding:10px;text-align:center;margin:0;"><div style="font-size:20px;font-weight:900;color:var(--success);">'+(all.length?all[0].score:'-')+'</div><div class="text-xs text-muted">أعلى درجة</div></div>'+
      '<div class="card" style="padding:10px;text-align:center;margin:0;"><div style="font-size:20px;font-weight:900;color:var(--danger);">'+(all.length?all[all.length-1].score:'-')+'</div><div class="text-xs text-muted">أقل درجة</div></div>'+
      '</div></div>',
      'modal-md'
    );
  }catch(e){ console.error(e); }
};

/* ========== 📜 الشهادة ========== */
window.printCertificate = function(kind, id){
  try{
    var u = cur(); if(!u) return;
    var d = db();
    var rec = (kind==='exam' ? (d.exams||[]) : (d.homework||[])).find(function(x){ return x.id === id; });
    if(!rec) return;
    var att = (kind==='exam'
      ? (d.examAttempts||[]).find(function(a){ return a.examId === id && a.studentId === u.id; })
      : (d.submissions||[]).find(function(s){ return s.homeworkId === id && s.studentId === u.id; }));
    var g = (DataService.getGroups ? DataService.getGroups() : []).find(function(x){ return x.id === rec.groupId; });
    var teacher = (g && g.teacherId) ? (DataService.getUserById ? DataService.getUserById(g.teacherId) : null) : null;
    var max = (att && att.maxScore) ? att.maxScore : (rec.totalPoints || 20);
    var score = (att && att.score != null) ? att.score : 0;
    var pct = Math.round(score/max*100);
    
    var html = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>شهادة تقدير</title>'+
      '<style>@page{size:A4 landscape;margin:0;}body{margin:0;font-family:Cairo,Tahoma,serif;background:#fff;color:#0f172a;}'+
      '.cert{width:297mm;height:208mm;background:linear-gradient(135deg,#fef3c7,#fde68a);padding:16mm;box-sizing:border-box;position:relative;border:10px double #92400e;text-align:center;}'+
      '.t1{font-size:42px;font-weight:900;color:#92400e;margin-top:12mm;}.t2{font-size:17px;color:#78350f;margin-bottom:7mm;}'+
      '.nm{font-size:40px;font-weight:900;color:#7c2d12;margin:7mm auto;border-bottom:3px solid #92400e;display:inline-block;padding:0 18mm 4mm;}'+
      '.bd{font-size:17px;line-height:2;}.sc{font-size:32px;font-weight:900;color:#15803d;margin:7mm 0;}'+
      '.ft{position:absolute;bottom:10mm;left:20mm;right:20mm;display:flex;justify-content:space-between;align-items:center;font-size:13px;}'+
      '.seal{width:24mm;height:24mm;border:3px solid #92400e;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;color:#92400e;}</style>'+
      '</head><body><div class="cert">'+
      '<div class="t1">🏆 شهادة تقدير</div><div class="t2">Certificate of Excellence</div>'+
      '<div class="bd">تُمنح هذه الشهادة إلى الطالب/ة</div><div class="nm">'+escS(u.name||'')+'</div>'+
      '<div class="bd">لتفوقه في '+(kind==='exam'?'امتحان':'واجب')+': <strong>'+escS(rec.title||'')+'</strong><br>المادة: <strong>'+escS((teacher&&teacher.subject)||'-')+'</strong> · الأستاذ: <strong>'+escS((teacher&&teacher.name)||'-')+'</strong></div>'+
      '<div class="sc">'+score+' / '+max+' · '+pct+'%</div>'+
      '<div class="ft"><div class="seal">EduFlow</div><div>التاريخ: '+new Date().toLocaleDateString('ar-EG')+'</div><div class="seal">Habbash</div></div>'+
      '</div></body></html>';
    
    var w = window.open('', '_blank');
    if(!w){ if(window.safeToast) window.safeToast('اسمح بالنوافذ المنبثقة للطباعة', 'warning'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(function(){ try{ w.focus(); w.print(); }catch(e){} }, 700);
  }catch(e){
    console.error(e);
    if(window.safeToast) window.safeToast('خطأ في إنشاء الشهادة', 'error');
  }
};

/* ========== الربط ========== */
window.loadResults = window.loadResultsV3;
window.loadResultsV2 = window.loadResultsV3;

/* Hook تلقائي */
if(typeof window.showSection === 'function' && !window.__resHook){
  window.__resHook = 1;
  var os = window.showSection;
  window.showSection = function(id){
    var r = os.apply(this, arguments);
    if(id === 'results') setTimeout(window.loadResultsV3, 80);
    return r;
  };
}

/* تشغيل تلقائي لو القسم نشط */
var act = document.querySelector('.section.active');
if(act && act.id === 'section-results') window.loadResultsV3();

})();