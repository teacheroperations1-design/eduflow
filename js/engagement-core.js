/* ================================================================
🎮 Engagement Core V1 — مركز التحفيز (ملف واحد لكل اللوحات)
• 🎲 كويز يومي (عدد الأسئلة والنقاط من الإعدادات) — مرة واحدة يومياً
• 🔥 سلاسل النشاط بمكافآت 7/14/30 يوم (قابلة للتعديل)
• 🏅 شارات إنجاز تلقائية (10 شارات)
• 🎰 صندوق مفاجآت أسبوعي (نقاط عشوائية بين حد أدنى/أقصى)
• 📸 تحدي صور: إنشاء (مدرس/مساعد/أدمن) + إرسال (طالب) + اعتماد = نقاط
• 📊 ترتيب اليوم (نقاط التفاعل اليومية)
• ⚙️ مودال إعدادات واحد للأدمن/المساعد يتحكم في كل الأرقام
================================================================ */
(function(){
"use strict";
var EG=window.EG=window.EG||{};
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function saveD(d){if(DataService._saveData)DataService._saveData(d);}
function cloud(col,id,o){try{if(window.FirebaseService&&FirebaseService._db)FirebaseService.saveDoc(col,id,o);}catch(e){}}
function cur(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null);}catch(e){return null;}}
function pad(n){return String(n).padStart(2,'0');}
function todayStr(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function prevDay(s){var d=new Date(s+'T12:00:00');d.setDate(d.getDate()-1);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function weekKey(){var d=new Date();var j=new Date(d.getFullYear(),0,1);var wk=Math.ceil((((d-j)/86400000)+j.getDay()+1)/7);return d.getFullYear()+'-W'+wk;}
function hash(s){var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return Math.abs(h);}
function toast(m,t){try{if(window.safeToast)window.safeToast(m,t||'info');}catch(e){}}
function cfg(){var c=db().engagementConfig||{};return Object.assign({quizCount:3,quizPoints:5,streak7:20,streak14:50,streak30:120,boxMin:5,boxMax:50,photoPoints:15},c);}
function saveCfg(c){var d=db();d.engagementConfig=c;saveD(d);cloud('meta','engagementConfig',c);}
function addPts(sid,pts,src){
var d=db();d.engagementPointsLog=d.engagementPointsLog||[];
d.engagementPointsLog.push({id:'ep_'+Date.now()+Math.random().toString(36).slice(2,6),studentId:sid,date:todayStr(),pts:pts,src:src,at:new Date().toISOString()});
if(d.engagementPointsLog.length>2000)d.engagementPointsLog=d.engagementPointsLog.slice(-1500);
saveD(d);
try{if(window.Ops&&Ops.addManualPoints)Ops.addManualPoints(sid,pts,src,(cur()||{}).id||'');}catch(e){}
}

/* ========== 🔥 سلاسل النشاط ========== */
function activityDates(sid){
var d=db(),set={};
(d.attendance||[]).forEach(function(a){if(a.status!=='approved')return;(a.records||[]).forEach(function(r){if(r.studentId===sid&&r.status==='present')set[a.date]=1;});});
(d.dailyQuiz||[]).forEach(function(q){if(q.studentId===sid)set[q.date]=1;});
(d.submissions||[]).forEach(function(s){if(s.studentId===sid&&s.submittedAt)set[String(s.submittedAt).slice(0,10)]=1;});
(d.engagementPointsLog||[]).forEach(function(p){if(p.studentId===sid)set[p.date]=1;});
return Object.keys(set).sort();
}
function streakOf(sid){
var dates=activityDates(sid);if(!dates.length)return 0;
var last=dates[dates.length-1];
if(last!==todayStr()&&last!==prevDay(todayStr()))return 0;
var set={};dates.forEach(function(x){set[x]=1;});
var cnt=0,c=last;
while(set[c]){cnt++;c=prevDay(c);}
return cnt;
}
function checkStreakMilestones(sid){
var d=db(),st=streakOf(sid),c=cfg();
d.streakClaims=d.streakClaims||{};d.streakClaims[sid]=d.streakClaims[sid]||{};
[[7,c.streak7],[14,c.streak14],[30,c.streak30]].forEach(function(m){
if(st>=m[0]&&!d.streakClaims[sid]['m'+m[0]]){
d.streakClaims[sid]['m'+m[0]]=todayStr();
addPts(sid,m[1],'🔥 مكافأة سلسلة '+m[0]+' يوم');
try{if(DataService.addNotification)DataService.addNotification({targetUserId:sid,title:'🔥 سلسلة '+m[0]+' يوم!',message:'مبروك الاستمرارية! +'+m[1]+' نقطة اتضافت لحسابك.',type:'points',priority:'medium',meta:{event:'points'}});}catch(e){}
}
});
saveD(d);
}

/* ========== 🏅 الشارات ========== */
var BADGES=[
{id:'first_hw',i:'📝',l:'أول واجب',chk:function(s,d){return (d.submissions||[]).some(function(x){return x.studentId===s;});}},
{id:'first_exam',i:'🎓',l:'أول امتحان',chk:function(s,d){return (d.examAttempts||[]).some(function(x){return x.studentId===s;});}},
{id:'perfect',i:'💯',l:'درجة كاملة',chk:function(s,d){return (d.submissions||[]).some(function(x){return x.studentId===s&&x.score>0&&x.score===x.maxScore;})||(d.examAttempts||[]).some(function(x){return x.studentId===s&&x.score>0&&x.score===x.maxScore;});}},
{id:'streak7',i:'🔥',l:'شعلة 7 أيام',chk:function(s){return streakOf(s)>=7;}},
{id:'streak30',i:'☄️',l:'شعلة 30 يوم',chk:function(s){return streakOf(s)>=30;}},
{id:'quiz10',i:'🎲',l:'10 كويزات يومية',chk:function(s,d){return (d.dailyQuiz||[]).filter(function(x){return x.studentId===s;}).length>=10;}},
{id:'box1',i:'🎁',l:'فاتح الصندوق',chk:function(s,d){return (d.mysteryBoxes||[]).some(function(x){return x.studentId===s;});}},
{id:'photo1',i:'📸',l:'مصوّر المذاكرة',chk:function(s,d){return (d.photoChallenges||[]).some(function(c){return (c.submissions||[]).some(function(x){return x.studentId===s;});});}},
{id:'points500',i:'🏆',l:'نادي الـ500 نقطة',chk:function(s){try{return (window.Ops&&Ops.getStudentPoints)?Ops.getStudentPoints(s,null,'all')>=500:false;}catch(e){return false;}}},
{id:'top3',i:'🥇',l:'منصة التتويج',chk:function(s){try{var r=(window.Ops&&Ops.getStudentRanking)?Ops.getStudentRanking(s,'month'):{};var ok=false;Object.keys(r).forEach(function(k){if(k!=='_grade'&&r[k]&&r[k].rank<=3)ok=true;});if(r._grade&&r._grade.rank<=3)ok=true;return ok;}catch(e){return false;}}}
];
function checkAchievements(sid){
var d=db();d.achievements=d.achievements||{};d.achievements[sid]=d.achievements[sid]||{};
BADGES.forEach(function(b){
if(d.achievements[sid][b.id])return;
var ok=false;try{ok=b.chk(sid,d);}catch(e){}
if(ok){
d.achievements[sid][b.id]=todayStr();
try{if(DataService.addNotification)DataService.addNotification({targetUserId:sid,title:b.i+' شارة جديدة: '+b.l,message:'افتحت شارة "'+b.l+'" — كمّل كده وباقي الشارات جاية! 🎉',type:'points',priority:'low',meta:{event:'points'}});}catch(e){}
}
});
saveD(d);
}

/* ========== 🎲 الكويز اليومي ========== */
function quizQuestions(sid){
var c=cfg(),d=db(),pool=[];
var gids=(DataService.getStudentTeachers?DataService.getStudentTeachers(sid):[]).map(function(t){return t.group.id;});
(d.exams||[]).forEach(function(e){if(gids.indexOf(e.groupId)>=0)(e.questions||[]).forEach(function(q){if(q.type==='mcq'||q.type==='tf')pool.push({type:q.type,text:q.text,options:q.options||[],correct:q.correctAnswer});});});
(d.homework||[]).forEach(function(h){if(gids.indexOf(h.groupId)>=0)(h.questions||[]).forEach(function(q){if(q.type==='mcq'||q.type==='tf')pool.push({type:q.type,text:q.text,options:q.options||[],correct:q.correctAnswer});});});
if(!pool.length)return[];
var arr=pool.slice(),s=hash(todayStr()+'|'+sid);
for(var i=arr.length-1;i>0;i--){s=(s*9301+49297)%233280;var j=s%(i+1);var t=arr[i];arr[i]=arr[j];arr[j]=t;}
return arr.slice(0,c.quizCount);
}
EG.submitDailyQuiz=function(){
var u=cur();if(!u)return;
var d=db();d.dailyQuiz=d.dailyQuiz||[];
if(d.dailyQuiz.some(function(q){return q.studentId===u.id&&q.date===todayStr();})){toast('انت جاوبت كويز النهارده بالفعل','info');return;}
var qs=quizQuestions(u.id);if(!qs.length){toast('مفيش أسئلة متاحة ليوم النهارده','error');return;}
var correct=0;
qs.forEach(function(q,i){var sel=document.querySelector('input[name="eq'+i+'"]:checked');if(sel&&+sel.value===q.correct)correct++;});
var c=cfg(),pts=correct*c.quizPoints;
d.dailyQuiz.push({id:'dq_'+Date.now(),studentId:u.id,date:todayStr(),correct:correct,total:qs.length,points:pts,at:new Date().toISOString()});
saveD(d);
if(pts>0)addPts(u.id,pts,'🎲 كويز يومي ('+correct+'/'+qs.length+')');
checkStreakMilestones(u.id);checkAchievements(u.id);
toast('🎲 نتيجتك: '+correct+'/'+qs.length+' → +'+pts+' نقطة','success');
EG.renderStudent();
};

/* ========== 🎰 صندوق المفاجآت ========== */
EG.openMysteryBox=function(){
var u=cur();if(!u)return;
var d=db();d.mysteryBoxes=d.mysteryBoxes||[];
var wk=weekKey();
var done=d.mysteryBoxes.find(function(b){return b.studentId===u.id&&b.week===wk;});
if(done){toast('فتحت صندوق الأسبوع ده بالفعل (+'+done.points+' نقطة)','info');return;}
var c=cfg();
var pts=c.boxMin+(hash(u.id+wk)%(Math.max(1,c.boxMax-c.boxMin+1)));
d.mysteryBoxes.push({id:'mb_'+Date.now(),studentId:u.id,week:wk,points:pts,openedAt:new Date().toISOString()});
saveD(d);addPts(u.id,pts,'🎁 صندوق المفاجآت الأسبوعي');
checkAchievements(u.id);
toast('🎁 مبروك! الصندوق طلعلك '+pts+' نقطة','success');
EG.renderStudent();
};

/* ========== 📸 تحدي الصور ========== */
EG.openPhotoChallengeModal=function(){
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">📸 تحدي صور جديد</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'
+'<div class="filter-info">💡 بيظهر لكل الطلاب أسبوعياً — الاعتماد بيمنح نقاط التحدي تلقائياً.</div>'
+'<div class="form-group"><label>عنوان التحدي *</label><input type="text" id="pcTitle" class="form-input" placeholder="مثال: صوّر حاجة في بيتك ليها علاقة بالدرس"></div>'
+'<div class="form-group"><label>الوصف/التعليمات</label><textarea id="pcDesc" class="form-input" rows="3"></textarea></div>'
+'<div class="form-group"><label>آخر موعد (اختياري)</label><input type="date" id="pcDeadline" class="form-input"></div>'
+'<button class="btn btn-primary w-full" onclick="EG.savePhotoChallenge()">💾 نشر التحدي</button></div>','modal-sm');
};
EG.savePhotoChallenge=function(){
var t=(document.getElementById('pcTitle')||{}).value||'';
if(!t){toast('اكتب عنوان التحدي','error');return;}
var d=db();d.photoChallenges=d.photoChallenges||[];
var ch={id:'pc_'+Date.now(),title:t,desc:(document.getElementById('pcDesc')||{}).value||'',week:weekKey(),deadline:(document.getElementById('pcDeadline')||{}).value||'',createdBy:(cur()||{}).id||'',status:'active',submissions:[]};
d.photoChallenges.push(ch);saveD(d);cloud('photoChallenges',ch.id,ch);
try{if(typeof ThemeManager!=='undefined')ThemeManager.closeModal();}catch(e){}
toast('📸 تم نشر التحدي لكل الطلاب','success');
EG.renderHub();
};
EG.submitPhoto=function(cid){
var u=cur();if(!u)return;
var url=(document.getElementById('phUrl_'+cid)||{}).value||'';
var cap=(document.getElementById('phCap_'+cid)||{}).value||'';
if(!url){toast('حط لينك الصورة الأول','error');return;}
var d=db();var ch=(d.photoChallenges||[]).find(function(x){return x.id===cid;});if(!ch)return;
ch.submissions=ch.submissions||[];
if(ch.submissions.some(function(s){return s.studentId===u.id&&s.status==='pending';})){toast('عندك إرسال مستني مراجعة بالفعل','info');return;}
ch.submissions.push({id:'ps_'+Date.now(),studentId:u.id,imageUrl:url,caption:cap,status:'pending',at:new Date().toISOString()});
saveD(d);cloud('photoChallenges',ch.id,ch);
checkAchievements(u.id);
toast('📸 تم الإرسال — النقاط بعد الاعتماد','success');
EG.renderStudent();
};
EG.reviewPhoto=function(cid,pid,ok){
var d=db();var ch=(d.photoChallenges||[]).find(function(x){return x.id===cid;});if(!ch)return;
var s=(ch.submissions||[]).find(function(x){return x.id===pid;});if(!s)return;
if(ok){s.status='approved';var c=cfg();addPts(s.studentId,c.photoPoints,'📸 تحدي صور: '+ch.title);}
else s.status='rejected';
saveD(d);cloud('photoChallenges',ch.id,ch);
toast(ok?'✅ تم الاعتماد ومنح النقاط':'✗ تم الرفض','success');
EG.renderHub();
};

/* ========== 📊 ترتيب اليوم ========== */
function todayBoard(){
var d=db();var log=(d.engagementPointsLog||[]).filter(function(p){return p.date===todayStr();});
var map={};log.forEach(function(p){map[p.studentId]=(map[p.studentId]||0)+p.pts;});
return Object.keys(map).map(function(id){var u=DataService.getUserById?DataService.getUserById(id):null;return{id:id,name:u?u.name:'؟',pts:map[id]};}).sort(function(a,b){return b.pts-a.pts;});
}

/* ========== ⚙️ مودال الإعدادات (أدمن/مساعد) ========== */
EG.openSettings=function(){
var c=cfg();
ThemeManager.openModal('<div class="modal-header"><h3 class="modal-title">⚙️ إعدادات مركز التحفيز</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">'
+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
+'<div class="form-group"><label>🎲 عدد أسئلة الكويز اليومي</label><input type="number" id="egQuizCount" class="form-input" value="'+c.quizCount+'" min="1" max="10"></div>'
+'<div class="form-group"><label>🎲 نقطة لكل إجابة صحيحة</label><input type="number" id="egQuizPts" class="form-input" value="'+c.quizPoints+'" min="1"></div>'
+'<div class="form-group"><label>🔥 مكافأة 7 أيام</label><input type="number" id="egS7" class="form-input" value="'+c.streak7+'"></div>'
+'<div class="form-group"><label>🔥 مكافأة 14 يوم</label><input type="number" id="egS14" class="form-input" value="'+c.streak14+'"></div>'
+'<div class="form-group"><label>🔥 مكافأة 30 يوم</label><input type="number" id="egS30" class="form-input" value="'+c.streak30+'"></div>'
+'<div class="form-group"><label>📸 نقاط تحدي الصور</label><input type="number" id="egPhoto" class="form-input" value="'+c.photoPoints+'"></div>'
+'<div class="form-group"><label>🎰 صندوق: أقل نقاط</label><input type="number" id="egBoxMin" class="form-input" value="'+c.boxMin+'"></div>'
+'<div class="form-group"><label>🎰 صندوق: أعلى نقاط</label><input type="number" id="egBoxMax" class="form-input" value="'+c.boxMax+'"></div>'
+'</div>'
+'<button class="btn btn-primary w-full" onclick="EG.saveSettings()">💾 حفظ الإعدادات</button></div>','modal-sm');
};
EG.saveSettings=function(){
var g=function(id){return parseInt((document.getElementById(id)||{}).value)||0;};
saveCfg({quizCount:Math.max(1,g('egQuizCount')),quizPoints:Math.max(1,g('egQuizPts')),streak7:g('egS7'),streak14:g('egS14'),streak30:g('egS30'),photoPoints:g('egPhoto'),boxMin:g('egBoxMin'),boxMax:Math.max(g('egBoxMax'),g('egBoxMin')+1)});
try{ThemeManager.closeModal();}catch(e){}
toast('✅ تم حفظ إعدادات التحفيز — سارية على كل اللوحات','success');
};

/* ========== 🎨 CSS ========== */
if(!document.getElementById('engCss')){
var st=document.createElement('style');st.id='engCss';
st.textContent='.eng-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;}'+
'.eng-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;position:relative;overflow:hidden;}'+
'.eng-card h4{margin:0 0 8px;font-size:14px;font-weight:800;display:flex;gap:6px;align-items:center;}'+
'.eng-badge{display:inline-flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border-radius:10px;background:var(--surface-hover);border:1px solid var(--border);font-size:10px;font-weight:700;text-align:center;min-width:74px;}'+
'.eng-badge.locked{opacity:.35;filter:grayscale(1);}'+
'.eng-badge .bi{font-size:22px;}'+
'.eng-quiz-q{background:var(--surface-hover);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;}'+
'.eng-quiz-opt{display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:8px;cursor:pointer;font-size:12px;}'+
'.eng-quiz-opt:hover{background:var(--primary-bg);}'+
'.eng-lb-row{display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:8px;margin-bottom:4px;font-size:12px;font-weight:700;}'+
'@media(max-width:640px){.eng-grid{grid-template-columns:1fr;}}';
document.head.appendChild(st);
}

/* ========== ‍🎓 واجهة الطالب ========== */
EG.renderStudent=function(){
var host=document.getElementById('engHost');if(!host)return;
var u=cur();if(!u||u.role!=='student'){host.innerHTML='';return;}
var d=db(),c=cfg();
var todayQuiz=(d.dailyQuiz||[]).find(function(q){return q.studentId===u.id&&q.date===todayStr();});
var qs=todayQuiz?[]:quizQuestions(u.id);
var st=streakOf(u.id);
var wk=weekKey();var box=(d.mysteryBoxes||[]).find(function(b){return b.studentId===u.id&&b.week===wk;});
var earned=d.achievements&&d.achievements[u.id]?d.achievements[u.id]:{};
var board=todayBoard();var myRank=board.findIndex(function(x){return x.id===u.id;})+1;
var html='<div class="eng-grid">';
/* الكويز اليومي */
html+='<div class="eng-card"><h4>🎲 كويز اليوم</h4>';
if(todayQuiz) html+='<div class="text-sm">نتيجتك النهارده: <strong>'+todayQuiz.correct+'/'+todayQuiz.total+'</strong> → +'+todayQuiz.points+' نقطة ✅</div><div class="text-xs text-muted" style="margin-top:6px;">ارجع بكرة لأسئلة جديدة!</div>';
else if(!qs.length) html+='<div class="text-xs text-muted">مفيش أسئلة متاحة ليوم النهارده — الأستاذ لسه مضيفش أسئلة لمجموعاتك.</div>';
else html+=qs.map(function(q,i){return '<div class="eng-quiz-q"><div class="text-sm" style="font-weight:700;margin-bottom:6px;">س'+(i+1)+': '+q.text+'</div>'+((q.options||[]).map(function(o,oi){return '<label class="eng-quiz-opt"><input type="radio" name="eq'+i+'" value="'+oi+'" style="accent-color:var(--primary);"> '+o+'</label>';}).join(''))+'</div>';}).join('')+'<button class="btn btn-primary w-full" onclick="EG.submitDailyQuiz()">✅ تسليم ('+c.quizPoints+' نقطة لكل إجابة صحيحة)</button>';
html+='</div>';
/* السلسلة */
var nextM=st<7?7:(st<14?14:(st<30?30:null));
html+='<div class="eng-card"><h4>🔥 سلسلة نشاطك</h4><div style="font-size:34px;font-weight:900;font-family:var(--font-en);color:var(--warning);">'+st+' <span style="font-size:13px;">يوم متتالي</span></div>'+(nextM?'<div class="progress-bar" style="margin-top:8px;"><div class="progress-bar-fill" style="width:'+Math.min(100,Math.round(st/nextM*100))+'%"></div></div><div class="text-xs text-muted" style="margin-top:6px;">فاضل '+(nextM-st)+' يوم على مكافأة الـ'+nextM+' يوم (+'+(nextM===7?c.streak7:nextM===14?c.streak14:c.streak30)+' نقطة)</div>':'<div class="text-xs" style="color:var(--success);font-weight:800;margin-top:6px;">🏆 كل المكافآت اتفتحت!</div>')+'</div>';
/* الصندوق */
html+='<div class="eng-card"><h4>🎰 صندوق الأسبوع</h4>'+(box?'<div class="text-sm">فتحت الصندوق: <strong style="color:var(--success);">+'+box.points+' نقطة</strong> 🎉</div><div class="text-xs text-muted" style="margin-top:6px;">صندوق جديد كل أسبوع</div>':'<div style="text-align:center;padding:10px;"><div style="font-size:44px;cursor:pointer;" onclick="EG.openMysteryBox()">🎁</div><button class="btn btn-warning btn-sm w-full" style="margin-top:8px;" onclick="EG.openMysteryBox()">افتح الصندوق ('+c.boxMin+'–'+c.boxMax+' نقطة)</button></div>')+'</div>';
/* تحدي الصور */
var activeCh=(d.photoChallenges||[]).filter(function(x){return x.status==='active'&&(!x.deadline||x.deadline>=todayStr());});
html+='<div class="eng-card"><h4>📸 تحدي الصور</h4>';
html+=activeCh.length?activeCh.map(function(ch){
var mine=(ch.submissions||[]).find(function(s){return s.studentId===u.id;});
var inner='<div class="text-sm" style="font-weight:700;">'+ch.title+'</div><div class="text-xs text-muted" style="margin:4px 0 8px;">'+(ch.desc||'')+(ch.deadline?' · ⏳ لحد '+ch.deadline:'')+'</div>';
if(mine) inner+='<span class="badge '+(mine.status==='approved'?'badge-success':mine.status==='rejected'?'badge-danger':'badge-warning')+'">'+(mine.status==='approved'?'✅ معتمد +'+c.photoPoints:mine.status==='rejected'?'✗ مرفوض':'⏳ مستني مراجعة')+'</span>';
else inner+='<input type="text" id="phUrl_'+ch.id+'" class="form-input" style="margin-bottom:6px;" placeholder="لينك الصورة (Drive/أي رابط)"><input type="text" id="phCap_'+ch.id+'" class="form-input" style="margin-bottom:6px;" placeholder="وصف قصير (اختياري)"><button class="btn btn-secondary btn-sm w-full" onclick="EG.submitPhoto(\''+ch.id+'\')">📤 إرسال</button>';
return inner;
}).join('<hr style="border-color:var(--border);margin:10px 0;">'):'<div class="text-xs text-muted">مفيش تحدي صور نشط حالياً — مستني الأستاذ ينزل واحد جديد.</div>';
html+='</div>';
/* الشارات */
html+='<div class="eng-card" style="grid-column:1/-1;"><h4>🏅 شاراتي ('+Object.keys(earned).length+'/'+BADGES.length+')</h4><div style="display:flex;gap:8px;flex-wrap:wrap;">'+BADGES.map(function(b){var got=!!earned[b.id];return '<div class="eng-badge '+(got?'':'locked')+'" title="'+b.l+(got?' — اتفتحت '+earned[b.id]:'')+'"><span class="bi">'+b.i+'</span>'+b.l+'</div>';}).join('')+'</div></div>';
/* ترتيب اليوم */
html+='<div class="eng-card"><h4>📊 ترتيب اليوم</h4>'+(board.length?board.slice(0,5).map(function(x,i){return '<div class="eng-lb-row" style="background:'+(i===0?'rgba(255,215,0,.12)':i===1?'rgba(192,192,192,.1)':i===2?'rgba(205,127,50,.1)':'var(--surface-hover)')+';"><span>'+(i+1)+'. '+x.name+(x.id===u.id?' (انت)':'')+'</span><span style="font-family:var(--font-en);color:var(--primary);">'+x.pts+'</span></div>';}).join('')+(myRank>5?'<div class="text-xs text-muted" style="margin-top:6px;">ترتيبك النهارده: #'+myRank+'</div>':''):'<div class="text-xs text-muted">لسه مفيش نقاط تفاعل النهارده — كن أول واحد! 🚀</div>')+'</div>';
html+='</div>';
host.innerHTML=html;
};

/* ========== 🧑💼 واجهة الإدارة (مدرس/مساعد/أدمن) ========== */
EG.renderHub=function(){
var host=document.getElementById('engHubHost');if(!host)return;
var u=cur();if(!u)return;
var d=db(),c=cfg();
var canManage=(u.role==='teacher'||u.role==='assistant'||u.role==='admin'||u.role==='super_admin');
var board=todayBoard();
var quizToday=(d.dailyQuiz||[]).filter(function(q){return q.date===todayStr();});
var boxesWeek=(d.mysteryBoxes||[]).filter(function(b){return b.week===weekKey();});
var html='<div class="eng-grid">';
html+='<div class="eng-card"><h4>📈 إحصائيات اليوم</h4><div style="display:flex;gap:10px;flex-wrap:wrap;"><div class="stat-mini-box" style="flex:1;"><div class="stat-mini-value">'+quizToday.length+'</div><div class="stat-mini-label">🎲 حلّوا الكويز</div></div><div class="stat-mini-box" style="flex:1;"><div class="stat-mini-value">'+boxesWeek.length+'</div><div class="stat-mini-label">🎰 فتحوا الصندوق (الأسبوع)</div></div><div class="stat-mini-box" style="flex:1;"><div class="stat-mini-value">'+board.length+'</div><div class="stat-mini-label">📊 كسبوا نقاط النهارده</div></div></div>'+(canManage?'<button class="btn btn-secondary btn-sm w-full" style="margin-top:10px;" onclick="EG.openSettings()">⚙️ إعدادات النقاط والأرقام</button>':'')+'</div>';
html+='<div class="eng-card"><h4>📊 ترتيب اليوم (كل المنصة)</h4>'+(board.length?board.slice(0,10).map(function(x,i){return '<div class="eng-lb-row" style="background:var(--surface-hover);"><span>'+(i+1)+'. '+x.name+'</span><span style="font-family:var(--font-en);color:var(--primary);">'+x.pts+'</span></div>';}).join(''):'<div class="text-xs text-muted">مفيش نشاط النهارده لسه</div>')+'</div>';
if(canManage){
var chs=(d.photoChallenges||[]).slice().reverse();
html+='<div class="eng-card" style="grid-column:1/-1;"><h4>📸 تحديات الصور <button class="btn btn-primary btn-sm" style="margin-inline-start:auto;" onclick="EG.openPhotoChallengeModal()">➕ تحدي جديد</button></h4>';
html+=chs.length?chs.map(function(ch){
var pend=(ch.submissions||[]).filter(function(s){return s.status==='pending';});
return '<div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px;"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><strong>'+ch.title+'</strong><span class="text-xs text-muted">أسبوع '+ch.week+' · '+(ch.submissions||[]).length+' إرسال · '+pend.length+' مستني</span></div>'+(pend.length?'<div style="margin-top:8px;">'+pend.map(function(s){var su=DataService.getUserById?DataService.getUserById(s.studentId):null;return '<div class="sub-row" style="margin-bottom:6px;"><div style="flex:1;"><strong>'+(su?su.name:'؟')+'</strong><div class="text-xs text-muted">'+(s.caption||'')+'</div><a href="'+s.imageUrl+'" target="_blank" class="btn btn-ghost btn-sm" style="margin-top:4px;">👁 عرض الصورة</a></div><div style="display:flex;gap:6px;"><button class="btn btn-success btn-sm" onclick="EG.reviewPhoto(\''+ch.id+'\',\''+s.id+'\',true)">✓ اعتماد (+'+c.photoPoints+')</button><button class="btn btn-danger btn-sm" onclick="EG.reviewPhoto(\''+ch.id+'\',\''+s.id+'\',false)">✗ رفض</button></div></div>';}).join('')+'</div>':'<div class="text-xs text-muted" style="margin-top:6px;">مفيش إرسالات مستنية</div>')+'</div>';
}).join(''):'<div class="text-xs text-muted">لسه مفيش تحديات — اعمل أول واحد بزرار ➕</div>';
html+='</div>';
}
html+='</div>';
host.innerHTML=html;
};

/* ========== 🔌 الحقن التلقائي في اللوحات ========== */
function injectStudent(){
var u=cur();if(!u||u.role!=='student')return;
if(!document.getElementById('section-engagement')){
var host=document.querySelector('.content-area');if(!host)return;
var sec=document.createElement('section');sec.className='section';sec.id='section-engagement';
sec.innerHTML='<div class="section-header"><div><h2 class="section-title">🎮 مركز التحفيز</h2><p class="text-sm text-muted">كويز يومي · سلسلة 🔥 · صندوق 🎰 · شارات 🏅 · تحدي صور 📸 · ترتيب اليوم</p></div></div><div id="engHost"></div>';
host.appendChild(sec);
}
var nav=document.getElementById('sidebarNav');
if(nav&&!nav.querySelector('[data-section="engagement"]')){
nav.insertAdjacentHTML('beforeend','<div class="sidebar-item" data-section="engagement" onclick="window.showSection(\'engagement\')"><span class="sidebar-item-icon">🎮</span><span class="sidebar-item-label">مركز التحفيز</span></div>');
}
}
function injectHub(){
var u=cur();if(!u)return;
if(!(u.role==='teacher'||u.role==='assistant'||u.role==='admin'||u.role==='super_admin'))return;
if(!document.getElementById('section-engagementHub')){
var host=document.querySelector('.content-area');if(!host)return;
var sec=document.createElement('section');sec.className='section';sec.id='section-engagementHub';
sec.innerHTML='<div class="section-header"><div><h2 class="section-title">🎯 مركز التفاعل</h2><p class="text-sm text-muted">إحصائيات · ترتيب اليوم · تحديات الصور · إعدادات النقاط</p></div></div><div id="engHubHost"></div>';
host.appendChild(sec);
}
var nav=document.getElementById('sidebarNav');
if(nav&&!nav.querySelector('[data-section="engagementHub"]')){
nav.insertAdjacentHTML('beforeend','<div class="sidebar-item" data-section="engagementHub" onclick="window.showSection(\'engagementHub\')"><span class="sidebar-item-icon">🎯</span><span class="sidebar-item-label">مركز التفاعل</span></div>');
}
}
if(typeof window.showSection==='function'&&!window.__engHook){
window.__engHook=1;
var os=window.showSection;
window.showSection=function(id){
var r=os.apply(this,arguments);
try{
if(id==='engagement')EG.renderStudent();
if(id==='engagementHub')EG.renderHub();
}catch(e){}
return r;
};
}
function boot(){
injectStudent();injectHub();
var u=cur();
if(u&&u.role==='student'){checkStreakMilestones(u.id);checkAchievements(u.id);}
}
boot();setTimeout(boot,800);setTimeout(boot,2000);
setInterval(function(){injectStudent();injectHub();},6000);
setInterval(function(){var u=cur();if(u&&u.role==='student'){checkStreakMilestones(u.id);checkAchievements(u.id);}var act=document.querySelector('.section.active');if(act&&act.id==='section-engagement')EG.renderStudent();if(act&&act.id==='section-engagementHub')EG.renderHub();},30000);
})();