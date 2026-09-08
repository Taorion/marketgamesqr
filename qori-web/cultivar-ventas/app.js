(() => {
  const shell = document.querySelector("[data-cultivation-book]");
  const source = window.GOS_CULTIVATION_SOURCE;
  if (!shell || !source) return;

  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const book = shell.querySelector("[data-book]");
  const stage = shell.querySelector("[data-stage]");
  const leftPage = shell.querySelector("[data-left-page]");
  const rightPage = shell.querySelector("[data-right-page]");
  const pageLabel = shell.querySelector("[data-page-label]");
  const pageInput = shell.querySelector("[data-page-input]");
  const progress = shell.querySelector("[data-progress]");
  const chapterPicker = shell.querySelector("[data-chapter]");
  const fullscreenButton = shell.querySelector("[data-fullscreen]");
  const previousButtons = shell.querySelectorAll("[data-prev]");
  const nextButtons = shell.querySelectorAll("[data-next]");
  const pages = buildPages(source);
  const totalPages = pages.length;
  let currentPage = pageFromHash();
  let touchStartX = null;
  let touchStartY = null;
  let isTurning = false;

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function inlineMarkup(value) {
    return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  function cleanBlock(value) {
    return value.replace(/\r/g, "").split("\n").map((line) => line.trim()).join(" ").replace(/\s+/g, " ").trim();
  }

  function splitLongParagraph(paragraph, limit = 980) {
    if (paragraph.length <= limit) return [paragraph];
    const sentences = paragraph.match(/[^.!?¿¡]+[.!?]+(?:[”"']|\s|$)*|.+$/g) || [paragraph];
    const chunks = [];
    let current = "";
    sentences.forEach((sentence) => {
      const next = `${current} ${sentence.trim()}`.trim();
      if (current && next.length > limit) {
        chunks.push(current);
        current = sentence.trim();
      } else {
        current = next;
      }
    });
    if (current) chunks.push(current);
    return chunks;
  }

  function buildPages(markdown) {
    const blocks = markdown.replace(/\r/g, "").split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
    const result = [{
      kind: "cover",
      title: "GOS Qori: el cultivo de las ventas",
      subtitle: "Una metodología narrativa para sembrar oportunidades, cultivar confianza y cosechar relaciones de valor"
    }];
    let part = "Introducción";
    let chapter = "";
    let paragraphs = [];

    function flushChapter() {
      if (!chapter || !paragraphs.length) {
        paragraphs = [];
        return;
      }
      const expanded = paragraphs.flatMap((paragraph) => splitLongParagraph(paragraph));
      let group = [];
      let length = 0;
      let sequence = 0;
      expanded.forEach((paragraph) => {
        const projected = length + paragraph.length;
        if (group.length && projected > 1080) {
          result.push({ kind: "chapter", part, title: chapter, paragraphs: group, continuation: sequence > 0 });
          group = [];
          length = 0;
          sequence += 1;
        }
        group.push(paragraph);
        length += paragraph.length;
      });
      if (group.length) result.push({ kind: "chapter", part, title: chapter, paragraphs: group, continuation: sequence > 0 });
      paragraphs = [];
    }

    blocks.forEach((rawBlock) => {
      if (/^-{3,}$/.test(rawBlock)) return;
      if (rawBlock.startsWith("# ")) {
        flushChapter();
        const title = cleanBlock(rawBlock.slice(2));
        if (/^GOS QORI:/i.test(title)) return;
        part = title;
        chapter = /^EPÍLOGO/i.test(title) ? title : "";
        result.push({ kind: "divider", title, subtitle: "Una nueva etapa del oficio de cultivar relaciones de valor." });
        return;
      }
      if (rawBlock.startsWith("## ")) {
        flushChapter();
        const title = cleanBlock(rawBlock.slice(3));
        if (/^Una metodología narrativa/i.test(title)) return;
        chapter = title;
        return;
      }
      if (/^\*\*Qori\b[\s\S]*Documento maestro/i.test(rawBlock)) return;
      if (chapter) paragraphs.push(cleanBlock(rawBlock));
    });
    flushChapter();
    return result;
  }

  function clamp(page) {
    return Math.min(totalPages, Math.max(1, Number(page) || 1));
  }

  function pageFromHash() {
    const match = window.location.hash.match(/^#pagina=(\d+)$/);
    return clamp(match ? Number(match[1]) : 1);
  }

  function isMobile() {
    return mobileQuery.matches;
  }

  function desktopLeftPage(page) {
    if (page <= 1) return 1;
    return page % 2 === 0 ? page : page - 1;
  }

  function visiblePages() {
    if (isMobile()) return [currentPage];
    const left = desktopLeftPage(currentPage);
    return left === 1 ? [1] : [left, left + 1].filter((page) => page <= totalPages);
  }

  function pageMarkup(page, pageNumber) {
    if (page.kind === "cover") {
      return `<div class="paper-inner"><div class="seed-mark" aria-hidden="true">Q</div><span class="cover-kicker">Academia comercial Qori</span><h3 class="cover-title">${escapeHtml(page.title)}</h3><p class="cover-subtitle">${escapeHtml(page.subtitle)}</p><p class="cover-mantra">Una venta no se persigue: se cultiva.</p><span class="paper-number">${pageNumber}</span></div>`;
    }
    if (page.kind === "divider") {
      return `<div class="paper-inner"><div class="seed-mark" aria-hidden="true">${String(pageNumber).padStart(2, "0")}</div><span class="divider-kicker">Ruta de aprendizaje</span><h3 class="divider-title">${escapeHtml(page.title)}</h3><p class="divider-subtitle">${escapeHtml(page.subtitle)}</p><span class="paper-number">${pageNumber}</span></div>`;
    }
    const body = page.paragraphs.map((paragraph) => {
      if (paragraph.startsWith("> ")) return `<blockquote>${inlineMarkup(paragraph.slice(2))}</blockquote>`;
      return `<p>${inlineMarkup(paragraph)}</p>`;
    }).join("");
    const chapterTitle = page.continuation ? "" : `<h3>${escapeHtml(page.title)}</h3>`;
    return `<div class="paper-inner"><div class="paper-running-head"><span>${escapeHtml(page.part)}</span><span>GOS Qori</span></div><div class="paper-copy">${chapterTitle}${body}</div><span class="paper-number">${pageNumber}</span></div>`;
  }

  function renderPage(element, pageNumber) {
    const page = pages[pageNumber - 1];
    element.classList.toggle("is-cover-page", page.kind === "cover");
    element.classList.toggle("is-divider-page", page.kind === "divider");
    element.innerHTML = pageMarkup(page, pageNumber);
    element.setAttribute("aria-label", `Página ${pageNumber}: ${page.title}`);
  }

  function syncChapterPicker() {
    const options = Array.from(chapterPicker.options);
    const active = options.reduce((selected, option) => Number(option.value) <= currentPage ? option.value : selected, "1");
    chapterPicker.value = active;
  }

  function syncReaderUi(visible = visiblePages()) {
    const finalPage = visible[visible.length - 1];
    pageLabel.textContent = visible.length > 1 ? `Páginas ${visible[0]}-${finalPage} de ${totalPages}` : `Página ${visible[0]} de ${totalPages}`;
    pageInput.value = String(currentPage);
    pageInput.max = String(totalPages);
    progress.style.width = `${(finalPage / totalPages) * 100}%`;
    previousButtons.forEach((button) => { button.disabled = currentPage <= 1 || isTurning; });
    nextButtons.forEach((button) => { button.disabled = finalPage >= totalPages || isTurning; });
    syncChapterPicker();
    const hash = `#pagina=${currentPage}`;
    if (window.location.hash !== hash) history.replaceState(null, "", hash);
  }

  function render({ updateUi = true } = {}) {
    currentPage = clamp(currentPage);
    const visible = visiblePages();
    book.classList.toggle("is-cover", !isMobile() && visible.length === 1 && visible[0] === 1);
    renderPage(leftPage, visible[0]);
    leftPage.hidden = false;
    if (visible.length > 1) {
      renderPage(rightPage, visible[1]);
      rightPage.hidden = false;
    } else {
      rightPage.hidden = true;
      rightPage.innerHTML = "";
    }
    if (updateUi) syncReaderUi(visible);
    else {
      previousButtons.forEach((button) => { button.disabled = true; });
      nextButtons.forEach((button) => { button.disabled = true; });
    }
    return visible;
  }

  async function goTo(page, direction = "next") {
    const nextPage = clamp(page);
    if (nextPage === currentPage || isTurning) return;
    isTurning = true;
    const oldLeft = leftPage.cloneNode(true);
    const oldRight = rightPage.hidden ? null : rightPage.cloneNode(true);
    const previousWasSpread = !isMobile() && Boolean(oldRight);
    currentPage = nextPage;
    render({ updateUi: false });
    try {
      await window.QoriFlipbookTurn?.({
        book,
        leftPage,
        rightPage,
        oldLeft,
        oldRight,
        direction,
        previousWasSpread,
        targetIsSpread: !isMobile() && !rightPage.hidden,
        mobile: isMobile(),
        reducedMotion: reducedMotionQuery.matches
      });
    } finally {
      isTurning = false;
      syncReaderUi();
    }
  }

  function next() {
    const step = isMobile() || currentPage === 1 ? 1 : 2;
    goTo(currentPage + step, "next");
  }

  function previous() {
    const step = isMobile() ? 1 : 2;
    goTo(currentPage <= 2 ? 1 : currentPage - step, "prev");
  }

  function buildChapterPicker() {
    const entries = [{ value: 1, label: "Portada" }];
    const labels = new Set(entries.map((entry) => entry.label));
    pages.forEach((page, index) => {
      const title = page.title || "";
      if ((page.kind === "divider" || (/prólogo|epílogo/i.test(title) && !page.continuation)) && !labels.has(title)) {
        entries.push({ value: index + 1, label: title });
        labels.add(title);
      }
    });
    chapterPicker.innerHTML = entries.map((entry) => `<option value="${entry.value}">${escapeHtml(entry.label)}</option>`).join("");
  }

  previousButtons.forEach((button) => button.addEventListener("click", previous));
  nextButtons.forEach((button) => button.addEventListener("click", next));
  chapterPicker.addEventListener("change", () => goTo(chapterPicker.value, Number(chapterPicker.value) < currentPage ? "prev" : "next"));
  pageInput.addEventListener("change", () => goTo(pageInput.value, Number(pageInput.value) < currentPage ? "prev" : "next"));
  pageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      pageInput.blur();
      goTo(pageInput.value, Number(pageInput.value) < currentPage ? "prev" : "next");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, select, textarea")) return;
    if (event.key === "ArrowRight" || event.key === "PageDown") next();
    if (event.key === "ArrowLeft" || event.key === "PageUp") previous();
    if (event.key === "Home") goTo(1, "prev");
    if (event.key === "End") goTo(totalPages, "next");
  });

  stage.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) {
      touchStartX = null;
      touchStartY = null;
      return;
    }
    stage.removeAttribute("data-pinching");
    touchStartX = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
  }, { passive: true });

  stage.addEventListener("touchend", (event) => {
    if (stage.dataset.pinching === "true" || stage.dataset.zoomed === "true" || touchStartX === null || touchStartY === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    const deltaY = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    if (deltaX < 0) next(); else previous();
  }, { passive: true });

  stage.addEventListener("contextmenu", (event) => event.preventDefault());
  fullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch (error) {
      console.warn("No fue posible cambiar a pantalla completa", error);
    }
  });
  document.addEventListener("fullscreenchange", () => {
    fullscreenButton.textContent = document.fullscreenElement ? "Salir de pantalla completa" : "Pantalla completa";
  });
  mobileQuery.addEventListener?.("change", () => { if (!isTurning) render(); });
  window.addEventListener("hashchange", () => {
    const page = pageFromHash();
    if (page !== currentPage) {
      currentPage = page;
      render();
    }
  });

  buildChapterPicker();
  render();
})();
