const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "backend", "src", "app.js"), "utf8");
const homeSource = fs.readFileSync(path.join(root, "qori-web", "index.html"), "utf8");

test("the public root serves the official Qori home without changing the portal", () => {
  assert.match(appSource, /const qoriWebRoot = path\.join\(projectRoot, "qori-web"\)/);
  assert.match(appSource, /app\.use\(express\.static\(qoriWebRoot, staticOptions\)\)/);
  assert.match(appSource, /res\.sendFile\(path\.join\(qoriWebRoot, "index\.html"\)\)/);
  assert.match(appSource, /app\.use\("\/empresa", express\.static\(path\.join\(__dirname, "\.\.\/\.\.", "empresa"\), staticOptions\)\)/);
  assert.doesNotMatch(appSource, /const marketGamesWebRoot = path\.join\(projectRoot, "Pagina web MG"\)/);
});

test("the official home preserves the approved brand and GOS philosophy", () => {
  for (const marker of [
    "qori-logo-vf.png",
    "Qori es Tu Fábrica de Ingresos",
    "Filosofía GOS",
    "Customer First",
    "O3 · Ofrece",
    "O3 · Opera",
    "O3 · Optimiza",
    "3R",
  ]) assert.ok(homeSource.includes(marker), `missing marker: ${marker}`);
});

test("every structured and visible home email uses the current Qori address", () => {
  assert.doesNotMatch(homeSource, /@qori\.local|@marketgamesqr\.com/i);
  assert.ok((homeSource.match(/contacto@gosqori\.com/g) || []).length >= 3);
});
