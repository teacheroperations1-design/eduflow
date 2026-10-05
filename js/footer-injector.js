// js/footer-injector.js
(function() {
  'use strict';
  
  /* 🔔 تحميل notify-service تلقائياً لو مش موجود في الصفحة */
  (function(){
    try {
      if (!window.__notifyServiceLoaded) {
        var s = document.createElement('script');
        s.src = 'js/notify-service.js';
        s.onload = function(){ window.__notifyServiceLoaded = true; };
        document.head.appendChild(s);
      }
    } catch(e) {}
  })();

  window.injectUnifiedFooter = async function() {
    try {
      if (document.querySelector('.unified-footer')) return; // منع التكرار
      
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
              جميع الحقوق محفوظة © ${new Date().getFullYear()} Habbash Group
            </p>
            <div style="display: flex; justify-content: center; gap: 16px; margin-top: 12px;">
              ${branding.facebookLink ? `<a href="${branding.facebookLink}" target="_blank" style="color: var(--text-secondary); text-decoration: none; font-weight: 600;">فيسبوك</a>` : ''}
              <a href="about.html" style="color: var(--primary); text-decoration: none; font-weight: 700;">من نحن</a>
            </div>
          </div>
        </footer>
      `;
      
      document.body.insertAdjacentHTML('beforeend', footerHTML);
      document.body.style.paddingBottom = '20px';
      
    } catch (e) {
      console.warn('Footer injection failed:', e);
    }
  };

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
try{var b=(window.DataService&&DataService._getData)?(DataService._getData().branding||{}):{};if(b.logoUrl)return b.logoUrl; if(b.logo)return b.logo;}catch(e){}
try{var s=localStorage.getItem('eduflow_brand_logo');if(s)return s;}catch(e){}
try{var s=localStorage.getItem('eduflow_branding');if(s){var p=JSON.parse(s);if(p.logoUrl)return p.logoUrl;}}catch(e){}
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
function save2(d){if(DataService&&DataService._saveData)DataService._saveData(d);}
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
orders.sort(function(a,b){return String(b.at||b.createdAt||b.purchasedAt||'').localeCompare(String(a.at||a.createdAt||a.purchasedAt||''));});
document.getElementById('psOrders').innerHTML=orders.length?orders.slice(0,40).map(function(o){
var st2=DataService.getUserById?DataService.getUserById(o.studentId):null;
return '<div class="sub-row" style="padding:8px;"><div style="flex:1;"><strong>'+(st2?st2.name:'-')+'</strong> <span class="badge badge-primary">🏆 '+(o.cost||o.points||0)+' نقطة</span><div class="text-xs text-muted">'+(o.itemName||'')+' · '+new Date(o.at||o.createdAt||o.purchasedAt||Date.now()).toLocaleDateString('ar-EG')+'</div></div><div style="display:flex;gap:4px;align-items:center;"><span class="badge '+(o.status==='delivered'||o.status==='fulfilled'?'badge-success':o.status==='cancelled'?'badge-danger':'badge-warning')+'">'+(o.status||'جديد')+'</span>'+(o.status!=='delivered'&&o.status!=='fulfilled'&&o.status!=='cancelled'?'<button class="btn btn-success btn-sm" onclick="window.psOrder(\''+o.__src+'\',\''+o.id+'\',\'delivered\')">✓ تسليم</button>':'')+(o.status!=='cancelled'?'<button class="btn btn-danger btn-sm" onclick="window.psOrder(\''+o.__src+'\',\''+o.id+'\',\'cancelled\')">✗</button>':'')+'</div></div>';
}).join(''):'<p class="text-muted" style="text-align:center;padding:14px;">مفيش استبدالات بعد</p>';
}catch(e){console.error(e);}
};
window.psToggleItem=function(id){var d=db2();var i=(d.gamification.store.items||[]).find(function(x){return x.id===id;});if(!i)return;i.active=(i.active===false);save2(d);cacheStore(d.gamification.store);window.psRender();};
window.psDelItem=function(id){if(!confirm('حذف المنتج؟'))return;var d=db2();d.gamification.store.items=(d.gamification.store.items||[]).filter(function(x){return x.id!==id;});save2(d);cacheStore(d.gamification.store);window.psRender();};
window.psOrder=function(src,id,status){var d=db2();var o=(d[src]||[]).find(function(x){return x.id===id;});if(!o)return;o.status=status;if(status==='delivered'||status==='fulfilled')o.deliveredAt=new Date().toISOString();save2(d);window.psRender();};
window.psOpenItem=function(editId){
var d=db2();var s=d.gamification.store;var i=editId?(s.items||[]).find(function(x){return x.id===editId;}):null;
if(typeof ThemeManager === 'undefined' || !ThemeManager.openModal) return;
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
if(!name){if(window.safeToast)window.safeToast('اكتب الاسم','error');return;}
var i=editId?(s.items||[]).find(function(x){return x.id===editId;}):null;
if(!i){i={id:'pit_'+Date.now()};s.items.push(i);}
i.name=name;i.cost=parseInt((document.getElementById('psCost')||{}).value)||1;i.stock=parseInt((document.getElementById('psStock')||{}).value)||99;i.icon=(document.getElementById('psIcon')||{}).value||'🎁';i.imageUrl=(document.getElementById('psImg')||{}).value||'';if(i.active===undefined)i.active=true;
save2(d);cacheStore(s);if(typeof ThemeManager!=='undefined')ThemeManager.closeModal();window.psRender();
};
buildSection();setTimeout(buildSection,1000);setTimeout(buildSection,2500);setInterval(buildSection,8000);
setInterval(function(){
try{
var f=(db2().platformMeta||{}).freeze||{};
var b=document.getElementById('fullFreezeBanner');
if(f.full===true&&!b){b=document.createElement('div');b.id='fullFreezeBanner';b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99998;background:linear-gradient(90deg,#0ea5e9,#6366f1);color:#fff;text-align:center;padding:8px;font-weight:900;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.35);';b.textContent='❄️ المنصة في وضع الإجازة — كل الحسابات والنقاط والإشعارات متوقفة مؤقتاً';document.body.appendChild(b);}
if(f.full!==true&&b){b.remove();}
}catch(e){}
},3000);
})();

/* ============ 🎁 الصندوق العائم — بيقرأ إعداداته من الأدمن/المساعد بالظبط ============ */
(function(){
function cfgBox(){
try{
var d=(window.DataService&&DataService._getData)?DataService._getData():{};
var g=d.gamification||{};
var c=g.floatBox;
if(!c||Object.keys(c).length===0){
var lb=g.lootbox||{};
c={enabled:lb.enabled!==false,minPts:lb.pointsMin||1,maxPts:lb.pointsMax||5,startHour:parseInt((lb.openHour||'17:00').split(':')[0])||17,endHour:23,showSec:20,everyMin:45,days:[]};
}
if(!c.days)c.days=[];
return c;
}catch(e){}
return {enabled:true,minPts:1,maxPts:5,startHour:16,endHour:23,showSec:20,everyMin:45,days:[]};
}
function isStudent(){var u=(window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():(typeof currentUser!=='undefined'?currentUser:null);return u&&u.role==='student';}
function inWindow(c){
var now=new Date();
var DAYEN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
if(c.days&&c.days.length&&c.days.indexOf(DAYEN[now.getDay()])<0) return false;
var h=now.getHours();
if((c.startHour||0)<=(c.endHour||23))return h>=(c.startHour||0)&&h<(c.endHour||23);
return h>=(c.startHour||0)||h<(c.endHour||23);
}
function lastClaim(){try{return parseInt(localStorage.getItem('floatBoxLast')||'0');}catch(e){return 0;}}
function showBox(){
if(document.getElementById('floatGiftBox'))return;
var c=cfgBox();
if(c.enabled===false)return;
if(!inWindow(c))return;
if(Date.now()-lastClaim()<((c.everyMin||45)*60000))return;
var b=document.createElement('button');b.id='floatGiftBox';b.type='button';
b.style.cssText='position:fixed;bottom:90px;inset-inline-start:14px;z-index:9999;width:64px;height:64px;border-radius:50%;border:none;background:linear-gradient(135deg,#f59e0b,#ef4444);font-size:30px;cursor:pointer;box-shadow:0 10px 30px rgba(239,68,68,.5);animation:ustPulse 1.6s infinite;';
b.textContent='🎁';
b.title='افتح الهدية!';
b.onclick=function(){
var mn=c.minPts||1,mx=c.maxPts||5;if(mx<mn)mx=mn;
var pts=Math.floor(Math.random()*(mx-mn+1))+mn;
var u=(window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():currentUser;
try{if(typeof Ops!=='undefined'&&Ops.addManualPoints&&u)Ops.addManualPoints(u.id,pts,'🎁 الصندوق العائم',u.id);}catch(e){}
try{localStorage.setItem('floatBoxLast',String(Date.now()));}catch(e){}
if(window.safeToast)window.safeToast('🎁 مبروك! +'+pts+' نقطة','success');
b.remove();
};
document.body.appendChild(b);
setTimeout(function(){var x=document.getElementById('floatGiftBox');if(x)x.remove();},(c.showSec||20)*1000);
}
setInterval(function(){try{if(isStudent())showBox();}catch(e){}},15000);
})();

/* ============ 🧹 قاتل الصندوق العائم القديم (أي 🎁 ثابت مش بتاعنا) ============ */
setInterval(function(){
try{
document.querySelectorAll('body *').forEach(function(el){
if(el.id==='floatGiftBox')return;
if(el.closest&&el.closest('#floatGiftBox'))return;
var st=window.getComputedStyle?getComputedStyle(el):null;
if(!st||st.position!=='fixed')return;
var tx=(el.textContent||'');
if(tx.indexOf('🎁')>=0&&tx.trim().length<=4)el.remove();
});
}catch(e){}
},5000);

/* ================================================================
⚔️ BATTLES V2 — محرك المعارك الموحّد (طالب + مساعد)
================================================================ */
(function(){
"use strict";
function dbx(){ try{ return (window.DataService&&DataService._getData)?DataService._getData():{}; }catch(e){ return {}; } }
function cur(){ try{ return (window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null; }catch(e){ return null; } }
function pts(sid,basis){ try{ return (window.Ops&&Ops.getStudentPoints)?(Ops.getStudentPoints(sid,null,basis||'all')||0):0; }catch(e){ return 0; } }
function myGroupIds(){ try{ var u=cur(); if(!u) return []; return (DataService.getStudentTeachers?DataService.getStudentTeachers(u.id):[]).map(function(t){return t.group&&t.group.id;}).filter(Boolean); }catch(e){ return []; } }
window.BT_SURGE_TH=25;
window.BT={
  basisLabel:function(b){ return {all:'كل النقاط',month:'نقاط الشهر',week:'نقاط الأسبوع',battle:'⏱️ فترة المعركة فقط'}[b||'all']||'كل النقاط'; },
pointsInWindow:function(sid,b){
  try{
    var startMs=b&&(b.startAt||b.createdAt||b.startDate)?new Date(b.startAt||b.createdAt||(b.startDate+'T00:00:00')).getTime():0;
    var endMs=b&&(b.endedAt||b.endDate)?new Date(b.endedAt||(b.endDate+'T23:59:59')).getTime():Date.now();
    if(!startMs) return 0;
    var d=(window.DataService&&DataService._getData)?DataService._getData():{};
    var tot=0;
    (d.manualPoints||[]).forEach(function(m){ if(m.studentId===sid){ var t=new Date(m.awardedAt||m.createdAt||0).getTime(); if(t>=startMs&&t<=endMs) tot+=m.points||0; } });
    (d.interactionPoints||[]).forEach(function(m){ if(m.studentId===sid){ var t=new Date(m.awardedAt||m.createdAt||0).getTime(); if(t>=startMs&&t<=endMs) tot+=m.points||0; } });
    (d.attendance||[]).forEach(function(a){ if(a.status==='approved'){ var t=new Date((a.date||'')+'T00:00:00').getTime(); if(t>=startMs&&t<=endMs)(a.records||[]).forEach(function(r){ if(r.studentId===sid&&r.status==='present') tot+=1; }); } });
    return tot;
  }catch(e){ return 0; }
},
  isActive:function(b){ if(!b||b.status!=='active') return false; if(b.endDate){ var e=new Date(b.endDate+'T23:59:59'); if(new Date()>e) return false; } if(b.startDate){ var s=new Date(b.startDate+'T00:00:00'); if(new Date()<s) return false; } return true; },
  teamScore:function(b,teamId){
  var basis=(b&&b.scoreBasis)||'all';
  try{
    var t=0;
    var sts=(DataService.getStudentsByGroup?DataService.getStudentsByGroup(teamId):[]);
    if(basis==='battle'){ sts.forEach(function(s){ t+=BT.pointsInWindow(s.id,b); }); return t; }
    sts.forEach(function(s){ t+=pts(s.id,basis); });
    return t;
  }catch(e){ return 0; }
},
  timeLeft:function(b){ if(!b||!b.endDate) return ''; var ms=new Date(b.endDate+'T23:59:59')-new Date(); if(ms<=0) return 'انتهت'; var d=Math.floor(ms/86400000),h=Math.floor(ms/3600000)%24,m=Math.floor(ms/60000)%60; return (d?d+' يوم ':'')+h+' س '+m+' د'; }
};
if(!document.getElementById('btCss')){
  var st=document.createElement('style'); st.id='btCss';
  st.textContent=
  '@keyframes btSwordL{0%,100%{transform:translateX(-6px) rotate(-24deg)}50%{transform:translateX(10px) rotate(6deg)}}'+
  '@keyframes btSwordR{0%,100%{transform:translateX(6px) rotate(24deg) scaleX(-1)}50%{transform:translateX(-10px) rotate(-6deg) scaleX(-1)}}'+
  '@keyframes btSpark{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:1;transform:scale(1.4) rotate(180deg)}}'+
  '@keyframes btSurge{0%{box-shadow:0 0 0 0 rgba(245,158,11,.75);transform:scale(1)}40%{transform:scale(1.05)}100%{box-shadow:0 0 0 26px rgba(245,158,11,0);transform:scale(1)}}'+
  '@keyframes btCrown{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-4px) rotate(8deg)}}'+
  '.bt-card{background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(236,72,153,.10));border:2px solid var(--primary-border,#6366f1);border-radius:18px;padding:16px;margin-bottom:14px;position:relative;overflow:hidden;}'+
  '.bt-card.live{border-color:var(--success,#16a34a);}'+
  '.bt-vs{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:stretch;}'+
  '.bt-team{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px;text-align:center;position:relative;}'+
  '.bt-team.leading{border-color:#f59e0b;background:linear-gradient(135deg,rgba(245,158,11,.10),transparent);}'+
  '.bt-team.surge{animation:btSurge 1.6s ease-out 2;}'+
  '.bt-score{font-size:30px;font-weight:900;font-family:var(--font-en);color:var(--primary);line-height:1;margin:4px 0;}'+
  '.bt-crown{position:absolute;top:-2px;right:8px;font-size:20px;animation:btCrown 1.8s infinite;}'+
  '.bt-swords{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:60px;position:relative;}'+
  '.bt-swords .sw{font-size:28px;display:block;}'+
  '.bt-swords .sw.l{animation:btSwordL 1.1s infinite ease-in-out;}'+
  '.bt-swords .sw.r{animation:btSwordR 1.1s infinite ease-in-out;}'+
  '.bt-swords .sp{position:absolute;top:42%;left:40%;font-size:16px;animation:btSpark 1.1s infinite;}'+
  '.bt-bar{height:8px;border-radius:999px;background:var(--surface-hover);overflow:hidden;margin-top:8px;}'+
  '.bt-bar>div{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--primary),var(--accent));transition:width .8s;}'+
  '.bt-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;}';
  document.head.appendChild(st);
}
function checkSurge(b,s1,s2){
  try{
    var key='btPrev_'+b.id, prev=null;
    try{ prev=JSON.parse(localStorage.getItem(key)||'null'); }catch(e){}
    var surge=0, TH=window.BT_SURGE_TH||25;
    if(prev){ if(s1-(prev.s1||0)>=TH) surge=1; else if(s2-(prev.s2||0)>=TH) surge=2; }
    localStorage.setItem(key,JSON.stringify({s1:s1,s2:s2,t:Date.now()}));
    return surge;
  }catch(e){ return 0; }
}
window.renderBattleCard=function(b,meGroupId){
  if(!b||!window.BT) return '';
  var G=(DataService.getGroups?DataService.getGroups():[]);
  var g1=G.find(function(x){return x.id===b.team1;}), g2=G.find(function(x){return x.id===b.team2;});
  var s1=BT.teamScore(b,b.team1), s2=BT.teamScore(b,b.team2);
  var live=BT.isActive(b);
  var surge=live?checkSurge(b,s1,s2):0;
  var total=Math.max(1,s1+s2), p1=Math.round(s1/total*100), p2=100-p1;
  var lead=(s1===s2)?0:(s1>s2?1:2);
  var meIn=meGroupId?(b.team1===meGroupId?1:(b.team2===meGroupId?2:0)):0;
  var h='<div class="bt-card '+(live?'live':'')+'" data-battle="'+b.id+'">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;"><strong style="font-size:14px;">⚔️ '+(b.title||'معركة المجموعات')+'</strong><span class="bt-badge" style="background:'+(live?'rgba(34,197,94,.15)':'var(--surface-hover)')+';color:'+(live?'var(--success,#16a34a)':'var(--text-muted)')+';">'+(live?'🔥 جارية الآن':'🏁 انتهت')+'</span></div>';
  h+='<div class="bt-vs">';
  h+='<div class="bt-team '+(lead===1?'leading':'')+(surge===1?' surge':'')+'">'+(lead===1?'<span class="bt-crown">👑</span>':'')+'<div style="font-weight:800;font-size:13px;">'+(g1?g1.name:'مجموعة 1')+(meIn===1?' <span class="bt-badge" style="background:var(--primary-bg);color:var(--primary);">مجموعتك</span>':'')+'</div><div class="bt-score">'+s1+'</div><div class="text-xs text-muted">نقطة</div>'+(surge===1?'<div class="bt-badge" style="background:rgba(245,158,11,.15);color:#d97706;margin-top:6px;">🚀 قفزة نقاط!</div>':'')+'<div class="bt-bar"><div style="width:'+p1+'%"></div></div></div>';
  h+='<div class="bt-swords">'+(live?'<span class="sw l">🗡️</span><span class="sp">✨</span><span class="sw r">🗡️</span>':'<span style="font-size:26px;">🏁</span>')+'</div>';
  h+='<div class="bt-team '+(lead===2?'leading':'')+(surge===2?' surge':'')+'">'+(lead===2?'<span class="bt-crown">👑</span>':'')+'<div style="font-weight:800;font-size:13px;">'+(g2?g2.name:'مجموعة 2')+(meIn===2?' <span class="bt-badge" style="background:var(--primary-bg);color:var(--primary);">مجموعتك</span>':'')+'</div><div class="bt-score">'+s2+'</div><div class="text-xs text-muted">نقطة</div>'+(surge===2?'<div class="bt-badge" style="background:rgba(245,158,11,.15);color:#d97706;margin-top:6px;">🚀 قفزة نقاط!</div>':'')+'<div class="bt-bar"><div style="width:'+p2+'%"></div></div></div>';
  h+='</div>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;margin-top:10px;font-size:11px;color:var(--text-muted);"><span>🎯 الأساس: '+BT.basisLabel(b.scoreBasis)+'</span><span>🎁 مكافأة الفوز: '+(b.reward||50)+' نقطة لكل طالب</span>'+(live&&b.endDate?'<span>⏳ باقي: '+BT.timeLeft(b)+'</span>':'')+(!live&&b.winnerName?'<span>🏆 الفائز: '+b.winnerName+'</span>':'')+'</div>';
  h+='</div>';
  return h;
};
window.btMountStudent=function(){
  try{
    var u=cur(); if(!u||u.role!=='student'||!window.BT) return;
    var gids=myGroupIds();
    var list=(dbx().battles||[]).filter(function(b){ return gids.indexOf(b.team1)>=0||gids.indexOf(b.team2)>=0; });
    if(!list.length){ var old=document.getElementById('myBattlesHost'); if(old) old.innerHTML=''; return; }
    var host=document.getElementById('myBattlesHost');
    if(!host){
      host=document.createElement('div'); host.id='myBattlesHost';
      var anchor=document.getElementById('myCycleCard');
      if(anchor&&anchor.parentNode) anchor.parentNode.insertBefore(host,anchor.nextSibling);
      else { var sec=document.getElementById('section-dashboard'); if(sec) sec.appendChild(host); else return; }
    }
    var active=list.filter(function(b){return BT.isActive(b);});
    var done=list.filter(function(b){return !BT.isActive(b);}).slice(0,1);
    var html='';
    if(active.length){ html+='<h3 style="margin:16px 0 12px;">⚔️ معارك جارية الآن</h3>'; active.forEach(function(b){ html+=window.renderBattleCard(b, (gids.indexOf(b.team1)>=0?b.team1:b.team2)); }); }
    done.forEach(function(b){ html+=window.renderBattleCard(b,null); });
    host.innerHTML=html;
    if(active.length&&!window.__btToastDone){
      window.__btToastDone=1;
      var b0=active[0], G=(DataService.getGroups?DataService.getGroups():[]);
      var n1=(G.find(function(x){return x.id===b0.team1;})||{}).name||'', n2=(G.find(function(x){return x.id===b0.team2;})||{}).name||'';
      if(window.safeToast) window.safeToast('⚔️ معركة جارية: '+n1+' ضد '+n2+' — كل نقطة بتجمعها بترفع مجموعتك!','info');
    }
  }catch(e){ console.error('btMountStudent',e); }
};
setTimeout(function(){ try{window.btMountStudent();}catch(e){} },1500);
setInterval(function(){ try{window.btMountStudent();}catch(e){} },30000);
if(typeof window.showSection==='function'&&!window.__btMountHook){
  window.__btMountHook=1;
  var _os=window.showSection;
  window.showSection=function(id){ var r=_os.apply(this,arguments); if(id==='dashboard') setTimeout(function(){ try{window.btMountStudent();}catch(e){} },200); return r; };
}
/* ============ 👨‍ صورة وبيانات الأستاذ داخل كروت الدورات — نسخة ثابتة ضد إعادة الرسم ============ */
(function(){
var DAYS={Sunday:'الأحد',Monday:'الإثنين',Tuesday:'الثلاثاء',Wednesday:'الأربعاء',Thursday:'الخميس',Friday:'الجمعة',Saturday:'السبت'};
function buildRow(g,t){
  var photo=(t&&t.photoUrl)?(window.driveThumb?driveThumb(t.photoUrl):t.photoUrl):'';
  var sched=(g.schedules&&g.schedules.length)?g.schedules.map(function(s){return DAYS[s.day]||s.day;}).join(' + '):(DAYS[g.day]||g.day||'-');
  var row=document.createElement('div'); row.className='btTeacherRow';
  row.style.cssText='display:flex;gap:8px;align-items:center;margin-bottom:10px;padding:6px 10px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);border-radius:12px;font-size:11px;';
  row.innerHTML=(photo?'<img src="'+photo+'" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.7);" onerror="this.style.display=\'none\'">':'<div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-weight:900;">'+((t&&t.name||'؟').charAt(0))+'</div>')+
  '<div style="flex:1;min-width:0;"><b>👨‍ '+(t?t.name:'-')+'</b><div style="opacity:.9;">📅 '+sched+' · 🏢 '+(g.center||'-')+'</div></div>';
  return row;
}
function run(){
  try{
    var u=(window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null;
    if(!u||u.role!=='student') return;
    var host=document.getElementById('myCycleCard'); if(!host) return;
    var groups=(DataService.getGroups?DataService.getGroups():[]);
    host.querySelectorAll('.cycle-card,.card').forEach(function(card){
      if(card.querySelector('.btTeacherRow')) return;
      var txt=card.textContent||'';
      var g=null;
      for(var i=0;i<groups.length;i++){ if(groups[i].name&&txt.indexOf(groups[i].name)>=0){ g=groups[i]; break; } }
      if(!g) return;
      var t=g.teacherId?(DataService.getUserById?DataService.getUserById(g.teacherId):null):null;
      card.insertBefore(buildRow(g,t),card.firstChild);
    });
  }catch(e){}
}
/* 👁️ مراقب: أي لحظة يتغير فيها محتوى الكروت — الحقن يرجع قبل الرسم (فلاش معدوم) */
var obs=null, watchedHost=null;
function watch(){
  var host=document.getElementById('myCycleCard');
  if(!host) return;
  if(host===watchedHost&&obs) return;
  if(obs){ try{ obs.disconnect(); }catch(e){} obs=null; }
  watchedHost=host;
  if(typeof MutationObserver!=='undefined'){
    obs=new MutationObserver(function(){ run(); });
    obs.observe(host,{childList:true,subtree:true});
  }
  run();
}
watch(); setTimeout(watch,800); setTimeout(watch,2000);
/* احتياطي أمان: لو الحاوية نفسها اتبدلت أو المراقب وقف */
setInterval(function(){ watch(); run(); },3000);
})();
})();