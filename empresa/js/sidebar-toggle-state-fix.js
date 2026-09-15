(function sidebarToggleStateFix() {
  "use strict";

  const workspace = document.getElementById("workspace");
  const toggleButton = document.getElementById("menuToggleButton");
  if (!workspace || !toggleButton) return;

  const important = (node, property, value) => {
    if (node) node.style.setProperty(property, value, "important");
  };
  const groupIcons = { offer: "bolt", operate: "work", optimize: "trending_up", gos: "analytics", admin: "settings" };

  const syncSidebarPresentation = () => {
    const collapsed = window.matchMedia("(min-width: 961px)").matches
      && (workspace.classList.contains("sidebar-collapsed") || workspace.classList.contains("sidebar-expanding"));

    document.querySelectorAll(".sidebar .sidebar-nav-section > .nav-group-toggle").forEach((group) => {
      important(group, "display", "grid");
      important(group, "width", collapsed ? "52px" : "100%");
      important(group, "min-height", collapsed ? "52px" : "auto");
      important(group, "margin", collapsed ? "0 auto" : "0");
      important(group, "border-radius", collapsed ? "12px" : "0");
      important(group, "grid-template-columns", collapsed ? "1fr" : "minmax(0, 1fr) 24px");
      important(group, "justify-items", collapsed ? "center" : "stretch");
      if (collapsed) important(group, "padding-inline", "0");
      else group.style.removeProperty("padding-inline");
      const label = group.querySelector(":scope > span:first-child");
      important(label, "display", collapsed ? "none" : "block");
      const name = String(label?.textContent || "").trim();
      if (name) {
        group.setAttribute("aria-label", name);
        group.title = name;
      }
      const icon = group.querySelector(":scope > .material-symbols-outlined");
      if (icon) {
        icon.textContent = collapsed ? (groupIcons[group.dataset.sidebarGroupToggle] || "apps") : "expand_more";
        important(icon, "display", "grid");
        important(icon, "justify-self", collapsed ? "center" : "end");
        important(icon, "grid-column", collapsed ? "1" : "2");
        important(icon, "width", "24px");
        if (collapsed) important(icon, "transform", "none");
        else icon.style.removeProperty("transform");
      }
    });

    document.querySelectorAll(".sidebar .nav-item[data-view]").forEach((row) => {
      const text = row.querySelector(":scope > span:not(.material-symbols-outlined):not(.feature-tier-badge)");
      const badge = row.querySelector(":scope > .feature-tier-badge");
      important(row, "grid-template-columns", collapsed ? "1fr" : "28px minmax(0, 1fr) 34px");
      important(row, "grid-auto-flow", collapsed ? "row" : "column");
      important(row, "justify-items", collapsed ? "center" : "stretch");
      important(row, "justify-content", collapsed ? "center" : "stretch");
      important(row, "column-gap", collapsed ? "0" : "10px");
      important(row, "width", collapsed ? "52px" : (row.matches(".active,[data-sidebar-current-match='true']") ? "calc(100% - 4px)" : "100%"));
      important(row, "min-width", collapsed ? "52px" : "0");
      important(row, "height", collapsed ? "52px" : "auto");
      important(row, "min-height", collapsed ? "52px" : (row.matches(".active,[data-sidebar-current-match='true']") ? "68px" : "54px"));
      important(row, "margin", collapsed ? "0 auto" : (row.matches(".active,[data-sidebar-current-match='true']") ? "5px 2px" : "0"));
      important(row, "padding", collapsed ? "0" : (row.matches(".active,[data-sidebar-current-match='true']") ? "9px 8px 9px 10px" : "8px 4px 8px 8px"));
      important(row, "border-radius", collapsed ? "12px" : (row.matches(".active,[data-sidebar-current-match='true']") ? "12px" : "0"));
      important(text, "display", collapsed ? "none" : "flex");
      important(text, "width", collapsed ? "0" : "100%");
      text?.querySelectorAll(":scope > strong, :scope > small").forEach((copy) => {
        important(copy, "display", collapsed ? "none" : "block");
      });
      important(badge, "display", collapsed ? "none" : "inline-flex");
      if (collapsed) row.querySelector(".sidebar-current-location-badge")?.remove();
    });
  };

  toggleButton.addEventListener("click", syncSidebarPresentation);
  window.addEventListener("resize", syncSidebarPresentation, { passive: true });
  window.addEventListener("qori-sidebar-presentation", syncSidebarPresentation);
  window.addEventListener("pageshow", syncSidebarPresentation);
  syncSidebarPresentation();
})();
