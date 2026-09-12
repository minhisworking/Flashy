// sw.js - Người nhận lệnh từ Backend
self.addEventListener('push', function(event) {
    // Khi nhận được lệnh "thức dậy" từ Backend
    event.waitUntil(
        // Gọi lên Backend để lấy nội dung thông báo (do Backend đã gọi Gemini và lưu vào KV)
        fetch('https://flashy-backend.cua-sep.workers.dev/get-noti?userId=default_user') // 👉 SẾP THAY BẰNG LINK WORKER CỦA SẾP
            .then(res => res.json())
            .then(data => {
                return self.registration.showNotification(data.title || '🚨 Flashy', {
                    body: data.body || 'Có từ vựng sắp quên!',
                    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌌</text></svg>',
                    badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌌</text></svg>',
                    vibrate: [100, 50, 100],
                    data: { url: './' }
                });
            })
            .catch(err => {
                return self.registration.showNotification('🚨 Flashy', {
                    body: 'Có từ vựng đang chờ bạn ôn tập!',
                    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌌</text></svg>'
                });
            })
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if ('focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('./');
        })
    );
});
