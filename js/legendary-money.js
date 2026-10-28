/* ================================================================
💰 LEGENDARY MONEY V8 — المركز المالي النهائي المتكامل
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 الفلسفة:
   • مصدر حقيقة واحد: LedgerUI (نفس محرك دفتر التحصيل)
   • الأدمن = تقارير إدارية شاملة (read-only)
   • المساعد = تنفيذي على مجموعاته فقط (scoped write)
   • مزامنة لحظية عبر ledger-sync event
   • الطاقة الاستيعابية المتوقعة (expectedStudents) للحسابات
   • المتأخرات الدقيقة (دورة-واعية + Cache)

🗂 التبويبات:
   1. 📊 نظرة عامة — KPIs دقيقة
   2. 🏦 الخزينة — وقفة كل سنتر
   3. 👥 المجموعات — تفاصيل مالية + تعديل المتوقع
   4. 👨‍🏫 الأساتذة — [للأدمن] تقارير شاملة
   5. 📈 التقارير — [للأدمن] Executive Dashboard
   6. 🎟️ الخصومات — إدارة الخصومات
   7. 💳 المصروفات — تسجيل ومتابعة
   8. 📉 الرسوم — تحليلات بيانية
   9. ⚙️ الإعدادات — قواعد عامة
================================================================ */
(function(){
"use strict";

var LM = window.LM = window.LG = window.LG || {};

/* ═══════════════════════════════════════════════════════════════
   1. الأدوات الأساسية
   ═══════════════════════════════════════════════════════════════ */
function db(){ return (window.DataService&&DataService._getData)?DataService._getData():{}; }
function saveD(d){ if(DataService._saveData) DataService._saveData(d); }
function cur(){ try{ return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null); }catch(e){ return null; } }
function role(){ var u=cur(); return u?u.role:''; }
function isAdmin(){ return role()==='admin'; }
function isSuper(){ return role()==='super_admin'; }
function isAssistant(){ return role()==='assistant'; }
function canWrite(){ return isAssistant()||isSuper(); }
function canView(){ var r=role(); return r==='assistant'||r==='admin'||r==='super_admin'||r==='center'; }
function LU(){ return window.LedgerUI||{}; }
function body(){ return document.getElementById('lgMoneyBody'); }
function pad(n){ return String(n).padStart(2,'0'); }
function todayStr(){ var d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function monthStr(){ var d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1); }
function monthName(m){ if(!m) return '-'; var n=+String(m).slice(5,7); var names=['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']; return names[n]||m; }
function toast(m,t){ try{ if(window.safeToast) window.safeToast(m,t||'info'); }catch(e){} }
function fmtMoney(n){ n=+n||0; return n.toLocaleString('ar-EG',{minimumFractionDigits:0,maximumFractionDigits:2}); }

/* ═══════════════════════════════════════════════════════════════
   2. النطاق والصلاحيات
   ═══════════════════════════════════════════════════════════════ */
function myGroups(){
  var gs=(DataService.getGroups?DataService.getGroups():[]);
  var u=cur(); if(!u) return gs;
  if(isAssistant()){
  var sc=(window.Ops&&Ops.groupsInScope)?(Ops.groupsInScope(u.id)||[]):[];
  if(sc.length) return sc;
  var tid0=(window.getMyTeacherId?window.getMyTeacherId():null);
  if(tid0){ var f0=gs.filter(function(g){return g.teacherId===tid0;}); if(f0.length) return f0; }
  return gs; /* 🛡️ مفيش تعيين؟ يشوف الكل بدل شاشة "مش في النطاق" */
}
  if(role()==='teacher'){ return gs.filter(function(g){return g.teacherId===u.id;}); }
  return gs;
}
function myCenters(){ var s={}; myGroups().forEach(function(g){ if(g.center) s[g.center]=1; }); return Object.keys(s).sort(); }
function allGroups(){ return DataService.getGroups?DataService.getGroups():[]; }
function allCenters(){ var s={}; allGroups().forEach(function(g){ if(g.center) s[g.center]=1; }); return Object.keys(s).sort(); }
function studentsOf(gid){ return (DataService.getStudentsByGroup?DataService.getStudentsByGroup(gid):[])||[]; }
function tName(tid){ return ((DataService.getUserById?DataService.getUserById(tid):null)||{}).name||'-'; }
function gName(gid){ return ((DataService.getGroups?DataService.getGroups():[]).find(function(g){return g.id===gid;})||{}).name||'-'; }
function stuName(sid){ var s=DataService.getUserById?DataService.getUserById(sid):null; return (s&&s.name)||'-'; }

/* ═══════════════════════════════════════════════════════════════
   3. محرك الأرقام (من LedgerUI مباشرة — نفس المصدر للكل)
   ═══════════════════════════════════════════════════════════════ */
function sharePerStudent(g){ 
  var L=LU(); 
  if(L.centerShareAmt) return L.centerShareAmt(g)||0; 
  return 0; 
}
function teacherPerStudent(g){ 
  return (g.teacherFee!=null)?+g.teacherFee:Math.max(0,(g.monthlyFee||0)-sharePerStudent(g)); 
}
function paidOfP(p){ var t=0;(p.history||[]).forEach(function(h){t+=+h.amount||0;}); return t||(+p.paidAmount||0); }
function amountInMonth(p,g,ym){
  var h=0; 
  (p.history||[]).forEach(function(e){ 
    if(String(e.date||'').slice(0,7)===ym) h+=+e.amount||0; 
  });
  if(h>0) return h;
  
  var tot=paidOfP(p); 
  if(tot<=0) return 0;
  
  var pm=String(p.month||'');
  
  // 1. لو الشهر ميلادي ومطابق
  if(pm.slice(0,7)===ym) return tot;
  
  // 2. لو الشهر cycle-NN → حوّله للشهر الميلادي عبر cycleRanges
  if(/^cycle-\d+$/.test(pm)){
    try{
      var L=LU();
      var cc=(L.cyclesOf?L.cyclesOf(g):[]).find(function(x){return x.ck===pm;});
      if(cc && String(cc.ym||'').slice(0,7)===ym) return tot;
    }catch(e){}
  }
  
  // 3. Fallback: تاريخ الدفع الفعلي (paidAt)
  var paidAt=String(p.paidAt||p.updatedAt||p.createdAt||'').slice(0,7);
  if(paidAt===ym) return tot;
  
  // 4. Fallback أخير: لو في history فيها أي تاريخ، اعتبر آخر تاريخ هو تاريخ الدفع
  if((p.history||[]).length){
    var lastDate = (p.history||[]).slice(-1)[0].date || '';
    if(String(lastDate).slice(0,7)===ym) return tot;
  }
  
  return 0;
}
/* المصدر الوحيد: دفعات دفتر التحصيل — المحصّل وحق السنتر وصافي الأستاذ */
function monthNet(g,m){
  var ym=String(m).slice(0,7);
  var sh=sharePerStudent(g);
  var c=0,s=0,n=0;
  (db().payments||[]).forEach(function(p){
    if(p.groupId!==g.id) return;
    var inM=amountInMonth(p,g,ym);
    if(inM<=0) return;
    c+=inM; s+=Math.min(inM,sh); n++;
  });
  return {collected:c, share:s, net:c-s, payers:n};
}
/* 💰 حسابات الدورات المكتملة: المفروض يتحصل / اللي اتحصل منها / اللي لسه */
function completedCycleMoney(g){
  var L=LU(); var fee=+g.monthlyFee||0;
  var sup=0, paid=0;
  if(fee&&L.cyclesOf&&L.paidForCycle){
    (L.cyclesOf(g)||[]).forEach(function(c){
      var ses=(L.groupSessions)?L.groupSessions(g.id,c.ck):null;
      if(!ses||!ses.complete) return;
      studentsOf(g.id).forEach(function(s){
        sup+=fee;
        paid+=(L.paidForCycle(s.id,g.id,c.ck)||0);
      });
    });
  }
  /* المستحقات الرجعية المسجلة يدوياً */
  (db().payments||[]).forEach(function(p){
    if(p.groupId===g.id&&p.legacy){ sup+=+p.amount||0; paid+=+p.paidAmount||0; }
  });
  return {sup:sup, paid:paid, uncol:Math.max(0,sup-paid)};
}
/* ❌ اللي لسه متحصلش من الطلاب (دورات مكتملة غير مسددة) — مش في الخزينة لحد ما يتحصل */
function dueAmount(g){ return completedCycleMoney(g).uncol; }

function monthsSince(){
  var s=''; try{ s=localStorage.getItem('ldgStartMonth')||''; }catch(e){}
  if(!s||s<'2026-10') s='2026-10';
  var out=[], y=+s.slice(0,4), m=+s.slice(5,7), cur=monthStr(), cy=+cur.slice(0,4), cm=+cur.slice(5,7);
  var guard=0;
  while((y<cy||(y===cy&&m<=cm))&&guard<60){ out.push(y+'-'+pad(m)); m++; if(m>12){m=1;y++;} guard++; }
  return out;
}
function netAll(g){ return monthsSince().reduce(function(s,m){ return s+(monthNet(g,m).net||0); },0); }
function collectedAll(gid){
  var t=0; 
  (db().payments||[]).forEach(function(p){ 
    if(p.groupId!==gid) return;
    t+=paidOfP(p);
  });
  return t;
}

/* ═══════════════════════════════════════════════════════════════
   🎯 الطاقة الاستيعابية المتوقعة (expectedStudents)
   • expectedStudents = عدد الطلاب اللي السنتر ادّاه للمستخدم
   • بيتحسب في الحسابات المالية بس — مش بيتضاف كطلاب فعليين
   • لو فيه 25 فعلي و expected = 30 → المحسوب = 30 (25 فعلي + 5 افتراضي)
   • لو فيه 50 فعلي و expected = 30 → المحسوب = 50 (الفعلي أعلى)
   ═══════════════════════════════════════════════════════════════ */
function accountedStudents(g){
  var real = studentsOf(g.id).length;
  var expected = +g.expectedStudents || 0;
  return Math.max(real, expected);
}
function virtualStudents(g){
  return Math.max(0, accountedStudents(g) - studentsOf(g.id).length);
}

function groupFinanceExtended(g, month){
  var real = studentsOf(g.id).length;
  var expected = +g.expectedStudents || 0;
  var accounted = Math.max(real, expected); // للمقارنة والتخطيط فقط
  var virtual = Math.max(0, accounted - real);
  
  var fee = +g.monthlyFee || 0;
  var share = sharePerStudent(g);
  var teacherFee = teacherPerStudent(g);
  
  // 1. المحصّل الفعلي من دفتر التحصيل (هذا هو مصدر الحقيقة للخزينة)
  var tn = monthNet(g, month);
  var actualCollected = tn.collected || 0;
  
  // 2. حساب حق السنتر وصافي الأستاذ بناءً على "المحصل الفعلي" فقط (السيناريو أ)
  // إذا كان المحصل 6000، والسنتر نصيبه 100 من كل 300، يأخذ السنتر ثلث الـ 6000 فقط.
  var ratio = 0;
  var centerShareFromActual = tn.share || 0;
  var teacherNetFromActual = (tn.net != null) ? tn.net : (actualCollected - centerShareFromActual);
  
  // 3. الأرقام "المفترضة" للمقارنة والتخطيط فقط (لا تؤثر على الخزينة)
  var expectedTotal = accounted * fee;
  var expectedShare = accounted * share;
  var expectedTeacher = accounted * teacherFee;
  
  // 4. المستحقات الباقية (تشمل ديون الفعليين + ديون المتوقعين التي تم ترحيلها)
  // ملاحظة: ديون المتوقعين تضاف يدوياً عبر دالة LU.addVirtualExpectedDue وتُخزن في payments
  var outstanding = Math.max(0, expectedTotal - actualCollected);
  
  return {
    real: real, expected: expected, accounted: accounted, virtual: virtual,
    fee: fee, share: share, teacherFee: teacherFee,
    actualCollected: actualCollected,
    centerShareFromActual: centerShareFromActual, // هذا ما يُحسب للسنتر فعلياً
    teacherNetFromActual: teacherNetFromActual,   // هذا ما يُحسب للأستاذ فعلياً
    expectedTotal: expectedTotal,
    expectedShare: expectedShare,
    expectedTeacher: expectedTeacher,
    outstanding: outstanding
  };
}

/* ═══════════════════════════════════════════════════════════════
   🎯 حساب المتأخرات الحقيقية (دورة-واعي)
   • الدورة الحالية لسه مكملة + دفع ناقص = ❌ مش متأخر
   • الدورة الحالية اكتملت + دفع ناقص = ✅ مستحق حقيقي
   • شهور سابقة اكتملت + دفع ناقص = ✅ متأخرات مرحّلة
   • Cache للأداء
   ═══════════════════════════════════════════════════════════════ */
var _unpaidCache = {};
function groupUnpaidCount(g, month){
  var key = g.id + '|' + month;
  if(_unpaidCache[key] !== undefined) return _unpaidCache[key];
  
  var sts = studentsOf(g.id);
  var fee = +g.monthlyFee || 0;
  if(!fee){ _unpaidCache[key] = 0; return 0; }
  
  var L = LU();
  var cnt = 0;
  
  var cyc = (L.cyclesOf) ? L.cyclesOf(g) : [];
  var ck = cyc.length ? cyc[cyc.length-1].ck : month;
  var sesCurrent = (L.groupSessions) ? L.groupSessions(g.id, ck) : null;
  var allMonths = monthsSince();
  
  sts.forEach(function(s){
    var paidCurrent = (L.paidForCycle) ? L.paidForCycle(s.id, g.id, ck) : 0;
    var isDueNow = sesCurrent && sesCurrent.complete && paidCurrent < fee;
    
    var hasOverdue = false;
    if(!isDueNow){
      for(var i=0; i<allMonths.length; i++){
        var m = allMonths[i];
        if(m === ck) continue;
        var mSes = (L.groupSessions) ? L.groupSessions(g.id, m) : null;
        if(mSes && mSes.complete){
          var mPaid = (L.paidForCycle) ? L.paidForCycle(s.id, g.id, m) : 0;
          if(mPaid < fee){ hasOverdue = true; break; }
        }
      }
    }
    if(isDueNow || hasOverdue) cnt++;
  });
  
  _unpaidCache[key] = cnt;
  return cnt;
}
function clearUnpaidCache(){ _unpaidCache = {}; }

/* ═══════════════════════════════════════════════════════════════
   4. حركات السنتر اليدوية
   ═══════════════════════════════════════════════════════════════ */
function txOf(center){ return (db().centerTransactions||[]).filter(function(x){return x.center===center;}); }
function txSum(list,k){ return list.filter(function(x){return x.kind===k;}).reduce(function(s,x){return s+(+x.amount||0);},0); }
function txSumExp(list){ return list.filter(function(x){return String(x.kind||'').indexOf('expense_')===0;}).reduce(function(s,x){return s+(+x.amount||0);},0); }
function payoutsOfCenter(center){
  var gids={}; 
  myGroups().forEach(function(g){ if(g.center===center) gids[g.id]=1; });
  return (db().teacherPayouts||[]).filter(function(p){ return gids[p.groupId]; });
}

function standing(center,month){
  var gs=myGroups().filter(function(g){return g.center===center;});
  var mNet=0, mColl=0, mShare=0, allNet=0, allColl=0, uncol=0, allSup=0, allPaidC=0;
  
  gs.forEach(function(g){ 
    var ext = groupFinanceExtended(g, month);
    mNet += ext.teacherNetFromActual;
    mColl += ext.actualCollected;
    mShare += ext.centerShareFromActual;
    
    // ✅ تم إصلاح الـ void الكارثي — الآن التراكمي بيتحسب فعلاً
    allNet += monthsSince().reduce(function(s,m){ 
      var e2 = groupFinanceExtended(g, m); 
      return s + e2.teacherNetFromActual; 
    }, 0);
    allColl += collectedAll(g.id);
    var ccm = completedCycleMoney(g);
    uncol += ccm.uncol; allSup += ccm.sup; allPaidC += ccm.paid;
  });
  
  var tx=txOf(center);
  var openOwes=txSum(tx,'open_center_owes');
  var openIOwe=txSum(tx,'open_i_owe');
  var openRec=txSum(tx,'open_received');
  var received=txSum(tx,'received');
  var expBack=txSumExp(tx);
  var canteen=txSum(tx,'canteen');
  var advance=txSum(tx,'advance_teacher');
  var pays=payoutsOfCenter(center);
  var paidT=pays.reduce(function(s,p){return s+(+p.amount||0);},0);
  
  // الخزينة = (صافي الأستاذ الفعلي التراكمي + الافتتاحي) - (ما تم سحبه/دفعه)
  var remaining = allNet + openOwes - openIOwe - openRec + expBack - received - canteen - advance - paidT;
  
    return {gs:gs,mNet:mNet,mColl:mColl,mShare:mShare,allNet:allNet,allColl:allColl,uncol:uncol,allSup:allSup,allPaidC:allPaidC,
    openOwes:openOwes, openIOwe:openIOwe, openRec:openRec, received:received, expBack:expBack,
    canteen:canteen, advance:advance, paidT:paidT, pays:pays, remaining:remaining, tx:tx};
}
/* ═══════════════════════════════════════════════════════════════
   5. التبويبات والحالة
   ═══════════════════════════════════════════════════════════════ */
var ST={month:monthStr(), center:'', tab:'overview', dq:''};

function getTabs(){
  var t=[['overview','📊 نظرة عامة'],['treasury','🏦 الخزينة'],['groups','👥 المجموعات']];
  if(isAdmin()||isSuper()){ t.push(['teachers','👨‍🏫 الأساتذة'],['executive','📈 التقارير الإدارية']); }
  t.push(['discounts','🎟️ الخصومات'],['expenses','💳 المصروفات'],['reports','📉 الرسوم'],['settings','⚙️ الإعدادات']);
  return t;
}

LM.renderMoneyPage=function(){
  if(!canView()) return;
  var host=body(); if(!host) return;
  var bar=document.getElementById('lgMoneyTabs');
  if(bar&&!bar.__built){
    var tabs=getTabs();
    bar.innerHTML=tabs.map(function(t){ return '<button class="section-tab" data-mt="'+t[0]+'" onclick="LM.tab(\''+t[0]+'\')">'+t[1]+'</button>'; }).join('');
    bar.__built=1;
  }
  LM.tab(ST.tab);
};

LM.tab=function(t){
  var valid=getTabs().map(function(x){return x[0];});
  if(valid.indexOf(t)<0) t='overview';
  ST.tab=t;
  document.querySelectorAll('#lgMoneyTabs .section-tab').forEach(function(b){ b.classList.toggle('active',b.getAttribute('data-mt')===t); });
  var map={overview:rOverview,treasury:rTreasury,groups:rGroups,teachers:rTeachers,executive:rExecutive,discounts:rDiscounts,expenses:rExpenses,reports:rReports,settings:rSettings};
  if(map[t]) map[t]();
};

LM.refresh=function(){ LM.renderMoneyPage(); };
LM.setMonth=function(v){ ST.month=v||monthStr(); LM.tab(ST.tab); };
LM.setCenter=function(v){ ST.center=v||''; LM.tab(ST.tab); };

function headBar(showCenter){
  var h='<div class="lm-toolbar">';
  h+='<div class="lm-month-picker"><span class="lm-label-sm">📅 الشهر:</span><input type="month" class="form-input" style="width:150px" value="'+ST.month+'" onchange="LM.setMonth(this.value)"></div>';
  if(showCenter){
    var cs = (isAdmin()||isSuper()) ? allCenters() : myCenters();
    h+='<div class="lm-month-picker"><span class="lm-label-sm">🏢 السنتر:</span><select class="form-select" style="width:180px" onchange="LM.setCenter(this.value)"><option value="">— الكل —</option>'+cs.map(function(c){return '<option value="'+c+'"'+(c===ST.center?' selected':'')+'>'+c+'</option>';}).join('')+'</select></div>';
  }
  h+='<button class="btn btn-ghost btn-sm" onclick="LM.refresh()">🔄</button>';
  if(isAdmin()) h+='<span class="lm-mode-badge admin">👁️ مراقب عام</span>';
  else if(isAssistant()) h+='<span class="lm-mode-badge assistant">✏️ تنفيذي</span>';
  h+='</div>';
  return h;
}

function card(l,v,s,c,icon){
  return '<div class="lm-kpi '+(c||'')+'"><div class="lm-kpi-icon">'+(icon||'')+'</div><div class="lm-kpi-body"><div class="lm-kpi-label">'+l+'</div><div class="lm-kpi-value">'+v+'</div>'+(s?'<div class="lm-kpi-sub">'+s+'</div>':'')+'</div></div>';
}

/* ═══════════════════════════════════════════════════════════════
   6. نظرة عامة
   ═══════════════════════════════════════════════════════════════ */
function rOverview(){
  var host=body(); if(!host) return;
  var centers = (isAdmin()||isSuper()) ? allCenters() : myCenters();
  var mColl=0,mShare=0,mNet=0,remAll=0,totalStudents=0,totalUnpaid=0,totalVirtual=0,supAll=0,uncolAll=0;
  centers.forEach(function(c){
    var s=standing(c,ST.month);
    mColl+=s.mColl; mShare+=s.mShare; mNet+=s.mNet; remAll+=s.remaining;
    supAll+=s.allSup; uncolAll+=s.uncol;
    s.gs.forEach(function(g){ 
      var ext=groupFinanceExtended(g,ST.month);
      totalStudents+=ext.accounted; 
      totalVirtual+=ext.virtual;
      totalUnpaid+=groupUnpaidCount(g,ST.month); 
    });
  });
  var expM=myExpenses(ST.month).reduce(function(s,x){return s+(+x.amount||0);},0);

  var html=headBar(true);
  html+='<div class="lm-section-title">📊 مؤشرات الأداء — '+monthName(ST.month)+'</div>';
  html+='<div class="lm-kpi-grid">';
  html+=card('محصّل الشهر', fmtMoney(mColl)+' ج.م', 'من '+ST.month, 'success','💵');
  html+=card('حق السناتر', fmtMoney(mShare)+' ج.م', 'من إعدادات المجموعات', 'warning','🏢');
  html+=card('صافي الأساتذة', fmtMoney(mNet)+' ج.م', 'بعد خصم السنتر', 'success','💪');
  html+=card('الخزينة', fmtMoney(remAll)+' ج.م', 'اللي لينا عند السناتر', 'info','🏦');
  html+=card('مصروفات الشهر', fmtMoney(expM)+' ج.م', myExpenses(ST.month).length+' عملية', 'danger','💳');
  html+=card('طلاب في النطاق', totalStudents+'', 'في '+centers.length+' سنتر'+(totalVirtual>0?' · '+totalVirtual+' متوقع':''),'','👥');
  html+=card('المفروض يتحصل (دورات مكتملة)', fmtMoney(supAll)+' ج.م', 'من الطلاب — كل الفترات', 'info','💰');
  html+=card('لسه متحصلش من الطلاب', fmtMoney(uncolAll)+' ج.م', 'المفروض − اللي اتحصل', 'danger','⚠️');
  html+=card('نسبة التحصيل', (supAll?Math.round(((supAll-uncolAll)/supAll)*100):0)+'%', 'من الدورات المكتملة', ((supAll-uncolAll)/Math.max(1,supAll))>=0.7?'success':'warning','📈');
  if(isAdmin()||isSuper()){
    html+=card('متأخرات', totalUnpaid+' طالب', 'لم يسددوا الشهر', 'danger','⚠️');
    html+=card('صافي الربح', fmtMoney(mColl-mShare-expM)+' ج.م', 'بعد السنتر والمصروفات', (mColl-mShare-expM>=0?'success':'danger'),'📈');
  }
  html+='</div>';
  html+='<div class="lm-section-title">🚀 إجراءات سريعة</div>';
  html+='<div class="lm-quick">';
  html+='<button class="btn btn-primary" onclick="LM.tab(\'treasury\')">🏦 الخزينة</button>';
  html+='<button class="btn btn-secondary" onclick="LM.tab(\'groups\')">👥 المجموعات</button>';
  if(isAdmin()||isSuper()){ html+='<button class="btn btn-warning" onclick="LM.tab(\'executive\')">📈 التقارير الإدارية</button>'; html+='<button class="btn btn-info" onclick="LM.tab(\'teachers\')">👨‍🏫 الأساتذة</button>'; }
  if(canWrite()){ html+='<button class="btn btn-success" onclick="LM.openTxModal(\'received\')">➕ قبضة من سنتر</button>'; html+='<button class="btn btn-ghost" onclick="LM.openTxModal(\'open_center_owes\')">📜 رصيد افتتاحي</button>'; }
  html+='<button class="btn btn-ghost" onclick="LM.exportCSV()">📊 CSV</button>';
  html+='</div>';
  html+='<div class="lm-note">💡 الخزينة = الفلوس اللي لينا عند السناتر (مش شرط في إيدنا) — بتتحدث تلقائياً مع كل تحصيل في دفتر التحصيل.</div>';
  host.innerHTML=html;
}

/* ═══════════════════════════════════════════════════════════════
   7. الخزينة (وقفة كل سنتر)
   ═══════════════════════════════════════════════════════════════ */
function rTreasury(){
  var host=body(); if(!host) return;
  var html=headBar(true);
  var centers = ST.center ? [ST.center] : ((isAdmin()||isSuper()) ? allCenters() : myCenters());
  if(!centers.length){ host.innerHTML=html+'<div class="lm-empty">مفيش سناتر في النطاق</div>'; return; }
  centers.forEach(function(cn){
    var s=standing(cn,ST.month);
    html+='<div class="lm-treasury-card">';
    html+='<div class="lm-treasury-head"><div><strong>🏦 '+cn+'</strong><div class="lm-meta">'+s.gs.length+' مجموعة · شهر '+monthName(ST.month)+'</div></div>';
    html+='<div class="lm-treasury-remaining '+(s.remaining>=0?'pos':'neg')+'">'+(s.remaining>=0?'⭐ لينا عند السنتر: ':'⚠️ علينا: ')+fmtMoney(Math.abs(s.remaining))+' ج.م</div></div>';
    html+='<div class="lm-meta" style="margin-bottom:8px;">أي تحصيل بيتم في دفتر التحصيل بيظهر هنا فورًا كجزء من اللي لينا عند السنتر.</div>';
    html+='<div class="lm-treasury-grid">';
    html+=line('💵 المحصّل الفعلي من الطلاب — الشهر ده',s.mColl,'success');
    html+=line('💵 إجمالي المحصّل كل الفترات (من دفتر التحصيل)',s.allColl,'success');
    html+=line('💪 صافي الأستاذ — الشهر الحالي',s.mNet,'success');
    html+=line('💰 المفروض يتحصل من الطلاب (دورات مكتملة)',s.allSup,'');
    html+=line('✅ اللي اتحصل فعلاً من الدورات المكتملة',s.allPaidC,'success');
    html+=line('❌ لسه متحصلش من الطلاب (مش في الخزينة لحد ما السنتر يجمعه)',s.uncol,'danger');
    html+=line('💪 صافي الأستاذ — كل الفترات',s.allNet,'success');
    html+=line('📜 ليا بره/افتتاحي (قبل السيستم)',s.openOwes,'');
    html+=line('📜 عليّا بره/افتتاحي',-s.openIOwe,'danger');
    html+=line('📜 مقبوض افتتاحي من السنتر',-s.openRec,'danger');
    html+=line('🧾 مصاريف دفعتها أنا وترجعلي',s.expBack,'success');
    html+=line('💰 قبضات استلمتها من السنتر',-s.received,'danger');
    html+=line('👨‍ اللي أخده الأستاذ (قبضات مسجلة)',-s.paidT,'danger');
    html+=line('👨‍🏫 سلف/مصاريف الأستاذ',-s.advance,'danger');
    html+=line('🍔 كانتين عليّا',-s.canteen,'danger');
    html+='</div>';
    if(canWrite()){
      html+='<div class="lm-quick">';
      html+='<button class="btn btn-success btn-sm" onclick="LM.openTxModal(\'received\',\''+cn+'\')">➕ قبضة</button>';
      html+='<button class="btn btn-warning btn-sm" onclick="LM.openTxModal(\'open_center_owes\',\''+cn+'\')">📜 رصيد خارجي</button>';
      html+='<button class="btn btn-secondary btn-sm" onclick="LM.openTxModal(\'expense_print\',\''+cn+'\')">🧾 مصروف رجع</button>';
      html+='<button class="btn btn-ghost btn-sm" onclick="LM.openTxModal(\'advance_teacher\',\''+cn+'\')">👨‍🏫 سلفة</button>';
      html+='</div>';
    }
    var log=[];
    s.tx.forEach(function(x){ log.push({date:x.date,txt:txLabel(x.kind)+' — '+(x.label||''),amt:x.amount,id:x.id,src:'tx'}); });
    s.pays.forEach(function(p){ log.push({date:p.date,txt:'👨‍ قبضة الأستاذ لمجموعة '+gName(p.groupId),amt:p.amount,id:p.id,src:'pay'}); });
    log.sort(function(a,b){ return String(b.date).localeCompare(String(a.date)); });
    if(log.length){
      html+='<div class="lm-section-title" style="font-size:13px;margin-top:12px">📜 سجل الحركات ('+log.length+')</div>';
      html+='<div class="lm-log">';
      log.slice(0,30).forEach(function(x){
        html+='<div class="lm-log-row"><span class="lm-log-date">'+x.date+'</span><span class="lm-log-txt">'+x.txt+'</span><span class="lm-log-amt '+(+x.amt>=0?'success':'danger')+'">'+(+x.amt>=0?'+':'')+fmtMoney(x.amt)+'</span>'+(canWrite()?'<button class="btn btn-danger btn-sm" onclick="LM.delEntry(\''+x.src+'\',\''+x.id+'\')">🗑</button>':'')+'</div>';
      });
      html+='</div>';
    }
    html+='</div>';
  });
  host.innerHTML=html;
}
function txLabel(k){ var m={open_center_owes:'📜 ليا بره/افتتاحي',open_i_owe:'📜 عليّا بره',open_received:'📜 مقبوض افتتاحي',received:'💰 قبضة من السنتر',expense_print:'🖨️ طباعة',expense_books:'📚 مذكرات',expense_other:'🧾 مصروف آخر',canteen:'🍔 كانتين',advance_teacher:'👨‍ سلفة'}; return m[k]||k; }
function line(l,v,c){ return '<div class="lm-line"><span>'+l+'</span><b class="'+(c||'')+'">'+(v>0?'+':'')+fmtMoney(v)+'</b></div>'; }

/* ═══════════════════════════════════════════════════════════════
   8. المجموعات
   ═══════════════════════════════════════════════════════════════ */
function rGroups(){
  var host=body(); if(!host) return;
  var html=headBar(false);
  var gs=myGroups();
  if(!gs.length){ host.innerHTML=html+'<div class="lm-empty">مفيش مجموعات في نطاقك</div>'; return; }

  if(isAdmin()||isSuper()){
    html+='<div class="lm-admin-banner">👑 وضع التقارير الإدارية — تشوف كل المجموعات بدون صلاحية تعديل</div>';
    html+='<div class="lm-table-wrap"><table class="lm-table lm-table-compact">';
    html+='<thead><tr><th>المجموعة</th><th>الأستاذ</th><th>السنتر</th><th>طلاب (فعلي+متوقع)</th><th>سعر/طالب</th><th>المحصل الفعلي</th><th>حق السنتر (كلي)</th><th>صافي الأستاذ (كلي)</th><th>المتبقي</th></tr></thead><tbody>';
    var totColl=0,totShare=0,totNet=0,totStu=0,totVirt=0;
    gs.forEach(function(g){
      var ext = groupFinanceExtended(g, ST.month);
      totColl += ext.actualCollected; totShare += ext.expectedShare; totNet += ext.expectedTeacher; totStu += ext.accounted; totVirt += ext.virtual;
      html+='<tr><td><strong>'+g.name+'</strong></td><td>'+tName(g.teacherId)+'</td><td>'+(g.center||'-')+'</td>';
      html+='<td><div style="font-weight:800">'+ext.accounted+'</div><div class="lm-meta">'+ext.real+' فعلي'+(ext.virtual>0?' + '+ext.virtual+' متوقع':'')+'</div></td>';
      html+='<td>'+(g.monthlyFee||0)+'</td>';
      html+='<td><div class="lm-amt success">'+fmtMoney(ext.actualCollected)+'</div>'+(ext.virtual>0?'<div class="lm-meta" style="color:var(--info)">متوقع: '+fmtMoney(ext.virtualTotal)+'</div>':'')+'</td>';
      html+='<td class="lm-amt warning">'+fmtMoney(ext.expectedShare)+'</td>';
      html+='<td class="lm-amt success">'+fmtMoney(ext.expectedTeacher)+'</td>';
      html+='<td class="lm-amt '+(ext.outstanding>0?'danger':'')+'">'+fmtMoney(ext.outstanding)+'</td></tr>';
    });
    html+='</tbody><tfoot><tr style="font-weight:900;background:var(--primary-bg)"><td colspan="3">الإجمالي</td>';
    html+='<td>'+totStu+(totVirt>0?' (+'+totVirt+' متوقع)':'')+'</td><td>—</td>';
    html+='<td class="lm-amt success">'+fmtMoney(totColl)+'</td>';
    html+='<td class="lm-amt warning">'+fmtMoney(totShare)+'</td>';
    html+='<td class="lm-amt success">'+fmtMoney(totNet)+'</td>';
    html+='<td>—</td></tr></tfoot></table></div>';
  } else {
    html+='<div class="lm-note">🔗 حق السنتر بيتحدد من إعدادات المجموعة أو السنتر — متزامن تلقائياً مع دفتر التحصيل.</div>';
    gs.forEach(function(g){
      var ext = groupFinanceExtended(g, ST.month);
      html+='<div class="lm-group-card">';
      html+='<div class="lm-group-head"><div><strong>'+g.name+'</strong><div class="lm-meta">👨‍🏫 '+tName(g.teacherId)+' · 🏢 '+(g.center||'-')+'</div>';
      html+='<div class="lm-meta" style="margin-top:3px;">👥 <strong>'+ext.accounted+'</strong> طالب محسوب';
      if(ext.virtual > 0) html+=' <span class="lm-badge info">('+ext.real+' فعلي + '+ext.virtual+' متوقع)</span>';
      else html+=' <span class="lm-badge success">(كلهم فعلي)</span>';
      if(ext.outstanding > 0) html+=' · ⚠️ متبقي '+fmtMoney(ext.outstanding)+' ج.م';
      html+='</div></div>';
      if(canWrite()){
        html+='<div class="lm-group-actions">';
        html+='<button class="btn btn-primary btn-sm" onclick="LM.openShareModal(\''+g.id+'\')">✏️ الحق</button>';
        html+='<button class="btn btn-warning btn-sm" onclick="LM.editExpected(\''+g.id+'\')">👥 المتوقع</button>';
        html+='<button class="btn btn-ghost btn-sm" onclick="window.showSection(\'monthly\')">📒 الدفتر</button>';
        html+='</div>';
      }
      html+='</div>';
      var pct = ext.expectedTotal > 0 ? Math.min(100, Math.round(ext.actualCollected / ext.expectedTotal * 100)) : 0;
      html+='<div class="lm-progress"><div class="lm-progress-fill" style="width:'+pct+'%"></div></div>';
      html+='<div class="lm-group-nums">';
      html+='<div><span class="lm-label">السعر</span><span class="lm-val">'+ext.fee+'</span></div>';
      html+='<div><span class="lm-label">السنتر/طالب</span><span class="lm-val warning">'+ext.share+'</span></div>';
      html+='<div><span class="lm-label">الأستاذ/طالب</span><span class="lm-val success">'+ext.teacherFee+'</span></div>';
      html+='<div><span class="lm-label">المحصل فعلياً</span><span class="lm-val success">'+fmtMoney(ext.actualCollected)+'</span></div>';
      html+='<div><span class="lm-label">المتوقع الكلي</span><span class="lm-val info">'+fmtMoney(ext.expectedTotal)+'</span></div>';
      html+='<div><span class="lm-label">حق السنتر (كلي)</span><span class="lm-val warning">'+fmtMoney(ext.expectedShare)+'</span></div>';
      html+='<div><span class="lm-label">صافي الأستاذ (كلي)</span><span class="lm-val success">'+fmtMoney(ext.expectedTeacher)+'</span></div>';
      html+='<div><span class="lm-label">المتبقي</span><span class="lm-val '+(ext.outstanding>0?'danger':'success')+'">'+fmtMoney(ext.outstanding)+'</span></div>';
      html+='</div>';
      if(ext.virtual > 0){
        html+='<div class="lm-note" style="margin-top:10px;padding:8px;font-size:11px;">';
        html+='💡 <strong>طلاب متوقعين:</strong> '+ext.virtual+' طالب × '+ext.fee+' = '+fmtMoney(ext.virtualTotal)+' ج.م';
        html+=' (هيتحسبوا لما تدخل بياناتهم الفعلية)</div>';
      }
      html+='</div>';
    });
  }
  host.innerHTML=html;
}

LM.openShareModal=function(gid){
  if(!canWrite()){ toast('👁️ عرض فقط','error'); return; }
  var g=(DataService.getGroups?DataService.getGroups():[]).find(function(x){return x.id===gid;}); if(!g) return;
  var curShare=sharePerStudent(g);
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">✏️ حق السنتر — '+g.name+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
    '<div class="filter-info">💡 السعر النهائي = صافي الأستاذ + حق السنتر. لو سبتها فاضية هترجع لإعدادات السنتر.</div>'+
    '<div class="form-group"><label>💪 صافي الأستاذ (ج.م/طالب)</label><input type="number" id="shTeacher" class="form-input" value="'+tchVal(g)+'" min="0"></div>'+
    '<div class="form-group"><label>🏢 حق السنتر (ج.م/طالب)</label><input type="number" id="shCenter" class="form-input" value="'+((g.centerShareAmt!=null)?g.centerShareAmt:'')+'" placeholder="الافتراضي: '+curShare+'"></div>'+
    '<button class="btn btn-primary w-full" onclick="LM.saveShare(\''+gid+'\')">💾 حفظ</button></div>','modal-sm');
};
function tchVal(g){ return (g.teacherFee!=null)?g.teacherFee:Math.max(0,(g.monthlyFee||0)-sharePerStudent(g)); }
LM.saveShare=function(gid){
  if(!canWrite()){ toast('👁️ عرض فقط','error'); return; }
  var tf=parseFloat((document.getElementById('shTeacher')||{}).value)||0;
  var cv=(document.getElementById('shCenter')||{}).value;
  var d=db(); var g=(d.groups||[]).find(function(x){return x.id===gid;}); if(!g) return;
  g.teacherFee=tf;
  g.centerShareAmt=(cv===''||cv==null)?null:(parseFloat(cv)||0);
  saveD(d);
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('groups',gid,g); }catch(e){}
  try{ if(LU().recomputeGroupFees) LU().recomputeGroupFees(g.center); }catch(e){}
  try{ localStorage.setItem('eduflowLedgerPing',String(Date.now())); }catch(e){}
  ThemeManager.closeModal(); toast('✅ اتحفظ واتزامن مع الدفتر','success');
  LM.tab('groups');
};

LM.editExpected=function(gid){
  if(!canWrite()){ toast('👁️ عرض فقط','error'); return; }
  var g=(DataService.getGroups?DataService.getGroups():[]).find(function(x){return x.id===gid;}); 
  if(!g) return;
  var real = studentsOf(gid).length;
  var cur = +g.expectedStudents || 0;
  var fee = +g.monthlyFee || 0;
  
  ThemeManager.openModal(
    '<div class="modal-header"><h3 class="modal-title">👥 الطاقة الاستيعابية — '+g.name+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>'+
    '<div class="modal-body">'+
    '<div class="filter-info" style="margin-bottom:12px;">'+
    '💡 <strong>الاستخدام:</strong> السنتر بيديك عدد طلاب متوقع للمجموعة. الرقم ده بيتحسب في الحسابات المالية (الخزينة والسنتر والأستاذ) بس <strong>مش بيتضاف كطلاب فعليين</strong> في السيستم (مش هتظهر في الحضور أو الدرجات أو الإشعارات).<br><br>'+
    '📊 <strong>الطلاب الفعليين حالياً:</strong> '+real+' طالب<br>'+
    '💰 <strong>السعر الشهري:</strong> '+fee+' ج.م/طالب'+
    '</div>'+
    '<div class="form-group"><label>📊 عدد الطلاب المتوقع من السنتر</label>'+
    '<input type="number" id="expStudents" class="form-input" value="'+cur+'" min="0" placeholder="0 (استخدم الفعلي)">'+
    '<div class="lm-meta" style="margin-top:4px;">• لو حطيت 0 أو فاضي → الحسابات هتستخدم الفعليين بس<br>• لو حطيت رقم أكبر من الفعلي → الفرق يتحسب كـ "طلاب متوقعين"<br>• مثال: لو السنتر ادّاك 30 طالب، حط 30</div>'+
    '</div>'+
    '<button class="btn btn-primary w-full" onclick="LM.saveExpected(\''+gid+'\')">💾 حفظ</button>'+
    '</div>',
    'modal-sm'
  );
};

LM.saveExpected=function(gid){
  if(!canWrite()){ toast('👁️ عرض فقط','error'); return; }
  var val = parseInt((document.getElementById('expStudents')||{}).value) || 0;
  if(val < 0) val = 0;
  var d=db(); 
  var g=(d.groups||[]).find(function(x){return x.id===gid;}); 
  if(!g) return;
  g.expectedStudents = val;
  saveD(d);
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('groups',gid,g); }catch(e){}
  try{ localStorage.setItem('eduflowLedgerPing',String(Date.now())); }catch(e){}
  ThemeManager.closeModal(); 
  toast('✅ اتحفظ — الحسابات اتحدثت','success');
  LM.tab('groups');
};

/* ═══════════════════════════════════════════════════════════════
   9. الأساتذة (للأدمن فقط) — محدّث ليستخدم groupFinanceExtended
   ═══════════════════════════════════════════════════════════════ */
function rTeachers(){
  var host=body(); if(!host) return;
  if(!(isAdmin()||isSuper())){ host.innerHTML=headBar(false)+'<div class="lm-empty">التبويب ده للأدمن فقط</div>'; return; }

  var html=headBar(false);
  html+='<div class="lm-admin-banner">👑 تقرير شامل لكل الأساتذة — المحصل، النسبة، المتأخرات، الأداء</div>';

  var gs=allGroups();
  var byTeacher={};
  gs.forEach(function(g){
    var tid=g.teacherId||'orphan';
    var ext=groupFinanceExtended(g,ST.month);
    if(!byTeacher[tid]) byTeacher[tid]={tid:tid,name:tName(tid),groups:[],coll:0,share:0,net:0,students:0,virtual:0,centers:{}};
    var b=byTeacher[tid];
    b.groups.push(g);
    b.coll+=ext.actualCollected; 
    b.share+=ext.expectedShare; 
    b.net+=ext.expectedTeacher;
    b.students+=ext.accounted;
    b.virtual+=ext.virtual;
    if(g.center) b.centers[g.center]=1;
  });
  var list=Object.keys(byTeacher).map(function(k){return byTeacher[k];});
  list.sort(function(a,b){ return b.coll-a.coll; });

  var totColl=0,totShare=0,totNet=0,totVirt=0;
  list.forEach(function(t){ totColl+=t.coll; totShare+=t.share; totNet+=t.net; totVirt+=t.virtual; });
  html+='<div class="lm-kpi-grid">';
  html+=card('إجمالي الأساتذة',list.length+'','في كل السناتر','','👨‍🏫');
  html+=card('إجمالي المحصل',fmtMoney(totColl)+' ج.م',monthName(ST.month),'success','💵');
  html+=card('إجمالي السناتر',fmtMoney(totShare)+' ج.م','','warning','🏢');
  html+=card('صافي الأساتذة',fmtMoney(totNet)+' ج.م','','success','💪');
  if(totVirt>0) html+=card('طلاب متوقعين',totVirt+'','غير مسجلين فعلياً بعد','info','👥');
  html+='</div>';

  html+='<div class="lm-section-title">📋 تفصيل الأساتذة</div>';
  html+='<div class="lm-table-wrap"><table class="lm-table lm-table-compact">';
  html+='<thead><tr><th>#</th><th>الأستاذ</th><th>مجموعات</th><th>طلاب (فعلي+متوقع)</th><th>سنترات</th><th>محصّل فعلي</th><th>حق السنتر (كلي)</th><th>صافي (كلي)</th></tr></thead><tbody>';
  list.forEach(function(t,i){
    html+='<tr><td>'+(i+1)+'</td>';
    html+='<td><strong>'+t.name+'</strong></td>';
    html+='<td>'+t.groups.length+'</td>';
    html+='<td><div style="font-weight:800">'+t.students+'</div>'+(t.virtual>0?'<div class="lm-meta">+'+t.virtual+' متوقع</div>':'')+'</td>';
    html+='<td>'+Object.keys(t.centers).join(', ')+'</td>';
    html+='<td class="lm-amt success">'+fmtMoney(t.coll)+'</td>';
    html+='<td class="lm-amt warning">'+fmtMoney(t.share)+'</td>';
    html+='<td class="lm-amt success">'+fmtMoney(t.net)+'</td></tr>';
  });
  html+='</tbody></table></div>';
  host.innerHTML=html;
}

/* ═══════════════════════════════════════════════════════════════
   10. التقارير الإدارية (للأدمن فقط) — محدّث ليستخدم groupFinanceExtended
   ═══════════════════════════════════════════════════════════════ */
function rExecutive(){
  var host=body(); if(!host) return;
  if(!(isAdmin()||isSuper())){ host.innerHTML=headBar(false)+'<div class="lm-empty">التبويب ده للأدمن فقط</div>'; return; }

  var html=headBar(true);
  html+='<div class="lm-admin-banner">👑 Executive Dashboard — نظرة شاملة على أداء كل الأساتذة والسناتر</div>';

  var gs=allGroups();
  var byTeacher={}, byCenter={};

  gs.forEach(function(g){
    var tid=g.teacherId||'orphan';
    var ext=groupFinanceExtended(g,ST.month);
    
    if(!byTeacher[tid]) byTeacher[tid]={tid:tid,name:tName(tid),coll:0,share:0,net:0,students:0,virtual:0,outstanding:0,groups:0};
    byTeacher[tid].coll+=ext.actualCollected; 
    byTeacher[tid].share+=ext.expectedShare; 
    byTeacher[tid].net+=ext.expectedTeacher;
    byTeacher[tid].students+=ext.accounted;
    byTeacher[tid].virtual+=ext.virtual;
    byTeacher[tid].outstanding+=ext.outstanding;
    byTeacher[tid].groups++;

    var cn=g.center||'غير محدد';
    if(!byCenter[cn]) byCenter[cn]={name:cn,coll:0,share:0,net:0,groups:0,students:0,virtual:0,outstanding:0};
    byCenter[cn].coll+=ext.actualCollected; 
    byCenter[cn].share+=ext.expectedShare; 
    byCenter[cn].net+=ext.expectedTeacher;
    byCenter[cn].groups++;
    byCenter[cn].students+=ext.accounted;
    byCenter[cn].virtual+=ext.virtual;
    byCenter[cn].outstanding+=ext.outstanding;
  });

  var tList=Object.keys(byTeacher).map(function(k){return byTeacher[k];}).sort(function(a,b){return b.coll-a.coll;});
  var cList=Object.keys(byCenter).map(function(k){return byCenter[k];}).sort(function(a,b){return b.coll-a.coll;});

  html+='<div class="lm-two-col">';
  html+='<div class="lm-panel">';
  html+='<div class="lm-panel-title success">🏆 أفضل 5 أساتذة (بالمحصل)</div>';
  tList.slice(0,5).forEach(function(t,i){
    html+='<div class="lm-rank-row"><span class="lm-rank">'+(i+1)+'</span><div class="lm-rank-body"><strong>'+t.name+'</strong><div class="lm-meta">'+t.groups+' مجموعة · '+t.students+' طالب'+(t.virtual>0?' (+'+t.virtual+' متوقع)':'')+'</div></div><div class="lm-rank-val success">'+fmtMoney(t.coll)+' ج.م</div></div>';
  });
  if(!tList.length) html+='<div class="lm-empty">مفيش بيانات</div>';
  html+='</div>';

  html+='<div class="lm-panel">';
  html+='<div class="lm-panel-title danger">⚠️ أقل 5 أساتذة (يحتاجون متابعة)</div>';
  var bottom=tList.filter(function(t){return t.coll>0||t.students>0;}).slice().reverse().slice(0,5);
  bottom.forEach(function(t,i){
    html+='<div class="lm-rank-row"><span class="lm-rank warn">'+(i+1)+'</span><div class="lm-rank-body"><strong>'+t.name+'</strong><div class="lm-meta">'+t.groups+' مجموعة · متبقي '+fmtMoney(t.outstanding)+' ج.م</div></div><div class="lm-rank-val danger">'+fmtMoney(t.coll)+' ج.م</div></div>';
  });
  if(!bottom.length) html+='<div class="lm-empty">مفيش بيانات</div>';
  html+='</div>';
  html+='</div>';

  html+='<div class="lm-section-title" style="margin-top:20px">🏢 توزيع الأداء حسب السنتر</div>';
  html+='<div class="lm-table-wrap"><table class="lm-table lm-table-compact">';
  html+='<thead><tr><th>السنتر</th><th>مجموعات</th><th>طلاب (فعلي+متوقع)</th><th>محصّل فعلي</th><th>حق السنتر (كلي)</th><th>صافي (كلي)</th><th>المتبقي</th><th>نسبة%</th></tr></thead><tbody>';
  cList.forEach(function(c){
    var pct=c.coll>0?Math.round(c.share/c.coll*100):0;
    html+='<tr><td><strong>'+c.name+'</strong></td>';
    html+='<td>'+c.groups+'</td>';
    html+='<td>'+c.students+(c.virtual>0?' <span class="lm-meta">(+'+c.virtual+')</span>':'')+'</td>';
    html+='<td class="lm-amt success">'+fmtMoney(c.coll)+'</td>';
    html+='<td class="lm-amt warning">'+fmtMoney(c.share)+'</td>';
    html+='<td class="lm-amt success">'+fmtMoney(c.net)+'</td>';
    html+='<td class="lm-amt '+(c.outstanding>0?'danger':'')+'">'+fmtMoney(c.outstanding)+'</td>';
    html+='<td><div class="lm-bar"><div class="lm-bar-fill" style="width:'+pct+'%"></div><span>'+pct+'%</span></div></td></tr>';
  });
  html+='</tbody></table></div>';

  var totColl=tList.reduce(function(s,t){return s+t.coll;},0);
  var totNet=tList.reduce(function(s,t){return s+t.net;},0);
  var totOut=tList.reduce(function(s,t){return s+t.outstanding;},0);
  var totStu=tList.reduce(function(s,t){return s+t.students;},0);
  var totVirt=tList.reduce(function(s,t){return s+t.virtual;},0);
  html+='<div class="lm-executive-summary">';
  html+='<div class="lm-es-title">📋 الملخص التنفيذي — '+monthName(ST.month)+'</div>';
  html+='<div class="lm-es-grid">';
  html+='<div><span>إجمالي الطلاب:</span><strong>'+totStu+'</strong>'+(totVirt>0?' <span class="lm-meta">(+'+totVirt+' متوقع)</span>':'')+'</div>';
  html+='<div><span>إجمالي الأساتذة:</span><strong>'+tList.length+'</strong></div>';
  html+='<div><span>إجمالي السناتر:</span><strong>'+cList.length+'</strong></div>';
  html+='<div><span>إجمالي المحصل:</span><strong class="success">'+fmtMoney(totColl)+' ج.م</strong></div>';
  html+='<div><span>صافي الأساتذة:</span><strong class="success">'+fmtMoney(totNet)+' ج.م</strong></div>';
  html+='<div><span>إجمالي المتبقي:</span><strong class="danger">'+fmtMoney(totOut)+' ج.م</strong></div>';
  html+='</div></div>';

  host.innerHTML=html;
}

/* ═══════════════════════════════════════════════════════════════
   11. الخصومات
   ═══════════════════════════════════════════════════════════════ */
function rDiscounts(){
  var host=body(); if(!host) return;
  var q=(ST.dq||'').toLowerCase();
  var sts=(DataService.getStudents?DataService.getStudents():[]).filter(function(s){ return !q||(s.name||'').toLowerCase().indexOf(q)>=0||(s.code||'').toLowerCase().indexOf(q)>=0; });
  if(isAssistant()){ var gm={}; myGroups().forEach(function(g){gm[g.id]=1;}); sts=sts.filter(function(s){ return (DataService.getStudentTeachers?DataService.getStudentTeachers(s.id):[]).some(function(t){ return t.group&&gm[t.group.id]; }); }); }
  sts=sts.slice(0,40);
  var html=headBar(false);
  html+='<input type="text" class="form-input" style="margin-bottom:10px" placeholder="🔍 ابحث طالب..." value="'+(ST.dq||'')+'" oninput="LM.discountSearch(this.value)">';
  sts.forEach(function(s){
    var dsc=s.discount;
    html+='<div class="lm-row"><div class="lm-row-main"><strong>'+s.name+'</strong><div class="lm-meta">'+(s.code||'')+' · '+(dsc?('خصم '+(dsc.type==='pct'?dsc.value+'%':dsc.value+' ج.م')):'بدون خصم')+'</div></div>';
    if(canWrite()){ html+='<button class="btn btn-primary btn-sm" onclick="LM.editDiscount(\''+s.id+'\')">✏️</button>'; if(dsc) html+='<button class="btn btn-danger btn-sm" onclick="LM.clearDiscount(\''+s.id+'\')">🗑</button>'; }
    html+='</div>';
  });
  host.innerHTML=html;
}
LM.discountSearch=function(q){ ST.dq=q; rDiscounts(); };
LM.editDiscount=function(sid){
  if(!canWrite()){ toast('👁️ عرض فقط','error'); return; }
  var s=DataService.getUserById?DataService.getUserById(sid):null; if(!s) return;
  var dsc=s.discount||{};
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🎟️ خصم: '+s.name+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
    '<div class="form-group"><label>النوع</label><select id="dsType" class="form-select"><option value="pct"'+(dsc.type==='pct'?' selected':'')+'>نسبة %</option><option value="fixed"'+(dsc.type==='fixed'?' selected':'')+'>مبلغ ثابت</option></select></div>'+
    '<div class="form-group"><label>القيمة</label><input type="number" id="dsVal" class="form-input" value="'+(dsc.value||0)+'" min="0"></div>'+
    '<div class="form-group"><label>السبب</label><input type="text" id="dsReason" class="form-input" value="'+(dsc.reason||'')+'"></div>'+
    '<button class="btn btn-primary w-full" onclick="LM.saveDiscount(\''+sid+'\')">💾 حفظ</button></div>','modal-sm');
};
LM.saveDiscount=async function(sid){
  var type=(document.getElementById('dsType')||{}).value||'pct';
  var val=+((document.getElementById('dsVal')||{}).value||0);
  var reason=(document.getElementById('dsReason')||{}).value||'';
  if(DataService.updateUser) await DataService.updateUser(sid,{discount:{type:type,value:val,reason:reason}});
  try{ localStorage.setItem('eduflowLedgerPing',String(Date.now())); }catch(e){}
  ThemeManager.closeModal(); toast('🎟️ الخصم اتفعّل','success'); rDiscounts();
};
LM.clearDiscount=async function(sid){
  if(DataService.updateUser) await DataService.updateUser(sid,{discount:null});
  try{ localStorage.setItem('eduflowLedgerPing',String(Date.now())); }catch(e){}
  toast('🗑 الخصم اتشال','info'); rDiscounts();
};

/* ═══════════════════════════════════════════════════════════════
   12. المصروفات
   ═══════════════════════════════════════════════════════════════ */
function myExpenses(month){
  var cn={}; myCenters().forEach(function(c){cn[c]=1;});
  return (db().expenses||[]).filter(function(x){
    if(month&&(x.date||'').slice(0,7)!==month) return false;
    if(isAssistant()) return !x.center||!!cn[x.center];
    return true;
  });
}
function rExpenses(){
  var host=body(); if(!host) return;
  var list=myExpenses(ST.month).slice().reverse();
  var html=headBar(false);
  if(canWrite()){
    html+='<div class="lm-form-row"><input type="date" id="exDate" class="form-input" style="width:150px" value="'+todayStr()+'">'+
    '<select id="exCat" class="form-select" style="width:120px"><option>إيجار</option><option>رواتب</option><option>مرافق</option><option>خامات</option><option>تسويق</option><option>أخرى</option></select>'+
    '<select id="exCenter" class="form-select" style="width:140px"><option value="">بدون سنتر</option>'+myCenters().map(function(c){return '<option>'+c+'</option>';}).join('')+'</select>'+
    '<input type="number" id="exAmt" class="form-input" style="width:110px" placeholder="المبلغ">'+
    '<input type="text" id="exNote" class="form-input" style="flex:1" placeholder="ملاحظة">'+
    '<button class="btn btn-primary btn-sm" onclick="LM.addExpense()">➕</button></div>';
  }
  var tot=list.reduce(function(s,x){return s+(+x.amount||0);},0);
  html+='<div class="lm-summary">💳 مصروفات '+monthName(ST.month)+': <b>'+fmtMoney(tot)+' ج.م</b> ('+list.length+' عملية)</div>';
  list.forEach(function(x){
    html+='<div class="lm-row"><div class="lm-row-main"><strong>'+x.category+'</strong><div class="lm-meta">'+(x.note||'')+' · 📅 '+x.date+' · 👤 '+x.by+(x.center?(' · 🏢 '+x.center):'')+'</div></div><span class="lm-amt danger">-'+fmtMoney(x.amount)+'</span>'+(canWrite()?'<button class="btn btn-danger btn-sm" onclick="LM.delExpense(\''+x.id+'\')">🗑</button>':'')+'</div>';
  });
  host.innerHTML=html;
}
LM.addExpense=function(){
  if(!canWrite()){ toast('👁️ عرض فقط','error'); return; }
  var d=db(); d.expenses=d.expenses||[];
  var rec={id:'exp_'+Date.now(),date:(document.getElementById('exDate')||{}).value||todayStr(),category:(document.getElementById('exCat')||{}).value||'أخرى',center:(document.getElementById('exCenter')||{}).value||'',amount:+((document.getElementById('exAmt')||{}).value||0),note:(document.getElementById('exNote')||{}).value||'',by:(cur()||{}).name||'-',at:new Date().toISOString()};
  if(!rec.amount){ toast('اكتب المبلغ','error'); return; }
  d.expenses.push(rec); saveD(d);
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('expenses',rec.id,rec); }catch(e){}
  toast('💳 اتسجل','success'); rExpenses();
};
LM.delExpense=function(id){
  if(!canWrite()){ toast('👁️ عرض فقط','error'); return; }
  var d=db(); d.expenses=(d.expenses||[]).filter(function(x){return x.id!==id;}); saveD(d);
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.deleteDoc('expenses',id); }catch(e){}
  toast('🗑 اتحذف','info'); rExpenses();
};

/* ═══════════════════════════════════════════════════════════════
   13. الرسوم والتقارير — محدّث ليستخدم groupFinanceExtended
   ═══════════════════════════════════════════════════════════════ */
function rReports(){
  var host=body(); if(!host) return;
  var html=headBar(true);
  var months=monthsSince().slice(-6);
  html+='<div class="lm-section-title">📉 آخر 6 شهور</div>';
  html+='<div class="lm-table-wrap"><table class="lm-table lm-table-compact"><thead><tr><th>الشهر</th><th>محصّل فعلي</th><th>المتوقع الكلي</th><th>حق السنتر (كلي)</th><th>صافي الأستاذ (كلي)</th><th>مصروفات</th><th>صافي</th></tr></thead><tbody>';
  months.forEach(function(m){
    var coll=0,expected=0,share=0,net=0;
    myGroups().forEach(function(g){ 
      var ext=groupFinanceExtended(g,m);
      coll+=ext.actualCollected; 
      expected+=ext.expectedTotal;
      share+=ext.expectedShare; 
      net+=ext.expectedTeacher; 
    });
    var exp=myExpenses(m).reduce(function(s,x){return s+(+x.amount||0);},0);
    var fin=coll-share-exp;
    html+='<tr><td>'+monthName(m)+'</td><td class="lm-amt success">'+fmtMoney(coll)+'</td><td class="lm-amt info">'+fmtMoney(expected)+'</td><td class="lm-amt warning">'+fmtMoney(share)+'</td><td class="lm-amt success">'+fmtMoney(net)+'</td><td class="lm-amt danger">'+fmtMoney(exp)+'</td><td class="lm-amt '+(fin>=0?'success':'danger')+'">'+fmtMoney(fin)+'</td></tr>';
  });
  html+='</tbody></table></div>';
  html+='<canvas id="lmChart" style="width:100%;height:220px;background:var(--surface-hover);border-radius:12px;margin-top:14px"></canvas>';
  html+='<div class="lm-quick"><button class="btn btn-ghost btn-sm" onclick="LM.exportCSV()">📊 تصدير CSV</button></div>';
  host.innerHTML=html;
  setTimeout(function(){
    var coll=months.map(function(m){ var t=0; myGroups().forEach(function(g){ var ext=groupFinanceExtended(g,m); t+=ext.actualCollected; }); return t; });
    var exp=months.map(function(m){ return myExpenses(m).reduce(function(s,x){return s+(+x.amount||0);},0); });
    drawDual('lmChart',months.map(function(m){return monthName(m);}),coll,exp);
  },120);
}
function drawDual(id,labels,a,b){
  var cv=document.getElementById(id); if(!cv) return;
  var ctx=cv.getContext('2d'); var W=cv.width=cv.offsetWidth*2, H=cv.height=cv.offsetHeight*2;
  ctx.clearRect(0,0,W,H);
  var max=Math.max.apply(null,a.concat(b,[1])); var padX=60, bw=(W-padX*2)/labels.length;
  labels.forEach(function(l,i){
    var h1=(H-padX*2)*(a[i]/max), h2=(H-padX*2)*(b[i]/max);
    ctx.fillStyle='#6366f1'; ctx.fillRect(padX+i*bw+bw*0.15,H-padX-h1,bw*0.3,h1);
    ctx.fillStyle='#f59e0b'; ctx.fillRect(padX+i*bw+bw*0.5,H-padX-h2,bw*0.3,h2);
    ctx.fillStyle='#94a3b8'; ctx.font='20px Cairo,sans-serif'; ctx.textAlign='center'; ctx.fillText(l,padX+i*bw+bw/2,H-14);
  });
  ctx.fillStyle='#6366f1'; ctx.fillRect(padX,10,20,12); ctx.fillStyle='#334155'; ctx.font='18px Cairo'; ctx.textAlign='right'; ctx.fillText('المحصل',padX+90,22);
  ctx.fillStyle='#f59e0b'; ctx.fillRect(padX+110,10,20,12); ctx.fillStyle='#334155'; ctx.fillText('المصروفات',padX+220,22);
}
LM.exportCSV=function(){
  var rows=histAll();
  var csv='\uFEFFالتاريخ,الطالب,المجموعة,السنتر,المحصل,المبلغ\n';
  rows.forEach(function(r){ csv+=[r.date,stuName(r.sid),r.gname,r.center,r.by,r.amount].join(',')+'\n'; });
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download='treasury-'+todayStr()+'.csv'; a.click();
};
function histAll(){
  var d=db(), out=[], gs=(DataService.getGroups?DataService.getGroups():[]);
  var gids={}; myGroups().forEach(function(g){gids[g.id]=1;});
  (d.payments||[]).forEach(function(p){
    if(!gids[p.groupId]) return;
    (p.history||[]).forEach(function(h){
      var dt=(h.date||'').slice(0,10); if(!dt) return;
      var g=gs.find(function(x){return x.id===p.groupId;});
      out.push({date:dt,amount:h.amount||0,sid:p.studentId,gname:g?g.name:'-',center:g?(g.center||'-'):'-',by:(h.byName||'-')});
    });
  });
  out.sort(function(a,b){return b.date.localeCompare(a.date);});
  return out;
}

/* ═══════════════════════════════════════════════════════════════
   14. الإعدادات
   ═══════════════════════════════════════════════════════════════ */
function rSettings(){
  var host=body(); if(!host) return;
  var c=getCfg();
  var html=headBar(false);
  html+='<div class="lm-card"><div class="lm-card-head"><strong>⚙️ إعدادات المال العامة</strong></div>';
  html+='<div class="form-group"><label>📆 عدد أقساط الشهرية</label><input type="number" id="cfgInst" class="form-input" value="'+c.installments+'" min="1" max="4"></div>';
  html+='<div class="form-group"><label>⏳ الأيام بين كل قسط</label><input type="number" id="cfgGap" class="form-input" value="'+c.gapDays+'" min="1"></div>';
  if(canWrite()) html+='<button class="btn btn-primary w-full" onclick="LM.saveSettings()">💾 حفظ</button>';
  else html+='<div class="lm-note">👁️ عرض فقط لدورك</div>';
  html+='</div>';
  host.innerHTML=html;
}
function getCfg(){ var c=db().moneyConfig||{}; return {installments:c.installments||1,gapDays:c.gapDays||15}; }
LM.saveSettings=function(){
  if(!canWrite()){ toast('👁️ عرض فقط','error'); return; }
  var d=db(); d.moneyConfig=Object.assign(getCfg(),{installments:+((document.getElementById('cfgInst')||{}).value||1),gapDays:+((document.getElementById('cfgGap')||{}).value||15)});
  saveD(d);
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('meta','moneyConfig',d.moneyConfig); }catch(e){}
  toast('✅ اتحفظ','success');
};

/* ═══════════════════════════════════════════════════════════════
   15. الحركات اليدوية
   ═══════════════════════════════════════════════════════════════ */
var TX_KINDS=[
  {k:'received',l:'💰 قبضة من السنتر'},
  {k:'open_center_owes',l:'📜 ليا بره/افتتاحي'},
  {k:'open_i_owe',l:'📜 عليّا بره/افتتاحي'},
  {k:'open_received',l:'📜 مقبوض افتتاحي من السنتر'},
  {k:'expense_print',l:'🖨️ طباعة دفعتها أنا'},
  {k:'expense_books',l:'📚 مذكرات دفعتها أنا'},
  {k:'expense_other',l:'🧾 مصروف آخر'},
  {k:'canteen',l:'🍔 كانتين عليّا'},
  {k:'advance_teacher',l:'👨‍🏫 سلفة/مصاريف الأستاذ'}
];
LM.standing=standing; LM.myCenters=myCenters;
LM.openTxModal=function(kind,center){
  if(!canWrite()){ toast('👁️ عرض فقط','error'); return; }
  var names=myCenters(); if(!names.length){ toast('مفيش سناتر','error'); return; }
  var def=center||ST.center||names[0];
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">➕ حركة خزينة</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
    '<div class="form-group"><label>🏢 السنتر</label><select id="txCenter" class="form-select">'+names.map(function(c){return '<option'+(c===def?' selected':'')+'>'+c+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label>النوع</label><select id="txKind" class="form-select">'+TX_KINDS.map(function(t){return '<option value="'+t.k+'"'+(t.k===kind?' selected':'')+'>'+t.l+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label>المبلغ (ج.م)</label><input type="number" id="txAmt" class="form-input" min="0"></div>'+
    '<div class="form-group"><label>📅 التاريخ</label><input type="date" id="txDate" class="form-input" value="'+todayStr()+'"></div>'+
    '<div class="form-group"><label>البيان</label><input type="text" id="txLabel" class="form-input" placeholder="مثال: قبضة شهر أكتوبر"></div>'+
    '<button class="btn btn-primary w-full" onclick="LM.saveTx()">💾 حفظ</button></div>','modal-sm');
};
LM.saveTx=function(){
  if(!canWrite()){ toast('👁️ عرض فقط','error'); return; }
  var center=(document.getElementById('txCenter')||{}).value;
  var kind=(document.getElementById('txKind')||{}).value;
  var amt=+((document.getElementById('txAmt')||{}).value||0);
  var date=(document.getElementById('txDate')||{}).value||todayStr();
  var label=(document.getElementById('txLabel')||{}).value||'';
  if(!center||amt<=0){ toast('كمل البيانات','error'); return; }
  var d=db(); d.centerTransactions=d.centerTransactions||[];
  var rec={id:'ctx_'+Date.now(),center:center,kind:kind,amount:amt,date:date,label:label,by:(cur()||{}).name||'-',at:new Date().toISOString()};
  d.centerTransactions.push(rec); saveD(d);
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('centerTransactions',rec.id,rec); }catch(e){}
  ThemeManager.closeModal(); toast('✅ اتسجلت الحركة','success');
  LM.tab('treasury');
};
LM.delEntry=function(src,id){
  if(!canWrite()){ toast('👁️ عرض فقط','error'); return; }
  if(!confirm('حذف الحركة؟')) return;
  var d=db();
  if(src==='tx'){ d.centerTransactions=(d.centerTransactions||[]).filter(function(x){return x.id!==id;}); try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.deleteDoc('centerTransactions',id); }catch(e){} }
  else { d.teacherPayouts=(d.teacherPayouts||[]).filter(function(x){return x.id!==id;}); try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.deleteDoc('teacherPayouts',id); }catch(e){} }
  saveD(d); toast('🗑 اتحذفت','info'); LM.tab('treasury');
};

/* ═══════════════════════════════════════════════════════════════
   16. CSS محسّن
   ═══════════════════════════════════════════════════════════════ */
function injectCSS(){
  if(document.getElementById('lm-css-v8')) return;
  var st=document.createElement('style'); st.id='lm-css-v8';
  st.textContent=[
    '.lm-kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin:14px 0}',
    '.lm-kpi{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;display:flex;gap:14px;align-items:center;position:relative;overflow:hidden;transition:all .2s;box-shadow:0 2px 4px rgba(0,0,0,0.03)}',
    '.lm-kpi:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.08);border-color:var(--primary-border)}',
    '.lm-kpi::before{content:"";position:absolute;top:0;right:0;left:0;height:3px;background:var(--primary)}',
    '.lm-kpi.success::before{background:var(--success)}.lm-kpi.danger::before{background:var(--danger)}.lm-kpi.warning::before{background:var(--warning)}.lm-kpi.info::before{background:var(--info)}',
    '.lm-kpi-icon{font-size:32px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--surface-hover);border-radius:12px;flex-shrink:0}',
    '.lm-kpi-body{flex:1;min-width:0}',
    '.lm-kpi-label{font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:3px}',
    '.lm-kpi-value{font-size:19px;font-weight:900;font-family:var(--font-en);color:var(--text);line-height:1.2}',
    '.lm-kpi-sub{font-size:10px;color:var(--text-muted);margin-top:3px}',
    '.lm-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px;padding:10px;background:var(--surface);border:1px solid var(--border);border-radius:12px}',
    '.lm-month-picker{display:flex;align-items:center;gap:6px}',
    '.lm-label-sm{font-size:12px;color:var(--text-muted);font-weight:600}',
    '.lm-mode-badge{padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700}',
    '.lm-mode-badge.admin{background:var(--info-bg);color:var(--info)}',
    '.lm-mode-badge.assistant{background:var(--success-bg);color:var(--success)}',
    '.lm-admin-banner{background:linear-gradient(135deg,var(--primary-bg),var(--info-bg));color:var(--primary);border:1px solid var(--primary-border);padding:12px 16px;border-radius:10px;margin-bottom:14px;font-weight:600}',
    '.lm-quick{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:12px}',
    '.lm-treasury-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:14px;box-shadow:0 2px 4px rgba(0,0,0,0.03)}',
    '.lm-treasury-head{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start;margin-bottom:12px;padding-bottom:12px;border-bottom:1px dashed var(--border)}',
    '.lm-treasury-head strong{font-size:16px}',
    '.lm-treasury-remaining{padding:8px 14px;border-radius:10px;font-weight:900;font-family:var(--font-en);font-size:15px}',
    '.lm-treasury-remaining.pos{background:var(--success-bg);color:var(--success);border:1px solid var(--success)}',
    '.lm-treasury-remaining.neg{background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger)}',
    '.lm-treasury-grid{display:grid;gap:6px}',
    '.lm-line{display:flex;justify-content:space-between;gap:10px;padding:8px 12px;background:var(--surface-hover);border-radius:8px;font-size:13px}',
    '.lm-line b{font-family:var(--font-en);font-weight:800}',
    '.lm-line b.success{color:var(--success)}.lm-line b.danger{color:var(--danger)}.lm-line b.warning{color:var(--warning)}',
    '.lm-log{margin-top:10px;max-height:280px;overflow:auto;border:1px solid var(--border);border-radius:10px}',
    '.lm-log-row{display:flex;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--border);font-size:12px;flex-wrap:wrap}',
    '.lm-log-row:last-child{border-bottom:none}',
    '.lm-log-date{font-family:var(--font-en);color:var(--text-muted);min-width:86px;font-size:11px}',
    '.lm-log-txt{flex:1;min-width:140px}',
    '.lm-log-amt{font-weight:800;font-family:var(--font-en)}',
    '.lm-log-amt.success{color:var(--success)}.lm-log-amt.danger{color:var(--danger)}',
    '.lm-group-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:12px;transition:all .2s}',
    '.lm-group-card:hover{border-color:var(--primary-border);box-shadow:0 4px 12px rgba(0,0,0,0.05)}',
    '.lm-group-head{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start;margin-bottom:10px}',
    '.lm-group-head strong{font-size:15px}',
    '.lm-group-actions{display:flex;gap:6px;flex-wrap:wrap}',
    '.lm-progress{height:6px;background:var(--surface-hover);border-radius:99px;overflow:hidden;margin:8px 0}',
    '.lm-progress-fill{height:100%;background:linear-gradient(90deg,var(--success),var(--primary));border-radius:99px;transition:width .5s}',
    '.lm-group-nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-top:8px}',
    '.lm-label{font-size:10px;color:var(--text-muted);display:block;font-weight:600}',
    '.lm-val{font-weight:800;font-family:var(--font-en);font-size:14px}',
    '.lm-val.success{color:var(--success)}.lm-val.warning{color:var(--warning)}.lm-val.danger{color:var(--danger)}.lm-val.info{color:var(--info)}',
    '.lm-table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--surface)}',
    '.lm-table{width:100%;border-collapse:collapse;font-size:13px}',
    '.lm-table th{background:var(--surface-hover);padding:10px 12px;text-align:right;font-size:11px;color:var(--text-muted);font-weight:700;border-bottom:2px solid var(--border)}',
    '.lm-table td{padding:10px 12px;border-bottom:1px solid var(--border)}',
    '.lm-table tbody tr:hover{background:var(--primary-bg)}',
    '.lm-table-compact th,.lm-table-compact td{padding:8px 10px;font-size:12px}',
    '.lm-amt{font-weight:800;font-family:var(--font-en)}',
    '.lm-amt.success{color:var(--success)}.lm-amt.danger{color:var(--danger)}.lm-amt.warning{color:var(--warning)}.lm-amt.info{color:var(--info)}',
    '.lm-badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700}',
    '.lm-badge.info{background:var(--info-bg);color:var(--info)}',
    '.lm-badge.success{background:var(--success-bg);color:var(--success)}',
    '.lm-two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}',
    '.lm-panel{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;min-height:200px}',
    '.lm-panel-title{font-size:14px;font-weight:800;padding-bottom:10px;margin-bottom:10px;border-bottom:2px solid var(--border)}',
    '.lm-panel-title.success{color:var(--success);border-color:var(--success)}',
    '.lm-panel-title.danger{color:var(--danger);border-color:var(--danger)}',
    '.lm-rank-row{display:flex;gap:10px;align-items:center;padding:8px;border-radius:8px;margin-bottom:6px;background:var(--surface-hover)}',
    '.lm-rank{width:28px;height:28px;border-radius:50%;background:var(--success);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-family:var(--font-en);flex-shrink:0}',
    '.lm-rank.warn{background:var(--warning)}',
    '.lm-rank-body{flex:1;min-width:0}',
    '.lm-rank-body strong{font-size:13px}',
    '.lm-rank-val{font-weight:900;font-family:var(--font-en);font-size:14px}',
    '.lm-rank-val.success{color:var(--success)}.lm-rank-val.danger{color:var(--danger)}',
    '.lm-bar{position:relative;height:20px;background:var(--surface-hover);border-radius:99px;overflow:hidden;min-width:80px}',
    '.lm-bar-fill{height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:99px}',
    '.lm-bar span{position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:11px;font-weight:800;font-family:var(--font-en);color:var(--text)}',
    '.lm-executive-summary{background:linear-gradient(135deg,var(--primary-bg),var(--surface));border:2px solid var(--primary-border);border-radius:14px;padding:18px;margin-top:20px}',
    '.lm-es-title{font-size:16px;font-weight:900;color:var(--primary);margin-bottom:12px}',
    '.lm-es-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}',
    '.lm-es-grid div{padding:10px;background:var(--surface);border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:8px}',
    '.lm-es-grid span{font-size:12px;color:var(--text-muted);font-weight:600}',
    '.lm-es-grid strong{font-family:var(--font-en);font-size:15px;font-weight:900}',
    '.lm-es-grid strong.success{color:var(--success)}.lm-es-grid strong.danger{color:var(--danger)}',
    '.lm-section-title{font-size:15px;font-weight:800;margin:16px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border);color:var(--text)}',
    '.lm-meta{font-size:11px;color:var(--text-muted);margin-top:2px}',
    '.lm-summary{font-size:13px;color:var(--text-muted);background:var(--surface-hover);padding:10px;border-radius:8px;margin-bottom:10px}',
    '.lm-note{font-size:12px;color:var(--text-muted);background:var(--primary-bg);border:1px solid var(--primary-border);padding:10px;border-radius:8px;margin:10px 0}',
    '.lm-empty{text-align:center;padding:40px;color:var(--text-muted);font-size:14px}',
    '.lm-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px}',
    '.lm-card-head{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;font-size:15px}',
    '.lm-row{display:flex;gap:8px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;background:var(--surface);flex-wrap:wrap}',
    '.lm-row-main{flex:1;min-width:150px}',
    '.lm-form-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}',
    '@media(max-width:768px){',
    '  .lm-kpi-grid{grid-template-columns:1fr 1fr}',
    '  .lm-two-col{grid-template-columns:1fr}',
    '  .lm-group-nums{grid-template-columns:1fr 1fr}',
    '  .lm-kpi{padding:12px;gap:10px}',
    '  .lm-kpi-icon{width:40px;height:40px;font-size:24px}',
    '  .lm-kpi-value{font-size:16px}',
    '}'
  ].join('\n');
  document.head.appendChild(st);
}

/* ═══════════════════════════════════════════════════════════════
   17. الحقن والمزامنة
   ═══════════════════════════════════════════════════════════════ */
function injectSection(){
  if(!canView()) return;
  injectCSS();
  var acc=document.getElementById('section-accounting')||Array.prototype.slice.call(document.querySelectorAll('section.section')).find(function(s){ var t=s.querySelector('.section-title'); return t&&(t.textContent||'').indexOf('المحاسبة')>=0; });
  if(!document.getElementById('section-money')){
    var host=acc?acc.parentNode:document.querySelector('.content-area'); if(!host) return;
    var sec=document.createElement('section'); sec.className='section'; sec.id='section-money';
    sec.innerHTML='<div class="section-header"><div><h2 class="section-title">🧮 المركز المالي</h2><p class="text-sm text-muted">الخزينة · المجموعات · الأساتذة · الخصومات · المصروفات · التقارير</p></div><button class="btn btn-ghost btn-sm" onclick="LM.refresh()">🔄</button></div><div class="section-tabs" id="lgMoneyTabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px"></div><div id="lgMoneyBody"></div>';
    host.appendChild(sec);
    if(acc&&!sec.__merged){ sec.__merged=1; acc.style.display='none';
      var navAcc=document.querySelector('[data-section="accounting"]');
      if(navAcc){ navAcc.setAttribute('data-section','money'); navAcc.setAttribute('onclick',"window.showSection('money')"); var lb=navAcc.querySelector('.sidebar-item-label'); if(lb) lb.textContent='المحاسبة والمركز المالي'; var ic=navAcc.querySelector('.sidebar-item-icon'); if(ic) ic.textContent='🧮'; }
    }
  }
  var exSec=document.getElementById('section-expenses'); if(exSec&&exSec!==document.getElementById('section-money')) exSec.style.display='none';
  var exNav=document.querySelector('[data-section="expenses"]'); if(exNav) exNav.style.display='none';
  var nav=document.getElementById('sidebarNav');
  if(nav&&!nav.querySelector('[data-section="money"]')){
    var anchor=nav.querySelector('[data-section="monthly"]')||nav.querySelector('[data-section="ledger"]')||nav.querySelector('[data-section="accounting"]');
    var item='<div class="sidebar-item" data-section="money" onclick="window.showSection(\'money\')"><span class="sidebar-item-icon">🧮</span><span class="sidebar-item-label">المحاسبة والمركز المالي</span></div>';
    if(anchor) anchor.insertAdjacentHTML('afterend',item); else nav.insertAdjacentHTML('beforeend',item);
  }
  if(typeof window.showSection==='function'&&!LM.__hook){
    LM.__hook=1; var os=window.showSection;
    window.showSection=function(id){ var r=os.apply(this,arguments);
      if(id==='money'){ setTimeout(function(){ var sec=document.getElementById('section-money'); if(sec&&!sec.classList.contains('active')){ try{ document.querySelectorAll('.section').forEach(function(s){s.classList.remove('active');}); sec.classList.add('active'); }catch(e){} } LM.renderMoneyPage(); },80); }
      return r; };
  }
}

window.addEventListener('ledger-sync',function(){ 
  clearUnpaidCache();
  var a=document.querySelector('.section.active'); 
  if(a&&a.id==='section-money') LM.renderMoneyPage(); 
});
window.addEventListener('storage',function(e){ 
  if(e.key==='eduflowLedgerPing'){ 
    clearUnpaidCache();
    var a=document.querySelector('.section.active'); 
    if(a&&a.id==='section-money') LM.renderMoneyPage(); 
  } 
});

function boot(){ injectSection(); setTimeout(injectSection,1000); setTimeout(injectSection,2500); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
setInterval(injectSection,5000);
})();

/* ═══════════════════════════════════════════════════════════════
   🛡️ حماية الأدمن (مزدوجة: منع الدوال + إخفاء الواجهة)
   ═══════════════════════════════════════════════════════════════ */
(function(){
function isAdminOnly(){
  var u=null;
  try{ u=(window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():((typeof currentUser!=='undefined')?currentUser:null); }catch(e){}
  return !!(u&&u.role==='admin');
}
var WRITE_FNS=['openTxModal','saveTx','delEntry','openShareModal','saveShare','addExpense','delExpense','editDiscount','saveDiscount','clearDiscount','saveSettings','openCenterCfg','saveCfg','setDiscount','addCenterTx','delCenterTx','editExpected','saveExpected'];
WRITE_FNS.forEach(function(fn){
  var orig=(window.LM||window.LG||{})[fn];
  if(typeof orig!=='function') return;
  (window.LM||window.LG)[fn]=function(){
    if(isAdminOnly()){ if(window.safeToast) window.safeToast('👁️ وضع الأدمن: إحصائيات فقط — الكتابة للمساعدين والسوبر','error'); return; }
    return orig.apply(this,arguments);
  };
});
function hideWriteBtns(){
  if(!isAdminOnly()) return;
  if(document.getElementById('lmAdminGuardCss')) return;
  var st=document.createElement('style'); st.id='lmAdminGuardCss';
  st.textContent=[
    '[onclick*="openTxModal"],[onclick*="saveShare"],[onclick*="openShareModal"],',
    '[onclick*="addExpense"],[onclick*="delExpense"],[onclick*="editDiscount"],',
    '[onclick*="clearDiscount"],[onclick*="delEntry"],[onclick*="saveSettings"],',
    '[onclick*="editExpected"],[onclick*="saveExpected"],',
    '.lm-group-actions{display:none!important}'
  ].join('');
  document.head.appendChild(st);
  var host=document.getElementById('lgMoneyBody');
  if(host&&!document.getElementById('lmAdminBadge')){
    var b=document.createElement('div'); b.id='lmAdminBadge';
    b.style.cssText='background:linear-gradient(135deg,var(--info-bg),var(--primary-bg));color:var(--info);border:1px solid var(--info);padding:12px 16px;border-radius:10px;margin-bottom:14px;font-weight:600;';
    b.innerHTML='👁️ <strong>وضع المراقب العام:</strong> تقارير شاملة لكل الأساتذة والسناتر بدون صلاحية تعديل — التعديل مسؤولية المساعد المختص.';
    host.parentNode.insertBefore(b,host);
  }
}
setInterval(hideWriteBtns,2500); setTimeout(hideWriteBtns,800);
(function(){
  var t=document.querySelector('#section-money .section-title');
  if(t&&isAdminOnly()) t.textContent='📊 التقارير المالية (مراقب عام)';
})();
})();

console.log('✅ Legendary Money V8 loaded — الطاقة الاستيعابية + المتأخرات الدقيقة');
/* 🧪 دالة تشخيص — اكتبها في الكونسول: LM.diagnose('اسم المجموعة') */
LM.diagnose=function(groupName){
  var g=(DataService.getGroups?DataService.getGroups():[]).find(function(x){return (x.name||'').indexOf(groupName)>=0;});
  if(!g){ console.log('❌ مجموعة مش موجودة:', groupName); return; }
  console.log('📋 تشخيص المجموعة:', g.name);
  console.log('  ├─ ID:', g.id);
  console.log('  ├─ السنتر:', g.center);
  console.log('  ├─ السعر:', g.monthlyFee);
  console.log('  ├─ expectedStudents:', g.expectedStudents);
  console.log('  └─ cycleRanges:', g.cycleRanges);
  
  var pays=(db().payments||[]).filter(function(p){return p.groupId===g.id;});
  console.log('💰 الدفعات ('+pays.length+'):', pays.map(function(p){
    return {id:p.id, month:p.month, paidAmount:p.paidAmount, history:(p.history||[]).length, paidAt:p.paidAt};
  }));
  
  var tn=monthNet(g,monthStr());
  console.log('📊 monthNet للشهر الحالي:', tn);
  
  var ext=groupFinanceExtended(g,monthStr());
  console.log('📊 groupFinanceExtended:', ext);
  
  var s=standing(g.center,monthStr());
  console.log('🏦 standing للسنتر:', {
    mNet:s.mNet, mColl:s.mColl, mShare:s.mShare, 
    allNet:s.allNet, allColl:s.allColl, remaining:s.remaining
  });
};