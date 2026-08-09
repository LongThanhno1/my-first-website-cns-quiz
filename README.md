# 🛰️ CNS/ATCO Quiz — VATMSORATS Long Thành ATCC

> Website ôn tập trắc nghiệm dành cho nhân viên kỹ thuật ATSEP và kiểm soát viên không lưu ATCO tại Trung tâm Kiểm soát không lưu Long Thành — VATMSORATS.

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Truy_cập_ngay-0078d4?style=for-the-badge)](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/)
[![Câu hỏi](https://img.shields.io/badge/📚_Câu_hỏi-2686_câu-10b981?style=for-the-badge)](#-ngân-hàng-câu-hỏi)
[![Phiên bản](https://img.shields.io/badge/Phiên_bản-v2.3--2026-f59e0b?style=for-the-badge)](#-changelog)
[![SRS](https://img.shields.io/badge/🧠_Ôn_tập-Spaced_Repetition_(SM--2)-8b5cf6?style=for-the-badge)](#-tính-năng)

---

## 📌 Giới thiệu

Website ôn tập trắc nghiệm dành cho **2 chức danh**:
- **ATSEP** — kỹ thuật điện tử hàng không (CNS/ATM: Communication · Navigation · Surveillance)
- **ATCO** — kiểm soát viên không lưu (lý thuyết chung)

tại **Trung tâm Kiểm soát không lưu Long Thành — VATMSORATS**, thuộc Tổng công ty Quản lý bay Việt Nam (VATM).

Không chỉ là một bộ câu hỏi tĩnh, hệ thống tích hợp **thuật toán ôn tập ngắt quãng (Spaced Repetition — SM-2)** giúp từng người tự động nhận diện câu hỏi mình hay sai và ưu tiên ôn lại đúng lúc, thay vì học lại toàn bộ ngân hàng đề mỗi lần.

> ⚠️ Đây là công cụ ôn tập **nội bộ**, không phải tài liệu chính thức của VATM hay ICAO.

---

## 🚀 Truy cập nhanh

| | Trang | Mô tả |
|---|---|---|
| 🌐 | [Trang ôn tập / thi thử](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/) | Giao diện chính |
| 📊 | [Admin Dashboard](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/admin.html) | Phân tích & Team Readiness *(yêu cầu mã truy cập)* |
| 🔍 | [Kiểm tra ngân hàng đề](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/check.html) | Công cụ validate dữ liệu câu hỏi |
| 📦 | [Source code](https://github.com/LongThanhno1/quiz-vatmsorats-longthanh-atcc) | Repository |

---

## 🎯 Tính năng

### Chọn chức danh & vị trí
- 👷 **1. ATSEP** → chọn vị trí thi (Long Thành / Tân Sơn Nhất) → chọn 1 trong các module chuyên ngành
- 🎓 **2. ATCO** → vị trí thi cố định Long Thành, không cần chọn module (đi thẳng vào phần "Lý thuyết chung ATC")

### Làm bài
- ⏱️ **Thi thử**:
  - Module ATSEP: 50 câu ngẫu nhiên / 50 phút, có chấm điểm + xem lại câu sai
  - ATCO: 50 câu / 50 phút theo **quota cố định 8 chuyên đề** (AIS, Facilities, General Knowledge, Human Factor, Law, Meteology, Navigation-Principle, Operational procedure) + 1 câu ngẫu nhiên bổ sung — **giữ nguyên thứ tự đáp án gốc**, không xáo A/B/C/D
- 📖 **Ôn tập**: làm hết toàn bộ pool, không giới hạn thời gian — dùng chung cơ chế SRS cho cả ATSEP lẫn ATCO
- ⌨️ **Phím tắt**: `1/2/3/4` chọn đáp án · `←/→` chuyển câu
- 💾 **Resume bài thi** — refresh trang không mất tiến độ; kết quả cũng được giữ lại (2 giờ) nếu reload ngay sau khi nộp bài
- 📱 **Responsive** — dùng tốt trên điện thoại lẫn máy tính
- 🌗 **Light/Dark theme** — chuyển đổi tức thì, đồng bộ trên mọi màn hình

### 🧠 Ôn tập thông minh (Spaced Repetition — SM-2)
- Mỗi câu trả lời được chấm và đẩy vào thuật toán SM-2 rút gọn: tính độ dễ (ease factor), khoảng lặp lại (interval, tối đa 90 ngày), và ngày đến hạn ôn tiếp theo
- Lịch sử SRS dùng khóa ghép **`module-id`** (không dùng id trần) — cho phép các chức danh/vị trí khác nhau (CNS, ATCO, và các vị trí sau này) dùng lại cùng dải ID mà không đụng độ dữ liệu ôn tập
- ⚡ **Ôn nhanh**: chỉ hiện đúng những câu đã đến hạn ôn lại — không phải làm lại cả trăm câu để ôn vài câu hay quên
- 🎯 **Mastery badge**: hiển thị % câu đã "thành thạo" (trả lời đúng liên tục ≥ 3 lần) theo từng module
- ⚠️ **Phát hiện câu khó (leech)**: tự động liệt kê các câu bị trả lời sai nhiều lần (≥ 5 lần), cần chú ý ôn riêng
- 🔄 **Đồng bộ đa thiết bị**: tạo mã đồng bộ (hoặc quét mã QR) để mang tiến độ ôn tập giữa điện thoại và máy tính

### 📊 Phân tích & theo dõi
- 📈 **Google Analytics 4** — theo dõi lượt truy cập, lượt thi, tỷ lệ hoàn thành
- 🎯 **Team Readiness Dashboard** — % thành thạo theo module và danh sách câu sai nhiều nhất của *toàn đội*, hoàn toàn ẩn danh (không gửi tên/định danh cá nhân)

---

## 📚 Ngân hàng câu hỏi

**Tổng: 2.686 câu**, phủ 11 module CNS/ATM (ATSEP) + 1 khối lý thuyết chung (ATCO):

| Module | Số câu | Chức danh | Vị trí |
|---|---|---|---|
| 📡 VHF | 427 | ATSEP | Long Thành + Tân Sơn Nhất |
| 📻 Radar | 349 | ATSEP | Long Thành |
| 🖥️ RDP/FDP | 365 | ATSEP | Tân Sơn Nhất |
| ☎️ VCCS | 237 | ATSEP | Tân Sơn Nhất |
| 🧑‍💼 Kíp trưởng (TSN) | 230 | ATSEP | Tân Sơn Nhất |
| 🛰️ ADS-B | 298 | ATSEP | Tân Sơn Nhất |
| ⚙️ A-SMGCS | 145 | ATSEP | Tân Sơn Nhất |
| 📻 Radar (TSN) | 111 | ATSEP | Tân Sơn Nhất |
| 🎙️ Ghi âm | 66 | ATSEP | Tân Sơn Nhất |
| 🛰️ ADS-B (LT) | 30 | ATSEP | Long Thành |
| 🛡️ SMS | 17 | ATSEP | Long Thành |
| 🎓 ATCO — Lý thuyết chung | 411 | ATCO | Long Thành |

Ngân hàng ATCO chia 8 chuyên đề: AIS (63) · Facilities (45) · General Knowledge (57) · Human Factor (27) · Law (43) · Meteology (60) · Navigation-Principle (102) · Operational procedure (14).

Kiểm tra tính toàn vẹn ngân hàng đề (ID trùng, đáp án khớp, thiếu field…) tại [check.html](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/check.html).

---

## 🏗️ Cấu trúc project

```
quiz-vatmsorats-longthanh-atcc/
│
├── index.html                # Giao diện thi/ôn tập chính
├── admin.html                # Dashboard analytics + Team Readiness (mật khẩu hash SHA-256)
├── check.html                 # Công cụ kiểm tra ngân hàng đề
├── vandap.html                # Module vấn đáp VHF (đang tạm dừng phát triển)
├── CONTRIBUTING.md            # Quy trình đóng góp — luôn qua PR + review, không merge thẳng main
│
├── css/
│   ├── style.css              # Stylesheet chính
│   └── vandap.css             # Stylesheet riêng cho module vấn đáp
│
├── js/
│   ├── data/                  # Ngân hàng câu hỏi, tách theo module (12 file)
│   │   ├── vhf.js  radar.js  sms.js  adsb-lt.js  ghiam.js  adsb.js
│   │   ├── rdpfdp.js  vccs.js  radar-tsn.js  kiptruong-tsn.js  asgmcs.js
│   │   └── atco.js            # 411 câu ATCO
│   ├── questions.js           # Gộp questionBank + MODULE_CONFIG + LOCATION_MODULE_MAP
│   ├── srs.js                 # Thuật toán SM-2 + lựa chọn câu hỏi (SRS, quota ATCO)
│   ├── sync.js                # Đồng bộ đa thiết bị (mã/QR) qua Google Apps Script
│   ├── ui-core.js             # Cascade dropdown chức danh/vị trí/module, theme, shuffle
│   ├── exam.js                 # Luồng làm bài: timer, hiển thị câu, chấm điểm, review
│   ├── app.js                  # Khởi tạo, resume state, wiring các module trên
│   ├── vandap-app.js           # Logic module vấn đáp
│   └── vandap-vhf.js           # Dữ liệu vấn đáp VHF
│
├── apps-script/
│   └── webhook.gs              # Google Apps Script — telemetry & Team Readiness
│
├── logo/                       # Logo + favicon
├── Data/                       # Tài liệu nguồn (đề thi gốc)
└── README.md
```

> Kiến trúc file JS được tách nhỏ từ 1 file `app.js` monolith (đợt `refactor/architecture`) — dùng nhiều thẻ `<script>` thường (không module/bundler), khớp với hạ tầng GitHub Pages tĩnh hiện tại. Thứ tự load bắt buộc: `data/*.js` → `questions.js` → `srs.js` → `sync.js` → `ui-core.js` → `exam.js` → `app.js`.

---

## 🔌 Kiến trúc Backend (Google Apps Script)

Toàn bộ phần "server" của hệ thống chạy trên **1 Google Apps Script** duy nhất (`apps-script/webhook.gs`, deploy dưới dạng Web App), phục vụ 2 mục đích:

| Mục đích | Cách hoạt động |
|---|---|
| 🎯 **Team Readiness** (ẩn danh) | Mỗi câu trả lời gửi 4 trường `module / viTri / questionId / isWrong` qua `GET`, ghi vào Google Sheet. `admin.html` đọc lại qua `?action=summary` |
| 🔄 **Đồng bộ cá nhân** | Mỗi máy tự sinh 1 mã đồng bộ (`XXXX-XXXX`). Lịch sử SRS + heatmap được đẩy lên qua `POST action=push`, kéo về qua `POST action=pull`, lưu dưới dạng JSON trên Google Drive (last-write-wins, không merge) |

> 🔒 Cả 2 luồng đều **không gửi tên, chức danh hay bất kỳ thông tin định danh cá nhân nào**.

### Cấu hình (dành cho admin)
1. Deploy `apps-script/webhook.gs` lên Google Apps Script (**Execute as: Me · Who has access: Anyone**)
2. Điền URL `/exec` vào `WEBHOOK_URL`/`TEAM_WEBHOOK_URL` trong `js/ui-core.js`
3. Team Readiness Dashboard và tính năng đồng bộ sẽ hoạt động ngay sau khi cấu hình

---

## 🔧 Chạy local

```bash
git clone https://github.com/LongThanhno1/quiz-vatmsorats-longthanh-atcc.git
```

Khuyến nghị mở bằng [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) (VS Code extension) để tránh lỗi CORS. Mở trực tiếp `index.html` bằng `file://` vẫn chạy được (localStorage hoạt động bình thường) nhưng webhook đồng bộ/telemetry có thể bị chặn CORS.

---

## ✏️ Cập nhật câu hỏi

Từ đợt tách file kiến trúc, mỗi module có **file riêng** trong `js/data/`. Sửa đúng file của module cần cập nhật, ví dụ VHF → `js/data/vhf.js`. Mỗi câu hỏi có cấu trúc:

```javascript
{
  "id": 1,
  "module": "VHF",
  "moduleName": "VHF (Thông tin vô tuyến VHF)",
  "question": "Nội dung câu hỏi?",
  "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
  "correctAnswer": "Đáp án A",
  "refDoc": "Tên tài liệu tham khảo"
}
```

Câu hỏi ATCO (`js/data/atco.js`) có thêm field `"topic"` (chuyên đề: AIS/Facilities/...) dùng để chia quota cho chế độ Thi thử — **bắt buộc giữ field này** nếu chỉnh sửa file đó.

**Bắt buộc kiểm tra sau khi cập nhật:** truy cập [check.html](https://longthanhno1.github.io/quiz-vatmsorats-longthanh-atcc/check.html) — công cụ validate ID trùng, đáp án không khớp option, thiếu field, v.v.

**Quy trình đóng góp:** mọi thay đổi đi qua Pull Request từ nhánh riêng vào `develop`, không push/merge thẳng vào `main` — xem chi tiết ở [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📋 Changelog

| Phiên bản | Thay đổi chính |
|---|---|
| **v2.3-2026** | Thêm chức danh **ATCO** (411 câu, 8 chuyên đề, Thi thử theo quota không xáo đáp án) · Refactor kiến trúc: tách `app.js` thành `srs.js`/`sync.js`/`ui-core.js`/`exam.js`, tách `questions.js` (1.1MB) thành `js/data/*.js` theo module, SRS chuyển sang khóa ghép `module-id` · Xoay mật khẩu admin (mật khẩu cũ từng lộ plaintext trong lịch sử git) · Bật GitHub branch protection cho `main` (bắt buộc PR + review) · Thêm `CONTRIBUTING.md` |
| v2.2-2026 | Lưu lại kết quả bài thi khi reload trang (persistence 2 giờ) cho chế độ Ôn tập |
| v2.1-2026 | Bổ sung câu hỏi Radar & RDP/FDP |
| v2.0-2026 | Đồng bộ đa thiết bị (mã + QR) · Background/UI cinematic redesign · Phân trang sidebar câu hỏi |
| v1.5-2026 | Nâng cấp SRS lên SM-2 interval-based thật · Ôn nhanh · Mastery badge · Leech detection |
| v1.4-2026 | Team Readiness Dashboard · Webhook telemetry ẩn danh |
| v1.0-2026 | Cập nhật ngân hàng đề 2026 (2.275 câu) · GA4 · Admin dashboard · Check tool |
| v3 (2025) | Giao diện HUD radar · Xem lại câu sai |
| v1–v2 (2025) | Phiên bản đầu tiên · Phân loại module CNS |

---

## 👤 Tác giả

**Đỗ Thanh Long**
Kỹ sư ATSEP — Trung tâm Kiểm soát không lưu Long Thành
Công ty Quản lý bay miền Nam (VATMSORATS) — Tổng công ty Quản lý bay Việt Nam (VATM)

---

## ⚠️ Tuyên bố miễn trừ

Đây là công cụ ôn tập **không chính thức**, xây dựng với mục đích hỗ trợ học tập nội bộ.
Không thay thế tài liệu đào tạo chính thức của VATM hoặc ICAO. Nội dung ngân hàng câu hỏi ATCO chưa được kiểm chứng nghiệp vụ chuyên sâu — chỉ dùng để tham khảo và luyện tập.
