const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(projectRoot, "empresa", "js", "app.js"), "utf8");
const service = fs.readFileSync(
  path.join(projectRoot, "backend", "src", "services", "interactiveActivationService.js"),
  "utf8",
);

test("published activations use explicit status filters without an operational aggregate", () => {
  assert.match(
    app,
    /function activationMatchesPublishedStatus\(itemStatus = "", selectedStatus = "active"\)[\s\S]*return normalizedItemStatus === normalizedSelectedStatus/,
  );
  assert.match(app, /const matchesStatus = activationMatchesPublishedStatus\(row\.dataset\.gamingActivationStatus, status\)/);
  assert.match(app, /activationMatchesPublishedStatus\(item\.status, status\)/);
  assert.doesNotMatch(app, /data-gaming-published-status-pill="all"/);
  assert.doesNotMatch(app, /<option value="all">Operativas<\/option>/);
  assert.doesNotMatch(app, /<option value="closed">Cerradas<\/option>/);
  assert.match(app, /data-gaming-published-status-pill="active" aria-pressed="true">Activas/);
});

test("archived history remains tenant-scoped and available for audit", () => {
  assert.match(app, /include_archived=true/);
  assert.match(
    service,
    /select \* from interactive_activations where id = \$1 and company_id = \$2 for update/,
  );
  assert.match(
    service,
    /if \(hasCommercialHistory \|\| activation\.status !== "draft"\)[\s\S]*set status = 'archived'/,
  );
});
