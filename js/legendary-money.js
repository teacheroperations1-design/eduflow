/* ================================================================
💰 Legendary Money V1 — موجة الفلوس (الإضافات الأسطورية 2)
• 🎟️ خصومات: نسبة/مبلغ لكل طالب — تسري في الدفتر والفواتير وصفحات الطالب
• 📆 تقسيط: قسّط الشهرية على قسطين أو أكتر بمواعيد استحقاق
• 🏦 الخزينة: تقرير يومي/فترة بالتحصيل والمحصّل لكل مجموعة وسنتر
• 📊 نسبة الأستاذ: كشف شهري بمستحقاته ونسبته من المحصّل
• 💳 مصروفات: إيجار/رواتب/خامات + صافي الربح
• 📈 رسوم: Canvas خفيف بدون مكتبات
================================================================ */
(function(){
"use strict";
var MG=window.LG=window.LG||{};
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function saveD(d){if(DataService._saveData)DataService._saveData(d);}
function cur(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null);}catch(e){return null;}}
function pad(n){return String(n).padStart(2,'0');}
function todayStr(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function monthStr(d){d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1);}
function toast(m,t){try{if(window.safeToast)window.safeToast(m,t||'info');}catch(e){}}
function stuName(sid){var s=DataService.getUserById?DataService.getUserById(sid):null;return (s&&s.name)||'-';}
function cfg(){var c=db().moneyConfig||{};return {installments:c.installments||1,gapDays:c.gapDays||15,teacherSharePct:c.teacherSharePct||0};}
MG.saveCfg=function(c){var d=db();d.moneyConfig=Object.assign(cfg(),c);saveD(d);try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc('meta','moneyConfig',d.moneyConfig);}catch(e){}toast('✅ تم حفظ إعدادات المال','success');};

/* ========== 🎟️ الخصومات ========== */
MG.effFee=function(sid,g){
  try{
    var base=(g&&g.monthlyFee)||0;
    var s=(typeof sid==='object')?sid:(DataService.getUserById?DataService.getUserById(sid):null);
    var dsc=(s&&s.discount)||null;
    if(!dsc||!base) return base;
    if(dsc.type==='pct') return Math.max(0,Math.round(base*(1-(+dsc.value||0)/100)));
    if(dsc.type==='fixed') return Math.max(0,base-(+dsc.value||0));
    return base;
  }catch(e){ return (g&&g.monthlyFee)||0; }
};
MG.setDiscount=async function(sid,dsc){
  try{
    if(DataService.updateUser) await DataService.updateUser(sid,{discount:dsc||null});
    toast(dsc?('🎟️ خصم '+(dsc.type==='pct'?dsc.value+'%':dsc.value+' ج.م')+' اتفعّل'):'🎟️ الخصم اتشال','success');
    try{localStorage.setItem('eduflowLedgerPing',String(Date.now()));}catch(e){}
  }catch(e){ toast('خطأ','error'); }
};

/* ========== 📆 التقسيط ========== */
MG.dueSchedule=function(sid,g,cycleStartYm,fee){
  var c=cfg(), n=Math.max(1,c.installments||1);
  fee=(fee!=null)?fee:MG.effFee(sid,g);
  var per=Math.floor(fee/n), rem=fee-per*n;
  var start=new Date((cycleStartYm||monthStr())+'-01T12:00:00');
  var out=[];
  for(var i=0;i<n;i++){ var d=new Date(start); d.setDate(d.getDate()+i*c.gapDays); out.push({n:i+1,amount:per+(i===n-1?rem:0),due:d.toISOString().slice(0,10)}); }
  return out;
};

/* ========== 🏦 الخزينة ========== */
function histRows(from,to){
  var d=db(), out=[], gs=(DataService.getGroups?DataService.getGroups():[]);
  (d.payments||[]).forEach(function(p){
    (p.history||[]).forEach(function(h){
      var dt=(h.date||'').slice(0,10); if(!dt) return;
      if(from&&dt<from) return; if(to&&dt>to) return;
      var g=gs.find(function(x){return x.id===p.groupId;});
      var byName='—';
      try{ var u=h.by?(DataService.getUserById?DataService.getUserById(h.by):null):null; byName=(u&&u.name)||h.byName||'—'; }catch(e){}
      out.push({date:dt,amount:h.amount||0,sid:p.studentId,gid:p.groupId,gname:g?g.name:'-',center:g?(g.center||'-'):'-',by:byName,month:p.month});
    });
  });
  out.sort(function(a,b){return b.date.localeCompare(a.date);});
  return out;
}
MG.treasury=histRows;
MG.exportTreasury=function(from,to){
  var rows=histRows(from,to);
  var csv='\uFEFFالتاريخ,الطالب,المجموعة,السنتر,المحصّل,المبلغ\n'+rows.map(function(r){return [r.date,stuName(r.sid),r.gname,r.center,r.by,r.amount].join(',');}).join('\n');
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download='treasury-'+from+'-'+to+'.csv'; a.click();
};

/* ========== 📊 نسبة الأستاذ ========== */
MG.teacherShare=function(tid,month){
  var c=cfg(), t=(DataService.getUserById?DataService.getUserById(tid):null);
  var pct=(t&&t.sharePct!=null)?+t.sharePct:(c.teacherSharePct||0);
  var gs=(DataService.getGroups?DataService.getGroups():[]).filter(function(g){return g.teacherId===tid;});
  var gids={}; gs.forEach(function(g){gids[g.id]=1;});
  var rows=histRows(month+'-01',month+'-31').filter(function(r){return gids[r.gid];});
  var collected=rows.reduce(function(s,r){return s+r.amount;},0);
  return {name:t?t.name:'-',pct:pct,collected:collected,share:Math.round(collected*pct/100)};
};
MG.setTeacherShare=async function(tid){
  if(!canEditShare(tid)){ toast('🧮 مسموح لك بس تعدل نسبة أستاذك المرتبط','error'); return; }
  var t=DataService.getUserById?DataService.getUserById(tid):null; if(!t) return;
  var v=prompt('نسبة الأستاذ '+t.name+' من المحصّل (%):',(t.sharePct!=null?t.sharePct:(cfg().teacherSharePct||0)));
  if(v===null) return;
  if(DataService.updateUser) await DataService.updateUser(tid,{sharePct:Math.max(0,Math.min(100,+v||0))});
  toast('✅ النسبة اتحفظت','success'); MG.openShares();
};

/* ========== 💳 المصروفات + الربح ========== */
MG.addExpense=function(ex){
  var d=db(); d.expenses=d.expenses||[];
  ex.id='exp_'+Date.now(); ex.by=(cur()||{}).name||'-'; ex.at=new Date().toISOString();
  d.expenses.push(ex); saveD(d);
  try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc('expenses',ex.id,ex);}catch(e){}
  toast('💳 المصروف اتسجل','success');
};
MG.delExpense=function(id){
  var d=db(); var ex=(d.expenses||[]).find(function(x){return x.id===id;});
  d.expenses=(d.expenses||[]).filter(function(x){return x.id!==id;}); saveD(d);
  try{if(ex&&window.FirebaseService&&FirebaseService._db)FirebaseService.deleteDoc('expenses',id);}catch(e){}
  toast('🗑 اتحذف','success');
};
MG.profit=function(month){
  var collected=histRows(month+'-01',month+'-31').reduce(function(s,r){return s+r.amount;},0);
  var exp=(db().expenses||[]).filter(function(x){return (x.date||'').slice(0,7)===month;}).reduce(function(s,x){return s+(+x.amount||0);},0);
  return {collected:collected,expenses:exp,net:collected-exp};
};

/* ========== 📈 محرك رسوم Canvas ========== */
MG.chart=function(canvas,data){
  try{
    var cv=(typeof canvas==='string')?document.getElementById(canvas):canvas; if(!cv) return;
    var ctx=cv.getContext('2d'); var W=cv.width=cv.offsetWidth*2, H=cv.height=cv.offsetHeight*2;
    ctx.clearRect(0,0,W,H);
    var vals=data.values||[], labs=data.labels||[];
    var max=Math.max.apply(null,vals.concat([1]));
    var cols=data.colors||['#6366f1','#8b5cf6','#ec4899','#10b981','#f59e0b','#3b82f6'];
    if(data.type==='donut'){
      var tot=vals.reduce(function(a,b){return a+b;},0)||1, ang=-Math.PI/2, cx=W/2, cy=H/2, R=Math.min(W,H)/2-12;
      vals.forEach(function(v,i){ var a2=ang+(v/tot)*Math.PI*2; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R,ang,a2); ctx.closePath(); ctx.fillStyle=cols[i%cols.length]; ctx.fill(); ang=a2; });
      ctx.beginPath(); ctx.arc(cx,cy,R*0.55,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0)'; ctx.globalCompositeOperation='destination-out'; ctx.fill(); ctx.globalCompositeOperation='source-over';
      return;
    }
    var pad=50, bw=(W-pad*2)/Math.max(1,vals.length);
    vals.forEach(function(v,i){
      var h=(H-pad*2)*(v/max), x=pad+i*bw+bw*0.2, y=H-pad-h;
      if(data.type==='bar'){ ctx.fillStyle=cols[i%cols.length]; ctx.fillRect(x,y,bw*0.6,h); }
      else { if(i>0){ ctx.strokeStyle=cols[0]; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(pad+(i-1)*bw+bw/2,H-pad-(H-pad*2)*(vals[i-1]/max)); ctx.lineTo(x+bw/2,y); ctx.stroke(); } ctx.fillStyle=cols[0]; ctx.beginPath(); ctx.arc(x+bw/2,y,7,0,Math.PI*2); ctx.fill(); }
      ctx.fillStyle='#94a3b8'; ctx.font='20px Cairo,sans-serif'; ctx.textAlign='center';
      ctx.fillText(String(labs[i]||''),x+bw/2,H-14); ctx.fillText(String(v),x+bw/2,y-10);
    });
  }catch(e){}
};
function drawDual(cv,labels,a,b){
  try{
    var ctx=cv.getContext('2d'); var W=cv.width=cv.offsetWidth*2, H=cv.height=cv.offsetHeight*2;
    var max=Math.max.apply(null,a.concat(b,[1])); var pad=50, bw=(W-pad*2)/labels.length;
    labels.forEach(function(l,i){
      var h1=(H-pad*2)*(a[i]/max), h2=(H-pad*2)*(b[i]/max);
      ctx.fillStyle='#6366f1'; ctx.fillRect(pad+i*bw+bw*0.15,H-pad-h1,bw*0.3,h1);
      ctx.fillStyle='#f59e0b'; ctx.fillRect(pad+i*bw+bw*0.5,H-pad-h2,bw*0.3,h2);
      ctx.fillStyle='#94a3b8'; ctx.font='20px Cairo,sans-serif'; ctx.textAlign='center'; ctx.fillText(l,pad+i*bw+bw/2,H-14);
    });
  }catch(e){}
}

/* ========== 🖥️ واجهة المركز المالي ========== */
function body(){ return document.getElementById('lgMoneyBody'); }
MG.openMoneyCenter=function(){
  var pr=MG.profit(monthStr());
  if(typeof ThemeManager==='undefined'||!ThemeManager.openModal) return;
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">💰 المركز المالي</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="stat-mini" style="margin-bottom:12px;">'+
  '<div class="stat-mini-box"><div class="stat-mini-value" style="color:var(--success);">'+pr.collected+'</div><div class="stat-mini-label">محصّل '+monthStr()+'</div></div>'+
  '<div class="stat-mini-box"><div class="stat-mini-value" style="color:var(--danger);">'+pr.expenses+'</div><div class="stat-mini-label">مصروفات</div></div>'+
  '<div class="stat-mini-box"><div class="stat-mini-value" style="color:'+(pr.net>=0?'var(--success)':'var(--danger)')+';">'+pr.net+'</div><div class="stat-mini-label">صافي الربح</div></div></div>'+
  '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">'+
  '<button class="btn btn-primary btn-sm" onclick="LG.openTreasury()">🏦 الخزينة</button>'+
  '<button class="btn btn-secondary btn-sm" onclick="LG.openExpenses()">💳 المصروفات</button>'+
  '<button class="btn btn-warning btn-sm" onclick="LG.openShares()">📊 نسبة الأساتذة</button>'+
  '<button class="btn btn-success btn-sm" onclick="LG.openCharts()">📈 الرسوم</button>'+
  '<button class="btn btn-ghost btn-sm" onclick="LG.openDiscounts()">🎟️ الخصومات</button>'+
  '<button class="btn btn-ghost btn-sm" onclick="LG.openMoneyCfg()">⚙️ إعدادات</button></div>'+
  '<div id="lgMoneyBody"></div></div>','modal-lg');
  MG.openTreasury();
};

MG.openTreasury=function(from,to){
  from=from||todayStr(); to=to||todayStr();
  var rows=histRows(from,to), tot=rows.reduce(function(s,r){return s+r.amount;},0);
  var byBy={}; rows.forEach(function(r){ byBy[r.by]=(byBy[r.by]||0)+r.amount; });
  var gsum=myGroupsMoney().map(function(g){ return {g:g,m:groupMoney(g,from,to)}; }).filter(function(x){ return x.m.exp||x.m.coll||x.m.out; });
  var html='<div class="filter-info">🏦 خزينة '+from+' → '+to+' — المحصل بالفترة: <strong>'+tot+' ج.م</strong> ('+rows.length+' دفعة)</div>'+
  '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center;">'+
  '<button class="btn btn-ghost btn-sm" onclick="LG.openTreasury(\''+todayStr()+'\',\''+todayStr()+'\')">النهارده</button>'+
  '<button class="btn btn-ghost btn-sm" onclick="LG.openTreasury(\''+monthStr()+'-01\',\''+todayStr()+'\')">الشهر كله</button>'+
  '<input type="date" id="trFrom" class="form-input" style="width:150px;" value="'+from+'">'+
  '<input type="date" id="trTo" class="form-input" style="width:150px;" value="'+to+'">'+
  '<button class="btn btn-secondary btn-sm" onclick="LG.openTreasury(document.getElementById(\'trFrom\').value,document.getElementById(\'trTo\').value)">🔎 عرض</button>'+
  '<button class="btn btn-ghost btn-sm" onclick="LG.exportTreasury(\''+from+'\',\''+to+'\')">📊 CSV</button></div>'+
  '<div class="card" style="padding:10px;margin-bottom:10px;"><strong style="font-size:13px;">💰 حصيلة شهريات المجموعات (المفروض يكون كام vs المحصل فعلاً)</strong><div style="max-height:240px;overflow:auto;margin-top:8px;">'+
  (gsum.length?gsum.map(function(x){
    var pct=x.m.exp?Math.min(100,Math.round((x.m.collAll/x.m.exp)*100)):0;
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;"><strong>'+x.g.name+'</strong><div class="text-xs text-muted">مستحق من دورات مكتملة + رجعي: <b>'+x.m.exp+' ج.م</b> · متبقي: <span style="color:var(--danger);font-weight:800;">'+x.m.out+' ج.م</span></div><div class="progress-bar" style="margin-top:6px;"><div class="progress-bar-fill" style="width:'+pct+'%"></div></div></div><div style="text-align:left;min-width:120px;"><div style="font-weight:900;color:var(--success);font-family:var(--font-en);">'+x.m.collAll+'/'+x.m.exp+'</div><div class="text-xs text-muted">إجمالي التحصيل '+pct+'%</div><div class="text-xs" style="color:var(--primary);">بالفترة المختارة: '+x.m.coll+'</div></div></div>';
  }).join(''):'<p class="text-muted">مفيش مجموعات عليها مستحقات</p>')+'</div></div>'+
  '<div style="margin-bottom:8px;">'+Object.keys(byBy).map(function(k){return '<span class="badge badge-info" style="margin:2px;">👤 '+k+': '+byBy[k]+' ج.م</span>';}).join('')+'</div>'+
  '<div style="max-height:260px;overflow:auto;">'+(rows.length?rows.map(function(r){
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;"><strong>'+stuName(r.sid)+'</strong><div class="text-xs text-muted">'+r.gname+' · 🏢 '+r.center+' · 👤 '+r.by+' · 📅 '+r.date+'</div></div><span class="points-badge">+'+r.amount+'</span></div>';
  }).join(''):'<p class="text-muted">مفيش تحصيل في الفترة دي</p>')+'</div>';
  if(body()) body().innerHTML=html;
};

MG.openExpenses=function(){
  var list=(db().expenses||[]).slice().reverse();
  var cats=['إيجار','رواتب','مرافق','خامات','تسويق','أخرى'];
  var html='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">'+
  '<input type="date" id="exDate" class="form-input" style="width:150px;" value="'+todayStr()+'">'+
  '<select id="exCat" class="form-select" style="width:120px;">'+cats.map(function(c){return '<option>'+c+'</option>';}).join('')+'</select>'+
  '<input type="number" id="exAmt" class="form-input" style="width:110px;" placeholder="المبلغ">'+
  '<input type="text" id="exNote" class="form-input" style="flex:1;min-width:130px;" placeholder="ملاحظة">'+
  '<button class="btn btn-primary btn-sm" onclick="LG.addExpense({date:document.getElementById(\'exDate\').value,category:document.getElementById(\'exCat\').value,amount:(+document.getElementById(\'exAmt\').value||0),note:document.getElementById(\'exNote\').value});LG.openExpenses();">➕</button></div>'+
  '<div style="max-height:280px;overflow:auto;">'+(list.length?list.map(function(x){
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;"><strong>'+x.category+'</strong> — '+(x.note||'')+'<div class="text-xs text-muted">📅 '+x.date+' · 👤 '+x.by+'</div></div><span class="points-badge" style="color:var(--danger);">-'+x.amount+'</span><button class="btn btn-danger btn-sm" onclick="LG.delExpense(\''+x.id+'\');LG.openExpenses();">🗑</button></div>';
  }).join(''):'<p class="text-muted">مفيش مصروفات مسجلة</p>')+'</div>';
  if(body()) body().innerHTML=html;
};
MG.openShares=function(month){
  month=month||monthStr();
  var u=cur(); var ts=(DataService.getTeachers?DataService.getTeachers():[]);
  if(u&&u.role==='assistant'){ var lt=linkedTeacherId(); ts=ts.filter(function(t){return t.id===lt;}); }
  var html='<div class="filter-info">📊 كشف نسب شهر '+month+(u&&u.role==='assistant'?' — (أنت شايف أستاذك المرتبط بس، وتقدر تعدل نسبته هو بس)':' — (الأدمن يتحكم في نسب كل الأساتذة)')+'</div>'+
  '<input type="month" class="form-input" style="width:170px;margin-bottom:8px;" value="'+month+'" onchange="LG.openShares(this.value)">'+
  '<div style="max-height:320px;overflow:auto;">'+ts.map(function(t){
    var r=MG.teacherShare(t.id,month);
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;"><strong>👨‍ '+r.name+'</strong><div class="text-xs text-muted">محصّل مجموعاته: '+r.collected+' ج.م · نسبته '+r.pct+'%</div></div><span class="points-badge">'+r.share+' ج.م</span>'+(canEditShare(t.id)?'<button class="btn btn-ghost btn-sm" onclick="LG.setTeacherShare(\''+t.id+'\')">✏️%</button>':'<span class="badge badge-muted"></span>')+'</div>';
  }).join('')+'</div>';
  if(body()) body().innerHTML=html;
};
MG.openCharts=function(){
  var months=[]; for(var i=5;i>=0;i--){ var d=new Date(); d.setMonth(d.getMonth()-i); months.push(monthStr(d)); }
  var coll=months.map(function(m){return MG.profit(m).collected;});
  var exp=months.map(function(m){return MG.profit(m).expenses;});
  var html='<div class="filter-info">📈 آخر 6 شهور — 🟣 تحصيل مقابل 🟠 مصروفات</div>'+
  '<canvas id="lgChart1" style="width:100%;height:180px;background:var(--surface-hover);border-radius:12px;"></canvas>'+
  '<canvas id="lgChart2" style="width:100%;height:180px;background:var(--surface-hover);border-radius:12px;margin-top:12px;"></canvas>'+
  '<div class="text-xs text-muted" style="text-align:center;margin-top:6px;">توزيع مصروفات الشهر الحالي بالفئة</div>';
  if(body()) body().innerHTML=html;
  setTimeout(function(){
    drawDual(document.getElementById('lgChart1'),months.map(function(m){return m.slice(5);}),coll,exp);
    var cats={};
    (db().expenses||[]).forEach(function(x){ if((x.date||'').slice(0,7)===monthStr()) cats[x.category]=(cats[x.category]||0)+(+x.amount||0); });
    MG.chart('lgChart2',{type:'donut',labels:Object.keys(cats),values:Object.keys(cats).map(function(k){return cats[k];})});
  },150);
};
MG.openDiscounts=function(q){
  q=(q||'').toLowerCase();
  var sts=(DataService.getStudents?DataService.getStudents():[]).filter(function(s){ return !q||(s.name||'').toLowerCase().indexOf(q)>=0||(s.code||'').toLowerCase().indexOf(q)>=0; }).slice(0,40);
  var html='<div class="filter-info">🎟️ الخصومات — بتتخصم من الشهرية في كل الشاشات تلقائياً</div>'+
  '<input type="text" class="form-input" style="margin-bottom:8px;" placeholder="🔍 ابحث طالب..." value="'+(q||'')+'" oninput="LG.openDiscounts(this.value)">'+
  '<div style="max-height:300px;overflow:auto;">'+sts.map(function(s){
    var dsc=s.discount;
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;"><strong>'+s.name+'</strong> <span class="text-xs text-muted">'+(s.code||'')+'</span><div class="text-xs" style="margin-top:2px;">'+(dsc?('🎟️ خصم '+(dsc.type==='pct'?dsc.value+'%':dsc.value+' ج.م')+(dsc.reason?(' — '+dsc.reason):'')):'بدون خصم')+'</div></div>'+
    '<button class="btn btn-primary btn-sm" onclick="LG.editDiscount(\''+s.id+'\')">✏️</button>'+
    (dsc?'<button class="btn btn-danger btn-sm" onclick="LG.setDiscount(\''+s.id+'\',null);setTimeout(function(){LG.openDiscounts()},300);">🗑</button>':'')+'</div>';
  }).join('')+'</div>';
  if(body()) body().innerHTML=html;
};

MG.editDiscount=function(sid){
  var s=DataService.getUserById?DataService.getUserById(sid):null; if(!s) return;
  var dsc=s.discount||{};
  if(typeof ThemeManager==='undefined'||!ThemeManager.openModal) return;
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🎟️ خصم: '+s.name+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="form-group"><label>نوع الخصم</label><select id="dsType" class="form-select" onchange="LG.dsPreview(\''+sid+'\')"><option value="pct" '+(dsc.type==='pct'?'selected':'')+'>نسبة %</option><option value="fixed" '+(dsc.type==='fixed'?'selected':'')+'>مبلغ ثابت (ج.م)</option></select></div>'+
  '<div class="form-group"><label>القيمة</label><input type="number" id="dsVal" class="form-input" value="'+(dsc.value||0)+'" min="0" oninput="LG.dsPreview(\''+sid+'\')"></div>'+
  '<div class="form-group"><label>السبب (اختياري)</label><input type="text" id="dsReason" class="form-input" value="'+(dsc.reason||'')+'" placeholder="حالة اجتماعية / أخوات / منحة تفوق"></div>'+
  '<div class="filter-info" id="dsPrev"></div>'+
  '<div style="display:flex;gap:8px;">'+(s.discount?'<button class="btn btn-danger" onclick="LG.setDiscount(\''+sid+'\',null);ThemeManager.closeModal();LG.openDiscounts();">🗑 شيل الخصم</button>':'')+'<button class="btn btn-primary w-full" onclick="LG.dsSave(\''+sid+'\')">💾 حفظ الخصم</button></div>'+
  '</div>','modal-sm');
  MG.dsPreview(sid);
};
MG.dsPreview=function(sid){
  var el=document.getElementById('dsPrev'); if(!el) return;
  var type=(document.getElementById('dsType')||{}).value||'pct';
  var val=+((document.getElementById('dsVal')||{}).value||0);
  var gs=(DataService.getStudentTeachers?DataService.getStudentTeachers(sid):[]).map(function(t){return t.group;}).filter(Boolean);
  el.innerHTML='<strong>👁️ المعاينة الحية:</strong><br>'+(gs.length?gs.map(function(g){
    var base=g.monthlyFee||0;
    var fin=type==='pct'?Math.max(0,Math.round(base*(1-val/100))):Math.max(0,base-val);
    return '👥 '+g.name+': <s style="opacity:.6;">'+base+'</s> ← <b style="color:var(--success);">'+fin+' ج.م</b>';
  }).join('<br>'):'مفيش مجموعات للطالب ده');
};
MG.dsSave=async function(sid){
  var type=(document.getElementById('dsType')||{}).value||'pct';
  var val=+((document.getElementById('dsVal')||{}).value||0);
  var reason=(document.getElementById('dsReason')||{}).value||'';
  if(type==='pct'&&(val<0||val>100)){ toast('نسبة لازم بين 0 و 100','error'); return; }
  if(type==='fixed'&&val<0){ toast('مبلغ غير صحيح','error'); return; }
  await MG.setDiscount(sid,{type:type,value:val,reason:reason});
  ThemeManager.closeModal(); MG.openDiscounts();
};


MG.openMoneyCfg=function(){
  var c=cfg();
  var html='<div class="filter-info">⚙️ إعدادات المال العامة (بتسري على كل اللوحات)</div>'+
  '<div class="form-group"><label>📆 عدد أقساط الشهرية</label><input type="number" id="mcInst" class="form-input" value="'+c.installments+'" min="1" max="4"></div>'+
  '<div class="form-group"><label>⏳ الأيام بين كل قسط والتاني</label><input type="number" id="mcGap" class="form-input" value="'+c.gapDays+'" min="1"></div>'+
  '<div class="form-group"><label>📊 نسبة الأساتذة الافتراضية %</label><input type="number" id="mcShare" class="form-input" value="'+c.teacherSharePct+'" min="0" max="100"></div>'+
  '<button class="btn btn-primary w-full" onclick="LG.saveCfg({installments:(+document.getElementById(\'mcInst\').value||1),gapDays:(+document.getElementById(\'mcGap\').value||15),teacherSharePct:(+document.getElementById(\'mcShare\').value||0)});LG.openMoneyCfg();">💾 حفظ</button>';
  if(body()) body().innerHTML=html;
};

/* ========== 🔗 الأستاذ المرتبط للمساعد + صلاحيات النسب ========== */
function myGroupsMoney(){
  var gs=(DataService.getGroups?DataService.getGroups():[]);
  var u=cur(); if(!u) return gs;
  if(u.role==='assistant'&&window.Ops&&Ops.groupsInScope){ gs=Ops.groupsInScope(u.id)||gs; }
  if(u.role==='teacher'){ gs=gs.filter(function(g){return g.teacherId===u.id;}); }
  return gs;
}
function linkedTeacherId(){
  var u=cur(); if(!u) return null;
  try{ if(window.Ops&&Ops.getAssignment){ var a=Ops.getAssignment(u.id); if(a&&a.teacherId) return a.teacherId; } }catch(e){}
  var gs=myGroupsMoney(); return gs.length?gs[0].teacherId:null;
}
function canEditShare(tid){
  var r=role();
  if(r==='admin'||r==='super_admin') return true;
  if(r==='assistant') return tid===linkedTeacherId();
  return false;
}
/* ========== 🏦 حصيلة كل مجموعة (مفروض vs محصل vs متبقي) ========== */
function studentsOfG(gid){ try{ return (DataService.getStudentsByGroup?DataService.getStudentsByGroup(gid):[]); }catch(e){ return []; } }
function groupMoney(g,from,to){
  var exp=0,out=0;
  var sts=studentsOfG(g.id);
  var cyc=(window.LedgerUI&&LedgerUI.cyclesOf)?LedgerUI.cyclesOf(g):[];
  sts.forEach(function(s){
    cyc.forEach(function(c){
      var fee=MG.effFee(s,g);
      var st=(window.LedgerUI&&LedgerUI.groupSessions)?LedgerUI.groupSessions(g.id,c.ck):null;
      if(st&&st.complete){
        exp+=fee;
        var paid=(window.LedgerUI&&LedgerUI.paidForCycle)?LedgerUI.paidForCycle(s.id,g.id,c.ck):0;
        if(paid<fee) out+=fee-paid;
      }
    });
  });
  (db().payments||[]).forEach(function(p){
    if(p.groupId!==g.id||!p.legacy) return;
    var rem=(p.amount||0)-(p.paidAmount||0);
    if(rem>0&&sts.some(function(s){return s.id===p.studentId;})){ exp+=p.amount; out+=rem; }
  });
  var collAll=histRows().filter(function(r){return r.gid===g.id;}).reduce(function(s,r){return s+r.amount;},0);
  var coll=histRows(from,to).filter(function(r){return r.gid===g.id;}).reduce(function(s,r){return s+r.amount;},0);
  return {exp:exp,out:out,coll:coll,collAll:collAll};
}
/* ========== 📄 المركز المالي كصفحة حقيقية داخل قسم المالية ========== */
MG.renderMoneyPage=function(){
  var host=document.getElementById('lgMoneyBody'); if(!host) return;
  var allow=function(a){ try{ return (window.LG&&LG.can)?LG.can(a):true; }catch(e){ return true; } };
  var tabs=[];
  if(allow('view_treasury')) tabs.push(['treasury','🏦 الخزينة'],['charts','📈 الرسوم']);
  if(allow('edit_money_cfg')) tabs.push(['expenses','💳 المصروفات'],['discounts','🎟️ الخصومات'],['cfg','⚙️ إعدادات']);
  if(allow('view_treasury')) tabs.push(['shares','📊 نسب الأساتذة']);
  var bar=document.getElementById('lgMoneyTabs');
  if(bar&&!bar.__built){ bar.innerHTML=tabs.map(function(t){ return '<button class="section-tab" data-mt="'+t[0]+'" onclick="LG.moneyTab(\''+t[0]+'\')">'+t[1]+'</button>'; }).join(''); bar.__built=1; }
  MG.moneyTab(window.__lgMoneyTab||'treasury');
};
MG.moneyTab=function(t){
  window.__lgMoneyTab=t;
  document.querySelectorAll('#lgMoneyTabs .section-tab').forEach(function(b){ b.classList.toggle('active',b.getAttribute('data-mt')===t); });
  if(t==='treasury') MG.openTreasury();
  else if(t==='expenses') MG.openExpenses();
  else if(t==='shares') MG.openShares();
  else if(t==='discounts') MG.openDiscounts();
  else if(t==='charts') MG.openCharts();
  else MG.openMoneyCfg();
};
function injectMoneySection(){
  var u=cur(); if(!u||(u.role!=='admin'&&u.role!=='super_admin'&&u.role!=='assistant')) return;
  if(!document.getElementById('section-money')){
    var host=document.querySelector('.content-area'); if(!host) return;
    var sec=document.createElement('section'); sec.className='section'; sec.id='section-money';
    sec.innerHTML='<div class="section-header"><div><h2 class="section-title">💰 المركز المالي</h2><p class="text-sm text-muted">خزينة المجموعات · مصروفات · نسب · خصومات · رسوم — صفحة واحدة</p></div><button class="btn btn-ghost btn-sm" onclick="LG.renderMoneyPage()">🔄 تحديث</button></div><div class="section-tabs" id="lgMoneyTabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;"></div><div id="lgMoneyBody"></div>';
    host.appendChild(sec);
  }
  var nav=document.getElementById('sidebarNav');
  if(nav&&!nav.querySelector('[data-section="money"]')){
    var anchor=nav.querySelector('[data-section="ledger"]')||nav.querySelector('[data-section="cycles"]');
    var item='<div class="sidebar-item" data-section="money" onclick="window.showSection(\'money\')"><span class="sidebar-item-icon">💰</span><span class="sidebar-item-label">المركز المالي</span></div>';
    if(anchor) anchor.insertAdjacentHTML('afterend',item); else nav.insertAdjacentHTML('beforeend',item);
  }
  /* زرار جوه قسم المالية (هيدر دفتر التحصيل) */
  try{
    var lh=document.querySelector('#section-ledger .section-header div[style]');
    if(lh&&!document.getElementById('lgMoneyInLedger')){
      var b=document.createElement('button'); b.id='lgMoneyInLedger'; b.className='btn btn-success btn-sm'; b.textContent='💰 المركز المالي';
      b.onclick=function(){ window.showSection('money'); }; lh.appendChild(b);
    }
  }catch(e){}
  if(typeof window.showSection==='function'&&!MG.__moneyHook){
    MG.__moneyHook=1;
    var os=window.showSection;
    window.showSection=function(id){ var r=os.apply(this,arguments); if(id==='money') setTimeout(function(){ MG.renderMoneyPage(); },80); return r; };
  }
}
setInterval(injectMoneySection,3000); setTimeout(injectMoneySection,1200);
})();