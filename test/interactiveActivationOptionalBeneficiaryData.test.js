const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const service = require("../backend/src/services/interactiveActivationService");
const validators = require("../backend/src/utils/validators");

test("el creador ofrece captura identificada o acceso directo con consecuencia explícita", () => {
  const html = read("empresa", "index.html");
  const app = read("empresa", "js", "app.js");
  const styles = read("empresa", "css", "styles.css");

  assert.match(html, /id="activationCollectParticipantDataInput" type="checkbox" checked/);
  assert.match(html, /Ticket transferible y no privado|Ticket identificado/);
  assert.match(app, /collect_participant_data: collectsParticipantData/);
  assert.match(app, /ticket_identity_mode: collectsParticipantData \? "IDENTIFIED" : "TRANSFERABLE"/);
  assert.match(app, /No se recolectan datos, no se crea un lead/);
  assert.match(app, /const customCaptureFields = collectsParticipantData/);
  assert.match(styles, /\.activation-builder-form\.is-capture-disabled/);
  assert.match(styles, /@media \(max-width: 600px\)/);
});

test("la configuración anónima elimina identidad, preguntas GOS y bloqueo por persona", () => {
  const normalized = service.normalizeCaptureConfig({
    collect_participant_data: false,
    required_fields: ["name", "phone", "email", "document"],
    custom_fields: [{ key: "interest", label: "Interés", required: true }],
    participant_lock: { cooldown_days: 30, winner_policy: "block_previous_winners" },
    product_interest: { mode: "PROMOTED_PRODUCT", product_name: "Producto A" },
  });
  assert.equal(normalized.collect_participant_data, false);
  assert.equal(normalized.ticket_identity_mode, "TRANSFERABLE");
  assert.deepEqual(normalized.required_fields, []);
  assert.deepEqual(normalized.custom_fields, []);
  assert.equal(normalized.participant_lock.enabled, false);
  assert.equal(normalized.participant_lock.cooldown_days, 0);
  assert.equal(normalized.product_interest.mode, "NO_PRODUCT");
  assert.equal(normalized.rms_mapping_enabled, false);

  const legacy = service.normalizeCaptureConfig({});
  assert.equal(legacy.collect_participant_data, true);
  assert.deepEqual(legacy.required_fields, ["name", "phone", "email", "document"]);
});

test("el servidor descarta datos personales enviados a una activación de acceso directo", () => {
  const body = {
    name: "Dato no autorizado",
    phone: "3001234567",
    email: "persona@example.com",
    document: "123456",
    metadata: {
      source_url: "https://example.com/activacion/demo",
      activation_form: { responses: { interest: "Producto A" } },
      rms_intake: { interest: "Producto A" },
    },
  };
  service.enforceParticipantCaptureMode({ capture_config: { collect_participant_data: false } }, body);
  assert.equal(body.name, undefined);
  assert.equal(body.phone, undefined);
  assert.equal(body.email, undefined);
  assert.equal(body.document, undefined);
  assert.equal(body.metadata.activation_form, undefined);
  assert.equal(body.metadata.rms_intake, undefined);
  assert.equal(body.metadata.beneficiary_data_collected, false);
  assert.equal(body.metadata.ticket_identity_mode, "TRANSFERABLE");
  assert.equal(body.metadata.source_url, "https://example.com/activacion/demo");
});

test("los endpoints públicos aceptan iniciar y completar sin identidad; el servicio conserva la exigencia cuando corresponde", () => {
  assert.equal(validators.publicInteractiveParticipantSchema.safeParse({ metadata: {} }).success, true);
  assert.equal(validators.publicInteractiveCompleteSchema.safeParse({ answers: {}, metadata: {} }).success, true);
  const serviceSource = read("backend", "src", "services", "interactiveActivationService.js");
  assert.match(serviceSource, /if \(!activationCollectsParticipantData\(activation\)\) return;/);
  assert.match(serviceSource, /source_type: "ANONYMOUS"/);
  assert.match(serviceSource, /if \(activationCollectsParticipantData\(activation\)\) \{\s+await registerActivityQrInCollector/);
});

test("la landing salta el formulario y el validador trata el QR como transferible", () => {
  const player = read("activacion", "activation.js");
  const qrService = read("backend", "src", "services", "qrService.js");
  const portal = read("empresa", "js", "app.js");
  const publicHtml = read("activacion", "index.html");
  const portalHtml = read("empresa", "index.html");

  assert.match(player, /if \(!collectsParticipantData\) \{[\s\S]*startGameSession\(\)[\s\S]*renderExperience\(\)/);
  assert.match(player, /capture_mode: "ANONYMOUS"/);
  assert.match(player, /no se solicitará ni cotejará una cédula/);
  assert.match(qrService, /ticket_identity_mode: qr\.origin_type === "INTERACTIVE_ACTIVATION"/);
  assert.match(portal, /function validatorIsTransferableTicket/);
  assert.match(portal, /No requiere cédula; confirma únicamente el beneficio/);
  assert.match(portal, /validatorPlayerValue\.textContent = isTransferableTicket \? "Ticket transferible"/);
  assert.match(publicHtml, /optional-beneficiary-data=v460-20260909/);
  assert.match(portalHtml, /optional-beneficiary-data=v460-20260909/);
  assert.match(portal, /empresa-20260909-optional-beneficiary-data-v460/);
});
