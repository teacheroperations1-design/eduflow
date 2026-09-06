// sw.js — كاش ذكي: الموقع يفتح فوراً بعد أول زيارة ويشتغل أوفلاين
const CACHE = 'eduflow-v7';
const CORE = [
  './','index.html','login.html','register.html',
  'student-dashboard.html','student-qr.html','student-homework.html','student-exam.html',
  'assistant-dashboard.html','admin-dashboard.html','qr-scan.html','print-qr.html',
  'css/eduflow-theme.css',
  'js/config.js','js/firebase-service.js','js/data-service.js','js/operations-service.js',
  'js/ui-helpers.js','js/drive-service.js','js/theme-manager.js','js/auth-service.js','js/admin-patch.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // لا تتدخل في طلبات Firebase (بتتعامل معاها firebase-service)
  if (url.hostname.includes('googleapis') || url.hostname.includes('gstatic') || url.hostname.includes('firebase')) return;

  // صور QR الخارجية: كاش أول
  if (url.hostname.includes('qrserver')) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
      }).catch(() => caches.match('./print-qr.html')))
    );
    return;
  }

  // تنقلات الصفحات: الشبكة أولاً ثم الكاش (fallback أوفلاين)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // باقي الملفات الثابتة: كاش أولاً مع تحديث بالخلفية
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => {
        const fetched = fetch(req).then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => hit);
        return hit || fetched;
      })
    );
  }
});