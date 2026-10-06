// api/send-push.js — 📤 محرك إرسال Push عبر FCM (Vercel Serverless — خطة مجانية)
// نسخة V3: تشخيص ذاتي — فتح الرابط في المتصفح يعرض تقرير صحي بدل صفحة خطأ

/* 🔒 تحميل firebase-admin بأمان: لو مش متثبت مش هنكسر الفانكشن كلها */
let admin = null;
let adminLoadError = null;
try {
  admin = require('firebase-admin');
} catch (e) {
  adminLoadError = String((e && e.message) || e);
}

const BASE = 'https://eduflow-nine-dusky.vercel.app';

let ready = false;
let initError = null;

function initAdmin(){
  if (ready) return true;
  if (initError) return false;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '';
  if (!b64) { initError = 'env-missing'; return false; }
  try {
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const cred = JSON.parse(json);
    if (!cred.project_id || !cred.client_email || !cred.private_key) {
      initError = 'env-json-incomplete (ناقص project_id/client_email/private_key)';
      return false;
    }
    admin.initializeApp({ credential: admin.credential.cert(cred) });
    ready = true;
    return true;
  } catch (e) {
    initError = 'env-invalid: ' + String((e && e.message) || e);
    return false;
  }
}

function cors(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  /* 🩺 GET = تقرير صحي (افتح الرابط في المتصفح تشوف كل حاجة) */
  if (req.method === 'GET') {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '';
    return res.status(200).json({
      service: 'send-push',
      status: 'alive',
      node: process.version,
      firebaseAdminLoaded: !!admin,
      firebaseAdminLoadError: adminLoadError,
      envVarPresent: b64.length > 0,
      envVarLength: b64.length,
      adminInitialized: ready,
      adminInitError: initError,
      hint: 'POST body: {to, title, body, tag, page}'
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  /* 🧱 فحص الاعتماديات قبل أي حاجة */
  if (!admin) {
    return res.status(500).json({
      error: 'firebase-admin مش متثبتة على Vercel',
      detail: adminLoadError,
      fix: 'تأكد إن package.json (اللي فيه firebase-admin) موجود في جذر الريبو على GitHub — مش جوّا مجلد api — وبعدين استنى Deploy جديد يخلص Ready'
    });
  }
  if (!initAdmin()) {
    return res.status(500).json({
      error: 'مشكلة متغير البيئة FIREBASE_SERVICE_ACCOUNT_BASE64',
      detail: initError,
      fix: 'سجّل المتغير في Vercel → Projects → EduFlow → Settings → Environment Variables (مش Shared) وبعدين اعمل Redeploy'
    });
  }

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