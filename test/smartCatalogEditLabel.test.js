const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");

test("el modal de vitrina sincroniza textos distintos para crear y editar", () => {
  assert.match(app, /function syncSmartCatalogCreateModalMode\(modal, editing = false\)/);
  assert.match(app, /submit\.textContent = editing \? "Guardar cambios" : "Crear vitrina web"/);
  assert.match(app, /modalLabel\.textContent = editing \? "EDITAR VITRINA WEB" : "NUEVA VITRINA WEB"/);
  assert.match(app, /formLabel\.textContent = editing \? "Editar vitrina web" : "Crear vitrina web en 5 minutos"/);
});

test("cada apertura aplica el modo correcto", () => {
  assert.match(app, /function openSmartCatalogCreateModal\([\s\S]*?syncSmartCatalogCreateModalMode\(modal, false\)/);
  assert.match(app, /function openSmartCatalogEditModal\(catalogId\)[\s\S]*?syncSmartCatalogCreateModalMode\(modal, true\)/);
  assert.match(app, /editingCatalogId \? "No se pudieron guardar los cambios de la vitrina\." : "No se pudo crear la vitrina web\."/);
});

test("el HTML fuerza la actualizacion del JavaScript publicado", () => {
  const script = html.match(/<script src="(js\/app\.js\?[^"\s]+)"/);
  const preload = html.match(/<link rel="preload" as="script" href="(js\/app\.js\?[^"\s]+)"/);
  assert.ok(script && preload, 'El script y su precarga deben tener una URL versionada');
  assert.match(script[1], /[?&]v=[^&]+/);
  assert.equal(preload[1], script[1], 'Precarga y ejecución deben usar la misma versión');
});
