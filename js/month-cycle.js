/* ================================================================
📆 Month Cycle — توحيد عدّاد الحصص والشهرية على الشهر الميلادي
القاعدة: الشهرية تظهر فقط لشهر مكتمل الحصص (متضمنة المتأخرات المرحّلة)
والعدّاد = حضور الشهر الحالي + ترحيل/طوارئ مختومة بالشهر نفسه
================================================================ */
(function(){
"use strict";
function pad(n){return String(n).padStart(2,'0');}
function localMonth(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1);}
var OCT_START='2026-10';
function startMonth(){
try{
var v=localStorage.getItem('ldgStartMonth');
if(!v||v<OCT_START){ localStorage.setItem('ldgStartMonth',OCT_START); v=OCT_START; }
return v;
}catch(e){ return OCT_START; }
}
function monthsUpTo(m){var out=[],s=startMonth();if(m<s)s=m;var g=0;while(s<=m&&g<48){out.push(s);var d=new Date(s+'-01T12:00:00');d.setMonth(d.getMonth()+1);s=d.getFullYear()+'-'+pad(d.getMonth()+1);g++;}return out;}
function monthName(m){try{return new Date(m+'-01T12:00:00').toLocaleDateString('ar-EG',{month:'long',year:'numeric'});}catch(e){return m;}}
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function gById(gid){return (DataService.getGroups?DataService.getGroups():[]).find(function(g){return g.id===gid;});}
function reqOf(g){return (g&&g.sessionsPerMonth)||((window.EduFlowConfig&&EduFlowConfig.billing&&EduFlowConfig.billing.sessionsBeforePayment)||8);}
function feeOf(g){return (g&&g.monthlyFee)||0;}
/* الحصص اللي اتعملت فعلاً في شهر m (الملغاة مش بتتحسب إلا لو اتعوّضت) */
function heldDates(gid,m){
var d=db(),canc={};
(d.cancelledSessions||[]).forEach(function(c){if(c.groupId===gid&&(c.date||'').startsWith(m))canc[c.date]=(c.makeupStatus==='done');});
var set={};
(DataService.getAttendance?DataService.getAttendance():[]).forEach(function(a){
if(a.groupId!==gid||a.status!=='approved'||!(a.date||'').startsWith(m))return;
if(canc[a.date]===false)return;
set[a.date]=1;
});
return Object.keys(set);
}
function sessionsOf(sid,gid,m){
var g=gById(gid);
var base=heldDates(gid,m).length;
var man=0;
(db().manualSessions||[]).forEach(function(ms){if(ms.groupId===gid&&ms.studentId===sid&&(ms.month||'')===m&&(!ms.type||ms.type==='counter'))man+=(ms.sessionsCount||0);});
base=base+man;
if(man>base)base=man;
if(g&&g.sessionNow>0&&(g.sessionNowMonth||'')===m&&+g.sessionNow>base)base=+g.sessionNow;
return base;
}
function paidOf(sid,gid,m){var p=null;(db().payments||[]).forEach(function(x){if(x.studentId===sid&&x.groupId===gid&&(x.month||'')===m)p=x;});return p?(p.paidAmount||0):0;}
function monthRow(sid,g,m){var req=reqOf(g),fee=feeOf(g),done=sessionsOf(sid,g.id,m),paid=paidOf(sid,g.id,m),completed=done>=req;return{month:m,done:done,req:req,fee:fee,paid:paid,completed:completed,rem:completed?Math.max(0,fee-paid):0};}
function aggregate(sid,g,upTo){
upTo=upTo||localMonth();
var ms=monthsUpTo(upTo),dueT=0,paidT=0,remT=0;
ms.forEach(function(m){var r=monthRow(sid,g,m);if(r.completed){dueT+=r.fee;paidT+=Math.min(r.paid,r.fee);remT+=r.rem;}});
var cur=monthRow(sid,g,upTo);
return{dueTotal:dueT,paidTotal:paidT,rem:remT,pastDebt:Math.max(0,remT-cur.rem),cur:cur,months:ms.map(function(m){return monthRow(sid,g,m);})};
}
window.MC={sessionsOf:sessionsOf,paidOf:paidOf,monthRow:monthRow,aggregate:aggregate,heldDates:heldDates,reqOf:reqOf,feeOf:feeOf,localMonth:localMonth,monthsUpTo:monthsUpTo,monthName:monthName};

/* 1) توحيد Ops.buildStudentBilling — حسابنا دايمًا الأخير */
function wrapBilling(){
if(typeof Ops==='undefined'||!Ops)return;
if(Ops.buildStudentBilling===window.__mcBillingFn)return;
var prev=Ops.buildStudentBilling;
if(typeof prev!=='function')return;
var fn=function(studentId,month){
var rows=prev.call(Ops,studentId,month);
try{(rows||[]).forEach(function(row){
var g=row.group;if(!g)return;
var agg=aggregate(studentId,g,month||localMonth());
row.billing=row.billing||{};row.payment=row.payment||{};
row.billing.actualSessions=agg.cur.done;
row.billing.sessionsRequired=agg.cur.req;
row.billing.total=agg.dueTotal;
row.billing.shouldCharge=agg.rem>0;
row.payment.paidAmount=agg.paidTotal;
row.billing.remaining=agg.rem;
row.billing.carriedDebt=agg.pastDebt;
});}catch(e){}
return rows;
};
Ops.buildStudentBilling=fn;window.__mcBillingFn=fn;
}

/* 2) كارت الدورة في داشبورد الطالب (متزامن مع الحضور الفعلي) */
function myCycle(){
window.renderMyCycle=function(){
try{
var el=document.getElementById('myCycleCard');if(!el)return;
var u=(window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null;
var sid=window.activeStudentId||(u?u.id:null);
if(!sid){el.innerHTML='';return;}
var ts=(DataService.getStudentTeachers?DataService.getStudentTeachers(sid):[]);
var html='',anyOver=false;
ts.forEach(function(t){
var g=t.group;if(!g)return;
var agg=aggregate(sid,g),c=agg.cur,cls='cycle-card',txt,amt='';
if(agg.pastDebt>0){cls+=' overdue';anyOver=true;txt='🚨 متأخرات مرحّلة من شهور سابقة';amt=agg.rem;}
else if(c.rem>0){cls+=' due';anyOver=true;txt='💰 شهرية '+monthName(c.month)+' مستحقة';amt=c.rem;}
else if(c.done===c.req-1){cls+=' warning';txt='⚠️ فاضل حصة واحدة — جهّز الشهرية';}
else txt='✓ '+monthName(c.month)+' — لسه مش مطلوب دفع';
var pct=Math.min(100,Math.round((c.done/c.req)*100));
html+='<div class="'+cls+'"><div class="cycle-header"><div class="cycle-title">📚 '+g.name+'</div><div class="cycle-count">'+c.done+'/'+c.req+'</div></div>'+
'<div class="cycle-progress"><div class="cycle-progress-bar" style="width:'+pct+'%"></div></div>'+
'<div class="cycle-meta">'+txt+(amt?' — المتبقي <strong>'+amt+' ج.م</strong> (شهرية شهر مش سعر حصة)':'')+'</div>'+
((agg.rem>0)?'<button class="btn btn-light btn-sm" style="margin-top:8px" onclick="window.showSection(\'payments\')">💳 عرض الفاتورة</button>':'')+
'</div>';
});
el.innerHTML=html;
document.body.setAttribute('data-overdue',anyOver?'true':'false');
try{localStorage.setItem('studentOverdueState',anyOver?'true':'false');}catch(e){}
}catch(e){}
};
window.renderMyCycle.__mc=1;
}

/* 3) صفحات الدورات (المساعد + الأدمن) */
function cyclesPages(){
function renderCycles(){
try{
var q=((document.getElementById('asCycleSearch')||document.getElementById('cycleSearch')||{}).value||'').toLowerCase();
var st=((document.getElementById('asCycleStatus')||document.getElementById('cycleStatusFilter')||{}).value)||'';
var gs=(window.myGroups?window.myGroups():(DataService.getGroups?DataService.getGroups():[]));
var rows=[];
gs.forEach(function(g){(DataService.getStudentsByGroup?DataService.getStudentsByGroup(g.id):[]).forEach(function(s){
var agg=aggregate(s.id,g),c=agg.cur;
var status=agg.pastDebt>0?'overdue':(c.rem>0?'due':(c.done===c.req-1?'warning':'active'));
rows.push({s:s,g:g,c:c,agg:agg,status:status});
});});
if(q)rows=rows.filter(function(r){return (r.s.name||'').toLowerCase().indexOf(q)>=0;});
if(st)rows=rows.filter(function(r){return r.status===st;});
var order={overdue:0,due:1,warning:2,active:3};
rows.sort(function(a,b){return order[a.status]-order[b.status];});
var cnt={warning:0,due:0,overdue:0};
rows.forEach(function(r){if(cnt[r.status]!==undefined)cnt[r.status]++;});
var statsEl=document.getElementById('asCyclesStats');
if(statsEl)statsEl.innerHTML='<div class="stat-mini"><div class="stat-mini-box"><div class="stat-mini-value" style="color:var(--warning)">'+cnt.warning+'</div><div class="stat-mini-label">إنذار (فاضل حصة)</div></div><div class="stat-mini-box"><div class="stat-mini-value" style="color:var(--info)">'+cnt.due+'</div><div class="stat-mini-label">مستحق (شهر مكتمل)</div></div><div class="stat-mini-box"><div class="stat-mini-value" style="color:var(--danger)">'+cnt.overdue+'</div><div class="stat-mini-label">متأخر مرحّل</div></div></div>';
var colors={active:'var(--success)',warning:'var(--warning)',due:'var(--info)',overdue:'var(--danger)'};
var labels={active:'✓ نشط',warning:'⚠️ إنذار',due:'💰 مستحق',overdue:'🚨 متأخر'};
var el=document.getElementById('asCyclesList')||document.getElementById('studentCyclesList');
if(!el)return;
el.innerHTML=rows.length?rows.map(function(r){
var payBtn=(r.status==='due'||r.status==='overdue')?((window.recordAsPayment?'<button class="btn btn-success btn-sm" onclick="window.recordAsPayment(\''+r.s.id+'\',\''+r.g.id+'\')">💰 تسجيل دفع</button>':'')+(window.recordCyclePayment?'<button class="btn btn-success btn-sm" onclick="window.recordCyclePayment(\''+r.s.id+'\',\''+r.g.id+'\')">💰 تسجيل دفع</button>':'')+(window.Ops&&Ops.openPaymentReminderWa?'<button class="btn btn-ghost btn-sm" onclick="Ops.openPaymentReminderWa(\''+r.s.id+'\',\''+r.g.id+'\')">💬 تذكير</button>':'')):'';
return '<div class="sub-row" style="border-right:4px solid '+colors[r.status]+';"><div><strong>'+r.s.name+'</strong><div class="text-xs text-muted">📚 '+r.g.name+' · 🔄 '+r.c.done+'/'+r.c.req+' (حضور شهر '+monthName(r.c.month)+')</div>'+(r.agg.rem>0?'<div class="text-xs" style="color:var(--danger);font-weight:800;">متبقي: '+r.agg.rem+' ج.م'+(r.agg.pastDebt>0?' (منها '+r.agg.pastDebt+' مرحّل)':'')+'</div>':'')+'</div><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;"><span class="badge" style="background:'+colors[r.status]+';color:#fff;">'+labels[r.status]+'</span>'+payBtn+'</div></div>';
}).join(''):'<div class="card" style="text-align:center;padding:24px;">لا دورات</div>';
}catch(e){console.error(e);}
}
window.loadAsCycles=renderCycles;window.loadStudentCycles=renderCycles;
window.loadAsCycles.__mc=1;window.loadStudentCycles.__mc=1;
}

/* 4) صفحة المدفوعات (طالب + ولي أمر) — مبالغ شهرية فقط */
function paymentsPages(){
window.loadPayments=function(){
try{
var el=document.getElementById('paymentsList');if(!el)return;
var u=(window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null;
var sid=window.activeStudentId||(window.activeChild&&window.activeChild.id)||(u?u.id:null);
if(!sid)return;
var ts=(DataService.getStudentTeachers?DataService.getStudentTeachers(sid):[]);
if(!ts.length){el.innerHTML='<div class="card" style="text-align:center;padding:24px;"><div style="font-size:48px;">💰</div><strong>لا توجد مستحقات</strong></div>';return;}
var gDue=0,gPaid=0,gRem=0,html='';
ts.forEach(function(t){
var g=t.group;if(!g)return;
var agg=aggregate(sid,g),months=agg.months.slice().reverse();
gDue+=agg.dueTotal;gPaid+=agg.paidTotal;gRem+=agg.rem;
html+='<div class="card" style="margin-bottom:14px;"><div class="card-header"><h3 class="card-title">👥 '+g.name+'</h3><span class="text-xs text-muted">👨‍ '+(t.teacher?t.teacher.name:'-')+' · شهرية الشهر: '+feeOf(g)+' ج.م</span></div><div style="padding:12px;">';
months.forEach(function(r){
if(r.completed){
var badge=r.rem===0?'<span class="badge badge-success">✓ مسدد بالكامل</span>':(r.paid>0?'<span class="badge badge-warning">جزئي — متبقي '+r.rem+' ج.م</span>':'<span class="badge badge-danger">💰 مستحقة: '+r.fee+' ج.م</span>');
html+='<div class="sub-row '+(r.rem>0?'due':'graded')+'"><div><strong>📅 '+monthName(r.month)+'</strong><div class="text-xs text-muted">الحصص: '+r.done+'/'+r.req+' · المدفوع: '+r.paid+'/'+r.fee+'</div></div><div>'+badge+'</div></div>';
}else{
var isPast=r.month<localMonth();
var badge2,cls2='';
if(isPast&&r.paid>0){ badge2='<span class="badge badge-info">💵 مقدم '+r.paid+' ج.م (يُحتسب للشهر الحالي)</span>'; }
else if(isPast){ badge2='<span class="badge badge-muted">📴 انتهى — مش مستحق (لم يكمل '+r.req+' حصة)</span>'; cls2=' style="opacity:.7"'; }
else { badge2=(r.paid>0?'<span class="badge badge-info">مقدم '+r.paid+' ج.م</span>':'<span class="badge badge-info">🔄 جاري — '+r.done+'/'+r.req+'</span>'); }
html+='<div class="sub-row"'+cls2+'><div><strong>📅 '+monthName(r.month)+'</strong><div class="text-xs text-muted">الحصص: '+r.done+'/'+r.req+' — الشهرية مش مستحقة لسه</div></div><div>'+badge2+'</div></div>';
}
});
if(agg.pastDebt>0)html+='<div class="filter-info" style="background:var(--danger-bg);border-color:var(--danger);color:var(--danger);">🚨 متأخرات مرحّلة من شهور سابقة: '+agg.pastDebt+' ج.م — بتفضل ظاهرة لحد ما تتسد</div>';
html+='</div></div>';
});
var summary='<div class="card" style="margin-bottom:14px;border-color:var(--primary-border);"><div style="padding:14px;display:flex;gap:14px;flex-wrap:wrap;justify-content:space-between;"><div><div class="text-xs text-muted">إجمالي المستحق (شهور مكتملة)</div><div style="font-size:22px;font-weight:900;font-family:var(--font-en);">'+gDue+' ج.م</div></div><div><div class="text-xs text-muted">المدفوع</div><div style="font-size:22px;font-weight:900;font-family:var(--font-en);color:var(--success);">'+gPaid+' ج.م</div></div><div><div class="text-xs text-muted">المتبقي</div><div style="font-size:22px;font-weight:900;font-family:var(--font-en);color:'+(gRem>0?'var(--danger)':'var(--success)')+';">'+gRem+' ج.م</div></div></div></div>';
el.innerHTML=summary+html;
}catch(e){console.error(e);}
};
window.loadPayments.__mc=1;
}

/* تطبيق + إعادة تطبيق (عشان أي كود تاني يعدل بعدينا) */
function applyAll(){
wrapBilling();
if(!window.renderMyCycle||!window.renderMyCycle.__mc)myCycle();
if(!window.loadAsCycles||!window.loadAsCycles.__mc)cyclesPages();
if(!window.loadPayments||!window.loadPayments.__mc)paymentsPages();
}
applyAll();
setTimeout(applyAll,600);setTimeout(applyAll,1500);setTimeout(applyAll,3000);
setInterval(applyAll,1500);
setInterval(function(){ try{ var el=document.getElementById('myCycleCard'); if(el&&window.renderMyCycle&&window.renderMyCycle.__mc) window.renderMyCycle(); }catch(e){} },6000);
/* إعادة الرسم فور فتح أي صفحة معنية — بيصلح أول تحميل */
(function(){
if(typeof window.showSection==='function'&&!window.__mcShowHook){
window.__mcShowHook=1;
var os=window.showSection;
window.showSection=function(id){
var r=os.apply(this,arguments);
try{
if(id==='dashboard'||id==='overview'){
setTimeout(function(){ if(window.renderMyCycle&&window.renderMyCycle.__mc) window.renderMyCycle(); },120);
setTimeout(function(){ if(window.renderMyCycle&&window.renderMyCycle.__mc) window.renderMyCycle(); },1000);
}
if(id==='payments'){ setTimeout(function(){ if(window.loadPayments&&window.loadPayments.__mc) window.loadPayments(); },120); }
}catch(e){}
return r;
};
}
})();
})();