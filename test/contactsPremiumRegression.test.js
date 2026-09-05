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

test("la búsqueda conserva respuesta inmediata y consulta toda la base", () => {
  const script = read("empresa/js/contacts-premium-v333.js");
  assert.match(script, /filters\.search = searchInput\.value/);
  assert.match(script, /const refreshMatches = \(\) =>/);
  assert.match(script, /list\.innerHTML = visibleRows\.length/);
  assert.match(script, /contactDirectoryQuery\("customers", 0\)/);
  assert.match(script, /contactDirectorySearchTimer = setTimeout/);
  assert.match(script, /reloadDirectoryFromServer\(true\)/);
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
  assert.match(html, /contacts-directory-premium-v347-20260903/);
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
  assert.match(crmService, /filters\.audience_type === "LEAD"[\s\S]*is_customer = false/);
  assert.match(crmService, /filters\.audience_type === "CLIENT"[\s\S]*is_customer = true/);
  assert.match(crmService, /customer_import_declared[\s\S]*as is_customer/);
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
  const leadController = read("backend/src/controllers/leadCrmController.js");
  const routes = read("backend/src/routes/businessPortalRoutes.js");
  assert.match(premium, /data-edit-contact-seller/);
  assert.match(premium, /contactEditorName/);
  assert.match(premium, /method: "PATCH"/);
  assert.match(html, /id="contactSellerEditorModal"/);
  assert.match(html, /id="contactEditorEmail"/);
  assert.match(html, /id="contactEditorArchive"/);
  assert.match(leadController, /const contactUpdateSchema/);
  assert.match(leadService, /async function updateLeadContact/);
  assert.match(leadService, /Ya existe un contacto activo con el mismo correo, telefono o documento/);
  assert.match(leadService, /where not \(source_type = \$5 and id = \$6\)/);
  assert.match(routes, /router\.patch\("\/leads\/:leadId", requireContactDirectory, updateContact\)/);
  assert.match(leadService, /seller_user_id = \$\$\{params\.length\}::uuid/);
  assert.match(sellerController, /assigned_contacts: \{ clients:/);
  assert.match(html, /data-seller-tab="clients">Clientes y leads/);
});

test("totales, señales y paginación comparten el contrato del servidor", () => {
  const premium = read("empresa/js/contacts-premium-v333.js");
  const service = read("backend/src/services/leadCrmService.js");
  assert.match(service, /commercial_status not in \('LOST', 'DELETED', 'ARCHIVED'\)/);
  assert.match(service, /filters\.signal === "without_contact"/);
  assert.match(service, /function leadCrmOrderBy/);
  assert.match(service, /filtered_revenue/);
  assert.match(service, /inactive_customer_count/);
  assert.match(premium, /state\.leadDirectoryPaging/);
  assert.match(premium, /paging\.offset \+ \(data\.leads \|\| \[\]\)\.length/);
  assert.match(premium, /Resumen de toda la base filtrada/);
});

test("archivar funciona para todas las fuentes y conserva auditoría", () => {
  const premium = read("empresa/js/contacts-premium-v333.js");
  const service = read("backend/src/services/leadCrmService.js");
  const controller = read("backend/src/controllers/businessPortalController.js");
  const app = read("empresa/js/app.js");
  const html = read("empresa/index.html");
  assert.match(service, /update affiliates[\s\S]*'lifecycle_status', 'ARCHIVED'/);
  assert.match(service, /contact_archived/);
  assert.match(service, /recordLifecycleEvent/);
  assert.match(premium, /contact-directory-archive:/);
  assert.match(controller, /ml\.status <> 'ARCHIVED'/);
  assert.match(controller, /pagination: \{ total, limit, offset, has_more/);
  assert.match(app, /contacts\/manual\?limit=500&offset=\$\{offset\}/);
  assert.match(html, /id="contactArchiveReason"/);
  assert.match(html, /Ventas, notas, tickets y trazabilidad se conservarán/);
});

test("el editor premium tiene scroll interno, foco contenido y acciones móviles alcanzables", () => {
  const premium = read("empresa/js/contacts-premium-v333.js");
  const html = read("empresa/index.html");
  const styles = read("empresa/css/contacts-premium-v333.css");
  assert.match(html, /aria-describedby="contactSellerEditorHelp"/);
  assert.match(premium, /function trapModalFocus/);
  assert.match(styles, /\.contact-editor-body[\s\S]*overflow-y: auto/);
  assert.match(styles, /\.contact-editor-form[\s\S]*grid-template-rows: minmax\(0, 1fr\) auto auto/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*height: 100dvh !important/);
  assert.match(styles, /contact-editor-actions[\s\S]*grid-template-columns/);
});

test("el editor de contacto mantiene campos desplazables y acciones siempre alcanzables", () => {
  const app = read("empresa/js/app.js");
  const styles = read("empresa/css/portal-clean-v39.css");
  assert.match(app, /lead-manual-edit-fields/);
  assert.match(app, /lead-manual-edit-footer/);
  assert.match(app, /manualLeadEditCancelButton/);
  assert.match(app, /dataset\.manualEditMode = manualEditMode \? "true" : "false"/);
  assert.match(styles, /#leadDetailModal\[data-manual-edit-mode="true"\][\s\S]*height: min\(820px, calc\(100dvh/);
  assert.match(styles, /\.lead-manual-edit-fields \{[\s\S]*overflow-y: auto !important;/);
  assert.match(styles, /\.lead-manual-edit-footer \{[\s\S]*grid-template-columns: minmax\(0, 0\.75fr\) minmax\(0, 1\.25fr\)/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*height: 100dvh !important;/);
});

test("los afiliados se muestran como clientes y no se ocultan por antiguedad", () => {
  const crmService = read("backend/src/services/leadCrmService.js");
  const app = read("empresa/js/app.js");
  const affiliateView = app.slice(
    app.indexOf("async function renderAffiliatesView()"),
    app.indexOf("function rewardPassStatusLabel")
  );

  assert.match(crmService, /filters\.audience_type === "LEAD"[\s\S]*is_customer = false/);
  assert.match(crmService, /filters\.audience_type === "CLIENT"[\s\S]*is_customer = true/);
  assert.match(crmService, /is_affiliate[\s\S]*purchase_count > 0[\s\S]*customer_import_declared[\s\S]*as is_customer/);
  assert.match(crmService, /fa\.business_id = ml\.business_id/);
  assert.match(app, /item\.is_customer === true/);
  assert.match(app, /item\.is_affiliate === true/);
  assert.match(affiliateView, /const allRows = filterRows\(/);
  assert.doesNotMatch(affiliateView, /const allRows = withFilters\(/);
});
