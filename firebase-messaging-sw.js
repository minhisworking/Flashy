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


// Xử lý khi click vào notification
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received.');
  event.notification.close();
  event.waitUntil(
    clients.openWindow('https://minhisworking.github.io/Flashy')
  );
});


self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Tắt notification gốc của hệ thống
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Nếu app đang chạy ngầm -> Focus vào và bắn tín hiệu mở modal
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if ('focus' in client) {
                    client.postMessage({ action: 'showScareModal' });
                    return client.focus();
                }
            }
            // Nếu app tắt ngúm -> Mở app lên và kèm theo tín hiệu "scare=true"
            if (clients.openWindow) {
                return clients.openWindow('/?scare=true');
            }
        })
    );
});


// Thêm đoạn này vào file firebase-messaging-sw.js
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Đóng notification
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Nếu app đang mở ở tab nào đó -> Focus vào tab đó và gửi tin nhắn bảo hiện modal
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if ('focus' in client) {
                    client.focus();
                    // 🚀 Bắn tín hiệu qua tab app
                    client.postMessage({ type: 'SHOW_SCARE_MODAL' });
                    return;
                }
            }
            // Nếu app chưa mở -> Mở app lên kèm theo cục param ?scare=1
            if (clients.openWindow) {
                return clients.openWindow('./?scare=1');
            }
        })
    );
});