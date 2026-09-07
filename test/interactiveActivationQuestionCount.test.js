const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "empresa", "css", "styles.css"), "utf8");

test("open-question count hides and disables every row outside the selected amount", () => {
  assert.match(appSource, /const openQuestionCount = getActivationQuestionCount\("OPEN_QUESTION", 1\)/);
  assert.match(appSource, /const active = Number\(input\.dataset\.openQuestion \|\| 0\) <= openQuestionCount/);
  assert.match(appSource, /row\.classList\.toggle\("hidden", !active\);\s*row\.toggleAttribute\("hidden", !active\);\s*input\.disabled = !active/);
});

test("the final activation modal cascade keeps inactive question labels hidden", () => {
  assert.match(cssSource, /activation-question-count-v440-20260907/);
  assert.match(cssSource, /#gamingActivationBuilderModal \.activation-config-panel label\.hidden,[\s\S]*label\[hidden\][\s\S]*display: none !important/);
});

test("only the selected number of open questions is collected for publication", () => {
  assert.match(appSource, /function collectOpenQuestions\(\)[\s\S]*Number\(input\.dataset\.openQuestion \|\| 0\) <= count && !input\.disabled/);
  assert.match(appSource, /if \(type === "OPEN_QUESTION"\)[\s\S]*questions: openQuestions\.length \? openQuestions/);
});
