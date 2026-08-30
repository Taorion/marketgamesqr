const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const core = require(path.join(root, "empresa/js/evaluation-station-core.js"));
const app = fs.readFileSync(path.join(root, "empresa/js/app.js"), "utf8");
const service = fs.readFileSync(path.join(root, "backend/src/services/rmsMachineService.js"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa/css/evaluation-station-premium.css"), "utf8");

test("cada resultado de Evaluacion tiene una sola ruta canonica", () => {
  assert.deepEqual(core.routeForResponse("NEGOTIATION"), {
    destination: "NEGOTIATION", phase: "accion_correctiva", label: "Negociación", tone: "agreement", icon: "handshake",
  });
  assert.equal(core.routeForResponse("PAID_SALE").phase, "cierre");
  assert.equal(core.routeForResponse("NO_RESPONSE").phase, "control_anti_fuga");
  assert.equal(core.routeForResponse("OBJECTION").destination, "RISK_REVIEW");
  assert.equal(core.routeForResponse("RECYCLE").destination, "RECYCLE");
  assert.equal(core.routeForResponse("NOT_QUALIFIED").phase, "control_anti_fuga");
});

test("el payload corrige destinos contradictorios y conserva idempotencia", () => {
  const result = core.canonicalSubmission({
    source_id: "lead-1", source_type: "PLAYER", response: "NO_RESPONSE",
    destination: "NEGOTIATION", idempotency_key: "evaluation:stable-key",
  });
  assert.equal(result.valid, true);
  assert.equal(result.payload.destination, "RISK_REVIEW");
  assert.equal(result.payload.idempotency_key, "evaluation:stable-key");
  assert.equal(result.route.phase, "control_anti_fuga");
});

test("Reciclaje exige motivo, explicacion y fecha futura", () => {
  const invalid = core.canonicalSubmission({ response: "RECYCLE" });
  assert.equal(invalid.valid, false);
  const valid = core.canonicalSubmission({
    source_id: "lead-2", response: "RECYCLE", recycle_reason: "TIMING",
    recycle_note: "Revisar en el siguiente ciclo.", recycle_at: "2099-01-01T12:00:00.000Z",
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.route.phase, "procesamiento");
});

test("el servidor persiste la ruta canonica y reconoce reintentos", () => {
  const start = service.indexOf("async function recordRmsEvaluationResponse");
  const end = service.indexOf("function rmsCommercialConfirmationFromPayload", start);
  const evaluation = service.slice(start, end);
  assert.match(service, /function rmsEvaluationDestination\(response, route\)/);
  assert.match(service, /if \(response === "RECYCLE"\) return "RECYCLE"/);
  assert.match(evaluation, /persistedEvaluation\.idempotency_key === idempotencyKey/);
  assert.match(evaluation, /duplicate: true/);
  assert.match(evaluation, /rms_evaluation: evaluation/);
  assert.ok(evaluation.indexOf("const movement = await moveRmsLeadPhase") < evaluation.indexOf("historyNote = await createLeadNote"));
});

test("el cliente confirma el POST antes de refrescar la siguiente estacion", () => {
  const start = app.indexOf("async function saveRmsEvaluationResponse");
  const end = app.indexOf("function rmsCommercialConfirmationDraft", start);
  const save = app.slice(start, end);
  assert.match(save, /RmsEvaluationStationCore\?\.canonicalSubmission/);
  assert.match(save, /confirmedPhase\(result, canonicalDraft\.response\)/);
  assert.doesNotMatch(save, /await loadRmsMachineData/);
  assert.match(save, /openRmsStation\(destination/);
  assert.match(save, /clearRmsEvaluationDraft\(item\.id\)/);
});

test("la estacion carga paginas adicionales sin ocultar oportunidades", () => {
  assert.match(service, /count\(\*\) over\(\)::int as rms_total_count/);
  assert.match(service, /limit \$2 offset \$3/);
  assert.match(service, /has_more: stationFastPath \? Boolean\(data\.pagination\?\.has_more\) : false/);
  assert.match(app, /data-rms-station-load-more/);
  assert.match(app, /append: true/);
});

test("la capa premium usa SVG propios, responsive real y assets versionados", () => {
  assert.match(app, /function rmsEvaluationIconSvg/);
  assert.doesNotMatch(app.slice(app.indexOf("function rmsEvaluationStationCardMarkup"), app.indexOf("function rmsCommercialWorkflow")), /rms-evaluation-destination-choice/);
  assert.match(app, /Estación 05 \u00b7 Después de Activación 1/);
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.rms-evaluation-choice-check[\s\S]*width: 22px/);
  assert.match(html, /evaluation-station-core\.js\?v=evaluation-core-v1-20260830/);
  assert.match(html, /evaluation-station-premium\.css\?v=evaluation-premium-v1-20260830/);
  const preload = html.match(/<link rel="preload" as="script" href="(js\/app\.js[^"]+)"/)?.[1];
  const script = html.match(/<script src="(js\/app\.js[^"]+)" defer><\/script>/)?.[1];
  assert.equal(preload, script);
});
