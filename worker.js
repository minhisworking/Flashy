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

// 1. Hàm tạo chữ ký VAPID (Chìa khóa để bắn Noti trình duyệt)
async function getVapidAuth(audience, vapidKeys) {
    const header = { typ: 'JWT', alg: 'ES256' };
    const payload = { aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: 'mailto:admin@flashy.com' };
    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const data = `${headerB64}.${payloadB64}`;
    const key = await crypto.subtle.importKey('jwk', vapidKeys.privateKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(data));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const jwt = `${data}.${sigB64}`;
    return {
        'Authorization': `vapid t=${jwt}, k=${vapidKeys.publicKeyB64}`,
        'Crypto-Key': `p256ecdsa=${vapidKeys.publicKeyB64}`
    };
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
        
        // Route 1: Setup VAPID Keys (Chạy 1 lần duy nhất)
        if (url.pathname === '/setup') {
            const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
            const pubJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
            const privJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
            
            const pubB64 = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey))))
                .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
            
            await env.DB.put('vapid_keys', JSON.stringify({ publicKey: pubJwk, privateKey: privJwk, publicKeyB64: pubB64 }));
            return withCors(new Response(JSON.stringify({ success: true, publicKey: pubB64, message: "Đã tạo khóa thành công! Hãy copy publicKey này nhét vào Frontend." }), { headers: { 'Content-Type': 'application/json' } }));
        }

        // Route 2: Frontend gửi dữ liệu lên
        if (url.pathname === '/sync' && request.method === 'POST') {
            const { userId, subscription, dueWords, geminiKey } = await request.json();
            await env.DB.put(`user_${userId}`, JSON.stringify({ subscription, dueWords, geminiKey, lastSync: Date.now() }));
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
            if (!userData || !userData.subscription) continue;

            const dueWords = userData.dueWords.filter(w => w.nextReview <= (now + oneHour));
            
            if (dueWords.length > 0) {
                console.log(`🔥 User ${userId} có ${dueWords.length} từ sắp quên.`);
                const geminiText = await callGemini(userData.geminiKey, dueWords);
                
                await env.DB.put(`noti_${userId}`, JSON.stringify({ title: "🚨 Flashy Cảnh Báo", body: geminiText }));
                
                try {
                    const vapidKeys = await env.DB.get('vapid_keys', 'json');
                    const headers = await getVapidAuth(new URL(userData.subscription.endpoint).origin, vapidKeys);
                    headers['TTL'] = '3600';
                    
                    await fetch(userData.subscription.endpoint, {
                        method: 'POST',
                        headers: headers
                    });
                    console.log(`✅ Đã bắn noti cho user ${userId}`);
                } catch (e) {
                    console.error("Lỗi bắn noti:", e);
                }
            }
        }
    }
};
