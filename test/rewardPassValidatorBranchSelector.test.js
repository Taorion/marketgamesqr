const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");

test("el Validador carga el directorio tenant antes de redimir una Tarjeta regalo", () => {
  assert.match(html, /id="validatorRewardPassBranchInput"/);
  assert.match(html, /validator-reward-branch=v504-20260916/);
  assert.match(app, /if \(session\?\.user\?\.business_id\) \{[\s\S]*loadBusinessBranches\(\{ quiet: true \}\)[\s\S]*renderValidatorRewardPassBranchOptions\(\)/);
  assert.doesNotMatch(app, /session\?\.user\?\.business_id && hasPlanFeature\("multi_branch"\)/);
  assert.match(app, /data\.kind === "reward_pass"[\s\S]*loadBusinessBranches\(\{ force: true, quiet: true \}\)[\s\S]*renderValidatorRewardPassBranchOptions\(data\.reward_pass\)/);
});

test("el selector usa sedes activas y respeta la autorizacion persistida", () => {
  assert.match(app, /businessBranches[\s\S]*branch\.is_active !== false/);
  assert.match(app, /authorized_branch_id/);
  assert.match(app, /validatorRewardPassBranchInput\.disabled = isLoading \|\| !available\.length/);
  assert.match(app, /\["ALL_BRANCHES", "SPECIFIC_BRANCH"\][\s\S]*branch_authorization_scope/);
});

test("la redencion exige una sede seleccionada antes de llamar al backend", () => {
  assert.match(app, /Selecciona la sede o caja activa donde se registrar.+ la redenci.+n/);
  assert.match(app, /branch_id: validatorRewardPassBranchInput\?\.value\.trim\(\) \|\| null/);
  assert.match(app, /noClientCache: Boolean\(options\.force\)/);
});
