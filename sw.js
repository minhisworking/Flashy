// 1. NHẬP FIREBASE (Để giữ tính năng thông báo đẩy & Scare Modal)
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCiaMLU3oRRJRvXWV6wzOOOyT9R5BtEwFI",
  authDomain: "flashyapp-45c1a.firebaseapp.com",
  projectId: "flashyapp-45c1a",
  storageBucket: "flashyapp-45c1a.firebasestorage.app",
  messagingSenderId: "775809731068",
  appId: "1:775809731068:web:02fada2a2150ca0186ca79"
});

const messaging = firebase.messaging();

// Xử lý thông báo khi app đang đóng / chạy ngầm
messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || '🔔 Flashy Nhắc Nhở';
  const options = {
    body: payload.data?.body || 'Có từ vựng đang chờ bạn ôn tập nè!',
    icon: './icon.png',
    data: { url: './?scare=1' } 
  };
  
  // 🛡️ GHI CỜ VÀO CACHE API (Chống rớt param ?scare=1 trên Mobile PWA)
  // File index.html đã có sẵn logic đọc cache này để bung Scare Modal
  caches.open('scare-modal-flag').then(cache => {
    cache.put('/show-scare', new Response('1', { status: 200 }));
  });

  self.registration.showNotification(title, options);
});

// 2. LOGIC CACHE PWA OFFLINE
const CACHE_NAME = 'flashy-offline-v5'; // Tăng version để ép trình duyệt cập nhật SW mới
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// Cài đặt: Lưu trữ app vào bộ nhớ đệm
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // Bắt SW mới tiếp quản ngay
});

// Kích hoạt: Dọn dẹp cache cũ
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(name => name !== CACHE_NAME && caches.delete(name))
    ))
  );
  self.clients.claim();
});

// Fetch: Chiến lược "Ưu tiên Mạng" cho App & API
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  // Các API bên ngoài (Gemini, YouTube, Giphy, Backend Cloudflare...) bắt buộc phải có mạng
  if (event.request.url.includes('googleapis.com') || 
      event.request.url.includes('giphy.com') || 
      event.request.url.includes('youtube.com') ||
      event.request.url.includes('workers.dev')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Giao diện App & Font chữ: Ưu tiên MẠNG (luôn lấy bản mới), mạng chết mới xài Cache
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000); // Timeout 4s

  event.respondWith(
    fetch(event.request, { cache: 'no-cache', signal: controller.signal })
      .then(networkResponse => {
        clearTimeout(timer);
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        clearTimeout(timer);
        // 🛡️ FIX: Chỉ trả về Cache. Nếu không có cache thì trả về Response offline (tránh crash trình duyệt)
        return caches.match(event.request).then(r => {
          return r || new Response('Offline - Flashy App', {
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// Xử lý khi người dùng bấm vào thông báo đẩy
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || './';
  
  // 🛡️ GHI LẠI CỜ CACHE API LẦN NỮA KHI BẤM (Đề phòng SW chưa kịp ghi ở onBackgroundMessage)
  caches.open('scare-modal-flag').then(cache => {
    cache.put('/show-scare', new Response('1', { status: 200 }));
  });

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Nếu app đang mở rồi thì focus vào và gửi message qua SW
      for (const client of windowClients) {
        if (client.url.includes('./') && 'focus' in client) {
          client.focus();
          // Gửi tín hiệu trực tiếp vào tab đang mở (index.html có listener message này)
          client.postMessage({ type: 'SHOW_SCARE_MODAL' });
          return;
        }
      }
      // Nếu app chưa mở thì mở tab mới
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});