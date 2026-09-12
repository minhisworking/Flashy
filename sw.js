// Lắng nghe sự kiện nhận Push Notification từ Backend (sẽ làm ở bước sau)
self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Có từ vựng sắp quên!',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now()
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

// Lắng nghe khi người dùng bấm vào thông báo
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Mở hoặc focus vào tab của app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Nếu app đang mở nhưng bị ẩn, hãy focus vào nó
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Nếu app chưa mở, hãy mở nó ra
      if (clients.openWindow) {
        return clients.openWindow('./'); 
      }
    })
  );
});