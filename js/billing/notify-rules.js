/* ================================================================
🔕 notify-rules — طالب/ولي الأمر ميستقبلوش غير:
   1) إنذار الحصة قبل الأخيرة (due_warn)
   2) استحقاق الشهرية عند اكتمال النصاب (due_now)
================================================================ */
(function(){
"use strict";
var ALLOW=['due_warn','due_now'];
var ALL_EVENTS=['hw_new','exam_new','points','praise','absent','late','session_cancel','schedule_change','due_warn','due_now','payment_received','ledger_act','video_new','post_new','material_new','challenge_new','general'];
function roleOf(uid){try{var u=DataService.getUserById?DataService.getUserById(uid):null;return u?u.role:null;}catch(e){return null;}}
function force(){
try{
if(localStorage.getItem('ldgNotifForcedV1'))return;
var d=DataService._getData?DataService._getData():{};
var pol=d.notifyPolicy||{};
['student','parent'].forEach(function(r){
pol[r]=pol[r]||{};
ALL_EVENTS.forEach(function(k){pol[r][k]=ALLOW.indexOf(k)>=0;});
});
d.notifyPolicy=pol;
if(DataService._saveData)DataService._saveData(d);
try{localStorage.setItem('eduNotifyPolicy',JSON.stringify(pol));}catch(e){}
if(window.FirebaseService&&FirebaseService.connected){try{FirebaseService.saveDoc('notifyPolicy','policy',pol);}catch(e){}}
localStorage.setItem('ldgNotifForcedV1','1');
}catch(e){}
}
force();setTimeout(force,1500);setTimeout(force,4000);
/* منع إنشاء أي إشعار خارج القائمة للطالب/ولي الأمر من أي مصدر */
if(window.DataService&&DataService.addNotification&&!DataService.__nrWrapped){
DataService.__nrWrapped=1;
var orig=DataService.addNotification.bind(DataService);
DataService.addNotification=function(n){
try{
var r=roleOf(n&&n.targetUserId);
if(r==='student'||r==='parent'){
var ev=(n&&n.meta&&n.meta.event)||'';
if(ALLOW.indexOf(ev)<0)return Promise.resolve(null);
}
}catch(e){}
return orig(n);
};
}
})();