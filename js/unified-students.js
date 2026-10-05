/* ================================================================
🎓 Unified Students V7.1 — فرض تطابق المرحلة والصف + منع اختلاط المجموعات
• هاب باركود إداري كامل + تحكم نقاط/ستريك من عرض الطالب بالأدمن
• البيانات فوق وهي الفلاتر • المجموعات تحت • ربط بدل التكرار
• 🛡️ حماية صارمة: الطالب لا يدخل إلا مجموعات تطابق مرحلته وصفه
• 👨‍👧‍👦 الأخوة: ربط برقم ولي الأمر فقط + مجموعات مستقلة تماماً
================================================================ */
(function(){
"use strict";
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function saveD(d){if(DataService._saveData)DataService._saveData(d);}
function cur(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null);}catch(e){return null;}}
function cloud(col,o,del){try{if(window.FirebaseService&&FirebaseService._db){if(del)FirebaseService.deleteDoc(col,o.id);else FirebaseService.saveDoc(col,o.id,o);}}catch(e){}}
function nm(x){return String(x||'').toLowerCase().replace(/[\u064B-\u0652]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim();}
function words3(x){var w=nm(x).split(' ').filter(Boolean);return w.slice(0,3).join(' ');}
function students(){return (DataService.getStudents?DataService.getStudents():[]);}
function groupsAll(){return (DataService.getGroups?DataService.getGroups():[]);}
function teachersAll(){return (DataService.getTeachers?DataService.getTeachers():[]);}
function ensOf(sid){try{return (DataService.getStudentTeachers?DataService.getStudentTeachers(sid):[])||[];}catch(e){return [];}}
function lv(){return (typeof EduFlowConfig!=='undefined'&&EduFlowConfig.educationLevels)?EduFlowConfig.educationLevels:{};}
function myTeacherId(){try{return window.getMyTeacherId?window.getMyTeacherId():null;}catch(e){return null;}}
function isAssistant(){var u=cur();return u&&u.role==='assistant';}
function isAdminRole(){var u=cur();return u&&(u.role==='admin'||u.role==='super_admin');}
function lockedTeacherId(){return isAssistant()?myTeacherId():null;}
function centersAll(){var o={};groupsAll().forEach(function(g){if(g.center)o[g.center]=1;});return Object.keys(o).sort();}
function gradeListFor(stage){var out=[];if(stage&&lv()[stage])out=lv()[stage].grades||[];else Object.keys(lv()).forEach(function(k){(lv()[k].grades||[]).forEach(function(g){if(out.indexOf(g)<0)out.push(g);});});return out;}

/* 🛡️ فحص صارم: كل المجموعات المختارة يجب أن تكون من نفس المرحلة والصف الخاص بالطالب */
function validateEnrollmentsStrict(gids, studentStage, studentGrade) {
    if (!gids || !gids.length) return { valid: [], invalid: [], stage: studentStage || '', grade: studentGrade || '' };
    var valid = [];
    var invalid = [];
    var targetStage = studentStage || '';
    var targetGrade = studentGrade || '';
    
    // If student stage/grade is not set, infer from the first valid group
    if (!targetStage && !targetGrade) {
        var firstG = groupsAll().find(function(x) { return x.id === gids[0]; });
        if (firstG) {
            targetStage = firstG.stage || '';
            targetGrade = firstG.grade || '';
        }
    }

    gids.forEach(function(gid) {
        var g = groupsAll().find(function(x) { return x.id === gid; });
        if (!g) return;
        var gStage = g.stage || '';
        var gGrade = g.grade || '';
        
        // Strict matching: if student has a stage, group must match it exactly (if group has a stage)
        var stageMatch = !targetStage || !gStage || gStage === targetStage;
        var gradeMatch = !targetGrade || !gGrade || gGrade === targetGrade;
        
        if (stageMatch && gradeMatch) {
            valid.push(gid);
        } else {
            invalid.push(g.name + ' (' + (gStage || '-') + '/' + (gGrade || '-') + ')');
        }
    });
    return { valid: valid, invalid: invalid, stage: targetStage, grade: targetGrade };
}

/* كشف التكرار: رقم كامل (6+) أو 3 كلمات اسم على الأقل */
function findDups(name,phone,loose){
var n=nm(name),p=String(phone||'').replace(/\D/g,'');
var wn=n.split(' ').filter(Boolean);
return students().filter(function(s){
if(p&&p.length>=6){var sp=String(s.phone||'').replace(/\D/g,''),pp=String(s.parentPhone||'').replace(/\D/g,'');if(sp===p||pp===p)return true;}
if(wn.length>=3){var k=words3(n),sk=words3(s.name);return loose?(sk===k||sk.indexOf(k)>=0||k.indexOf(sk)>=0):sk===k;}
return false;
});
}
/* 🆕 البحث عن الإخوة: نفس رقم ولي الأمر بس اسم مختلف */
function findSiblings(name,phone){
var n=nm(name),p=String(phone||'').replace(/\D/g,'');
if(p.length<6)return [];
return students().filter(function(s){
var sp=String(s.phone||'').replace(/\D/g,''),pp=String(s.parentPhone||'').replace(/\D/g,'');
if(sp!==p&&pp!==p)return false;
var sn=nm(s.name);
return sn!==n&&!(sn.length>=3&&n.length>=3&&(sn.indexOf(n)>=0||n.indexOf(sn)>=0));
});
}
function refreshLists(){['loadStudents','loadWorkspace','renderWorkspace','loadGroups'].forEach(function(f){try{if(typeof window[f]==='function')window[f]();}catch(e){}});}
async function enrollMany(sid,gids){
var d=db();d.enrollments=d.enrollments||[];var added=0,skipped=0;
gids.forEach(function(gid,i){
var g=groupsAll().find(function(x){return x.id===gid;});
var ex=d.enrollments.find(function(e){return e.studentId===sid&&e.groupId===gid&&e.status==='active';});
if(ex){skipped++;return;}
var ne={id:'en_'+Date.now()+'_'+i+'_'+Math.random().toString(36).slice(2,5),studentId:sid,groupId:gid,teacherId:g?g.teacherId:null,status:'active',createdAt:new Date().toISOString()};
d.enrollments.push(ne);cloud('enrollments',ne,false);added++;
});
saveD(d);
return {added:added,skipped:skipped};
}
async function unenrollMany(sid,gids){
var d=db();var removed=0;
gids.forEach(function(gid){
var e=(d.enrollments||[]).find(function(x){return x.studentId===sid&&x.groupId===gid&&x.status==='active';});
if(e){d.enrollments=(d.enrollments||[]).filter(function(x){return x.id!==e.id;});cloud('enrollments',e,true);removed++;}
});
saveD(d);
return removed;
}
/* تعديل بيانات طالب: تعديل مباشر مضمون + سحابي */
async function updateStudentFields(sid,f){
try{
var d=db();
var u=(d.users||[]).find(function(x){return x.id===sid;});
if(!u)return;
if(f.name)u.name=f.name;
if(f.pp)u.parentPhone=f.pp;
if(f.sp!==undefined&&f.sp!=='')u.phone=f.sp;
if(f.stage)u.stage=f.stage;
if(f.grade)u.grade=f.grade;
if(f.center)u.center=f.center;
saveD(d);
try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc('users',sid,u);}catch(e){}
try{if(DataService.updateUser)await DataService.updateUser(sid,{name:u.name,parentPhone:u.parentPhone,phone:u.phone,stage:u.stage,grade:u.grade,center:u.center});}catch(e){}
}catch(e){}
}
window.openEditExistingPlatform=function(sid){
if(isAdminRole()){if(window.openStudentModal)return window.openStudentModal(sid);}
if(window.openEditStudentProfile)return window.openEditStudentProfile(sid);
if(window.openStudentModal)return window.openStudentModal(sid);
};

/* CSS */
if(!document.getElementById('ustCss')){var st=document.createElement('style');st.id='ustCss';st.textContent=
'@keyframes ustPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.55)}50%{box-shadow:0 0 0 9px rgba(245,158,11,0)}}'+
'.ust-dup{animation:ustPulse 1.2s infinite;cursor:pointer;}'+
'.ust-sq{display:inline-flex;flex-direction:column;align-items:center;gap:4px;min-width:88px;padding:10px 8px;border:2px solid var(--border);border-radius:14px;background:var(--surface-hover);cursor:pointer;font-size:11px;font-weight:800;text-align:center;transition:all .15s;font-family:inherit;color:inherit;}'+
'.ust-sq:hover{transform:translateY(-2px);border-color:var(--primary);}'+
'.ust-sq.on{border-color:var(--success);background:var(--success-bg);color:var(--success);box-shadow:0 4px 14px rgba(34,197,94,.25);}'+
'.ust-sq .av{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;}'+
'.ust-gchip{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1.5px solid var(--border);border-radius:9999px;background:var(--surface);cursor:pointer;font-size:11px;font-weight:700;transition:all .15s;margin:3px;font-family:inherit;color:inherit;}'+
'.ust-gchip:hover{border-color:var(--primary);transform:translateY(-1px);}'+
'.ust-gchip.on{background:var(--primary);color:#fff;border-color:var(--primary);box-shadow:0 4px 12px rgba(99,102,241,.35);}'+
'.ust-row{display:grid;grid-template-columns:2fr 1.2fr 1.1fr 1.5fr 1.6fr auto;gap:6px;align-items:center;padding:6px;border:1px solid var(--border);border-radius:10px;margin-bottom:6px;background:var(--surface);}'+
'.ust-note{font-size:11px;color:var(--text-muted);background:var(--surface-hover);border:1px dashed var(--border);border-radius:8px;padding:6px 10px;margin-bottom:8px;}'+
'.ust-data{background:var(--primary-bg);border:1px solid var(--primary-border);border-radius:12px;padding:10px;margin-bottom:10px;}'+
'@keyframes ustSpin{to{transform:rotate(360deg)}}'+
'.spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:ustSpin .6s linear infinite;vertical-align:middle;margin-inline-end:6px;}'+
'button:disabled{cursor:not-allowed;opacity:.6;}'+
'@media(max-width:760px){.ust-row{grid-template-columns:1fr 1fr;}}';
document.head.appendChild(st);}

/* ========== مكونات ========== */
function newState(){return {teachers:[],picks:{},centers:{},stage:'',grade:'',gq:'',tq:'',target:null,initial:[],siblingOf:null};}
function dataFieldsHtml(st,pfx){
return '<div class="ust-data"><div class="text-xs" style="font-weight:800;color:var(--primary);margin-bottom:6px;">1️⃣ بيانات الطالب — وهي نفسها الفلاتر:</div>'+
'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">'+
'<select id="'+pfx+'Stage" class="form-select" style="padding:7px;font-size:12px;" onchange="UST.dataField(\'stage\',this.value)"><option value="">🎯 المرحلة</option>'+Object.keys(lv()).map(function(k){return '<option value="'+k+'" '+(st.stage===k?'selected':'')+'>'+lv()[k].nameAr+'</option>';}).join('')+'</select>'+
'<select id="'+pfx+'Grade" class="form-select" style="padding:7px;font-size:12px;" onchange="UST.dataField(\'grade\',this.value)"><option value="">🎓 الصف</option>'+gradeListFor(st.stage).map(function(g){return '<option value="'+g+'" '+(st.grade===g?'selected':'')+'>'+g+'</option>';}).join('')+'</select>'+
'</div><div class="text-xs text-muted" style="margin-top:6px;">🏢 السنتر بيتحدد لكل مدرس لوحده تحت في قسم المجموعات — عادي طالب يكون في 3 سنترات مختلفة.</div></div>';
}
function teachersHtml(st){
var lock=lockedTeacherId();
if(lock){var t=DataService.getUserById?DataService.getUserById(lock):null;return '<div class="ust-note">🔗 مرتبط بالأستاذ: <b>'+(t?t.name:'')+'</b> — مجموعاته بتظهر تحت تلقائياً.</div>';}
var ts=teachersAll();
if(st.tq)ts=ts.filter(function(x){return (x.name||'').toLowerCase().indexOf(st.tq.toLowerCase())>=0;});
var h='<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;"><strong style="font-size:12px;">2️⃣ المدرسون (واحد أو أكتر):</strong><input type="text" class="form-input" style="width:140px;padding:5px 9px;font-size:11px;" placeholder="🔍 بحث مدرس..." oninput="UST.tq(this.value)"></div>';
h+='<div style="display:flex;gap:6px;flex-wrap:wrap;">'+ts.map(function(x){
var on=st.teachers.indexOf(x.id)>=0;
var cnt=groupsAll().filter(function(g){return g.teacherId===x.id&&(!st.stage||(g.stage||'')===st.stage)&&(!st.grade||(g.grade||'')===st.grade);}).length;
return '<button type="button" class="ust-sq '+(on?'on':'')+'" onclick="UST.toggleTeacher(\''+x.id+'\')"><span class="av">'+(x.name||'؟').charAt(0)+'</span>'+(x.name||'-')+'<span style="font-size:9px;opacity:.7;">'+cnt+' مجموعة مطابقة</span></button>';
}).join('')+'</div>';
return h;
}

function groupsHtml(st){
if(!st.teachers.length)return '<div class="text-xs text-muted" style="padding:12px;text-align:center;">👆 اختار مدرس — مجموعات المطابقة هتظهر هنا</div>';
var h='<div style="margin-bottom:6px;"><input type="text" class="form-input" style="padding:6px;font-size:11px;" placeholder="🔍 بحث في المجموعات المطابقة..." value="'+(st.gq||'')+'" oninput="UST.fGq(this.value)"></div>';
h+='<div class="text-xs" style="font-weight:800;color:var(--primary);margin-bottom:4px;">3️⃣ المجموعات المطابقة — لكل مدرس سنتره الخاص:</div>';
st.teachers.forEach(function(tid){
var t=DataService.getUserById?DataService.getUserById(tid):null;
var tGroups=groupsAll().filter(function(g){return g.teacherId===tid&&(!st.stage||(g.stage||'')===st.stage)&&(!st.grade||(g.grade||'')===st.grade);});
var cs={};tGroups.forEach(function(g){if(g.center)cs[g.center]=1;});
var cSel=st.centers[tid]||'';
h+='<div style="margin-bottom:10px;border:1px solid var(--border);border-radius:10px;padding:8px;background:var(--surface-hover);">';
h+='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px;"><strong class="text-xs" style="color:var(--primary);">👥 '+(t?t.name:'')+'</strong><select class="form-select" style="width:auto;padding:4px 8px;font-size:11px;" onchange="UST.fCenter(\''+tid+'\',this.value)"><option value="">🏢 كل سنتراته</option>'+Object.keys(cs).map(function(c){return '<option value="'+c+'" '+(cSel===c?'selected':'')+'>'+c+'</option>';}).join('')+'</select></div>';
var list=tGroups.filter(function(g){return (!cSel||(g.center||'')===cSel)&&(!st.gq||(g.name||'').toLowerCase().indexOf(st.gq.toLowerCase())>=0);});
h+=list.length?list.map(function(g){var on=st.picks[tid]===g.id;return '<button type="button" class="ust-gchip '+(on?'on':'')+'" onclick="UST.pick(\''+tid+'\',\''+g.id+'\')">'+(on?'✓ ':'')+g.name+' · '+(g.grade||'-')+' · '+(g.center||'-')+'</button>';}).join(''):'<span class="text-xs text-muted">مفيش مجموعات مطابقة — غيّر السنتر بتاع المدرس ده أو وسّع الفلاتر</span>';
h+='</div>';
});
return h;
}

function dupPanel(matches,fillFn){
return '<div style="margin-top:6px;">'+matches.slice(0,4).map(function(s){
var ens=ensOf(s.id);
return '<div class="ust-dup" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:7px 9px;border:1.5px solid var(--warning);border-radius:10px;margin-bottom:5px;background:var(--warning-bg);">'+
'<div style="flex:1;"><strong style="font-size:12px;">⚠️ مكرر في المنصة: '+s.name+'</strong> <span class="text-xs text-muted">'+(s.code||'')+' · '+(s.grade||'-')+'</span><div class="text-xs text-muted">'+(ens.length?'👥 '+ens.map(function(e){return (e.group&&e.group.name)||'';}).join('، '):'غير مقيّد')+'</div></div>'+
'<button type="button" class="btn btn-warning btn-sm" onclick="UST.'+fillFn+'(\''+s.id+'\')">✏️ تعديل بياناته هنا</button>'+
'<button type="button" class="btn btn-ghost btn-sm" onclick="openEditExistingPlatform(\''+s.id+'\')">🪟</button></div>';
}).join('')+'</div>';
}
/* 🆕 واجهة الإخوة (متابعة موحدة) */
function siblingPanel(sibs,markAsSibling){
return '<div style="margin-top:6px;">'+sibs.slice(0,4).map(function(s){
return '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:7px 9px;border:1.5px solid var(--info);border-radius:10px;margin-bottom:5px;background:var(--info-bg);">'+
'<div style="flex:1;"><strong style="font-size:12px;">👨‍👧‍👦 قريب/أخ: '+s.name+'</strong> <span class="text-xs text-muted">'+(s.code||'')+' · '+(s.grade||'-')+'</span><div class="text-xs text-muted">نفس رقم ولي الأمر — سيتم ربط الطالب الجديد بمتابعة نفس الأسرة (المجموعات مستقلة تماماً)</div></div>'+
'<button type="button" class="btn btn-primary btn-sm" onclick="UST.'+markAsSibling+'(\''+s.id+'\')">✓ نعم، ده أخوه</button></div>';
}).join('')+'</div>';
}

/* ========== 🎓 المودال الفردي ========== */
window._ustS=null;window._ustActive='single';
window.openUnifiedAddStudent=function(){
try{
var lock=lockedTeacherId();
window._ustS=newState();if(lock)window._ustS.teachers=[lock];
var html='<div class="modal-header"><h3 class="modal-title">🎓 إضافة / تعديل طالب</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body" style="max-height:76vh;overflow:auto;">'+
'<div id="uasDup"></div>'+
'<div id="uasMode" class="filter-info">🆕 الوضع: إضافة كطالب جديد — كشف التكرار بيشتغل من الاسم الثالث</div>'+
'<div class="form-group"><label>الاسم الكامل *</label><input type="text" id="uasName" class="form-input" placeholder="مثال: أحمد محمد علي (التكرار من الاسم الثالث)" oninput="UST.scanSingle()"></div>'+
'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
'<div class="form-group"><label>هاتف ولي الأمر *</label><input type="tel" id="uasPhone" class="form-input" placeholder="01xxxxxxxxx" oninput="UST.scanSingle()"></div>'+
'<div class="form-group"><label>هاتف الطالب (اختياري)</label><input type="tel" id="uasPhone2" class="form-input"></div></div>'+
dataFieldsHtml(window._ustS,'uas')+
'<div class="card" style="padding:10px;margin-bottom:10px;" id="ustT1"></div>'+
'<div class="card" style="padding:10px;margin-bottom:10px;" id="ustG1"></div>'+
'<button class="btn btn-primary w-full" style="padding:12px;" onclick="UST.saveSingle()">💾 حفظ</button></div>';
ThemeManager.openModal(html,'modal-md');
window._ustActive='single';
UST.renderSingle();
}catch(e){console.error('openUnifiedAddStudent',e);if(window.safeToast)window.safeToast('خطأ: '+e.message,'error');}
};
var UST=window.UST=window.UST||{};
function S(){return window._ustActive==='single'?window._ustS:window._ustB;}
function render(){if(window._ustActive==='single')UST.renderSingle();else UST.renderBulk();}
UST.renderSingle=function(){
var st=window._ustS;if(!st)return;
var t=document.getElementById('ustT1');if(t)t.innerHTML=teachersHtml(st);
var g=document.getElementById('ustG1');if(g)g.innerHTML=groupsHtml(st);
};
UST.renderBulk=function(){
var st=window._ustB;if(!st)return;
var t=document.getElementById('ustT2');if(t)t.innerHTML=teachersHtml(st);
var g=document.getElementById('ustG2');if(g)g.innerHTML=groupsHtml(st);
var cn=document.getElementById('ubCount');if(cn)cn.textContent=window._ubRows.length;
};
UST.dataField=function(k,v){
var st=S();if(!st)return;
st[k]=v;
if(k==='stage'){st.grade='';
var gs=document.getElementById(window._ustActive==='single'?'uasGrade':'ubGrade');
if(gs){gs.innerHTML='<option value="">🎓 الصف</option>'+gradeListFor(v).map(function(g){return '<option value="'+g+'">'+g+'</option>';}).join('');}
}
/* 🛡️ تنظيف المجموعات المختارة اللي مش مطابقة للمرحلة/الصف الجديد */
Object.keys(st.picks).forEach(function(tid) {
    var gid = st.picks[tid];
    if (gid) {
        var g = groupsAll().find(function(x){return x.id===gid;});
        if (g) {
            if (st.stage && g.stage && g.stage !== st.stage) st.picks[tid] = null;
            if (st.grade && g.grade && g.grade !== st.grade) st.picks[tid] = null;
        }
    }
});
render();
};
UST.tq=function(v){var st=S();if(!st)return;st.tq=v;render();};
UST.toggleTeacher=function(id){
var st=S();if(!st)return;
var i=st.teachers.indexOf(id);
if(i>=0){
st.teachers.splice(i,1);
delete st.picks[id];
}else{
st.teachers.push(id);
}
render();
if(window.safeToast){
var count=st.teachers.length;
window.safeToast('🔍 الفلتر: '+count+' أستاذ'+(count===1?'':'ون')+' · الكشف محفوظ ('+window._ubRows.length+' طالب)','info');
}
};
UST.fGq=function(v){var st=S();if(!st)return;st.gq=v;render();};
UST.fCenter=function(tid,v){var st=S();if(!st)return;st.centers[tid]=v;delete st.picks[tid];render();};
UST.pick=function(tid,gid){
    var st=S();if(!st)return;
    var isPicked = st.picks[tid] === gid;
    st.picks[tid] = isPicked ? null : gid;
    
    /* 🔒 القفل التلقائي: أول مجموعة بتحدد مرحلة وصف الطالب */
    if (!isPicked) {
        var g = groupsAll().find(function(x){return x.id===gid;});
        if (g) {
            if (!st.stage && g.stage) {
                st.stage = g.stage;
                var stgEl = document.getElementById(window._ustActive==='single'?'uasStage':'ubStage');
                if (stgEl) stgEl.value = st.stage;
            }
            if (!st.grade && g.grade) {
                st.grade = g.grade;
                var grEl = document.getElementById(window._ustActive==='single'?'uasGrade':'ubGrade');
                if (grEl) {
                    grEl.innerHTML = '<option value="">🎓 الصف</option>' + gradeListFor(st.stage).map(function(gr){return '<option value="'+gr+'" '+(gr===st.grade?'selected':'')+'>'+gr+'</option>';}).join('');
                    grEl.value = st.grade;
                }
            }
        }
    }
    render();
};
UST.scanSingle=function(){
var box=document.getElementById('uasDup');if(!box)return;
var st=window._ustS||{};
var name=(document.getElementById('uasName')||{}).value||'';
var phone=(document.getElementById('uasPhone')||{}).value||'';
var selfMatches=(st.siblingOf?findDups(name,'',true):findDups(name,phone,true)).filter(function(s){return st.target!==s.id;});
var sibs=findSiblings(name,phone).filter(function(s){return st.target!==s.id;});
if(!selfMatches.length&&!sibs.length){box.innerHTML='';return;}
var html='';
if(selfMatches.length){
html+='<div class="filter-info" style="background:var(--warning-bg);border-color:var(--warning);color:var(--warning);margin-bottom:6px;"><strong>⚠️ نفس الطالب موجود — دوس "تعديل بياناته هنا":</strong></div>'+dupPanel(selfMatches,'fillSingle');
}
if(sibs.length){
html+='<div class="filter-info" style="background:var(--info-bg);border-color:var(--info);color:var(--info);margin-bottom:6px;"><strong>👨‍👧‍👦 في إخوة/قرايب مسجلين بنفس رقم ولي الأمر:</strong></div>'+siblingPanel(sibs,'markSibling');
}
box.innerHTML=html;
};
UST.markSibling=function(sid){
var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s)return;
var st=window._ustS;if(!st)return;
st.siblingOf=sid;
st.target=null;
var p=document.getElementById('uasPhone');if(p)p.value=s.parentPhone||'';
var md=document.getElementById('uasMode');
if(md){md.innerHTML='👨‍👧‍👦 الوضع: <strong>إضافة أخ جديد</strong> لعائلة '+(s.name||'')+' — سيضاف كطالب مستقل تحت متابعة نفس ولي الأمر.<br>⚠️ <strong>مجموعات الأخوه مستقلة تماماً</strong>، اختر مجموعات هذا الطالب حسب مرحلته.';md.style.background='var(--info-bg)';md.style.borderColor='var(--info)';md.style.color='var(--info)';}
var bx=document.getElementById('uasDup');if(bx)bx.innerHTML='';
if(window.safeToast)window.safeToast('✓ سيعامل كأخ لـ '+s.name+' (مجموعات مستقلة)','info');
};
UST.fillSingle=function(sid){
var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s)return;
var st=window._ustS;if(!st)return;
st.target=sid;
var n=document.getElementById('uasName');if(n)n.value=s.name||'';
var p=document.getElementById('uasPhone');if(p)p.value=s.parentPhone||'';
var p2=document.getElementById('uasPhone2');if(p2)p2.value=s.phone||'';
st.stage=s.stage||'';st.grade=s.grade||'';st.centers={};
var stg=document.getElementById('uasStage');if(stg)stg.value=st.stage;
var gr=document.getElementById('uasGrade');if(gr){gr.innerHTML='<option value="">🎓 الصف</option>'+gradeListFor(st.stage).map(function(g){return '<option value="'+g+'">'+g+'</option>';}).join('');gr.value=st.grade;}
var ens=ensOf(sid).map(function(e){return e.group&&e.group.id;}).filter(Boolean);
st.initial=ens.slice();
st.picks={};
ens.forEach(function(gid){var g=groupsAll().find(function(x){return x.id===gid;});if(g&&st.teachers.indexOf(g.teacherId)<0)st.teachers.push(g.teacherId);if(g){st.picks[g.teacherId]=gid;if(g.center)st.centers[g.teacherId]=g.center;}});
var md=document.getElementById('uasMode');
if(md){md.innerHTML='✏️ الوضع: <strong>تعديل طالب موجود</strong> ('+s.name+') — مجموعاته الحالية متعلّمة؛ علّم/فكّ والحفظ هيضيف ويفصل فعلياً.';md.style.background='var(--info-bg)';md.style.borderColor='var(--info)';md.style.color='var(--info)';}
var bx=document.getElementById('uasDup');if(bx)bx.innerHTML='';
render();
if(window.safeToast)window.safeToast('✏️ بيانات '+s.name+' ومجموعاته اتحملوا','info');
};
UST.saveSingle=async function(){
try{
var st=window._ustS;if(!st)return;
var name=(document.getElementById('uasName')||{}).value||'';
var phone=(document.getElementById('uasPhone')||{}).value||'';
var phone2=(document.getElementById('uasPhone2')||{}).value||'';
var gids=Object.keys(st.picks).map(function(k){return st.picks[k];}).filter(Boolean);

/* 🛡️ فحص صارم للمجموعات */
var validation = validateEnrollmentsStrict(gids, st.stage, st.grade);
if (validation.invalid.length > 0) {
    if (window.safeToast) window.safeToast('⚠️ تم استبعاد مجموعات لا تطابق مرحلة/صف الطالب: ' + validation.invalid.join('، '), 'warning');
}
gids = validation.valid;
if (!st.stage && validation.stage) st.stage = validation.stage;
if (!st.grade && validation.grade) st.grade = validation.grade;

if(!name.trim()||!phone.trim()){if(window.safeToast)window.safeToast('الاسم وتليفون ولي الأمر مطلوبين','error');return;}
if(!gids.length){if(window.safeToast)window.safeToast('اختار مجموعة واحدة على الأقل مطابقة لمرحلة الطالب','error');return;}
var g0=groupsAll().find(function(x){return x.id===gids[0];});var centerVal=(g0&&g0.center)||'';
if(st.target){
await updateStudentFields(st.target,{name:name.trim(),pp:phone.trim(),sp:phone2||'',stage:st.stage,grade:st.grade,center:centerVal});
var toAdd=gids.filter(function(g){return st.initial.indexOf(g)<0;});
var toRemove=st.initial.filter(function(g){return gids.indexOf(g)<0;});
var r1=await enrollMany(st.target,toAdd);
var r2=await unenrollMany(st.target,toRemove);
ThemeManager.closeModal();
if(window.safeToast)window.safeToast('✏️ تم الحفظ: +'+r1.added+' مجموعة · −'+r2+' مجموعة','success');
refreshLists();return;
}
if(st.siblingOf){
var sib=DataService.getUserById?DataService.getUserById(st.siblingOf):null;
if(sib){
// Create new student with sibling's parentPhone, but DO NOT copy groups
var nu=await DataService.addUser({role:'student',name:name.trim(),parentPhone:phone.trim(),phone:phone2||sib.phone||'',stage:st.stage,grade:st.grade,center:st.center,code:'EDU-'+Date.now().toString().slice(-6),password:'1234',siblingOf:st.siblingOf,familyId:sib.familyId||sib.id});
// Enroll ONLY in the explicitly selected gids for this new student
if (gids && gids.length) {
    await enrollMany((nu&&nu.id)||nu,gids);
}
try{if(sib.familyId==null&&DataService.updateUser)await DataService.updateUser(sib.id,{familyId:sib.id});}catch(e){}
ThemeManager.closeModal();
if(window.safeToast)window.safeToast('✅ تم إضافة '+name.trim()+' كأخ لـ '+sib.name+' — مجموعات مستقلة تماماً','success');
refreshLists();return;
}
}
var dupExact=findDups(name,phone,false);
if(dupExact.length){
if(!confirm('⚠️ الطالب "'+dupExact[0].name+'" موجود بالفعل.\nموافق = تعديل بياناته وربطه بدون تكرار\nإلغاء = رجوع'))return;
st.target=dupExact[0].id;st.initial=ensOf(st.target).map(function(e){return e.group&&e.group.id;}).filter(Boolean);
await updateStudentFields(st.target,{name:name.trim(),pp:phone.trim(),sp:phone2||'',stage:st.stage,grade:st.grade,center:centerVal});
var ra=await enrollMany(st.target,gids.filter(function(g){return st.initial.indexOf(g)<0;}));
ThemeManager.closeModal();
if(window.safeToast)window.safeToast('🛡️ طالب موجود — اتحدّثت بياناته واتضاف لـ '+ra.added+' مجموعة','success');
refreshLists();return;
}
if(typeof DataService.addStudentByAdmin==='function'){
await DataService.addStudentByAdmin({name:name.trim(),parentPhone:phone.trim(),phone:phone2||'',stage:st.stage,grade:st.grade,center:centerVal,password:'1234',enrollments:gids.map(function(gid){var g=groupsAll().find(function(x){return x.id===gid;});return {groupId:gid,teacherId:g?g.teacherId:null};})});
}else{
var nu=await DataService.addUser({role:'student',name:name.trim(),parentPhone:phone.trim(),phone:phone2||'',stage:st.stage,grade:st.grade,center:centerVal,code:'EDU-'+Date.now().toString().slice(-6),password:'1234'});
await enrollMany((nu&&nu.id)||nu,gids);
}
ThemeManager.closeModal();
if(window.safeToast)window.safeToast('✅ تم إضافة الطالب وربطه بـ '+gids.length+' مجموعة','success');
refreshLists();
}catch(e){if(window.safeToast)window.safeToast('خطأ: '+e.message,'error');}
};

/* ========== 📋 المودال المجمع ========== */
window._ustB=null;window._ubRows=[];window._ubPending=null;window._ubPendingEdit=null;window._ubEditIndex=null;
window.openUnifiedBulkAdd=function(){
try{
var lock=lockedTeacherId();
window._ustB=newState();if(lock)window._ustB.teachers=[lock];
window._ubRows=[];window._ubPending=null;window._ubPendingEdit=null;window._ubEditIndex=null;
var html='<div class="modal-header"><h3 class="modal-title">📋 إضافة طلاب بالجملة</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body" style="max-height:78vh;overflow:auto;">'+
dataFieldsHtml(window._ustB,'ub')+
'<div class="card" style="padding:10px;margin-bottom:10px;" id="ustT2"></div>'+
'<div class="card" style="padding:10px;margin-bottom:10px;" id="ustG2"></div>'+
'<div class="card" style="padding:10px;margin-bottom:10px;"><strong class="text-sm">➕ بيانات طالب</strong>'+
'<div style="display:grid;grid-template-columns:2fr 1.3fr 1.2fr;gap:6px;margin-top:8px;">'+
'<input type="text" id="ubName" class="form-input" placeholder="الاسم * (التكرار من الاسم الثالث)" oninput="UST.scanBulkInput()">'+
'<input type="tel" id="ubPhone" class="form-input" placeholder="تليفون ولي الأمر *" oninput="UST.scanBulkInput()">'+
'<input type="tel" id="ubPhone2" class="form-input" placeholder="تليفون الطالب (اختياري)"></div>'+
'<div id="ubDupBadge" style="margin-top:6px;"></div>'+
'<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;"><button id="ubAddBtn" class="btn btn-secondary btn-sm" onclick="UST.addRow()">➕ إضافة للكشف</button><button id="ubCancelEdit" class="btn btn-ghost btn-sm" style="display:none;" onclick="UST.cancelRowEdit()">✖ إلغاء تعديل الصف</button><button class="btn btn-ghost btn-sm" onclick="var pb=document.getElementById(\'ubPasteBox\');pb.style.display=pb.style.display===\'none\'?\'block\':\'none\'">📥 لصق جماعي</button></div>'+
'<div id="ubPasteBox" style="display:none;margin-top:8px;"><textarea id="ubPaste" class="form-input" rows="3" placeholder="كل سطر: الاسم | ولي الأمر | الطالب"></textarea><button class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="UST.parsePaste()">➕ تحويل لصفوف</button></div></div>'+
'<div class="card" style="padding:10px;margin-bottom:10px;"><strong class="text-sm">📋 الكشف (<span id="ubCount">0</span>)</strong><div class="text-xs text-muted" style="margin:4px 0;">تعديل كامل لكل صف + تغيير مجموعته + ربط/تعديل موجود + فتح في المنصة</div><div id="ubList" style="max-height:240px;overflow:auto;"></div></div>'+
'<button class="btn btn-success w-full" style="padding:12px;" onclick="UST.saveBulk()">💾 حفظ الكل</button></div>';
ThemeManager.openModal(html,'modal-lg');
window._ustActive='bulk';
UST.renderBulk();UST.renderRows();
}catch(e){console.error('openUnifiedBulkAdd',e);if(window.safeToast)window.safeToast('خطأ: '+e.message,'error');}
};

UST.scanBulkInput=function(){
var name=(document.getElementById('ubName')||{}).value||'';
var phone=(document.getElementById('ubPhone')||{}).value||'';
/* 🛡️ لو وضع الأخ مفعّل: الرقم مشترك عمداً — كشف التكرار بالاسم فقط */
var selfMatches=window._ubSiblingOf?findDups(name,'',true):findDups(name,phone,true);
var sibs=findSiblings(name,phone);
window._ubPending=selfMatches.length?selfMatches[0]:null;
window._ubSibling=sibs.length?sibs[0]:null;
var b=document.getElementById('ubDupBadge');if(!b)return;
var html='';
if(selfMatches.length)html+='<div class="filter-info" style="background:var(--warning-bg);border-color:var(--warning);color:var(--warning);margin-bottom:4px;"><strong>⚠️ مكرر في المنصة:</strong></div>'+dupPanel(selfMatches,'fillBulkInputs');
if(sibs.length)html+='<div class="filter-info" style="background:var(--info-bg);border-color:var(--info);color:var(--info);margin-bottom:4px;"><strong>👨‍👧‍👦 قريب/أخ:</strong></div>'+siblingPanel(sibs,'markBulkSibling');
b.innerHTML=html;
};

UST.markBulkSibling=function(sid){
var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s)return;
window._ubSiblingOf=sid;
var p=document.getElementById('ubPhone');if(p)p.value=s.parentPhone||'';
var b=document.getElementById('ubDupBadge');if(b)b.innerHTML='<span class="badge badge-info">👨‍‍👦 وضع أخ لـ '+s.name+' — دوس "إضافة للكشف"</span>';
};

UST.fillBulkInputs=function(sid){
var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s)return;
window._ubPendingEdit=sid;
var n=document.getElementById('ubName');if(n)n.value=s.name||'';
var p=document.getElementById('ubPhone');if(p)p.value=s.parentPhone||'';
var p2=document.getElementById('ubPhone2');if(p2)p2.value=s.phone||'';
var b=document.getElementById('ubDupBadge');if(b)b.innerHTML='<span class="badge badge-info">✏️ وضع تعديل موجود: '+s.name+' — دوس "إضافة للكشف" ثم "حفظ الكل" وهيتحفظ فعلاً</span>';
};

UST.addRow=function(){
var name=(document.getElementById('ubName')||{}).value||'';
var pp=(document.getElementById('ubPhone')||{}).value||'';
var sp=(document.getElementById('ubPhone2')||{}).value||'';
if(!name.trim()){if(window.safeToast)window.safeToast('اكتب الاسم','error');return;}
var st=window._ustB||newState();
var snapshotGids=Object.keys(st.picks).map(function(k){return st.picks[k];}).filter(Boolean);
if(window._ubEditIndex!=null&&window._ubRows[window._ubEditIndex]){
var r=window._ubRows[window._ubEditIndex];
r.name=name.trim();r.pp=pp.trim();r.sp=sp.trim();
if(!r.editId){var m0=findDups(r.name,r.pp,false);r.dupId=m0.length?m0[0].id:null;r.link=!!m0.length;}
UST.cancelRowEdit();
UST.renderRows();
if(window.safeToast)window.safeToast('💾 تم تحديث الصف في الكشف','success');
return;
}
var editId=window._ubSiblingOf?null:(window._ubPendingEdit||null);
var dup=(editId||window._ubSiblingOf)?null:(window._ubPending||null);
window._ubRows.push({
name:name.trim(),pp:pp.trim(),sp:sp.trim(),
editId:editId,dupId:dup?dup.id:null,link:!!dup,
siblingOf:window._ubSiblingOf||null,
override:'',
gids:snapshotGids.slice()
});
window._ubSiblingOf=null;
document.getElementById('ubName').value='';document.getElementById('ubPhone').value='';document.getElementById('ubPhone2').value='';
window._ubPending=null;window._ubPendingEdit=null;
var b=document.getElementById('ubDupBadge');if(b)b.innerHTML='';
UST.renderRows();
if(window.safeToast)window.safeToast('✅ أُضيف للكشف بـ '+snapshotGids.length+' مجموعة (التشكيلة محفوظة)','success');
};
UST.rowToForm=function(i){
var r=window._ubRows[i];if(!r)return;
window._ubEditIndex=i;
var n=document.getElementById('ubName');if(n)n.value=r.name;
var p=document.getElementById('ubPhone');if(p)p.value=r.pp;
var p2=document.getElementById('ubPhone2');if(p2)p2.value=r.sp;
var st=window._ustB||newState();
st.picks={};st.teachers=[];
(r.gids||[]).forEach(function(gid){
var g=groupsAll().find(function(x){return x.id===gid;});
if(g&&!st.teachers.includes(g.teacherId)){st.teachers.push(g.teacherId);st.picks[g.teacherId]=gid;}
});
var ab=document.getElementById('ubAddBtn');if(ab){ab.textContent='💾 تحديث الصف '+(i+1);ab.className='btn btn-warning btn-sm';}
var cb=document.getElementById('ubCancelEdit');if(cb)cb.style.display='';
UST.renderBulk();
if(window.safeToast)window.safeToast('✏️ عدّل في الفورم فوق — التشكيلة محفوظة ('+(r.gids||[]).length+' مجموعة)','info');
};
UST.cancelRowEdit=function(){
window._ubEditIndex=null;
var n=document.getElementById('ubName');if(n)n.value='';
var p=document.getElementById('ubPhone');if(p)p.value='';
var p2=document.getElementById('ubPhone2');if(p2)p2.value='';
var ab=document.getElementById('ubAddBtn');if(ab){ab.textContent='➕ إضافة للكشف';ab.className='btn btn-secondary btn-sm';}
var cb=document.getElementById('ubCancelEdit');if(cb)cb.style.display='none';
};
UST.parsePaste=function(){
var ta=(document.getElementById('ubPaste')||{}).value||'';
ta.split('\n').forEach(function(l){
var p=l.split('|').map(function(x){return x.trim();});
if(!p[0])return;
var m=findDups(p[0],p[1]||'',false);
window._ubRows.push({name:p[0],pp:p[1]||'',sp:p[2]||'',editId:null,dupId:m.length?m[0].id:null,link:!!m.length,override:''});
});
var t2=document.getElementById('ubPaste');if(t2)t2.value='';
var pb=document.getElementById('ubPasteBox');if(pb)pb.style.display='none';
UST.renderRows();
};
UST.delRow=function(i){window._ubRows.splice(i,1);UST.renderRows();};
UST.rowEdit=function(i,f,v){
var r=window._ubRows[i];if(!r)return;
r[f]=v;
if(f==='name'||f==='pp'){var m=findDups(r.name,r.pp,false);if(!r.editId){r.dupId=m.length?m[0].id:null;r.link=!!m.length;}}
UST.rowBadge(i);
};
UST.rowFill=function(i,sid){
var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s)return;
var r=window._ubRows[i];if(!r)return;
r.editId=sid;r.name=s.name||'';r.pp=s.parentPhone||'';r.sp=s.phone||'';r.dupId=null;
UST.renderRows();
if(window.safeToast)window.safeToast('✏️ الصف بقى وضع تعديل لـ '+s.name,'info');
};
UST.rowOverride=function(i,v){window._ubRows[i].override=v||'';};
UST.rowBadge=function(i){
var el=document.getElementById('ubBadge'+i);if(!el)return;
var r=window._ubRows[i];if(!r)return;
if(r.editId){var s=DataService.getUserById?DataService.getUserById(r.editId):null;el.innerHTML='<span class="badge badge-info">✏️ تعديل موجود: '+(s?s.name:'')+'</span>';return;}
if(r.dupId){var s2=DataService.getUserById?DataService.getUserById(r.dupId):null;
el.innerHTML='<span class="badge badge-warning ust-dup" onclick="UST.rowFill('+i+',\''+r.dupId+'\')">⚠️ مكرر: '+(s2?s2.name:'')+' — دوس للتعديل/الربط</span> <label style="font-size:10px;"><input type="checkbox" '+(r.link?'checked':'')+' onchange="window._ubRows['+i+'].link=this.checked"> ربط</label>';return;}
if(r.siblingOf){var s3=DataService.getUserById?DataService.getUserById(r.siblingOf):null;el.innerHTML='<span class="badge badge-info">👨‍👧‍👦 أخ لـ '+((s3&&s3.name)||'')+' — طالب جديد مستقل</span>';return;}
el.innerHTML='<span class="badge badge-info">🆕 جديد</span>';
};
UST.renderRows=function(){
var el=document.getElementById('ubList');var cn=document.getElementById('ubCount');
if(cn)cn.textContent=window._ubRows.length;
if(!el)return;
var st=window._ustB||newState();
var pickGids=Object.keys(st.picks).map(function(k){return st.picks[k];}).filter(Boolean);
el.innerHTML=window._ubRows.length?window._ubRows.map(function(r,i){
var rowGids=(r.gids&&r.gids.length)?r.gids.slice():pickGids.slice();
if(r.override&&rowGids.indexOf(r.override)<0)rowGids.push(r.override);
var chipsHtml=rowGids.map(function(gid){
var g=groupsAll().find(function(x){return x.id===gid;});
if(!g)return '';
return '<span class="ust-gchip" style="font-size:9px;padding:3px 6px;margin:2px;" onclick="UST.rowRemoveGid('+i+',\''+gid+'\')" title="اضغط لإزالة">'+g.name.substring(0,18)+' </span>';
}).join('');
var opts='<option value="">🌐 كل المجموعات المختارة</option>'+pickGids.map(function(gid){var g=groupsAll().find(function(x){return x.id===gid;});return '<option value="'+gid+'" '+(r.override===gid?'selected':'')+'>'+(g?g.name:gid)+'</option>';}).join('');
return '<div class="ust-row" style="grid-template-columns:2fr 1.2fr 1.1fr 1.6fr auto;">'+
'<input type="text" class="form-input" style="padding:5px 8px;font-size:12px;" value="'+r.name+'" oninput="UST.rowEdit('+i+',\'name\',this.value)">'+
'<input type="text" class="form-input" style="padding:5px 8px;font-size:12px;" value="'+r.pp+'" oninput="UST.rowEdit('+i+',\'pp\',this.value)">'+
'<input type="text" class="form-input" style="padding:5px 8px;font-size:12px;" value="'+r.sp+'" oninput="UST.rowEdit('+i+',\'sp\',this.value)">'+
'<div style="display:flex;flex-direction:column;gap:4px;">'+
'<div style="display:flex;flex-wrap:wrap;gap:2px;max-height:50px;overflow:auto;">'+(chipsHtml||'<span class="text-xs text-muted">لا مجموعات — اختر من الفلتر</span>')+'</div>'+
'<select class="form-select" style="padding:3px 6px;font-size:10px;" onchange="UST.rowOverride('+i+',this.value)">'+opts+'</select>'+
'</div>'+
'<div style="display:flex;flex-direction:column;gap:4px;">'+
'<span id="ubBadge'+i+'"></span>'+
'<div style="display:flex;gap:4px;"><button type="button" class="btn btn-secondary btn-sm" title="تعديل الصف في الفورم" onclick="UST.rowToForm('+i+')">✏️</button><button type="button" class="btn btn-ghost btn-sm" title="فتح في المنصة" onclick="var r=window._ubRows['+i+'];var sid=r.editId||r.dupId;if(sid)openEditExistingPlatform(sid);">🪟</button><button type="button" class="btn btn-danger btn-sm" onclick="UST.delRow('+i+')">🗑</button></div>'+
'</div></div>';
}).join(''):'<p class="text-muted" style="text-align:center;padding:12px;">الكشف فاضي — ضيف طلاب من فوق</p>';
window._ubRows.forEach(function(_,i){UST.rowBadge(i);});
};
UST.rowRemoveGid=function(i,gid){
var r=window._ubRows[i];if(!r)return;
r.gids=(r.gids||[]).filter(function(g){return g!==gid;});
if(r.override===gid)r.override='';
UST.renderRows();
};

UST.saveBulk=async function(){
try{
var st=window._ustB;if(!st)return;
var pickGids=Object.keys(st.picks).map(function(k){return st.picks[k];}).filter(Boolean);
if(!pickGids.length){if(window.safeToast)window.safeToast('اختار مجموعة واحدة على الأقل لكل مدرس','error');return;}
if(!window._ubRows.length){if(window.safeToast)window.safeToast('الكشف فاضي','error');return;}
var saveBtn=document.querySelector('button[onclick*="saveBulk"]');
if(saveBtn){
saveBtn.disabled=true;
saveBtn.innerHTML='<span class="spinner"></span> جاري الحفظ... ('+window._ubRows.length+' طالب)';
saveBtn.style.opacity='0.7';
}
var added=0,linked=0,skipped=0,failed=0;
var total=window._ubRows.length;
var warnedMismatch = false;
for(var i=0;i<window._ubRows.length;i++){
if(i%5===0&&saveBtn){
saveBtn.innerHTML='<span class="spinner"></span> جاري الحفظ... '+Math.round((i/total)*100)+'% ('+i+'/'+total+')';
}
var r=window._ubRows[i];
var gids=r.override?[r.override]:((r.gids&&r.gids.length)?r.gids.slice():pickGids.slice());

/* 🛡️ فحص صارم للمجموعات */
var rowStage = st.stage || '';
var rowGrade = st.grade || '';
var validation = validateEnrollmentsStrict(gids, rowStage, rowGrade);
if (validation.invalid.length > 0 && !warnedMismatch) {
    if (window.safeToast) window.safeToast('⚠️ تم استبعاد مجموعات لا تطابق المرحلة/الصف في بعض الصفوف', 'warning');
    warnedMismatch = true;
}
gids = validation.valid;
rowStage = rowStage || validation.stage || '';
rowGrade = rowGrade || validation.grade || '';

if(!r.name || !gids.length){
if (!r.name) failed++;
else skipped++;
continue;
}
if(r.editId||(r.dupId&&r.link)){
var sid=r.editId||r.dupId;
await updateStudentFields(sid,{name:r.name,pp:r.pp,sp:r.sp,stage:rowStage,grade:rowGrade,center:st.center});
var res=await enrollMany(sid,gids);
if(res.added)linked++;else skipped++;
continue;
}
try{
var newId=null;
if(typeof DataService.addStudentByAdmin==='function'){
var ra2=await DataService.addStudentByAdmin({name:r.name,parentPhone:r.pp,phone:r.sp,stage:rowStage,grade:rowGrade,center:st.center,password:'1234',enrollments:gids.map(function(gid){var g=groupsAll().find(function(x){return x.id===gid;});return {groupId:gid,teacherId:g?g.teacherId:null};})});
newId=(ra2&&ra2.id)||null;
}else{
var nu=await DataService.addUser({role:'student',name:r.name,parentPhone:r.pp,phone:r.sp,stage:rowStage,grade:rowGrade,center:st.center,code:'EDU-'+Date.now().toString().slice(-6)+i,password:'1234'});
newId=(nu&&nu.id)||nu;
await enrollMany(newId,gids);
}
/* 👨‍👧‍ ربط الأسرة: الأخ الجديد والأخ الأصلي تحت نفس familyId */
if(r.siblingOf&&newId){
try{
var sibU=DataService.getUserById?DataService.getUserById(r.siblingOf):null;
if(sibU){
var fam=sibU.familyId||sibU.id;
if(!sibU.familyId&&DataService.updateUser)await DataService.updateUser(sibU.id,{familyId:fam});
if(DataService.updateUser)await DataService.updateUser(newId,{familyId:fam,siblingOf:r.siblingOf});
}
}catch(e){}
}
added++;
}catch(e){failed++;}
}
if(saveBtn){
saveBtn.disabled=false;
saveBtn.innerHTML='💾 حفظ الكل';
saveBtn.style.opacity='1';
}
ThemeManager.closeModal();
if(window.safeToast)window.safeToast('✅ جديد: '+added+' · مرتبط/معدّل: '+linked+' · متخطي: '+skipped+(failed?' · فشل: '+failed:''),'success');
refreshLists();
}catch(e){
var saveBtn=document.querySelector('button[onclick*="saveBulk"]');
if(saveBtn){
saveBtn.disabled=false;
saveBtn.innerHTML='💾 حفظ الكل';
saveBtn.style.opacity='1';
}
if(window.safeToast)window.safeToast('خطأ: '+e.message,'error');
}
};

/* ========== 🛠️ محرر نقاط + ستريك (لكل الأدوار) ========== */
UST.pointsEditor=function(sid){
try{
var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s)return;
var d=db();var rows=[];
(s.pointsHistory||[]).forEach(function(h,i){rows.push({src:'user',idx:i,pts:(h.points!=null?h.points:(h.amount||0)),reason:h.reason||h.note||'نقطة مسجلة',date:h.awardedAt||h.at||''});});
(d.manualPoints||[]).forEach(function(m,i){if(m.studentId===sid)rows.push({src:'manualPoints',idx:i,pts:m.points||0,reason:m.reason||'نقاط يدوية',date:m.awardedAt||m.createdAt||''});});
['interactionPoints','interactions'].forEach(function(key){(d[key]||[]).forEach(function(m,i){if(m.studentId===sid)rows.push({src:key,idx:i,pts:m.points||0,reason:m.note||'تفاعل حصة',date:m.awardedAt||m.createdAt||''});});});
rows.sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''));});
var total=rows.reduce(function(a,r){return a+(r.pts||0);},0);
var html='<div class="modal-header"><h3 class="modal-title">✏️ نقاط: '+s.name+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
'<div class="filter-info">💡 الإجمالي من كل المصادر: <strong style="font-family:var(--font-en);">'+total+'</strong> نقطة</div>'+
(rows.length?rows.map(function(r,i){return '<div class="sub-row" style="padding:6px 8px;margin-bottom:4px;"><div style="flex:1;"><strong>'+r.reason+'</strong><div class="text-xs text-muted">'+(r.date?new Date(r.date).toLocaleDateString('ar-EG'):'-')+' · '+({user:'سجل الطالب',manualPoints:'يدوي',interactionPoints:'تفاعل',interactions:'تفاعل'}[r.src]||r.src)+'</div></div><input type="number" class="form-input" style="width:80px;" id="peRow'+i+'" value="'+r.pts+'"><button class="btn btn-ghost btn-sm" onclick="UST.peSave(\''+sid+'\',\''+r.src+'\','+r.idx+','+i+')">💾</button><button class="btn btn-danger btn-sm" onclick="UST.peDel(\''+sid+'\',\''+r.src+'\','+r.idx+')">🗑</button></div>';}).join(''):'<p class="text-muted">مفيش نقاط مسجلة</p>')+
'<div class="card" style="padding:10px;margin-top:10px;"><strong class="text-sm">➕ إضافة نقاط</strong><div style="display:flex;gap:6px;margin-top:8px;"><input type="number" id="peAddVal" class="form-input" style="width:90px;" value="5"><input type="text" id="peAddReason" class="form-input" placeholder="السبب" style="flex:1;"><button class="btn btn-success btn-sm" onclick="UST.peAdd(\''+sid+'\')">➕</button></div></div></div>';
ThemeManager.openModal(html,'modal-md');
}catch(e){console.error(e);}
};
UST.peSave=async function(sid,src,idx,inputIdx){
try{
var val=parseInt((document.getElementById('peRow'+inputIdx)||{}).value)||0;
if(src==='user'){var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s||!s.pointsHistory||!s.pointsHistory[idx])return;s.pointsHistory[idx].points=val;if(DataService.updateUser)await DataService.updateUser(sid,{pointsHistory:s.pointsHistory});}
else{var d=db();var rec=(d[src]||[])[idx];if(!rec)return;rec.points=val;saveD(d);try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc(src,rec.id,rec);}catch(e){}}
if(window.safeToast)window.safeToast('✅ تم التعديل','success');
UST.pointsEditor(sid);
}catch(e){}
};
UST.peDel=async function(sid,src,idx){
try{
if(!confirm('حذف النقطة؟'))return;
if(src==='user'){var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s||!s.pointsHistory)return;s.pointsHistory.splice(idx,1);if(DataService.updateUser)await DataService.updateUser(sid,{pointsHistory:s.pointsHistory});}
else{var d=db();var rec=(d[src]||[])[idx];d[src]=(d[src]||[]).filter(function(_,j){return j!==idx;});saveD(d);try{if(rec&&window.FirebaseService&&FirebaseService._db)FirebaseService.deleteDoc(src,rec.id);}catch(e){}}
if(window.safeToast)window.safeToast('🗑 تم الحذف','success');
UST.pointsEditor(sid);
}catch(e){}
};
UST.peAdd=function(sid){
try{
var pts=parseInt((document.getElementById('peAddVal')||{}).value)||0;
if(!pts){if(window.safeToast)window.safeToast('اكتب العدد','error');return;}
var reason=(document.getElementById('peAddReason')||{}).value||'نقاط يدوية';
var u=cur();var d=db();d.manualPoints=d.manualPoints||[];
var rec={id:'mp_'+Date.now(),studentId:sid,points:pts,reason:reason,awardedBy:(u||{}).id||'',awardedAt:new Date().toISOString()};
d.manualPoints.push(rec);saveD(d);
try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc('manualPoints',rec.id,rec);}catch(e){}
try{if(DataService.addNotification)DataService.addNotification({targetUserId:sid,title:'🏆 نقاط جديدة',message:'+'+pts+' نقطة — '+reason,type:'points',priority:'medium',meta:{event:'points'}});}catch(e){}
if(window.safeToast)window.safeToast('✅ +'+pts+' نقطة','success');
UST.pointsEditor(sid);
}catch(e){}
};
UST.streakEditor=function(sid){
var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s)return;
var st=(s.streaks&&s.streaks.attendance)||0;
var v=prompt('🔥 ستريك '+s.name+' الحالي: '+st+'\nاكتب الرقم الجديد:',String(st));
if(v===null)return;
s.streaks=s.streaks||{};s.streaks.attendance=parseInt(v)||0;
var d=db();saveD(d);
try{if(DataService.updateUser)DataService.updateUser(sid,{streaks:s.streaks});}catch(e){}
try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc('users',sid,s);}catch(e){}
if(window.safeToast)window.safeToast('✅ الستريك بقى '+s.streaks.attendance,'success');
};
UST.quickPoints=function(sid,n){
try{
var u=cur();var d=db();d.manualPoints=d.manualPoints||[];
var rec={id:'mp_'+Date.now(),studentId:sid,points:n,reason:n>0?'مكافأة سريعة':'خصم سريع',awardedBy:(u||{}).id||'',awardedAt:new Date().toISOString()};
d.manualPoints.push(rec);saveD(d);
try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc('manualPoints',rec.id,rec);}catch(e){}
if(window.safeToast)window.safeToast((n>0?'➕':'➖')+' '+Math.abs(n)+' نقطة','success');
}catch(e){}
};
if(typeof window.editStudentPoints!=='function')window.editStudentPoints=UST.pointsEditor;

/* ========== 📸 هاب الباركود الإداري ========== */
window.openAdminBarcodeHub=function(){
try{
var html='<div class="modal-header"><h3 class="modal-title">📸 كاميرا الباركود — وضع إداري</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
'<div class="filter-info">💡 وجّه قارئ الباركود للخانة (بيكتب ويدوس Enter تلقائياً) أو اكتب كود/اسم/رقم — وكل أدوات الإدارة هتظهر فوراً.</div>'+
'<div class="form-group"><input type="text" id="abhQ" class="form-input" placeholder="🔍 كود الطالب / الاسم / الهاتف..." oninput="UST.abhScan()" onkeydown="if(event.key===\'Enter\')UST.abhEnter()"></div>'+
'<div id="abhList" style="max-height:170px;overflow:auto;margin-bottom:10px;"></div>'+
'<div id="abhCard"></div>'+
'<div style="margin-top:10px;"><button class="btn btn-ghost btn-sm" onclick="window.open(\'qr-scan.html\',\'_blank\')">📱 فتح كاميرا المسح في تبويب</button></div></div>';
ThemeManager.openModal(html,'modal-lg');
setTimeout(function(){var q=document.getElementById('abhQ');if(q)q.focus();},200);
}catch(e){console.error(e);}
};
UST.abhScan=function(){
var el=document.getElementById('abhList');if(!el)return;
var q=(document.getElementById('abhQ')||{}).value||'';
var nq=nm(q),pq=q.replace(/\D/g,'');
if(nq.length<2&&pq.length<3){el.innerHTML='';return;}
var res=students().filter(function(s){
if(s.code&&String(s.code).toLowerCase().indexOf(nq)>=0)return true;
if(pq.length>=3&&(String(s.phone||'').indexOf(pq)>=0||String(s.parentPhone||'').indexOf(pq)>=0))return true;
return nq.length>=3&&nm(s.name).indexOf(nq)>=0;
}).slice(0,8);
el.innerHTML=res.length?res.map(function(s){return '<div class="sub-row" style="padding:6px 8px;margin-bottom:4px;"><div style="flex:1;"><strong>'+s.name+'</strong> <span class="text-xs text-muted">'+(s.code||'')+' · '+(s.grade||'-')+'</span></div><button class="btn btn-primary btn-sm" onclick="UST.abhOpen(\''+s.id+'\')">📂 فتح Karte</button></div>';}).join(''):'<div class="text-xs text-muted">مفيش نتائج مطابقة</div>';
window._abhFirst=res.length?res[0].id:null;
};
UST.abhEnter=function(){if(window._abhFirst)UST.abhOpen(window._abhFirst);};
UST.abhOpen=function(sid){
try{
var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s)return;
var ens=ensOf(sid);
var pts=0;try{if(typeof Ops!=='undefined'&&Ops.getStudentPoints)pts=Ops.getStudentPoints(sid,null,'all')||0;}catch(e){}
var stk=(s.streaks&&s.streaks.attendance)||0;
var wa=String(s.parentPhone||'').replace(/\D/g,'');
var card=document.getElementById('abhCard');if(!card)return;
card.innerHTML='<div class="card" style="padding:12px;">'+
'<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><div><strong style="font-size:15px;">🎓 '+s.name+'</strong><div class="text-xs text-muted">'+(s.code||'')+' · '+(s.stage||'-')+' / '+(s.grade||'-')+' · '+(s.center||'-')+'</div></div><div style="text-align:left;"><span class="badge badge-primary">🏆 '+pts+' نقطة</span> <span class="badge badge-warning">🔥 '+stk+'</span></div></div>'+
'<div class="text-xs" style="margin:8px 0;">📱 ولي الأمر: '+(s.parentPhone||'-')+(wa?' <a href="https://wa.me/2'+wa+'" target="_blank" class="btn btn-success btn-sm" style="padding:2px 8px;">💬</a>':'')+' · الطالب: '+(s.phone||'-')+'</div>'+
'<div style="margin:8px 0;">'+(ens.length?ens.map(function(e){return '<span class="badge badge-info" style="margin:2px;">👥 '+(e.group&&e.group.name||'')+' <button style="background:none;border:none;color:var(--danger);cursor:pointer;font-weight:900;" onclick="UST.abhUnenroll(\''+sid+'\',\''+(e.group&&e.group.id)+'\')">✕</button></span>';}).join(''):'<span class="text-xs text-muted">غير مقيّد في مجموعات</span>')+'</div>'+
'<div style="display:flex;gap:6px;flex-wrap:wrap;">'+
'<button class="btn btn-warning btn-sm" onclick="UST.pointsEditor(\''+sid+'\')">✏️ النقاط</button>'+
'<button class="btn btn-secondary btn-sm" onclick="UST.streakEditor(\''+sid+'\')">🔥 الستريك</button>'+
'<button class="btn btn-success btn-sm" onclick="UST.quickPoints(\''+sid+'\',5)">➕5</button>'+
'<button class="btn btn-danger btn-sm" onclick="UST.quickPoints(\''+sid+'\',-5)">➖5</button>'+
'<button class="btn btn-ghost btn-sm" onclick="openEditExistingPlatform(\''+sid+'\')">📝 البيانات</button>'+
'<button class="btn btn-ghost btn-sm" onclick="window.open(\'print-qr.html?search='+encodeURIComponent(s.code||'')+'\',\'_blank\')">🖨️ باركود</button>'+
'<button class="btn btn-ghost btn-sm" onclick="LedgerUI&&LedgerUI.studentDetails&&LedgerUI.studentDetails(\''+sid+'\')">📒 الدفتر</button>'+
'<button class="btn btn-primary btn-sm" onclick="ThemeManager.closeModal();window.openUnifiedAddStudent();setTimeout(function(){UST.fillSingle(\''+sid+'\');},250);">🎓 إضافة لمجموعة</button>'+
'</div></div>';
document.getElementById('abhList').innerHTML='';
}catch(e){console.error(e);}
};
UST.abhUnenroll=function(sid,gid){
if(!confirm('فصل الطالب من المجموعة؟'))return;
unenrollMany(sid,[gid]);
if(window.safeToast)window.safeToast('⛔ تم الفصل','success');
UST.abhOpen(sid);refreshLists();
};
function injectAdminTiles(){
try{
if(!isAdminRole())return;
var grid=document.querySelector('#section-command .quick-action')||document.querySelector('#section-overview .quick-action');
if(!grid||!grid.parentNode)return;
if(!document.getElementById('abhTile')){
var b=document.createElement('button');b.type='button';b.className='quick-action';b.id='abhTile';
b.innerHTML='<div class="quick-action-icon">📸</div><div class="quick-action-label">كاميرا الباركود</div>';
b.onclick=function(){window.openAdminBarcodeHub();};
grid.parentNode.appendChild(b);
}
}catch(e){}
}
injectAdminTiles();setTimeout(injectAdminTiles,1200);setTimeout(injectAdminTiles,3000);
setInterval(injectAdminTiles,6000);
setInterval(function(){
try{
if(!isAdminRole())return;
document.querySelectorAll('.modal-body').forEach(function(mb){
if(mb.querySelector('#abxBox'))return;
if(mb.innerHTML.indexOf('باركود الطالب')<0)return;
var m=mb.innerHTML.match(/openStudentModal\('([^']+)'\)/);
if(!m)return;
var sid=m[1];
var box=document.createElement('div');box.id='abxBox';
box.innerHTML='<div class="filter-info" style="margin-top:10px;">🛠️ <strong>تحكم إداري سريع</strong></div><div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn btn-warning btn-sm" onclick="UST.pointsEditor(\''+sid+'\')">✏️ النقاط</button><button class="btn btn-secondary btn-sm" onclick="UST.streakEditor(\''+sid+'\')">🔥 الستريك</button><button class="btn btn-success btn-sm" onclick="UST.quickPoints(\''+sid+'\',5)">➕5</button><button class="btn btn-danger btn-sm" onclick="UST.quickPoints(\''+sid+'\',-5)">➖5</button></div>';
mb.appendChild(box);
});
}catch(e){}
},1200);

/* ========== 🔎 فلاتر صفحة المجموعات ========== */
function groupsFilterBar(){
try{
var containers=[];
['groupsList','workspaceView'].forEach(function(id){var el=document.getElementById(id);if(el)containers.push(el);});
var sec=document.getElementById('section-groups');
if(sec&&!containers.length){var c=sec.querySelector('.card');if(c)containers.push(c);}
containers.forEach(function(c){
if(!c||c.parentNode.querySelector('.ugfBar'))return;
var bar=document.createElement('div');bar.className='ugfBar card';bar.style.cssText='padding:10px;margin-bottom:10px;';
bar.innerHTML='<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;">'+
'<input type="text" class="form-input ugfQ" placeholder="🔍 بحث باسم المجموعة أو الأستاذ...">'+
'<select class="form-select ugfC"><option value="">كل السناتر</option></select>'+
'<select class="form-select ugfG"><option value="">كل الصفوف</option></select>'+
'<select class="form-select ugfS"><option value="">كل المراحل</option></select></div>'+
'<div class="text-xs text-muted" style="margin-top:6px;">معروض: <b class="ugfCount">-</b> مجموعة</div>';
c.parentNode.insertBefore(bar,c);
var gs=groupsAll();
var cs={};gs.forEach(function(g){if(g.center)cs[g.center]=1;});
bar.querySelector('.ugfC').innerHTML='<option value="">كل السناتر</option>'+Object.keys(cs).map(function(x){return '<option value="'+x+'">'+x+'</option>';}).join('');
var gr=[];gs.forEach(function(g){if(g.grade&&gr.indexOf(g.grade)<0)gr.push(g.grade);});
bar.querySelector('.ugfG').innerHTML='<option value="">كل الصفوف</option>'+gr.sort().map(function(x){return '<option value="'+x+'">'+x+'</option>';}).join('');
bar.querySelector('.ugfS').innerHTML='<option value="">كل المراحل</option>'+Object.keys(lv()).map(function(k){return '<option value="'+k+'">'+lv()[k].nameAr+'</option>';}).join('');
bar.querySelector('.ugfQ').oninput=applyGroupFilters;
bar.querySelector('.ugfC').onchange=applyGroupFilters;
bar.querySelector('.ugfG').onchange=applyGroupFilters;
bar.querySelector('.ugfS').onchange=applyGroupFilters;
});
}catch(e){}
}
function applyGroupFilters(){
try{
document.querySelectorAll('.ugfBar').forEach(function(bar){
var c=bar.nextElementSibling;while(c&&!c.querySelectorAll('.card,tr').length)c=c.nextElementSibling;if(!c)return;
var q=(bar.querySelector('.ugfQ').value||'').toLowerCase();
var fc=bar.querySelector('.ugfC').value,fg=bar.querySelector('.ugfG').value,fs=bar.querySelector('.ugfS').value;
var shown=0;
c.querySelectorAll('.card, tr').forEach(function(el){
var m=el.innerHTML.match(/openGroupModal\('([^']+)'\)|data-gid="([^"]+)"/);
var gid=m&&(m[1]||m[2]);if(!gid)return;
var g=groupsAll().find(function(x){return x.id===gid;});if(!g)return;
var t=g.teacherId?(DataService.getUserById?DataService.getUserById(g.teacherId):null):null;
var txt=(g.name+' '+(t?t.name:'')+' '+(g.center||'')+' '+(g.grade||'')).toLowerCase();
var ok=(!q||txt.indexOf(q)>=0)&&(!fc||(g.center||'')===fc)&&(!fg||(g.grade||'')===fg)&&(!fs||(g.stage||'')===fs);
el.style.display=ok?'':'none';
if(ok)shown++;
});
var cnt=bar.querySelector('.ugfCount');if(cnt)cnt.textContent=shown;
});
}catch(e){}
}
setInterval(function(){
try{
var act=document.querySelector('.section.active');
if(act&&(act.id==='section-groups'||act.id==='section-workspace'||act.id==='section-students')){groupsFilterBar();applyGroupFilters();}
}catch(e){}
},2000);
/* ========== 🔄 مودال تبديل مجموعة الطالب (واضح + آمن) ========== */
window._swp=null;
window.openUnifiedSwapStudent=function(sid){
try{
var s=DataService.getUserById?DataService.getUserById(sid):null;if(!s){if(window.safeToast)window.safeToast('طالب غير موجود','error');return;}
var ens=ensOf(sid);
window._swp={sid:sid,toTid:'',toGid:''};
var html='<div class="modal-header"><h3 class="modal-title">🔄 تبديل مجموعة: '+s.name+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'+
'<div class="filter-info">💡 التبديل بيشيل قيد واحد بس ويضيف قيد جديد — باقي مجموعات الطالب مع أساتذة تانيين مش بتتمس.</div>'+
'<div class="card" style="padding:10px;margin-bottom:10px;border-color:var(--danger);"><strong class="text-xs" style="color:var(--danger);">📍 هيتشال من (مجموعته الحالية):</strong>'+
(ens.length?'<select id="swpFrom" class="form-select" style="margin-top:6px;" onchange="UST.swpPreview()">'+ens.map(function(e){return '<option value="'+(e.group&&e.group.id)+'">'+(e.group&&e.group.name)+' · '+(e.teacher&&e.teacher.name||'')+' · '+(e.group&&e.group.center||'')+'</option>';}).join('')+'</select>':'<div class="text-xs text-muted" style="margin-top:6px;">غير مقيّد حالياً — هيتم إضافة قيد جديد بس</div>')+
'</div>'+
'<div class="card" style="padding:10px;margin-bottom:10px;border-color:var(--success);"><strong class="text-xs" style="color:var(--success);">🎯 هيروح لـ:</strong>'+
'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">'+
'<select id="swpTeacher" class="form-select" onchange="UST.swpTeacher(this.value)"><option value="">-- المدرس --</option>'+teachersAll().map(function(t){return '<option value="'+t.id+'">'+t.name+'</option>';}).join('')+'</select>'+
'<select id="swpGroup" class="form-select" onchange="UST.swpGroup(this.value)"><option value="">-- اختار مدرس الأول --</option></select>'+
'</div></div>'+
'<div id="swpPreview" class="filter-info" style="display:none;"></div>'+
'<button class="btn btn-primary w-full" style="padding:12px;" onclick="UST.swpSave()">🔄 تنفيذ التبديل</button></div>';
ThemeManager.openModal(html,'modal-md');
UST.swpPreview();
}catch(e){console.error(e);}
};
UST.swpTeacher=function(tid){
window._swp.toTid=tid;window._swp.toGid='';
var sel=document.getElementById('swpGroup');if(!sel)return;
var fromSel=document.getElementById('swpFrom');var fromGid=fromSel?fromSel.value:'';
var list=groupsAll().filter(function(g){return g.teacherId===tid&&g.id!==fromGid;});
sel.innerHTML=list.length?list.map(function(g){return '<option value="'+g.id+'">'+g.name+' · '+(g.grade||'-')+' · '+(g.center||'-')+'</option>';}).join(''):'<option value="">مفيش مجموعات للمدرس ده</option>';
window._swp.toGid=list.length?list[0].id:'';
UST.swpPreview();
};
UST.swpGroup=function(gid){window._swp.toGid=gid;UST.swpPreview();};
UST.swpPreview=function(){
var el=document.getElementById('swpPreview');if(!el||!window._swp)return;
var fromSel=document.getElementById('swpFrom');var fromGid=fromSel?fromSel.value:'';
var f=groupsAll().find(function(g){return g.id===fromGid;});
var t=groupsAll().find(function(g){return g.id===window._swp.toGid;});
if(!t){el.style.display='none';return;}
el.style.display='block';
el.innerHTML='📍 من: <strong>'+(f?f.name:'(غير مقيّد)')+'</strong> ← 🎯 إلى: <strong>'+t.name+'</strong> · '+(t.grade||'-')+' · '+(t.center||'-');
};
UST.swpSave=async function(){
try{
var sw=window._swp;if(!sw)return;
var fromSel=document.getElementById('swpFrom');var fromGid=fromSel?fromSel.value:'';
var toGid=sw.toGid;
if(!toGid){if(window.safeToast)window.safeToast('اختار المجموعة الجديدة','error');return;}
if(fromGid===toGid){if(window.safeToast)window.safeToast('دي نفس المجموعة — مفيش تبديل','info');return;}
var d=db();d.enrollments=d.enrollments||[];
var tg=groupsAll().find(function(g){return g.id===toGid;});
if(fromGid){
var old=(d.enrollments||[]).find(function(e){return e.studentId===sw.sid&&e.groupId===fromGid&&e.status==='active';});
if(old){d.enrollments=(d.enrollments||[]).filter(function(e){return e.id!==old.id;});cloud('enrollments',old,true);}
}
var ex=(d.enrollments||[]).find(function(e){return e.studentId===sw.sid&&e.groupId===toGid&&e.status==='active';});
if(!ex){
var ne={id:'en_'+Date.now(),studentId:sw.sid,groupId:toGid,teacherId:tg?tg.teacherId:null,status:'active',createdAt:new Date().toISOString()};
d.enrollments.push(ne);cloud('enrollments',ne,false);
}
saveD(d);
var patch={};if(tg&&tg.stage)patch.stage=tg.stage;if(tg&&tg.grade)patch.grade=tg.grade;
try{if(Object.keys(patch).length&&DataService.updateUser)await DataService.updateUser(sw.sid,patch);}catch(e){}
ThemeManager.closeModal();
if(window.safeToast)window.safeToast('✅ تم التبديل إلى '+((tg&&tg.name)||'')+' — باقي مجموعاته زي ما هي','success');
refreshLists();
}catch(e){if(window.safeToast)window.safeToast('خطأ: '+e.message,'error');}
};

/* ========== 🔗 فرض الموحّد + بدائل الميت ========== */
window.__ustAliasedKeys=window.__ustAliasedKeys||{};
function enforceAliases(){
window.openSwapStudentModal=window.openUnifiedSwapStudent;
window.openAssistantAddStudentModal=window.openUnifiedAddStudent;
window.openAssistantBulkAddStudentModal=window.openUnifiedBulkAdd;
window.openBulkAddStudentModal=window.openUnifiedBulkAdd;
window.openQuickAddStudentModal=window.openUnifiedAddStudent;
try{
Object.keys(window).forEach(function(k){
if(typeof window[k]!=='function')return;
if(k.indexOf('Unified')>=0||k.indexOf('__dead')===0)return;
if(window.__ustAliasedKeys[k])return;
if(/^open.*(Add|add).*(Student|student)/.test(k)&&k.indexOf('Edit')<0&&k.indexOf('edit')<0){
window['__dead_'+k]=window[k];
window[k]=/bulk/i.test(k)?window.openUnifiedBulkAdd:window.openUnifiedAddStudent;
window.__ustAliasedKeys[k]=1;
}
});
}catch(e){}
}
enforceAliases();setTimeout(enforceAliases,800);setTimeout(enforceAliases,2000);setTimeout(enforceAliases,4000);
setInterval(enforceAliases,6000);
setTimeout(function(){
if(typeof window.openStudentModal!=='function'){
window.openStudentModal=function(id){window.openUnifiedAddStudent();if(id)setTimeout(function(){UST.fillSingle(id);},200);};
}
if(typeof window.openEditStudentProfile!=='function'){
window.openEditStudentProfile=function(id){window.openUnifiedAddStudent();if(id)setTimeout(function(){UST.fillSingle(id);},200);};
}
},2500);
})();