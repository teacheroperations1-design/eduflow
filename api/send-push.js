// api/send-push.js — V6 (data-only, FCM v1 compatible)
let admin = null, adminLoadError = null;
try { admin = require('firebase-admin'); } catch (e) { adminLoadError = String((e && e.message) || e); }

const BASE = 'https://eduflow-nine-dusky.vercel.app';
const VERSION = '6.0.0';

let ready = false, initError = null;

function envRaw() { return String(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '').trim(); }

function normalizeCred(o) {
  if (!o || typeof o !== 'object') return null;
  const out = {};
  Object.keys(o).forEach(k => {
    let v = o[k]; if (typeof v === 'string') v = v.trim();
    out[k.trim()] = v;
  });
  if (out.private_key) out.private_key = String(out.private_key).replace(/\\n/g, '\n');
  return out;
}

function readCred() {
  const raw = envRaw();
  if (!raw) return null;
  if (raw.charAt(0) === '{') {
    try { return normalizeCred(JSON.parse(raw)); } catch (e) { return null; }
  }
  try { return normalizeCred(JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))); }
  catch (e) { return null; }
}

function initAdmin() {
  if (ready) return true;
  if (initError) return false;
  if (!admin) { initError = 'admin-not-loaded: ' + adminLoadError; return false; }
  if (admin.apps.length > 0) { ready = true; return true; }
  const cred = readCred();
  if (!cred) { initError = 'env-unreadable'; return false; }
  if (!cred.project_id || !cred.client_email || !cred.private_key) { initError = 'env-json-incomplete'; return false; }
  try {
    admin.initializeApp({ credential: admin.credential.cert(cred) });
    ready = true;
    return true;
  } catch (e) { initError = 'init-failed: ' + String((e && e.message) || e); return false; }
}

function diag() {
  const raw = envRaw();
  try { initAdmin(); } catch (e) {}
  return {
    service: 'send-push',
    version: VERSION,
    firebaseAdminLoaded: !!admin,
    adminInitialized: ready,
    adminInitError: initError,
    envVarPresent: raw.length > 0,
    envFormat: raw.charAt(0) === '{' ? 'raw-json' : 'base64',
    hint: 'POST {to, title, body, tag, url, page, purge}'
  };
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json(diag());
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only', diag: diag() });

  if (!admin) return res.status(500).json({ error: 'firebase-admin not loaded', detail: adminLoadError });
  if (!initAdmin()) return res.status(500).json({ error: 'service account problem', detail: initError, diag: diag() });

  try {
    const { to, title, body, tag, url, page, purge } = req.body || {};
    if (!to) return res.status(400).json({ error: 'missing "to"' });

    const db = admin.firestore();
    const uid = String(to);

    if (purge) {
      const snap = await db.collection('pushTokens').where('userId', '==', uid).get();
      if (snap.empty) return res.status(200).json({ purged: 0 });
      const batch = db.batch(); let n = 0;
      snap.forEach(d => { batch.delete(d.ref); n++; });
      await batch.commit();
      return res.status(200).json({ purged: n });
    }

    const snap = await db.collection('pushTokens').where('userId', '==', uid).get();
    if (snap.empty) return res.status(200).json({ sent: 0, note: 'no tokens' });

    const tokens = [], metas = [];
    snap.forEach(d => {
      const t = d.data();
      if (t && t.token) { tokens.push(t.token); metas.push(Object.assign({ docId: d.id }, t)); }
    });
    if (!tokens.length) return res.status(200).json({ sent: 0, note: 'empty' });

    const link = url || (BASE + '/' + (page || metas[0].page || 'index.html'));

    /* ✅ FCM v1 compatible: data-only payload (الـ SW بتاعنا هو اللي يرسم الإشعار) */
    const payload = {
      tokens,
      data: {
        title: title || '🔔 إشعار جديد',
        body: body || '',
        icon: BASE + '/icon-192.png',
        url: link,
        tag: tag || 'general',
        nid: String(Date.now())
      },
      webpush: {
        headers: { TTL: '1209600', Urgency: 'high' }
      }
    };

    const resp = await admin.messaging().sendEachForMulticast(payload);

    /* 🧹 مسح التوكينات الميتة بس (مش السليمة) */
    const DEAD_CODES = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];
    const dead = [], errCodes = {};
    resp.responses.forEach((r, i) => {
      const code = (r.error && r.error.code) || 'unknown';
      if (!r.success) {
        errCodes[code] = (errCodes[code] || 0) + 1;
        if (DEAD_CODES.indexOf(code) >= 0) dead.push(metas[i].docId);
      }
    });
    if (dead.length) {
      try {
        const batch = db.batch();
        dead.forEach(id => batch.delete(db.collection('pushTokens').doc(id)));
        await batch.commit();
      } catch (e) { console.error('prune failed:', e); }
    }

    return res.status(200).json({
      sent: resp.successCount,
      failed: resp.failureCount,
      pruned: dead.length,
      errors: errCodes,
      version: VERSION
    });
  } catch (e) {
    console.error('send-push error:', e);
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};