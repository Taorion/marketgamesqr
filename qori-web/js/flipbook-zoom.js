(() => {
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 2.5;
  const ZOOM_STEP = 0.25;

  function clampZoom(value) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  }

  function initializeZoom(shell) {
    const stage = shell.querySelector("[data-stage]");
    const book = shell.querySelector("[data-book]");
    const zoomOut = shell.querySelector("[data-zoom-out]");
    const zoomReset = shell.querySelector("[data-zoom-reset]");
    const zoomIn = shell.querySelector("[data-zoom-in]");
    if (!stage || !book || !zoomOut || !zoomReset || !zoomIn) return;

    let zoom = 1;
    let baseBookWidth = book.getBoundingClientRect().width;
    let pinchStartDistance = 0;
    let pinchStartZoom = 1;

    function applyZoom(value) {
      const nextZoom = Math.round(clampZoom(value) * 100) / 100;
      if (nextZoom > 1) {
        if (zoom <= 1) baseBookWidth = book.getBoundingClientRect().width;
        book.style.width = `${baseBookWidth}px`;
        book.style.zoom = String(nextZoom);
      } else {
        book.style.removeProperty("width");
        book.style.removeProperty("zoom");
      }
      zoom = nextZoom;
      stage.classList.toggle("is-zoomed", zoom > 1);
      stage.dataset.zoomed = zoom > 1 ? "true" : "false";
      zoomReset.textContent = `${Math.round(zoom * 100)}%`;
      zoomReset.setAttribute("aria-label", `Restablecer zoom. Nivel actual ${Math.round(zoom * 100)} por ciento`);
      zoomOut.disabled = zoom <= MIN_ZOOM;
      zoomIn.disabled = zoom >= MAX_ZOOM;
    }

    function touchDistance(touches) {
      const x = touches[0].clientX - touches[1].clientX;
      const y = touches[0].clientY - touches[1].clientY;
      return Math.hypot(x, y);
    }

    zoomOut.addEventListener("click", () => applyZoom(zoom - ZOOM_STEP));
    zoomIn.addEventListener("click", () => applyZoom(zoom + ZOOM_STEP));
    zoomReset.addEventListener("click", () => applyZoom(1));

    stage.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 2) return;
      pinchStartDistance = touchDistance(event.touches);
      pinchStartZoom = zoom;
      stage.dataset.pinching = "true";
    }, { passive: true });

    stage.addEventListener("touchmove", (event) => {
      if (event.touches.length !== 2 || !pinchStartDistance) return;
      event.preventDefault();
      applyZoom(pinchStartZoom * (touchDistance(event.touches) / pinchStartDistance));
    }, { passive: false });

    stage.addEventListener("touchend", (event) => {
      if (!pinchStartDistance || event.touches.length > 1) return;
      pinchStartDistance = 0;
      applyZoom(Math.round(zoom / ZOOM_STEP) * ZOOM_STEP);
    }, { passive: true });

    stage.addEventListener("keydown", (event) => {
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        applyZoom(zoom + ZOOM_STEP);
      }
      if (event.key === "-") {
        event.preventDefault();
        applyZoom(zoom - ZOOM_STEP);
      }
      if (event.key === "0") {
        event.preventDefault();
        applyZoom(1);
      }
    });

    applyZoom(1);
  }

  document.querySelectorAll("[data-flipbook], [data-cultivation-book]").forEach(initializeZoom);
})();
