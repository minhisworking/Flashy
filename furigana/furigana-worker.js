// =====================================================================
// 🈶 furigana-worker.js
// "Người làm việc ngầm": nhận chữ Nhật, trả về HTML có <ruby> (furigana).
// Chạy nền nên không làm giật app. Toàn bộ chạy trên máy người dùng, không tốn tiền.
//
// Cách nói chuyện với worker (dành cho index.html):
//   gửi:  { type: 'init' }                      -> nhận { type: 'ready' }  (tải sẵn từ điển)
//   gửi:  { id: 1, texts: ['漢字', 'ひらがな'] } -> nhận { id: 1, results: ['<ruby>…', null] }
//         (null = câu đó không có kanji, không cần đổi gì)
//   lỗi:  { type: 'error', id, message }
// =====================================================================

importScripts('./lib/kuroshiro.min.js', './lib/kuroshiro-analyzer-kuromoji.min.js');

const KuroshiroClass = self.Kuroshiro.default || self.Kuroshiro;
const AnalyzerClass = self.KuromojiAnalyzer.default || self.KuromojiAnalyzer;

// Thư mục từ điển nằm cạnh file này (./dict/). Dùng đường dẫn đầy đủ cho chắc.
const DICT_URL = new URL('./dict/', self.location.href).href;

// Chỉ xử lý câu có chữ Hán (kanji). Câu toàn kana/chữ Latinh bỏ qua cho nhanh.
const HAS_KANJI = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF々〆]/;

const MAX_CACHE = 3000; // nhớ tối đa 3000 câu đã xử lý để lần sau khỏi tính lại
const cache = new Map();

let kuroshiro = null;
let initPromise = null;

function init() {
  if (kuroshiro) return Promise.resolve();
  if (!initPromise) {
    initPromise = (async () => {
      const k = new KuroshiroClass();
      await k.init(new AnalyzerClass({ dictPath: DICT_URL }));
      kuroshiro = k;
    })().catch(err => {
      initPromise = null; // lỗi thì cho phép thử lại lần sau
      throw err;
    });
  }
  return initPromise;
}

// Chặn ký tự < > & trong văn bản gốc, tránh bị hiểu nhầm thành thẻ HTML
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function toRuby(text) {
  if (typeof text !== 'string' || !HAS_KANJI.test(text)) return null;
  if (cache.has(text)) return cache.get(text);

  const html = await kuroshiro.convert(escapeHtml(text), { mode: 'furigana', to: 'hiragana' });

  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(text, html);
  return html;
}

self.onmessage = async (event) => {
  const msg = event.data || {};
  try {
    await init();

    if (msg.type === 'init') {
      self.postMessage({ type: 'ready' });
      return;
    }

    const texts = Array.isArray(msg.texts) ? msg.texts : [];
    const results = [];
    for (const t of texts) {
      try {
        results.push(await toRuby(t));
      } catch (e) {
        results.push(null); // 1 câu lỗi không làm hỏng cả lô
      }
    }
    self.postMessage({ id: msg.id, results });
  } catch (err) {
    self.postMessage({ type: 'error', id: msg.id, message: String((err && err.message) || err) });
  }
};
