const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const core = require(path.join(root, "empresa/js/risk-station-core.js"));
const app = fs.readFileSync(path.join(root, "empresa/js/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa/index.html"), "utf8");
const service = fs.readFileSync(path.join(root, "backend/src/services/rmsMachineService.js"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa/css/risk-station-premium.css"), "utf8");

const authorizations = {
  discount: { enabled: true, max_percent: 12 },
  benefits: [{ id: "installation", enabled: true, type: "OTHER", label: "Instalación incluida", detail: "Una instalación" }],
};

test("venta sin concesión produce un payload mínimo, explícito y persistible", () => {
  const result = core.buildReview({
    source_id: "lead-1",
    result: "CLEARED",
    offer_value: "NONE",
    products: [{ inventory_product_id: "product-1", quantity: 2, benefit_applied: true }],
    authorizations,
    idempotency_key: "risk-review:lead-1:operation-1",
  });
  assert.equal(result.valid, true);
  assert.equal(result.destination, "cierre");
  assert.equal(result.payload.reason, "Venta confirmada sin concesión extraordinaria.");
  assert.equal(result.payload.recovery_offer, "NONE");
  assert.equal(result.payload.products[0].benefit_applied, false);
});

test("una concesión personalizada conserva autorización, alcance e idempotencia", () => {
  const result = core.buildReview({
    source_id: "lead-2",
    result: "CLEARED",
    offer_value: "BENEFIT:installation",
    products: [{ inventory_product_id: "product-2", quantity: 1, benefit_applied: true }],
    authorizations,
    idempotency_key: "risk-review:lead-2:operation-1",
  });
  assert.equal(result.valid, true);
  assert.equal(result.payload.recovery_offer, "CUSTOM");
  assert.equal(result.payload.recovery_benefit_id, "installation");
  assert.equal(result.payload.products[0].benefit_applied, true);
  assert.equal(result.payload.idempotency_key, "risk-review:lead-2:operation-1");
});

test("reciclaje no arrastra concesiones ni productos de una venta", () => {
  const result = core.buildReview({
    source_id: "lead-3",
    result: "RECYCLE",
    offer_value: "DISCOUNT",
    recycle_reason: "TIMING",
    recycle_reason_label: "Momento inadecuado",
    authorizations,
    products: [{ inventory_product_id: "product-3", benefit_applied: true }],
  });
  assert.equal(result.valid, true);
  assert.equal(result.destination, "reciclaje");
  assert.equal(result.payload.recovery_offer, "NONE");
  assert.deepEqual(result.payload.products, []);
  assert.match(result.payload.reason, /Momento inadecuado/);
});

test("un ticket persistido conserva su concesión aunque Cuenta cambie después", () => {
  const result = core.buildReview({
    source_id: "lead-locked",
    result: "CLEARED",
    offer_value: "",
    offer_snapshot: {
      type: "CUSTOM",
      benefit_id: "retired-benefit",
      label: "Instalación incluida",
      custom_benefit: { type: "OTHER", detail: "Una instalación" },
    },
    products: [{ inventory_product_id: "product-locked", quantity: 1, benefit_applied: true }],
    authorizations: {},
  });
  assert.equal(result.valid, true);
  assert.equal(result.payload.recovery_offer, "CUSTOM");
  assert.equal(result.payload.recovery_benefit_id, "retired-benefit");
});

test("el navegador solo navega cuando el servidor confirma el destino", () => {
  assert.equal(core.confirmedDestination({ state: { rms_phase: "cierre" } }), "cierre");
  assert.equal(core.confirmedDestination({ movement: { to_phase: "reciclaje" } }), "reciclaje");
  assert.match(app, /destination !== built\.destination/);
  assert.match(app, /function rmsRiskValidationStationCardMarkup\(item = \{\}\)/);
  assert.match(app, /async function saveRmsRiskDecision\(item, root\)/);
  assert.match(app, /function bindRmsRiskStationFastActions\(root\)/);
  assert.doesNotMatch(app, /rmsRiskValidationStationCardMarkup\s*=/);
});

test("el núcleo carga antes del bundle y la estación usa una sola consulta de productos", () => {
  assert.ok(html.indexOf('<script src="js/risk-station-core.js') < html.indexOf('<script src="js/app.js'));
  const appPreload = html.match(/<link rel="preload" as="script" href="(js\/app\.js[^"]+)"/)?.[1];
  const appScript = html.match(/<script src="(js\/app\.js[^"]+)" defer><\/script>/)?.[1];
  assert.equal(appPreload, appScript, "el preload debe reutilizar exactamente la URL del bundle y no descargarlo dos veces");
  const reviewStart = service.indexOf("async function recordRmsRiskReview");
  const reviewEnd = service.indexOf("async function reactivateRmsRecycledLead", reviewStart);
  const review = service.slice(reviewStart, reviewEnd);
  assert.match(review, /findRiskOpportunityContext\(businessId, sourceType, payload\.source_id\)/);
  assert.match(review, /rmsInventoryProductSnapshots\(businessId/);
  assert.doesNotMatch(review, /await Promise\.all\(requestedRiskProducts/);
  assert.match(review, /const authorizations = normalizeRiskRecoveryAuthorizations/);
});

test("la interfaz nueva tiene dos destinos, un CTA y guardas responsive", () => {
  const start = app.indexOf("function rmsRiskValidationStationCardMarkup");
  const end = app.indexOf("function rmsRiskV2SetDecision", start);
  const renderer = app.slice(start, end);
  assert.match(renderer, /Venta lograda/);
  assert.match(renderer, /No es el momento/);
  assert.match(renderer, /data-rms-save-risk-decision/);
  assert.ok(renderer.indexOf("rms-risk-v2-footer") < renderer.indexOf("data-rms-risk-sale-panel"));
  assert.match(renderer, /<details class="rms-risk-v2-products"/);
  assert.match(renderer, /data-rms-save-risk-decision="\$\{id\}" disabled/);
  assert.match(app, /function rmsRiskV2UpdateReadiness/);
  assert.match(app, /rmsCommercialOperationKey\("risk-review", item, operationSignature\)/);
  assert.match(app, /Beneficio fijado en el ticket existente/);
  assert.match(css, /\.rms-risk-v2-destinations\s*\{[\s\S]*grid-template-columns: repeat\(2/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.rms-risk-v2-destinations\s*\{[\s\S]*grid-template-columns: 1fr/);
  assert.doesNotMatch(css, /\.rms-risk-v2-footer\s*\{[^}]*position: sticky/);
  assert.doesNotMatch(css, /\.rms-risk-v2-footer\s*\{[^}]*backdrop-filter/);
});

test("la paginación conserva la interfaz premium y el almacenamiento de borradores existe", () => {
  const declaration = app.indexOf('const RMS_RISK_DRAFT_STORAGE_PREFIX = "qori:rms-risk-drafts:v3"');
  const use = app.indexOf("return `${RMS_RISK_DRAFT_STORAGE_PREFIX}:");
  assert.ok(declaration >= 0, "el prefijo de borradores debe estar declarado");
  assert.ok(use > declaration, "el prefijo debe declararse antes de usarse");
  assert.match(app, /rms-risk-recovery-boundary/);
  assert.match(app, /RMS risk station render blocked/);
  assert.doesNotMatch(app, /RIESGOS DE FUGA · MODO SEGURO/);
  assert.match(html, /risk-v2=premium-v6-20260830/);
  assert.match(html, /risk-premium-v8-20260830/);
});

test("descargar el QR reutiliza el renderer canónico de recursos", () => {
  assert.match(app, /status\.innerHTML = rmsRiskV2ResourceMarkup\(item\)/);
  assert.doesNotMatch(app, /rmsRiskRecoveryResourceMarkup/);
});

test("la estación usa iconos propios y checkbox de tamaño controlado", () => {
  const start = app.indexOf("function rmsRiskValidationStationCardMarkup");
  const end = app.indexOf("function rmsRiskV2SetDecision", start);
  const renderer = app.slice(start, end);
  assert.match(app, /function rmsRiskIconMarkup/);
  assert.doesNotMatch(renderer, /material-symbols-outlined/);
  assert.ok(renderer.indexOf("rms-risk-action-status") < renderer.indexOf("data-rms-risk-sale-panel"));
  assert.match(css, /qoriRiskCheckA/);
  assert.match(css, /input\[type="checkbox"\][\s\S]*width: 20px !important/);
  assert.match(css, /\.rms-risk-v2-ticket-actions/);
  assert.match(app, /if \(button\.closest\("\.rms-risk-v2"\)\) return;/);
  assert.match(app, /Enlace copiado[\s\S]*Ya puedes compartir el ticket con el cliente/);
  assert.match(app, /Preparando una nueva oportunidad/);
});
