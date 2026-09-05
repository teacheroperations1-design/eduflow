// sw.js — Service Worker للتحميل الفوري والأوفلاين
const CACHE='eduflow-shell-v1';
const SHELL=[
  '/', '/index.html','/login.html','/setup.html',
  '/css/eduflow-theme.css',
  '/js/config.js','/js/firebase-service.js','/js/data-service.js',
  '/js/operations-service.js','/js/ui-helpers.js','/js/theme-manager.js','/js/auth-service.js'
];

// تثبيت: خزّن الهيكل
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

// تفعيل: نظّف الكاش القديم
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

// استراتيجية: كاش أولاً للملفات الثابتة، شبكة أولاً للـ HTML والبيانات
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  // سيب Firebase والـ API تروح الشبكة دايماً
  if(url.hostname.includes('firebaseio')||url.hostname.includes('googleapis')||url.hostname.includes('gstatic'))return;
  if(e.request.mode==='navigate'){
    // HTML: شبكة أولاً مع fallback للكاش
    e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request)));
  }else{
    // ملفات ثابتة: كاش أولاً
    e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;})));
  }
});