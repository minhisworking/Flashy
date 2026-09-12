// Import Firebase SDK cho Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// ⚠️ SẾP HÃY THAY THẾ ĐOẠN CONFIG NÀY BẰNG ĐOẠN firebaseConfig LẤY Ở BƯỚC 1
const firebaseConfig = {
  apiKey: "THAY_BANG_API_KEY_CUA_SEP",
  authDomain: "THAY_BANG_AUTH_DOMAIN",
  projectId: "THAY_BANG_PROJECT_ID",
  storageBucket: "THAY_BANG_STORAGE_BUCKET",
  messagingSenderId: "THAY_BANG_SENDER_ID",
  appId: "THAY_BANG_APP_ID"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Lắng nghe thông báo nền (khi app đang tắt hoặc ẩn)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Nhận thông báo nền:', payload);
  // Firebase tự động hiển thị noti nếu payload có chứa 'notification'
  // Nên chúng ta không cần viết thêm code hiển thị ở đây
});
