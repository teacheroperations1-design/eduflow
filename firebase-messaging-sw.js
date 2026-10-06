/* ================================================================
📲 firebase-messaging-sw.js — Service Worker الخاص بإشعارات FCM
================================================================ */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBj2wM0CgWbXVohSTI8y5fIPmT1vNw3Jl8",
  authDomain: "follow-up-ee4cc.firebaseapp.com",
  projectId: "follow-up-ee4cc",
  storageBucket: "follow-up-ee4cc.firebasestorage.app",
  messagingSenderId: "470554698600",
  appId: "1:470554698600:web:0ae9fa5a6f263930fe2cdd"
});

var messaging = firebase.messaging();

/* 🔔 إشعار والخلفية/والتطبيق مقفول */
messaging.onBackgroundMessage(function(payload){
  try{
    var n = payload.notification || {};
    var d = payload.data || {};
    var title = n.title || d.title || '🔔 إشعار جديد';
    self.registration.showNotification(title, {
      body: n.body || d.body || '',
      icon: d.icon || n.icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag || ('eduflow-' + (d.type || 'push')),
      data: { url: d.url || '/' }
    });
  }catch(e){}
});

/* 👆 الضغط على الإشعار يفتح المنصة على الشاشة الصح */
self.addEventListener('notificationclick', function(ev){
  try{
    ev.notification.close();
    var url = (ev.notification.data && ev.notification.data.url) || '/';
    ev.waitUntil(
      clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list){
        for (var i=0;i<list.length;i++){
          if (list[i].url.indexOf(url) !== -1) return list[i].focus();
        }
        return clients.openWindow(url);
      })
    );
  }catch(e){}
});