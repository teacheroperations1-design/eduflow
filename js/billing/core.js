/* ================================================================
📦 Billing Core V3 — مصدر واحد لحقيقة الحصص والشهرية (دورة-واعي + بدون اختطاف)
• العداد/المربعات/المدفوع = من محرك الدفتر (LedgerUI) بمفاتيح دورات موحّدة cycle-NN
• تحويل تلقائي: أي شهر ميلادي بيدخل يتحول لمفتاح الدورة بتاعته قبل الحساب
• 7/8 = إنذار، 8/8 = مطالبة، شهر فات مش مدفوع = متأخر مرحّل
• 🆕 V3: مفيش setInterval بيكتب فوق دوال الصفحات — التعريف مرة واحدة لو ناقص بس
• 🆕 V3: بيسمع نبضة ledger-sync ويعيد رسم نفسه فوراً (مزامنة لحظية بين التبويبات)
================================================================ */
(function(){
"use strict";
function pad(n){return String(n).padStart(2,'0');}
function localMonth(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1);}
function nextM(m){var d=new Date(m+'-01T12:00:00');d.setMonth(d.getMonth()+1);return d.getFullYear()+'-'+pad(d.getMonth()+1);}
var OCT='2026-10';
function startMonth(){try{var v=localStorage.getItem('ldgStartMonth');if(!v||v<OCT){localStorage.setItem('ldgStartMonth',OCT);v=OCT;}return v;}catch(e){return OCT;}}
function monthsUpTo(m){var out=[],s=startMonth();if(m<s)s=m;var g=0;while(s<=m&&g<48){out.push(s);s=nextM(s);g++;}return out;}
function monthName(m){try{return new Date(m+'-01T12:00:00').toLocaleDateString('ar-EG',{month:'long',year:'numeric'});}catch(e){return m;}}
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function gById(gid){return (DataService.getGroups?DataService.getGroups():[]).find(function(g){return g.id===gid;});}
function reqOf(g){return (g&&g.sessionsPerMonth)||((window.EduFlowConfig&&EduFlowConfig.billing&&EduFlowConfig.billing.sessionsBeforePayment)||8);}
function feeOf(g){return (g&&g.monthlyFee)||0;}
function cur(){try{return (window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null;}catch(e){return null;}}

/* 🆕 V3: تحويل أي مفتاح (ميلادي أو دورة) لمفتاح الدورة الصحيح */
function cycleKeyFor(g,m){
if(!m) return localMonth();
if(String(m).indexOf('cycle-')===0) return m;
var rs=(g&&g.cycleRanges)||[];
for(var i=0;i<rs.length;i++){ var f=(rs[i].from||'').slice(0,7), t=rs[i].to?rs[i].to.slice(0,7):'9999-12'; if(m>=f&&m<=t) return 'cycle-'+pad(rs[i].n); }
return rs.length?('cycle-'+pad(rs[rs.length-1].n)):m;
}
/* 🆕 V3: قائمة دورات المجموعة من المحرك الواحد */
function cyclesOfGroup(g){
if(window.LedgerUI&&LedgerUI.cyclesOf){ try{ return LedgerUI.cyclesOf(g); }catch(e){} }
var rs=(g&&g.cycleRanges)||[];
if(rs.length) return rs.map(function(r){ return {n:r.n, ck:'cycle-'+pad(r.n), ym:(r.from||'').slice(0,7), range:r}; });
return monthsUpTo(localMonth()).map(function(m,i){ return {n:i+1, ck:m, ym:m, range:{from:m+'-01',to:null}}; });
}

/* الحصص الفعلية في دورة (fallback محلي بنفس قواعد المحرك) */
function heldDates(gid,ck){
var g=gById(gid), d=db(), canc={}, rs=(g&&g.cycleRanges)||[], n=parseInt(String(ck).replace('cycle-',''))||1, rng=null;
rs.forEach(function(r){ if(r.n===n) rng=r; }); if(!rng) rng=rs[rs.length-1]||null;
(d.cancelledSessions||[]).forEach(function(c){ if(c.groupId===gid) canc[c.date]=(c.makeupStatus==='done'); });
function inR(ds){ if(!rng) return (ds||'').slice(0,7)===String(ck).slice(0,7); return ds>=rng.from&&(!rng.to||ds<=rng.to); }
var set={};
(DataService.getAttendance?DataService.getAttendance():[]).forEach(function(a){
if(a.groupId!==gid||a.status!=='approved'||!inR(a.date||''))return;
if(canc[a.date]===false)return;
set[a.date]=canc[a.date]?'madeup':'done';
});
return set;
}
function manualSumMax(gid,ck){ var per={}; (db().manualSessions||[]).forEach(function(ms){ if(ms.groupId===gid&&(ms.month===ck)&&(!ms.type||ms.type==='counter')) per[ms.studentId]=(per[ms.studentId]||0)+(ms.sessionsCount||0); }); var mx=0; Object.keys(per).forEach(function(k){ if(per[k]>mx) mx=per[k]; }); return mx; }
function manualSum(sid,gid,ck){ var s=0; (db().manualSessions||[]).forEach(function(ms){ if(ms.groupId===gid&&ms.studentId===sid&&ms.month===ck&&(!ms.type||ms.type==='counter')) s+=(ms.sessionsCount||0); }); return s; }

function sessionsOf(sid,gid,m){
var g=gById(gid), ck=cycleKeyFor(g,m);
if(window.LedgerUI&&LedgerUI.groupSessions){ var s=LedgerUI.groupSessions(gid,ck); return s?s.done:0; }
return Object.keys(heldDates(gid,ck)).length+manualSum(sid,gid,ck);
}
/* 🆕 V3: المدفوع بقواعد المحرك حرفياً */
function paidOf(sid,gid,m){
var g=gById(gid), ck=cycleKeyFor(g,m);
if(window.LedgerUI&&LedgerUI.paidForCycle){ try{ return LedgerUI.paidForCycle(sid,gid,ck); }catch(e){} }
var tot=0; (db().payments||[]).forEach(function(p){ if(!p||p.studentId!==sid||p.groupId!==gid) return; var pm=String(p.month||''); if(pm===ck||pm===m||pm.slice(0,7)===String(m).slice(0,7)) tot+=(p.paidAmount||0); }); return tot;
}
function payRec(sid,gid,m){ var g=gById(gid), ck=cycleKeyFor(g,m), p=null; (db().payments||[]).forEach(function(x){ if(x.studentId===sid&&x.groupId===gid&&(x.month===ck||x.month===m)) p=x; }); return p; }

function monthRow(sid,g,m){
if(!g)return{month:m,done:0,req:8,fee:0,paid:0,completed:false,rem:0};
var req=reqOf(g),fee=feeOf(g),done=sessionsOf(sid,g.id,m),paid=paidOf(sid,g.id,m),completed=done>=req;
return{month:m,done:done,req:req,fee:fee,paid:paid,completed:completed,rem:completed?Math.max(0,fee-paid):0};
}
function statusOf(sid,g){
var cyc=cyclesOfGroup(g), curC=cyc[cyc.length-1]||{ck:localMonth()};
var c=monthRow(sid,g,curC.ck);
var warnAt=(g&&g.warnAt!=null&&g.warnAt!=='')?+g.warnAt:(c.req-1);
var past=cyc.slice(0,-1).map(function(x){return monthRow(sid,g,x.ck);});
if(past.some(function(r){return r.completed&&r.rem>0;}))return'overdue';
if(c.completed&&c.rem>0)return'due';
if(c.completed&&c.rem===0)return'paid';
if(c.done>=warnAt&&!c.completed)return'warning';
return'active';
}
function squaresOf(gid,m){
var g=gById(gid), ck=cycleKeyFor(g,m);
if(window.LedgerUI&&LedgerUI.groupSessions){
var s=LedgerUI.groupSessions(gid,ck);
var ev=(s.events||[]).map(function(e){ return {t:e.t,d:e.d||''}; });
var done=ev.filter(function(e){return e.t!=='cancelled';}).length;
for(var i=done;i<s.required;i++) ev.push({t:'empty',d:''});
return {ev:ev,done:done,req:s.required,warnAt:s.warnAt};
}
var req=reqOf(g), held=heldDates(gid,ck), ev2=[];
Object.keys(held).sort().forEach(function(d){ev2.push({t:held[d],d:d});});
var man=manualSumMax(gid,ck);
while(ev2.length<man)ev2.unshift({t:'manual',d:''});
for(var j=ev2.length;j<req;j++)ev2.push({t:'empty',d:''});
return {ev:ev2,done:ev2.filter(function(e){return e.t!=='cancelled';}).length,req:req};
}
function sqHtml(sq){
return sq.ev.map(function(e){
if(e.t==='empty')return'<span class="bsq" style="background:var(--surface-hover);border:1px solid var(--border);"></span>';
if(e.t==='manual')return'<span class="bsq" style="background:var(--success);" title="مرحّلة/يدوية">📥</span>';
if(e.t==='cancelled')return'<span class="bsq" style="background:var(--danger);" title="'+e.d+' ملغية">✗</span>';
var day=String(e.d).slice(8,10);
if(e.t==='madeup')return'<span class="bsq" style="background:var(--info);" title="'+e.d+' — حصة تعويضية">↺</span>';
return'<span class="bsq" style="background:var(--success);" title="'+e.d+' حصة فعلية">'+day+'</span>';
}).join('');
}
function getMyPendingCancels(){
  var u=cur(); if(!u) return [];
  var d=db();
  var myGroups=(DataService.getStudentTeachers?DataService.getStudentTeachers(u.id):[]).map(function(t){return t.group.id;});
  return (d.pendingCancelledSessions||[]).filter(function(pc){
    return myGroups.indexOf(pc.groupId)>=0 && pc.date>new Date().toISOString().slice(0,10);
  });
}

window.BC={
startMonth:startMonth,monthsUpTo:monthsUpTo,monthName:monthName,localMonth:localMonth,
cycleKeyFor:cycleKeyFor,cyclesOfGroup:cyclesOfGroup,paidOf:paidOf,
heldDates:heldDates,sessionsOf:sessionsOf,payRec:payRec,monthRow:monthRow,
statusOf:statusOf,squaresOf:squaresOf,sqHtml:sqHtml,reqOf:reqOf,feeOf:feeOf,
getMyPendingCancels:getMyPendingCancels,
deleteHeldSession:function(gid,attId){
var d=db();
d.attendance=(d.attendance||[]).filter(function(x){return x.id!==attId;});
if(DataService._saveData)DataService._saveData(d);
if(window.FirebaseService&&FirebaseService.connected){try{FirebaseService.deleteDoc('attendance',attId);}catch(e){}}
},
deleteCancel:function(gid,cid){
var d=db();
d.cancelledSessions=(d.cancelledSessions||[]).filter(function(x){return x.id!==cid;});
if(DataService._saveData)DataService._saveData(d);
if(window.FirebaseService&&FirebaseService.connected){try{FirebaseService.deleteDoc('cancelledSessions',cid);}catch(e){}}
},
addManualSession:function(gid,sid,month,reason){
var g=gById(gid), ck=cycleKeyFor(g,month);
var d=db();d.manualSessions=d.manualSessions||[];
var rec={id:'ms_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),groupId:gid,studentId:sid,month:ck,sessionsCount:1,type:'counter',reason:reason||'إضافة يدوية',addedAt:new Date().toISOString()};
d.manualSessions.push(rec);
if(DataService._saveData)DataService._saveData(d);
if(window.FirebaseService&&FirebaseService.connected){try{FirebaseService.saveDoc('manualSessions',rec.id,rec);}catch(e){}}
return rec;
},
removeManualSession:function(gid,sid,month){
var g=gById(gid), ck=cycleKeyFor(g,month);
var d=db();
var list=(d.manualSessions||[]).filter(function(ms){return ms.groupId===gid&&ms.studentId===sid&&ms.month===ck&&(!ms.type||ms.type==='counter');});
if(!list.length)return false;
list.sort(function(a,b){return String(a.addedAt||'').localeCompare(String(b.addedAt||''));});
var last=list[list.length-1];
if((last.sessionsCount||0)>1){last.sessionsCount=last.sessionsCount-1;if(DataService._saveData)DataService._saveData(d);if(window.FirebaseService&&FirebaseService.connected){try{FirebaseService.saveDoc('manualSessions',last.id,last);}catch(e){}}}
else{d.manualSessions=(d.manualSessions||[]).filter(function(ms){return ms.id!==last.id;});if(DataService._saveData)DataService._saveData(d);if(window.FirebaseService&&FirebaseService.connected){try{FirebaseService.deleteDoc('manualSessions',last.id);}catch(e){}}}
return true;
},
resetGroup:function(gid,month,options){
options=options||{};
var g=gById(gid), ck=cycleKeyFor(g,month);
var d=db();
var months=options.allMonths?cyclesOfGroup(g).map(function(c){return c.ck;}):[ck];
if(options.clearManual){d.manualSessions=(d.manualSessions||[]).filter(function(ms){return !(ms.groupId===gid&&months.indexOf(ms.month||'')>=0);});}
if(options.clearCancelled){d.cancelledSessions=(d.cancelledSessions||[]).filter(function(c){return !(c.groupId===gid&&months.indexOf(cycleKeyFor(g,(c.date||'').slice(0,7)))>=0);});}
if(options.clearAttendance){d.attendance=(d.attendance||[]).filter(function(a){return !(a.groupId===gid&&months.indexOf(cycleKeyFor(g,(a.date||'').slice(0,7)))>=0);});}
if(options.resetNow){var gg=gById(gid);if(gg){gg.sessionNow=0;gg.sessionNowMonth=ck;}}
if(DataService._saveData)DataService._saveData(d);
}
};

/* توحيد Ops.buildStudentBilling (دورة-واعي) */
function wrapBilling(){
if(typeof Ops==='undefined'||!Ops)return;
if(Ops.buildStudentBilling===window.__bcBillingFn)return;
var prev=Ops.buildStudentBilling;if(typeof prev!=='function')return;
var fn=function(studentId,month){
var rows=prev.call(Ops,studentId,month);
try{(rows||[]).forEach(function(row){
var g=row.group;if(!g)return;
var c=BC.monthRow(studentId,g,month||localMonth());
var past=BC.cyclesOfGroup(g).slice(0,-1).map(function(x){return BC.monthRow(studentId,g,x.ck);});
var pastDebt=past.reduce(function(s,r){return s+(r.completed?r.rem:0);},0);
row.billing=row.billing||{};row.payment=row.payment||{};
row.billing.actualSessions=c.done;
row.billing.sessionsRequired=c.req;
row.billing.total=c.completed?c.fee:0;
row.billing.shouldCharge=c.rem>0||pastDebt>0;
row.payment.paidAmount=c.paid;
row.billing.remaining=c.rem+pastDebt;
row.billing.carriedDebt=pastDebt;
});}catch(e){}
return rows;
};
Ops.buildStudentBilling=fn;window.__bcBillingFn=fn;
}

/* كارت الدورة في داشبورد الطالب */
function myCycle(){
window.renderMyCycle=function(){
try{
var el=document.getElementById('myCycleCard');if(!el)return;
var u=cur();var sid=window.activeStudentId||(u?u.id:null);if(!sid){el.innerHTML='';return;}
var ts=(DataService.getStudentTeachers?DataService.getStudentTeachers(sid):[]);
var html='',anyOver=false;
ts.forEach(function(t){
var g=t.group;if(!g)return;
var st=BC.statusOf(sid,g),sq=BC.squaresOf(g.id,localMonth()),c=BC.monthRow(sid,g,localMonth());
var cls='cycle-card',txt='✓ '+BC.monthName(localMonth())+' — لسه مش مطلوب دفع';
if(st==='overdue'){cls+=' overdue';anyOver=true;txt='🚨 متأخرات مرحّلة — برجاء السداد';}
else if(st==='due'){cls+=' due';anyOver=true;txt='💰 شهرية '+BC.monthName(localMonth())+' مستحقة: '+c.rem+' ج.م';}
else if(st==='warning'){cls+=' warning';txt='⚠️ إنذار الدفع ('+sq.done+'/'+sq.req+') — جهّز الشهرية للحصة الجايه';}
else if(st==='paid'){txt='✅ مسدد — شكراً ليك 🌟';}
var pct=Math.min(100,Math.round(sq.done/sq.req*100));
html+='<div class="'+cls+'"><div class="cycle-header"><div class="cycle-title">📚 '+g.name+'</div><div class="cycle-count">'+sq.done+'/'+sq.req+'</div></div>'+
'<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:6px;">'+BC.sqHtml(sq)+'</div>'+
'<div class="cycle-progress"><div class="cycle-progress-bar" style="width:'+pct+'%"></div></div>'+
'<div class="cycle-meta">'+txt+'</div>'+
((st==='due'||st==='overdue')?'<button class="btn btn-light btn-sm" style="margin-top:8px" onclick="window.showSection(\'payments\')">💳 عرض الفاتورة</button>':'')+
'</div>';
});
el.innerHTML=html;
document.body.setAttribute('data-overdue',anyOver?'true':'false');
try{localStorage.setItem('studentOverdueState',anyOver?'true':'false');}catch(e){}
}catch(e){}
};
window.renderMyCycle.__bc=1;
}

/* صفحات الدورات (مساعد + أدمن) */
function cyclesPages(){
function renderCycles(){
try{
var q=((document.getElementById('asCycleSearch')||document.getElementById('cycleSearch')||{}).value||'').toLowerCase();
var stF=((document.getElementById('asCycleStatus')||document.getElementById('cycleStatusFilter')||{}).value)||'';
var gs=(window.myGroups?window.myGroups():(DataService.getGroups?DataService.getGroups():[]));
var rows=[];
gs.forEach(function(g){(DataService.getStudentsByGroup?DataService.getStudentsByGroup(g.id):[]).forEach(function(s){
var st=BC.statusOf(s.id,g),sq=BC.squaresOf(g.id,localMonth());
rows.push({s:s,g:g,st:st,sq:sq});
});});
if(q)rows=rows.filter(function(r){return (r.s.name||'').toLowerCase().indexOf(q)>=0;});
if(stF)rows=rows.filter(function(r){return r.st===stF;});
var order={overdue:0,due:1,warning:2,paid:3,active:4};
rows.sort(function(a,b){return order[a.st]-order[b.st];});
var cnt={warning:0,due:0,overdue:0};
rows.forEach(function(r){if(cnt[r.st]!==undefined)cnt[r.st]++;});
var statsEl=document.getElementById('asCyclesStats');
if(statsEl)statsEl.innerHTML='<div class="stat-mini"><div class="stat-mini-box"><div class="stat-mini-value" style="color:var(--warning)">'+cnt.warning+'</div><div class="stat-mini-label">⚠️ إنذار (7/8)</div></div><div class="stat-mini-box"><div class="stat-mini-value" style="color:var(--info)">'+cnt.due+'</div><div class="stat-mini-label">💰 مستحق (8/8)</div></div><div class="stat-mini-box"><div class="stat-mini-value" style="color:var(--danger)">'+cnt.overdue+'</div><div class="stat-mini-label">🚨 متأخر مرحّل</div></div></div>';
var colors={active:'var(--success)',warning:'var(--warning)',due:'var(--info)',overdue:'var(--danger)',paid:'var(--success)'};
var labels={active:'✓ نشط',warning:'⚠️ إنذار أول',due:'💰 مستحق',overdue:'🚨 متأخر مرحّل',paid:'✅ مسدد'};
var el=document.getElementById('asCyclesList')||document.getElementById('studentCyclesList');if(!el)return;
el.innerHTML=rows.length?rows.map(function(r){
var c=BC.monthRow(r.s.id,r.g,localMonth());
var money=(r.st==='due'||r.st==='overdue')?'<div class="text-xs" style="color:var(--danger);font-weight:800;">متبقي: '+c.rem+' ج.م</div>':(r.st==='warning'?'<div class="text-xs" style="color:var(--warning);font-weight:700;">الحصة الجاية الدفع — '+r.sq.done+'/'+r.sq.req+'</div>':'');
var payBtn=(r.st==='due'||r.st==='overdue')?((window.recordAsPayment?'<button class="btn btn-success btn-sm" onclick="window.recordAsPayment(\''+r.s.id+'\',\''+r.g.id+'\')">💰 تسجيل دفع</button>':'')+(window.recordCyclePayment?'<button class="btn btn-success btn-sm" onclick="window.recordCyclePayment(\''+r.s.id+'\',\''+r.g.id+'\')">💰 تسجيل دفع</button>':'')):'';
return '<div class="sub-row" style="border-right:4px solid '+colors[r.st]+';"><div><strong>'+r.s.name+'</strong><div class="text-xs text-muted">📚 '+r.g.name+' · 🔄 '+r.sq.done+'/'+r.sq.req+'</div>'+money+'</div><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;"><span class="badge" style="background:'+colors[r.st]+';color:#fff;">'+labels[r.st]+'</span>'+payBtn+'</div></div>';
}).join(''):'<div class="card" style="text-align:center;padding:24px;">لا دورات</div>';
}catch(e){console.error(e);}
}
window.loadAsCycles=renderCycles;window.loadStudentCycles=renderCycles;
window.loadAsCycles.__bc=1;window.loadStudentCycles.__bc=1;
}

/* 🆕 V3: كروت الفاتورة الموحّدة (طالب + ولي أمر) — بنفس أرقام المحرك */
function billingCards(sid,el){
var ts=(DataService.getStudentTeachers?DataService.getStudentTeachers(sid):[]);
if(!ts.length){el.innerHTML='<div class="card" style="text-align:center;padding:24px;"><div style="font-size:48px;">💰</div><strong>لا توجد مستحقات</strong></div>';return;}
var gDue=0,gPaid=0,gRem=0,html='';
ts.forEach(function(t){
var g=t.group;if(!g)return;
var cyc=BC.cyclesOfGroup(g);
var rows=cyc.map(function(c){ var r=BC.monthRow(sid,g,c.ck); r.ym=c.ym; r.n=c.n; return r; }).slice().reverse();
var done=rows.filter(function(r){return r.completed;});
var due=done.reduce(function(s,r){return s+r.fee;},0);
var paid=done.reduce(function(s,r){return s+Math.min(r.paid,r.fee);},0);
var rem=done.reduce(function(s,r){return s+r.rem;},0);
gDue+=due;gPaid+=paid;gRem+=rem;
html+='<div class="card" style="margin-bottom:14px;"><div class="card-header"><h3 class="card-title">👥 '+g.name+'</h3><span class="text-xs text-muted">👨‍ '+(t.teacher?t.teacher.name:'-')+' · شهرية: '+BC.feeOf(g)+' ج.م · النصاب: '+BC.reqOf(g)+' حصة</span></div><div style="padding:12px;">';
if(g.frozen) html+='<div class="filter-info" style="background:var(--warning-bg);color:var(--warning);border-color:var(--warning);margin-bottom:8px;">🧊 العد موقوف من '+(g.frozenSince||'-')+' — حصص فترة الوقف مش محسوبة</div>';
rows.forEach(function(r){
var sq=BC.squaresOf(g.id,r.month);
var badge;
if(r.completed&&r.rem===0)badge='<span class="badge badge-success">✓ مسدد بالكامل</span>';
else if(r.completed&&r.paid>0)badge='<span class="badge badge-warning">جزئي — متبقي '+r.rem+' ج.م</span>';
else if(r.completed)badge='<span class="badge badge-danger">💰 مستحقة: '+r.fee+' ج.م</span>';
else badge=r.paid>0?'<span class="badge badge-info">💵 مقدم '+r.paid+' ج.م</span>':'<span class="badge badge-info">🔄 جاري — '+r.done+'/'+r.req+'</span>';
html+='<div class="sub-row" style="display:block;"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;"><div><strong>📅 '+BC.monthName(r.ym||r.month)+'</strong> <span class="text-xs text-muted">دورة '+r.n+'</span><div class="text-xs text-muted">المدفوع: '+r.paid+'/'+r.fee+'</div></div><div>'+badge+'</div></div><div style="display:flex;gap:3px;flex-wrap:wrap;align-items:center;margin-top:8px;">'+BC.sqHtml(sq)+'<b style="font-family:var(--font-en);font-size:11px;margin-inline-start:6px;">'+sq.done+'/'+sq.req+'</b></div></div>';
});
html+='</div></div>';
});
var summary='<div class="card" style="margin-bottom:14px;border-color:var(--primary-border);"><div style="padding:14px;display:flex;gap:14px;flex-wrap:wrap;justify-content:space-between;"><div><div class="text-xs text-muted">إجمالي المستحق (دورات مكتملة)</div><div style="font-size:22px;font-weight:900;font-family:var(--font-en);">'+gDue+' ج.م</div></div><div><div class="text-xs text-muted">المدفوع</div><div style="font-size:22px;font-weight:900;font-family:var(--font-en);color:var(--success);">'+gPaid+' ج.م</div></div><div><div class="text-xs text-muted">المتبقي</div><div style="font-size:22px;font-weight:900;font-family:var(--font-en);color:'+(gRem>0?'var(--danger)':'var(--success)')+';">'+gRem+' ج.م</div></div></div></div>';
el.innerHTML=summary+html;
}
function resolveSid(){
var u=cur();
if(window.activeStudentId) return window.activeStudentId;
if(window.activeChild&&window.activeChild.id) return window.activeChild.id;
if(u&&u.role==='student') return u.id;
if(u&&u.studentIds&&u.studentIds.length) return u.studentIds[0];
return u?u.id:null;
}
function paymentsPages(){
window.loadPayments=function(){
try{
var el=document.getElementById('paymentsList')||document.getElementById('pPayList');if(!el)return;
var sid=resolveSid(); if(!sid)return;
billingCards(sid,el);
}catch(e){console.error(e);}
};
window.loadPayments.__bc=1;
window.renderLedger=function(){
try{
var el=document.getElementById('ledgerContent');if(!el)return;
var sid=resolveSid();
if(!sid){el.innerHTML='<p class="text-muted">اختار ابنك الأول</p>';return;}
billingCards(sid,el);
}catch(e){console.error(e);}
};
window.renderLedger.__bc=1;
}

/* 🆕 V3: تعريف مرة واحدة لو ناقص — مفيش اختطاف دوري */
function applyAll(){
wrapBilling();
if(!window.renderMyCycle||!window.renderMyCycle.__bc)myCycle();
if(!window.loadAsCycles||!window.loadAsCycles.__bc)cyclesPages();
if(!window.loadPayments||!window.loadPayments.__bc)paymentsPages();
if(!window.renderLedger||!window.renderLedger.__bc)paymentsPages();
}
applyAll();
setTimeout(applyAll,600);
setTimeout(applyAll,1500);
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ setTimeout(applyAll,300); });
setInterval(function(){try{var el=document.getElementById('myCycleCard');if(el&&window.renderMyCycle&&window.renderMyCycle.__bc)window.renderMyCycle();}catch(e){}},6000);
/* 📡 مزامنة لحظية: أي نبضة من محرك الدفتر → إعادة رسم فورية */
window.addEventListener('ledger-sync',function(){
try{
if(window.renderMyCycle&&window.renderMyCycle.__bc) window.renderMyCycle();
var act=document.querySelector('.section.active'); if(!act) return;
var id=act.id.replace('section-','');
if(id==='payments'||id==='ledger'||id==='cycles'||id==='overview'){ if(window.showSection) window.showSection(id); }
}catch(e){}
});
(function(){
if(typeof window.showSection==='function'&&!window.__bcShowHook){
window.__bcShowHook=1;
var os=window.showSection;
window.showSection=function(id){
var r=os.apply(this,arguments);
try{
if(id==='dashboard'||id==='overview'){setTimeout(function(){if(window.renderMyCycle&&window.renderMyCycle.__bc)window.renderMyCycle();},120);}
if(id==='payments'||id==='ledger'||id==='cycles'){setTimeout(function(){wrapBilling();},120);}
}catch(e){}
return r;
};
}
})();
if(!document.getElementById('bcCss')){var st=document.createElement('style');st.id='bcCss';st.textContent='.bsq{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:20px;border-radius:5px;font-size:9px;font-weight:800;font-family:var(--font-en);color:#fff;}';document.head.appendChild(st);}
})();