const SPREADSHEET_ID = "1XWZN3TFyXQqLclqn7RqdmaaeEeoAmapN";

const KEYS = {
  title: "Meta-Title",
  project: "UL-Project",
  cat: "UL-Cat",
  date: "UL-Date",
  calc: "UL-Calc",
  link: "UL-Link",
};

const SWIPE_DECK_SIZE = 15;

let dataRows = [];
let swipeRows = [];
let swipeResults = [];
let swipeIndex = 0;
let topCard = null;

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

// ── Trend Data Map ───────────────────────────────────────────────────

const TREND_DATA_MAP = {
  "자니?": { file: "assets/data/01.csv", column: "자니?" },
  "벌집 아이스크림": { file: "assets/data/02.csv", column: "벌집 아이스크림" },
  창렬: { file: "assets/data/03.csv", column: "창렬" },
  허니버터칩: { file: "assets/data/04.csv", column: "허니버터칩" },
  "히트다 히트": { file: "assets/data/05.csv", column: "히트다 히트" },
  PPAP: { file: "assets/data/06.csv", column: "PPAP" },
  너굴맨: { file: "assets/data/07.csv", column: "너굴맨" },
  "피젯 스피너": { file: "assets/data/08.csv", column: "피젯 스피너" },
  대왕카스테라: { file: "assets/data/09.csv", column: "대왕카스테라" },
  트로피카나: { file: "assets/data/010.csv", column: "트로피카나" },
  급식체: { file: "assets/data/011.csv", column: "급식체" },
  가즈아: { file: "assets/data/012.csv", column: "가즈아" },
  yee: { file: "assets/data/013.csv", column: "yee" },
  "토끼 모자": { file: "assets/data/014.csv", column: "토끼 모자" },
  앗살라말라이쿰: { file: "assets/data/015.csv", column: "앗살라말라이쿰" },
  날강두: { file: "assets/data/016.csv", column: "날강두" },
  펭수: { file: "assets/data/017.csv", column: "펭수" },
  곽철용: { file: "assets/data/018.csv", column: "곽철용" },
  "던질까 말까": { file: "assets/data/019.csv", column: "던질까 말까" },
  아무노래: { file: "assets/data/020.csv", column: "아무노래" },
  "달고나 커피": { file: "assets/data/021.csv", column: "달고나 커피" },
  아임뚜렛: { file: "assets/data/022.csv", column: "아임뚜렛" },
  엄준식: { file: "assets/data/023.csv", column: "엄준식" },
  "동물의 숲": { file: "assets/data/024.csv", column: "동물의 숲" },
  관짝춤: { file: "assets/data/025.csv", column: "관짝춤" },
  깡: { file: "assets/data/026.csv", column: "깡" },
  "첵스 파맛": { file: "assets/data/027.csv", column: "첵스 파맛" },
  어몽어스: { file: "assets/data/028.csv", column: "어몽어스" },
  다메다메: { file: "assets/data/029.csv", column: "다메다메" },
  나비보벳따우: { file: "assets/data/030.csv", column: "나비보벳따우" },
  사쿠란보: { file: "assets/data/031.csv", column: "사쿠란보" },
  이루다: { file: "assets/data/032.csv", column: "이루다" },
  클럽하우스: { file: "assets/data/033.csv", column: "클럽하우스" },
  롤린: { file: "assets/data/034.csv", column: "롤린" },
  무야호: { file: "assets/data/035.csv", column: "무야호" },
  "멈춰!": { file: "assets/data/036.csv", column: "멈춰!" },
  가짜사나이: { file: "assets/data/037.csv", column: "가짜사나이" },
  한심좌: { file: "assets/data/038.csv", column: "한심좌" },
  팝잇: { file: "assets/data/039.csv", column: "팝잇" },
  제로투: { file: "assets/data/040.csv", column: "제로투" },
  "슉 슈슉": { file: "assets/data/041.csv", column: "슉 슈슉" },
  "똥 밟았네": { file: "assets/data/042.csv", column: "똥 밟았네" },
  로제떡볶이: { file: "assets/data/043.csv", column: "로제떡볶이" },
  최준: { file: "assets/data/044.csv", column: "최준" },
  "코카인 댄스": { file: "assets/data/045.csv", column: "코카인 댄스" },
  갸루피스: { file: "assets/data/046.csv", column: "갸루피스" },
  중꺾마: { file: "assets/data/047.csv", column: "중꺾마" },
  버터맥주: { file: "assets/data/048.csv", column: "버터맥주" },
  로우라이즈: { file: "assets/data/049.csv", column: "로우라이즈" },
  어쩔티비: { file: "assets/data/050.csv", column: "어쩔티비" },
  "AI 프로필": { file: "assets/data/051.csv", column: "AI 프로필" },
  해피캣: { file: "assets/data/052.csv", column: "해피캣" },
  "홍박사님을 아세요?": {
    file: "assets/data/053.csv",
    column: "홍박사님을 아세요?",
  },
  "I am 신뢰에요": { file: "assets/data/054.csv", column: "I am 신뢰에요" },
  슬릭백: { file: "assets/data/055.csv", column: "슬릭백" },
  "멋지다 연진아": { file: "assets/data/056.csv", column: "멋지다 연진아" },
  장충동왕족발보쌈: { file: "assets/data/057.csv", column: "장충동왕족발보쌈" },
  탕후루: { file: "assets/data/058.csv", column: "탕후루" },
  "Chipi Chipi Chapa Chapa": {
    file: "assets/data/059.csv",
    column: "Chipi Chipi Chapa Chapa",
  },
  당근칼: { file: "assets/data/060.csv", column: "당근칼" },
  럭키비키: { file: "assets/data/061.csv", column: "럭키비키" },
  "두바이 초콜릿": { file: "assets/data/062.csv", column: "두바이 초콜릿" },
  미룬이: { file: "assets/data/063.csv", column: "미룬이" },
  삐끼삐끼: { file: "assets/data/064.csv", column: "삐끼삐끼" },
  티니핑: { file: "assets/data/065.csv", column: "티니핑" },
  지브리스타일: { file: "assets/data/066.csv", column: "지브리스타일" },
  햄부기: { file: "assets/data/067.csv", column: "햄부기" },
  마라탕후루: { file: "assets/data/068.csv", column: "마라탕후루" },
  라부부: { file: "assets/data/069.csv", column: "라부부" },
  영포티: { file: "assets/data/070.csv", column: "영포티" },
  "개웃겨서 도티낳음": {
    file: "assets/data/071.csv",
    column: "개웃겨서 도티낳음",
  },
  매끈매끈하다: { file: "assets/data/072.csv", column: "매끈매끈하다" },
  "힙합보단 사랑, 사랑보단 돈": {
    file: "assets/data/073.csv",
    column: "힙합보단 사랑, 사랑보단 돈",
  },
  "두바이 쫀득 쿠키": {
    file: "assets/data/074.csv",
    column: "두바이 쫀득 쿠키",
  },
  영미: { file: "assets/data/075.csv", column: "영미" },
  에겐남: { file: "assets/data/076.csv", column: "에겐남" },
  나니가스키: { file: "assets/data/077.csv", column: "나니가스키" },
  퉁퉁퉁사후르: { file: "assets/data/078.csv", column: "퉁퉁퉁사후르" },
  "트랄라레로 트랄랄라": {
    file: "assets/data/079.csv",
    column: "트랄라레로 트랄랄라",
  },
  "첫번째 레슨": { file: "assets/data/080.csv", column: "첫번째 레슨" },
  소다팝: { file: "assets/data/081.csv", column: "소다팝" },
  나야나: { file: "assets/data/082.csv", column: "나야나" },
  이븐: { file: "assets/data/083.csv", column: "이븐" },
  칠가이: { file: "assets/data/084.csv", column: "칠가이" },
};

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
