const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const BASE = 'https://eduflow-nine-dusky.vercel.app';

exports.pushOnNotification = functions.firestore
  .document('notifications/{id}')
  .onCreate(async (snap) => {
    const n = snap.data() || {};
    if (!n.targetUserId || n.read) return null;

    const tokSnap = await admin.firestore().collection('pushTokens')
      .where('userId', '==', n.targetUserId).get();
    if (tokSnap.empty) return null;

    const tokens = [];
    let page = 'index.html';
    tokSnap.forEach(d => { tokens.push(d.data().token); page = d.data().page || page; });

    const url = BASE + '/' + page + '?notif=' + encodeURIComponent(snap.id);
    const payload = {
      tokens,
      notification: {
        title: n.title || '🔔 إشعار جديد',
        body: n.message || '',
        icon: BASE + '/icon-192.png'
      },
      data: { url, type: n.type || 'general', nid: snap.id, tag: 'eduflow-' + (n.type || 'x') },
      webpush: {
        notification: { click_action: url, require_interaction: false },
        headers: { TTL: '1209600' }   /* أسبوعين: لو الفون مقفول توصله لما يشتغل */
      }
    };

    const resp = await admin.messaging().sendEachForMulticast(payload);
    /* نضفي التوكينات البايظة تلقائياً */
    const dead = [];
    resp.responses.forEach((r, i) => {
      if (!r.success && r.error && r.error.code === 'messaging/registration-token-not-registered') dead.push(tokens[i]);
    });
    if (dead.length) {
      const all = await admin.firestore().collection('pushTokens').where('token', 'in', dead.slice(0, 10)).get();
      const batch = admin.firestore().batch();
      all.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    return null;
  });