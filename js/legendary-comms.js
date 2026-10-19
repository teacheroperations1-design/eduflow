/* ================================================================
📡 Legendary Comms V1 — الموجة 3 (الإضافات الأسطورية)
• ⏰ إشعارات مجدولة: اكتب الآن → يبعت لوحده في ميعاده + طابور إرسال قابل للإلغاء
• 👀 تأكيد قراءة: تعرف الطالب وولي الأمر شافوا مستحقاتهم إمتى (أو لسه)
• 🪜 تصعيد تلقائي: يوم 3 تذكير تاني · يوم 7 مهمة عاجلة للأدمن
================================================================ */
(function(){
"use strict";
var LC=window.LG=window.LG||{};
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function saveD(d){if(DataService._saveData)DataService._saveData(d);}
function cloud(col,o){try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc(col,o.id,o);}catch(e){}}
function cur(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null);}catch(e){return null;}}
function role(){var u=cur();return u?u.role:'';}
function isStaff(){var r=role();return r==='admin'||r==='super_admin'||r==='assistant';}
function pad(n){return String(n).padStart(2,'0');}
function todayStr(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function toast(m,t){try{if(window.safeToast)window.safeToast(m,t||'info');}catch(e){}}
function tick(n,f,ms){ if(LC.tick) LC.tick(n,f,ms); else setInterval(f,ms); }
function stuName(sid){var s=DataService.getUserById?DataService.getUserById(sid):null;return (s&&s.name)||'-';}
function gName(gid){var g=(DataService.getGroups?DataService.getGroups():[]).find(function(x){return x.id===gid;});return g?g.name:'-';}

/* ========== 📨 إرسال فعلي ========== */
function targetIds(spec){
  var d=db(), out=[];
  if(spec.type==='all'){ (DataService.getStudents?DataService.getStudents():[]).forEach(function(s){out.push(s.id);}); }
  else if(spec.type==='group'){ (DataService.getStudentsByGroup?DataService.getStudentsByGroup(spec.value):[]).forEach(function(s){out.push(s.id);}); }
  else if(spec.type==='grade'){ (DataService.getStudents?DataService.getStudents():[]).forEach(function(s){ if(s.grade===spec.value) out.push(s.id); }); }
  else if(spec.type==='student'){ out.push(spec.value); }
  else if(spec.type==='parentsOfGroup'){
    var sids={}; (DataService.getStudentsByGroup?DataService.getStudentsByGroup(spec.value):[]).forEach(function(s){sids[s.id]=1;});
    (DataService.getUsers?DataService.getUsers():[]).forEach(function(u){ if(u.role==='parent'&&((u.studentIds||[]).some(function(x){return sids[x];}))) out.push(u.id); });
  }
  return out;
}
function dispatch(n){
  var ids=targetIds(n.target||{type:'all'});
  ids.slice(0,300).forEach(function(uid,i){
    try{ DataService.addNotification({targetUserId:uid,title:n.title,message:n.message,type:n.type||'general',priority:n.priority||'normal',meta:{event:n.event||'general',sched:n.id||''}}); }catch(e){}
  });
  return ids.length;
}

/* ========== ⏰ المودال الذكي (الآن أو مجدول) ========== */
LC.openSmartNotify=function(){
  if(typeof ThemeManager==='undefined'||!ThemeManager.openModal) return;
  var gs=(DataService.getGroups?DataService.getGroups():[]);
  var grades={}; (DataService.getStudents?DataService.getStudents():[]).forEach(function(s){ if(s.grade) grades[s.grade]=1; });
  var sts=(DataService.getStudents?DataService.getStudents():[]).slice(0,150);
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📢 الإشعار الذكي</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="form-group"><label>🎯 الهدف</label><select id="snType" class="form-select" onchange="LG.snTypeChanged()"><option value="all">كل الطلاب</option><option value="group">مجموعة معينة</option><option value="grade">صف معين</option><option value="student">طالب معين</option><option value="parentsOfGroup">أولياء أمور مجموعة</option></select></div>'+
  '<div class="form-group" id="snValueWrap" style="display:none;"><label>اختار</label><select id="snValue" class="form-select"></select></div>'+
  '<div class="form-group"><label>📝 العنوان *</label><input type="text" id="snTitle" class="form-input" placeholder="مثال: امتحان مفاجئ الأسبوع الجاي"></div>'+
  '<div class="form-group"><label>💬 الرسالة *</label><textarea id="snMsg" class="form-input" rows="3"></textarea></div>'+
  '<div class="form-group"><label>⚡ الأولوية</label><select id="snPrio" class="form-select"><option value="normal">عادي</option><option value="important">مهم</option><option value="urgent">عاجل (مودال فوري)</option></select></div>'+
  '<div class="form-group"><label>🕐 الإرسال</label><select id="snMode" class="form-select" onchange="document.getElementById(\'snWhenWrap\').style.display=this.value===\'schedule\'?\'\':\'none\'"><option value="now">الآن فوراً</option><option value="schedule">مجدول في ميعاد محدد</option></select></div>'+
  '<div class="form-group" id="snWhenWrap" style="display:none;"><label>📅 ميعاد الإرسال</label><input type="datetime-local" id="snWhen" class="form-input"></div>'+
  '<button class="btn btn-primary w-full" onclick="LG.submitSmartNotify()">📤 إرسال / جدولة</button></div>','modal-md');
  window.LG.snTypeChanged=function(){
    var t=(document.getElementById('snType')||{}).value;
    var wrap=document.getElementById('snValueWrap'), sel=document.getElementById('snValue');
    if(t==='all'){ wrap.style.display='none'; return; }
    wrap.style.display='';
    if(t==='group'||t==='parentsOfGroup') sel.innerHTML=gs.map(function(g){return '<option value="'+g.id+'">'+g.name+'</option>';}).join('');
    else if(t==='grade') sel.innerHTML=Object.keys(grades).map(function(g){return '<option value="'+g+'">'+g+'</option>';}).join('');
    else sel.innerHTML=sts.map(function(s){return '<option value="'+s.id+'">'+s.name+' ('+(s.code||'')+')</option>';}).join('');
  };
};
LC.submitSmartNotify=function(){
  var title=(document.getElementById('snTitle')||{}).value||'';
  var message=(document.getElementById('snMsg')||{}).value||'';
  if(!title||!message){ toast('اكتب العنوان والرسالة','error'); return; }
  var n={id:'sch_'+Date.now(),title:title,message:message,priority:(document.getElementById('snPrio')||{}).value||'normal',
    target:{type:(document.getElementById('snType')||{}).value||'all',value:(document.getElementById('snValue')||{}).value||''},
    createdBy:(cur()||{}).name||'-',createdAt:new Date().toISOString()};
  var mode=(document.getElementById('snMode')||{}).value;
  if(mode==='now'){
    var c=dispatch(n);
    toast('📤 وصل لـ '+c+' مستخدم','success');
  }else{
    var when=(document.getElementById('snWhen')||{}).value;
    if(!when){ toast('اختار ميعاد الإرسال','error'); return; }
    n.sendAt=new Date(when).toISOString(); n.status='pending';
    var d=db(); d.scheduledNotifs=d.scheduledNotifs||[]; d.scheduledNotifs.push(n); saveD(d); cloud('scheduledNotifs',n);
    toast('⏰ اتجدول الإرسال يوم '+when.replace('T',' الساعة '),'success');
  }
  ThemeManager.closeModal();
};
LC.openQueue=function(){
  if(typeof ThemeManager==='undefined') return;
  var list=(db().scheduledNotifs||[]).slice().reverse();
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">⏰ طابور الإرسال</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  (list.length?list.slice(0,40).map(function(n){
    var st=n.status==='sent'?'<span class="badge badge-success">✓ اتبعت '+String(n.sentAt||'').slice(0,16).replace('T',' ')+'</span>':(n.status==='cancelled'?'<span class="badge badge-muted">ملغي</span>':'<span class="badge badge-warning">مستني '+String(n.sendAt||'').slice(0,16).replace('T',' ')+'</span>');
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;"><strong>'+n.title+'</strong><div class="text-xs text-muted">'+(n.message||'').slice(0,60)+' · 👤 '+n.createdBy+'</div></div>'+st+
    (n.status==='pending'?'<button class="btn btn-danger btn-sm" onclick="LG.cancelScheduled(\''+n.id+'\')">✗ إلغاء</button>':'')+'</div>';
  }).join(''):'<p class="text-muted">مفيش إشعارات مجدولة</p>')+'</div>','modal-md');
};
LC.cancelScheduled=function(id){
  var d=db(); var n=(d.scheduledNotifs||[]).find(function(x){return x.id===id;});
  if(n){ n.status='cancelled'; saveD(d); cloud('scheduledNotifs',n); toast('✗ اتلغى الإرسال','info'); LC.openQueue(); }
};
/* المرسِل الذاتي — بيشتغل من أي لوحة موظف مفتوحة */
function dispatchDue(){
  if(!isStaff()) return;
  var d=db(); var now=new Date().toISOString();
  var list=(d.scheduledNotifs||[]).filter(function(x){ return x.status==='pending'&&x.sendAt&&x.sendAt<=now; });
  if(!list.length) return;
  list.forEach(function(n){ n.status='sent'; n.sentAt=now; dispatch(n); cloud('scheduledNotifs',n); });
  saveD(d);
  toast('⏰ اتبعت '+list.length+' إشعار مجدول','success');
}
tick('schedDispatch',dispatchDue,30000);

/* ========== 👀 تأكيد القراءة ========== */
function markSeen(side){
  var u=cur(); if(!u) return;
  var act=document.querySelector('.section.active'); var id=act?act.id:'';
  if(id.indexOf('payment')<0&&id.indexOf('ledger')<0&&id.indexOf('overview')<0&&id.indexOf('dashboard')<0&&id.indexOf('monthly')<0) return;
  var sids=side==='parent'?(u.studentIds||[]):[u.id];
  if(!sids.length) return;
  var d=db(), changed=false, touched=[];
  (d.payments||[]).forEach(function(p){
    if(sids.indexOf(p.studentId)<0) return;
    if(((p.amount||0)-(p.paidAmount||0))<=0) return;
    var key=side==='parent'?'parentSeenAt':'seenAt';
    if(!p[key]){ p[key]=new Date().toISOString(); changed=true; touched.push(p); }
  });
  if(changed){ saveD(d); touched.slice(0,8).forEach(function(p){cloud('payments',p);}); }
}
tick('markSeenStudent',function(){ if(role()==='student') markSeen('student'); },15000);
tick('markSeenParent',function(){ if(role()==='parent') markSeen('parent'); },15000);

function daysOverdue(p){
  try{
    var close=null;
    if(p.legacy){ close=String(p.createdAt||'').slice(0,10); }
    else{
      var g=(DataService.getGroups?DataService.getGroups():[]).find(function(x){return x.id===p.groupId;});
      var rs=(g&&g.cycleRanges)||[]; var n=parseInt(String(p.month||'').replace('cycle-',''))||0;
      rs.forEach(function(r){ if(r.n===n&&r.to) close=r.to; });
      if(!close) return 0; /* الدورة لسه مفتوحة = مستحق مش متأخر */
    }
    if(!close) return 0;
    return Math.floor((new Date(todayStr())-new Date(close))/86400000);
  }catch(e){ return 0; }
}

/* ========== 🪜 التصعيد التلقائي ========== */
function escalate(){
  if(!isStaff()) return;
  var d=db(), changed=false;
  (d.payments||[]).forEach(function(p){
    var rem=(p.amount||0)-(p.paidAmount||0); if(rem<=0) return;
    var days=daysOverdue(p); if(days<=0) return;
    if(days>=3&&!p.esc1){
      p.esc1=todayStr(); changed=true;
      var msg='⏰ تذكير تاني: متبقي '+rem+' ج.م على مجموعة '+gName(p.groupId)+' — متأخر '+days+' يوم. جزاكم الله خيراً 🌹';
      try{ DataService.addNotification({targetUserId:p.studentId,title:'⏰ تذكير تاني بالشهرية',message:msg,type:'payment',priority:'important',meta:{event:'due_now'}}); }catch(e){}
      var s=DataService.getUserById?DataService.getUserById(p.studentId):null;
      var pp=String((s&&s.parentPhone)||'').replace(/\D/g,'');
      (DataService.getUsers?DataService.getUsers():[]).forEach(function(u2){
        if(u2.role!=='parent') return;
        var up=String(u2.phone||'').replace(/\D/g,'');
        if((u2.studentIds||[]).indexOf(p.studentId)>=0||(pp&&up&&up===pp)){ try{ DataService.addNotification({targetUserId:u2.id,title:'⏰ تذكير تاني بالشهرية',message:msg+' (الطالب: '+stuName(p.studentId)+')',type:'payment',priority:'important',meta:{event:'due_now'}}); }catch(e){} }
      });
    }
    if(days>=7&&!p.esc2){
      p.esc2=todayStr(); changed=true;
      d.followups=d.followups||[];
      d.followups.push({id:'fu_'+Date.now()+'_'+p.id,type:'payment',priority:'urgent',status:'open',studentId:p.studentId,groupId:p.groupId,title:'🚨 تصعيد متأخرات: '+stuName(p.studentId),note:'متبقي '+rem+' ج.م — متأخر '+days+' يوم وبعد تذكيرين بدون سداد',createdAt:new Date().toISOString()});
    }
  });
  if(changed){ saveD(d); try{localStorage.setItem('eduflowLedgerPing',String(Date.now()));}catch(e){} }
}
tick('escalate',escalate,120000);

/* ========== 📊 تقرير المشاهدة والمتأخرات ========== */
LC.openSeenReport=function(){
  if(typeof ThemeManager==='undefined') return;
  var d=db(), rows=[];
  (d.payments||[]).forEach(function(p){
    var rem=(p.amount||0)-(p.paidAmount||0); if(rem<=0) return;
    var days=daysOverdue(p);
    rows.push({p:p,rem:rem,days:days});
  });
  rows.sort(function(a,b){ return b.days-a.days; });
  var html='<div class="filter-info">👀 مين شاف مستحقاته؟ — التقرير بيتحدث أول ما الطالب أو ولي الأمر يفتح صفحة المدفوعات</div>'+
  '<div style="max-height:55vh;overflow:auto;">'+(rows.length?rows.map(function(r){
    var p=r.p;
    var stChip=r.days>=7?'<span class="badge badge-danger">🚨 تصعيد أدمن</span>':(r.days>=3?'<span class="badge badge-warning">⏰ تذكير تاني اتبعت</span>':(r.days>0?'<span class="badge badge-info">متأخر '+r.days+' يوم</span>':'<span class="badge badge-success">مستحق حالياً</span>'));
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;"><strong>'+stuName(p.studentId)+'</strong> '+stChip+
    '<div class="text-xs text-muted">'+gName(p.groupId)+' · متبقي '+r.rem+' ج.م</div>'+
    '<div class="text-xs" style="margin-top:4px;">🎓 الطالب: '+(p.seenAt?('✅ شافها '+String(p.seenAt).slice(5,16).replace('T',' ')):'❌ لسه مش شايف')+' · 👨‍👩‍👦 ولي الأمر: '+(p.parentSeenAt?('✅ شافها '+String(p.parentSeenAt).slice(5,16).replace('T',' ')):'❌ لسه مش شايف')+'</div></div></div>';
  }).join(''):'<p class="text-muted">🎉 مفيش مستحقات مفتوحة</p>')+'</div>';
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">👀 تقرير مشاهدة المستحقات</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+html+'</div>','modal-md');
};

/* ========== 🧩 واجهات الحقن ========== */
function injectCommsCard(){
  if(!isStaff()) return;
  if(document.getElementById('lgCommsCard')) return;
  var host=document.querySelector('#section-tower .section-header')||document.querySelector('#section-command .section-header');
  if(!host) return;
  var div=document.createElement('div'); div.id='lgCommsCard'; div.className='card';
  div.style.cssText='margin:0 0 14px;padding:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-color:var(--primary-border);';
  div.innerHTML='<strong style="font-size:13px;">📡 مركز التواصل الذكي</strong>'+
  '<button class="btn btn-primary btn-sm" onclick="LG.openSmartNotify()">📢 إشعار الآن/مجدول</button>'+
  '<button class="btn btn-secondary btn-sm" onclick="LG.openQueue()">⏰ طابور الإرسال</button>'+
  '<button class="btn btn-warning btn-sm" onclick="LG.openSeenReport()">👀 مين شاف المستحقات</button>';
  host.parentNode.insertBefore(div,host.nextSibling);
}
tick('commsCard',injectCommsCard,3000);
/* زرار التقرير جوّه تولبار الدفتر */
tick('ledgerSeenBtn',function(){
  if(!(window.LedgerUI&&LedgerUI.refresh)) return;
  if(LedgerUI.__lcWrapped) return;
  LedgerUI.__lcWrapped=1;
  var or=LedgerUI.refresh;
  LedgerUI.refresh=function(){ var r=or.apply(this,arguments);
    setTimeout(function(){ try{
      var tb=document.querySelector('.ldg-toolbar');
      if(tb&&!document.getElementById('lgSeenBtn')){
        var b=document.createElement('button'); b.id='lgSeenBtn'; b.type='button'; b.className='btn btn-warning btn-sm'; b.textContent='👀 تقرير المشاهدة';
        b.onclick=function(){ LC.openSeenReport(); }; tb.appendChild(b);
      }
    }catch(e){} },80);
    return r; };
},2000);
})();