const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "empresa/js/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa/index.html"), "utf8");
const service = fs.readFileSync(path.join(root, "backend/src/services/rmsMachineService.js"), "utf8");
const crmService = fs.readFileSync(path.join(root, "backend/src/services/leadCrmService.js"), "utf8");
const strategicQrService = fs.readFileSync(path.join(root, "backend/src/services/strategicQrService.js"), "utf8");
const schema = fs.readFileSync(path.join(root, "database/schema.sql"), "utf8");

test("Riesgos abre con lectura directa y render progresivo ligero", () => {
  assert.match(service, /const stationFastPath = lite && Boolean\(phaseFilter\)/);
  assert.match(service, /recentStateRowsForBusiness\(businessId, limit, phaseFilter\)/);
  assert.match(service, /phaseFilter === "control_anti_fuga"\s*\? await riskLeadRowsForStateRefs\(businessId, stationStateRows\)/);
  assert.match(app, /phase === "control_anti_fuga" \? 1 : RMS_STATION_RENDER_INITIAL_LIMIT/);
  assert.match(app, /display\.matchingRows\.length > display\.pageSize/);
});

test("la consulta de Riesgos poda fuentes antes de agregados pesados", () => {
  assert.match(crmService, /const exactPlayerSourceSql = exactSourceClause\("PLAYER", "p"\)/);
  assert.match(crmService, /const exactManualSourceSql = exactSourceClause\("MANUAL", "ml"\)/);
  assert.match(crmService, /const exactAffiliateSourceSql = exactSourceClause\("AFFILIATE", "fa"\)/);
  assert.match(service, /async function riskLeadRowsForStateRefs\(businessId, refs = \[\]\)/);
  assert.match(service, /from players p[\s\S]*p\.id = any\(\$2::uuid\[\]\)/);
});

test("registrar la decisión mantiene tenant scoping y evita consultas N+1", () => {
  const start = service.indexOf("async function recordRmsRiskReview");
  const end = service.indexOf("async function reactivateRmsRecycledLead", start);
  const review = service.slice(start, end);
  assert.match(review, /findRiskOpportunityContext\(businessId, sourceType, payload\.source_id\)/);
  assert.match(review, /rmsInventoryProductSnapshots\(businessId, requestedRiskProducts\.map/);
  assert.doesNotMatch(review, /findOpportunity\(businessId/);
  assert.doesNotMatch(review, /await Promise\.all\(requestedRiskProducts/);
  assert.match(review, /const authorizations = normalizeRiskRecoveryAuthorizations/);
  assert.match(review, /const toPhase = isCleared \? "cierre" : "reciclaje"/);
  assert.match(review, /RMS_TRANSITION_AUTHORITY\.RISK_REVIEW/);
});

test("el beneficio y sus productos quedan persistidos como snapshot", () => {
  assert.match(service, /custom_benefit: offer\.customBenefit \|\| null/);
  assert.match(service, /discount_percent: offer\.discountPercent/);
  assert.match(service, /const riskProducts = hasPersistedTicket\s+\? persistedProducts/);
  assert.match(service, /products: review\.products/);
  assert.match(service, /source: "RISK_RECOVERY"/);
  assert.match(service, /applied_benefit: appliedRiskBenefit/);
});

test("crear ticket conserva idempotencia y no genera la imagen en la ruta crítica", () => {
  const start = service.indexOf("async function prepareRmsRiskRecoveryResource");
  const end = service.indexOf("async function recordRmsRiskReview", start);
  const prepare = service.slice(start, end);
  assert.match(prepare, /findRiskOpportunityContext\(businessId, sourceType, payload\.source_id\)/);
  assert.match(prepare, /rmsInventoryProductSnapshots\(businessId, requestedProducts\)/);
  assert.match(prepare, /existingResource\?\.qr_code_id && existingResource\.public_ticket_url/);
  assert.match(prepare, /generate_qr_image: false/);
  assert.match(strategicQrService, /const generateQrImage = body\.generate_qr_image !== false/);
  assert.match(schema, /idx_qr_codes_rms_risk_idempotency/);
});

test("el catálogo se carga fuera de la respuesta crítica de la estación", () => {
  assert.match(service, /const riskStationFastPath = stationFastPath && phaseFilter === "control_anti_fuga"/);
  assert.match(service, /const inventoryPromise = riskStationFastPath \? Promise\.resolve\(\[\]\)/);
  assert.match(app, /phase === "control_anti_fuga" && !state\.inventoryLoaded/);
  assert.match(app, /loadInventoryProducts\(\{ quiet: true \}\)/);
});

test("la estación conserva sincronización incremental y feedback recuperable", () => {
  assert.match(app, /function rmsRiskStationFingerprint/);
  assert.match(app, /riskFingerprintBeforeSync === rmsRiskStationFingerprint\(\) && updateRmsRiskStationLiveStatus\(rows\)/);
  assert.match(app, /data-rms-risk-retry-sync/);
  assert.match(app, /function ensureRmsRiskActionStatus/);
});

test("los assets nuevos tienen una única URL cacheada y el núcleo carga primero", () => {
  const coreIndex = html.indexOf('<script src="js/risk-station-core.js');
  const appIndex = html.indexOf('<script src="js/app.js');
  assert.ok(coreIndex >= 0 && coreIndex < appIndex);
  const preload = html.match(/<link rel="preload" as="script" href="(js\/app\.js[^"]+)"/)?.[1];
  const script = html.match(/<script src="(js\/app\.js[^"]+)" defer><\/script>/)?.[1];
  assert.equal(preload, script);
  assert.match(html, /risk-v2=from-zero-v1-20260830/);
});
