/* ================================================================
📒 Ledger UI V8 — دفتر التحصيل النهائي
• cloudMS معرّف → التعديلات بتتحفظ محلي وسحابي من غير أخطاء
• الشهور السابقة (قبل الحالي): مربعاتها من الترحيل/الحضور/الإلغاء بس — مقفولة كـ "منتهي"
• بداية الشهور من ldgStartMonth (افتراضي 2026-08)
• فلاتر شغالة: أستاذ(أدمن)/سنتر/مرحلة/صف/حالة/شهر/بحث (مع حفظ مكان الكتابة)
• تولبار فوق: تحديث + ترحيل حصص + حصة للعداد
• إحصائيات فوق + كروت المجموعات + تحت: قوائم دفعوا/مدفوعوش متزامنة ومعها تفاصيل
================================================================ */
(function(){
"use strict";
var LU=window.LedgerUI=window.LedgerUI||{};
LU._st=LU._st||{month:'',gid:'',q:'',teacher:'',center:'',stage:'',grade:'',status:''};
LU._ctx='page';
window.__ldgModalOpen=null;
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function saveD(d){ if(DataService._saveData) DataService._saveData(d); }
async function cloudPay(p,del){ try{ if(window.FirebaseService&&FirebaseService._db){ if(del) await FirebaseService.deleteDoc('payments',p.id); else await FirebaseService.saveDoc('payments',p.id,p); } }catch(e){} }
async function cloudEn(e,del){ try{ if(window.FirebaseService&&FirebaseService._db){ if(del) await FirebaseService.deleteDoc('enrollments',e.id); else await FirebaseService.saveDoc('enrollments',e.id,e); } }catch(e){} }
async function cloudMS(ms,del){ try{ if(window.FirebaseService&&FirebaseService._db){ if(del) await FirebaseService.deleteDoc('manualSessions',ms.id); else await FirebaseService.saveDoc('manualSessions',ms.id,ms); } }catch(e){} }
function cur(){ try{ return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null); }catch(e){ return null; } }
function isAdmin(){ var u=cur(); return u&&(u.role==='admin'||u.role==='super_admin'); }
function localToday(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function localMonth(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function normMonth(m){ return m||localMonth(); }
function today(){ return localToday(); }
function monthName(m){ try{ return new Date(normMonth(m)+'-01T12:00:00').toLocaleDateString('ar-EG',{month:'long',year:'numeric'}); }catch(e){ return m; } }
function monthDays(m){ var y=+m.slice(0,4),mm=+m.slice(5,7),n=new Date(y,mm,0).getDate(),out=[]; for(var i=1;i<=n;i++) out.push(m+'-'+String(i).padStart(2,'0')); return out; }
function startMonth(){ try{ return localStorage.getItem('ldgStartMonth')||'2026-10'; }catch(e){ return '2026-10'; } }
function monthsList(){ var out=[],cur=localMonth(),m=startMonth(),guard=0; while(m<=cur&&guard<36){ out.push(m); var d=new Date(m+'-01T12:00:00'); d.setMonth(d.getMonth()+1); m=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); guard++; } if(out.indexOf(cur)<0) out.push(cur); return out; }
var WD=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function groups(){ return (DataService.getGroups?DataService.getGroups():[]); }
function gById(id){ return groups().find(function(g){return g.id===id;}); }
function reqOf(g){ return (g&&g.sessionsPerMonth)||((window.EduFlowConfig&&EduFlowConfig.billing&&EduFlowConfig.billing.sessionsBeforePayment)||8); }
function myTeacherId(){ return (window.getMyTeacherId?window.getMyTeacherId():null); }
function myGroups(){ var u=cur(); if(!u) return []; if(isAdmin()) return groups(); var tid=myTeacherId(); if(tid){ var f=groups().filter(function(g){return g.teacherId===tid;}); if(f.length) return f; } var gs=(typeof Ops!=='undefined'&&Ops.groupsInScope)?Ops.groupsInScope(u.id):[]; return gs.length?gs:(tid?groups().filter(function(g){return g.teacherId===tid;}):[]); }
function studentsOf(gid){
var list=(DataService.getStudentsByGroup?DataService.getStudentsByGroup(gid):[])||[];
var ids={}; list.forEach(function(s){ids[s.id]=1;});
(db().enrollments||[]).forEach(function(e){ if(e.groupId===gid&&e.status==='active'){ var s=DataService.getUserById?DataService.getUserById(e.studentId):null; if(s&&!ids[s.id]){ids[s.id]=1;list.push(s);} } });
(DataService.getStudents?DataService.getStudents():[]).forEach(function(s){ if(s.groupId===gid&&!ids[s.id]){ids[s.id]=1;list.push(s);} });
return list;
}

/* CSS */
if(!document.getElementById('ldgCss')){
var st=document.createElement('style'); st.id='ldgCss';
st.textContent=
'.ldg-sq{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;padding:0 3px;border-radius:5px;border:1px solid var(--border);font-size:9px;font-weight:800;font-family:var(--font-en);margin-inline-end:3px;cursor:pointer;}'+
'.ldg-sq.green{background:var(--success);color:#fff;border-color:var(--success);}'+
'.ldg-sq.red{background:var(--danger);color:#fff;border-color:var(--danger);}'+
'.ldg-sq.gray{background:var(--surface-hover);color:var(--text-muted);}'+
'.ldg-sq.ring{box-shadow:0 0 0 2px var(--info);}'+
'.ldg-sq:hover{transform:scale(1.12);}'+
'.ldg-count{font-family:var(--font-en);font-size:11px;margin-inline-start:4px;}'+
'.ldg-wrap{overflow-x:auto;}'+
'.ldg-table{width:100%;border-collapse:collapse;min-width:680px;}'+
'.ldg-table th{position:sticky;top:0;background:var(--surface);z-index:2;box-shadow:0 1px 0 var(--border);font-size:11px;color:var(--text-muted);text-align:right;padding:8px 6px;}'+
'.ldg-table td{padding:8px 6px;border-bottom:1px solid var(--border);font-size:12px;vertical-align:top;}'+
'.ldg-table tbody tr:hover{background:var(--primary-bg);}'+
'.ldg-chip{display:inline-flex;align-items:center;gap:4px;background:var(--surface-hover);border:1px solid var(--border);border-radius:9999px;padding:2px 8px;font-size:10px;margin:2px;cursor:pointer;}'+
'.ldg-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:12px;}'+
'.ldg-stat{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;}'+
'.ldg-stat b{display:block;font-size:18px;font-family:var(--font-en);color:var(--primary);}'+
'.ldg-stat span{font-size:10px;color:var(--text-muted);}'+
'.ldg-gcard{border:1px solid var(--border);border-radius:12px;margin-bottom:14px;overflow:hidden;background:var(--surface);}'+
'.ldg-ghead{padding:10px 12px;background:var(--surface-hover);}'+
'.ldg-strip{margin-top:8px;display:flex;align-items:center;flex-wrap:wrap;gap:2px;}'+
'.ldg-toolbar{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-bottom:8px;}'+
'.ldg-lrow{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--surface);flex-wrap:wrap;}'+
'@media(max-width:700px){.ldg-table{min-width:0;}.ldg-table thead{display:none;}.ldg-table tr{display:block;border:1px solid var(--border);border-radius:10px;margin-bottom:10px;padding:8px;background:var(--surface);}.ldg-table td{display:flex;justify-content:space-between;gap:8px;border:none;padding:4px 0;}.ldg-table td::before{content:attr(data-label);font-size:10px;font-weight:800;color:var(--text-muted);flex-shrink:0;}}';
document.head.appendChild(st);
}

/* ========== أعلام التعديل اليدوي ========== */
function fKey(gid,month){ return gid+'__'+month; }
function getFlags(gid,month){ var d=db(); return (d.sessionFlags||{})[fKey(gid,month)]||{cancel:[],take:[]}; }
function setFlags(gid,month,fl){ var d=db(); d.sessionFlags=d.sessionFlags||{}; d.sessionFlags[fKey(gid,month)]=fl; saveD(d); try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('sessionFlags',fKey(gid,month),fl); }catch(e){} }

/* ========== 🟩 المربعات ========== */
LU.groupSessions=function(gid,month){
month=normMonth(month);
LU._sesCache=LU._sesCache||{};
var _ck=gid+'|'+month;
if(LU._sesCache[_ck]) return LU._sesCache[_ck];
var g=gById(gid)||{}; var req=reqOf(g); var tStr=localToday();
var isPast=month<localMonth();
var att=(DataService.getAttendance?DataService.getAttendance():[]).filter(function(a){return a.groupId===gid&&a.status==='approved'&&(a.date||'').startsWith(month);});
var canc=(DataService.getCancelledSessions?DataService.getCancelledSessions():[]).filter(function(c){return c.groupId===gid&&(c.date||'').startsWith(month);});
var madeupDates={}; canc.forEach(function(c){ if(c.makeupStatus==='done'&&c.makeupDate) madeupDates[c.makeupDate]=1; });
function isBad(c){ return c&&c.makeupStatus!=='done'; }
var greens={};
att.forEach(function(a){ var c=canc.find(function(x){return x.date===a.date;}); if(isBad(c)) return; greens[a.date]=madeupDates[a.date]?'madeup':'done'; });
/* التلوين التلقائي من مواعيد المجموعة: للشهر الحالي بس — الشهور السابقة خلصانة بالترحيل */
if(!isPast){
var sch=(g.schedules&&g.schedules.length)?g.schedules:(g.day?[{day:g.day}]:[]);
monthDays(month).forEach(function(ds){
if(ds>tStr) return;
if(!sch.some(function(s){return s.day===WD[new Date(ds+'T12:00:00').getDay()];})) return;
var c=canc.find(function(x){return x.date===ds;}); if(isBad(c)) return;
if(!greens[ds]) greens[ds]=madeupDates[ds]?'madeup':'done';
});
}
var MS=0; (db().manualSessions||[]).forEach(function(ms){ if(ms.groupId===gid&&(ms.month||'')===month&&(!ms.type||ms.type==='counter')) MS+=(ms.sessionsCount||0); });
/* 🎯 العداد المخزن (sessionNow) يتحسب في شهره بس + إصلاح مرة واحدة للعدادات القديمة */
if(g&&g.sessionNow>0){
if(!g.sessionNowMonth){
g.sessionNowMonth=localMonth();
try{ if(DataService.updateGroup) DataService.updateGroup(gid,{sessionNowMonth:g.sessionNowMonth}); }catch(e){}
}
if((g.sessionNowMonth||'')===month&&+g.sessionNow>M) M=+g.sessionNow;
}
var ev=[]; Object.keys(greens).sort().forEach(function(d){ ev.push({t:greens[d],d:d}); });
var M=ev.length+MS; while(ev.length<M) ev.unshift({t:'manual',d:''});
canc.forEach(function(c){ if(c.makeupStatus!=='done') ev.push({t:'cancelled',d:c.date}); });
var fl=getFlags(gid,month);
ev=ev.map(function(e){
if(e.t!=='cancelled'&&(fl.cancel||[]).indexOf(e.d)>=0) return {t:'cancelled',d:e.d,flag:1};
if(e.t==='cancelled'&&(fl.take||[]).indexOf(e.d)>=0) return {t:'done',d:e.d,flag:1};
return e;
});
(fl.take||[]).forEach(function(d){ if(!d) return; if(!ev.some(function(e){return e.d===d;})) ev.push({t:'done',d:d,flag:1}); });
for(var i=0;i<(fl.take||[]).filter(function(d){return !d;}).length;i++) ev.push({t:'done',d:'',flag:1});
ev.sort(function(a,b){ return String(a.d||'0000-00-00').localeCompare(String(b.d||'0000-00-00')); });
var done=ev.filter(function(e){return e.t!=='cancelled';}).length;
var _res={events:ev,done:done,required:req,complete:done>=req,remaining:Math.max(0,req-done),manual:M,isPast:isPast};
LU._sesCache[_ck]=_res;
return _res;
};
function sqStrip(s){
var html=s.events.map(function(e){
if(e.t==='manual') return '<span class="ldg-sq green" title="حصة مرحّلة/يدوية (محسوبة)">📥</span>';
if(!e.d&&e.flag) return '<span class="ldg-sq green" title="مربع مضاف يدوياً">＋</span>';
var day=String(e.d||'').slice(8,10);
if(e.t==='cancelled') return '<span class="ldg-sq red" title="'+e.d+' — ملغاة (مش محسوبة)">'+day+'</span>';
if(e.t==='madeup') return '<span class="ldg-sq green ring" title="'+e.d+' — تعويض (محسوبة)">↺'+day+'</span>';
return '<span class="ldg-sq green" title="'+e.d+' — محسوبة على كل طلاب المجموعة">'+day+'</span>';
}).join('');
for(var i=0;i<Math.max(0,s.required-s.done);i++) html+='<span class="ldg-sq gray" title="لسه مأخدتش"></span>';
return '<div class="ldg-strip">'+html+'<b class="ldg-count">'+s.done+'/'+s.required+'</b>'+(s.complete?' <span class="badge badge-warning">💰 الشهرية مستحقة</span>':'')+'</div>';
}

/* ========== ✏️ مودال تعديل المربعات + تحكم الترحيل ========== */
LU.editSquares=function(gid,month){
try{
month=normMonth(month||LU._st.month);
var g=gById(gid); var ses=LU.groupSessions(gid,month);
var rows=ses.events.map(function(e,i){
var lbl=e.d?('📅 '+e.d):'بدون تاريخ';
var btns='';
if(e.t==='cancelled') btns='<button class="btn btn-success btn-sm" onclick="LedgerUI.sqToggle(\''+gid+'\',\''+month+'\',\''+(e.d||'')+'\',\'take\')">✓ اتأخذت</button>';
else if(e.d) btns='<button class="btn btn-danger btn-sm" onclick="LedgerUI.sqToggle(\''+gid+'\',\''+month+'\',\''+e.d+'\',\'cancel\')">✗ إلغاء حسابها</button>';
if(!e.d&&e.flag) btns=' <button class="btn btn-ghost btn-sm" onclick="LedgerUI.sqRemoveUndated(\''+gid+'\',\''+month+'\')">🗑 حذف المربع</button>';
if(!e.d&&!e.flag) btns='<button class="btn btn-danger btn-sm" onclick="LedgerUI.carryDec(\''+gid+'\',\''+month+'\')">🗑 حذف حصة مرحّلة</button>';
return '<div class="sub-row" style="margin-bottom:6px;padding:8px;"><div>'+(e.t==='cancelled'?'🟥':'')+' <strong>مربع '+(i+1)+':</strong> '+lbl+(e.flag?' <span class="badge badge-info">يدوي</span>':'')+'</div><div style="white-space:nowrap;">'+btns+'</div></div>';
}).join('');
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">✏️ مربعات حصص: '+g.name+' — '+monthName(month)+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'
+'<div class="filter-info">💡 الحالي: <strong>'+ses.done+'/'+ses.required+'</strong> · المتبقي من حصص المجموعة: <strong>'+ses.remaining+'</strong>'+(ses.isPast?' · <span class="badge badge-muted">🔒 شهر منتهي — عداده من الترحيل والحضور بس</span>':'')+'</div>'
+'<div class="card" style="padding:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;"><div class="text-sm">📥 حصص مرحّلة على كل الطلاب: <b style="font-family:var(--font-en);">'+(ses.manual||0)+'</b></div><div style="display:flex;gap:6px;"><button class="btn btn-danger btn-sm" onclick="LedgerUI.carryDec(\''+gid+'\',\''+month+'\')">➖ أنقص من الجميع</button><button class="btn btn-success btn-sm" onclick="LedgerUI.carryInc(\''+gid+'\',\''+month+'\')">➕ زوّد للجميع</button></div></div>'
+rows
+'<div class="card" style="padding:10px;margin-top:10px;"><strong class="text-sm">➕ إضافة مربعات يدوية</strong>'
+'<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;"><input type="date" id="sqNewDate" class="form-input" style="width:170px;">'
+'<button class="btn btn-success btn-sm" onclick="LedgerUI.sqAdd(\''+gid+'\',\''+month+'\',1)">➕ حصة مأخوذة بتاريخ</button>'
+'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.sqAdd(\''+gid+'\',\''+month+'\',0)">➕ مربع بدون تاريخ (8→9)</button></div></div>'
+'</div>','modal-md');
}catch(e){ console.error(e); }
};
LU.sqToggle=function(gid,month,date,op){
var fl=getFlags(gid,month); fl.cancel=fl.cancel||[]; fl.take=fl.take||[];
if(op==='cancel'){ if(fl.cancel.indexOf(date)<0) fl.cancel.push(date); fl.take=fl.take.filter(function(d){return d!==date;}); }
else { if(fl.take.indexOf(date)<0) fl.take.push(date); fl.cancel=fl.cancel.filter(function(d){return d!==date;}); }
setFlags(gid,month,fl); LU.refresh(); LU.editSquares(gid,month);
};
LU.sqRemoveUndated=function(gid,month){
var fl=getFlags(gid,month); var i=(fl.take||[]).indexOf('');
if(i>=0){ fl.take.splice(i,1); setFlags(gid,month,fl); }
LU.refresh(); LU.editSquares(gid,month);
};
LU.sqAdd=function(gid,month,dated){
var fl=getFlags(gid,month); fl.take=fl.take||[];
if(dated){ var dv=(document.getElementById('sqNewDate')||{}).value; if(!dv){ if(window.safeToast) window.safeToast('اختار التاريخ الأول','error'); return; } if(fl.take.indexOf(dv)<0) fl.take.push(dv); }
else fl.take.push('');
setFlags(gid,month,fl); LU.refresh(); LU.editSquares(gid,month);
};
LU.carryDec=async function(gid,month){
try{
var d=db(); var touched=[];
var list=(d.manualSessions||[]).filter(function(ms){ return ms.groupId===gid&&(ms.month||'')===month&&(!ms.type||ms.type==='counter'); });
var bySt={}; list.forEach(function(ms){ (bySt[ms.studentId]=bySt[ms.studentId]||[]).push(ms); });
Object.keys(bySt).forEach(function(sid){
var arr=bySt[sid].sort(function(a,b){ return String(b.addedAt||'').localeCompare(String(a.addedAt||'')); });
for(var i=0;i<arr.length;i++){ if((arr[i].sessionsCount||0)>0){ arr[i].sessionsCount-=1; if(arr[i].sessionsCount<=0){ d.manualSessions=(d.manualSessions||[]).filter(function(x){return x.id!==arr[i].id;}); touched.push({del:arr[i]}); } else touched.push({save:arr[i]}); break; } }
});
saveD(d);
for(var i2=0;i2<touched.length;i2++){ var t=touched[i2]; await cloudMS(t.del?t.del:t.save,!!t.del); }
if(window.safeToast) window.safeToast('➖ تم إنقاص حصة — المربعات رجعت فاضية','success');
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
finally{ LU.refresh(); try{ LU.editSquares(gid,month); }catch(e){} }
};
LU.carryInc=async function(gid,month){
try{
var d=db(); d.manualSessions=d.manualSessions||[]; var touched=[];
studentsOf(gid).forEach(function(s){
var arr=(d.manualSessions||[]).filter(function(ms){ return ms.groupId===gid&&ms.studentId===s.id&&(ms.month||'')===month&&(!ms.type||ms.type==='counter'); });
if(arr.length){ arr.sort(function(a,b){ return String(b.addedAt||'').localeCompare(String(a.addedAt||'')); }); arr[0].sessionsCount=(arr[0].sessionsCount||0)+1; touched.push(arr[0]); }
else { var ms={id:'ms_'+Date.now()+'_'+s.id,groupId:gid,studentId:s.id,month:month,sessionsCount:1,type:'counter',reason:'إضافة يدوية من الدفتر',addedBy:(cur()||{}).id||'',addedAt:new Date().toISOString()}; d.manualSessions.push(ms); touched.push(ms); }
});
saveD(d);
for(var i=0;i<touched.length;i++){ await cloudMS(touched[i],false); }
if(window.safeToast) window.safeToast('➕ تم إضافة حصة لكل طلاب المجموعة','success');
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
finally{ LU.refresh(); try{ LU.editSquares(gid,month); }catch(e){} }
};

/* ========== الدفعات ========== */
function paysFor(sid,gid){ return (db().payments||[]).filter(function(p){return p.studentId===sid&&p.groupId===gid;}).sort(function(a,b){return String(a.month).localeCompare(String(b.month));}); }
function payFor(sid,gid,month){ return paysFor(sid,gid).find(function(p){return (p.month||'')===month;})||null; }
function paidOf(p){ return p?(p.paidAmount||0):0; }
function histSum(p){ return ((p&&p.history)||[]).reduce(function(a,h){return a+(h.amount||0);},0); }
/* 📅 الشهور المستحقة: أي شهر كمّلت فيه مربعات المجموعة (8/8) وشهريته مش مسددة بالكامل */
function dueMonths(sid,gid,fee){
var out=[]; if(!fee) return out;
var list=monthsList();
for(var i=0;i<list.length;i++){
var m=list[i];
var ses=LU.groupSessions(gid,m);
if(!ses.complete) continue;
var paid=paidOf(payFor(sid,gid,m));
if(paid>=fee) continue;
out.push({month:m,fee:fee,paid:paid,rem:Math.max(0,fee-paid)});
}
return out;
}
function flagsOf(sid,g,month,ses){
var total=(g&&g.monthlyFee)||0;
var p=payFor(sid,g.id,month), paid=paidOf(p);
var dms=dueMonths(sid,g.id,total);
var oldOnes=dms.filter(function(x){return x.month<month;});
var curOne=null; for(var i=0;i<dms.length;i++){ if(dms[i].month===month){ curOne=dms[i]; break; } }
var oRem=oldOnes.reduce(function(a,x){return a+x.rem;},0);
var curRem=curOne?curOne.rem:0;
var isPaid=total>0&&paid>=total;
return {total:total,paid:paid,p:p,isPaid:isPaid,isPartial:paid>0&&!isPaid,isDue:!!curOne,isWarn:(ses.done===ses.required-1)&&!isPaid,isLate:oldOnes.length>0,debts:oldOnes.map(function(x){return x.month;}),dueAll:dms,curRem:curRem,oldRem:oRem,totalRem:oRem+curRem};
}
function histChips(sid,gid){
var ps=paysFor(sid,gid);
if(!ps.length) return '<span class="text-xs text-muted">لا دفعات</span> ';
return ps.map(function(p){ return (p.history||[]).map(function(h){ return '<span class="ldg-chip" title="دفعة '+h.amount+' ج.م بتاريخ '+h.date+' — دوس للتعديل" onclick="LedgerUI.editHistory(\''+sid+'\',\''+gid+'\')">💵 '+String(h.date||'').slice(5,10)+' : '+h.amount+'</span>'; }).join(''); }).join('')
+'<button class="btn btn-ghost btn-sm" title="دفعة يدوية" onclick="LedgerUI.payModal(\''+sid+'\',\''+gid+'\')">➕</button>';
}
function badgeOf(f,ses,month){
var h='';
if(f.isLate) h+='<span class="badge badge-danger">⚠️ متأخر: '+f.debts.map(monthName).join('، ')+'</span> ';
if(f.isPaid) h+='<span class="badge badge-success">✓ مسدد '+monthName(month)+'</span>';
else if(f.isDue) h+= f.paid>0 ? '<span class="badge badge-danger">💰 متبقي من شهرية '+monthName(month)+': '+(f.total-f.paid)+'</span>' : '<span class="badge badge-danger">💰 مطلوب شهرية '+monthName(month)+'</span>';
else if(f.isWarn) h+='<span class="badge badge-warning">🔔 الحصة الجايه الدفع ('+ses.done+'/'+ses.required+')</span>';
else if(f.isPartial) h+='<span class="badge badge-warning">مقدم '+f.paid+'/'+f.total+' (لسه مكملش الحصص)</span>';
else h+='<span class="text-xs text-muted">لسه — '+ses.done+'/'+ses.required+'</span>';
if(f.isPaid&&ses.complete) h+=' <span class="badge badge-info">➡️ دورة الشهر الجاي</span>';
return h;
}

/* ========== الفلاتر (شغالة + حفظ مكان الكتابة) ========== */
function filtersHtml(){
var f=LU._st;
var lv=(typeof EduFlowConfig!=='undefined'&&EduFlowConfig.educationLevels)?EduFlowConfig.educationLevels:{};
var teachers=(DataService.getTeachers?DataService.getTeachers():[]);
var centers={}; groups().forEach(function(g){ if(g.center) centers[g.center]=1; });
var months=monthsList();
var nm=normMonth(f.month); if(months.indexOf(nm)<0) months.push(nm);
var gradeList=f.stage?((lv[f.stage]&&lv[f.stage].grades)||[]):Object.keys(lv).flatMap(function(k){return lv[k].grades||[];});
var tSel=isAdmin()?'<select class="form-select" onchange="LedgerUI.fset(\'teacher\',this.value)"><option value="">👨🏫 كل الأساتذة</option>'+teachers.map(function(t){return '<option value="'+t.id+'" '+(f.teacher===t.id?'selected':'')+'>'+t.name+'</option>';}).join('')+'</select>':'';
return '<div class="card" style="padding:10px;margin-bottom:12px;"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;">'
+tSel
+'<select class="form-select" onchange="LedgerUI.fset(\'center\',this.value)"><option value="">🏢 كل السناتر</option>'+Object.keys(centers).map(function(c){return '<option value="'+c+'" '+(f.center===c?'selected':'')+'>'+c+'</option>';}).join('')+'</select>'
+'<select class="form-select" onchange="LedgerUI.fset(\'stage\',this.value)"><option value="">🎯 كل المراحل</option>'+Object.keys(lv).map(function(k){return '<option value="'+k+'" '+(f.stage===k?'selected':'')+'>'+lv[k].nameAr+'</option>';}).join('')+'</select>'
+'<select class="form-select" onchange="LedgerUI.fset(\'grade\',this.value)"><option value="">🎓 كل الصفوف</option>'+gradeList.map(function(g){return '<option value="'+g+'" '+(f.grade===g?'selected':'')+'>'+g+'</option>';}).join('')+'</select>'
+'<select class="form-select" onchange="LedgerUI.fset(\'status\',this.value)"><option value="">💳 كل الحالات</option><option value="paid" '+(f.status==='paid'?'selected':'')+'>✓ دفعوا</option><option value="warn" '+(f.status==='warn'?'selected':'')+'>🔔 إنذار 7/8</option><option value="due" '+(f.status==='due'?'selected':'')+'>💰 مطلوب الآن (8/8)</option><option value="late" '+(f.status==='late'?'selected':'')+'>⚠️ متأخرين مرحّلين</option></select>'
+'<select class="form-select" onchange="LedgerUI.fset(\'month\',this.value)">'+months.map(function(m){return '<option value="'+m+'" '+(nm===m?'selected':'')+'>'+monthName(m)+(m<localMonth()?' 🔒':'')+'</option>';}).join('')+'</select>'
+'<input type="text" id="ldgQ_'+LU._ctx+'" class="form-input" placeholder="🔍 بحث طالب..." value="'+(f.q||'')+'" oninput="LedgerUI.fset(\'q\',this.value)">'
+'</div></div>';
}
LU.fset=function(k,v){
var ae=document.activeElement, aid=ae?ae.id:null, apos=0;
try{ apos=(ae&&ae.selectionStart!=null)?ae.selectionStart:0; }catch(e){}
LU._st[k]=v; if(k==='stage') LU._st.grade='';
LU.refresh();
if(aid){ var el=document.getElementById(aid); if(el){ try{ el.focus(); el.setSelectionRange(apos,apos); }catch(e){} } }
};
LU.setMonth=function(m){ LU._st.month=m; LU.refresh(); };
LU.setQ=function(q){ LU._st.q=q; LU.refresh(); };
LU.setGid=function(gid){ LU._st.gid=gid||null; LU.refresh(); };
function groupFilter(list){
var f=LU._st;
if(!isAdmin()){ var tid=myTeacherId(); if(tid) list=list.filter(function(g){return g.teacherId===tid;}); }
else if(f.teacher) list=list.filter(function(g){return g.teacherId===f.teacher;});
if(f.center) list=list.filter(function(g){ return String(g.center||'').trim()===String(f.center).trim(); });
if(f.stage) list=list.filter(function(g){return (g.stage||'')===f.stage;});
if(f.grade) list=list.filter(function(g){ return String(g.grade||'').trim()===String(f.grade).trim(); });
if(f.gid) list=list.filter(function(g){return g.id===f.gid;});
return list;
}

/* ========== صفوف موحّدة (مصدر واحد للجدول والإحصائيات والقوائم) ========== */
function buildRows(gs,month){
var f=LU._st; var q=(f.q||'').toLowerCase(); var out=[];
gs.forEach(function(g){
var ses=LU.groupSessions(g.id,month);
studentsOf(g.id).forEach(function(s){
if(q&&(s.name||'').toLowerCase().indexOf(q)<0&&(s.code||'').toLowerCase().indexOf(q)<0) return;
var fl=flagsOf(s.id,g,month,ses);
if(f.status==='paid'&&!fl.isPaid) return;
if(f.status==='partial'&&!fl.isPartial) return;
if(f.status==='warn'&&!fl.isWarn) return;
if(f.status==='due'&&!(fl.isDue&&!fl.isPaid)) return;
if(f.status==='late'&&!fl.isLate) return;
out.push({s:s,g:g,ses:ses,f:fl});
});
});
return out;
}
function toolbarHtml(){
return '<div class="ldg-toolbar">'
+'<button class="btn btn-ghost btn-sm" onclick="LedgerUI.refreshBtn()">🔄 تحديث</button>'
+'<button class="btn btn-warning btn-sm" onclick="window.openBulkBackfillModal&&window.openBulkBackfillModal()">📥 ترحيل حصص</button>'
+'<button class="btn btn-secondary btn-sm" onclick="window.openAsAddSessionsModal&&window.openAsAddSessionsModal()">➕ حصة للعداد</button>'
+'</div>';
}
function statsHtml(rows,gs,month){
var collected=0,remaining=0,paidN=0,unpaidN=0,doneAll=0,reqAll=0;
rows.forEach(function(r){ collected+=r.f.paid; remaining+=r.f.totalRem; if(r.f.isPaid) paidN++; else if(r.f.isLate||r.f.isDue||r.f.isWarn||(r.f.isPartial&&r.ses.done>=r.ses.required-1)) unpaidN++; });
gs.forEach(function(g){ var s=LU.groupSessions(g.id,month); doneAll+=s.done; reqAll+=s.required; });
return '<div class="ldg-stats">'
+'<div class="ldg-stat"><b style="color:var(--success)">'+collected+'</b><span>محصّل '+monthName(month)+'</span></div>'
+'<div class="ldg-stat"><b style="color:var(--danger)">'+remaining+'</b><span>متبقي (قديم+جديد)</span></div>'
+'<div class="ldg-stat"><b>'+paidN+'</b><span>✅ دفعوا</span></div>'
+'<div class="ldg-stat"><b style="color:var(--warning)">'+unpaidN+'</b><span>❌ لسه مدفوعوش</span></div>'
+'<div class="ldg-stat"><b>'+doneAll+'/'+reqAll+'</b><span>حصص المجموعات</span></div></div>';
}
function carryHtml(month,gs){
var m=normMonth(month), rows=[];
(gs||[]).forEach(function(g){
studentsOf(g.id).forEach(function(s){
dueMonths(s.id,g.id,g.monthlyFee||0).forEach(function(x){ if(x.month<m) rows.push({s:s,g:g,rem:x.rem,month:x.month}); });
});
});
if(!rows.length) return '';
return '<div class="card" style="border-color:var(--danger);margin-bottom:12px;"><div class="card-header"><h3 class="card-title" style="color:var(--danger);">⚠️ متأخرات مرحّلة ('+rows.length+')</h3><span class="points-badge">'+rows.reduce(function(a,r){return a+r.rem;},0)+' ج.م</span></div><div style="padding:10px;">'
+rows.map(function(r){ return '<div class="ldg-lrow" style="border-right:3px solid var(--danger);"><div style="flex:1;"><strong>'+(r.s?r.s.name:'-')+'</strong><div class="text-xs text-muted">'+(r.g?r.g.name:'-')+' · شهرية '+monthName(r.month)+' · متبقي '+r.rem+' ج.م</div></div><div style="display:flex;gap:4px;"><button class="btn btn-success btn-sm" onclick="LedgerUI.payModal(\''+r.s.id+'\',\''+r.g.id+'\',\''+r.month+'\')">💰 تحصيل</button><button class="btn btn-ghost btn-sm" onclick="LedgerUI.studentDetails(\''+r.s.id+'\')">👁</button></div></div>'; }).join('')
+'</div></div>';
}
function listsHtml(rows,month){
var paid=rows.filter(function(r){return r.f.isPaid;});
var unpaid=rows.filter(function(r){ return r.f.isLate||r.f.isDue||r.f.isWarn||(r.f.isPartial&&r.ses.done>=r.ses.required-1); });
var paidSum=paid.reduce(function(a,r){return a+r.f.paid;},0);
var unSum=unpaid.reduce(function(a,r){return a+Math.max(0,r.f.total-r.f.paid)+r.f.oldRem;},0);
var h='<div class="card" style="margin-top:14px;"><div class="card-header"><h3 class="card-title" style="color:var(--success);">✅ دفعوا '+monthName(month)+' ('+paid.length+')</h3><span class="points-badge">'+paidSum+' ج.م</span></div><div style="padding:10px;">';
h+=paid.length?paid.map(function(r){
var last=r.f.p&&r.f.p.paidAt?String(r.f.p.paidAt).slice(0,10):(r.f.p&&r.f.p.history&&r.f.p.history.length?r.f.p.history[r.f.p.history.length-1].date:'');
return '<div class="ldg-lrow" style="border-right:3px solid var(--success);"><div style="flex:1;"><strong>'+r.s.name+'</strong><div class="text-xs text-muted">'+r.g.name+' · دفع '+r.f.paid+'/'+r.f.total+' · 📅 '+last+'</div></div><button class="btn btn-ghost btn-sm" onclick="LedgerUI.editHistory(\''+r.s.id+'\',\''+r.g.id+'\')">💵 الدفعات</button></div>';
}).join(''):'<p class="text-xs text-muted">لا أحد بعد هذا الشهر</p>';
h+='</div></div>';
h+='<div class="card"><div class="card-header"><h3 class="card-title" style="color:var(--danger);">❌ لسه مدفوعوش '+monthName(month)+' ('+unpaid.length+')</h3><span class="points-badge">'+unSum+' ج.م</span></div><div style="padding:10px;">';
h+=unpaid.length?unpaid.map(function(r){
var dueTxt=r.f.dueAll.length?r.f.dueAll.map(function(x){return monthName(x.month)+': '+x.rem;}).join(' + '):'مفيش شهر مكمل لسه — أي دفع = مقدم';
var tag=r.f.isLate?'⚠️ متأخرات':(r.f.isDue?'💰 مستحقة الآن':(r.f.isWarn?'🔔 الحصة الجايه الدفع':'—'));
return '<div class="ldg-lrow" style="border-right:3px solid '+(r.f.isWarn&&!r.f.isDue&&!r.f.isLate?'var(--warning)':'var(--danger)')+';"><div style="flex:1;"><strong>'+r.s.name+'</strong> <span class="badge '+(r.f.isWarn&&!r.f.isDue&&!r.f.isLate?'badge-warning':'badge-danger')+'">'+tag+'</span><div class="text-xs text-muted">'+r.g.name+' · مطلوب: '+dueTxt+' · حصصه: '+r.ses.done+'/'+r.ses.required+'</div></div><div style="display:flex;gap:4px;align-items:center;">'+(r.f.isWarn&&!r.f.isDue?'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.notifyBringFee(\''+r.s.id+'\',\''+r.g.id+'\')">🔔 بلّغه</button>':'')+'<button class="btn btn-success btn-sm" onclick="LedgerUI.payModal(\''+r.s.id+'\',\''+r.g.id+'\')">💰 تحصيل</button><button class="btn btn-ghost btn-sm" onclick="LedgerUI.studentDetails(\''+r.s.id+'\')">👁 تفاصيل</button></div></div>';
}).join(''):'<p class="text-xs text-muted">الكل دافع 🎉</p>';
h+='</div></div>';
return h;
}
/* ========== 🔔 إشعار تلقائي عند 7/8 (مرة واحدة لكل مجموعة/شهر) ========== */
function scanNotify(gs,month){
try{
var d=db(); d.warn7=d.warn7||{}; d.due8=d.due8||{};
gs.forEach(function(g){
var ses=LU.groupSessions(g.id,month); var key=g.id+'__'+month; var fee=g.monthlyFee||0;
if(ses.done===ses.required-1&&!d.warn7[key]){
d.warn7[key]=1;
studentsOf(g.id).forEach(function(s){
var fl=flagsOf(s.id,g,month,ses); if(fl.isPaid) return;
if(DataService.addNotification) DataService.addNotification({targetUserId:s.id,title:'🔔 جهز الشهرية',message:'باقي حصة واحدة على اكتمال حصص '+monthName(month)+' ('+ses.done+'/'+ses.required+') — الشهرية ('+fee+' ج.م) تتدفع في الحصة الجايه.',type:'payment',priority:'medium'});
});
}
if(ses.complete&&!d.due8[key]){
d.due8[key]=1;
studentsOf(g.id).forEach(function(s){
var fl=flagsOf(s.id,g,month,ses); if(fl.isPaid) return;
if(DataService.addNotification) DataService.addNotification({targetUserId:s.id,title:'💰 الشهرية مستحقة الآن',message:'اكتملت حصص '+monthName(month)+' ('+ses.done+'/'+ses.required+') — المستحق: '+fee+' ج.م. شكراً لتعاونكم 🌹',type:'payment',priority:'high'});
});
}
});
saveD(d);
}catch(e){}
}
LU.notifyBringFee=function(sid,gid){
try{
var g=gById(gid); var s=DataService.getUserById?DataService.getUserById(sid):null;
var ses=LU.groupSessions(gid,normMonth(LU._st.month));
if(DataService.addNotification) DataService.addNotification({targetUserId:sid,title:'🔔 تذكير بالشهرية',message:'يا '+(s?s.name:'')+' 💜 فاكرناك: الشهرية ('+((g&&g.monthlyFee)||0)+' ج.م) تتحصل في الحصة الجايه ('+ses.done+'/'+ses.required+').',type:'payment',priority:'medium'});
if(window.safeToast) window.safeToast('🔔 تم إرسال التذكير للطالب وولي أمره','success');
}catch(e){}
};

/* ========== كارت مجموعة ========== */
function groupCard(g,month,mode,rowsAll){
var rows=rowsAll?rowsAll.filter(function(r){return r.g.id===g.id;}):buildRows([g],month);
var ses=LU.groupSessions(g.id,month);
var fee=(g.monthlyFee||0);
var expected=rows.length*fee;
var collected=rows.reduce(function(a,r){return a+r.f.paid;},0);
var remaining=rows.reduce(function(a,r){return a+r.f.totalRem;},0);
var tName=(DataService.getUserById&&g.teacherId)?((DataService.getUserById(g.teacherId)||{}).name||'-'):'-';
var head='<div class="ldg-ghead">'
+'<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">'
+'<div style="font-weight:800;font-size:13px;">👥 '+g.name+' <span class="text-xs text-muted">· 👨‍ '+tName+' · 🏢 '+(g.center||'-')+' · '+(g.grade||'-')+' · 💰 '+fee+' · '+rows.length+' طالب</span> '+(ses.isPast?'<span class="badge badge-muted">🔒 منتهي</span>':'')+'</div>'
+'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">'
+'<span class="text-xs" style="color:var(--success);font-weight:800;">💰 محصل '+collected+'</span>'
+'<span class="text-xs" style="color:var(--danger);font-weight:800;">متبقي '+remaining+'</span>'
+'<span class="badge badge-info">🟩 متبقي حصص: '+ses.remaining+'</span>'
+(mode==='view'?'':'<button class="btn btn-ghost btn-sm" onclick="LedgerUI.editSquares(\''+g.id+'\',\''+month+'\')">✏️ المربعات</button>')
+(mode==='view'?'':'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.addStudentModal(\''+g.id+'\')">➕ طالب</button>')
+'</div></div>'
+sqStrip(ses)
+'<div class="text-xs text-muted" style="margin-top:6px;">🟩 بتاريخ = محسوبة · 📥 ترحيل · ＋ يدوي · 🟥 ملغاة · ↺ معوّضة · الرمادي لسه — المتبقي محسوب من حصص المجموعة</div></div>';
if(!rows.length) return '<div class="ldg-gcard">'+head+'<div class="text-xs text-muted" style="padding:10px;">لا طلاب مطابقين</div></div>';
var editFn=(typeof window.openEditStudentProfile==='function')?'window.openEditStudentProfile':((typeof window.openStudentModal==='function')?'window.openStudentModal':null);
var trs=rows.map(function(r,i){
var s=r.s;
return '<tr>'
+'<td data-label="#">'+(i+1)+'</td>'
+'<td data-label="الطالب"><strong>'+s.name+'</strong><div class="text-xs text-muted">'+(s.code||'')+' · '+(s.grade||'')+' · 📱 '+(s.parentPhone||'-')+'</div></td>'
+'<td data-label="الدفعات">'+histChips(s.id,g.id)+'</td>'
+'<td data-label="الحالة">'+badgeOf(r.f,ses,month)+'</td>'
+(mode==='view'?'':'<td data-label="إجراءات" style="white-space:nowrap;">'
+'<button class="btn btn-success btn-sm" title="تحصيل" onclick="LedgerUI.payModal(\''+s.id+'\',\''+g.id+'\',\''+month+'\')">💰</button> '
+(editFn?'<button class="btn btn-ghost btn-sm" title="تعديل" onclick="'+editFn+'(\''+s.id+'\')">✏️</button> ':'')
+'<button class="btn btn-secondary btn-sm" title="نقل" onclick="LedgerUI.moveStudent(\''+s.id+'\',\''+g.id+'\')">🚚</button> '
+'<button class="btn btn-danger btn-sm" title="فصل" onclick="LedgerUI.unenroll(\''+s.id+'\',\''+g.id+'\')">🗑️</button></td>')
+'</tr>';
}).join('');
return '<div class="ldg-gcard">'+head+'<div class="ldg-wrap"><table class="ldg-table"><thead><tr><th>#</th><th>الطالب</th><th>الدفعات</th><th>الحالة</th>'+(mode==='view'?'':'<th>إجراءات</th>')+'</tr></thead><tbody>'+trs+'</tbody></table></div></div>';
}

/* ========== صفحة المساعد ========== */
LU.renderAssistantMonthly=function(){
var host=document.getElementById('monthlyLedgerHost'); if(!host) return;
LU._ctx='monthly';
var f=LU._st; f.month=normMonth(f.month);
var gs=groupFilter(myGroups());
var rows=buildRows(gs,f.month);
scanNotify(gs,f.month);
var html=toolbarHtml()+filtersHtml()+statsHtml(rows,gs,f.month)+carryHtml(f.month,gs);
gs.forEach(function(g){ html+=groupCard(g,f.month,'edit',rows); });
html+=listsHtml(rows,f.month);
host.innerHTML=html||'<div class="card" style="text-align:center;padding:30px;">لا مجموعات</div>';
};

/* ========== صفحة الأدمن ========== */
LU.page=function(){
var host=document.getElementById('ledgerBody'); if(!host) return;
LU._ctx='ledger';
var f=LU._st; f.month=normMonth(f.month);
var gs=groupFilter(groups());
var rows=buildRows(gs,f.month);
scanNotify(gs,f.month);
var per=gs.map(function(g){
var gr=rows.filter(function(r){return r.g.id===g.id;});
var ses=LU.groupSessions(g.id,f.month);
var c=gr.reduce(function(a,r){return a+r.f.paid;},0);
var dd=gr.reduce(function(a,r){return a+r.f.totalRem;},0);
return {g:g,ses:ses,n:gr.length,c:c,dd:dd};
});
var html=toolbarHtml()+filtersHtml()+statsHtml(rows,gs,f.month)+carryHtml(f.month,gs)
+'<div class="ldg-wrap"><table class="ldg-table"><thead><tr><th>المجموعة</th><th>الأستاذ</th><th>حصص الشهر</th><th>متبقي حصص</th><th>طلاب</th><th>محصل</th><th>متبقي</th><th></th></tr></thead><tbody>'
+per.map(function(r){ var tn=(DataService.getUserById&&r.g.teacherId)?((DataService.getUserById(r.g.teacherId)||{}).name||'-'):'-';
return '<tr><td data-label="المجموعة"><strong>'+r.g.name+'</strong> '+(r.ses.isPast?'<span class="badge badge-muted">🔒</span>':'')+'<div class="text-xs text-muted">'+(r.g.center||'-')+'</div></td><td data-label="الأستاذ">'+tn+'</td><td data-label="حصص">'+r.ses.done+'/'+r.ses.required+(r.ses.complete?' 💰':'')+'</td><td data-label="متبقي حصص">'+r.ses.remaining+'</td><td data-label="طلاب">'+r.n+'</td><td data-label="محصل" style="color:var(--success);font-weight:800;">'+r.c+'</td><td data-label="متبقي" style="color:var(--danger);font-weight:800;">'+r.dd+'</td><td><button class="btn btn-secondary btn-sm" onclick="LedgerUI.openModal(\''+r.g.id+'\')">👁️ إدارة</button></td></tr>'; }).join('')
+'</tbody></table></div>'
+listsHtml(rows,f.month);
host.innerHTML=html;
};
LU.openModal=function(gid){
try{
var g=gById(gid); var month=normMonth(LU._st.month);
window.__ldgModalOpen={gid:gid,mode:'edit'};
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📒 '+g.name+' — '+monthName(month)+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body" style="max-height:70vh;overflow:auto;"><div id="ldgModalContent">'+groupCard(g,month,'edit')+'</div></div>','modal-lg');
}catch(e){ console.error(e); }
};

LU.payModal=function(sid,gid,month){
try{
var g=gById(gid), s=DataService.getUserById?DataService.getUserById(sid):null;
var total=(g&&g.monthlyFee)||0;
LU._pm={sid:sid,gid:gid};
var dms=dueMonths(sid,gid,total);
var sel=normMonth(month||LU._st.month);
var set={}; dms.forEach(function(x){set[x.month]=1;}); set[sel]=1; set[localMonth()]=1;
var monthsArr=Object.keys(set).sort();
var defMonth=dms.length?dms[0].month:sel;
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">💵 تحصيل كاش: '+(s?s.name:'')+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'
+'<div class="form-group"><label>📅 شهرية شهر مين بتتحصل؟</label><select id="pmMonth" class="form-select" onchange="LedgerUI.pmInfo()">'+monthsArr.map(function(m){
var ses=LU.groupSessions(gid,m); var paid=paidOf(payFor(sid,gid,m));
var tag=!ses.complete?(paid>0?'مقدم — لسه مكملش الحصص':'لسه مستحقة'):(paid>=total&&total>0?'✓ مسددة':'💰 مستحقة الآن (كمل '+ses.done+'/'+ses.required+')');
return '<option value="'+m+'" '+(m===defMonth?'selected':'')+'>'+monthName(m)+' — '+tag+'</option>';
}).join('')+'</select></div>'
+'<div class="filter-info" id="pmInfo"></div>'
+'<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;"><button class="btn btn-secondary btn-sm" onclick="LedgerUI.pmSet(\'rem\')">كل المتبقي</button><button class="btn btn-secondary btn-sm" onclick="LedgerUI.pmSet(\'half\')">نص الشهرية</button><button class="btn btn-primary btn-sm" onclick="LedgerUI.pmSet(\'full\')">💯 الشهرية كاملة (أوتوماتيك)</button></div>'
+'<div class="form-group"><label>المبلغ المستلم (كاش) *</label><input type="number" id="pmAmt" class="form-input" value="0" min="0"></div>'
+'<div class="form-group"><label>تاريخ الاستلام</label><input type="date" id="pmDate" class="form-input" value="'+today()+'"></div>'
+'<div class="form-group"><label>ملاحظة</label><input type="text" id="pmNote" class="form-input" placeholder="اختياري"></div>'
+'<button class="btn btn-primary w-full" onclick="LedgerUI.applyPay(\''+sid+'\',\''+gid+'\',document.getElementById(\'pmMonth\').value)">💾 تسجيل الدفعة</button>'
+'</div>','modal-sm');
LU.pmInfo();
}catch(e){ console.error(e); }
};
LU.pmInfo=function(){
try{
var pm=LU._pm||{}; var m=(document.getElementById('pmMonth')||{}).value||localMonth();
var g=gById(pm.gid); var total=(g&&g.monthlyFee)||0;
var paid=paidOf(payFor(pm.sid,pm.gid,m)); var rem=Math.max(0,total-paid);
var ses=LU.groupSessions(pm.gid,m);
var el=document.getElementById('pmInfo');
if(el) el.innerHTML='📅 '+monthName(m)+' · الشهرية: <strong>'+total+'</strong> · المدفوع: <strong>'+paid+'</strong> · المتبقي: <strong style="color:var(--danger)">'+rem+'</strong> · الحصص: <strong>'+ses.done+'/'+ses.required+'</strong> '+(ses.complete?'(مكتملة → المطالبة صحيحة)':'(مكملتش — أي دفع هيتسجل مقدم)');
var amt=document.getElementById('pmAmt'); if(amt) amt.value=rem>0?rem:(total||0);
}catch(e){}
};
LU.pmSet=function(w){
try{
var pm=LU._pm||{}; var m=(document.getElementById('pmMonth')||{}).value||localMonth();
var g=gById(pm.gid); var total=(g&&g.monthlyFee)||0;
var paid=paidOf(payFor(pm.sid,pm.gid,m)); var rem=Math.max(0,total-paid);
var amt=document.getElementById('pmAmt'); if(!amt) return;
amt.value=(w==='rem')?rem:(w==='half'?Math.round(total/2):total);
}catch(e){}
};

/* ========== سجل الدفعات ========== */
LU.editHistory=function(sid,gid){
try{
var ps=paysFor(sid,gid);
var body=ps.length?ps.map(function(p){
return '<div class="card" style="padding:10px;margin-bottom:10px;"><strong>'+monthName(p.month)+'</strong> — '+paidOf(p)+'/'+(p.amount||0)+' <span class="badge '+(p.status==='paid'?'badge-success':p.status==='partial'?'badge-warning':'badge-danger')+'">'+(p.status==='paid'?'مسدد':p.status==='partial'?'جزئي':'غير مدفوع')+'</span>'
+'<div style="margin-top:8px;">'+(p.history||[]).map(function(h,i){
return '<div class="sub-row" style="padding:6px 8px;margin-bottom:4px;"><div class="text-xs">💵 '+h.amount+' · 📅 '+h.date+(h.note?' · '+h.note:'')+'</div><div style="display:flex;gap:4px;"><button class="btn btn-ghost btn-sm" onclick="LedgerUI.editEntry(\''+p.id+'\','+i+')">✏️</button><button class="btn btn-danger btn-sm" onclick="LedgerUI.delEntry(\''+p.id+'\','+i+')">🗑️</button></div></div>';
}).join('')+'</div></div>';
}).join(''):'<p class="text-muted">لا دفعات</p>';
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">💵 سجل الدفعات</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+body+'<button class="btn btn-primary w-full" onclick="ThemeManager.closeModal();LedgerUI.payModal(\''+sid+'\',\''+gid+'\')">➕ دفعة يدوية</button></div>','modal-md');
}catch(e){ console.error(e); }
};
LU.editEntry=function(pid,idx){
try{
var p=(db().payments||[]).find(function(x){return x.id===pid;}); if(!p) return;
var h=(p.history||[])[idx]; if(!h) return;
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">✏️ تعديل دفعة</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'
+'<div class="form-group"><label>المبلغ</label><input type="number" id="peAmt" class="form-input" value="'+h.amount+'"></div>'
+'<div class="form-group"><label>التاريخ</label><input type="date" id="peDate" class="form-input" value="'+h.date+'"></div>'
+'<div class="form-group"><label>ملاحظة</label><input type="text" id="peNote" class="form-input" value="'+(h.note||'')+'"></div>'
+'<button class="btn btn-primary w-full" onclick="LedgerUI.saveEntry(\''+pid+'\','+idx+')">💾 حفظ</button></div>','modal-sm');
}catch(e){}
};
LU.saveEntry=async function(pid,idx){
try{
var d=db(); var p=(d.payments||[]).find(function(x){return x.id===pid;}); if(!p) return;
var h=(p.history||[])[idx]; if(!h) return;
h.amount=parseFloat(document.getElementById('peAmt').value)||h.amount;
h.date=document.getElementById('peDate').value||h.date;
h.note=document.getElementById('peNote').value||h.note||'';
h.method='cash';
p.paidAmount=histSum(p);
p.status=p.paidAmount>=p.amount?'paid':(p.paidAmount>0?'partial':'unpaid');
saveD(d); await cloudPay(p,false);
ThemeManager.closeModal();
if(window.safeToast) window.safeToast('✅ تم الحفظ','success');
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
finally{ LU.refresh(); }
};
LU.delEntry=async function(pid,idx){
try{
if(!confirm('حذف الدفعة؟')) return;
var d=db(); var p=(d.payments||[]).find(function(x){return x.id===pid;}); if(!p) return;
p.history.splice(idx,1);
p.paidAmount=histSum(p);
p.status=p.paidAmount>=p.amount?'paid':(p.paidAmount>0?'partial':'unpaid');
var del=false;
if(!p.history.length&&p.paidAmount===0){ d.payments=d.payments.filter(function(x){return x.id!==pid;}); del=true; }
saveD(d); await cloudPay(p,del);
ThemeManager.closeModal();
if(window.safeToast) window.safeToast('🗑️ تم الحذف','success');
}catch(e){}
finally{ LU.refresh(); }
};

/* ========== إضافة طالب ذكية ========== */
LU.addStudentModal=function(gid){
try{
var g=gById(gid);
var lv=(typeof EduFlowConfig!=='undefined'&&EduFlowConfig.educationLevels)?EduFlowConfig.educationLevels:{};
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">➕ إضافة طالب لـ '+g.name+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'
+'<div class="filter-info">💡 بيتم تطبيق مرحلة وصف المجموعة تلقائياً: '+(lv[g.stage]?lv[g.stage].nameAr:(g.stage||'-'))+' / '+(g.grade||'-')+'</div>'
+'<div class="form-group"><label>🔍 بحث عن طالب موجود</label><input type="text" id="ldgAsSearch" class="form-input" placeholder="اسم أو كود أو هاتف..." oninput="LedgerUI.asSearch(\''+gid+'\')"></div>'
+'<div id="ldgAsResults" style="max-height:160px;overflow-y:auto;margin-bottom:12px;"></div>'
+'<div style="border-top:1px dashed var(--border);padding-top:12px;"><strong class="text-sm">🆕 أو إنشاء طالب جديد</strong>'
+'<div class="form-group" style="margin-top:8px;"><label>الاسم *</label><input type="text" id="ldgNewName" class="form-input"></div>'
+'<div class="form-group"><label>هاتف ولي الأمر *</label><input type="tel" id="ldgNewParent" class="form-input" placeholder="01xxxxxxxxx"></div>'
+'<button class="btn btn-primary w-full" onclick="LedgerUI.doAddNew(\''+gid+'\')">💾 إنشاء وضم</button></div>'
+'</div>','modal-md');
}catch(e){ console.error(e); }
};
LU.asSearch=function(gid){
try{
var _se=document.getElementById('ldgAsSearch'); var q=_se?(_se.value||'').toLowerCase().trim():'';
var box=document.getElementById('ldgAsResults'); if(!box) return;
if(q.length<2){ box.innerHTML=''; return; }
var inG={}; studentsOf(gid).forEach(function(s){inG[s.id]=1;});
var res=(DataService.getStudents?DataService.getStudents():[]).filter(function(s){ return !inG[s.id]&&((s.name||'').toLowerCase().indexOf(q)>=0||(s.code||'').toLowerCase().indexOf(q)>=0||(s.phone||'').indexOf(q)>=0||(s.parentPhone||'').indexOf(q)>=0);}).slice(0,6);
box.innerHTML=res.length?res.map(function(s){ return '<div class="ldg-lrow"><div><strong>'+s.name+'</strong> <span class="text-xs text-muted">'+(s.code||'')+'</span></div><button class="btn btn-success btn-sm" onclick="LedgerUI.attachExisting(\''+s.id+'\',\''+gid+'\')">➕ ضم</button></div>'; }).join(''):'<div class="text-xs text-muted">لا نتائج — أنشئ طالب جديد من تحت</div>';
}catch(e){}
};
LU.attachExisting=async function(sid,gid){
try{
var g=gById(gid); var d=db(); d.enrollments=d.enrollments||[];
if(!d.enrollments.some(function(e){return e.studentId===sid&&e.groupId===gid&&e.status==='active';})){
var ne={id:'en_'+Date.now(),studentId:sid,groupId:gid,teacherId:g?g.teacherId:null,status:'active',createdAt:new Date().toISOString()};
d.enrollments.push(ne); saveD(d); await cloudEn(ne,false);
}
try{ if(DataService.updateUser) await DataService.updateUser(sid,{stage:g?g.stage:'',grade:g?g.grade:''}); }catch(e){}
ThemeManager.closeModal();
if(window.safeToast) window.safeToast('✅ تم الضم وتطبيق بيانات المجموعة','success');
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
finally{ LU.refresh(); }
};
LU.doAddNew=async function(gid){
try{
var g=gById(gid);
var name=(document.getElementById('ldgNewName')||{}).value.trim();
var parent=(document.getElementById('ldgNewParent')||{}).value.trim();
if(!name||!parent){ if(window.safeToast) window.safeToast('الاسم وهاتف ولي الأمر مطلوبين','error'); return; }
var data={name:name,parentPhone:parent,stage:g?g.stage:'',grade:g?g.grade:''};
if(typeof DataService.addStudentByAdmin==='function'){
await DataService.addStudentByAdmin(Object.assign({},data,{password:'1234',enrollments:[{groupId:gid,teacherId:g?g.teacherId:null}]}));
}else{
var nu=await DataService.addUser(Object.assign({role:'student',code:'EDU-'+Date.now().toString().slice(-6),password:'1234'},data));
var d=db(); d.enrollments=d.enrollments||[];
var ne={id:'en_'+Date.now(),studentId:(nu&&nu.id)||nu,groupId:gid,teacherId:g?g.teacherId:null,status:'active',createdAt:new Date().toISOString()};
d.enrollments.push(ne); saveD(d); await cloudEn(ne,false);
}
ThemeManager.closeModal();
if(window.safeToast) window.safeToast('✅ تم الإنشاء والضم','success');
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
finally{ LU.refresh(); }
};
/* ========== 👁 تفاصيل طالب عليه مستحقات ========== */
LU.studentDetails=function(sid){
try{
var s=DataService.getUserById?DataService.getUserById(sid):null; if(!s) return;
var gs=(isAdmin()?groups():myGroups()).filter(function(g){ return studentsOf(g.id).some(function(x){return x.id===sid;}); });
var wa=String(s.parentPhone||'').replace(/\D/g,'');
var html='<div class="modal-header"><h3 class="modal-title">👁 تفاصيل: '+s.name+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">';
html+='<div class="filter-info">🆔 '+(s.code||'-')+' · 🎓 '+(s.grade||'-')+' · 📱 '+(s.phone||'-')+' · 👨👩‍ ولي الأمر: '+(s.parentPhone||'-')+(wa?' <a href="https://wa.me/2'+wa+'" target="_blank" class="btn btn-success btn-sm" style="margin-inline-start:6px;">💬 واتساب</a>':'')+'</div>';
var anyDue=false;
gs.forEach(function(g){
var dms=dueMonths(sid,g.id,g.monthlyFee||0);
var ses=LU.groupSessions(g.id,normMonth(LU._st.month));
html+='<div class="card" style="padding:10px;margin-bottom:10px;"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><strong>👥 '+g.name+'</strong><span class="text-xs text-muted">الشهرية '+(g.monthlyFee||0)+' · الحصص دلوقتي '+ses.done+'/'+ses.required+'</span></div>';
if(dms.length){ anyDue=true;
html+='<div style="margin-top:8px;">'+dms.map(function(x){ return '<div class="ldg-lrow" style="border-right:3px solid var(--danger);"><div class="text-sm">📅 شهرية '+monthName(x.month)+' — مطلوب <strong>'+x.rem+'</strong> (من '+x.fee+' · مدفوع '+x.paid+')</div><button class="btn btn-success btn-sm" onclick="LedgerUI.payModal(\''+sid+'\',\''+g.id+'\',\''+x.month+'\')">💰 تحصيل</button></div>'; }).join('')+'</div>';
}else{ html+='<div class="text-xs" style="color:var(--success);margin-top:6px;">✓ مفيش شهرية مكتملة غير مسددة هنا</div>'; }
var ps=paysFor(sid,g.id);
if(ps.length){ html+='<div style="margin-top:8px;" class="text-xs text-muted">💵 سجل الدفعات: '+ps.map(function(p){ return monthName(p.month)+' → '+paidOf(p)+'/'+(p.amount||0); }).join(' · ')+'</div>'; }
html+='</div>';
});
if(!anyDue) html+='<div class="filter-info">🎉 الطالب مفيش عليه أي شهرية مكتملة غير مسددة — أي مبالغ مدفوعة مقدماً بتتخصم تلقائياً لما الشهر يكمل.</div>';
if(gs[0]) html+='<button class="btn btn-secondary w-full" onclick="ThemeManager.closeModal();LedgerUI.editHistory(\''+sid+'\',\''+gs[0].id+'\')">💵 عرض/تعديل كل الدفعات</button>';
html+='</div>';
ThemeManager.openModal(html,'modal-md');
}catch(e){ console.error(e); }
};
/* ========== نقل / فصل ========== */
LU.moveStudent=function(sid,fromGid){
try{
var gs=(isAdmin()?groups():myGroups()).filter(function(g){return g.id!==fromGid;});
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🚚 نقل الطالب</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'
+'<div class="form-group"><label>المجموعة الجديدة</label><select id="mvToG" class="form-select">'+gs.map(function(g){return '<option value="'+g.id+'">'+g.name+'</option>';}).join('')+'</select></div>'
+'<button class="btn btn-primary w-full" onclick="LedgerUI.doMove(\''+sid+'\',\''+fromGid+'\')">🚚 تنفيذ</button></div>','modal-sm');
}catch(e){}
};
LU.doMove=async function(sid,fromGid){
try{
var toGid=document.getElementById('mvToG').value; if(!toGid) return;
var d=db(); d.enrollments=d.enrollments||[];
var e=d.enrollments.find(function(x){return x.studentId===sid&&x.groupId===fromGid;});
var tg=gById(toGid);
if(e){ e.groupId=toGid; e.teacherId=tg?tg.teacherId:e.teacherId; saveD(d); await cloudEn(e,false); }
else { var ne={id:'en_'+Date.now(),studentId:sid,groupId:toGid,teacherId:tg?tg.teacherId:null,status:'active',createdAt:new Date().toISOString()}; d.enrollments.push(ne); saveD(d); await cloudEn(ne,false); }
ThemeManager.closeModal();
if(window.safeToast) window.safeToast('🚚 تم النقل','success');
}catch(e){}
finally{ LU.refresh(); }
};
LU.unenroll=async function(sid,gid){
try{
var s=DataService.getUserById?DataService.getUserById(sid):null;
if(!confirm('فصل '+(s?s.name:'')+' من المجموعة؟')) return;
var d=db();
var e=(d.enrollments||[]).find(function(x){return x.studentId===sid&&x.groupId===gid&&x.status==='active';});
d.enrollments=(d.enrollments||[]).filter(function(x){return !(x.studentId===sid&&x.groupId===gid&&x.status==='active');});
saveD(d); if(e) await cloudEn(e,true);
if(window.safeToast) window.safeToast('🗑️ تم الفصل','success');
}catch(e){}
finally{ LU.refresh(); }
};

/* ========== ريفريش ========== */
LU.refresh=function(){
try{
LU._sesCache={};
var act=document.querySelector('.section.active');
if(act){
if(act.id==='section-monthly'&&document.getElementById('monthlyLedgerHost')) LU.renderAssistantMonthly();
if(act.id==='section-ledger'&&document.getElementById('ledgerBody')) LU.page();
}
var mc=document.getElementById('ldgModalContent');
if(mc&&window.__ldgModalOpen){ var g=gById(window.__ldgModalOpen.gid); if(g) mc.innerHTML=groupCard(g,normMonth(LU._st.month),'edit'); }
else if(!mc){ window.__ldgModalOpen=null; }
}catch(e){}
};
LU.refreshBtn=function(){ LU.refresh(); if(window.safeToast) window.safeToast('🔄 تم التحديث','success'); };

/* ========== توصيل ========== */
function hookShowSection(){
if(window.__ldgShowHooked) return;
if(typeof window.showSection!=='function'){ setTimeout(hookShowSection,300); return; }
window.__ldgShowHooked=true;
var os=window.showSection;
window.showSection=function(id){
var r=os.apply(this,arguments);
try{
if(id==='monthly'&&document.getElementById('monthlyLedgerHost')){ if(isAdmin()) LU.page(); else LU.renderAssistantMonthly(); }
if(id==='ledger'&&document.getElementById('ledgerBody')) LU.page();
}catch(e){}
return r;
};
}
function injectSidebar(){
if(!document.getElementById('section-ledger')) return;
var nav=document.getElementById('sidebarNav'); if(!nav) return;
if(nav.querySelector('[data-section="ledger"]')) return;
var html='<div class="sidebar-item" data-section="ledger" onclick="window.showSection(\'ledger\')"><span class="sidebar-item-icon">📊</span><span class="sidebar-item-label">إحصائيات التحصيل</span></div>';
var anchor=nav.querySelector('[data-section="cycles"]')||nav.querySelector('[data-section="monthly"]');
if(anchor) anchor.insertAdjacentHTML('afterend',html); else nav.insertAdjacentHTML('beforeend',html);
}
function init(){
injectSidebar(); setTimeout(injectSidebar,800); setTimeout(injectSidebar,2000);
hookShowSection(); setTimeout(hookShowSection,600); setTimeout(hookShowSection,1500);
document.addEventListener('click',function(e){
var t=e.target.closest?e.target.closest('[data-section="ledger"],[data-section="monthly"]'):null;
if(!t) return;
setTimeout(function(){
var id=t.getAttribute('data-section');
if(id==='ledger') LU.page();
if(id==='monthly'&&document.getElementById('monthlyLedgerHost')){ if(isAdmin()) LU.page(); else LU.renderAssistantMonthly(); }
},80);
});
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
/* ================================================================
📜 V9 Extension — سجل نشاط الدفتر + إشعارات الأدمن + دعم الأستاذ
================================================================ */
(function(){
"use strict";
var LU=window.LedgerUI; if(!LU) return;
function db(){ return (window.DataService&&DataService._getData)?DataService._getData():{}; }
function saveD(d){ if(DataService._saveData) DataService._saveData(d); }
function cur(){ try{ return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null); }catch(e){ return null; } }
function isAdmin(){ var u=cur(); return u&&(u.role==='admin'||u.role==='super_admin'); }
function localToday(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function monthName(m){ try{ return new Date((m||'')+'-01T12:00:00').toLocaleDateString('ar-EG',{month:'long',year:'numeric'}); }catch(e){ return m; } }
function sName(sid){ var s=DataService.getUserById?DataService.getUserById(sid):null; return (s&&s.name)||''; }
function gName(gid){ var g=(DataService.getGroups?DataService.getGroups():[]).find(function(x){return x.id===gid;}); return (g&&g.name)||''; }

/* الأستاذ/المساعد: تحديد الأستاذ المرتبط لو الدالة مش معرّفة */
if(typeof window.getMyTeacherId!=='function'){
window.getMyTeacherId=function(){
try{
var u=cur(); if(!u) return null;
if(u.role==='teacher') return u.id;
if(u.role==='assistant'){ var a=(typeof Ops!=='undefined'&&Ops.getAssignment)?Ops.getAssignment(u.id):null; return (a&&a.teacherId)||null; }
}catch(e){}
return null;
};
}

/* ========== تسجيل النشاط + إشعار الأدمن ========== */
function logAct(action,extra){
try{
var d=db(); d.ledgerLog=d.ledgerLog||[];
var u=cur()||{};
var e=Object.assign({id:'lg_'+Date.now()+Math.random().toString(36).slice(2,6),at:new Date().toISOString(),byId:u.id||'',byName:u.name||'-',byRole:u.role||'-'},extra||{});
e.action=action;
d.ledgerLog.unshift(e);
if(d.ledgerLog.length>300) d.ledgerLog.length=300;
saveD(d);
try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('ledgerLog',e.id,e); }catch(err){}
try{
if(!isAdmin()&&DataService.addNotification){
(DataService.getUsers?DataService.getUsers():[]).filter(function(x){return x.role==='admin'||x.role==='super_admin';}).forEach(function(a){
DataService.addNotification({targetUserId:a.id,title:'📒 نشاط الدفتر',message:(u.name||'-')+' ('+(u.role||'-')+'): '+action+(e.text?(' — '+e.text):'')+(e.amount?(' ('+e.amount+' ج.م)'):''),type:'general',priority:'low',meta:{kind:'ledger'}});
});
}
}catch(err){}
}catch(e){}
}

function logHtml(){
var d=db(); var list=(d.ledgerLog||[]).slice(0,40);
if(!list.length) return '<div class="card" style="margin-top:14px;"><div class="card-header"><h3 class="card-title">📜 سجل نشاط الدفتر</h3></div><div style="padding:12px;" class="text-muted">لا نشاط مسجل بعد</div></div>';
var todayN=(d.ledgerLog||[]).filter(function(x){return (x.at||'').slice(0,10)===localToday();}).length;
return '<div class="card" style="margin-top:14px;"><div class="card-header"><h3 class="card-title">📜 سجل نشاط الدفتر — مين عمل إيه؟</h3><span class="points-badge">عمليات اليوم: '+todayN+'</span></div><div style="padding:10px;max-height:360px;overflow:auto;">'
+list.map(function(x){
return '<div class="ldg-lrow"><div style="flex:1;"><div class="text-sm"><strong>'+x.action+'</strong>'+(x.text?(' — '+x.text):'')+'</div><div class="text-xs text-muted">👤 '+x.byName+' ('+x.byRole+') · 🕐 '+new Date(x.at||Date.now()).toLocaleString('ar-EG')+(x.groupName?(' · 👥 '+x.groupName):'')+(x.month?(' · 📅 '+monthName(x.month)):'')+'</div></div>'+(x.amount?'<span class="points-badge">'+x.amount+' ج.م</span>':'')+'</div>';
}).join('')+'</div></div>';
}

/* ========== لف الدوال: تسجيل كل حركة (مع التحقق إن العملية تمت فعلاً) ========== */
function wrap(name,pre,post){
var orig=LU[name]; if(!orig||orig.__lgw) return;
var f=function(){
var args=[].slice.call(arguments); var ctx=null;
try{ ctx=pre?pre(args):null; }catch(e){}
var r=orig.apply(this,args);
try{ var e=post?post(args,ctx):null; if(e) logAct(e.action,e); }catch(err){}
return r;
};
f.__lgw=true; LU[name]=f;
}
wrap('applyPay',null,function(args){
var d=db(); var p=(d.payments||[]).find(function(x){return x.studentId===args[0]&&x.groupId===args[1]&&(x.month||'')===args[2];});
var h=p&&p.history&&p.history.length?p.history[p.history.length-1]:null;
if(!h||Date.now()-new Date(h.at||0).getTime()>15000) return null;
return {action:'💵 تسجيل دفعة كاش',text:sName(args[0]),groupId:args[1],groupName:gName(args[1]),month:args[2],amount:h.amount};
});
wrap('saveEntry',function(args){ var p=(db().payments||[]).find(function(x){return x.id===args[0];}); return {p:p,idx:args[1]}; },function(args,ctx){
if(!ctx||!ctx.p) return null;
var h=ctx.p.history?ctx.p.history[ctx.idx]:null;
return {action:'✏️ تعديل دفعة',text:sName(ctx.p.studentId),groupId:ctx.p.groupId,groupName:gName(ctx.p.groupId),month:ctx.p.month,amount:h?h.amount:0};
});
wrap('delEntry',function(args){ var p=(db().payments||[]).find(function(x){return x.id===args[0];}); return {p:p,len:p&&p.history?p.history.length:0,h:p&&p.history?p.history[args[1]]:null}; },function(args,ctx){
if(!ctx||!ctx.p) return null;
var now=(db().payments||[]).find(function(x){return x.id===ctx.p.id;});
if(now&&now.history&&now.history.length===ctx.len) return null;
return {action:'🗑️ حذف دفعة',text:sName(ctx.p.studentId),groupId:ctx.p.groupId,groupName:gName(ctx.p.groupId),month:ctx.p.month,amount:ctx.h?ctx.h.amount:0};
});
wrap('carryInc',null,function(args){ return {action:'📥 ترحيل: إضافة حصة لكل طلاب المجموعة',groupId:args[0],groupName:gName(args[0]),month:args[1]}; });
wrap('carryDec',null,function(args){ return {action:'📥 ترحيل: إنقاص حصة من كل طلاب المجموعة',groupId:args[0],groupName:gName(args[0]),month:args[1]}; });
wrap('sqToggle',null,function(args){ return {action:args[3]==='cancel'?'🟩 إلغاء حساب حصة (تصحيح غلطة)':'🟩 تعليم حصة ملغاة كمأخوذة',groupId:args[0],groupName:gName(args[0]),month:args[1],text:args[2]||'بدون تاريخ'}; });
wrap('sqAdd',null,function(args){ return {action:'🟩 إضافة مربع حصة يدوي',groupId:args[0],groupName:gName(args[0]),month:args[1],text:args[2]?'بتاريخ':'بدون تاريخ'}; });
wrap('sqRemoveUndated',null,function(args){ return {action:'🟩 حذف مربع حصة يدوي',groupId:args[0],groupName:gName(args[0]),month:args[1]}; });
wrap('attachExisting',null,function(args){
var ok=(db().enrollments||[]).some(function(e){ return e.studentId===args[0]&&e.groupId===args[1]&&e.status==='active'; });
return ok?{action:'🧑🎓 ضم طالب موجود لمجموعة',text:sName(args[0]),groupId:args[1],groupName:gName(args[1])}:null;
});
wrap('doAddNew',null,function(args){
var ok=(db().enrollments||[]).some(function(e){ return e.groupId===args[0]&&Date.now()-new Date(e.createdAt||0).getTime()<15000; });
return ok?{action:'🧑🎓 إنشاء طالب جديد وضمّه',groupId:args[0],groupName:gName(args[0])}:null;
});
wrap('doMove',function(){ return {to:(document.getElementById('mvToG')||{}).value||''}; },function(args,ctx){
if(!ctx||!ctx.to) return null;
var ok=(db().enrollments||[]).some(function(e){ return e.studentId===args[0]&&e.groupId===ctx.to&&e.status==='active'; });
return ok?{action:'🚚 نقل طالب بين المجموعات',text:sName(args[0])+' ← '+gName(ctx.to),groupId:ctx.to,groupName:gName(ctx.to)}:null;
});
wrap('unenroll',null,function(args){
var still=(db().enrollments||[]).some(function(e){ return e.studentId===args[0]&&e.groupId===args[1]&&e.status==='active'; });
return still?null:{action:'⛔ فصل طالب من مجموعة',text:sName(args[0]),groupId:args[1],groupName:gName(args[1])};
});

/* ========== كارت السجل في صفحة الأدمن + مودال الإدارة ========== */
var origPage=LU.page;
LU.page=function(){
var r=origPage.apply(this,arguments);
try{ var host=document.getElementById('ledgerBody'); if(host) host.insertAdjacentHTML('beforeend',logHtml()); }catch(e){}
return r;
};
var origOpen=LU.openModal;
LU.openModal=function(){
var r=origOpen.apply(this,arguments);
try{ var mc=document.getElementById('ldgModalContent'); if(mc) mc.insertAdjacentHTML('beforeend',logHtml()); }catch(e){}
return r;
};

/* ========== عنصر قائمة "دفتر التحصيل" للأستاذ ========== */
function injectTeacherMenu(){
try{
var u=cur(); if(!u||u.role!=='teacher') return;
var nav=document.getElementById('sidebarNav'); if(!nav) return;
if(nav.querySelector('[data-section="monthly"]')) return;
var html='<div class="sidebar-item" data-section="monthly" onclick="window.showSection(\'monthly\')"><span class="sidebar-item-icon">📒</span><span class="sidebar-item-label">دفتر التحصيل</span></div>';
var a=nav.querySelector('[data-section="grades"]')||nav.querySelector('[data-section="attendance"]')||nav.querySelector('[data-section="students"]');
if(a) a.insertAdjacentHTML('afterend',html); else nav.insertAdjacentHTML('beforeend',html);
}catch(e){}
}
setTimeout(injectTeacherMenu,600); setTimeout(injectTeacherMenu,1600); setTimeout(injectTeacherMenu,3200);
})();
