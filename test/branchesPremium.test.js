const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "branches-premium.css"), "utf8");
const controller = fs.readFileSync(path.join(root, "backend", "src", "controllers", "businessPortalController.js"), "utf8");

test("Sedes keeps unassigned activity outside the registered branch directory", () => {
  assert.match(app, /function branchUnassignedActivity\(\)/);
  assert.match(app, /branch: "Actividad sin sede"/);
  assert.match(app, /const allRows = branchActivityRows\(\);\s+const unassigned = branchUnassignedActivity\(\);/);
  assert.match(app, /branchListCount\.textContent = rows\.length === allRows\.length/);
  const branchBlock = app.slice(app.indexOf("function branchActivityRows()"), app.indexOf("async function submitBranchCreate"));
  assert.doesNotMatch(branchBlock, /const key = item\.branch_name \|\| "Sin sucursal"/);
});

test("Sedes uses stable body-level dialogs with keyboard and focus safeguards", () => {
  assert.match(html, /class="branch-modal-shell hidden" id="branchFormPanel" aria-hidden="true"/);
  assert.match(html, /class="branch-modal-shell hidden" id="branchDetailModal" aria-hidden="true"/);
  assert.match(css, /body > \.branch-modal-shell\s*\{/);
  assert.match(app, /document\.body\.appendChild\(branchFormPanel\)/);
  assert.match(app, /document\.body\.appendChild\(branchDetailModal\)/);
  assert.match(app, /function trapBranchModalFocus\(event, modal\)/);
});

test("Sedes exposes a responsive card directory instead of a squeezed mobile table", () => {
  assert.match(html, /class="branches-mobile-list" id="branchMobileList"/);
  assert.match(css, /\.branches-table-wrap \{ display: none; \}/);
  assert.match(css, /\.branches-mobile-list \{ display: grid;/);
  assert.match(app, /class="branch-mobile-card" data-branch-detail-row=/);
});

test("Sedes administration stays role-aware and tenant scoped", () => {
  assert.match(app, /function canManageBranches\(\)/);
  assert.match(app, /newBranchButton\.classList\.toggle\("hidden", !canManageBranches\(\)\)/);
  assert.match(controller, /where business_id = \$1\s+order by is_active desc, name asc/);
  assert.match(controller, /where id = \$1 and business_id = \$2/);
  assert.match(controller, /requireBusinessOwner\(req\);/);
});

test("Sedes premium assets are versioned and loaded after the portal final layers", () => {
  const cleanLayer = html.indexOf("css/portal-clean-v39.css");
  const branchesLayer = html.indexOf("css/branches-premium.css?v=branches-premium-v4-20260822");
  assert.ok(cleanLayer >= 0 && branchesLayer > cleanLayer);
  assert.match(app, /empresa-20260822-activation-calculator-branches-premium-v324/);
});
