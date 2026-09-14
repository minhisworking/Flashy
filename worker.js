// ===== FLASHY BACKEND - NGƯỜI GÁC ĐÊM =====

// ==== CORS: cho phép frontend (GitHub Pages) gọi được backend này ====
const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://minhisworking.github.io',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function withCors(response) {
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => newHeaders.set(key, value));
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
    });
}

// 2. Hàm gọi Gemini API
async function callGemini(apiKey, words) {
    const wordList = words.map(w => w.word).join(', ');
    const prompt = `Bạn là trợ lý nhắc học từ vựng. Viết MỘT thông báo cảnh báo cực ngắn (dưới 150 ký tự) báo người dùng sắp quên từ.
Danh sách: ${wordList}. Số lượng: ${words.length}.
YÊU CẦU: Ngắn gọn, dùng 1 phong cách (Hài hước/Khẩn cấp/Thách thức). Luôn đề cập số lượng. Dùng 1-2 emoji. CHỈ trả về nội dung thông báo.`;
    
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await res.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || "🚨 Bạn sắp quên " + words.length + " từ vựng! Mở app để cứu ngay!";
    } catch (e) {
        return "🚨 Bạn sắp quên " + words.length + " từ vựng! Mở app để cứu ngay!";
    }
}

export default {
    // --- XỬ LÝ HTTP REQUEST ---
    async fetch(request, env) {
        // Trả lời preflight request (OPTIONS) của trình duyệt trước tiên
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
   

        // Route 2: Frontend gửi dữ liệu lên
        if (url.pathname === '/sync' && request.method === 'POST') {
              const{ userId, fcmToken, dueWords, geminiKey }=await request.json();

            await env.DB.put(`user_${userId}`, JSON.stringify({ fcmToken,  // Lưu FCM token thay vì subscription
    dueWords, 
    geminiKey,
    lastSync: Date.now() }));
            return withCors(new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } }));
        }

        // Route 3: Service Worker lấy nội dung noti
        if (url.pathname === '/get-noti') {
            const userId = url.searchParams.get('userId');
            const data = await env.DB.get(`noti_${userId}`, 'json');
            return withCors(new Response(JSON.stringify(data || { title: "Flashy", body: "Có từ vựng đang chờ bạn ôn!" }), { headers: { 'Content-Type': 'application/json' } }));
        }

        return withCors(new Response('Flashy Backend is alive!'));
    },

    // --- CRON JOB (CANH GIỜ) ---
    async scheduled(event, env) {
        console.log("⏰ Cron Job đang chạy...");
        const list = await env.DB.list({ prefix: 'user_' });
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        for (const userKey of list.keys) {
            const userId = userKey.name.replace('user_', '');
            const userData = await env.DB.get(userKey.name, 'json');
            if (!userData || !userData.fcmToken) continue;

            const dueWords = userData.dueWords.filter(w => w.nextReview <= (now + oneHour));
            
            if (dueWords.length > 0) {
                console.log(`🔥 User ${userId} có ${dueWords.length} từ sắp quên.`);
                const geminiText = await callGemini(userData.geminiKey, dueWords);
                
                await env.DB.put(`noti_${userId}`, JSON.stringify({ title: "🚨 Flashy Cảnh Báo", body: geminiText }));
                
                try {
                    // Gửi notification qua FCM
if (userData.fcmToken) {
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${env.FCM_SERVER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: userData.fcmToken,
        notification: {
          title: "🚨 Flashy Cảnh Báo",
          body: geminiText
        },
        data: {
          click_action: "https://minhisworking.github.io"
        }
      })
    });
    
    const result = await response.json();
    console.log(`✅ FCM response:`, result);
  } catch (e) {
    console.error("❌ Lỗi gửi FCM:", e);
  }
}
                    console.log(`✅ Đã bắn noti cho user ${userId}`);
                } catch (e) {
                    console.error("Lỗi bắn noti:", e);
                }
            }
        }
    }
};
