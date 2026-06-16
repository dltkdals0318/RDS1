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
    ? `님의 타임캡슐은 ${dominant.year}년에 머물러 있네요!`
    : "님의 타임캡슐이 완성되었어요!";

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
      return { name, series };
    }),
  );

  const W = 300;
  const GRAPH_H = 52,
    AXIS_H = 12;
  const padL = 2,
    padR = 2,
    padT = 8,
    padB = 2;
  const plotW = W - padL - padR;
  const plotH = GRAPH_H - padT - padB;

  const COLORS = [
    "#000000",
    "#1c1c1c",
    "#383838",
    "#333333",
    "#4a4a4a",
    "#000000",
    "#1c1c1c",
    "#383838",
    "#333333",
    "#4a4a4a",
    "#000000",
    "#1c1c1c",
    "#383838",
    "#333333",
    "#4a4a4a",
    "#000000",
    "#1c1c1c",
    "#383838",
    "#333333",
    "#4a4a4a",
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

  const majorYears = new Set([2013, 2016, 2019, 2022, 2025]);
  const itemPeaks = itemData.map((item, i) => {
    const color = COLORS[i % COLORS.length];
    const n = item.series.length;
    let peakIdx = 0,
      peakVal = -Infinity;
    item.series.forEach((p, j) => {
      if (p.value > peakVal) {
        peakVal = p.value;
        peakIdx = j;
      }
    });
    return {
      name: item.name,
      color,
      peakX: padL + (peakIdx / (n - 1)) * plotW,
      peakYear: 2013 + Math.round((peakIdx / (n - 1)) * 13),
    };
  });
  const sortedItems = [...itemPeaks].sort((a, b) => a.peakX - b.peakX);

  const MM_PER_UNIT = 114.6 / W; // 148mm - 16.7mm×2 side margins

  const svgAxis = [
    `<line x1="${padL}" y1="${GRAPH_H}" x2="${W - padR}" y2="${GRAPH_H}" stroke="#000" stroke-width="0.5"/>`,
    ...Array.from({ length: 14 }, (_, i) => {
      const year = 2013 + i;
      const x = (padL + (i / 13) * plotW).toFixed(1);
      const isMaj = majorYears.has(year);
      return [
        `<line x1="${x}" y1="${GRAPH_H}" x2="${x}" y2="${(GRAPH_H + (isMaj ? 3.5 : 2)).toFixed(1)}" stroke="#000" stroke-width="${isMaj ? 0.5 : 0.3}"/>`,
        isMaj
          ? `<text x="${x}" y="${(GRAPH_H + 9).toFixed(1)}" font-size="5.5" text-anchor="${i === 0 ? "start" : "middle"}" fill="#000" font-family="sans-serif" font-weight="800">${year}</text>`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }),
  ].join("\n");

  const FONT_SIZE = 4.8,
    charW = 4.1,
    PAD_X = 1.5,
    boxH = 7.5,
    BOX_GAP_X = 1.5,
    BOX_GAP_Y = 1.5,
    GROUP_GAP = 4,
    YEAR_LABEL_H = 8;

  const yearGroups = [];
  let lastYear = null;
  for (const item of sortedItems) {
    if (item.peakYear !== lastYear) {
      yearGroups.push({ year: item.peakYear, items: [] });
      lastYear = item.peakYear;
    }
    yearGroups[yearGroups.length - 1].items.push(item);
  }

  let cursorY = GRAPH_H + AXIS_H;
  const svgDotLines = [];
  const svgBoxEls = [];

  for (const group of yearGroups) {
    const yearX = padL + ((group.year - 2013) / 13) * plotW;
    const isRTL = group.year >= 2023;
    const anchorX = Math.max(padL + 1, Math.min(W - padR - 1, yearX));

    svgDotLines.push(
      `<line x1="${yearX.toFixed(1)}" y1="${(GRAPH_H + AXIS_H).toFixed(1)}" x2="${anchorX.toFixed(1)}" y2="${cursorY.toFixed(1)}" stroke="#555" stroke-width="0.7" stroke-dasharray="2 1.5"/>`,
    );

    svgBoxEls.push(
      `<text x="${anchorX.toFixed(1)}" y="${(cursorY + YEAR_LABEL_H * 0.78).toFixed(1)}" font-size="5.5" fill="#222" font-family="sans-serif" font-weight="800" text-anchor="${isRTL ? "end" : "start"}">${group.year}</text>`,
    );
    cursorY += YEAR_LABEL_H;

    const itemsW = group.items.map(({ name, color }) => ({
      name,
      color,
      estW: name.length * charW + PAD_X * 2,
    }));

    const maxW = W - padL - padR;
    const allRows = [];
    let curRow = [],
      curRowW = 0;
    for (const item of itemsW) {
      if (curRowW > 0 && curRowW + item.estW > maxW) {
        allRows.push(curRow);
        curRow = [];
        curRowW = 0;
      }
      curRow.push(item);
      curRowW += item.estW + BOX_GAP_X;
    }
    if (curRow.length) allRows.push(curRow);

    let rowY = cursorY;
    for (const row of allRows) {
      const rowTotalW = row.reduce(
        (s, it) => s + it.estW + BOX_GAP_X,
        -BOX_GAP_X,
      );
      let rowX = isRTL
        ? Math.max(padL, anchorX - rowTotalW)
        : Math.max(padL, Math.min(anchorX, W - padR - rowTotalW));

      for (const { name, color, estW } of row) {
        svgBoxEls.push(
          [
            `<rect x="${rowX.toFixed(1)}" y="${rowY.toFixed(1)}" width="${estW.toFixed(1)}" height="${boxH.toFixed(1)}" fill="#f0ffc3" stroke="${color}" stroke-width="0.9" rx="0.8"/>`,
            `<text x="${(rowX + PAD_X).toFixed(1)}" y="${(rowY + boxH * 0.72).toFixed(1)}" fill="${color}" font-size="${FONT_SIZE}" font-family="'Noto Sans KR',sans-serif" font-weight="700">${name}</text>`,
          ].join("\n"),
        );
        rowX += estW + BOX_GAP_X;
      }
      rowY += boxH + BOX_GAP_Y;
    }

    cursorY = rowY - BOX_GAP_Y + GROUP_GAP;
  }

  const H = cursorY + 2;
  const svgHeightMM = (H * MM_PER_UNIT).toFixed(1);

  const svgLabels = svgDotLines.join("\n") + "\n" + svgBoxEls.join("\n");

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
  @page { size: 105mm 148mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    background: #ccc;
  }
  body {
    width: 148mm;
    height: 105mm;
    background: #f0ffc3;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
    padding: 8mm 16.7mm 5mm;
  }
  .p-title {
    font-family: 'ClashDisplay-Variable', sans-serif;
    font-size: 17pt;
    font-weight: 500;
    color: #000;
    text-decoration: underline;
    letter-spacing: 0.02em;
    text-align: left;
    flex-shrink: 0;
    line-height: 1.1;
    margin-bottom: 1mm;
    transform: rotate(-8deg);
    transform-origin: center;
  }
  .p-subtitle {
    font-family: 'Sandoll GtNeoCond', 'Noto Sans KR', sans-serif;
    font-size: 7pt;
    line-height: 1.3;
    color: #000;
    flex-shrink: 0;
    text-align: left;
    margin-bottom: 7mm;
    transform: rotate(-8deg);
    transform-origin: center;
  }
  .p-graph {
    flex: 0 0 ${svgHeightMM}mm;
    height: ${svgHeightMM}mm;
    width: 100%;
    overflow: hidden;
    margin-top: 0;
  }
  .p-graph svg { width: 100%; height: 100%; display: block; }
  @media print {
    html { background: none; display: block; }
    body {
      width: 148mm;
      height: 105mm;
      padding: 5mm 16.7mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      position: absolute;
      top: 0;
      left: 0;
      transform: rotate(-90deg) translateX(-148mm);
      transform-origin: top left;
    }
  }
</style>
</head>
<body>
  <div class="p-title"><span style="font-family:${nickFont};font-weight:${nickWeight};">${nickname}</span>'s time.zip</div>
  <div class="p-subtitle"><span style="font-family:${nickFont};font-weight:${nickWeight};">${nickname}</span>${subtitleText}</div>
  <div class="p-graph">
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      ${svgPaths}
      ${svgAxis}
      ${svgLabels}
    </svg>
  </div>
  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 500));
  </script>
</body>
</html>`;

  const popup = window.open("", "_blank", "width=700,height=560");
  popup.document.write(html);
  popup.document.close();
}

function showArchiveInfoOverlay() {
  if (document.getElementById("archive-info-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "archive-info-overlay";
  overlay.className = "archive-info-overlay";
  overlay.innerHTML = `
    <div class="archive-info-card">
      <h2 class="archive-info-card-title">Time Archive</h2>
      <p class="archive-info-body">다운로드 버튼을 눌러 나의 타임캡슐을 저장해보세요!<br>당신이 어느 시대의 유행을 가장 많이 간직하고 있는지 보여드립니다.</p>
      <p class="archive-info-dismiss">(click to dismiss)</p>
    </div>
  `;

  overlay.addEventListener("click", () => overlay.remove());
  overlay
    .querySelector(".archive-info-card")
    .addEventListener("click", (e) => e.stopPropagation());
  document.body.appendChild(overlay);
}

function showHowToPlayCard() {
  const deck = document.getElementById("swipe-deck");
  if (!deck || deck.querySelector(".htp-overlay-card")) return;

  const card = document.createElement("div");
  card.className = "swipe-card htp-overlay-card";
  card.style.zIndex = "10";
  card.innerHTML = `
    <h2 class="htp-overlay-title title">Info</h2>
    <p class="htp-overlay-desc">Time Zipper는 인터넷이 반짝 묻어둔 유행들을 다시 꺼내 맞물려보는 웹사이트입니다. 구글트렌드에서 솟았다 가라앉은 '산모형' 유행만 골라 카드에 담았습니다. 아는 유행과 모르는 유행을 나누며, 나만의 타임캡슐을 만들어보세요!</p>
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
}

fetch(CSV_URL)
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  })
  .then((text) => {
    const allRows = parseCSV(text);
    dataRows = allRows.filter((r) => r[KEYS.project]);

    Object.entries(CARD_IMAGES).forEach(([idx, src]) => {
      if (dataRows[idx]) dataRows[idx]["_image"] = src;
    });

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

    document.title = allRows[0]?.[KEYS.title] || "Time Zipper";

    renderDeck();

    initArchive();

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
