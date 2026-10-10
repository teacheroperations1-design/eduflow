/* ================================================================
🔕 notify-rules V2 — فلترة ذكية بدون قفل أحداث مهمة
• الطالب/ولي الأمر يستقبلوا كل الأحداث المسموحة في policy
• الأدمن يقدر يقفل أي حدث من صفحة سياسة الإشعارات
• مفيش force function بتقفل أحداث أوتوماتيك
================================================================ */
(function(){
"use strict";

/* 🆕 V2: كل الأحداث مسموحة افتراضياً، الأدمن يتحكم من UI */
var STUDENT_PARENT_EVENTS=[
  'hw_new','exam_new','points','praise','absent','late',
  'session_cancel','schedule_change','due_warn','due_now',
  'payment_received','video_new','post_new','material_new',
  'challenge_new','general'
];

function forcePolicy(){
  try{
    if(localStorage.getItem('ldgNotifForcedV2'))return;
    var d=DataService._getData?DataService._getData():{};
    var pol=d.notifyPolicy||{};
    
    /* التأكد إن كل الأحداث موجودة ومفعلة للطالب وولي الأمر */
    ['student','parent'].forEach(function(r){
      pol[r]=pol[r]||{};
      STUDENT_PARENT_EVENTS.forEach(function(k){
        if(pol[r][k]===undefined) pol[r][k]=true;
      });
    });
    
    d.notifyPolicy=pol;
    if(DataService._saveData)DataService._saveData(d);
    try{localStorage.setItem('eduNotifyPolicy',JSON.stringify(pol));}catch(e){}
    if(window.FirebaseService&&FirebaseService.connected){
      try{FirebaseService.saveDoc('notifyPolicy','policy',pol);}catch(e){}
    }
    localStorage.setItem('ldgNotifForcedV2','1');
  }catch(e){}
}

forcePolicy();
setTimeout(forcePolicy,1500);
setTimeout(forcePolicy,4000);

/* 🆕 V2: فلترة بسيطة — لو الحدث مقفول في policy، ممنوع */
if(window.DataService&&DataService.addNotification&&!DataService.__nrWrapped){
  DataService.__nrWrapped=1;
  var orig=DataService.addNotification.bind(DataService);
  DataService.addNotification=function(n){
    try{
      var uid=n&&n.targetUserId;
      if(!uid) return orig(n);
      
      var u=DataService.getUserById?DataService.getUserById(uid):null;
      if(!u) return orig(n);
      
      var role=u.role;
      if(role==='student'||role==='parent'){
        var ev=(n&&n.meta&&n.meta.event)||'';
        var d=DataService._getData?DataService._getData():{};
        var pol=d.notifyPolicy||{};
        var rolePol=pol[role]||{};
        
        /* لو الحدث مقفول صراحة في policy، ممنوع */
        if(rolePol[ev]===false) return Promise.resolve(null);
      }
    }catch(e){}
    return orig(n);
  };
}
})();