// File: sw.js
const CACHE_NAME = 'flashy-app-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Cài đặt Service Worker và cache các file cơ bản
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Lắng nghe sự kiện nhận Push Notification
self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Có từ vựng sắp quên!',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      url: data.url || './'
    },
    actions: [
      { action: 'open', title: 'Mở App' },
      { action: 'close', title: 'Bỏ qua' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '⚠️ Flashy Cảnh Báo', options)
  );
});

// Lắng nghe khi người dùng bấm vào notification
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || './';

  // Mở hoặc focus vào tab của app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
