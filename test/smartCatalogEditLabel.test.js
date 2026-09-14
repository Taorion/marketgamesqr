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
  const markers = html.match(/catalog-edit-label=v492-20260914/g) || [];
  assert.equal(markers.length, 2);
});
