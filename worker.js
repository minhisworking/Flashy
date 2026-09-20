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
    // ✅ CHỈ lấy số lượng, KHÔNG đưa danh sách từ vào prompt để Gemini không bị "cám dỗ" liệt kê
    const count = words.length;
    
    const prompt = `Bạn là trợ lý nhắc học từ vựng. Viết MỘT thông báo cảnh báo cực ngắn (dưới 100 ký tự).
Số lượng từ sắp quên: ${count} từ.

YÊU CẦU BẮT BUỘC:
1. TUYỆT ĐỐI KHÔNG liệt kê tên các từ vựng.
2. CHỈ được nhắc đến TỔNG SỐ LƯỢNG (ví dụ: "10 từ", "5 từ vựng").
3. Dùng 1 phong cách: Hài hước, Khẩn cấp, hoặc Thách thức.
4. Dùng 1-2 emoji.
5. CHỈ trả về duy nhất nội dung thông báo, không giải thích.`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        })
        
        if (!res.ok) { console.error('❌ Gemini HTTP', res.status, await res.text()); return `🚨 Bạn sắp quên ${count} từ vựng! Mở app để cứu ngay!`; }
        
        
        
        ;
        const data = await res.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || `🚨 Bạn sắp quên ${count} từ vựng! Mở app để cứu ngay!`;
    } catch (e) {

console.error('❌ Gemini fail:', e && e.message ? e.message : e);



        return `🚨 Bạn sắp quên ${count} từ vựng! Mở app để cứu ngay!`;
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

        // Tự động nhận diện Base64 hoặc JSON string
        let saJson = serviceAccountJson; // ✅ Đã chữa lành
    if (!saJson.startsWith('{')) {
        saJson = atob(saJson); 

    }
    const sa = JSON.parse(saJson);

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
    // Quét sạch mọi khoảng trắng, dấu xuống dòng ẩn của Google
const b64Key = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, ''); // \s+ quét luôn \n, \r, space

const binaryDer = new Uint8Array(
    atob(b64Key).split('').map(c => c.charCodeAt(0))
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
                fcmTokenValue: body.fcmToken, 
                soTuSapQuen: body.dueWords?.length || 0 
            });

            // 1. Lấy dữ liệu cũ trong DB (nếu có)
            const existing = await env.DB.get(`user_${body.userId}`, 'json') || {};

            // 2. "Gia cố": Chỉ dùng token mới nếu nó KHÔNG rỗng. Nếu rỗng, giữ nguyên token cũ.
            const newFcmToken = (body.fcmToken && body.fcmToken.trim() !== "") 
                ? body.fcmToken 
                : (existing.fcmToken || "");

            // 3. Lưu lại vào DB
            // Trong export.default.fetch, route /sync:
await env.DB.put(`user_${body.userId}`, JSON.stringify({ 
    fcmToken: newFcmToken,  
    dueWords: body.dueWords || existing.dueWords, 
    geminiKey: body.geminiKey || existing.geminiKey,
        alarmSettings: body.alarmSettings || existing.alarmSettings, // ✅ Chuẩn chỉnh
    lastSync: Date.now(), 
    generationConfig: { temperature: 0.9 } 
}));
            
            console.log("💾 [DEBUG /sync] Đã lưu thành công vào DB với fcmToken:", newFcmToken ? "CÓ (Length: " + newFcmToken.length + ")" : "VẪN RỖNG");
            return withCors(new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } }));
        }

        return withCors(new Response('Flashy Backend is alive!'));
    },


    // --- CRON JOB (CANH GIỜ) ---
async scheduled(event, env) {
    console.log("⏰ [CRON] Job bắt đầu lúc:", new Date().toISOString());
    
    const list = await env.DB.list({ prefix: 'user_' });


    console.log(`📂 [CRON] Tìm thấy ${list.keys.length} user trong DB`);
    console.log("📋 [CRON] Danh sách keys:", list.keys.map(k => k.name));






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

// 🕐 Lấy thời gian hiện tại theo GMT+7
const now = new Date();
const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
const gmt7Time = new Date(utcTime + (3600000 * 7));
const currentHour = gmt7Time.getHours();
const currentMinute = gmt7Time.getMinutes();

console.log(`  🕐 Current time (GMT+7): ${currentHour}:${currentMinute}`);
console.log(`   Alarm time: ${alarmH}:${alarmM}`);
        
        console.log(`  ⏰ Alarm time: ${alarmH}:${alarmM}`);
        console.log(`  🕐 Current time: ${currentHour}:${currentMinute}`);

        // ✅ So khớp chính xác giờ và phút (chỉ chạy đúng 1 phút trong ngày)
const isTimeMatch = (currentHour === alarmH && currentMinute === alarmM);
console.log(`  ⏱️ Time match: ${isTimeMatch} (Chính xác)`);

 if (!isTimeMatch) {
    console.log("  ❌ Không đúng giờ alarm. Bỏ qua.");
    continue;
}

        // Kiểm tra ngày
const currentDay = gmt7Time.getDay(); 
let isDayMatch = true;

if (alarm.frequency === 'weekly' || alarm.frequency === 'custom') {
    // 🛠️ FIX: Kiểm tra xem alarm.days có tồn tại và là mảng không
    if (!alarm.days || !Array.isArray(alarm.days) || alarm.days.length === 0) {
        console.log(`  ⚠️ [WARNING] alarm.days không hợp lệ:`, alarm.days);
        console.log(`  🔧 Tự động mặc định là tất cả các ngày trong tuần`);
        isDayMatch = true; // Mặc định là đúng nếu không có ngày nào được chọn
    } else {
        isDayMatch = alarm.days.includes(currentDay);
        console.log(`  📅 Day match (weekly/custom): ${isDayMatch}, days: ${JSON.stringify(alarm.days)}, currentDay: ${currentDay}`);
    }
}

if (!isDayMatch) {
    console.log("  ❌ Không đúng ngày. Bỏ qua.");
    continue;
}


        // Kiểm tra xem hôm nay đã gửi cho user này chưa
        const todayStr = gmt7Time.toDateString(); // Lấy ngày hôm nay (VD: "Fri Sep 18 2026")
        if (userData.lastNotifiedDate === todayStr) {
            console.log("  ✅ Đã gửi thông báo cho user này hôm nay rồi. Bỏ qua.");
            continue;
        }



        // 1. Lọc từ sắp quên (giữ nguyên)
let dueWords = (userData.dueWords || []).filter(w => {
    const nextReview = new Date(w.nextReview).getTime();
    const oneHourLater = Date.now() + 3600000;
    return nextReview <= oneHourLater;
});

console.log(` 📚 Tổng số từ sắp quên (chưa cắt): ${dueWords.length}`);



// 🆕 LỌC THEO MULTIVERSE ĐÃ CHỌN TRONG CÀI ĐẶT
const targetMulti = alarm.multiverse; 
if (targetMulti && targetMulti !== 'all' && targetMulti !== '') {
    // Giữ lại từ nếu nó thuộc multiverse đích, hoặc nếu dữ liệu cũ chưa có trường `multi`
    dueWords = dueWords.filter(w => w.multi === targetMulti || !w.multi);
    console.log(`🌍 ĐÃ LỌC: Còn lại ${dueWords.length} từ.`);
}



// ✅ 2. CHÈN ĐOẠN NÀY VÀO ĐÂY (Ngay sau khi lọc, TRƯỚC khi gọi Gemini)
const maxW = alarm.maxWords ? parseInt(alarm.maxWords) : 0;
console.log(` 🔍 Cài đặt maxWords đọc được từ DB:`, maxW);

if (maxW > 0 && dueWords.length > maxW) {
    dueWords = dueWords.slice(0, maxW);
    console.log(` ✅ ĐÃ CẮT: Chỉ giữ lại ${dueWords.length} từ để gửi cho Gemini.`);
}


if (dueWords.length === 0) {
    console.log("  💤 Sau khi lọc & cắt, không còn từ nào. Bỏ qua user này.");
    continue; // Nhảy sang user tiếp theo
}

// 3. Gọi Gemini
console.log(` 🔥 Có ${dueWords.length} từ cần nhắc! Đang gọi Gemini...`);


// 3. Gọi Gemini (phải nằm SAU đoạn cắt ở trên)
if (dueWords.length > 0) {
    console.log(` 🔥 Có ${dueWords.length} từ cần nhắc! Đang gọi Gemini...`);
    try {
        const geminiText = await callGemini(userData.geminiKey, dueWords);
        console.log(` 💬 Gemini response: "${geminiText}"`);
        // ... (phần code gửi FCM giữ nguyên)



                // ✅ Kiểm tra cài đặt nội dung thông báo của người học
let finalBody = geminiText;
if (alarm.nameMode === 'custom' && alarm.customName && alarm.customName.trim() !== '') {
    finalBody = alarm.customName;
    console.log(` 💬 Đang dùng nội dung tùy chỉnh: "${finalBody}"`);
}
                
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
                                body: finalBody
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
    console.error(`❌ FCM API "quạu" lỗi ${response.status}: ${errorText}`);
    
    // Nếu lỗi 404/400 (Token không tồn tại / user xóa app), tự động xóa token khỏi DB
    if (response.status === 404 || response.status === 400) {
        userData.fcmToken = "";
        await env.DB.put(userKey.name, JSON.stringify(userData));
        console.log("🗑️ Đã xóa fcmToken lỗi khỏi DB để tránh spam log.");
    }
} else {
                    const result = await response.json();
                    console.log(`  🏆 FCM success:`, JSON.stringify(result));
                    
                    // 🛡️ ĐÁNH DẤU ĐÃ GỬI: Lưu ngày hôm nay vào DB để mai mới gửi tiếp
                    userData.lastNotifiedDate = todayStr;
                    await env.DB.put(userKey.name, JSON.stringify(userData));
                    console.log("  💾 Đã lưu dấu vết lastNotifiedDate vào DB.");
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