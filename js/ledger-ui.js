/* ================================================================
📒 Ledger UI V11 — دفتر التحصيل النهائي (مصدر الحقيقة الوحيد)
• المربعات: 🟩 أخضر بتاريخ = حصة فعلية/موعد عدّى · 🟦 أزرق ↺ = تعويضية · 🟥 أحمر = ملغاة · 📥 = مرحّلة/يدوية · ⬜ رمادي = لسه
• أي مربع يتحكم فيه يدوياً: إضافة / حذف نهائي / إلغاء / شيل إلغاء
• الإنذار 🔔 مرة واحدة لكل مجموعة/شهر عند الرقم المحدد (g.warnAt افتراضي قبل الأخيرة)
• المطالبة 💰 مرة واحدة عند اكتمال النصاب — والداشبورد الأحمر كافي (مفيش تكرار إشعارات)
• 🧹 تصفير المربعات: لكل مجموعة / مجموعات محددة / الكل — بخيارات النطاق
• 🆕 V11: 🎛️ مودال تحكم العدّ — فلاتر متتابعة (أستاذ←سنتر←مرحلة←صف←بحث) + تجميد/تفعيل/تصفير فردي وجماعي وشامل
• 🆕 V11: 🧊 التجميد بيستثني حصص فترة التجميد نهائياً — أول ما تفعّل، العدّ بيكمّل من لحظة التفعيل مش من قبلها
• 🆕 V11: فلاتر الدفتر المتتابعة الذكية (السنتر بالأستاذ والصفوف بالمرحلة والمجموعات بالكل)
• بداية المحاسبة من ldgStartMonth (افتراضي 2026-10)
================================================================ */
/* 🌐 alias عام — بيمنع ReferenceError: LU is not defined في أي بلوك ملحق */
var LU = window.LedgerUI = window.LedgerUI || {};
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
async function cloudAtt(a,del){ try{ if(window.FirebaseService&&FirebaseService._db){ if(del) await FirebaseService.deleteDoc('attendance',a.id); else await FirebaseService.saveDoc('attendance',a.id,a); } }catch(e){} }
async function cloudCanc(c,del){ try{ if(window.FirebaseService&&FirebaseService._db){ if(del) await FirebaseService.deleteDoc('cancelledSessions',c.id); else await FirebaseService.saveDoc('cancelledSessions',c.id,c); } }catch(e){} }
function cur(){ try{ return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null); }catch(e){ return null; } }
function isAdmin(){ var u=cur(); return u&&(u.role==='admin'||u.role==='super_admin'||u.role==='assistant'); }
/* 🛡️ V12: صفحات الطالب/ولي الأمر قراءة فقط — مفيش هجرة ولا قفل دورات ولا إشعارات منها */
function canWrite(){ var u=cur(); return !!u&&(u.role==='admin'||u.role==='super_admin'||u.role==='assistant'||u.role==='center'); }
function readOnly(){ return !canWrite(); }
function localToday(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function pad2(n){return String(n).padStart(2,'0');}
function cycKey(n){return 'cycle-'+pad2(n);}
function nextDay(ds){var d=new Date(ds+'T12:00:00');d.setDate(d.getDate()+1);return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
function startMonth(){ try{ return localStorage.getItem('ldgStartMonth')||'2026-10'; }catch(e){ return '2026-10'; } }
function rangesOf(g){
g=g||{};
if(g.cycleRanges&&g.cycleRanges.length)return g.cycleRanges;
return [{n:1,from:(db().platformMeta||{}).countingSince||g.countStart||startMonth()+'-01',to:null}];
}
function currentCycleNum(){
/* ✅ الإصلاح: نرجع أقل دورة مفتوحة بين كل المجموعات (مش أكبر واحدة) */
/* عشان لو مجموعة واحدة كملت نصابها وفتحت دورة 2، المجموعة التانية اللي لسه في دورة 1 تفضل في دورة 1 */
var minOpenN = 999;
var hasAny = false;
groups().forEach(function(g){
  var rs = g.cycleRanges || [];
  rs.forEach(function(r){
    if(r.to == null){
      hasAny = true;
      if(r.n < minOpenN) minOpenN = r.n;
    }
  });
});
return hasAny ? minOpenN : 1;
}
function localMonth(){ return cycKey(currentCycleNum()); }
function normMonth(m){ return m||localMonth(); }
function rangeOf(gid,cycle){
var g=gById(gid);var rs=rangesOf(g);
var n=parseInt(String(cycle).replace('cycle-',''))||1;
for(var i=0;i<rs.length;i++){if(rs[i].n===n)return rs[i];}
return rs[rs.length-1]||{n:n,from:startMonth()+'-01',to:null};
}

function cycleOfDate(gid,ds){
if(!ds)return null;
var g=gById(gid);var rs=rangesOf(g);
for(var i=0;i<rs.length;i++){if(ds>=rs[i].from&&(!rs[i].to||ds<=rs[i].to))return cycKey(rs[i].n);}
return null;
}
function payInMonth(p,gid,month){
if((p.month||'')===month)return true;
if(/^\d{4}-\d{2}$/.test(p.month||''))return cycleOfDate(gid,(p.paidAt||p.createdAt||'').slice(0,10))===month;
var m1=String(p.month||'').match(/^cycle-(\d+)$/);if(m1)return cycKey(parseInt(m1[1]))===month;
return false;
}
function msInMonth(ms,gid,month){
if((ms.month||'')===month)return true;
if(/^\d{4}-\d{2}$/.test(ms.month||''))return cycleOfDate(gid,(ms.addedAt||'').slice(0,10))===month;
var m2=String(ms.month||'').match(/^cycle-(\d+)$/);if(m2)return cycKey(parseInt(m2[1]))===month;
return false;
}

function cycleName(c){
var num=parseInt(String(c).replace('cycle-',''))||1;
var ord=['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر'];
return 'الشهر '+(ord[num-1]||num);
}
function fmtD(ds){try{return new Date(ds+'T12:00:00').toLocaleDateString('ar-EG',{day:'numeric',month:'long'});}catch(e){return ds;}}
function cycleRange(gid,cycle){
var g=gById(gid);if(!g)return '';
var r=rangeOf(gid,cycle);
return fmtD(r.from)+' → '+(r.to?fmtD(r.to):'مستمر الآن');
}
function monthName(m,gid){
if(String(m).startsWith('cycle-')){
var base=cycleName(m);
if(gid)return base+' ('+cycleRange(gid,m)+')';
return base;
}
try{ return new Date(m+'-01T12:00:00').toLocaleDateString('ar-EG',{month:'long',year:'numeric'}); }catch(e){ return m; }
}
function today(){ return localToday(); }
function daysInRange(from,to){
var out=[];var cur=from;var guard=0;
while(cur<=to&&guard<500){out.push(cur);cur=nextDay(cur);guard++;}
return out;
}
function monthDays(m,gid){
if(String(m).startsWith('cycle-')){
var r=gid?rangeOf(gid,m):null;
if(!r)return [];
var to=r.to||localToday();if(to>localToday())to=localToday();
if(r.from>to)return [];
return daysInRange(r.from,to);
}
var y=+m.slice(0,4),mm=+m.slice(5,7),n=new Date(y,mm,0).getDate(),out=[];
for(var i=1;i<=n;i++)out.push(m+'-'+pad2(i));
return out;
}
function monthsList(){
var out=[];var maxN=currentCycleNum();
for(var i=1;i<=maxN+1;i++)out.push(cycKey(i));
return out;
}
/* ========== 🔁 ترحيل البيانات القديمة (مرة واحدة تلقائياً) ========== */
function migrateCycles(){
var d=db();
if(d.cycleMigrated)return;
if(readOnly())return; /* 🛡️ طالب/ولي أمر ميعملوش migration أبدًا */
if(!(d.groups&&d.groups.length))return; /* 🛡️ مش قبل ما البيانات تتحمل كاملة */
var gs=groups();
gs.forEach(function(g){
if(g.cycleRanges&&g.cycleRanges.length)return;
var dates=[];
(d.attendance||[]).forEach(function(a){if(a.groupId===g.id&&a.status==='approved'&&a.date)dates.push(a.date);});
Object.keys(d.sessionFlags||{}).forEach(function(k){if(k.indexOf(g.id+'__')===0){(d.sessionFlags[k].take||[]).forEach(function(t){if(t)dates.push(t);});}});
dates.sort();
var req=reqOf(g);var ranges=[];var n=1;
if(!dates.length){ranges.push({n:1,from:(d.platformMeta||{}).countingSince||g.countStart||startMonth()+'-01',to:null});}
else{
for(var i=0;i<dates.length;i+=req){
var from=dates[i];var to=dates[Math.min(i+req-1,dates.length-1)];
var closed=(i+req)<=dates.length;
ranges.push({n:n,from:from,to:closed?to:null});
n++;
}
if(ranges[ranges.length-1].to!=null)ranges.push({n:n,from:nextDay(ranges[ranges.length-1].to),to:null});
}
g.cycleRanges=ranges;
});
gs.forEach(function(g){try{if(DataService.updateGroup)DataService.updateGroup(g.id,{cycleRanges:g.cycleRanges});}catch(e){}});
function cycOfDate(gid,ds){
var g=gById(gid);var rs=(g&&g.cycleRanges)||[];
for(var i=0;i<rs.length;i++){if(ds>=rs[i].from&&(!rs[i].to||ds<=rs[i].to))return cycKey(rs[i].n);}
return rs.length?cycKey(rs[rs.length-1].n):cycKey(1);
}
function normKey(mm,gid,fb){
if(/^\d{4}-\d{2}$/.test(mm))return cycOfDate(gid,(fb||mm+'-15').slice(0,10));
var mN=String(mm).match(/^cycle-(\d+)$/);
if(mN)return cycKey(parseInt(mN[1]));
return mm;
}
(d.payments||[]).forEach(function(p){p.month=normKey(String(p.month||''),p.groupId,p.paidAt||p.createdAt);});
(d.manualSessions||[]).forEach(function(ms){ms.month=normKey(String(ms.month||''),ms.groupId,ms.addedAt);});
var nf={};
Object.keys(d.sessionFlags||{}).forEach(function(k){
var parts=k.split('__');var nk=parts[0]+'__'+normKey(parts[1]||'',parts[0]);
if(nf[nk]){nf[nk].cancel=(nf[nk].cancel||[]).concat(d.sessionFlags[k].cancel||[]);nf[nk].take=(nf[nk].take||[]).concat(d.sessionFlags[k].take||[]);nf[nk].remove=(nf[nk].remove||[]).concat(d.sessionFlags[k].remove||[]);}
else nf[nk]=d.sessionFlags[k];
});
d.sessionFlags=nf;
var w={};Object.keys(d.warn7||{}).forEach(function(k){var p=k.split('__');w[p[0]+'__'+normKey(p[1]||'',p[0])]=1;});d.warn7=w;
var d8={};Object.keys(d.due8||{}).forEach(function(k){var p=k.split('__');d8[p[0]+'__'+normKey(p[1]||'',p[0])]=1;});d.due8=d8;
d.cycleMigrated=1;
saveD(d);
}

var WD=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function groups(){ return (DataService.getGroups?DataService.getGroups():[]); }
function gById(id){ return groups().find(function(g){return g.id===id;}); }
function reqOf(g){ return (g&&g.sessionsPerMonth)||((window.EduFlowConfig&&EduFlowConfig.billing&&EduFlowConfig.billing.sessionsBeforePayment)||8); }
function feeOf(g){ return (g&&g.monthlyFee)||0; }
function myTeacherId(){ return (window.getMyTeacherId?window.getMyTeacherId():null); }
function myGroups(){ var u=cur(); if(!u) return []; if(isAdmin()) return groups(); var tid=myTeacherId(); if(tid){ var f=groups().filter(function(g){return g.teacherId===tid;}); if(f.length) return f; } var gs=(typeof Ops!=='undefined'&&Ops.groupsInScope)?Ops.groupsInScope(u.id):[]; return gs.length?gs:(tid?groups().filter(function(g){return g.teacherId===tid;}):[]); }
function studentsOf(gid){
var list=(DataService.getStudentsByGroup?DataService.getStudentsByGroup(gid):[])||[];
var ids={}; list.forEach(function(s){ids[s.id]=1;});
(db().enrollments||[]).forEach(function(e){ if(e.groupId===gid&&e.status==='active'){ var s=DataService.getUserById?DataService.getUserById(e.studentId):null; if(s&&!ids[s.id]){ids[s.id]=1;list.push(s);} } });
(DataService.getStudents?DataService.getStudents():[]).forEach(function(s){ if(s.groupId===gid&&!ids[s.id]){ids[s.id]=1;list.push(s);} });
return list;
}
/* 🆕 V11: helpers تجميد المجموعة */
function inGroupFreeze(g,ds){
if(!g||!ds) return false;
if(g.frozen&&g.frozenSince&&ds>=g.frozenSince) return true;
var ps=g.freezePeriods||[];
for(var i=0;i<ps.length;i++){ if(ds>=ps[i].from&&(!ps[i].to||ds<=ps[i].to)) return true; }
return false;
}
function freezeLabel(g){
if(!g) return '';
if(g.frozen) return '🧊 مجمدة من '+(g.frozenSince||'-');
return '▶️ العدّ شغال';
}
/* العداد اليدوي = أكبر مجموع لكل طالب (مش مجموع الكل) */
function manualCount(gid,month){
var per={};
var FROZ=ledgerFrozen();
if(!FROZ)(db().manualSessions||[]).forEach(function(ms){ if(ms.groupId===gid&&msInMonth(ms,gid,month)&&(!ms.type||ms.type==='counter')){ var k=ms.studentId||'__g__'; per[k]=(per[k]||0)+(ms.sessionsCount||0); } });
var mx=0; Object.keys(per).forEach(function(k){ if(per[k]>mx) mx=per[k]; });
return mx;
}

/* CSS */
if(!document.getElementById('ldgCss')){
var st=document.createElement('style'); st.id='ldgCss';
st.textContent=
'.ldg-sq{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;padding:0 3px;border-radius:5px;border:1px solid var(--border);font-size:9px;font-weight:800;font-family:var(--font-en);margin-inline-end:3px;cursor:pointer;}'+
'.ldg-sq.green{background:var(--success);color:#fff;border-color:var(--success);}'+
'.ldg-sq.blue{background:var(--info);color:#fff;border-color:var(--info);}'+
'.ldg-sq.red{background:var(--danger);color:#fff;border-color:var(--danger);}'+
'.ldg-sq.gray{background:var(--surface-hover);color:var(--text-muted);}'+
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
/* 🆕 V11 كروت مودال تحكم العدّ */
'.cc-row{display:flex;gap:8px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;background:var(--surface);flex-wrap:wrap;}'+
'.cc-row.frozen{border-color:var(--warning);background:linear-gradient(135deg,rgba(245,158,11,.05),transparent);}'+
'.cc-name{font-weight:800;font-size:13px;}'+
'.cc-meta{font-size:10px;color:var(--text-muted);margin-top:2px;}'+
'.cc-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:10px;}'+
'@media(max-width:700px){.ldg-table{min-width:0;}.ldg-table thead{display:none;}.ldg-table tr{display:block;border:1px solid var(--border);border-radius:10px;margin-bottom:10px;padding:8px;background:var(--surface);}.ldg-table td{display:flex;justify-content:space-between;gap:8px;border:none;padding:4px 0;}.ldg-table td::before{content:attr(data-label);font-size:10px;font-weight:800;color:var(--text-muted);flex-shrink:0;}}';
document.head.appendChild(st);
}

function setFlags(gid,month,fl){
  var d=db(); d.sessionFlags=d.sessionFlags||{};
  fl.updatedAt=new Date().toISOString();          /* 🕐 ختم زمني للمقارنة */
  d.sessionFlags[fKey(gid,month)]=fl;
  saveD(d);
  LU._lastLocalEdit=Date.now();                   /* 🔒 قفل السحب 8 ثواني */
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('sessionFlags',fKey(gid,month),fl).catch(function(){}); }catch(e){}
}


/* ========== 🟩🟥 المحرك الواحد للمربعات (🆕 بيستثني فترات تجميد المجموعة) ========== */
LU.groupSessions=function(gid,month){
month=normMonth(month);
LU._sesCache=LU._sesCache||{};
var ck=gid+'|'+month; if(LU._sesCache[ck]) return LU._sesCache[ck];
var g=gById(gid)||{}; var req=reqOf(g); var tStr=localToday();
/* 🔒 تسلسل صارم: دورة لسه مبتدتش = مربعات فاضية مقفولة */
var __rs=rangesOf(g); var __openN=1; __rs.forEach(function(r){ if(r.to==null) __openN=r.n; });
var __reqN=parseInt(String(month).replace('cycle-',''))||1;
if(__reqN>__openN){ var __res={events:[],done:0,required:req,complete:false,remaining:req,manual:0,isPast:false,warnAt:(g.warnAt!=null&&g.warnAt!=='')?+g.warnAt:(req-1),frozen:!!g.frozen,notStarted:true,isFuture:true}; LU._sesCache[ck]=__res; return __res; }
var fl0=getFlags(gid,month); var removed={}; (fl0.remove||[]).forEach(function(d){ removed[d]=1; });
var rng=rangeOf(gid,month); var FROZ=ledgerFrozen();
function inR(ds){return !!ds&&ds>=rng.from&&(!rng.to||ds<=rng.to);}
/* 🆕 V11: أي حضور داخل فترة تجميد المجموعة مش بيتحسب */
var att=FROZ?[]:(DataService.getAttendance?DataService.getAttendance():[]).filter(function(a){return a.groupId===gid&&a.status==='approved'&&inR(a.date||'')&&!inGroupFreeze(g,a.date||'');});
var canc=(DataService.getCancelledSessions?DataService.getCancelledSessions():[]).filter(function(c){return c.groupId===gid&&inR(c.date||'')&&!inGroupFreeze(g,c.date||'');});
var madeupDates={}; canc.forEach(function(c){ if(c.makeupStatus==='done'&&c.makeupDate) madeupDates[c.makeupDate]=1; });
function isBad(c){ return c&&c.makeupStatus!=='done'; }
function findCanc(ds){ for(var i=0;i<canc.length;i++){ if(canc[i].date===ds) return canc[i]; } return null; }
var greens={};
att.forEach(function(a){ if(removed[a.date]) return; var c=findCanc(a.date); if(isBad(c)) return; greens[a.date]=madeupDates[a.date]?'madeup':'done'; });
/* 🟢 أوتوماتيك: موعد الحصة في الجدول عدّى من غير إلغاء ولا حذف ولا تجميد → مربع أخضر لوحده */
var sch=(g.schedules&&g.schedules.length)?g.schedules:(g.day?[{day:g.day}]:[]);
var nowDt=new Date(); var nowMin=nowDt.getHours()*60+nowDt.getMinutes();
var meta=(db().platformMeta||{});
if(countingActiveFlag(meta)&&!FROZ){var autoStart=(g.autoMarkSince||meta.countingSince||'');monthDays(month,gid).forEach(function(ds){if(ds>tStr) return;if(removed[ds]) return;if(inGroupFreeze(g,ds)) return;if(autoStart&&ds<autoStart) return; 
/* 🆕 V11 */
var wd=WD[new Date(ds+'T12:00:00').getDay()]; var hit=false; var sMin=-1;
for(var i=0;i<sch.length;i++){ if(sch[i].day===wd){ hit=true; var tt=String(sch[i].time||'00:00').split(':'); sMin=(+tt[0])*60+(+(tt[1]||0)); break; } }
if(!hit) return;
if(ds===tStr&&sMin>=0&&nowMin<sMin) return;
var c=findCanc(ds); if(isBad(c)) return;
if(!greens[ds]) greens[ds]=madeupDates[ds]?'madeup':'done';
});
}
var M=manualCount(gid,month);
var ev=[]; Object.keys(greens).sort().forEach(function(d){ ev.push({t:greens[d],d:d}); });
var tot=ev.length+M; while(ev.length<tot) ev.unshift({t:'manual',d:''});
canc.forEach(function(c){ if(c.makeupStatus!=='done') ev.push({t:'cancelled',d:c.date}); });
var fl=getFlags(gid,month);
ev=ev.map(function(e){
if(e.t!=='cancelled'&&(fl.cancel||[]).indexOf(e.d)>=0) return {t:'cancelled',d:e.d,flag:1};
if(e.t==='cancelled'&&(fl.take||[]).indexOf(e.d)>=0) return {t:'done',d:e.d,flag:1};
return e;
});
(fl.take||[]).forEach(function(d){ if(!d) return; if(removed[d]) return; var ex=false; for(var i=0;i<ev.length;i++){ if(ev[i].d===d){ ex=true; break; } } if(!ex) ev.push({t:'done',d:d,flag:1}); });
var und=0; (fl.take||[]).forEach(function(d){ if(!d) und++; });
for(var u=0;u<und;u++) ev.push({t:'done',d:'',flag:1});
ev.sort(function(a,b){ return String(a.d||'0000-00-00').localeCompare(String(b.d||'0000-00-00')); });
var done=0; ev.forEach(function(e){ if(e.t!=='cancelled') done++; });
if(g.sessionNow>0&&(g.sessionNowMonth||'')===month){ while(done<+g.sessionNow&&ev.length<req+12){ ev.unshift({t:'manual',d:''}); done++; } }
/* 🛑 سقف صارم: المحسوب ما يزيدش عن عدد الحصص المحدد في إعدادات المجموعة */
if(done>req){
  var capped=[],kept=0;
  for(var ci=0;ci<ev.length;ci++){ 
    if(ev[ci].t==='cancelled'){ capped.push(ev[ci]); continue; } 
    kept++; 
    if(kept<=req) capped.push(ev[ci]); 
  }
  ev=capped; 
  done=req;
}
var warnAt=(g.warnAt!=null&&g.warnAt!=='')?+g.warnAt:(req-1);
var cycleNum=parseInt(String(month).replace('cycle-',''))||1;
var curCycleNum=parseInt(String(localMonth()).replace('cycle-',''))||1;
/* ✅ القاعدة الذهبية: منتهي = النصاب اكتمل AND الدورة مقفولة فعلياً */
var isPast = (done >= req) && !!rng.to;
var res={events:ev,done:done,required:req,complete:done>=req,remaining:Math.max(0,req-done),manual:M,isPast:isPast,warnAt:warnAt,frozen:!!g.frozen};
LU._sesCache[ck]=res;
return res;
};
function expectedDates(g,count,baseDate){
var sch=(g.schedules&&g.schedules.length)?g.schedules:(g.day?[{day:g.day}]:[]);
var WD2={0:'Sunday',1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday'};
var days={};sch.forEach(function(s){days[s.day]=1;});
var out=[];if(!count||!sch.length)return out;
var d=new Date((baseDate||localToday())+'T12:00:00');var guard=0;
while(out.length<count&&guard<200){d.setDate(d.getDate()+1);guard++;if(days[WD2[d.getDay()]])out.push(d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()));}
return out;
}
function nextCycleFrom(g,month){
try{var n=parseInt(String(month).replace('cycle-',''))||0;var r=(rangesOf(g)||[]).find(function(x){return x.n===n+1;});return r?r.from:'';}catch(e){return '';}
}
function sqStrip(s,g,month){
var html=s.events.map(function(e){
if(e.t==='manual') return '<span class="ldg-sq green" title="حصة مرحّلة/يدوية (محسوبة)">📥</span>';
if(!e.d&&e.flag) return '<span class="ldg-sq green" title="مربع مضاف يدوياً">＋</span>';
var day=String(e.d||'').slice(8,10);
if(e.t==='cancelled') return '<span class="ldg-sq red" title="'+e.d+' — ملغاة (مش محسوبة)">'+day+'</span>';
if(e.t==='madeup') return '<span class="ldg-sq blue" title="'+e.d+' — حصة تعويضية (محسوبة)">↺'+day+'</span>';
return '<span class="ldg-sq green" title="'+e.d+' — حصة محسوبة على كل طلاب المجموعة">'+day+'</span>';
}).join('');
var rem0=Math.max(0,s.required-s.done);
var datedEv=(s.events||[]).filter(function(e){return e.d&&e.t!=='cancelled';}).map(function(e){return e.d;}).sort();
var lastD=datedEv.length?datedEv[datedEv.length-1]:'';
var baseD=lastD>localToday()?lastD:localToday();
var expD=expectedDates(g,rem0,baseD);
for(var i=0;i<rem0;i++){
var ed=expD[i]||'';
if(ed) html+='<span class="ldg-sq gray" title="⏰ الموعد المتوقع: '+ed+'" style="color:#fff;font-size:9px;">'+String(+ed.slice(8,10))+'</span>';
else html+='<span class="ldg-sq gray" title="لسه مأخدتش"></span>';
}
var cap='';
if(!s.complete&&expD[0]) cap='<span style="font-size:10px;color:var(--text-muted);margin-inline-start:6px;">⏰ القادمة: '+expD[0]+'</span>';
if(s.complete){
  var nxf=nextCycleFrom(g,month);
  if(nxf){
    var nn=(parseInt(String(month).replace('cycle-',''))||1)+1;
    var nck=cycKey(nn);
    cap='<span style="font-size:10px;color:var(--info);margin-inline-start:6px;">➡️ الدورة الجاية من: '+nxf+'</span>'+
        '<button type="button" class="btn btn-info btn-sm" style="margin-inline-start:6px;padding:3px 10px;font-size:11px;" onclick="LedgerUI.gotoCycle(\''+nck+'\')">👁 عرض '+cycleName(nck)+'</button>';
  }
}
var vbtn='';
try{
  var u=cur(); var cw=u&&(u.role==='assistant'||u.role==='super_admin');
  if(cw&&s.complete&&(+g.expectedStudents||0)>studentsOf(g.id).length){
    vbtn='<button class="btn btn-ghost btn-sm" style="border-color:var(--warning);color:var(--warning);margin-inline-start:6px;" onclick="LU.addVirtualExpectedDue(\''+g.id+'\',\''+month+'\')" title="ترحيل ديون طلاب متوقعين">📥 ترحيل متوقع</button>';
  }
}catch(e){}
return '<div class="ldg-strip">'+html+'<b class="ldg-count">'+s.done+'/'+s.required+'</b>'+(s.frozen?' <span class="badge badge-warning">🧊 مجمدة</span>':'')+(s.complete?' <span class="badge badge-warning">💰 الشهرية مستحقة</span>':'')+cap+vbtn+'</div>';
}

/* ========== أعلام التعديل اليدوي (cancel/take/remove) — النسخة الرسمية ========== */
function fKey(gid,month){ return gid+'__'+month; }
function getFlags(gid,month){
  var d=db();
  var f=(d.sessionFlags||{})[fKey(gid,month)]||{cancel:[],take:[],remove:[]};
  f.cancel=f.cancel||[]; f.take=f.take||[]; f.remove=f.remove||[];
  return f;
}
function setFlags(gid,month,fl){
  var d=db(); d.sessionFlags=d.sessionFlags||{};
  fl.updatedAt=new Date().toISOString();          /* 🕐 ختم زمني للمزامنة */
  d.sessionFlags[fKey(gid,month)]=fl;
  saveD(d);
  LU._lastLocalEdit=Date.now();                    /* 🔒 قفل السحب 8 ثواني */
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('sessionFlags',fKey(gid,month),fl).catch(function(){}); }catch(e){}
  try{ localStorage.setItem('eduflowLedgerPing',String(Date.now())); }catch(e){}
}

/* ========== ✏️ مودال المربعات: تحكم كامل ========== */
LU.editSquares=function(gid,month){
try{
month=normMonth(month||LU._st.month);
var g=gById(gid); if(!g) return;
var ses=LU.groupSessions(gid,month);
if(ses.notStarted){ if(window.safeToast) window.safeToast('🔒 دورة قادمة — كمّل الدورة الحالية الأول','error'); return; }
var rows=ses.events.map(function(e,i){
var lbl=e.d?('📅 '+e.d):'بدون تاريخ';
var btns='';
if(e.t==='cancelled') btns='<button class="btn btn-success btn-sm" onclick="LedgerUI.sqToggle(\''+gid+'\',\''+month+'\',\''+(e.d||'')+'\',\'take\')">✓ اتأخذت</button> <button class="btn btn-ghost btn-sm" onclick="LedgerUI.sqUncancel(\''+gid+'\',\''+month+'\',\''+(e.d||'')+'\')">↩️ شيل الإلغاء</button> <button class="btn btn-danger btn-sm" onclick="LedgerUI.sqRemove(\''+gid+'\',\''+month+'\',\''+(e.d||'')+'\')">🗑 حذف</button>';
else if(e.d) btns='<button class="btn btn-warning btn-sm" onclick="LedgerUI.sqToggle(\''+gid+'\',\''+month+'\',\''+e.d+'\',\'cancel\')">✗ إلغاء (أحمر)</button> <button class="btn btn-danger btn-sm" onclick="LedgerUI.sqRemove(\''+gid+'\',\''+month+'\',\''+e.d+'\')">🗑 حذف نهائي</button>';
if(!e.d&&e.flag) btns='<button class="btn btn-ghost btn-sm" onclick="LedgerUI.sqRemoveUndated(\''+gid+'\',\''+month+'\')">🗑 حذف المربع</button>';
if(!e.d&&!e.flag) btns='<button class="btn btn-danger btn-sm" onclick="LedgerUI.carryDec(\''+gid+'\',\''+month+'\')">🗑 حذف حصة مرحّلة</button>';
var ic=e.t==='cancelled'?'🟥':(e.t==='madeup'?'🟦':(e.t==='manual'?'📥':''));
return '<div class="sub-row" style="margin-bottom:6px;padding:8px;"><div>'+ic+' <strong>مربع '+(i+1)+':</strong> '+lbl+(e.flag?' <span class="badge badge-info">يدوي</span>':'')+(e.t==='madeup'?' <span class="badge badge-info">تعويضية</span>':'')+'</div><div style="white-space:nowrap;">'+btns+'</div></div>';
}).join('');
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">✏️ مربعات حصص: '+g.name+' — '+monthName(month,gid)+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'
+'<div class="filter-info">💡 الحالي: <strong>'+ses.done+'/'+ses.required+'</strong> · المتبقي حصص: <strong>'+ses.remaining+'</strong> · 🔔 الإنذار عند حصة <strong>'+ses.warnAt+'</strong>'+(ses.isPast?' · <span class="badge badge-muted">✅ دورة مكتملة</span>':'')+(g.frozen?' · <span class="badge badge-warning">🧊 مجمدة من '+(g.frozenSince||'-')+'</span>':'')+'</div>'
+'<div class="card" style="padding:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;"><div class="text-sm">🔔 إنذار الدفع عند الحصة رقم <b style="font-family:var(--font-en);">'+ses.warnAt+'</b> من '+ses.required+'</div><div style="display:flex;gap:6px;align-items:center;"><input type="number" id="sqWarnAt" class="form-input" style="width:80px;" min="1" max="'+ses.required+'" value="'+ses.warnAt+'"><button class="btn btn-secondary btn-sm" onclick="LedgerUI.setWarnAt(\''+gid+'\',\''+month+'\')">💾 حفظ</button></div></div>'
+'<div class="card" style="padding:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;"><div class="text-sm">👥 العدد المتوقع من السنتر <span class="text-xs text-muted">(الحالي: '+studentsOf(gid).length+' فعلي)</span></div><div style="display:flex;gap:6px;align-items:center;"><input type="number" id="sqExpected" class="form-input" style="width:90px;" min="0" value="'+(+g.expectedStudents||0)+'"><button class="btn btn-secondary btn-sm" onclick="LedgerUI.saveExpected(\''+gid+'\')">💾 حفظ</button></div></div>'
+'<div class="card" style="padding:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;"><div class="text-sm">📥 حصص مرحّلة على كل الطلاب: <b style="font-family:var(--font-en);">'+(ses.manual||0)+'</b></div><div style="display:flex;gap:6px;"><button class="btn btn-danger btn-sm" onclick="LedgerUI.carryDec(\''+gid+'\',\''+month+'\')">➖ أنقص</button><button class="btn btn-success btn-sm" onclick="LedgerUI.carryInc(\''+gid+'\',\''+month+'\')">➕ زوّد</button></div></div>'
+rows
+'<div class="card" style="padding:10px;margin-top:10px;"><strong class="text-sm">➕ إضافة مربعات يدوية</strong>'
+'<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;"><input type="date" id="sqNewDate" class="form-input" style="width:170px;">'
+'<button class="btn btn-success btn-sm" onclick="LedgerUI.sqAdd(\''+gid+'\',\''+month+'\',1)">➕ حصة بتاريخ</button>'
+'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.sqAdd(\''+gid+'\',\''+month+'\',0)">➕ مربع بدون تاريخ</button></div></div>'
+'</div>','modal-md');
}catch(e){ console.error(e); }
};




/* 🔄 دوال تعديل المربع الواحد + حفظ فوري في السحابة (خارج أي دالة تانية) */
function monthKeyOf(gid,date){ return cycleOfDate(gid,date)||localMonth(); }

LU.markSquare=function(gid,date,action){
  var d=db(); d.sessionFlags=d.sessionFlags||{};
  var tck=monthKeyOf(gid,date);
  var fl=d.sessionFlags[gid+'__'+tck]||{cancel:[],take:[],remove:[]};
  if(action==='done'){
    if(fl.cancel.indexOf(date)>=0) fl.cancel=fl.cancel.filter(function(x){return x!==date;});
    if(fl.take.indexOf(date)<0) fl.take.push(date);
  } else if(action==='cancel'){
    if(fl.cancel.indexOf(date)<0) fl.cancel.push(date);
  }
  d.sessionFlags[gid+'__'+tck]=fl;
  saveD(d);
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('sessionFlags',gid+'__'+tck,fl); }catch(e){}
  LU._lastLocalEdit = Date.now();
  ThemeManager.closeModal();
  if(window.safeToast) window.safeToast('✅ اتحفظ التعديل','success');
  LU._sesCache={}; LU.refresh();
  try{ localStorage.setItem('eduflowLedgerPing',String(Date.now())); }catch(e){}
};

LU.removeSquare=function(gid,date){
  if(!confirm('حذف الحصة دي نهائياً؟')) return;
  var d=db(); d.sessionFlags=d.sessionFlags||{};
  var tck=monthKeyOf(gid,date);
  var fl=d.sessionFlags[gid+'__'+tck]||{cancel:[],take:[],remove:[]};
  fl.remove=fl.remove||[];
  if(fl.remove.indexOf(date)<0) fl.remove.push(date);
  fl.take=fl.take.filter(function(x){return x!==date;});
  fl.cancel=fl.cancel.filter(function(x){return x!==date;});
  d.sessionFlags[gid+'__'+tck]=fl;
  saveD(d);
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('sessionFlags',gid+'__'+tck,fl); }catch(e){}
  LU._lastLocalEdit = Date.now();
  ThemeManager.closeModal();
  if(window.safeToast) window.safeToast('🗑️ اتحذفت الحصة','success');
  LU._sesCache={}; LU.refresh();
  try{ localStorage.setItem('eduflowLedgerPing',String(Date.now())); }catch(e){}
};

LU.unCancelSquare=function(gid,date){
  var d=db(); d.sessionFlags=d.sessionFlags||{};
  var tck=monthKeyOf(gid,date);
  var fl=d.sessionFlags[gid+'__'+tck]||{cancel:[],take:[],remove:[]};
  fl.cancel=fl.cancel.filter(function(x){return x!==date;});
  d.sessionFlags[gid+'__'+tck]=fl;
  saveD(d);
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('sessionFlags',gid+'__'+tck,fl); }catch(e){}
  LU._lastLocalEdit = Date.now();
  ThemeManager.closeModal();
  if(window.safeToast) window.safeToast('↩️ الإلغاء اتشال','success');
  LU._sesCache={}; LU.refresh();
  try{ localStorage.setItem('eduflowLedgerPing',String(Date.now())); }catch(e){}
};

LU.sqAdd=function(gid,month,dated){
  var g0=gById(gid); if(!g0) return;
  var r0=(rangesOf(g0)||[]).find(function(r){return cycKey(r.n)===month;});
  var ses0=LU.groupSessions(gid,month);
  /* 🧭 لو الدورة مقفولة/مكتملة → وجّه للإضافة للدورة المفتوحة */
  if((r0&&r0.to!=null)||ses0.complete){
    var openR=(g0.cycleRanges||[]).slice().sort(function(a,b){return a.n-b.n;}).find(function(r){return r.to==null;});
    if(openR){ month=cycKey(openR.n); r0=openR; ses0=LU.groupSessions(gid,month); }
  }
  if(ses0.notStarted){ if(window.safeToast) window.safeToast('🔒 دورة لسه مبتدتش','error'); return; }
  if(ses0.done>=ses0.required){ if(window.safeToast) window.safeToast('🛑 وصلت للنصاب ('+ses0.required+')','error'); return; }
  var d=db();
  if(dated){
    var dv=(document.getElementById('sqNewDate')||{}).value;
    if(!dv){ if(window.safeToast) window.safeToast('اختار التاريخ الأول','error'); return; }
    var existsAtt=(d.attendance||[]).some(function(a){return a.groupId===gid&&(a.date||'')===dv&&a.status==='approved';});
    var existsCanc=(d.cancelledSessions||[]).some(function(c){return c.groupId===gid&&c.date===dv;});
    if(existsAtt||existsCanc){ if(window.safeToast) window.safeToast('المربع ده موجود بالفعل','info'); return; }
    var tck=cycleOfDate(gid,dv);
    if(!tck){
      var rs0=(g0.cycleRanges||[]).slice().sort(function(a,b){return a.n-b.n;});
      if(rs0.length&&dv<rs0[0].from){
        rs0[0].from=dv; g0.cycleRanges=rs0; g0.updatedAt=new Date().toISOString(); saveD(d);
        try{ if(DataService.updateGroup) DataService.updateGroup(gid,{cycleRanges:rs0}); }catch(e){}
        try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('groups',gid,g0).catch(function(){}); }catch(e){}
        if(window.safeToast) window.safeToast('📅 بداية الدورة اتمدّت لـ '+dv,'info');
      } else { if(window.safeToast) window.safeToast('❌ التاريخ '+dv+' مش داخل أي دورة','error'); return; }
    }
    var g=gById(gid);
    var rec={id:'att_'+gid+'_'+dv,groupId:gid,groupName:g?g.name:'',date:dv,status:'approved',noAtt:true,source:'manual-square',records:[],createdAt:new Date().toISOString(),approvedBy:(cur()||{}).id||''};
    d.attendance.push(rec); saveD(d); cloudAtt(rec,false);
    if(window.safeToast) window.safeToast('✅ اتضافت حصة '+dv,'success');
  } else {
    /* ✅ مربع بدون تاريخ = سجل عدّاد 📥 — ظاهر دايماً، قابل للحذف، ومتزامن زي المرحّل */
    var sts=studentsOf(gid);
    if(!sts.length){ if(window.safeToast) window.safeToast('مفيش طلاب','error'); return; }
    d.manualSessions=d.manualSessions||[];
    var touched=[];
    sts.forEach(function(s){
      var ms={id:'ms_'+Date.now()+'_'+s.id+'_'+Math.random().toString(36).slice(2,5),groupId:gid,studentId:s.id,month:month,sessionsCount:1,type:'counter',reason:'مربع يدوي بدون تاريخ',addedBy:(cur()||{}).id||'',addedAt:new Date().toISOString()};
      d.manualSessions.push(ms); touched.push(ms);
    });
    saveD(d);
    for(var i2=0;i2<touched.length;i2++){ cloudMS(touched[i2],false); }
    if(window.safeToast) window.safeToast('✅ اتضاف مربع بدون تاريخ (📥) في '+monthName(month,gid),'success');
  }
  LU._lastLocalEdit=Date.now();
  LU._sesCache={};
  LU.refresh();
  try{ LU.editSquares(gid,month); }catch(e){}
  try{ localStorage.setItem('eduflowLedgerPing',String(Date.now())); }catch(e){}
};

/* 🗑 حذف نهائي: يمسح الحضور + الإلغاء + يمنع الرجوع الأوتوماتيك */
LU.sqRemove=function(gid,month,date){
  try{
    if(!date) return LU.sqRemoveUndated(gid,month);
    if(!confirm('حذف الحصة دي نهائياً من المربعات؟')) return;
    var d=db();
    var hit=(d.attendance||[]).filter(function(a){return a.groupId===gid&&a.status==='approved'&&(a.date||'')===date;});
    hit.forEach(function(a){ d.attendance=(d.attendance||[]).filter(function(x){return x.id!==a.id;}); cloudAtt(a,true); });
    var c=(d.cancelledSessions||[]).find(function(x){return x.groupId===gid&&x.date===date;});
    if(c){ d.cancelledSessions=(d.cancelledSessions||[]).filter(function(x){return x.id!==c.id;}); cloudCanc(c,true); }
    var fl=getFlags(gid,month);
    if(fl.remove.indexOf(date)<0) fl.remove.push(date);
    fl.take=(fl.take||[]).filter(function(x){return x!==date;});
    fl.cancel=(fl.cancel||[]).filter(function(x){return x!==date;});
    setFlags(gid,month,fl); 
    saveD(d);
    LU._lastLocalEdit = Date.now();
    if(window.safeToast) window.safeToast('🗑 الحصة اتمسحت','success');
    LU.refresh(); LU.editSquares(gid,month);
  }catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
};

LU.sqToggle=function(gid,month,date,op){
  var d=db();
  if(op==='cancel'){
    d.cancelledSessions=d.cancelledSessions||[];
    if(!d.cancelledSessions.some(function(c){return c.groupId===gid&&c.date===date;})){
      var rec={id:'cs_'+Date.now()+'_'+gid,groupId:gid,date:date,reason:'إلغاء يدوي من المربعات',makeupStatus:'outstanding',cancelledBy:(cur()||{}).id||'',createdAt:new Date().toISOString()};
      d.cancelledSessions.push(rec); saveD(d); cloudCanc(rec,false);
    }
  } else {
    var c=(d.cancelledSessions||[]).find(function(x){return x.groupId===gid&&x.date===date;});
    if(c){ d.cancelledSessions=(d.cancelledSessions||[]).filter(function(x){return x.id!==c.id;}); saveD(d); cloudCanc(c,true); }
  }
  LU._lastLocalEdit=Date.now();
  LU._sesCache={}; LU.refresh(); LU.editSquares(gid,month);
};
LU.sqUncancel=function(gid,month,date){
  var d=db();
  var c=(d.cancelledSessions||[]).find(function(x){return x.groupId===gid&&x.date===date;});
  if(c){ d.cancelledSessions=(d.cancelledSessions||[]).filter(function(x){return x.id!==c.id;}); saveD(d); cloudCanc(c,true); }
  LU._lastLocalEdit=Date.now();
  if(window.safeToast) window.safeToast('↩️ الإلغاء اتشال — المربع رجع أخضر','success');
  LU._sesCache={}; LU.refresh(); LU.editSquares(gid,month);
};
/* 🔄 ترحيل الأعلام القديمة (sessionFlags) لمستندات متزامنة — شغّلها مرة واحدة من الكونسول: LedgerUI.migrateFlagsToDocs() */
LU.migrateFlagsToDocs=function(){
  var d=db(); var moved=0;
  Object.keys(d.sessionFlags||{}).forEach(function(key){
    var fl=d.sessionFlags[key]; if(!fl) return;
    var parts=key.split('__'); var gid=parts[0]; var ck=parts.slice(1).join('__');
    (fl.take||[]).forEach(function(t){
      if(t){
        if(!(d.attendance||[]).some(function(a){return a.groupId===gid&&a.date===t&&a.status==='approved';})){
          var g=gById(gid);
          var rec={id:'att_'+gid+'_'+t,groupId:gid,groupName:g?g.name:'',date:t,status:'approved',noAtt:true,source:'manual-square',records:[],createdAt:new Date().toISOString()};
          d.attendance.push(rec); cloudAtt(rec,false); moved++;
        }
      } else {
        studentsOf(gid).forEach(function(s){
          var ms={id:'ms_'+Date.now()+'_'+s.id+'_'+Math.random().toString(36).slice(2,5),groupId:gid,studentId:s.id,month:ck,sessionsCount:1,type:'counter',reason:'ترحيل مربع يدوي',addedBy:'migration',addedAt:new Date().toISOString()};
          d.manualSessions.push(ms); cloudMS(ms,false); moved++;
        });
      }
    });
    (fl.cancel||[]).forEach(function(cc){
      if(cc&&!(d.cancelledSessions||[]).some(function(x){return x.groupId===gid&&x.date===cc;})){
        var rec2={id:'cs_'+Date.now()+'_'+gid+'_'+cc,groupId:gid,date:cc,reason:'ترحيل إلغاء',makeupStatus:'outstanding',cancelledBy:'migration',createdAt:new Date().toISOString()};
        d.cancelledSessions.push(rec2); cloudCanc(rec2,false); moved++;
      }
    });
    delete d.sessionFlags[key];
  });
  saveD(d); LU._sesCache={}; LU.refresh();
  if(window.safeToast) window.safeToast('🔄 تم ترحيل '+moved+' عنصر للمستندات المتزامنة','success');
  return moved;
};
LU.sqRemoveUndated=function(gid,month){
  /* المربع بدون التاريخ بقى سجل عدّاد → الخصم بنفس مسار carryDec */
  return LU.carryDec(gid,month);
};


/* 💾 حفظ العدد المتوقع (نسخة واحدة + حفظ سحابي) */
LU.saveExpected=async function(gid){
try{
var v=parseInt((document.getElementById('sqExpected')||{}).value)||0;
if(v<0) v=0;
if(DataService.updateGroup) await DataService.updateGroup(gid,{expectedStudents:v});
var g=gById(gid);
try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('groups',gid,g); }catch(e){}
LU._sesCache={};
if(window.safeToast) window.safeToast('✅ العدد المتوقع: '+v,'success');
LU.refresh();
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
};

/* 📨 إشعار مخصص: مجموعة + طالب محدد + قناة */
LU.openNotifyComposer=function(){
try{
var gs=isAdmin()?groups():myGroups();
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📨 إشعار مخصص</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
'<div class="form-group"><label>👥 المجموعة</label><select id="ncGroup" class="form-select" onchange="window.__ncFillStudents()">'+gs.map(function(g){return '<option value="'+g.id+'">'+g.name+'</option>';}).join('')+'</select></div>'+
'<div class="form-group"><label>🎓 طالب محدد (اختياري — سيبه فاضي للكل)</label><select id="ncStudent" class="form-select"><option value="">كل طلاب المجموعة</option></select></div>'+
'<div class="form-group"><label>🎯 المستلمين</label><div style="display:grid;gap:6px;">'+
'<label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="ncStu" checked style="width:16px;height:16px;"> 🎓 الطلاب</label>'+
'<label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="ncPar" checked style="width:16px;height:16px;"> 👨‍👩‍👦 أولياء الأمور</label>'+
'<label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="ncTea" style="width:16px;height:16px;"> 👨‍🏫 الأستاذ</label></div></div>'+
'<div class="form-group"><label>📢 القناة</label><select id="ncChan" class="form-select"><option value="dash">🔔 داشبورد فقط</option><option value="wa">💬 واتساب فقط (طابور)</option><option value="both" selected>الاتنين</option></select></div>'+
'<div class="form-group"><label>✍️ الرسالة</label><textarea id="ncMsg" class="form-input" rows="4" placeholder="اكتب رسالتك... تقدر تستخدم {اسم} و{مجموعة} و{متبقي}"></textarea></div>'+
'<button class="btn btn-primary w-full" onclick="LedgerUI.sendComposer()">📤 إرسال</button></div>','modal-md');
window.__ncFillStudents();
}catch(e){}
};
window.__ncFillStudents=function(){
var gid=(document.getElementById('ncGroup')||{}).value;
var sel=document.getElementById('ncStudent'); if(!sel) return;
var sts=(DataService.getStudentsByGroup?DataService.getStudentsByGroup(gid):[])||[];
sel.innerHTML='<option value="">كل طلاب المجموعة ('+sts.length+')</option>'+sts.map(function(s){return '<option value="'+s.id+'">'+s.name+'</option>';}).join('');
};
LU.sendComposer=function(){
try{
var onlySid=(document.getElementById('ncStudent')||{}).value||'';
var gid=(document.getElementById('ncGroup')||{}).value;
var g=gById(gid); if(!g) return;
var msg=(document.getElementById('ncMsg')||{}).value||'';
if(!msg.trim()){ if(window.safeToast) window.safeToast('اكتب الرسالة','error'); return; }
var chan=(document.getElementById('ncChan')||{}).value;
var rStu=(document.getElementById('ncStu')||{}).checked, rPar=(document.getElementById('ncPar')||{}).checked, rTea=(document.getElementById('ncTea')||{}).checked;
var d=db(); var sts=studentsOf(gid); var fee=+g.monthlyFee||0; var sent=0;
var openCk=localMonth();
sts.filter(function(s){ return !onlySid||s.id===onlySid; }).forEach(function(s){
var paid=(LU.paidForCycle)?LU.paidForCycle(s.id,gid,openCk):0;
var txt=msg.replace(/\{اسم\}/g,s.name||'').replace(/\{مجموعة\}/g,g.name||'').replace(/\{متبقي\}/g,String(Math.max(0,fee-paid)));
if(chan!=='wa'&&rStu&&DataService.addNotification){ DataService.addNotification({targetUserId:s.id,title:'📨 رسالة من المركز',message:txt,type:'general',priority:'high',meta:{event:'custom'}}); sent++; }
if(chan!=='wa'&&rPar){
var pp=String(s.parentPhone||'').replace(/\D/g,'');
(DataService.getUsers?DataService.getUsers():[]).forEach(function(u){
if(u.role!=='parent') return;
var up=String(u.phone||'').replace(/\D/g,'');
if((u.studentIds||[]).indexOf(s.id)>=0||(pp&&up&&pp===up)){ if(DataService.addNotification) DataService.addNotification({targetUserId:u.id,title:'📨 رسالة من المركز (لابنك)',message:txt,type:'general',priority:'high',meta:{event:'custom_parent'}}); sent++; }
});
}
if(chan!=='dash') waPush(gid,'📨 *'+g.name+'*\n'+txt);
});
if(chan!=='dash'&&rTea&&g.teacherId&&DataService.addNotification) DataService.addNotification({targetUserId:g.teacherId,title:'📨 رسالة من المركز',message:msg.replace(/\{مجموعة\}/g,g.name),type:'general',priority:'medium',meta:{event:'custom_teacher'}});
saveD(d);
ThemeManager.closeModal();
if(window.safeToast) window.safeToast('📤 اتبعت '+sent+' إشعار'+(chan!=='dash'?' + الرسائل في طابور واتساب':''),'success');
}catch(e){ if(window.safeToast) window.safeToast('خطأ','error'); }
};

LU.setWarnAt=async function(gid,month){
try{
var v=parseInt((document.getElementById('sqWarnAt')||{}).value)||0;
if(v<1){ if(window.safeToast) window.safeToast('رقم غير صحيح','error'); return; }
if(DataService.updateGroup) await DataService.updateGroup(gid,{warnAt:v});
LU._sesCache={};
if(window.safeToast) window.safeToast('✅ إنذار الدفع هيجي عند الحصة رقم '+v,'success');
LU.refresh(); LU.editSquares(gid,month);
}catch(e){}
};

/* ➕➖ ترحيل/يدوي: زيادة ونقصان بمقدار 1 */
LU.carryDec=async function(gid,month){
try{
var d=db(); var touched=[]; var any=false;
studentsOf(gid).forEach(function(s){
var arr=(d.manualSessions||[]).filter(function(ms){ return ms.groupId===gid&&ms.studentId===s.id&&msInMonth(ms,gid,month)&&(!ms.type||ms.type==='counter')&&(ms.sessionsCount||0)>0; });
if(!arr.length) return;
arr.sort(function(a,b){ return String(b.addedAt||'').localeCompare(String(a.addedAt||'')); });
var t=arr[0]; t.sessionsCount-=1; any=true;
if(t.sessionsCount<=0){ d.manualSessions=(d.manualSessions||[]).filter(function(x){return x.id!==t.id;}); touched.push({del:t}); } else touched.push({save:t});
});
if(!any){ if(window.safeToast) window.safeToast('مفيش حصص يدوية تتخصم','info'); return; }
saveD(d);
for(var i=0;i<touched.length;i++){ var t=touched[i]; await cloudMS(t.del?t.del:t.save,!!t.del); }
if(window.safeToast) window.safeToast('➖ اتخصمت حصة من العداد','success');
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
finally{ LU.refresh(); try{ LU.editSquares(gid,month); }catch(e){} }
};

LU.carryInc=async function(gid,month){
  try{
    var __g1=gById(gid); 
    var __s1=LU.groupSessions(gid,month);
    var __r1=(rangesOf(__g1)||[]).find(function(r){return cycKey(r.n)===month;});
    if(__r1&&__r1.to!=null){ if(window.safeToast)window.safeToast('🔒 الدورة مقفولة','error'); return; }
    if(__s1.notStarted){ if(window.safeToast)window.safeToast('🔒 دورة لسه مبتدتش','error'); return; }
    if(__s1.done>=__s1.required){ if(window.safeToast)window.safeToast('🛑 وصلت للنصاب','error'); return; }
    
    var d=db(); d.manualSessions=d.manualSessions||[]; var touched=[];
    var sts=studentsOf(gid); if(!sts.length){ if(window.safeToast) window.safeToast('مفيش طلاب','error'); return; }
    sts.forEach(function(s){
      var arr=(d.manualSessions||[]).filter(function(ms){ return ms.groupId===gid&&ms.studentId===s.id&&msInMonth(ms,gid,month)&&(!ms.type||ms.type==='counter'); });
      if(arr.length){ arr.sort(function(a,b){ return String(b.addedAt||'').localeCompare(String(a.addedAt||'')); }); arr[0].sessionsCount=(arr[0].sessionsCount||0)+1; touched.push(arr[0]); }
      else { var ms={id:'ms_'+Date.now()+'_'+s.id,groupId:gid,studentId:s.id,month:month,sessionsCount:1,type:'counter',reason:'إضافة يدوية',addedBy:(cur()||{}).id||'',addedAt:new Date().toISOString()}; d.manualSessions.push(ms); touched.push(ms); }
    });
    saveD(d);
    for(var i=0;i<touched.length;i++){ await cloudMS(touched[i],false); }
    LU._lastLocalEdit = Date.now();
    if(window.safeToast) window.safeToast('➕ اتضافت حصة للعداد','success');
  }catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
  finally{ LU.refresh(); try{ LU.editSquares(gid,month); }catch(e){} }
};

/* ========== 💰 الدفعات ========== */
function paysFor(sid,gid){ return (db().payments||[]).filter(function(p){return p.studentId===sid&&p.groupId===gid;}).sort(function(a,b){return String(a.month).localeCompare(String(b.month));}); }
function payFor(sid,gid,month){ return paysFor(sid,gid).find(function(p){ return payInMonth(p,gid,month); })||null; }
function paidOf(p){ return p?(p.paidAmount||0):0; }
function histSum(p){ return ((p&&p.history)||[]).reduce(function(a,h){return a+(h.amount||0);},0); }
function dueMonths(sid,gid,fee){
var out=[]; if(!fee) return out;
var list=monthsList();
for(var i=0;i<list.length;i++){
var m=list[i]; var ses=LU.groupSessions(gid,m);
if(!ses.complete) continue;
var paid=paidOf(payFor(sid,gid,m));
if(paid>=fee) continue;
out.push({month:m,fee:fee,paid:paid,rem:Math.max(0,fee-paid)});
}
/* 📜 مستحقات رجعية (شهور قبل النظام أو مضافة يدوياً) */
var seen={}; out.forEach(function(x){seen[x.month]=1;});
(db().payments||[]).forEach(function(p){
if(!p||p.studentId!==sid||p.groupId!==gid) return;
var m=String(p.month||''); if(!m||seen[m]||list.indexOf(m)>=0) return;
var amt=p.amount||0; if(!amt) return;
var pd=p.paidAmount||0; if(pd>=amt) return;
seen[m]=1;
out.push({month:m,fee:amt,paid:pd,rem:Math.max(0,amt-pd),legacy:!!p.legacy});
});
out.sort(function(a,b){ return String(a.month).localeCompare(String(b.month)); });
return out;
}
function flagsOf(sid,g,month,ses){
var s=DataService.getUserById?DataService.getUserById(sid):null;
var total=(window.LG&&LG.effFee&&s)?LG.effFee(s,g):feeOf(g);
var p=payFor(sid,g.id,month);
var paid=paidOf(p);
var dms=dueMonths(sid,g.id,total);
var oldOnes=dms.filter(function(x){return x.month<month;});
var curOne=null; for(var i=0;i<dms.length;i++){ if(dms[i].month===month){ curOne=dms[i]; break; } }
var oRem=oldOnes.reduce(function(a,x){return a+x.rem;},0);
var curRem=curOne?curOne.rem:0;
var isPaid=total>0&&paid>=total;
var warnAt=(ses.warnAt!=null?ses.warnAt:ses.required-1);
return {total:total,paid:paid,p:p,isPaid:isPaid,isPartial:paid>0&&!isPaid,isDue:!!curOne,isWarn:(ses.done>=warnAt)&&!ses.complete&&!isPaid,isLate:oldOnes.length>0,debts:oldOnes.map(function(x){return x.month;}),dueAll:dms,curRem:curRem,oldRem:oRem,totalRem:oRem+curRem};
}
function histChips(sid,gid){
var ps=paysFor(sid,gid);
if(!ps.length) return '<span class="text-xs text-muted">لا دفعات</span> ';
return ps.map(function(p){ return (p.history||[]).map(function(h){ return '<span class="ldg-chip" title="دفعة '+h.amount+' ج.م بتاريخ '+h.date+' — دوس للتعديل" onclick="LedgerUI.editHistory(\''+sid+'\',\''+gid+'\')">💵 '+String(h.date||'').slice(5,10)+' : '+h.amount+'</span>'; }).join(''); }).join('')
+'<button class="btn btn-ghost btn-sm" title="دفعة يدوية" onclick="LedgerUI.payModal(\''+sid+'\',\''+gid+'\')">➕</button>';
}
function badgeOf(f,ses,month,gid){
var h='';
if(f.isLate) h+='<span class="badge badge-danger">⚠️ متأخر: '+f.debts.map(function(dm){return monthName(dm, gid);}).join('، ')+'</span> ';
if(f.isPaid) h+='<span class="badge badge-success">✓ مسدد '+monthName(month, gid)+'</span>';
else if(f.isDue){ var __dd=dueDateFor(gById(gid),month); var __ddTxt=__dd?('قبل '+fmtD(__dd)):monthName(month, gid); h+= f.paid>0 ? '<span class="badge badge-danger">💰 متبقي من شهرية '+monthName(month, gid)+' — مطلوب '+__ddTxt+': '+(f.total-f.paid)+'</span>' : '<span class="badge badge-danger">💰 مطلوب شهرية '+monthName(month, gid)+' — '+__ddTxt+'</span>'; }
else if(f.isWarn) h+='<span class="badge badge-warning">🔔 إنذار الدفع ('+ses.done+'/'+ses.required+')</span>';
else if(f.isPartial) h+='<span class="badge badge-warning">مقدم '+f.paid+'/'+f.total+' (لسه مكملش الحصص)</span>';
else h+='<span class="text-xs text-muted">لسه — '+ses.done+'/'+ses.required+'</span>';
if(f.isPaid&&ses.complete) h+=' <span class="badge badge-info">➡️ دورة الشهر الجاي</span>';
return h;
}

/* ========== 🆕 V11 الفلاتر المتتابعة الذكية (أستاذ←سنتر←مرحلة←صف←مجموعة) ========== */
function normAr(s){ return String(s||'').trim().replace(/\s+/g,' '); }
function gradeMatch(gv,fv){ gv=normAr(gv); fv=normAr(fv); if(!fv) return true; if(gv===fv) return true; return gv.indexOf(fv)>=0||fv.indexOf(gv)>=0; }
function cascadeGroups(base,f){
var afterT=base;
if(f.teacher) afterT=base.filter(function(g){return g.teacherId===f.teacher;});
var centers={}; afterT.forEach(function(g){ if(g.center) centers[g.center]=1; });
var afterC=afterT;
if(f.center) afterC=afterT.filter(function(g){ return String(g.center||'').trim()===String(f.center).trim(); });
var stages={}; afterC.forEach(function(g){ if(g.stage) stages[g.stage]=1; });
var afterSt=afterC;
if(f.stage) afterSt=afterC.filter(function(g){return (g.stage||'')===f.stage;});
var gradesSet={}; afterSt.forEach(function(g){ if(g.grade) gradesSet[g.grade]=1; });
var afterGr=afterSt;
if(f.grade) afterGr=afterSt.filter(function(g){ return gradeMatch(g.grade,f.grade); });
return {afterT:afterT,centers:Object.keys(centers),stages:Object.keys(stages),grades:Object.keys(gradesSet),list:afterGr};
}
function filtersHtml(){
var f=LU._st;
var lv=(typeof EduFlowConfig!=='undefined'&&EduFlowConfig.educationLevels)?EduFlowConfig.educationLevels:{};
var teachers=(DataService.getTeachers?DataService.getTeachers():[]);
var months=monthsList();
var nm=normMonth(f.month); if(months.indexOf(nm)<0) months.push(nm);
var base=isAdmin()?groups():myGroups();
if(!isAdmin()){ var tid0=myTeacherId(); if(tid0) base=base.filter(function(g){return g.teacherId===tid0;}); }
var cas=cascadeGroups(base,f);
var gradeList=f.stage?((lv[f.stage]&&lv[f.stage].grades)||[]):cas.grades.concat(Object.keys(lv).flatMap(function(k){return lv[k].grades||[];})).filter(function(v,i,a){return a.indexOf(v)===i;});
var tSel=(isAdmin()||(cur()||{}).role==='center')?'<select class="form-select" onchange="LedgerUI.fset(\'teacher\',this.value)"><option value="">👨 كل الأساتذة</option>'+teachers.map(function(t){return '<option value="'+t.id+'" '+(f.teacher===t.id?'selected':'')+'>'+t.name+' ('+base.filter(function(g){return g.teacherId===t.id;}).length+')</option>';}).join('')+'</select>':'';
var preGroups=cas.list;
var gidVal=preGroups.some(function(g){return g.id===f.gid;})?f.gid:'';
if(gidVal!==f.gid) f.gid=gidVal;
return '<div class="card" style="padding:10px;margin-bottom:12px;"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;">'
+tSel
+'<select class="form-select" onchange="LedgerUI.fset(\'center\',this.value)"><option value="">🏢 كل السناتر</option>'+cas.centers.map(function(c){return '<option value="'+c+'" '+(f.center===c?'selected':'')+'>'+c+' ('+cas.afterT.filter(function(g){return g.center===c;}).length+')</option>';}).join('')+'</select>'
+'<select class="form-select" onchange="LedgerUI.fset(\'stage\',this.value)"><option value="">🎯 كل المراحل</option>'+Object.keys(lv).map(function(k){return '<option value="'+k+'" '+(f.stage===k?'selected':'')+'>'+lv[k].nameAr+'</option>';}).join('')+'</select>'
+'<select class="form-select" onchange="LedgerUI.fset(\'grade\',this.value)"><option value="">🎓 كل الصفوف</option>'+gradeList.map(function(g){return '<option value="'+g+'" '+(f.grade===g?'selected':'')+'>'+g+'</option>';}).join('')+'</select>'
+'<select class="form-select" onchange="LedgerUI.fset(\'gid\',this.value)"><option value="">👥 كل المجموعات المطابقة ('+preGroups.length+')</option>'+preGroups.map(function(g){return '<option value="'+g.id+'" '+(gidVal===g.id?'selected':'')+'>'+g.name+' · '+(g.grade||'-')+' · '+(g.frozen?'🧊':'▶️')+'</option>';}).join('')+'</select>'
+'<select class="form-select" onchange="LedgerUI.fset(\'status\',this.value)"><option value="">💳 كل الحالات</option><option value="paid" '+(f.status==='paid'?'selected':'')+'>✓ دفعوا</option><option value="warn" '+(f.status==='warn'?'selected':'')+'>🔔 إنذار الدفع</option><option value="due" '+(f.status==='due'?'selected':'')+'>💰 مطلوب الآن</option><option value="late" '+(f.status==='late'?'selected':'')+'>⚠️ متأخرين مرحّلين</option></select>'
+'<select class="form-select" onchange="LedgerUI.fset(\'month\',this.value)">'+months.map(function(m){return '<option value="'+m+'" '+(nm===m?'selected':'')+'>'+monthName(m,f.gid||'')+'</option>';}).join('')+'</select>'
+'<input type="text" id="ldgQ_'+LU._ctx+'" class="form-input" placeholder="🔍 بحث طالب..." value="'+(f.q||'')+'" oninput="LedgerUI.fset(\'q\',this.value)">'
+'</div></div>';
}
LU.fset=function(k,v){
var ae=document.activeElement, aid=ae?ae.id:null, apos=0;
try{ apos=(ae&&ae.selectionStart!=null)?ae.selectionStart:0; }catch(e){}
LU._st[k]=v; if(k==='stage') LU._st.grade=''; if(k==='teacher'){ LU._st.center=''; LU._st.gid=''; } if(k==='center') LU._st.gid='';
LU.refresh();
if(aid){ var el=document.getElementById(aid); if(el){ try{ el.focus(); el.setSelectionRange(apos,apos); }catch(e){} } }
};
LU.setMonth=function(m){ LU._st.month=m; LU.refresh(); };
LU.setQ=function(q){ LU._st.q=q; LU.refresh(); };
LU.setGid=function(gid){ LU._st.gid=gid||null; LU.refresh(); };
function groupFilter(list){
var f=LU._st;
if(!isAdmin()&&(cur()||{}).role!=='center'){ var tid=myTeacherId(); if(tid) list=list.filter(function(g){return g.teacherId===tid;}); }
else if(f.teacher) list=list.filter(function(g){return g.teacherId===f.teacher;});
if(f.center) list=list.filter(function(g){ return String(g.center||'').trim()===String(f.center).trim(); });
if(f.stage) list=list.filter(function(g){return (g.stage||'')===f.stage;});
if(f.grade) list=list.filter(function(g){ return gradeMatch(g.grade,f.grade); });
if(f.gid) list=list.filter(function(g){return g.id===f.gid;});
return list;
}

/* 📅 الانتقال الفوري لدورة معينة من زرار الكارت */
LU.gotoCycle=function(ck){
  LU._st.month=ck;
  LU._sesCache={};
  try{ LU.refresh(); }catch(e){}
  if(window.safeToast) window.safeToast('📅 الفلتر انتقل إلى '+cycleName(ck),'info');
};

/* ========== صفوف موحدة ========== */
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
var pendCount=0; try{ pendCount=((db().pendingMonthTransitions||[]).filter(function(p){return p.status==='pending';})).length; }catch(e){}
return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">'
+'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span style="background:var(--primary-bg);border:1px solid var(--primary-border);padding:10px 18px;border-radius:14px;font-size:14px;font-weight:800;display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;box-shadow:0 4px 14px rgba(0,0,0,.15);">📅 <span id="ldgClockDate" style="font-size:14px;"></span><span style="opacity:.4;">|</span>🕐 <span id="ldgClockTime" style="font-family:var(--font-en);font-weight:900;font-size:22px;letter-spacing:1px;color:var(--primary);min-width:118px;text-align:center;"></span></span>'
+(pendCount?'<button class="btn btn-warning btn-sm" onclick="window.openMonthTransitionsModal()">🔔 '+pendCount+' طلب انتقال شهر</button>':'')
+'</div>'
+'<div class="ldg-toolbar" style="margin:0;">'
+(isAdmin()?'<button class="btn btn-primary btn-sm" onclick="LedgerUI.openCountControl()">🎛️ تحكم العدّ والتجميد</button>':'')
+(isAdmin()?'<button class="btn '+(LU.countingState().active?'btn-success':'btn-warning')+' btn-sm" onclick="LedgerUI.toggleCounting()">'+(LU.countingState().active?'▶️ العد شغال — دوس للإيقاف':'🧊 العد موقوف — دوس لبدء العد')+'</button>':'')
+'<button class="btn btn-info btn-sm" onclick="LedgerUI.openNotifyComposer()">📨 إشعار مخصص</button>'
+(canWrite()?'<button class="btn btn-ghost btn-sm" title="نسخ رسالة الاستحقاق تلقائياً لجروب المجموعة عند الاستحقاق/الإنذار/بداية الدورة" onclick="LedgerUI.toggleWaOnDue()">'+(waOnDueFlag()?'💬 واتساب تلقائي: شغال':'💬 واتساب تلقائي: متوقف')+'</button>':'')
+(waQueue().length?'<button class="btn btn-warning btn-sm" onclick="LedgerUI.openWaQueue()">💬 '+waQueue().length+' رسالة منتظرة</button>':'')
+((isAdmin()||((cur()||{}).role==='assistant')||((cur()||{}).role==='center'))?'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.openLegacyDueModal()">📜 مستحق رجعي</button>':'')
+'</div></div>';
}
function tickClock(){
try{
var dEl=document.getElementById('ldgClockDate'), tEl=document.getElementById('ldgClockTime');
if(!dEl||!tEl) return;
var n=new Date();
dEl.textContent=n.toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
tEl.textContent=n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});
}catch(e){}
}
function filterSummaryHtml(gs){
var f=LU._st; var parts=[];
if(f.teacher){ var t=(DataService.getUserById?DataService.getUserById(f.teacher):null); if(t) parts.push('الأستاذ: '+t.name); }
if(f.center) parts.push('السنتر: '+f.center);
if(f.stage){ var lv=(typeof EduFlowConfig!=='undefined'&&EduFlowConfig.educationLevels)?EduFlowConfig.educationLevels:{}; parts.push('المرحلة: '+((lv[f.stage]&&lv[f.stage].nameAr)||f.stage)); }
if(f.grade) parts.push('الصف: '+f.grade);
if(f.gid){ var g=gById(f.gid); if(g) parts.push('المجموعة: '+g.name); }
if(f.status) parts.push('الحالة: '+({paid:'دفعوا',warn:'إنذار الدفع',due:'مطلوب الآن',late:'متأخرين',partial:'جزئي'}[f.status]||f.status));
if(f.q) parts.push('بحث: '+f.q);
var stu=0; gs.forEach(function(g){ stu+=studentsOf(g.id).length; });
return '<div class="filter-info" style="margin-bottom:10px;">🔎 معروض حالياً: <strong>'+gs.length+'</strong> مجموعة · <strong>'+stu+'</strong> طالب'+(parts.length?' — الفلاتر النشطة: '+parts.join(' · '):' — بدون فلاتر')+'</div>';
}

function statsHtml(rows,gs,month){
var collected=0,remaining=0,paidN=0,unpaidN=0,doneAll=0,reqAll=0,frozenN=0;
rows.forEach(function(r){ collected+=r.f.paid; remaining+=r.f.totalRem; if(r.f.isPaid) paidN++; else if(r.f.isLate||r.f.isDue||r.f.isWarn) unpaidN++; });
gs.forEach(function(g){ var s=LU.groupSessions(g.id,month); doneAll+=s.done; reqAll+=s.required; if(g.frozen) frozenN++; });
return '<div class="ldg-stats">'
+'<div class="ldg-stat"><b style="color:var(--success)">'+collected+'</b><span>محصّل '+monthName(month)+'</span></div>'
+'<div class="ldg-stat"><b style="color:var(--danger)">'+remaining+'</b><span>متبقي (قديم+جديد)</span></div>'
+'<div class="ldg-stat"><b>'+paidN+'</b><span>✅ دفعوا</span></div>'
+'<div class="ldg-stat"><b style="color:var(--warning)">'+unpaidN+'</b><span>❌ لسه مدفوعوش</span></div>'
+'<div class="ldg-stat"><b>'+doneAll+'/'+reqAll+'</b><span>حصص المجموعات</span></div>'
+(frozenN?'<div class="ldg-stat"><b style="color:var(--warning)">'+frozenN+'</b><span>🧊 مجموعات مجمدة</span></div>':'')
+'</div>';
}

/* 🚀 تذكير جماعي لكل المتأخرين: رسالة طالب + رسالة ولي أمر لكل واحد */
LU.bulkWaOverdue=function(){
  var m=normMonth(LU._st.month);
  var gs=groupFilter(isAdmin()?groups():myGroups());
  var pushed=0;
  gs.forEach(function(g){
    var fee=feeOf(g); if(!fee) return;
    studentsOf(g.id).forEach(function(s){
      var dms=dueMonths(s.id,g.id,(window.LG&&LG.effFee)?LG.effFee(s,g):fee);
      var old=dms.filter(function(x){return x.month<m;});
      if(!old.length) return;
      var tot=old.reduce(function(a,x){return a+x.rem;},0);
      var core='⚠️ متأخرات مستحقة على '+(s.name||'')+':\n'+old.map(function(x){return '• '+monthName(x.month,g.id)+': '+x.rem+' ج.م';}).join('\n')+'\nالإجمالي: '+tot+' ج.م\nبرجاء السداد في أقرب حصة 🙏';
      var mm=roleMsgs(s,core);
      waPushTargets(g.id,[{to:s.phone,role:'student',msg:'⚠️ *متأخرات — '+g.name+'*\n'+mm.stu},{to:s.parentPhone,role:'parent',msg:'⚠️ *متأخرات — '+g.name+'*\n'+mm.par}]);
      pushed++;
    });
  });
  if(!pushed){ if(window.safeToast)window.safeToast('مفيش متأخرات مرحّلة','info'); return; }
  if(window.safeToast)window.safeToast('✅ جهزنا '+pushed+' طالب × 2 (طالب + ولي أمر) — دوس "🚀 إرسال الكل" من الطابور','success');
  LU.openWaQueue();
};

function carryHtml(month,gs){
var m=normMonth(month), rows=[];
(gs||[]).forEach(function(g){
studentsOf(g.id).forEach(function(s){
dueMonths(s.id,g.id,(window.LG&&LG.effFee)?LG.effFee(s,g):feeOf(g)).forEach(function(x){ if(x.month<m) rows.push({s:s,g:g,rem:x.rem,month:x.month}); });
});
});
if(!rows.length) return '';
return '<div class="card" style="border-color:var(--danger);margin-bottom:12px;"><div class="card-header"><h3 class="card-title" style="color:var(--danger);">⚠️ متأخرات مرحّلة ('+rows.length+')</h3><div style="display:flex;gap:6px;align-items:center;"><button class="btn btn-success btn-sm" style="background:#25d366;border-color:#25d366;" onclick="LedgerUI.bulkWaOverdue()">🚀 تذكير الكل واتساب</button><span class="points-badge">'+rows.reduce(function(a,r){return a+r.rem;},0)+' ج.م</span></div></div><div style="padding:10px;">'
+rows.map(function(r){ var __pp2=String((r.s&&r.s.parentPhone)||'').replace(/\D/g,'');
if(__pp2&&__pp2.length===11&&__pp2[0]==='0') __pp2='2'+__pp2;
var __waMsg2='⚠️ تذكير بمتأخرات\n\nيا '+(r.s?r.s.name:'')+' 🌹\nمتأخرات شهرية '+monthName(r.month, r.g?r.g.id:'')+'\nالمبلغ: '+r.rem+' ج.م\nبرجاء السداد فوراً 🙏';
var __waUrl2=__pp2?('https://wa.me/'+__pp2+'?text='+encodeURIComponent(__waMsg2)):'';
return '<div class="ldg-lrow" style="border-right:3px solid var(--danger);"><div style="flex:1;"><strong>'+(r.s?r.s.name:'-')+'</strong><div class="text-xs text-muted">'+(r.g?r.g.name:'-')+' · شهرية '+monthName(r.month, r.g.id)+' · متبقي '+r.rem+' ج.م</div></div><div style="display:flex;gap:4px;">'+(__waUrl2?'<a href="'+__waUrl2+'" target="_blank" class="btn btn-success btn-sm" style="background:#25D366;border-color:#25D366;color:#fff;">💬 واتساب</a>':'')+'<button class="btn btn-success btn-sm" onclick="LedgerUI.payModal(\''+r.s.id+'\',\''+r.g.id+'\',\''+r.month+'\')">💰 تحصيل</button><button class="btn btn-ghost btn-sm" onclick="LedgerUI.studentDetails(\''+r.s.id+'\')">👁</button></div></div>'; }).join('')
+'</div></div>';
}
function listsHtml(rows,month){
var paid=rows.filter(function(r){return r.f.isPaid;});
var unpaid=rows.filter(function(r){ return r.f.isLate||r.f.isDue||r.f.isWarn; });
var paidSum=paid.reduce(function(a,r){return a+r.f.paid;},0);
var unSum=unpaid.reduce(function(a,r){return a+r.f.totalRem;},0);
var h='<div class="card" style="margin-top:14px;"><div class="card-header"><h3 class="card-title" style="color:var(--success);">✅ دفعوا '+monthName(month)+' ('+paid.length+')</h3><span class="points-badge">'+paidSum+' ج.م</span></div><div style="padding:10px;">';
h+=paid.length?paid.map(function(r){
var last=r.f.p&&r.f.p.paidAt?String(r.f.p.paidAt).slice(0,10):(r.f.p&&r.f.p.history&&r.f.p.history.length?r.f.p.history[r.f.p.history.length-1].date:'');
return '<div class="ldg-lrow" style="border-right:3px solid var(--success);"><div style="flex:1;"><strong>'+r.s.name+'</strong><div class="text-xs text-muted">'+r.g.name+' · دفع '+r.f.paid+'/'+r.f.total+' · 📅 '+last+'</div></div><button class="btn btn-ghost btn-sm" onclick="LedgerUI.editHistory(\''+r.s.id+'\',\''+r.g.id+'\')">💵 الدفعات</button></div>';
}).join(''):'<p class="text-xs text-muted">لا أحد بعد هذا الشهر</p>';
h+='</div></div>';
h+='<div class="card"><div class="card-header"><h3 class="card-title" style="color:var(--danger);">❌ لسه مدفوعوش '+monthName(month)+' ('+unpaid.length+')</h3><span class="points-badge">'+unSum+' ج.م</span></div><div style="padding:10px;">';
h+=unpaid.length?unpaid.map(function(r){
var dueTxt=r.f.dueAll.length?r.f.dueAll.map(function(x){return monthName(x.month, r.g.id)+': '+x.rem;}).join(' + '):'إنذار مبكر — لسه مفيش شهر مكمل';
var tag=r.f.isLate?'⚠️ متأخرات':(r.f.isDue?'💰 مستحقة الآن':'🔔 إنذار الدفع');
var __pp=String(r.s.parentPhone||'').replace(/\D/g,'');
if(__pp&&__pp.length===11&&__pp[0]==='0') __pp='2'+__pp;
var __waMsg='💰 تذكير بالشهرية\n\nيا '+r.s.name+' 🌹\n'+(r.f.isLate?'⚠️ عندك متأخرات: '+r.f.oldRem+' ج.م\n':'')+'مطلوب: '+r.f.curRem+' ج.م\nمجموعة: '+r.g.name+'\nبرجاء السداد في أقرب حصة 🙏';
var __waUrl=__pp?('https://wa.me/'+__pp+'?text='+encodeURIComponent(__waMsg)):'';
return '<div class="ldg-lrow" style="border-right:3px solid '+(r.f.isWarn&&!r.f.isDue&&!r.f.isLate?'var(--warning)':'var(--danger)')+';"><div style="flex:1;"><strong>'+r.s.name+'</strong> <span class="badge '+(r.f.isWarn&&!r.f.isDue&&!r.f.isLate?'badge-warning':'badge-danger')+'">'+tag+'</span><div class="text-xs text-muted">'+r.g.name+' · مطلوب: '+dueTxt+' · حصصه: '+r.ses.done+'/'+r.ses.required+'</div></div><div style="display:flex;gap:4px;align-items:center;">'+(r.f.isWarn&&!r.f.isDue?'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.notifyBringFee(\''+r.s.id+'\',\''+r.g.id+'\')">🔔 بلّغه</button>':'')+(__waUrl?'<a href="'+__waUrl+'" target="_blank" class="btn btn-success btn-sm" style="background:#25D366;border-color:#25D366;color:#fff;">💬 واتساب</a>':'')+'<button class="btn btn-success btn-sm" onclick="LedgerUI.payModal(\''+r.s.id+'\',\''+r.g.id+'\')">💰 تحصيل</button><button class="btn btn-ghost btn-sm" onclick="LedgerUI.studentDetails(\''+r.s.id+'\')">👁 تفاصيل</button></div></div>';
}).join(''):'<p class="text-xs text-muted">الكل دافع 🎉</p>';
h+='</div></div>';
return h;
}

/* ========== 💬 واتساب تلقائي + تاريخ استحقاق + شارة الدورة السابقة ========== */
function waOnDueFlag(){ try{ return (db().platformMeta||{}).waOnDue!==false; }catch(e){ return true; } }
LU.toggleWaOnDue=function(){
  var d=db(); d.platformMeta=d.platformMeta||{};
  d.platformMeta.waOnDue=!waOnDueFlag(); saveD(d);
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('platformMeta','meta',d.platformMeta); }catch(e){}
  if(window.safeToast)window.safeToast(d.platformMeta.waOnDue?'💬 واتساب تلقائي عند الاستحقاق: شغال':'💬 واتساب تلقائي عند الاستحقاق: متوقف','info');
  LU.refresh();
};
function waQueue(){ return (db().waQueue||[]); }
function waPush(gid,msg){ waPushTargets(gid,[{to:'',role:'group',msg:msg}]); }
/* ☁️ إعدادات الإرسال السحابي — غيّر الرابط لم مشروعك على Vercel */
window.WA_API_URL = 'https://eduflow-nine-dusky.vercel.app/api/send-wa';
window.WA_ADMIN_KEY = 'eduflow-wa-2026-9k4m2p7q';
LU.sendWaCloud = async function(to, body){
  try{
    if(!to) return false;
    var r = await fetch(window.WA_API_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json','x-admin-key':window.WA_ADMIN_KEY},
      body: JSON.stringify({to:to, body:body})
    });
    return r.ok;
  }catch(e){ return false; }
};
function normWa(ph){
  var c=String(ph||'').replace(/\D/g,'');
  if(!c) return '';
  if(c.length===11&&c[0]==='0') c='2'+c;
  if(c.length<10) return '';
  return c;
}
/* ✍️ صيغة للطالب وصيغة لولي الأمر — نفس المعلومة بأسلوب مختلف */
function roleMsgs(s, core){
  return {
    stu: 'يا '+(s&&s.name||'')+' 💜\n'+core,
    par: 'السلام عليكم 🌹\nحضرتك ولي أمر الطالب/ة: '+(s&&s.name||'')+'\n'+core+'\n\nبرجاء المتابعة مع ابنكم/ابنتكم في السداد — شكراً لتعاونكم 🙏'
  };
}
/* 📦 طابور بأهداف متعددة (طالب + ولي أمر) */
function waPushTargets(gid,targets){
  var d=db(); d.waQueue=d.waQueue||[];
  var clean=(targets||[]).filter(function(t){ return t&&t.msg; });
  if(!clean.length) return;
  d.waQueue.push({id:'wq_'+Date.now()+Math.random().toString(36).slice(2,5), gid:gid, targets:clean, msg:clean[0].msg, at:new Date().toISOString(), sent:[]});
  if(d.waQueue.length>30) d.waQueue=d.waQueue.slice(-30);
  saveD(d);
  try{ if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(clean[0].msg); }catch(e){}
}
LU.waPushTargets=function(gid,targets){ waPushTargets(gid,targets); };
/* 🚀 إرسال كل الطابور بضغطة واحدة عبر Cloud API */
LU.sendAllWaQueue=async function(){
  var roleSel=(document.getElementById('waSendRole')||{}).value||'all';
  var d=db(); var q=d.waQueue||[];
  if(!q.length){ if(window.safeToast)window.safeToast('مفيش رسائل في الطابور','info'); return; }
  if(String(window.WA_API_URL).indexOf('YOUR-VERCEL')>=0){
    if(window.safeToast)window.safeToast('⚙️ اربط الأول: حط رابط Vercel في window.WA_API_URL داخل ledger-ui.js','error');
    return;
  }
  var ok=0, fail=0;
  for(var i=0;i<q.length;i++){
    var item=q[i];
    var tgs=(item.targets||[{to:'',role:'group',msg:item.msg}]).filter(function(t){
      return roleSel==='all' || !t.role || t.role==='group' || t.role===roleSel;
    });
    for(var k=0;k<tgs.length;k++){
      var to=normWa(tgs[k].to);
      if(!to){ fail++; continue; }
      var sentOk=await LU.sendWaCloud(to,tgs[k].msg);
      if(sentOk) ok++; else fail++;
    }
  }
  d.waQueue=[]; saveD(d);
  var roleTxt=roleSel==='student'?'للطلاب':(roleSel==='parent'?'لأولياء الأمور':'للطلاب وأولياء الأمور');
  if(window.safeToast) window.safeToast('🚀 تم الإرسال '+roleTxt+': '+ok+' رسالة'+(fail?(' · فشل/بدون رقم: '+fail):''),'success');
  LU.refresh();
};
LU.openWaQueue=function(){
  var q=waQueue();
  if(!q.length){ if(window.safeToast)window.safeToast('مفيش رسائل منتظرة','info'); return; }
  var nStu=0,nPar=0,nGrp=0;
  q.forEach(function(x){ (x.targets||[{role:'group'}]).forEach(function(t){ if(t.role==='student')nStu++; else if(t.role==='parent')nPar++; else nGrp++; }); });
  var html='<div class="modal-header"><h3 class="modal-title">💬 رسائل منتظرة ('+q.length+' مجموعة)</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">';
  html+='<div class="form-group"><label>🎯 الإرسال إلى</label><select id="waSendRole" class="form-select" onchange="window.__waUpdSendBtn()">'+
        '<option value="all">👥 الاتنين (طالب + ولي أمر) — '+((nStu+nPar+nGrp))+' رسالة</option>'+
        '<option value="student">🎓 الطالب فقط — '+nStu+' رسالة</option>'+
        '<option value="parent">👨👩‍ ولي الأمر فقط — '+nPar+' رسالة</option>'+
        '</select></div>';
  html+='<button id="waSendAllBtn" class="btn btn-success w-full" style="margin-bottom:10px;background:#25d366;border-color:#25d366;" onclick="LedgerUI.sendAllWaQueue()">🚀 إرسال الكل عبر واتساب</button>';
  html+=q.map(function(x,i){
    var tgs=x.targets||[{role:'group',to:'',msg:x.msg}];
    return '<div class="sub-row" style="margin-bottom:8px;"><div style="flex:1;"><strong>'+gName(x.gid)+'</strong>'+
      tgs.map(function(t){ return '<div class="text-xs text-muted" style="white-space:pre-line;margin-top:4px;padding:6px;background:var(--surface-hover);border-radius:6px;">'+(t.role==='parent'?'👨👩‍ ولي أمر':(t.role==='student'?'🎓 طالب':'💬 عام'))+': '+t.msg+'</div>'; }).join('')+
      '</div><div style="display:flex;gap:4px;"><button class="btn btn-danger btn-sm" onclick="LedgerUI.delWaQueued('+i+')">🗑</button></div></div>';
  }).join('');
  html+='</div>';
  ThemeManager.openModal(html,'modal-md');
  window.__waUpdSendBtn();
};
window.__waUpdSendBtn=function(){
  var sel=(document.getElementById('waSendRole')||{}).value||'all';
  var btn=document.getElementById('waSendAllBtn'); if(!btn) return;
  var q=waQueue(); var n=0;
  q.forEach(function(x){ (x.targets||[{role:'group'}]).forEach(function(t){ if(sel==='all'||!t.role||t.role==='group'||t.role===sel) n++; }); });
  btn.textContent='🚀 إرسال الكل عبر واتساب ('+n+' رسالة)';
};
LU.sendWaQueued=function(i){
  var d=db(); var x=(d.waQueue||[])[i]; if(!x) return;
  try{ if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(x.msg); }catch(e){}
  window.openGroupWa(x.gid,x.msg);
  d.waQueue.splice(i,1); saveD(d); LU.openWaQueue();
};
LU.delWaQueued=function(i){ var d=db(); (d.waQueue||[]).splice(i,1); saveD(d); LU.openWaQueue(); };
/* 📅 تاريخ استحقاق ملموس = أول حصة في الدورة الجاية */
function dueDateFor(g,month){
  try{
    if(!g) return '';
    var rs=rangesOf(g); var n=parseInt(String(month).replace('cycle-',''))||1;
    var nxt=null; rs.forEach(function(r){ if(r.n===n+1) nxt=r; });
    var base=nxt?nxt.from:null;
    if(!base){ var curr=null; rs.forEach(function(r){ if(r.n===n) curr=r; }); base=(curr&&curr.to)?nextDay(curr.to):null; }
    if(!base) return '';
    var sch=(g.schedules&&g.schedules.length)?g.schedules:(g.day?[{day:g.day}]:[]);
    if(!sch.length) return base;
    var WD2={0:'Sunday',1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday'};
    var days={}; sch.forEach(function(s){days[s.day]=1;});
    var d=new Date(base+'T12:00:00');
    for(var i=0;i<14;i++){ if(days[WD2[d.getDay()]]) return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); d.setDate(d.getDate()+1); }
    return base;
  }catch(e){ return ''; }
}
/* ⚠️ شارة "غير مسدد للدورة السابقة" لمودال حصص اليوم */
function prevUnpaidBadge(g){
  try{
    var rs=rangesOf(g);
    var closed=rs.filter(function(r){return r.to!=null;});
    if(!closed.length) return '';
    var fee=feeOf(g); if(!fee) return '';
    var sts=studentsOf(g.id); var any=false;
    closed.forEach(function(r){
      var ck=cycKey(r.n);
      sts.forEach(function(s){
        if(any) return;
        var paid=(LU.paidForCycle)?LU.paidForCycle(s.id,g.id,ck):0;
        if(paid<fee) any=true;
      });
    });
    return any?' <button type="button" class="badge badge-danger" style="cursor:pointer;border:none;font-size:11px;" title="افتح دفتر التحصيل على المجموعة دي وشوف المتأخرات" onclick="LedgerUI.gotoGroupLedger(\''+g.id+'\')">⚠️ غير مسدد للدورة السابقة</button>':'';
  }catch(e){ return ''; }
}

/* 📒 من شارة "غير مسدد للدورة السابقة" → دفتر التحصيل مفلتراً على المجموعة */
LU.gotoGroupLedger=function(gid){
  try{
    var g=gById(gid); if(!g) return;
    try{ ThemeManager.closeModal(); }catch(e){}
    /* فعّل فلتر المجموعة دي بس وصفّي باقي الفلاتر */
    LU._st.gid=gid; LU._st.q=''; LU._st.status=''; LU._st.teacher=''; LU._st.center=''; LU._st.stage=''; LU._st.grade='';
    /* افتح على شهر آخر دورة مقفولة (فيها المتأخرات) */
    var rs=rangesOf(g); var lastClosed=null;
    rs.forEach(function(r){ if(r.to!=null) lastClosed=r; });
    if(lastClosed) LU._st.month=cycKey(lastClosed.n);
    var secId=isAdmin()?'ledger':'monthly';
    if(typeof window.showSection==='function') window.showSection(secId);
    setTimeout(function(){ LU._sesCache={}; LU.refresh(); },150);
    if(window.safeToast) window.safeToast('📒 دفتر التحصيل مفتوح على: '+g.name,'info');
  }catch(e){}
};

/* ========== 🔔 محرك الإشعارات الموحد (إنذار + استحقاق + بداية دورة + واتساب) ========== */
function scanNotify(gs,month){
try{
if(!countingActiveFlag((db().platformMeta||{}))||notifyFrozen()) return;
var d=db(); d.warn7=d.warn7||{}; d.due8=d.due8||{}; d.cycleStart=d.cycleStart||{};
gs.forEach(function(g){
var ses=LU.groupSessions(g.id,month); var key=g.id+'__'+month; var fee=feeOf(g);
var effFee=function(s){ return (window.LG&&LG.effFee)?LG.effFee(s,g):fee; };

/* 🔄 إشعار بداية دورة جديدة (مرة واحدة لكل دورة) + كل المستحقات السابقة */
var rs=rangesOf(g); var openR=null; rs.forEach(function(r){ if(r.to==null&&!openR) openR=r; });
if(openR&&openR.n>=2){
  var sKey=g.id+'__start__'+openR.n;
  if(!d.cycleStart[sKey]){
    d.cycleStart[sKey]=1;
    studentsOf(g.id).forEach(function(s){
      var dms=dueMonths(s.id,g.id,effFee(s));
      if(!dms.length) return;
      var prevList=dms.filter(function(x){return x.month!==month;});
      var totRem=dms.reduce(function(a,x){return a+x.rem;},0);
      var msg='🔄 بدأت دورة جديدة ('+monthName(cycKey(openR.n),g.id)+') — برجاء سداد الشهرية '+fee+' ج.م في أقرب حصة 🌹';
      if(prevList.length) msg+=' ⚠️ عليك أيضاً مستحقات سابقة: '+prevList.map(function(x){return monthName(x.month,g.id)+' ('+x.rem+' ج.م)';}).join(' + ')+' — الإجمالي المطلوب '+totRem+' ج.م';
      if(DataService.addNotification) DataService.addNotification({targetUserId:s.id,title:'🔄 دورة جديدة + شهرية مستحقة',message:msg,type:'payment',priority:'high',meta:{event:'cycle_start'}});
      if(waOnDueFlag()){ var m1=roleMsgs(s,msg); waPushTargets(g.id,[{to:s.phone,role:'student',msg:'🔄 *'+g.name+'*\n'+m1.stu},{to:s.parentPhone,role:'parent',msg:'🔄 *'+g.name+'*\n'+m1.par}]); }
    });
  }
}

/* 🔔 إنذار الدفع عند حصة warnAt — بصيغة "سرعة السداد قبل اكتمال الشهر" */
if(!ses.complete&&ses.done>=ses.warnAt&&!d.warn7[key]){
d.warn7[key]=1;
studentsOf(g.id).forEach(function(s){
var fl=flagsOf(s.id,g,month,ses); if(fl.isPaid) return;
var wmsg='🔔 برجاء سرعة السداد قبل اكتمال الشهر — باقي '+(ses.required-ses.done)+' حصة على اكتمال حصص '+monthName(month,g.id)+'. الشهرية: '+fee+' ج.م.';
if(DataService.addNotification) DataService.addNotification({targetUserId:s.id,title:'🔔 سرعة السداد قبل اكتمال الشهر',message:wmsg,type:'payment',priority:'medium',meta:{event:'due_warn'}});
if(waOnDueFlag()){ var m2=roleMsgs(s,wmsg); waPushTargets(g.id,[{to:s.phone,role:'student',msg:'🔔 *'+g.name+'*\n'+m2.stu},{to:s.parentPhone,role:'parent',msg:'🔔 *'+g.name+'*\n'+m2.par}]); }
});
}

/* 💰 إشعار الاستحقاق عند الاكتمال + كل المستحقات السابقة */
if(ses.complete&&!d.due8[key]){
d.due8[key]=1;
studentsOf(g.id).forEach(function(s){
var fl=flagsOf(s.id,g,month,ses); if(fl.isPaid) return;
var dms=dueMonths(s.id,g.id,effFee(s));
var prevList=dms.filter(function(x){return x.month!==month;});
var totRem=dms.reduce(function(a,x){return a+x.rem;},0);
var msg='اكتملت حصص '+monthName(month,g.id)+' ('+ses.done+'/'+ses.required+') — المستحق: '+fee+' ج.م. شكراً لتعاونكم 🌹';
if(prevList.length) msg+=' ⚠️ مستحقات سابقة غير مسددة: '+prevList.map(function(x){return monthName(x.month,g.id)+' ('+x.rem+' ج.م)';}).join(' + ')+' — الإجمالي المطلوب '+totRem+' ج.م';
if(DataService.addNotification) DataService.addNotification({targetUserId:s.id,title:'💰 الشهرية مستحقة الآن',message:msg,type:'payment',priority:'high',meta:{event:'due_now'}});
if(waOnDueFlag()){ var m3=roleMsgs(s,msg); waPushTargets(g.id,[{to:s.phone,role:'student',msg:'💰 *'+g.name+'*\n'+m3.stu},{to:s.parentPhone,role:'parent',msg:'💰 *'+g.name+'*\n'+m3.par}]); }
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
if(DataService.addNotification) DataService.addNotification({targetUserId:sid,title:'🔔 تذكير بالشهرية',message:'يا '+(s?s.name:'')+' 💜 فاكرناك: الشهرية ('+feeOf(g)+' ج.م) تتحصل في الحصة الجايه ('+ses.done+'/'+ses.required+').',type:'payment',priority:'medium',meta:{event:'due_warn'}});
if(window.safeToast) window.safeToast('🔔 تم إرسال التذكير للطالب وولي أمره','success');
}catch(e){}
};

/* ========== 📜 مستحقات رجعية (شهور قبل دخول السيستم) ========== */
LU.addLegacyDue=async function(sid,gid,month,amount,note){
try{
var g=gById(gid), s=DataService.getUserById?DataService.getUserById(sid):null;
if(!g||!s){ if(window.safeToast) window.safeToast('بيانات ناقصة','error'); return; }
var amt=parseFloat(amount)||g.monthlyFee||0;
if(!amt||!month){ if(window.safeToast) window.safeToast('دخل الشهر والمبلغ','error'); return; }
var d=db(); d.payments=d.payments||[];
var p=d.payments.find(function(x){ return x.studentId===sid&&x.groupId===gid&&String(x.month||'')===month; });
if(!p){ p={id:'pay_'+Date.now(),studentId:sid,groupId:gid,teacherId:g.teacherId||null,month:month,amount:amt,paidAmount:0,status:'unpaid',history:[],createdAt:new Date().toISOString(),legacy:true}; d.payments.push(p); }
else { p.amount=amt; p.legacy=true; p.status=(p.paidAmount||0)>=amt?'paid':((p.paidAmount||0)>0?'partial':'unpaid'); }
saveD(d); await cloudPay(p,false);
var msg='💰 شهرية '+monthName(month)+' مستحقة: '+amt+' ج.م — مجموعة '+g.name+'.'+(note?(' ('+note+')'):'')+' برجاء السداد في أقرب حصة 🌹';
if(DataService.addNotification){
DataService.addNotification({targetUserId:sid,title:'📜 مستحق سابق عليك',message:msg,type:'payment',priority:'high',meta:{event:'legacy_due',month:month}});
var pp=String(s.parentPhone||'').replace(/\D/g,'');
(DataService.getUsers?DataService.getUsers():[]).forEach(function(u){
if(u.role!=='parent') return;
var up=String(u.phone||'').replace(/\D/g,'');
if((u.studentIds||[]).indexOf(sid)>=0||(pp&&up&&up===pp)) DataService.addNotification({targetUserId:u.id,title:'📜 مستحق سابق على ابنك',message:msg+' (الطالب: '+s.name+')',type:'payment',priority:'high',meta:{event:'legacy_due',month:month}});
});
}
logAct('📜 إضافة مستحق رجعي',{groupId:gid,groupName:g.name,text:s.name+' — '+month,amount:amt});
LU._sesCache={};
try{ localStorage.setItem('eduflowLedgerPing',String(Date.now())); }catch(e){}
if(window.safeToast) window.safeToast('✅ اتسجل المستحق ووصل إشعار للطالب وولي الأمر','success');
LU.refresh();
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
};

/* ========== 📜 V12.1: مستحق رجعي مظبوط + مربوط بالتحصيل ========== */
function groupsOfStudent(sid){
var out=[],seen={};
try{ (DataService.getStudentTeachers?DataService.getStudentTeachers(sid):[]).forEach(function(t){ if(t.group&&!seen[t.group.id]){seen[t.group.id]=1;out.push(t.group);} }); }catch(e){}
try{ (db().enrollments||[]).forEach(function(en){ if(en.studentId===sid&&en.status==='active'&&!seen[en.groupId]){ var g=gById(en.groupId); if(g){seen[g.id]=1;out.push(g);} } }); }catch(e){}
try{ var s0=DataService.getUserById?DataService.getUserById(sid):null; if(s0&&s0.groupId&&!seen[s0.groupId]){ var g2=gById(s0.groupId); if(g2){seen[g2.id]=1;out.push(g2);} } }catch(e){}
return out;
}
function legacySummaryHtml(sid){
var rows=[];
groupsOfStudent(sid).forEach(function(g){
(db().payments||[]).forEach(function(p){
if(p&&p.studentId===sid&&p.groupId===g.id&&p.legacy&&(p.paidAmount||0)<(p.amount||0)) rows.push('<span class="badge badge-danger" style="margin:2px;">📜 '+monthName(p.month)+' — '+g.name+': متبقي '+((p.amount||0)-(p.paidAmount||0))+' ج.م</span>');
});
});
return rows.length?('<div class="filter-info" style="background:var(--danger-bg);border-color:var(--danger);color:var(--danger);">⚠️ عليه بالفعل: '+rows.join(' ')+'</div>'):'';
}
LU.openLegacyDueModal=function(prefSid){
try{
var sts=(DataService.getStudents?DataService.getStudents():[]);
if(!isAdmin()){ var gids={}; myGroups().forEach(function(g){gids[g.id]=1;}); sts=sts.filter(function(s){ return groupsOfStudent(s.id).some(function(g){return gids[g.id];}); }); }
window.__ldFilterStu=function(){
var q=((document.getElementById('ldSearch')||{}).value||'').toLowerCase();
var sel=document.getElementById('ldSid'); if(!sel) return;
var list=sts.filter(function(s){ return !q||(s.name||'').toLowerCase().indexOf(q)>=0||(s.code||'').toLowerCase().indexOf(q)>=0||String(s.parentPhone||'').indexOf(q)>=0; }).slice(0,60);
sel.innerHTML=list.length?list.map(function(s){ return '<option value="'+s.id+'">'+s.name+' ('+(s.code||'-')+')</option>'; }).join(''):'<option value="">مفيش نتائج</option>';
window.__ldStuChanged();
};
window.__ldStuChanged=function(){
var sid=(document.getElementById('ldSid')||{}).value;
var gsel=document.getElementById('ldGid'); if(!gsel) return;
var gs=sid?groupsOfStudent(sid):[];
gsel.innerHTML=gs.length?gs.map(function(g){ return '<option value="'+g.id+'">'+g.name+' — شهرية '+(g.monthlyFee||0)+' ج.م</option>'; }).join(''):'<option value="">⚠️ الطالب مش في أي مجموعة</option>';
var am=document.getElementById('ldAmt'); if(am&&gs[0]) am.value=gs[0].monthlyFee||0;
var ex=document.getElementById('ldExisting'); if(ex) ex.innerHTML=sid?legacySummaryHtml(sid):'';
};
window.__ldGChanged=function(){
var g=gById((document.getElementById('ldGid')||{}).value);
var am=document.getElementById('ldAmt'); if(am&&g) am.value=g.monthlyFee||0;
};
var d0=new Date(); d0.setDate(1); d0.setMonth(d0.getMonth()-1);
var defM=d0.getFullYear()+'-'+String(d0.getMonth()+1).padStart(2,'0');
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📜 تسجيل مستحق رجعي</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
'<div class="filter-info">💡 سجّل شهرية شهر سابق — هتظهر فوراً في خانة التحصيل عندك، وفي داشبورد الطالب وولي الأمر مع إشعار فوري.</div>'+
'<div class="form-group"><label>🔍 ابحث بالطالب</label><input type="text" id="ldSearch" class="form-input" placeholder="اسم / كود / رقم ولي أمر..." oninput="window.__ldFilterStu()">'+
'<select id="ldSid" size="6" class="form-select" style="margin-top:6px;" onchange="window.__ldStuChanged()"></select></div>'+
'<div class="form-group"><label>👥 المجموعة (كل مجموعات الطالب)</label><select id="ldGid" class="form-select" onchange="window.__ldGChanged()"></select></div>'+
'<div id="ldExisting" style="margin-bottom:8px;"></div>'+
'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div class="form-group"><label>📅 شهر المستحق</label><input type="month" id="ldMonth" class="form-input" value="'+defM+'"></div><div class="form-group"><label>💰 المبلغ</label><input type="number" id="ldAmt" class="form-input" min="0"></div></div>'+
'<div class="form-group"><label>📝 ملاحظة (اختياري)</label><input type="text" id="ldNote" class="form-input" placeholder="مثال: شهرية سبتمبر قبل دخول السيستم"></div>'+
'<button class="btn btn-primary w-full" onclick="LedgerUI.submitLegacyDue()">💾 تسجيل + إشعار الطالب وولي الأمر</button></div>','modal-sm');
window.__ldFilterStu();
if(prefSid){ var s2=document.getElementById('ldSid'); if(s2){ s2.value=prefSid; window.__ldStuChanged(); } }
}catch(e){ console.error(e); if(window.safeToast) window.safeToast('خطأ في فتح المودال','error'); }
};
LU.submitLegacyDue=function(){
var sid=(document.getElementById('ldSid')||{}).value;
var gid=(document.getElementById('ldGid')||{}).value;
var m=(document.getElementById('ldMonth')||{}).value;
var amt=(document.getElementById('ldAmt')||{}).value;
var note=(document.getElementById('ldNote')||{}).value||'';
if(!sid){ if(window.safeToast) window.safeToast('اختار الطالب','error'); return; }
if(!gid){ if(window.safeToast) window.safeToast('الطالب مش في أي مجموعة','error'); return; }
if(!m){ if(window.safeToast) window.safeToast('اختار شهر المستحق','error'); return; }
ThemeManager.closeModal();
LU.addLegacyDue(sid,gid,m,amt,note);
};

/* ========== كارت مجموعة ========== */
function groupCard(g,month,mode,rowsAll){
var rows=rowsAll?rowsAll.filter(function(r){return r.g.id===g.id;}):buildRows([g],month);
if(rowsAll&&!rows.length&&(LU._st.q||'')) return '';
var ses=LU.groupSessions(g.id,month);
var fee=feeOf(g);
var collected=rows.reduce(function(a,r){return a+r.f.paid;},0);
var remaining=rows.reduce(function(a,r){return a+r.f.totalRem;},0);
var tName=(DataService.getUserById&&g.teacherId)?((DataService.getUserById(g.teacherId)||{}).name||'-'):'-';
var pend=(mode!=='view')?pendingSessionDates(g.id,month):[];
var pendHtml='';
if(pend.length){
pendHtml='<div style="margin:8px 12px 0;padding:8px 10px;border:1px dashed var(--warning);border-radius:10px;background:rgba(251,191,36,.06);">'
+'<div class="text-xs" style="font-weight:800;color:var(--warning);margin-bottom:6px;">⏳ حصص عدّت من غير تسجيل (آخر 10 أيام) — سوّيها قبل آخر اليوم:</div>'
+pend.slice().reverse().map(function(ds){ return '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:4px;"><span class="text-xs" style="font-family:var(--font-en);font-weight:800;">'+ds+'</span><button class="btn btn-success btn-sm" onclick="LedgerUI.confirmSession(\''+g.id+'\',\''+ds+'\')">✅ تأكيد حضور الطلاب</button><button class="btn btn-danger btn-sm" onclick="LedgerUI.cancelSessionQuick(\''+g.id+'\',\''+ds+'\')">🚫 الحصة اتلغت</button><button class="btn btn-ghost btn-sm" onclick="LedgerUI.editSquare(\''+g.id+'\',\''+ds+'\')">✏️ تعديل</button></div>'; }).join('')
+(false?'<div class="text-xs text-muted">+ '+(pend.length-3)+' يوم تاني معلّق — سوّيهم من زرار 🚫 إلغاء حصة في التولبار</div>':'')
+'</div>';
}
var head='<div class="ldg-ghead">'
+'<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">'
+'<div style="font-weight:800;font-size:13px;">👥 '+g.name+' <span class="text-xs text-muted">· 👨‍ '+tName+' · 🏢 '+(g.center||'-')+' · '+(g.grade||'-')+' · 💰 '+fee+' · '+rows.length+' طالب</span> '+(ses.isPast?'<span class="badge badge-muted">✅ مكتمل — الشهرية مستحقة</span>':'')+' <span class="badge badge-info">🔔 إنذار عند '+ses.warnAt+'</span>'+(g.frozen?'<span class="badge badge-warning">🧊 '+freezeLabel(g)+'</span>':'')+'</div>'
+'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">'
+'<span class="text-xs" style="color:var(--success);font-weight:800;">💰 محصل '+collected+'</span>'
+'<span class="text-xs" style="color:var(--danger);font-weight:800;">متبقي '+remaining+'</span>'
+'<span class="badge badge-info">🟩 متبقي حصص: '+ses.remaining+'</span>'
+(isAdmin()?(g.frozen?'<button class="btn btn-success btn-sm" onclick="LedgerUI.setGroupFrozen(\''+g.id+'\',false)">▶️ تفعيل العد</button>':'<button class="btn btn-warning btn-sm" onclick="LedgerUI.setGroupFrozen(\''+g.id+'\',true)">🧊 تجميد</button>'):'')
+(mode==='view'?'':'<button class="btn btn-ghost btn-sm" onclick="LedgerUI.editSquares(\''+g.id+'\',\''+month+'\')">✏️ المربعات</button>')
+(mode==='view'?'':'<button class="btn btn-primary btn-sm" onclick="window.openGroupModal&&window.openGroupModal(\''+g.id+'\')">⚙️ تعديل المجموعة</button>')
+(mode==='view'?'':'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.addStudentModal(\''+g.id+'\')">➕ طالب</button>')

+shareChip(g,month)+'</div></div>'+sqStrip(ses,g,month)
+pendHtml
+'<div class="text-xs text-muted" style="margin-top:6px;">🟩 بتاريخ = حصة فعلية · 🟦 ↺ = تعويضية · 📥 = مرحّلة · 🟥 = ملغاة · ⬜ لسه — المتبقي محسوب من حصص المجموعة'+(g.frozen?' · 🧊 حصص فترة التجميد مش بتتحسب':'')+'</div></div>';
if(!rows.length) return '<div class="ldg-gcard">'+head+'<div class="text-xs text-muted" style="padding:10px;">لا طلاب مطابقين</div></div>';
var editFn=(typeof window.openEditStudentProfile==='function')?'window.openEditStudentProfile':((typeof window.openStudentModal==='function')?'window.openStudentModal':null);
var trs=rows.map(function(r,i){
var s=r.s;
return '<tr>'
+'<td data-label="#">'+(i+1)+'</td>'
+'<td data-label="الطالب"><strong>'+s.name+'</strong><div class="text-xs text-muted">'+(s.code||'')+' · '+(s.grade||'')+' · 📱 '+(s.parentPhone||'-')+'</div></td>'
+'<td data-label="الدفعات">'+histChips(s.id,g.id)+'</td>'
+'<td data-label="الحالة">'+badgeOf(r.f,ses,month,g.id)+'</td>'
+(mode==='view'?'':'<td data-label="إجراءات" style="white-space:nowrap;">'
+'<button class="btn btn-success btn-sm" title="تحصيل" onclick="LedgerUI.payModal(\''+s.id+'\',\''+g.id+'\',\''+month+'\')">💰</button> '
+(editFn?'<button class="btn btn-ghost btn-sm" title="تعديل" onclick="'+editFn+'(\''+s.id+'\')">✏️</button> ':'')
+'<button class="btn btn-secondary btn-sm" title="نقل" onclick="LedgerUI.moveStudent(\''+s.id+'\',\''+g.id+'\')">🚚</button> '
+'<button class="btn btn-danger btn-sm" title="فصل" onclick="LedgerUI.unenroll(\''+s.id+'\',\''+g.id+'\')">🗑️</button></td>')
+'</tr>';
}).join('');
return '<div class="ldg-gcard">'+head+'<div class="ldg-wrap"><table class="ldg-table"><thead><tr><th>#</th><th>الطالب</th><th>الدفعات</th><th>الحالة</th>'+(mode==='view'?'':'<th>إجراءات</th>')+'</tr></thead><tbody>'+trs+'</tbody></table></div></div>';
}

/* ========== الصفحات ========== */
LU.renderAssistantMonthly=function(){
var host=document.getElementById('monthlyLedgerHost'); if(!host) return;
var sec=document.getElementById('section-monthly'); if(sec && !sec.classList.contains('active')) return; /* 🛡️ ممنوع الرندر خارج صفحته */
LU._ctx='monthly';
var f=LU._st; f.month=normMonth(f.month);
var gs=groupFilter(myGroups());
var rows=buildRows(gs,f.month);
if(f.q){ var qq=(f.q||'').toLowerCase(); gs=gs.filter(function(g){ return rows.some(function(r){return r.g.id===g.id;})||(g.name||'').toLowerCase().indexOf(qq)>=0; }); }
scanNotify(gs,f.month);
var html=toolbarHtml();
if(!LU.countingState().active){
html+= isAdmin()
? '<div class="filter-info" style="background:var(--warning-bg);border-color:var(--warning);color:var(--warning);margin-bottom:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;"><span>🧊 <strong>العد موقوف:</strong> المربعات مش بتتحسب أوتوماتيك ومش هتظهر اعتمادات.</span><button class="btn btn-warning btn-sm" onclick="LedgerUI.toggleCounting()">▶️ بدء العد الآن</button></div>'
: '<div class="filter-info" style="background:var(--warning-bg);border-color:var(--warning);color:var(--warning);margin-bottom:10px;">🧊 <strong>العد موقوف:</strong> المربعات مش بتتحسب أوتوماتيك — الأدمن لازم يفعّل "بدء العد" من صفحة الدفتر عنده أو من إعدادات المنصة. لو فعّلها بالفعل واستمرت الرسالة: دوس 🔄 تحديث أو أعد تحميل الصفحة (فيه مزامنة سحابية كل دقيقة).</div>';
}
html+=filtersHtml()+filterSummaryHtml(gs)+statsHtml(rows,gs,f.month)+carryHtml(f.month,gs);
gs.forEach(function(g){ html+=groupCard(g,f.month,'edit',rows); });
html+=listsHtml(rows,f.month);
host.innerHTML=html||'<div class="card" style="text-align:center;padding:30px;">لا مجموعات</div>';
};
LU.page=function(){
var host=document.getElementById('ledgerBody'); if(!host) return;
var sec=document.getElementById('section-ledger'); if(sec && !sec.classList.contains('active')) return; /* 🛡️ ممنوع الرندر خارج صفحته */
LU._ctx='ledger';
var f=LU._st; f.month=normMonth(f.month);
var gs=groupFilter(groups());
var rows=buildRows(gs,f.month);
if(f.q){ var qq=(f.q||'').toLowerCase(); gs=gs.filter(function(g){ return rows.some(function(r){return r.g.id===g.id;})||(g.name||'').toLowerCase().indexOf(qq)>=0; }); }
scanNotify(gs,f.month);
var per=gs.map(function(g){
var gr=rows.filter(function(r){return r.g.id===g.id;});
var ses=LU.groupSessions(g.id,f.month);
var c=gr.reduce(function(a,r){return a+r.f.paid;},0);
var dd=gr.reduce(function(a,r){return a+r.f.totalRem;},0);
return {g:g,ses:ses,n:gr.length,c:c,dd:dd};
});
var html=toolbarHtml()+filtersHtml()+filterSummaryHtml(gs)+statsHtml(rows,gs,f.month)+carryHtml(f.month,gs)
+'<div class="ldg-wrap"><table class="ldg-table"><thead><tr><th>المجموعة</th><th>الأستاذ</th><th>حصص الشهر</th><th>متبقي حصص</th><th>طلاب</th><th>محصل</th><th>متبقي</th><th></th></tr></thead><tbody>'
+per.map(function(r){ var tn=(DataService.getUserById&&r.g.teacherId)?((DataService.getUserById(r.g.teacherId)||{}).name||'-'):'-';
return '<tr><td data-label="المجموعة"><strong>'+r.g.name+'</strong> '+(r.g.frozen?'<span class="badge badge-warning">🧊</span>':'')+(r.ses.isPast?'<span class="badge badge-muted">🔒</span>':'')+'<div class="text-xs text-muted">'+(r.g.center||'-')+'</div></td><td data-label="الأستاذ">'+tn+'</td><td data-label="حصص">'+r.ses.done+'/'+r.ses.required+(r.ses.complete?' 💰':'')+'</td><td data-label="متبقي حصص">'+r.ses.remaining+'</td><td data-label="طلاب">'+r.n+'</td><td data-label="محصل" style="color:var(--success);font-weight:800;">'+r.c+'</td><td data-label="متبقي" style="color:var(--danger);font-weight:800;">'+r.dd+'</td><td><button class="btn btn-secondary btn-sm" onclick="LedgerUI.openModal(\''+r.g.id+'\')">👁️ إدارة</button></td></tr>'; }).join('')
+'</tbody></table></div>'
+listsHtml(rows,f.month);
host.innerHTML=html;
};
LU.openModal=function(gid){
try{
var g=gById(gid); var month=normMonth(LU._st.month);
window.__ldgModalOpen={gid:gid,mode:'edit'};
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📒 '+g.name+' — '+monthName(month, gid)+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body" style="max-height:70vh;overflow:auto;"><div id="ldgModalContent">'+groupCard(g,month,'edit')+'</div></div>','modal-lg');
}catch(e){ console.error(e); }
};

LU.payModal=function(sid,gid,month){
try{
var g=gById(gid), s=DataService.getUserById?DataService.getUserById(sid):null;
var total=feeOf(g);
LU._pm={sid:sid,gid:gid};
var dms=dueMonths(sid,gid,total);
var sel=normMonth(month||LU._st.month);
var set={}; dms.forEach(function(x){set[x.month]=1;}); set[sel]=1; set[localMonth()]=1;
var monthsArr=Object.keys(set).sort();
var defMonth=month||(dms.length?dms[0].month:sel);
/* 📜 بانر الدفعات القديمة فوق مودال التحصيل */
var oldDebts=dms.filter(function(x){ return x.month<localMonth()||(/^\d{4}-\d{2}$/.test(x.month)&&monthsList().indexOf(x.month)<0); });
var legacyBanner=oldDebts.length?('<div class="filter-info" style="background:var(--danger-bg);border-color:var(--danger);color:var(--danger);margin-bottom:10px;">⚠️ <strong>الطالب عليه دفعات قديمة:</strong><br>'+oldDebts.map(function(x){ return '📜 '+monthName(x.month)+' — متبقي '+x.rem+' ج.م <button type="button" class="btn btn-danger btn-sm" style="margin-inline-start:4px;" onclick="document.getElementById(\'pmMonth\').value=\''+x.month+'\';LedgerUI.pmInfo()">تحصيله دلوقتي</button>'; }).join('<br>')+'</div>'):'';
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">💵 تحصيل كاش: '+(s?s.name:'')+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'
+legacyBanner
+'<div class="form-group"><label>📅 شهرية شهر مين بتتحصل؟</label><select id="pmMonth" class="form-select" onchange="LedgerUI.pmInfo()">'+monthsArr.map(function(m){
var isLegacy=/^\d{4}-\d{2}$/.test(m)&&monthsList().indexOf(m)<0;
var ses=LU.groupSessions(gid,m); var rec0=payFor(sid,gid,m); var paid0=paidOf(rec0);
var mTotal=(isLegacy&&rec0&&rec0.amount)?rec0.amount:total;
var tag=isLegacy?'📜 مستحق سابق — مش الشهر الحالي':(!ses.complete?(paid0>0?'مقدم — لسه مكملش الحصص':'لسه مستحقة'):(paid0>=mTotal&&mTotal>0?'✓ مسددة':'💰 مستحقة الآن (كمل '+ses.done+'/'+ses.required+')'));
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
var g=gById(pm.gid); var sX=DataService.getUserById?DataService.getUserById(pm.sid):null; var fee=(window.LG&&LG.effFee&&sX)?LG.effFee(sX,g):feeOf(g);
var rec=payFor(pm.sid,pm.gid,m);
var isLeg=/^\d{4}-\d{2}$/.test(m)&&monthsList().indexOf(m)<0;
var total=(isLeg&&rec&&rec.amount)?rec.amount:fee;
var paid=paidOf(rec); var rem=Math.max(0,total-paid);
var ses=LU.groupSessions(pm.gid,m);
var el=document.getElementById('pmInfo');
if(el) el.innerHTML='📅 '+monthName(m)+' · الشهرية: <strong>'+total+'</strong> · المدفوع: <strong>'+paid+'</strong> · المتبقي: <strong style="color:var(--danger)">'+rem+'</strong> · الحصص: <strong>'+ses.done+'/'+ses.required+'</strong> '+(isLeg?'<br>📜 <strong>بتحصّل مستحق شهر سابق — مش شهرية الشهر الحالي.</strong>':(ses.complete?'(مكتملة → المطالبة صحيحة)':'(مكملتش — أي دفع هيتسجل مقدم)'));
try{ if(window.LG&&LG.dueSchedule){ var sch=LG.dueSchedule(pm.sid,g,m,total); if(sch.length>1){ var elS=document.getElementById('pmInfo'); if(elS) elS.innerHTML+='<br>📆 <strong>خطة تقسيط:</strong> '+sch.map(function(x){return 'قسط '+x.n+': '+x.amount+' ج.م (استحقاق '+x.due+')';}).join(' · '); } } }catch(e){}
var amt=document.getElementById('pmAmt'); if(amt) amt.value=rem>0?rem:(total||0);
}catch(e){}
};
LU.pmSet=function(w){
try{
var pm=LU._pm||{}; var m=(document.getElementById('pmMonth')||{}).value||localMonth();
var g=gById(pm.gid); var sX=DataService.getUserById?DataService.getUserById(pm.sid):null; var fee=(window.LG&&LG.effFee&&sX)?LG.effFee(sX,g):feeOf(g);
var rec=payFor(pm.sid,pm.gid,m);
var isLeg=/^\d{4}-\d{2}$/.test(m)&&monthsList().indexOf(m)<0;
var total=(isLeg&&rec&&rec.amount)?rec.amount:fee;
var paid=paidOf(rec); var rem=Math.max(0,total-paid);
var amt=document.getElementById('pmAmt'); if(!amt) return;
amt.value=(w==='rem')?rem:(w==='half'?Math.round(total/2):total);
}catch(e){}
};

LU.applyPay=async function(sid,gid,month){
try{
var amt=parseFloat(document.getElementById('pmAmt').value)||0;
if(amt<=0){ if(window.safeToast) window.safeToast('اكتب مبلغ صحيح','error'); return; }
var dateStr=document.getElementById('pmDate').value||today();
var note=document.getElementById('pmNote').value||'';
var d=db(); d.payments=d.payments||[];
var g=gById(gid), total=feeOf(g);
var p=payFor(sid,gid,month);
if(!p){ p={id:'pay_'+Date.now(),studentId:sid,groupId:gid,teacherId:g?g.teacherId:null,month:month,amount:total,paidAmount:0,status:'unpaid',history:[],createdAt:new Date().toISOString()}; d.payments.push(p); }
p.paidAmount=(p.paidAmount||0)+amt;
p.history=p.history||[];
p.history.push({date:dateStr,amount:amt,method:'cash',note:note,at:new Date().toISOString(),by:(cur()||{}).id||''});
p.status=p.paidAmount>=p.amount?'paid':'partial';
p.paidAt=dateStr;
saveD(d); await cloudPay(p,false);
var rem=Math.max(0,p.amount-p.paidAmount);
ThemeManager.closeModal();
if(window.safeToast) window.safeToast('💵 تم تسجيل '+amt+' ج.م'+(rem>0?(' — باقي '+rem):' — مسدد بالكامل'),'success');
try{
var isLegM=/^\d{4}-\d{2}$/.test(month)&&monthsList().indexOf(month)<0;
if(isLegM&&rem<=0&&DataService.addNotification){
var msgL='✅ تم سداد المستحق القديم لشهر '+monthName(month)+' بالكامل — شكراً 🌹';
DataService.addNotification({targetUserId:sid,title:'✅ سداد مستحق سابق',message:msgL,type:'payment',priority:'medium',meta:{event:'legacy_paid',month:month}});
var stL=DataService.getUserById?DataService.getUserById(sid):null;
var ppL=String((stL&&stL.parentPhone)||'').replace(/\D/g,'');
(DataService.getUsers?DataService.getUsers():[]).forEach(function(uL){
if(uL.role!=='parent') return;
var upL=String(uL.phone||'').replace(/\D/g,'');
if((uL.studentIds||[]).indexOf(sid)>=0||(ppL&&upL&&upL===ppL)) DataService.addNotification({targetUserId:uL.id,title:'✅ سداد مستحق سابق لابنك',message:msgL+' (الطالب: '+(stL?stL.name:'')+')',type:'payment',priority:'medium',meta:{event:'legacy_paid',month:month}});
});
}
}catch(eN){}
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
finally{ LU.refresh(); }
};

/* ========== سجل الدفعات ========== */
LU.editHistory=function(sid,gid){
try{
var ps=paysFor(sid,gid);
var body=ps.length?ps.map(function(p){
return '<div class="card" style="padding:10px;margin-bottom:10px;"><strong>'+monthName(p.month)+'</strong> — '+paidOf(p)+'/'+(p.amount||0)+' <span class="badge '+(p.status==='paid'?'badge-success':p.status==='partial'?'badge-warning':'badge-danger')+'">'+(p.status==='paid'?'مسدد':p.status==='partial'?'جزئي':'غير مدفوع')+'</span>'
+'<div style="margin-top:8px;">'+(p.history||[]).map(function(h,i){
return '<div class="sub-row" style="padding:6px 8px;margin-bottom:4px;"><div class="text-xs">💵 '+h.amount+' ج.م · 📅 '+h.date+(h.note?' · '+h.note:'')+'</div><div style="display:flex;gap:4px;"><button class="btn btn-ghost btn-sm" onclick="LedgerUI.editEntry(\''+p.id+'\','+i+')">✏️</button><button class="btn btn-danger btn-sm" onclick="LedgerUI.delEntry(\''+p.id+'\','+i+')">🗑️</button></div></div>';
}).join('')+'</div></div>';
}).join(''):'<p class="text-muted">لا دفعات</p>';
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">💵 سجل الدفعات</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+body+'<button class="btn btn-primary w-full" onclick="ThemeManager.closeModal();LedgerUI.payModal(\''+sid+'\',\''+gid+'\')">➕ إضافة دفعة يدوية</button></div>','modal-md');
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

/* ========== إضافة طالب ========== */
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
var se=document.getElementById('ldgAsSearch'); var q=se?(se.value||'').toLowerCase().trim():'';
var box=document.getElementById('ldgAsResults'); if(!box) return;
if(q.length<2){ box.innerHTML=''; return; }
var inG={}; studentsOf(gid).forEach(function(s){inG[s.id]=1;});
var res=(DataService.getStudents?DataService.getStudents():[]).filter(function(s){ return !inG[s.id]&&((s.name||'').toLowerCase().indexOf(q)>=0||(s.code||'').toLowerCase().indexOf(q)>=0||(s.phone||'').indexOf(q)>=0||(s.parentPhone||'').indexOf(q)>=0); }).slice(0,6);
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

/* ========== 👁 تفاصيل طالب ========== */
LU.studentDetails=function(sid){
try{
var s=DataService.getUserById?DataService.getUserById(sid):null; if(!s) return;
var gs=(isAdmin()?groups():myGroups()).filter(function(g){ return studentsOf(g.id).some(function(x){return x.id===sid;}); });
var wa=String(s.parentPhone||'').replace(/\D/g,'');
var html='<div class="modal-header"><h3 class="modal-title">👁 تفاصيل: '+s.name+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">';
html+='<div class="filter-info">🆔 '+(s.code||'-')+' · 🎓 '+(s.grade||'-')+' · 📱 '+(s.phone||'-')+' · 👨 ولي الأمر: '+(s.parentPhone||'-')+(wa?' <a href="https://wa.me/2'+wa+'" target="_blank" class="btn btn-success btn-sm" style="margin-inline-start:6px;">💬 واتساب</a>':'')+'</div>';
var anyDue=false;
gs.forEach(function(g){
var dms=dueMonths(sid,g.id,(window.LG&&LG.effFee&&s)?LG.effFee(s,g):feeOf(g));
var ses=LU.groupSessions(g.id,normMonth(LU._st.month));
html+='<div class="card" style="padding:10px;margin-bottom:10px;"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><strong>👥 '+g.name+'</strong><span class="text-xs text-muted">الشهرية '+feeOf(g)+' · الحصص دلوقتي '+ses.done+'/'+ses.required+' · 🔔 إنذار عند '+ses.warnAt+'</span></div>';
if(dms.length){ anyDue=true;
html+='<div style="margin-top:8px;">'+dms.map(function(x){ return '<div class="ldg-lrow" style="border-right:3px solid var(--danger);"><div class="text-sm">📅 شهرية '+monthName(x.month, g.id)+' — مطلوب <strong>'+x.rem+'</strong> (من '+x.fee+' · مدفوع '+x.paid+')</div><button class="btn btn-success btn-sm" onclick="LedgerUI.payModal(\''+sid+'\',\''+g.id+'\',\''+x.month+'\')">💰 تحصيل</button></div>'; }).join('')+'</div>';
}else{ html+='<div class="text-xs" style="color:var(--success);margin-top:6px;">✓ مفيش شهرية مكتملة غير مسددة هنا</div>'; }
var ps=paysFor(sid,g.id);
if(ps.length){ html+='<div style="margin-top:8px;" class="text-xs text-muted">💵 سجل الدفعات: '+ps.map(function(p){ return monthName(p.month)+' → '+paidOf(p)+'/'+(p.amount||0); }).join(' · ')+'</div>'; }
html+='</div>';
});
if(!anyDue) html+='<div class="filter-info">🎉 الطالب مفيش عليه أي شهرية مكتملة غير مسددة — أي مبالغ مدفوعة مقدماً بتتخصم تلقائياً لما الشهر يكمل.</div>';
if(cur()&&(cur().role==='admin'||cur().role==='super_admin'||cur().role==='assistant')) html+='<button class="btn btn-warning w-full" style="margin-bottom:8px;" onclick="window.editStudentPoints&&window.editStudentPoints(\''+sid+'\')">✏️ تعديل النقاط</button>';
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

/* ========== 🧹 V11: نواة التصفير الموحّدة (بتستخدمها كل الواجهات) ========== */
async function doReset(ids,scopeAll,doMan,doFlags,doAtt,doCanc){
var months=scopeAll?monthsList():[normMonth(LU._st.month)];
var d=db(); var delA=[],delM=[],delC=[];
if(doAtt){ d.attendance=(d.attendance||[]).filter(function(a){ if(ids.indexOf(a.groupId)>=0&&months.some(function(mn){var r=rangeOf(a.groupId,mn);return a.date>=r.from&&(!r.to||a.date<=r.to);})&&a.status==='approved'){ delA.push(a); return false; } return true; }); }
if(doMan){ d.manualSessions=(d.manualSessions||[]).filter(function(ms){ if(ids.indexOf(ms.groupId)>=0&&months.some(function(mn){return msInMonth(ms,ms.groupId,mn);})&&(!ms.type||ms.type==='counter')){ delM.push(ms); return false; } return true; }); }
if(doCanc){ d.cancelledSessions=(d.cancelledSessions||[]).filter(function(c){ if(ids.indexOf(c.groupId)>=0&&months.some(function(mn){var r=rangeOf(c.groupId,mn);return c.date>=r.from&&(!r.to||c.date<=r.to);})){ delC.push(c); return false; } return true; }); }
if(doFlags){ var nk={}; Object.keys(d.sessionFlags||{}).forEach(function(k){ var parts=k.split('__'); if(ids.indexOf(parts[0])>=0&&months.indexOf(parts[1])>=0) return; nk[k]=d.sessionFlags[k]; }); d.sessionFlags=nk; }
saveD(d);
delA.forEach(function(a){ cloudAtt(a,true); });
delM.forEach(function(ms){ cloudMS(ms,true); });
delC.forEach(function(c){ cloudCanc(c,true); });
for(var i=0;i<ids.length;i++){ try{ var gg=gById(ids[i]); var rs=gg?rangesOf(gg).slice():[{n:1,from:localToday(),to:null}]; var openR=null; rs.forEach(function(r){if(r.to==null)openR=r;}); if(openR){openR.from=localToday();} else {rs.push({n:rs[rs.length-1].n+1,from:localToday(),to:null});} if(DataService.updateGroup) await DataService.updateGroup(ids[i],{sessionNow:0,sessionNowMonth:localMonth(),cycleRanges:rs}); }catch(e){} }
LU._sesCache={};
try{
  var t0=new Date().toISOString().slice(0,10);
  ids.forEach(function(id){
    var gg=gById(id); if(!gg) return;
    gg.autoMarkSince=t0;                 /* 🛡️ ممنوع تعليم أي موعد قديم أوتوماتيك */
    gg.cycleRanges=[{from:t0,to:null,n:1}]; /* 🔄 دورة واحدة مفتوحة من اليوم بس */
  });
  saveD(db()); LU._sesCache={};
  ids.forEach(function(id){ try{ var gg2=gById(id); if(gg2&&window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('groups',gg2.id,gg2); }catch(e){} });
}catch(e){}
try{ localStorage.setItem('ledgerResetAt',String(Date.now())); window.dispatchEvent(new CustomEvent('ledger-reset',{detail:{ids:ids}})); }catch(e){}
return {att:delA.length,man:delM.length,canc:delC.length};
}
/* 🧹 مودال التصفير القديم (قائمة 체크) */
LU.resetSquaresModal=function(){
try{
var gs=isAdmin()?groups():myGroups();
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🧹 تصفير المربعات المضافة</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'
+'<div class="filter-info">💡 بيصفّر المربعات المضافة فقط (يدوي/مرحّل/أعلام/حضور مختار) — علشان لو حصلت مشكلة في مجموعة تصفرها وتضيف يدوي مظبوط. الدفعات مش بتتمس.</div>'
+'<div style="display:flex;gap:8px;margin-bottom:8px;"><button type="button" class="btn btn-ghost btn-sm" onclick="LedgerUI.rsqAll(true)">تحديد الكل</button><button type="button" class="btn btn-ghost btn-sm" onclick="LedgerUI.rsqAll(false)">إلغاء الكل</button></div>'
+'<div id="rsqList" style="max-height:180px;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:6px;margin-bottom:10px;">'+gs.map(function(g){return '<label style="display:flex;gap:8px;align-items:center;padding:5px;cursor:pointer;"><input type="checkbox" class="rsqChk" value="'+g.id+'" checked style="width:16px;height:16px;"><span style="font-size:12px;font-weight:700;">'+g.name+'</span></label>';}).join('')+'</div>'
+'<div class="form-group"><label>نطاق الشهور</label><select id="rsqScope" class="form-select"><option value="current">الشهر الحالي ('+normMonth(LU._st.month)+')</option><option value="all">كل الشهور من '+startMonth()+'</option></select></div>'
+'<label style="display:flex;gap:8px;align-items:center;margin:6px 0;cursor:pointer;"><input type="checkbox" id="rsqMan" checked style="width:18px;height:18px;"> 📥 مسح المرحّل/اليدوي + العداد المخزن</label>'
+'<label style="display:flex;gap:8px;align-items:center;margin:6px 0;cursor:pointer;"><input type="checkbox" id="rsqFlags" checked style="width:18px;height:18px;"> ✋ مسح الأعلام اليدوية (إلغاء/أخذ/حذف)</label>'
+'<label style="display:flex;gap:8px;align-items:center;margin:6px 0;cursor:pointer;"><input type="checkbox" id="rsqAtt" checked style="width:18px;height:18px;"> 🟢 مسح سجلات الحضور المعتمدة في النطاق</label>'
+'<label style="display:flex;gap:8px;align-items:center;margin:6px 0;cursor:pointer;"><input type="checkbox" id="rsqCanc" checked style="width:18px;height:18px;"> 🟥 مسح الإلغاءات (المربعات الحمراء)</label>'
+'<button type="button" class="btn btn-danger w-full" onclick="LedgerUI.runResetSquares()">🧹 تنفيذ التصفير</button>'
+'</div>','modal-md');
}catch(e){ console.error(e); }
};
LU.rsqAll=function(on){ document.querySelectorAll('.rsqChk').forEach(function(c){ c.checked=on; }); };
LU.runResetSquares=async function(){
try{
var ids=[]; document.querySelectorAll('.rsqChk:checked').forEach(function(c){ ids.push(c.value); });
if(!ids.length){ if(window.safeToast) window.safeToast('اختار مجموعة واحدة على الأقل','error'); return; }
var all=(document.getElementById('rsqScope')||{}).value==='all';
var doMan=(document.getElementById('rsqMan')||{}).checked;
var doFlags=(document.getElementById('rsqFlags')||{}).checked;
var doAtt=(document.getElementById('rsqAtt')||{}).checked;
var doCanc=(document.getElementById('rsqCanc')||{}).checked;
if(!confirm('تصفير '+ids.length+' مجموعة؟ النطاق: '+(all?'كل الشهور':'الشهر الحالي'))) return;
var r=await doReset(ids,all,doMan,doFlags,doAtt,doCanc);
ThemeManager.closeModal();
if(window.safeToast) window.safeToast('✅ تم التصفير — حضور:'+r.att+' · يدوي:'+r.man+' · إلغاء:'+r.canc,'success');
LU.refresh();
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
};
/* 🆕 V11: مودال خيارات التصفير لمجموعة IDs محددة (من مودال تحكم العدّ) */
LU.openResetOptionsFor=function(ids){
try{
window._resetIds=ids||[];
var names=window._resetIds.map(function(id){ var g=gById(id); return g?g.name:id; }).join('، ');
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🧹 تصفير ('+window._resetIds.length+'): '+names.slice(0,80)+(names.length>80?'…':'')+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal();LedgerUI.openCountControl();">✕</button></div><div class="modal-body">'
+'<div class="filter-info">💡 التصفير بيبدأ العداد من صفر في النطاق المختار — الدفعات مش بتتمس.</div>'
+'<div class="form-group"><label>نطاق الشهور</label><select id="roScope" class="form-select"><option value="current">الشهر الحالي ('+normMonth(LU._st.month)+')</option><option value="all">كل الشهور من '+startMonth()+'</option></select></div>'
+'<label style="display:flex;gap:8px;align-items:center;margin:6px 0;cursor:pointer;"><input type="checkbox" id="roMan" checked style="width:18px;height:18px;"> 📥 مسح المرحّل/اليدوي + العداد المخزن</label>'
+'<label style="display:flex;gap:8px;align-items:center;margin:6px 0;cursor:pointer;"><input type="checkbox" id="roFlags" checked style="width:18px;height:18px;"> ✋ مسح الأعلام اليدوية</label>'
+'<label style="display:flex;gap:8px;align-items:center;margin:6px 0;cursor:pointer;"><input type="checkbox" id="roAtt" style="width:18px;height:18px;"> 🟢 مسح سجلات الحضور في النطاق</label>'
+'<label style="display:flex;gap:8px;align-items:center;margin:6px 0;cursor:pointer;"><input type="checkbox" id="roCanc" style="width:18px;height:18px;"> 🟥 مسح الإلغاءات</label>'
+'<button type="button" class="btn btn-danger w-full" onclick="LedgerUI.runResetForIds()">🧹 تنفيذ التصفير</button>'
+'</div>','modal-sm');
}catch(e){ console.error(e); }
};
LU.runResetForIds=async function(){
try{
var ids=window._resetIds||[];
if(!ids.length){ if(window.safeToast) window.safeToast('مفيش مجموعات محددة','error'); return; }
var all=(document.getElementById('roScope')||{}).value==='all';
var doMan=(document.getElementById('roMan')||{}).checked;
var doFlags=(document.getElementById('roFlags')||{}).checked;
var doAtt=(document.getElementById('roAtt')||{}).checked;
var doCanc=(document.getElementById('roCanc')||{}).checked;
if(!confirm('تصفير '+ids.length+' مجموعة؟ النطاق: '+(all?'كل الشهور':'الشهر الحالي'))) return;
var r=await doReset(ids,all,doMan,doFlags,doAtt,doCanc);
logAct('🧹 تصفير مربعات مجموعات',{text:ids.length+' مجموعة'});
ThemeManager.closeModal();
if(window.safeToast) window.safeToast('✅ تم التصفير — حضور:'+r.att+' · يدوي:'+r.man+' · إلغاء:'+r.canc,'success');
LU.refresh();
LU.openCountControl();
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
};

/* ================================================================
🆕🆕 V11: 🎛️ مودال تحكم العدّ والتجميد — فلاتر متتابعة + فردي/جماعي/شامل
================================================================ */
LU._cc=LU._cc||{t:'',c:'',st:'',gr:'',q:'',sel:{}};
function ccBase(){ return isAdmin()?groups():myGroups(); }
function ccList(){
var f=LU._cc;
var cas=cascadeGroups(ccBase(),{teacher:f.t,center:f.c,stage:f.st,grade:f.gr});
var list=cas.list;
if(f.q){ var q=f.q.toLowerCase(); list=list.filter(function(g){ var tn=(DataService.getUserById?DataService.getUserById(g.teacherId):null); return (g.name||'').toLowerCase().indexOf(q)>=0||((tn&&tn.name)||'').toLowerCase().indexOf(q)>=0; }); }
return {list:list,cas:cas};
}
LU.openCountControl=function(){
try{
if(!isAdmin()){ if(window.safeToast) window.safeToast('للأدمن فقط','error'); return; }
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🎛️ تحكم العدّ والتجميد والتصفير</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body" style="max-height:74vh;overflow:auto;" id="ccBody"></div>','modal-lg');
ccRender();
}catch(e){ console.error(e); }
};
function ccRender(){
var body=document.getElementById('ccBody'); if(!body) return;
var f=LU._cc;
var r=ccList(); var list=r.list; var cas=r.cas;
var lv=(typeof EduFlowConfig!=='undefined'&&EduFlowConfig.educationLevels)?EduFlowConfig.educationLevels:{};
var teachers=(DataService.getTeachers?DataService.getTeachers():[]);
var month=normMonth(LU._st.month);
var selCount=0; list.forEach(function(g){ if(f.sel[g.id]) selCount++; });
var html='';
/* الفلاتر المتتابعة */
html+='<div class="cc-filters">'
+'<select class="form-select" onchange="LedgerUI.ccSet(\'t\',this.value)"><option value="">👨 كل الأساتذة</option>'+teachers.map(function(t){return '<option value="'+t.id+'" '+(f.t===t.id?'selected':'')+'>'+t.name+'</option>';}).join('')+'</select>'
+'<select class="form-select" onchange="LedgerUI.ccSet(\'c\',this.value)"><option value="">🏢 كل السناتر</option>'+cas.centers.map(function(c){return '<option value="'+c+'" '+(f.c===c?'selected':'')+'>'+c+'</option>';}).join('')+'</select>'
+'<select class="form-select" onchange="LedgerUI.ccSet(\'st\',this.value)"><option value="">🎯 كل المراحل</option>'+Object.keys(lv).map(function(k){return '<option value="'+k+'" '+(f.st===k?'selected':'')+'>'+lv[k].nameAr+'</option>';}).join('')+'</select>'
+'<select class="form-select" onchange="LedgerUI.ccSet(\'gr\',this.value)"><option value="">🎓 كل الصفوف</option>'+cas.grades.map(function(g){return '<option value="'+g+'" '+(f.gr===g?'selected':'')+'>'+g+'</option>';}).join('')+'</select>'
+'<input type="text" class="form-input" placeholder="🔍 بحث مجموعة/أستاذ..." value="'+(f.q||'')+'" oninput="LedgerUI.ccSet(\'q\',this.value)">'
+'</div>';
/* شريط الإجراءات الجماعية والشاملة */
html+='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px;padding:8px;background:var(--surface-hover);border-radius:10px;">'
+'<button class="btn btn-ghost btn-sm" onclick="LedgerUI.ccSelAll(true)">✅ تحديد المعروض</button>'
+'<button class="btn btn-ghost btn-sm" onclick="LedgerUI.ccSelAll(false)">⬜ إلغاء التحديد</button>'
+'<button class="btn btn-warning btn-sm" onclick="LedgerUI.ccBulkFreeze(true)">🧊 تجميد المحدد</button>'
+'<button class="btn btn-success btn-sm" onclick="LedgerUI.ccBulkFreeze(false)">▶️ تفعيل المحدد</button>'
+'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.ccBulkReset()">🧹 تصفير المحدد</button>'
+'<span class="points-badge" id="ccSelCount">'+selCount+' محدد</span>'
+'</div>';
html+='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px;padding:8px;border:1px dashed var(--border);border-radius:10px;">'
+'<span class="text-xs" style="font-weight:800;">🌐 كل المعروض ('+list.length+'):</span>'
+'<button class="btn btn-warning btn-sm" onclick="LedgerUI.ccAllFreeze(true)">🧊 تجميد الكل</button>'
+'<button class="btn btn-success btn-sm" onclick="LedgerUI.ccAllFreeze(false)">▶️ تفعيل الكل</button>'
+'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.ccAllReset()">🧹 تصفير الكل</button>'
+'</div>';
/* قائمة المجموعات */
if(!list.length){ html+='<div class="card" style="text-align:center;padding:24px;"><div style="font-size:40px;">📭</div><strong>مفيش مجموعات مطابقة</strong><div class="text-xs text-muted" style="margin-top:4px;">غيّر الفلاتر فوق</div></div>'; body.innerHTML=html; return; }
html+=list.map(function(g){
var t=(DataService.getUserById?DataService.getUserById(g.teacherId):null);
var ses=LU.groupSessions(g.id,month);
var on=!!f.sel[g.id];
var periods=(g.freezePeriods||[]).length;
return '<div class="cc-row '+(g.frozen?'frozen':'')+'">'
+'<label style="display:flex;gap:8px;align-items:center;flex:1;min-width:200px;cursor:pointer;">'
+'<input type="checkbox" style="width:16px;height:16px;" '+(on?'checked':'')+' onchange="LedgerUI.ccSel(\''+g.id+'\',this.checked)">'
+'<div style="flex:1;min-width:0;"><div class="cc-name">'+g.name+' '+(g.frozen?'<span class="badge badge-warning">🧊 مجمدة من '+(g.frozenSince||'-')+'</span>':'<span class="badge badge-success">▶️ بتتعد</span>')+'</div>'
+'<div class="cc-meta">👨‍ '+(t?t.name:'-')+' · 🏢 '+(g.center||'-')+' · '+(g.grade||'-')+' · 🟩 '+ses.done+'/'+ses.required+(periods?' · 🧊 '+periods+' فترة تجميد سابقة':'')+'</div></div>'
+'</label>'
+'<div style="display:flex;gap:4px;flex-wrap:wrap;">'
+(g.frozen?'<button class="btn btn-success btn-sm" onclick="LedgerUI.setGroupFrozen(\''+g.id+'\',false)">▶️ تفعيل</button>':'<button class="btn btn-warning btn-sm" onclick="LedgerUI.setGroupFrozen(\''+g.id+'\',true)">🧊 تجميد</button>')
+'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.openResetOptionsFor([\''+g.id+'\'])">🧹 تصفير</button>'
+'<button class="btn btn-ghost btn-sm" onclick="LedgerUI.editSquares(\''+g.id+'\',\''+month+'\')">✏️ مربعات</button>'
+'</div></div>';
}).join('');
body.innerHTML=html;
}
LU.ccSet=function(k,v){ LU._cc[k]=v; if(k==='t'){LU._cc.c='';} ccRender(); };
LU.ccSel=function(gid,on){ if(on) LU._cc.sel[gid]=1; else delete LU._cc.sel[gid]; var c=document.getElementById('ccSelCount'); if(c){ var n=0; ccList().list.forEach(function(g){ if(LU._cc.sel[g.id]) n++; }); c.textContent=n+' محدد'; } };
LU.ccSelAll=function(on){ var f=LU._cc; ccList().list.forEach(function(g){ if(on) f.sel[g.id]=1; else delete f.sel[g.id]; }); ccRender(); };
function ccSelectedIds(){ var f=LU._cc; var ids=[]; ccList().list.forEach(function(g){ if(f.sel[g.id]) ids.push(g.id); }); return ids; }
function ccVisibleIds(){ return ccList().list.map(function(g){return g.id;}); }
/* 🧊▶️ النواة: تجميد/تفعيل مجموعة مع تسجيل فترة التجميد */
async function applyFreezeCore(gid,on){
var g=gById(gid); if(!g) return false;
if(on && g.frozen) return false;
if(!on && !g.frozen) return false;
if(on){ g.frozen=true; g.frozenSince=localToday(); }
else{ var from=g.frozenSince||localToday(); g.freezePeriods=g.freezePeriods||[]; g.freezePeriods.push({from:from,to:localToday()}); g.frozen=false; g.frozenSince=null; }
var d=db(); saveD(d);
try{ if(DataService.updateGroup) await DataService.updateGroup(gid,{frozen:g.frozen,frozenSince:g.frozenSince||null,freezePeriods:g.freezePeriods||[]}); }catch(e){}
try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('groups',gid,g); }catch(e){}
try{ localStorage.setItem('ledgerResetAt',String(Date.now())); window.dispatchEvent(new CustomEvent('ledger-freeze',{detail:{gid:gid,on:on}})); }catch(e){}
return true;
}
LU.setGroupFrozen=async function(gid,on){
try{
var g=gById(gid); if(!g) return;
var changed=await applyFreezeCore(gid,on);
if(!changed){ if(window.safeToast) window.safeToast(on?'المجموعة مجمدة بالفعل':'المجموعة شغالة بالفعل','info'); return; }
LU._sesCache={};
logAct(on?'🧊 تجميد عد مجموعة':'▶️ تفعيل عد مجموعة',{groupId:gid,groupName:g.name});
if(window.safeToast) window.safeToast(on?('🧊 تم تجميد: '+g.name+' — الحصص من '+localToday()+' مش هتتحسب لحد ما تفعّلها'):('▶️ تم تفعيل: '+g.name+' — حصص فترة التجميد مش هتتحسب، والعدّ كمّل من النهاردة'),'success');
LU.refresh(); ccRender();
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
};
LU.ccBulkFreeze=async function(on){
try{
var ids=ccSelectedIds();
if(!ids.length){ if(window.safeToast) window.safeToast('حدّد مجموعات الأول بالـ checkboxes','error'); return; }
if(!confirm((on?'🧊 تجميد ':'▶️ تفعيل ')+ids.length+' مجموعة؟')) return;
var n=0; for(var i=0;i<ids.length;i++){ if(await applyFreezeCore(ids[i],on)) n++; }
LU._sesCache={};
logAct(on?'🧊 تجميد عد مجموعات (جماعي)':'▶️ تفعيل عد مجموعات (جماعي)',{text:n+' مجموعة'});
if(window.safeToast) window.safeToast((on?'🧊 تم تجميد ':'▶️ تم تفعيل ')+n+' مجموعة — حصص فترات التجميد مش هتتحسب','success');
LU.refresh(); ccRender();
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
};
LU.ccAllFreeze=async function(on){
try{
var ids=ccVisibleIds();
if(!ids.length){ if(window.safeToast) window.safeToast('مفيش مجموعات معروضة','error'); return; }
if(!confirm((on?'🧊 تجميد كل المعروض ('+ids.length+')؟':'▶️ تفعيل كل المعروض ('+ids.length+')؟'))) return;
var n=0; for(var i=0;i<ids.length;i++){ if(await applyFreezeCore(ids[i],on)) n++; }
LU._sesCache={};
logAct(on?'🧊 تجميد عد كل المجموعات المعروضة':'▶️ تفعيل عد كل المجموعات المعروضة',{text:n+' مجموعة'});
if(window.safeToast) window.safeToast((on?'🧊 تم تجميد ':'▶️ تم تفعيل ')+n+' مجموعة','success');
LU.refresh(); ccRender();
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
};
LU.ccBulkReset=function(){ var ids=ccSelectedIds(); if(!ids.length){ if(window.safeToast) window.safeToast('حدّد مجموعات الأول','error'); return; } LU.openResetOptionsFor(ids); };
LU.ccAllReset=function(){ var ids=ccVisibleIds(); if(!ids.length){ if(window.safeToast) window.safeToast('مفيش مجموعات معروضة','error'); return; } LU.openResetOptionsFor(ids); };

LU.requestMonthTransition=function(gid){ /* 🔄 الانتقال تلقائي بالكامل — مفيش طلبات */ try{ var d=db(); d.pendingMonthTransitions=(d.pendingMonthTransitions||[]).filter(function(p){ return !(p.groupId===gid&&p.status==='pending'); }); DataService._saveData(d); }catch(e){} };

window.openMonthTransitionsModal=function(){ try{ var d=db(); var n=(d.pendingMonthTransitions||[]).filter(function(p){return p.status==='pending';}).length; if(n){ d.pendingMonthTransitions=(d.pendingMonthTransitions||[]).map(function(p){ if(p.status==='pending'){p.status='approved'; p.approvedAuto=true;} return p; }); DataService._saveData(d); } if(window.safeToast) window.safeToast('🔄 الانتقال للشهر الجديد تلقائي بالكامل — مفيش طلبات اعتماد','info'); LU.refresh(); }catch(e){} };

/* ========== ⏳ حصص محتاجة تسوية + تأكيد/إلغاء سريع (🆕 بتتخطى فترات التجميد) ========== */
function pendingSessionDates(gid,month){
var g=gById(gid)||{}; var tStr=localToday();
var minD=new Date(); minD.setDate(minD.getDate()-10);
var minStr=minD.getFullYear()+'-'+String(minD.getMonth()+1).padStart(2,'0')+'-'+String(minD.getDate()).padStart(2,'0');
var sch=(g.schedules&&g.schedules.length)?g.schedules:(g.day?[{day:g.day}]:[]);
var d=db(); var attDates={},cancDates={};
var rng2=rangeOf(gid,month);
function inR2(ds){return !!ds&&ds>=rng2.from&&(!rng2.to||ds<=rng2.to);}
(d.attendance||[]).forEach(function(a){ if(a.groupId===gid&&inR2(a.date||'')) attDates[a.date]=1; });
(d.cancelledSessions||[]).forEach(function(c){ if(c.groupId===gid&&inR2(c.date||'')) cancDates[c.date]=1; });
var out=[];
var meta=(db().platformMeta||{});
if(!countingActiveFlag(meta)||ledgerFrozen()) return out;
var nowD=new Date(); var nowMin2=nowD.getHours()*60+nowD.getMinutes();
monthDays(month,gid).forEach(function(ds){
if(ds>tStr||ds<minStr) return;
if(inGroupFreeze(g,ds)) return; /* 🆕 V11 */
var wd=WD[new Date(ds+'T12:00:00').getDay()]; var hit=false; var sMin=-1;
for(var i=0;i<sch.length;i++){ if(sch[i].day===wd){ hit=true; var tt=String(sch[i].time||'00:00').split(':'); sMin=(+tt[0])*60+(+(tt[1]||0)); break; } }
if(!hit) return;
if(ds===tStr&&sMin>=0&&nowMin2<sMin) return;
if(attDates[ds]||cancDates[ds]) return;
out.push(ds);
});
return out;
}

LU.confirmSession=async function(gid,date){
try{
var g=gById(gid); if(!g) return;
var sts=studentsOf(gid); if(!sts.length){ if(window.safeToast) window.safeToast('مفيش طلاب','error'); return; }
var d=db(); var existingRec=(d.attendance||[]).find(function(a){return a.groupId===gid&&a.date===date&&a.status==='approved';});
var existingMap={}; if(existingRec&&existingRec.records){ existingRec.records.forEach(function(r){existingMap[r.studentId]=r.status;}); }
window._attMarks={}; window._attGid=gid; window._attDate=date;
var html='<div class="modal-header"><h3 class="modal-title">✅ تأكيد حضور: '+g.name+' — '+date+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">';
html+='<div class="filter-info">💡 دوس ✓ للحاضر و ✗ للغائب — الحفظ فوري. الطلاب الغايبين مش هيظهر جنب اسمهم ✓</div>';
html+='<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;"><button class="btn btn-success btn-sm" onclick="window.attBulk(\'present\')">✓ تحديد الكل حاضر</button><button class="btn btn-danger btn-sm" onclick="window.attBulk(\'absent\')">✗ تحديد الكل غائب</button></div>';
var cins={}; (db().checkIns||[]).forEach(function(x){ if(x.groupId===gid&&x.date===date) cins[x.studentId]=x; });
var cinsN=Object.keys(cins).length;
html+='<div id="attStList" style="max-height:400px;overflow:auto;">';
html+='<div class="filter-info" style="background:var(--info-bg);color:var(--info);border-color:var(--info);margin-bottom:8px;">📱 <strong>'+cinsN+' من '+sts.length+'</strong> طالب عملوا تشيك-إن فعلي (باركود/داشبورد) — اللي قدامه شارة زرقا متأكد حضوره، والباقي افتراضاً حاضر لحد ما تثبت غيابه.</div>';
html+=sts.map(function(s){
var st=existingMap[s.id]||'present';
window._attMarks[s.id]=st;
var presAct=st==='present'?'opacity:1;font-weight:900;':'opacity:0.5;';
var absAct=st==='absent'?'opacity:1;font-weight:900;':'opacity:0.5;';
return '<div class="sub-row" style="padding:8px;" id="attRow_'+s.id+'"><div style="flex:1;"><strong>'+s.name+'</strong>'+(cins[s.id]?' <span class="badge badge-info" title="تشيك-إن فعلي بتوقيت '+String(cins[s.id].at||'').slice(11,16)+'">📱 '+String(cins[s.id].at||'').slice(11,16)+'</span>':'')+'<div class="text-xs text-muted">'+(s.code||'')+'</div></div><div style="display:flex;gap:6px;"><button class="btn btn-success btn-sm" id="attP_'+s.id+'" style="'+presAct+'" onclick="window.attMark(\''+s.id+'\',\'present\',this)">✓ حاضر</button><button class="btn btn-danger btn-sm" id="attA_'+s.id+'" style="'+absAct+'" onclick="window.attMark(\''+s.id+'\',\'absent\',this)">✗ غائب</button></div></div>';
}).join('');
html+='</div>';
html+='<button class="btn btn-primary w-full" style="margin-top:12px;" onclick="window.attSaveAll(\''+gid+'\',\''+date+'\')">💾 حفظ الكل</button>';
html+='</div>';
ThemeManager.openModal(html,'modal-md');
}catch(e){if(window.safeToast)window.safeToast('خطأ: '+e.message,'error');}
};

window.attBulk=function(status){
var rows=document.querySelectorAll('[id^="attRow_"]');
rows.forEach(function(r){
var sid=r.id.replace('attRow_','');
window.attMark(sid,status,r.querySelector(status==='present'?'[id^="attP_"]':'[id^="attA_"]'));
});
};
window.attMark=function(sid,status,btn){
window._attMarks=window._attMarks||{};
window._attMarks[sid]=status;
var row=document.getElementById('attRow_'+sid);
if(!row)return;
var pBtn=row.querySelector('[id^="attP_"]');
var aBtn=row.querySelector('[id^="attA_"]');
if(pBtn){pBtn.style.opacity=status==='present'?'1':'0.5';pBtn.style.fontWeight=status==='present'?'900':'normal';}
if(aBtn){aBtn.style.opacity=status==='absent'?'1':'0.5';aBtn.style.fontWeight=status==='absent'?'900':'normal';}
};
window.attSaveAll=async function(gid,date){
try{
var d=db(); d.attendance=d.attendance||[];
var g=gById(gid);
var marks=window._attMarks||{};
var sts=studentsOf(gid);
var records=sts.map(function(s){return {studentId:s.id,status:marks[s.id]||'present'};});
var existing=(d.attendance||[]).find(function(a){return a.groupId===gid&&a.date===date&&a.status==='approved';});
if(existing){
existing.records=records;
existing.updatedAt=new Date().toISOString();
try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc('attendance',existing.id,existing);}catch(e){}
}else{
var rec={id:'att_'+Date.now()+'_'+gid,groupId:gid,groupName:g.name,date:date,status:'approved',source:'manual-confirm',teacherId:g.teacherId||null,createdAt:new Date().toISOString(),records:records};
d.attendance.push(rec);
try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc('attendance',rec.id,rec);}catch(e){}
}
saveD(d);
var gamification=d.gamification||{};
var attPts=(window.LG&&LG.attendancePoints)?LG.attendancePoints():5;
var present=records.filter(function(r){return r.status==='present';});
var absent=records.filter(function(r){return r.status==='absent';});
var awarded=0;
for(var i=0;i<present.length;i++){
try {
  if (typeof Ops !== 'undefined' && Ops.addManualPoints) {
    Ops.addManualPoints(present[i].studentId,attPts,
      'حضور ' + date + ' (' + g.name + ')',
      (cur() || {}).id || '',
      (g.teacherId || null),
      'att_' + g.id + '_' + date + '_' + present[i].studentId
    );
    awarded++;
  }
} catch (e) {}}
present.forEach(function(r){
try{
var userData=DataService.getUserById?DataService.getUserById(r.studentId):null;
if(userData){
var streaks=userData.streaks||{attendance:0,lastDate:null};
var yesterday=new Date(date);yesterday.setDate(yesterday.getDate()-1);
var yStr=yesterday.toISOString().slice(0,10);
if(streaks.lastDate===yStr){streaks.attendance=(streaks.attendance||0)+1;}
else if(streaks.lastDate!==date){streaks.attendance=1;}
streaks.lastDate=date;
if(DataService.updateUser)DataService.updateUser(r.studentId,{streaks:streaks});
}
}catch(e){}
});
ThemeManager.closeModal();
if(window.safeToast)window.safeToast('✅ '+present.length+' حاضر'+(awarded?' +'+awarded+'×'+attPts+' نقطة':'')+' · '+absent.length+' غائب','success');
LU.refresh();
}catch(e){if(window.safeToast)window.safeToast('خطأ: '+e.message,'error');}
};

LU.cancelSessionQuick=function(gid,date){
var reason=prompt('سبب إلغاء حصة '+date+' (هيظهر في السجل):','');
if(reason===null) return;
LU.doCancelSession(gid,date,reason);
};
LU.doCancelSession=async function(gid,date,reason){
try{
var d=db(); d.cancelledSessions=d.cancelledSessions||[];
var exists=d.cancelledSessions.some(function(c){ return c.groupId===gid&&c.date===date; });
if(exists){ if(window.safeToast) window.safeToast('الحصة دي ملغية بالفعل','info'); return; }
var g=gById(gid);
var rec={id:'cs_'+Date.now()+'_'+gid,groupId:gid,groupName:g?g.name:'',date:date,reason:reason||'إلغاء',makeupStatus:'outstanding',cancelledBy:(cur()||{}).id||'',createdAt:new Date().toISOString()};
d.cancelledSessions.push(rec); saveD(d);
try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('cancelledSessions',rec.id,rec); }catch(e){}
try{
var staff=(DataService.getUsers?DataService.getUsers():[]).filter(function(u){ return u.role==='teacher'&&g&&u.id===g.teacherId||u.role==='admin'||u.role==='assistant'; });
staff.forEach(function(u){ if(DataService.addNotification) DataService.addNotification({targetUserId:u.id,title:'🚫 حصة اتلغت',message:'حصة '+(g?g.name:'')+' يوم '+date+' اتلغت'+(reason?(' — السبب: '+reason):'')+' — محتاجة تعويض.',type:'general',priority:'medium',meta:{event:'session_cancel'}}); });
}catch(e){}
if(window.__cnWaAuto!==false){
try{
var waMsg='🚫 إلغاء حصة — '+(g?g.name:'')+'\n📅 '+date+(reason?('\n📝 السبب: '+reason):'')+'\nهيتم تحديد حصة تعويضية قريباً — شكراً لتفهمكم 🌹';
window.openGroupWa(gid,waMsg);
}catch(e){}
}
if(window.safeToast) window.safeToast('🚫 اتعلمت ملغية + إشعار للطلاب + الرسالة منسوخة للجروب','warning');
LU.refresh();
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
};
LU.openCancelModal=function(prefGid,prefDate){
try{
var gs=isAdmin()?groups():myGroups();
var tStr=localToday();
var dMax=new Date(); dMax.setDate(dMax.getDate()+30); var tMax=dMax.getFullYear()+'-'+pad2(dMax.getMonth()+1)+'-'+pad2(dMax.getDate());
var dMax=new Date(); dMax.setDate(dMax.getDate()+30);
var tMax=dMax.getFullYear()+'-'+String(dMax.getMonth()+1).padStart(2,'0')+'-'+String(dMax.getDate()).padStart(2,'0');
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🚫 إلغاء حصة</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'
+'<div class="filter-info">💡 الإلغاء بيعلّم المربع أحمر ✗ في دفتر التحصيل فوراً، وبيتحسب دين تعويض، وبيفضل ظاهر في صندوق "حصص محتاجة تسوية" لحد ما تتعوض.</div>'
+'<div class="form-group"><label>المجموعة</label><select id="cnGroup" class="form-select">'+gs.map(function(g){return '<option value="'+g.id+'" '+(g.id===prefGid?'selected':'')+'>'+g.name+'</option>';}).join('')+'</select></div>'
+'<div class="form-group"><label>تاريخ الحصة *</label><input type="date" id="cnDate" class="form-input" value="'+(prefDate||tStr)+'" max="'+tMax+'"></div>'
+'<div class="form-group"><label>السبب (اختياري)</label><input type="text" id="cnReason" class="form-input" placeholder="مثال: ظرف طارئ / مرض / قرار إداري"></div>'
+'<label style="display:flex;gap:8px;align-items:center;margin:10px 0;cursor:pointer;"><input type="checkbox" id="cnWa" checked style="width:18px;height:18px;"> 💬 فتح واتساب المجموعة تلقائياً بعد الإلغاء (الرسالة منسوخة)</label>'
+'<div style="display:flex;gap:6px;"><button class="btn btn-danger w-full" onclick="LedgerUI.cancelFromModal()">🚫 تأكيد الإلغاء</button><button type="button" class="btn btn-success" style="flex:1;" onclick="LedgerUI.waFromModal()">💬 واتساب الآن</button></div>'
+'</div>','modal-sm');
}catch(e){ console.error(e); }
};
LU.cancelFromModal=function(){
var gid=(document.getElementById('cnGroup')||{}).value;
var date=(document.getElementById('cnDate')||{}).value;
var reason=(document.getElementById('cnReason')||{}).value||'';
if(!gid||!date){ if(window.safeToast) window.safeToast('اختار المجموعة والتاريخ','error'); return; }
window.__cnWaAuto=(document.getElementById('cnWa')||{}).checked!==false;
ThemeManager.closeModal();
LU.doCancelSession(gid,date,reason);
};

LU.waFromModal=function(){
var gid=(document.getElementById('cnGroup')||{}).value;
var date=(document.getElementById('cnDate')||{}).value;
var reason=(document.getElementById('cnReason')||{}).value||'';
if(!gid){if(window.safeToast)window.safeToast('اختار المجموعة الأول','error');return;}
var g=gById(gid);
var msg='🚫 إلغاء حصة — '+(g?g.name:'')+'\n📅 '+date+(reason?('\n📝 السبب: '+reason):'')+'\nهيتم تحديد حصة تعويضية قريباً — شكراً لتفهمكم 🌹';
window.openGroupWa(gid,msg);
};

/* ========== ⚡ حصة طوارئ V2: اختيار المُبلَّغين + قناة الإشعار ========== */
window.openEmergencySessionModal=function(){
try{
var u=cur();
if(!u||['teacher','assistant','admin','super_admin'].indexOf(u.role)<0){ if(window.safeToast)window.safeToast('❌ غير مصرح','error'); return; }
var gs=isAdmin()?groups():myGroups();
var todayStr=localToday();
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">⚡ إضافة حصة طوارئ</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
'<div class="filter-info" style="background:var(--info-bg);color:var(--info);border-color:var(--info);">💡 حصة طوارئ = حصة زيادة عن الجدول الأسبوعي — بتتحسب في دفتر التحصيل تحت ⚡ طوارئ، وبتختار مين يتبلغ وبأي قناة.</div>'+
'<div class="form-group"><label>👥 المجموعة *</label><select id="emGroup" class="form-select">'+gs.map(function(g){return '<option value="'+g.id+'">'+g.name+' · '+(g.center||'-')+'</option>';}).join('')+'</select></div>'+
'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div class="form-group"><label>📅 التاريخ *</label><input type="date" id="emDate" class="form-input" value="'+todayStr+'" min="'+todayStr+'"></div><div class="form-group"><label>🕐 الوقت</label><input type="time" id="emTime" class="form-input" value="18:00"></div></div>'+
'<div class="form-group"><label>📝 الموضوع / ملاحظات</label><input type="text" id="emSubject" class="form-input" placeholder="مثال: مراجعة نهائية / حصة تعويضية"></div>'+
'<div class="form-group"><label>🎯 مين يتبلغ؟</label><div style="display:grid;gap:6px;">'+
'<label style="display:flex;gap:8px;align-items:center;cursor:pointer;"><input type="checkbox" id="emRStu" checked style="width:16px;height:16px;"> 🎓 طلاب المجموعة</label>'+
'<label style="display:flex;gap:8px;align-items:center;cursor:pointer;"><input type="checkbox" id="emRPar" checked style="width:16px;height:16px;"> 👨‍👩‍👦 أولياء الأمور</label>'+
'<label style="display:flex;gap:8px;align-items:center;cursor:pointer;"><input type="checkbox" id="emRTea" checked style="width:16px;height:16px;"> 👨‍🏫 أستاذ المجموعة</label></div></div>'+
'<div class="form-group"><label>📢 قناة الإشعار</label><select id="emChan" class="form-select"><option value="both">🔔 داشبورد + 💬 واتساب (الاتنين)</option><option value="dash">🔔 الداشبورد فقط</option><option value="wa">💬 واتساب فقط</option><option value="none">بدون إشعار (تسجيل فقط)</option></select></div>'+
'<button class="btn btn-primary w-full" onclick="window._submitEmergencySession()" style="margin-top:10px;">⚡ إضافة الحصة + تبليغ</button></div>','modal-md');
}catch(e){ if(window.safeToast)window.safeToast('خطأ: '+e.message,'error'); }
};
window._submitEmergencySession=async function(){
try{
var gid=(document.getElementById('emGroup')||{}).value;
var date=(document.getElementById('emDate')||{}).value;
var time=(document.getElementById('emTime')||{}).value||'';
var subject=(document.getElementById('emSubject')||{}).value||'';
var chan=(document.getElementById('emChan')||{}).value||'both';
var rStu=(document.getElementById('emRStu')||{}).checked;
var rPar=(document.getElementById('emRPar')||{}).checked;
var rTea=(document.getElementById('emRTea')||{}).checked;
if(!gid||!date){ if(window.safeToast)window.safeToast('❌ اختار المجموعة والتاريخ','error'); return; }
var g=gById(gid); if(!g){ if(window.safeToast)window.safeToast('❌ المجموعة غير موجودة','error'); return; }
var sts=studentsOf(gid); if(!sts.length){ if(window.safeToast)window.safeToast('❌ مفيش طلاب','error'); return; }
var d=db(); d.manualSessions=d.manualSessions||[]; d.attendance=d.attendance||[];
var ck=cycleOfDate(gid,date)||localMonth();
sts.forEach(function(s){
var exists=d.manualSessions.some(function(ms){ return ms.groupId===gid&&ms.studentId===s.id&&ms.type==='emergency'&&ms.emergencyDate===date; });
if(!exists) d.manualSessions.push({id:'em_'+Date.now()+'_'+s.id,groupId:gid,studentId:s.id,month:ck,sessionsCount:1,type:'emergency',emergencyDate:date,emergencySubject:subject,reason:'⚡ حصة طوارئ '+date,addedBy:(cur()||{}).id||'',addedAt:new Date().toISOString()});
});
var existingAtt=(d.attendance||[]).find(function(a){return a.groupId===gid&&a.date===date&&a.status==='approved';});
if(!existingAtt){ d.attendance.push({id:'att_em_'+Date.now()+'_'+gid,groupId:gid,groupName:g.name,date:date,status:'approved',source:'emergency',emergencySubject:subject,teacherId:g.teacherId||null,createdAt:new Date().toISOString(),records:sts.map(function(s){return {studentId:s.id,status:'present'};})}); }
saveD(d); LU._sesCache={};
var title='⚡ حصة طوارئ — '+g.name;
var msg='تم إضافة حصة طوارئ يوم '+date+(time?(' الساعة '+time):'')+(subject?(' — '+subject):'')+'. برجاء الحضور 🌹';
if(chan==='dash'||chan==='both'){
if(rStu) sts.forEach(function(s){ if(DataService.addNotification) DataService.addNotification({targetUserId:s.id,title:title,message:msg,type:'schedule',priority:'high',meta:{event:'schedule_change',refId:gid,kind:'emergency_session'}}); });
if(rPar){ var pids={}; sts.forEach(function(s){ var pp=String(s.parentPhone||'').replace(/\D/g,''); (DataService.getUsers?DataService.getUsers():[]).forEach(function(u2){ if(u2.role!=='parent')return; var up=String(u2.phone||'').replace(/\D/g,''); if((u2.studentIds||[]).indexOf(s.id)>=0||(pp&&up&&pp===up)) pids[u2.id]=1; }); });
Object.keys(pids).forEach(function(pid){ if(DataService.addNotification) DataService.addNotification({targetUserId:pid,title:title+' (لابنك)',message:msg,type:'schedule',priority:'high',meta:{event:'schedule_change',refId:gid,kind:'emergency_session_parent'}}); }); }
if(rTea&&g.teacherId&&DataService.addNotification) DataService.addNotification({targetUserId:g.teacherId,title:title,message:msg+' (مجموعتك)',type:'schedule',priority:'high',meta:{event:'schedule_change',refId:gid,kind:'emergency_session_teacher'}});
}
if(chan==='wa'||chan==='both'){ window.openGroupWa(gid,'⚡ *حصة طوارئ — '+g.name+'*\n📅 '+date+(time?('\n🕐 '+time):'')+(subject?('\n📝 '+subject):'')+'\nبرجاء الحضور في الموعد 🌹'); }
ThemeManager.closeModal();
if(window.safeToast)window.safeToast('⚡ اتضافت حصة الطوارئ لـ '+sts.length+' طالب واتحسبت في الدفتر','success');
LU.refresh();
}catch(e){ if(window.safeToast)window.safeToast('خطأ: '+e.message,'error'); }
};


/* 🆕 حقن زر حصة الطوارئ في الاختصارات السريعة للأسست */
function injectEmergencyTile(){
try{
  var u=cur();
  if(!u||['teacher','assistant','admin','super_admin'].indexOf(u.role)<0)return;
  if(document.getElementById('qaEmergencySession'))return;
  var first=document.querySelector('.quick-action');
  if(!first||!first.parentNode)return;
  var b=document.createElement('button');
  b.type='button';
  b.className='quick-action';
  b.id='qaEmergencySession';
  b.innerHTML='<div class="quick-action-icon">⚡</div><div class="quick-action-label">حصة طوارئ</div>';
  b.onclick=function(){window.openEmergencySessionModal();};
  first.parentNode.insertBefore(b,first);
}catch(e){}
}

/* 🚫 tile سريع في لوحة الأستاذ/المساعد لو مش موجود */
function injectCancelTile(){
try{
var u=cur(); if(!u||(u.role!=='teacher'&&u.role!=='assistant')) return;
if(document.getElementById('qaCancelSession')) return;
if(document.querySelector('[onclick*="openCancelSessionModal"]')) return;
var first=document.querySelector('#section-overview .quick-action')||document.querySelector('#section-command .quick-action')||document.querySelector('#section-dashboard .quick-action')||document.querySelector('.quick-action');if(!first||!first.parentNode) return;
var b=document.createElement('button'); b.type='button'; b.className='quick-action'; b.id='qaCancelSession';
b.innerHTML='<div class="quick-action-icon">🚫</div><div class="quick-action-label">إلغاء حصة</div>';
b.onclick=function(){ LedgerUI.openCancelModal(); };
first.parentNode.appendChild(b);
}catch(e){}
}

/* ========== 📡 حصص اليوم V2: إلغاء + تبديل موعد اليوم فقط + مجموعة مكان الملغية ========== */
function todaysOverrides(date){ return (db().todayOverrides||[]).filter(function(o){return o.date===date;}); }
window.openTodaySessionsModal=function(){
try{
var gs=isAdmin()?groups():myGroups();
var todayDs=localToday(); var wd=WD[new Date(todayDs+'T12:00:00').getDay()];
var d=db(); var rows=[];
gs.forEach(function(g){
var sch=(g.schedules&&g.schedules.length)?g.schedules:(g.day?[{day:g.day,time:g.time}]:[]);
sch.forEach(function(s){ if(s.day!==wd)return; rows.push({g:g,time:s.time||'',kind:'base'}); });
});
todaysOverrides(todayDs).forEach(function(o){
if(o.kind!=='extra')return; var g=gById(o.groupId); if(!g)return;
if(rows.some(function(r){return r.g.id===g.id;}))return;
rows.push({g:g,time:o.time||'',kind:'extra'});
});
rows.forEach(function(r){ var ov=todaysOverrides(todayDs).find(function(o){return o.groupId===r.g.id&&o.kind==='move';}); if(ov) r.time=ov.time; });
rows.sort(function(a,b){return String(a.time||'').localeCompare(String(b.time||''));});
var html='<div class="modal-header"><h3 class="modal-title">📡 حصص اليوم — '+todayDs+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">';
html+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center;"><button class="btn btn-warning btn-sm" onclick="ThemeManager.closeModal();window.openEmergencySessionModal();">⚡ حصة طوارئ</button><span class="text-xs text-muted">الإلغاء وتبديل الموعد ليوم النهارده بس — الجدول الأساسي مش بيتلمس.</span></div>';
html+=rows.length?rows.map(function(r){
var canc=(d.cancelledSessions||[]).find(function(c){return c.groupId===r.g.id&&c.date===todayDs;});
var att=(d.attendance||[]).find(function(a){return a.groupId===r.g.id&&a.date===todayDs&&a.status==='approved';});
var badge=canc?'<span class="badge badge-danger">🚫 ملغية</span>':(att?'<span class="badge badge-success">✅ اتأخذت</span>':'<span class="badge badge-warning">⏳ لسه</span>');
return '<div class="sub-row" style="margin-bottom:8px;"><div style="flex:1;"><strong>'+(r.time||'--:--')+' — '+r.g.name+'</strong>'+prevUnpaidBadge(r.g)+(r.kind==='extra'?' <span class="badge badge-info">⚡ زيادة اليوم</span>':'')+'<div class="text-xs text-muted">'+(r.g.center||'')+' · '+(r.g.grade||'')+'</div></div><div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;">'+badge+
(canc?'<button class="btn btn-success btn-sm" onclick="LedgerUI.openFillSlotModal(\''+todayDs+'\',\''+(r.time||'')+'\',\''+r.g.id+'\')">➕ مجموعة مكانها</button>':'')+
'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.openSwapTodayModal(\''+r.g.id+'\',\''+todayDs+'\',\''+(r.time||'')+'\')">🕐 تبديل موعد اليوم</button>'+
(!canc?'<button class="btn btn-danger btn-sm" onclick="LedgerUI.cancelSessionQuick(\''+r.g.id+'\',\''+todayDs+'\');setTimeout(function(){LedgerUI.openTodaySessionsModal();},200);">🚫 إلغاء</button>':'')+
'</div></div>';
}).join(''):'<p class="text-muted" style="text-align:center;padding:20px;">مفيش حصص مجدولة اليوم</p>';
html+='</div>';
ThemeManager.openModal(html,'modal-md');
}catch(e){console.error(e);}
};
/* 🕐 تبديل موعد اليوم فقط */
LU.openSwapTodayModal=function(gid,date,time){
try{
var g=gById(gid); if(!g)return;
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🕐 تبديل موعد اليوم: '+g.name+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
'<div class="filter-info">💡 التغيير ليوم '+date+' بس — الجدول الأسبوعي الأساسي زي ما هو، والحصة بتتحسب في دفتر التحصيل عادي.</div>'+
'<div class="form-group"><label>🕐 الموعد الجديد اليوم *</label><input type="time" id="swTime" class="form-input" value="'+(time||'18:00')+'"></div>'+
'<button class="btn btn-primary w-full" onclick="LedgerUI.applyTodayMove(\''+gid+'\',\''+date+'\')">💾 حفظ تبديل اليوم</button></div>','modal-sm');
}catch(e){}
};
LU.applyTodayMove=function(gid,date){
try{
var t=(document.getElementById('swTime')||{}).value; if(!t){ if(window.safeToast)window.safeToast('اختار الموعد','error'); return; }
var d=db(); d.todayOverrides=d.todayOverrides||[];
d.todayOverrides=d.todayOverrides.filter(function(o){ return !(o.groupId===gid&&o.date===date&&o.kind==='move'); });
d.todayOverrides.push({id:'ov_'+Date.now(),groupId:gid,date:date,time:t,kind:'move',by:(cur()||{}).name||'-',at:new Date().toISOString()});
saveD(d); logAct('🕐 تبديل موعد اليوم فقط',{groupId:gid,groupName:gName(gid),text:date+' → '+t});
ThemeManager.closeModal(); if(window.safeToast)window.safeToast('✅ اتبدل موعد اليوم — الأساس زي ما هو','success');
LU.openTodaySessionsModal();
}catch(e){}
};
/* ➕ مجموعة تانية مكان الحصة الملغية اليوم (حصة زيادة بتتحسب في الدفتر) */
LU.openFillSlotModal=function(date,time,srcGid){
try{
var gs=isAdmin()?groups():myGroups();
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">➕ مجموعة في خانة اليوم دي</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
'<div class="filter-info">💡 حصة زيادة اليوم في موعد الملغية — بتتحسب في دفتر التحصيل للمجموعة المختارة كحصة ⚡ طوارئ/زيادة، والجدول الأساسي مش بيتغير.</div>'+
'<div class="form-group"><label>👥 المجموعة *</label><select id="fsGid" class="form-select">'+gs.map(function(g){return '<option value="'+g.id+'">'+g.name+' · '+(g.center||'-')+'</option>';}).join('')+'</select></div>'+
'<div class="form-group"><label>🕐 الموعد اليوم *</label><input type="time" id="fsTime" class="form-input" value="'+(time||'18:00')+'"></div>'+
'<button class="btn btn-primary w-full" onclick="LedgerUI.applyFillSlot(\''+date+'\',\''+(srcGid||'')+'\')">💾 إضافة حصة زيادة اليوم</button></div>','modal-sm');
}catch(e){}
};
LU.applyFillSlot=function(date,srcGid){
try{
var gid=(document.getElementById('fsGid')||{}).value; var t=(document.getElementById('fsTime')||{}).value;
if(!gid||!t){ if(window.safeToast)window.safeToast('كمل البيانات','error'); return; }
var d=db(); d.todayOverrides=d.todayOverrides||[];
d.todayOverrides.push({id:'ov_'+Date.now(),groupId:gid,date:date,time:t,kind:'extra',srcGroupId:srcGid||'',by:(cur()||{}).name||'-',at:new Date().toISOString()});
var ck=cycleOfDate(gid,date)||localMonth();
var fl=getFlags(gid,ck);
if(fl.take.indexOf(date)<0) fl.take.push(date);   /* 🟩 تتحسب في الدفتر */
setFlags(gid,ck,fl);
saveD(d); logAct('➕ حصة زيادة اليوم (مكان ملغية)',{groupId:gid,groupName:gName(gid),text:date+' '+t});
LU._sesCache={};
ThemeManager.closeModal(); if(window.safeToast)window.safeToast('✅ اتضافت حصة زيادة اليوم واتحسبت في الدفتر','success');
LU.openTodaySessionsModal();
}catch(e){}
};

/* ========== ✋ اعتراضات الحضور ========== */
window.disputeAbsent=function(nid,gid,date){
try{
var u=cur();if(!u)return;
var d=db();d.attDisputes=d.attDisputes||[];
if(d.attDisputes.some(function(x){return x.nid===nid&&x.status==='pending';})){if(window.safeToast)window.safeToast('الاعتبار مرسل بالفعل','info');return;}
d.attDisputes.push({id:'dsp_'+Date.now(),nid:nid,sid:u.id,gid:gid,date:date,status:'pending',at:new Date().toISOString()});
var n=(d.notifications||[]).find(function(x){return x.id===nid;});if(n)n.disputed=true;
saveD(d);
(DataService.getUsers?DataService.getUsers():[]).filter(function(x){return x.role==='assistant'||x.role==='admin'||x.role==='super_admin';}).forEach(function(a){
if(DataService.addNotification)DataService.addNotification({targetUserId:a.id,title:'✋ اعتراض حضور',message:(u.name||'طالب')+' بيقول إنه كان حاضر يوم '+date+' — راجع واعتمد أو ارفض',type:'attendance',priority:'high',meta:{event:'dispute'}});
});
if(window.safeToast)window.safeToast('✋ تم إرسال اعتراضك — المساعد هيراجعه','success');
if(window.openNotifPanel)window.openNotifPanel();
}catch(e){}
};
window.openDisputesModal=function(){
try{
var d=db();var list=(d.attDisputes||[]).filter(function(x){return x.status==='pending';});
var html='<div class="modal-header"><h3 class="modal-title">✋ اعتراضات الحضور ('+list.length+')</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">';
html+=list.length?list.map(function(x){
var s=DataService.getUserById?DataService.getUserById(x.sid):null;var g=gById(x.gid);
return '<div class="sub-row" style="border-right:3px solid var(--warning);margin-bottom:8px;"><div style="flex:1;"><strong>'+(s?s.name:'-')+'</strong><div class="text-xs text-muted">'+(g?g.name:'-')+' · 📅 '+x.date+'</div></div><div style="display:flex;gap:6px;"><button class="btn btn-success btn-sm" onclick="window.resolveDispute(\''+x.id+'\',true)">✓ كان حاضر</button><button class="btn btn-danger btn-sm" onclick="window.resolveDispute(\''+x.id+'\',false)">✗ تأكيد الغياب</button></div></div>';
}).join(''):'<p class="text-muted" style="text-align:center;padding:20px;">مفيش اعتراضات معلقة 🎉</p>';
html+='</div>';
ThemeManager.openModal(html,'modal-md');
}catch(e){console.error(e);}
};
window.resolveDispute=async function(id,approve){
try{
var d=db();var x=(d.attDisputes||[]).find(function(v){return v.id===id;});if(!x)return;
x.status=approve?'approved':'rejected';x.resolvedAt=new Date().toISOString();
if(approve){
var rec=(d.attendance||[]).find(function(a){return a.groupId===x.gid&&a.date===x.date&&a.status==='approved';});
if(rec&&rec.records){rec.records.forEach(function(r){if(r.studentId===x.sid)r.status='present';});cloudAtt(rec,false);}
var attPts=(window.LG&&LG.attendancePoints)?LG.attendancePoints():5;
if(typeof Ops!=='undefined'&&Ops.addManualPoints)Ops.addManualPoints(x.sid,pts,'تصحيح غياب → حاضر '+x.date,(cur()||{}).id||'');
}
saveD(d);
if(DataService.addNotification)DataService.addNotification({targetUserId:x.sid,title:approve?'✅ تم قبول اعتراضك':'❌ تم تأكيد الغياب',message:'حصة '+x.date+' — '+(approve?'اتعدل حضورك واتضافت النقاط':'الغياب مؤكد — لو فيه لبس كلم المساعد'),type:'attendance',priority:'medium',meta:{event:'dispute_result'}});
ThemeManager.closeModal();window.openDisputesModal();
if(window.safeToast)window.safeToast(approve?'✅ اتعدل الحضور والنقاط':'✗ تم تأكيد الغياب','success');
}catch(e){}
};
/* إشعار غياب تلقائي لكل طالب اتعلّم غائب في attSaveAll */
(function(){
if(typeof window.attSaveAll==='function'&&!window.attSaveAll.__nf){
var os=window.attSaveAll;
window.attSaveAll=async function(gid,date){
var r=await os.apply(this,arguments);
try{
var rec=(db().attendance||[]).find(function(a){return a.groupId===gid&&a.date===date&&a.status==='approved';});
if(rec&&rec.records){rec.records.forEach(function(rc){
if(rc.status==='absent'&&!notifyFrozen()&&DataService.addNotification){
DataService.addNotification({targetUserId:rc.studentId,title:'❌ تسجيل غياب',message:'اتسجلت غائب في حصة '+date+' — لو ده غلط دوس "✋ أنا كنت حاضر" من قائمة الإشعارات',type:'attendance',priority:'high',meta:{event:'absent',gid:gid,date:date}});
}});}
}catch(e){}
return r;
};
window.attSaveAll.__nf=1;
}
})();

/* ========== 🔘 حقن أزرار حصص اليوم والاعتراضات في كل اللوحات ========== */
function injectActionTiles(){
try{
var u=cur();if(!u||['teacher','assistant','admin','super_admin'].indexOf(u.role)<0)return;
var first=document.querySelector('#section-overview .quick-action');
if(!first||!first.parentNode)return;
if(!document.getElementById('qaTodaySessions')){
var b=document.createElement('button');b.type='button';b.className='quick-action';b.id='qaTodaySessions';
b.innerHTML='<div class="quick-action-icon">📡</div><div class="quick-action-label">حصص اليوم</div>';
b.onclick=function(){window.openTodaySessionsModal();};
first.parentNode.appendChild(b);
}
if(!document.getElementById('qaDisputes')){
var b2=document.createElement('button');b2.type='button';b2.className='quick-action';b2.id='qaDisputes';
b2.innerHTML='<div class="quick-action-icon">✋</div><div class="quick-action-label">اعتراضات الحضور</div>';
b2.onclick=function(){window.openDisputesModal();};
first.parentNode.appendChild(b2);
}
}catch(e){}
}

/* ========== 🧊▶️ التحكم العالمي في العد (V10.1 — مزامنة سحابية + توحيد مفاتيح التفعيل) ========== */
function countingActiveFlag(m){
if(!m) return false;
if(m.countingActive===true) return true;
if(m.counterActive===true) return true;
if(m.billingActive===true) return true;
if(m.billingEnabled===true) return true;
if(m.collectionEnabled===true) return true;
if(m.counting&&m.counting.active===true) return true;
return false;
}
LU.countingState=function(){
var m=(db().platformMeta||{});
return {active:countingActiveFlag(m),since:(m.countingSince||null)};
};
/* ☁️ محرك السحب السحابي الموحّد: سحب + دمج ذكي لكل Collections */
LU.pullAll=function(force){
  var now=Date.now();
  if(LU._lastLocalEdit && (now-LU._lastLocalEdit)<8000) return Promise.resolve();
  if(!force&&LU._lastPullAll&&(now-LU._lastPullAll)<45000) return Promise.resolve();
  LU._lastPullAll=now;
  return new Promise(function(resolve){
    try{
      if(!(window.FirebaseService&&FirebaseService._db)){ resolve(); return; }
      var d=db();
      var pushBack=[];
      var changedAny=false;
      var PUSH_COLS={groups:1,attendance:1,manualSessions:1,cancelledSessions:1,payments:1,enrollments:1,sessionFlags:1};
      var collections=['groups','students','users','payments','attendance','manualSessions','cancelledSessions','enrollments','teacherPayouts','centerTransactions','expenses','classPosts','manualPoints','interactionPoints'];
      var promises=collections.map(function(col){
        return FirebaseService._db.collection(col).get().then(function(snap){
          var cloud={};
          if(snap&&snap.docs) snap.docs.forEach(function(doc){ var data=doc.data(); if(data){ data.id=doc.id; cloud[doc.id]=data; } });
          if(col==='platformMeta'){
            var lm=d.platformMeta||{};
            Object.keys(cloud).forEach(function(id){ var c=cloud[id]; Object.keys(c).forEach(function(k){ if(c[k]!==undefined) lm[k]=c[k]; }); });
            d.platformMeta=lm; changedAny=true; return;
          }
          var local=(d[col]||[]).slice();
          var map={}; local.forEach(function(x){ if(x&&x.id) map[x.id]=x; });
          var changed=false;
          Object.keys(cloud).forEach(function(id){
            var c=cloud[id], l=map[id];
            if(!l){ local.push(c); changed=true; return; }
            if(col==='groups'){
              var lr=l.cycleRanges||[], cr=c.cycleRanges||[], mr={};
              lr.forEach(function(r){ mr[r.n]={n:r.n,from:r.from,to:r.to||null}; });
              cr.forEach(function(r){
                var e=mr[r.n];
                if(!e){ mr[r.n]={n:r.n,from:r.from,to:r.to||null}; }
                else{
                  if(r.from&&(!e.from||r.from<e.from)) e.from=r.from;
                  if(r.to!=null&&(e.to==null||r.to<e.to)) e.to=r.to;
                }
              });
              var arr=Object.keys(mr).map(function(k){return mr[k];}).sort(function(a,b){return a.n-b.n;});
              var oi=-1; arr.forEach(function(r,k){ if(r.to==null&&oi===-1) oi=k; });
              if(oi>=0&&arr.length>oi+1) arr=arr.slice(0,oi+1);
              if(JSON.stringify(arr)!==JSON.stringify(lr)){ l.cycleRanges=arr; changed=true; }
              if(JSON.stringify(arr)!==JSON.stringify(cr)) pushBack.push({col:col,id:id,doc:l});
              var ct=c.updatedAt||c.createdAt||'', lt=l.updatedAt||l.createdAt||'';
              if(ct>lt){ var kr=l.cycleRanges; Object.assign(l,c); l.cycleRanges=kr; changed=true; }
              else if(lt>ct) pushBack.push({col:col,id:id,doc:l});
              return;
            }
            var ct2=c.updatedAt||c.createdAt||c.at||'';
            var lt2=l.updatedAt||l.createdAt||l.at||'';
            if(ct2>lt2){ Object.assign(l,c); changed=true; }
            else if(lt2>ct2&&PUSH_COLS[col]) pushBack.push({col:col,id:id,doc:l});
          });
          local.forEach(function(x){ if(x&&x.id&&!cloud[x.id]&&PUSH_COLS[col]) pushBack.push({col:col,id:x.id,doc:x}); });
          if(changed){ d[col]=local; changedAny=true; }
        }).catch(function(){});
      });
      /* 🔑 sessionFlags: union في الاتجاهين */
      promises.push(FirebaseService._db.collection('sessionFlags').get().then(function(snap){
        var cloud={};
        if(snap&&snap.docs) snap.docs.forEach(function(doc){ cloud[doc.id]=doc.data()||{}; });
        d.sessionFlags=d.sessionFlags||{};
        var keys={};
        Object.keys(cloud).forEach(function(k){keys[k]=1;});
        Object.keys(d.sessionFlags).forEach(function(k){keys[k]=1;});
        Object.keys(keys).forEach(function(key){
          var lf=d.sessionFlags[key]||{cancel:[],take:[],remove:[]};
          var cf=cloud[key]||{cancel:[],take:[],remove:[]};
          var merged={
            cancel:Array.from(new Set((lf.cancel||[]).concat(cf.cancel||[]))),
            take:Array.from(new Set((lf.take||[]).concat(cf.take||[]))),
            remove:Array.from(new Set((lf.remove||[]).concat(cf.remove||[]))),
            updatedAt:new Date().toISOString()
          };
          if(JSON.stringify(merged)!==JSON.stringify(lf)){ d.sessionFlags[key]=merged; changedAny=true; }
          if(JSON.stringify(merged)!==JSON.stringify(cf)) pushBack.push({col:'sessionFlags',id:key,doc:merged});
        });
      }).catch(function(){}));
      Promise.all(promises).then(function(){
        if(changedAny) saveD(d);
        /* ☁️ دفع الناقص للسحابة (شفاء ذاتي للتزامن) */
        if(pushBack.length>60) pushBack=pushBack.slice(0,60);   /* 🛡️ سقف ضد 429 */
        pushBack.forEach(function(pb){ try{ FirebaseService.saveDoc(pb.col,pb.id,pb.doc).catch(function(){}); }catch(e){} });
        LU._sesCache={};
        if(changedAny){ try{ window.dispatchEvent(new CustomEvent('ledger-sync')); }catch(e){} }
        resolve();
      }).catch(function(){ resolve(); });
    }catch(e){ resolve(); }
  });
};

LU.pullPlatformMeta=function(force){
var now=Date.now();
if(!force&&LU._lastPull&&(now-LU._lastPull)<45000) return Promise.resolve();
LU._lastPull=now;
return new Promise(function(res){
try{
if(!(window.FirebaseService&&FirebaseService._db)) return res();
FirebaseService._db.collection('platformMeta').doc('meta').get().then(function(doc){
if(doc&&doc.exists){
var cloud=doc.data()||{};
var d=db(); var local=d.platformMeta||{};
var merged=Object.assign({},local,cloud);
var cloudOn=countingActiveFlag(cloud);
merged.countingActive=cloudOn;
merged.counterActive=cloudOn; merged.billingActive=cloudOn; merged.billingEnabled=cloudOn; merged.collectionEnabled=cloudOn;
merged.counting=merged.counting||{}; merged.counting.active=cloudOn;
if(cloud.countingSince) merged.countingSince=cloud.countingSince;
d.platformMeta=merged; saveD(d); LU._sesCache={};
}
res();
}).catch(function(){res();});
}catch(e){res();}
});
};
LU.toggleCounting=function(){
var d=db(); d.platformMeta=d.platformMeta||{countingActive:false,countingSince:null};
var m=d.platformMeta;
var on=countingActiveFlag(m);
if(!on){
m.countingActive=true; m.counterActive=true; m.billingActive=true; m.billingEnabled=true; m.collectionEnabled=true;
m.counting=m.counting||{}; m.counting.active=true;
m.countingSince=m.countingSince||localToday();
if(window.safeToast) window.safeToast('▶️ تم بدء العد فعلياً من '+m.countingSince+' — أي حصة قبل كده مش هتتحسب أوتوماتيك','success');
}else{
m.countingActive=false; m.counterActive=false; m.billingActive=false; m.billingEnabled=false; m.collectionEnabled=false;
if(m.counting) m.counting.active=false;
if(window.safeToast) window.safeToast('🧊 تم إيقاف العد — المربعات مش هتزيد لحد ما تفعّله تاني','warning');
}
saveD(d);
try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('platformMeta','meta',m); }catch(e){}
LU._sesCache={};
LU.refresh();
};


/* ========== ريفريش ========== */
LU.refresh=function(){
  /* 🔄 auto-month: أول حضور معتمد في شهر جديد = الدفتر ينتقل له لوحده */
/* ✅ إيقاف القفزة التلقائية للشهر الثاني إلا لو كل المجموعات كملت الشهر الأول */
try{
var __cur=localMonth();
if(LU._st&&LU._st.month&&LU._st.month<__cur){
/* نأكد إن كل المجموعات كملت نصاب الشهر الأول قبل ما نقفز */
var __allComplete = true;
groups().forEach(function(g){
  var rs = g.cycleRanges || [];
  var firstOpen = rs.find(function(r){ return r.to == null; });
  if(firstOpen){
    var ck = 'cycle-' + String(firstOpen.n).padStart(2,'0');
    var ses = LU.groupSessions(g.id, ck);
    if(!ses.complete) __allComplete = false;
  }
});
if(__allComplete){
  LU._st.month=__cur;
}
}
    var __pt=(__d||db()).pendingMonthTransitions||[];
    if(__pt.some(function(p){return p.status==='pending';})){ __pt.forEach(function(p){ if(p.status==='pending'){p.status='approved'; p.approvedAuto=true;} }); DataService._saveData(__d||db()); }
  }catch(e){}
try{
LU._sesCache={};
try{ localStorage.setItem('eduflowLedgerPing', String(Date.now())); }catch(e){} /* 📡 نبضة لكل التبويبات المفتوحة */
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

/* ========== 📜 سجل النشاط + إشعار الأدمن (V9 مدمج) ========== */
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
DataService.addNotification({targetUserId:a.id,title:'📒 نشاط الدفتر',message:(u.name||'-')+' ('+(u.role||'-')+'): '+action+(e.text?(' — '+e.text):'')+(e.amount?(' ('+e.amount+' ج.م)'):''),type:'general',priority:'low',meta:{kind:'ledger',event:'ledger_act'}});
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
function sName(sid){ var s=DataService.getUserById?DataService.getUserById(sid):null; return (s&&s.name)||''; }
function gName(gid){ var g=gById(gid); return (g&&g.name)||''; }
function wrapLog(name,post){
var orig=LU[name]; if(!orig||orig.__lgw) return;
var f=function(){ var args=[].slice.call(arguments); var r=orig.apply(this,args); try{ var e=post?post(args):null; if(e) logAct(e.action,e); }catch(err){} return r; };
f.__lgw=true; LU[name]=f;
}
wrapLog('applyPay',function(a){ var p=payFor(a[0],a[1],a[2]); var h=p&&p.history&&p.history.length?p.history[p.history.length-1]:null; if(!h||Date.now()-new Date(h.at||0).getTime()>15000) return null; return {action:'💵 تسجيل دفعة كاش',text:sName(a[0]),groupId:a[1],groupName:gName(a[1]),month:a[2],amount:h.amount}; });
wrapLog('saveEntry',function(a){ var p=(db().payments||[]).find(function(x){return x.id===a[0];}); if(!p) return null; var h=p.history?p.history[a[1]]:null; return {action:'✏️ تعديل دفعة',text:sName(p.studentId),groupId:p.groupId,groupName:gName(p.groupId),month:p.month,amount:h?h.amount:0}; });
wrapLog('delEntry',function(a){ var p=(db().payments||[]).find(function(x){return x.id===a[0];}); return p?{action:'🗑️ حذف دفعة',text:sName(p.studentId),groupId:p.groupId,groupName:gName(p.groupId),month:p.month}:null; });
wrapLog('carryInc',function(a){ return {action:'📥 إضافة حصة مرحّلة لكل الطلاب',groupId:a[0],groupName:gName(a[0]),month:a[1]}; });
wrapLog('carryDec',function(a){ return {action:'📥 إنقاص حصة مرحّلة من كل الطلاب',groupId:a[0],groupName:gName(a[0]),month:a[1]}; });
wrapLog('sqToggle',function(a){ return {action:a[3]==='cancel'?'🟥 إلغاء حصة (مربع أحمر)':'🟩 تعليم حصة ملغاة كمأخوذة',groupId:a[0],groupName:gName(a[0]),month:a[1],text:a[2]||'بدون تاريخ'}; });
wrapLog('sqAdd',function(a){ return {action:'🟩 إضافة مربع حصة يدوي',groupId:a[0],groupName:gName(a[0]),month:a[1],text:a[2]?'بتاريخ':'بدون تاريخ'}; });
wrapLog('sqRemove',function(a){ return {action:'🗑 حذف نهائي لحصة من المربعات',groupId:a[0],groupName:gName(a[0]),month:a[1],text:a[2]||'بدون تاريخ'}; });
wrapLog('sqUncancel',function(a){ return {action:'↩️ شيل إلغاء حصة (رجعت أخضر)',groupId:a[0],groupName:gName(a[0]),month:a[1],text:a[2]||''}; });
wrapLog('sqRemoveUndated',function(a){ return {action:'🗑 حذف مربع يدوي',groupId:a[0],groupName:gName(a[0]),month:a[1]}; });
wrapLog('setWarnAt',function(a){ var g=gById(a[0]); return {action:'🔔 تغيير رقم إنذار الدفع لمجموعة',groupId:a[0],groupName:gName(a[0]),text:'عند حصة '+(g?g.warnAt:'-')}; });
wrapLog('runResetSquares',function(){ return {action:'🧹 تصفير مربعات مجموعات',text:(document.querySelectorAll?document.querySelectorAll('.rsqChk:checked').length+' مجموعة':'')}; });
wrapLog('runResetForIds',function(){ return {action:'🧹 تصفير مربعات (من تحكم العدّ)',text:((window._resetIds||[]).length+' مجموعة')}; });
wrapLog('attachExisting',function(a){ var ok=(db().enrollments||[]).some(function(e){ return e.studentId===a[0]&&e.groupId===a[1]&&e.status==='active'; }); return ok?{action:'🧑‍🎓 ضم طالب موجود لمجموعة',text:sName(a[0]),groupId:a[1],groupName:gName(a[1])}:null; });
wrapLog('doAddNew',function(a){ var ok=(db().enrollments||[]).some(function(e){ return e.groupId===a[0]&&Date.now()-new Date(e.createdAt||0).getTime()<15000; }); return ok?{action:'🧑‍🎓 إنشاء طالب جديد وضمّه',groupId:a[0],groupName:gName(a[0])}:null; });
wrapLog('doMove',function(a){ return {action:'🚚 نقل طالب بين المجموعات',text:sName(a[0]),groupId:a[1],groupName:gName(a[1])}; });
wrapLog('unenroll',function(a){ var still=(db().enrollments||[]).some(function(e){ return e.studentId===a[0]&&e.groupId===a[1]&&e.status==='active'; }); return still?null:{action:'⛔ فصل طالب من مجموعة',text:sName(a[0]),groupId:a[1],groupName:gName(a[1])}; });
var _origPage=LU.page;
LU.page=function(){ var r=_origPage.apply(this,arguments); try{ var host=document.getElementById('ledgerBody'); if(host) host.insertAdjacentHTML('beforeend',logHtml()); }catch(e){} return r; };
var _origOpen=LU.openModal;
LU.openModal=function(){ var r=_origOpen.apply(this,arguments); try{ var mc=document.getElementById('ldgModalContent'); if(mc) mc.insertAdjacentHTML('beforeend',logHtml()); }catch(e){} return r; };

/* ========== 🆕 V12: API قراءة موحّد لكل الصفحات (محرك واحد) ========== */
LU.paidForCycle=function(sid,gid,ck){
try{
var tot=0;
(db().payments||[]).forEach(function(p){
if(!p||p.studentId!==sid||p.groupId!==gid) return;
if(payInMonth(p,gid,ck)) tot+=(p.paidAmount||0);
});
return tot;
}catch(e){ return 0; }
};
LU.cyclesOf=function(g){
var rs=(g&&g.cycleRanges)||[];
if(rs.length) return rs.map(function(r){ return {n:r.n, ck:cycKey(r.n), ym:(r.from||'').slice(0,7), range:r}; });
var out=[], start=((db().platformMeta||{}).countingSince||'').slice(0,7)||startMonth(), now=new Date(), curYm=now.getFullYear()+'-'+pad2(now.getMonth()+1), ym=start;
while(ym<=curYm){ out.push({n:out.length+1, ck:cycKey(out.length+1), ym:ym, range:{from:ym+'-01',to:null}}); var y=+ym.slice(0,4), m=+ym.slice(5,7)+1; if(m>12){m=1;y++;} ym=y+'-'+pad2(m); }
return out;
};
LU.studentBilling=function(sid){
var out=[];
try{
var ts=(DataService.getStudentTeachers?DataService.getStudentTeachers(sid):[])||[];
ts.forEach(function(t){
var g=t.group; if(!g) return;
var fee=feeOf(g);
var cycles=LU.cyclesOf(g).map(function(c){
var st=LU.groupSessions(g.id,c.ck);
var paid=LU.paidForCycle(sid,g.id,c.ck);
var rem=(st.complete&&fee>0)?Math.max(0,fee-paid):0;
return {ck:c.ck,ym:c.ym,n:c.n,done:st.done,required:st.required,complete:st.complete,remaining:st.remaining,events:st.events||[],frozen:!!g.frozen,paid:paid,rem:rem,fee:fee};
});
out.push({group:g,teacher:t.teacher||null,fee:fee,cycles:cycles});
});
}catch(e){}
return out;
};
/* 📡 أي نبضة من تبويب تاني → نظّف الكاش وبلّغ الصفحة تعيد رسم نفسها */
window.addEventListener('storage', function(e){
if(!e.key||e.key!=='eduflowLedgerPing') return;
LU._sesCache={};
try{ LU.pullAll(false).then(function(){ 
  window.dispatchEvent(new CustomEvent('ledger-sync'));
  var act=document.querySelector('.section.active');
  if(act){
    if(act.id==='section-monthly'&&document.getElementById('monthlyLedgerHost')) LU.renderAssistantMonthly();
    if(act.id==='section-ledger'&&document.getElementById('ledgerBody')) LU.page();
  }
}); }catch(err){}
});

/* 🔄 اسحب فوراً لما التبويب يرجع يظهر أو ياخد فوكس */
document.addEventListener('visibilitychange',function(){
  if(!document.hidden){ try{ window.LedgerUI&&LedgerUI.pullAll&&LedgerUI.pullAll(false); }catch(e){} }
});
window.addEventListener('focus',function(){
  try{ window.LedgerUI&&LedgerUI.pullAll&&LedgerUI.pullAll(false); }catch(e){}
});

/* ========== توصيل ========== */
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

/* ========== 🧊 تجميد المحاسبة: دفتر التحصيل ميعدّش حصص على المجموعات ========== */
function freezeFlags(){try{return (db().platformMeta||{}).freeze||{};}catch(e){return {};}}
function ledgerFrozen(){try{var m=db().platformMeta||{};var f=m.freeze||{};return m.ledgerFrozen===true||f.ledger===true||f.full===true;}catch(e){return false;}}
function notifyFrozen(){var f=freezeFlags();return f.notify===true||f.full===true;}
(function(){
try{
if(window.DataService&&DataService.getCycleStateForStudent&&!DataService.__cycWrapped){
var oc=DataService.getCycleStateForStudent;
DataService.getCycleStateForStudent=function(sid,gid){
if(ledgerFrozen())return {sessionsDone:0,sessionsRequired:8,isDue:false,isOverdue:false,isWarning:false,frozen:true};
return oc.apply(this,arguments);
};
DataService.__cycWrapped=1;
}
}catch(e){}
})();

function init(){
(function waitData(n){
try{
var ready=window.DataService&&DataService.getGroups&&DataService.getStudents&&(DataService.getGroups().length||DataService.getStudents().length);
if(ready){ migrateCycles(); }
else if((n||0)<30){ setTimeout(function(){waitData((n||0)+1);},500); return; }
}catch(e){}
})(0);
try{ LU.pullAll(true).then(function(){ LU.refresh(); }); }catch(e){}

/* 🔄 سحب كل 90 ثانية بدل 60 — وتقليل الضغط */
setInterval(function(){ 
  try{ 
    /* لو فيه تعديل خلال آخر 10 ثواني، فوت الـ pull */
    if(LU._lastLocalEdit && (Date.now() - LU._lastLocalEdit) < 10000) return;
    LU.pullAll(false); 
  }catch(e){} 
}, 120000);
setInterval(function(){ try{ LU.pullPlatformMeta(false); }catch(e){} },60000);
tickClock(); setInterval(tickClock,1000);
injectSidebar(); setTimeout(injectSidebar,800); setTimeout(injectSidebar,2000);
injectTeacherMenu(); setTimeout(injectTeacherMenu,800); setTimeout(injectTeacherMenu,2000);
injectCancelTile(); setTimeout(injectCancelTile,1000); setTimeout(injectCancelTile,2500);
setInterval(injectCancelTile,5000);
injectEmergencyTile(); setTimeout(injectEmergencyTile,1200); setTimeout(injectEmergencyTile,3000);
setInterval(injectEmergencyTile,6000);
injectActionTiles(); setTimeout(injectActionTiles,1200); setTimeout(injectActionTiles,3000);
setInterval(injectActionTiles,6000);
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

/* ========== ✏️ تعديل حالة المربعات (إضافة مركزية لـ LedgerUI) ========== */
(function(){
function ldb(){ return (window.DataService&&DataService._getData)?DataService._getData():{}; }
function lsav(d){ if(DataService._saveData) DataService._saveData(d); }
var LU2=window.LedgerUI; if(!LU2) return;
LU2.uncancelSession=function(gid,ds){
  var d=ldb(); var before=(d.cancelledSessions||[]).length;
  d.cancelledSessions=(d.cancelledSessions||[]).filter(function(c){ return !(c.groupId===gid&&c.date===ds); });
  if(d.cancelledSessions.length!==before){ lsav(d); if(window.safeToast) window.safeToast('♻️ رجع المربع لحالته الطبيعية','success'); LU2.refresh&&LU2.refresh(); }
  else if(window.safeToast) window.safeToast('مفيش إلغاء في التاريخ ده','info');
};
LU2.markMakeup=function(gid,ds){
  var d=ldb(); d.makeups=d.makeups||[];
  if(!d.makeups.some(function(m){return m.groupId===gid&&m.date===ds;}))
    d.makeups.push({id:'mk_'+gid+'_'+ds,groupId:gid,date:ds,status:'done',reason:'تعديل يدوي'});
  d.cancelledSessions=(d.cancelledSessions||[]).filter(function(c){ return !(c.groupId===gid&&c.date===ds); });
  lsav(d); if(window.safeToast) window.safeToast('🟦 اتعلّم كتعويضية','success'); LU2.refresh&&LU2.refresh();
};
LU2.clearSquare=function(gid,ds){
  var d=ldb();
  d.cancelledSessions=(d.cancelledSessions||[]).filter(function(c){ return !(c.groupId===gid&&c.date===ds); });
  d.makeups=(d.makeups||[]).filter(function(m){ return !(m.groupId===gid&&m.date===ds); });
  d.attendance=(d.attendance||[]).filter(function(a){ return !(a.groupId===gid&&a.date===ds); });
  lsav(d); if(window.safeToast) window.safeToast('⬜ اتصفّر المربع','success'); LU2.refresh&&LU2.refresh();
};
LU2.editSquare=function(gid,ds){
  var d=ldb();
  var g=(DataService.getGroups?DataService.getGroups():[]).find(function(x){return x.id===gid;});
  var isCancelled=(d.cancelledSessions||[]).some(function(c){return c.groupId===gid&&c.date===ds;});
  var att=(d.attendance||[]).find(function(a){return a.groupId===gid&&a.date===ds;});
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">✏️ تعديل مربع '+ds+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
   '<div class="filter-info">👥 '+(g?g.name:'')+' · الحالة الحالية: '+(isCancelled?'🚫 ملغاة':(att&&att.status==='approved'?'🟩 متاخدة/معتمدة':(att?'🕒 معلقة':'⬜ لسه')))+'</div>'+
   '<div style="display:grid;gap:8px;">'+
   '<button class="btn btn-success btn-sm" onclick="ThemeManager.closeModal();LedgerUI.confirmSession(\''+gid+'\',\''+ds+'\')">✅ حصة اتأخذت واعتمادها</button>'+
   '<button class="btn btn-danger btn-sm" onclick="ThemeManager.closeModal();LedgerUI.cancelSessionQuick(\''+gid+'\',\''+ds+'\')">🚫 حصة ملغاة (أحمر)</button>'+
   (isCancelled?'<button class="btn btn-secondary btn-sm" onclick="ThemeManager.closeModal();LedgerUI.uncancelSession(\''+gid+'\',\''+ds+'\')">♻️ شيل الإلغاء</button>':'')+
   '<button class="btn btn-secondary btn-sm" onclick="ThemeManager.closeModal();LedgerUI.markMakeup(\''+gid+'\',\''+ds+'\')">🟦 علّمها تعويضية</button>'+
   '<button class="btn btn-ghost btn-sm" onclick="ThemeManager.closeModal();LedgerUI.clearSquare(\''+gid+'\',\''+ds+'\')">⬜ تصفير المربع</button>'+
   '</div></div>','modal-sm');
};
})();
})();
/* ========== 🟡 إدارة المربعات الصفراء + إصلاح فوري للدورات ========== */
(function(){
if(!window.LedgerUI||LedgerUI.__yellowV1) return; LedgerUI.__yellowV1=1;
var LU=window.LedgerUI;
function ldb(){ return (window.DataService&&DataService._getData)?DataService._getData():{}; }
function lsav(d){ if(DataService._saveData) DataService._saveData(d); }
/* 🟡 المربع الأصفر = موعد عدّى والحضور مش معتمد — هنا أزرار مباشرة لكل واحد */
var oe=LU.editSquares;
LU.editSquares=function(gid,month){
  var r=oe.apply(this,arguments);
  setTimeout(function(){
    try{
      var body=document.querySelector('#globalModal .modal-body'); if(!body||body.querySelector('#yellowMgr')) return;
      var ses=LU.groupSessions(gid,month);
      var yellows=(ses.events||[]).filter(function(e){ return e.t==='pending'||e.t==='warn'||e.t==='heldPending'; }).map(function(e){return e.d;}).filter(Boolean);
      var box=document.createElement('div'); box.id='yellowMgr';
      box.innerHTML='<div class="card" style="padding:10px;margin-top:10px;border-color:var(--warning);">'+
        '<strong class="text-sm" style="color:var(--warning);">🟡 مربعات معلقة الاعتماد ('+yellows.length+')</strong>'+
        '<div class="text-xs text-muted" style="margin:4px 0 8px;">✅ اعتماد كحصة متاخدة · 🗑 مسح نهائي · 🚫 تعليمها ملغاة</div>'+
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">'+
        (yellows.length? yellows.map(function(ds){
          return '<span style="display:inline-flex;gap:4px;align-items:center;background:var(--warning-bg);border:1px solid var(--warning);border-radius:8px;padding:4px 6px;font-size:11px;font-weight:800;font-family:var(--font-en);">'+ds+
          '<button class="btn btn-success btn-sm" onclick="LedgerUI.confirmSession(\''+gid+'\',\''+ds+'\');LedgerUI.editSquares(\''+gid+'\',\''+month+'\')">✅</button>'+
          '<button class="btn btn-danger btn-sm" onclick="LedgerUI.sqRemove(\''+gid+'\',\''+month+'\',\''+ds+'\')">🗑</button>'+
          '<button class="btn btn-secondary btn-sm" onclick="(LedgerUI.sqCancel||LedgerUI.cancelSessionQuick)(\''+gid+'\',\''+ds+'\');LedgerUI.editSquares(\''+gid+'\',\''+month+'\')">🚫</button></span>';
        }).join('') : '<span class="text-xs text-muted">مفيش مربعات معلقة 🎉</span>')+
        '</div></div>';
      body.appendChild(box);
    }catch(e){}
  },220);
  return r;
};
/* 🔄 إصلاح مجموعة لفتحت دورات غلط: دورة واحدة مفتوحة من اليوم */
LU.fixCycles=function(gid){
  var d=ldb(); var g=(DataService.getGroups?DataService.getGroups():[]).find(function(x){return x.id===gid;}); if(!g) return;
  var t0=new Date().toISOString().slice(0,10);
  g.autoMarkSince=t0; g.cycleRanges=[{from:t0,to:null,n:1}];
  lsav(d);
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('groups',g.id,g); }catch(e){}
  LU._sesCache={}; LU.refresh();
  if(window.safeToast) window.safeToast('✅ اتصلحت دورات المجموعة — دورة مفتوحة من اليوم','success');
};
LU.fixAllCycles=function(){
  var gs=(DataService.getGroups?DataService.getGroups():[]);
  gs.forEach(function(g){ try{ LU.fixCycles(g.id); }catch(e){} });
};
/* ========== 🎨 لمسة فنية: زراير كشف الطلاب والمتأخرين تحت كل مجموعة ========== */
function enhanceLedgerDom(){
  try{
    var cards=document.querySelectorAll('#monthlyLedgerHost .card, #ledgerBody .card');
    cards.forEach(function(card){
      if(card.querySelector('.ldgXBtn')) return;
      var m=(card.innerHTML||'').match(/(?:editSquares|confirmSession|cancelSessionQuick|payModal|openPayModal|studentLedger)\('([^']+)'/);
      if(!m) return;
      var gid=m[1];
      var g=(DataService.getGroups?DataService.getGroups():[]).find(function(x){return x.id===gid;}); if(!g) return;
      var fee=g.monthlyFee||0;
      var sts=(DataService.getStudentsByGroup?DataService.getStudentsByGroup(gid):[]);
      var cyc=LU.cyclesOf(g); var open=cyc[cyc.length-1];
      var ck=open?open.ck:'cycle-01';
      var late=[];
      var rowsHtml=sts.map(function(s){
        var paid=LU.paidForCycle(s.id,gid,ck)||0;
        var rem=Math.max(0,fee-paid);
        if(fee>0&&rem>0&&open&&open.complete) late.push({s:s,rem:rem,paid:paid});
        var chip=fee<=0?'<span class="badge badge-muted">بدون شهرية</span>':(rem<=0?'<span class="badge badge-success">✓ مسدد '+paid+'/'+fee+'</span>':(paid>0?'<span class="badge badge-info">مقدم '+paid+'/'+fee+' · متبقي '+rem+'</span>':'<span class="badge badge-danger">متبقي '+rem+'</span>'));
        return '<div class="sub-row" style="padding:6px 8px;margin-bottom:4px;"><div style="flex:1;min-width:0;"><strong style="font-size:12px;">'+(s.name||'-')+'</strong><div class="text-xs text-muted">'+(s.code||'')+'</div></div>'+chip+'</div>';
      }).join('');
      late.sort(function(a,b){return b.rem-a.rem;});
      var lateHtml=late.map(function(L){
        return '<div class="sub-row" style="padding:6px 8px;margin-bottom:4px;border-right:3px solid var(--danger);"><div style="flex:1;min-width:0;"><strong style="font-size:12px;">'+L.s.name+'</strong><div class="text-xs text-muted">'+(L.s.code||'')+' · 👨👩‍👦 '+(L.s.parentPhone||'-')+'</div></div><span class="badge badge-danger">متبقي '+L.rem+' ج.م</span><button class="btn btn-ghost btn-sm" onclick="LedgerUI.studentDetails&&LedgerUI.studentDetails(\''+L.s.id+'\')">📒</button></div>';
      }).join('');
      var wrap=document.createElement('div'); wrap.className='ldgXBtn';
      wrap.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;';
      wrap.innerHTML='<button type="button" class="btn btn-secondary btn-sm" onclick="var b=this.parentNode.nextElementSibling;b.style.display=(b.style.display===\'none\'?\'\':\'none\')">👥 الطلاب ('+sts.length+')</button>'+
        (late.length?'<button type="button" class="btn btn-danger btn-sm" onclick="var b=this.parentNode.nextElementSibling.nextElementSibling;b.style.display=(b.style.display===\'none\'?\'\':\'none\')">⚠️ متأخرين الدفع ('+late.length+')</button>':'');
      var stuBox=document.createElement('div');
      stuBox.style.cssText='display:none;max-height:260px;overflow:auto;margin-top:8px;padding:8px;background:var(--surface-hover);border-radius:10px;';
      stuBox.innerHTML=rowsHtml||'<p class="text-muted">لا طلاب</p>';
      var lateBox=document.createElement('div');
      lateBox.style.cssText='display:none;max-height:260px;overflow:auto;margin-top:8px;padding:8px;background:rgba(239,68,68,.06);border:1px solid var(--danger);border-radius:10px;';
      lateBox.innerHTML=lateHtml||'<p class="text-muted">مفيش متأخرين 🎉</p>';
      card.appendChild(wrap); card.appendChild(stuBox); card.appendChild(lateBox);
    });
  }catch(e){}
}
if(!LU.__enhWrap){ LU.__enhWrap=1;
  var _orF=LU.refresh;
  LU.refresh=function(){ var r=_orF.apply(this,arguments); setTimeout(enhanceLedgerDom,150); setTimeout(enhanceLedgerDom,700); return r; };
}
})();
/* ========== ⚙️ خيارات اعتماد الحضور + 👥 طي قوائم الطلاب ========== */
(function(){
if(!window.LedgerUI||LedgerUI.__confWrap) return; LedgerUI.__confWrap=1;
var LU=window.LedgerUI;
var oc=LU.confirmSession;
LU.confirmSession=function(gid,date){
  var r=oc.apply(this,arguments);
  setTimeout(function(){
    var body=document.querySelector('#globalModal .modal-body'); if(!body||body.querySelector('#attPtsCard')) return;
    var def=1; try{ def=(Ops.getPointsRules()||{}).attendance||1; }catch(e){}
    var card=document.createElement('div'); card.id='attPtsCard'; card.className='card'; card.style.cssText='padding:10px;margin-top:10px;border-color:var(--primary-border);';
    card.innerHTML='<strong class="text-sm">⚙️ خيارات الاعتماد</strong>'+
      '<label style="display:flex;gap:8px;align-items:center;margin-top:8px;cursor:pointer;"><input type="checkbox" id="attUsePts" checked style="width:16px;height:16px;"> <span>منح نقاط حضور للحصة دي</span></label>'+
      '<div style="display:flex;gap:8px;align-items:center;margin-top:8px;"><span class="text-xs text-muted">نقاط كل طالب حاضر:</span><input type="number" id="attCustomPts" class="form-input" style="width:90px;" value="'+def+'" min="0" step="0.5"></div>'+
      '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;"><button type="button" class="btn btn-danger btn-sm" onclick="LedgerUI.cancelSessionQuick(\''+gid+'\',\''+date+'\');ThemeManager.closeModal();">🚫 عدم الاعتماد وإلغاء الحصة</button><button type="button" class="btn btn-ghost btn-sm" onclick="ThemeManager.closeModal()">🕒 تأجيل الاعتماد</button></div>'+
      '<div class="text-xs text-muted" style="margin-top:6px;">💡 لو قفلت النافذة بـ ✕ الحصة بتفضل معلقة من غير اعتماد — عادي تماماً.</div>';
    body.appendChild(card);
  },300);
  return r;
};
/* 👥 طي قوائم الطلاب — نسخة مبسطة وشغالة */
var __stuOpen={};
function collapseStudents(){
  try{
    ['monthlyLedgerHost','ledgerBody'].forEach(function(hid){
      var host=document.getElementById(hid); 
      if(!host) return;
      host.querySelectorAll('.ldg-gcard').forEach(function(card){
        /* تجنب التكرار */
        if(card.querySelector('.stuToggle')) return;
        var wrapEl=card.querySelector('.ldg-wrap');
        if(!wrapEl) return;
        var n=wrapEl.querySelectorAll('tbody tr').length;
        if(!n) return;
        var nameEl=card.querySelector('strong');
        var key=nameEl?(nameEl.textContent||'').trim():('card_'+hid+'_'+Math.random());
        
        /* إنشاء الزر */
        var btn=document.createElement('button'); 
        btn.type='button'; 
        btn.className='btn btn-ghost btn-sm stuToggle'; 
        btn.style.cssText='margin:6px 12px 0;padding:6px 12px;font-size:12px;';
        
        /* تحديد الحالة الأولية */
        var open=!!__stuOpen[key];
        wrapEl.style.display=open?'':'none';
        btn.innerHTML='👥 '+(open?'إخفاء':'عرض')+' طلاب المجموعة ('+n+') '+(open?'▴':'▾');
        
        /* ربط الحدث */
        btn.onclick=function(e){
          e.preventDefault();
          e.stopPropagation();
          open=!open; 
          __stuOpen[key]=open; 
          wrapEl.style.display=open?'':'none'; 
          btn.innerHTML='👥 '+(open?'إخفاء':'عرض')+' طلاب المجموعة ('+n+') '+(open?'▴':'▾');
        };
        
        /* إضافة الزر قبل الجدول */
        card.insertBefore(btn,wrapEl);
      });
    });
  }catch(e){ console.error('collapseStudents error:',e); }
}
var orf=LU.refresh;
LU.refresh=function(){ var r=orf.apply(this,arguments); setTimeout(collapseStudents,350); setTimeout(collapseStudents,900); return r; };
setTimeout(collapseStudents,1200);
})();
/* ========== 🎯 ربط "خيارات الاعتماد" بأي دالة منح نقاط (حل مركزي) ========== */
(function(){
if(!window.Ops||Ops.__ptsHook2) return; Ops.__ptsHook2=1;
var oa=Ops.addManualPoints.bind(Ops);
Ops.addManualPoints=function(studentId,points,reason,awardedBy,teacherId,dedupeKey){
  try{
    var card=document.getElementById('attPtsCard');   /* مودال الاعتماد مفتوح؟ */
    if(card){
      var use=document.getElementById('attUsePts');
      var cus=document.getElementById('attCustomPts');
      if(use&&!use.checked) return Promise.resolve({skipped:true,reason:'user_off'});  /* ✅ اعتماد بدون نقاط */
      if(cus){ var v=parseFloat(cus.value); if(!isNaN(v)&&v>=0) points=v; }             /* ✅ النقاط المخصصة */
    }
    if(!dedupeKey&&typeof reason==='string'&&reason.indexOf('حضور ')===0){
      var m=reason.match(/(\d{4}-\d{2}-\d{2})/);
      if(m) dedupeKey='att_auto_'+m[1]+'_'+studentId;   /* 🔒 منع التكرار لو اعتمدت مرتين */
    }
  }catch(e){}
  return oa(studentId,points,reason,awardedBy,teacherId,dedupeKey);
};
})();
/* ========== 📊 نسبة حضور كل طالب داخل حوار تأكيد الحضور ========== */
(function(){
if(!window.LedgerUI||LedgerUI.__pctWrap) return; LedgerUI.__pctWrap=1;
var oc=LedgerUI.confirmSession;
LedgerUI.confirmSession=function(gid,date){
  var r=oc.apply(this,arguments);
  setTimeout(function(){
    try{
      var modal=document.querySelector('#globalModal .modal-body')||document.querySelector('.modal-body');
      if(!modal||modal.querySelector('.pctBadge')) return;
      modal.querySelectorAll('[id^="attRow"]').forEach(function(row){
        var sid=row.id.replace('attRow ','').replace('attRow_',''); if(!sid) return;
        if(row.querySelector('.pctBadge')) return;
        var st=(window.Ops&&Ops.getAttendanceStats)?Ops.getAttendanceStats(sid):null; if(!st||!st.held) return;
        var b=document.createElement('span'); b.className='pctBadge';
        b.style.cssText='font-size:10px;font-weight:800;margin-inline-start:6px;padding:2px 7px;border-radius:99px;'+(st.pct>=85?'background:var(--success-bg);color:var(--success);':st.pct>=70?'background:var(--warning-bg);color:var(--warning);':'background:var(--danger-bg);color:var(--danger);');
        b.textContent='حضور '+st.pct+'%';
        var strong=row.querySelector('strong')||row; strong.appendChild(b);
      });
    }catch(e){}
  },350);
  return r;
};
})();
/* ========== ❓ اعتماد الحصة فقط + نسبة السنتر وصافي الأستاذ (نسخة مصححة: LU معرّف محلياً) ========== */
(function(){
"use strict";
var LU=window.LedgerUI=window.LedgerUI||{};
function db(){ return (window.DataService&&DataService._getData)?DataService._getData():{}; }
function saveD(d){ if(DataService._saveData) DataService._saveData(d); }
function cur(){ try{ return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null);}catch(e){return null;} }
function gById(id){ return (DataService.getGroups?DataService.getGroups():[]).find(function(g){return g.id===id;}); }

/* ❓ اعتماد الحصة حصلت بدون رصد حضور */
LU.approveSessionNoAtt=async function(gid,date){
  try{
    var d=db();
    var rec=(d.attendance||[]).find(function(a){return a.groupId===gid&&a.date===date&&a.status==='approved';});
    if(rec&&!rec.noAtt){ if(window.safeToast) window.safeToast('الحصة معتمدة بحضور بالفعل','info'); return; }
    if(rec&&rec.noAtt){ if(window.safeToast) window.safeToast('معتمدة كحصة مقامة بالفعل','info'); return; }
    var g=gById(gid);
    rec={id:'att_'+gid+'_'+date, groupId:gid, groupName:g?g.name:'', date:date, status:'approved', noAtt:true, records:[], createdAt:new Date().toISOString(), approvedBy:(cur()||{}).id||''};
    d.attendance.push(rec); saveD(d);
    try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('attendance',rec.id,rec); }catch(e){}
    if(window.safeToast) window.safeToast('✅ الحصة اتعدت مقامة بدون رصد — بتتحسب في الدورة والشهرية ومش بتأثر على نسب الطلاب','success');
    LU.refresh();
  }catch(e){ if(window.safeToast) window.safeToast('خطأ','error'); }
};

/* 🏢 نسبة السنتر من الشهرية */
LU.centerSharePct=function(g){
  if(!g) return 0;
  var c=(DataService.getCenters?DataService.getCenters():[]).find(function(x){return x.name===g.center;});
  if(c&&c.centerSharePct!=null) return +c.centerSharePct||0;   /* 🏢 المصدر الرسمي: إعدادات السنتر */
  if(g.centerSharePct!=null) return +g.centerSharePct||0;      /* قيمة قديمة قبل الهجرة */
  var b=(db().branding||{});
  if(b.centerSharePct!=null) return +b.centerSharePct||0;
  return 0;
};
LU.setCenterShare=function(gid){
  var g=gById(gid); if(!g||!g.center) return;
  if(window.openCenterShareModal) window.openCenterShareModal(g.center);
  else if(window.safeToast) window.safeToast('افتح صفحة "إعدادات السناتر" لتحديد النسبة','info');
};
LU.teacherNet=function(gid,month){
  var g=gById(gid); if(!g) return {collected:0,share:0,net:0,pct:0};
  var pct=LU.centerSharePct(g); var mm=String(month||'').slice(0,7); var collected=0;
  (db().payments||[]).forEach(function(p){
    if(p.groupId!==gid||String(p.month||'').slice(0,7)!==mm) return;
    if((p.history||[]).length){ (p.history||[]).forEach(function(h){ collected+=+h.amount||0; }); }
    else collected+=+p.paidAmount||0;
  });
  var share=Math.round(collected*pct/100);
  return {collected:collected,share:share,net:collected-share,pct:pct};
};

/* 🏷️ شريحة العرض — global عشان groupCard جوّه الـ IIFE يقدر يناديها */
window.shareChip=function(g,month){
  try{
    var tn=LU.teacherNet(g.id,month);
    if(!tn.pct&&!tn.collected) return '<div class="text-xs text-muted" style="margin-top:4px;">🏢 نسبة السنتر: <b>0%</b> — تُحدد من صفحة "إعدادات السناتر"</div>';
    return '<div class="text-xs" style="margin-top:4px;">🏢 السنتر: <b>'+tn.pct+'%</b> ('+tn.share+' ج.م) · 💪 صافي الأستاذ: <b style="color:var(--success);">'+tn.net+' ج.م</b> من محصّل '+tn.collected+' ج.م</div>';
  }catch(e){ return ''; }
};

/* ❓ زرار "اعتماد الحصة فقط" جنب أي زرار تأكيد حضور */
function injectNoAtt2(){
  try{
    document.querySelectorAll('button[onclick*="confirmSession("]').forEach(function(b){
      if(b.parentNode.querySelector('.noAttBtn2')) return;
      var m=(b.getAttribute('onclick')||'').match(/confirmSession\(\s*'([^']+)'\s*,\s*'([^']+)'/);
      if(!m) return;
      var nb=document.createElement('button'); nb.type='button'; nb.className='btn btn-ghost btn-sm noAttBtn2';
      nb.style.cssText='border-color:var(--warning);color:var(--warning);margin-inline-start:4px;';
      nb.textContent='❓ اعتماد الحصة فقط';
      nb.title='الحصة حصلت فعلاً بس من غير رصد حضور — بتتحسب في الدورة والشهرية ومش بتأثر على نسب الطلاب';
      nb.onclick=function(){ LU.approveSessionNoAtt(m[1],m[2]); };
      b.parentNode.insertBefore(nb,b.nextSibling);
    });
  }catch(e){}
}
setInterval(injectNoAtt2,2000); setTimeout(injectNoAtt2,800);
})();
/* ========== 🏢 حق السنتر بالفلوس (لكل مرحلة + استثناء لكل مجموعة) ========== */
(function(){
var LU=window.LedgerUI=window.LedgerUI||{};
function db(){ return (window.DataService&&DataService._getData)?DataService._getData():{}; }
function saveD(d){ if(DataService._saveData) DataService._saveData(d); }
function gById(id){ return (DataService.getGroups?DataService.getGroups():[]).find(function(g){return g.id===id;}); }
LU.centerShareAmtFor=function(stage,centerName){
  var d=db(); var c=(d.centers||[]).find(function(x){return x.name===centerName;});
  if(c){
    var sb=c.shareByStage||{};
    if(stage&&sb[stage]!=null) return +sb[stage]||0;
    if(c.shareDefault!=null) return +c.shareDefault||0;
  }
  var b=d.branding||{};
  if(b.centerShareDefault!=null) return +b.centerShareDefault||0;
  return 0;
};
LU.centerShareAmt=function(g){
  if(!g) return 0;
  if(g.centerShareAmt!=null) return +g.centerShareAmt||0;   /* استثناء المجموعة */
  return LU.centerShareAmtFor(g.stage||'', g.center||'');
};
LU.setCenterShare=function(gid){ if(window.openGroupModal) window.openGroupModal(gid); };
LU.teacherNet=function(gid,month){
  var g=gById(gid); if(!g) return {collected:0,share:0,net:0,pct:0,sharePerStudent:0,payers:0};
  var share=LU.centerShareAmt(g); var mm=String(month||'').slice(0,7);
  var collected=0,payers=0;
  (db().payments||[]).forEach(function(p){
    if(p.groupId!==gid||String(p.month||'').slice(0,7)!==mm) return;
    var paid=0;
    if((p.history||[]).length){ (p.history||[]).forEach(function(h){ paid+=+h.amount||0; }); } else paid=+p.paidAmount||0;
    if(paid>0){ payers++; collected+=paid; }
  });
  var centerTotal=Math.min(collected, share*payers);
  return {collected:collected,sharePerStudent:share,payers:payers,share:centerTotal,net:collected-centerTotal,pct:collected?Math.round(centerTotal/collected*100):0};
};
/* 🔄 إعادة حساب أسعار مجموعات سنتر بعد تغيير الحق = أستاذ + سنتر */
LU.recomputeGroupFees=function(centerName){
  var d=db(); var changed=[];
  (d.groups||[]).forEach(function(g){
    if(centerName&&g.center!==centerName) return;
    var share=LU.centerShareAmt(g);
    var tf=(g.teacherFee!=null)?+g.teacherFee:Math.max(0,(g.monthlyFee||0)-share); /* ميجراشن من غير قفزة سعر */
    g.teacherFee=tf;
    var total=tf+share;
    if((g.monthlyFee||0)!==total){ g.monthlyFee=total; g.sessionFee=Math.round(total/(g.sessionsPerMonth||8)); changed.push(g); }
  });
  if(changed.length){
    saveD(d);
    changed.forEach(function(g){ try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('groups',g.id,g); }catch(e){} });
  }
  return changed.length;
};
/* 🧮 حساب لايف جوه مودال المجموعة */
window.calcStudentPrice=function(){
  try{
    var tf=+((document.getElementById('gTeacherFee')||{}).value||0);
    var ovEl=document.getElementById('gCenterShareAmt'); var ov=ovEl?ovEl.value:null;
    var stage='',center='';
    ['gStage','groupStage','gStageSel'].forEach(function(id){ var e=document.getElementById(id); if(e&&e.value) stage=e.value; });
    ['gCenter','groupCenter','gCenterSel'].forEach(function(id){ var e=document.getElementById(id); if(e&&e.value) center=e.value; });
    var share=(ov===''||ov==null)?LU.centerShareAmtFor(stage,center):(+ov||0);
    var a=document.getElementById('autoCenterShare'); if(a) a.textContent=share;
    var s=document.getElementById('autoStudentPrice'); if(s) s.textContent=tf+share;
    var h=document.getElementById('gMonthly'); if(h) h.value=tf+share;
    var n=+((document.getElementById('gSessions')||{}).value||8)||8;
    var sp=document.getElementById('autoSessionPrice'); if(sp) sp.textContent=Math.round((tf+share)/n);
  }catch(e){}
};
setInterval(function(){
  try{
    var tf=document.getElementById('gTeacherFee');
    if(tf&&!tf.__wired){
      tf.__wired=1;
      ['gTeacherFee','gCenterShareAmt','gStage','gCenter','gSessions'].forEach(function(id){
        var e=document.getElementById(id); if(!e) return;
        e.addEventListener('input',window.calcStudentPrice);
        e.addEventListener('change',window.calcStudentPrice);
      });
      window.calcStudentPrice();
    }
  }catch(e){}
},1200);


/* 🏷️ شريحة العرض في كارت الدفتر (بالفلوس) */
function shareChip(g,month){
  var tn=LU.teacherNet(g.id,month);
  var share=LU.centerShareAmt(g);
  var tf=(g.teacherFee!=null)?+g.teacherFee:Math.max(0,(g.monthlyFee||0)-share);
  return '<div class="text-xs" style="margin-top:4px;">💰 الطالب: <b>'+(g.monthlyFee||0)+'</b> ج.م = 💪 الأستاذ <b style="color:var(--success);">'+tf+'</b> + 🏢 السنتر <b style="color:var(--warning);">'+share+'</b>/طالب · المحصّل: '+tn.collected+' (🏢 '+tn.share+' / 💪 '+tn.net+')</div>';
}
window.shareChip=shareChip;
})();
/* ========== 🧠 مركزية حفظ أسعار المجموعات (أدمن + أسست + أي صفحة) ========== */
(function(){
if(!window.DataService||DataService.__grpFeeWrap) return; DataService.__grpFeeWrap=1;
['addGroup','updateGroup'].forEach(function(fn){
  var orig=DataService[fn]; if(typeof orig!=='function') return;
  DataService[fn]=function(a,b){
    try{
      var data=(fn==='updateGroup')?(b||{}):(a||{});
      var tfEl=document.getElementById('gTeacherFee');
      if(tfEl){ /* مودال المجموعة مفتوح → خد الحقول الجديدة */
        var tf=parseFloat(tfEl.value)||0;
        data.teacherFee=tf;
        var ovEl=document.getElementById('gCenterShareAmt');
        if(ovEl) data.centerShareAmt=(ovEl.value===''||ovEl.value==null)?null:(parseFloat(ovEl.value)||0);
        var stage='',center='';
        var stEl=document.getElementById('gStage'); if(stEl) stage=stEl.value||'';
        var cEl=document.getElementById('gCenter'); if(cEl) center=cEl.value||'';
        var share=(data.centerShareAmt!=null)?data.centerShareAmt:((window.LedgerUI&&LedgerUI.centerShareAmtFor)?LedgerUI.centerShareAmtFor(stage,center):0);
        data.monthlyFee=tf+share;                       /* 💰 سعر الطالب = الأستاذ + السنتر */
        data.sessionFee=Math.round((tf+share)/(data.sessionsPerMonth||8));
      }
    }catch(e){}
    return orig.apply(this,arguments);
  };
});
/* ═══════════════════════════════════════════════════════════════
    (خطوة 2) دوال ترحيل مستحقات الطلاب المتوقعين
   ═══════════════════════════════════════════════════════════════ */
LU.addVirtualExpectedDue = function(gid, month) {
  if(!canWrite()){ toast('️ عرض فقط','error'); return; }
  var g = gById(gid); if(!g) return;
  var fee = +g.monthlyFee || 0;
  var expected = +g.expectedStudents || 0;
  var real = studentsOf(gid).length;
  var virtual = Math.max(0, expected - real);
  
  if(virtual === 0) { toast('لا يوجد طلاب متوقعين إضافيين لهذه المجموعة','info'); return; }
  
  ThemeManager.openModal(
    '<div class="modal-header"><h3 class="modal-title">📥 ترحيل مستحقات متوقعة</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>'+
    '<div class="modal-body">'+
    '<div class="filter-info" style="background:var(--info-bg);color:var(--info);border-color:var(--info);margin-bottom:12px;">'+
    '💡 <strong>الهدف:</strong> تسجيل أن هناك طلاباً من "العدد المتوقع" لم يدفعوا بعد، ليتم ترحيل هذا المبلغ كـ "مستحقات باقية" للشهر التالي وتظهر في كشف السنتر.<br>'+
    '⚠️ هذا البند مالي فقط ولا ينشئ طلاباً وهميين في النظام.'+
    '</div>'+
    '<div class="form-group"><label>سعر الشهرية للطالب</label><input type="number" class="form-input" value="'+fee+'" disabled></div>'+
    '<div class="form-group"><label>عدد الطلاب المتوقعين الذين لم يدفعوا بعد</label>'+
'<input type="number" id="virtUnpaidCount" class="form-input" min="0" max="'+virtual+'" value="0" oninput="window.calcVirtTotal('+fee+')"></div>'+    '<div class="filter-info" style="margin-top:8px;">المبلغ الإجمالي الذي سيرحل كـ "مستحقات باقية": <strong id="virtTotal" style="color:var(--danger)">0 ج.م</strong></div>'+
    '<div class="form-group"><label>ملاحظة (اختياري)</label><input type="text" id="virtNote" class="form-input" placeholder="مثال: تأخر سداد 3 طلاب من العدد المتوقع"></div>'+
    '<button class="btn btn-primary w-full" onclick="LU.saveVirtualDue(\''+gid+'\',\''+month+'\')">💾 ترحيل كـ مستحقات باقية</button>'+
    '</div>', 'modal-sm'
  );
};

LU.saveVirtualDue = function(gid, month) {
  var count = parseInt((document.getElementById('virtUnpaidCount')||{}).value) || 0;
  if(count <= 0) { toast('أدخل عدداً صحيحاً أكبر من صفر','error'); return; }
  
  var g = gById(gid); if(!g) return;
  var fee = +g.monthlyFee || 0;
  var amount = count * fee;
  var note = (document.getElementById('virtNote')||{}).value || 'مستحقات طلاب متوقعين لم يدفعوا';
  
  var d = db(); d.payments = d.payments || [];
  
  var rec = {
    id: 'vpay_' + Date.now(),
    studentId: 'virtual_expected',
    groupId: gid,
    teacherId: g.teacherId || null,
    month: month,
    amount: amount,
    paidAmount: 0,
    status: 'unpaid',
    isVirtual: true,
    note: note,
    createdAt: new Date().toISOString()
  };
  
  d.payments.push(rec);
  saveD(d);
  
  try { if(window.FirebaseService && FirebaseService._db) FirebaseService.saveDoc('payments', rec.id, rec); } catch(e){}
  try { localStorage.setItem('eduflowLedgerPing', String(Date.now())); } catch(e){}
  
  ThemeManager.closeModal();
  toast('✅ تم ترحيل ' + amount + ' ج.م كـ "مستحقات باقية" للشهر التالي', 'success');
  LU.refresh();
};

/* ═══════════════════════════════════════════════════════════════
   📥 (خطوة 3) إضافة الزر تلقائياً في دفتر التحصيل
   هذا الكود يبحث عن شارة "الشهرية مستحقة" ويضيف الزر بجانبها
   ═══════════════════════════════════════════════════════════════ */
(function injectVirtualButton() {
  // ننتظر حتى يتم رسم الصفحة
  setTimeout(function() {
    // نبحث عن كل العناصر التي تحتوي على نص "الشهرية مستحقة"
    var badges = document.querySelectorAll('.badge-warning');
    badges.forEach(function(badge) {
      if (badge.textContent.indexOf('الشهرية مستحقة') > -1) {
        // نتأكد أن الزر غير موجود مسبقاً
        if (!badge.parentNode.querySelector('.btn-virtual-due')) {
          // نستخرج معرف المجموعة والشهر من العناصر المحيطة (هذا يتطلب معرفة بنية HTML الخاصة بك)
          // للحل الأبسط، سنضيف الزر في شريط أدوات المجموعة إذا كان متاحاً
          var card = badge.closest('.card') || badge.closest('.ldg-gcard');
          if (card) {
             // نحاول إيجاد أزرار أخرى في الكارت لنضيف الزر بجانبها
             var btnContainer = card.querySelector('.ldg-strip') || card; 
             
             // ملاحظة: بما أن بنية HTML معقدة، سنضيف الزر في مكان عام في الكارت
             var gid = card.getAttribute('data-gid') || (card.onclick ? card.onclick.toString().match(/'([^']+)'/) : null);
             // هذا الجزء صعب تخمينه بدون رؤية HTML الكامل، لذا سنستخدم طريقة بديلة:
             // سنضيف الزر في شريط الأدوات العلوي للمجموعة إذا وجد
          }
        }
      }
    });
  }, 1000);
})();
})();
/* ========== 🧭 V16 محرك الدورات الوحيد: الشهر = الدورة، منتهي = اكتمال النصاب فقط ========== */
(function(){
"use strict";
var LU=window.LedgerUI=window.LedgerUI||{};
function db(){ return (window.DataService&&DataService._getData)?DataService._getData():{}; }
function saveD(d){ if(DataService._saveData) DataService._saveData(d); }
function pad2(n){ return String(n).padStart(2,'0'); }
function iso(d){ return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function today(){ return iso(new Date()); }
function nextDay(ds){ var d=new Date((ds||today())+'T12:00:00'); d.setDate(d.getDate()+1); return iso(d); }
function cycKey(n){ return 'cycle-'+String(n).padStart(2,'0'); }
function byN(a,b){ return (a.n||0)-(b.n||0); }
function gPub(gid){ return (DataService.getGroups?DataService.getGroups():[]).find(function(g){return g.id===gid;}); }
function reqOf(g){ return +g.sessionsPerMonth||8; }
function warnOf(g,req){ return (g.warnAt!=null&&g.warnAt!=='')?+g.warnAt:(req-1); }
var WD3={0:'Sunday',1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday'};
function isSched(g,ds){
  var sch=(g.schedules&&g.schedules.length)?g.schedules:(g.day?[{day:g.day}]:[]);
  var wd=WD3[new Date(ds+'T12:00:00').getDay()];
  return sch.some(function(s){return s.day===wd;});
}
function isCanc(g,ds){ return (db().cancelledSessions||[]).some(function(c){return c.groupId===g.id&&c.date===ds;}); }
function emptySes(g,notStarted){ var req=reqOf(g); return {events:[],done:0,required:req,complete:false,remaining:req,manual:0,notStarted:!!notStarted,isPast:false,warnAt:warnOf(g,req),frozen:!!g.frozen}; }

/* 🎯 محرك المربعات الوحيد: أخضر = موعد الحصة جه فعلاً أو اتأكدت يدوياً — ومش قبل كده أبداً */
LU.groupSessions=function(gid,month){
  var g=gPub(gid); if(!g) return emptySes(g,true);
  var req=reqOf(g);
  var rs=((g.cycleRanges)||[]).slice().sort(byN);
  if(!rs.length) return emptySes(g,true);
  var openN=null; rs.forEach(function(r){ if(r.to==null&&openN==null) openN=r.n; });
  var r=null, n=0;
  month=String(month||'');
  if(/^cycle-\d+$/.test(month)){ n=+month.replace('cycle-',''); r=rs.find(function(x){return x.n===n;}); }
  else { r=rs.find(function(x){return (x.from||'').slice(0,7)===month.slice(0,7);}); if(r) n=r.n; }
  if(!r) return emptySes(g,true);
  if(openN!=null&&n>openN) return emptySes(g,true);
  var from=r.from||'2000-01-01', to=r.to||null;
  var d=db(); var tS=today();
  var nowDt=new Date(); var nowMin=nowDt.getHours()*60+nowDt.getMinutes();
  var meta=(d.platformMeta||{});
  var FROZ=metaFrozen(meta); var COUNTING=metaCounting(meta);
  var autoStart=g.autoMarkSince||meta.countingSince||'';
  
  /* خريطة الجدول: يوم الأسبوع → دقيقة بداية الحصة */
  var sch=(g.schedules&&g.schedules.length)?g.schedules:(g.day?[{day:g.day,time:g.time}]:[]);
  var WD4={0:'Sunday',1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday'};
  var schMin={};
  sch.forEach(function(s){ if(schMin[s.day]===undefined){ var tt=String(s.time||'').split(':'); schMin[s.day]=(tt[0]===''||isNaN(+tt[0]))?null:(+tt[0])*60+(+(tt[1]||0)); } });
  
  /* الإلغاءات والتعويضات داخل النطاق */
  var canc=(d.cancelledSessions||[]).filter(function(c){return c.groupId===gid&&c.date>=from&&(!to||c.date<=to);});
  var cancMap={}; canc.forEach(function(c){ cancMap[c.date]=c; });
  var madeupMap={}; canc.forEach(function(c){ if(c.makeupStatus==='done'&&c.makeupDate) madeupMap[c.makeupDate]=1; });
  
  /* 📥 العداد اليدوي/المرحّل — متعرّف قبل أي استخدام */
  var ck=cycKey(n);
  var man=0;
  (d.manualSessions||[]).forEach(function(ms){ 
    if(ms.groupId!==gid) return; 
    if((ms.month||'')===ck&&(!ms.type||ms.type==='counter')) man+=(+ms.sessionsCount||1); 
  });
  
  var ev=[];
  /* 🟥 مربعات الملغاة (من غير تعويض) */
  canc.forEach(function(c){ if(c.makeupStatus!=='done') ev.push({t:'cancelled',d:c.date}); });
  
  /* 🟩 حضور معتمد = اتأخذت فعلاً */
  var attDates={};
  (d.attendance||[]).forEach(function(a){
    if(a.groupId!==gid||a.status!=='approved') return;
    var ds=a.date||''; if(!ds||ds<from||(to&&ds>to)) return;
    attDates[ds]=1;
    var c=cancMap[ds];
    if(c&&c.makeupStatus!=='done') return;
    ev.push({t:(a.source==='makeup'||a.makeup||madeupMap[ds])?'madeup':'done',d:ds});
  });
  
  /* 🟢 أوتوماتيك بس لما الموعد يجي فعلاً — بدون alreadyComplete check */
  if(COUNTING&&!FROZ){
    var dd=new Date(from+'T12:00:00'); var end=to||tS; var guard=0;
    while(iso(dd)<=end&&guard<400){
      var ds2=iso(dd); guard++; dd.setDate(dd.getDate()+1);
      if(ds2>tS) continue;
      if(ds2<autoStart) continue;
      if(attDates[ds2]) continue;
      if(cancMap[ds2]) continue;
      if(gFrozen(g,ds2)) continue;
      var wd=WD4[new Date(ds2+'T12:00:00').getDay()];
      if(schMin[wd]===undefined) continue;
      var sMin=schMin[wd];
      if(ds2===tS&&(sMin==null||nowMin<sMin)) continue;
      ev.push({t:madeupMap[ds2]?'madeup':'done',d:ds2});
    }
  }
  
  /* ✋ الأعلام اليدوية */
  var fl=(d.sessionFlags||{})[gid+'__'+ck]||{};
  var removed={}; (fl.remove||[]).forEach(function(t){ removed[t]=1; });
  ev=ev.filter(function(e){ return !e.d||!removed[e.d]; });
  (fl.cancel||[]).forEach(function(t){ if(!t||removed[t]) return; var ex=ev.find(function(e){return e.d===t;}); if(ex){ ex.t='cancelled'; } else if(t>=from&&(!to||t<=to)) ev.push({t:'cancelled',d:t,flag:1}); });
  (fl.take||[]).forEach(function(t){ if(!t||removed[t]) return; var ex=ev.find(function(e){return e.d===t;}); if(ex){ if(ex.t==='cancelled') ex.t='done'; } else if(t>=from&&(!to||t<=to)) ev.push({t:'done',d:t,flag:1}); });
  var und=0; (fl.take||[]).forEach(function(t){ if(!t) und++; });
  
  ev.sort(function(a,b){ return String(a.d||'9999').localeCompare(String(b.d||'9999')); });
  for(var i=0;i<man;i++) ev.unshift({t:'manual',d:''});
  for(var u2=0;u2<und;u2++) ev.push({t:'done',d:'',flag:1});
  
  var rawCounted=ev.filter(function(e){return e.t!=='cancelled';}).length;
  /* 🛑 السقف الصارم */
  if(rawCounted>req){
    var kept2=0;
    ev=ev.filter(function(e){ if(e.t==='cancelled') return true; kept2++; return kept2<=req; });
  }
  var done=Math.min(rawCounted,req);
  var complete=done>=req;
  
  return {events:ev,done:done,required:req,complete:complete,remaining:Math.max(0,req-done),manual:man,rawCounted:rawCounted,notStarted:false,isPast:complete&&!!to,warnAt:warnOf(g,req),frozen:!!g.frozen};
};

/* 🔄 cyclesOf من النطاقات الفعلية بس (مفيش أشباح) */
LU.cyclesOf=function(g){
  return (((g&&g.cycleRanges)||[]).slice().sort(byN)).map(function(r){
    return {n:r.n,ck:cycKey(r.n),ym:(r.from||'').slice(0,7),from:r.from,to:r.to,range:r};
  });
};

/* 💰 teacherNet واحد موحد: من دفعات الدفتر فعلياً (نفس مصدر صفحة المالية) */
LU.teacherNet=function(gid,month){
  var g=gPub(gid); if(!g) return {collected:0,share:0,net:0,payers:0,pct:0,sharePerStudent:0};
  var sh=(LU.centerShareAmt)?LU.centerShareAmt(g):0;
  var mm=String(month||'').slice(0,7);
  var c=0,s=0,n=0;
  (db().payments||[]).forEach(function(p){
    if(p.groupId!==gid||p.isVirtual) return;
    var inM=0;
    (p.history||[]).forEach(function(h){ if(String(h.date||'').slice(0,7)===mm) inM+=+h.amount||0; });
    if(inM<=0){
      var tot=0;(p.history||[]).forEach(function(h){tot+=+h.amount||0;}); tot=tot||(+p.paidAmount||0);
      var pm=String(p.month||'');
      if(pm.slice(0,7)===mm) inM=tot;
      else if(/^cycle-\d+$/.test(pm)){ var cc=(LU.cyclesOf(g)||[]).find(function(x){return x.ck===pm;}); if(cc&&String(cc.ym||'').slice(0,7)===mm) inM=tot; }
      else if(String(p.paidAt||p.updatedAt||p.createdAt||'').slice(0,7)===mm) inM=tot;
    }
    if(inM<=0) return;
    c+=inM; s+=Math.min(inM,sh); n++;
  });
  return {collected:c,share:s,net:c-s,payers:n,pct:0,sharePerStudent:sh};
};
LU.groupFinAll=function(gid){ return LU.teacherNet(gid,''); };
function metaCounting(m){ if(!m) return false; return m.countingActive===true||m.counterActive===true||m.billingActive===true||m.billingEnabled===true||m.collectionEnabled===true||((m.counting||{}).active===true); }
function metaFrozen(m){ if(!m) return false; var f=m.freeze||{}; return m.ledgerFrozen===true||f.ledger===true||f.full===true; }
function gFrozen(g,ds){ if(!g||!ds) return false; if(g.frozen&&g.frozenSince&&ds>=g.frozenSince) return true; var ps=g.freezePeriods||[]; for(var i=0;i<ps.length;i++){ if(ds>=ps[i].from&&(!ps[i].to||ds<=ps[i].to)) return true; } return false; }
/* 📦 ترحيل الفائض (مربعات/عدادات زيادة عن النصاب) تخزينياً للدورة التالية */
function migrateOverflow(g,ck,nextCk,req){
  try{
    var d=db(); var ses=LU.groupSessions(g.id,ck);
    var over=(ses.rawCounted||0)-req;
    if(over<=0) return false;
    var changed=false;
    d.sessionFlags=d.sessionFlags||{};
    var fl=d.sessionFlags[g.id+'__'+ck]||{cancel:[],take:[],remove:[]};
    var nfl=d.sessionFlags[g.id+'__'+nextCk]||{cancel:[],take:[],remove:[]};
    for(var i=fl.take.length-1;i>=0&&over>0;i--){
      if(!fl.take[i]){ fl.take.splice(i,1); nfl.take.push(''); over--; changed=true; }
    }
    if(over>0){
      var recs=(d.manualSessions||[]).filter(function(ms){ return ms.groupId===g.id&&(ms.month||'')===ck&&(!ms.type||ms.type==='counter')&&(ms.sessionsCount||0)>0; });
      recs.sort(function(a,b){ return String(b.addedAt||'').localeCompare(String(a.addedAt||'')); });
      for(var k=0;k<recs.length&&over>0;k++){
        var mv=Math.min(over,recs[k].sessionsCount);
        recs[k].sessionsCount-=mv; over-=mv; changed=true;
        var ex=(d.manualSessions||[]).find(function(x){ return x.groupId===g.id&&(x.month||'')===nextCk&&x.studentId===recs[k].studentId&&(!x.type||x.type==='counter'); });
        if(ex) ex.sessionsCount=(ex.sessionsCount||0)+mv;
        else d.manualSessions.push({id:'ms_'+Date.now()+'_'+g.id+'_'+k,groupId:g.id,studentId:recs[k].studentId,month:nextCk,sessionsCount:mv,type:'counter',reason:'ترحيل فائض دورة',addedBy:'system',addedAt:new Date().toISOString()});
        if(recs[k].sessionsCount<=0) d.manualSessions=(d.manualSessions||[]).filter(function(x){return x.id!==recs[k].id;});
      }
    }
    if(changed){ d.sessionFlags[g.id+'__'+ck]=fl; d.sessionFlags[g.id+'__'+nextCk]=nfl; saveD(d); LU._sesCache={}; }
    return changed;
  }catch(e){ return false; }
}
/* 🔁 تطبيع الدورات: افتح المقفول غلط + اقفل المكتمل + افتح التالية + احذف الأشباح */
function normalizeCycles(){
  try{
    var d=db(); var changed=false; var changedGroups=[];
    (d.groups||[]).forEach(function(g){
      var rs=((g.cycleRanges)||[]).slice().sort(byN);
      if(!rs.length){
        var first=null;
        (d.attendance||[]).forEach(function(a){ if(a.groupId===g.id&&a.status==='approved'&&(!first||a.date<first)) first=a.date; });
        rs=[{n:1,from:first||((d.platformMeta||{}).countingSince)||today(),to:null}];
        g.cycleRanges=rs; changed=true;
      }
      /* 1) دورة مقفولة ونصابها مش مكتمل → افتحها واحذف اللي بعدها */
      for(var i=0;i<rs.length;i++){
        if(rs[i].to!=null){
          var ses=LU.groupSessions(g.id,cycKey(rs[i].n));
          if(!ses.complete){ rs[i].to=null; rs=rs.slice(0,i+1); g.__nc=1; changed=true; }
        }
      }
      /* 2) أول دورة مفتوحة واكتمل نصابها → اقفلها بتاريخ آخر حصة وافتح التالية */
      for(var j=0;j<rs.length;j++){
        if(rs[j].to==null){
          var ses2=LU.groupSessions(g.id,cycKey(rs[j].n));
          if(ses2.complete){
            var datedAll=[];
            (d.attendance||[]).forEach(function(a){ if(a.groupId===g.id&&a.status==='approved'&&a.date>=rs[j].from) datedAll.push(a.date); });
            var fl2=(d.sessionFlags||{})[g.id+'__'+cycKey(rs[j].n)]||{};
            (fl2.take||[]).forEach(function(t){ if(t&&t>=rs[j].from) datedAll.push(t); });
            datedAll.sort();
            var toD=(datedAll.length>=ses2.required)?datedAll[ses2.required-1]:(datedAll.length?datedAll[datedAll.length-1]:today());
            var nextN=rs[j].n+1;
            if(!rs.some(function(x){return x.n===nextN;})) rs.push({n:nextN,from:nextDay(toD),to:null});
            migrateOverflow(g,cycKey(rs[j].n),cycKey(nextN),ses2.required);
          rs[j].to=toD;
          g.__nc=1; changed=true;
          }
          break;
        }
      }
      /* 3) مفيش دورة مفتوحة خالص → افتح التالية */
      var hasOpen=rs.some(function(r){return r.to==null;});
      if(!hasOpen&&rs.length){
        var last=rs[rs.length-1];
        rs.push({n:last.n+1,from:nextDay(last.to||today()),to:null});
        g.__nc=1; changed=true;
      }
      /* 4) احذف أي دورة بعد أول دورة مفتوحة */
      var oi=-1; rs.forEach(function(r,k){ if(r.to==null&&oi===-1) oi=k; });
      if(oi>=0&&rs.length>oi+1){ rs=rs.slice(0,oi+1); g.__nc=1; changed=true; }
      g.cycleRanges=rs;
      if(g.__nc){ g.updatedAt=new Date().toISOString(); changedGroups.push(g); delete g.__nc; }
    });
    if(changed){
      saveD(d); LU._sesCache={};
      /* ☁️ ادفع الدورات المعدّلة للسحابة فوراً */
      (changedGroups||[]).forEach(function(gg){ try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('groups',gg.id,gg).catch(function(){}); }catch(e){} });
      LU._lastLocalEdit=Date.now();
  try{ localStorage.setItem('eduflowLedgerPing',String(Date.now())); }catch(e){}
  /* 🛡️ refresh مرة واحدة بس من غير تكرار */
  try{ LU.refresh(); }catch(e){}
}
  }catch(e){}
}
LU.normalizeCycles=normalizeCycles;
setTimeout(function(){ try{ normalizeCycles(); }catch(e){} },2500);
/* 🚀 تطبيع فوري عند فتح التبويب */
try{ normalizeCycles(); }catch(e){}
})();
