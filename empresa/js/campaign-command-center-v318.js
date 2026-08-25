(() => {
  const applyCampaignPresentation = () => {
    const workspace = document.getElementById("campaignPremiumWorkspace");
    if (!workspace) return;
    const view = workspace.closest('.view-section[data-view="campaigns"]');
    if (!view) return;

    workspace.style.setProperty("display", "grid", "important");
    view.querySelector(":scope > .campaign-head")?.style.setProperty("display", "none", "important");
    view.querySelectorAll(".campaign-library-shell").forEach((library) => {
      library.style.setProperty("display", "none", "important");
    });

    const headline = workspace.querySelector(".campaign-premium-hero h3");
    if (headline) {
      headline.style.setProperty("color", "#ffffff", "important");
      headline.style.setProperty("-webkit-text-fill-color", "#ffffff", "important");
      headline.style.setProperty("text-shadow", "0 8px 24px rgba(0, 16, 70, .22)", "important");
    }
    workspace.querySelectorAll(".campaign-premium-hero h3 em, .campaign-premium-hero .mono-label, .campaign-premium-metrics span").forEach((element) => {
      element.style.setProperty("color", "#bdf6ff", "important");
      element.style.setProperty("-webkit-text-fill-color", "#bdf6ff", "important");
    });
    workspace.querySelectorAll(".campaign-premium-hero p, .campaign-premium-metrics small").forEach((element) => {
      element.style.setProperty("color", "rgba(238, 252, 255, .88)", "important");
      element.style.setProperty("-webkit-text-fill-color", "rgba(238, 252, 255, .88)", "important");
    });
    workspace.querySelectorAll(".campaign-premium-metrics strong").forEach((element) => {
      element.style.setProperty("color", "#ffffff", "important");
      element.style.setProperty("-webkit-text-fill-color", "#ffffff", "important");
    });
  };

  const observer = new MutationObserver(applyCampaignPresentation);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-current-view"] });
  document.addEventListener("DOMContentLoaded", applyCampaignPresentation, { once: true });
  window.addEventListener("load", applyCampaignPresentation, { once: true });
})();
