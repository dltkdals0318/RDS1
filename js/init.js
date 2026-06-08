// ── loading helpers ───────────────────────

const NICKNAME_KEY = "aohb_nickname";

function hideLoadingScreen() {
  const screen = document.getElementById("loading-screen");
  if (!screen) return;
  screen.classList.add("loading-done");
  setTimeout(() => {
    screen.hidden = true;
  }, 520);
}

function readyLoadingScreen() {
  const screen = document.getElementById("loading-screen");
  if (!screen || screen.classList.contains("loading-ready") || screen.hidden)
    return;

  const input = document.getElementById("nickname-input");

  screen.classList.add("loading-ready");

  if (input) input.focus();

  let entered = false;
  function enter() {
    if (entered) return;
    const nick = input ? input.value.trim() : "";
    if (!nick) {
      if (input) {
        input.classList.add("loading-nickname--shake");
        input.addEventListener(
          "animationend",
          () => input.classList.remove("loading-nickname--shake"),
          { once: true },
        );
      }
      return;
    }
    entered = true;
    sessionStorage.setItem(NICKNAME_KEY, nick);
    screen.classList.add("loading-done");
    setTimeout(() => {
      screen.hidden = true;
    }, 520);
  }

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") enter();
    });
  }
}

// ── print view (100×148mm postcard) ─────────────────────

function getDominantYear(items) {
  const counts = {};
  items.forEach((r) => {
    const year = String(r.row[KEYS.date] || "").match(/\d{4}/)?.[0];
    if (year) counts[year] = (counts[year] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.length ? { year: entries[0][0], count: entries[0][1] } : null;
}

async function openPrintView({ dev = false } = {}) {
  let knownItems = swipeResults.filter((r) => r.action === "dispose");

  if (!knownItems.length) {
    if (!dev) {
      alert(
        "안다고 답변한 항목이 없습니다.\n새로고침하여 다시 타임캡슐을 만들어주세요!",
      );
      return;
    }
    // dev mode: use first 10 dataRows as stand-ins
    knownItems = dataRows
      .slice(0, 10)
      .map((row) => ({ row, action: "dispose" }));
  }

  const nickname = sessionStorage.getItem(NICKNAME_KEY) || "My";
  const dominant = getDominantYear(knownItems);

  const isKoreanNick = /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(nickname);
  const nickFont = isKoreanNick
    ? "'Sandoll GtNeoCond','Noto Sans KR',sans-serif"
    : "'ClashDisplay-Variable',sans-serif";
  const nickWeight = isKoreanNick ? "400" : "500";
  const subtitleText = dominant
    ? `님의 유행 타임캡슐은 ${dominant.year}년에 머물러 있네요!`
    : "님의 유행 타임캡슐이 완성되었어요!";

  // year axis (2013–2026): ticks straddle the rule, aligned to graph edges
  // graph padL=2, padR=2, W=300 → edge offset = 2/300*100% ≈ 0.667%
  const _majorYears = new Set([2013, 2016, 2019, 2022, 2025]);
  const _axisItems = Array.from({ length: 14 }, (_, i) => 2013 + i)
    .map((y) => {
      const maj = _majorYears.has(y);
      return `<span style="display:inline-flex;flex-direction:column;align-items:center;"><span style="display:block;width:${maj ? "0.45" : "0.25"}mm;height:2.5mm;background:#685aff;"></span><span style="font-size:5.5pt;color:#685aff;font-family:'ClashDisplay-Variable',sans-serif;font-weight:500;opacity:${maj ? "1" : "0"};margin-top:0.1mm;">${y}</span></span>`;
    })
    .join("");
  const axisHTML = `<div style="position:relative;flex-shrink:0;width:100%;height:6mm;"><div style="position:absolute;top:1.25mm;left:0;right:0;height:0.5mm;background:#685aff;"></div><div style="display:flex;justify-content:space-between;padding-left:calc(2/300*100%);padding-right:calc(2/300*100%);box-sizing:border-box;">${_axisItems}</div></div>`;

  // fetch/build series for each known item
  const itemData = await Promise.all(
    knownItems.map(async (r) => {
      const name = r.row[KEYS.project];
      const trendInfo = TREND_DATA_MAP[name];
      let series = null;
      if (trendInfo) {
        series = await fetchTrendSeries(trendInfo.file, trendInfo.column);
      }
      if (!series) {
        series = makeSyntheticSeries(r.row[KEYS.date], r.row[KEYS.calc]);
      }
      return { name, series, image: r.row._image || null };
    }),
  );

  // build overlay SVG paths (reuses _smoothPath from trends.js)
  const W = 300,
    H = 120;
  const padL = 2,
    padR = 2,
    padT = 10,
    padB = 4;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const COLORS = [
    "#ff3434",
    "#ff704d",
    "#ff9d4d",
    "#ffd15b",
    "#caff46",
    "#57ff3d",
    "#00dc30",
    "#3dffe2",
    "#0397ae",
    "#3dc2ff",
    "#5387ff",
    "#195eff",
    "#5d4ffa",
    "#a650fc",
    "#d946ef",
    "#fe79f3",
    "#ff3bb1",
    "#6a6f6e",
    "#332f2f",
    "#19171a",
  ];

  const svgPaths = itemData
    .map((item, i) => {
      const color = COLORS[i % COLORS.length];
      const n = item.series.length;
      const pts = item.series.map((p, j) => ({
        x: padL + (j / (n - 1)) * plotW,
        y: padT + plotH - (Math.min(p.value, 100) / 100) * plotH,
      }));
      const d = _smoothPath(pts);
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("\n");

  const thumbsHTML = itemData
    .map((item, i) => {
      const color = COLORS[i % COLORS.length];
      const imgSrc = item.image ? new URL(item.image, location.href).href : "";
      const imgTag = imgSrc
        ? `<img src="${imgSrc}" alt="" style="width:100%;height:100%;object-fit:contain;">`
        : "";
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:0.6mm;width:13mm;flex-shrink:0;">
      <div style="width:9mm;height:9mm;border:0.4mm solid ${color};overflow:hidden;display:flex;align-items:center;justify-content:center;background:#fff;">
        ${imgTag}
      </div>
      <span class="p-thumb-name">${item.name}</span>
    </div>`;
    })
    .join("");

  const baseURL = new URL(".", location.href).href;
  const clashCSS = `${baseURL}css/clash-display.css`;
  const sandollEl = document.querySelector('link[href*="drop_fontstream_css"]');
  const sandollLink = sandollEl
    ? `<link rel="stylesheet" href="${sandollEl.href}" charset="utf-8" referrerpolicy="origin">`
    : "";

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<link rel="stylesheet" href="${clashCSS}">
${sandollLink}
<style>
  @page { size: 170mm 115mm; margin: 5mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    background: #ccc;
  }
  body {
    width: 160mm;
    height: 105mm;
    background: #f0ffc3;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
    padding: 4mm;
  }
  .p-title {
    font-family: 'ClashDisplay-Variable', sans-serif;
    font-size: 16pt;
    font-weight: 500;
    color: #685aff;
    text-decoration: underline;
    letter-spacing: 0.02em;
    text-align: center;
    flex-shrink: 0;
    line-height: 1.1;
    margin-bottom: 2mm;
  }
  .p-subtitle {
    font-family: 'Sandoll GtNeoCond', 'Noto Sans KR', sans-serif;
    font-size: 5.5pt;
    line-height: 1.3;
    color: #685aff;
    opacity: 0.85;
    flex-shrink: 0;
    text-align: center;
    margin-bottom: 2mm;
  }
  .p-graph {
    flex: 0 0 40mm;
    height: 40mm;
    width: 100%;
    overflow: hidden;
  }
  .p-graph svg { width: 100%; height: 100%; display: block; }
  .p-thumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 2mm;
    align-content: flex-start;
    flex: 1;
    overflow: hidden;
    margin-top: 1.5mm;
  }
  .p-thumb-name {
    font-family: 'Sandoll GtNeoCond', 'Noto Sans KR', sans-serif;
    font-size: 3.8pt;
    color: #333;
    text-align: center;
    word-break: keep-all;
    line-height: 1.25;
    width: 13mm;
  }
  @media print {
    html { background: none; display: block; }
    body {
      width: 160mm;
      height: 105mm;
      padding: 4mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style>
</head>
<body>
  <div class="p-title"><span style="font-family:${nickFont};font-weight:${nickWeight};">${nickname}</span>'s Trend Time Capsule</div>
  <div class="p-subtitle"><span style="font-family:${nickFont};font-weight:${nickWeight};">${nickname}</span>${subtitleText}</div>
  <div class="p-graph">
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      ${svgPaths}
    </svg>
  </div>
  ${axisHTML}
  <div class="p-thumbs">${thumbsHTML}</div>
  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 500));
  </script>
</body>
</html>`;

  const popup = window.open("", "_blank", "width=700,height=560");
  popup.document.write(html);
  popup.document.close();
}

// ── archive info overlay ─────────────────

function showArchiveInfoOverlay() {
  if (document.getElementById("archive-info-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "archive-info-overlay";
  overlay.className = "archive-info-overlay";
  overlay.innerHTML = `
    <div class="archive-info-card">
      <h2 class="archive-info-card-title">Time Capsule Archive</h2>
      <p class="archive-info-body">다운로드 버튼을 눌러 나의 타임캡슐 아카이브를 저장해보세요!<br>당신이 어느 시대의 유행을 가장 많이 간직하고 있는지 보여드립니다.</p>
      <p class="archive-info-dismiss">(click to dismiss)</p>
    </div>
  `;

  overlay.addEventListener("click", () => overlay.remove());
  overlay
    .querySelector(".archive-info-card")
    .addEventListener("click", (e) => e.stopPropagation());
  document.body.appendChild(overlay);
}

// ── how-to-play inline card ───────────────

function showHowToPlayCard() {
  const deck = document.getElementById("swipe-deck");
  if (!deck || deck.querySelector(".htp-overlay-card")) return;

  const card = document.createElement("div");
  card.className = "swipe-card htp-overlay-card";
  card.style.zIndex = "10";
  card.innerHTML = `
    <h2 class="htp-overlay-title title">Info</h2>
    <p class="htp-overlay-desc">유행 타임캡슐은 인터넷이 반짝 묻어둔 유행들을 직접 꺼내보는 웹사이트입니다. 구글트렌드에서 솟았다 가라앉은 '산모형' 유행만 골라 카드에 담았습니다. 아는 유행과 모르는 유행을 나누며, 나만의 유행 타임캡슐을 만들어보세요!</p>
    <p class="htp-overlay-enter">(click to dismiss)</p>
  `;

  card.addEventListener("click", () => card.remove());
  deck.appendChild(card);
}

document
  .getElementById("archive-info-btn")
  .addEventListener("click", showArchiveInfoOverlay);
document
  .getElementById("how-to-play-btn")
  .addEventListener("click", showHowToPlayCard);
document
  .querySelector(".archive-save-btn")
  .addEventListener("click", openPrintView);

// ── nav click animation ───────────────

function attachTiltClick(el) {
  el.addEventListener("click", () => {
    el.classList.remove("nav-tilt-active");
    void el.offsetWidth;
    el.classList.add("nav-tilt-active");
  });
  el.addEventListener("animationend", () => {
    el.classList.remove("nav-tilt-active");
  });
}

attachTiltClick(document.getElementById("how-to-play-btn"));

// ── router ───────────────────────────────

function showView(id) {
  document.querySelectorAll(".view").forEach((v) => (v.hidden = true));
  document.getElementById(id).hidden = false;
  const topNav = document.querySelector(".top-nav");
  topNav.hidden = id === "view-archive" || id === "view-detail";
  topNav.classList.toggle("nav--swipe", id === "view-swipe");
  document.getElementById("nav-swipe").hidden = id !== "view-swipe";
}

function route() {
  const hash = location.hash || "#/";

  if (hash.startsWith("#/item/")) {
    const idx = parseInt(hash.slice(7));
    if (!isNaN(idx) && dataRows[idx]) {
      showView("view-detail");
      renderDeathCert(dataRows[idx], idx);
    } else {
      location.hash = "#/";
    }
  } else if (hash === "#/archive" || hash === "#/results") {
    showView("view-archive");
    if (typeof updateArchiveOpacity === "function") updateArchiveOpacity();
  } else {
    showView("view-swipe");
  }

  document.body.classList.add("js-ready");
}

// ── reset ───────────────────────────────

fetch(CSV_URL)
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  })
  .then((text) => {
    const allRows = parseCSV(text);
    dataRows = allRows.filter((r) => r[KEYS.project]);

    // image
    Object.entries(CARD_IMAGES).forEach(([idx, src]) => {
      if (dataRows[idx]) dataRows[idx]["_image"] = src;
    });

    // swipe subset
    swipeRows = dataRows
      .map((row, i) => ({ ...row, _dataIdx: i }))
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(SWIPE_DECK_SIZE, dataRows.length));

    // preload images in background, but allow click immediately
    const imagesToLoad = swipeRows.filter((r) => r._image).map((r) => r._image);
    imagesToLoad.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    setTimeout(readyLoadingScreen, 300);

    document.title = allRows[0]?.[KEYS.title] || "Archive of Has-Beens";

    const uniqueCats = [
      ...new Set(dataRows.map((r) => r[KEYS.cat]).filter(Boolean)),
    ];
    buildCatColorMap(uniqueCats);

    renderDeck();

    initArchive();

    // 스프레드시트 프로젝트명 ↔ TREND_DATA_MAP 매칭 진단
    const mapKeys = Object.keys(TREND_DATA_MAP);
    const sheetNames = dataRows.map((r) => r[KEYS.project]).filter(Boolean);
    const matched = sheetNames.filter((n) => TREND_DATA_MAP[n]);
    const unmatched = mapKeys.filter((k) => !sheetNames.includes(k));
    if (unmatched.length) {
      console.warn(
        "[trend 진단] TREND_DATA_MAP에 있지만 스프레드시트에 없는 항목:",
        unmatched.map((k) => JSON.stringify(k)),
      );
    } else {
      console.log(
        `[trend 진단] 전체 매칭 OK (${matched.length}/${mapKeys.length})`,
      );
    }

    document.getElementById("cert-back").addEventListener("click", () => {
      if (
        document.referrer &&
        new URL(document.referrer).origin === location.origin
      ) {
        history.back();
      } else {
        location.hash = "#/archive";
      }
    });

    document.getElementById("btn-dispose").addEventListener("click", () => {
      if (topCard) doSwipe(topCard, "dispose");
    });
    document.getElementById("btn-preserve").addEventListener("click", () => {
      if (topCard) doSwipe(topCard, "preserve");
    });

    document.getElementById("view-swipe").addEventListener("click", (e) => {
      if (!topCard) return;
      if (e.target.closest(".swipe-card")) return;
      if (e.target.closest("button")) return;
      doSwipe(
        topCard,
        e.clientX < window.innerWidth / 2 ? "dispose" : "preserve",
      );
    });

    window.addEventListener("hashchange", route);
    route();
  })
  .catch((err) => {
    console.error("Error:", err);
    hideLoadingScreen();
    document.getElementById("swipe-deck").innerHTML = `
      <p style="color:var(--red);font-family:var(--font-sans);padding:2rem;text-align:center">
        데이터 로드 실패.
      </p>`;
  });

// ── dev keyboard shortcuts (1~5) ─────────

document.addEventListener("keydown", (e) => {
  const tag = document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (e.key === "1") {
    sessionStorage.removeItem(NICKNAME_KEY);
    const screen = document.getElementById("loading-screen");
    screen.classList.remove("loading-done", "loading-ready");
    screen.hidden = false;
    setTimeout(readyLoadingScreen, 1200);
  } else if (e.key === "2") {
    location.hash = "#/";
  } else if (e.key === "3") {
    location.hash = "#/results";
  } else if (e.key === "4") {
    openPrintView({ dev: true });
  } else if (e.key === "5") {
    location.hash = "#/archive";
  }
});
