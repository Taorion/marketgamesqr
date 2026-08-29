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

test("el responsable comercial aparece en importación, búsqueda y directorio", () => {
  const script = read("empresa/js/contacts-premium-v333.js");
  const app = read("empresa/js/app.js");
  const html = read("empresa/index.html");
  assert.match(script, /metadata\.commercial_owner_name/);
  assert.match(script, /Responsable: \$\{owner\}/);
  assert.match(app, /metadata\.commercial_owner_email/);
  assert.match(html, /responsable_comercial/);
  assert.match(html, /contacts-client-import-v345-20260828-default-seller/);
});

test("cada contacto, incluidos afiliados, admite un vendedor responsable", () => {
  const migration = read("database/migrations/20260828140622_add_affiliate_seller_responsibility.sql");
  const service = read("backend/src/services/leadCrmService.js");
  const app = read("empresa/js/app.js");
  assert.match(migration, /alter table if exists affiliates[\s\S]*seller_user_id uuid references app_users\(id\)/);
  assert.match(migration, /idx_affiliates_business_seller_created/);
  assert.match(service, /PLAYER", "MANUAL", "AFFILIATE/);
  assert.match(service, /AFFILIATE: \{ table: "affiliates", metadata: "card_metadata"/);
  assert.match(app, /\["PLAYER", "MANUAL", "AFFILIATE"\]\.includes/);
});

test("la carga masiva permite un vendedor predeterminado sin pisar el responsable de cada fila", () => {
  const controller = read("backend/src/controllers/leadCrmController.js");
  const service = read("backend/src/services/customerCsvImportService.js");
  const script = read("empresa/js/contacts-premium-v333.js");
  const html = read("empresa/index.html");
  assert.match(controller, /default_seller_user_id: z\.string\(\)\.uuid\(\)\.optional\(\)\.nullable\(\)/);
  assert.match(service, /if \(!row\.commercial_owner_reference\) row\.commercial_owner_reference = fallback/);
  assert.match(service, /AFFILIATE: \{ table: "affiliates", metadata: "card_metadata", supportsSeller: true \}/);
  assert.match(script, /default_seller_user_id:ui\.defaultSeller\?\.value\|\|null/);
  assert.match(script, /defaultSeller\?\.addEventListener\("change",\(\)=>previewCurrentFile\(\)\)/);
  assert.match(html, /Vendedor predeterminado del lote/);
  assert.match(html, /los responsables definidos dentro del CSV conservan prioridad/);
});

test("la importación CSV persiste clientes y los excluye de Leads aunque no tengan compras", () => {
  const importService = read("backend/src/services/customerCsvImportService.js");
  const crmService = read("backend/src/services/leadCrmService.js");
  const app = read("empresa/js/app.js");
  const premium = read("empresa/js/contacts-premium-v333.js");
  assert.match(importService, /customer_import_declared: true/);
  assert.match(importService, /Cliente importado; historial comercial pendiente/);
  assert.match(importService, /if \(!row\.has_commercial_evidence\)[\s\S]*sale_id: null/);
  assert.match(crmService, /purchase_count = 0 and coalesce\(metadata->>'customer_import_declared', 'false'\) <> 'true'/);
  assert.match(crmService, /purchase_count > 0 or coalesce\(metadata->>'customer_import_declared', 'false'\) = 'true'/);
  assert.match(app, /metadata\.customer_import_declared/);
  assert.match(premium, /Cliente · historial pendiente/);
  assert.match(premium, /Creando clientes por lotes de 50/);
  assert.doesNotMatch(premium, /Creando clientes y contactos/);
  assert.doesNotMatch(premium, /Contacto pendiente/);
});

test("el alta y la edición manual permiten un responsable opcional del mismo negocio", () => {
  const controller = read("backend/src/controllers/businessPortalController.js");
  const app = read("empresa/js/app.js");
  const html = read("empresa/index.html");
  assert.match(controller, /commercial_owner_user_id: z\.string\(\)\.uuid\(\)\.optional\(\)\.nullable\(\)/);
  assert.match(controller, /where id = \$1[\s\S]*and business_id = \$2[\s\S]*and is_active = true/);
  assert.match(controller, /commercial_owner_name/);
  assert.match(app, /manualLeadCommercialOwnerInput/);
  assert.match(app, /manualLeadEditCommercialOwnerInput/);
  assert.match(html, /Solo muestra usuarios activos de este negocio/);
});

test("Clientes y Leads permiten editar datos y asignar vendedores activos", () => {
  const premium = read("empresa/js/contacts-premium-v333.js");
  const html = read("empresa/index.html");
  const sellerController = read("backend/src/controllers/sellerController.js");
  const leadService = read("backend/src/services/leadCrmService.js");
  assert.match(premium, /data-edit-contact-seller/);
  assert.match(premium, /user\.role === "BUSINESS_SELLER"/);
  assert.match(premium, /seller-responsibility/);
  assert.match(html, /id="contactSellerEditorModal"/);
  assert.match(leadService, /seller_user_id = \$\$\{params\.length\}::uuid/);
  assert.match(sellerController, /assigned_contacts: \{ clients:/);
  assert.match(html, /data-seller-tab="clients">Clientes y leads/);
});
