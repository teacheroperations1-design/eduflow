// sw.js — كاش ذكي: الموقع يفتح فوراً بعد أول زيارة ويشتغل أوفلاين (PWA)
const CACHE = 'eduflow-v8'; // 🆕 تحديث الإصدار لضمان تحديث الكاش لدى المستخدمين
const CORE = [
  './', 'login.html', 'register.html', 'hesetak.html',
  'student-dashboard.html', 'student-qr.html', 'student-homework.html', 'exam-taker.html',
  'assistant-dashboard.html', 'admin-dashboard.html', 'teachers-operations.html',
  'qr-scan.html', 'print-qr.html',
  'css/eduflow-theme.css',
  'js/config.js', 'js/firebase-service.js', 'js/data-service.js', 'js/operations-service.js',
  'js/ui-helpers.js', 'js/drive-service.js', 'js/theme-manager.js', 'js/auth-service.js', 'js/admin-patch.js'
];

// 1. مرحلة التثبيت: حفظ الملفات الأساسية
self.addEventListener('install', e => {
  console.log('[SW] Installing...');
  e.waitUntil(
    caches.open(CACHE).then(c => 
      // allSettled يضمن عدم فشل التثبيت إذا كان ملف واحد مفقود
      Promise.allSettled(CORE.map(u => c.add(u).catch(err => console.warn('[SW] Cache failed for:', u, err))))
    ).then(() => self.skipWaiting())
  );
});

// 2. مرحلة التفعيل: مسح الكاش القديم والاستيلاء على التحكم فوراً
self.addEventListener('activate', e => {
  console.log('[SW] Activating...');
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 3. مرحلة الاعتراض على الطلبات (Fetch)
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // أ) تجاهل طلبات Firebase و Google APIs (تتعامل معها المكتبات الرسمية)
  if (url.hostname.includes('googleapis') || url.hostname.includes('gstatic') || url.hostname.includes('firebase') || url.hostname.includes('firestore')) {
    return;
  }

  // ب) صور QR الخارجية: كاش أولاً، ثم الشبكة
  if (url.hostname.includes('qrserver')) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone(); 
        caches.open(CACHE).then(c => c.put(req, copy)); 
        return res;
      }).catch(() => caches.match('./print-qr.html')))
    );
    return;
  }

  // ج) تنقلات الصفحات (HTML): الشبكة أولاً، ثم الكاش، ثم صفحة الدخول كملجأ أخير
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone(); 
        caches.open(CACHE).then(c => c.put(req, copy)); 
        return res;
      }).catch(() => 
        caches.match(req).then(hit => hit || caches.match('./login.html'))
      )
    );
    return;
  }

  // د) باقي الملفات الثابتة (CSS, JS, Images): كاش أولاً مع تحديث بالخلفية (Stale-While-Revalidate)
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => {
        const fetched = fetch(req).then(res => {
          if (res.ok) { 
            const copy = res.clone(); 
            caches.open(CACHE).then(c => c.put(req, copy)); 
          }
          return res;
        }).catch(() => hit);
        
        return hit || fetched;
      })
    );
  }
});