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

function buildCatColorMap(cats) {
  cats.forEach((cat, i) => {
    catColorMap.set(cat, CAT_COLORS[i % CAT_COLORS.length]);
  });
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

fetch(CSV_URL)
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  })
  .then((text) => {
    const rows = parseCSV(text);
    const first = rows[0] || {};

    document.getElementById("site-title").textContent = first[KEYS.title] || "";
    document.getElementById("site-desc").textContent =
      first[KEYS.description] || "";
    document.getElementById("about-text").textContent = first[KEYS.about] || "";
    document.title = first[KEYS.title] || "";

    const grid = document.getElementById("grid");

    const uniqueCats = [
      ...new Set(rows.map((r) => r[KEYS.cat]).filter(Boolean)),
    ];
    buildCatColorMap(uniqueCats);

    let cardIndex = 0;
    rows.forEach((row) => {
      if (!row[KEYS.project]) return;

      const card = document.createElement("div");
      card.className = "card";

      const body = document.createElement("div");
      body.className = "card-body";

      const date = row[KEYS.date] || "";
      const cat = row[KEYS.cat] || "";
      const location = row[KEYS.location] || "";
      const calc = row[KEYS.calc] || "";
      const state = row[KEYS.state] || "";
      const link = row[KEYS.link] || "";

      const catBadge = cat ? makeBadge(cat, catColor(cat)) : "";
      const stateBadge = state ? makeBadge(state, stateColor(state)) : "";

      const metaParts = [location, date].filter(Boolean);

      card.dataset.state = state;
      card.dataset.cat = cat;
      card.dataset.date = date;
      card.dataset.calc = calc;
      card.dataset.index = cardIndex++;

      body.innerHTML = `
        <div class="badge-row">${stateBadge}${catBadge}</div>
        <p class="project-name">${row[KEYS.project]}</p>
        ${metaParts.length ? `<p class="project-meta">${metaParts.join("  ")}</p>` : ""}
        ${calc ? `<p class="project-calc">${calc}</p>` : ""}
        ${link ? `<p class="project-link"><a href="${link}" target="_blank" rel="noopener">바로가기 →</a></p>` : ""}
      `;

      card.appendChild(body);
      grid.appendChild(card);
    });

    // ── Filter ──────────────────────────────────────
    const dataRows = rows.filter((r) => r[KEYS.project]);
    const uniq = (key) => [
      ...new Set(dataRows.map((r) => r[key]).filter(Boolean)),
    ];

    const activeFilters = { cat: null };

    function applyFilters() {
      grid.querySelectorAll(".card").forEach((card) => {
        const ok =
          !activeFilters.cat || card.dataset.cat === activeFilters.cat;
        card.style.display = ok ? "" : "none";
      });
    }

    function applySort(key) {
      const cards = [...grid.querySelectorAll(".card")];
      cards.sort((a, b) => {
        if (key === "calc-desc")
          return (
            (parseFloat(b.dataset.calc) || 0) -
            (parseFloat(a.dataset.calc) || 0)
          );
        if (key === "calc-asc")
          return (
            (parseFloat(a.dataset.calc) || 0) -
            (parseFloat(b.dataset.calc) || 0)
          );
        if (key === "date-desc")
          return (
            (parseFloat(b.dataset.date) || 0) -
            (parseFloat(a.dataset.date) || 0)
          );
        if (key === "date-asc")
          return (
            (parseFloat(a.dataset.date) || 0) -
            (parseFloat(b.dataset.date) || 0)
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
    // ─────────────────────────────────────────────
  })
  .catch((err) => {
    console.error("Error:", err);
    document.getElementById("grid").innerHTML = `<p style="color:red">
      Failed to load data.<br>
      ① Check sharing settings — set to "Anyone with the link (Viewer)"<br>
      ② Check Spreadsheet ID<br>
      ③ Open with Live Server or GitHub Pages (file:// won't work)
    </p>`;
  });
