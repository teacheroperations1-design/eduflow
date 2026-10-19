/* ================================================================
💾 Legendary Persist V1 — إصلاح رجوع البيانات بعد الريفريش
• مصدر حقيقة واحد: localStorage بختم مراجعة (rev)
• كاش بيتبطل تلقائياً لما أي تبويب تاني يكتب (مفيش overwrite تاني)
• طابور إعادة محاولة للسحابة + مزامنة مجموعات متغيرة بس
================================================================ */
(function(){
"use strict";
var DBKEY='eduflow_db', REVKEY='eduflow_rev';
function nowRev(){ return String(Date.now()); }
function readRaw(){ try{ var raw=localStorage.getItem(DBKEY); return raw?JSON.parse(raw):null; }catch(e){ return null; } }
var cache=null, cacheRev=null;
function fresh(){
  var rev=null; try{ rev=localStorage.getItem(REVKEY); }catch(e){}
  if(cache===null||cacheRev!==rev){ cache=readRaw(); cacheRev=rev; }
  return cache;
}
window.addEventListener('storage',function(ev){
  if(ev.key===REVKEY||ev.key===DBKEY){ cache=null; cacheRev=null; }
});
function install(){
  if(!window.DataService||typeof DataService._saveData!=='function'||DataService.__persistV1) return false;
  DataService.__persistV1=1;
  var origGet=DataService._getData;
  DataService._getData=function(){
    var f=fresh();
    if(f&&typeof f==='object') return f;
    return origGet.apply(this,arguments);
  };
  var origSave=DataService._saveData;
  DataService._saveData=function(d){
    var r=origSave.apply(this,arguments);
    try{ localStorage.setItem(REVKEY, nowRev()); }catch(e){}
    cache=null; cacheRev=null;
    scheduleCloud();
    return r;
  };
  return true;
}
/* ☁️ طابور إعادة محاولة للكتابات السحابية الفاشلة */
var retryQ=[];
function wrapCloud(){
  if(!window.FirebaseService||!FirebaseService._db||FirebaseService.__persistV1) return;
  FirebaseService.__persistV1=1;
  ['saveDoc','deleteDoc'].forEach(function(fn){
    var orig=FirebaseService[fn];
    if(typeof orig!=='function') return;
    FirebaseService[fn]=function(col,id,data){
      return Promise.resolve(orig.apply(this,arguments)).catch(function(err){
        if(retryQ.length<300) retryQ.push({fn:fn,col:col,id:id,data:data||null,tries:1});
        throw err;
      });
    };
  });
}
function flushRetry(){
  if(!retryQ.length||!(window.FirebaseService&&FirebaseService._db)) return;
  var batch=retryQ.splice(0,40);
  batch.forEach(function(op){
    var p; try{ p=FirebaseService[op.fn](op.col,op.id,op.data); }catch(e){ p=Promise.reject(e); }
    Promise.resolve(p).catch(function(){ if(op.tries<3){ op.tries++; retryQ.push(op); } });
  });
}
/* ☁️ مزامنة سحابية ذكية: المجموعات اللي اتغيرت بس */
var cloudTimer=null, lastHash={};
function hashStr(s){ var h=5381; for(var i=0;i<s.length;i++){ h=((h<<5)+h+s.charCodeAt(i))|0; } return h; }
function scheduleCloud(){
  if(cloudTimer) return;
  cloudTimer=setTimeout(function(){
    cloudTimer=null;
    try{
      if(!(window.FirebaseService&&FirebaseService._db)) return;
      var d=fresh()||{};
      var cols=['students','groups','teachers','centers','exams','homework','examAttempts','submissions','payments','enrollments','checkIns','expenses','scheduledNotifs'];
      cols.forEach(function(c){
        var arr=d[c]||[]; var h=hashStr(JSON.stringify(arr));
        if(lastHash[c]===h) return;
        lastHash[c]=h;
        arr.forEach(function(rec){ if(rec&&rec.id){ try{ FirebaseService.saveDoc(c,rec.id,rec); }catch(e){} } });
      });
      try{ FirebaseService.saveDoc('meta','dbrev',{id:'dbrev',rev:nowRev(),at:new Date().toISOString()}); }catch(e){}
    }catch(e){}
  },5000);
}
function boot(){ install(); wrapCloud(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,300); }); else setTimeout(boot,300);
setInterval(function(){ install(); wrapCloud(); flushRetry(); },4000);
})();