const test = require("node:test");
const assert = require("node:assert/strict");
const { lifecycleEventPayload } = require("../backend/src/services/lifecycleAuditService");

test("the lifecycle ledger accepts only auditable non-destructive actions", () => {
  const event = lifecycleEventPayload({
    business_id: "business-a",
    entity_type: "ATTRIBUTED_SALE",
    entity_id: "sale-a",
    action: "voided",
    previous_status: "paid",
    next_status: "voided",
    reason: "Pago reversado por el operador",
  });
  assert.equal(event.action, "VOIDED");
  assert.equal(event.previous_status, "PAID");
  assert.equal(event.next_status, "VOIDED");
  assert.throws(() => lifecycleEventPayload({ action: "PURGED" }), /no permitida/);
});

test("the portal routes lifecycle changes through tenant-scoped commands", () => {
  const controller = require("node:fs").readFileSync("backend/src/controllers/businessPortalController.js", "utf8");
  const agenda = require("node:fs").readFileSync("backend/src/services/leadCrmService.js", "utf8");
  assert.match(controller, /where id = \$1 and business_id = \$2\s+for update/);
  assert.match(controller, /set sale_status = 'VOIDED'/);
  assert.match(agenda, /set agenda_status = 'CANCELLED'/);
  assert.match(agenda, /recordLifecycleEvent/);
  assert.match(agenda, /Compatibility endpoint: it is deliberately an archive command/);
  assert.match(agenda, /set status = 'ARCHIVED'/);
  assert.match(agenda, /'lifecycle_status', 'ARCHIVED'/);
});
