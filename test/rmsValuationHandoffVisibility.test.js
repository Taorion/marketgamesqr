const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const crmService = fs.readFileSync("backend/src/services/leadCrmService.js", "utf8");
const rmsService = fs.readFileSync("backend/src/services/rmsMachineService.js", "utf8");

test("Valorización recupera el origen persistido aunque exista un contacto PLAYER duplicado", () => {
  assert.match(crmService, /const preserveRequestedSourceRefs = filters\.preserve_requested_source_refs === true/);
  assert.match(crmService, /preserveRequestedSourceRefs\s*\? "select \* from all_rows"/);
  assert.match(rmsService, /source_ids: sourceIds,\s*preserve_requested_source_refs: true,/);
  assert.match(crmService, /const affiliateShadowExclusionSql = preserveRequestedSourceRefs/);
  assert.match(crmService, /and fa\.status <> 'DELETED'[\s\S]*card_metadata->>'lifecycle_status'[\s\S]*\$\{affiliateShadowExclusionSql\}/);
});

test("el CRM general conserva su deduplicación canónica por defecto", () => {
  assert.match(crmService, /: `select candidate\.\*[\s\S]*from all_rows preferred/);
  assert.match(crmService, /case preferred\.source_type when 'PLAYER' then 1 when 'AFFILIATE' then 2 else 3 end/);
});
