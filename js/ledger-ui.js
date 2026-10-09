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
function isAdmin(){ var u=cur(); return u&&(u.role==='admin'||u.role==='super_admin'); }
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
var maxN=1;
groups().forEach(function(g){(g.cycleRanges||[]).forEach(function(r){if(r.to==null&&r.n>maxN)maxN=r.n;});});
return maxN;
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
return m;
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

/* ========== أعلام التعديل اليدوي (cancel/take/remove) ========== */
function fKey(gid,month){ return gid+'__'+month; }
function getFlags(gid,month){ var d=db(); var f=(d.sessionFlags||{})[fKey(gid,month)]||{cancel:[],take:[],remove:[]}; f.cancel=f.cancel||[]; f.take=f.take||[]; f.remove=f.remove||[]; return f; }
function setFlags(gid,month,fl){ var d=db(); d.sessionFlags=d.sessionFlags||{}; d.sessionFlags[fKey(gid,month)]=fl; saveD(d); try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('sessionFlags',fKey(gid,month),fl); }catch(e){} }

/* ========== 🟩🟥 المحرك الواحد للمربعات (🆕 بيستثني فترات تجميد المجموعة) ========== */
LU.groupSessions=function(gid,month){
month=normMonth(month);
LU._sesCache=LU._sesCache||{};
var ck=gid+'|'+month; if(LU._sesCache[ck]) return LU._sesCache[ck];
var g=gById(gid)||{}; var req=reqOf(g); var tStr=localToday();
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
if(countingActiveFlag(meta)&&!FROZ){
monthDays(month,gid).forEach(function(ds){
if(ds>tStr) return;
if(removed[ds]) return;
if(inGroupFreeze(g,ds)) return; /* 🆕 V11 */
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
var warnAt=(g.warnAt!=null&&g.warnAt!=='')?+g.warnAt:(req-1);
var cycleNum=parseInt(String(month).replace('cycle-',''))||1;
var curCycleNum=parseInt(String(localMonth()).replace('cycle-',''))||1;
var res={events:ev,done:done,required:req,complete:done>=req,remaining:Math.max(0,req-done),manual:M,isPast:cycleNum<curCycleNum,warnAt:warnAt,frozen:!!g.frozen};
LU._sesCache[ck]=res;
return res;
};
function sqStrip(s){
var html=s.events.map(function(e){
if(e.t==='manual') return '<span class="ldg-sq green" title="حصة مرحّلة/يدوية (محسوبة)">📥</span>';
if(!e.d&&e.flag) return '<span class="ldg-sq green" title="مربع مضاف يدوياً">＋</span>';
var day=String(e.d||'').slice(8,10);
if(e.t==='cancelled') return '<span class="ldg-sq red" title="'+e.d+' — ملغاة (مش محسوبة)">'+day+'</span>';
if(e.t==='madeup') return '<span class="ldg-sq blue" title="'+e.d+' — حصة تعويضية (محسوبة)">↺'+day+'</span>';
return '<span class="ldg-sq green" title="'+e.d+' — حصة محسوبة على كل طلاب المجموعة">'+day+'</span>';
}).join('');
for(var i=0;i<Math.max(0,s.required-s.done);i++) html+='<span class="ldg-sq gray" title="لسه مأخدتش"></span>';
return '<div class="ldg-strip">'+html+'<b class="ldg-count">'+s.done+'/'+s.required+'</b>'+(s.frozen?' <span class="badge badge-warning">🧊 مجمدة</span>':'')+(s.complete?' <span class="badge badge-warning">💰 الشهرية مستحقة</span>':'')+'</div>';
}

/* ========== ✏️ مودال المربعات: تحكم كامل ========== */
LU.editSquares=function(gid,month){
try{
month=normMonth(month||LU._st.month);
var g=gById(gid); var ses=LU.groupSessions(gid,month);
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
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">✏️ مربعات حصص: '+g.name+' — '+monthName(month, gid)+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'
+'<div class="filter-info">💡 الحالي: <strong>'+ses.done+'/'+ses.required+'</strong> · المتبقي حصص: <strong>'+ses.remaining+'</strong> · 🔔 الإنذار عند حصة <strong>'+ses.warnAt+'</strong>'+(ses.isPast?' · <span class="badge badge-muted">🔒 شهر منتهي</span>':'')+(g.frozen?' · <span class="badge badge-warning">🧊 مجمدة من '+(g.frozenSince||'-')+'</span>':'')+'</div>'
+'<div class="card" style="padding:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;"><div class="text-sm">🔔 إنذار الدفع عند الحصة رقم <b style="font-family:var(--font-en);">'+ses.warnAt+'</b> من '+ses.required+'</div><div style="display:flex;gap:6px;align-items:center;"><input type="number" id="sqWarnAt" class="form-input" style="width:80px;" min="1" max="'+ses.required+'" value="'+ses.warnAt+'"><button class="btn btn-secondary btn-sm" onclick="LedgerUI.setWarnAt(\''+gid+'\',\''+month+'\')">💾 حفظ</button></div></div>'
+'<div class="card" style="padding:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;"><div class="text-sm">📥 حصص مرحّلة على كل الطلاب: <b style="font-family:var(--font-en);">'+(ses.manual||0)+'</b></div><div style="display:flex;gap:6px;"><button class="btn btn-danger btn-sm" onclick="LedgerUI.carryDec(\''+gid+'\',\''+month+'\')">➖ أنقص</button><button class="btn btn-success btn-sm" onclick="LedgerUI.carryInc(\''+gid+'\',\''+month+'\')">➕ زوّد</button></div></div>'
+rows
+'<div class="card" style="padding:10px;margin-top:10px;"><strong class="text-sm">➕ إضافة مربعات يدوية</strong>'
+'<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;"><input type="date" id="sqNewDate" class="form-input" style="width:170px;">'
+'<button class="btn btn-success btn-sm" onclick="LedgerUI.sqAdd(\''+gid+'\',\''+month+'\',1)">➕ حصة بتاريخ</button>'
+'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.sqAdd(\''+gid+'\',\''+month+'\',0)">➕ مربع بدون تاريخ</button></div></div>'
+'</div>','modal-md');
}catch(e){ console.error(e); }
};
LU.sqToggle=function(gid,month,date,op){
var fl=getFlags(gid,month);
if(op==='cancel'){ if(fl.cancel.indexOf(date)<0) fl.cancel.push(date); fl.take=fl.take.filter(function(d){return d!==date;}); }
else { if(fl.take.indexOf(date)<0) fl.take.push(date); fl.cancel=fl.cancel.filter(function(d){return d!==date;}); fl.remove=fl.remove.filter(function(d){return d!==date;}); }
setFlags(gid,month,fl); LU.refresh(); LU.editSquares(gid,month);
};
LU.sqRemoveUndated=function(gid,month){
var fl=getFlags(gid,month); var i=(fl.take||[]).indexOf('');
if(i>=0){ fl.take.splice(i,1); setFlags(gid,month,fl); }
LU.refresh(); LU.editSquares(gid,month);
};
LU.sqAdd=function(gid,month,dated){
var fl=getFlags(gid,month);
if(dated){ var dv=(document.getElementById('sqNewDate')||{}).value; if(!dv){ if(window.safeToast) window.safeToast('اختار التاريخ الأول','error'); return; } if(fl.take.indexOf(dv)<0) fl.take.push(dv); fl.remove=fl.remove.filter(function(d){return d!==dv;}); }
else fl.take.push('');
setFlags(gid,month,fl); LU.refresh(); LU.editSquares(gid,month);
};
/* 🗑 حذف نهائي: يمسح الحضور + الإلغاء + يمنع الرجوع الأوتوماتيك — المربع بيختفي خالص */
LU.sqRemove=function(gid,month,date){
try{
if(!date) return LU.sqRemoveUndated(gid,month);
if(!confirm('حذف الحصة دي نهائياً من المربعات؟ (مش هتتحسب ومش هتحمر)')) return;
var d=db();
var hit=(d.attendance||[]).filter(function(a){return a.groupId===gid&&a.status==='approved'&&(a.date||'')===date;});
hit.forEach(function(a){ d.attendance=(d.attendance||[]).filter(function(x){return x.id!==a.id;}); cloudAtt(a,true); });
var c=(d.cancelledSessions||[]).find(function(x){return x.groupId===gid&&x.date===date;});
if(c){ d.cancelledSessions=(d.cancelledSessions||[]).filter(function(x){return x.id!==c.id;}); cloudCanc(c,true); }
var fl=getFlags(gid,month);
if(fl.remove.indexOf(date)<0) fl.remove.push(date);
fl.take=(fl.take||[]).filter(function(x){return x!==date;});
fl.cancel=(fl.cancel||[]).filter(function(x){return x!==date;});
setFlags(gid,month,fl); saveD(d);
if(window.safeToast) window.safeToast('🗑 الحصة اتمسحت من المربعات','success');
LU.refresh(); LU.editSquares(gid,month);
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
};
/* ↩️ شيل الإلغاء: المربع الأحمر يرجع أخضر أوتوماتيك */
LU.sqUncancel=function(gid,month,date){
try{
var d=db();
var c=(d.cancelledSessions||[]).find(function(x){return x.groupId===gid&&x.date===date;});
if(c){ d.cancelledSessions=(d.cancelledSessions||[]).filter(function(x){return x.id!==c.id;}); saveD(d); cloudCanc(c,true); }
var fl=getFlags(gid,month);
fl.cancel=(fl.cancel||[]).filter(function(x){return x!==date;});
setFlags(gid,month,fl);
if(window.safeToast) window.safeToast('↩️ الإلغاء اتشال — المربع رجع أخضر','success');
LU.refresh(); LU.editSquares(gid,month);
}catch(e){}
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
/* ➕➖ ترحيل/يدوي: زيادة ونقصان حقيقي بمقدار 1 */
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
var d=db(); d.manualSessions=d.manualSessions||[]; var touched=[];
var sts=studentsOf(gid); if(!sts.length){ if(window.safeToast) window.safeToast('مفيش طلاب في المجموعة','error'); return; }
sts.forEach(function(s){
var arr=(d.manualSessions||[]).filter(function(ms){ return ms.groupId===gid&&ms.studentId===s.id&&msInMonth(ms,gid,month)&&(!ms.type||ms.type==='counter'); });
if(arr.length){ arr.sort(function(a,b){ return String(b.addedAt||'').localeCompare(String(a.addedAt||'')); }); arr[0].sessionsCount=(arr[0].sessionsCount||0)+1; touched.push(arr[0]); }
else { var ms={id:'ms_'+Date.now()+'_'+s.id,groupId:gid,studentId:s.id,month:month,sessionsCount:1,type:'counter',reason:'إضافة يدوية',addedBy:(cur()||{}).id||'',addedAt:new Date().toISOString()}; d.manualSessions.push(ms); touched.push(ms); }
});
saveD(d);
for(var i=0;i<touched.length;i++){ await cloudMS(touched[i],false); }
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
return out;
}
function flagsOf(sid,g,month,ses){
var total=feeOf(g);
var p=payFor(sid,g.id,month), paid=paidOf(p);
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
else if(f.isDue) h+= f.paid>0 ? '<span class="badge badge-danger">💰 متبقي من شهرية '+monthName(month, gid)+': '+(f.total-f.paid)+'</span>' : '<span class="badge badge-danger">💰 مطلوب شهرية '+monthName(month, gid)+'</span>';
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
var tSel=isAdmin()?'<select class="form-select" onchange="LedgerUI.fset(\'teacher\',this.value)"><option value="">👨 كل الأساتذة</option>'+teachers.map(function(t){return '<option value="'+t.id+'" '+(f.teacher===t.id?'selected':'')+'>'+t.name+' ('+base.filter(function(g){return g.teacherId===t.id;}).length+')</option>';}).join('')+'</select>':'';
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
+'<select class="form-select" onchange="LedgerUI.fset(\'month\',this.value)">'+months.map(function(m){return '<option value="'+m+'" '+(nm===m?'selected':'')+'>'+monthName(m,f.gid||'')+(parseInt(m.replace('cycle-',''))<parseInt(localMonth().replace('cycle-',''))?' 🔒':'')+'</option>';}).join('')+'</select>'
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
if(!isAdmin()){ var tid=myTeacherId(); if(tid) list=list.filter(function(g){return g.teacherId===tid;}); }
else if(f.teacher) list=list.filter(function(g){return g.teacherId===f.teacher;});
if(f.center) list=list.filter(function(g){ return String(g.center||'').trim()===String(f.center).trim(); });
if(f.stage) list=list.filter(function(g){return (g.stage||'')===f.stage;});
if(f.grade) list=list.filter(function(g){ return gradeMatch(g.grade,f.grade); });
if(f.gid) list=list.filter(function(g){return g.id===f.gid;});
return list;
}

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
+'<button class="btn btn-ghost btn-sm" onclick="LedgerUI.refreshBtn()">🔄 تحديث</button>'
+'<button class="btn btn-warning btn-sm" onclick="window.openBulkBackfillModal&&window.openBulkBackfillModal()">📥 ترحيل حصص</button>'
+'<button class="btn btn-warning btn-sm" onclick="LedgerUI.openCancelModal()">🚫 إلغاء حصة</button>'
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
function carryHtml(month,gs){
var m=normMonth(month), rows=[];
(gs||[]).forEach(function(g){
studentsOf(g.id).forEach(function(s){
dueMonths(s.id,g.id,feeOf(g)).forEach(function(x){ if(x.month<m) rows.push({s:s,g:g,rem:x.rem,month:x.month}); });
});
});
if(!rows.length) return '';
return '<div class="card" style="border-color:var(--danger);margin-bottom:12px;"><div class="card-header"><h3 class="card-title" style="color:var(--danger);">⚠️ متأخرات مرحّلة ('+rows.length+')</h3><span class="points-badge">'+rows.reduce(function(a,r){return a+r.rem;},0)+' ج.م</span></div><div style="padding:10px;">'
+rows.map(function(r){ return '<div class="ldg-lrow" style="border-right:3px solid var(--danger);"><div style="flex:1;"><strong>'+(r.s?r.s.name:'-')+'</strong><div class="text-xs text-muted">'+(r.g?r.g.name:'-')+' · شهرية '+monthName(r.month, r.g.id)+' · متبقي '+r.rem+' ج.م</div></div><div style="display:flex;gap:4px;"><button class="btn btn-success btn-sm" onclick="LedgerUI.payModal(\''+r.s.id+'\',\''+r.g.id+'\',\''+r.month+'\')">💰 تحصيل</button><button class="btn btn-ghost btn-sm" onclick="LedgerUI.studentDetails(\''+r.s.id+'\')">👁</button></div></div>'; }).join('')
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
return '<div class="ldg-lrow" style="border-right:3px solid '+(r.f.isWarn&&!r.f.isDue&&!r.f.isLate?'var(--warning)':'var(--danger)')+';"><div style="flex:1;"><strong>'+r.s.name+'</strong> <span class="badge '+(r.f.isWarn&&!r.f.isDue&&!r.f.isLate?'badge-warning':'badge-danger')+'">'+tag+'</span><div class="text-xs text-muted">'+r.g.name+' · مطلوب: '+dueTxt+' · حصصه: '+r.ses.done+'/'+r.ses.required+'</div></div><div style="display:flex;gap:4px;align-items:center;">'+(r.f.isWarn&&!r.f.isDue?'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.notifyBringFee(\''+r.s.id+'\',\''+r.g.id+'\')">🔔 بلّغه</button>':'')+'<button class="btn btn-success btn-sm" onclick="LedgerUI.payModal(\''+r.s.id+'\',\''+r.g.id+'\')">💰 تحصيل</button><button class="btn btn-ghost btn-sm" onclick="LedgerUI.studentDetails(\''+r.s.id+'\')">👁 تفاصيل</button></div></div>';
}).join(''):'<p class="text-xs text-muted">الكل دافع 🎉</p>';
h+='</div></div>';
return h;
}

/* ========== 🔔 إشعار مرة واحدة فقط لكل مجموعة/شهر ========== */
function scanNotify(gs,month){
try{
if(!countingActiveFlag((db().platformMeta||{}))||notifyFrozen()) return;
var d=db(); d.warn7=d.warn7||{}; d.due8=d.due8||{};
gs.forEach(function(g){
var ses=LU.groupSessions(g.id,month); var key=g.id+'__'+month; var fee=feeOf(g);
if(!ses.complete&&ses.done>=ses.warnAt&&!d.warn7[key]){
d.warn7[key]=1;
studentsOf(g.id).forEach(function(s){
var fl=flagsOf(s.id,g,month,ses); if(fl.isPaid) return;
if(DataService.addNotification) DataService.addNotification({targetUserId:s.id,title:'🔔 جهز الشهرية',message:'باقي '+(ses.required-ses.done)+' حصة على اكتمال حصص '+monthName(month)+' — الشهرية ('+fee+' ج.م) هتتبطلب لما توصل '+ses.required+'/'+ses.required+'.',type:'payment',priority:'medium',meta:{event:'due_warn'}});
});
}
if(ses.complete&&!d.due8[key]){
d.due8[key]=1;
studentsOf(g.id).forEach(function(s){
var fl=flagsOf(s.id,g,month,ses); if(fl.isPaid) return;
if(DataService.addNotification) DataService.addNotification({targetUserId:s.id,title:'💰 الشهرية مستحقة الآن',message:'اكتملت حصص '+monthName(month)+' ('+ses.done+'/'+ses.required+') — المستحق: '+fee+' ج.م. شكراً لتعاونكم 🌹',type:'payment',priority:'high',meta:{event:'due_now'}});
});
}
if(ses.complete&&month===localMonth()&&(g.sessionNow||0)>=ses.required){
var allPaid=true;
studentsOf(g.id).forEach(function(s){
var fl=flagsOf(s.id,g,month,ses); if(!fl.isPaid) allPaid=false;
});
if(allPaid){
d.notifyEmitted=d.notifyEmitted||{};
var transKey='trans_suggest_'+g.id+'_'+month;
if(!d.notifyEmitted[transKey]){
d.notifyEmitted[transKey]=Date.now();
var targets2=(DataService.getUsers?DataService.getUsers():[]).filter(function(u){return u.role==='assistant'||u.role==='admin';});
targets2.forEach(function(u){
if(DataService.addNotification) DataService.addNotification({targetUserId:u.id,title:'🔄 '+g.name+' جاهزة للانتقال',message:'الشهر اكتمل وكل الطلاب دفعوا — يمكن طلب الانتقال للشهر الجديد من الدفتر',type:'general',priority:'medium',meta:{event:'month_transition_suggest'}});
});
}
}
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

/* ========== كارت مجموعة ========== */
function groupCard(g,month,mode,rowsAll){
var rows=rowsAll?rowsAll.filter(function(r){return r.g.id===g.id;}):buildRows([g],month);
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
+pend.slice(-3).map(function(ds){ return '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:4px;"><span class="text-xs" style="font-family:var(--font-en);font-weight:800;">'+ds+'</span><button class="btn btn-success btn-sm" onclick="LedgerUI.confirmSession(\''+g.id+'\',\''+ds+'\')">✅ تأكيد حضور الطلاب</button><button class="btn btn-danger btn-sm" onclick="LedgerUI.cancelSessionQuick(\''+g.id+'\',\''+ds+'\')">🚫 الحصة اتلغت</button></div>'; }).join('')
+(pend.length>3?'<div class="text-xs text-muted">+ '+(pend.length-3)+' يوم تاني معلّق — سوّيهم من زرار 🚫 إلغاء حصة في التولبار</div>':'')
+'</div>';
}
var head='<div class="ldg-ghead">'
+'<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">'
+'<div style="font-weight:800;font-size:13px;">👥 '+g.name+' <span class="text-xs text-muted">· 👨‍ '+tName+' · 🏢 '+(g.center||'-')+' · '+(g.grade||'-')+' · 💰 '+fee+' · '+rows.length+' طالب</span> '+(ses.isPast?'<span class="badge badge-muted">🔒 منتهي</span>':'')+' <span class="badge badge-info">🔔 إنذار عند '+ses.warnAt+'</span>'+(g.frozen?'<span class="badge badge-warning">🧊 '+freezeLabel(g)+'</span>':'')+'</div>'
+'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">'
+'<span class="text-xs" style="color:var(--success);font-weight:800;">💰 محصل '+collected+'</span>'
+'<span class="text-xs" style="color:var(--danger);font-weight:800;">متبقي '+remaining+'</span>'
+'<span class="badge badge-info">🟩 متبقي حصص: '+ses.remaining+'</span>'
+(isAdmin()?(g.frozen?'<button class="btn btn-success btn-sm" onclick="LedgerUI.setGroupFrozen(\''+g.id+'\',false)">▶️ تفعيل العد</button>':'<button class="btn btn-warning btn-sm" onclick="LedgerUI.setGroupFrozen(\''+g.id+'\',true)">🧊 تجميد</button>'):'')
+(mode==='view'?'':'<button class="btn btn-ghost btn-sm" onclick="LedgerUI.editSquares(\''+g.id+'\',\''+month+'\')">✏️ المربعات</button>')
+(mode==='view'?'':'<button class="btn btn-primary btn-sm" onclick="window.openGroupModal&&window.openGroupModal(\''+g.id+'\')">⚙️ تعديل المجموعة</button>')
+(mode==='view'?'':'<button class="btn btn-secondary btn-sm" onclick="LedgerUI.addStudentModal(\''+g.id+'\')">➕ طالب</button>')
+((!ses.isPast&&ses.complete&&month===localMonth())?'<button class="btn btn-warning btn-sm" onclick="LedgerUI.requestMonthTransition(\''+g.id+'\')">🔄 طلب انتقال للشهر الجديد</button>':'')
+'</div></div>'
+sqStrip(ses)
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

/* ========== 💵 تحصيل ========== */
LU.payModal=function(sid,gid,month){
try{
var g=gById(gid), s=DataService.getUserById?DataService.getUserById(sid):null;
var total=feeOf(g);
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
var g=gById(pm.gid); var total=feeOf(g);
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
var g=gById(pm.gid); var total=feeOf(g);
var paid=paidOf(payFor(pm.sid,pm.gid,m)); var rem=Math.max(0,total-paid);
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
var dms=dueMonths(sid,g.id,feeOf(g));
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
if(on&&g.frozen) return false;
if(!on&&!g.frozen) return false;
if(on){ g.frozen=true; g.frozenSince=localToday(); }
else{ var from=g.frozenSince||localToday(); g.freezePeriods=g.freezePeriods||[]; g.freezePeriods.push({from:from,to:localToday()}); g.frozen=false; g.frozenSince=null; }
var d=db(); saveD(d);
try{ if(DataService.updateGroup) await DataService.updateGroup(gid,{frozen:g.frozen,frozenSince:g.frozenSince||null,freezePeriods:g.freezePeriods||[]}); }catch(e){}
try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('groups',gid,g); }catch(e){}
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

/* ========== 🔄 طلب الانتقال للشهر الجديد (بموافقة المساعد/الأدمن) ========== */
LU.requestMonthTransition=function(gid){
try{
var g=gById(gid); if(!g) return;
var curM=localMonth();
var ses=LU.groupSessions(gid,curM);
if(!ses.complete){ if(window.safeToast) window.safeToast('الشهر الحالي لسه مكملش ('+ses.done+'/'+ses.required+')','error'); return; }
var d=db(); d.pendingMonthTransitions=d.pendingMonthTransitions||[];
var existing=d.pendingMonthTransitions.find(function(p){return p.groupId===gid&&p.month===curM&&p.status==='pending';});
if(existing){ if(window.safeToast) window.safeToast('في طلب سابق لسه معلق على المجموعة دي','info'); return; }
var nextM=cycKey((parseInt(curM.replace('cycle-',''))||1)+1);
var u=(window.currentUser||null);
var req={id:'mt_'+Date.now()+'_'+gid,groupId:gid,groupName:g.name,fromMonth:curM,toMonth:nextM,status:'pending',requestedBy:(u&&u.id)||'',requestedAt:new Date().toISOString()};
d.pendingMonthTransitions.push(req);
saveD(d);
try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('pendingMonthTransitions',req.id,req); }catch(e){}
var targets=(DataService.getUsers?DataService.getUsers():[]).filter(function(x){return x.role==='assistant'||x.role==='admin'||x.role==='super_admin';});
targets.forEach(function(x){
if(DataService.addNotification) DataService.addNotification({targetUserId:x.id,title:'🔄 طلب انتقال شهر جديد',message:'مجموعة '+g.name+' كملت حصص '+monthName(curM)+' ('+ses.done+'/'+ses.required+') وطلبت فتح شهر '+monthName(nextM)+' — محتاج موافقتك',type:'general',priority:'high',meta:{event:'month_transition_req',kind:'month_transition'}});
});
if(window.safeToast) window.safeToast('🔄 تم إرسال الطلب — هيظهر زرار الموافقة فوق الدفتر','success');
LU.refresh();
}catch(e){ if(window.safeToast) window.safeToast('خطأ: '+e.message,'error'); }
};

/* مودال الطلبات المعلقة */
window.openMonthTransitionsModal=function(){
try{
var d=db(); var list=(d.pendingMonthTransitions||[]).filter(function(p){return p.status==='pending';});
var html='<div class="modal-header"><h3 class="modal-title">🔔 طلبات الانتقال للشهر الجديد ('+list.length+')</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">';
if(!list.length) html+='<p class="text-muted" style="text-align:center;padding:20px;">مفيش طلبات معلقة حالياً</p>';
else html+=list.map(function(p){
return '<div class="sub-row" style="border-right:3px solid var(--warning);margin-bottom:8px;"><div style="flex:1;"><strong>👥 '+p.groupName+'</strong><div class="text-xs text-muted">من '+monthName(p.fromMonth)+' → '+monthName(p.toMonth)+'</div><div class="text-xs text-muted">🕐 '+new Date(p.requestedAt).toLocaleString('ar-EG')+'</div></div><div style="display:flex;gap:6px;"><button class="btn btn-success btn-sm" onclick="window.approveMonthTransition(\''+p.id+'\')">✓ موافقة</button><button class="btn btn-danger btn-sm" onclick="window.rejectMonthTransition(\''+p.id+'\')">✗ رفض</button></div></div>';
}).join('');
html+='</div>';
ThemeManager.openModal(html,'modal-md');
}catch(e){ console.error(e); }
};

window.approveMonthTransition=async function(id){
try{
var d=db(); var req=(d.pendingMonthTransitions||[]).find(function(p){return p.id===id;});
if(!req) return;
if(!confirm('موافقة على انتقال مجموعة '+req.groupName+' لشهر '+monthName(req.toMonth)+'؟')) return;
req.status='approved'; req.approvedBy=(cur()||{}).id||''; req.approvedAt=new Date().toISOString();
var g=gById(req.groupId);
if(g){ try{ var rs2=rangesOf(g).slice(); var openR2=null; rs2.forEach(function(r){if(r.to==null)openR2=r;}); if(openR2){openR2.to=localToday(); rs2.push({n:openR2.n+1,from:nextDay(localToday()),to:null});} if(DataService.updateGroup) await DataService.updateGroup(g.id,{sessionNow:0,sessionNowMonth:req.toMonth,cycleRanges:rs2}); }catch(e){} }
saveD(d);
try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('pendingMonthTransitions',req.id,req); }catch(e){}
if(window.safeToast) window.safeToast('✅ تمت الموافقة — العداد صفّر للشهر الجديد','success');
ThemeManager.closeModal(); LU.refresh();
}catch(e){ if(window.safeToast) window.safeToast('خطأ','error'); }
};

window.rejectMonthTransition=async function(id){
try{
var d=db(); var req=(d.pendingMonthTransitions||[]).find(function(p){return p.id===id;});
if(!req) return;
if(!confirm('رفض طلب الانتقال لمجموعة '+req.groupName+'؟')) return;
req.status='rejected'; req.rejectedBy=(cur()||{}).id||''; req.rejectedAt=new Date().toISOString();
saveD(d);
try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('pendingMonthTransitions',req.id,req); }catch(e){}
if(window.safeToast) window.safeToast('✗ تم الرفض','info');
ThemeManager.closeModal(); LU.refresh();
}catch(e){}
};

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
html+='<div id="attStList" style="max-height:400px;overflow:auto;">';
html+=sts.map(function(s){
var st=existingMap[s.id]||'present';
window._attMarks[s.id]=st;
var presAct=st==='present'?'opacity:1;font-weight:900;':'opacity:0.5;';
var absAct=st==='absent'?'opacity:1;font-weight:900;':'opacity:0.5;';
return '<div class="sub-row" style="padding:8px;" id="attRow_'+s.id+'"><div style="flex:1;"><strong>'+s.name+'</strong><div class="text-xs text-muted">'+(s.code||'')+'</div></div><div style="display:flex;gap:6px;"><button class="btn btn-success btn-sm" id="attP_'+s.id+'" style="'+presAct+'" onclick="window.attMark(\''+s.id+'\',\'present\',this)">✓ حاضر</button><button class="btn btn-danger btn-sm" id="attA_'+s.id+'" style="'+absAct+'" onclick="window.attMark(\''+s.id+'\',\'absent\',this)">✗ غائب</button></div></div>';
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
var attPts=(gamification.evalPoints&&gamification.evalPoints.attendance)||5;
var present=records.filter(function(r){return r.status==='present';});
var absent=records.filter(function(r){return r.status==='absent';});
var awarded=0;
for(var i=0;i<present.length;i++){
try{if(typeof Ops!=='undefined'&&Ops.addManualPoints){await Ops.addManualPoints(present[i].studentId,attPts,'حضور '+date+' ('+g.name+')',(cur()||{}).id||'');awarded++;}}catch(e){}
}
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
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🚫 إلغاء حصة</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'
+'<div class="filter-info">💡 الإلغاء بيعلّم المربع أحمر ✗ في دفتر التحصيل فوراً، وبيتحسب دين تعويض، وبيفضل ظاهر في صندوق "حصص محتاجة تسوية" لحد ما تتعوض.</div>'
+'<div class="form-group"><label>المجموعة</label><select id="cnGroup" class="form-select">'+gs.map(function(g){return '<option value="'+g.id+'" '+(g.id===prefGid?'selected':'')+'>'+g.name+'</option>';}).join('')+'</select></div>'
+'<div class="form-group"><label>تاريخ الحصة *</label><input type="date" id="cnDate" class="form-input" value="'+(prefDate||tStr)+'" max="'+tStr+'"></div>'
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

/* 🚫 tile سريع في لوحة الأستاذ/المساعد لو مش موجود */
function injectCancelTile(){
try{
var u=cur(); if(!u||(u.role!=='teacher'&&u.role!=='assistant')) return;
if(document.getElementById('qaCancelSession')) return;
if(document.querySelector('[onclick*="openCancelSessionModal"]')) return;
var first=document.querySelector('#section-overview .quick-action');
if(!first||!first.parentNode) return;
var b=document.createElement('button'); b.type='button'; b.className='quick-action'; b.id='qaCancelSession';
b.innerHTML='<div class="quick-action-icon">🚫</div><div class="quick-action-label">إلغاء حصة</div>';
b.onclick=function(){ LedgerUI.openCancelModal(); };
first.parentNode.appendChild(b);
}catch(e){}
}

/* ========== 📡 حصص اليوم + إجراءات ========== */
window.openTodaySessionsModal=function(){
try{
var gs=isAdmin()?groups():myGroups();
var todayDs=localToday();
var wd=WD[new Date(todayDs+'T12:00:00').getDay()];
var d=db(); var rows=[];
gs.forEach(function(g){
var sch=(g.schedules&&g.schedules.length)?g.schedules:(g.day?[{day:g.day,time:g.time}]:[]);
sch.forEach(function(s){
if(s.day!==wd)return;
var att=(d.attendance||[]).find(function(a){return a.groupId===g.id&&a.date===todayDs&&a.status==='approved';});
var canc=(d.cancelledSessions||[]).find(function(c){return c.groupId===g.id&&c.date===todayDs;});
rows.push({g:g,time:s.time||'',status:canc?'cancelled':(att?'taken':'pending')});
});
});
rows.sort(function(a,b){return String(a.time||'').localeCompare(String(b.time||''));});
var html='<div class="modal-header"><h3 class="modal-title">📡 حصص اليوم — '+todayDs+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">';
html+=rows.length?rows.map(function(r){
var badge=r.status==='taken'?'<span class="badge badge-success">✅ اتأخذت</span>':r.status==='cancelled'?'<span class="badge badge-danger">🚫 ملغية</span>':'<span class="badge badge-warning">⏳ لسه</span>';
return '<div class="sub-row" style="margin-bottom:8px;"><div style="flex:1;"><strong>'+(r.time||'--:--')+' — '+r.g.name+'</strong><div class="text-xs text-muted">'+(r.g.center||'')+' · '+(r.g.grade||'')+'</div></div><div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;">'+badge+
(r.status==='pending'?'<button class="btn btn-success btn-sm" onclick="ThemeManager.closeModal();LedgerUI.confirmSession(\''+r.g.id+'\',\''+todayDs+'\')">✅ حضور</button>':'')+
(r.status!=='cancelled'?'<button class="btn btn-danger btn-sm" onclick="ThemeManager.closeModal();LedgerUI.cancelSessionQuick(\''+r.g.id+'\',\''+todayDs+'\')">🚫 إلغاء</button>':'')+
'<button class="btn btn-ghost btn-sm" onclick="ThemeManager.closeModal();LedgerUI.editSquares(\''+r.g.id+'\',\''+normMonth(LU._st.month)+'\')">✏️</button>'+
(r.g.whatsappLink?'<button class="btn btn-ghost btn-sm" onclick="window.openGroupWa(\''+r.g.id+'\')">💬</button>':'')+
'</div></div>';
}).join(''):'<p class="text-muted" style="text-align:center;padding:20px;">مفيش حصص مجدولة اليوم</p>';
html+='</div>';
ThemeManager.openModal(html,'modal-md');
}catch(e){console.error(e);}
};
window.openGroupWa=function(gid,msg){
var g=gById(gid);var link=g&&(g.whatsappLink||'');
if(msg&&navigator.clipboard&&navigator.clipboard.writeText){try{navigator.clipboard.writeText(msg);}catch(e){}}
if(link){window.open(link,'_blank');if(window.safeToast)window.safeToast(msg?'📋 الرسالة منسوخة — افتحنا الجروب، الصقها وابعتها':'💬 فتحنا جروب المجموعة','info');}
else if(window.safeToast)window.safeToast('مفيش رابط واتساب مسجل للمجموعة','error');
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
var pts=(d.gamification&&d.gamification.evalPoints&&d.gamification.evalPoints.attendance)||5;
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

/* ========== 🔁 قفل الدورات تلقائياً لما المربعات تكمل (🆕 بتتخطى فترات التجميد) ========== */
function countedDatesIn(gid,from,to){
var d=db();var out={};var start=(d.platformMeta||{}).countingSince||'';
var gg=gById(gid);
(d.attendance||[]).forEach(function(a){if(a.groupId===gid&&a.status==='approved'&&a.date&&a.date>=from&&(!to||a.date<=to)&&(!start||a.date>=start)&&!inGroupFreeze(gg,a.date))out[a.date]=1;});
Object.keys(d.sessionFlags||{}).forEach(function(k){if(k.indexOf(gid+'__')===0){(d.sessionFlags[k].take||[]).forEach(function(t){if(t&&t>=from&&(!to||t<=to)&&!inGroupFreeze(gg,t))out[t]=1;});(d.sessionFlags[k].remove||[]).forEach(function(t){if(t)delete out[t];});}});
return Object.keys(out).sort();
}
function autoCloseCycles(){
var d=db();var m=d.platformMeta||{};var f=m.freeze||{};
if(m.ledgerFrozen===true||f.ledger===true||f.full===true)return;
var changed=false;
groups().forEach(function(g){
var rs=g.cycleRanges||[];if(!rs.length)return;
var open=null;rs.forEach(function(r){if(r.to==null)open=r;});
if(!open)return;
var req=reqOf(g)||8;
var dates=countedDatesIn(g.id,open.from,null);
var man=0;try{man=manualCount(g.id,'cycle-'+String(open.n).padStart(2,'0'));}catch(e){}
if(dates.length+man>=req){
var to=dates.length?dates[dates.length-1]:localToday();
open.to=to;
rs.push({n:open.n+1,from:nextDay(to),to:null});
changed=true;
}
});
if(changed){groups().forEach(function(g){try{if(DataService.updateGroup)DataService.updateGroup(g.id,{cycleRanges:g.cycleRanges});}catch(e){}});saveD(d);LU._sesCache={};}
}

/* ========== ريفريش ========== */
LU.refresh=function(){
try{
autoCloseCycles();
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
try{migrateCycles();}catch(e){console.error(e);}
try{ LU.pullPlatformMeta(true).then(function(){ LU.refresh(); }); }catch(e){}
setInterval(function(){ try{ LU.pullPlatformMeta(false).then(function(){ LU.refresh(); }); }catch(e){} },60000);
tickClock(); setInterval(tickClock,1000);
injectSidebar(); setTimeout(injectSidebar,800); setTimeout(injectSidebar,2000);
injectTeacherMenu(); setTimeout(injectTeacherMenu,800); setTimeout(injectTeacherMenu,2000);
injectCancelTile(); setTimeout(injectCancelTile,1000); setTimeout(injectCancelTile,2500);
setInterval(injectCancelTile,5000);
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
})();