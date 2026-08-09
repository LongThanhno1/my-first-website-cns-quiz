// ════════════════════════════════════════════════════════════════════════════
// js/ui-core.js — Theme, state toàn cục, helpers dùng chung, webhook helpers,
// cascade dropdown (chức danh → vị trí → module), quiz mode selector, nav grid,
// drawer (mobile), navigation (back/retake).
// Tách từ app.js trong đợt refactor kiến trúc (refactor/architecture).
// Load order: questions.js → srs.js → sync.js → ui-core.js (file này) → exam.js → app.js
// ════════════════════════════════════════════════════════════════════════════

// ── Theme (day / night) ──
function applyTheme(t) {
  document.body.setAttribute('data-theme', t);
  localStorage.setItem('cns_theme', t);
}
function toggleTheme() {
  const current = document.body.getAttribute('data-theme') || 'day';
  applyTheme(current === 'night' ? 'day' : 'night');
}
// Apply saved theme on load
(function() { applyTheme(localStorage.getItem('cns_theme') || 'night'); })();

// ── State ──
let selectedModule = null;
let quizMode       = 'exam';
// 'exam' = thi thử (timed, 50 câu, SRS due-priority) | 'practice' = ôn tập toàn bộ pool
// (untimed, SRS-ordered) | 'quickreview' = ôn nhanh CHỈ câu đến hạn (untimed, cap 50)
function isUntimedMode() { return quizMode === 'practice' || quizMode === 'quickreview'; }
let examQuestions  = [];
let userAnswers    = {};
let currentIdx     = 0;
const NAV_PAGE_SIZE = 50; // [NAV PAGER] số nút câu hỏi hiện mỗi trang trong sidebar — tránh lưới quá dài khi pool nhiều câu (vd Ôn tập 349 câu)
let navGridPage = 0;
let _navGridManualPage = false; // true khi người dùng vừa bấm nút phân trang thủ công — giữ nguyên trang đó thay vì tự nhảy theo câu hiện tại
let timerInterval  = null;
let secondsLeft    = 50 * 60;
let reviewFilter   = 'all';

// ── Transition timing (sync CSS ↔ JS) ──
const TR_DUR = 180;
const Q_DUR  = 100;
let   _qBusy = false;

// ── WEBHOOK ANALYTICS (fire-and-forget, ẩn danh) ──
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyTHnhK8qMxpPUtaL8Ezvi3_iDcEVpb9vWFe6lV87IR5Tr68MPfjD9NruMJ77ylWQuUVg/exec';
const TEAM_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzMphyUUJCxuDZ1xuDcvaB8YwO8M6S05rVelyJJMj-_ZKLkcwuHyXvnQOPdoWBU7a0VIw/exec";
let   currentViTri = ''; // Capture từ selViTri khi startExam(), dùng trong payload

// ── Helpers ──
const shuffle = arr => { let a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; };
const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const getMC = id => MODULE_CONFIG.find(m=>m.id===id)||{color:'#64748b',name:id,icon:'?',grd:'',bg:'',label:id};
const $ = id => document.getElementById(id);


// ── WEBHOOK HELPERS ──────────────────────────────────────────────────────
// Trả về timestamp ISO 8601 theo múi giờ UTC+7 (Việt Nam)
function getTimestampVN() {
  var d  = new Date();
  var vn = new Date(d.getTime() + 7 * 3600 * 1000);
  return vn.toISOString().replace('Z', '+07:00');
}

// Gửi 1 sự kiện câu hỏi lên Google Sheet webhook — async, không chặn UI
// Payload hoàn toàn ẩn danh: không gửi tên, email, hay định danh cá nhân
function sendQuestionWebhook(q, isWrong) {
  if (!WEBHOOK_URL) return;
  try {
    // GET + query params: không CORS preflight, không bị mất body qua redirect
    // Apps Script nhận qua e.parameter (doGet handler)
    var params = new URLSearchParams({
      ts:  getTimestampVN(),
      mod: q.module,
      vt:  currentViTri,
      qid: String(q.id),
      err: isWrong ? '1' : '0'
    });
    fetch(WEBHOOK_URL + '?' + params.toString(), {
      method: 'GET',
      mode:   'no-cors'
    }).catch(function() {});
  } catch(e) {}
}

// Gửi dữ liệu ẩn danh lên Team Dashboard webhook (GET, fire-and-forget)
// Chỉ gửi 4 trường: module, viTri, questionId, isWrong — không có PII
// Dùng GET + URLSearchParams để tránh mất body qua Apps Script 302 redirect
function logToTeamDashboard(module, viTri, questionId, isWrong) {
  if (!TEAM_WEBHOOK_URL || TEAM_WEBHOOK_URL.includes("ANH_LONG_DIEN")) return;
  try {
    var params = new URLSearchParams({
      ts:  new Date().toISOString(),
      mod: module,
      vt:  viTri,
      qid: String(questionId),
      err: isWrong ? '1' : '0'
    });
    fetch(TEAM_WEBHOOK_URL + '?' + params.toString(), {
      method: 'GET',
      mode:   'no-cors'
    }).catch(function() {});
  } catch(e) {
    console.warn("Không gửi được dữ liệu team dashboard:", e);
  }
}

// ── CASCADE DROPDOWN LOGIC ──
function onChucDanhChange() {
  const cd = $('selChucDanh').value;
  const grpVT  = $('groupViTri');
  const grpMod = $('groupModule');

  // Reset downstream dropdowns
  $('selViTri').value = '';
  $('selModule').innerHTML = '<option value="">— Chọn module —</option>';
  $('btnStart').disabled = true;

  if (cd) {
    grpVT.style.opacity = '1';
    grpVT.style.pointerEvents = 'auto';
    grpVT.classList.remove('cascade-in');
    void grpVT.offsetWidth; // reflow để trigger animation
    grpVT.classList.add('cascade-in');
  } else {
    grpVT.style.opacity = '0.35';
    grpVT.style.pointerEvents = 'none';
  }
  grpMod.style.display = ''; // [ATCO] reset phòng trường hợp lần chọn trước đã ẩn hẳn (display:none)
  grpMod.style.opacity = '0.35';
  grpMod.style.pointerEvents = 'none';
}

function onViTriChange() {
  const cd = $('selChucDanh').value;
  const vt = $('selViTri').value;
  const grpMod = $('groupModule');
  const selMod = $('selModule');

  selMod.innerHTML = '<option value="">— Chọn module —</option>';
  $('btnStart').disabled = true;

  // [ATCO] Không có module để chọn (chỉ 1 khối "Lý thuyết chung ATC") — ẩn hẳn
  // dropdown module, tự động gán module='ATCO' và cho phép bắt đầu luôn.
  if (cd === 'ATCO' && vt) {
    grpMod.style.display = 'none';
    selMod.innerHTML = '<option value="ATCO" selected>ATCO</option>';
    selMod.value = 'ATCO';
    selMod.disabled = false;
    $('btnStart').disabled = false;
    if (typeof onModuleChange === 'function') onModuleChange();
    return;
  }
  grpMod.style.display = '';

  if (cd && vt) {
    const mIds = (LOCATION_MODULE_MAP[cd] && LOCATION_MODULE_MAP[cd][vt]) || [];
    mIds.forEach(mId => {
      const mc  = getMC(mId);
      const opt = document.createElement('option');
      opt.value = mId;
      if (quizMode === 'practice') {
        // Hiện số câu thực tế trong pool
        const poolSize = questionBank.filter(q => q.module === mId).length;
        opt.textContent = `${mc.icon}  ${mc.name}  —  ${poolSize} câu`;
      } else {
        const poolSize = questionBank.filter(q => q.module === mId).length;
        const drawCount = Math.min(mc.draw || 50, poolSize);
        opt.textContent = `${mc.icon}  ${mc.name}  —  ${drawCount} câu`;
      }
      selMod.appendChild(opt);
    });
    selMod.disabled = false;
    // Unlock visual
    grpMod.classList.remove('locked');
    const lockSvg = $('lockIcon');
    if (lockSvg) lockSvg.style.display = 'none';
    grpMod.style.opacity = '1';
    grpMod.style.pointerEvents = 'auto';
    grpMod.classList.remove('cascade-in');
    void grpMod.offsetWidth;
    grpMod.classList.add('cascade-in');
  } else {
    selMod.disabled = true;
    grpMod.classList.add('locked');
    const lockSvg = $('lockIcon');
    if (lockSvg) lockSvg.style.display = '';
    grpMod.style.opacity = '0.35';
    grpMod.style.pointerEvents = 'none';
  }
}

function onModuleChange() {
  const modId = $('selModule').value;
  $('btnStart').disabled = !modId;

  const dueBadge     = $('srsDueBadge');
  const masteryBadge = $('srsMasteryBadge');
  const quickBtn     = $('btnQuickReview');

  if (modId) {
    const rawPool = questionBank.filter(q => q.module === modId);
    const due     = srsCountDue(rawPool);
    const mastery = srsMasteryPct(rawPool);

    // [SRS] Badge "X câu đến hạn hôm nay"
    if (dueBadge) {
      dueBadge.style.display = 'inline-flex';
      dueBadge.textContent = due > 0 ? `⏰ ${due} câu đến hạn ôn` : '✓ Chưa có câu nào đến hạn';
      dueBadge.style.color = due > 0 ? '#f59e0b' : '#34d399';
      dueBadge.style.borderColor = due > 0 ? 'rgba(245,158,11,0.35)' : 'rgba(52,211,153,0.3)';
      dueBadge.style.background = due > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(52,211,153,0.06)';
    }

    // [MASTERY] Badge "X% thành thạo"
    if (masteryBadge) {
      masteryBadge.style.display = 'inline-flex';
      masteryBadge.textContent = `🎯 ${mastery}% thành thạo`;
    }

    // [QUICK REVIEW] Nút "Ôn nhanh" chỉ hiện khi có câu đến hạn
    if (quickBtn) {
      quickBtn.style.display = due > 0 ? 'inline-flex' : 'none';
      quickBtn.textContent = `⚡ Ôn nhanh ${due} câu đến hạn`;
    }
  } else {
    if (dueBadge)     dueBadge.style.display = 'none';
    if (masteryBadge) masteryBadge.style.display = 'none';
    if (quickBtn)      quickBtn.style.display = 'none';
  }
}

// ── QUIZ MODE SELECTOR ──
function setQuizMode(mode) {
  quizMode = mode;
  const bE = $('btnModeExam');
  const bP = $('btnModePractice');
  const lbl = $('btnStartLabel');
  if (bE) { bE.className = 'mode-btn' + (mode==='exam'     ? ' active-exam'     : ''); }
  if (bP) { bP.className = 'mode-btn' + (mode==='practice' ? ' active-practice' : ''); }
  if (lbl) lbl.textContent = mode === 'practice' ? 'BẮT ĐẦU ÔN TẬP' : 'VÀO LÀM BÀI';
  // Cập nhật lại dropdown module nếu đã chọn vị trí
  if ($('selViTri') && $('selViTri').value) onViTriChange();

  // Nếu đang trong exam screen, cập nhật nút submit label
  const examScreen = $('examScreen');
  if (examScreen && !examScreen.classList.contains('hidden')) {
    const submitBtn = $('btnSubmit');
    if (submitBtn) {
      submitBtn.innerHTML = mode === 'practice'
        ? '✅ Hoàn thành'
        : '✈ Nộp Bài';
    }
    // Ẩn/hiện timer theo mode khi resume
    const timerDisp = $('timerDisplay');
    if (timerDisp) {
      timerDisp.style.display = mode === 'practice' ? 'none' : '';
    }
    // Ẩn/hiện nút thoát ôn tập
    const exitBtn = $('btnExitPractice');
    if (exitBtn) {
      exitBtn.style.display = mode === 'practice' ? 'inline-block' : 'none';
    }
  }
}

// ── NAV GRID (có phân trang 50 câu/trang khi pool lớn) ──
function renderNavGrids() {
  const totalPages = Math.max(1, Math.ceil(examQuestions.length / NAV_PAGE_SIZE));
  // Tự động nhảy trang theo câu hiện tại, trừ khi người dùng vừa thao tác nút phân trang thủ công
  if (!_navGridManualPage) navGridPage = Math.floor(currentIdx / NAV_PAGE_SIZE);
  if (navGridPage >= totalPages) navGridPage = totalPages - 1;
  if (navGridPage < 0) navGridPage = 0;

  const start = navGridPage * NAV_PAGE_SIZE;
  const end   = Math.min(start + NAV_PAGE_SIZE, examQuestions.length);

  const gridHtml = examQuestions.slice(start, end).map((_, k) => {
    const i = start + k; // chỉ số toàn cục thật, không phải chỉ số trong trang
    const a = userAnswers[i] !== undefined;
    const c = i === currentIdx;
    return `<button onclick="goToQ(${i})" class="nav-btn ${a?'answered':''} ${c?'current':''}">${i+1}</button>`;
  }).join('');

  const pagerHtml = examQuestions.length > NAV_PAGE_SIZE ? `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08)">
      <button onclick="navGridGoPage(${navGridPage - 1})" ${navGridPage === 0 ? 'disabled' : ''}
              style="padding:5px 11px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-size:12px;font-weight:800;cursor:pointer;opacity:${navGridPage === 0 ? '0.3' : '1'}">‹‹</button>
      <span style="font-size:10.5px;color:rgba(255,255,255,0.5);font-weight:700">Câu ${start+1}–${end} / ${examQuestions.length}</span>
      <button onclick="navGridGoPage(${navGridPage + 1})" ${navGridPage >= totalPages - 1 ? 'disabled' : ''}
              style="padding:5px 11px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-size:12px;font-weight:800;cursor:pointer;opacity:${navGridPage >= totalPages - 1 ? '0.3' : '1'}">››</button>
    </div>` : '';

  ['desktopNavGrid','mobileNavGrid'].forEach(id => {
    const el = $(id);
    if (el) el.innerHTML = gridHtml;
  });
  ['desktopNavGridPager','mobileNavGridPager'].forEach(id => {
    const el = $(id);
    if (el) el.innerHTML = pagerHtml;
  });
}
function navGridGoPage(p) {
  _navGridManualPage = true; // người dùng chủ động lật trang để xem trước, không phải đang trả lời câu
  navGridPage = p;
  renderNavGrids();
}
function updateNavGrids() { renderNavGrids(); }

function updateSidebarStats() {
  const a = Object.keys(userAnswers).length, t = examQuestions.length;
  const pct = t ? Math.round(a/t*100) : 0;
  const html = `<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:4px"><span>Tiến độ</span><span>${a}/${t}</span></div>
    <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px">
      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#0ea5e9,#6366f1);border-radius:2px;transition:width .3s"></div>
    </div>`;
  $('sidebarStats').innerHTML = html;
  if ($('mobileStats')) $('mobileStats').innerHTML = html;
}

function goToQ(i) {
  showQInstant(i); // sidebar/grid: instant, no animation
  const d = $('mobileDrawer');
  if (d && d.classList.contains('open')) toggleDrawer();
}

// ── DRAWER ──
function toggleDrawer() {
  const d = $('mobileDrawer'), o = $('drawerOverlay');
  d.classList.toggle('open');
  o.classList.toggle('hidden');
  if (d.classList.contains('open')) { renderNavGrids(); updateSidebarStats(); }
}

// ── NAVIGATION ──
function backToStart() {
  quizMode = 'exam';
  selectedModule = null;
  const _sb = $('scrollTopBtn'); if (_sb) _sb.classList.remove('visible');
  const from = $('resultScreen');
  from.classList.add('screen-exit');
  setTimeout(() => {
    from.classList.add('hidden');
    from.classList.remove('screen-exit');
    const ss = $('startScreen');
    ss.classList.remove('hidden');
    ss.classList.add('screen-enter');
    setTimeout(() => ss.classList.remove('screen-enter'), TR_DUR + 20);
  }, TR_DUR);
}

function retakeModule() {
  const _sb = $('scrollTopBtn'); if (_sb) _sb.classList.remove('visible');
  const mod = selectedModule;
  const from = $('resultScreen');
  from.classList.add('screen-exit');
  setTimeout(() => {
    from.classList.add('hidden');
    from.classList.remove('screen-exit');
   startExam(mod);
  }, TR_DUR);
}
