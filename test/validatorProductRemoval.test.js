const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("el validador permite quitar incluso el último producto antes de redimir", () => {
  const portal = read("empresa/js/app.js");
  const removalStart = portal.indexOf('validatorPurchaseItems?.addEventListener("click"');
  const removalEnd = portal.indexOf("validatorNewOperationButton", removalStart);
  const removalFlow = portal.slice(removalStart, removalEnd);

  assert.ok(removalStart >= 0 && removalEnd > removalStart);
  assert.doesNotMatch(removalFlow, /validatorPurchaseItems\.length === 1/);
  assert.match(removalFlow, /dataset\.mode !== "validated_standard"/);
  assert.match(removalFlow, /state\.validatorPurchaseItems = state\.validatorPurchaseItems\.filter/);
  assert.match(removalFlow, /renderValidatorPurchaseItems\(\);[\s\S]*calculateValidatorCheckoutPreview\(\);/);
  assert.match(removalFlow, /Subtotal, beneficio y total fueron recalculados/);
});

test("una compra sin productos queda clara y no se puede redimir", () => {
  const portal = read("empresa/js/app.js");
  const html = read("empresa/index.html");
  const styles = read("empresa/css/portal-clean-v39.css");

  assert.match(portal, /No hay productos en esta compra/);
  assert.match(portal, /const canRedeemPurchase = state\.validatorRedemptionMode !== "PURCHASE" \|\| subtotal > 0/);
  assert.match(portal, /querySelectorAll\("input, select, textarea, button"\)/);
  assert.match(styles, /\.validator-purchase-empty/);
  assert.match(html, /validator-product-removal=v463-20260909/g);
  assert.match(portal, /empresa-20260909-validator-product-removal-v463/);
});
