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

test("la búsqueda espera a que termine la edición antes de reconstruir el directorio", () => {
  const script = read("empresa/js/contacts-premium-v333.js");
  assert.match(script, /directorySearchTimer/);
  assert.match(script, /filters\.search = searchInput\.value/);
  assert.match(script, /setTimeout\(\(\) => rerender\("contactDirectorySearchInput", caret\), 180\)/);
  assert.match(script, /contact-directory-result-note" aria-live="polite"/);
});

test("el progreso CSV oculto no deja residuos visuales", () => {
  const styles = read("empresa/css/contacts-premium-v333.css");
  assert.match(styles, /\.customer-csv-progress\.hidden \{ display: none !important; \}/);
});
