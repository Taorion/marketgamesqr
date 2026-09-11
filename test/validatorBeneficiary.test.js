const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { beneficiaryState, normalizeBeneficiary, resolveBeneficiary } = require("../backend/src/services/validatorBeneficiaryService");
const { recordCanonicalQrCheckout } = require("../backend/src/services/qrService");

test("normaliza teléfono colombiano, email y documento", () => {
  assert.deepEqual(normalizeBeneficiary({ name: " Laura   Gómez ", phone: "300 123 4567", email: " LAURA@EXAMPLE.COM ", document_id: "1.234-567" }), {
    player_id: null, name: "Laura Gómez", phone: "+573001234567", email: "laura@example.com", document_id: "1234567", capture_source: "VALIDATOR_IN_PERSON", data_use_confirmed: false, marketing_consent: false,
  });
});

test("clasifica datos completos, parciales y ticket anónimo", () => {
  assert.equal(beneficiaryState({ name: "Laura", phone: "3001234567" }).status, "IDENTIFIED");
  assert.deepEqual(beneficiaryState({ name: "Laura" }).missing_fields, ["identifier"]);
  assert.equal(beneficiaryState({}).status, "ANONYMOUS");
  assert.deepEqual(beneficiaryState({ name: "Laura", phone: "3001234567" }, true).missing_fields, ["document_id"]);
});

function fakeClient(rows = []) {
  const calls = [];
  return { calls, async query(sql, params) {
    calls.push({ sql, params });
    if (sql.includes("from players p where")) return { rows, rowCount: rows.length };
    if (sql.startsWith("select * from players where id=")) return { rows: [], rowCount: 0 };
    if (sql.startsWith("insert into players")) return { rows: [{ id: "new-player", business_id: params[0], name: params[5], phone: params[6], email: params[7], document_id: params[8] }], rowCount: 1 };
    if (sql.startsWith("update players")) return { rows: [{ ...rows[0], name: rows[0].name || params[2] }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  }};
}

const base = { businessId: "business-a", campaignId: null, gameId: null, branchId: null, sellerUserId: "seller", currentPlayerId: null, documentRequired: false, operationKey: "operation-123", qrCodeId: "qr-1" };

test("ticket anónimo crea un único player canónico y no concede marketing", async () => {
  const client = fakeClient();
  const result = await resolveBeneficiary(client, { ...base, input: { name: "Laura", phone: "3001234567", data_use_confirmed: true } });
  assert.equal(result.created, true);
  const insert = client.calls.find((call) => call.sql.startsWith("insert into players"));
  assert.equal(JSON.parse(insert.params[9]).marketing_consent, false);
});

test("reutiliza coincidencia inequívoca por documento, email o teléfono", async () => {
  for (const input of [{ document_id: "123" }, { email: "x@y.co" }, { phone: "3001234567" }]) {
    const existing = { id: "p1", business_id: "business-a", name: "Laura", phone: input.phone ? "+573001234567" : null, email: input.email || null, document_id: input.document_id || null };
    const result = await resolveBeneficiary(fakeClient([existing]), { ...base, input: { name: "Laura", ...input, data_use_confirmed: true } });
    assert.equal(result.player.id, "p1"); assert.equal(result.created, false);
  }
});

test("bloquea identificadores que apuntan a personas diferentes", async () => {
  await assert.rejects(() => resolveBeneficiary(fakeClient([{ id: "p1" }, { id: "p2" }]), { ...base, input: { name: "Laura", phone: "3001234567", email: "x@y.co", data_use_confirmed: true } }), /Conflicto de identidad/);
});

test("exige nombre, identificador, documento condicionado y confirmación de uso", async () => {
  await assert.rejects(() => resolveBeneficiary(fakeClient(), { ...base, input: { phone: "3001234567", data_use_confirmed: true } }), /nombre completo/);
  await assert.rejects(() => resolveBeneficiary(fakeClient(), { ...base, input: { name: "Laura", data_use_confirmed: true } }), /teléfono, correo o documento/);
  await assert.rejects(() => resolveBeneficiary(fakeClient(), { ...base, documentRequired: true, input: { name: "Laura", phone: "3001234567", data_use_confirmed: true } }), /exige verificar el documento/);
  await assert.rejects(() => resolveBeneficiary(fakeClient(), { ...base, input: { name: "Laura", phone: "3001234567" } }), /Confirma que el beneficiario/);
});

test("todas las búsquedas y escrituras se limitan por business_id", async () => {
  const client = fakeClient();
  await resolveBeneficiary(client, { ...base, input: { name: "Laura", email: "x@y.co", data_use_confirmed: true } });
  assert.ok(client.calls.filter((call) => /players/.test(call.sql)).every((call) => call.params.includes("business-a")));
});

test("el contrato de redención bloquea QR, resuelve identidad y persiste todo antes de marcarlo redimido", () => {
  const fs = require("node:fs");
  const service = fs.readFileSync(path.resolve(__dirname, "../backend/src/services/qrService.js"), "utf8");
  const redeem = service.slice(service.indexOf("async function redeemQr"), service.indexOf("function buildStatusMessage"));
  assert.match(redeem, /for update of q/);
  assert.ok(redeem.indexOf("resolveBeneficiary") < redeem.indexOf("insert into redemptions"));
  assert.ok(redeem.indexOf("insert into attributed_sales") < redeem.indexOf("set status = 'REDEEMED'"));
  assert.ok(redeem.indexOf("recordCanonicalQrCheckout") < redeem.indexOf("set status = 'REDEEMED'"));
  assert.match(service, /product_catalog_required: false/);
  assert.match(service, /'QR_REDEMPTION'/);
  assert.match(redeem, /sale_id=\$4/);
  assert.match(redeem, /validator_redemption_idempotency_key/);
  assert.match(redeem, /registerRedemptionIntake/);
  assert.match(redeem, /player_id=\$3/);
});

test("la migracion repara compras QR historicas y conserva productos fuera del catalogo", () => {
  const fs = require("node:fs");
  const migration = fs.readFileSync(path.resolve(__dirname, "../database/migrations/202609110002_qr_validator_canonical_sales.sql"), "utf8");
  assert.match(migration, /from attributed_sales sales/);
  assert.match(migration, /sales\.application_mode = 'PURCHASE'/);
  assert.match(migration, /not exists[\s\S]*business_sales existing/);
  assert.match(migration, /coalesce\([\s\S]*sales\.product_or_service[\s\S]*Compra registrada desde Validador/);
  assert.match(migration, /'product_catalog_required', false/);
  assert.match(migration, /on conflict \(qr_code_id\) where qr_code_id is not null do nothing/);
  assert.match(migration, /update qr_codes qr[\s\S]*set sale_id = sales\.id/);
});

test("una compra del Validador crea la venta canonica sin exigir producto de catalogo", async () => {
  const calls = [];
  const client = { async query(sql, params) {
    calls.push({ sql, params });
    return { rows: [{ id: "sale-1", business_id: params[0], qr_code_id: params[2] }] };
  } };
  const sale = await recordCanonicalQrCheckout(
    client,
    { id: "qr-1", business_id: "business-a", campaign_id: "campaign-1", player_id: "player-1", player_name: "Laura Gomez", player_phone: "+573001234567", player_email: null, player_document_id: null, metadata: {} },
    { id: "attributed-1", redemption_id: "redemption-1" },
    { final_total: 45000, line_items: [{ name: "Servicio no registrado", quantity: 1, unit_price: 50000, inventory_product_id: null }] },
    { currency: "COP", payment_method: "Efectivo", branch_id: null },
    { id: "seller-1", branch_id: null }
  );
  assert.equal(sale.id, "sale-1");
  assert.match(calls[0].sql, /insert into business_sales/);
  assert.match(calls[0].sql, /on conflict \(qr_code_id\)/);
  assert.equal(calls[0].params[0], "business-a");
  assert.equal(calls[0].params[7], "Servicio no registrado x1");
  assert.equal(calls[0].params[16], null);
  assert.equal(JSON.parse(calls[0].params[20]).crm_source_id, "player-1");
  assert.equal(JSON.parse(calls[0].params[20]).product_catalog_required, false);
});
