const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("validator customer search is tenant scoped and returns clients only", () => {
  const routes = read("backend/src/routes/businessPortalRoutes.js");
  const controller = read("backend/src/controllers/businessPortalController.js");

  assert.match(routes, /requireQrValidator = requireBusinessFeature\("qr_validator"\)/);
  assert.match(routes, /router\.get\("\/validator\/customers\/search", requireQrValidator, shortBusinessCache, searchValidatorCustomers\)/);
  assert.match(controller, /const businessId = businessIdFor\(req\)/);
  assert.match(controller, /listLeadCrmRows\(businessId, \{[\s\S]*audience_type: "CLIENT"[\s\S]*limit: filters\.limit/);
  assert.match(controller, /player_id: customer\.source_type === "PLAYER" \? customer\.id : customer\.lead_id \|\| null/);
});

test("validator can select an existing customer or keep a new customer flow", () => {
  const html = read("empresa/index.html");
  const app = read("empresa/js/app.js");
  const styles = read("empresa/css/portal-clean-v39.css");

  assert.match(html, /id="validatorCustomerLookupInput"/);
  assert.match(html, /id="validatorCustomerResults"/);
  assert.match(html, /id="validatorCustomerNewButton"[\s\S]*Cliente nuevo/);
  assert.match(html, /validator-customer-search-v512-20260928/);
  assert.match(app, /\/api\/business\/validator\/customers\/search\?q=/);
  assert.match(app, /function applyValidatorCustomer\(customer\)/);
  assert.match(app, /validatorBeneficiaryNameInput\.value = customer\.name/);
  assert.match(app, /player_id: state\.validatorSelectedCustomer\?\.player_id \|\| state\.validatorLastValidation\?\.player\?\.id \|\| null/);
  assert.match(app, /function startNewValidatorCustomer\(\)/);
  assert.match(styles, /\.validator-customer-search-field input \{[^}]*padding-left: 43px !important/);
  assert.match(styles, /@media \(max-width: 600px\)[\s\S]*\.validator-customer-lookup-head/);
});

test("an open validator cart preserves the selected existing customer", () => {
  const app = read("empresa/js/app.js");
  assert.match(app, /customerLookup: \{[\s\S]*selected: state\.validatorSelectedCustomer \? \{ \.\.\.state\.validatorSelectedCustomer \} : null/);
  assert.match(app, /state\.validatorSelectedCustomer = snapshot\.customerLookup\?\.selected/);
});
