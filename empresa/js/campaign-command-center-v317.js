(() => {
  const styleId = "campaignCommandCenterRuntimeV317";
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    html body[data-current-view="campaigns"] .portal-shell .view-section.active[data-view="campaigns"].campaign-premium-enabled > #campaignPremiumWorkspace {
      display: grid !important;
    }
    html body[data-current-view="campaigns"] .portal-shell .view-section.active[data-view="campaigns"].campaign-premium-enabled > #campaignPremiumWorkspace ~ .campaign-library-shell,
    html body[data-current-view="campaigns"] .portal-shell .view-section.active[data-view="campaigns"].campaign-premium-enabled:has(> #campaignPremiumWorkspace) > .campaign-head {
      display: none !important;
    }
    html body[data-current-view="campaigns"] .portal-shell #campaignPremiumWorkspace .campaign-premium-hero h3 {
      color: #fff !important;
      -webkit-text-fill-color: #fff !important;
      text-shadow: 0 8px 24px rgba(0, 16, 70, .22) !important;
    }
    html body[data-current-view="campaigns"] .portal-shell #campaignPremiumWorkspace .campaign-premium-hero h3 em,
    html body[data-current-view="campaigns"] .portal-shell #campaignPremiumWorkspace .campaign-premium-hero .mono-label,
    html body[data-current-view="campaigns"] .portal-shell #campaignPremiumWorkspace .campaign-premium-metrics span {
      color: #bdf6ff !important;
      -webkit-text-fill-color: #bdf6ff !important;
    }
    html body[data-current-view="campaigns"] .portal-shell #campaignPremiumWorkspace .campaign-premium-hero p,
    html body[data-current-view="campaigns"] .portal-shell #campaignPremiumWorkspace .campaign-premium-metrics small {
      color: rgba(238, 252, 255, .88) !important;
      -webkit-text-fill-color: rgba(238, 252, 255, .88) !important;
    }
    html body[data-current-view="campaigns"] .portal-shell #campaignPremiumWorkspace .campaign-premium-metrics strong {
      color: #fff !important;
      -webkit-text-fill-color: #fff !important;
    }
    html body[data-current-view="campaigns"] .portal-shell #campaignPremiumWorkspace .campaign-premium-toolbar {
      display: grid !important;
      grid-template-columns: minmax(260px, 1fr) minmax(190px, auto) auto !important;
      align-items: center !important;
      gap: 10px !important;
    }
    html body[data-current-view="campaigns"] .portal-shell #campaignPremiumWorkspace .campaign-premium-toolbar > label {
      width: 100% !important;
      min-width: 0 !important;
    }
    @media (max-width: 760px) {
      html body[data-current-view="campaigns"] .portal-shell #campaignPremiumWorkspace .campaign-premium-toolbar {
        grid-template-columns: 1fr !important;
      }
      html body[data-current-view="campaigns"] .portal-shell #campaignPremiumWorkspace .campaign-premium-toolbar > select,
      html body[data-current-view="campaigns"] .portal-shell #campaignPremiumWorkspace .campaign-premium-toolbar > button {
        width: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);
})();
