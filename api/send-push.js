// api/send-push.js — 📤 محرك إرسال Push عبر FCM (Vercel Serverless — شغال على الخطة المجانية)
const admin = require('firebase-admin');

const BASE = 'https://eduflow-nine-dusky.vercel.app';
let ready = false;

function initAdmin(){
  if (ready) return true;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '';
  if (!b64) return false;
  try {
    const cred = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(cred) });
    ready = true;
    return true;
  } catch (e) { console.error('initAdmin failed:', e); return false; }
}

function cors(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!initAdmin()) return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT_BASE64 missing or invalid' });

  try {
    const { to, title, body, tag, url, page } = req.body || {};
    if (!to) return res.status(400).json({ error: 'missing "to" (userId)' });

    const snap = await admin.firestore().collection('pushTokens')
      .where('userId', '==', String(to)).get();
    if (snap.empty) return res.status(200).json({ sent: 0, note: 'no tokens for this user yet' });

    const tokens = [], metas = [];
    snap.forEach(d => { const t = d.data(); tokens.push(t.token); metas.push(Object.assign({ docId: d.id }, t)); });

    const link = url || (BASE + '/' + (page || metas[0].page || 'index.html'));
    const payload = {
      tokens,
      notification: { title: title || '🔔 إشعار جديد', body: body || '', icon: BASE + '/icon-192.png' },
      data: { url: link, tag: tag || 'general', nid: String(Date.now()) },
      webpush: {
        headers: { TTL: '1209600', Urgency: 'high' },
        notification: { click_action: link, require_interaction: false }
      }
    };

    const resp = await admin.messaging().sendEachForMulticast(payload);

    /* 🧹 تنظيف التوكينات الميتة تلقائياً */
    const dead = [];
    resp.responses.forEach((r, i) => {
      const code = r.error && r.error.code;
      if (!r.success && (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token')) dead.push(metas[i].docId);
    });
    if (dead.length){
      const batch = admin.firestore().batch();
      dead.forEach(id => batch.delete(admin.firestore().collection('pushTokens').doc(id)));
      await batch.commit();
    }

    return res.status(200).json({ sent: resp.successCount, failed: resp.failureCount, pruned: dead.length });
  } catch (e) {
    console.error('send-push error:', e);
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};