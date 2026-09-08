(() => {
  function cleanClone(element, extraClass) {
    const clone = element.cloneNode(true);
    clone.hidden = false;
    clone.classList.add(extraClass);
    clone.setAttribute("aria-hidden", "true");
    clone.removeAttribute("aria-label");
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    return clone;
  }

  async function animateLeaf(leaf, direction) {
    const angle = direction === "next" ? -180 : 180;
    const animation = leaf.animate([
      { transform: "rotateY(0deg)", filter: "brightness(1)", offset: 0 },
      { transform: `rotateY(${angle * 0.36}deg)`, filter: "brightness(0.93)", offset: 0.42 },
      { transform: `rotateY(${angle * 0.62}deg)`, filter: "brightness(0.72)", offset: 0.58 },
      { transform: `rotateY(${angle * 0.86}deg)`, filter: "brightness(0.9)", offset: 0.78 },
      { transform: `rotateY(${angle}deg)`, filter: "brightness(1)", offset: 1 }
    ], {
      duration: 720,
      easing: "cubic-bezier(0.45, 0.02, 0.18, 1)",
      fill: "both"
    });
    await animation.finished.catch(() => {});
  }

  async function animateSoftReveal(book, oldLeft, direction) {
    const card = cleanClone(oldLeft, "book-turn-card");
    card.classList.add(direction === "next" ? "is-next" : "is-prev");
    book.appendChild(card);
    const angle = direction === "next" ? -104 : 104;
    await card.animate([
      { transform: "perspective(1800px) rotateY(0deg) translateX(0)", opacity: 1 },
      { transform: `perspective(1800px) rotateY(${angle}deg) translateX(${direction === "next" ? "-8%" : "8%"})`, opacity: 0 }
    ], {
      duration: 560,
      easing: "cubic-bezier(0.45, 0.02, 0.18, 1)",
      fill: "both"
    }).finished.catch(() => {});
    card.remove();
  }

  window.QoriFlipbookTurn = async ({
    book,
    leftPage,
    rightPage,
    oldLeft,
    oldRight,
    direction,
    previousWasSpread,
    targetIsSpread,
    mobile,
    reducedMotion
  }) => {
    if (reducedMotion || typeof Element.prototype.animate !== "function") return;

    if (!mobile && (!previousWasSpread || !targetIsSpread)) {
      await animateSoftReveal(book, oldLeft, direction);
      return;
    }

    const next = direction === "next";
    const staticSource = next ? oldLeft : oldRight;
    const frontSource = mobile ? oldLeft : (next ? oldRight : oldLeft);
    const backSource = mobile ? leftPage : (next ? leftPage : rightPage);
    if (!frontSource || !backSource) return;

    let staticPage = null;
    if (!mobile && staticSource) {
      staticPage = cleanClone(staticSource, "book-turn-static");
      staticPage.classList.add(next ? "is-left" : "is-right");
      book.appendChild(staticPage);
    }

    const leaf = document.createElement("div");
    leaf.className = `book-turn-leaf ${next ? "is-next" : "is-prev"}${mobile ? " is-mobile" : ""}`;
    leaf.setAttribute("aria-hidden", "true");

    const front = cleanClone(frontSource, "book-turn-face");
    front.classList.add("book-turn-front");
    const back = cleanClone(backSource, "book-turn-face");
    back.classList.add("book-turn-back");
    leaf.append(front, back);
    book.appendChild(leaf);

    await animateLeaf(leaf, direction);
    leaf.remove();
    staticPage?.remove();
  };
})();
