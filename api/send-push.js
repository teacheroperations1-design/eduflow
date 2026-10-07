// ================================================================
// 📤 api/send-push.js — محرك إرسال إشعارات Push عبر FCM
// Vercel Serverless Function (شغال على الخطة المجانية)
// ----------------------------------------------------------------
// • GET  → تقرير صحي شامل (افتح الرابط في المتصفح لتشخيص أي مشكلة)
// • POST → إرسال إشعار لمستخدم: { to, title, body, tag, url, page }
// • يقبل متغير البيئة FIREBASE_SERVICE_ACCOUNT_BASE64 كـ Base64 أو JSON خام
// ================================================================

/* 🔒 تحميل firebase-admin بأمان — لو مش متثبت مش هنكسر الفانكشن كلها */
let admin = null;
let adminLoadError = null;
try {
  admin = require('firebase-admin');
} catch (e) {
  adminLoadError = String((e && e.message) || e);
}

const BASE = 'https://eduflow-nine-dusky.vercel.app';
const VERSION = 5;

let ready = false;
let initError = null;

/* ---------- أدوات مساعدة ---------- */

function envRaw() {
  return String(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '').trim();
}

/* 🧹 تنظيف المفاتيح والقيم من أي مسافات زائدة (بتحصل لما النسخ من محرر نصوص) */
function normalizeCred(o) {
  if (!o || typeof o !== 'object') return null;
  const out = {};
  Object.keys(o).forEach(function (k) {
    let v = o[k];
    if (typeof v === 'string') v = v.trim();
    out[k.trim()] = v;
  });
  if (out.private_key) out.private_key = String(out.private_key).replace(/\\n/g, '\n');
  return out;
}

/* 📥 يقبل القيمة JSON خام أو Base64 — الاتنين شغالين */
function readCred() {
  const raw = envRaw();
  if (!raw) return null;
  if (raw.charAt(0) === '{') {
    try { return normalizeCred(JSON.parse(raw)); } catch (e) { return null; }
  }
  try {
    return normalizeCred(JSON.parse(Buffer.from(raw, 'base64').toString('utf8')));
  } catch (e) { return null; }
}

function initAdmin() {
  if (ready) return true;
  if (initError) return false;
  if (!admin) { initError = 'admin-not-loaded: ' + adminLoadError; return false; }
  const cred = readCred();
  if (!cred) { initError = 'env-unreadable (القيمة مش JSON سليم ولا Base64 سليم)'; return false; }
  if (!cred.project_id || !cred.client_email || !cred.private_key) {
    initError = 'env-json-incomplete (ناقص project_id / client_email / private_key)';
    return false;
  }
  try {
    admin.initializeApp({ credential: admin.credential.cert(cred) });
    ready = true;
    return true;
  } catch (e) {
    initError = 'init-failed: ' + String((e && e.message) || e);
    return false;
  }
}

/* 🩺 التقرير الصحي — بيظهر لما تفتح الرابط في المتصفح */
function diag() {
  const raw = envRaw();
  try { initAdmin(); } catch (e) {}
  return {
    service: 'send-push',
    version: VERSION,
    node: process.version,
    firebaseAdminLoaded: !!admin,
    firebaseAdminLoadError: adminLoadError,
    envVarPresent: raw.length > 0,
    envFormat: raw.charAt(0) === '{' ? 'raw-json' : 'base64',
    envVarLength: raw.length,
    envHasSpacesOrNewLines: /\s/.test(raw) && raw.charAt(0) !== '{',
    adminInitialized: ready,
    adminInitError: initError,
    hint: 'POST body: {to, title, body, tag, url, page}'
  };
}

function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/* ---------- الفانكشن الرئيسية ---------- */

module.exports = async (req, res) => {
  cors(req, res);

  /*preflight*/
  if (req.method === 'OPTIONS') return res.status(204).end();

  /* 🩺 GET = تقرير صحي */
  if (req.method === 'GET') return res.status(200).json(diag());

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only', diag: diag() });

  /* 🧱 فحص الاعتماديات قبل أي حاجة */
  if (!admin) {
    return res.status(500).json({
      error: 'firebase-admin مش متثبتة على Vercel',
      detail: adminLoadError,
      fix: 'اتأكد إن package.json (اللي فيه firebase-admin) موجود في جذر الريبو على GitHub واستنى Deploy جديد يخلص Ready'
    });
  }
  if (!initAdmin()) {
    return res.status(500).json({
      error: 'مشكلة في مفتاح الخدمة',
      detail: initError,
      diag: diag(),
      fix: 'أعد نسخ مفتاح الخدمة نظيف (JSON كامل أو Base64 بدون مسافات) في متغير FIREBASE_SERVICE_ACCOUNT_BASE64 على مستوى المشروع، وبعدين اعمل Redeploy'
    });
  }

  try {
    const { to, title, body, tag, url, page } = req.body || {};
    if (!to) return res.status(400).json({ error: 'missing "to" (userId)' });

    /* 🔎 جلب كل توكينات المستخدم */
    const snap = await admin.firestore().collection('pushTokens')
      .where('userId', '==', String(to)).get();

    if (snap.empty) {
      return res.status(200).json({ sent: 0, note: 'no tokens for this user yet (المستخدم لسه مفعّلش الإشعارات)' });
    }

    const tokens = [];
    const metas = [];
    snap.forEach(d => {
      const t = d.data();
      if (t && t.token) { tokens.push(t.token); metas.push(Object.assign({ docId: d.id }, t)); }
    });
    if (!tokens.length) return res.status(200).json({ sent: 0, note: 'tokens empty' });

    /* 🔗 رابط الفتح عند الضغط على الإشعار */
    const link = url || (BASE + '/' + (page || metas[0].page || 'index.html'));

    const payload = {
      tokens,
      notification: {
        title: title || '🔔 إشعار جديد',
        body: body || '',
        icon: BASE + '/icon-192.png'
      },
      data: {
        url: link,
        tag: tag || 'general',
        nid: String(Date.now())
      },
      webpush: {
        headers: { TTL: '1209600', Urgency: 'high' },
        notification: {
          click_action: link,
          require_interaction: false
        }
      }
    };

    /* 📤 الإرسال */
    const resp = await admin.messaging().sendEachForMulticast(payload);

    /* 🧹 تنظيف التوكينات الميتة تلقائياً */
    const dead = [];
    resp.responses.forEach((r, i) => {
      const code = r.error && r.error.code;
      if (!r.success && (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token')) {
        dead.push(metas[i].docId);
      }
    });
    if (dead.length) {
      try {
        const batch = admin.firestore().batch();
        dead.forEach(id => batch.delete(admin.firestore().collection('pushTokens').doc(id)));
        await batch.commit();
      } catch (e) { console.error('prune failed:', e); }
    }

    return res.status(200).json({
      sent: resp.successCount,
      failed: resp.failureCount,
      pruned: dead.length
    });

  } catch (e) {
    console.error('send-push error:', e);
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};