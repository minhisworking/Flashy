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
        alarmSettings: body.alarmSettings || existing.alarmSettings, // <-- D
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
    console.log("⏰ [CRON] Job bắt đầu lúc:", new Date().toISOString());
    
    const list = await env.DB.list({ prefix: 'user_' });
    console.log(` [CRON] Tìm thấy ${list.keys.length} user`);

    let accessToken = null;
    try {
        accessToken = await getGoogleAccessToken(env.FIREBASE_SERVICE_ACCOUNT);
        console.log("✅ [CRON] Đã lấy Access Token");
    } catch (e) {
        console.error("💥 [CRON] Lỗi lấy Access Token:", e.message);
        return;
    }

    for (const userKey of list.keys) {
        const userId = userKey.name.replace('user_', '');
        const userData = await env.DB.get(userKey.name, 'json');
        
        console.log(`\n [CRON] Kiểm tra user: ${userId}`);
        console.log("  - Alarm settings:", JSON.stringify(userData?.alarmSettings));
        console.log("  - FCM Token:", userData?.fcmToken ? "CÓ" : "KHÔNG");
        console.log("  - Due words:", userData?.dueWords?.length || 0);

        if (!userData || !userData.fcmToken) {
            console.log("  ⚠️ [CRON] Thiếu fcmToken. Bỏ qua.");
            continue;
        }

        const alarm = userData.alarmSettings || {};
        const [alarmH, alarmM] = (alarm.time || "08:00").split(':').map(Number);
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        console.log(`  ⏰ Alarm time: ${alarmH}:${alarmM}`);
        console.log(`  🕐 Current time: ${currentHour}:${currentMinute}`);

        const isTimeMatch = Math.abs((currentHour * 60 + currentMinute) - (alarmH * 60 + alarmM)) <= 15;
        console.log(`  ⏱️ Time match: ${isTimeMatch}`);

        if (!isTimeMatch) {
            console.log("  ❌ Không đúng giờ alarm. Bỏ qua.");
            continue;
        }

        // Kiểm tra ngày
        const currentDay = now.getDay();
        let isDayMatch = true;
        if (alarm.frequency === 'weekly' || alarm.frequency === 'custom') {
            isDayMatch = alarm.days && alarm.days.includes(currentDay);
            console.log(`  📅 Day match (weekly/custom): ${isDayMatch}, days: ${JSON.stringify(alarm.days)}, currentDay: ${currentDay}`);
        }

        if (!isDayMatch) {
            console.log("  ❌ Không đúng ngày. Bỏ qua.");
            continue;
        }

        // Lọc từ sắp quên
        const dueWords = (userData.dueWords || []).filter(w => {
            const nextReview = new Date(w.nextReview).getTime();
            const oneHourLater = Date.now() + 3600000;
            return nextReview <= oneHourLater;
        });

        console.log(`  📚 Due words count: ${dueWords.length}`);
        
        if (dueWords.length > 0) {
            console.log(`  🔥 Có ${dueWords.length} từ cần nhắc! Đang gọi Gemini...`);
            
            try {
                const geminiText = await callGemini(userData.geminiKey, dueWords);
                console.log(`  💬 Gemini response: "${geminiText}"`);
                
                console.log(`  📡 Đang gọi FCM API...`);
                
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
                                body: geminiText
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
                    console.error(`  ❌ FCM API lỗi ${response.status}: ${errorText}`);
                } else {
                    const result = await response.json();
                    console.log(`  🏆 FCM success:`, JSON.stringify(result));
                }
                
            } catch (e) {
                console.error(`  💥 Lỗi khi gọi Gemini/FCM:`, e.message);
            }
        } else {
            console.log("  💤 Không có từ nào sắp quên trong 1h tới.");
        }
    }
    console.log("\n🏁 [CRON] Job kết thúc.\n");
}
};