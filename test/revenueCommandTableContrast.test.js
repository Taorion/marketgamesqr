const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("empresa/index.html", "utf8");
const css = fs.readFileSync("empresa/css/portal-clean-v39.css", "utf8");

test("Revenue command tables keep readable dark surfaces in the portal and Chart Focus", () => {
  assert.match(html, /revenue-table-contrast-v468-20260910/);
  assert.match(css, /Centro de Revenue v468: tablas oscuras autocontenidas y legibles/);
  assert.match(css, /body\[data-current-view="dashboard"\][\s\S]*?\.command-table tbody td[\s\S]*?color: #eaf7ff !important;[\s\S]*?background: #081e34 !important;/);
  assert.match(css, /\.chart-focus-overlay :is\(\.command-table, \.drilldown-table\) tbody td/);
  assert.match(css, /\.command-table tbody :is\(small, \.table-secondary, \.table-muted\)[\s\S]*?color: #a9cfe0 !important;/);
});

test("Revenue command table states and matrices remain legible", () => {
  assert.match(css, /\.command-table tbody tr:nth-child\(even\) td[\s\S]*?background: #0a233d !important;/);
  assert.match(css, /\.command-table tbody tr:focus-visible td[\s\S]*?background: #103957 !important;/);
  assert.match(css, /\.command-matrix tbody td[\s\S]*?color: #f8fdff !important;[\s\S]*?var\(--intensity, 0\)/);
  assert.match(css, /\.command-detail-row td[\s\S]*?background: #071a2e !important;/);
});
