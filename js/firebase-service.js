// js/firebase-service.js
// طبقة تكامل Firebase - بتحمّل SDK تلقائياً وبتشتغل مع Fallback محلي

const FirebaseService = {
  app: null,
  auth: null,
  db: null,
  storage: null,
  initialized: false,
  connected: false,
  _sdkLoaded: false,

  // تحميل SDK تلقائياً (بدل ما نعدّل كل صفحات HTML)
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

    // لو Firebase مش مفعّل من الإعدادات، ارجع للوضع المحلي
    if (!EduFlowConfig.useFirebase) {
      console.log('ℹ️ Firebase disabled in config. Using LOCAL demo mode.');
      this.connected = false;
      return;
    }

    try {
      // حمّل SDK لو مش موجود
      if (typeof firebase === 'undefined') {
        console.log('⏳ Loading Firebase SDK...');
        await this._loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
        await this._loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js');
        await this._loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
        await this._loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js');
        this._sdkLoaded = true;
      }

      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(EduFlowConfig.firebase);
      } else {
        this.app = firebase.apps[0];
      }

      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.storage = firebase.storage();
      this.initialized = true;
      this.connected = true;

      console.log('✅ Firebase connected successfully');
    } catch (error) {
      console.error('❌ Firebase init failed, falling back to local:', error);
      this.connected = false;
    }
  },

  // ===================== AUTH =====================
  async signIn(email, password) {
    if (!this.connected) return null;
    try {
      const result = await this.auth.signInWithEmailAndPassword(email, password);
      const doc = await this.db.collection('users').doc(result.user.uid).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (e) {
      console.warn('Firebase signIn failed:', e.message);
      return null;
    }
  },

  async signUp(email, password, userData) {
    if (!this.connected) return null;
    try {
      const result = await this.auth.createUserWithEmailAndPassword(email, password);
      await this.db.collection('users').doc(result.user.uid).set({
        ...userData, uid: result.user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { id: result.user.uid, ...userData };
    } catch (e) {
      console.warn('Firebase signUp failed:', e.message);
      return null;
    }
  },

  async signOut() {
    if (!this.connected) return;
    try { await this.auth.signOut(); } catch (e) { console.warn(e); }
  },

  // ===================== DATA =====================
  async getCollection(name, filters = {}) {
    if (!this.connected) return null;
    try {
      let q = this.db.collection(name);
      Object.keys(filters).forEach(k => { q = q.where(k, '==', filters[k]); });
      const snap = await q.get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { console.warn(e); return null; }
  },

  async getDocument(name, id) {
    if (!this.connected) return null;
    try {
      const doc = await this.db.collection(name).doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (e) { console.warn(e); return null; }
  },

  async addDocument(name, data) {
    if (!this.connected) return null;
    try {
      const ref = await this.db.collection(name).add({
        ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { id: ref.id, ...data };
    } catch (e) { console.warn(e); return null; }
  },

  async updateDocument(name, id, data) {
    if (!this.connected) return null;
    try {
      await this.db.collection(name).doc(id).update({
        ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (e) { console.warn(e); return null; }
  },

  async deleteDocument(name, id) {
    if (!this.connected) return null;
    try {
      await this.db.collection(name).doc(id).delete();
      return true;
    } catch (e) { console.warn(e); return null; }
  },

  // ===================== STORAGE =====================
  async uploadFile(file, path) {
    if (!this.connected) return URL.createObjectURL(file);
    try {
      const ref = this.storage.ref(path);
      await ref.put(file);
      return await ref.getDownloadURL();
    } catch (e) {
      console.warn(e);
      return URL.createObjectURL(file);
    }
  },

  // ===================== REALTIME =====================
  subscribe(name, callback, filters = {}) {
    if (!this.connected) return () => {};
    let q = this.db.collection(name);
    Object.keys(filters).forEach(k => { q = q.where(k, '==', filters[k]); });
    return q.onSnapshot(snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }
};

// تهيئة تلقائية
FirebaseService.init();