// sw.js — كاش ذكي: الموقع يفتح فوراً بعد أول زيارة ويشتغل أوفلاين (PWA)
const CACHE_VERSION = 'eduflow-v11'; // 🆕 تم رفع الإصدار لإجبار تحديث الكاش
const CORE = [
  './', 'login.html', 'register.html', 'hesetak.html',
  'student-dashboard.html', 'student-qr.html', 'student-homework.html', 'exam-taker.html',
  'assistant-dashboard.html', 'admin-dashboard.html', 'teachers-operations.html',
  'qr-scan.html', 'print-qr.html',
  'css/eduflow-theme.css',
  'js/config.js', 'js/firebase-service.js', 'js/data-service.js', 'js/operations-service.js',
  'js/ui-helpers.js', 'js/drive-service.js', 'js/theme-manager.js', 'js/auth-service.js'
];

// 1. مرحلة التثبيت
self.addEventListener('install', e => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => 
      Promise.allSettled(CORE.map(u => c.add(u).catch(err => console.warn('[SW] Cache failed for:', u, err))))
    ).then(() => self.skipWaiting())
  );
});

// 2. مرحلة التفعيل: مسح الكاش القديم
self.addEventListener('activate', e => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 3. مرحلة الاعتراض على الطلبات (Fetch)
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // أ) تجاهل طلبات Firebase و Google APIs
  if (url.hostname.includes('googleapis') || url.hostname.includes('gstatic') || url.hostname.includes('firebase') || url.hostname.includes('firestore') || url.hostname.includes('identitytoolkit')) {
    return;
  }

  // ب) صور QR الخارجية
  if (url.hostname.includes('qrserver')) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone(); 
        caches.open(CACHE_VERSION).then(c => c.put(req, copy)); 
        return res;
      }).catch(() => caches.match('./print-qr.html')))
    );
    return;
  }

  // ج) تنقلات الصفحات (HTML): الشبكة أولاً، ثم الكاش
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then(res => {
        const copy = res.clone(); 
        caches.open(CACHE_VERSION).then(c => c.put(req, copy)); 
        return res;
      }).catch(() => 
        caches.match(req).then(hit => hit || caches.match('./login.html'))
      )
    );
    return;
  }

  // د) باقي الملفات الثابتة (CSS, JS, Images)
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => {
        const fetched = fetch(req).then(res => {
          if (res.ok) { 
            const copy = res.clone(); 
            caches.open(CACHE_VERSION).then(c => c.put(req, copy)); 
          }
          return res;
        }).catch(() => hit);
        return hit || fetched;
      })
    );
  }
});