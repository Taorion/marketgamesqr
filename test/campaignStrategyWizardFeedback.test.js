const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("el Diseñador envia fechas ISO y solo el contrato canonico de campañas", () => {
  const app = read("empresa/js/app.js");
  assert.match(app, /function strategyWizardIsoDate\(dateValue, hour = 9\)/);
  assert.match(app, /return Number\.isNaN\(parsed\.getTime\(\)\) \? null : parsed\.toISOString\(\)/);
  assert.match(app, /starts_at: strategyWizardIsoDate\(answers\.startDate, 9\)/);
  assert.match(app, /ends_at: strategyWizardIsoDate\(answers\.endDate, 18\)/);
  assert.match(app, /function strategyWizardRequestPayload\(payload, channelRefs\)/);
  assert.match(app, /const requestPayload = strategyWizardRequestPayload\(payload, channelRefs\)/);
});

test("el Diseñador bloquea duplicados y comunica espera, exito y error", () => {
  const app = read("empresa/js/app.js");
  const html = read("empresa/index.html");
  const css = read("empresa/css/portal-clean-v39.css");
  assert.match(app, /if \(state\.strategyWizardCreating\) return null/);
  assert.match(app, /setStrategyWizardBusy\(true\)/);
  assert.match(app, /setAttribute\("aria-busy", isBusy \? "true" : "false"\)/);
  assert.match(app, /Qori sigue trabajando\. Estamos confirmando la campaña con el servidor/);
  assert.match(app, /El borrador quedó guardado\. Estamos abriendo su centro de control/);
  assert.match(app, /strategyWizardCreationErrorMessage\(error\)/);
  assert.match(app, /title: "No se creó la campaña"/);
  assert.match(html, /id="strategyWizardMessage" role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(css, /data-state="processing"/);
  assert.match(css, /data-state="error"/);
  assert.match(css, /#campaignStrategyWizardModal\[aria-busy="true"\]/);
});

test("el error generico del API se traduce a un campo accionable", () => {
  const app = read("empresa/js/app.js");
  assert.match(app, /error\?\.message !== "Invalid request payload\."/);
  assert.match(app, /starts_at: "la fecha de inicio"/);
  assert.match(app, /ends_at: "la fecha de cierre"/);
  assert.match(app, /tu borrador sigue guardado/);
});
