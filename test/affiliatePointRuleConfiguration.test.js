const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  affiliatePointRuleMetadata,
  affiliatePurchasePointsForAmount,
  normalizeAffiliatePointRuleInput,
  referralPointsForAmount,
  rulesFromSettings,
} = require("../backend/src/services/affiliatePointRulesService");

const current = rulesFromSettings({ affiliate_points: { point_amount_cop: 1000, referral_rate: 1, referral_rounding: "floor" } });

for (const point_amount_cop of [1, 500, 1000, 2500, 10000, 100000]) {
  test(`acepta monto natural COP ${point_amount_cop}`, () => {
    assert.equal(normalizeAffiliatePointRuleInput({ affiliate_point_amount_cop: point_amount_cop }, current).point_amount_cop, point_amount_cop);
  });
}

for (const [point_amount_cop, referral_rate] of [[500, 1], [1000, 2], [2500, 3], [5000, 10], [10000, 1]]) {
  test(`persiste la equivalencia ${point_amount_cop} = ${referral_rate}`, () => {
    const saved = normalizeAffiliatePointRuleInput({ affiliate_point_amount_cop: point_amount_cop, affiliate_referral_points_rate: referral_rate }, current);
    const reloaded = rulesFromSettings({ affiliate_points: saved });
    assert.equal(reloaded.point_amount_cop, point_amount_cop);
    assert.equal(reloaded.referral_rate, referral_rate);
  });
}

test("la formula canonica coincide con los ejemplos y ambos redondeos", () => {
  const floor = { point_amount_cop: 2500, referral_rate: 3, referral_rounding: "floor", referral_purchase_points: 0 };
  assert.deepEqual([2500, 5000, 10000].map((amount) => referralPointsForAmount(amount, floor)), [3, 6, 12]);
  assert.equal(referralPointsForAmount(3000, floor), 3);
  assert.equal(referralPointsForAmount(3000, { ...floor, referral_rounding: "ceil" }), 4);
});

test("una compra directa de afiliado usa la relacion monetaria y no el bono fijo de referido", () => {
  const rules = {
    point_amount_cop: 1000,
    referral_rate: 228,
    referral_rounding: "floor",
    referral_purchase_points: 2,
  };
  assert.equal(affiliatePurchasePointsForAmount(2000, rules), 456);
  assert.equal(referralPointsForAmount(2000, rules), 2);
});

test("las dos rutas de compra directa distinguen puntos monetarios de puntos por referido", () => {
  const portalController = fs.readFileSync(path.join(__dirname, "../backend/src/controllers/businessPortalController.js"), "utf8");
  const affiliateService = fs.readFileSync(path.join(__dirname, "../backend/src/services/affiliateService.js"), "utf8");
  assert.match(portalController, /isDirectAffiliatePurchase[\s\S]*affiliatePurchasePointsForAmount\(body\.sale_amount, affiliatePointRules\)/);
  assert.match(portalController, /isDirectAffiliatePurchase \? "AFFILIATE_PURCHASE" : "REFERRAL_PURCHASE"/);
  assert.match(affiliateService, /body\.metadata\?\.affiliate_purchase[\s\S]*affiliatePurchasePointsForAmount\(amount, pointRules\)/);
});

for (const invalid of [0, -1, "", "abc", NaN, Infinity, 1.5, 1000000001]) {
  test(`rechaza monto invalido ${String(invalid)}`, () => {
    assert.throws(() => normalizeAffiliatePointRuleInput({ affiliate_point_amount_cop: invalid }, current));
  });
}

for (const invalid of [0, -1, "", 1.5, 1000001]) {
  test(`rechaza puntos invalidos ${String(invalid)}`, () => {
    assert.throws(() => normalizeAffiliatePointRuleInput({ affiliate_referral_points_rate: invalid }, current));
  });
}

test("una actualizacion parcial conserva la regla previa sin defaults silenciosos", () => {
  const saved = normalizeAffiliatePointRuleInput({ affiliate_referral_points_rounding: "ceil" }, { ...current, point_amount_cop: 7777, referral_rate: 9 });
  assert.deepEqual(saved, { point_amount_cop: 7777, referral_rate: 9, referral_rounding: "ceil" });
});

test("cada movimiento recibe instantanea completa y fecha de aplicacion", () => {
  const metadata = affiliatePointRuleMetadata({ ...current, referral_registration_points: 0, referral_purchase_points: 0 });
  assert.equal(metadata.affiliate_point_amount_cop, 1000);
  assert.equal(metadata.referral_points_rate, 1);
  assert.equal(metadata.referral_points_rounding, "floor");
  assert.ok(Number.isFinite(Date.parse(metadata.affiliate_point_rule_applied_at)));
});

test("la interfaz usa step 1, no sugiere secuencias artificiales y valida antes de enviar", () => {
  const html = fs.readFileSync(path.join(__dirname, "../empresa/index.html"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../empresa/js/app.js"), "utf8");
  const ruleCard = html.match(/<section class="[^"]*affiliate-point-rule-card[^"]*"[^>]*>/)?.[0] || "";
  assert.ok(ruleCard, "La regla de puntos debe existir dentro de Cuenta");
  assert.doesNotMatch(ruleCard, /\bhidden\b/, "La regla de puntos no puede quedar oculta permanentemente");
  assert.match(html, /affiliate-point-visible-v481-20260911/);
  assert.match(html, /accountAffiliatePointAmountInput[^>]+min="1"[^>]+step="1"/);
  assert.match(html, /accountAffiliatePointRateInput[^>]+min="1"[^>]+step="1"/);
  const amountField = html.match(/<input id="accountAffiliatePointAmountInput"[^>]+>/)?.[0] || "";
  assert.doesNotMatch(amountField, /step="100"|value="601"|value="1001"/);
  assert.match(js, /readAccountAffiliatePointRule\(\)/);
  assert.doesNotMatch(js, /Number\(accountAffiliatePointAmountInput\?\.value \|\|/);
});

test("todos los escritores comerciales usan el calculo y la instantanea canonicos", () => {
  const files = [
    "controllers/businessPortalController.js", "controllers/salesController.js", "services/affiliateService.js",
    "services/leadCrmService.js", "services/qrService.js", "services/rmsMachineService.js",
  ];
  for (const file of files) {
    const source = fs.readFileSync(path.join(__dirname, "../backend/src", file), "utf8");
    assert.match(source, /referralPointsForAmount/);
    assert.match(source, /affiliatePointRuleMetadata/);
  }
});
