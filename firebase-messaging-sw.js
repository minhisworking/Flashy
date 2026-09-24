
// Thêm đoạn này vào file firebase-messaging-sw.js
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); 
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if ('focus' in client) {
                    client.focus();
                    client.postMessage({ type: 'SHOW_SCARE_MODAL' });
                    return;
                }
            }
            // 🚀 Luôn luôn kèm ?scare=1 để index.html bắt được
            if (clients.openWindow) {
                return clients.openWindow('./?scare=1');
            }
        })
    );
});





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


