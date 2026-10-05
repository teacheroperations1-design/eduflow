// js/firebase-service.js — مزامنة Cloud-First (نسخة نهائية)
// ✅ بيتهيأ تلقائيًا بمجرد تحميل الملف (يحل مشكلة Firebase Apps: 0)
// ✅ بيوفر خاصية initialized القديمة عشان الكود القديم يشتغل بدون تعديل
const FirebaseService = {
  connected: false,
  _app: null, _db: null, _queue: [], _flushing: false,
  _listeners: [], _retryCount: 0, _maxRetries: 3, _eventsBound: false,

  // 🔑 توافق مع الكود القديم اللي بيفحص FirebaseService.initialized
  get initialized(){ return !!(this._db && this.connected); },

  COLLECTIONS: ['users','groups','enrollments','attendance','homework','submissions','exams','examAttempts','payments','vocabulary','tasks','materials','notifications','activityLogs','branches','cancelledSessions','attendanceCodes','teacherRegisterLinks','challenges','challengeAttempts','videos','classPosts','pendingRegistrations','followUps','qrSessions','manualPoints','interactionPoints','manualSessions','whatsappTemplates','teacherEvaluations','interactiveMaterials','expenses','studentNotes','centers','barcodeRequests'],

  async init(){
    try{
      const cfg = window.EduFlowConfig?.firebaseConfig;
      const enabled = (window.EduFlowConfig?.useFirebase !== false) && !!window.firebase && !!cfg;
      if(!enabled){ this.connected = false; console.warn('[Firebase] معطّل — راجع js/config.js'); return; }
      if(!this._app){
        this._app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
        this._db = firebase.firestore(this._app);
        try{ firebase.firestore().enablePersistence({ synchronizeTabs:true }).catch(e=>console.warn('Persistence:', e.code)); }catch(e){}
        console.log('✅ Firebase initialized — project:', cfg.projectId);
      }
      this.connected = navigator.onLine !== false;
      this._loadQueue();
      if(!this._eventsBound){
        this._eventsBound = true;
        window.addEventListener('online',  ()=>{ this.connected = true; this._retryCount = 0; this.flushQueue().then(()=>this.loadAll()); });
        window.addEventListener('offline', ()=>{ this.connected = false; });
      }
      this._probe();
    }catch(e){
      this.connected = false;
      console.warn('[Firebase] init error:', e?.message);
    }
  },

  _timeout(p,ms){ return Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error('fb-timeout')),ms))]); },

  async _probe(){
    try{
      if(!this._db || navigator.onLine === false){ this.connected = navigator.onLine !== false && !!this._db; return; }
      await this._timeout(this._db.collection('meta').limit(1).get(), 4000);
      this.connected = true; this._retryCount = 0; this.flushQueue();
    }catch(e){ this.connected = false; }
  },

  // ===== طابور الأوفلاين =====
  _loadQueue(){ try{ this._queue = JSON.parse(localStorage.getItem('eduflow_fb_queue')||'[]'); }catch(e){ this._queue = []; } },
  _persistQueue(){ try{ localStorage.setItem('eduflow_fb_queue', JSON.stringify(this._queue)); }catch(e){} },
  _enqueue(op){ op.queuedAt = Date.now(); this._queue.push(op); if(this._queue.length>500) this._queue = this._queue.slice(-500); this._persistQueue(); },

  async flushQueue(){
    if(this._flushing || !this.connected || navigator.onLine === false || !this._db) return;
    this._flushing = true;
    let ok = 0;
    try{
      while(this._queue.length && this.connected){
        const op = this._queue.shift();
        try{
          if(op.type==='save')        await this._timeout(this._db.collection(op.col).doc(op.id).set(op.data,{merge:true}),5000);
          else if(op.type==='delete') await this._timeout(this._db.collection(op.col).doc(op.id).delete(),5000);
          else if(op.type==='meta')   await this._timeout(this._db.collection('meta').doc(op.id).set(op.data,{merge:true}),5000);
          ok++; this._retryCount = 0;
        }catch(e){ this._queue.unshift(op); this._retryCount++; break; }
      }
      this._persistQueue();
      if(ok>0) console.log('[Firebase] ✅ تم رفع '+ok+' عملية مؤجلة');
    }catch(e){ this._persistQueue(); }
    this._flushing = false;
  },

  // ===== كتابة =====
  async saveDoc(col,id,data){
    if(!this._db) return;
    if(data && !data.updatedAt) data.updatedAt = new Date().toISOString();
    if(!this.connected || navigator.onLine === false){ this._enqueue({type:'save',col,id,data}); return; }
    try{ await this._timeout(this._db.collection(col).doc(id).set(data,{merge:true}),5000); }
    catch(e){ this._enqueue({type:'save',col,id,data}); }
  },

  async deleteDoc(col,id){
    if(!this._db) return;
    if(!this.connected || navigator.onLine === false){ this._enqueue({type:'delete',col,id}); return; }
    try{ await this._timeout(this._db.collection(col).doc(id).delete(),5000); }
    catch(e){ this._enqueue({type:'delete',col,id}); }
  },

  async saveMeta(id,data){
    if(!this._db) return;
    if(data && !data.updatedAt) data.updatedAt = new Date().toISOString();
    if(!this.connected || navigator.onLine === false){ this._enqueue({type:'meta',id,data}); return; }
    try{ await this._timeout(this._db.collection('meta').doc(id).set(data,{merge:true}),5000); }
    catch(e){ this._enqueue({type:'meta',id,data}); }
  },

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

  // ===== 🆕 سحب كل البيانات من السحابة (السحابة هي المصدر) =====
  async loadAll(){
    if(!this._db || !this.connected || navigator.onLine === false) return {};
    try{
      await this.flushQueue();
      const pendingQueue = this._queue.length;
      const snaps = await this._timeout(Promise.all(this.COLLECTIONS.map(c=>this._db.collection(c).get())), 12000);
      const out={};
      snaps.forEach((snap,i)=>{
        const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
        out[this.COLLECTIONS[i]] = arr;
      });
      const local = JSON.parse(localStorage.getItem('eduflow_db')||'{}');
      const next = {...local};
      Object.keys(out).forEach(k=>{
        next[k] = (pendingQueue===0) ? out[k] : this._mergeArr(local[k], out[k]);
      });
      localStorage.setItem('eduflow_db', JSON.stringify(next));
      if(window.DataService?.invalidateCache) DataService.invalidateCache();
      console.log('[Firebase] ✅ تم سحب البيانات من السحابة');
      return out;
    }catch(e){
      console.warn('[Firebase] loadAll failed:', e.code || e.message);
      this.connected = false;
      return {};
    }
  },

  async loadMeta(){
    if(!this._db || !this.connected) return;
    try{
      const snap = await this._timeout(this._db.collection('meta').get(), 5000);
      const metas={};
      snap.forEach(d=>{ metas[d.id]=d.data(); });
      if(metas.branding){ localStorage.setItem('eduflow_branding', JSON.stringify(metas.branding)); }
      if(metas.features){ localStorage.setItem('eduflow_features', JSON.stringify(metas.features)); }
      if(metas.organization){
        const local = JSON.parse(localStorage.getItem('eduflow_db')||'{}');
        local.organization = metas.organization;
        localStorage.setItem('eduflow_db', JSON.stringify(local));
      }
      if(window.DataService?.invalidateCache) DataService.invalidateCache();
    }catch(e){ console.warn('[Firebase] loadMeta failed:', e.code || e.message); }
  },

  // ===== مستمعات حية على كل المجموعات =====
  startListeners(){
    if(!this._db || !this.connected) return;
    this._listeners.forEach(u=>{ try{u();}catch(e){} });
    this._listeners=[];
    this.COLLECTIONS.forEach(col=>{
      try{
        const unsub = this._db.collection(col).onSnapshot(snap=>{
          try{
            const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
            const local = JSON.parse(localStorage.getItem('eduflow_db')||'{}');
            local[col] = arr;
            localStorage.setItem('eduflow_db', JSON.stringify(local));
            if(window.DataService?.invalidateCache) DataService.invalidateCache();
          }catch(e){}
        }, err=>{ console.warn('[Firebase] listener '+col+':', err.code); });
        this._listeners.push(unsub);
      }catch(e){}
    });
    console.log('[Firebase] ✅ مستمعات حية على '+this.COLLECTIONS.length+' مجموعة');
  },

  async manualSync(){
    if(!this.connected) return { success:false, message:'لا يوجد اتصال بالإنترنت' };
    try{
      await this.flushQueue();
      await this.loadAll();
      await this.loadMeta();
      return { success:true, message:'تمت المزامنة من السحابة' };
    }catch(e){ return { success:false, message:'فشل المزامنة: '+e.message }; }
  },

  async pushLocalToCloud(){
    if(!this._db) return { success:false, message:'Firebase غير مهيأ' };
    try{
      const local = JSON.parse(localStorage.getItem('eduflow_db')||'{}');
      let count=0;
      for(const col of this.COLLECTIONS){
        for(const item of (local[col]||[])){
          if(item && item.id){ await this.saveDoc(col, item.id, item); count++; }
        }
      }
      return { success:true, message:'تم رفع '+count+' عنصر للسحابة' };
    }catch(e){ return { success:false, message:'فشل الرفع: '+e.message }; }
  },

  getQueueSize(){ return this._queue.length; },

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

// ⚡ تهيئة فورية بمجرد تحميل الملف (قبل أي صفحة أو دالة)
FirebaseService.init();
window.FirebaseService = FirebaseService;