const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { resolveAcquisitionChannelReference } = require("../backend/src/services/acquisitionChannelService");

function clientWith(rows) {
  return { query: async () => ({ rows }) };
}

test("configured acquisition channels persist canonical tenant-scoped snapshots", async () => {
  const value = await resolveAcquisitionChannelReference(clientWith([
    { id: "channel-a", name: "Feria Bogotá", slug: "feria-bogota", status: "ACTIVE" },
  ]), "business-a", { acquisition_channel_id: "channel-a" });
  assert.deepEqual(value, {
    acquisition_channel_id: "channel-a",
    acquisition_channel_name_snapshot: "Feria Bogotá",
    acquisition_channel_slug_snapshot: "feria-bogota",
    acquisition_channel_source: "CONFIGURED",
    acquisition_channel: "Feria Bogotá",
  });
});

test("manual acquisition is an explicit historical fallback, not a fabricated configured channel", async () => {
  const value = await resolveAcquisitionChannelReference(clientWith([]), "business-a", { acquisition_channel: "Aliado local" });
  assert.equal(value.acquisition_channel_id, null);
  assert.equal(value.acquisition_channel_source, "MANUAL_UNCONFIGURED");
  assert.equal(value.acquisition_channel_name_snapshot, "Aliado local");
});

test("another business or an archived channel cannot be selected for a new operation", async () => {
  await assert.rejects(
    resolveAcquisitionChannelReference(clientWith([]), "business-a", { acquisition_channel_id: "channel-b" }),
    /no pertenece a este negocio/i
  );
  await assert.rejects(
    resolveAcquisitionChannelReference(clientWith([{ id: "channel-a", name: "Anterior", slug: "anterior", status: "ARCHIVED" }]), "business-a", { acquisition_channel_id: "channel-a" }),
    /activos/i
  );
});

test("the portal no longer presents fixed platforms as campaign acquisition data", () => {
  const html = fs.readFileSync("empresa/index.html", "utf8");
  const app = fs.readFileSync("empresa/js/app.js", "utf8");
  assert.match(html, /data-acquisition-channel-grid="campaign"/);
  assert.match(app, /acquisitionChannelRefsForGrid/);
  assert.match(app, /launch_channel_refs/);
  assert.doesNotMatch(app, /answers\.channels\?\.length \? answers\.channels : \["Instagram", "WhatsApp"\]/);
});
