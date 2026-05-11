// customize.js — p5.js 기반 브러쉬 + 도장 기능

(function () {
  "use strict";

  const BG_COLOR = "#ffffff";
  const ASPECT = 540 / 900; // height / width ratio
  const STAMP_SIZES = { 3: 80, 9: 140, 22: 220 };
  const COLOR_PALETTE = [
    "#ff8a8a", "#ffaf83", "#ffe596", "#a3ff97",
    "#8afff9", "#8ab3ff", "#bd8aff", "#ff8ae2", "#111111",
  ];

  let pInst = null;

  // ── p5 인스턴스 초기화 (최초 1회) ────────────────
  function initCustomizeP5() {
    const container = document.getElementById("customize-canvas-wrap");
    if (!container || pInst) return;

    let tool = "pen";
    let brushSize = 3;
    let currentColor = "#111111";
    let stampSrc = null;
    const imgCache = {};

    const sketch = (p) => {
      let pg; // 드로잉이 누적되는 오프스크린 버퍼
      let prevX = 0, prevY = 0;
      let isDrawing = false;
      let CW, CH;

      p.setup = function () {
        p.pixelDensity(1);
        CW = container.offsetWidth || 900;
        CH = Math.round(CW * ASPECT);
        const cnv = p.createCanvas(CW, CH);
        cnv.parent(container);
        Object.assign(cnv.elt.style, {
          display: "block",
          touchAction: "none",
          cursor: "crosshair",
        });

        pg = p.createGraphics(CW, CH);
        pg.background(BG_COLOR);
        p.noLoop();
      };

      p.draw = function () {
        p.image(pg, 0, 0);
      };

      // ── 마우스 ──────────────────────────────────
      p.mousePressed = function () {
        if (!inCanvas()) return;
        if (tool === "stamp") { placeStamp(p.mouseX, p.mouseY); return; }
        isDrawing = true;
        prevX = p.mouseX; prevY = p.mouseY;
        // 점 하나 찍기
        dotAt(p.mouseX, p.mouseY);
        p.redraw();
      };

      p.mouseDragged = function () {
        if (!isDrawing || !inCanvas()) return;
        applyBrush(prevX, prevY, p.mouseX, p.mouseY);
        p.redraw();
        prevX = p.mouseX; prevY = p.mouseY;
      };

      p.mouseReleased = function () { isDrawing = false; };

      // ── 터치 (스크롤 방지) ───────────────────────
      p.touchStarted = function () {
        if (!inCanvas()) return false;
        if (tool === "stamp") { placeStamp(p.mouseX, p.mouseY); return false; }
        isDrawing = true;
        prevX = p.mouseX; prevY = p.mouseY;
        dotAt(p.mouseX, p.mouseY);
        p.redraw();
        return false;
      };

      p.touchMoved = function () {
        if (!isDrawing) return false;
        applyBrush(prevX, prevY, p.mouseX, p.mouseY);
        p.redraw();
        prevX = p.mouseX; prevY = p.mouseY;
        return false;
      };

      p.touchEnded = function () { isDrawing = false; return false; };

      // ── 헬퍼 ────────────────────────────────────
      function inCanvas() {
        return p.mouseX >= 0 && p.mouseX <= CW &&
               p.mouseY >= 0 && p.mouseY <= CH;
      }

      function dotAt(x, y) {
        if (tool === "eraser") {
          pg.noStroke(); pg.fill(BG_COLOR);
          pg.ellipse(x, y, brushSize * 6);
          return;
        }
        const col = p.color(currentColor);
        if (tool === "pen") {
          pg.noStroke(); pg.fill(col);
          pg.ellipse(x, y, brushSize);
        } else if (tool === "marker") {
          const mc = p.color(p.red(col), p.green(col), p.blue(col), 90);
          pg.noStroke(); pg.fill(mc);
          pg.rect(x - brushSize * 4, y - brushSize * 4, brushSize * 8, brushSize * 8);
        } else if (tool === "brush") {
          for (let i = 0; i < 6; i++) {
            const a = p.random(90, 200);
            const bc = p.color(p.red(col), p.green(col), p.blue(col), a);
            pg.noStroke(); pg.fill(bc);
            pg.ellipse(x + p.random(-brushSize, brushSize),
                       y + p.random(-brushSize, brushSize),
                       p.random(1, brushSize * 0.8));
          }
        }
      }

      function applyBrush(x1, y1, x2, y2) {
        const col = p.color(currentColor);

        if (tool === "pen") {
          // 깔끔한 선
          pg.noFill();
          pg.stroke(col);
          pg.strokeWeight(brushSize);
          pg.strokeCap(p.ROUND);
          pg.line(x1, y1, x2, y2);

        } else if (tool === "marker") {
          // 반투명 넓은 형광펜
          const mc = p.color(p.red(col), p.green(col), p.blue(col), 90);
          pg.noFill();
          pg.stroke(mc);
          pg.strokeWeight(brushSize * 8);
          pg.strokeCap(p.SQUARE);
          pg.line(x1, y1, x2, y2);

        } else if (tool === "brush") {
          // 브리슬 브러쉬: 여러 가닥이 랜덤 산포
          const d = p.dist(x1, y1, x2, y2);
          const steps = Math.max(1, Math.floor(d / 3));
          const bristles = Math.max(6, brushSize * 2);

          for (let i = 0; i <= steps; i++) {
            const t = steps === 0 ? 0 : i / steps;
            const bx = p.lerp(x1, x2, t);
            const by = p.lerp(y1, y2, t);
            for (let b = 0; b < bristles; b++) {
              const scatter = brushSize * 2;
              const alpha = p.random(50, 180);
              const bc = p.color(p.red(col), p.green(col), p.blue(col), alpha);
              pg.stroke(bc);
              pg.strokeWeight(p.random(0.4, 1.8));
              pg.noFill();
              pg.line(
                bx + p.random(-scatter, scatter),
                by + p.random(-scatter, scatter),
                bx + p.random(-scatter * 0.4, scatter * 0.4),
                by + p.random(-scatter * 0.4, scatter * 0.4),
              );
            }
          }

        } else if (tool === "eraser") {
          pg.noFill();
          pg.stroke(p.color(BG_COLOR));
          pg.strokeWeight(brushSize * 6);
          pg.strokeCap(p.ROUND);
          pg.line(x1, y1, x2, y2);
        }
      }

      function placeStamp(x, y) {
        if (!stampSrc) return;
        const sz = STAMP_SIZES[brushSize] || 120;

        if (imgCache[stampSrc]) {
          drawStampImg(imgCache[stampSrc], x, y, sz);
          p.redraw();
        } else {
          p.loadImage(stampSrc, (img) => {
            imgCache[stampSrc] = img;
            drawStampImg(img, x, y, sz);
            p.redraw();
          });
        }
      }

      function drawStampImg(img, x, y, sz) {
        const ratio = img.width > 0 ? img.height / img.width : 1;
        pg.image(img, x - sz / 2, y - (sz * ratio) / 2, sz, sz * ratio);
      }

      // ── 외부에서 제어할 API ──────────────────────
      p.setTool   = (t) => { tool = t; };
      p.setSize   = (s) => { brushSize = s; };
      p.setColor  = (c) => { currentColor = c; };
      p.setStamp  = (src) => { stampSrc = src; tool = "stamp"; };
      p.clearCanvas = () => {
        pg.clear();
        pg.background(BG_COLOR);
        p.redraw();
      };
    };

    pInst = new p5(sketch, container);
    wireUI();
  }

  // ── UI 이벤트 연결 ────────────────────────────
  function wireUI() {
    // 도구 버튼
    document.querySelectorAll("#customize-section [data-tool]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setActiveToolBtn(btn);
        pInst.setTool(btn.dataset.tool);
      });
    });

    // 크기 버튼
    document.querySelectorAll("#customize-section [data-size]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#customize-section [data-size]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        pInst.setSize(parseInt(btn.dataset.size));
      });
    });

    // 색상 팔레트
    buildColorPalette();

    // 초기화
    const clearBtn = document.getElementById("tool-clear");
    if (clearBtn) clearBtn.addEventListener("click", () => pInst.clearCanvas());
  }

  function buildColorPalette() {
    const el = document.getElementById("color-palette");
    if (!el) return;
    el.innerHTML = "";
    COLOR_PALETTE.forEach((c, i) => {
      const sw = document.createElement("button");
      sw.className = "color-swatch" + (i === 0 ? " active" : "");
      sw.style.background = c;
      if (c === "#ffffff") sw.style.outline = "1px solid #c8c8c4";
      sw.addEventListener("click", () => {
        document.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
        sw.classList.add("active");
        if (pInst) pInst.setColor(c);
        // 도장 모드였으면 펜으로 복귀
        const hasActiveTool = document.querySelector("#customize-section [data-tool].active");
        if (!hasActiveTool) {
          const penBtn = document.querySelector("#customize-section [data-tool='pen']");
          if (penBtn) penBtn.click();
        }
      });
      el.appendChild(sw);
    });
  }

  // ── 도장 팔레트 (안다고 답한 이미지) ───────────
  function buildStampPalette() {
    const el = document.getElementById("stamp-palette");
    if (!el) return;
    el.innerHTML = "";

    const stamps = swipeResults
      .filter((r) => r.action === "dispose" && r.row._image)
      .map((r) => ({ src: r.row._image, name: r.row[KEYS.project] }));

    if (stamps.length === 0) {
      el.innerHTML = `<span class="stamp-empty">안다고 답한 유행템이 없습니다.</span>`;
      return;
    }

    stamps.forEach(({ src, name }) => {
      const btn = document.createElement("button");
      btn.className = "stamp-btn";
      btn.title = name;
      const img = document.createElement("img");
      img.src = src;
      img.alt = name;
      img.draggable = false;
      btn.appendChild(img);
      btn.addEventListener("click", () => {
        deactivateAll();
        btn.classList.add("active");
        if (pInst) pInst.setStamp(src);
      });
      el.appendChild(btn);
    });
  }

  // ── 헬퍼 ────────────────────────────────────
  function setActiveToolBtn(activeBtn) {
    document.querySelectorAll("#customize-section [data-tool]")
      .forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".stamp-btn")
      .forEach((b) => b.classList.remove("active"));
    activeBtn.classList.add("active");
  }

  function deactivateAll() {
    document.querySelectorAll("#customize-section [data-tool]")
      .forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".stamp-btn")
      .forEach((b) => b.classList.remove("active"));
  }

  // ── 외부 진입점 ─────────────────────────────
  window._initCustomize = function () {
    initCustomizeP5();     // 최초 1회만 실행됨
    buildStampPalette();   // 결과 페이지 방문마다 갱신
  };

  // 페이지 최초 로드 시 이미 #/customize 면 즉시 초기화
  if (location.hash === "#/customize") {
    window._initCustomize();
  }
})();
