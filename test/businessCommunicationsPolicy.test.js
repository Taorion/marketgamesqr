const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("communications API is restricted to business management roles", () => {
  const routes = read("backend/src/routes/businessPortalRoutes.js");
  assert.match(routes, /router\.use\("\/communications", requireRoles\("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"\)\)/);
  assert.doesNotMatch(routes, /ADMIN_Qori/);
});

test("bulk dispatches require idempotency and persist dispatch state", () => {
  const controller = read("backend/src/controllers/businessCommunicationController.js");
  const service = read("backend/src/services/businessCommunicationService.js");
  const migration = read("database/migrations/202608220001_communication_delivery_safety.sql");
  assert.match(controller, /idempotency_key: z\.string\(\)\.uuid\(\)/);
  assert.match(service, /beginCommunicationDispatch/);
  assert.match(service, /idempotent_replay: true/);
  assert.match(migration, /business_communication_dispatches/);
  assert.match(migration, /unique index[\s\S]+business_id, idempotency_key/);
});

test("email recipients receive auditable consent and unsubscribe protection", () => {
  const service = read("backend/src/services/businessCommunicationService.js");
  const mail = read("backend/src/services/businessCommunicationMailService.js");
  const publicRoutes = read("backend/src/routes/publicCommunicationPreferenceRoutes.js");
  assert.match(service, /consent_confirmed_at/);
  assert.match(service, /opted_out/);
  assert.match(service, /List-Unsubscribe/);
  assert.match(mail, /Object\.keys\(headers\)\.length/);
  assert.match(publicRoutes, /communications\/unsubscribe\/\:token/);
});

test("communication history redacts heavy payloads and hydrates only on edit", () => {
  const service = read("backend/src/services/businessCommunicationService.js");
  const frontend = read("empresa/js/communications.js");
  assert.match(service, /payloads_redacted/);
  assert.match(service, /getBusinessCommunication/);
  assert.match(frontend, /hydrateCommunicationPayload/);
  assert.match(frontend, /communicationCommandStrip/);
});

test("communications audience stays operable without a page-length contact list", () => {
  const html = read("empresa/index.html");
  const css = read("empresa/css/communications-flow.css");
  const frontend = read("empresa/js/communications.js");
  assert.ok(html.indexOf('id="communicationSendBar"') < html.indexOf('id="communicationAudienceList"'));
  assert.match(css, /communication-audience-list[\s\S]+max-height:[^;]+;[\s\S]+overflow-y:\s*auto/);
  assert.match(frontend, /communication-readiness/);
  assert.match(frontend, /Seleccionar \$\{audienceChannel === "whatsapp"/);
});

test("RMS activation email uses the same working Resend configuration as Communications", () => {
  const service = read("backend/src/services/businessCommunicationService.js");
  const start = service.indexOf("async function sendRmsActivationBulkEmail");
  const end = service.indexOf("function normalizedWhatsAppPhone", start);
  const rmsActivationSend = service.slice(start, end);
  assert.match(rmsActivationSend, /connection\.api_key_configured/);
  assert.doesNotMatch(rmsActivationSend, /connection\.sender_verified/);
  assert.match(service, /sendBusinessCommunicationEmail/);
});

test("accepted RMS bulk emails enable the persisted activation response flow", () => {
  const service = read("backend/src/services/businessCommunicationService.js");
  const rmsService = read("backend/src/services/rmsMachineService.js");
  const controller = read("backend/src/controllers/rmsMachineController.js");
  const frontend = read("empresa/js/rms-activation-bulk-email.js");
  const start = service.indexOf("async function syncRmsActivationAcceptedRecipients");
  const end = service.indexOf("async function sendRmsActivationBulkEmail", start);
  const sync = service.slice(start, end);
  assert.match(sync, /r\.status = 'SENT'/);
  assert.match(sync, /recordActivationDelivery/);
  assert.match(sync, /moveRmsLeadPhase/);
  assert.match(sync, /activation_offer_sent_at/);
  assert.match(sync, /activation_follow_up_at/);
  assert.doesNotMatch(sync, /status = 'FAILED'/);
  assert.match(controller, /sendRmsActivationBulkEmail\(businessIdFor\(req\), req\.user, body, req\.user\.email\)/);
  assert.match(frontend, /await loadRmsMachineData\(\{ force: true, quiet: true, lite: true, stationPhase: "clasificacion" \}\)/);
  assert.match(rmsService, /async function acceptedRmsActivationDeliveryMap/);
  assert.match(rmsService, /activation_delivery_source: "resend_bulk_acceptance"/);
  assert.match(rmsService, /if \(!stateRow \|\| stateRow\.metadata\?\.activation_offer_sent_at\) return/);
});
