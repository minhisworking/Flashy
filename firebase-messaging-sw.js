// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase config (giữ nguyên config cũ của bạn)
firebase.initializeApp({
  apiKey: "AIzaSyCiaMLU3oRRJRvXWV6wzOOOyT9R5BtEwFI",
  authDomain: "flashyapp-45c1a.firebaseapp.com",
  projectId: "flashyapp-45c1a",
  storageBucket: "flashyapp-45c1a.firebasestorage.app",
  messagingSenderId: "775809731068",
  appId: "1:775809731068:web:02fada2a2150ca0186ca79",
  measurementId: "G-TJNC4H01W0"
});

const messaging = firebase.messaging();

// Xử lý khi có notification đến
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png', // Nếu có icon
    badge: '/badge.png' // Nếu có badge
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Xử lý khi click vào notification
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received.');
  event.notification.close();
  event.waitUntil(
    clients.openWindow('https://minhisworking.github.io/Flashy')
  );
});