// sw.js — Service Worker (Network-First + مسح الكاش القديم)
const CACHE = 'eduflow-v2';

// عند التثبيت: فعّل فوراً وامسح أي كاش قديم
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// عند التفعيل: امسح كل الكاشات القديمة وسيطر على كل التبويبات
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// عند أي طلب: جيب من السيرفر أولاً (Network-First)
// ولو السيرفر واقع، استخدم الكاش كاحتياط
self.addEventListener('fetch', (e) => {
  // سيب طلبات Firebase و Google تروح الشبكة دايماً
  const url = new URL(e.request.url);
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis') || url.hostname.includes('gstatic')) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // خزّن نسخة حديثة
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});