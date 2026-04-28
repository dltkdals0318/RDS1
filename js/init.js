// ── loading helpers ───────────────────────

function updateLoadingProgress() {}

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
  if (!screen || screen.classList.contains("loading-ready")) return;
  screen.classList.add("loading-ready");
  screen.addEventListener(
    "click",
    () => {
      screen.classList.add("loading-done");
      setTimeout(() => {
        screen.hidden = true;
      }, 520);
    },
    { once: true },
  );
}

// ── modal helper ─────────────────────────

function makeModal(overlayId, closeId) {
  const overlay = document.getElementById(overlayId);
  const closeBtn = document.getElementById(closeId);
  function close() {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });
  return {
    open() {
      overlay.hidden = false;
      document.body.style.overflow = "hidden";
    },
  };
}

const infoModal = makeModal("info-overlay", "info-close");
const howToPlayModal = makeModal("how-to-play-overlay", "how-to-play-close");

document
  .getElementById("info-btn")
  .addEventListener("click", () => infoModal.open());
document
  .getElementById("info-btn-results")
  .addEventListener("click", () => infoModal.open());
document
  .getElementById("how-to-play-btn")
  .addEventListener("click", () => howToPlayModal.open());

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
attachTiltClick(document.getElementById("how-to-play-btn"));
attachTiltClick(document.getElementById("info-btn"));
attachTiltClick(document.getElementById("info-btn-results"));

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
  document.getElementById("nav-swipe").hidden = id !== "view-swipe";
  document.getElementById("nav-results").hidden = id !== "view-results";
  document.getElementById("nav-archive").hidden =
    id === "view-swipe" || id === "view-results";
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
  } else if (hash === "#/results") {
    showView("view-results");
    renderResults();
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

    // swipe subset
    swipeRows = dataRows
      .map((row, i) => ({ ...row, _dataIdx: i }))
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(SWIPE_DECK_SIZE, dataRows.length));

    // preload
    const imagesToLoad = swipeRows.filter((r) => r._image).map((r) => r._image);
    if (imagesToLoad.length === 0) {
      updateLoadingProgress(1, 1);
      setTimeout(readyLoadingScreen, 300);
    } else {
      let loaded = 0;
      imagesToLoad.forEach((src) => {
        const img = new Image();
        img.onload = img.onerror = () => {
          loaded++;
          updateLoadingProgress(loaded, imagesToLoad.length);
          if (loaded >= imagesToLoad.length) readyLoadingScreen();
        };
        img.src = src;
      });
    }

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
    hideLoadingScreen();
    document.getElementById("swipe-deck").innerHTML = `
      <p style="color:var(--red);font-family:var(--font-sans);padding:2rem;text-align:center">
        데이터 로드 실패.
      </p>`;
  });

// ── dev keyboard shortcuts (1~4) ─────────

document.addEventListener("keydown", (e) => {
  const tag = document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (e.key === "1") {
    const screen = document.getElementById("loading-screen");
    screen.classList.remove("loading-done", "loading-ready");
    screen.hidden = false;
    setTimeout(readyLoadingScreen, 1200);
  } else if (e.key === "2") {
    location.hash = "#/";
  } else if (e.key === "3") {
    location.hash = "#/results";
  } else if (e.key === "4") {
    location.hash = "#/archive";
  }
});
