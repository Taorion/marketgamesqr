const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa/index.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "empresa/css/portal-clean-v39.css"), "utf8");

function tabButtons(attribute) {
  return Array.from(html.matchAll(new RegExp(`<button[^>]*${attribute}="[^"]+"[^>]*>[\\s\\S]*?<\\/button>`, "g")), (match) => match[0]);
}

test("todas las familias principales de pestañas incluyen iconos semánticos", () => {
  const families = [
    ["data-dashboard-profile", 4],
    ["data-smart-catalog-tab", 4],
    ["data-campaign-section-tab", 3],
    ["data-lead-tab", 9],
    ["data-redemption-sales-tab", 2],
    ["data-competition-tab", 8],
    ["data-competition-product-view", 2],
  ];

  families.forEach(([attribute, expected]) => {
    const buttons = tabButtons(attribute);
    assert.equal(buttons.length, expected, `${attribute} debe conservar ${expected} pestañas`);
    buttons.forEach((button) => {
      assert.match(button, /class="material-symbols-outlined qori-tab-icon"/);
      assert.match(button, /aria-hidden="true"/);
    });
  });

  ["activationShareContactMode", "activationSharePhoneMode", "activationShareEmailMode"].forEach((id) => {
    assert.match(html, new RegExp(`<button[^>]*id="${id}"[\\s\\S]*?qori-tab-icon[\\s\\S]*?<\\/button>`));
  });

  assert.equal((html.match(/qori-tab-icon/g) || []).length, 35);
});

test("el sistema de iconos conserva alineación, tamaño y cache busting responsive", () => {
  assert.match(styles, /Portal tab icon system v356/);
  assert.match(styles, /\.qori-tab-icon\s*\{[\s\S]*?place-items: center/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?#leadDetailTabs \.qori-tab-icon/);
  assert.match(html, /portal-clean-v39\.css\?v=portal-tab-icons-v356-20260825/);
});
