importScripts(
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js'
);

firebase.initializeApp({
  apiKey: "AIzaSyCiaMLU3oRRJRvXWV6wzOOOyT9R5BtEwFI",
  authDomain: "flashyapp-45c1a.firebaseapp.com",
  projectId: "flashyapp-45c1a",
  storageBucket: "flashyapp-45c1a.firebasestorage.app",
  messagingSenderId: "775809731068",
  appId: "1:775809731068:web:02fada2a2150ca0186ca79"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message:', payload);

  const notificationTitle =
    payload.notification?.title || 'Flashy';

  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/Flashy/icon-192.png'
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});