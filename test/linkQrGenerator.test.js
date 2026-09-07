const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const serviceSource = read("backend", "src", "services", "linkQrService.js");
const routesSource = read("backend", "src", "routes", "businessQrRoutes.js");
const controllerSource = read("backend", "src", "controllers", "businessQrController.js");
const portalSource = read("empresa", "js", "app.js");
const portalHtml = read("empresa", "index.html");

test("link QR service generates a standalone PNG without ticket persistence", async () => {
  const { generateLinkQr } = require(path.join(root, "backend", "src", "services", "linkQrService.js"));
  const result = await generateLinkQr({ url: "https://example.com/actividad", label: "Actividad", size: 720 });
  assert.match(result.qr_image_data_url, /^data:image\/png;base64,/);
  assert.equal(result.target_url, "https://example.com/actividad");
  assert.equal(result.consumes_tickets, false);
  assert.equal(result.creates_benefit, false);
  assert.equal(result.creates_redemption, false);
  assert.doesNotMatch(serviceSource, /query\(|withTransaction|consumeQrCredit|insert into|qr_codes/i);
});

test("authenticated business route exposes the standalone link generator", () => {
  assert.match(routesSource, /router\.post\("\/link-image", createLinkQr\)/);
  assert.match(controllerSource, /validate\(linkQrSchema, req\.body\)/);
  assert.doesNotMatch(controllerSource.slice(controllerSource.indexOf("async function createLinkQr"), controllerSource.indexOf("async function createBatch")), /recordUsage|consumeQr|createPostSaleQr/);
});

test("portal can select an activation or accept any HTTPS link and download the image", () => {
  assert.match(portalHtml, /id="activationLinkQrActivationSelect"/);
  assert.match(portalHtml, /id="activationLinkQrUrlInput"/);
  assert.match(portalHtml, /No consume tickets ni crea beneficios o redenciones/);
  assert.match(portalSource, /api\("\/api\/business\/qr\/link-image"/);
  assert.match(portalSource, /activationLinkQrActivationSelect\?\.addEventListener\("change", selectActivationForLinkQr\)/);
  assert.match(portalSource, /activationLinkQrDownloadButton\?\.addEventListener\("click", downloadActivationLinkQr\)/);
  assert.match(portalSource, /data-generate-activation-link-qr/);
});
