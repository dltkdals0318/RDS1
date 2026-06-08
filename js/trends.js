const _trendCache = {};

/**
 * @param {string} file
 * @param {string} column
 * @returns {Promise<{date:string, value:number}[]|null>}
 */
async function fetchTrendSeries(file, column) {
  const cacheKey = `${file}::${column}`;
  if (_trendCache[cacheKey]) return _trendCache[cacheKey];

  try {
    const res = await fetch(file);
    if (!res.ok) {
      console.warn(`[trend] fetch 실패 (${res.status}): ${file}`);
      return null;
    }
    const text = await res.text();
    const lines = text.trim().split("\n");

    let headerIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim().replace(/"/g, "");
      if (l && !l.startsWith("카테고리") && !l.startsWith("Category")) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) return null;

    const rawHeaders = splitCSVLine(lines[headerIdx]).map((h) =>
      h.trim().replace(/"/g, ""),
    );
    const cleanHeaders = rawHeaders.map((h) => h.replace(/\s*:.*$/, "").trim());

    const colIdx = cleanHeaders.findIndex((h) => h === column);
    if (colIdx < 0) {
      console.warn(`[trends] 컬럼 "${column}" 없음. 사용 가능:`, cleanHeaders);
      return null;
    }

    const series = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = splitCSVLine(line).map((v) => v.trim().replace(/"/g, ""));
      const date = values[0];
      const val = parseFloat(values[colIdx]);
      if (date && !isNaN(val)) series.push({ date, value: val });
    }

    if (!series.length) return null;

    const max = Math.max(...series.map((r) => r.value));
    if (max <= 0) return null;

    const normalized = series.map((r) => ({
      date: r.date,
      value: Math.round((r.value / max) * 100),
    }));

    _trendCache[cacheKey] = normalized;
    return normalized;
  } catch (e) {
    console.warn("트렌드 로드 실패:", file, column, e);
    return null;
  }
}

// ── Catmull-Rom → Cubic Bezier ──────────────────
function _smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[Math.min(pts.length - 1, i + 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * @param {{date:string, value:number}[]} series
 * @param {{bg:string, text:string}} catC
 */
function makeTrendSVGFromData(series, catC) {
  const W = 300,
    H = 100;
  const padL = 2,
    padR = 2,
    padT = 10,
    padB = 4;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = series.length;

  const pts = series.map((p, i) => ({
    x: padL + (i / (n - 1)) * plotW,
    y: padT + plotH - (Math.min(p.value, 100) / 100) * plotH,
    date: p.date,
    value: p.value,
  }));

  const peakIdx = pts.reduce(
    (mi, p, i) => (p.value > pts[mi].value ? i : mi),
    0,
  );
  const baseY = (H - padB).toFixed(1);
  const linePath = _smoothPath(pts);
  const fillPath = `${linePath} L ${pts[n - 1].x.toFixed(1)},${baseY} L ${pts[0].x.toFixed(1)},${baseY} Z`;

  const color = '#ff5b5b';
  const gradId = `tgr-${Math.random().toString(36).slice(2, 7)}`;

  return `
    <div class="trend-graph-wrap">
      <svg class="trend-graph-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.06"/>
          </linearGradient>
        </defs>
        <path d="${fillPath}" fill="url(#${gradId})"/>
        <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `;
}

// ── synthetic series (for items without real CSV data) ───
function makeSyntheticSeries(date, calc) {
  const calcVal = Math.max(0, parseFloat(calc) || 75);
  const endRatio = (100 - calcVal) / 100;
  const n = 24;
  const series = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let value;
    if (t <= 0.35) {
      value = Math.sin((t / 0.35) * (Math.PI / 2)) * 100;
    } else {
      const fallT = (t - 0.35) / 0.65;
      value = 100 - fallT * (1 - endRatio) * 100;
    }
    series.push({ date: `pt-${i}`, value: Math.round(value) });
  }
  return series;
}

// ── hover ────────────────────────────────────────────────
/**
 * @param {HTMLElement} graphWrap - .trend-graph-wrap
 * @param {{date:string, value:number}[]} series
 * @param {{bg:string, text:string}} catC
 */
function initTrendHover(graphWrap, series, catC) {
  const svg = graphWrap.querySelector("svg");
  if (!svg) return;

  const ns = "http://www.w3.org/2000/svg";
  const W = 300,
    H = 100;
  const padL = 2,
    padT = 10,
    padB = 4;
  const plotW = W - padL - 2;
  const plotH = H - padT - padB;
  const n = series.length;
  const baseY = H - padB;

  const cursorLine = document.createElementNS(ns, "line");
  cursorLine.setAttribute("y1", String(padT));
  cursorLine.setAttribute("y2", String(baseY));
  cursorLine.setAttribute("stroke", '#ff5b5b');
  cursorLine.setAttribute("stroke-width", "1");
  cursorLine.setAttribute("stroke-dasharray", "4,3");
  cursorLine.setAttribute("opacity", "0.8");
  cursorLine.style.display = "none";
  svg.appendChild(cursorLine);

  const overlay = document.createElementNS(ns, "rect");
  overlay.setAttribute("x", "0");
  overlay.setAttribute("y", "0");
  overlay.setAttribute("width", String(W));
  overlay.setAttribute("height", String(H));
  overlay.setAttribute("fill", "transparent");
  svg.appendChild(overlay);

  // tooltip
  graphWrap.style.position = "relative";
  const tooltip = document.createElement("div");
  tooltip.className = "trend-tooltip";
  tooltip.style.background = '#ff5b5b';
  tooltip.style.color = '#fff';
  graphWrap.appendChild(tooltip);

  function toSVGX(clientX) {
    const r = svg.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * W;
  }

  function update(svgX) {
    const ratio = Math.max(0, Math.min(1, (svgX - padL) / plotW));
    const idx = Math.round(ratio * (n - 1));
    const p = series[idx];
    const ptX = padL + (idx / (n - 1)) * plotW;
    const ptY = padT + plotH - (Math.min(p.value, 100) / 100) * plotH;

    cursorLine.setAttribute("x1", ptX);
    cursorLine.setAttribute("x2", ptX);
    cursorLine.style.display = "";

    // date format
    const parts = p.date.split("-");
    tooltip.textContent = `${parts[0]}년 ${parts[1]}월: ${p.value}`;

    const pct = (ptX / W) * 100;
    tooltip.style.left = `${pct}%`;
    tooltip.style.transform =
      pct > 68 ? "translateX(-108%)" : "translateX(6px)";
    tooltip.style.display = "block";
  }

  overlay.addEventListener("mousemove", (e) => update(toSVGX(e.clientX)));
  overlay.addEventListener("mouseleave", () => {
    cursorLine.style.display = "none";
    tooltip.style.display = "none";
  });
}
