/* ================================================================
🏢 Legendary Center V1 — مدير السنتر (Center Manager)
• نطاق المنصة: زي المساعد بس على مجموعات سنتره (بيتماشى معاك في الداتا)
• العالم الافتراضي: أساتذة/مجموعات/طلاب/تحصيل/حضور محليين — معزولين تماماً
• ترشيح أستاذ محلي للمنصة + الترقية للأدمن فقط + سجل حركة كامل
================================================================ */
(function(){
"use strict";
var CM=window.CM=window.CM||{};
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function saveD(d){if(DataService._saveData)DataService._saveData(d);}
function cloud(c,o){try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc(c,o.id,o);}catch(e){}}
function cur(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null);}catch(e){return null;}}
function role(){var u=cur();return u?u.role:'';}
function toast(m,t){try{if(window.safeToast)window.safeToast(m,t||'info');}catch(e){}}
function escS(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
CM.escS=escS;
function pad(n){return String(n).padStart(2,'0');}
function monthNow(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1);}
function todayStr(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
CM.todayStr=todayStr; CM.monthNow=monthNow;

CM.myCenterId=function(){var u=cur();return (u&&u.centerId)||null;};
CM.myCenter=function(){var d=db();return (d.centers||[]).find(function(c){return c.id===CM.myCenterId();})||null;};
CM.centerGroups=function(){var c=CM.myCenter();if(!c)return [];return (DataService.getGroups?DataService.getGroups():[]).filter(function(g){return g.center===c.name;});};
CM.SBX=function(){
  var d=db(); d.centerLocal=d.centerLocal||{};
  var cid=CM.myCenterId()||'none';
  if(!d.centerLocal[cid]) d.centerLocal[cid]={teachers:[],groups:[],students:[],payments:[],attendance:[],tasks:[],notes:[],activity:[],nominations:[]};
  return d.centerLocal[cid];
};
CM.logAct=function(action,details){var s=CM.SBX();s.activity=s.activity||[];s.activity.push({id:'act_'+Date.now()+Math.random().toString(36).slice(2,5),at:new Date().toISOString(),by:(cur()||{}).name||'?',action:action,details:details||''});if(s.activity.length>400)s.activity=s.activity.slice(-300);};
CM.createUser=function(u){var d=db();d.users=d.users||[];u.id=u.id||('u_'+Date.now()+Math.random().toString(36).slice(2,6));d.users.push(u);saveD(d);cloud('users',u);return u;};
CM.notifyAdmins=function(title,msg){(db().users||[]).forEach(function(a){if(a.role==='admin'||a.role==='super_admin'){try{DataService.addNotification({targetUserId:a.id,title:title,message:msg,type:'general',priority:'important',meta:{event:'general'}});}catch(e){}}});};

/* 🔗 نطاق المنصة لمدير السنتر = مجموعات سنتره */
function wrapScope(){
  if(!window.Ops||Ops.__cmWrap)return;
  Ops.__cmWrap=1;
  var og=Ops.groupsInScope;
  if(typeof og==='function'){
    Ops.groupsInScope=function(uid){
      var u=DataService.getUserById?DataService.getUserById(uid):null;
      if(u&&u.role==='center')return CM.centerGroups();
      return og.apply(this,arguments);
    };
  }
}

/* ========== 🌐 العالم الافتراضي (Sandbox) ========== */
CM.addLocalTeacher=function(data){var s=CM.SBX();var t={id:'lt_'+Date.now(),name:data.name||'',subject:data.subject||'',phone:data.phone||'',notes:data.notes||'',addedAt:new Date().toISOString()};s.teachers.push(t);CM.logAct('إضافة أستاذ محلي',t.name);saveD(db());toast('✅ اتضاف في عالمك بس — مش في بيانات المنصة','success');return t;};
CM.updateLocalTeacher=function(id,data){var s=CM.SBX();var t=(s.teachers||[]).find(function(x){return x.id===id;});if(!t)return;Object.keys(data).forEach(function(k){t[k]=data[k];});CM.logAct('تعديل أستاذ محلي',t.name);saveD(db());toast('✅ تم الحفظ','success');};
CM.deleteLocalTeacher=function(id){var s=CM.SBX();var t=(s.teachers||[]).find(function(x){return x.id===id;});s.teachers=(s.teachers||[]).filter(function(x){return x.id!==id;});s.groups=(s.groups||[]).filter(function(g){return g.teacherId!==id;});CM.logAct('حذف أستاذ محلي',t?t.name:id);saveD(db());toast('🗑 اتحذف من عالمك','info');};
CM.addLocalGroup=function(data){var s=CM.SBX();var g={id:'lg_'+Date.now(),teacherId:data.teacherId,name:data.name||'',fee:+data.fee||0,day:data.day||'',time:data.time||''};s.groups.push(g);CM.logAct('إضافة مجموعة محلية',g.name);saveD(db());return g;};
CM.deleteLocalGroup=function(id){var s=CM.SBX();s.groups=(s.groups||[]).filter(function(g){return g.id!==id;});(s.students||[]).forEach(function(st){st.groupIds=(st.groupIds||[]).filter(function(x){return x!==id;});});CM.logAct('حذف مجموعة محلية',id);saveD(db());};
CM.addLocalStudent=function(data){var s=CM.SBX();var st={id:'ls_'+Date.now(),name:data.name||'',phone:data.phone||'',stage:data.stage||'',grade:data.grade||'',groupIds:data.groupIds||[],addedAt:new Date().toISOString()};s.students.push(st);CM.logAct('إضافة طالب محلي',st.name);saveD(db());return st;};
CM.deleteLocalStudent=function(id){var s=CM.SBX();var st=(s.students||[]).find(function(x){return x.id===id;});s.students=(s.students||[]).filter(function(x){return x.id!==id;});CM.logAct('حذف طالب محلي',st?st.name:id);saveD(db());};
CM.recordLocalPayment=function(studentId,groupId,amount,month){var s=CM.SBX();var p={id:'lp_'+Date.now(),studentId:studentId,groupId:groupId,amount:+amount||0,month:month||monthNow(),date:todayStr(),by:(cur()||{}).name||'?'};s.payments.push(p);CM.logAct('تحصيل محلي',p.amount+' ج.م');saveD(db());toast('💰 اتحصل واتسجل في عالمك بس','success');return p;};
CM.recordLocalAttendance=function(groupId,date,marks){var s=CM.SBX();s.attendance=(s.attendance||[]).filter(function(a){return !(a.groupId===groupId&&a.date===date);});s.attendance.push({id:'la_'+groupId+'_'+date,groupId:groupId,date:date,marks:marks||{}});CM.logAct('رصد حضور محلي',date);saveD(db());toast('📋 الحضور اتحفظ','success');};
CM.nominateTeacher=function(ltId){var s=CM.SBX();var t=(s.teachers||[]).find(function(x){return x.id===ltId;});if(!t)return;s.nominations=s.nominations||[];s.nominations.push({id:'nom_'+Date.now(),localTeacherId:ltId,name:t.name,subject:t.subject,phone:t.phone,status:'pending',at:new Date().toISOString()});CM.logAct('ترشيح أستاذ للمنصة',t.name);saveD(db());CM.notifyAdmins('🚀 ترشيح انضمام للمنصة',t.name+' — سنتر '+((CM.myCenter()||{}).name||'')+' — في انتظار ترقيتك');toast('🚀 الترشيح اتبعت للأدمن','success');};

/* ========== 🛠️ أدوات الأدمن: حساب المدير + التفاصيل + الترقية ========== */
CM.openManagerAccount=function(centerId){
  if(role()!=='admin'&&role()!=='super_admin'){toast('🔐 للأدمن بس','error');return;}
  var d=db();var c=ensureCenterDoc(centerId);if(!c)return;
  var mgr=c.managerId?(DataService.getUserById?DataService.getUserById(c.managerId):null):null;
  if(mgr){
    ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">👤 مدير السنتر</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
    '<div class="filter-info">🏢 '+escS(c.name)+'</div>'+
    '<p><strong>الاسم:</strong> '+escS(mgr.name)+' · <strong>الإيميل:</strong> '+escS(mgr.email||'-')+' · <strong>التليفون:</strong> '+escS(mgr.phone||'-')+' · <strong>الباسورد:</strong> '+escS(mgr.password||'-')+'</p>'+
    '<button type="button" class="btn btn-secondary btn-sm" onclick="CM.resetManagerPass(\''+c.id+'\')">🔑 تغيير الباسورد</button> '+
    '<button type="button" class="btn btn-danger btn-sm" onclick="CM.removeManager(\''+c.id+'\')">🗑 حذف الحساب</button></div>','modal-sm');
    return;
  }
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">👤 إنشاء حساب مدير السنتر</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="filter-info">🏢 '+escS(c.name)+' — هيدور سنتره على المنصة + عالمه الافتراضي الخاص</div>'+
  '<div class="form-group"><label>اسم المدير *</label><input id="mgName" class="form-input"></div>'+
  '<div class="form-group"><label>الإيميل (دخول) *</label><input id="mgEmail" type="email" class="form-input" placeholder="center@mail.com"></div>'+
'<div class="form-group"><label>التليفون *</label><input id="mgPhone" class="form-input"></div>'+
  '<div class="form-group"><label>الباسورد</label><input id="mgPass" class="form-input" value="1234"></div>'+
  '<button type="button" class="btn btn-primary w-full" onclick="CM.createManager(\''+c.id+'\')">💾 إنشاء الحساب</button></div>','modal-sm');
};
CM.createManager=function(centerId){
  var d=db();var c=resolveCenter(centerId)||ensureCenterDoc(centerId);if(!c)return;
  var name=(document.getElementById('mgName')||{}).value||'';var phone=(document.getElementById('mgPhone')||{}).value||'';var pass=(document.getElementById('mgPass')||{}).value||'1234';
  if(!name||!phone){toast('الاسم والتليفون مطلوبين','error');return;}
  var email=((document.getElementById('mgEmail')||{}).value||'').trim();
if(!email){toast('الإيميل مطلوب','error');return;}
if((db().users||[]).some(function(x){return (x.email||'').toLowerCase()===email.toLowerCase();})){toast('الإيميل مستخدم بالفعل','error');return;}
var u=CM.createUser({role:'center',name:name,email:email,phone:phone,password:pass,centerId:centerId,createdAt:new Date().toISOString()});
  c.managerId=u.id;saveD(d);cloud('centers',c);
  ThemeManager.closeModal();toast('✅ الحساب اتعمل — يقدر يسجل دخول دلوقتي','success');
  if(window.loadCenters)window.loadCenters();
};
CM.resetManagerPass=function(centerId){var p=prompt('الباسورد الجديد:','1234');if(!p)return;var d=db();var c=(d.centers||[]).find(function(x){return x.id===centerId;});var m=c&&c.managerId?(DataService.getUserById?DataService.getUserById(c.managerId):null):null;if(m){m.password=p;saveD(d);cloud('users',m);toast('🔑 اتغير','success');}};
CM.removeManager=function(centerId){if(!confirm('حذف حساب المدير؟'))return;var d=db();var c=(d.centers||[]).find(function(x){return x.id===centerId;});if(c&&c.managerId){d.users=(d.users||[]).filter(function(u){return u.id!==c.managerId;});c.managerId=null;saveD(d);toast('🗑 اتحذف','info');if(window.loadCenters)window.loadCenters();}};
CM.FEATURES=[['monthly','📒 دفتر التحصيل'],['students','🎓 الطلاب'],['teachers','👥 إدارة المجموعات'],['attendance','📋 الحضور'],['store','🏪 المتجر'],['pointsStore','🏆 متجر النقاط'],['exams','🛠️ الإنشاء'],['grades','📝 الرصد'],['quickEval','⚡ التقييم السريع'],['battles','⚔️ المعارك'],['expenses','💸 المصروفات'],['classPosts','📰 البوستات'],['videos','🎬 الفيديوهات'],['challenges','🏆 المسابقات'],['local','🌍 العالم الافتراضي (أساتذة/طلاب محليين)']];
CM.openManagerFeatures=function(centerId){
  if(role()!=='admin'&&role()!=='super_admin'){toast('🔐 للأدمن بس','error');return;}
  var c=ensureCenterDoc(centerId);if(!c)return;var f=c.features||{};
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">⚙️ صلاحيات سنتر: '+escS(c.name)+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  CM.FEATURES.map(function(x){return '<label style="display:flex;gap:8px;align-items:center;padding:6px;cursor:pointer;"><input type="checkbox" class="cmFeat" value="'+x[0]+'" '+(f[x[0]]===false?'':'checked')+' style="width:16px;height:16px;"><span>'+x[1]+'</span></label>';}).join('')+
  '<button class="btn btn-primary w-full" style="margin-top:10px;" onclick="CM.saveManagerFeatures(\''+c.id+'\')">💾 حفظ</button></div>','modal-sm');
};
CM.saveManagerFeatures=function(centerId){
  var d=db();var c=(d.centers||[]).find(function(x){return x.id===centerId;});if(!c)return;
  c.features={};document.querySelectorAll('.cmFeat').forEach(function(cb){c.features[cb.value]=cb.checked;});
  saveD(d);cloud('centers',c);ThemeManager.closeModal();toast('✅ اتحفظت الصلاحيات','success');
};
CM.openManagerDetails=function(centerId){
  if(role()!=='admin'&&role()!=='super_admin'){toast('🔐 للأدمن بس','error');return;}
  var d=db();var c=resolveCenter(centerId);if(!c){toast('السنتر ده لسه مش مسجل — اعمل حساب مدير الأول','warning');return;}
centerId=c.id;
  var s=(d.centerLocal||{})[centerId]||{teachers:[],students:[],payments:[],activity:[],nominations:[]};
  var mgr=c.managerId?(DataService.getUserById?DataService.getUserById(c.managerId):null):null;
  var localPay=(s.payments||[]).reduce(function(a,p){return a+(+p.amount||0);},0);
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">👁 تفاصيل مدير: '+escS(c.name)+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="filter-info">👤 '+(mgr?escS(mgr.name)+' · '+escS(mgr.phone||''):'لسه مفيش حساب')+' · 🌐 نطاقه على المنصة: مجموعات السنتر ده بس — أي تعديل عليها بيتمشى معاك عادي</div>'+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:10px 0;">'+
  '<div class="card" style="padding:8px;text-align:center;"><div style="font-size:20px;font-weight:900;">'+(s.teachers||[]).length+'</div><div class="text-xs">أساتذته المحليين</div></div>'+
  '<div class="card" style="padding:8px;text-align:center;"><div style="font-size:20px;font-weight:900;">'+(s.students||[]).length+'</div><div class="text-xs">طلابه المحليين</div></div>'+
  '<div class="card" style="padding:8px;text-align:center;"><div style="font-size:20px;font-weight:900;">'+localPay+'</div><div class="text-xs">تحصيله المحلي</div></div>'+
  '<div class="card" style="padding:8px;text-align:center;"><div style="font-size:20px;font-weight:900;">'+(s.nominations||[]).filter(function(n){return n.status==='pending';}).length+'</div><div class="text-xs">ترشيحات معلقة</div></div></div>'+
  '<h4 style="margin:12px 0 6px;">🚀 ترشيحات انضمام للمنصة</h4>'+
  ((s.nominations||[]).length?(s.nominations||[]).map(function(n){return '<div class="sub-row" style="padding:8px;"><div style="flex:1;"><strong>'+escS(n.name)+'</strong><div class="text-xs text-muted">'+escS(n.subject||'')+' · '+escS(n.phone||'')+' · '+String(n.at).slice(0,10)+'</div></div>'+(n.status==='pending'?'<button type="button" class="btn btn-success btn-sm" onclick="CM.promoteLocalTeacher(\''+centerId+'\',\''+n.id+'\')">⬆️ ترقية للمنصة</button>':'<span class="badge badge-success">مترقي</span>')+'</div>';}).join(''):'<p class="text-muted">مفيش ترشيحات</p>')+
  '<h4 style="margin:12px 0 6px;">👨‍🏫 أساتذته المحليين (عالمه الافتراضي)</h4>'+
  ((s.teachers||[]).length?(s.teachers||[]).map(function(t){return '<div class="sub-row" style="padding:6px 8px;"><div style="flex:1;"><strong>'+escS(t.name)+'</strong><div class="text-xs text-muted">'+escS(t.subject||'')+' · '+escS(t.phone||'')+(t.promotedTo?' · ⬆️ مترقي للمنصة':'')+'</div></div></div>';}).join(''):'<p class="text-muted">مفيش</p>')+
  '<h4 style="margin:12px 0 6px;">📜 سجل حركته</h4>'+
  '<div style="max-height:220px;overflow:auto;">'+(((s.activity||[]).slice().reverse().slice(0,80)).map(function(a){return '<div class="sub-row" style="padding:6px 8px;"><div style="flex:1;"><strong style="font-size:12px;">'+escS(a.action)+'</strong> <span class="text-xs text-muted">'+escS(a.details||'')+'</span><div class="text-xs text-muted">🕐 '+escS(String(a.at).slice(0,16).replace('T',' '))+'</div></div></div>';}).join('')||'<p class="text-muted">مفيش حركة مسجلة</p>')+'</div>'+
  '</div>','modal-lg');
};
CM.promoteLocalTeacher=function(centerId,nomId){
  if(role()!=='admin'&&role()!=='super_admin'){toast('🔐 الترقية للأدمن بس','error');return;}
  var d=db();var s=(d.centerLocal||{})[centerId];if(!s)return;
  var n=(s.nominations||[]).find(function(x){return x.id===nomId;});if(!n||n.status!=='pending')return;
  var t=CM.createUser({role:'teacher',name:n.name,subject:n.subject||'',phone:n.phone||'',password:'1234',centerId:centerId,fromCenterLocal:true,createdAt:new Date().toISOString()});
  n.status='promoted';n.promotedTo=t.id;
  var lt=(s.teachers||[]).find(function(x){return x.id===n.localTeacherId;});if(lt)lt.promotedTo=t.id;
  s.activity=s.activity||[];s.activity.push({id:'act_'+Date.now(),at:new Date().toISOString(),by:(cur()||{}).name||'admin',action:'ترقية أستاذ محلي للمنصة',details:n.name});
  saveD(d);cloud('users',t);
  var c=(d.centers||[]).find(function(x){return x.id===centerId;});
  if(c&&c.managerId){try{DataService.addNotification({targetUserId:c.managerId,title:'⬆️ ترقية اتوافقت',message:n.name+' بقى أستاذ منصة — بياناته من دلوقتي مشتركة',type:'general',priority:'important',meta:{event:'general'}});}catch(e){}}
  toast('⬆️ اترقى لأستاذ منصة','success');
  CM.openManagerDetails(centerId);
};
/* ========== 🧩 حقن أزرار المدير — على كل كارت سنتر مهما كان مصدره ========== */
function normName(s){ return String(s||'').replace(/[\u064B-\u0652]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim(); }
function resolveCenter(idOrName){
  var d=db();
  var c=(d.centers||[]).find(function(x){return x.id===idOrName;});
  if(c) return c;
  var n=normName(idOrName);
  return (d.centers||[]).find(function(x){ return normName(x.name)===n; })||null;
}
function ensureCenterDoc(name){
  var c=resolveCenter(name);
  if(c) return c;
  var d=db(); d.centers=d.centers||[];
  var nc={id:'c_'+Date.now(),name:name,address:''};
  d.centers.push(nc); saveD(d);
  try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('centers',nc.id,nc); }catch(e){}
  toast('🏢 السنتر "'+name+'" اتسجل في النظام تلقائياً','info');
  return nc;
}
function injectManagerButtons(){
  if(role()!=='admin'&&role()!=='super_admin')return;
  var host=document.getElementById('centersList');if(!host)return;
  host.querySelectorAll('.user-card').forEach(function(card){
    if(card.querySelector('.cmMgrBtns'))return;
    var nameEl=card.querySelector('.user-name');if(!nameEl)return;
    var cName=nameEl.textContent.trim(); if(!cName)return;
    var safe=cName.replace(/'/g,"\\'");
    var doc=resolveCenter(cName);
    var mgr=(doc&&doc.managerId)?(DataService.getUserById?DataService.getUserById(doc.managerId):null):null;
    var div=document.createElement('div');div.className='cmMgrBtns';div.style.cssText='display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;';
    div.innerHTML='<button type="button" class="btn btn-secondary btn-sm" onclick="CM.openManagerAccount(\''+safe+'\')">'+(mgr?'👤 '+escS(mgr.name):'👤 إنشاء حساب مدير')+'</button>'+
    '<button type="button" class="btn btn-ghost btn-sm" onclick="CM.openManagerDetails(\''+safe+'\')">👁 تفاصيل المدير</button>'+
'<button type="button" class="btn btn-ghost btn-sm" onclick="CM.openManagerFeatures(\''+safe+'\')">⚙️ صلاحيات</button>';
    var actions=card.querySelector('.user-actions');
    if(actions&&actions.parentNode)actions.parentNode.insertBefore(div,actions.nextSibling);else card.appendChild(div);
  });
}

function wrapLoadCenters(){
  if(typeof window.loadCenters!=='function'||window.__cmCenters)return;
  window.__cmCenters=1;
  var o=window.loadCenters;
  window.loadCenters=function(){var r=o.apply(this,arguments);setTimeout(injectManagerButtons,150);return r;};
}
function boot(){wrapScope();wrapLoadCenters();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,400);});else setTimeout(boot,400);
setInterval(function(){wrapScope();wrapLoadCenters();injectManagerButtons();},4000);
})();