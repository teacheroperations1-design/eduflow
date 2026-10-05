// sw.js — كاش ذكي PWA (نسخة نهائية)
const CACHE_VERSION = 'eduflow-pwa-v12';
const CORE = [
  './',
  'login.html', 'register.html', 'hesetak.html', 'about.html',
  'student-dashboard.html', 'student-qr.html', 'exam-taker.html', 'qr-scan.html', 'print-qr.html',
  'assistant-dashboard.html', 'admin-dashboard.html', 'teacher-dashboard.html', 'teachers-operations.html',
  'parent-dashboard.html', 'manifest.json',
  'css/eduflow-theme.css',
  'js/config.js', 'js/firebase-service.js', 'js/data-service.js', 'js/operations-service.js',
  'js/ui-helpers.js', 'js/drive-service.js', 'js/theme-manager.js', 'js/auth-service.js',
  'js/footer-injector.js', 'js/schedule-board.js'
];

// 🎯 صفحات أوفلاين احتياطية
const OFFLINE_PAGE = './login.html';

self.addEventListener('install', e => {
  console.log('[SW] Installing:', CACHE_VERSION);
  self.skipWaiting(); // تفعيل فوري
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => Promise.allSettled(
        CORE.map(u => c.add(u).catch(err => console.warn('[SW] cache failed:', u, err.message)))
      ))
  );
});

self.addEventListener('activate', e => {
  console.log('[SW] Activating:', CACHE_VERSION);
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // 🚫 تجاهل Firebase و Google APIs (مش هنكاشها)
  if (
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('drive.google.com')
  ) {
    // حاول الشبكة، لو فشل ارجع فارغ
    e.respondWith(fetch(req).catch(() => new Response('', { status: 503 })));
    return;
  }

  // 🔥 طلبات من نفس الـ origin فقط
  if (url.origin !== location.origin) return;

  // 📄 صفحات HTML: Network-First مع Fallback للأوفلاين
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req)
            .then(hit => hit || caches.match(OFFLINE_PAGE))
        )
    );
    return;
  }

  // 🖼️ صور / خطوط / JS / CSS: Cache-First + Stale-While-Revalidate
  e.respondWith(
    caches.match(req).then(hit => {
      const fetchPromise = fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fetchPromise;
    })
  );
});

// 📢 استماع لرسائل من الصفحة (مثل: "احذف الكاش")
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => e.source.postMessage({ type: 'CACHE_CLEARED' }));
  }
});