// ── trend graph SVG ──────────────────

function makeTrendSVG(date, calc, catC) {
  const calcVal = Math.max(0, parseFloat(calc) || 75);
  const endRatio = (100 - calcVal) / 100;
  const peakYear = parseInt(date) || 2020;

  const w = 300,
    h = 100;
  const topY = 10;
  const bottomY = h - 4;
  const endY = bottomY - endRatio * (bottomY - topY);

  const startX = 15;
  const peakX = 105;
  const endX = w - 15;

  const fillPath = [
    `M ${startX},${bottomY}`,
    `C ${startX + 25},${bottomY} ${peakX - 45},${topY} ${peakX},${topY}`,
    `C ${peakX + 40},${topY} ${peakX + 80},${endY} ${endX},${endY}`,
    `L ${endX},${bottomY} Z`,
  ].join(" ");

  const linePath = [
    `M ${startX},${bottomY}`,
    `C ${startX + 25},${bottomY} ${peakX - 45},${topY} ${peakX},${topY}`,
    `C ${peakX + 40},${topY} ${peakX + 80},${endY} ${endX},${endY}`,
  ].join(" ");

  const color = "#ff5b5b";
  const gradId = `tg-${peakYear}-${calcVal}`;

  return `
    <div class="trend-graph-wrap">
      <svg class="trend-graph-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.06"/>
          </linearGradient>
        </defs>
        <path d="${fillPath}" fill="url(#${gradId})"/>
        <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `;
}

// ── archive grid ──────────────────────

function initArchive() {
  const grid = document.getElementById("grid");

  dataRows.forEach((row, idx) => {
    const card = document.createElement("div");
    card.className = "cal-card";

    const cat = row[KEYS.cat] || "";
    const date = row[KEYS.date] || "";
    const calc = row[KEYS.calc] || "";
    const image = row["_image"] || "";
    const numStr = String(idx + 1).padStart(2, "0");

    card.dataset.cat = cat;
    card.dataset.date = date;
    card.dataset.calc = calc;
    card.dataset.index = idx;

    const main = document.createElement("div");
    main.className = "cal-card-main";
    main.innerHTML = `
      <span class="cal-card-num">${numStr}</span>
      <div class="cal-card-img-wrap">
        ${image ? `<img src="${image}" alt="${row[KEYS.project]}" draggable="false" />` : ""}
      </div>
    `;

    const label = document.createElement("div");
    label.className = "cal-card-label";
    label.textContent = row[KEYS.project];

    card.appendChild(main);
    card.appendChild(label);

    card.addEventListener("click", () => {
      const link = row[KEYS.link];
      if (link) {
        window.open(link, "_blank", "noopener,noreferrer");
      } else {
        location.hash = `#/item/${idx}`;
      }
    });

    grid.appendChild(card);
  });
}

function updateArchiveOpacity() {
  if (!swipeResults.length) return;

  const knownIndices = new Set(
    swipeResults
      .filter((r) => r.action === "dispose")
      .map((r) => r.row._dataIdx),
  );

  document.querySelectorAll(".cal-card").forEach((card) => {
    card.style.opacity = knownIndices.has(parseInt(card.dataset.index))
      ? "1"
      : "0.5";
  });
}

// ── detail view ───────────────────────────

async function renderDeathCert(row, idx) {
  const cert = document.getElementById("death-cert");
  cert.innerHTML = "";

  const cat = row[KEYS.cat] || "";
  const date = row[KEYS.date] || "";
  const calc = row[KEYS.calc] || "";
  const catC = catColor(cat);

  const graphArea = document.createElement("div");
  graphArea.className = "detail-graph-area";

  const projectName = row[KEYS.project];
  const trendInfo = TREND_DATA_MAP[projectName];
  let loadedSeries = null;

  if (trendInfo) {
    const series = await fetchTrendSeries(trendInfo.file, trendInfo.column);
    if (series && series.length > 1) {
      loadedSeries = series;
      graphArea.innerHTML = makeTrendSVGFromData(series, catC);
    } else {
      graphArea.innerHTML = makeTrendSVG(date, calc, catC);
      console.warn(
        `[trend] CSV 로드 실패: "${trendInfo.file}" / column="${trendInfo.column}"`,
      );
    }
  } else {
    graphArea.innerHTML = makeTrendSVG(date, calc, catC);
    if (
      Object.keys(TREND_DATA_MAP).some(
        (k) => k.trim().toLowerCase() === projectName?.trim().toLowerCase(),
      )
    ) {
      const matched = Object.keys(TREND_DATA_MAP).find(
        (k) => k.trim().toLowerCase() === projectName?.trim().toLowerCase(),
      );
      console.warn(
        `[trend] 대소문자/공백 불일치 — 스프레드시트: ${JSON.stringify(projectName)} / MAP 키: ${JSON.stringify(matched)}`,
      );
    }
  }

  cert.appendChild(graphArea);

  if (loadedSeries) {
    const graphWrap = graphArea.querySelector(".trend-graph-wrap");
    if (graphWrap) initTrendHover(graphWrap, loadedSeries, catC);
  }

  const info = document.createElement("div");
  info.className = "detail-info";

  info.innerHTML = `
    <div class="detail-name-row">
      <p class="card-name">${row[KEYS.project]}</p>
      ${
        calc
          ? `<div class="detail-calc-stat">
        <span class="detail-calc-value">−${calc}%</span>
        <span class="detail-calc-label">하강폭</span>
      </div>`
          : ""
      }
    </div>
  `;
  cert.appendChild(info);
}

// ── swipe card ─────────────────────────

function buildSwipeCard(row, num) {
  const card = document.createElement("div");
  card.className = "swipe-card";

  const image = row["_image"] || "";
  const numStr = num != null ? String(num).padStart(2, "0") : "";

  card.innerHTML = `
    <div class="swipe-card-header">
      <p class="swipe-card-name">${row[KEYS.project]}</p>
      <span class="swipe-card-num">${numStr}</span>
    </div>
    <div class="swipe-card-body">
      <div class="swipe-card-img-wrap">
        ${image ? `<img src="${image}" alt="${row[KEYS.project]}" draggable="false" />` : ""}
      </div>
    </div>
  `;

  return card;
}

function renderDeck() {
  const deck = document.getElementById("swipe-deck");
  deck.innerHTML = "";
  topCard = null;

  if (swipeIndex >= swipeRows.length) {
    const savedNick = sessionStorage.getItem("aohb_nickname");
    const nickLine = savedNick
      ? `<p class="deck-nick">${savedNick}'s archive</p>`
      : "";
    deck.innerHTML = `
      <div class="deck-complete">
        <h2 class="deck-complete-title">Complete!</h2>
        <p class="deck-empty">타임캡슐 생성이 완료되었습니다.</p>
        <a href="#/archive" class="see-all-cta">(View my Time Capsule)</a>
      </div>`;
    updateSwipeCounter();
    return;
  }

  if (swipeIndex + 1 < swipeRows.length) {
    const nextCard = buildSwipeCard(swipeRows[swipeIndex + 1], swipeIndex + 2);
    nextCard.id = "next-card";
    nextCard.style.zIndex = 1;
    nextCard.style.transform = "scale(0.95)";
    nextCard.style.pointerEvents = "none";
    deck.appendChild(nextCard);
  }

  const row = swipeRows[swipeIndex];
  const card = buildSwipeCard(row, swipeIndex + 1);
  card.style.zIndex = 2;
  makeSwipeable(card);
  topCard = card;
  deck.appendChild(card);

  updateSwipeCounter();
}

function makeSwipeable(card) {
  let startX = 0,
    startY = 0;
  let currentX = 0,
    currentY = 0;
  let dragging = false;

  card.addEventListener("pointerdown", (e) => {
    startX = e.clientX;
    startY = e.clientY;
    dragging = true;
    card.setPointerCapture(e.pointerId);
    card.style.transition = "none";
  });

  card.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    const rot = currentX * 0.07;
    card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rot}deg)`;
    updateSwipeLabels(currentX);

    const progress = Math.min(1, Math.abs(currentX) / 180);
    const nextCard = document.getElementById("next-card");
    if (nextCard) {
      nextCard.style.transition = "none";
      nextCard.style.transform = `scale(${0.95 + 0.05 * progress})`;
    }
  });

  card.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;

    if (Math.abs(currentX) > 100) {
      doSwipe(card, currentX > 0 ? "preserve" : "dispose");
    } else if (Math.abs(currentX) < 15 && Math.abs(currentY) < 15) {
      doSwipe(card, startX < window.innerWidth / 2 ? "dispose" : "preserve");
    } else {
      card.style.transition = "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)";
      card.style.transform = "";
      updateSwipeLabels(0);

      const nextCard = document.getElementById("next-card");
      if (nextCard) {
        nextCard.style.transition = "transform 0.35s ease";
        nextCard.style.transform = "scale(0.95)";
      }
    }

    currentX = 0;
    currentY = 0;
  });
}

function updateSwipeLabels(dx) {
  const disposeEl = document.getElementById("label-dispose");
  const preserveEl = document.getElementById("label-preserve");
  const threshold = 25;

  if (dx < -threshold) {
    disposeEl.style.opacity = Math.min(1, Math.abs(dx) / 140).toFixed(2);
    preserveEl.style.opacity = 0;
  } else if (dx > threshold) {
    preserveEl.style.opacity = Math.min(1, dx / 140).toFixed(2);
    disposeEl.style.opacity = 0;
  } else {
    disposeEl.style.opacity = 0;
    preserveEl.style.opacity = 0;
  }
}

function doSwipe(card, action) {
  topCard = null;
  updateSwipeLabels(0);

  const targetX = action === "preserve" ? 1600 : -1600;
  const rot = action === "preserve" ? 20 : -20;

  const nextCard = document.getElementById("next-card");
  if (nextCard) {
    nextCard.style.transition = "transform 0.4s ease";
    nextCard.style.transform = "scale(1)";
  }

  card.style.transition = "transform 0.4s ease";
  card.style.transform = `translate(${targetX}px, -20px) rotate(${rot}deg)`;

  setTimeout(() => {
    if (swipeIndex < swipeRows.length) {
      swipeResults.push({ row: swipeRows[swipeIndex], action });
      addMiniCard(action, swipeRows[swipeIndex]);
    }
    swipeIndex++;
    renderDeck();
  }, 420);
}

function addMiniCard(action, row) {
  const pileEl = document.getElementById(
    action === "dispose" ? "pile-dispose" : "pile-preserve",
  );

  const mini = document.createElement("div");
  mini.className = "swipe-mini-card";

  const image = row._image || "";
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    img.alt = row[KEYS.project] || "";
    img.draggable = false;
    mini.appendChild(img);
  }

  pileEl.appendChild(mini);
  pileEl.scrollTop = pileEl.scrollHeight;
}

function updateSwipeCounter() {
  const current = Math.min(swipeIndex + 1, swipeRows.length);
  document.getElementById("counter-current").textContent = current;
  document.getElementById("counter-total").textContent = swipeRows.length;
}
