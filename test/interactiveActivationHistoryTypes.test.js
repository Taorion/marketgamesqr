const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const service = fs.readFileSync(
  path.join(__dirname, "..", "backend", "src", "services", "interactiveActivationService.js"),
  "utf8"
);

test("activation history keeps the activation parameter typed as uuid", () => {
  assert.match(service, /la\.metadata->>'interactive_activation_id' = \(\$1::uuid\)::text/);
  assert.match(service, /where p2\.activation_id = \$1::uuid/);
  assert.doesNotMatch(service, /interactive_activation_id' = \$1::text/);
});

test("activation history remains isolated by activation and business", () => {
  assert.match(service, /where p\.activation_id = \$1 and p\.company_id = \$2/);
  assert.match(service, /where la\.business_id = \$2/);
  assert.match(service, /p2\.company_id = \$2/);
});
