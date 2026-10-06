/* ================================================================
📲 firebase-messaging-sw.js — Service Worker الخاص بإشعارات FCM
لازم يفضل في جذر الموقع بالاسم ده بالظبط
================================================================ */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

/* 👇 انسخ نفس القيم من js/config.js بالظبط (مفاتيح عامة عادي) */
firebase.initializeApp({
  apiKey: "حط_apiKey",
  authDomain: "حط_authDomain",
  projectId: "حط_projectId",
  storageBucket: "حط_storageBucket",
  messagingSenderId: "حط_messagingSenderId",
  appId: "حط_appId"
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