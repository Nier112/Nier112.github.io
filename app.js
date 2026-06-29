const state = {
  projects: [],
  filter: "All",
  motionReady: false,
};

const categoryOrder = [
  "All",
  "Web Design",
  "Corporate Website",
  "Brand Website",
  "Brand Identity",
  "Packaging",
  "Graphic Design",
  "Visual Design",
  "Photography",
];

const els = {
  header: document.querySelector(".site-header"),
  scrollProgress: document.querySelector(".scroll-progress"),
  apertureStrip: document.querySelector("#aperture-strip"),
  filterBar: document.querySelector("#filter-bar"),
  grid: document.querySelector("#work-grid"),
  workCount: document.querySelector("#work-count"),
  dialog: document.querySelector("#project-dialog"),
  dialogClose: document.querySelector("#dialog-close"),
  dialogImage: document.querySelector("#dialog-image"),
  dialogCategory: document.querySelector("#dialog-category"),
  dialogTitle: document.querySelector("#dialog-title"),
  dialogSummary: document.querySelector("#dialog-summary"),
  dialogYear: document.querySelector("#dialog-year"),
  dialogViews: document.querySelector("#dialog-views"),
  dialogAppreciations: document.querySelector("#dialog-appreciations"),
  dialogDetails: document.querySelector("#dialog-details"),
  dialogSource: document.querySelector("#dialog-source"),
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasGsap = Boolean(window.gsap);

const fallbackSummaries = {
  "2024.10.18 夜晚的你知道—台法跨域音樂共演 - 活動標準字設計": "台法跨域音樂共演活動標準字與視覺設計，聚焦活動識別、字形節奏與夜間演出氛圍。",
  "Landing page Design | color contact lens": "彩色隱形眼鏡銷售頁視覺設計，使用柔和商品影像與清楚的購買動線組織長頁內容。",
  "Eyewear Landing Page Design": "眼鏡品牌銷售頁設計，以商品攝影、留白與版面節奏建立輕盈的時尚感。",
  "Color contrast lens - Landing page Design": "彩片產品銷售頁設計，將色彩對比、產品特寫與段落式資訊整合為電商頁面。",
  "Logo Design - Marketlong Fresh | 馬農生鮮 標誌設計": "馬農生鮮品牌標誌設計，圍繞新鮮、宅配與高品質蔬果肉品配送建立品牌識別。",
  "質感木質音樂盒 - Wood Music box": "木質音樂盒產品視覺，透過材質、光影與簡潔構圖呈現商品質感。",
  "BANNER & Illustration": "Banner 與插畫視覺作品，整理商業宣傳素材中的主視覺與圖像語言。",
  "產品攝影 | 情境合成 - composed photo": "產品攝影與情境合成作品，將商品影像放入更完整的使用情境。",
  "銷售頁視覺設計 Landing Page Design - Baby Body wash": "嬰兒沐浴產品銷售頁，使用溫和色調與商品段落建立親膚、可信任的購物感受。",
  "Collagen Packaging Design - 美妍飲 - 包裝設計": "美妍飲膠原蛋白包裝設計，結合保健食品資訊與精緻包裝視覺。",
  "Master Tai - Chicken Essence Packaging Design 滴雞精包裝設計": "滴雞精品牌包裝設計，強調禮盒質感、滋補產品屬性與清楚的包裝層級。",
  "銷售頁視覺設計_Landing page Design": "Body Wash 銷售頁視覺設計，整合品牌、版面與商品展示的長頁編排。",
  "IC STUDIO VI DESIGN": "IC Studio 視覺識別設計，包含品牌標誌與 VI 系統的視覺延伸。",
  "NARRATE - business card design": "Narrate 名片設計，以紙品、排版與品牌色建立專業識別。"
};

function normalizeProject(project, source) {
  const added = source === "web";
  const title = project.title;
  const summary = fallbackSummaries[title] || project.summary || project.description || project.category;
  return {
    ...project,
    source,
    added,
    title,
    summary,
    details: (project.details || []).filter((item) => item && item !== "跳至主要內容").slice(0, 6),
    stats: project.stats || { appreciations: added ? "—" : 0, views: added ? "—" : 0 },
  };
}

function loadData() {
  const { behance, webWorks } = window.PORTFOLIO_DATA;
  const behanceProjects = behance.map((project) => normalizeProject(project, "behance"));
  const webProjects = webWorks.map((project) => normalizeProject({
    ...project,
    stats: { appreciations: "—", views: "—" },
  }, "web"));
  state.projects = [...webProjects, ...behanceProjects];
  els.workCount.textContent = String(state.projects.length);
  renderApertureStrip();
}

function renderApertureStrip() {
  if (!els.apertureStrip) return;
  els.apertureStrip.innerHTML = "";
  const frames = [];
  state.projects.slice(0, 4).forEach((project, index) => {
    const frame = document.createElement("button");
    frame.className = "aperture-frame";
    frame.type = "button";
    frame.dataset.index = String(index);
    frame.setAttribute("aria-label", project.title);
    const caption = project.category || "";
    frame.innerHTML = `
      <img src="${projectImage(project)}" alt="${escapeHtml(project.title)}" decoding="async">
      <span class="aperture-caption">${escapeHtml(caption)}</span>
    `;
    frame.addEventListener("click", () => openProject(project));
    els.apertureStrip.append(frame);
    frames.push(frame);
  });

  // 預解碼：確保圖片在動畫前已 decode，避免 decode 佔用 main thread 造成掉幀
  const imgs = [...els.apertureStrip.querySelectorAll("img")];
  Promise.all(imgs.map((img) => img.decode().catch(() => {}))).catch(() => {});
}

function getCategories() {
  const available = new Set(state.projects.map((project) => project.category));
  return categoryOrder.filter((category) => category === "All" || available.has(category));
}

function renderFilters() {
  els.filterBar.innerHTML = "";
  for (const category of getCategories()) {
    const button = document.createElement("button");
    button.className = "filter-button";
    button.type = "button";
    button.textContent = category;
    button.setAttribute("aria-pressed", String(state.filter === category));
    button.addEventListener("click", () => {
      state.filter = category;
      renderFilters();
      renderGrid();
    });
    els.filterBar.append(button);
  }
}

function projectImage(project) {
  return project.localCover || "assets/images/web-works/greattop.png";
}

// Split a mixed Chinese/English title into a main (Chinese) display and an English sub-label.
function parseTitleParts(rawTitle) {
  const hasZh = /[一-鿿㐀-䶿]/.test(rawTitle);
  if (!hasZh) return { main: rawTitle.trim(), sub: '' };

  // Extract English words (letter-starting sequences) for the sub-label
  const engWords = rawTitle.match(/[a-zA-Z][a-zA-Z0-9]*(?:\s+[a-zA-Z][a-zA-Z0-9]*)*/g) || [];
  const sub = engWords.join(' ').trim();

  // Build the main display: strip ASCII alphanumeric, normalize separators
  const main = rawTitle
    .replace(/[a-zA-Z0-9]+/g, '')
    .replace(/[|_]/g, ' ')
    .replace(/\s*[-—·]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s.\-—·|,]+|[\s.\-—·|,]+$/g, '');

  return { main: main || rawTitle, sub: sub.length > 3 ? sub : '' };
}

function renderGrid() {
  const projects = state.filter === "All"
    ? state.projects
    : state.projects.filter((project) => project.category === state.filter);
  els.grid.innerHTML = "";
  let cardIndex = 0;
  for (const project of projects) {
    const card = document.createElement("button");
    card.className = "work-card";
    card.type = "button";
    card.dataset.featured = String(project.added);
    card.dataset.motionDepth = String((cardIndex % 5) + 1);
    const { main: titleMain, sub: titleSub } = parseTitleParts(project.title);
    card.innerHTML = `
      <div class="card-image">
        <img src="${projectImage(project)}" alt="${escapeHtml(project.title)}" loading="lazy">
      </div>
      <div class="card-body">
        ${titleSub ? `<div class="card-en-wrap"><p class="card-en">${escapeHtml(titleSub)}</p></div>` : ''}
        <div class="card-title-wrap">
          <h3 class="card-title">${escapeHtml(titleMain)}</h3>
        </div>
      </div>
    `;
    card.addEventListener("click", () => openProject(project));
    els.grid.append(card);
    cardIndex += 1;
  }
  if (state.motionReady) animateCards();
}

function openProject(project) {
  els.dialogImage.src = projectImage(project);
  els.dialogImage.alt = project.title;
  els.dialogCategory.textContent = project.category;
  els.dialogTitle.textContent = project.title;
  els.dialogSummary.textContent = project.summary;
  els.dialogYear.textContent = project.year || "—";
  els.dialogViews.textContent = project.stats?.views ?? "—";
  els.dialogAppreciations.textContent = project.stats?.appreciations ?? "—";
  els.dialogDetails.innerHTML = "";
  for (const detail of project.details || []) {
    const item = document.createElement("li");
    item.textContent = detail;
    els.dialogDetails.append(item);
  }
  els.dialogDetails.hidden = !els.dialogDetails.children.length;
  els.dialogSource.href = project.sourceUrl || project.url || "#";
  els.dialog.showModal();
  animateDialog();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

els.dialogClose.addEventListener("click", () => els.dialog.close());
els.dialog.addEventListener("click", (event) => {
  if (event.target === els.dialog) els.dialog.close();
});
window.addEventListener("scroll", () => {
  els.header.dataset.elevated = String(window.scrollY > 12);
}, { passive: true });

loadData();
renderFilters();
renderGrid();
initMotion();

function initMotion() {
  if (!hasGsap || prefersReducedMotion) {
    document.querySelector(".logo-intro")?.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  state.motionReady = true;
  document.body.classList.add("is-intro-running");
  prepareTextSplits();
  runLogoIntro();
  runPageMotion();
  animateCards();
}

function prepareTextSplits() {
  splitWords(document.querySelector(".hero-lede"));
  document.querySelectorAll(".aperture-caption").forEach((caption) => splitChars(caption));
}

function splitChars(element) {
  if (!element || (element.dataset.split === "chars" && element.querySelector(".split-char"))) return;
  const text = element.textContent;
  element.setAttribute("aria-label", text);
  element.innerHTML = "";
  text.split(" ").forEach((word, wordIndex, words) => {
    const wordWrap = document.createElement("span");
    wordWrap.className = "split-word-group";
    wordWrap.setAttribute("aria-hidden", "true");
    for (const char of word) {
      const span = document.createElement("span");
      span.className = "split-char";
      span.textContent = char;
      wordWrap.append(span);
    }
    element.append(wordWrap);
    if (wordIndex < words.length - 1) element.append(document.createTextNode(" "));
  });
  element.dataset.split = "chars";
}

function splitWords(element) {
  if (!element || element.dataset.split === "words") return;
  const text = element.textContent.trim();
  element.setAttribute("aria-label", text);
  element.innerHTML = "";
  for (const word of text.split(/\s+/)) {
    const span = document.createElement("span");
    span.className = "split-word";
    span.setAttribute("aria-hidden", "true");
    span.textContent = word;
    element.append(span);
  }
  element.dataset.split = "words";
}

function runLogoIntro() {
  const intro = document.querySelector(".logo-intro");
  if (!intro) return;

  // ── Custom Eases (照搬上傳動畫)
  if (window.CustomEase) {
    CustomEase.create("clipUp",      "M0,0 C0.2,1.4 0.5,1.05 1,1");
    CustomEase.create("snapIn",      "M0,0 C0.6,0 0.4,1 1,1");
    CustomEase.create("collapseOut", "M0,0 C0.4,0 1,0.8 1,1");
    CustomEase.create("waveEase",    "M0,0 C0.25,0.1 0.25,1 1,1");
  }
  const eClipUp   = window.CustomEase ? "clipUp"      : "back.out(1.4)";
  const eSnap     = window.CustomEase ? "snapIn"      : "expo.out";
  const eCollapse = window.CustomEase ? "collapseOut" : "power3.in";
  const eWave     = window.CustomEase ? "waveEase"    : "power1.inOut";

  const allLetters  = [...intro.querySelectorAll(".intro-letter")];
  const nierLetters = [...intro.querySelectorAll("#intro-line-nier .intro-letter")];
  const zoomLetters = [...intro.querySelectorAll("#intro-line-zoom .intro-letter")];
  const decoLine    = intro.querySelector("#intro-deco-line");
  const tagline     = intro.querySelector("#intro-tagline");
  const stage       = intro.querySelector("#intro-stage");

  // ── 退場：clip-path 向上擦除
  function doExit(onComplete) {
    gsap.to(intro, {
      clipPath: "inset(0 0 100% 0)",
      duration: 0.78,
      ease: "expo.inOut",
      onComplete,
    });
  }

  // ── OUT：字母散場
  function playOut(onDone) {
    const tl = gsap.timeline({ onComplete: () => onDone && onDone() });

    // ⑨ Opacity Cascade — tagline & 裝飾線消失
    tl.to(tagline, { color: "rgba(255,255,255,0)", letterSpacing: "0.8em", duration: 0.3, ease: "power2.in" }, 0);
    tl.to(decoLine, { width: "0%", duration: 0.25, ease: "power3.in" }, 0);

    // ⑤ Skew Distort — ZooM 斜切散開
    tl.to(zoomLetters, {
      skewX: 18, x: (i) => i * 12, opacity: 0,
      duration: 0.32, ease: "power3.in",
      stagger: { each: 0.05, from: "end" },
    }, 0.1);

    // ④ Blur Fade + ③ Stagger Wave — NIER 從中心模糊消散
    tl.to(nierLetters, {
      filter: "blur(12px)", opacity: 0, y: -20,
      duration: 0.45, ease: "power2.in",
      stagger: { each: 0.06, from: "center", ease: eWave },
    }, 0.22);

    // ② Scale Collapse — stage 縮小淡出
    tl.to(stage, { scale: 0.88, opacity: 0, duration: 0.28, ease: eCollapse }, 0.52);
  }

  // ── IN：10 種效果入場序列
  function playIn(onDone) {
    gsap.set(stage, { scale: 1, opacity: 1 });
    gsap.set(allLetters, { y: "110%", opacity: 1, scaleX: 1, scaleY: 1, skewX: 0, filter: "blur(0px)" });
    gsap.set(decoLine, { width: "0%", opacity: 1 });
    gsap.set(tagline,  { color: "rgba(255,255,255,0)", letterSpacing: "0.8em" });

    const tl = gsap.timeline({ onComplete: () => onDone && onDone() });

    // ① Clip Reveal — NIER 從 .lw clip 由下往上揭露
    tl.to(nierLetters, { y: 0, duration: 0.7, ease: eClipUp, stagger: { each: 0.09, from: "start" } }, 0);

    // ⑦ Overshoot Bounce — R 最後彈跳
    tl.to(nierLetters[3], { y: -14, duration: 0.14, ease: "power2.out", yoyo: true, repeat: 1 }, 0.62);

    // ⑥ Letter Spacing — NIER 字距從寬收窄
    tl.fromTo("#intro-line-nier",
      { letterSpacing: "0.15em" },
      { letterSpacing: "-0.02em", duration: 0.5, ease: eSnap },
      0.05
    );

    // ③ Stagger Wave — ZooM 由左到右波浪入場
    tl.to(zoomLetters, { y: 0, duration: 0.55, ease: eClipUp, stagger: { each: 0.07, from: "start", ease: "power1.inOut" } }, 0.30);

    // ⑤ Skew Distort — ZooM 入場慣性斜切後回正
    tl.fromTo(zoomLetters, { skewX: -14 }, { skewX: 0, duration: 0.45, ease: eSnap, stagger: 0.07 }, 0.30);

    // ⑩ Weight Pulse — oo 兩字 scale 脈動
    tl.to([zoomLetters[1], zoomLetters[2]], {
      scaleY: 1.18, scaleX: 0.88,
      duration: 0.12, ease: "power2.out",
      yoyo: true, repeat: 1, stagger: 0.04,
    }, 0.75);

    // ② Scale — stage 從微縮 scale 入
    tl.fromTo(stage, { scale: 0.94 }, { scale: 1, duration: 0.6, ease: eClipUp }, 0);

    // ⑧ Draw Line — 底部裝飾線從左延伸
    tl.to(decoLine, { width: "100%", duration: 0.5, ease: eSnap }, 0.72);

    // ④ Blur Fade — tagline 從模糊淡入
    tl.fromTo(tagline,
      { filter: "blur(8px)" },
      { filter: "blur(0px)", color: "rgba(255,255,255,0.45)", letterSpacing: "0.45em", duration: 0.55, ease: "power2.out" },
      0.88
    );

    // ⑨ Opacity Cascade — 所有字母確認亮起
    tl.to(allLetters, { opacity: 1, duration: 0.15, stagger: 0.03 }, 1.1);

    // 呼吸 pulse
    tl.to(allLetters, {
      scaleX: 1.025, duration: 0.1, ease: "power1.out",
      stagger: { each: 0.04, from: "center" },
      yoyo: true, repeat: 1,
    }, 1.12);
  }

  // ── 主序列：IN → hold → OUT → wipe 退場
  playIn(() => {
    gsap.delayedCall(0.55, () => {
      playOut(() => {
        doExit(() => {
          document.body.classList.remove("is-intro-running");
          intro.remove();
        });
      });
    });
  });
}

function runPageMotion() {
  gsap.to(els.scrollProgress, {
    scaleX: 1,
    ease: "none",
    scrollTrigger: {
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.2,
    },
  });

  gsap.set(".site-header", { y: -24, opacity: 0 });
  gsap.set(".site-nav a", { y: -14, opacity: 0 });
  gsap.set(".hero-copy .eyebrow", { y: 18, opacity: 0, letterSpacing: "0.34em" });
  gsap.set(".hero-lede .split-word", { y: 28, opacity: 0, filter: "blur(8px)" });
  gsap.set(".hero-actions a", { y: 24, opacity: 0, clipPath: "inset(0 100% 0 0)" });
  gsap.set(".field-line", { scaleX: 0 });
  gsap.set(".field-type", { opacity: 0, y: 28 });
  gsap.set(".aperture-caption .split-char", { yPercent: 110, opacity: 0 });
  // 不用 clipPath（main-thread repaint）→ 改純 GPU 友善的 y + opacity + scale
  gsap.set(".aperture-frame", {
    y: 40,
    opacity: 0,
    scale: 0.92,
    force3D: true,
  });
  // 動畫前先清掉 img filter，讓 frame 動畫期間不觸發昂貴的 filter repaint
  gsap.set(".aperture-frame img", { filter: "none" });

  const hero = gsap.timeline({ delay: 3.5, defaults: { ease: "power3.out" } });
  hero
    .to(".site-header", { y: 0, opacity: 1, duration: 0.54 })
    .to(".site-nav a", { y: 0, opacity: 1, duration: 0.42, stagger: 0.06 }, "-=0.34")
    .to(".hero-copy .eyebrow", { y: 0, opacity: 1, letterSpacing: "0.18em", duration: 0.52 }, "-=0.18")
    .to(".hero-lede .split-word", {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      duration: 0.52,
      stagger: 0.018,
    }, "-=0.36")
    .to(".hero-actions a", {
      y: 0,
      opacity: 1,
      clipPath: "inset(0 0% 0 0)",
      duration: 0.46,
      stagger: 0.08,
    }, "-=0.26")
    .to(".field-line", { scaleX: 1, duration: 0.74, stagger: 0.08 }, "-=0.72")
    .to(".field-type", { opacity: 1, y: 0, duration: 0.84, stagger: 0.08 }, "-=0.58")
    .to(".aperture-frame", {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.78,
      stagger: { each: 0.15, from: "start" },
      ease: "expo.out",
      force3D: true,
      // 動畫全部完成後才套上 grayscale，避免 filter 在動畫中增加 repaint 負擔
      onComplete() {
        gsap.set(".aperture-frame img", {
          filter: "grayscale(1) contrast(1.05) brightness(0.88)",
        });
      },
    }, "-=0.82")
    .to(".aperture-caption .split-char", {
      yPercent: 0,
      opacity: 1,
      duration: 0.38,
      stagger: { each: 0.006, from: "start" },
      ease: "power3.out",
    }, "-=0.52");

  gsap.to(".field-type-b", {
    x: 26,
    duration: 6.5,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  gsap.to(".aperture-frame", {
    x: (index) => [-26, -8, 8, 26][index] || 0,
    y: (index) => [10, -6, 6, -10][index] || 0,
    rotate: 0,
    scale: (index) => [0.96, 1.025, 1.025, 0.96][index] || 1,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  gsap.to(".aperture-frame img", {
    yPercent: (index) => [-3, 2, -2, 3][index] || 0,
    scale: 1.08,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  gsap.to(".hero-motion-field", {
    y: 120,
    opacity: 0.35,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  gsap.to(".aperture-caption", {
    y: -14,
    opacity: 0.28,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  gsap.fromTo(".profile-strip", {
    clipPath: "inset(0 50% 0 50%)",
  }, {
    clipPath: "inset(0 0% 0 0%)",
    duration: 0.9,
    ease: "expo.out",
    scrollTrigger: { trigger: ".profile-strip", start: "top 86%", once: true },
  });

  gsap.from(".profile-strip > div", {
    scrollTrigger: { trigger: ".profile-strip", start: "top 82%" },
    y: 46,
    opacity: 0,
    duration: 0.62,
    stagger: 0.08,
    ease: "power3.out",
  });

  document.querySelectorAll(".metric-value").forEach((metric) => {
    const number = Number(metric.textContent);
    if (!Number.isFinite(number)) return;
    const proxy = { value: 0 };
    gsap.to(proxy, {
      value: number,
      duration: 1.1,
      ease: "power2.out",
      scrollTrigger: { trigger: metric, start: "top 88%", once: true },
      onUpdate: () => {
        metric.textContent = String(Math.round(proxy.value));
      },
    });
  });

  gsap.from(".section-heading > p", {
    scrollTrigger: { trigger: ".work-section", start: "top 74%" },
    y: 26,
    opacity: 0,
    duration: 0.52,
    stagger: 0.08,
  });

  gsap.to(".section-heading", {
    x: -34,
    ease: "none",
    scrollTrigger: {
      trigger: ".work-section",
      start: "top bottom",
      end: "top top",
      scrub: true,
    },
  });

  gsap.from(".filter-button", {
    scrollTrigger: { trigger: ".filter-bar", start: "top 84%" },
    y: 18,
    opacity: 0,
    duration: 0.42,
    stagger: 0.035,
  });

}

function animateCards() {
  if (!hasGsap || prefersReducedMotion) return;

  const cards = gsap.utils.toArray(".work-card");

  // Clear any previous inline styles from card and its key children
  gsap.set(cards, { clearProps: "all" });
  gsap.set(".card-title, .card-en, .card-image, .card-image img", { clearProps: "all" });

  // ① LINE-EXPAND — group entrance: card clips open from horizontal centre sliver
  gsap.fromTo(
    cards,
    { clipPath: "inset(49% 0 49% 0)" },
    {
      clipPath: "inset(0% 0 0% 0%)",
      duration: 0.85,
      stagger: { each: 0.055, ease: "power1.inOut" },
      ease: "expo.out",
      scrollTrigger: { trigger: ".work-grid", start: "top 82%", once: true },
    }
  );

  cards.forEach((card, i) => {
    const image   = card.querySelector(".card-image img");
    const cardImg = card.querySelector(".card-image");
    const title   = card.querySelector(".card-title");
    const en      = card.querySelector(".card-en");
    const depth   = Number(card.dataset.motionDepth || 1);
    const isEven  = i % 2 === 0;
    const stBase  = { trigger: card, start: "top 89%", once: true };

    // ② SKEW + SCALE SETTLE — card enters with slight skewX and small scale, settles cleanly
    gsap.fromTo(card,
      { skewX: isEven ? 2 : -2, scale: 0.96 },
      { skewX: 0, scale: 1, duration: 0.72, ease: "power3.out",
        scrollTrigger: stBase }
    );

    // ③ IMAGE ZOOM BURST — inner image starts oversized and settles to fill
    gsap.fromTo(image,
      { scale: 1.2 },
      { scale: 1, duration: 0.9, ease: "expo.out",
        scrollTrigger: stBase }
    );

    // ④ TITLE WIPE FROM BOTTOM — h3 rises out of its overflow:hidden wrapper
    if (title) {
      gsap.fromTo(title,
        { y: "104%" },
        { y: "0%", duration: 0.62, ease: "expo.out",
          scrollTrigger: { trigger: card, start: "top 87%", once: true } }
      );
    }

    // ⑤ EN SUB X-SLIDE — English label slides in from the left
    if (en) {
      gsap.fromTo(en,
        { x: -22, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "power2.out",
          scrollTrigger: { trigger: card, start: "top 87%", once: true } }
      );
    }

    // ⑥ ALTERNATING IMAGE BOX SLIDE — card-image div enters from opposite sides for odd/even
    gsap.fromTo(cardImg,
      { x: isEven ? 16 : -16, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.58, ease: "power2.out",
        scrollTrigger: { trigger: card, start: "top 91%", once: true } }
    );

    // ⑦ SCROLL PARALLAX Y — card drifts at different rates based on grid position
    gsap.to(card, {
      y: depth % 2 === 0 ? -20 : 20,
      ease: "none",
      scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
    });

    // ⑧ SCROLL PARALLAX — inner image yPercent for independent layer depth
    gsap.to(image, {
      yPercent: depth % 2 === 0 ? -5 : 5,
      ease: "none",
      scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
    });

    // ⑨ HOVER — 3D lift + colour reveal + image overscale
    card.addEventListener("pointerenter", () => {
      gsap.to(card, {
        y: -8, rotateX: 1.5, rotateY: isEven ? -1.4 : 1.4,
        boxShadow: "0 20px 52px rgba(0,0,0,0.13)",
        duration: 0.3, ease: "power2.out",
      });
      gsap.to(image, {
        scale: 1.06,
        filter: "grayscale(0) contrast(1) brightness(1)",
        duration: 0.44, ease: "power2.out",
      });
      // ⑩ HOVER LETTER SPACING — title tracks subtly wider on hover
      if (title) gsap.to(title, { letterSpacing: "0.035em", duration: 0.38, ease: "power2.out" });
    });
    card.addEventListener("pointerleave", () => {
      gsap.to(card, {
        y: 0, rotateX: 0, rotateY: 0,
        boxShadow: "none",
        duration: 0.44, ease: "power2.out",
      });
      gsap.to(image, {
        scale: 1,
        filter: "grayscale(1) contrast(1.04) brightness(1)",
        duration: 0.52, ease: "power2.out",
      });
      if (title) gsap.to(title, { letterSpacing: "0em", duration: 0.36, ease: "power2.out" });
    });
  });

  ScrollTrigger.refresh();
}

function animateDialog() {
  if (!hasGsap || prefersReducedMotion) return;
  splitChars(els.dialogTitle);
  gsap.fromTo(els.dialog, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  gsap.fromTo(".dialog-media img", { scale: 1.08, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.58, ease: "power3.out" });
  gsap.fromTo("#dialog-title .split-char", {
    yPercent: 100,
    opacity: 0,
  }, {
    yPercent: 0,
    opacity: 1,
    duration: 0.42,
    stagger: 0.018,
    ease: "back.out(1.3)",
  });
  gsap.fromTo(".dialog-content > p, .dialog-meta div, #dialog-details li, .source-link", {
    y: 18,
    opacity: 0,
  }, {
    y: 0,
    opacity: 1,
    duration: 0.38,
    stagger: 0.045,
    ease: "power2.out",
  });
}
