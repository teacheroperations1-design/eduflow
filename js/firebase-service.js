// js/firebase-service.js — مزامنة سحابية خلفية غير حاجبة (Offline-First)
// الصفحة بتفتح فوراً من localStorage، وفايربيز بتزامن في الخلفية فقط لو النت متاح.
const FirebaseService = {
  connected:false,
  _app:null, _db:null, _queue:[], _flushing:false,

  COLLECTIONS:['users','groups','enrollments','attendance','homework','submissions','exams','examAttempts','payments','vocabulary','tasks','materials','notifications','activityLogs','branches','cancelledSessions','attendanceCodes','teacherRegisterLinks','challenges','challengeAttempts','videos','classPosts','pendingRegistrations','followUps','qrSessions'],

  // ⚡ فوري — مش بيستنى الشبكة أبداً
  async init(){
    try{
      const cfg = window.EduFlowConfig?.firebaseConfig;
      const enabled = (window.EduFlowConfig?.useFirebase !== false) && !!window.firebase && !!cfg;
      if(!enabled){ this.connected=false; return; }
      if(!this._app){
        this._app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
        this._db = firebase.firestore(this._app);
        try {
  firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch(function(err){
    console.warn('Persistence:', err.code);
  });
} catch(e){}
      }
      this.connected = navigator.onLine !== false;
      this._loadQueue();
      try{
        window.addEventListener('online', ()=>{ this.connected=true; this.flushQueue(); });
        window.addEventListener('offline', ()=>{ this.connected=false; });
      }catch(e){}
      // محاولة اكتشاف بالخلفية (مش حاجبة)
      this._probe();
    }catch(e){
      this.connected=false;
      console.warn('[Firebase] تم التعطيل المحلي:', e?.message);
    }
  },

  _timeout(p,ms){ return Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error('fb-timeout')),ms))]); },

  async _probe(){
    try{
      if(!this._db || navigator.onLine===false){ this.connected = navigator.onLine!==false && !!this._db; return; }
      await this._timeout(this._db.collection('meta').limit(1).get(), 4000);
      this.connected=true;
      this.flushQueue();
    }catch(e){
      // ERR_BLOCKED_BY_CLIENT أو نت مقطوع → نكمل أوفلاين بهدوء
      this.connected=false;
    }
  },

  // ===== طابور الأوفلاين =====
  _loadQueue(){ try{ this._queue = JSON.parse(localStorage.getItem('eduflow_fb_queue')||'[]'); }catch(e){ this._queue=[]; } },
  _persistQueue(){ try{ localStorage.setItem('eduflow_fb_queue', JSON.stringify(this._queue)); }catch(e){} },
  _enqueue(op){ this._queue.push(op); if(this._queue.length>500) this._queue=this._queue.slice(-500); this._persistQueue(); },

  async flushQueue(){
    if(this._flushing || !this.connected || navigator.onLine===false || !this._db) return;
    this._flushing=true;
    try{
      while(this._queue.length && this.connected){
        const op=this._queue.shift();
        try{
          if(op.type==='save') await this._timeout(this._db.collection(op.col).doc(op.id).set(op.data),5000);
          else if(op.type==='delete') await this._timeout(this._db.collection(op.col).doc(op.id).delete(),5000);
          else if(op.type==='meta') await this._timeout(this._db.collection('meta').doc(op.id).set(op.data),5000);
        }catch(e){ this._queue.unshift(op); break; }
      }
      this._persistQueue();
    }catch(e){ this._persistQueue(); }
    this._flushing=false;
  },

  // ===== عمليات الكتابة (بتشتغل أوفلاين عبر الطابور) =====
  async saveDoc(col,id,data){
    if(!this._db) return;
    if(!this.connected || navigator.onLine===false){ this._enqueue({type:'save',col,id,data}); return; }
    try{ await this._timeout(this._db.collection(col).doc(id).set(data),5000); }
    catch(e){ this._enqueue({type:'save',col,id,data}); }
  },

  async deleteDoc(col,id){
    if(!this._db) return;
    if(!this.connected || navigator.onLine===false){ this._enqueue({type:'delete',col,id}); return; }
    try{ await this._timeout(this._db.collection(col).doc(id).delete(),5000); }
    catch(e){ this._enqueue({type:'delete',col,id}); }
  },

  async saveMeta(id,data){
    if(!this._db) return;
    if(!this.connected || navigator.onLine===false){ this._enqueue({type:'meta',id,data}); return; }
    try{ await this._timeout(this._db.collection('meta').doc(id).set(data),5000); }
    catch(e){ this._enqueue({type:'meta',id,data}); }
  },

  // ===== القراءة (دمج ذكي: الأحدثupdatedAt يفوز) =====
  _mergeArr(localArr, remoteArr){
    const map={};
    (localArr||[]).forEach(x=>{ if(x&&x.id) map[x.id]=x; });
    let changed=false;
    (remoteArr||[]).forEach(r=>{
      if(!r||!r.id) return;
      const l=map[r.id];
      if(!l){ map[r.id]=r; changed=true; }
      else{
        const lt=new Date(l.updatedAt||l.createdAt||0).getTime()||0;
        const rt=new Date(r.updatedAt||r.createdAt||0).getTime()||0;
        if(rt>lt){ map[r.id]=r; changed=true; }
      }
    });
    return changed?Object.values(map):(localArr||[]);
  },

  async loadAll(){
    if(!this._db || !this.connected || navigator.onLine===false) return {};
    try{
      // نبعت الطابور الأول عشان المحلي الأحدث ميتمسحش
      await this.flushQueue();
      const snaps = await this._timeout(Promise.all(this.COLLECTIONS.map(c=>this._db.collection(c).get())),8000);
      const out={};
      snaps.forEach((snap,i)=>{ const arr=[]; snap.forEach(d=>arr.push(d.data())); if(arr.length) out[this.COLLECTIONS[i]]=arr; });
      try{
        const local = JSON.parse(localStorage.getItem('eduflow_db')||'{}');
        const merged = {...local};
        Object.keys(out).forEach(k=>{ merged[k]=this._mergeArr(local[k], out[k]); });
        localStorage.setItem('eduflow_db', JSON.stringify(merged));
        if(window.DataService?.invalidateCache) DataService.invalidateCache();
      }catch(e){}
      return out;
    }catch(e){
      this.connected=false;
      return {};
    }
  },

  // ===== استماع للتغييرات (بيحدث المحلي لايف) =====
  startListeners(){
    if(!this._db || !this.connected || navigator.onLine===false) return;
    try{
      ['users','groups','attendance','homework','exams','payments'].forEach(col=>{
        this._db.collection(col).onSnapshot(snap=>{
          try{
            const arr=[]; snap.forEach(d=>arr.push(d.data()));
            const local=JSON.parse(localStorage.getItem('eduflow_db')||'{}');
            local[col]=arr;
            localStorage.setItem('eduflow_db',JSON.stringify(local));
            if(window.DataService?.invalidateCache) DataService.invalidateCache();
          }catch(e){}
        }, ()=>{ this.connected=false; });
      });
    }catch(e){}
  },

  async wipeAll(){
    if(!this._db || !this.connected) return;
    try{
      for(const col of this.COLLECTIONS){
        const snap=await this._db.collection(col).get();
        const batch=this._db.batch();
        snap.forEach(d=>batch.delete(d.ref));
        await batch.commit();
      }
    }catch(e){ console.warn('[Firebase] wipe failed', e?.message); }
  }
};
window.FirebaseService = FirebaseService;