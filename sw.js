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
messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || '🔔 Flashy Nhắc Nhở';
  const options = {
    body: payload.data?.body || 'Có từ vựng đang chờ bạn ôn tập nè!',
    icon: './icon.png',
    // Tui đọc code sếp thấy sếp dùng param ?scare=1 để mở modal dọa nạt, nên tui gắn luôn vào đây!
    data: { url: './?scare=1' } 
  };
  self.registration.showNotification(title, options);
});

// 2. LOGIC CACHE PWA OFFLINE
const CACHE_NAME = 'flashy-offline-v4';
const urlsToCache = [
  './',
  './index.html', // ⚠️ Đổi tên này nếu file HTML của sếp tên khác (ví dụ: flashy.html)
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

// Fetch: Chiến lược "Ưu tiên Cache" cho App, "Ưu tiên Mạng" cho API
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  // Các API bên ngoài (Gemini, YouTube, Giphy...) bắt buộc phải có mạng
  if (event.request.url.includes('googleapis.com') || 
      event.request.url.includes('giphy.com') || 
      event.request.url.includes('youtube.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Giao diện App & Font chữ: Ưu tiên MẠNG (luôn lấy bản mới), mạng chết mới xài Cache


const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 4000);


event.respondWith(
  fetch(event.request, { cache: 'no-cache', signal: controller.signal }).then(networkResponse => {


clearTimeout(timer);

    if (networkResponse && networkResponse.status === 200) {
      const clone = networkResponse.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
    }
    return networkResponse;
  }).catch(() => caches.match(event.request).then(r => r || fetch(event.request)))
);
});

// Xử lý khi người dùng bấm vào thông báo đẩy
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
