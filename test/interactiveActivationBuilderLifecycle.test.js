const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");

test("opening a new activation clears every result left by the previous creation", () => {
  assert.match(appSource, /function resetGamingActivationBuilderForNewActivation\(\)[\s\S]*triviaLauncherForm\?\.reset\(\)/);
  assert.match(appSource, /triviaLauncherResult\?\.classList\.add\("hidden"\)/);
  assert.match(appSource, /if \(triviaLauncherResult\) triviaLauncherResult\.innerHTML = ""/);
  assert.match(appSource, /setInlineMessage\(triviaLauncherMessage, "", "info"\)/);
  assert.match(appSource, /if \(options\.reset !== false\) \{\s*resetGamingActivationBuilderForNewActivation\(\)/);
});

test("a clean creation restores dynamic fields and uploaded image state", () => {
  assert.match(appSource, /activationFormBuilder\.innerHTML = activationFormBuilderInitialMarkup/);
  assert.match(appSource, /Object\.keys\(productVoteImages\)\.forEach\(\(key\) => delete productVoteImages\[key\]\)/);
  assert.match(appSource, /delete input\.dataset\.imageDataUrl/);
  assert.match(appSource, /preview\.removeAttribute\("src"\)/);
});

test("resuming a draft keeps its saved data instead of applying the new-activation reset", () => {
  assert.match(appSource, /restoreGamingActivationDraft\(snapshot\)[\s\S]*openGamingActivationBuilderModal\(\{ reset: false \}\)/);
});

test("creating another activation does not archive the prior activation", () => {
  assert.doesNotMatch(appSource, /currentLauncherActivationId/);
  assert.doesNotMatch(appSource, /archivePreviousLauncherActivation/);
  assert.doesNotMatch(appSource, /El link anterior quedó archivado/);
});
