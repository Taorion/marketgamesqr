(() => {
  function cleanClone(element) {
    const clone = element.cloneNode(true);
    clone.hidden = false;
    clone.classList.add("book-turn-face");
    clone.setAttribute("aria-hidden", "true");
    clone.removeAttribute("aria-label");
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    return clone;
  }

  window.QoriFlipbookTurn = async ({
    book,
    oldLeft,
    oldRight,
    direction,
    previousWasSpread,
    mobile,
    reducedMotion
  }) => {
    if (reducedMotion || typeof Element.prototype.animate !== "function") return;

    const layer = document.createElement("div");
    layer.className = `book-turn-layer ${mobile ? "is-mobile" : (previousWasSpread ? "is-spread" : "is-single")}`;
    layer.setAttribute("aria-hidden", "true");
    layer.appendChild(cleanClone(oldLeft));
    if (!mobile && previousWasSpread && oldRight) layer.appendChild(cleanClone(oldRight));

    book.classList.add("is-turning");
    book.appendChild(layer);

    const distance = direction === "next" ? -10 : 10;
    try {
      await layer.animate([
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 0, transform: `translateX(${distance}px)` }
      ], {
        duration: 220,
        easing: "ease-out",
        fill: "both"
      }).finished.catch(() => {});
    } finally {
      layer.remove();
      book.classList.remove("is-turning");
    }
  };
})();
