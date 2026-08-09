// ════════════════════════════════════════════════════════════════════════════
// js/sync.js — Đồng bộ dữ liệu cá nhân (SYNC) + QR code tạo/quét mã đồng bộ.
// Tách từ app.js trong đợt refactor kiến trúc (refactor/architecture).
// Load order: questions.js → srs.js → sync.js (file này) → ui-core.js → exam.js → app.js
// Phụ thuộc: HISTORY_KEY (srs.js), TEAM_WEBHOOK_URL (ui-core.js) — chỉ dùng bên trong
// thân hàm nên không cần ui-core.js load trước (classic script, cùng global scope).
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// ── SYNC MODULE: đồng bộ dữ liệu cá nhân (cns_history_v1 + cns_heatmap_v1) ──
// giữa các thiết bị qua mã tự sinh, KHÔNG cần đăng nhập/thông tin cá nhân.
// Dùng chung endpoint TEAM_WEBHOOK_URL (Apps Script): GET = team log ẩn danh
// (giữ nguyên cũ), POST action=push/pull = đồng bộ cá nhân (mới).
// Tự động push (debounce 3s) sau mỗi câu trả lời nếu đã có mã đồng bộ.
// LƯU Ý: cơ chế ghi-đè đơn giản (last-write-wins), KHÔNG merge dữ liệu giữa
// 2 thiết bị — nếu học song song trên 2 máy không đồng bộ kịp, máy push sau
// sẽ ghi đè máy push trước.
// ════════════════════════════════════════════════════════════════════════════
const SYNC_CODE_KEY = 'cns_sync_code';
const SYNC_HEATMAP_KEY = 'cns_heatmap_v1'; // trùng STORAGE_KEY nội bộ của StudyHeatmap

function getSyncCode() {
  try { return localStorage.getItem(SYNC_CODE_KEY) || ''; } catch(e) { return ''; }
}
function setSyncCode(code) {
  try { localStorage.setItem(SYNC_CODE_KEY, code); } catch(e) {}
}
function genSyncCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ O/0, I/1 dễ nhầm khi chép tay
  function part() { let s=''; for (let i=0;i<4;i++) s += chars[Math.floor(Math.random()*chars.length)]; return s; }
  return part() + '-' + part();
}
function syncIsConfigured() {
  return TEAM_WEBHOOK_URL && !TEAM_WEBHOOK_URL.includes('ANH_LONG_DIEN');
}

let _syncPushTimer = null;
// Gọi sau mỗi sự kiện chấm điểm (debounce 3s — gộp nhiều câu trả lời liên tiếp
// thành 1 request thay vì spam server mỗi câu).
function scheduleSyncPush() {
  if (!getSyncCode() || !syncIsConfigured()) return;
  clearTimeout(_syncPushTimer);
  _syncPushTimer = setTimeout(syncPushNow, 3000);
}
function syncPushNow() {
  const code = getSyncCode();
  if (!code || !syncIsConfigured()) return;
  try {
    const historyRaw = localStorage.getItem(HISTORY_KEY);
    const heatmapRaw = localStorage.getItem(SYNC_HEATMAP_KEY);
    fetch(TEAM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // tránh CORS preflight với Apps Script
      body: JSON.stringify({
        action: 'push',
        code: code,
        history: historyRaw ? JSON.parse(historyRaw) : null,
        heatmap: heatmapRaw ? JSON.parse(heatmapRaw) : null
      })
    }).catch(function(){});
  } catch(e) {}
}
async function syncPullNow(code) {
  if (!syncIsConfigured()) return { ok: false, error: 'not_configured' };
  try {
    const res = await fetch(TEAM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'pull', code: code })
    });
    return await res.json();
  } catch(e) { return { ok: false, error: String(e) }; }
}

// ── MODAL CONTROL ──
function openSyncModal() {
  const m = $('syncModal');
  if (!m) return;
  m.style.display = 'flex';
  m.classList.remove('hidden');
  const code = getSyncCode();
  const block = $('syncCurrentBlock');
  const createBtn = $('syncCreateBtn');
  if (code) {
    if (block) { block.style.display = 'block'; $('syncCurrentCode').textContent = code; }
    if (createBtn) createBtn.textContent = '🔁 Tạo mã mới (thiết bị này sẽ tách khỏi mã cũ)';
    renderSyncQR(code);
  } else {
    if (block) block.style.display = 'none';
    if (createBtn) createBtn.textContent = '✨ Tạo mã đồng bộ mới cho thiết bị này';
  }
  $('syncStatusMsg').textContent = '';
  if (!syncIsConfigured()) {
    $('syncStatusMsg').textContent = '⚠ Tính năng đồng bộ chưa được cấu hình (TEAM_WEBHOOK_URL).';
    $('syncStatusMsg').style.color = '#f59e0b';
  }
}
function closeSyncModal() {
  const m = $('syncModal');
  if (m) { m.style.display = 'none'; m.classList.add('hidden'); }
  if (typeof closeQrScanner === 'function') closeQrScanner(); // phòng trường hợp camera còn đang mở
}
function createNewSyncCode() {
  const code = genSyncCode();
  setSyncCode(code);
  syncPushNow(); // đẩy ngay dữ liệu hiện tại lên dưới mã mới
  openSyncModal(); // re-render hiển thị mã mới
  const msg = $('syncStatusMsg');
  if (msg) { msg.textContent = '✓ Đã tạo mã mới và đồng bộ dữ liệu hiện tại lên server.'; msg.style.color = '#34d399'; }
}
async function confirmEnterSyncCode() {
  const input = $('syncCodeInput');
  const msg = $('syncStatusMsg');
  if (!input || !msg) return;
  const code = input.value.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    msg.textContent = '✗ Mã không đúng định dạng (VD: 7X9K-2A4B).';
    msg.style.color = '#f87171';
    return;
  }
  // Cảnh báo nếu thiết bị này đã có dữ liệu cục bộ — tải về sẽ GHI ĐÈ dữ liệu hiện tại
  const hasLocalData = !!(localStorage.getItem(HISTORY_KEY) || localStorage.getItem(SYNC_HEATMAP_KEY));
  if (hasLocalData) {
    const ok = confirm('Thiết bị này đang có dữ liệu ôn tập cục bộ. Tải mã đồng bộ về sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại trên thiết bị này. Tiếp tục?');
    if (!ok) return;
  }
  msg.textContent = 'Đang tải...';
  msg.style.color = '#7dd3fc';
  const res = await syncPullNow(code);
  if (!res || !res.ok) {
    msg.textContent = '✗ Không tải được dữ liệu (' + (res && res.error || 'lỗi không xác định') + ').';
    msg.style.color = '#f87171';
    return;
  }
  if (!res.found) {
    msg.textContent = '✗ Không tìm thấy mã này trên server. Kiểm tra lại mã.';
    msg.style.color = '#f87171';
    return;
  }
  if (res.history) localStorage.setItem(HISTORY_KEY, JSON.stringify(res.history));
  if (res.heatmap) localStorage.setItem(SYNC_HEATMAP_KEY, JSON.stringify(res.heatmap));
  setSyncCode(code);
  msg.textContent = '✓ Đã tải về thành công. Đang làm mới...';
  msg.style.color = '#34d399';
  // Refresh các UI phụ thuộc dữ liệu vừa tải về
  if (typeof StudyHeatmap !== 'undefined') StudyHeatmap.render();
  if ($('selModule') && $('selModule').value && typeof onModuleChange === 'function') onModuleChange();
  setTimeout(function() { openSyncModal(); }, 800);
}

// ── QR CODE: tạo mã QR hiển thị mã đồng bộ (thư viện qrcodejs, load qua CDN) ──
function renderSyncQR(code) {
  const box = $('syncQRBox');
  if (!box || typeof QRCode === 'undefined') return;
  box.innerHTML = ''; // xóa QR cũ trước khi vẽ QR mới, tránh chồng nhiều canvas qua các lần mở modal
  try {
    new QRCode(box, { text: code, width: 120, height: 120, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  } catch(e) {}
}

// ── QR SCANNER: quét mã đồng bộ bằng camera (thư viện jsQR, load qua CDN) ──
// Yêu cầu HTTPS (GitHub Pages đã có sẵn) vì getUserMedia chỉ chạy trên context bảo mật.
let _qrScannerStream = null;
let _qrScannerRAF = null;

async function openQrScanner() {
  const overlay = $('qrScannerOverlay');
  const video = $('qrScannerVideo');
  const status = $('qrScannerStatus');
  if (!overlay || !video) return;
  if (typeof jsQR === 'undefined') {
    alert('Không tải được thư viện quét QR (có thể do mất mạng). Anh có thể nhập mã thủ công thay thế.');
    return;
  }
  overlay.style.display = 'flex';
  overlay.classList.remove('hidden');
  if (status) status.textContent = 'Đang mở camera...';
  try {
    _qrScannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = _qrScannerStream;
    await video.play();
    if (status) status.textContent = 'Đưa mã QR (hiện trên thiết bị khác) vào khung hình';
    scanQrFrame();
  } catch (e) {
    if (status) status.textContent = '✗ Không truy cập được camera: ' + (e && e.message || e) + '. Anh có thể nhập mã thủ công thay thế.';
  }
}

function scanQrFrame() {
  const video = $('qrScannerVideo');
  if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
    _qrScannerRAF = requestAnimationFrame(scanQrFrame);
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(imageData.data, imageData.width, imageData.height);
  if (result && result.data) {
    const code = result.data.trim().toUpperCase();
    if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      closeQrScanner();
      const input = $('syncCodeInput');
      if (input) input.value = code;
      confirmEnterSyncCode(); // tự động tải về luôn, không bắt bấm thêm lần nữa (đúng tinh thần giảm thao tác)
      return;
    }
    // Quét được QR nhưng không đúng định dạng mã đồng bộ (vd QR khác) → tiếp tục quét, không dừng
  }
  _qrScannerRAF = requestAnimationFrame(scanQrFrame);
}

function closeQrScanner() {
  const overlay = $('qrScannerOverlay');
  if (overlay) { overlay.style.display = 'none'; overlay.classList.add('hidden'); }
  if (_qrScannerRAF) { cancelAnimationFrame(_qrScannerRAF); _qrScannerRAF = null; }
  if (_qrScannerStream) {
    _qrScannerStream.getTracks().forEach(function(t) { t.stop(); }); // tắt camera hẳn, không để chạy ngầm tốn pin
    _qrScannerStream = null;
  }
  const video = $('qrScannerVideo');
  if (video) video.srcObject = null;
}
