"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const html = read("empresa/index.html");
const app = read("empresa/js/app.js");
const css = read("empresa/css/portal-clean-v39.css");
const businessController = read("backend/src/controllers/businessController.js");
const businessRoutes = read("backend/src/routes/businessRoutes.js");
const qrService = read("backend/src/services/qrService.js");
const qrController = read("backend/src/controllers/qrController.js");
const salesController = read("backend/src/controllers/salesController.js");
const benefitCheckoutService = read("backend/src/services/benefitCheckoutService.js");
const rewardPassService = read("backend/src/services/rewardPassService.js");
const subscriptionService = read("backend/src/services/subscriptionService.js");
const checkoutMigration = read("database/migrations/20260824135450_validator_benefit_checkout.sql");

for (const [name, source] of Object.entries({
  "empresa/js/app.js": app,
  "businessController.js": businessController,
  "businessRoutes.js": businessRoutes,
  "qrService.js": qrService,
  "qrController.js": qrController,
  "salesController.js": salesController,
  "benefitCheckoutService.js": benefitCheckoutService,
  "rewardPassService.js": rewardPassService,
  "subscriptionService.js": subscriptionService,
})) {
  assert.doesNotThrow(() => new vm.Script(source, { filename: name }), `${name} debe tener sintaxis JavaScript valida`);
}

const validatorHtml = html.match(/<section class="view-section validator-command-center"[\s\S]*?<section class="view-section[^"]*"[^>]*data-view="branches"/)?.[0];
assert.ok(validatorHtml, "Debe existir la seccion estatica premium del Validador");

const expectedIds = [
  "validatorQrTokenInput",
  "validatorDetectedType",
  "validatorResultPanel",
  "validatorOperationPanel",
  "validatorRewardPassFields",
  "validatorStandardSaleFields",
  "validatorStandardSaleAmountInput",
  "validatorStandaloneModeInput",
  "validatorPurchaseModeInput",
  "validatorPurchaseItems",
  "validatorAddPurchaseItemButton",
  "validatorCheckoutSummary",
  "validatorCheckoutTotalValue",
  "validatorRedeemButton",
  "saveValidatorSaleButton",
  "validatorHistoryCards",
  "validatorHistoryTable",
];
for (const id of expectedIds) {
  assert.match(validatorHtml, new RegExp(`id="${id}"`), `Falta el contrato DOM ${id}`);
}

const ids = [...validatorHtml.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual([...new Set(duplicates)], [], "No debe haber IDs duplicados dentro del Validador");

assert.doesNotMatch(
  validatorHtml,
  /id="validatorRewardPassInvoiceInput"[^>]*\srequired(?:\s|>)/,
  "La factura de Reward Pass no debe bloquear tickets QR comunes"
);
assert.match(app, /data\.kind === "reward_pass"/);
assert.match(app, /if \(validatorKind\(\) === "reward_pass"\) \{/);
assert.match(app, /validatorStandardSaleAmountInput/);
assert.match(app, /calculateValidatorCheckoutPreview/);
assert.match(app, /mode:\s*state\.validatorRedemptionMode/);
assert.match(app, /\/validator-history\?limit=160/);
assert.doesNotMatch(app, /renderValidatorHistory\(data\.redemptions/);

  assert.match(businessRoutes, /requireRoles\("BUSINESS_OWNER", "BUSINESS_MANAGER", "VALIDATOR", "ADMIN", "ADMIN_MARKET_GAMES", "ADMIN_Qori"\)/);
assert.match(businessController, /'reward_pass'::text as kind/);
assert.match(businessController, /union all/i);
assert.match(businessController, /q\.origin_type::text as source_label/);
assert.match(qrService, /assertQrValidator\(user\)/);
assert.match(qrService, /calculateBenefitCheckout/);
assert.match(qrService, /insert into attributed_sales/);
assert.match(qrController, /redeemCheckoutSchema/);
assert.match(salesController, /purchase_subtotal/);
assert.match(benefitCheckoutService, /purchase_required/);
assert.match(benefitCheckoutService, /BUY_X_GET_Y/);
assert.match(qrService, /assertStandaloneBusinessFeature\(user, accessRow\.business_id, "qr_validator"\)/);
assert.match(rewardPassService, /assertStandaloneBusinessFeature\(user, accessRow\.company_id, "qr_validator"\)/);
assert.match(subscriptionService, /async function assertStandaloneBusinessFeature/);

assert.match(css, /Validator command center v1/);
assert.match(css, /@media \(max-width: 760px\)/);
assert.match(css, /\.validator-history-cards/);
assert.match(css, /\.validator-redemption-modes/);
assert.match(css, /\.validator-checkout-summary/);
assert.match(css, /validatorSurfaceL/);
assert.match(css, /\[hidden\][^{]*\{[^}]*display:\s*none\s*!important/s);
assert.match(html, /validator-benefit-checkout-v345-20260824/g);
assert.match(checkoutMigration, /benefit_discount_amount/);
assert.match(checkoutMigration, /application_mode/);

const { calculateBenefitCheckout } = require(path.join(root, "backend/src/services/benefitCheckoutService.js"));

const percentCheckout = calculateBenefitCheckout(
  { benefitType: "PERCENT_DISCOUNT", label: "20%", benefitValue: { percent: 20 }, mode: "PURCHASE", purchase: { subtotal: 100000 } }
);
assert.equal(percentCheckout.discount_amount, 20000);
assert.equal(percentCheckout.final_total, 80000);

const fixedCheckout = calculateBenefitCheckout({
  benefitType: "FIXED_AMOUNT_DISCOUNT",
  label: "$50.000",
  benefitValue: { discount_amount: 50000 },
  mode: "PURCHASE",
  purchase: { subtotal: 30000 },
});
assert.equal(fixedCheckout.discount_amount, 30000);
assert.equal(fixedCheckout.final_total, 0);

const scopedCheckout = calculateBenefitCheckout(
  {
    benefitType: "PERCENT_DISCOUNT",
    label: "10% cafe",
    benefitValue: { percent: 10, product_scope: { mode: "applies_to_product", product_name: "Cafe" } },
    mode: "PURCHASE",
    purchase: {
      line_items: [
        { name: "Cafe", quantity: 2, unit_price: 10000 },
        { name: "Torta", quantity: 1, unit_price: 15000 },
      ],
    },
  }
);
assert.equal(scopedCheckout.subtotal, 35000);
assert.equal(scopedCheckout.discount_amount, 2000);
assert.equal(scopedCheckout.final_total, 33000);

const giftCheckout = calculateBenefitCheckout(
  { benefitType: "FREE_GIFT", label: "Cafe gratis", benefitValue: { product_scope: { product_name: "Cafe americano" } }, mode: "STANDALONE" }
);
assert.equal(giftCheckout.mode, "STANDALONE");
assert.deepEqual(giftCheckout.gifts, ["Cafe americano"]);
assert.equal(giftCheckout.final_total, 0);

const buyXGetY = calculateBenefitCheckout(
  { benefitType: "BUY_X_GET_Y", label: "2x1", benefitValue: { buy_quantity: 1, get_quantity: 1 }, mode: "PURCHASE", purchase: { line_items: [{ name: "Jugo", quantity: 2, unit_price: 10000 }] } }
);
assert.equal(buyXGetY.discount_amount, 10000);
assert.equal(buyXGetY.final_total, 10000);

assert.throws(
  () => calculateBenefitCheckout(
    { benefitType: "FIXED_AMOUNT_DISCOUNT", label: "$5.000", benefitValue: { discount_amount: 5000 }, mode: "STANDALONE" }
  ),
  /compra/i
);

assert.throws(
  () => calculateBenefitCheckout({
    benefitType: "PERCENT_DISCOUNT",
    label: "15% desde $80.000",
    benefitValue: { percent: 15, minimum_purchase: 80000 },
    mode: "PURCHASE",
    purchase: { subtotal: 50000 },
  }),
  /minima/i
);

console.log(`Validator command center: ${expectedIds.length} contratos, ${ids.length} IDs unicos, 9 archivos JS validos y 7 escenarios de beneficio verificados.`);
