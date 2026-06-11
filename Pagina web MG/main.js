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

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 980) {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    }
  });
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");

  if (!items.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
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
    threshold: 0.18
  });

  items.forEach((item) => observer.observe(item));
}

function initActiveNav() {
  const sections = document.querySelectorAll("main section[id]");
  const links = Array.from(document.querySelectorAll(".site-nav a[href^='#']"));

  if (!sections.length || !links.length || !("IntersectionObserver" in window)) {
    return;
  }

  const map = new Map(links.map((link) => [link.getAttribute("href"), link]));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      links.forEach((link) => link.classList.remove("is-active"));
      const link = map.get(`#${entry.target.id}`);

      if (link) {
        link.classList.add("is-active");
      }
    });
  }, {
    rootMargin: "-35% 0px -45% 0px",
    threshold: 0.12
  });

  sections.forEach((section) => observer.observe(section));
}

function setCurrentYear() {
  const year = new Date().getFullYear();

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = year;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initReveal();
  initActiveNav();
  setCurrentYear();
});
