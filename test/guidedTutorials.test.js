const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("el portal carga el centro de tutoriales guiados como una capa independiente", () => {
  const html = read("empresa/index.html");
  assert.match(html, /css\/guided-tutorials\.css\?v=guided-tutorials-v1-20260828" media="print" data-deferred-portal-style/);
  assert.match(html, /js\/guided-tutorials\.js\?v=guided-tutorials-v1-20260828/);
});

test("las guías cubren el flujo comercial real de punta a punta", () => {
  const script = read("empresa/js/guided-tutorials.js");
  ["sellers", "contacts", "contacts-import", "activations", "sales", "revenue"].forEach((id) => {
    assert.match(script, new RegExp(`id: "${id}"`));
  });
  assert.match(script, /data-lead-seller-id/);
  assert.match(script, /customerCsvDefaultSellerInput/);
  assert.match(script, /triviaSellerInput/);
  assert.match(script, /customerAcquisitionSellerInput/);
  assert.match(script, /data-revenue-command-seller/);
});

test("los recorridos abren formularios sin ejecutar confirmaciones sensibles", () => {
  const script = read("empresa/js/guided-tutorials.js");
  assert.match(script, /La guía nunca pulsa este botón ni crea usuarios por ti/);
  assert.match(script, /La guía nunca inicia la importación por ti/);
  assert.match(script, /La guía no crea ni publica la activación/);
  assert.match(script, /La guía no registra ventas ni altera pagos/);
  assert.doesNotMatch(script, /open:\s*"#sellerEditorSubmit"/);
  assert.doesNotMatch(script, /open:\s*"#customerCsvSubmitButton"/);
  assert.doesNotMatch(script, /open:\s*'#triviaLauncherForm button\[type="submit"\]'/);
});

test("la experiencia conserva progreso, salida por teclado y adaptación móvil", () => {
  const script = read("empresa/js/guided-tutorials.js");
  const styles = read("empresa/css/guided-tutorials.css");
  assert.match(script, /qori-guided-tutorials:/);
  assert.match(script, /event\.key === "Escape"/);
  assert.match(script, /event\.key === "ArrowRight"/);
  assert.match(script, /prefers-reduced-motion/);
  assert.match(styles, /@media \(max-width:760px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /body\[data-auth-state="guest"\] \.portal-guide-launcher/);
});
