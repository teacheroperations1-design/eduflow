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