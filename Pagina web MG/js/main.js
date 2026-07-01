const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function initHeader() {
  const header = document.querySelector("[data-site-header]");

  if (!header) {
    return;
  }

  function updateHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
}

function initMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  if (!toggle || !nav) {
    return;
  }

  function closeMenu() {
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  }

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    nav.classList.toggle("is-open", !isOpen);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1180) {
      closeMenu();
    }
  });
}

function initReveal() {
  const revealItems = document.querySelectorAll(".reveal");

  if (!revealItems.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.16,
    rootMargin: "0px 0px -8% 0px"
  });

  revealItems.forEach((item) => observer.observe(item));
}

function initActiveNav() {
  const sections = document.querySelectorAll("main section[id]");
  const links = Array.from(document.querySelectorAll(".main-nav a[href^='#']"));

  if (!sections.length || !links.length || !("IntersectionObserver" in window)) {
    return;
  }

  const linkMap = new Map(links.map((link) => [link.getAttribute("href"), link]));

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
    threshold: 0.18,
    rootMargin: "-34% 0px -48% 0px"
  });

  sections.forEach((section) => observer.observe(section));
}

function initSlider(slider) {
  const slides = Array.from(slider.querySelectorAll(".hero-slide, .experience-slide, .sector-slide"));
  const previous = slider.querySelector("[data-prev]");
  const next = slider.querySelector("[data-next]");
  const dotsContainer = slider.querySelector("[data-dots]");
  let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
  let timerId = null;
  let startX = 0;
  let currentX = 0;
  let dragging = false;

  if (!slides.length || !dotsContainer) {
    return;
  }

  if (activeIndex < 0) {
    activeIndex = 0;
  }

  const dotButtons = slides.map((slide, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Ver slide ${index + 1}`);
    button.addEventListener("click", () => {
      showSlide(index);
      restartAutoplay();
    });
    dotsContainer.appendChild(button);
    return button;
  });

  function showSlide(index) {
    activeIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });

    dotButtons.forEach((button, dotIndex) => {
      button.classList.toggle("is-active", dotIndex === activeIndex);
    });
  }

  function move(direction) {
    showSlide(activeIndex + direction);
  }

  function startAutoplay() {
    if (reducedMotion.matches || timerId) {
      return;
    }

    timerId = window.setInterval(() => move(1), slider.dataset.slider === "hero" ? 6200 : 5400);
  }

  function stopAutoplay() {
    window.clearInterval(timerId);
    timerId = null;
  }

  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  previous?.addEventListener("click", () => {
    move(-1);
    restartAutoplay();
  });

  next?.addEventListener("click", () => {
    move(1);
    restartAutoplay();
  });

  slider.addEventListener("mouseenter", stopAutoplay);
  slider.addEventListener("mouseleave", startAutoplay);
  slider.addEventListener("focusin", stopAutoplay);
  slider.addEventListener("focusout", startAutoplay);

  slider.addEventListener("touchstart", (event) => {
    startX = event.touches[0].clientX;
    currentX = startX;
    dragging = true;
    stopAutoplay();
  }, { passive: true });

  slider.addEventListener("touchmove", (event) => {
    if (!dragging) {
      return;
    }

    currentX = event.touches[0].clientX;
  }, { passive: true });

  slider.addEventListener("touchend", () => {
    if (!dragging) {
      return;
    }

    const deltaX = currentX - startX;
    dragging = false;

    if (Math.abs(deltaX) > 44) {
      move(deltaX < 0 ? 1 : -1);
    }

    startAutoplay();
  });

  slider.addEventListener("touchcancel", () => {
    dragging = false;
    startAutoplay();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoplay();
      return;
    }

    startAutoplay();
  });

  showSlide(activeIndex);
  startAutoplay();
}

function initSliders() {
  document.querySelectorAll("[data-slider]").forEach(initSlider);
}

function initCounters() {
  const counters = document.querySelectorAll("[data-count]");

  if (!counters.length) {
    return;
  }

  function animateCounter(counter) {
    const target = Number(counter.dataset.count || "0");
    const duration = reducedMotion.matches ? 1 : 1100;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = String(Math.round(target * eased));

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    }

    window.requestAnimationFrame(tick);
  }

  if (!("IntersectionObserver" in window)) {
    counters.forEach(animateCounter);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.target.dataset.counted === "true") {
        return;
      }

      entry.target.dataset.counted = "true";
      animateCounter(entry.target);
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.45
  });

  counters.forEach((counter) => observer.observe(counter));
}

function initPointerGlow() {
  const cards = document.querySelectorAll([
    ".feature-grid article",
    ".capability-grid article",
    ".portal-feature",
    ".benefits-grid article",
    ".lead-flow article",
    ".metric-grid article",
    ".sector-mini-grid article"
  ].join(","));

  if (!cards.length || window.matchMedia("(pointer: coarse)").matches) {
    return;
  }

  cards.forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--mx", `${x.toFixed(1)}%`);
      card.style.setProperty("--my", `${y.toFixed(1)}%`);
    });
  });
}

function initLightbox() {
  const figures = document.querySelectorAll(".gallery-grid figure");

  if (!figures.length) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "image-lightbox";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = [
    "<button type=\"button\" aria-label=\"Cerrar imagen ampliada\">Cerrar</button>",
    "<img alt=\"\">"
  ].join("");

  document.body.appendChild(overlay);

  const overlayImage = overlay.querySelector("img");
  const closeButton = overlay.querySelector("button");

  function closeLightbox() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-lightbox-open");
  }

  function openLightbox(image) {
    overlayImage.src = image.currentSrc || image.src;
    overlayImage.alt = image.alt || "Imagen Market Games ampliada";
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-lightbox-open");
    closeButton.focus();
  }

  figures.forEach((figure) => {
    const image = figure.querySelector("img");

    if (!image) {
      return;
    }

    figure.setAttribute("tabindex", "0");
    figure.setAttribute("role", "button");
    figure.setAttribute("aria-label", `${image.alt}. Ampliar imagen.`);

    figure.addEventListener("click", () => openLightbox(image));
    figure.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      openLightbox(image);
    });
  });

  closeButton.addEventListener("click", closeLightbox);
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

function initYear() {
  const year = new Date().getFullYear();

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = year;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initMenu();
  initReveal();
  initActiveNav();
  initSliders();
  initCounters();
  initPointerGlow();
  initLightbox();
  initYear();
});
