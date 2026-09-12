self.addEventListener('push', function(event) {
  console.log('[SW] 📩 Nhận push event!');
  
  event.waitUntil(
    fetch('https://flashy-backend.minhisworking.workers.dev/get-noti?userId=default_user')
      .then(res => {
        console.log('[SW] Fetch response:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('[SW] Data nhận được:', data);
        
        // 🛡️ CHỈ giữ lại dữ liệu đơn giản, serialize được
        const notificationData = {
          url: data.url || './',
          timestamp: Date.now()
          //  KHÔNG thêm object phức tạp, function, hay data lớn
        };
        
        return self.registration.showNotification(data.title || ' Flashy', {
          body: data.body || 'Có từ vựng đang chờ bạn ôn!',
          icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22></text></svg>',
          badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌌</text></svg>',
          vibrate: [200, 100, 200],
          data: notificationData, // ✅ Chỉ data đơn giản
          tag: 'flashy-notification' // ✅ Giúp deduplicate notifications
        });
      })
      .catch(err => {
        console.error('[SW] ❌ Lỗi:', err);
        // Fallback notification
        return self.registration.showNotification('🚨 Flashy', {
          body: 'Có từ vựng đang chờ bạn ôn tập!',
          tag: 'flashy-notification'
        });
      })
  );
});;

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./?open_scare=1');
    })
  );
});
