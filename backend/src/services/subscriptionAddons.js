// Account-specific additions. Only the superadmin endpoint may write this setting.
const { MODULES, LIMIT_LABELS } = require('./commercialTerms');
const modules = {
  ...MODULES,
  activations: { ...MODULES.activations, features: [...MODULES.activations.features, 'interactive_activations'] },
  stamp_cards: { name: 'Tarjetas de sellos', features: ['stamp_cards'] },
  quotes: { name: 'Cotizaciones', features: ['quotes', 'products'] },
};
const limitLabels = {
  ...LIMIT_LABELS, showcases: 'Vitrinas', active_campaigns: 'Campañas activas',
  active_interactive_activations: 'Activaciones simultáneas', gift_cards_month: 'Gift Cards por mes',
  acquisition_channels: 'Medios de adquisición', communication_emails_month: 'Correos por mes',
  communication_emails_day: 'Correos por día',
};
function applyAddons(plan, business) {
  const addon = business.settings?.subscription_addons;
  if (!addon || addon.plan_code !== plan.code || !addon.approved_by || !addon.payment_order_id
      || business.is_active === false || business.subscription_status !== 'ACTIVE'
      || !(plan.monthly_price_cop > 0) || plan.code === 'DESCUBRE'
      || (addon.expires_at && new Date(addon.expires_at) <= new Date())) return plan;
  const result = { ...plan, features: { ...plan.features }, limits: { ...plan.limits } };
  const overrides = { ...addon.limits };
  for (const key of addon.modules || []) {
    const module = modules[key];
    if (!module) continue;
    for (const feature of module.features) result.features[feature] = true;
    for (const [limit, value] of Object.entries(module.limits || {})) {
      if (!(limit in overrides)) overrides[limit] = value;
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (result.limits[key] === null) continue;
    if (value === null || (Number.isSafeInteger(value) && value > Number(result.limits[key] || 0))) result.limits[key] = value;
  }
  result.addons = { modules: addon.modules, limits: addon.limits, expires_at: addon.expires_at };
  return result;
}
module.exports = { modules, limitLabels, applyAddons };
