const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const cssSource = fs.readFileSync(path.join(root, "empresa", "css", "styles.css"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");

test("lead segment copy and score remain in separate responsive columns", () => {
  assert.match(
    cssSource,
    /\.lead-segment-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) minmax\(36px, max-content\)/,
  );
  assert.match(
    cssSource,
    /\.lead-segment-row > span:first-child\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%/,
  );
  assert.match(
    cssSource,
    /\.lead-segment-row strong,[\s\S]*?\.lead-segment-row small\s*\{[\s\S]*?white-space:\s*normal;[\s\S]*?overflow-wrap:\s*anywhere/,
  );
  assert.match(
    cssSource,
    /\.lead-segment-row > \.status-chip\s*\{[\s\S]*?min-width:\s*36px;[\s\S]*?justify-self:\s*end;[\s\S]*?white-space:\s*nowrap !important/,
  );
});

test("the portal stylesheet cache key includes the lead segment repair", () => {
  assert.match(htmlSource, /lead-segment-overflow=v1-20260916/);
});
