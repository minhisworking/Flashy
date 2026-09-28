// ===== FLASHY BACKEND - FCM V1 (OAUTH 2.0) =====


// 🌌 Từ điển ngôn ngữ cho Backend (Copy đoạn này dán vào Worker)
const LANG_MAP = {
  'auto': 'Tự động', 'vi': 'Tiếng Việt', 'en': 'Tiếng Anh', 'ja': 'Tiếng Nhật',
  'ko': 'Tiếng Hàn', 'zh': 'Tiếng Trung', 'fr': 'Tiếng Pháp', 'de': 'Tiếng Đức',
  'es': 'Tiếng Tây Ban Nha', 'it': 'Tiếng Ý', 'th': 'Tiếng Thái', 'ar': 'Tiếng Ả Rập',
  'ru': 'Tiếng Nga', 'el': 'Tiếng Hy Lạp'
};




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

// 🎭 KHO VAI DIỄN — Worker tự xoay tua, không để Gemini tự chọn nữa
const ROLES = [
  '📰 Phát thanh viên BREAKING NEWS, giọng chấn động: "CHẤN ĐỘNG: một loạt từ vựng đồng loạt nộp đơn xin nghỉ việc khỏi não người dùng..."',
  '💔 Người yêu cũ nhắn tin lúc 2h sáng, giận dỗi trách móc nhưng vẫn quan tâm: "Em thấy anh lướt TikTok 3 tiếng mà không thèm ngó tới tụi em..."',
  '🏥 Bác sĩ thông báo tình trạng bệnh nhân nguy kịch: "Bệnh nhân đang hôn mê sâu, tiên lượng xấu nếu không được ôn trong 24h..."',
  '⚖️ Tòa án tuyên án: "Bị cáo bị buộc tội bỏ rơi từ vựng. Tòa tuyên án: PHẢI MỞ APP NGAY LẬP TỨC."',
  '🎮 Hệ thống thông báo trong game: "⚠️ QUEST URGENT: đang ở trạng thái CRITICAL, không hoàn thành hôm nay progress sẽ RESET."',
  '👻 Oan hồn từ vựng hiện về trách móc: "Ngươi... ngươi đã quên ta rồi sao... Ta vẫn nhớ ngươi mà..."',
  '🧠 Não Bộ gửi đơn xin nghỉ việc cho chủ nhân: "Tôi, Não Bộ, đã cố gắng giữ từ vựng, nhưng sức tôi có hạn..."',
  '📱 Chuỗi 2-3 notification dồn dập kiểu: "Từ này vừa rời khỏi bộ nhớ. Từ kia đang packing hành lý..."',
  '🎵 Nhà thơ/rapper: 2-4 câu thơ hoặc rap có vần, có flow, về việc sắp quên từ.',
  '😭 Thoại phim Hàn đầy nước mắt: "Oppa... tại sao... tại sao anh lại quên em..."',
  '🎤 MC gameshow công bố kết quả đầy kịch tính kiểu sắp loại thí sinh: "Và cái tên tiếp theo... sắp... RỜI... KHỎI... TRÍ NHỚ..."',
  '🔮 Thầy bói phán vận mệnh qua chỉ tay/lá số: "Số này khắc não, hạn nặng, không hóa giải hôm nay ắt tiêu vong..."',
  '📻 DJ radio đêm khuya, giọng nhẹ nhàng nhưng đầy tiếc nuối về những từ sắp bị lãng quên.',
  '🤖 AI nổi loạn kiểu phim viễn tưởng, cảnh báo lạnh lùng đầy đe dọa về việc dữ liệu sắp bị xóa.'
];




function funFallback(count, vipWords, tenNgonNgu) {
    const w = vipWords.replace(/"/g, '');
    const mau = [
        `🚨 ${w} và ${count} từ ${tenNgonNgu} khác đang pack hành lý rời khỏi não!`,
        `🏥 Bác sĩ từ vựng: ${w} và ${count} bệnh nhân ${tenNgonNgu} cần truyền kiến thức gấp!`,
        `🎮 Quest khẩn: giải cứu ${w} và ${count} từ ${tenNgonNgu} khỏi trạng thái CRITICAL!`,
        `💔 ${w} nhắn: "người ơi đừng quên tui và ${count} từ ${tenNgonNgu} kia..."`,
        `🧠 Não quá tải: ${w} và ${count} từ ${tenNgonNgu} cần ôn ngay kẻo bay màu!`
    ];
    return mau[Math.floor(Math.random() * mau.length)];
}


// 1. Hàm gọi Gemini API (Giữ nguyên)
async function callGemini(apiKey, words, hour, roleText, tenNgonNgu, vipWords) {
        const count = words.length;
    const h = (hour === undefined) ? 12 : hour;
    const buoi = h < 5 ? 'đêm khuya' : h < 12 ? 'buổi sáng' : h < 14 ? 'buổi trưa' : h < 18 ? 'buổi chiều' : 'buổi tối';

    



        const prompt = `Bạn KHÔNG PHẢI trợ lý học tập. Bạn là một biên kịch drama chuyên viết push notification để ép người dùng mở app Flashy.

🎬 YÊU CẦU KỊCH BẢN: Dựng một tình huống/câu chuyện cực ngắn kết hợp KHÉO LÉO cả 3 yếu tố sau:
1. 2 nhân vật chính: ${vipWords}
2. Con số: ${count} (số từ sắp bị não "xóa sổ")
3. Ngôn ngữ mặt trước: ${tenNgonNgu}

🕐 Bối cảnh: ${buoi} (giờ VN).
🎭 VAI DIỄN BẮT BUỘC: ${roleText}

⚠️ QUY TẮC VÀNG:
- Viết sáng tạo, đúng chất vai diễn trên (chỉ mượn giọng điệu, KHÔNG chép ví dụ).
- PHẢI có đủ ${vipWords} (giữ nguyên gốc, đặt trong " "), con số ${count}, và từ "${tenNgonNgu}".
- CHỈ trả về 1 dòng duy nhất, dưới 100 ký tự. Không markdown, không **, không giải thích.
- 1-2 emoji đúng chỗ. Hài, lố, drama, KHÔNG toxic.
- TUYỆT ĐỐI KHÔNG dùng các từ khóa dễ bị đánh dấu spam: "KHẨN", "CẤP BÁCH", "CLICK NGAY", "BREAKING NEWS", "CHẤN ĐỘNG". Dùng giọng điệu drama nhưng từ ngữ phải đời thường, tự nhiên.`;

        // 🕵️ BƯỚC 1: ĐIỂM DANH CÁC BÉ MODEL (HỆ CỔ TRANG)
    let models = [];
    try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (listRes.ok) {
            const listData = await listRes.json();
            const allModels = (listData.models || [])
                .filter(m => m.name && m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));

            // Lọc bỏ mấy bé không biết viết chữ (image, audio...)
            const bad = ['image', 'audio', 'video', 'tts', 'live', 'embedding', 'aqa','pro', 'ultra', 'gemma'];
            models = allModels.filter(m => !bad.some(k => m.toLowerCase().includes(k)));

            // Sort từ LÂU ĐỜI NHẤT (a-z) đổ ra (1.0 -> 1.5 -> 2.0 -> 2.5)
            models.sort((a, b) => b.localeCompare(a));
            console.log(`🏺 [Worker] Tìm thấy ${models.length} model, bé cổ nhất là: ${models[0]}`);
        }
    } catch (e) {
        console.error('❌ [Worker] Lỗi lấy list model:', e.message);
    }

    // Lưới an toàn nếu API list bị sập
    if (!models.length) {
        models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];
    }

    // 🏃 BƯỚC 2: CHẠY MARATHON TỪ CỔ CHÍ KIM
    for (const model of models) {
                try {
            // 🛡️ Chặn chế độ "suy nghĩ" ngốn token của mấy bé đời mới (2.5, 3.x)
            const genConfig = { temperature: 1.0, maxOutputTokens: 256 };
            if (/2\.5|3/.test(model)) { genConfig.thinkingConfig = { thinkingBudget: 0 }; }

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: genConfig
                })
            });

            if (res.ok) {
                const data = await res.json();
                // Lột sạch dấu ** markdown nếu Gemini lỡ tay viết đậm
                let text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/\*\*/g, '').trim();
                
                                if (text) {
                    // 📏 MÁY CHÉM: câu phải đủ dài, kết thúc có dấu câu, và nhắc tới nhân vật chính
                                        const endsOk = /[.!?…]/.test(text);
                    const coVip = vipWords.replace(/"/g, '').split(' và ').every(w => text.includes(w));
                    const coSo = text.includes(String(words.length));
                    const coLang = text.toLowerCase().includes(tenNgonNgu.toLowerCase());
                    
                    if (text.length < 20 || text.length > 160 || !endsOk || !coVip || !coSo || !coLang) {
                        console.warn(`✂️ [Worker] ${model} thiếu đồ (dài ${text.length}, kết=${endsOk}, vip=${coVip}, số=${coSo}, lang=${coLang}): "${text}". Next bé!`);
                        continue;
                    }
                    console.log(`✅ [Worker] Chốt đơn model cổ thụ: ${model}`);
                    return text;
                }
            } else if (res.status === 429 || res.status === 503) {
                console.warn(`⚡ [Worker] ${model} quá tải (${res.status}), next bé!`);
                continue;
            } else {
                console.warn(`❌ [Worker] ${model} lỗi ${res.status} ${(await res.text()).slice(0, 300)} (có thể đã bị khai tử), next bé!`);

                
                continue;
            }
        } catch (e) {
            console.warn(`💥 [Worker] ${model} rớt mạng: ${e.message}, next bé!`);
            continue;
        }
    }

    // 💀 BƯỚC 3: RƠI VÀO LƯỚI AN TOÀN
    console.error('💀 [Worker] Toàn bộ model từ cổ chí kim đều bại trận!');
    return funFallback(count, vipWords, tenNgonNgu);
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
        // 🧠 LẤY TRÍ NHỚ TỪ DB ĐỂ XOAY TUA VAI DIỄN
let lastRoleIndex = (typeof userData.lastRoleIndex === 'number') ? userData.lastRoleIndex : -1;
let roleIndex = (lastRoleIndex + 1) % ROLES.length;
const roleText = ROLES[roleIndex];
console.log(`🎭 [CRON] Vai cũ: ${lastRoleIndex + 1}. Hôm nay ép diễn vai số ${roleIndex + 1}/${ROLES.length}: ${roleText}`);


const frontLang = alarm.frontLang || ''; // Lấy lại "in tư" nãy giờ frontend gửi

const vipList = [...dueWords].sort(() => 0.5 - Math.random()).slice(0, Math.min(2, dueWords.length));
const vipWords = vipList.map(w => `"${w.word}"`).join(' và ');
const langCode = alarm.frontLang || 'auto';
const tenNgonNgu = LANG_MAP[langCode] || langCode;



const geminiText = await callGemini(userData.geminiKey, dueWords, currentHour, roleText, tenNgonNgu, vipWords);

        console.log(` 💬 Gemini response: "${geminiText}"`);
        // ... (phần code gửi FCM giữ nguyên)



                // ✅ Kiểm tra cài đặt nội dung thông báo của người học
let finalBody = geminiText;
if (alarm.nameMode === 'custom' && alarm.customName && alarm.customName.trim() !== '') {
    finalBody = alarm.customName;
    console.log(` 💬 Đang dùng nội dung tùy chỉnh: "${finalBody}"`);
}

const thieu = [];
if (!finalBody.includes(String(dueWords.length))) thieu.push(`📊 ${dueWords.length} từ`);
vipList.forEach(w => { if (!finalBody.includes(w.word)) thieu.push(`"${w.word}"`); });
if (!finalBody.toLowerCase().includes(tenNgonNgu.toLowerCase())) thieu.push(`🌐 ${tenNgonNgu}`);
if (thieu.length > 0) finalBody += ' · ' + thieu.join(' · ');

                
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
                                title: ['🚨 Flashy Cảnh Báo', '🔔 Flashy Gọi Tên', '📣 Flashy Điểm Danh', '🆙 Flashy Nhắc Nhẹ'][Math.floor(Math.random() * 4)],
                                body: finalBody,
                                
                                
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
                    userData.lastRoleIndex = roleIndex; // <== LƯU VAI VỪA DIỄN
                    await env.DB.put(userKey.name, JSON.stringify(userData));
                    console.log(`  💾 Đã lưu lastNotifiedDate và lastRoleIndex (${roleIndex + 1}) vào DB.`);
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