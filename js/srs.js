// ════════════════════════════════════════════════════════════════════════════
// js/srs.js — SRS (Spaced Repetition System): lịch sử ôn tập + thuật toán chấm
// điểm / chọn câu / sắp thứ tự theo mức độ ưu tiên (SM-2 rút gọn).
// Tách từ app.js trong đợt refactor kiến trúc (refactor/architecture).
// Load order: questions.js → srs.js (file này) → sync.js → ui-core.js → exam.js → app.js
// Phụ thuộc: shuffle() (định nghĩa trong ui-core.js) — chỉ dùng bên trong thân hàm
// nên không cần ui-core.js load trước (classic script, cùng global scope).
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// ── SRS HISTORY MODULE (localStorage key: 'cns_history_v1') ──────────────
// Lưu lịch sử ôn tập persist qua các session. Không reset nếu đã có data.
// Cấu trúc: {
//   seen:     {key: count}          — số lần hiển thị câu (exposure, giữ để thống kê)
//   wrong:    {key: count}          — số lần trả lời sai (giữ để thống kê)
//   lastSeen: {key: ms}             — timestamp lần cuối hiển thị
//   srs:      {key: {ef,reps,interval,due,lastReviewed,lapses}} — lịch ôn tập interval-based
//   key = q.module + '-' + q.id — khoá ghép module+id (KHÔNG dùng id trần) để tránh đụng
//   độ nếu 2 module khác nhau dùng chung dải id (vd chuẩn bị thêm chức danh ATCO sau này).
// }
// ════════════════════════════════════════════════════════════════════════════
const HISTORY_KEY       = 'cns_history_v1';
const MS_PER_DAY        = 86400000; // 1 ngày tính bằng mili-giây — dùng chung cho cả module SRS
const MAX_INTERVAL_DAYS = 90;       // [CAP] trần interval — không câu nào "biến mất" khỏi vòng ôn quá 90 ngày
const LEECH_THRESHOLD   = 5;        // [LEECH] số lần sai (lapses) trở lên thì coi là câu khó dai dẳng

// [MIGRATION] Chuyển key cũ (id trần, vd "5") sang key mới (module-id, vd "VHF-5").
// Idempotent: key đã có dấu '-' (đã là key mới) được giữ nguyên, an toàn gọi lại mỗi lần loadHistory().
// Nếu không tìm thấy câu trong questionBank (đã bị xoá khỏi ngân hàng đề ở lần cập nhật trước),
// dùng fallback 'UNKNOWN-<id>' để không mất dữ liệu, không throw lỗi.
function migrateHistoryKeys(h) {
  ['seen', 'wrong', 'lastSeen', 'srs'].forEach(function(bucket) {
    const old = h[bucket] || {};
    const migrated = {};
    Object.keys(old).forEach(function(k) {
      if (k.includes('-')) {
        // đã là key mới dạng module-id, giữ nguyên
        migrated[k] = old[k];
      } else {
        // key cũ là id trần — tra questionBank để lấy module gốc
        const q = questionBank.find(function(x) { return String(x.id) === k; });
        const newKey = q ? (q.module + '-' + k) : ('UNKNOWN-' + k); // fallback nếu câu đã bị xoá khỏi bank
        migrated[newKey] = old[k];
      }
    });
    h[bucket] = migrated;
  });
  return h;
}

// Đọc history từ localStorage; khởi tạo cấu trúc mới nếu chưa tồn tại
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const h = JSON.parse(raw);
      // Đảm bảo các key chính luôn tồn tại (backward compat với data cũ chưa có field srs)
      if (!h.seen)     h.seen     = {};
      if (!h.wrong)    h.wrong    = {};
      if (!h.lastSeen) h.lastSeen = {};
      if (!h.srs)      h.srs      = {};
      // [MIGRATION] Chuyển key id trần → module-id nếu còn sót lại từ trước (idempotent, an toàn gọi lại)
      migrateHistoryKeys(h);
      saveHistory(h);
      return h;
    }
  } catch(e) {}
  // Khởi tạo mới nếu chưa có hoặc lỗi JSON.parse
  return { seen: {}, wrong: {}, lastSeen: {}, srs: {} };
}

// Ghi history vào localStorage (silent fail nếu storage quota đầy)
function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch(e) {}
}

// Ghi nhận câu đã gặp: tăng seen[key]++ và cập nhật lastSeen[key]
// Gọi khi người dùng chọn đáp án bất kỳ (cả exam & practice mode) — thuần thống kê exposure,
// KHÔNG liên quan tới lịch ôn tập (xem srsGrade bên dưới).
function srsRecordSeen(q) {
  if (!q) return;
  const key = q.module + '-' + q.id;
  const h = loadHistory();
  h.seen[key]     = (h.seen[key]     || 0) + 1;
  h.lastSeen[key] = Date.now();   // ms timestamp, giữ cho mục đích thống kê/debug
  saveHistory(h);
}

// ── SRS GRADING (interval-based, SM-2 rút gọn cho input nhị phân đúng/sai) ──
// Gọi đúng 1 lần cho mỗi câu NGAY KHI biết kết quả đúng/sai:
//   - Practice mode: gọi ngay trong selectOpt() vì biết kết quả tức thì.
//   - Exam mode: gọi trong doSubmit() sau khi chấm toàn bộ bài.
// Công thức (SM-2 rút gọn, quality nhị phân thay vì thang 0-5):
//   Đúng → reps++; interval: 1 → 6 → round(interval * ef), trần MAX_INTERVAL_DAYS; ef += 0.1 (cap 3.0)
//   Sai  → reps=0; interval=1 (mai ôn lại ngay); ef -= 0.2 (sàn 1.3, chuẩn SM-2); lapses++ (đếm leech)
//   due  = now + interval ngày
function srsGrade(q, isCorrect) {
  if (!q) return;
  const key = q.module + '-' + q.id;
  const h = loadHistory();
  if (!isCorrect) h.wrong[key] = (h.wrong[key] || 0) + 1; // giữ thống kê wrong[] như cũ

  const NOW = Date.now();
  let s = h.srs[key] || { ef: 2.5, reps: 0, interval: 0, due: 0, lastReviewed: 0, lapses: 0 };
  if (s.lapses === undefined) s.lapses = 0; // backward-compat: câu đã có srs từ trước nhưng chưa có field lapses

  if (isCorrect) {
    s.reps++;
    if (s.reps === 1)      s.interval = 1;
    else if (s.reps === 2) s.interval = 6;
    else                   s.interval = Math.round(s.interval * s.ef);
    s.interval = Math.min(MAX_INTERVAL_DAYS, s.interval); // [CAP]
    s.ef = Math.min(3.0, s.ef + 0.1);
  } else {
    s.reps     = 0;
    s.interval = 1;
    s.ef       = Math.max(1.3, s.ef - 0.2);
    s.lapses++; // [LEECH] mỗi lần trượt tính 1 lapse, tích lũy suốt vòng đời câu hỏi
  }
  s.due          = NOW + s.interval * MS_PER_DAY;
  s.lastReviewed = NOW;
  h.srs[key] = s;
  saveHistory(h);
}

// [LEECH] Câu bị sai >= LEECH_THRESHOLD lần → "leech": học mãi không thuộc. Thường là dấu
// hiệu câu khó thật sự, nhưng cũng có thể là tín hiệu câu hỏi/đáp án bị lỗi nội dung cần rà soát.
function srsIsLeech(q) {
  if (!q) return false;
  const h = loadHistory();
  const s = h.srs[q.module + '-' + q.id];
  return !!(s && s.lapses >= LEECH_THRESHOLD);
}

// ── Priority dùng chung cho selection (exam), đếm due (badge) và sắp thứ tự (practice) ──
//   - Chưa từng học (reps===0, kể cả câu mới hoặc vừa trả lời sai gần nhất) → ưu tiên TUYỆT ĐỐI.
//   - Đã đến hạn ôn lại (due <= now) → ưu tiên theo mức độ QUÁ HẠN (quá hạn càng lâu càng ưu tiên).
//   - Chưa đến hạn (due > now) → ưu tiên thấp nhất.
const SRS_DUE_BASE = 50000; // ngưỡng phân biệt "cần ôn" (>= ngưỡng) và "chưa cần" (< ngưỡng)
function srsPriorityOf(h, q, NOW) {
  const s = h.srs[q.module + '-' + q.id];
  if (!s || s.reps === 0) return 100000;
  if (s.due <= NOW)       return SRS_DUE_BASE + (NOW - s.due) / MS_PER_DAY;
  return -(s.due - NOW) / MS_PER_DAY;
}

// [BADGE] Đếm số câu "cần ôn" (mới + quá hạn) trong 1 pool — dùng cho badge "X câu đến hạn hôm nay"
function srsCountDue(rawPool) {
  const h = loadHistory(), NOW = Date.now();
  return rawPool.reduce(function(n, q) {
    return n + (srsPriorityOf(h, q, NOW) >= SRS_DUE_BASE ? 1 : 0);
  }, 0);
}

// ── SRS SELECTION ALGORITHM (Exam mode — interval-based, giới hạn 50 câu) ────
//   Nếu số câu "cần ôn" (mới + quá hạn) >= 50 → lấy đúng 50 câu quá hạn/mới nhất.
//   Nếu chưa đủ 50 → lấp đầy bằng câu CHƯA đến hạn, chọn ngẫu nhiên để đa dạng.
function srsSelectQuestions(rawPool) {
  const h        = loadHistory();
  const NOW      = Date.now();
  const MAX_DRAW = 50;

  // Shuffle trước khi tính priority để các câu đồng hạng được xáo ngẫu nhiên
  // thay vì luôn giữ thứ tự cố định theo id gốc.
  const scored = shuffle(rawPool).map(function(q) {
    return { q: q, priority: srsPriorityOf(h, q, NOW) };
  });
  scored.sort(function(a, b) { return b.priority - a.priority; });

  const duePool  = scored.filter(function(s) { return s.priority >= SRS_DUE_BASE; }).map(function(s) { return s.q; });
  const restPool = scored.filter(function(s) { return s.priority <  SRS_DUE_BASE; }).map(function(s) { return s.q; });

  let selected;
  if (duePool.length >= MAX_DRAW) {
    selected = duePool.slice(0, MAX_DRAW);
  } else {
    const pickRest = shuffle(restPool).slice(0, MAX_DRAW - duePool.length);
    selected = duePool.concat(pickRest);
  }

  return shuffle(selected).map(function(q) {
    return Object.assign({}, q, { options: shuffle(q.options) });
  });
}

// ── SRS ORDERING (Practice mode — KHÔNG giới hạn số câu, chỉ sắp thứ tự ưu tiên) ──
// "Ôn tập" vẫn cho học toàn bộ pool đúng như trước, nhưng giờ câu cần ôn nhất
// (mới/quá hạn) luôn xuất hiện TRƯỚC — nếu thoát giữa chừng vẫn ưu tiên đúng
// phần quan trọng nhất thay vì random thuần túy như trước đây.
function srsOrderForPractice(rawPool) {
  const h   = loadHistory();
  const NOW = Date.now();
  const scored = shuffle(rawPool).map(function(q) {
    return { q: q, priority: srsPriorityOf(h, q, NOW) };
  });
  scored.sort(function(a, b) { return b.priority - a.priority; });
  return scored.map(function(s) {
    return Object.assign({}, s.q, { options: shuffle(s.q.options) });
  });
}

// ── ATCO MOCK EXAM (Thi thử) — chọn câu theo quota cố định từng chủ đề (topic),
//   KHÔNG dùng cơ chế SRS due-based như các module CNS khác, và KHÔNG xáo thứ tự
//   đáp án (giữ nguyên A/B/C/D gốc từ ngân hàng đề). Tổng 49 câu theo quota + 1 câu
//   ngẫu nhiên bổ sung từ bất kỳ chủ đề nào (không trùng câu đã chọn) = 50 câu.
const ATCO_EXAM_QUOTA = {
  'AIS':                   8,
  'Facilities':            5,
  'General Knowledge':     7,
  'Human Factor':          3,
  'Law':                   5,
  'Meteology':             7,
  'Navigation-Principle': 12,
  'Operational procedure': 2
}; // tổng quota cố định = 49, + 1 câu ngẫu nhiên bổ sung = 50

function atcoSelectQuestions(rawPool) {
  const selected  = [];
  const usedKeys  = new Set();

  Object.keys(ATCO_EXAM_QUOTA).forEach(function(topic) {
    const quota     = ATCO_EXAM_QUOTA[topic];
    const topicPool = shuffle(rawPool.filter(function(q) { return q.topic === topic; }));
    topicPool.slice(0, quota).forEach(function(q) {
      selected.push(q);
      usedKeys.add(q.module + '-' + q.id);
    });
  });

  // [+1] Bổ sung 1 câu ngẫu nhiên từ bất kỳ chủ đề nào chưa được chọn, để đạt đúng 50 câu
  const remaining = shuffle(rawPool.filter(function(q) { return !usedKeys.has(q.module + '-' + q.id); }));
  if (remaining.length > 0) selected.push(remaining[0]);

  // Xáo thứ tự CÂU HỎI trong đề (đa dạng mỗi lần thi), nhưng KHÔNG xáo options
  return shuffle(selected).map(function(q) {
    return Object.assign({}, q, { options: q.options.slice() });
  });
}

// ── SRS QUICK REVIEW (chỉ câu CẦN ÔN — mới + quá hạn, không pha câu chưa đến hạn) ──
// Dùng cho nút "Ôn nhanh câu đến hạn": tập trung đúng các câu cần ôn, cap 50 để giữ
// đúng tinh thần "nhanh" (khác Practice mode lấy toàn bộ pool).
function srsSelectDueOnly(rawPool) {
  const h        = loadHistory();
  const NOW      = Date.now();
  const MAX_DRAW = 50;

  const due = shuffle(rawPool)
    .map(function(q) { return { q: q, priority: srsPriorityOf(h, q, NOW) }; })
    .filter(function(s) { return s.priority >= SRS_DUE_BASE; })
    .sort(function(a, b) { return b.priority - a.priority; })
    .map(function(s) { return s.q; });

  return due.slice(0, MAX_DRAW).map(function(q) {
    return Object.assign({}, q, { options: shuffle(q.options) });
  });
}

// [MASTERY] % câu đã "thành thạo" trong pool. Định nghĩa: reps >= 3 — tức đã vượt qua
// giai đoạn bootstrap (1 ngày → 6 ngày) và đang giãn interval theo ease factor, chứng tỏ
// ghi nhớ ổn định qua nhiều lần ôn, không phải may mắn đoán đúng 1-2 lần.
const MASTERY_REPS_THRESHOLD = 3;
function srsMasteryPct(rawPool) {
  if (!rawPool.length) return 0;
  const h = loadHistory();
  const mastered = rawPool.filter(function(q) {
    const s = h.srs[q.module + '-' + q.id];
    return s && s.reps >= MASTERY_REPS_THRESHOLD;
  }).length;
  return Math.round(mastered / rawPool.length * 100);
}
