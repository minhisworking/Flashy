// ===== FLASHY BACKEND - FCM V1 (OAUTH 2.0) =====

// Hàm decode Base64 thành JSON
function decodeServiceAccount(base64Str) {
    const jsonStr = atob(base64Str);
    return JSON.parse(jsonStr);
}

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

// 1. Hàm gọi Gemini API (Giữ nguyên)
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

// 2. Hàm tiện ích: Base64URL Encode
function base64UrlEncode(data) {
    return btoa(String.fromCharCode(...new Uint8Array(data)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// 3. Hàm tạo JWT và đổi lấy Access Token từ Google
// 3. Hàm tạo JWT và đổi lấy Access Token từ Google (NHẬN JSON TRỰC TIẾP)
// 3. Hàm tạo JWT và đổi lấy Access Token từ Google (ĐÃ FIX LỖI SCOPE)
async function getGoogleAccessToken(serviceAccountJson) {
    const sa = JSON.parse(serviceAccountJson);
    const now = Math.floor(Date.now() / 1000);
    
    const header = { alg: 'RS256', typ: 'JWT' };
    
    // 🛠️ THÊM DÒNG "scope" VÀO ĐÂY:
    const payload = {
        iss: sa.client_email,
        sub: sa.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        scope: 'https://www.googleapis.com/auth/firebase.messaging', // <-- DÒNG QUYẾT ĐỊNH
        iat: now,
        exp: now + 3600
    };

    const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
    const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    // Xử lý PRIVATE KEY
    const pemKey = sa.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\n/g, '')
        .trim();
    
    const binaryDer = new Uint8Array(
        atob(pemKey).split('').map(c => c.charCodeAt(0))
    );
    
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryDer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5', 
        cryptoKey, 
        new TextEncoder().encode(signatureInput)
    );
    
    const encodedSignature = base64UrlEncode(signature);
    const jwt = `${signatureInput}.${encodedSignature}`;

    // Đổi JWT lấy Access Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
        throw new Error('Không lấy được Access Token: ' + JSON.stringify(tokenData));
    }
    return tokenData.access_token;
}

export default {
    // --- XỬ LÝ HTTP REQUEST ---
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        
        if (url.pathname === '/sync' && request.method === 'POST') {
            const body = await request.json();
            console.log("📥 [DEBUG /sync] Nhận được dữ liệu:", { 
                userId: body.userId, 
                coFcmToken: !!body.fcmToken, 
                soTuSapQuen: body.dueWords?.length || 0 
            });

            const existing = await env.DB.get(`user_${body.userId}`, 'json') || {};
           

await env.DB.put(`user_${body.userId}`, JSON.stringify({ 
    fcmToken: body.fcmToken || existing.fcmToken,  
    dueWords: body.dueWords, 
    geminiKey: body.geminiKey || existing.geminiKey,
    notiTime: body.notiTime || '',          // <-- THÊM DÒNG NÀY (Lưu giờ đặt, VD: "20:00")
    notiMaxWords: body.notiMaxWords || '10', // <-- THÊM DÒNG NÀY (Lưu số từ tối đa)
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
    console.log("[DEBUG] Scheduled time:", new Date(event.scheduledTime).toISOString());

    const list = await env.DB.list({ prefix: 'user_' });
    console.log(`🔍 [DEBUG Cron] Tìm thấy ${list.keys.length} user trong database.`);

    //  LẤY GIỜ SERVER (UTC) VÀ CONVERT SANG GMT+7
    const now = new Date();
    
    // Convert sang GMT+7 (Vietnam time)
    const gmt7Time = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const currentHM = `${String(gmt7Time.getUTCHours()).padStart(2,'0')}:${String(gmt7Time.getUTCMinutes()).padStart(2,'0')}`;
    const today = gmt7Time.toISOString().split('T')[0]; // YYYY-MM-DD theo GMT+7
    
    console.log("[DEBUG] Current time (GMT+7):", currentHM);
    console.log("[DEBUG] Today (GMT+7):", today);

    const oneHour = 60 * 60 * 1000;

    // Lấy Access Token 1 lần cho tất cả user (tiết kiệm tài nguyên)
    let accessToken = null;
    try {
        accessToken = await getGoogleAccessToken(env.FIREBASE_SERVICE_ACCOUNT);
        console.log("✅ [DEBUG Cron] Đã lấy Access Token thành công.");
    } catch (e) {
        console.error("💥 [DEBUG Cron] Lỗi lấy Access Token:", e.message);
        return;
    }

    for (const userKey of list.keys) {
        const userId = userKey.name.replace('user_', '');
        
        const userData = await env.DB.get(userKey.name, 'json');
        
        console.log(`👤 [DEBUG Cron] Đang kiểm tra user: ${userId}`);

        if (!userData || !userData.fcmToken) {
            console.log(`⚠️ [DEBUG Cron] User ${userId} thiếu fcmToken. Bỏ qua.`);
            continue;
        }

        // 🛡️ CHECK 1: Nếu user có đặt giờ cụ thể, mà giờ hiện tại KHÔNG khớp -> Bỏ qua
        if (userData.notiTime && userData.notiTime !== currentHM) {
            console.log(`⏳ [DEBUG Cron] User ${userId} đặt giờ ${userData.notiTime}, hiện tại là ${currentHM}. Bỏ qua.`);
            continue;
        }

        // 🛡️ CHECK 2: Chống spam (Nếu hôm nay đã bắn noti cho user này rồi thì thôi)
        if (userData.lastNotiDate === today) {
            console.log(`🛡️ [DEBUG Cron] User ${userId} đã nhận noti hôm nay rồi. Bỏ qua.`);
            continue;
        }

        // 🎯 Lọc từ sắp quên và CẮT BỚT theo số lượng tối đa đã cài đặt
        const rawDueWords = (userData.dueWords || []).filter(w => w.nextReview <= (now.getTime() + oneHour));
        const maxWords = parseInt(userData.notiMaxWords || '10', 10);
        const limitedDueWords = rawDueWords.slice(0, maxWords);

        console.log(`📊 [DEBUG Cron] User ${userId} có ${rawDueWords.length} từ sắp quên, chỉ lấy tối đa ${maxWords} từ.`);
        
        if (limitedDueWords.length > 0) {
            console.log(` [DEBUG Cron] User ${userId} có từ cần nhắc! Đang gọi Gemini...`);
            
            try {
                const geminiTextContent = await callGemini(userData.geminiKey, limitedDueWords);
                console.log(`💬 [DEBUG Cron] Gemini trả về: "${geminiTextContent}"`);
                
                console.log(`📡 [DEBUG Cron] Đang gọi FCM v1 API...`);
                
                const projectId = "flashyapp-45c1a";
                const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

                const response = await fetch(fcmUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: {
                            token: userData.fcmToken,
                            notification: {
                                title: "🚨 Flashy Cảnh Báo",
                                body: geminiTextContent
                            },
                            webpush: {
                                fcm_options: {
                                    link: "https://minhisworking.github.io/Flashy"
                                }
                            }
                        }
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ [DEBUG Cron] FCM API trả về lỗi ${response.status}: ${errorText}`);
                } else {
                    const result = await response.json();
                    console.log(`🏆 [DEBUG Cron] KẾT QUẢ FCM cho user ${userId}:`, result);
                    
                    // ✅ ĐÁNH DẤU ĐÃ BẮN NOTI HÔM NAY ĐỂ KHÔNG BỊ SPAM
                    userData.lastNotiDate = today;
                    await env.DB.put(userKey.name, JSON.stringify(userData));
                }
                
            } catch (e) {
                console.error(`💥 [DEBUG Cron] Lỗi hệ thống khi gọi FCM cho user ${userId}:`, e.message || e.toString());
            }
        } else {
            console.log(`💤 [DEBUG Cron] User ${userId} chưa có từ nào sắp quên trong 1h tới. Ngủ tiếp.`);
        }
    }
    console.log("🏁 [DEBUG Cron] Cron Job kết thúc.");
}
};