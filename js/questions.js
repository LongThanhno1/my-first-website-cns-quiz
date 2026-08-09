const questionBank = [
  ...VHF_QUESTIONS, ...RADAR_QUESTIONS, ...SMS_QUESTIONS, ...ADSB_LT_QUESTIONS, ...GHIAM_QUESTIONS, ...ADSB_QUESTIONS, ...RDPFDP_QUESTIONS, ...VCCS_QUESTIONS, ...RADAR_TSN_QUESTIONS, ...KIPTRUONG_TSN_QUESTIONS, ...ASGMCS_QUESTIONS
];


const MODULE_CONFIG = [
  // ── LONG THÀNH ──────────────────────────────────────────────────────────────
  { id:"VHF",        icon:"📡", label:"VHF",        name:"VHF (Thông tin vô tuyến VHF)",                  draw:50, color:"#38bdf8", bg:"rgba(14,165,233,0.18)", grd:"linear-gradient(135deg,#0369a1,#0ea5e9)" },
  { id:"Radar",      icon:"📻", label:"Radar-LT",   name:"Radar Long Thành (PSR/SSR Sơ cấp & Thứ cấp)",  draw:50, color:"#f87171", bg:"rgba(239,68,68,0.18)",  grd:"linear-gradient(135deg,#7f1d1d,#dc2626)" },
  { id:"SMS",        icon:"🛡", label:"SMS",        name:"SMS & Báo cáo an toàn hàng không",              draw:17, color:"#fb923c", bg:"rgba(249,115,22,0.18)", grd:"linear-gradient(135deg,#7c2d12,#ea580c)" },
  { id:"A-SGMCS",    icon:"⚙", label:"A-SMGCS",    name:"A-SMGCS Tân Sơn Nhất (Hệ thống giám sát mặt đất)",draw:50, color:"#22d3ee", bg:"rgba(6,182,212,0.18)",  grd:"linear-gradient(135deg,#164e63,#0891b2)" },
  { id:"ADS-B-LT",   icon:"🛰", label:"ADS-B-LT",   name:"ADS-B Long Thành (Leonardo - VATM)",            draw:30, color:"#4ade80", bg:"rgba(74,222,128,0.18)", grd:"linear-gradient(135deg,#14532d,#16a34a)" },
  // ── TÂN SƠN NHẤT ────────────────────────────────────────────────────────────
  { id:"Ghi âm",     icon:"🎙", label:"Ghi âm",     name:"Ghi âm (Hệ thống ghi âm chuyên dụng)",         draw:50, color:"#a78bfa", bg:"rgba(139,92,246,0.18)", grd:"linear-gradient(135deg,#4c1d95,#7c3aed)" },
  { id:"ADS-B",      icon:"🛰", label:"ADS-B-TSN",  name:"ADS-B Tân Sơn Nhất (Thales - VCSN)",           draw:50, color:"#34d399", bg:"rgba(16,185,129,0.18)", grd:"linear-gradient(135deg,#064e3b,#059669)" },
  { id:"RDP/FDP",    icon:"🖥", label:"RDP/FDP",    name:"RDP/FDP (Xử lý dữ liệu Radar/Bay)",            draw:50, color:"#fbbf24", bg:"rgba(245,158,11,0.18)", grd:"linear-gradient(135deg,#78350f,#d97706)" },
  { id:"VCCS",       icon:"☎", label:"VCCS",       name:"VCCS (Điều khiển thoại không địa)",             draw:50, color:"#f472b6", bg:"rgba(236,72,153,0.18)", grd:"linear-gradient(135deg,#831843,#db2777)" },
  { id:"Radar-TSN",  icon:"📻", label:"Radar-TSN",  name:"Radar Tân Sơn Nhất (PSR/SSR)",                 draw:50, color:"#fb7185", bg:"rgba(251,113,133,0.18)",grd:"linear-gradient(135deg,#881337,#e11d48)" },
  { id:"KipTruong-TSN",icon:"🧑‍💼",label:"Kíp trưởng",name:"Kíp trưởng CNS Tân Sơn Nhất",               draw:50, color:"#fde047", bg:"rgba(253,224,71,0.18)", grd:"linear-gradient(135deg,#713f12,#ca8a04)" },
];


const LOCATION_MODULE_MAP = {
  "ATSEP": {
    "Long Thành":   ["VHF","Radar","SMS","ADS-B-LT"],
    "Tân Sơn Nhất": ["VHF","Ghi âm","ADS-B","RDP/FDP","VCCS","Radar-TSN","KipTruong-TSN","A-SGMCS"]
  }
};