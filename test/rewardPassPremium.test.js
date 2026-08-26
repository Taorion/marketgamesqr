const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const service = read("backend/src/services/rewardPassService.js");
const controller = read("backend/src/controllers/rewardPassController.js");
const backendApp = read("backend/src/app.js");
const portalApp = read("empresa/js/app.js");
const portalHtml = read("empresa/index.html");
const portalCss = read("empresa/css/reward-pass-premium-v342.css");
const publicApp = read("reward-pass-public/app.js");
const migration = read("database/migrations/202608230001_reward_pass_integrity.sql");

test("Reward Pass calcula el estado efectivo sin depender de abrir cada ficha", () => {
  assert.match(service, /REWARD_PASS_EFFECTIVE_STATUS_SQL/);
  assert.match(service, /when rp\.expires_at < now\(\) then 'expired'/);
  assert.match(service, /as effective_status/);
  assert.match(service, /status: row\.effective_status/);
  assert.match(service, /with scoped as \([\s\S]*effective_status/);
});

test("emisión y redención son idempotentes y protegen las facturas repetidas", () => {
  assert.match(migration, /issuance_key/);
  assert.match(migration, /idempotency_key/);
  assert.match(service, /where company_id = \$1 and issuance_key = \$2/);
  assert.match(service, /where company_id = \$1 and idempotency_key = \$2/);
  assert.match(service, /Esta factura ya fue registrada para este Reward Pass/);
  assert.match(portalApp, /createRewardPassOperationKey\("reward-pass-issue"\)/);
  assert.match(portalApp, /createRewardPassOperationKey\("reward-pass-redeem"\)/);
});

test("la sede autorizada usa IDs tenant-safe y se aplica al redimir", () => {
  assert.match(migration, /authorized_branch_id uuid references branches/);
  assert.match(migration, /branch_authorization_scope text/);
  assert.match(migration, /branch_authorization_scope = 'ALL_BRANCHES' and authorized_branch_id is null/);
  assert.match(migration, /branch_authorization_scope = 'SPECIFIC_BRANCH' and authorized_branch_id is not null/);
  assert.match(service, /branches where id = \$1 and business_id = \$2 and is_active = true/);
  assert.match(service, /Este Reward Pass solo puede redimirse en la sede: \$\{authorizedName\}/);
  assert.match(controller, /authorized_branch_id: optionalUuid/);
  assert.match(controller, /branch_authorization_scope: z\.enum\(\["ALL_BRANCHES", "SPECIFIC_BRANCH"\]\)/);
  assert.match(portalHtml, /<select id="rewardPassBranchInput"/);
  assert.match(portalHtml, /<select id="validatorRewardPassBranchInput"/);
  assert.match(portalApp, /renderRewardPassBranchOptions/);
  assert.match(portalApp, /renderValidatorRewardPassBranchOptions/);
});

test("el selector reutiliza el directorio real y representa Todas las Sedes de forma explícita", () => {
  assert.match(portalApp, /const REWARD_PASS_ALL_BRANCHES_VALUE = "ALL_BRANCHES"/);
  assert.match(portalApp, /state\.businessBranches[\s\S]*branch\.is_active !== false/);
  assert.match(portalApp, /<option value="\$\{REWARD_PASS_ALL_BRANCHES_VALUE\}">Todas las Sedes<\/option>/);
  assert.match(portalApp, /branch_authorization_scope: allBranches \? REWARD_PASS_ALL_BRANCHES_VALUE : "SPECIFIC_BRANCH"/);
  assert.match(portalApp, /authorized_branch_id: allBranches \? null : branchSelection/);
  assert.match(portalApp, /\/api\/business\/branches\?fresh=1/);
});

test("el selector informa carga, vacío y error con recuperación operativa", () => {
  assert.match(portalHtml, /id="rewardPassBranchStatus"[^>]*aria-live="polite"/);
  assert.match(portalHtml, /id="rewardPassBranchRetryButton"/);
  assert.match(portalHtml, /id="rewardPassOpenBranchesButton"/);
  assert.match(portalApp, /Cargando sedes\.\.\./);
  assert.match(portalApp, /No tienes sedes registradas/);
  assert.match(portalApp, /retryRewardPassBranches/);
  assert.match(portalApp, /setView\("branches"\)/);
  assert.match(portalApp, /renderCustomerAcquisitionBranchOptions\(\);\s*renderRewardPassBranchOptions\(\);/);
});

test("el alcance de sede se conserva en vistas, PDF, comprobante y validador", () => {
  assert.match(service, /authorized_branch_label: rewardPassBranchLabel\(row\)/);
  assert.match(service, /drawCardField\(page, "SEDE AUTORIZADA", rewardPassBranchLabel\(pass\)/);
  assert.match(service, /`Sede autorizada: \$\{rewardPassBranchLabel\(pass\)\}`/);
  assert.match(portalApp, /\["Sede autorizada", rewardPassAuthorizedBranchLabel\(pass\)\]/);
  assert.match(portalApp, /rewardPassAuthorizedBranchLabel\(item\)/);
  assert.match(publicApp, /authorized_branch_label \|\| pass\.authorized_branch_name \|\| pass\.authorized_branch/);
});

test("la redención exige el documento real del beneficiario", () => {
  assert.match(service, /Confirma el documento del beneficiario antes de redimir/);
  assert.match(service, /normalizeIdentity\(documentChecked\) === normalizeIdentity\(pass\.beneficiary_document\)/);
  assert.match(service, /El documento presentado no coincide/);
});

test("la activación pública exige PIN, limita intentos y usa códigos fuertes", () => {
  assert.match(service, /crypto\.randomBytes\(12\)/);
  assert.match(service, /secureTextMatches\(payload\.security_pin, pass\.security_pin\)/);
  assert.match(controller, /security_pin: z\.string\(\)\.trim\(\)\.regex\(\/\^\\d\{6\}\$\//);
  assert.match(backendApp, /reward-pass-public-claim/);
  assert.match(backendApp, /max: 12/);
  assert.match(publicApp, /id="rpClaimPin"/);
  assert.match(publicApp, /security_pin: document\.getElementById\("rpClaimPin"\)/);
});

test("la interfaz premium renderiza indicadores, filtros, gráficas y tarjetas móviles", () => {
  assert.match(portalHtml, /id="rewardPassKpiGrid"/);
  assert.match(portalHtml, /id="rewardPassChartGrid"/);
  assert.match(portalHtml, /id="rewardPassSearchInput"/);
  assert.match(portalHtml, /id="rewardPassMobileCards"/);
  assert.match(portalApp, /renderRewardPassMetrics\(\)/);
  assert.match(portalApp, /renderRewardPassInsight\(\)/);
  assert.match(portalApp, /renderRewardPassCharts\(\)/);
  assert.match(portalCss, /@media \(max-width: 760px\)[\s\S]*reward-pass-mobile-cards/);
});

test("los modales caben en 100dvh y no ocultan el formulario", () => {
  assert.match(portalCss, /max-height: calc\(100dvh - clamp/);
  assert.match(portalCss, /overflow-y: auto !important/);
  assert.match(portalCss, /overflow-x: hidden !important/);
  assert.match(portalCss, /reward-pass-form \{[\s\S]*overflow: visible !important/);
  assert.match(portalCss, /@media \(max-height: 760px\), \(max-width: 720px\)/);
});

test("la ficha expone las operaciones reales sin perder trazabilidad", () => {
  assert.match(portalApp, /data-rp-copy-pin/);
  assert.match(portalApp, /data-rp-download="pdf"/);
  assert.match(portalApp, /data-rp-download="receipt"/);
  assert.match(portalApp, /data-rp-extend/);
  assert.match(portalApp, /data-rp-cancel/);
  assert.match(portalApp, /Historial de saldo y redenciones/);
});
