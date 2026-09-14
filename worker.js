// ===== FLASHY BACKEND - NGƯỜI GÁC ĐÊM (PHIÊN BẢN SIÊU SOI) =====

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

// 1. Hàm gọi Gemini API
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
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        
        // Route: Frontend gửi dữ liệu lên
                if (url.pathname === '/sync' && request.method === 'POST') {
            const body = await request.json();
            console.log("📥 [DEBUG /sync] Nhận được dữ liệu:", { 
                userId: body.userId, 
                coFcmToken: !!body.fcmToken, 
                soTuSapQuen: body.dueWords?.length || 0 
            });

            // Lấy hồ sơ cũ trước, để không bị mất fcmToken khi 1 trong 2 hệ thống sync không gửi kèm token
            const existing = await env.DB.get(`user_${body.userId}`, 'json') || {};

            await env.DB.put(`user_${body.userId}`, JSON.stringify({ 
                fcmToken: body.fcmToken || existing.fcmToken,  
                dueWords: body.dueWords, 
                geminiKey: body.geminiKey || existing.geminiKey,
                lastSync: Date.now() 
            }));
            
            console.log("💾 [DEBUG /sync] Đã lưu thành công vào DB!");
            return withCors(new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } }));
        }

        return withCors(new Response('Flashy Backend is alive!'));
    },

    // --- CRON JOB (CANH GIỜ) ---
    async scheduled(event, env) {
        console.log("⏰ [DEBUG Cron] Cron Job bắt đầu chạy...");
        
        const list = await env.DB.list({ prefix: 'user_' });
        console.log(`🔍 [DEBUG Cron] Tìm thấy ${list.keys.length} user trong database.`);

        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        for (const userKey of list.keys) {
            const userId = userKey.name.replace('user_', '');
            const userData = await env.DB.get(userKey.name, 'json');
            
            console.log(`👤 [DEBUG Cron] Đang kiểm tra user: ${userId}`);

            if (!userData) {
                console.log(`⚠️ [DEBUG Cron] User ${userId} không có dữ liệu. Bỏ qua.`);
                continue;
            }
            
            if (!userData.fcmToken) {
                console.log(`❌ [DEBUG Cron] User ${userId} THIẾU fcmToken! Dữ liệu hiện tại:`, userData);
                continue; // <--- Đây là chỗ nó hay bị kẹt nhất
            }

            console.log(`✅ [DEBUG Cron] User ${userId} CÓ fcmToken. Đang đếm từ sắp quên...`);
            
            const dueWords = (userData.dueWords || []).filter(w => w.nextReview <= (now + oneHour));
            console.log(`📊 [DEBUG Cron] User ${userId} có ${dueWords.length} từ sắp quên.`);
            
            if (dueWords.length > 0) {
                console.log(`🔥 [DEBUG Cron] User ${userId} có từ cần nhắc! Đang gọi Gemini...`);
                
                try {
                    const geminiText = await callGemini(userData.geminiKey, dueWords);
                    console.log(`💬 [DEBUG Cron] Gemini trả về: "${geminiText}"`);
                    
                    console.log(`📡 [DEBUG Cron] Đang gọi FCM API...`);
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
                    console.log(`🏆 [DEBUG Cron] KẾT QUẢ FCM cho user ${userId}:`, result);
                    
                } catch (e) {
                    console.error(`💥 [DEBUG Cron] Lỗi khi gọi FCM cho user ${userId}:`, e);
                }
            } else {
                console.log(`💤 [DEBUG Cron] User ${userId} chưa có từ nào sắp quên trong 1h tới. Ngủ tiếp.`);
            }
        }
        console.log("🏁 [DEBUG Cron] Cron Job kết thúc.");
    }
};
