// ── info modal ───────────────────────────

const infoBtn = document.getElementById("info-btn");
const infoOverlay = document.getElementById("info-overlay");
const infoClose = document.getElementById("info-close");

function closeModal() {
  infoOverlay.hidden = true;
  document.body.style.overflow = "";
}
infoBtn.addEventListener("click", () => {
  infoOverlay.hidden = false;
  document.body.style.overflow = "hidden";
});
infoClose.addEventListener("click", closeModal);
infoOverlay.addEventListener("click", (e) => {
  if (e.target === infoOverlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !infoOverlay.hidden) closeModal();
});

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

attachTiltClick(document.querySelector(".nav-logo"));
attachTiltClick(document.querySelector(".nav-link"));
attachTiltClick(infoBtn);

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

    // preload
    Object.values(CARD_IMAGES).forEach((src) => {
      const img = new Image();
      img.src = src;
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

    attachArrowTooltip(
      document.getElementById("btn-dispose"),
      "한물감",
      "#ff8a8a",
      "#7a2a2a",
    );
    attachArrowTooltip(
      document.getElementById("btn-preserve"),
      "잘나감",
      "#8ab3ff",
      "#28287a",
    );
  })
  .catch((err) => {
    console.error("Error:", err);
    document.getElementById("swipe-deck").innerHTML = `
      <p style="color:var(--red);font-family:var(--font-sans);padding:2rem;text-align:center">
        데이터 로드 실패.<br>
        <small style="font-size:0.75rem">① 스프레드시트 공유 설정 확인<br>② Live Server 또는 GitHub Pages로 실행</small>
      </p>`;
  });
