const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const portalHtml = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const portalApp = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const publicHtml = fs.readFileSync(path.join(root, "activacion", "index.html"), "utf8");
const player = fs.readFileSync(path.join(root, "activacion", "activation.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "activacion", "styles.css"), "utf8");
const service = fs.readFileSync(path.join(root, "backend", "src", "services", "interactiveActivationService.js"), "utf8");

test("Invitación privada permite configurar fecha elegible o fecha fija", () => {
  assert.match(portalHtml, /id="privateInvitationScheduleModeInput"/);
  assert.match(portalHtml, /value="GUEST_CHOOSES_DATE"/);
  assert.match(portalHtml, /value="FIXED_EVENT_DATE"/);
  assert.match(portalHtml, /id="privateInvitationStartDateInput" type="date"/);
  assert.match(portalHtml, /id="privateInvitationEndDateInput" type="date"/);
  assert.match(portalHtml, /id="privateInvitationFixedDateInput" type="date"/);
  assert.match(portalApp, /function updatePrivateInvitationScheduleFields/);
  assert.match(portalApp, /endDateInput\.value < startDateInput\.value/);
});

test("la configuración de agenda queda persistida en interaction_config", () => {
  assert.match(portalApp, /service_label:/);
  assert.match(portalApp, /min_date:/);
  assert.match(portalApp, /max_date:/);
  assert.match(portalApp, /fixed_date:/);
  assert.match(portalApp, /\{ schedule: privateInvitationSchedule \}/);
});

test("el invitado selecciona o confirma la fecha y esta viaja con la participación", () => {
  assert.match(player, /currentActivation\.activation_type === "PRIVATE_INVITATION"/);
  assert.match(player, /function renderPrivateInvitationExperience/);
  assert.match(player, /id="privateInvitationDateInput" type="date"/);
  assert.match(player, /id="privateInvitationDateInput" type="hidden"/);
  assert.match(player, /answers: \{ visit_date: selectedDate \}/);
  assert.match(player, /private_invitation_schedule_mode: mode/);
  assert.match(player, /private_invitation_date: selectedDate/);
  assert.match(service, /function applyPrivateInvitationSchedule/);
  assert.match(service, /body\.answers = \{ \.\.\.\(body\.answers \|\| \{\}\), visit_date: visitDate \}/);
  assert.match(service, /visitDate < minDate/);
  assert.match(service, /visitDate > maxDate/);
  assert.match(service, /visitDate = String\(schedule\.fixed_date/);
});

test("la invitación tiene presentación premium, móvil y assets versionados", () => {
  assert.match(styles, /\.private-invitation-experience/);
  assert.match(styles, /\.private-invitation-date input\[type="date"\]/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(publicHtml, /private-invitation=v457-20260909/);
  assert.match(portalHtml, /private-invitation=v457-20260909/);
  assert.match(portalApp, /empresa-20260909-order-options-v459/);
});
