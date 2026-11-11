// Qori_Comisiones_2026_VF1.pdf, pages 2-3. Months belong to each client, not to the seller's sales count.
const VERSION = 'QORI_2026_VF1';
const plans = Object.freeze({
  DESPEGA: Object.freeze({ name: 'Despega', monthly_price_cop: 75000, rates_bps: Object.freeze([10000, 1000, 1000, 1000, 1000, 1000]) }),
  STARTER: Object.freeze({ name: 'Crece', monthly_price_cop: 229000, rates_bps: Object.freeze([5000, 2500, 2500, 2000, 1500, 1000]) }),
  GROWTH: Object.freeze({ name: 'Escala', monthly_price_cop: 999000, rates_bps: Object.freeze([5000, 2500, 2500, 2000, 1500, 1000]) }),
  PRO: Object.freeze({ name: 'Expande', monthly_price_cop: 1999000, rates_bps: Object.freeze([5000, 2500, 2500, 2000, 1500, 1000]) })
});
function rateBps(planCode, month) {
  if (!Number.isInteger(month) || month < 1 || month > 6) return 0;
  return plans[planCode]?.rates_bps[month - 1] || 0;
}
function commissionCop(baseCop, planCode, month) {
  const raw = String(baseCop);
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(raw)) throw new TypeError('La base debe ser un importe positivo en COP con hasta dos decimales.');
  const [whole, fraction = ''] = raw.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  const earned = (cents * BigInt(rateBps(planCode, month)) + 5000n) / 10000n;
  return Number(earned) / 100;
}
function publicPolicy() {
  return { version: VERSION, window_months: 6, tickets_rate: 0.10, plans: Object.entries(plans).map(([code, plan]) => ({
    code, name: plan.name, monthly_price_cop: plan.monthly_price_cop,
    months: plan.rates_bps.map((bps, index) => ({ month: index + 1, rate: bps / 10000, reference_commission_cop: commissionCop(plan.monthly_price_cop, code, index + 1) })),
    reference_total_cop: plan.rates_bps.reduce((sum, _, index) => sum + commissionCop(plan.monthly_price_cop, code, index + 1), 0)
  })) };
}
module.exports = { VERSION, plans, rateBps, commissionCop, publicPolicy };
