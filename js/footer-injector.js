// js/footer-injector.js
(function() {
  'use strict';
  
/* 🔔 تحميل notify-service تلقائياً لو مش موجود في الصفحة */
(function(){
try{
if(!window.__notifyServiceLoaded){
var s=document.createElement('script');
s.src='js/notify-service.js';
s.onload=function(){ window.__notifyServiceLoaded=true; };
document.head.appendChild(s);
}
}catch(e){}
})();

  window.injectUnifiedFooter = async function() {
    try {
      // جلب بيانات البراندنج من الأدمن
      const branding = (typeof DataService !== 'undefined' && typeof DataService.getBranding === 'function') 
        ? DataService.getBranding() 
        : { name: 'EduFlow', supportPhone: '', whatsappSupport: '', facebookLink: '' };

      const footerHTML = `
        <footer class="unified-footer" style="
          background: var(--surface);
          border-top: 1px solid var(--border);
          padding: 24px 16px;
          margin-top: 40px;
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
        ">
          <div style="max-width: 800px; margin: 0 auto;">
            <div style="font-weight: 800; font-size: 16px; color: var(--primary); margin-bottom: 8px;">
              ${branding.name || 'EduFlow'}
            </div>
            <p style="margin: 0 0 12px 0; line-height: 1.6;">
              منصة تعليمية متكاملة لإدارة المراكز التعليمية والسناتر.<br>
             جميع الحقوق محفوظة © ${new Date().getFullYear()}
            </p>
             Habbash Group
            <div style="display: flex; justify-content: center; gap: 16px; margin-top: 12px;">
              ${branding.facebookLink ? `<a href="${branding.facebookLink}" target="_blank" style="color: var(--text-secondary); text-decoration: none; font-weight: 600;">فيسبوك</a>` : ''}
              <a href="about.html" style="color: var(--primary); text-decoration: none; font-weight: 700;">من نحن</a>
            </div>
          </div>
        </footer>
      `;
      
      // الحقن في نهاية الـ Body
      document.body.insertAdjacentHTML('beforeend', footerHTML);
      
      // إضافة مساحة في الأسفل إذا كان الفوتر يغطي محتوى
      document.body.style.paddingBottom = '20px';
      
    } catch (e) {
      console.warn('Footer injection failed:', e);
    }
  };

  // تشغيل عند تحميل الصفحة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.injectUnifiedFooter);
  } else {
    window.injectUnifiedFooter();
  }
})();

/* ============ 🛡️ طبقة منع التكرار + الفلاتر الذكية (شاملة كل المودالات) ============ */
(function(){
"use strict";
function nm(x){return String(x||'').toLowerCase().replace(/[\u064B-\u0652]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim();}
function DS(){return window.DataService||null;}
function students(){var d=DS();return (d&&d.getStudents)?d.getStudents():[];}
function groupsAll(){var d=DS();return (d&&d.getGroups)?d.getGroups():[];}
function ensOf(sid){var d=DS();return (d&&d.getStudentTeachers)?d.getStudentTeachers(sid):[];}

/* 1) الحارس المركزي: لف دوال الإنشاء وقت التشغيل */
function guardDS(){
var d=DS();if(!d||d.__dupGuarded)return;
d.__dupGuarded=1;
['addStudentByAdmin','addUser'].forEach(function(fn){
var orig=d[fn];if(typeof orig!=='function')return;
d[fn]=function(){
var data=arguments[0]||{};
if(fn==='addUser'&&data.role&&data.role!=='student')return orig.apply(this,arguments);
try{
var ph=String(data.phone||data.parentPhone||'').replace(/\D/g,'');
var hit=students().find(function(s){return (nm(s.name)&&nm(s.name)===nm(data.name))||(ph&&(ph===String(s.phone||'').replace(/\D/g,'')||ph===String(s.parentPhone||'').replace(/\D/g,'')));});
if(hit){
var dd=d._getData();dd.enrollments=dd.enrollments||[];
(data.enrollments||[]).forEach(function(en,ix){
var gid=en.groupId||(en.group&&en.group.id);if(!gid)return;
var ex=dd.enrollments.find(function(x){return x.studentId===hit.id&&x.groupId===gid&&x.status==='active';});
if(!ex){var ne={id:'en_'+Date.now()+'_'+ix,studentId:hit.id,groupId:gid,teacherId:en.teacherId||null,status:'active',createdAt:new Date().toISOString()};dd.enrollments.push(ne);try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc('enrollments',ne.id,ne);}catch(e){}}
});
d._saveData(dd);
if(window.safeToast)window.safeToast('🛡️ الطالب موجود بالفعل: '+hit.name+' — اتربط بالمجموعة من غير تكرار','warning');
return Promise.resolve(hit);
}
}catch(e){}
return orig.apply(this,arguments);
};
});
}
guardDS();setTimeout(guardDS,1000);setTimeout(guardDS,2500);

/* 2) وسم التكرار اللحظي على أي خانة اسم في أي مودال */
function isNameInput(t){
if(!t||t.tagName!=='INPUT')return false;
if(t.type&&t.type!=='text'&&t.type!=='')return false;
var ph=String(t.placeholder||'');if(/اسم|name/i.test(ph))return true;
if(/name/i.test(String(t.id||'')))return true;
var fg=t.closest?t.closest('.form-group'):null;
if(fg){var lb=fg.querySelector('label');if(lb&&/الاسم/i.test(lb.textContent||''))return true;}
return false;
}
function checkDup(t){
try{
var row=t.closest('tr')||t.closest('.form-group')||t.parentNode;if(!row)return;
var tag=row.querySelector?row.querySelector('.dupLiveTag'):null;
var val=nm(t.value||'');
if(val.length<3){if(tag)tag.remove();t.style.borderColor='';return;}
var hit=students().find(function(s){return nm(s.name)===val;});
if(hit){
if(!tag){tag=document.createElement('div');tag.className='dupLiveTag';tag.style.cssText='margin-top:4px;';t.parentNode.insertBefore(tag,t.nextSibling);}
var ens=ensOf(hit.id);
var gSel=row.closest&&row.closest('.modal-body')?row.closest('.modal-body').querySelector('select[id*="Group"],select[id*="group"]'):null;
var inThisGroup=gSel&&ens.some(function(e){return e.group&&e.group.id===gSel.value;});
tag.innerHTML='<span class="badge '+(inThisGroup?'badge-success':'badge-warning')+'" style="margin-left:6px;">'+(inThisGroup?'✓ متضاف في المجموعة دي بالفعل':'⚠️ موجود: '+hit.name+' ('+(hit.code||'')+') · '+(ens.length?'مقيّد في '+ens.length+' مجموعة':'غير مقيّد'))+'</span>'+
'<button type="button" class="btn btn-ghost btn-sm" onclick="var f=window.openEditStudentProfile||window.openStudentModal||window.openStudentProfile;f&&f(\''+hit.id+'\')">✏️ تعديل الموجود</button>';
t.style.borderColor=inThisGroup?'var(--success)':'var(--warning)';
}else{if(tag)tag.remove();t.style.borderColor='';}
}catch(e){}
}
document.addEventListener('input',function(e){if(isNameInput(e.target))checkDup(e.target);},true);
document.addEventListener('focusout',function(e){if(isNameInput(e.target))checkDup(e.target);},true);

/* 3) فلاتر متتابعة تلقائية لأي مودال فيه سلكت مجموعة */
function ensureCascade(root){
try{
var gSel=root.querySelector('select[id*="Group"]:not([data-casc]),select[id*="group"]:not([data-casc])');
if(!gSel)return;
gSel.setAttribute('data-casc','1');
var tSel=root.querySelector('select[id*="eacher"],select[id*="teacher"]');
var fg=gSel.closest('.form-group');
var wrap=document.createElement('div');
wrap.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;';
wrap.innerHTML='<div class="form-group"><label>🏢 السنتر</label><select class="form-select cascC"><option value="">الكل</option></select></div><div class="form-group"><label>🎓 الصف</label><select class="form-select cascG"><option value="">الكل</option></select></div>';
if(fg&&fg.parentNode)fg.parentNode.insertBefore(wrap,fg);
var cSel=wrap.querySelector('.cascC'),grSel=wrap.querySelector('.cascG');
function refresh(){
var tid=tSel?tSel.value:'';
var byT=tid?groupsAll().filter(function(g){return g.teacherId===tid;}):groupsAll();
var cs={};byT.forEach(function(g){if(g.center)cs[g.center]=1;});
var cv=cSel.value;
cSel.innerHTML='<option value="">الكل</option>'+Object.keys(cs).map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');
if(cs[cv])cSel.value=cv;
var byC=byT.filter(function(g){return !cSel.value||g.center===cSel.value;});
var gs=[];byC.forEach(function(g){if(g.grade&&gs.indexOf(g.grade)<0)gs.push(g.grade);});
var gv=grSel.value;
grSel.innerHTML='<option value="">الكل</option>'+gs.sort().map(function(x){return '<option value="'+x+'">'+x+'</option>';}).join('');
if(gs.indexOf(gv)>=0)grSel.value=gv;
var filtered=byC.filter(function(g){return !grSel.value||g.grade===grSel.value;});
var cur=gSel.value;
gSel.innerHTML=filtered.length?filtered.map(function(g){return '<option value="'+g.id+'">'+g.name+' · '+(g.grade||'-')+' · '+(g.center||'-')+'</option>';}).join(''):'<option value="">⚠️ مفيش مجموعات — وسّع الفلاتر</option>';
if(filtered.some(function(g){return g.id===cur;}))gSel.value=cur;
}
cSel.onchange=refresh;grSel.onchange=refresh;if(tSel)tSel.onchange=refresh;
refresh();
}catch(e){}
}
setInterval(function(){
try{document.querySelectorAll('.modal-body').forEach(function(mb){ensureCascade(mb);});}catch(e){}
},1500);
})();
/* ============ 🖼️ اللوغو الموحد: فافيكون + هيدر كل الصفحات + مانيفست التثبيت ============ */
(function(){
function brandLogo(){
try{var b=(window.DataService&&DataService._getData)?(DataService._getData().branding||{}):{};if(b.logo)return b.logo;}catch(e){}
try{var s=localStorage.getItem('eduflow_brand_logo');if(s)return s;}catch(e){}
return '';
}
function apply(){
var url=brandLogo();if(!url)return;
var l=document.querySelector('link[rel="icon"]');
if(!l){l=document.createElement('link');l.rel='icon';document.head.appendChild(l);}
if(l.getAttribute('href')!==url)l.setAttribute('href',url);
var a=document.querySelector('link[rel="apple-touch-icon"]');
if(!a){a=document.createElement('link');a.rel='apple-touch-icon';document.head.appendChild(a);}
if(a.getAttribute('href')!==url)a.setAttribute('href',url);
document.querySelectorAll('img.logo,img.brand-logo,.brand img,.sidebar-brand img,.app-logo img,.logo-box img,#brandLogo').forEach(function(im){if(im.getAttribute('src')!==url)im.setAttribute('src',url);});
document.querySelectorAll('.brand,.app-brand,.sidebar-brand,.logo-wrap').forEach(function(h){
if(h.querySelector('img'))return;
var img=document.createElement('img');img.className='brandInjected';img.style.cssText='width:34px;height:34px;border-radius:9px;object-fit:cover;margin-inline-end:8px;vertical-align:middle;';
h.insertBefore(img,h.firstChild);img.setAttribute('src',url);
});
['brandName','brandTitle','appName'].forEach(function(id){
var el=document.getElementById(id);if(!el)return;
var host=el.parentElement||el;
var img=host.querySelector('img.brandInjected');
if(!img){img=document.createElement('img');img.className='brandInjected';img.style.cssText='width:34px;height:34px;border-radius:9px;object-fit:cover;margin-inline-end:8px;vertical-align:middle;';host.insertBefore(img,host.firstChild);}
if(img.getAttribute('src')!==url)img.setAttribute('src',url);
});
try{
var man={name:(document.title||'EduFlow'),short_name:'EduFlow',start_url:location.pathname,display:'standalone',background_color:'#0a0f1e',theme_color:'#6366f1',icons:[{src:url,sizes:'any',type:'image/png',purpose:'any'},{src:url,sizes:'any',type:'image/png',purpose:'maskable'}]};
var blob=new Blob([JSON.stringify(man)],{type:'application/manifest+json'});
var murl=URL.createObjectURL(blob);
var ml=document.querySelector('link[rel="manifest"]');
if(!ml){ml=document.createElement('link');ml.rel='manifest';document.head.appendChild(ml);}
ml.href=murl;
}catch(e){}
}
apply();setTimeout(apply,1200);setTimeout(apply,3000);setInterval(apply,15000);
})();

/* ============ 🏆 متجر تبديل النقاط — قسم مستقل + بانر التجميد الكلي ============ */
(function(){
function db2(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function save2(d){DataService._saveData(d);}
function cur2(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null);}catch(e){return null;}}
function staff(){var u=cur2();return u&&(u.role==='assistant'||u.role==='admin'||u.role==='super_admin');}
function store(){var d=db2();d.gamification=d.gamification||{};d.gamification.store=d.gamification.store||{enabled:true,items:[]};
try{var c=JSON.parse(localStorage.getItem('ptsStoreCache')||'null');if(c){if(!d.gamification.store.items||!d.gamification.store.items.length)d.gamification.store.items=c.items||[];if(d.gamification.store.enabled===undefined)d.gamification.store.enabled=c.enabled!==false;}}catch(e){}
return d.gamification.store;}
function cacheStore(s){try{localStorage.setItem('ptsStoreCache',JSON.stringify(s));}catch(e){}}
function buildSection(){
if(!staff())return;
if(!document.getElementById('section-pointsStore')){
var sec=document.createElement('section');sec.className='section';sec.id='section-pointsStore';
sec.innerHTML='<div class="section-header"><div><h2 class="section-title">🏆 متجر تبديل النقاط</h2><p class="text-sm text-muted">المنتجات اللي بيستبدلها الطلاب بنقاطهم + سجل الاستبدالات</p></div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><span id="psEnabledBadge"></span><button class="btn btn-ghost btn-sm" id="psToggleBtn"></button><button class="btn btn-primary btn-sm" onclick="window.psOpenItem()">➕ منتج نقاط</button></div></div>'+
'<div id="psItems" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:14px;"></div>'+
'<div class="card"><div class="card-header"><h3 class="card-title">📦 سجل الاستبدالات</h3></div><div id="psOrders" style="padding:10px;"></div></div>';
var host=document.querySelector('.content-area')||document.getElementById('mainContent');
if(host)host.appendChild(sec);
var nav=document.getElementById('sidebarNav');
if(nav&&!nav.querySelector('[data-section="pointsStore"]')){
var anchor=nav.querySelector('[data-section="store"]')||nav.querySelector('[data-section="storeAs"]')||nav.querySelector('[data-section="storeX"]');
var h='<div class="sidebar-item" data-section="pointsStore" onclick="window.showSection(\'pointsStore\')"><span class="sidebar-item-icon">🏆</span><span class="sidebar-item-label">متجر تبديل النقاط</span></div>';
if(anchor)anchor.insertAdjacentHTML('afterend',h);else nav.insertAdjacentHTML('beforeend',h);
}
if(typeof window.showSection==='function'&&!window.__psHook){window.__psHook=1;var os=window.showSection;window.showSection=function(id){var r=os.apply(this,arguments);if(id==='pointsStore')setTimeout(window.psRender,120);return r;};}
}
window.psRender();
}
window.psRender=function(){
try{
var sec=document.getElementById('section-pointsStore');if(!sec)return;
var s=store();cacheStore(s);
var badge=document.getElementById('psEnabledBadge');var btn=document.getElementById('psToggleBtn');
if(badge)badge.innerHTML=(s.enabled!==false)?'<span class="badge badge-success">مفعّل للطلاب</span>':'<span class="badge badge-danger">موقوف</span>';
if(btn){btn.textContent=(s.enabled!==false)?'إيقاف المتجر':'تفعيل المتجر';btn.onclick=function(){var d=db2();d.gamification.store.enabled=(s.enabled===false);save2(d);cacheStore(d.gamification.store);window.psRender();};}
document.getElementById('psItems').innerHTML=(s.items||[]).length?(s.items||[]).map(function(i){
return '<div class="card" style="margin:0;padding:12px;text-align:center;">'+(i.imageUrl?'<img src="'+i.imageUrl+'" style="width:100%;height:90px;object-fit:cover;border-radius:10px;margin-bottom:8px;" onerror="this.style.display=\'none\'">':'<div style="height:90px;display:flex;align-items:center;justify-content:center;font-size:34px;background:var(--surface-hover);border-radius:10px;margin-bottom:8px;">'+(i.icon||'🎁')+'</div>')+
'<strong style="font-size:13px;">'+i.name+'</strong><div class="text-xs text-muted" style="margin:4px 0;">'+(i.cost||0)+' نقطة · مخزون '+(i.stock!=null?i.stock:'∞')+'</div>'+(i.active===false?'<span class="badge badge-muted">موقوف</span>':'')+
'<div style="display:flex;gap:4px;justify-content:center;margin-top:8px;"><button class="btn btn-ghost btn-sm" onclick="window.psOpenItem(\''+i.id+'\')">✏️</button><button class="btn btn-'+(i.active===false?'success':'danger')+' btn-sm" onclick="window.psToggleItem(\''+i.id+'\')">'+(i.active===false?'تفعيل':'إيقاف')+'</button><button class="btn btn-danger btn-sm" onclick="window.psDelItem(\''+i.id+'\')">🗑</button></div></div>';
}).join(''):'<div class="card" style="grid-column:1/-1;text-align:center;padding:24px;"><div style="font-size:44px;">🏆</div><strong>مفيش منتجات نقاط</strong><div class="text-xs text-muted">دوس "➕ منتج نقاط" علشان الطلاب تلاقي حاجة تستبدلها</div></div>';
var d=db2();var orders=[];
['storeOrders','purchases','orders'].forEach(function(k){(d[k]||[]).forEach(function(o){if(o.cost||o.points||o.type==='points')orders.push(Object.assign({__src:k},o));});});
orders.sort(function(a,b){return String(b.at||b.createdAt||'').localeCompare(String(a.at||a.createdAt||''));});
document.getElementById('psOrders').innerHTML=orders.length?orders.slice(0,40).map(function(o){
var st2=DataService.getUserById?DataService.getUserById(o.studentId):null;
return '<div class="sub-row" style="padding:8px;"><div style="flex:1;"><strong>'+(st2?st2.name:'-')+'</strong> <span class="badge badge-primary">🏆 '+(o.cost||o.points||0)+' نقطة</span><div class="text-xs text-muted">'+(o.itemName||'')+' · '+new Date(o.at||o.createdAt||Date.now()).toLocaleDateString('ar-EG')+'</div></div><div style="display:flex;gap:4px;align-items:center;"><span class="badge '+(o.status==='delivered'?'badge-success':o.status==='cancelled'?'badge-danger':'badge-warning')+'">'+(o.status||'جديد')+'</span>'+(o.status!=='delivered'&&o.status!=='cancelled'?'<button class="btn btn-success btn-sm" onclick="window.psOrder(\''+o.__src+'\',\''+o.id+'\',\'delivered\')">✓ تسليم</button>':'')+(o.status!=='cancelled'?'<button class="btn btn-danger btn-sm" onclick="window.psOrder(\''+o.__src+'\',\''+o.id+'\',\'cancelled\')">✗</button>':'')+'</div></div>';
}).join(''):'<p class="text-muted" style="text-align:center;padding:14px;">مفيش استبدالات بعد</p>';
}catch(e){console.error(e);}
};
window.psToggleItem=function(id){var d=db2();var i=(d.gamification.store.items||[]).find(function(x){return x.id===id;});if(!i)return;i.active=(i.active===false);save2(d);cacheStore(d.gamification.store);window.psRender();};
window.psDelItem=function(id){if(!confirm('حذف المنتج؟'))return;var d=db2();d.gamification.store.items=(d.gamification.store.items||[]).filter(function(x){return x.id!==id;});save2(d);cacheStore(d.gamification.store);window.psRender();};
window.psOrder=function(src,id,status){var d=db2();var o=(d[src]||[]).find(function(x){return x.id===id;});if(!o)return;o.status=status;if(status==='delivered')o.deliveredAt=new Date().toISOString();save2(d);window.psRender();};
window.psOpenItem=function(editId){
var d=db2();var s=d.gamification.store;var i=editId?(s.items||[]).find(function(x){return x.id===editId;}):null;
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🏆 '+(i?'تعديل':'إضافة')+' منتج نقاط</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
'<div class="form-group"><label>الاسم *</label><input type="text" id="psName" class="form-input" value="'+(i?i.name:'')+'"></div>'+
'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div class="form-group"><label>التكلفة بالنقاط *</label><input type="number" id="psCost" class="form-input" value="'+(i?i.cost:50)+'" min="1"></div><div class="form-group"><label>المخزون</label><input type="number" id="psStock" class="form-input" value="'+((i&&i.stock!=null)?i.stock:99)+'" min="0"></div></div>'+
'<div class="form-group"><label>أيقونة</label><input type="text" id="psIcon" class="form-input" value="'+(i?(i.icon||''):'🎁')+'"></div>'+
'<div class="form-group"><label>🔗 صورة (اختياري)</label><input type="text" id="psImg" class="form-input" value="'+(i?(i.imageUrl||''):'')+'"></div>'+
'<button class="btn btn-primary w-full" onclick="window.psSave(\''+(editId||'')+'\')">💾 حفظ</button></div>','modal-sm');
};
window.psSave=function(editId){
var d=db2();var s=d.gamification.store;
var name=(document.getElementById('psName')||{}).value||'';
if(!name){alert('اكتب الاسم');return;}
var i=editId?(s.items||[]).find(function(x){return x.id===editId;}):null;
if(!i){i={id:'pit_'+Date.now()};s.items.push(i);}
i.name=name;i.cost=parseInt((document.getElementById('psCost')||{}).value)||1;i.stock=parseInt((document.getElementById('psStock')||{}).value)||99;i.icon=(document.getElementById('psIcon')||{}).value||'🎁';i.imageUrl=(document.getElementById('psImg')||{}).value||'';if(i.active===undefined)i.active=true;
save2(d);cacheStore(s);ThemeManager.closeModal();window.psRender();
};
buildSection();setTimeout(buildSection,1000);setTimeout(buildSection,2500);setInterval(buildSection,8000);
/* ❄️ بانر التجميد الكلي في كل الشاشات */
setInterval(function(){
try{
var f=(db2().platformMeta||{}).freeze||{};
var b=document.getElementById('fullFreezeBanner');
if(f.full===true&&!b){b=document.createElement('div');b.id='fullFreezeBanner';b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99998;background:linear-gradient(90deg,#0ea5e9,#6366f1);color:#fff;text-align:center;padding:8px;font-weight:900;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.35);';b.textContent='❄️ المنصة في وضع الإجازة — كل الحسابات والنقاط والإشعارات متوقفة مؤقتاً';document.body.appendChild(b);}
if(f.full!==true&&b){b.remove();}
}catch(e){}
},3000);
})();