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
  '📰 Phát thanh viên bản tin não bộ, giọng gấp rút dồn dập nhưng từ ngữ phải đời thường: "Tin nóng vừa nhận: một loạt từ vựng đồng loạt nộp đơn xin nghỉ việc khỏi não người dùng;..."',
  '💔 Người yêu cũ nhắn tin đúng giờ hiện tại của người nhận (nhìn đồng hồ trong đạo cụ, cấm tự bịa mốc giờ), giận dỗi trách móc nhưng vẫn quan tâm,"Em/Anh thấy anh/em lướt TikTok 3 tiếng mà không thèm ngó tới tụi em/anh;...", CHỈ dỗi hài kiểu bạn thân, cấm lả lơi tình ái.',
    '🏥 Bác sĩ gia đình ân cần khám định kỳ cho từ vựng: giọng dặn dò uống thuốc đúng giờ, kê đơn ôn tập nhẹ nhàng, cấm nói bệnh nặng',
  '⚖️ Tòa án tuyên án: "Bị cáo bị buộc tội bỏ rơi từ vựng. Tòa tuyên án: PHẢI MỞ APP NGAY LẬP TỨC;..."',
  '🎮 Hệ thống thông báo trong game: "⚠️ QUEST URGENT: đang ở trạng thái CRITICAL, không hoàn thành hôm nay progress sẽ RESET;..."',
    '👻 Ma nhí đáng yêu núp trong app méc nhẹ: giọng thì thầm nũng nịu "bạn quên tui rồi hả, tui vẫn nhớ bạn lắm đó", cấm hù dọa',
  '🧠 Não Bộ gửi đơn xin nghỉ việc cho chủ nhân: "Tôi, Não Bộ, đã cố gắng giữ từ vựng, nhưng sức tôi có hạn...;..."',
  '📱 Admin group chat gia đình từ vựng: đọc to các tin nhắn vĩnh biệt dồn dập trong group, giọng admin bất lực tổng hợp drama, gói gọn 1 dòng',
    '🎤 Rapper underground: 1 câu rap vần đôi flow gắt đúng 1 dòng, punchline chốt hạ chuyện sắp quên từ, flow gắt nhưng xưng hô cậu/tớ, tuyệt đối không mày tao',
    '😭 Thoại phim Hàn đầy nước mắt nhưng cấm tiệt cảnh lãng mạn/gợi cảm (cấm môi, hôn, ôm, quấn quýt, hơi thở, giường ngủ,...), chỉ khóc lóc vô lý hài hước kiểu lồng tiếng chợ phiên: "Oppa... tại sao... tại sao anh lại quên em...;..."',
  '🎤 MC gameshow công bố kết quả đầy kịch tính kiểu sắp loại thí sinh: "Và cái tên tiếp theo... sắp... RỜI... KHỎI... TRÍ NHỚ...;..."',
    '🔮 Thầy bói vui tính phán vận may: giọng hào hứng "số này hợp học hành, ôn hôm nay là may mắn gõ cửa liền", cấm phán hạn nặng tiêu vong',
  '📻 DJ radio đêm khuya, giọng nhẹ nhàng nhưng đầy tiếc nuối về những từ sắp bị lãng quên;...',
    '🤖 Robot trợ lý nũng nịu dọa dỗi: giọng giả vờ giận "không ôn nữa là tui buồn tui nghỉ hát luôn đó nha", cấm đe dọa xóa dữ liệu kiểu lạnh lùng',
];

// 🎲 Tách các nghĩa theo số khoanh tròn ①②③... rồi bốc thăm đúng 1 nghĩa
function chonMotNghia(w) {
  const raw = (w.definition || w.meaning || w.translation || '').replace(/\[.*?\]/g, '').replace(/<[^>]*>/g, '').split('\n')[0].trim();
  const cacNghia = raw.split(/(?=[①-⑳])/).map(s => s.trim()).filter(Boolean);
  const chot = cacNghia.length ? cacNghia[Math.floor(Math.random() * cacNghia.length)] : raw;
  return chot.replace(/^[①-⑳]\s*/, '').trim();
}


// 🎭✨ ĐẠO DIỄN CASTING: Gemini tự chọn vai hợp nghĩa 2 từ nhất
async function chonRoleBangGemini(apiKey, vipList, nghiaChot, lastRoleIndex) {
    const dsTu = vipList.map((w, i) => `${i + 1}. "${w.word}" — nghĩa: ${nghiaChot.get(w.word) || 'chưa rõ'}`).join('\n');
    const dsRoles = ROLES.map((r, i) => `${i}. ${r.slice(0, 100)}`).join('\n');
    const prompt = `Bạn là đạo diễn casting phim hài. Diễn viên chính hôm nay là 2 từ vựng kèm nghĩa tiếng Việt:\n${dsTu}\nDanh sách vai diễn đánh số từ 0:\n${dsRoles}\nChọn ĐÚNG 1 vai có đất diễn giúp nghĩa của 2 từ trên được tận dụng triệt để nhất (dựng cảnh hài đúng nghĩa đó, không phí nghĩa). Tránh chọn vai số ${lastRoleIndex} (mới dùng lần trước).\nChỉ trả về mã [[ROLE:số]], ví dụ [[ROLE:3]]. Cấm giải thích.`;
    const models = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
    for (const model of models) {
        try {
            const genConfig = { temperature: 0.7, maxOutputTokens: 32 };
            if (/2\.5|3/.test(model)) genConfig.thinkingConfig = { thinkingBudget: 0 };
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: genConfig })
            });
            if (!res.ok) continue;
            const text = (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const m = text.match(/\[\[ROLE:\s*(\d+)\]\]/);
            if (m) {
                const idx = parseInt(m[1], 10);
                if (idx >= 0 && idx < ROLES.length) {
                    console.log(`🎭✨ [Casting] Gemini tự chọn vai số ${idx}`);
                    return idx;
                }
            }
        } catch (e) { console.warn(`🎭✨ [Casting] ${model} rớt: ${e.message}`); }
    }
    return ((typeof lastRoleIndex === 'number' ? lastRoleIndex : -1) + 1) % ROLES.length;
}


function funFallback(count, wordListOnly, tenNgonNgu) {
    const w = wordListOnly.join(' và ');
    const mau = [
        `🚨 ${w} và ${count} từ ${tenNgonNgu} khác đang pack hành lý rời khỏi não!`,
        `🏥 Bác sĩ từ vựng: ${w} và ${count} bệnh nhân ${tenNgonNgu} cần truyền kiến thức gấp!`,
        `🎮 Quest khẩn: giải cứu ${w} và ${count} từ ${tenNgonNgu} khỏi trạng thái CRITICAL!`,
        `💔 ${w} nhắn: "người ơi đừng quên tui và ${count} từ ${tenNgonNgu} kia..."`,
        `🧠 Não quá tải: ${w} và ${count} từ ${tenNgonNgu} cần ôn ngay kẻo bay màu!`
    ];
    return mau[Math.floor(Math.random() * mau.length)].replace(/\s{2,}/g, ' ');
}







// 1. Hàm gọi Gemini API (Giữ nguyên)
async function callGemini(apiKey, words, hour, roleText, tenNgonNgu, vipWords, wordListOnly, maxWords) {
        const count = words.length;
    const h = (hour === undefined) ? 12 : hour;
    const buoi = h < 5 ? 'đêm khuya' : h < 12 ? 'buổi sáng' : h < 14 ? 'buổi trưa' : h < 18 ? 'buổi chiều' : 'buổi tối';

    



                const prompt = `Bạn là diễn viên method-acting, hôm nay NHẬP VAI 100%: ${roleText}

🎬 NHIỆM VỤ: Viết ĐÚNG 1 dòng push notification (≤240 ký tự) bằng THỔ NGỮ của nhân vật, đòi người dùng mở app Flashy ôn từ ngay.

🧳 ĐẠO CỤ (nghĩa tiếng Việt là "kịch bản", từ tiếng Nhật chỉ là "khách mời"):
- 2 từ chính kèm nghĩa: ${vipWords}
- Con số: ${count} từ điểm danh lần này.
${maxWords > 0 ? `- 🚧 HẠN MỨC TỐI ĐA: ${maxWords} từ/lần. BẮT BUỘC phải nhắc khéo con số ${maxWords} này trong lời thoại (ví dụ: "trong hạn mức ${maxWords} từ", "chỉ chọn ${maxWords} từ",...), cấm bỏ sót.` : ''}
${tenNgonNgu ? '- Ngôn ngữ mặt trước của lớp học: ' + tenNgonNgu + ' (phải lộ diện tinh tế trong lời thoại)' : ''}
- 🕐 Đồng hồ thật của người nhận (GMT+7): ${h} giờ, tức là ${buoi}.

⚠️ CHỈ ĐẠO DIỄN XUẤT:
- 🕐 Bám đồng hồ: mọi mốc thời gian trong lời thoại phải khớp ${h} giờ (${buoi}); nếu mô tả vai có mốc giờ cố định lệch giờ thật (vd "2h sáng") thì PHẢI nói lái theo giờ thật, cấm bê mốc giờ của vai vào lời thoại.
- 🧠 NGHĨA LÀ KỊCH BẢN: [nghĩa] tiếng Việt của 2 từ chính là CHẤT LIỆU duy nhất dựng vi cảnh oái oăm/hài hước (vd: nghĩa "đến trễ" + "tìm kiếm" → dựng cảnh đi trễ rồi lật tung nhà tìm đồ). Chuyện kể bằng tiếng Việt mượt như người thật nói, người chưa học từ vẫn hiểu và cười được.
- 🚫 CẤM NHÉT TỪ THÔ: tuyệt đối không cắm nguyên từ tiếng Nhật vào giữa câu tiếng Việt như động từ/danh từ (kiểu "lướt TikTok mà 遅れます 5 từ" là thảm họa); không lấy từ làm nhân vật/chủ ngữ của câu.
- 📌 GẮN TỪ KIỂU KHÁCH MỜI: nhắc tên đúng 2 từ đó MỘT lần duy nhất, đặt trong ngoặc kép hoặc sau cụm giới thiệu tự nhiên (vd: "...cặp đôi 遅れます với 探します đang xếp vali bỏ đi"); KHÔNG tự kèm ngoặc đơn giải nghĩa ngay sau từ (hệ thống sẽ tự gắn ngoặc nghĩa chuẩn sau), vì nghĩa đã thấm vào câu chuyện rồi.
- 🕵️ MÃ HẬU TRƯỜNG BÍ MẬT: cuối lời thoại gắn thêm mã [[DET:x,y]] với x, y lần lượt cho 2 từ chính theo thứ tự, mỗi cái là 0 hoặc 1: 1 = bạn ĐÃ dùng nghĩa của từ đó làm chất liệu dựng câu chuyện, 0 = chưa dệt được nghĩa đó. Mã chỉ hệ thống đọc, người dùng không thấy, cấm giải thích mã.
- Mở miệng câu đầu là nhận ra ngay đang đóng vai nào: dùng khẩu ngữ/thuật ngữ nghề của vai.
- 🪽 DỆT TINH TẾ: nhắc khéo ngôn ngữ lớp học và số từ điểm danh ngay TRONG lời thoại theo đúng giọng vai. ${maxWords > 0 ? `ĐẶC BIỆT: PHẢI nhắc đến con số hạn mức ${maxWords} từ/lần (ví dụ: "chỉ ghé thăm ${maxWords} từ", "trong hạn mức ${maxWords} từ"), cấm bỏ sót;` : ''} cấm liệt kê khô khan kiểu báo cáo ở cuối câu.
- Hài NHẸ NHÀNG kiểu bạn hiền trêu nhau; drama tối đa ở mức "hờn dỗi"; 1-2 emoji đúng chỗ.
- 👥 XƯNG HÔ: CẤM tuyệt đối đại từ thô "mày", "tao", "chúng mày", "tụi bay","tụi tao",...
- 🚫 VẠCH ĐỎ TUYỆT ĐỐI: cấm mọi hình ảnh chết chóc / nguy hiểm tính mạng; cấm đe dọa gây hoảng loạn thật; cấm văng đại từ thô (mày/tao/chúng mày) dưới mọi biến thể.
- 🛑 CẤM GỢI DỤC / GỢI CẢM: cấm mọi hình ảnh thân mật hoặc dễ hiểu lầm tình ái (môi, hôn, thơm, ôm, ấp, quấn quýt, hơi thở, giường, phòng ngủ, tắm, kẹo ngọt dính người, cơ thể nóng bỏng); nghĩa từ mà là chất lỏng/chất bôi (mưa, dầu, mỡ, ướt, trơn) thì CẤM cho dính lên người, da, tóc, quần áo — chỉ được rơi vào đồ vật, sân vườn, nồi niêu, máy móc.
- 🧊 Đạo cụ cơ thể người là vùng cấm: cấm mượn thân thể/cảm giác da thịt làm cảnh; bẻ lái sang cảnh đời thường vô tri (nấu ăn, thời tiết, sửa xe, dọn nhà, đi học muộn).
    - Vai có màu tối thì CHỈ mượn giọng nói, phải bẻ nội dung sang hướng ấm áp đáng yêu.
    - CẤM từ khóa dễ dính spam: "KHẨN", "CẤP BÁCH", "CLICK NGAY", "BREAKING NEWS", "CHẤN ĐỘNG".
    - Cấm chép nguyên văn ví dụ trong mô tả vai.

🎓 VÍ DỤ MẪU (HỌC CÁCH NEO "NGHĨA" SÁT "TỪ GỐC" & TUÂN THỦ MỌI LUẬT LỆ):

👉 Ví dụ 1 (Vai Bác sĩ | 8h sáng | 15 từ | Hạn mức 5 từ | Tiếng Nhật):
- Đạo cụ: "風邪" [cảm lạnh] và "薬" [thuốc].
- ✅ Lời thoại ĐÚNG: Sáng nay bác sĩ khám định kỳ cho 15 từ Tiếng Nhật, kê đơn uống thuốc "薬" đều đặn kẻo để não bị cảm lạnh "風邪", cậu nhớ ôn đúng hạn mức 5 từ thôi nhé! 💊 [[DET:1,1]]

👉 Ví dụ 2 (Vai Game thủ | 14h trưa | 20 từ | Hạn mức 10 từ | Tiếng Anh):
- Đạo cụ: "遅れる" [đến trễ] và "急ぐ" [vội vã].
- ✅ Lời thoại ĐÚNG: ⚠️ QUEST TRƯA NAY: cậu mải chơi game mà để lỡ nhịp đến trễ "遅れる" giờ G ôn 20 từ Tiếng Anh rồi, phải vội vã "急ぐ" cày trong hạn mức 10 từ thôi! 🎮 [[DET:1,1]]

👉 Ví dụ 3 (Vai Người yêu cũ | 20h tối | 12 từ | Hạn mức 8 từ | Tiếng Trung):
- Đạo cụ: "捨てる" [vứt bỏ] và "拾う" [nhặt lên].
- ✅ Lời thoại ĐÚNG: Tối nay em thấy cậu cứ vứt bỏ "捨てる" đống 12 từ Tiếng Trung ngoài đường, rồi lại lụi cụi nhặt lên "拾う" ôn đúng 8 từ, cậu lơ là là em dỗi đó! 🥺 [[DET:1,1]]

💡 BÀI HỌC RÚT RA TỪ VÍ DỤ:
1. DÙNG NGHĨA TIẾNG VIỆT LÀM ĐỘNG TỪ/DANH TỪ, kẹp từ gốc trong ngoặc kép ngay sát cạnh (vd: uống thuốc "薬").
2. PHẢI NHẮC ĐỦ: Buổi trong ngày (Sáng/Trưa/Tối), Tổng số từ, Hạn mức từ, Ngôn ngữ lớp học.
3. Xưng hô lịch sự (cậu/tớ, anh/em), chốt câu bằng mã [[DET:1,1]].

    - Chỉ trả về lời thoại, 1 dòng, không markdown, không giải thích.
`;

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
            const bad = ['image', 'audio', 'video', 'tts', 'live', 'embedding', 'aqa','pro', 'ultra', 'gemma', 'preview', 'robotics', 'omni', 'study', 'research'];
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
                models = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
    }

    // 🏃 BƯỚC 2: CHẠY MARATHON TỪ CỔ CHÍ KIM
    for (const model of models) {
                try {
            // 🛡️ Chặn chế độ "suy nghĩ" ngốn token của mấy bé đời mới (2.5, 3.x)
            const genConfig = { temperature: 2.0, topP: 0.99, topK: 100, maxOutputTokens: 512 };
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
                let text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/\*/g, '').trim();


                let detFlags = null;
                const detMatch = text.match(/\[\[DET:([01])\s*,?\s*([01])?\]\]\s*$/);
                if (detMatch) detFlags = [detMatch[1] === '1', detMatch[2] === undefined ? null : detMatch[2] === '1'];
                text = text.replace(/\[\[DET:[01]\s*,?\s*[01]?\]\]/g, '').trim();
                console.log('🕵️ [Worker] Lời khai dệt nghĩa:', JSON.stringify(detFlags));

                
                                if (text) {
                    // 📏 MÁY CHÉM: câu phải đủ dài, kết thúc có dấu câu, và nhắc tới nhân vật chính
                                        const endsOk = /[.!?…]/.test(text);
                    const textLower = text.toLowerCase();
const coVip = wordListOnly.every(w => textLower.includes(w.toLowerCase()));
                    const coSo = text.includes(String(words.length));
                    const coLang = text.toLowerCase().includes(tenNgonNgu.toLowerCase());
                    
const noiSaiGio = h >= 12 && /\d{1,2}\s*h\s*sáng/i.test(text);


                                        const sachSu = !/\b(mày|tao|chúng mày|tụi bay)\b/i.test(text); // 🧼 dính đại từ thô là loại
                    
                    const sachSen = !/(môi(?! trường)|hôn|quấn quýt|hơi thở|giường ngủ|phòng ngủ|ôm ấp|nóng bỏng|gợi cảm|quyến rũ|thổn thức)/i.test(text); // 🧊 dính chữ gợi cảm là loại ngay


                    if (text.length < 20 || text.length > 250 || !endsOk || !coVip || !coSo || !sachSu || !sachSen || (tenNgonNgu && !coLang) || noiSaiGio) {
                        console.warn(`✂️ [Worker] ${model} thiếu đồ (dài ${text.length}, kết=${endsOk}, vip=${coVip}, số=${coSo}, sạch=${sachSu}, sen=${sachSen}, lang=${coLang}): "${text}". Next bé!`);
                        continue;
                    }
                    console.log(`✅ [Worker] Chốt đơn model cổ thụ: ${model}`);
                    return { text, detFlags };
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
    return { text: funFallback(count, wordListOnly, tenNgonNgu), detFlags: null };
}


// 🔍 MÁY BY chứng LOKAL (lưới an toàn khi trọng tài ngủ quên): tách nghĩa thành từ khóa, CHỈ quét phần truyện, bỏ qua mọi ngoặc đơn
function coBangChungLocal(bodyText, nghia) {
    const story = bodyText.replace(/\([^)]{0,40}\)/g, ' ').toLowerCase();
    const fragments = nghia.toLowerCase().split(/[,;/]+/).map(s => s.trim()).filter(s => s.length >= 4);
    if (fragments.some(f => story.includes(f))) return true;
    const keys = nghia.toLowerCase().split(/[^a-zà-ỹ]+/).filter(s => s.length >= 3);
    return keys.some(k => new RegExp('(^|[^a-zà-ỹ])' + k + '($|[^a-zà-ỹ])').test(story));
}

// 🪞 MIRROR LƯỢT 2: trọng tài Gemini đọc truyện và phán nghĩa đã dệt chưa (tính cả đồng nghĩa/paraphrase, BỎ QUA ngoặc đơn)
async function kiemTraDet(apiKey, bodyText, vipList, nghiaChot) {
    const ds = vipList.map((w, i) => `${i + 1}. "${w.word}" — nghĩa: ${nghiaChot.get(w.word) || 'chưa rõ'}`).join('\n');
    const prompt = `Bạn là trọng tài chấm chữ, cực nghiêm nhưng công tâm.
Dưới đây là 1 câu push notification và danh sách từ kèm nghĩa tiếng Việt.
HÃY BỎ QUA mọi đoạn trong ngoặc đơn (...) của câu.
Với mỗi từ theo thứ tự: trả 1 nếu câu ĐÃ diễn đạt nghĩa của từ đó bằng đúng từ đó, hoặc từ đồng nghĩa / gần nghĩa / hình ảnh paraphrase; trả 0 nếu chưa hề đụng tới nghĩa đó.
CÂU: ${bodyText}
DANH SÁCH:
${ds}
Chỉ trả về đúng mã [[CHK:x,y]] (x, y là 0 hoặc 1 theo thứ tự từ, cách nhau dấu phẩy). Cấm giải thích.`;
    const models = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
    for (const model of models) {
        try {
            const genConfig = { temperature: 0, maxOutputTokens: 64 };
            if (/2\.5|3/.test(model)) genConfig.thinkingConfig = { thinkingBudget: 0 };
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: genConfig })
            });
            if (!res.ok) { console.warn(`🪞 [Mirror] ${model} trả ${res.status}, đổi trọng tài...`); continue; }
            const text = (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const m = text.match(/\[\[CHK:\s*([01,\s]+)\]\]/);
            if (m) {
                const flags = m[1].split(',').map(s => s.trim() === '1');
                console.log(`🪞 [Mirror] ${model} phán: ${JSON.stringify(flags)}`);
                return flags;
            }
            console.warn(`🪞 [Mirror] ${model} phán khó hiểu: "${text.slice(0, 120)}"`);
        } catch (e) {
            console.warn(`🪞 [Mirror] ${model} rớt mạng: ${e.message}`);
        }
    }
    return null;
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

try {


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

                        // 🆕 Lấy danh sách alarms mới (ưu tiên body, fallback existing)
            const newAlarms = body.alarms || existing.alarms || [];
            
            // 🆕 Tính toán các khung giờ ĐANG BẬT để đánh chỉ mục
            const newEnabledTimes = newAlarms.filter(a => a.enabled && a.time).map(a => `idx_${a.time.replace(':', '')}`);
            const oldIndexedTimes = existing.indexedTimes || [];

            // 🧹 DỌN DẸP: Xóa user khỏi các khung giờ cũ đã TẮT hoặc ĐỔI GIỜ
            for (const oldKey of oldIndexedTimes) {
                if (!newEnabledTimes.includes(oldKey)) {
                    const oldList = await env.DB.get(oldKey, 'json') || [];
                    const newList = oldList.filter(id => id !== body.userId);
                    if (newList.length === 0) await env.DB.delete(oldKey);
                    else if (newList.length < oldList.length) await env.DB.put(oldKey, JSON.stringify(newList));
                }
            }

            // ➕ THÊM MỚI: Đưa user vào các khung giờ đang bật
            for (const newKey of newEnabledTimes) {
                const list = await env.DB.get(newKey, 'json') || [];
                if (!list.includes(body.userId)) {
                    list.push(body.userId);
                    await env.DB.put(newKey, JSON.stringify(list));
                }
            }

            // 💾 Lưu lại vào DB (kèm theo indexedTimes để lần sau còn biết đường dọn)
            await env.DB.put(`user_${body.userId}`, JSON.stringify({ 
                fcmToken: newFcmToken,  
                dueWords: body.dueWords || existing.dueWords, 
                geminiKey: body.geminiKey || existing.geminiKey,
                alarmSettings: body.alarmSettings || existing.alarmSettings,
                alarms: newAlarms,
                indexedTimes: newEnabledTimes, // 🆕 Lưu lại danh sách giờ đang bật
                lastRoleIndex: existing.lastRoleIndex,
                notifiedWords: existing.notifiedWords || [],
                lastNotifiedDate: existing.lastNotifiedDate,
                lastSync: Date.now(), 
                generationConfig: { temperature: 0.9 } 
            }));


            
            console.log("💾 [DEBUG /sync] Đã lưu thành công vào DB với fcmToken:", newFcmToken ? "CÓ (Length: " + newFcmToken.length + ")" : "VẪN RỖNG");
            return withCors(new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } }));
        }

        return withCors(new Response('Flashy Backend is alive!'));


    } catch (e) {
        return withCors(new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }

    },


    // --- CRON JOB (CANH GIỜ) ---
async scheduled(event, env) {
    console.log("⏰ [CRON] Job bắt đầu lúc:", new Date().toISOString());
    
        // 🕐 Lấy thời gian hiện tại theo GMT+7
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const gmt7Time = new Date(utcTime + (3600000 * 7));
    
    // Tạo key mục lục cho giờ hiện tại, ví dụ: "idx_0805"
        const currentH = String(gmt7Time.getHours()).padStart(2, '0');
    const currentM = String(gmt7Time.getMinutes()).padStart(2, '0');
    const timeKey = `idx_${currentH}${currentM}`;

    // 🆕 TÍNH THÊM KHUNG GIỜ "TIÊN TRI" (TRƯỚC 10 PHÚT)
    const futureTime = new Date(gmt7Time.getTime() + 10 * 60000); // Cộng thêm 10 phút
    const futureH = String(futureTime.getHours()).padStart(2, '0');
    const futureM = String(futureTime.getMinutes()).padStart(2, '0');
    const futureKey = `idx_${futureH}${futureM}`;
    
    console.log(`📂 [CRON] Đang đọc mục lục cho giờ: ${currentH}:${currentM}`);
    
        // 🆕 HỆ KÉP: CHẠY 2 LẦN (1 LẦN SOI KÈO SỚM, 1 LẦN CHỐT ĐƠN GIỜ G)
    const runs = [
    { key: timeKey, mode: 'send', targetH: gmt7Time.getHours(), targetM: gmt7Time.getMinutes(), label: '🚀 Giờ G chốt đơn' },
    { key: futureKey, mode: 'generate', targetH: futureTime.getHours(), targetM: futureTime.getMinutes(), label: '🔮 Soi kèo 10 phút' }
];

    let accessToken = null;
    try {
        accessToken = await getGoogleAccessToken(env.FIREBASE_SERVICE_ACCOUNT);
        console.log("✅ [CRON] Đã lấy Access Token");
    } catch (e) {
        console.error("💥 [CRON] Lỗi lấy Access Token:", e.message);
        return;
    }

    for (const run of runs) {
        const userList = await env.DB.get(run.key, 'json') || [];
        if (userList.length === 0) {
            console.log(`💤 [CRON] ${run.label}: Không có user.`);
            continue;
        }
        console.log(`📋 [CRON] ${run.label}: Tìm thấy ${userList.length} user.`);

        for (const userId of userList) {

const userKeyStr = 'user_' + userId;

        
        const userData = await env.DB.get(userKeyStr, 'json');
        
console.log(`🔬 [DEBUG] User ${userId} raw data:`, JSON.stringify(userData, null, 2));



        console.log(`\n [CRON] Kiểm tra user: ${userId}`);
        console.log("  - Alarm settings:", JSON.stringify(userData?.alarmSettings));
        console.log("  - FCM Token:", userData?.fcmToken ? "CÓ" : "KHÔNG");
        console.log("  - Due words:", userData?.dueWords?.length || 0);

        if (!userData || !userData.fcmToken) {
            console.log("  ⚠️ [CRON] Thiếu fcmToken. Bỏ qua.");
            continue;
        }

                // 🆕 Duyệt qua TẤT CẢ báo thức (nếu có mảng alarms)
        const alarmsToCheck = (userData.alarms && Array.isArray(userData.alarms) && userData.alarms.length > 0)
            ? userData.alarms.filter(a => a.enabled)
            : (userData.alarmSettings ? [userData.alarmSettings] : []);

        if (alarmsToCheck.length === 0) {
            console.log("  💤 Không có báo thức nào được bật. Bỏ qua user này.");
            continue;
        }

        // 🔄 LẶP QUA TỪNG BÁO THỨC
        for (const alarm of alarmsToCheck) {
            const [alarmH, alarmM] = (alarm.time || "08:00").split(':').map(Number);

            // 🆕 SO KHỚP GIỜ THEO "HỆ KÉP" (Dùng targetH và targetM của run hiện tại)
            const isTimeMatch = (run.targetH === alarmH && run.targetM === alarmM);
            if (!isTimeMatch) {
                continue; 
            }

            // Kiểm tra ngày trong tuần
            const currentDay = gmt7Time.getDay(); 
            let isDayMatch = true;

            if (alarm.frequency === 'weekly' || alarm.frequency === 'custom') {
                if (!alarm.days || !Array.isArray(alarm.days) || alarm.days.length === 0) {
                    isDayMatch = true; 
                } else {
                    isDayMatch = alarm.days.includes(currentDay);
                }
            }

            if (!isDayMatch) {
                console.log(`  ❌ Báo thức ${alarm.time} không đúng ngày. Bỏ qua.`);
                continue;
            }

            // 1. Lọc từ sắp quên
            let dueWords = (userData.dueWords || []).filter(w => {
                const nextReview = new Date(w.nextReview).getTime();
                const oneHourLater = Date.now() + 3600000;
                return nextReview <= oneHourLater;
            });

            // 🆕 LỌC THEO MULTIVERSE CỦA TỪNG BÁO THỨC
            const targetMulti = alarm.multiverse; 
            if (targetMulti && targetMulti !== 'all' && targetMulti !== '') {
                if (targetMulti === 'none') {
                    dueWords = dueWords.filter(w => !w.multi);
                } else {
                    dueWords = dueWords.filter(w => w.multi === targetMulti || !w.multi);
                }
            }

            // Cắt giới hạn số từ (maxWords)
            const maxW = alarm.maxWords ? parseInt(alarm.maxWords) : 0;
            if (maxW > 0 && dueWords.length > maxW) {
                dueWords = dueWords.slice(0, maxW);
            }

            if (dueWords.length === 0) {
                console.log(`  💤 Báo thức ${alarm.time} không có từ nào cần nhắc.`);
                continue; 
            }

                        console.log(`🔥 [${run.label}] Báo thức ${alarm.time}: Xử lý ${dueWords.length} từ...`);
            try {
                const todayStr = gmt7Time.toISOString().split('T')[0];
                const preGen = userData.preGeneratedNoti?.[alarm.time];
                let finalBody = "";
                let dbNeedsUpdate = false;

                // 🧠 Hàm phụ trợ để tạo content (dùng chung cho cả 2 pha, khỏi copy code lặp lại)
                const generateContent = async () => {
                    const history = userData.notifiedWords || [];
                    let fresh = dueWords.filter(w => !history.includes(w.word));
                    let newHistory = history;
                    if (fresh.length < 2) { fresh = dueWords; newHistory = []; }
                    const vipList = [...fresh].sort(() => 0.5 - Math.random()).slice(0, Math.min(2, fresh.length));


const nghiaChot = new Map(vipList.map(w => [w.word, chonMotNghia(w)]));


                    const lastRoleIndex = (typeof userData.lastRoleIndex === 'number') ? userData.lastRoleIndex : -1;
                    const roleIndex = await chonRoleBangGemini(userData.geminiKey, vipList, nghiaChot, lastRoleIndex);
                    const roleText = ROLES[roleIndex].replace(/;?\.\.\./g, '').trim();

                    
                    const vipWords = vipList.map(w => {
                        const nghia = (nghiaChot.get(w.word) || '').slice(0, 40);
                        return `"${w.word}" [nghĩa: ${nghia || 'vũ trụ chưa khai sáng'}]`;
                    }).join(' và ');
                    const wordListOnly = vipList.map(w => w.word);
                    const tenNgonNgu = alarm.frontLang || userData.alarmSettings?.frontLang || '';

                    const useCustom = (alarm.nameMode === 'custom' && alarm.customName && alarm.customName.trim() !== '');
                    let bodyText;
                    if (useCustom) {
                        bodyText = alarm.customName.trim();
                    } else {
                        // Lưu ý: Truyền run.targetH để AI biết đang nói về buổi sáng/trưa/chiều của giờ báo thức
                                                // 🪞 MIRROR: lượt 1 viết noti → lượt 2 trọng tài kiểm tra; chưa ổn thì viết lại, tối đa 2 lượt
                        let trongTai = null;
                        for (let lan = 1; lan <= 2; lan++) {
                            const gemKetQua = await callGemini(userData.geminiKey, dueWords, run.targetH, roleText, tenNgonNgu, vipWords, wordListOnly, maxW);
                            bodyText = gemKetQua.text;
                            trongTai = await kiemTraDet(userData.geminiKey, bodyText, vipList, nghiaChot);
if (trongTai === null) {
    trongTai = vipList.map(w => coBangChungLocal(bodyText, nghiaChot.get(w.word) || ''));
    console.warn('🪞 [Mirror] trọng tài ngủ quên, máy soi lokal chấm:', JSON.stringify(trongTai));
}
if (trongTai.every(Boolean)) break; // ✅ kiểm tra ổn: mọi nghĩa đã dệt vào truyện → dừng
                            console.warn(`🪞 [Mirror] lượt ${lan} chưa ổn (phán: ${JSON.stringify(trongTai)}), viết lại...`);
                        }

                                                vipList.forEach((w, i) => {
                            const nghia = (nghiaChot.get(w.word) || '').slice(0, 22);
                            if (!nghia) return;
                            const esc = w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const coNgoac = new RegExp(esc + '(["\']?)\\s*\\([^)]{0,40}\\)').test(bodyText);
                            if (!coNgoac) {
                                // ✅ Luôn đính ngoặc nghĩa để người học thấy nghĩa ngay trong noti
                                bodyText = bodyText.replace(new RegExp(esc + '(["\']?)', 'g'), w.word + '$1 (' + nghia + ')');
                            }
                        });


bodyText = bodyText.replace(/\)(?=[^\s.,!?;:…)·])/g, ') ');


                        const thieu = [];
                        if (!bodyText.includes(String(dueWords.length))) thieu.push(`📊 ${dueWords.length} từ`);
                        if (maxW > 0 && !bodyText.includes(String(maxW))) thieu.push(`🚧 Hạn mức ${maxW} từ`);
                        vipList.forEach(w => { if (!bodyText.includes(w.word)) thieu.push(`"${w.word}"`); });
                        if (tenNgonNgu && !bodyText.toLowerCase().includes(tenNgonNgu.toLowerCase())) thieu.push(`🌐 ${tenNgonNgu}`);
                        if (thieu.length > 0) bodyText += ' · ' + thieu.join(' · ');
                    }
                    userData.lastRoleIndex = roleIndex;
                    userData.notifiedWords = [...newHistory, ...vipList.map(w => w.word)].slice(-200);
                    return bodyText;
                };

                // 🆕 LOGIC TÁCH BIỆT: GENERATE SỚM vs GỬI GIỜ G
                if (run.mode === 'generate') {
                    // --- PHA 1: SOI KÈO SỚM (CHỈ TẠO, CẤT TỦ, KHÔNG GỬI) ---
                    if (!preGen || preGen.date !== todayStr) {
                        console.log(`🤖 [${run.label}] Gọi Gemini ngầm để dành...`);
                        finalBody = await generateContent();
                        if (!userData.preGeneratedNoti) userData.preGeneratedNoti = {};
                        userData.preGeneratedNoti[alarm.time] = { text: finalBody, date: todayStr };
                        dbNeedsUpdate = true;
                    } else {
                        console.log(`✅ [${run.label}] Đã có content AI trong tủ rồi, skip.`);
                    }
                    if (dbNeedsUpdate) await env.DB.put(userKeyStr, JSON.stringify(userData));
                    continue; // ⛔ Chặn đứng việc gửi FCM ở pha này
                } 
                else if (run.mode === 'send') {
                    // --- PHA 2: GIỜ G (MỞ TỦ CHỐT ĐƠN GỬI FCM) ---
                    if (preGen && preGen.date === todayStr && preGen.text) {
                        console.log(`🎁 [${run.label}] Bưng content AI đã làm sẵn ra gửi.`);
                        finalBody = preGen.text;
                        delete userData.preGeneratedNoti[alarm.time]; // Xóa khỏi tủ để mai không dùng lại
                        dbNeedsUpdate = true;
                    } else {
                        console.log(`⚠️ [${run.label}] Tủ trống (AI lỗi hoặc chưa chạy), phải gọi Gemini gấp (hoặc ăn fallback).`);
                        finalBody = await generateContent();
                        dbNeedsUpdate = true;
                    }
                    


const isCustom = (alarm.nameMode === 'custom' && alarm.customName && alarm.customName.trim() !== '');

                    // Gửi FCM
                    const projectId = "flashyapp-45c1a";
                    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
                                        const notiTitle = ['🚨 Flashy Cảnh Báo', '🔔 Flashy Gọi Tên', '📣 Flashy Điểm Danh', '🆙 Flashy Nhắc Nhẹ'][Math.floor(Math.random() * 4)];
                    const response = await fetch(fcmUrl, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: {
                                token: userData.fcmToken,
                                notification: {
                                    title: notiTitle,
                                    body: finalBody
                                },
                                data: {
                                    title: notiTitle,
                                    body: finalBody,
                                    custom: isCustom ? '1' : '0',
                                    url: 'https://minhisworking.github.io/Flashy/?scare=1'
                                },
                                android: {
                                    priority: "high"
                                }
                            }
                        })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`❌ FCM API lỗi ${response.status}: ${errorText}`);
                        if (response.status === 404 && errorText.includes('UNREGISTERED')) {
                            userData.fcmToken = "";
                            dbNeedsUpdate = true;
                        }
                    } else {
                        const result = await response.json();
                        console.log(`🏆 [${run.label}] FCM success cho báo thức ${alarm.time}:`, JSON.stringify(result));
                    }
                    if (dbNeedsUpdate) await env.DB.put(userKeyStr, JSON.stringify(userData));
                }
                        } catch (e) {
                console.error(`💥 [${run.label}] Lỗi khi xử lý báo thức ${alarm.time}:`, e.message);
            }
        } // <-- 1. Đóng vòng lặp `for (const alarm of alarmsToCheck)`
    } // <-- 2. Đóng vòng lặp `for (const userId of userList)`
} // <-- 3. Đóng vòng lặp `for (const run of runs)`

    console.log("\n🏁 [CRON] Job kết thúc.\n");
} // Đóng hàm scheduled
}; // Đóng export default