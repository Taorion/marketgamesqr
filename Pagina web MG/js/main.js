function initMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");

  if (!toggle || !nav) {
    return;
  }

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("is-open", !expanded);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    });
  });
}

function initReveal() {
  const elements = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.2
  });

  elements.forEach((element) => observer.observe(element));
}

function initActiveNav() {
  const sections = document.querySelectorAll("main section[id]");
  const links = document.querySelectorAll(".site-nav a");

  if (!sections.length || !links.length || !("IntersectionObserver" in window)) {
    return;
  }

  const linkMap = new Map(
    Array.from(links).map((link) => [link.getAttribute("href"), link])
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      links.forEach((link) => link.classList.remove("is-active"));
      const activeLink = linkMap.get(`#${entry.target.id}`);

      if (activeLink) {
        activeLink.classList.add("is-active");
      }
    });
  }, {
    rootMargin: "-35% 0px -45% 0px",
    threshold: 0.1
  });

  sections.forEach((section) => observer.observe(section));
}

function initPortfolioSlider() {
  const track = document.getElementById("portfolio-track");
  const buttons = document.querySelectorAll("[data-slide]");
  const sliderWindow = track ? track.parentElement : null;

  if (!track || !buttons.length || !sliderWindow) {
    return;
  }

  const cards = Array.from(track.children);
  let currentIndex = 0;
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  let baseOffset = 0;

  function visibleCards() {
    return window.innerWidth >= 900 ? 2 : 1;
  }

  function maxIndex() {
    return Math.max(0, cards.length - visibleCards());
  }

  function getOffset() {
    const visible = visibleCards();
    return (100 / visible) * currentIndex;
  }

  function updateSlider() {
    const visible = visibleCards();
    const width = 100 / visible;

    cards.forEach((card) => {
      card.style.flex = `0 0 calc(${width}% - 7px)`;
    });

    if (currentIndex > maxIndex()) {
      currentIndex = maxIndex();
    }

    baseOffset = getOffset();
    track.style.transition = "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)";
    track.style.transform = `translate3d(calc(-${baseOffset}% - ${currentIndex * 14}px), 0, 0)`;
  }

  function goToSlide(direction) {
    currentIndex += direction;

    if (currentIndex < 0) {
      currentIndex = maxIndex();
    }

    if (currentIndex > maxIndex()) {
      currentIndex = 0;
    }

    updateSlider();
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      goToSlide(Number(button.getAttribute("data-slide")));
    });
  });

  sliderWindow.addEventListener("touchstart", (event) => {
    startX = event.touches[0].clientX;
    currentX = startX;
    isDragging = true;
    baseOffset = getOffset();
    track.style.transition = "none";
  }, { passive: true });

  sliderWindow.addEventListener("touchmove", (event) => {
    if (!isDragging) {
      return;
    }

    currentX = event.touches[0].clientX;
    const deltaX = currentX - startX;
    const sliderWidth = sliderWindow.clientWidth || 1;
    const dragPercent = (deltaX / sliderWidth) * 100;
    const visible = visibleCards();
    const dragGap = (deltaX / sliderWidth) * (14 * visible);
    track.style.transform = `translate3d(calc(-${baseOffset}% - ${currentIndex * 14}px + ${dragPercent}% + ${dragGap}px), 0, 0)`;
  }, { passive: true });

  sliderWindow.addEventListener("touchend", () => {
    if (!isDragging) {
      return;
    }

    const deltaX = currentX - startX;
    isDragging = false;

    if (Math.abs(deltaX) < 40) {
      updateSlider();
      return;
    }

    goToSlide(deltaX < 0 ? 1 : -1);
  });

  sliderWindow.addEventListener("touchcancel", () => {
    isDragging = false;
    updateSlider();
  });

  window.addEventListener("resize", updateSlider);
  updateSlider();
}

function shuffle(values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
}

function initScratchDemo() {
  const cells = document.querySelectorAll(".scratch-cell");
  const result = document.getElementById("scratch-result");

  if (!cells.length || !result) {
    return;
  }

  const prizes = Array.from(cells, (cell) => cell.dataset.prize || "");
  shuffle(prizes);

  cells.forEach((cell, index) => {
    cell.dataset.prize = prizes[index];
  });

  let usedAttempt = false;

  cells.forEach((cell) => {
    cell.addEventListener("click", () => {
      if (usedAttempt) {
        return;
      }

      usedAttempt = true;
      cell.classList.add("is-revealed");
      cell.textContent = cell.dataset.prize || "";
      result.textContent = `Resultado: ${cell.dataset.prize || ""}`;

      cells.forEach((otherCell) => {
        if (otherCell !== cell) {
          otherCell.disabled = true;
          otherCell.classList.add("is-locked");
        }
      });
    });
  });
}

function initIframeFullscreen() {
  const buttons = document.querySelectorAll("[data-fullscreen-target]");

  if (!buttons.length) {
    return;
  }

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const targetId = button.getAttribute("data-fullscreen-target");
      const target = targetId ? document.getElementById(targetId) : null;

      if (!target) {
        return;
      }

      try {
        if (document.fullscreenElement === target) {
          await document.exitFullscreen();
          button.textContent = "Pantalla completa";
          return;
        }

        await target.requestFullscreen();
        button.textContent = "Salir de pantalla completa";
      } catch (error) {
        console.error("No se pudo abrir pantalla completa", error);
      }
    });
  });

  document.addEventListener("fullscreenchange", () => {
    buttons.forEach((button) => {
      const targetId = button.getAttribute("data-fullscreen-target");
      const target = targetId ? document.getElementById(targetId) : null;
      const activa = !!target && document.fullscreenElement === target;
      button.textContent = activa ? "Salir de pantalla completa" : "Pantalla completa";
    });
  });
}

function initContactForm() {
  const form = document.getElementById("contact-form");

  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const company = String(formData.get("company") || "").trim();
    const message = String(formData.get("message") || "").trim();

    const subject = encodeURIComponent(`Nuevo contacto web - ${company || name || "Market Games"}`);
    const body = encodeURIComponent(
      [
        `Nombre: ${name || "No especificado"}`,
        `Email: ${email || "No especificado"}`,
        `Empresa: ${company || "No especificada"}`,
        "",
        "Mensaje:",
        message || "Sin mensaje"
      ].join("\n")
    );

    window.location.href = `mailto:c.botero92@gmail.com?subject=${subject}&body=${body}`;
  });
}

function initAccessFeedback() {
  const toast = document.getElementById("accessFeedbackToast");
  const links = document.querySelectorAll(".access-feedback-link");
  let timeoutId = null;

  if (!toast || !links.length) {
    return;
  }

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const message = link.dataset.feedback || "Abriendo acceso";
      toast.textContent = `${message}...`;
      toast.classList.add("is-visible");

      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        toast.classList.remove("is-visible");
      }, 1800);
    });
  });
}

function initImageLightbox() {
  const images = document.querySelectorAll([
    ".rms-command-card img",
    ".rms-large-visual img",
    ".rms-os-card img",
    ".rms-bento-card img",
    ".rms-product-card img",
    ".rms-guide-rail img",
    ".rms-strategy-media img"
  ].join(", "));

  if (!images.length) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "image-lightbox";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = [
    "<button class=\"image-lightbox-close\" type=\"button\" aria-label=\"Cerrar imagen ampliada\">Cerrar</button>",
    "<img class=\"image-lightbox-image\" alt=\"\">"
  ].join("");
  document.body.appendChild(overlay);

  const preview = overlay.querySelector(".image-lightbox-image");
  const closeButton = overlay.querySelector(".image-lightbox-close");

  function closeLightbox() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-lightbox-open");
  }

  function openLightbox(image) {
    preview.src = image.currentSrc || image.src;
    preview.alt = image.alt || "Imagen ampliada";
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-lightbox-open");
    closeButton.focus();
  }

  images.forEach((image) => {
    image.classList.add("is-zoomable");
    image.setAttribute("tabindex", "0");
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `${image.alt || "Imagen"} - ampliar`);

    image.addEventListener("click", () => openLightbox(image));
    image.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      openLightbox(image);
    });
  });

  closeButton.addEventListener("click", closeLightbox);
  preview.addEventListener("click", closeLightbox);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) {
      closeLightbox();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initReveal();
  initActiveNav();
  initPortfolioSlider();
  initScratchDemo();
  initIframeFullscreen();
  initContactForm();
  initAccessFeedback();
  initImageLightbox();
});
