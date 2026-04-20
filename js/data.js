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
  잘나감: { bg: "#e3e3e3", text: "#9a9a9a" },
  한물감: { bg: "#9a9a9a", text: "#f3f3f3" },
};

const SWIPE_DECK_SIZE = 20;

let catColorMap = new Map();
let dataRows = [];
let swipeRows = [];
let swipeResults = [];
let swipeIndex = 0;
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
  0: "assets/images/01.jpg",
  1: "assets/images/02.jpg",
  2: "assets/images/03.jpg",
  3: "assets/images/04.jpg",
  4: "assets/images/05.jpg",
  5: "assets/images/06.jpg",
  6: "assets/images/07.jpg",
  7: "assets/images/08.jpg",
  8: "assets/images/09.jpg",
  9: "assets/images/10.jpg",
  10: "assets/images/11.jpg",
  11: "assets/images/12.jpg",
  12: "assets/images/13.jpg",
  13: "assets/images/14.jpg",
  14: "assets/images/15.jpg",
  15: "assets/images/16.jpg",
  16: "assets/images/17.jpg",
  17: "assets/images/18.jpg",
  18: "assets/images/19.jpg",
  19: "assets/images/20.jpg",
  20: "assets/images/21.jpg",
  21: "assets/images/22.jpg",
  22: "assets/images/23.jpg",
  23: "assets/images/24.jpg",
  24: "assets/images/25.jpg",
  25: "assets/images/26.jpg",
  26: "assets/images/27.jpg",
  27: "assets/images/28.jpg",
  28: "assets/images/29.jpg",
  29: "assets/images/30.jpg",
  30: "assets/images/31.jpg",
  31: "assets/images/32.jpg",
  32: "assets/images/33.jpg",
  33: "assets/images/34.jpg",
  34: "assets/images/35.jpg",
  35: "assets/images/36.jpg",
  36: "assets/images/37.jpg",
  37: "assets/images/38.jpg",
  38: "assets/images/39.jpg",
  39: "assets/images/40.jpg",
  40: "assets/images/41.jpg",
  41: "assets/images/42.jpg",
  42: "assets/images/43.jpg",
  43: "assets/images/44.jpg",
  44: "assets/images/45.jpg",
  45: "assets/images/46.jpg",
  46: "assets/images/47.jpg",
  47: "assets/images/48.jpg",
  48: "assets/images/49.jpg",
  49: "assets/images/50.jpg",
  50: "assets/images/51.jpg",
  51: "assets/images/52.jpg",
  52: "assets/images/53.jpg",
  53: "assets/images/54.jpg",
  54: "assets/images/55.jpg",
  55: "assets/images/56.jpg",
  56: "assets/images/57.jpg",
  57: "assets/images/58.jpg",
  58: "assets/images/59.jpg",
  59: "assets/images/60.jpg",
  60: "assets/images/61.jpg",
  61: "assets/images/62.jpg",
  62: "assets/images/63.jpg",
  63: "assets/images/64.jpg",
  64: "assets/images/65.jpg",
  65: "assets/images/66.jpg",
  66: "assets/images/67.jpg",
  67: "assets/images/68.jpg",
  68: "assets/images/69.jpg",
  69: "assets/images/70.jpg",
  70: "assets/images/71.jpg",
  71: "assets/images/72.jpg",
  72: "assets/images/73.jpg",
  73: "assets/images/74.jpg",
  74: "assets/images/75.jpg",
  75: "assets/images/76.jpg",
  76: "assets/images/77.jpg",
  77: "assets/images/78.jpg",
  78: "assets/images/79.jpg",
  79: "assets/images/80.jpg",
  80: "assets/images/81.jpg",
  81: "assets/images/82.jpg",
  82: "assets/images/83.jpg",
  83: "assets/images/84.jpg",
};
