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
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox",
    );
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

  if (swipeIndex >= swipeRows.length) {
    deck.innerHTML = `
      <div class="deck-complete">
        <p class="deck-empty">모든 항목을 판결했습니다.</p>
        <a href="#/results" class="see-all-cta">나의 리스트 보기 →</a>
      </div>`;
    updateSwipeCounter();
    return;
  }

  if (swipeIndex + 1 < swipeRows.length) {
    const nextCard = buildSwipeCard(swipeRows[swipeIndex + 1]);
    nextCard.id = "next-card";
    nextCard.style.zIndex = 1;
    nextCard.style.transform = "scale(0.95)";
    nextCard.style.pointerEvents = "none";
    deck.appendChild(nextCard);
  }

  const row = swipeRows[swipeIndex];
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
    swipeResults.push({ row: swipeRows[swipeIndex], action });
    swipeIndex++;
    renderDeck();
  }, 420);
}

function updateSwipeCounter() {
  const el = document.getElementById("swipe-counter");
  const current = Math.min(swipeIndex + 1, swipeRows.length);
  el.textContent = `${current} / ${swipeRows.length}`;
}

// ── results view ──────────────────────────

function renderResults() {
  const grid = document.getElementById("results-grid");
  grid.innerHTML = "";

  const disposed = swipeResults.filter((r) => r.action === "dispose");
  const preserved = swipeResults.filter((r) => r.action === "preserve");

  function buildCard(row) {
    const cat = row[KEYS.cat] || "";
    const loc = row[KEYS.location] || "";
    const date = row[KEYS.date] || "";
    const calc = row[KEYS.calc] || "";
    const link = row[KEYS.link] || "";
    const catC = catColor(cat);
    const metaParts = [loc, date].filter(Boolean);

    const card = document.createElement("div");
    card.className = "card";
    if (cat) card.style.borderTop = `3px solid ${catC.bg}`;

    const body = document.createElement("div");
    body.className = "card-body";
    body.innerHTML = `
      <div class="badge-row">${cat ? makeBadge(cat, catC) : ""}</div>
      <p class="project-name">${row[KEYS.project]}</p>
      ${metaParts.length ? `<p class="project-meta">${metaParts.join("  ")}</p>` : ""}
      ${calc ? `<p class="project-calc" style="background:${catC.bg};color:${catC.text}">하강폭 ${calc}%</p>` : ""}
      ${link ? `<p class="project-link"><a href="${link}" target="_blank" rel="noopener" onclick="event.stopPropagation()">바로가기 →</a></p>` : ""}
    `;
    card.appendChild(body);
    card.addEventListener("click", () => {
      location.hash = `#/item/${row._dataIdx}`;
    });
    return card;
  }

  function buildSection(label, results) {
    const section = document.createElement("div");
    section.className = "results-section";

    const header = document.createElement("h2");
    header.className = "results-section-title";
    header.textContent = `${label} (${results.length})`;
    section.appendChild(header);

    if (results.length === 0) {
      const empty = document.createElement("p");
      empty.className = "results-empty";
      empty.textContent = "판결한 항목이 없습니다.";
      section.appendChild(empty);
    } else {
      const g = document.createElement("div");
      g.className = "results-grid";
      results.forEach(({ row }) => g.appendChild(buildCard(row)));
      section.appendChild(g);
    }
    return section;
  }

  grid.appendChild(buildSection("한물감", disposed));
  grid.appendChild(buildSection("잘나감", preserved));
}
