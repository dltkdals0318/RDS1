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

// ── router ───────────────────────────────

function showView(id) {
  document.querySelectorAll(".view").forEach((v) => (v.hidden = true));
  document.getElementById(id).hidden = false;
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
  } else if (hash === "#/archive") {
    showView("view-archive");
  } else {
    showView("view-swipe");
  }
}

// ── swipe card ─────────────────────────

function buildSwipeCard(row) {
  const card = document.createElement("div");
  card.className = "swipe-card";

  const cat = row[KEYS.cat] || "";
  const state = row[KEYS.state] || "";
  const calc = row[KEYS.calc] || "";
  const date = row[KEYS.date] || "";
  const loc = row[KEYS.location] || "";
  const image = row["_image"] || "";
  const catC = catColor(cat);

  const metaParts = [loc, date].filter(Boolean);

  card.innerHTML = `
    ${image ? `<div class="card-image"><img src="${image}" alt="${row[KEYS.project]}" draggable="false" /></div>` : ""}
    <div class="card-content">
      <p class="card-name">${row[KEYS.project]}</p>
      ${metaParts.length ? `<p class="card-meta">${metaParts.join("  ·  ")}</p>` : ""}
    </div>
  `;

  return card;
}

function renderDeck() {
  const deck = document.getElementById("swipe-deck");
  deck.innerHTML = "";
  topCard = null;

  if (swipeIndex >= dataRows.length) {
    deck.innerHTML = '<p class="deck-empty">모든 항목을 판결했습니다.</p>';
    updateSwipeCounter();
    return;
  }

  if (swipeIndex + 1 < dataRows.length) {
    const nextCard = buildSwipeCard(dataRows[swipeIndex + 1]);
    nextCard.id = "next-card";
    nextCard.style.zIndex = 1;
    nextCard.style.transform = "scale(0.95)";
    nextCard.style.pointerEvents = "none";
    deck.appendChild(nextCard);
  }

  const row = dataRows[swipeIndex];
  const card = buildSwipeCard(row);
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
  let wasDrag = false;

  card.addEventListener("pointerdown", (e) => {
    startX = e.clientX;
    startY = e.clientY;
    dragging = true;
    wasDrag = false;
    card.setPointerCapture(e.pointerId);
    card.style.transition = "none";
  });

  card.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    if (Math.abs(currentX) > 4 || Math.abs(currentY) > 4) wasDrag = true;

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

  card.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;

    if (Math.abs(currentX) > 100) {
      doSwipe(card, currentX > 0 ? "preserve" : "dispose");
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

  card.addEventListener("click", () => {
    if (!wasDrag) {
      location.hash = `#/item/${swipeIndex}`;
    }
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
  const targetX = action === "preserve" ? 900 : -900;
  const rot = action === "preserve" ? 20 : -20;

  card.style.transition = "transform 0.4s ease, opacity 0.35s ease";
  card.style.transform = `translate(${targetX}px, -20px) rotate(${rot}deg)`;
  card.style.opacity = "0";
  updateSwipeLabels(0);

  const nextCard = document.getElementById("next-card");
  if (nextCard) {
    nextCard.style.transition = "transform 0.4s ease";
    nextCard.style.transform = "scale(1)";
  }

  setTimeout(() => {
    swipeIndex++;
    swipeCount++;
    if (swipeCount >= 5) {
      document.getElementById("see-all-cta").hidden = false;
    }
    renderDeck();
  }, 420);
}

function updateSwipeCounter() {
  const el = document.getElementById("swipe-counter");
  const current = Math.min(swipeIndex + 1, dataRows.length);
  el.textContent = `${current} / ${dataRows.length}`;
}

// ── detail view ───────────────────────────

function renderDeathCert(row, idx) {
  const cert = document.getElementById("death-cert");
  cert.innerHTML = "";

  const link = row[KEYS.link] || "";
  const cat = row[KEYS.cat] || "";
  const loc = row[KEYS.location] || "";
  const date = row[KEYS.date] || "";
  const catC = catColor(cat);
  const metaParts = [loc, date].filter(Boolean);

  if (link) {
    const frameWrap = document.createElement("div");
    frameWrap.className = "detail-frame-wrap";

    const iframe = document.createElement("iframe");
    iframe.src = link;
    iframe.className = "detail-frame";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox");
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("title", row[KEYS.project]);

    frameWrap.appendChild(iframe);
    cert.appendChild(frameWrap);
  }

  const info = document.createElement("div");
  info.className = "detail-info";
  if (cat) info.style.borderTop = `3px solid ${catC.bg}`;
  info.innerHTML = `
    <div class="detail-name-row">
      <p class="card-name">${row[KEYS.project]}</p>
      ${link ? `<a class="detail-frame-fallback" href="${link}" target="_blank" rel="noopener" onclick="event.stopPropagation()">이 페이지가 안보이시나요?</a>` : ""}
    </div>
    ${metaParts.length ? `<p class="card-meta">${metaParts.join("  ·  ")}</p>` : ""}
  `;
  cert.appendChild(info);
}

// ── archive grid ──────────────────────

function initArchive() {
  const grid = document.getElementById("grid");
  let cardIndex = 0;

  dataRows.forEach((row, idx) => {
    const card = document.createElement("div");
    card.className = "card";

    const body = document.createElement("div");
    body.className = "card-body";

    const date = row[KEYS.date] || "";
    const cat = row[KEYS.cat] || "";
    const loc = row[KEYS.location] || "";
    const calc = row[KEYS.calc] || "";
    const state = row[KEYS.state] || "";
    const link = row[KEYS.link] || "";

    const catBadge = cat ? makeBadge(cat, catColor(cat)) : "";
    const stateBadge = state ? makeBadge(state, stateColor(state)) : "";
    const metaParts = [loc, date].filter(Boolean);

    card.dataset.state = state;
    card.dataset.cat = cat;
    card.dataset.date = date;
    card.dataset.calc = calc;
    card.dataset.index = cardIndex++;
    if (cat) card.style.borderTop = `3px solid ${catColor(cat).bg}`;

    body.innerHTML = `
      <div class="badge-row">${stateBadge}${catBadge}</div>
      <p class="project-name">${row[KEYS.project]}</p>
      ${metaParts.length ? `<p class="project-meta">${metaParts.join("  ")}</p>` : ""}
      ${calc ? `<p class="project-calc" style="background:${catColor(cat).bg};color:${catColor(cat).text}">하강폭 ${calc}%</p>` : ""}
      ${link ? `<p class="project-link"><a href="${link}" target="_blank" rel="noopener" onclick="event.stopPropagation()">바로가기 →</a></p>` : ""}
    `;

    card.appendChild(body);

    card.addEventListener("click", () => {
      location.hash = `#/item/${idx}`;
    });

    grid.appendChild(card);
  });

  // ── filter ──────────────────────────────
  const uniq = (key) => [
    ...new Set(dataRows.map((r) => r[key]).filter(Boolean)),
  ];
  const activeFilters = { cat: null };

  function applyFilters() {
    grid.querySelectorAll(".card").forEach((card) => {
      const ok = !activeFilters.cat || card.dataset.cat === activeFilters.cat;
      card.style.display = ok ? "" : "none";
    });
  }

  function applySort(key) {
    const cards = [...grid.querySelectorAll(".card")];
    cards.sort((a, b) => {
      if (key === "calc-desc")
        return (
          (parseFloat(b.dataset.calc) || 0) - (parseFloat(a.dataset.calc) || 0)
        );
      if (key === "calc-asc")
        return (
          (parseFloat(a.dataset.calc) || 0) - (parseFloat(b.dataset.calc) || 0)
        );
      if (key === "date-desc")
        return (
          (parseFloat(b.dataset.date) || 0) - (parseFloat(a.dataset.date) || 0)
        );
      if (key === "date-asc")
        return (
          (parseFloat(a.dataset.date) || 0) - (parseFloat(b.dataset.date) || 0)
        );
      return a.dataset.index - b.dataset.index;
    });
    cards.forEach((c) => grid.appendChild(c));
  }

  function buildGroup(groupId, values, filterKey, colorFn) {
    const group = document.getElementById(groupId);
    if (!values.length) return;
    values.forEach((val) => {
      const pill = document.createElement("button");
      pill.className = "filter-pill";
      pill.textContent = val;
      if (colorFn) {
        const c = colorFn(val);
        pill.classList.add("colored-pill");
        pill.style.background = c.bg;
        pill.style.color = c.text;
      }
      pill.addEventListener("click", () => {
        if (activeFilters[filterKey] === val) {
          activeFilters[filterKey] = null;
          pill.classList.remove("active");
        } else {
          group
            .querySelectorAll(".filter-pill")
            .forEach((p) => p.classList.remove("active"));
          activeFilters[filterKey] = val;
          pill.classList.add("active");
        }
        const hasAny = Object.values(activeFilters).some((v) => v !== null);
        document
          .getElementById("filter-all")
          .classList.toggle("active", !hasAny);
        applyFilters();
      });
      group.appendChild(pill);
    });
  }

  buildGroup("filter-group-cat", uniq(KEYS.cat), "cat", catColor);

  document.getElementById("filter-all").addEventListener("click", () => {
    Object.keys(activeFilters).forEach((k) => (activeFilters[k] = null));
    document
      .querySelectorAll(".filter-bar .filter-pill:not(.sort-pill)")
      .forEach((p) => p.classList.remove("active"));
    document.getElementById("filter-all").classList.add("active");
    applyFilters();
  });

  document.querySelectorAll(".sort-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const wasActive = pill.classList.contains("active");
      document
        .querySelectorAll(".sort-pill")
        .forEach((p) => p.classList.remove("active"));
      if (wasActive) {
        applySort("default");
      } else {
        pill.classList.add("active");
        applySort(pill.dataset.sort);
      }
    });
  });
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

    document.title = allRows[0]?.[KEYS.title] || "Archive of Has-Beens";

    const uniqueCats = [
      ...new Set(dataRows.map((r) => r[KEYS.cat]).filter(Boolean)),
    ];
    buildCatColorMap(uniqueCats);

    document.querySelectorAll(".info-cat-badge").forEach((el) => {
      const c = catColor(el.dataset.cat);
      el.style.background = c.bg;
      el.style.color = c.text;
    });

    renderDeck();

    initArchive();

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

    window.addEventListener("hashchange", route);
    route();

    // ── arrow cursor tooltips ──────────────
    const cursorTooltip = document.createElement("div");
    cursorTooltip.className = "cursor-tooltip";
    cursorTooltip.hidden = true;
    document.body.appendChild(cursorTooltip);

    function attachArrowTooltip(btn, text, bg, color) {
      btn.addEventListener("mouseenter", (e) => {
        cursorTooltip.textContent = text;
        cursorTooltip.style.background = bg;
        cursorTooltip.style.color = color;
        cursorTooltip.hidden = false;
        cursorTooltip.style.left = e.clientX + 18 + "px";
        cursorTooltip.style.top = e.clientY - 14 + "px";
      });
      btn.addEventListener("mousemove", (e) => {
        cursorTooltip.style.left = e.clientX + 18 + "px";
        cursorTooltip.style.top = e.clientY - 14 + "px";
      });
      btn.addEventListener("mouseleave", () => {
        cursorTooltip.hidden = true;
      });
    }

    attachArrowTooltip(document.getElementById("btn-dispose"), "한물감", "#ff8a8a", "#7a2a2a");
    attachArrowTooltip(document.getElementById("btn-preserve"), "아직 한물가지 않음", "#8ab3ff", "#28287a");
  })
  .catch((err) => {
    console.error("Error:", err);
    document.getElementById("swipe-deck").innerHTML = `
      <p style="color:var(--stamp-red);font-family:var(--font-serif);padding:2rem;text-align:center">
        데이터 로드 실패.<br>
        <small style="font-size:0.75rem">① 스프레드시트 공유 설정 확인<br>② Live Server 또는 GitHub Pages로 실행</small>
      </p>`;
  });
