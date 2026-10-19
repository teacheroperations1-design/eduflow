// sw.js — كاش ذكي PWA (نسخة v13 نظيفة — بدون FCM،Push بيتعامل في firebase-messaging-sw.js)
const CACHE_VERSION = 'eduflow-pwa-v13';
const CORE = [
  './',
  'login.html', 'register.html', 'hesetak.html', 'about.html',
  'student-dashboard.html', 'student-qr.html', 'exam-taker.html', 'qr-scan.html', 'print-qr.html',
  'assistant-dashboard.html', 'admin-dashboard.html', 'teacher-dashboard.html', 'teachers-operations.html',
  'parent-dashboard.html', 'center-dashboard.html', 'checkin.html',
  'teachers-showcase.html', 'about-teachers.html', 'door-poster.html',
  'manifest.json', 'icon-192.png', 'icon-512.png',
  'css/eduflow-theme.css',
  'js/config.js', 'js/firebase-service.js', 'js/data-service.js', 'js/operations-service.js',
  'js/ui-helpers.js', 'js/drive-service.js', 'js/theme-manager.js', 'js/auth-service.js',
  'js/footer-injector.js', 'js/schedule-board.js', 'js/scope-guard.js',
  'js/ledger-ui.js', 'js/billing/core.js', 'js/legendary-exams.js', 'js/legendary-center.js',
  'js/notify-service.js', 'js/store-center.js'
];
const OFFLINE_PAGE = './login.html';

/* 🛡️ حفظ آمن في الكاش — مش هيرمي NetworkError تاني أبداً */
function safePut(cache, req, res){
  try{
    if(!res || !res.ok || res.type !== 'basic') return;
    cache.put(req, res).catch(function(){});
  }catch(e){}
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c =>
      Promise.allSettled(CORE.map(u => c.add(u).catch(()=>{})))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url; try { url = new URL(req.url); } catch { return; }

  /* 🚫 خارجي (Firebase/Google/Drive): شبكة بس، من غير كاش ومن غير أخطاء */
  if (url.origin !== location.origin) {
    e.respondWith(fetch(req).catch(() => new Response('', { status: 503 })));
    return;
  }

  /* 📄 صفحات HTML: Network-First + fallback أوفلاين */
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => safePut(c, req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match(OFFLINE_PAGE)))
    );
    return;
  }

  /* 🖼️ أصول: Cache-First + تحديث بالخلفية */
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => safePut(c, req, copy));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

/* 📢 أوامر من الصفحة */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => e.source.postMessage({ type: 'CACHE_CLEARED' }));
  }
});