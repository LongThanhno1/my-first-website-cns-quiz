// ════════════════════════════════════════════════════════════════════════════
// js/app.js — INIT + orchestration. Nạp SAU CÙNG (phụ thuộc mọi file khác:
// questions.js, srs.js, sync.js, ui-core.js, exam.js).
// Gồm: khôi phục bài đang làm dở (resume), radar engine trang trí start screen,
// và module nhật ký ôn tập dạng heatmap (Study Heatmap).
// Tách từ app.js gốc trong đợt refactor kiến trúc (refactor/architecture).
// ════════════════════════════════════════════════════════════════════════════

// ── INIT ──
const QUIZ_SAVE_KEY = 'cns_quiz_state_v3';

function saveQuizState() {
  if (!selectedModule || !examQuestions.length) return;
  try {
    sessionStorage.setItem(QUIZ_SAVE_KEY, JSON.stringify({
      module: selectedModule,
      quizMode: quizMode,
      questions: examQuestions,
      answers: userAnswers,
      currentQ: currentIdx,
      timeLeft: secondsLeft,
      savedAt: Date.now()
    }));
  } catch(e) {}
}

function clearQuizState() { sessionStorage.removeItem(QUIZ_SAVE_KEY); }

function checkResume() {
  try {
    const raw = sessionStorage.getItem(QUIZ_SAVE_KEY);
    if (!raw) return false;
    const snap = JSON.parse(raw);
    if (Date.now() - snap.savedAt > 3 * 3600 * 1000) { clearQuizState(); return false; }
    // Restore state
    selectedModule = snap.module;
    quizMode = snap.quizMode || 'exam';
    examQuestions  = snap.questions;
    userAnswers    = snap.answers || {};
    currentIdx     = snap.currentQ  || 0;
    secondsLeft    = snap.timeLeft  || 50 * 60;
    const ss = $('startScreen');
    const es = $('examScreen');
    if (ss) ss.classList.add('hidden');
    if (es) {
      es.classList.remove('hidden');
      setQuizMode(quizMode);
      renderNavGrids();
      showQInstant(currentIdx);
      startTimer();
    }
    return true;
  } catch(e) { clearQuizState(); return false; }
}

// Patch selectOpt, showQ, doSubmit to save/clear state
(function() {
  const _origSelectOpt = window.selectOpt;
  if (_origSelectOpt) window.selectOpt = function(idx, el, val) {
    _origSelectOpt(idx, el, val); saveQuizState();
  };
  const _origShowQ = window.showQ;
  if (_origShowQ) window.showQ = function(idx) {
    _origShowQ(idx); saveQuizState();
  };
  const _origDoSubmit = window.doSubmit;
  if (_origDoSubmit) window.doSubmit = function(auto) {
    _origDoSubmit(auto); clearQuizState();
  };
})();

document.addEventListener('DOMContentLoaded', function() {
  // [HEATMAP] Khởi tạo module nhật ký ôn tập
  StudyHeatmap.init();

  // Clock
  setInterval(function() {
    const el = $('sysTime');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString('vi-VN', {
      hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
    }) + ' UTC+7';
  }, 1000);

  // Unlock selViTri if selChucDanh already has a value (e.g. "ATSEP" pre-selected)
  if ($('selChucDanh') && $('selChucDanh').value) {
    onChucDanhChange();
  }

  // Resume bài thi nếu có
  checkResume();
});

// ── SCROLL TO TOP ──
function updateScrollBtn() {
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  if (window.pageYOffset > 200 || document.documentElement.scrollTop > 200) {
    btn.classList.add('visible');
  } else {
    btn.classList.remove('visible');
  }
}
window.addEventListener('scroll', updateScrollBtn, {passive:true});
// Fire on load in case page already scrolled
document.addEventListener('DOMContentLoaded', updateScrollBtn);

/* ── RADAR ENGINE ── */
(function() {
  const AIRCRAFT = [
    {call:'VN161', fl:'FL340', spd:'465kt'},
    {call:'QH123', fl:'FL280', spd:'418kt'},
    {call:'VJ456', fl:'FL190', spd:'382kt'},
    {call:'BL789', fl:'FL120', spd:'315kt'},
    {call:'VN234', fl:'FL350', spd:'472kt'},
    {call:'VJ789', fl:'FL220', spd:'390kt'},
    {call:'QH456', fl:'FL300', spd:'445kt'},
    {call:'BL123', fl:'FL150', spd:'328kt'},
  ];

  const blips = [];
  let rafId = null;

  function headingArrow(h) {
    h = ((h % 360) + 360) % 360;
    if (h < 22.5 || h >= 337.5) return '↑';
    if (h < 67.5)  return '↗';
    if (h < 112.5) return '→';
    if (h < 157.5) return '↘';
    if (h < 202.5) return '↓';
    if (h < 247.5) return '↙';
    if (h < 292.5) return '←';
    return '↖';
  }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function radarInit() {
    const container = document.getElementById('radarBlips');
    if (!container) return;

    const count = 6 + Math.floor(Math.random() * 3); // 6-8
    for (let i = 0; i < count; i++) {
      const ac = AIRCRAFT[i % AIRCRAFT.length];
      const heading = rand(0, 360);
      const el = document.createElement('div');
      el.className = 'blip';
      el.style.cssText = 'position:absolute;pointer-events:none;';
      el.innerHTML =
        '<div class="blip-dot"></div>' +
        '<div class="blip-tag">' + ac.call + '<br>' + ac.fl + ' ' + headingArrow(heading) + ' ' + ac.spd + '</div>';
      container.appendChild(el);

      blips.push({
        el: el,
        tag: el.querySelector('.blip-tag'),
        dot: el.querySelector('.blip-dot'),
        x: rand(5, 95),
        y: rand(5, 95),
        heading: heading,
        speed: rand(0.002, 0.006),
        changeTimer: Math.floor(rand(400, 900)),
        opacity: 0.15,
        call: ac.call, fl: ac.fl, spd: ac.spd
      });
    }
    radarLoop();
  }

  function radarLoop() {
    const sweepAngle = (Date.now() / 10000 * 360) % 360;
    const cx = 50, cy = 50;

    for (let i = 0; i < blips.length; i++) {
      const b = blips[i];

      // Movement
      b.x += Math.cos(b.heading * Math.PI / 180) * b.speed;
      b.y += Math.sin(b.heading * Math.PI / 180) * b.speed;
      if (b.x < -3)  b.x = 103;
      if (b.x > 103) b.x = -3;
      if (b.y < -3)  b.y = 103;
      if (b.y > 103) b.y = -3;
      b.el.style.left = b.x + '%';
      b.el.style.top  = b.y + '%';

      // Heading change
      b.changeTimer--;
      if (b.changeTimer <= 0) {
        b.heading += rand(-40, 40);
        b.changeTimer = Math.floor(rand(800, 1500));
        // Update tag arrow
        var h2 = b.heading;
        b.tag.innerHTML = b.call + '<br>' + b.fl + ' ' + headingArrow(h2) + ' ' + b.spd;
      }

      // Fade blip với sweep proximity
      var bdx = b.x - cx;
      var bdy = b.y - cy;
      var blipAngle = (Math.atan2(bdy, bdx) * 180 / Math.PI + 360) % 360;
      var diff = Math.abs(sweepAngle - blipAngle);
      if (diff > 180) diff = 360 - diff;
      b.opacity = 0.15 + Math.max(0, 1 - diff / 90) * 0.85;
      b.el.style.opacity = b.opacity;
    }
    rafId = requestAnimationFrame(radarLoop);
  }

  document.addEventListener('DOMContentLoaded', radarInit);
})();

// ════════════════════════════════════════════════════════════════════════════
// === Study Heatmap Module ===
// Nhật ký ôn tập dạng heatmap kiểu GitHub contribution graph
// localStorage key: "cns_heatmap_v1"
// Cấu trúc: { "YYYY-MM-DD": { count: số câu trả lời, wrong: số câu sai } }
// Độc lập hoàn toàn với cns_history_v1, cns_quiz_state_v3, cns_result_v3
// ════════════════════════════════════════════════════════════════════════════
const StudyHeatmap = (function() {
  const STORAGE_KEY = 'cns_heatmap_v1';
  var currentRange = 365; // hiển thị 365 ngày — GitHub style

  // Đọc dữ liệu nhật ký từ localStorage
  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e) { return {}; }
  }

  // Ghi dữ liệu nhật ký vào localStorage (silent fail nếu đầy)
  function saveData(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
  }

  // Lấy ngày hôm nay dạng "YYYY-MM-DD" theo múi giờ local
  function todayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  // Mức màu 0-4 dựa trên số câu đã trả lời trong ngày
  // 0=không có | 1=<5 | 2=5-14 | 3=15-29 | 4=≥30
  function levelFor(count) {
    if (!count || count === 0) return 0;
    if (count < 5)  return 1;
    if (count < 15) return 2;
    if (count < 30) return 3;
    return 4;
  }

  // Tính số ngày liên tiếp có hoạt động (chuỗi streak)
  // "Khoan dung": nếu hôm nay chưa ôn thì vẫn tính chuỗi từ hôm qua trở về
  function computeStreak(data) {
    var checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    // Nếu hôm nay chưa có dữ liệu → bắt đầu kiểm tra từ hôm qua
    var tk = todayKey();
    if (!data[tk] || data[tk].count === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    var streak = 0;
    while (true) {
      var y = checkDate.getFullYear();
      var mo = String(checkDate.getMonth() + 1).padStart(2, '0');
      var dy = String(checkDate.getDate()).padStart(2, '0');
      var key = y + '-' + mo + '-' + dy;
      if (data[key] && data[key].count > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  // Dựng mảng ngày tuyến tính cho n ngày gần nhất (mới nhất ở cuối)
  function buildDaysGrid(data, days) {
    var result = [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var y  = d.getFullYear();
      var mo = String(d.getMonth() + 1).padStart(2, '0');
      var dy = String(d.getDate()).padStart(2, '0');
      var key = y + '-' + mo + '-' + dy;
      result.push({
        key:   key,
        date:  new Date(d),
        count: data[key] ? (data[key].count || 0) : 0,
        wrong: data[key] ? (data[key].wrong || 0) : 0,
        dow:   d.getDay(),
      });
    }
    return result;
  }


  // Ghi nhận 1 câu trả lời vào ngày hôm nay
  function logAnswer(isWrong) {
    var data = loadData();
    var key  = todayKey();
    if (!data[key]) data[key] = { count: 0, wrong: 0 };
    data[key].count += 1;
    if (isWrong) data[key].wrong += 1;
    saveData(data);
  }

    function render() {
    var data     = loadData();
    var grid     = document.getElementById('hmGrid');
    var elTotal  = document.getElementById('hmTotal');
    var elDays   = document.getElementById('hmDays');
    var elStreak = document.getElementById('hmStreak');
    var elFooter = document.getElementById('hmFooter');
    if (!grid) return;

    var totalCount = 0, activeDays = 0;
    Object.keys(data).forEach(function(k) {
      if (data[k].count > 0) { totalCount += data[k].count; activeDays++; }
    });
    var streak = computeStreak(data);
    if (elTotal)  elTotal.textContent  = totalCount.toLocaleString('vi-VN');
    if (elDays)   elDays.textContent   = activeDays;
    if (elStreak) elStreak.textContent = streak + ' ngày';
    if (elFooter) {
      if (streak === 0)     elFooter.textContent = 'Hôm nay bắt đầu chuỗi ôn tập mới!';
      else if (streak < 3)  elFooter.textContent = streak + ' ngày liên tiếp — tiếp tục!';
      else if (streak < 7)  elFooter.textContent = streak + ' ngày liên tiếp — phong độ tốt!';
      else if (streak < 30) elFooter.textContent = streak + ' ngày liên tiếp — đừng gián đoạn!';
      else                  elFooter.textContent = streak + ' ngày liên tiếp — kỷ lục! 🎖️';
    }

    var days_arr = buildDaysGrid(data, 365);
    var startDow = days_arr[0].dow;
    var padded = [];
    for (var p = 0; p < startDow; p++) padded.push(null);
    days_arr.forEach(function(d) { padded.push(d); });
    while (padded.length % 7 !== 0) padded.push(null);

    var weeks = [];
    for (var w = 0; w < padded.length / 7; w++) {
      weeks.push(padded.slice(w * 7, w * 7 + 7));
    }

    // GitHub-style: hiện tất cả 7 ngày trong tuần
    var DAY_LABELS = ['CN','T2','T3','T4','T5','T6','T7'];

    var MONTH_VI = ['Th1','Th2','Th3','Th4','Th5','Th6',
                    'Th7','Th8','Th9','T10','T11','T12'];
    var lastMonth = -1;
    var monthMap  = {};
    weeks.forEach(function(wk, wi) {
      var firstReal = null;
      for (var x = 0; x < wk.length; x++) { if (wk[x]) { firstReal = wk[x]; break; } }
      if (firstReal) {
        var mo = firstReal.date.getMonth();
        if (mo !== lastMonth) { monthMap[wi] = MONTH_VI[mo]; lastMonth = mo; }
      }
    });

    var h = '<div class="hm-gh-graph">';
    h += '<div class="hm-gh-daylabels"><div class="hm-gh-month-spacer"></div>';
    for (var r = 0; r < 7; r++) {
      h += '<div class="hm-gh-daylbl">' + DAY_LABELS[r] + '</div>';
    }
    h += '</div>';

    h += '<div class="hm-gh-right">';
    h += '<div class="hm-gh-months">';
    weeks.forEach(function(wk, wi) {
      h += '<div class="hm-gh-month-cell">' + (monthMap[wi] || '') + '</div>';
    });
    h += '</div>';

    h += '<div class="hm-gh-weeks">';
    weeks.forEach(function(wk) {
      h += '<div class="hm-gh-week">';
      wk.forEach(function(cell) {
        if (!cell) {
          h += '<div class="hm-gh-cell hm-empty"></div>';
        } else {
          var lv  = levelFor(cell.count);
          var dd  = String(cell.date.getDate()).padStart(2,'0');
          var mm  = String(cell.date.getMonth()+1).padStart(2,'0');
          var tip = dd + '/' + mm + ': ' + cell.count + ' câu'
                  + (cell.wrong > 0 ? ', ' + cell.wrong + ' sai' : '');
          var cls = 'hm-gh-cell hm-l' + lv + (cell.wrong > 0 ? ' hm-has-wrong' : '');
          h += '<div class="' + cls + '" data-tip="' + tip + '"'
             + ' onmouseenter="StudyHeatmap._showTip(event,this)"'
             + ' onmouseleave="StudyHeatmap._hideTip()"></div>';
        }
      });
      h += '</div>';
    });
    h += '</div></div></div>';

    grid.innerHTML = h;
  }

  // Hiện tooltip khi hover ô
  function showTip(event, el) {
    var tip = document.getElementById('hmTooltip');
    if (!tip) return;
    tip.textContent = el.getAttribute('data-tip');
    tip.style.display = 'block';
    tip.style.left = (event.clientX + 8) + 'px';
    tip.style.top  = (event.clientY - 34) + 'px';
  }

  // Ẩn tooltip
  function hideTip() {
    var tip = document.getElementById('hmTooltip');
    if (tip) tip.style.display = 'none';
  }

  // Xóa toàn bộ nhật ký — có confirm trước
  // Đổi khoảng thời gian hiển thị và re-render
  function setRange(n) {
    currentRange = n;
    // Cập nhật active tab
    document.querySelectorAll('#hmRangeTabs .hm-tab').forEach(function(btn) {
      btn.classList.toggle('hm-tab-active', parseInt(btn.getAttribute('data-r')) === n);
    });
    // Cập nhật subtitle
    var sub = document.getElementById('hmSubtitle');
    if (sub) sub.textContent = n + ' ngày gần nhất';
    render();
  }

  function clearData() {
    if (!confirm('Xóa toàn bộ dữ liệu ôn tập cục bộ (nhật ký heatmap + lịch sử SRS từng câu)? Hành động này không thể hoàn tác.')) return;
    localStorage.removeItem(STORAGE_KEY);   // cns_heatmap_v1 — nhật ký theo ngày
    localStorage.removeItem(HISTORY_KEY);   // cns_history_v1 — seen/wrong/srs theo từng câu
    render();
    // [SRS] Cập nhật lại badge "đến hạn" nếu đang hiện (module đang chọn coi như reset về 0 due)
    if (typeof onModuleChange === 'function') onModuleChange();
    // [SYNC] Đồng bộ luôn trạng thái đã xóa lên server (nếu có mã đồng bộ), tránh server giữ data cũ
    if (typeof scheduleSyncPush === 'function') scheduleSyncPush();
  }

  function init() { /* no-op */ }

  return {
    logAnswer:     logAnswer,
    render:        render,
    init:          init,
    clearData:     clearData,
    setRange:      setRange,
    levelFor:      levelFor,
    computeStreak: computeStreak,
    _showTip:      showTip,
    _hideTip:      hideTip,
  };
})();
