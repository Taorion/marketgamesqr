(() => {
  const shell = document.querySelector("[data-flipbook]");
  if (!shell) return;

  const totalPages = Number(shell.dataset.pageCount || 1);
  const book = shell.querySelector("[data-book]");
  const stage = shell.querySelector("[data-stage]");
  const leftPage = shell.querySelector("[data-left-page]");
  const rightPage = shell.querySelector("[data-right-page]");
  const leftImage = shell.querySelector("[data-left-image]");
  const rightImage = shell.querySelector("[data-right-image]");
  const pageLabel = shell.querySelector("[data-page-label]");
  const pageInput = shell.querySelector("[data-page-input]");
  const progress = shell.querySelector("[data-progress]");
  const chapter = shell.querySelector("[data-chapter]");
  const fullscreenButton = shell.querySelector("[data-fullscreen]");
  const previousButtons = shell.querySelectorAll("[data-prev]");
  const nextButtons = shell.querySelectorAll("[data-next]");
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let currentPage = pageFromHash();
  let touchStartX = null;
  let touchStartY = null;
  let isTurning = false;

  function pageFromHash() {
    const match = window.location.hash.match(/^#pagina=(\d+)$/);
    return clamp(match ? Number(match[1]) : 1);
  }

  function clamp(page) {
    return Math.min(totalPages, Math.max(1, Number(page) || 1));
  }

  function pageSource(page) {
    return `/academia-vendedores/pages/page-${String(page).padStart(3, "0")}.webp?v=20260908-secure-v6`;
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

  function setImage(image, page) {
    image.src = pageSource(page);
    image.alt = `Página ${page} del Brand Bible Qori`;
  }

  function updateHash() {
    const nextHash = `#pagina=${currentPage}`;
    if (window.location.hash !== nextHash) history.replaceState(null, "", nextHash);
  }

  function preloadAround(pages) {
    const candidates = new Set();
    pages.forEach((page) => {
      [page - 2, page - 1, page + 1, page + 2].forEach((candidate) => {
        if (candidate >= 1 && candidate <= totalPages) candidates.add(candidate);
      });
    });
    candidates.forEach((page) => {
      const image = new Image();
      image.src = pageSource(page);
    });
  }

  function syncChapter() {
    const starts = Array.from(chapter.options, (option) => Number(option.value));
    const active = starts.reduce((selected, start) => start <= currentPage ? start : selected, 1);
    chapter.value = String(active);
  }

  function syncReaderUi(pages = visiblePages()) {
    const finalVisiblePage = pages[pages.length - 1];
    pageLabel.textContent = pages.length > 1
      ? `Páginas ${pages[0]}-${finalVisiblePage} de ${totalPages}`
      : `Página ${pages[0]} de ${totalPages}`;
    pageInput.value = String(currentPage);
    progress.style.width = `${(finalVisiblePage / totalPages) * 100}%`;
    previousButtons.forEach((button) => { button.disabled = currentPage <= 1 || isTurning; });
    nextButtons.forEach((button) => { button.disabled = finalVisiblePage >= totalPages || isTurning; });
    syncChapter();
    updateHash();
  }

  function render({ updateUi = true } = {}) {
    currentPage = clamp(currentPage);
    const pages = visiblePages();
    const cover = !isMobile() && pages.length === 1 && pages[0] === 1;
    book.classList.toggle("is-cover", cover);

    setImage(leftImage, pages[0]);
    leftPage.hidden = false;

    if (pages.length > 1) {
      setImage(rightImage, pages[1]);
      rightPage.hidden = false;
    } else {
      rightPage.hidden = true;
      rightImage.removeAttribute("src");
      rightImage.alt = "";
    }

    if (updateUi) syncReaderUi(pages);
    else {
      previousButtons.forEach((button) => { button.disabled = true; });
      nextButtons.forEach((button) => { button.disabled = true; });
    }
    preloadAround(pages);
    return pages;
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

  previousButtons.forEach((button) => button.addEventListener("click", previous));
  nextButtons.forEach((button) => button.addEventListener("click", next));

  pageInput.addEventListener("change", () => goTo(pageInput.value, Number(pageInput.value) < currentPage ? "prev" : "next"));
  pageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      pageInput.blur();
      goTo(pageInput.value, Number(pageInput.value) < currentPage ? "prev" : "next");
    }
  });

  chapter.addEventListener("change", () => goTo(chapter.value, Number(chapter.value) < currentPage ? "prev" : "next"));

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

  render();
})();
