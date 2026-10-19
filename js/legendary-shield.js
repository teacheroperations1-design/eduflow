/* ================================================================
🛡 Legendary Shield V1 — الموجة 4 والأخيرة (الإضافات الأسطورية)
• 💾 مركز النسخ: Snapshots تلقائية (كل 10 دقايق قبل أي حفظ) + يدوية + معاينة الفروق + استعادة آمنة + تصدير/استيراد JSON + مزامنة شاملة
• 🔑 PIN Guard: حماية العمليات الحساسة برقم سري + فتح جلسة 30 دقيقة + قفل فوري + قائمة عمليات قابلة للتعديل
• 🧮 مصفوفة الصلاحيات: دور × عملية + إخفاء تلقائي للأزرار غير المسموحة لكل دور
================================================================ */
(function(){
"use strict";
var SH=window.LG=window.LG||{};
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function saveD(d){if(DataService._saveData)DataService._saveData(d);}
function cloudMeta(o){try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc('meta','security',o);}catch(e){}}
function cur(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null);}catch(e){return null;}}
function role(){var u=cur();return u?u.role:'';}
function toast(m,t){try{if(window.safeToast)window.safeToast(m,t||'info');}catch(e){}}
function tick(n,f,ms){ if(SH.tick) SH.tick(n,f,ms); else setInterval(f,ms); }
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;');}
function fmtTime(iso){ try{ return new Date(iso).toLocaleString('ar-EG',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }catch(e){ return String(iso); } }
function kb(n){ return Math.round(n/1024)+'KB'; }
function modal(title,html){ if(typeof ThemeManager==='undefined'||!ThemeManager.openModal) return; ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">'+title+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+html+'</div>','modal-lg'); }

/* ========== 💾 النسخ الاحتياطية ========== */
var SKEY='eduflow_snapshots', MAXSNAP=6, MAXBYTES=800000, AUTO_EVERY=10*60*1000;
function snLoad(){ try{ return JSON.parse(localStorage.getItem(SKEY)||'[]'); }catch(e){ return []; } }
function snSave(list){
  try{ localStorage.setItem(SKEY,JSON.stringify(list)); return true; }catch(e){
    while(list.length){ list.shift(); try{ localStorage.setItem(SKEY,JSON.stringify(list)); return true; }catch(e2){} }
    return false;
  }
}
function pushSnap(label,data,force){
  try{
    var json=JSON.stringify(data);
    if(json.length>MAXBYTES){ toast('⚠️ حجم البيانات ('+kb(json.length)+') أكبر من حد النسخ — صدّر JSON يدوياً','warning'); return null; }
    var list=snLoad();
    if(!force){
      var lastAuto=null;
      for(var i=list.length-1;i>=0;i--){ if(String(list[i].label).indexOf('auto')===0){ lastAuto=list[i]; break; } }
      if(lastAuto && Date.now()-new Date(lastAuto.at).getTime()<AUTO_EVERY) return null;
    }
    list.push({id:'sn_'+Date.now()+(force?'_m':'_a'),label:label,at:new Date().toISOString(),size:json.length,data:data});
    while(list.length>MAXSNAP) list.shift();
    if(!snSave(list)) return null;
    return list[list.length-1];
  }catch(e){ return null; }
}
SH.installSnapshots=function(){
  if(!window.DataService||typeof DataService._saveData!=='function'||DataService.__lgSnap) return;
  DataService.__lgSnap=1;
  var orig=DataService._saveData;
  DataService._saveData=function(newData){
    try{ var before=DataService._getData?DataService._getData():null; if(before) pushSnap('auto '+new Date().toLocaleTimeString('ar-EG'),before,false); }catch(e){}
    return orig.apply(this,arguments);
  };
};
SH.takeSnap=function(label){
  var s=pushSnap('📸 '+(label||'يدوية'),db(),true);
  toast(s?('💾 نسخة "'+s.label+'" اتحفظت ('+kb(s.size)+')'):'⚠️ مقدرش يحفظ النسخة','success');
  return s;
};
SH.deleteSnap=function(id){
  var list=snLoad().filter(function(x){return x.id!==id;});
  snSave(list); toast('🗑 النسخة اتحذفت','info'); SH.openBackupCenter();
};
SH.exportSnap=function(id){
  var s=snLoad().find(function(x){return x.id===id;}); if(!s) return;
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(s)],{type:'application/json'}));
  a.download='eduflow-snapshot-'+s.id+'.json'; a.click();
};
SH.importSnap=function(inp){
  var f=inp.files&&inp.files[0]; if(!f) return;
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var obj=JSON.parse(rd.result);
      var data=obj.data||obj;
      if(!data||typeof data!=='object') throw new Error('bad');
      pushSnap('📥 مستورد: '+f.name,data,true);
      toast('📥 النسخة اتحفظت في القائمة','success');
      if(confirm('تطبيق النسخة المستوردة الآن؟')){ var list=snLoad(); SH.restoreSnap(list[list.length-1].id); }
      else SH.openBackupCenter();
    }catch(e){ toast('ملف مش صالح','error'); }
  };
  rd.readAsText(f);
};
function idOf(r){ return r&&r.id?r.id:null; }
function diffDB(a,b){
  var keys={},k; for(k in a) keys[k]=1; for(k in b) keys[k]=1;
  var out=[];
  Object.keys(keys).forEach(function(key){
    var A=a[key],B=b[key];
    if(Object.prototype.toString.call(A)==='[object Array]'&&Object.prototype.toString.call(B)==='[object Array]'){
      var ma={},mb={};
      A.forEach(function(r){var i=idOf(r); if(i)ma[i]=r;});
      B.forEach(function(r){var i=idOf(r); if(i)mb[i]=r;});
      var added=0,removed=0,changed=0,samples=[];
      Object.keys(mb).forEach(function(i){
        if(!ma[i]){ added++; if(samples.length<3)samples.push('＋ '+i); }
        else if(JSON.stringify(ma[i])!==JSON.stringify(mb[i])){ changed++; if(samples.length<3)samples.push('～ '+i); }
      });
      Object.keys(ma).forEach(function(i){ if(!mb[i]){ removed++; if(samples.length<3)samples.push('− '+i); } });
      if(added||removed||changed) out.push({key:key,added:added,removed:removed,changed:changed,samples:samples});
    } else if(JSON.stringify(A)!==JSON.stringify(B)){ out.push({key:key,added:0,removed:0,changed:1,samples:['～ '+key]}); }
  });
  return out;
}
SH.openBackupCenter=function(){
  if(!SH.can('restore_backups')){ toast('🧮 مش مسموح لدورك بالنسخ الاحتياطية','error'); return; }
  var list=snLoad().slice().reverse();
  var curSize=JSON.stringify(db()).length;
  var html='<div class="filter-info">💾 حجم القاعدة الآن: <strong>'+kb(curSize)+'</strong> · المحفوظ: '+list.length+'/'+MAXSNAP+' · نسخة تلقائية كل 10 دقايق قبل أي حفظ</div>'+
  '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">'+
  '<button class="btn btn-primary btn-sm" onclick="LG.takeSnap(prompt(\'اسم النسخة (اختياري):\')||\'يدوية\');LG.openBackupCenter();">📸 نسخة الآن</button>'+
  '<button class="btn btn-secondary btn-sm" onclick="LG.syncAll()">☁️ مزامنة شاملة للسحابة</button>'+
  '<label class="btn btn-ghost btn-sm" style="cursor:pointer;">📥 استيراد JSON<input type="file" accept=".json" style="display:none;" onchange="LG.importSnap(this)"></label></div>'+
  '<div style="max-height:46vh;overflow:auto;">'+(list.length?list.map(function(s){
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;"><strong>'+esc(s.label)+'</strong><div class="text-xs text-muted">🕐 '+fmtTime(s.at)+' · 💾 '+kb(s.size)+'</div></div>'+
    '<button class="btn btn-secondary btn-sm" onclick="LG.previewSnap(\''+s.id+'\')">🔍 الفروق</button>'+
    '<button class="btn btn-warning btn-sm" onclick="LG.restoreSnap(\''+s.id+'\')">♻️ استعادة</button>'+
    '<button class="btn btn-ghost btn-sm" onclick="LG.exportSnap(\''+s.id+'\')">⬇️</button>'+
    '<button class="btn btn-danger btn-sm" onclick="LG.deleteSnap(\''+s.id+'\')">🗑</button></div>';
  }).join(''):'<p class="text-muted">مفيش نسخ لسه — أول حفظ هيعمل نسخة تلقائية لوحده</p>')+'</div>';
  modal('💾 مركز النسخ الاحتياطية',html);
};
SH.previewSnap=function(id){
  var s=snLoad().find(function(x){return x.id===id;}); if(!s) return;
  var diff=diffDB(s.data,db());
  var html='<div class="filter-info">🔍 نسخة "'+esc(s.label)+'" ('+fmtTime(s.at)+') مقابل الوضع الحالي</div>'+
  (diff.length?'<div style="overflow:auto;"><table class="table" style="min-width:480px;"><thead><tr><th>الجدول</th><th>＋ مضاف</th><th>− محذوف</th><th>～ متغير</th><th>أمثلة</th></tr></thead><tbody>'+
    diff.map(function(r){return '<tr><td>'+esc(r.key)+'</td><td>'+r.added+'</td><td>'+r.removed+'</td><td>'+r.changed+'</td><td class="text-xs text-muted">'+esc((r.samples||[]).join('، '))+'</td></tr>';}).join('')+
    '</tbody></table></div>':'<p class="text-muted">✅ مفيش فرق — النسخة مطابقة للوضع الحالي</p>')+
  '<button class="btn btn-warning w-full" style="margin-top:10px;" onclick="LG.restoreSnap(\''+id+'\')">♻️ استعادة النسخة دي</button>';
  modal('🔍 معاينة الفروق',html);
};
SH.restoreSnap=function(id){
  if(!SH.can('restore_backups')){ toast('🧮 مش مسموح لدورك بالاستعادة','error'); return; }
  var s=snLoad().find(function(x){return x.id===id;}); if(!s) return;
  SH.requirePin('♻️ استعادة نسخة احتياطية',function(){
    if(!confirm('استعادة نسخة "'+s.label+'"؟\nالوضع الحالي هيتحفظ كنسخة احتياطية قبل الاستعادة (تقدر ترجعله تاني).')) return;
    pushSnap('قبل الاستعادة',db(),true);
    saveD(s.data);
    toast('♻️ تمت الاستعادة — بيتم التحديث...','success');
    setTimeout(function(){ location.reload(); },900);
  });
};
SH.syncAll=function(){
  if(!(window.FirebaseService&&FirebaseService._db)){ toast('مفيش اتصال سحابي','error'); return; }
  var cols=['students','groups','teachers','centers','payments','enrollments','checkIns','expenses','scheduledNotifs'];
  var d=db(), total=0;
  cols.forEach(function(c){
    (d[c]||[]).slice(0,600).forEach(function(r){ if(r&&r.id){ try{ FirebaseService.saveDoc(c,r.id,r); total++; }catch(e){} } });
  });
  toast('☁️ اتبعت '+total+' سجل للسحابة','success');
};

/* ========== 🔑 PIN Guard ========== */
function sec(){ var d=db(); if(!d.security) d.security={}; return d.security; }
function hash(s){ var h=5381; for(var i=0;i<s.length;i++){ h=((h<<5)+h+s.charCodeAt(i))|0; } return String(h); }
SH.hasPin=function(){ return !!sec().pinHash; };
SH.setPin=function(pin){ var d=db(); d.security=sec(); d.security.pinHash=hash(pin); d.security.pinSetAt=new Date().toISOString(); saveD(d); cloudMeta(d.security); toast('🔑 الـ PIN اتحفظ','success'); };
function unlocked(){ try{ var u=JSON.parse(sessionStorage.getItem('eduflow_pin_unlocked')||'null'); return u&&u.exp>Date.now(); }catch(e){ return false; } }
SH.lockNow=function(){ try{ sessionStorage.removeItem('eduflow_pin_unlocked'); }catch(e){} toast('🔒 العمليات الحساسة اتقفلت','info'); };
SH.requirePin=function(label,onOk){
  if(!SH.hasPin()){ SH.openSetPin(function(){ SH.requirePin(label,onOk); }); return; }
  if(unlocked()){ onOk(); return; }
  modal('🔑 عملية حساسة','<div class="filter-info">'+esc(label)+'</div>'+
  '<div class="form-group"><label>أدخل الـ PIN</label><input id="pinAsk" type="password" inputmode="numeric" class="form-input" maxlength="6" onkeydown="if(event.key===\'Enter\')LG.confirmPin()"></div>'+
  '<button class="btn btn-primary w-full" onclick="LG.confirmPin()">🔓 فتح</button>'+
  '<label class="switch-label" style="margin-top:10px;"><input type="checkbox" class="switch-input" id="pinRemember" checked><span class="switch"></span><span>فضلها مفتوحة 30 دقيقة</span></label>');
  SH.__pinOk=onOk;
  setTimeout(function(){ var i=document.getElementById('pinAsk'); if(i) i.focus(); },120);
};
SH.confirmPin=function(){
  var v=(document.getElementById('pinAsk')||{}).value||'';
  if(hash(v)!==sec().pinHash){ toast('❌ PIN غلط','error'); return; }
  var rem=(document.getElementById('pinRemember')||{}).checked;
  if(rem){ try{ sessionStorage.setItem('eduflow_pin_unlocked',JSON.stringify({exp:Date.now()+30*60*1000})); }catch(e){} }
  ThemeManager.closeModal();
  var f=SH.__pinOk; SH.__pinOk=null; if(f) f();
};
SH.openSetPin=function(after){
  modal('🔑 إنشاء/تغيير PIN','<div class="form-group"><label>رقم سري 4-6 أرقام</label><input id="pin1" type="password" inputmode="numeric" class="form-input" maxlength="6"></div>'+
  '<div class="form-group"><label>تأكيد الرقم</label><input id="pin2" type="password" inputmode="numeric" class="form-input" maxlength="6"></div>'+
  '<button class="btn btn-primary w-full" onclick="LG.confirmSetPin()">💾 حفظ PIN</button>');
  SH.__pinAfter=after||null;
};
SH.confirmSetPin=function(){
  var a=(document.getElementById('pin1')||{}).value||'', b=(document.getElementById('pin2')||{}).value||'';
  if(!/^\d{4,6}$/.test(a)){ toast('PIN لازم 4-6 أرقام','error'); return; }
  if(a!==b){ toast('التأكيد مش مطابق','error'); return; }
  SH.setPin(a); ThemeManager.closeModal();
  var f=SH.__pinAfter; SH.__pinAfter=null; if(f) f();
};
var PIN_TARGETS=['deleteCenter','deleteGroup','deleteStudent','deleteUser','delExpense','LG.saveCfg','openResetOptionsFor'];
function resolveFn(path){ var p=path.split('.'), o=window; for(var i=0;i<p.length-1;i++){ o=o[p[i]]; if(!o) return null; } if(typeof o[p[p.length-1]]!=='function') return null; return {o:o,k:p[p.length-1]}; }
function wrapPins(){
  PIN_TARGETS.forEach(function(path){
    var r=resolveFn(path); if(!r||r.o[r.k].__lgPin) return;
    var orig=r.o[r.k];
    var w=function(){
      var args=arguments, self=this;
      var req=sec().requiredFor||PIN_TARGETS;
      if(req.indexOf(path)<0) return orig.apply(self,args);
      SH.requirePin('🔐 عملية حساسة: '+path,function(){ try{ orig.apply(self,args); }catch(e){ console.error(e); } });
    };
    w.__lgPin=1; r.o[r.k]=w;
  });
}
SH.savePinReqs=function(){
  var out=[];
  document.querySelectorAll('.lgPinReq').forEach(function(c){ if(c.checked) out.push(c.getAttribute('data-p')); });
  var d=db(); d.security=sec(); d.security.requiredFor=out; saveD(d); cloudMeta(d.security);
  toast('🔐 قائمة العمليات المحمية اتحدثت','success');
};

/* ========== 🧮 مصفوفة الصلاحيات ========== */
var ROLES=['super_admin','admin','assistant','teacher','student','parent'];
var RLBL={super_admin:'سوبر',admin:'أدمن',assistant:'مساعد',teacher:'أستاذ',student:'طالب',parent:'ولي أمر'};
var ACTIONS=[
  {id:'delete_records',l:'🗑 حذف سجلات (سنتر/طالب/مجموعة)'},
  {id:'collect_money',l:'💵 تحصيل فلوس'},
  {id:'view_treasury',l:'🏦 الخزينة والتقارير المالية'},
  {id:'edit_money_cfg',l:'⚙️ إعدادات المال والنِسَب'},
  {id:'manage_centers',l:'🏢 إضافة/تعديل سناتر'},
  {id:'manage_groups',l:'👥 إدارة المجموعات'},
  {id:'send_notifications',l:'📢 إرسال إشعارات'},
  {id:'restore_backups',l:'💾 النسخ الاحتياطية والاستعادة'},
  {id:'edit_perms',l:'🧮 تعديل مصفوفة الصلاحيات'}
];
var DEFAULT={
  delete_records:['admin'],
  collect_money:['admin','assistant'],
  view_treasury:['admin','assistant'],
  edit_money_cfg:['admin'],
  manage_centers:['admin'],
  manage_groups:['admin','assistant'],
  send_notifications:['admin','assistant','teacher'],
  restore_backups:['admin'],
  edit_perms:[]
};
SH.perms=function(){ return sec().perms||DEFAULT; };
SH.can=function(action){
  var r=role();
  if(r==='super_admin') return true;
  var list=SH.perms()[action]||DEFAULT[action]||[];
  return list.indexOf(r)>=0;
};
SH.openPerms=function(){
  var m=SH.perms(), editable=SH.can('edit_perms');
  var roles=ROLES.filter(function(r){return r!=='super_admin'&&r!=='student'&&r!=='parent';});
  var html='<div class="filter-info">🧮 super_admin ليه كل حاجة دائماً · الطالب وولي الأمر بره الجدول ده</div>'+
  '<div style="overflow:auto;"><table class="table" style="min-width:520px;"><thead><tr><th>العملية</th>'+roles.map(function(r){return '<th style="text-align:center;">'+RLBL[r]+'</th>';}).join('')+'</tr></thead><tbody>'+
  ACTIONS.map(function(a){
    return '<tr><td>'+a.l+'</td>'+roles.map(function(r){
      var on=(m[a.id]||DEFAULT[a.id]||[]).indexOf(r)>=0;
      return '<td style="text-align:center;"><input type="checkbox" '+(editable?'':'disabled ')+'class="lgPermChk" data-a="'+a.id+'" data-r="'+r+'" '+(on?'checked':'')+'></td>';
    }).join('')+'</tr>';
  }).join('')+'</tbody></table></div>'+
  (editable?'<button class="btn btn-primary w-full" style="margin-top:10px;" onclick="LG.savePerms()">💾 حفظ المصفوفة</button>':'<p class="text-muted">عرض فقط — الأدمن بس يقدر يعدل</p>');
  modal('🧮 مصفوفة الصلاحيات',html);
};
SH.savePerms=function(){
  var out={}; ACTIONS.forEach(function(a){ out[a.id]=[]; });
  document.querySelectorAll('.lgPermChk').forEach(function(c){ if(c.checked) out[c.getAttribute('data-a')].push(c.getAttribute('data-r')); });
  var d=db(); d.security=sec(); d.security.perms=out; saveD(d); cloudMeta(d.security);
  toast('🧮 المصفوفة اتحفظت — الأزرار هتتخفى فوراً','success');
  SH.openPerms();
};
var PERM_SCAN=[
  {a:'delete_records',re:/deleteCenter\(|deleteGroup\(|deleteStudent\(|deleteUser\(/},
  {a:'collect_money',re:/LedgerUI\.payModal|payModal\(/},
  {a:'view_treasury',re:/openMoneyCenter\(|openTreasury\(|lgMoneyFab/},
  {a:'edit_money_cfg',re:/openMoneyCfg\(/},
  {a:'manage_centers',re:/openCenterModal\(/},
  {a:'send_notifications',re:/openSmartNotify\(/},
  {a:'restore_backups',re:/openBackupCenter\(/}
];
function permScan(){
  if(role()==='super_admin') return;
  document.querySelectorAll('button[onclick],a[onclick],button[id]').forEach(function(el){
    if(el.dataset&&el.dataset.lgPerm) return;
    var src=(el.getAttribute('onclick')||'')+' '+(el.id||'');
    for(var i=0;i<PERM_SCAN.length;i++){
      if(PERM_SCAN[i].re.test(src)){
        if(el.dataset) el.dataset.lgPerm='1';
        if(!SH.can(PERM_SCAN[i].a)){ el.style.display='none'; el.title='🧮 مش مسموح لدورك'; }
        break;
      }
    }
  });
}
tick('permScan',permScan,3500);

/* ========== 🛡 مركز الأمان (واجهة موحدة) ========== */
SH.openShieldCenter=function(){
  var s=sec();
  modal('🛡 مركز الأمان','<div class="stat-mini" style="margin-bottom:12px;">'+
  '<div class="stat-mini-box"><div class="stat-mini-value">'+snLoad().length+'</div><div class="stat-mini-label">نسخ محفوظة</div></div>'+
  '<div class="stat-mini-box"><div class="stat-mini-value">'+(SH.hasPin()?'✅':'❌')+'</div><div class="stat-mini-label">PIN مفعل</div></div>'+
  '<div class="stat-mini-box"><div class="stat-mini-value" style="font-size:14px;">'+esc(RLBL[role()]||role())+'</div><div class="stat-mini-label">دورك</div></div></div>'+
  '<div style="display:flex;gap:8px;flex-wrap:wrap;">'+
  '<button class="btn btn-primary btn-sm" onclick="LG.openBackupCenter()">💾 النسخ الاحتياطية</button>'+
  '<button class="btn btn-secondary btn-sm" onclick="LG.openSetPin()">'+(SH.hasPin()?'🔑 تغيير PIN':'🔑 إنشاء PIN')+'</button>'+
  '<button class="btn btn-warning btn-sm" onclick="LG.lockNow();ThemeManager.closeModal();">🔒 قفل الآن</button>'+
  '<button class="btn btn-success btn-sm" onclick="LG.openPerms()">🧮 الصلاحيات</button></div>'+
  '<div class="form-group" style="margin-top:14px;"><label>🔐 عمليات محمية بالـ PIN</label>'+
  PIN_TARGETS.map(function(p){ var on=(s.requiredFor||PIN_TARGETS).indexOf(p)>=0;
    return '<label class="switch-label"><input type="checkbox" class="switch-input lgPinReq" data-p="'+p+'" '+(on?'checked':'')+'><span class="switch"></span><span class="text-xs">'+p+'</span></label>'; }).join('')+
  '<button class="btn btn-secondary btn-sm" onclick="LG.savePinReqs()">💾 حفظ القائمة</button></div>');
};
function injectShieldCard(){
  var r=role();
  if(!(r==='admin'||r==='super_admin'||r==='assistant')) return;
  if(document.getElementById('lgShieldCard')) return;
  var host=document.querySelector('#section-tower .section-header')||document.querySelector('#section-command .section-header');
  if(!host) return;
  var div=document.createElement('div'); div.id='lgShieldCard'; div.className='card';
  div.style.cssText='margin:0 0 14px;padding:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;';
  div.innerHTML='<strong style="font-size:13px;">🛡 مركز الأمان</strong><button class="btn btn-danger btn-sm" onclick="LG.openShieldCenter()">فتح المركز</button>';
  host.parentNode.insertBefore(div,host.nextSibling);
}
tick('shieldCard',injectShieldCard,3000);

/* ========== 🚀 إقلاع ========== */
function boot(){ SH.installSnapshots(); wrapPins(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
tick('pinWrap',wrapPins,4000);
})();