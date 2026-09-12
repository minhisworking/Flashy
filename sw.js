// sw.js - Người nhận lệnh từ Backend
self.addEventListener('push', function(event) {
    // Khi nhận được lệnh "thức dậy" từ Backend
    event.waitUntil(
        // Lấy User ID từ URL hoặc localStorage (Cách đơn giản nhất là hardcode hoặc dùng 1 ID cố định)
        // Ở đây ta giả định userId là 'default_user' cho app local
        fetch('https://flashy-backend.minhisworking.workers.dev/get-noti?userId=default_user') 
            .then(res => res.json())
            .then(data => {
                return self.registration.showNotification(data.title || '🚨 Flashy', {
                    body: data.body || 'Có từ vựng sắp quên!',
                    icon: '/icon-192.png',
                    badge: '/badge-72.png',
                    vibrate: [100, 50, 100],
                    data: { url: '/' }
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
