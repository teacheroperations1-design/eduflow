/* ================================================================
🛍️ Store Center V1 — المتجر والجرد (ملف خارجي مستقل تماماً)
• بينشئ سكشن المتجر بنفسه ويعرضه حتى لو كل الكود الداخلي تالف
• بيعترض كليك القائمة قبل أي showSection تاني
• 3 تبويبات: 📚 كتب ومذكرات · 🏆 متجر النقاط · 📦 الطلبات
• + أدوات تعديل نقاط/ستريك الطلاب (مساعد/أدمن)
================================================================ */
(function(){
"use strict";
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function saveD(d){if(DataService._saveData)DataService._saveData(d);}
function cur(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null);}catch(e){return null;}}
function cloud(col,o,del){try{if(window.FirebaseService&&FirebaseService._db){if(del)FirebaseService.deleteDoc(col,o.id);else FirebaseService.saveDoc(col,o.id,o);}}catch(e){}}
function myTeacherId(){try{return window.getMyTeacherId?window.getMyTeacherId():null;}catch(e){return null;}}
function thumb(u){try{return window.driveThumb?window.driveThumb(u):u;}catch(e){return u;}}

/* ========== بناء السكشن ========== */
function buildSection(){
var sec=document.getElementById('section-store');
if(!sec){
sec=document.createElement('section');
sec.className='section';sec.id='section-store';
(document.querySelector('.content-area')||document.getElementById('mainContent')||document.body).appendChild(sec);
}
var old=document.getElementById('section-storeAs');if(old&&old!==sec)old.remove();
if(!sec.__sc){
sec.__sc=1;
sec.innerHTML='<div class="section-header"><div><h2 class="section-title">🛍️ المتجر والجرد</h2><p class="text-sm text-muted">كتب ومذكرات الأساتذة + متجر النقاط + الطلبات — مكان واحد</p></div><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" onclick="window.openCatalogItemModal()">➕ كتاب/مذكرة</button><button class="btn btn-success btn-sm" onclick="window.openPointsItemModal()">🏆 منتج نقاط</button><button class="btn btn-ghost btn-sm" onclick="window.scRender()">🔄</button></div></div>'+
'<div class="filter-bar" style="margin-bottom:12px;"><button class="filter-btn active" id="scTabBtn-catalog" onclick="window.scTab(\'catalog\')">📚 كتب ومذكرات</button><button class="filter-btn" id="scTabBtn-points" onclick="window.scTab(\'points\')">🏆 متجر النقاط</button><button class="filter-btn" id="scTabBtn-orders" onclick="window.scTab(\'orders\')">📦 الطلبات والاستبدالات</button></div>'+
'<div id="scPane-catalog"></div><div id="scPane-points" style="display:none;"></div><div id="scPane-orders" style="display:none;"></div>';
}
return sec;
}
function showStore(){
try{
var sec=buildSection();
document.querySelectorAll('section.section').forEach(function(s){s.classList.remove('active');});
sec.classList.add('active');
var nav=document.getElementById('sidebarNav');
if(nav)nav.querySelectorAll('.sidebar-item').forEach(function(it){it.classList.toggle('active',it.getAttribute('data-section')==='store');});
var pt=document.getElementById('pageTitle');if(pt)pt.textContent='🛍️ المتجر والجرد';
var ps=document.getElementById('pageSubtitle');if(ps)ps.textContent='كتب ومذكرات الأساتذة + متجر النقاط + الطلبات';
render();
}catch(e){console.error(e);}
}
window.showStoreCenter=showStore;
window.scTab=function(t){
['catalog','points','orders'].forEach(function(k){
var p=document.getElementById('scPane-'+k);if(p)p.style.display=(k===t)?'':'none';
var b=document.getElementById('scTabBtn-'+k);if(b)b.classList.toggle('active',k===t);
});
render();
};

/* ========== الرندر ========== */
function render(){
try{
buildSection();
var d=db(),u=cur(),tid=myTeacherId();
/* 📚 كتب ومذكرات */
var cat=(d.storeCatalog||[]).slice();
if(u&&u.role==='assistant'&&tid)cat=cat.filter(function(i){return !i.teacherId||i.teacherId===tid;});
var pc=document.getElementById('scPane-catalog');
if(pc)pc.innerHTML=cat.length?'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">'+cat.map(function(i){
var t=i.teacherId?(DataService.getUserById?DataService.getUserById(i.teacherId):null):null;
return '<div class="card" style="margin:0;padding:12px;">'+(i.imageUrl?'<img src="'+thumb(i.imageUrl)+'" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display=\'none\'">':'<div style="height:100px;display:flex;align-items:center;justify-content:center;font-size:36px;background:var(--surface-hover);border-radius:8px;margin-bottom:8px;">📚</div>')+
'<strong style="font-size:13px;">'+i.name+'</strong><div class="text-xs text-muted">'+(i.type||'مذكرة')+' · 👨 '+(t?t.name:'عام')+' · '+(i.grade||'كل الصفوف')+'</div>'+
'<div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px;"><b style="color:var(--success);">'+(i.price||0)+' ج.م</b><span>متاح '+(i.stock||0)+' · محجوز '+(i.reserved||0)+'</span></div>'+
'<div style="display:flex;gap:4px;margin-top:8px;"><button class="btn btn-ghost btn-sm" onclick="window.openCatalogItemModal(\''+i.id+'\')">✏️</button><button class="btn btn-'+(i.active===false?'success':'danger')+' btn-sm" onclick="window.scToggleCat(\''+i.id+'\')">'+(i.active===false?'تفعيل':'إيقاف')+'</button><button class="btn btn-danger btn-sm" onclick="window.scDelCat(\''+i.id+'\')">🗑</button></div></div>';
}).join('')+'</div>':'<div class="card" style="text-align:center;padding:24px;"><div style="font-size:44px;">📚</div><strong>مفيش كتب أو مذكرات</strong><div class="text-xs text-muted">دوس "➕ كتاب/مذكرة" لإضافة أول منتج</div></div>';
/* 🏆 متجر النقاط */
var g=d.gamification||{};var store=g.store||{enabled:true,items:[]};var items=store.items||[];
var pp=document.getElementById('scPane-points');
if(pp)pp.innerHTML='<div class="filter-info">💡 المنتجات دي بيستبدلها الطلاب بنقاطهم من صفحة "استبدال النقاط". '+(store.enabled!==false?'<span class="badge badge-success">مفعّل</span>':'<span class="badge badge-danger">موقوف</span>')+' <button class="btn btn-ghost btn-sm" onclick="window.scToggleStore()">'+(store.enabled!==false?'إيقاف المتجر':'تفعيل المتجر')+'</button></div>'+
(items.length?'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">'+items.map(function(i){
return '<div class="card" style="margin:0;padding:12px;text-align:center;">'+(i.imageUrl?'<img src="'+thumb(i.imageUrl)+'" style="width:100%;height:90px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display=\'none\'">':'<div style="height:90px;display:flex;align-items:center;justify-content:center;font-size:34px;background:var(--surface-hover);border-radius:8px;margin-bottom:8px;">'+(i.icon||'🎁')+'</div>')+
'<strong style="font-size:13px;">'+i.name+'</strong><div class="text-xs text-muted">'+(i.cost||0)+' نقطة · مخزون '+(i.stock!=null?i.stock:'∞')+'</div>'+(i.active===false?'<span class="badge badge-muted">موقوف</span>':'')+
'<div style="display:flex;gap:4px;justify-content:center;margin-top:8px;"><button class="btn btn-ghost btn-sm" onclick="window.openPointsItemModal(\''+i.id+'\')">✏️</button><button class="btn btn-'+(i.active===false?'success':'danger')+' btn-sm" onclick="window.scTogglePt(\''+i.id+'\')">'+(i.active===false?'تفعيل':'إيقاف')+'</button><button class="btn btn-danger btn-sm" onclick="window.scDelPt(\''+i.id+'\')">🗑</button></div></div>';
}).join('')+'</div>':'<div class="card" style="text-align:center;padding:24px;"><div style="font-size:44px;">🏆</div><strong>مفيش منتجات نقاط</strong><div class="text-xs text-muted">دوس "🏆 منتج نقاط" علشان الطلاب تلاقي حاجة تستبدلها</div></div>');
/* 📦 الطلبات */
var orders=[];
['storeOrders','purchases','orders'].forEach(function(k){(d[k]||[]).forEach(function(o){orders.push(Object.assign({__src:k},o));});});
orders.sort(function(a,b){return String(b.purchasedAt||b.at||b.createdAt||'').localeCompare(String(a.purchasedAt||a.at||a.createdAt||''));});
var op=document.getElementById('scPane-orders');
if(op)op.innerHTML=orders.length?orders.slice(0,60).map(function(o){
var s=DataService.getUserById?DataService.getUserById(o.studentId):null;
var kind=o.type==='real'?'📚 طلب كاش':'🏆 استبدال نقاط';
return '<div class="sub-row" style="padding:8px;"><div style="flex:1;"><strong>'+(s?s.name:'-')+'</strong> <span class="badge badge-info">'+kind+'</span><div class="text-xs text-muted">'+(o.itemName||'')+' · '+(o.price?(o.price+' ج.م'):((o.cost||o.points||0)+' نقطة'))+' · '+new Date(o.purchasedAt||o.at||o.createdAt||Date.now()).toLocaleDateString('ar-EG')+'</div></div><div style="display:flex;gap:4px;align-items:center;"><span class="badge '+(o.status==='delivered'?'badge-success':o.status==='cancelled'?'badge-danger':'badge-warning')+'">'+(o.status||'جديد')+'</span>'+(o.status!=='delivered'&&o.status!=='cancelled'?'<button class="btn btn-success btn-sm" onclick="window.scOrder(\''+o.__src+'\',\''+o.id+'\',\'delivered\')">✓ تسليم</button>':'')+(o.status!=='cancelled'?'<button class="btn btn-danger btn-sm" onclick="window.scOrder(\''+o.__src+'\',\''+o.id+'\',\'cancelled\')">✗</button>':'')+'</div></div>';
}).join(''):'<p class="text-muted" style="text-align:center;padding:16px;">مفيش طلبات بعد</p>';
}catch(e){console.error(e);}
}
window.scRender=render;

/* ========== عمليات Katalog/Nقاط/طلبات ========== */
window.scToggleCat=function(id){var d=db();var i=(d.storeCatalog||[]).find(function(x){return x.id===id;});if(!i)return;i.active=(i.active===false);saveD(d);cloud('storeCatalog',i,false);render();};
window.scDelCat=function(id){if(!confirm('حذف المنتج؟'))return;var d=db();var i=(d.storeCatalog||[]).find(function(x){return x.id===id;});d.storeCatalog=(d.storeCatalog||[]).filter(function(x){return x.id!==id;});saveD(d);if(i)cloud('storeCatalog',i,true);render();};
window.scTogglePt=function(id){var d=db();d.gamification=d.gamification||{};d.gamification.store=d.gamification.store||{enabled:true,items:[]};var i=(d.gamification.store.items||[]).find(function(x){return x.id===id;});if(!i)return;i.active=(i.active===false);saveD(d);render();};
window.scDelPt=function(id){if(!confirm('حذف المنتج؟'))return;var d=db();d.gamification=d.gamification||{};d.gamification.store=d.gamification.store||{enabled:true,items:[]};d.gamification.store.items=(d.gamification.store.items||[]).filter(function(x){return x.id!==id;});saveD(d);render();};
window.scToggleStore=function(){var d=db();d.gamification=d.gamification||{};d.gamification.store=d.gamification.store||{enabled:true,items:[]};d.gamification.store.enabled=(d.gamification.store.enabled===false);saveD(d);render();};
window.scOrder=function(src,id,status){var d=db();var o=(d[src]||[]).find(function(x){return x.id===id;});if(!o)return;o.status=status;if(status==='delivered')o.deliveredAt=new Date().toISOString();saveD(d);cloud(src,o,false);render();if(window.safeToast)window.safeToast('✅ تم تحديث الحالة','success');};

/* ========== مودال كتاب/مذكرة ========== */
window.openCatalogItemModal=function(editId){
var d=db();var i=editId?(d.storeCatalog||[]).find(function(x){return x.id===editId;}):null;
var teachers=(DataService.getTeachers?DataService.getTeachers():[]);
var tid=myTeacherId();
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📚 '+(i?'✏️ تعديل':'➕ إضافة')+' كتاب/مذكرة</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
'<div class="form-group"><label>الاسم *</label><input type="text" id="ciName" class="form-input" value="'+(i?i.name:'')+'"></div>'+
'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
'<div class="form-group"><label>النوع</label><select id="ciType" class="form-select"><option value="مذكرة" '+((i&&i.type==='مذكرة')?'selected':'')+'>مذكرة</option><option value="كتاب" '+((i&&i.type==='كتاب')?'selected':'')+'>كتاب</option><option value="هدية" '+((i&&i.type==='هدية')?'selected':'')+'>هدية</option></select></div>'+
'<div class="form-group"><label>الأستاذ</label><select id="ciTeacher" class="form-select"><option value="">عام (المركز)</option>'+teachers.map(function(t){return '<option value="'+t.id+'" '+(((i&&i.teacherId===t.id)||(!i&&tid===t.id))?'selected':'')+'>'+t.name+'</option>';}).join('')+'</select></div>'+
'<div class="form-group"><label>السعر (ج.م) *</label><input type="number" id="ciPrice" class="form-input" value="'+(i?i.price:0)+'" min="0"></div>'+
'<div class="form-group"><label>المخزون *</label><input type="number" id="ciStock" class="form-input" value="'+(i?i.stock:10)+'" min="0"></div>'+
'<div class="form-group"><label>الصف</label><input type="text" id="ciGrade" class="form-input" value="'+(i?i.grade||'':'')+'" placeholder="كل الصفوف"></div>'+
'<div class="form-group"><label>المرحلة</label><input type="text" id="ciStage" class="form-input" value="'+(i?i.stage||'':'')+'" placeholder="اختياري"></div></div>'+
'<div class="form-group"><label>🔗 رابط صورة (Drive أو URL)</label><input type="text" id="ciImg" class="form-input" value="'+(i?i.imageUrl||'':'')+'"></div>'+
'<button class="btn btn-primary w-full" onclick="window.scSaveCat(\''+(editId||'')+'\')">💾 حفظ</button></div>','modal-md');
};
window.scSaveCat=async function(editId){
var d=db();d.storeCatalog=d.storeCatalog||[];
var name=(document.getElementById('ciName')||{}).value||'';
if(!name){if(window.safeToast)window.safeToast('اكتب الاسم','error');return;}
var i=editId?d.storeCatalog.find(function(x){return x.id===editId;}):null;
if(!i){i={id:'cat_'+Date.now(),createdAt:new Date().toISOString(),reserved:0};d.storeCatalog.push(i);}
i.name=name;i.type=(document.getElementById('ciType')||{}).value;
i.teacherId=(document.getElementById('ciTeacher')||{}).value||'';
i.price=parseFloat((document.getElementById('ciPrice')||{}).value)||0;
i.stock=parseInt((document.getElementById('ciStock')||{}).value)||0;
i.grade=(document.getElementById('ciGrade')||{}).value||'';
i.stage=(document.getElementById('ciStage')||{}).value||'';
i.imageUrl=(document.getElementById('ciImg')||{}).value||'';
if(i.active===undefined)i.active=true;
saveD(d);cloud('storeCatalog',i,false);
ThemeManager.closeModal();if(window.safeToast)window.safeToast('💾 تم الحفظ','success');render();
};

/* ========== مودال منتج نقاط ========== */
window.openPointsItemModal=function(editId){
var d=db();var st=(d.gamification&&d.gamification.store)||{items:[]};
var i=editId?(st.items||[]).find(function(x){return x.id===editId;}):null;
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🏆 '+(i?'✏️ تعديل':'➕ إضافة')+' منتج نقاط</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
'<div class="form-group"><label>الاسم *</label><input type="text" id="piName" class="form-input" value="'+(i?i.name:'')+'"></div>'+
'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
'<div class="form-group"><label>التكلفة بالنقاط *</label><input type="number" id="piCost" class="form-input" value="'+(i?i.cost:50)+'" min="1"></div>'+
'<div class="form-group"><label>المخزون</label><input type="number" id="piStock" class="form-input" value="'+((i&&i.stock!=null)?i.stock:99)+'" min="0"></div></div>'+
'<div class="form-group"><label>أيقونة (إيموجي)</label><input type="text" id="piIcon" class="form-input" value="'+(i?i.icon||'':'🎁')+'"></div>'+
'<div class="form-group"><label>🔗 صورة (اختياري)</label><input type="text" id="piImg" class="form-input" value="'+(i?i.imageUrl||'':'')+'"></div>'+
'<button class="btn btn-primary w-full" onclick="window.scSavePt(\''+(editId||'')+'\')">💾 حفظ</button></div>','modal-sm');
};
window.scSavePt=async function(editId){
var d=db();d.gamification=d.gamification||{};d.gamification.store=d.gamification.store||{enabled:true,items:[]};
var name=(document.getElementById('piName')||{}).value||'';
if(!name){if(window.safeToast)window.safeToast('اكتب الاسم','error');return;}
var i=editId?d.gamification.store.items.find(function(x){return x.id===editId;}):null;
if(!i){i={id:'pit_'+Date.now()};d.gamification.store.items.push(i);}
i.name=name;i.cost=parseInt((document.getElementById('piCost')||{}).value)||1;
i.stock=parseInt((document.getElementById('piStock')||{}).value)||99;
i.icon=(document.getElementById('piIcon')||{}).value||'🎁';
i.imageUrl=(document.getElementById('piImg')||{}).value||'';
if(i.active===undefined)i.active=true;
saveD(d);
ThemeManager.closeModal();if(window.safeToast)window.safeToast('💾 تم الحفظ — ظهر للطالب فوراً','success');render();
};

/* ========== ✏️ تعديل نقاط الطلاب (نسخة موحدة بتقرأ كل المصادر) ========== */
window.editStudentPoints=function(sid){
try{
var u=cur();
if(!u||(u.role!=='assistant'&&u.role!=='admin'&&u.role!=='super_admin')){if(window.safeToast)window.safeToast('صلاحية مساعد/أدمن فقط','error');return;}
var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s)return;
var d=db();var rows=[];
(s.pointsHistory||[]).forEach(function(h,i){rows.push({src:'user',idx:i,pts:(h.points!=null?h.points:(h.amount||0)),reason:h.reason||h.note||'نقطة مسجلة',date:h.awardedAt||h.at||''});});
(d.manualPoints||[]).forEach(function(m,i){if(m.studentId===sid)rows.push({src:'manualPoints',idx:i,pts:m.points||0,reason:m.reason||'نقاط يدوية',date:m.awardedAt||m.createdAt||''});});
['interactionPoints','interactions'].forEach(function(key){(d[key]||[]).forEach(function(m,i){if(m.studentId===sid)rows.push({src:key,idx:i,pts:m.points||0,reason:m.note||'تفاعل حصة',date:m.awardedAt||m.createdAt||''});});});
rows.sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''));});
var total=rows.reduce(function(a,r){return a+(r.pts||0);},0);
var html='<div class="modal-header"><h3 class="modal-title">✏️ تعديل نقاط: '+s.name+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">';
html+='<div class="filter-info">💡 الإجمالي من كل المصادر: <strong style="font-family:var(--font-en);">'+total+'</strong> نقطة</div>';
html+=rows.length?rows.map(function(r,i){
return '<div class="sub-row" style="padding:6px 8px;margin-bottom:4px;"><div style="flex:1;"><strong>'+r.reason+'</strong><div class="text-xs text-muted">'+(r.date?new Date(r.date).toLocaleDateString('ar-EG'):'-')+' · المصدر: '+({user:'سجل الطالب',manualPoints:'يدوي',interactionPoints:'تفاعل',interactions:'تفاعل'}[r.src]||r.src)+'</div></div><input type="number" class="form-input" style="width:80px;" id="ptsRow'+i+'" value="'+r.pts+'"><button class="btn btn-ghost btn-sm" onclick="window.savePtsRow(\''+sid+'\',\''+r.src+'\','+r.idx+','+i+')">💾</button><button class="btn btn-danger btn-sm" onclick="window.delPtsRow(\''+sid+'\',\''+r.src+'\','+r.idx+')">🗑</button></div>';
}).join(''):'<p class="text-muted">مفيش نقاط مسجلة — ضيف أول نقطة من تحت</p>';
html+='<div class="card" style="padding:10px;margin-top:10px;"><strong class="text-sm">➕ إضافة نقاط</strong><div style="display:flex;gap:6px;margin-top:8px;"><input type="number" id="ptsAddVal" class="form-input" style="width:90px;" value="5"><input type="text" id="ptsAddReason" class="form-input" placeholder="السبب" style="flex:1;"><button class="btn btn-success btn-sm" onclick="window.addPtsRow(\''+sid+'\')">➕</button></div></div></div>';
ThemeManager.openModal(html,'modal-md');
}catch(e){console.error(e);}
};
window.savePtsRow=async function(sid,src,idx,inputIdx){
try{
var val=parseInt((document.getElementById('ptsRow'+inputIdx)||{}).value)||0;
if(src==='user'){
var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s||!s.pointsHistory||!s.pointsHistory[idx])return;
s.pointsHistory[idx].points=val;
if(DataService.updateUser)await DataService.updateUser(sid,{pointsHistory:s.pointsHistory});
}else{
var d=db();var rec=(d[src]||[])[idx];if(!rec)return;
rec.points=val;saveD(d);
try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc(src,rec.id,rec);}catch(e){}
}
if(window.safeToast)window.safeToast('✅ تم التعديل','success');
window.editStudentPoints(sid);
}catch(e){if(window.safeToast)window.safeToast('خطأ','error');}
};
window.delPtsRow=async function(sid,src,idx){
try{
if(!confirm('حذف النقطة دي؟'))return;
if(src==='user'){
var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s||!s.pointsHistory)return;
s.pointsHistory.splice(idx,1);
if(DataService.updateUser)await DataService.updateUser(sid,{pointsHistory:s.pointsHistory});
}else{
var d=db();var rec=(d[src]||[])[idx];
d[src]=(d[src]||[]).filter(function(_,j){return j!==idx;});
saveD(d);
try{if(rec&&window.FirebaseService&&FirebaseService._db)FirebaseService.deleteDoc(src,rec.id);}catch(e){}
}
if(window.safeToast)window.safeToast('🗑 تم الحذف','success');
window.editStudentPoints(sid);
}catch(e){}
};
window.addPtsRow=async function(sid){
try{
var pts=parseInt((document.getElementById('ptsAddVal')||{}).value)||0;
if(!pts){if(window.safeToast)window.safeToast('اكتب عدد النقاط','error');return;}
var reason=(document.getElementById('ptsAddReason')||{}).value||'نقاط يدوية';
var u=cur();var d=db();d.manualPoints=d.manualPoints||[];
var rec={id:'mp_'+Date.now(),studentId:sid,points:pts,reason:reason,awardedBy:(u||{}).id||'',awardedAt:new Date().toISOString()};
d.manualPoints.push(rec);saveD(d);
try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc('manualPoints',rec.id,rec);}catch(e){}
try{if(DataService.addNotification)DataService.addNotification({targetUserId:sid,title:'🏆 نقاط جديدة',message:'+'+pts+' نقطة — '+reason,type:'points',priority:'medium',meta:{event:'points'}});}catch(e){}
if(window.safeToast)window.safeToast('✅ اتضافت '+pts+' نقطة','success');
window.editStudentPoints(sid);
}catch(e){if(window.safeToast)window.safeToast('خطأ','error');}
};
window.editStreak=function(sid){
var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s)return;
var st=(s.streaks&&s.streaks.attendance)||0;
var v=prompt('🔥 ستريك حضور '+s.name+' الحالي: '+st+'\nاكتب الرقم الجديد:',String(st));
if(v===null)return;
s.streaks=s.streaks||{};s.streaks.attendance=parseInt(v)||0;
if(DataService.updateUser)DataService.updateUser(sid,{streaks:s.streaks});
if(window.safeToast)window.safeToast('✅ الستريك بقى '+s.streaks.attendance,'success');
};
window.addPtsManual=function(sid){
var amt=prompt('عدد النقاط المضافة (سالب للخصم):','5');
if(amt===null)return;
var n=parseInt(amt);if(!n)return;
var reason=prompt('السبب:','تعديل يدوي');
if(typeof Ops!=='undefined'&&Ops.addManualPoints)Ops.addManualPoints(sid,n,reason||'تعديل يدوي',(cur()||{}).id||'');
if(window.safeToast)window.safeToast('✅ تم تعديل النقاط ('+(n>0?'+':'')+n+')','success');
};
window.openPointsPicker=function(){
var sts=(DataService.getStudents?DataService.getStudents():[]);
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">✏️ تعديل نقاط / ستريك طالب</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
'<div class="form-group"><label>🎓 الطالب</label><select id="ppSid" class="form-select">'+sts.map(function(s){return '<option value="'+s.id+'">'+s.name+' ('+(s.code||'')+')</option>';}).join('')+'</select></div>'+
'<div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn btn-warning btn-sm" onclick="var s=document.getElementById(\'ppSid\').value;ThemeManager.closeModal();window.editStudentPoints(s)">✏️ النقاط</button>'+
'<button class="btn btn-secondary btn-sm" onclick="var s=document.getElementById(\'ppSid\').value;ThemeManager.closeModal();window.editStreak(s)">🔥 الستريك</button>'+
'<button class="btn btn-success btn-sm" onclick="var s=document.getElementById(\'ppSid\').value;ThemeManager.closeModal();window.addPtsManual(s)">➕ إضافة نقاط</button></div></div>','modal-sm');
};
function injectPointsTool(){
try{
var u=cur();
if(!u||(u.role!=='assistant'&&u.role!=='admin'&&u.role!=='super_admin'))return;
var sec=document.getElementById('section-students');if(!sec)return;
if(document.getElementById('ptsToolBtn'))return;
var hdr=sec.querySelector('.section-header');
var btn=document.createElement('button');btn.id='ptsToolBtn';btn.type='button';btn.className='btn btn-warning btn-sm';btn.textContent='✏️ تعديل نقاط طالب';
btn.onclick=function(){window.openPointsPicker();};
if(hdr)hdr.appendChild(btn);else sec.insertBefore(btn,sec.firstChild);
}catch(e){}
}

/* ========== تنظيف التكرارات مرة واحدة ========== */
function dedupe(){
try{
var seen={};
document.querySelectorAll('section.section[id]').forEach(function(s){if(seen[s.id]){s.remove();}else seen[s.id]=1;});
var nav=document.getElementById('sidebarNav');
if(nav){var s2={};nav.querySelectorAll('.sidebar-item[data-section]').forEach(function(it){var k=it.getAttribute('data-section');if(s2[k]){it.remove();}else s2[k]=1;});}
}catch(e){}
}

/* ========== الخطافات: كليك القائمة + showSection + أمان دوري ========== */
document.addEventListener('click',function(e){
var it=e.target.closest?e.target.closest('.sidebar-item'):null;
if(!it)return;
var ds=it.getAttribute('data-section')||'';
var lb=(it.querySelector('.sidebar-item-label')||{}).textContent||'';
if(ds==='store'||ds==='storeAs'||lb.indexOf('المتجر')>=0){
e.preventDefault();e.stopPropagation();
showStore();
}
},true);
function hookShow(){
if(typeof window.showSection==='function'&&!window.__scHook){
window.__scHook=1;
var os=window.showSection;
window.showSection=function(id){
if(id==='storeAs'||id==='store'){showStore();return;}
return os.apply(this,arguments);
};
}
}
function init(){
dedupe();hookShow();injectPointsTool();
setTimeout(function(){dedupe();hookShow();injectPointsTool();},1200);
setTimeout(hookShow,2500);
setInterval(function(){
try{
var sec=document.getElementById('section-store');
if(sec&&sec.classList.contains('active')){
var p=document.getElementById('scPane-catalog');
if(!p||!p.innerHTML)render();
}
injectPointsTool();
}catch(e){}
},2000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,500);});else setTimeout(init,500);
})();