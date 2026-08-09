#!/usr/bin/env node
/**
 * scripts/split-questions.js
 *
 * Tách js/questions.js (questionBank ~1.1MB / 2275 câu) thành 11 file theo
 * module trong js/data/, viết lại js/questions.js chỉ còn phần ghép mảng
 * (giữ nguyên MODULE_CONFIG + LOCATION_MODULE_MAP), và tự động chèn thẻ
 * <script> cho 11 file data mới vào index.html + check.html (ngay trước
 * thẻ <script src="js/questions.js...">).
 *
 * Lý do dùng script thay vì sửa tay: file quá lớn (~2275 câu hỏi thi thật)
 * để copy thủ công an toàn — script này parse bằng JSON.parse (fail cứng
 * nếu cú pháp lỗi) và verify tổng số câu KHỚP TUYỆT ĐỐI trước khi ghi đè
 * bất kỳ file nào, để không có rủi ro mất/hỏng dữ liệu đề thi.
 *
 * Chạy 1 lần (từ thư mục gốc repo):
 *   node scripts/split-questions.js
 *
 * An toàn chạy lại nhiều lần (idempotent) — tự phát hiện và bỏ qua nếu đã tách rồi.
 * KHÔNG cần cài npm package nào (chỉ dùng fs/path built-in của Node).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const QUESTIONS_FILE = path.join(ROOT, 'js', 'questions.js');
const DATA_DIR = path.join(ROOT, 'js', 'data');

// Đúng 11 module theo LOCATION_MODULE_MAP hiện có trong js/questions.js —
// KHÔNG tự ý thêm/bớt module nào trong đợt refactor này.
const MODULE_MAP = [
  { id: 'VHF',          file: 'vhf.js',           varName: 'VHF_QUESTIONS' },
  { id: 'Radar',        file: 'radar.js',         varName: 'RADAR_QUESTIONS' },
  { id: 'SMS',          file: 'sms.js',           varName: 'SMS_QUESTIONS' },
  { id: 'ADS-B-LT',     file: 'adsb-lt.js',       varName: 'ADSB_LT_QUESTIONS' },
  { id: 'Ghi âm',       file: 'ghiam.js',         varName: 'GHIAM_QUESTIONS' },
  { id: 'ADS-B',        file: 'adsb.js',          varName: 'ADSB_QUESTIONS' },
  { id: 'RDP/FDP',      file: 'rdpfdp.js',        varName: 'RDPFDP_QUESTIONS' },
  { id: 'VCCS',         file: 'vccs.js',          varName: 'VCCS_QUESTIONS' },
  { id: 'Radar-TSN',    file: 'radar-tsn.js',     varName: 'RADAR_TSN_QUESTIONS' },
  { id: 'KipTruong-TSN',file: 'kiptruong-tsn.js', varName: 'KIPTRUONG_TSN_QUESTIONS' },
  { id: 'A-SGMCS',      file: 'asgmcs.js',        varName: 'ASGMCS_QUESTIONS' },
];

function fail(msg) {
  console.error('\n✗ LỖI: ' + msg);
  console.error('  → Không có file nào bị ghi đè. Sửa vấn đề trên rồi chạy lại.');
  process.exit(1);
}

// ── 1. Đọc questions.js gốc ──
if (!fs.existsSync(QUESTIONS_FILE)) fail('Không tìm thấy ' + QUESTIONS_FILE);
const src = fs.readFileSync(QUESTIONS_FILE, 'utf8');

// Idempotent guard: nếu đã tách rồi (questions.js giờ ghép từ các *_QUESTIONS) thì dừng.
if (/\.\.\.VHF_QUESTIONS/.test(src)) {
  console.log('⚠ js/questions.js đã ở dạng ghép module (đã chạy script này trước đó). Bỏ qua, không làm gì thêm.');
  process.exit(0);
}

// ── 2. Trích mảng questionBank bằng cách quét ngoặc [ ] (bỏ qua ngoặc trong string) ──
const startMarker = 'const questionBank = [';
const startIdx = src.indexOf(startMarker);
if (startIdx === -1) fail('Không tìm thấy "const questionBank = [" trong questions.js — cấu trúc file có thể đã đổi.');
const arrStart = startIdx + startMarker.length - 1; // trỏ vào ký tự '[' đầu mảng

function findArrayEnd(str, openIdx) {
  let depth = 0, inStr = false, esc = false;
  for (let i = openIdx; i < str.length; i++) {
    const c = str[i];
    if (inStr) {
      if (esc) { esc = false; }
      else if (c === '\\') { esc = true; }
      else if (c === '"') { inStr = false; }
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}
const arrEnd = findArrayEnd(src, arrStart);
if (arrEnd === -1) fail('Không tìm được dấu "]" đóng mảng questionBank (JSON có thể bị lỗi cú pháp).');

const arrayLiteral = src.slice(arrStart, arrEnd + 1); // gồm cả [ ... ]
const rest = src.slice(arrEnd + 1); // MODULE_CONFIG + LOCATION_MODULE_MAP + phần còn lại, giữ nguyên 100%

let questionBank;
try {
  questionBank = JSON.parse(arrayLiteral);
} catch (e) {
  fail('JSON.parse questionBank thất bại — dữ liệu gốc có thể bị lỗi cú pháp: ' + e.message);
}

// ── 3. Gom câu hỏi theo module ──
const buckets = {};
MODULE_MAP.forEach(m => { buckets[m.id] = []; });
const unknownModules = new Set();
questionBank.forEach(q => {
  if (buckets[q.module]) buckets[q.module].push(q);
  else unknownModules.add(q.module);
});
if (unknownModules.size) {
  fail('Phát hiện module KHÔNG nằm trong danh sách 11 module đã biết: ' + [...unknownModules].join(', ') +
       ' — cập nhật MODULE_MAP trong script trước khi chạy lại.');
}

// ── 4. Verify tổng số câu KHỚP TUYỆT ĐỐI trước khi ghi bất kỳ file nào ──
const totalGrouped = MODULE_MAP.reduce((n, m) => n + buckets[m.id].length, 0);
if (totalGrouped !== questionBank.length) {
  fail(`Tổng số câu sau khi gom nhóm (${totalGrouped}) KHÔNG khớp bản gốc (${questionBank.length}).`);
}
const idSet = new Set();
let dupCount = 0;
questionBank.forEach(q => {
  const key = q.module + '-' + q.id;
  if (idSet.has(key)) dupCount++;
  idSet.add(key);
});
if (dupCount > 0) {
  console.warn(`⚠ Cảnh báo: phát hiện ${dupCount} cặp (module,id) trùng lặp trong dữ liệu GỐC (không phải do script gây ra) — nên kiểm tra lại questionBank sau khi tách.`);
}

// ── 5. Ghi 11 file js/data/*.js ──
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
console.log('Đang tách questionBank theo module:\n');
MODULE_MAP.forEach(m => {
  const items = buckets[m.id];
  const body = items.map(q => JSON.stringify(q)).join(',\n');
  const content = `const ${m.varName} = [\n${body}\n];\n`;
  fs.writeFileSync(path.join(DATA_DIR, m.file), content, 'utf8');
  console.log(`  js/data/${m.file.padEnd(20)} ${String(items.length).padStart(4)} câu   (module: "${m.id}")`);
});

// ── 6. Ghi lại questions.js: chỉ còn phần ghép mảng, giữ nguyên MODULE_CONFIG/LOCATION_MODULE_MAP ──
const newQuestionsJs =
`const questionBank = [
  ...${MODULE_MAP.map(m => m.varName).join(', ...')}
];
` + rest;
fs.writeFileSync(QUESTIONS_FILE, newQuestionsJs, 'utf8');

// ── 7. Chèn <script> cho 11 file data vào index.html + check.html (trước thẻ questions.js) ──
const dataScriptTags = MODULE_MAP.map(m => `<script src="js/data/${m.file}"></script>`).join('\n');

['index.html', 'check.html'].forEach(htmlFile => {
  const p = path.join(ROOT, htmlFile);
  if (!fs.existsSync(p)) return;
  let html = fs.readFileSync(p, 'utf8');
  if (html.includes('js/data/vhf.js')) {
    console.log(`\n⚠ ${htmlFile} đã có thẻ <script> js/data/*.js — bỏ qua.`);
    return;
  }
  const re = /<script src="js\/questions\.js[^"]*"><\/script>/;
  const m = html.match(re);
  if (!m) {
    console.warn(`\n⚠ Không tìm thấy thẻ <script src="js/questions.js..."> trong ${htmlFile} — cần chèn thủ công 11 thẻ script (xem console.log ở trên) trước thẻ load questions.js.`);
    return;
  }
  html = html.replace(re, dataScriptTags + '\n' + m[0]);
  fs.writeFileSync(p, html, 'utf8');
  console.log(`\n✓ Đã chèn 11 thẻ <script> js/data/*.js vào ${htmlFile} (trước thẻ questions.js).`);
});

console.log(`\n✓ HOÀN TẤT: ${totalGrouped}/${questionBank.length} câu đã tách vào js/data/ (11 file), không thiếu/thừa/trùng.`);
console.log('✓ js/questions.js đã được viết lại (chỉ còn phần ghép mảng + MODULE_CONFIG/LOCATION_MODULE_MAP nguyên vẹn).');
console.log('\n→ Bước tiếp theo: git diff để review, mở index.html/check.html qua Live Server để test trước khi commit.');
