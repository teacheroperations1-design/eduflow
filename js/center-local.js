(function(){
var CM=window.CM=window.CM||{};
function el(id){return document.getElementById(id);}
/* ===== Sandbox renders ===== */
CM.renderLocalTeachers=function(){
  var s=CM.SBX();
  el('ltHost').innerHTML=(s.teachers||[]).length?s.teachers.map(function(t){
    var gs2=(s.groups||[]).filter(function(g){return g.teacherId===t.id;});
    return '<div class="user-card"><div class="user-card-header"><div class="user-avatar">👨‍🏫</div><div><div class="user-name">'+CM.escS(t.name)+'</div><div class="user-meta"><span>'+CM.escS(t.subject||'-')+'</span><span>📞 '+CM.escS(t.phone||'-')+'</span></div></div></div>'+
    (gs2.length?'<div style="display:flex;gap:4px;flex-wrap:wrap;margin:8px 0;">'+gs2.map(function(g){return '<span class="badge badge-info">'+CM.escS(g.name)+' · '+g.fee+'ج</span>';}).join('')+'</div>':'')+
    '<div class="user-actions"><button class="btn btn-ghost btn-sm" onclick="CM.openLocalGroupModal(\''+t.id+'\')">+ مجموعة</button><button class="btn btn-secondary btn-sm" onclick="CM.openLocalTeacherModal(\''+t.id+'\')">✏️</button><button class="btn btn-warning btn-sm" onclick="CM.nominateTeacher(\''+t.id+'\')">🚀 ترشيح للمنصة</button><button class="btn btn-danger btn-sm" onclick="CM.deleteLocalTeacher(\''+t.id+'\');CM.renderLocalTeachers();">🗑</button></div></div>';
  }).join(''):'<p class="text-muted">مفيش أساتذة محليين — ضيف أول واحد</p>';
};
CM.openLocalTeacherModal=function(id){
  var s=CM.SBX(); var t=id?(s.teachers||[]).find(function(x){return x.id===id;}):null;
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">'+(t?'✏️ تعديل':'➕')+' أستاذ محلي</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="form-group"><label>الاسم *</label><input id="ltName" class="form-input" value="'+(t?CM.escS(t.name):'')+'"></div>'+
  '<div class="form-group"><label>المادة</label><input id="ltSub" class="form-input" value="'+(t?CM.escS(t.subject||''):'')+'"></div>'+
  '<div class="form-group"><label>التليفون</label><input id="ltPhone" class="form-input" value="'+(t?CM.escS(t.phone||''):'')+'"></div>'+
  '<button class="btn btn-primary w-full" onclick="CM.saveLocalTeacher(\''+(id||'')+'\')">💾 حفظ (في عالمك بس)</button></div>','modal-sm');
};
CM.saveLocalTeacher=function(id){
  var data={name:(el('ltName')||{}).value||'',subject:(el('ltSub')||{}).value||'',phone:(el('ltPhone')||{}).value||''};
  if(!data.name){window.safeToast('الاسم مطلوب','error');return;}
  if(id) CM.updateLocalTeacher(id,data); else CM.addLocalTeacher(data);
  ThemeManager.closeModal(); CM.renderLocalTeachers();
};
CM.openLocalGroupModal=function(tid){
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">+ مجموعة محلية</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="form-group"><label>الاسم *</label><input id="lgName" class="form-input"></div>'+
  '<div class="form-group"><label>الشهرية *</label><input type="number" id="lgFee" class="form-input" value="200"></div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div class="form-group"><label>اليوم</label><select id="lgDay" class="form-select"><option>Saturday</option><option>Sunday</option><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option></select></div><div class="form-group"><label>الوقت</label><input type="time" id="lgTime" class="form-input"></div></div>'+
  '<button class="btn btn-primary w-full" onclick="CM.saveLocalGroup(\''+tid+'\')">💾 حفظ</button></div>','modal-sm');
};
CM.saveLocalGroup=function(tid){
  var g=CM.addLocalGroup({teacherId:tid,name:(el('lgName')||{}).value||'',fee:(el('lgFee')||{}).value||0,day:(el('lgDay')||{}).value||'',time:(el('lgTime')||{}).value||''});
  ThemeManager.closeModal(); CM.renderLocalTeachers(); window.safeToast('✅ المجموعة اتضافت','success');
};
CM.renderLocalStudents=function(){
  var s=CM.SBX();
  el('lsHost').innerHTML=(s.students||[]).length?s.students.map(function(st){
    return '<div class="user-card"><div class="user-card-header"><div class="user-avatar">🧑🎓</div><div><div class="user-name">'+CM.escS(st.name)+'</div><div class="user-meta"><span>'+CM.escS(st.phone||'-')+'</span><span>'+CM.escS(st.grade||'-')+'</span></div></div></div>'+
    '<div style="display:flex;gap:4px;flex-wrap:wrap;margin:8px 0;">'+((st.groupIds||[]).map(function(gid){var g=(s.groups||[]).find(function(x){return x.id===gid;});return g?'<span class="badge badge-info">'+CM.escS(g.name)+'</span>':'';}).join('')||'<span class="text-xs text-muted">مش في مجموعة</span>')+'</div>'+
    '<div class="user-actions"><button class="btn btn-danger btn-sm" onclick="CM.deleteLocalStudent(\''+st.id+'\');CM.renderLocalStudents();">🗑</button></div></div>';
  }).join(''):'<p class="text-muted">مفيش طلاب محليين</p>';
};
CM.openLocalStudentModal=function(){
  var s=CM.SBX();
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">+ طالب محلي</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="form-group"><label>الاسم *</label><input id="lsName" class="form-input"></div>'+
  '<div class="form-group"><label>التليفون</label><input id="lsPhone" class="form-input"></div>'+
  '<div class="form-group"><label>الصف</label><input id="lsGrade" class="form-input"></div>'+
  '<div class="form-group"><label>مجموعاته</label><div style="max-height:140px;overflow:auto;">'+(s.groups||[]).map(function(g){return '<label class="switch-label"><input type="checkbox" class="switch-input lsG" value="'+g.id+'"><span class="switch"></span><span>'+CM.escS(g.name)+'</span></label>';}).join('')+'</div></div>'+
  '<button class="btn btn-primary w-full" onclick="CM.saveLocalStudent()">💾 حفظ (في عالمك بس)</button></div>','modal-md');
};
CM.saveLocalStudent=function(){
  var gids=Array.prototype.slice.call(document.querySelectorAll('.lsG:checked')).map(function(c){return c.value;});
  CM.addLocalStudent({name:(el('lsName')||{}).value||'',phone:(el('lsPhone')||{}).value||'',grade:(el('lsGrade')||{}).value||'',groupIds:gids});
  ThemeManager.closeModal(); CM.renderLocalStudents();
};
CM.renderLocalLedger=function(){
  var s=CM.SBX(); var m=CM.monthNow();
  el('llHost').innerHTML=(s.groups||[]).length?s.groups.map(function(g){
    var sts=(s.students||[]).filter(function(st){return (st.groupIds||[]).indexOf(g.id)>=0;});
    var exp=sts.length*(+g.fee||0);
    var coll=(s.payments||[]).filter(function(p){return p.groupId===g.id&&String(p.month||'').slice(0,7)===m;}).reduce(function(a,p){return a+(+p.amount||0);},0);
    var t=(s.teachers||[]).find(function(x){return x.id===g.teacherId;});
    return '<div class="card" style="padding:12px;margin-bottom:10px;"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><div><strong>'+CM.escS(g.name)+'</strong><div class="text-xs text-muted">👨‍ '+CM.escS(t?t.name:'-')+' · شهرية '+g.fee+'ج · '+sts.length+' طالب</div></div><div style="text-align:left;"><div style="font-weight:900;color:var(--success);">'+coll+' / '+exp+'</div><div class="text-xs" style="color:var(--danger);">متبقي '+(exp-coll)+'</div></div></div>'+
    '<div style="display:flex;gap:6px;margin-top:8px;"><button class="btn btn-primary btn-sm" onclick="CM.openLocalPayModal(\''+g.id+'\')">💰 تحصيل</button><button class="btn btn-danger btn-sm" onclick="CM.deleteLocalGroup(\''+g.id+'\');CM.renderLocalLedger();">🗑 مجموعة</button></div></div>';
  }).join(''):'<p class="text-muted">اعمل مجموعات الأول من صفحة أساتذتي</p>';
};
CM.openLocalPayModal=function(gid){
  var s=CM.SBX(); var g=(s.groups||[]).find(function(x){return x.id===gid;});
  var sts=(s.students||[]).filter(function(st){return (st.groupIds||[]).indexOf(gid)>=0;});
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">💰 تحصيل: '+CM.escS(g.name)+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="form-group"><label>الطالب *</label><select id="lpStu" class="form-select">'+sts.map(function(st){return '<option value="'+st.id+'">'+CM.escS(st.name)+'</option>';}).join('')+'</select></div>'+
  '<div class="form-group"><label>المبلغ *</label><input type="number" id="lpAmt" class="form-input" value="'+(g.fee||0)+'"></div>'+
  '<button class="btn btn-primary w-full" onclick="CM.saveLocalPay(\''+gid+'\')">💾 تسجيل (في عالمك بس)</button></div>','modal-sm');
};
CM.saveLocalPay=function(gid){
  CM.recordLocalPayment((el('lpStu')||{}).value,(gid),(el('lpAmt')||{}).value);
  ThemeManager.closeModal(); CM.renderLocalLedger();
};
CM.renderLocalAttendance=function(){
  var s=CM.SBX();
  el('laHost').innerHTML=((s.attendance||[]).slice().reverse().slice(0,20).map(function(a){
    var g=(s.groups||[]).find(function(x){return x.id===a.groupId;});
    var marks=a.marks||{}; var pres=Object.keys(marks).filter(function(k){return marks[k]==='present';}).length;
    return '<div class="sub-row" style="padding:8px;"><div style="flex:1;"><strong>'+CM.escS(g?g.name:'')+'</strong><div class="text-xs text-muted">'+a.date+' · حاضر '+pres+' من '+Object.keys(marks).length+'</div></div></div>';
  }).join('')||'<p class="text-muted">مفيش رصد لسه</p>');
};
CM.openLocalAttModal=function(){
  var s=CM.SBX();
  ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📅 رصد حضور محلي</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
  '<div class="form-group"><label>المجموعة *</label><select id="laG" class="form-select" onchange="CM.laStudents()">'+(s.groups||[]).map(function(g){return '<option value="'+g.id+'">'+CM.escS(g.name)+'</option>';}).join('')+'</select></div>'+
  '<div class="form-group"><label>التاريخ</label><input type="date" id="laD" class="form-input" value="'+CM.todayStr()+'"></div>'+
  '<div id="laStuList" style="max-height:40vh;overflow:auto;"></div>'+
  '<button class="btn btn-primary w-full" style="margin-top:10px;" onclick="CM.saveLocalAtt()">💾 حفظ</button></div>','modal-md');
  CM.laStudents();
};
CM.laStudents=function(){
  var s=CM.SBX(); var gid=(el('laG')||{}).value;
  var sts=(s.students||[]).filter(function(st){return (st.groupIds||[]).indexOf(gid)>=0;});
  el('laStuList').innerHTML=sts.map(function(st){return '<div class="sub-row" style="padding:6px 8px;"><div style="flex:1;"><strong style="font-size:13px;">'+CM.escS(st.name)+'</strong></div><select class="form-select laMk" data-sid="'+st.id+'" style="width:110px;"><option value="present">حاضر</option><option value="absent">غائب</option></select></div>';}).join('')||'<p class="text-muted">مفيش طلاب في المجموعة</p>';
};
CM.saveLocalAtt=function(){
  var gid=(el('laG')||{}).value, date=(el('laD')||{}).value||CM.todayStr();
  var marks={}; document.querySelectorAll('.laMk').forEach(function(m){marks[m.getAttribute('data-sid')]=m.value;});
  CM.recordLocalAttendance(gid,date,marks);
  ThemeManager.closeModal(); CM.renderLocalAttendance();
};
CM.renderMgmt=function(){
  var s=CM.SBX();
  el('mgHost').innerHTML=
  '<div class="card" style="padding:12px;"><strong style="font-size:13px;">✅ مهامي</strong><div style="display:flex;gap:6px;margin:8px 0;"><input id="tkIn" class="form-input" placeholder="مهمة جديدة..."><button class="btn btn-primary btn-sm" onclick="CM.addTask()">+</button></div><div id="tkList">'+(s.tasks||[]).map(function(t,i){return '<div class="sub-row" style="padding:6px;"><div style="flex:1;">'+CM.escS(t)+'</div><button class="btn btn-danger btn-sm" onclick="CM.delTask('+i+')">✕</button></div>';}).join('')+'</div></div>'+
  '<div class="card" style="padding:12px;"><strong style="font-size:13px;"> ملاحظاتي</strong><div style="display:flex;gap:6px;margin:8px 0;"><input id="ntIn" class="form-input" placeholder="ملاحظة..."><button class="btn btn-primary btn-sm" onclick="CM.addNote()">+</button></div><div id="ntList">'+(s.notes||[]).map(function(n,i){return '<div class="sub-row" style="padding:6px;"><div style="flex:1;">'+CM.escS(n)+'</div><button class="btn btn-danger btn-sm" onclick="CM.delNote('+i+')">✕</button></div>';}).join('')+'</div></div>';
};
CM.addTask=function(){var v=(el('tkIn')||{}).value;if(!v)return;var s=CM.SBX();s.tasks=s.tasks||[];s.tasks.push(v);DataService._saveData(DataService._getData());CM.renderMgmt();};
CM.delTask=function(i){var s=CM.SBX();s.tasks.splice(i,1);DataService._saveData(DataService._getData());CM.renderMgmt();};
CM.addNote=function(){var v=(el('ntIn')||{}).value;if(!v)return;var s=CM.SBX();s.notes=s.notes||[];s.notes.push(v);DataService._saveData(DataService._getData());CM.renderMgmt();};
CM.delNote=function(i){var s=CM.SBX();s.notes.splice(i,1);DataService._saveData(DataService._getData());CM.renderMgmt();};
CM.renderAccount=function(){
  var u=currentUser;
  el('acHost').innerHTML='<div class="card" style="max-width:420px;padding:16px;"><div class="form-group"><label>الاسم</label><input id="acName" class="form-input" value="'+CM.escS(u.name||'')+'"></div><div class="form-group"><label>التليفون</label><input id="acPhone" class="form-input" value="'+CM.escS(u.phone||'')+'"></div><div class="form-group"><label>باسورد جديد</label><input type="password" id="acPass" class="form-input" placeholder="سيبه فاضي لو مش عايز تغير"></div><button class="btn btn-primary w-full" onclick="CM.saveAccount()">💾 حفظ</button></div>';
};
CM.saveAccount=function(){
  var d=DataService._getData(); var u=(d.users||[]).find(function(x){return x.id===currentUser.id;});
  if(!u)return; u.name=(el('acName')||{}).value||u.name; u.phone=(el('acPhone')||{}).value||u.phone;
  var p=(el('acPass')||{}).value; if(p) u.password=p;
  DataService._saveData(d); try{ if(window.FirebaseService&&FirebaseService._db) FirebaseService.saveDoc('users',u.id,u); }catch(e){}
  currentUser=u; window.safeToast('✅ اتحفظ','success');
};})();