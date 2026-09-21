/* ================================================================
🗓️ Schedule Board V2 — جدول الأساتذة الأسبوعي (سحب وإفلات)
مشترك بين داشبورد الأدمن وداشبورد الأستاذ
إضافات V2:
 • الأسبوع يبدأ من السبت
 • لون ثابت لكل مجموعة (كل مواعيد نفس المجموعة بنفس اللون)
 • فلاتر كاملة: أستاذ / مجموعة / سنتر + طريقة عرض + ترتيب + بداية اليوم
 • 4 طرق عرض: أسبوعي / شهري / خط زمني / بطاقات
 • ضغط على خانة فاضية = إضافة مجموعة باليوم والوقت متعبئين
 • طباعة / تحميل بهوية المنصة (لوجو + اسم المنصة + اسم الأستاذ)
 • حقن عنصر القائمة الجانبية + توصيل showSection تلقائياً
================================================================ */
window.SB = window.SB || {};

/* ⚠️ الأسبوع يبدأ من السبت */
SB.DAYS = [
{en:'Saturday',ar:'السبت'},{en:'Sunday',ar:'الأحد'},{en:'Monday',ar:'الإثنين'},
{en:'Tuesday',ar:'الثلاثاء'},{en:'Wednesday',ar:'الأربعاء'},{en:'Thursday',ar:'الخميس'},
{en:'Friday',ar:'الجمعة'}];

/* CSS حقن مرة واحدة */
(function(){
if(document.getElementById('sbCss')) return;
var st=document.createElement('style'); st.id='sbCss';
st.textContent=
'.sb-wrap{overflow-x:auto;}'+
'.sb-grid{display:grid;min-width:980px;}'+
'.sb-dayhead{text-align:center;font-weight:800;font-size:12px;padding:8px 4px;background:var(--surface-hover);border:1px solid var(--border);}'+
'.sb-dayhead.today{background:var(--primary-bg);color:var(--primary);}'+
'.sb-times{border:1px solid var(--border);border-top:none;}'+
'.sb-hour{border-bottom:1px dashed var(--border);font-size:10px;color:var(--text-muted);padding:2px 4px;font-family:var(--font-en);}'+
'.sb-col{position:relative;border:1px solid var(--border);border-top:none;border-left:none;background:var(--surface);}'+
'.sb-col.droppable{background:var(--primary-bg);outline:2px dashed var(--primary);outline-offset:-3px;}'+
'.sb-line{position:absolute;left:0;right:0;border-bottom:1px dashed var(--border);pointer-events:none;}'+
'.sb-card{position:absolute;left:4px;right:4px;border-radius:8px;border:1px solid var(--border);border-right:4px solid var(--primary);background:var(--surface-hover);padding:4px 6px;overflow:hidden;cursor:grab;box-shadow:0 1px 3px rgba(0,0,0,.15);}'+
'.sb-card:active{cursor:grabbing;}'+
'.sb-card.dragging{opacity:.35;}'+
'.sb-card-name{font-weight:800;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'+
'.sb-card-time{font-size:10px;font-family:var(--font-en);color:var(--primary);font-weight:700;}'+
'.sb-card-sub{font-size:9px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'+
'.sb-legend{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;font-size:11px;}'+
'.sb-legend span{display:inline-flex;align-items:center;gap:5px;}'+
'.sbm-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;}'+
'.sbm-cell{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px;min-height:80px;font-size:10px;overflow:hidden;cursor:copy;}'+
'.sbm-cell.empty{background:transparent;border-style:dashed;}'+
'.sbm-cell.today{border-color:var(--primary);box-shadow:0 0 0 2px var(--primary-bg);}'+
'.sbm-item{border-right:3px solid var(--primary);background:var(--surface-hover);border-radius:6px;padding:2px 4px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:grab;}'+
'.sbt-day{margin-bottom:14px;}'+
'.sbt-day.today{background:var(--primary-bg);border-radius:10px;padding:8px;}'+
'.sbt-head{font-weight:800;font-size:12px;margin-bottom:6px;}'+
'.sbt-lane{position:relative;height:34px;background:var(--surface-hover);border-radius:8px;margin-bottom:4px;}'+
'.sbt-bar{position:absolute;top:3px;bottom:3px;border-radius:6px;color:#fff;font-size:10px;display:flex;align-items:center;padding:0 8px;overflow:hidden;white-space:nowrap;cursor:grab;}'+
'.sbc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;}';
document.head.appendChild(st);
})();

function _sbDb(){ return (window.DataService&&DataService._getData)?DataService._getData():{}; }
function _sbSave(d){ if(window.DataService&&DataService._saveData) DataService._saveData(d); }

SB.DAY_IDX=function(en){ for(var i=0;i<SB.DAYS.length;i++) if(SB.DAYS[i].en===en) return i; return 0; };
SB.DAY_AR=function(en){ var d=SB.DAYS[SB.DAY_IDX(en)]; return d?d.ar:en; };
SB.fmt12=function(t){
if(!t) return '';
if(window.DataService&&DataService.formatTime12) return DataService.formatTime12(t);
var p=String(t).split(':'); var h=parseInt(p[0],10)||0; var m=p[1]||'00';
var ap=h>=12?'م':'ص'; h=h%12; if(h===0)h=12;
return h+':'+m+' '+ap;
};
SB.min=function(t){ var p=String(t||'0:00').split(':'); return (parseInt(p[0],10)||0)*60+(parseInt(p[1],10)||0); };
SB.hm=function(min){ min=((Math.round(min)%1440)+1440)%1440; var h=Math.floor(min/60), m=min%60; return (h<10?'0':'')+h+':'+(m<10?'0':'')+m; };
SB.schedulesOf=function(g){
if(g&&g.schedules&&g.schedules.length) return g.schedules.map(function(s){return {day:s.day,time:s.time};});
if(g&&g.day) return [{day:g.day,time:g.time||'10:00'}];
return [];
};
SB.teacherName=function(tid){ var t=(DataService.getUserById)?DataService.getUserById(tid):null; return (t&&t.name)||'أستاذ'; };
SB.teacherColor=function(tid){
var palette=['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#0ea5e9','#ec4899','#14b8a6','#f97316','#84cc16'];
var ts=(DataService.getTeachers)?DataService.getTeachers():[];
var idx=-1; for(var i=0;i<ts.length;i++) if(ts[i].id===tid){idx=i;break;}
if(idx<0) idx=0;
return palette[idx%palette.length];
};
/* 🆕 لون ثابت لكل مجموعة: كل مواعيد نفس المجموعة بنفس اللون */
SB.groupColor=function(gid){
var palette=['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#0ea5e9','#ec4899','#14b8a6','#f97316','#84cc16','#22d3ee','#a3e635','#f43f5e','#0d9488','#d946ef','#0891b2'];
var h=0; gid=String(gid||'');
for(var i=0;i<gid.length;i++){ h=(h*31+gid.charCodeAt(i))>>>0; }
return palette[h%palette.length];
};
SB.groupsInView=function(opts){
var all=(DataService.getGroups)?DataService.getGroups():[];
if(opts.teacherId) all=all.filter(function(g){return g.teacherId===opts.teacherId;});
else if(opts.teacherFilter&&opts.teacherFilter!=='all') all=all.filter(function(g){return g.teacherId===opts.teacherFilter;});
if(opts.groupFilter&&opts.groupFilter!=='all') all=all.filter(function(g){return g.id===opts.groupFilter;});
if(opts.center) all=all.filter(function(g){return (g.center||'')===opts.center;});
var sortBy=opts.sortBy||'time';
if(sortBy==='teacher') all.sort(function(a,b){ return SB.teacherName(a.teacherId).localeCompare(SB.teacherName(b.teacherId),'ar')||SB.min(a.time)-SB.min(b.time); });
else if(sortBy==='center') all.sort(function(a,b){ return (a.center||'').localeCompare(b.center||'','ar')||SB.min(a.time)-SB.min(b.time); });
else if(sortBy==='name') all.sort(function(a,b){ return (a.name||'').localeCompare(b.name||'','ar'); });
else all.sort(function(a,b){ return (SB.DAY_IDX(a.day)*1440+SB.min(a.time))-(SB.DAY_IDX(b.day)*1440+SB.min(b.time)); });
return all;
};

/* ---------------- عرض الجدول الأسبوعي (يبدأ السبت) ---------------- */
SB.render=function(opts){
var container=document.getElementById(opts.container); if(!container) return;
SB.opts=opts;
var H=56;
var groups=SB.groupsInView(opts);
var startHour=opts.startHour||8;
var starts=[],ends=[];
groups.forEach(function(g){ SB.schedulesOf(g).forEach(function(s){ var m=SB.min(s.time); var dur=parseInt(g.duration)||60; starts.push(m); ends.push(m+dur); }); });
var minH=startHour, maxH=23;
if(starts.length){ minH=Math.min(startHour,Math.floor(Math.min.apply(null,starts)/60)); maxH=Math.min(24,Math.ceil(Math.max.apply(null,ends)/60)); }
if(maxH<=minH) maxH=minH+1;
SB.opts._minH=minH;
var colH=(maxH-minH)*H; var dayStart=minH*60;
var todayEn=SB.DAYS[new Date().getDay()].en;

/* легенда: لون لكل مجموعة (أول 12 مجموعة) */
var legend='<div class="sb-legend">'+groups.slice(0,12).map(function(g){
return '<span><span class="sb-dot" style="background:'+SB.groupColor(g.id)+';"></span>'+g.name+'</span>';
}).join('')+(groups.length>12?'<span>+'+(groups.length-12)+' أخرى</span>':'')+'</div>';

var html=legend+'<div class="sb-wrap"><div class="sb-grid" style="grid-template-columns:56px repeat(7,1fr);">';
html+='<div class="sb-dayhead" style="background:transparent;border:none;">⏰</div>';
SB.DAYS.forEach(function(d){ html+='<div class="sb-dayhead'+(d.en===todayEn?' today':'')+'">'+d.ar+'</div>'; });
html+='<div class="sb-times">';
for(var h=minH;h<maxH;h++){ html+='<div class="sb-hour" style="height:'+H+'px;">'+SB.fmt12(h+':00')+'</div>'; }
html+='</div>';
SB.DAYS.forEach(function(d){
html+='<div class="sb-col" data-day="'+d.en+'" style="height:'+colH+'px;">';
for(var h2=minH;h2<maxH;h2++){ html+='<div class="sb-line" style="top:'+((h2*60-dayStart)/60*H)+'px;"></div>'; }
groups.forEach(function(g){
var color=SB.groupColor(g.id); /* 🆕 لون المجموعة */
SB.schedulesOf(g).forEach(function(s,si){
if(s.day!==d.en) return;
var m=SB.min(s.time); var dur=parseInt(g.duration)||60;
var top=(m-dayStart)/60*H; var hh=Math.max(34,dur/60*H-4);
html+='<div class="sb-card" draggable="'+(opts.editable?'true':'false')+'" style="top:'+top+'px;height:'+hh+'px;border-right-color:'+color+';" data-gid="'+g.id+'" data-si="'+si+'" data-day="'+d.en+'" data-time="'+s.time+'" title="'+g.name+' — اضغط للتعديل أو اسحب للنقل">'
+'<div class="sb-card-name">'+g.name+'</div>'
+'<div class="sb-card-time" style="color:'+color+';">'+SB.fmt12(s.time)+' - '+SB.fmt12(SB.hm(m+dur))+'</div>'
+(opts.showTeacher?'<div class="sb-card-sub">👨‍ '+SB.teacherName(g.teacherId)+'</div>':'')
+'<div class="sb-card-sub">🏢 '+(g.center||'-')+' · 👥 '+((DataService.getStudentsByGroup)?DataService.getStudentsByGroup(g.id).length:0)+'</div>'
+'</div>';
});
});
html+='</div>';
});
html+='</div></div>';
if(opts.editable) html+='<div class="filter-info" style="margin-top:10px;">💡 اسحب أي مجموعة وأفلتها في اليوم والساعة المناسبين — أو اضغط على المجموعة للتعديل الكامل · اضغط على خانة فاضية لإضافة مجموعة في اليوم والساعة دول.</div>';
container.innerHTML=html;
SB.bindDnD(container,opts);
};

/* ---------------- عرض شهري (شبكة تبدأ السبت) ---------------- */
SB.renderMonth=function(opts){
var container=document.getElementById(opts.container); if(!container) return;
SB.opts=opts;
var groups=SB.groupsInView(opts);
var d0=_sbDb();
var now=new Date(), y=now.getFullYear(), m=now.getMonth();
var dim=new Date(y,m+1,0).getDate();
var todayStr=y+'-'+String(m+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
var EN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
var firstIdx=SB.DAY_IDX(EN[new Date(y,m,1).getDay()]);
var html='<div class="sbm-grid">'+SB.DAYS.map(function(d){return '<div style="text-align:center;font-size:11px;font-weight:700;color:var(--text-muted);">'+d.ar+'</div>';}).join('');
for(var i=0;i<firstIdx;i++) html+='<div class="sbm-cell empty"></div>';
for(var dd=1;dd<=dim;dd++){
var ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(dd).padStart(2,'0');
var dayEn=EN[new Date(y,m,dd).getDay()];
var items=[];
groups.forEach(function(g){ SB.schedulesOf(g).forEach(function(s,si){ if(s.day===dayEn) items.push({g:g,s:s,si:si}); }); });
items.sort(function(a,b){ return SB.min(a.s.time)-SB.min(b.s.time); });
html+='<div class="sbm-cell'+(ds===todayStr?' today':'')+'" data-day="'+dayEn+'" data-ds="'+ds+'"><div style="font-weight:800;font-family:var(--font-en);">'+dd+'</div>';
items.slice(0,4).forEach(function(it){
var cancelled=(d0.cancelledSessions||[]).some(function(c){return c.groupId===it.g.id&&c.date===ds;});
var done=(d0.attendance||[]).some(function(a){return a.groupId===it.g.id&&a.date===ds&&a.status==='approved';});
html+='<div class="sbm-item sb-card" draggable="true" data-gid="'+it.g.id+'" data-si="'+it.si+'" data-time="'+(it.s.time||'')+'" style="border-right-color:'+(cancelled?'var(--danger)':done?'var(--success)':SB.groupColor(it.g.id))+';">'+(cancelled?'🚫 ':done?'✓ ':'')+SB.fmt12(it.s.time)+' '+it.g.name+'</div>';
});
if(items.length>4) html+='<div style="font-size:9px;color:var(--text-muted);">+'+(items.length-4)+' أخرى</div>';
html+='</div>';
}
html+='</div><div class="filter-info" style="margin-top:10px;">💡 اضغط على يوم فاضي لإضافة مجموعة · اسحب حصة ليوم تاني لتغيير يومها (الوقت يفضل زي ما هو).</div>';
container.innerHTML=html;
SB.bindDnD(container,opts);
};

/* ---------------- عرض خط زمني (يبدأ السبت) ---------------- */
SB.renderTimeline=function(opts){
var container=document.getElementById(opts.container); if(!container) return;
SB.opts=opts;
var groups=SB.groupsInView(opts);
var S=(opts.startHour||8)*60, E=(opts.timelineEnd||23)*60, SPAN=E-S;
var todayEn=SB.DAYS[new Date().getDay()].en;
var html='<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-muted);margin-bottom:6px;"><span>'+SB.fmt12(SB.hm(S))+'</span><span>'+SB.fmt12(SB.hm(S+SPAN*0.5))+'</span><span>'+SB.fmt12(SB.hm(E))+'</span></div>';
SB.DAYS.forEach(function(d){
var items=[];
groups.forEach(function(g){ SB.schedulesOf(g).forEach(function(s,si){ if(s.day===d.en) items.push({g:g,s:s,si:si}); }); });
items.sort(function(a,b){ return SB.min(a.s.time)-SB.min(b.s.time); });
html+='<div class="sbt-day'+(d.en===todayEn?' today':'')+'" data-day="'+d.en+'"><div class="sbt-head">'+d.ar+' <span class="points-badge">'+items.length+' حصة</span></div>';
if(!items.length) html+='<div style="font-size:10px;color:var(--text-muted);padding:4px 8px;">لا حصص — اضغط لإضافة</div>';
items.forEach(function(it){
var m=SB.min(it.s.time), dur=parseInt(it.g.duration)||60;
var right=Math.max(0,Math.min(96,(m-S)/SPAN*100));
var width=Math.max(6,Math.min(100-right,dur/SPAN*100));
html+='<div class="sbt-lane"><div class="sbt-bar sb-card" draggable="true" data-gid="'+it.g.id+'" data-si="'+it.si+'" data-time="'+(it.s.time||'')+'" style="right:'+right+'%;width:'+width+'%;background:'+SB.groupColor(it.g.id)+';">'+SB.fmt12(it.s.time)+' '+it.g.name+' · '+SB.teacherName(it.g.teacherId)+'</div></div>';
});
html+='</div>';
});
html+='<div class="filter-info" style="margin-top:10px;">💡 اضغط على أي بار لتعديل الموعد · اسحب البار ليوم تاني لتغيير اليوم.</div>';
container.innerHTML=html;
SB.bindDnD(container,opts);
};

/* ---------------- عرض البطاقات ---------------- */
SB.renderCards=function(opts){
var container=document.getElementById(opts.container); if(!container) return;
SB.opts=opts;
var groups=SB.groupsInView(opts);
if(!groups.length){ container.innerHTML='<div class="card" style="text-align:center;padding:30px;"><div style="font-size:40px;">📭</div><strong>لا مجموعات مطابقة</strong></div>'; return; }
container.innerHTML='<div class="sbc-grid">'+groups.map(function(g){
var color=SB.groupColor(g.id);
var chips=SB.schedulesOf(g).slice().sort(function(a,b){ return (SB.DAY_IDX(a.day)*1440+SB.min(a.time))-(SB.DAY_IDX(b.day)*1440+SB.min(b.time)); }).map(function(s){
return '<span class="badge badge-info" style="margin:2px;border-right:3px solid '+color+';">'+SB.DAY_AR(s.day)+' '+SB.fmt12(s.time)+'</span>';
}).join('');
var cnt=(DataService.getStudentsByGroup)?DataService.getStudentsByGroup(g.id).length:0;
return '<div class="user-card" style="border-top:3px solid '+color+';"><div class="user-card-header"><div class="user-avatar">👥</div><div><div class="user-name">'+g.name+'</div><div class="user-meta"><span>👨‍ '+SB.teacherName(g.teacherId)+'</span><span>🏢 '+(g.center||'-')+'</span><span>👥 '+cnt+'</span></div></div></div>'
+'<div style="margin:8px 0;">'+chips+'</div>'
+'<div class="user-meta"><span>⏱️ '+(g.duration||60)+' د</span><span>💰 '+(g.monthlyFee||0)+' ج.م</span></div>'
+(opts.editable?'<div class="user-actions" style="margin-top:10px;"><button class="btn btn-ghost btn-sm" onclick="window.openGroupModal(\''+g.id+'\')">✏️ تعديل</button><button class="btn btn-secondary btn-sm" onclick="SB.openMoveModal(\''+g.id+'\',0,null,null)">🚚 نقل موعد</button></div>':'')
+'</div>';
}).join('')+'</div>';
};

/* ---------------- سحب وإفلات + ضغط على الفاضي ---------------- */
SB.bindDnD=function(container,opts){
if(!opts.editable) return;
container.querySelectorAll('.sb-card').forEach(function(card){
card.addEventListener('dragstart',function(ev){
window._sbDrag={gid:card.dataset.gid, si:+(card.dataset.si||0), day:card.dataset.day, time:card.dataset.time};
try{ ev.dataTransfer.setData('text/plain',card.dataset.gid); }catch(e){}
card.classList.add('dragging');
});
card.addEventListener('dragend',function(){
card.classList.remove('dragging');
container.querySelectorAll('.sb-col,.sbm-cell,.sbt-day').forEach(function(c){c.classList.remove('droppable');});
});
card.addEventListener('click',function(ev){
ev.stopPropagation();
/* 🆕 إصلاح: نمرر اليوم والوقت من الكارت مباشرة بدل الاعتماد على الـ si اللي ممكن يكون غلط */
SB.openMoveModal(card.dataset.gid, +card.dataset.si||0, card.dataset.day, card.dataset.time);
});
});
/* أعمدة الأسبوعي */
container.querySelectorAll('.sb-col').forEach(function(col){
col.addEventListener('dragover',function(ev){ ev.preventDefault(); col.classList.add('droppable'); });
col.addEventListener('dragleave',function(){ col.classList.remove('droppable'); });
col.addEventListener('drop',function(ev){
ev.preventDefault(); col.classList.remove('droppable');
var drag=window._sbDrag; if(!drag) return;
var rect=col.getBoundingClientRect();
var y=ev.clientY-rect.top;
var H=56; var minH=(SB.opts&&SB.opts._minH)||8;
var mins=minH*60 + Math.round((y/H*60)/30)*30;
SB.openMoveModal(drag.gid, drag.si, col.dataset.day, SB.hm(mins));
window._sbDrag=null;
});
/* 🆕 ضغط على خانة فاضية = إضافة مجموعة */
col.addEventListener('click',function(ev){
if(ev.target.closest('.sb-card')) return;
var rect=col.getBoundingClientRect();
var y=ev.clientY-rect.top;
var H=56; var minH=(SB.opts&&SB.opts._minH)||8;
var mins=minH*60 + Math.floor((y/H*60)/30)*30;
SB.addAt(col.dataset.day, SB.hm(mins));
});
});
/* خلايا الشهري + أيام الخط الزمني */
container.querySelectorAll('.sbm-cell,.sbt-day').forEach(function(cell){
cell.addEventListener('dragover',function(ev){ ev.preventDefault(); cell.classList.add('droppable'); });
cell.addEventListener('dragleave',function(){ cell.classList.remove('droppable'); });
cell.addEventListener('drop',function(ev){
ev.preventDefault(); ev.stopPropagation(); cell.classList.remove('droppable');
var drag=window._sbDrag; if(!drag) return;
SB.openMoveModal(drag.gid, drag.si, cell.dataset.day, drag.time||null);
window._sbDrag=null;
});
cell.addEventListener('click',function(ev){
if(ev.target.closest('.sb-card')||ev.target.closest('.sbm-item')||ev.target.closest('.sbt-bar')) return;
SB.addAt(cell.dataset.day, null);
});
});
};

/* 🆕 إضافة مجموعة من خانة فاضية: اليوم والوقت متعبئين + فلاتر الأستاذ/السنتر */
SB.addAt=function(day,time){
if(typeof window.openGroupModal!=='function'){ if(window.safeToast) window.safeToast('افتح مودال المجموعة يدوياً','info'); return; }
window.openGroupModal(null);
setTimeout(function(){
try{
var row=document.querySelector('#schedulesContainer .multi-schedule-row');
if(row){
var dS=row.querySelector('.schedule-day'); if(dS&&day) dS.value=day;
var tI=row.querySelector('.schedule-time'); if(tI&&time) tI.value=time;
}
var tf=(document.getElementById('sbTeacherFilter')||{}).value;
var gT=document.getElementById('gTeacher');
if(gT&&tf&&tf!=='all') gT.value=tf;
var cf=(document.getElementById('sbCenterFilter')||{}).value;
var gC=document.getElementById('gCenter');
if(gC&&cf&&cf!=='all') gC.value=cf;
if(window.SSG&&window.SSG.scan){ try{ window.SSG.scan(); }catch(e){} }
if(window.safeToast) window.safeToast('اليوم والوقت متعبئين — كمّل البيانات واحفظ','info');
}catch(e){}
},100);
};

/* ---------------- مودال النقل / التعديل ---------------- */
SB.openMoveModal=function(gid,si,day,time){
try{
var opts=SB.opts||{};
var g=(DataService.getGroups()).find(function(x){return x.id===gid;}); if(!g) return;
var sch=SB.schedulesOf(g); var s=sch[si]||sch[0]||{day:g.day,time:g.time||'10:00'};
/* 🆕 إصلاح: لو اليوم والوقت ممررين من الكارت نستخدمهم مباشرة بدل البحث بالـ si */
var newDay=day||s.day; var newTime=time||s.time;
var dur=parseInt(g.duration)||60;
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">🗓️ '+g.name+'</h3><button type="button" class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div>'+
'<div class="modal-body">'+
'<div class="filter-info">📅 الموعد الحالي: '+SB.DAY_AR(newDay)+' '+SB.fmt12(newTime)+' · ⏱️ '+dur+' د · 🏢 '+(g.center||'-')+' · 👨‍🏫 '+SB.teacherName(g.teacherId)+'</div>'+
'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">'+
'<div class="form-group"><label>اليوم</label><select id="mvDay" class="form-select">'+SB.DAYS.map(function(d){return '<option value="'+d.en+'" '+(d.en===newDay?'selected':'')+'>'+d.ar+'</option>';}).join('')+'</select></div>'+
'<div class="form-group"><label>الساعة</label><input type="time" id="mvTime" class="form-input" value="'+newTime+'"></div>'+
'<div class="form-group"><label>المدة (دقيقة)</label><input type="number" id="mvDur" class="form-input" value="'+dur+'"></div>'+
'</div>'+
'<div id="mvConflicts"></div>'+
((opts.notifyAdmin)?'<div class="filter-info" style="background:var(--warning-bg);border-color:var(--warning);color:var(--warning);">📨 أي تعديل في الموعد بيتسجل وبيتبلغ بيه الأدمن تلقائياً</div>':'')+
'<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">'+
'<button class="btn btn-primary" style="flex:1;" onclick="SB.confirmMove(\''+gid+'\','+si+')">💾 حفظ التغيير</button>'+
'<button class="btn btn-secondary" onclick="ThemeManager.closeModal();window.openGroupModal(\''+gid+'\')">✏️ تعديل كل التفاصيل</button>'+
'</div></div>','modal-md');
SB.checkMoveConflicts(gid);
var tEl=document.getElementById('mvTime'), dEl=document.getElementById('mvDay'), durEl=document.getElementById('mvDur');
if(tEl) tEl.onchange=function(){SB.checkMoveConflicts(gid);};
if(dEl) dEl.onchange=function(){SB.checkMoveConflicts(gid);};
if(durEl) durEl.onchange=function(){SB.checkMoveConflicts(gid);};
}catch(e){ console.error(e); }
};

SB.findConflicts=function(gid,day,time,dur){
var out={sameTeacher:[],sameCenter:[]};
var me=(DataService.getGroups()).find(function(x){return x.id===gid;}); if(!me) return out;
var m=SB.min(time), end=m+dur;
(DataService.getGroups()).forEach(function(g){
if(g.id===gid) return;
var gd=parseInt(g.duration)||60;
SB.schedulesOf(g).forEach(function(s){
if(s.day!==day) return;
var gm=SB.min(s.time);
if(m<gm+gd && gm<end){
if(g.teacherId===me.teacherId) out.sameTeacher.push({g:g,time:s.time});
else if(me.center && g.center===me.center) out.sameCenter.push({g:g,time:s.time});
}
});
});
return out;
};

SB.checkMoveConflicts=function(gid){
try{
var box=document.getElementById('mvConflicts'); if(!box) return;
var day=document.getElementById('mvDay').value;
var time=document.getElementById('mvTime').value;
var dur=parseInt(document.getElementById('mvDur').value)||60;
var c=SB.findConflicts(gid,day,time,dur);
var html='';
if(c.sameTeacher.length) html+='<div class="filter-info" style="background:var(--danger-bg);border-color:var(--danger);color:var(--danger);">🚫 تعارض مباشر: نفس الأستاذ عنده حصة في نفس الوقت — '+c.sameTeacher.map(function(x){return x.g.name+' ('+SB.fmt12(x.time)+')';}).join('، ')+'</div>';
if(c.sameCenter.length) html+='<div class="filter-info" style="background:var(--warning-bg);border-color:var(--warning);color:var(--warning);">⚠️ نفس السنتر فيه أستاذ تاني في نفس الوقت — '+c.sameCenter.map(function(x){return x.g.name+' ('+SB.fmt12(x.time)+')';}).join('، ')+'</div>';
box.innerHTML=html;
}catch(e){}
};

SB.confirmMove=function(gid,si){
var day=document.getElementById('mvDay').value;
var time=document.getElementById('mvTime').value;
var dur=parseInt(document.getElementById('mvDur').value)||60;
if(!day||!time){ if(window.safeToast) window.safeToast('اختار اليوم والساعة','error'); return; }
var c=SB.findConflicts(gid,day,time,dur);
if(c.sameTeacher.length && !confirm('⚠️ تعارض: نفس الأستاذ عنده حصة تانية في نفس الوقت!\nهل تريد المتابعة على أي حال؟')) return;
SB.applyMove(gid,si,day,time,dur);
};

SB.applyMove=async function(gid,si,day,time,dur){
try{
var opts=SB.opts||{};
var g=(DataService.getGroups()).find(function(x){return x.id===gid;}); if(!g) return;
var sch=SB.schedulesOf(g);
var old=sch[si]||{day:g.day,time:g.time||'10:00'};
sch[si]={day:day,time:time};
sch.sort(function(a,b){ return (SB.DAY_IDX(a.day)*1440+SB.min(a.time))-(SB.DAY_IDX(b.day)*1440+SB.min(b.time)); });
var upd={schedules:sch, day:sch[0].day, time:sch[0].time, duration:dur||g.duration||60};
await DataService.updateGroup(gid,upd);
if(opts.notifyAdmin){
SB.logChange({groupId:gid,groupName:g.name,teacherId:g.teacherId,oldDay:old.day,oldTime:old.time,newDay:day,newTime:time,newDuration:dur});
}
if(window.safeToast) window.safeToast('✅ تم نقل المجموعة وتحديث البيانات','success');
try{ ThemeManager.closeModal(); }catch(e){}
SB.refresh();
}catch(e){ if(window.safeToast) window.safeToast('خطأ في النقل','error'); }
};

SB.refresh=function(){
var opts=SB.opts||{};
if(opts.role==='teacher' && window.loadMyScheduleBoard) window.loadMyScheduleBoard();
else if(window.loadScheduleBoardAdmin) window.loadScheduleBoardAdmin();
};

/* ---------------- تسجيل التغيير + إبلاغ الأدمن ---------------- */
SB.logChange=function(entry){
try{
var d=_sbDb(); d.scheduleChangeLog=d.scheduleChangeLog||[];
var me=null; try{ me=(typeof currentUser!=='undefined'&&currentUser)?currentUser:null; }catch(e){}
if(!me && window.AuthService&&AuthService.getCurrentUser) me=AuthService.getCurrentUser();
entry.id='sch_'+Date.now();
entry.at=new Date().toISOString();
entry.byName=me?me.name:''; entry.byRole=me?me.role:'';
d.scheduleChangeLog.unshift(entry);
if(d.scheduleChangeLog.length>200) d.scheduleChangeLog.length=200;
_sbSave(d);
if(window.FirebaseService&&FirebaseService.connected){ try{ FirebaseService.saveDoc('scheduleChangeLog',entry.id,entry); }catch(e){} }
if(DataService.addNotification){
(DataService.getUsers?DataService.getUsers():[]).filter(function(u){return u.role==='super_admin'||u.role==='admin';}).forEach(function(u){
DataService.addNotification({targetUserId:u.id,title:'🗓️ تغيير موعد مجموعة',message:(entry.byName||'')+' نقل مجموعة '+entry.groupName+' من '+SB.DAY_AR(entry.oldDay)+' '+SB.fmt12(entry.oldTime)+' إلى '+SB.DAY_AR(entry.newDay)+' '+SB.fmt12(entry.newTime),type:'general',meta:{kind:'schedule_change',refId:entry.id}});
});
}
}catch(e){ console.error(e); }
};

/* ---------------- إحصائيات + تعارضات + سجل ---------------- */
SB.countAllConflicts=function(opts){
var groups=SB.groupsInView(opts); var n=0;
for(var i=0;i<groups.length;i++)for(var j=i+1;j<groups.length;j++){
var a=groups[i],b=groups[j];
var sameT=a.teacherId===b.teacherId; var sameC=!!a.center&&a.center===b.center;
if(opts.teacherId&&!sameT) continue;
if(!sameT&&!sameC) continue;
var da=parseInt(a.duration)||60, db2=parseInt(b.duration)||60;
SB.schedulesOf(a).forEach(function(sa){ SB.schedulesOf(b).forEach(function(sb2){
if(sa.day!==sb2.day) return;
var ma=SB.min(sa.time), mb=SB.min(sb2.time);
if(ma<mb+db2&&mb<ma+da) n++;
});});
}
return n;
};

SB.renderStats=function(id,opts){
var el=document.getElementById(id); if(!el) return;
var groups=SB.groupsInView(opts);
var sess=0,hours=0,perDay={};
groups.forEach(function(g){ SB.schedulesOf(g).forEach(function(s){ sess++; hours+=(parseInt(g.duration)||60)/60; perDay[s.day]=(perDay[s.day]||0)+1; }); });
var busiest=SB.DAYS.slice().sort(function(a,b){return (perDay[b.en]||0)-(perDay[a.en]||0);})[0];
var conf=SB.countAllConflicts(opts);
el.innerHTML='<div class="stat-mini">'+
'<div class="stat-mini-box"><div class="stat-mini-value">'+groups.length+'</div><div class="stat-mini-label">مجموعة</div></div>'+
'<div class="stat-mini-box"><div class="stat-mini-value">'+sess+'</div><div class="stat-mini-label">حصة أسبوعياً</div></div>'+
'<div class="stat-mini-box"><div class="stat-mini-value">'+(Math.round(hours*10)/10)+'</div><div class="stat-mini-label">ساعة تدريس</div></div>'+
'<div class="stat-mini-box"><div class="stat-mini-value">'+(busiest?SB.DAY_AR(busiest.en):'-')+'</div><div class="stat-mini-label">أكثر يوم ('+(perDay[busiest?busiest.en:'']||0)+' حصة)</div></div>'+
'</div>'+
(conf?'<div class="filter-info" style="background:var(--danger-bg);border-color:var(--danger);color:var(--danger);">⚠️ يوجد '+conf+' تعارض مواعيد — راجع التفاصيل تحت</div>':'');
};

SB.renderConflicts=function(id,opts){
var el=document.getElementById(id); if(!el) return;
var groups=SB.groupsInView(opts); var rows=[];
for(var i=0;i<groups.length;i++)for(var j=i+1;j<groups.length;j++){
var a=groups[i],b=groups[j];
var sameT=a.teacherId===b.teacherId; var sameC=!!a.center&&a.center===b.center;
if(opts.teacherId&&!sameT) continue;
if(!sameT&&!sameC) continue;
var da=parseInt(a.duration)||60, db2=parseInt(b.duration)||60;
SB.schedulesOf(a).forEach(function(sa){ SB.schedulesOf(b).forEach(function(sb2){
if(sa.day!==sb2.day) return;
var ma=SB.min(sa.time), mb=SB.min(sb2.time);
if(ma<mb+db2&&mb<ma+da) rows.push({day:sa.day,a:a,sa:sa,b:b,sb:sb2,sameT:sameT});
});});
}
el.innerHTML=rows.length?('<div class="card" style="border-color:rgba(239,68,68,.4);"><div class="card-header"><h3 class="card-title" style="color:var(--danger);">⚠️ تعارضات المواعيد ('+rows.length+')</h3></div>'+rows.slice(0,10).map(function(r){
return '<div class="sub-row"><div><strong>'+SB.DAY_AR(r.day)+':</strong> '+r.a.name+' ('+SB.fmt12(r.sa.time)+') ⇆ '+r.b.name+' ('+SB.fmt12(r.sb.time)+')<div class="text-xs text-muted">'+(r.sameT?'نفس الأستاذ — تعارض مباشر!':'نفس السنتر «'+(r.a.center||'-')+'» — تأكد من القاعات')+'</div></div><button class="btn btn-ghost btn-sm" onclick="window.openGroupModal(\''+r.b.id+'\')">✏️</button></div>';
}).join('')+'</div>'):'';
};

SB.renderLog=function(id,opts){
var el=document.getElementById(id); if(!el) return;
var log=(_sbDb().scheduleChangeLog||[]);
if(opts&&opts.teacherId) log=log.filter(function(e){return e.teacherId===opts.teacherId;});
log=log.slice(0,12);
el.innerHTML=log.length?log.map(function(e){
var when=new Date(e.at||Date.now()).toLocaleString('ar-EG');
return '<div class="sub-row"><div><strong>'+e.groupName+'</strong><div class="text-xs text-muted">'+SB.DAY_AR(e.oldDay)+' '+SB.fmt12(e.oldTime)+' → '+SB.DAY_AR(e.newDay)+' '+SB.fmt12(e.newTime)+' · بواسطة '+(e.byName||'-')+' ('+(e.byRole==='teacher'?'أستاذ':'إدارة')+')</div></div><div class="text-xs text-muted">'+when+'</div></div>';
}).join(''):'<p class="text-muted">لا توجد تغييرات مسجلة بعد</p>';
};

/* 🆕 حقن أزرار (إضافة/طباعة/تحميل) + فلتر بداية اليوم في صفحة الأدمن */
SB.injectAdminControls=function(){
try{
var sec=document.getElementById('section-scheduleBoard'); if(!sec) return;
var hdr=sec.querySelector('.section-header > div:last-child')||sec.querySelector('.section-header');
if(hdr && !hdr.querySelector('[data-sbx]')){
var w=document.createElement('div'); w.setAttribute('data-sbx','1'); w.style.cssText='display:flex;gap:8px;flex-wrap:wrap;';
w.innerHTML='<button class="btn btn-success btn-sm" onclick="SB.addAt(null,null)">➕ إضافة مجموعة</button>'+
'<button class="btn btn-secondary btn-sm" onclick="SB.printBoard()">🖨️ طباعة</button>'+
'<button class="btn btn-secondary btn-sm" onclick="SB.downloadBoard()">📥 تحميل</button>';
hdr.appendChild(w);
}
var grid=sec.querySelector('.card div[style*="grid"]');
if(grid && !document.getElementById('sbStartHour')){
var d=document.createElement('div'); d.className='form-group'; d.style.margin='0';
var opts=''; for(var h=6;h<=12;h++){ opts+='<option value="'+h+'"'+(h===8?' selected':'')+'>'+SB.fmt12(h+':00')+'</option>'; }
d.innerHTML='<label>🕗 بداية اليوم</label><select id="sbStartHour" class="form-select" onchange="window.loadScheduleBoardAdmin()">'+opts+'</select>';
grid.appendChild(d);
}
/* 🆕 إعدادات إضافية للعرض الزمني: نهاية اليوم */
if(grid && !document.getElementById('sbTimelineEnd')){
var d2=document.createElement('div'); d2.className='form-group'; d2.style.margin='0';
var opts2=''; for(var h2=6;h2<=23;h2++){ opts2+='<option value="'+h2+'"'+(h2===23?' selected':'')+'>'+SB.fmt12(h2+':00')+'</option>'; }
d2.innerHTML='<label>🕙 نهاية اليوم</label><select id="sbTimelineEnd" class="form-select" onchange="window.loadScheduleBoardAdmin()">'+opts2+'</select>';
grid.appendChild(d2);
}
var sh=document.getElementById('sbStartHour');
if(sh) sh.value=String((SB.opts&&SB.opts.startHour)||8);
var te=document.getElementById('sbTimelineEnd');
if(te) te.value=String((SB.opts&&SB.opts.timelineEnd)||23);
}catch(e){ console.error(e); }
};

/* 🆕 بناء نسخة الطباعة/التحميل بهوية المنصة */
SB.buildPrintHTML=function(){
var d=_sbDb(); var b=d.branding||{};
var logo=''; try{ if(b.logoUrl&&window.driveThumb) logo=window.driveThumb(b.logoUrl); else if(b.logoUrl) logo=b.logoUrl; }catch(e){}
var opts=SB.opts||{};
var groups=SB.groupsInView(opts);
var startHour=opts.startHour||8;
var ends=[]; groups.forEach(function(g){ SB.schedulesOf(g).forEach(function(s){ ends.push(SB.min(s.time)+(parseInt(g.duration)||60)); }); });
var maxH=ends.length?Math.min(24,Math.ceil(Math.max.apply(null,ends)/60)):22;
if(maxH<=startHour) maxH=startHour+2;
var rows='';
for(var h=startHour;h<maxH;h++){
rows+='<tr><td class="hc">'+SB.fmt12(h+':00')+'</td>';
SB.DAYS.forEach(function(dn){
var cell='';
groups.forEach(function(g){
SB.schedulesOf(g).forEach(function(s){
if(s.day!==dn.en) return;
var m=SB.min(s.time); if(Math.floor(m/60)!==h) return;
var dur=parseInt(g.duration)||60;
cell+='<div class="pb" style="border-right:4px solid '+SB.groupColor(g.id)+';"><div class="pn">'+g.name+'</div><div class="pt">'+SB.fmt12(s.time)+' - '+SB.fmt12(SB.hm(m+dur))+'</div><div class="ps">'+SB.teacherName(g.teacherId)+' · '+(g.center||'-')+'</div></div>';
});
});
rows+='<td>'+cell+'</td>';
});
rows+='</tr>';
}
var css='body{font-family:Tahoma,Arial,sans-serif;direction:rtl;margin:0;background:#f4f6fb;color:#1f2937;}'+
'.sheet{max-width:1100px;margin:20px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.15);}'+
'.head{display:display:flex;align-items:center;gap:14px;padding:22px 26px;background:linear-gradient(135deg,'+(b.primaryColor||'#4f46e5')+','+(b.accentColor||'#7c3aed')+');color:#fff;}'+
'.logo{width:56px;height:56px;border-radius:14px;object-fit:cover;background:#fff;padding:4px;}'+
'.lf{width:56px;height:56px;border-radius:14px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:30px;}'+
'.title{font-size:22px;font-weight:800;}.sub{font-size:12px;opacity:.92;}'+
'table{width:100%;border-collapse:collapse;}th,td{border:1px solid #e2e8f0;padding:6px;vertical-align:top;font-size:11px;}'+
'th{background:#eef2ff;padding:8px;}.hc{background:#f8fafc;font-weight:700;white-space:nowrap;font-size:10px;}'+
'.pb{border-radius:8px;background:#f8fafc;padding:6px 8px;margin-bottom:4px;}.pn{font-weight:800;font-size:11px;}'+
'.pt{font-size:10px;color:'+(b.primaryColor||'#4f46e5')+';font-weight:700;}.ps{font-size:9px;color:#64748b;}'+
'.foot{padding:14px 26px;display:flex;justify-content:space-between;font-size:11px;color:#64748b;background:#f8fafc;}'+
'@page{size:A4 landscape;margin:5mm;}'+
'@media print{.sheet{box-shadow:none;margin:0;border-radius:0;max-width:none;}body{background:#fff;}table{page-break-inside:avoid;font-size:8px;}th,td{padding:2px 3px;font-size:8px;}.pn{font-size:8px;}.pt{font-size:7px;}.ps{font-size:7px;}.head{padding:8px 12px;}.title{font-size:14px;}.sub{font-size:8px;}.foot{padding:6px 12px;font-size:8px;}.logo,.lf{width:32px;height:32px;}}';
return '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>جدول الأساتذة</title><style>'+css+'</style></head><body><div class="sheet">'+
'<div class="head">'+(logo?'<img src="'+logo+'" class="logo">':'<div class="lf">🎓</div>')+
'<div><div class="sub">'+(b.name||'EduFlow')+'</div><div class="title">جدول الأساتذة الأسبوعي</div><div class="sub">الأستاذ: '+teacherLabel()+'</div></div></div>'+
'<table><thead><tr><th>الوقت</th>'+SB.DAYS.map(function(dn){return '<th>'+dn.ar+'</th>';}).join('')+'</tr></thead><tbody>'+rows+'</tbody></table>'+
'<div class="foot"><span>'+(b.name||'EduFlow')+' — نظام إدارة المراكز</span><span>عدد المجموعات: '+groups.length+'</span></div></div></body></html>';
};
function teacherLabel(){
var opts=SB.opts||{};
if(opts.teacherId) return SB.teacherName(opts.teacherId);
var tf=(document.getElementById('sbTeacherFilter')||{}).value||'all';
if(tf&&tf!=='all') return SB.teacherName(tf);
return 'كل الأساتذة';
}
SB.printBoard=function(){
var w=window.open('','_blank');
if(!w){ if(window.safeToast) window.safeToast('اسمح بالنوافذ المنبثقة للطباعة','error'); return; }
w.document.write(SB.buildPrintHTML());
w.document.close();
setTimeout(function(){ w.focus(); w.print(); },500);
};
SB.downloadBoard=function(){
var blob=new Blob([SB.buildPrintHTML()],{type:'text/html;charset=utf-8;'});
var a=document.createElement('a');
a.href=URL.createObjectURL(blob);
a.download='جدول-'+teacherLabel()+'-'+new Date().toISOString().split('T')[0]+'.html';
a.click();
URL.revokeObjectURL(a.href);
if(window.safeToast) window.safeToast('📥 تم تحميل الجدول','success');
};

/* ---------------- لوادر الصفحات ---------------- */
window.loadScheduleBoardAdmin=function(){
try{
SB.injectAdminControls();
var tSel=document.getElementById('sbTeacherFilter');
if(tSel&&tSel.options.length<=1){
var ts=(DataService.getTeachers)?DataService.getTeachers():[];
tSel.innerHTML='<option value="all">كل الأساتذة</option>'+ts.map(function(t){return '<option value="'+t.id+'">'+t.name+'</option>';}).join('');
}
var gSel=document.getElementById('sbGroupFilter');
if(gSel&&gSel.options.length<=1){
var gs=(DataService.getGroups)?DataService.getGroups():[];
gSel.innerHTML='<option value="all">كل المجموعات</option>'+gs.map(function(g){return '<option value="'+g.id+'">'+g.name+'</option>';}).join('');
}
var cSel=document.getElementById('sbCenterFilter');
if(cSel&&cSel.options.length<=1){
var centers=[]; if(DataService.getCenters) centers=(DataService.getCenters()||[]).map(function(c){return c.name;}).filter(Boolean);
if(!centers.length&&window.getAllCenters) centers=window.getAllCenters();
cSel.innerHTML='<option value="">كل السناتر</option>'+centers.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');
}
var sh=document.getElementById('sbStartHour');
var te=document.getElementById('sbTimelineEnd');
var opts={
container:'sbBoard',editable:true,showTeacher:true,notifyAdmin:false,role:'admin',
teacherFilter:(tSel?tSel.value:'all'),
groupFilter:(gSel?gSel.value:'all'),
center:(cSel?cSel.value:''),
sortBy:(document.getElementById('sbSortBy')||{}).value||'time',
startHour:sh?+sh.value:8,
timelineEnd:te?+te.value:23
};
SB.opts=opts;
var mode=(document.getElementById('sbViewMode')||{}).value||'week';
if(mode==='month') SB.renderMonth(opts);
else if(mode==='timeline') SB.renderTimeline(opts);
else if(mode==='cards') SB.renderCards(opts);
else SB.render(opts);
SB.renderStats('sbStats',opts); SB.renderConflicts('sbConflicts',opts); SB.renderLog('sbLog',opts);
}catch(e){ console.error(e); }
};

window.loadMyScheduleBoard=function(){
try{
var uid=null;
try{ uid=(typeof currentUser!=='undefined'&&currentUser)?currentUser.id:null; }catch(e){}
if(!uid&&window.AuthService&&AuthService.getCurrentUser){ var u=AuthService.getCurrentUser(); uid=u?u.id:null; }
var opts={container:'sbBoardT',editable:true,showTeacher:false,notifyAdmin:true,role:'teacher',teacherId:uid,sortBy:'time',startHour:8,timelineEnd:23};
SB.opts=opts;
var mode=(document.getElementById('sbViewModeT')||{}).value||'week';
if(mode==='month') SB.renderMonth(opts);
else if(mode==='timeline') SB.renderTimeline(opts);
else if(mode==='cards') SB.renderCards(opts);
else SB.render(opts);
SB.renderStats('sbStatsT',opts); SB.renderConflicts('sbConflictsT',opts); SB.renderLog('sbLogT',opts);
}catch(e){ console.error(e); }
};

/* 🆕 حقن عنصر القائمة الجانبية + توصيل showSection (مرة واحدة) */
(function(){
if(window.__SB_WIRED) return; window.__SB_WIRED=true;
function injectMenu(){
try{
var nav=document.getElementById('sidebarNav'); if(!nav) return;
if(nav.querySelector('[data-section="scheduleBoard"]')) return;
var item='<div class="sidebar-item" data-section="scheduleBoard" onclick="window.showSection(\'scheduleBoard\')"><span class="sidebar-item-icon">🗓️</span><span class="sidebar-item-label">جدول الأساتذة</span></div>';
var c=nav.querySelector('[data-section="centers"]');
if(c) c.insertAdjacentHTML('afterend',item); else nav.insertAdjacentHTML('beforeend',item);
}catch(e){}
}
if(typeof window.buildMenu==='function'){
var ob=window.buildMenu;
window.buildMenu=function(){ var r=ob.apply(this,arguments); injectMenu(); return r; };
}
injectMenu();
if(typeof window.showSection==='function'){
var os=window.showSection;
window.showSection=function(id){
var r=os.apply(this,arguments);
try{
if(id==='scheduleBoard'&&window.loadScheduleBoardAdmin) window.loadScheduleBoardAdmin();
if(id==='mySchedule'&&window.loadMyScheduleBoard) window.loadMyScheduleBoard();
}catch(e){}
return r;
};
}
})();