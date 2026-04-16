const SPREADSHEET_ID = "1XWZN3TFyXQqLclqn7RqdmaaeEeoAmapN";

const KEYS = {
  title: "Meta-Title",
  description: "Meta-Description",
  about: "About",
  project: "UL-Project",
  cat: "UL-Cat",
  location: "UL-Location",
  date: "UL-Date",
  calc: "UL-Calc",
  link: "UL-Link",
  state: "UL-State",
};

const CAT_COLORS = [
  { bg: "#ff8a8a", text: "#7A2A2A" },
  { bg: "#ffaf83", text: "#7A4A00" },
  { bg: "#ffe596", text: "#6B5C00" },
  { bg: "#a3ff97", text: "#285A28" },
  { bg: "#8afff9", text: "#1A3E70" },
  { bg: "#8ab3ff", text: "#28287A" },
  { bg: "#bd8aff", text: "#50187A" },
  { bg: "#ff8ae2", text: "#7A1858" },
];

const STATE_COLORS = {
  "한물가는 중": { bg: "#e3e3e3", text: "#9a9a9a" },
  한물감: { bg: "#9a9a9a", text: "#f3f3f3" },
};

let catColorMap = new Map();
let dataRows = [];
let swipeIndex = 0;
let swipeCount = 0;
let topCard = null;

// ── color helpers ────────────────────────────

function buildCatColorMap(cats) {
  cats.forEach((cat, i) =>
    catColorMap.set(cat, CAT_COLORS[i % CAT_COLORS.length]),
  );
}

function catColor(str) {
  return catColorMap.get(str) || { bg: "#E0E0E0", text: "#555555" };
}
function stateColor(str) {
  return STATE_COLORS[str] || { bg: "#E0E0E0", text: "#555555" };
}

function makeBadge(label, color) {
  return `<span class="badge" style="background:${color.bg};color:${color.text}">${label}</span>`;
}

// ── CSV ──────────────────────────────

const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] || "").trim();
    });
    return obj;
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Image ──────────────────────────────

const CARD_IMAGES = {
  0: "assets/images/02_honey_icecream.jpg",
  1: "assets/images/02_honey_icecream.jpg",
  2: "assets/images/02_honey_icecream.jpg",
  3: "assets/images/02_honey_icecream.jpg",
  4: "assets/images/02_honey_icecream.jpg",
  5: "assets/images/02_honey_icecream.jpg",
  6: "assets/images/02_honey_icecream.jpg",
  7: "assets/images/02_honey_icecream.jpg",
  8: "assets/images/02_honey_icecream.jpg",
  9: "assets/images/02_honey_icecream.jpg",
  10: "assets/images/02_honey_icecream.jpg",
  11: "assets/images/02_honey_icecream.jpg",
  12: "assets/images/02_honey_icecream.jpg",
  13: "assets/images/02_honey_icecream.jpg",
  14: "assets/images/02_honey_icecream.jpg",
  15: "assets/images/02_honey_icecream.jpg",
  16: "assets/images/02_honey_icecream.jpg",
  17: "assets/images/02_honey_icecream.jpg",
  18: "assets/images/02_honey_icecream.jpg",
  19: "assets/images/02_honey_icecream.jpg",
  20: "assets/images/02_honey_icecream.jpg",
  21: "assets/images/02_honey_icecream.jpg",
  22: "assets/images/02_honey_icecream.jpg",
  23: "assets/images/02_honey_icecream.jpg",
  24: "assets/images/02_honey_icecream.jpg",
  25: "assets/images/02_honey_icecream.jpg",
  26: "assets/images/02_honey_icecream.jpg",
  27: "assets/images/02_honey_icecream.jpg",
  28: "assets/images/02_honey_icecream.jpg",
  29: "assets/images/02_honey_icecream.jpg",
  30: "assets/images/02_honey_icecream.jpg",
  31: "assets/images/02_honey_icecream.jpg",
  32: "assets/images/02_honey_icecream.jpg",
  33: "assets/images/02_honey_icecream.jpg",
  34: "assets/images/02_honey_icecream.jpg",
  35: "assets/images/02_honey_icecream.jpg",
  36: "assets/images/02_honey_icecream.jpg",
  37: "assets/images/02_honey_icecream.jpg",
  38: "assets/images/02_honey_icecream.jpg",
  39: "assets/images/02_honey_icecream.jpg",
  40: "assets/images/02_honey_icecream.jpg",
  41: "assets/images/02_honey_icecream.jpg",
  42: "assets/images/02_honey_icecream.jpg",
  43: "assets/images/02_honey_icecream.jpg",
  44: "assets/images/02_honey_icecream.jpg",
  45: "assets/images/02_honey_icecream.jpg",
  46: "assets/images/02_honey_icecream.jpg",
  47: "assets/images/02_honey_icecream.jpg",
  48: "assets/images/02_honey_icecream.jpg",
  49: "assets/images/02_honey_icecream.jpg",
  50: "assets/images/02_honey_icecream.jpg",
  51: "assets/images/02_honey_icecream.jpg",
  52: "assets/images/02_honey_icecream.jpg",
  53: "assets/images/02_honey_icecream.jpg",
  54: "assets/images/02_honey_icecream.jpg",
  55: "assets/images/02_honey_icecream.jpg",
  56: "assets/images/02_honey_icecream.jpg",
  57: "assets/images/02_honey_icecream.jpg",
  58: "assets/images/02_honey_icecream.jpg",
  59: "assets/images/02_honey_icecream.jpg",
  60: "assets/images/02_honey_icecream.jpg",
  61: "assets/images/02_honey_icecream.jpg",
  62: "assets/images/02_honey_icecream.jpg",
  63: "assets/images/02_honey_icecream.jpg",
  64: "assets/images/02_honey_icecream.jpg",
  65: "assets/images/02_honey_icecream.jpg",
  66: "assets/images/02_honey_icecream.jpg",
  67: "assets/images/02_honey_icecream.jpg",
  68: "assets/images/02_honey_icecream.jpg",
  69: "assets/images/02_honey_icecream.jpg",
  70: "assets/images/02_honey_icecream.jpg",
  71: "assets/images/02_honey_icecream.jpg",
  72: "assets/images/02_honey_icecream.jpg",
  73: "assets/images/02_honey_icecream.jpg",
  74: "assets/images/02_honey_icecream.jpg",
  75: "assets/images/02_honey_icecream.jpg",
  76: "assets/images/02_honey_icecream.jpg",
  77: "assets/images/02_honey_icecream.jpg",
  78: "assets/images/02_honey_icecream.jpg",
  79: "assets/images/02_honey_icecream.jpg",
  80: "assets/images/02_honey_icecream.jpg",
  81: "assets/images/02_honey_icecream.jpg",
  82: "assets/images/02_honey_icecream.jpg",
  83: "assets/images/02_honey_icecream.jpg",
  84: "assets/images/02_honey_icecream.jpg",
  85: "assets/images/02_honey_icecream.jpg",
};
