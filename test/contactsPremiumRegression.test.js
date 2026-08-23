const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("el directorio unifica identidades entre fuentes sin cruzar documentos incompatibles", () => {
  const service = read("backend/src/services/leadCrmService.js");
  assert.match(service, /from all_rows preferred/);
  assert.match(service, /preferred\.source_type, preferred\.id/);
  assert.match(service, /preferred\.document_id[\s\S]*<> regexp_replace\(lower\(candidate\.document_id\)/);
  assert.match(service, /lower\(btrim\(preferred\.email\)\) = lower\(btrim\(coalesce\(candidate\.email/);
  assert.match(service, /regexp_replace\(preferred\.phone[\s\S]*regexp_replace\(coalesce\(candidate\.phone/);
  assert.match(service, /case preferred\.source_type when 'PLAYER' then 1 when 'AFFILIATE' then 2 else 3 end/);
});

test("la búsqueda actualiza resultados sin reconstruir el campo de edición", () => {
  const script = read("empresa/js/contacts-premium-v333.js");
  assert.match(script, /filters\.search = searchInput\.value/);
  assert.match(script, /const refreshMatches = \(\) =>/);
  assert.match(script, /list\.innerHTML = visibleRows\.length/);
  assert.doesNotMatch(script, /setTimeout\(\(\) => rerender\("contactDirectorySearchInput"/);
  assert.match(script, /contact-directory-result-note" aria-live="polite"/);
});

test("el progreso CSV oculto no deja residuos visuales", () => {
  const styles = read("empresa/css/contacts-premium-v333.css");
  assert.match(styles, /\.customer-csv-progress\.hidden \{ display: none !important; \}/);
  assert.match(styles, /\.lead-export-actions \{\s*display: none !important;/);
});

test("el lector CSV recupera archivos de Excel con codificación Windows", () => {
  const script = read("empresa/js/contacts-premium-v333.js");
  assert.match(script, /utf8\.includes\("\\uFFFD"\)/);
  assert.match(script, /TextDecoder\("windows-1252"\)/);
  assert.match(script, /csvState\.text=await readCsvText\(file\)/);
});
