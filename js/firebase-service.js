// js/firebase-service.js
// طبقة Firebase — تحميل SDK تلقائي + حماية البيانات المحلية

const FirebaseService = {
  app: null,
  auth: null,
  db: null,
  storage: null,
  initialized: false,
  connected: false,
  listeners: [],
  onChangeCallbacks: [],
  emptyCollections: new Set(),

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  },

  async init() {
    if (this.initialized) return;
    if (!window.EduFlowConfig?.useFirebase) {
      console.log('ℹ️ Firebase disabled — LOCAL mode');
      this.connected = false;
      this.initialized = true;
      return;
    }

    try {
      if (typeof firebase === 'undefined') {
        console.log('⏳ Loading Firebase SDK...');
        await this._loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
        await this._loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js');
        await this._loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js');
        await this._loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js');
      }
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(window.EduFlowConfig.firebase);
      } else {
        this.app = firebase.apps[0];
      }
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.storage = firebase.storage();
      this.initialized = true;
      this.connected = true;
      console.log('✅ Firebase connected');
    } catch (err) {
      console.error('❌ Firebase init failed:', err);
      this.connected = false;
      this.initialized = true;
    }
  },

  // ================= AUTH =================
  async signIn(email, password) {
    if (!this.connected) return null;
    try {
      const r = await this.auth.signInWithEmailAndPassword(email, password);
      const doc = await this.db.collection('users').doc(r.user.uid).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (e) { console.warn('signIn:', e.code); return null; }
  },

  async signUp(email, password, userData) {
    if (!this.connected) return null;
    try {
      const r = await this.auth.createUserWithEmailAndPassword(email, password);
      await this.db.collection('users').doc(r.user.uid).set({
        ...userData, uid: r.user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { id: r.user.uid, ...userData };
    } catch (e) { console.warn('signUp:', e.code); return null; }
  },

  async signOut() {
    if (!this.connected) return;
    try { await this.auth.signOut(); } catch (e) { console.warn(e); }
  },

  // ================= DATA =================
  async saveDoc(collection, id, data) {
    if (!this.connected) return false;
    try {
      const clean = { ...data }; delete clean._id;
      if (id) await this.db.collection(collection).doc(id).set(clean, { merge: true });
      else await this.db.collection(collection).add(clean);
      return true;
    } catch (err) { console.error('saveDoc:', err); return false; }
  },

  async deleteDoc(collection, id) {
    if (!this.connected) return false;
    try {
      await this.db.collection(collection).doc(id).delete();
      return true;
    } catch (err) { console.error('deleteDoc:', err); return false; }
  },

  async saveMeta(docName, data) {
    if (!this.connected) return false;
    try {
      await this.db.collection('meta').doc(docName).set(data, { merge: true });
      return true;
    } catch (err) { console.error('saveMeta:', err); return false; }
  },

  async loadAll() {
    if (!this.connected) return false;
    const collections = [
      'users','groups','enrollments','attendance','vocabulary',
      'homework','submissions','reattemptRequests','exams','examAttempts',
      'payments','materials','materialOrders','weeklyReports',
      'tasks','notifications','activityLogs',
      'followUps','communicationLogs','classSessions','automations','automationLogs',
      'announcements','activationCodes'
    ];
    const data = this._getLocal();
    for (const col of collections) {
      try {
        const snap = await this.db.collection(col).get();
        if (!snap.empty) {
          data[col] = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
          this.emptyCollections.delete(col);
        } else {
          this.emptyCollections.add(col);
          if (!data[col]) data[col] = [];
        }
      } catch (err) { console.warn('loadAll ' + col + ':', err.message); if (!data[col]) data[col] = []; }
    }
    // meta docs
    try { const d = await this.db.collection('meta').doc('organization').get(); if (d.exists) data.organization = d.data(); } catch(e){}
    try { const d = await this.db.collection('meta').doc('settings').get(); if (d.exists) data.settings = {...data.settings, ...d.data()}; } catch(e){}
    this._saveLocal(data);
    return true;
  },

  startListeners() {
    if (!this.connected) return;
    this.stopListeners();
    const collections = [
      'users','groups','enrollments','attendance','vocabulary',
      'homework','submissions','reattemptRequests','exams','examAttempts',
      'payments','materials','materialOrders','weeklyReports',
      'tasks','notifications','activityLogs',
      'followUps','communicationLogs','classSessions','automations','automationLogs',
      'announcements','activationCodes'
    ];
    collections.forEach(col => {
      const unsub = this.db.collection(col).onSnapshot(snapshot => {
        if (snapshot.empty && this.emptyCollections.has(col)) return;
        const data = this._getLocal();
        if (!snapshot.empty) {
          data[col] = snapshot.docs.map(d => ({ _id: d.id, ...d.data() }));
          this.emptyCollections.delete(col);
        } else { data[col] = []; this.emptyCollections.add(col); }
        this._saveLocal(data);
        this._notifyChange(col);
      }, err => console.warn('listener ' + col + ':', err.message));
      this.listeners.push(unsub);
    });
  },

  stopListeners() { this.listeners.forEach(u => { try { u(); } catch(e){} }); this.listeners = []; },
  onDataChange(cb) { this.onChangeCallbacks.push(cb); },
  _notifyChange(type) { this.onChangeCallbacks.forEach(cb => { try { cb(type); } catch(e){} }); },
  _getLocal() { return JSON.parse(localStorage.getItem('eduflow_db') || '{}'); },
  _saveLocal(d) { localStorage.setItem('eduflow_db', JSON.stringify(d)); },

  async wipeAll() {
    if (!this.connected) return false;
    const collections = [
      'users','groups','enrollments','attendance','vocabulary','homework','submissions',
      'reattemptRequests','exams','examAttempts','payments','materials','materialOrders',
      'weeklyReports','tasks','notifications','activityLogs',
      'followUps','communicationLogs','classSessions','automations','automationLogs',
      'announcements','activationCodes'
    ];
    for (const col of collections) {
      try {
        const snap = await this.db.collection(col).get();
        const batch = this.db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        if (snap.docs.length) await batch.commit();
      } catch (e) { console.warn('wipe ' + col + ':', e.message); }
    }
    return true;
  }
};

window.FirebaseService = FirebaseService;