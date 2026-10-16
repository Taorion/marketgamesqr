// Shared by subscription access and billing. Only the internal commercial service writes these terms.
const MODULES = {
  contacts: { name: "Contactos y CRM", features: ["contact_directory", "leads_view", "leads_export"], limits: { contacts: 1000, lead_view_rows: 1000, lead_exports_month: 10, lead_export_rows_month: 5000 } },
  agenda: { name: "Agenda", features: ["agenda"] },
  products: { name: "Inventario y productos", features: ["products", "gift_inventory"], limits: { gift_inventory_products: 300 } },
  sales: { name: "Ventas y vendedores del negocio", features: ["sales_tracker", "sellers"], limits: { sellers: 10 } },
  affiliates: { name: "Fidelización y referidos", features: ["affiliates", "referrals", "digital_affiliate_card", "prize_program"], limits: { affiliates: 100, loyalty_contacts: 1000 } },
  gift_cards: { name: "Gift Cards", features: ["gift_cards"], limits: { gift_cards_month: 100 } },
  campaigns: { name: "Campañas", features: ["campaigns", "campaign_reports"], limits: { active_campaigns: 15 } },
  activations: { name: "Activaciones y juegos", features: ["qr_batch_generator", "template_games"], limits: { active_interactive_activations: 10, activation_types_month: 30, allowed_interactive_activation_types: null } },
  communications: { name: "Comunicaciones y correo", features: ["communications", "email_marketing"], limits: { communication_emails_month: 5000, communication_emails_day: 500 } },
  analytics: { name: "Analítica y reportes", features: ["dashboard_full", "advanced_reports", "data_explorer", "campaign_comparison", "executive_reports"], limits: { metric_exports_month: 30, executive_reports_month: 10 } },
  rms: { name: "Operación RMS", features: ["rms_core", "rms_quality_control", "journey", "customer_valuation"] },
  intelligence: { name: "Inteligencia y Revenue Center", features: ["rms_intelligence", "predictive_analytics", "revenue_center", "focus_mode"] },
  automation: { name: "Automatizaciones", features: ["automations", "post_sale_automation"] },
  branches: { name: "Sedes y equipo", features: ["multi_branch", "team_management"], limits: { branches: 3, users: 5, validators: 5 } },
  showcase: { name: "Vitrina web", features: ["showcase"], limits: { showcases: 10 } },
  branding: { name: "Personalización de marca", features: ["advanced_branding", "ticket_branding", "brand_assets"] },
  channels: { name: "Medios de adquisición", features: ["acquisition_channels"], limits: { acquisition_channels: 10 } },
  retention: { name: "Reciclaje, ranking y competencia", features: ["recycling", "ranking", "competitive_radar"] },
};
const LIMIT_LABELS = { users: "Usuarios", validators: "Validadores", branches: "Sedes", contacts: "Contactos", gift_inventory_products: "Productos", sellers: "Vendedores del negocio", affiliates: "Afiliados" };

function activeTerms(business, planCode, now = new Date()) {
  const terms = business?.settings?.qori_commercial;
  return terms?.status === "ACTIVE" && terms.plan_code === planCode && terms.approved_by && terms.deal_id ? terms : null;
}
function inPeriod(start, end, now) {
  return Boolean(start && end && Number.isFinite(Date.parse(start)) && Number.isFinite(Date.parse(end)) && now >= new Date(start) && now < new Date(end));
}
function commercialPrice(plan, business, now = new Date()) {
  const terms = activeTerms(business, plan.code, now);
  if (!terms || !inPeriod(terms.discount_starts_at, terms.discount_ends_at, now) || !(terms.discount_percent > 0 && terms.discount_percent <= 90)) return null;
  return { price_cop: Math.round(Number(plan.monthly_price_cop) * (1 - terms.discount_percent / 100)), standard_price_cop: Number(plan.monthly_price_cop), special_pricing_applied: true, special_pricing_label: `Beneficio comercial Qori: ${terms.discount_percent}%`, special_pricing_ends_at: terms.discount_ends_at };
}
function applyCommercialEntitlements(plan, business, now = new Date()) {
  const terms = activeTerms(business, plan.code, now);
  if (!terms) return plan;
  const result = { ...plan, features: { ...plan.features }, limits: { ...plan.limits } };
  if (inPeriod(terms.benefits_starts_at, terms.benefits_ends_at, now)) {
    const overrides = { ...(terms.limit_overrides || {}) };
    for (const key of terms.modules || []) {
      const module = MODULES[key];
      if (!module) continue;
      for (const feature of module.features) result.features[feature] = true;
      for (const [limit, value] of Object.entries(module.limits || {})) {
        if (!(limit in overrides) || value === null || (overrides[limit] !== null && value > overrides[limit])) overrides[limit] = value;
      }
    }
    for (const [key, value] of Object.entries(overrides)) {
      if (result.limits[key] === null) continue;
      if (value === null || (Number.isFinite(value) && value >= 0 && value > Number(result.limits[key] || 0))) result.limits[key] = value;
    }
  }
  const price = commercialPrice(plan, business, now);
  result.commercial = { modules: terms.modules || [], benefits_ends_at: terms.benefits_ends_at, discount_percent: price ? terms.discount_percent : 0, discount_ends_at: terms.discount_ends_at, trial_ends_at: terms.trial_ends_at, standard_monthly_price_cop: plan.monthly_price_cop };
  if (price) result.monthly_price_cop = price.price_cop;
  return result;
}
module.exports = { MODULES, LIMIT_LABELS, activeTerms, inPeriod, commercialPrice, applyCommercialEntitlements };
