const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const home = read("qori-web", "index.html");
const reader = read("qori-web", "academia-vendedores", "index.html");
const readerScript = read("qori-web", "academia-vendedores", "app.js");
const cultivationReader = read("qori-web", "cultivar-ventas", "index.html");
const cultivationScript = read("qori-web", "cultivar-ventas", "app.js");
const cultivationContent = read("qori-web", "cultivar-ventas", "content.js");
const pagesRoot = path.join(root, "qori-web", "academia-vendedores", "pages");

test("the public home links sellers to the Qori commercial academy", () => {
  assert.match(home, /id="academia"/);
  assert.match(home, /href="\/academia-vendedores\/"/);
  assert.match(home, /Academia comercial Qori/);
  assert.match(home, /Abrir capacitación/);
});

test("the academy presents all 101 pages without exposing a PDF download", () => {
  const pages = fs.readdirSync(pagesRoot).filter((name) => /^page-\d{3}\.webp$/.test(name));
  assert.equal(pages.length, 101);
  assert.ok(fs.statSync(path.join(pagesRoot, "page-001.webp")).size > 0);
  assert.ok(fs.statSync(path.join(pagesRoot, "page-101.webp")).size > 0);
  assert.match(reader, /data-page-count="101"/);
  assert.doesNotMatch(reader, /\.pdf|download=/i);
});

test("the flipbook supports spreads, mobile pages, chapters, keyboard and touch navigation", () => {
  assert.match(readerScript, /mobileQuery = window\.matchMedia/);
  assert.match(readerScript, /return left === 1 \? \[1\] : \[left, left \+ 1\]/);
  assert.match(readerScript, /ArrowRight/);
  assert.match(readerScript, /touchstart/);
  assert.match(readerScript, /requestFullscreen/);
  assert.match(readerScript, /preloadAround/);
  assert.match(readerScript, /animatePageTurn/);
  assert.match(readerScript, /cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
});

test("the home offers a second book for cultivating sales with Qori spirit", () => {
  assert.match(home, /id="cultivar-ventas"/);
  assert.match(home, /href="\/cultivar-ventas\/"/);
  assert.match(home, /Una venta no se persigue\. Se cultiva\./);
  assert.match(cultivationReader, /data-cultivation-book/);
  assert.doesNotMatch(cultivationReader, /\.md|\.pdf|download=/i);
});

test("the complete GOS cultivation methodology powers a fluid responsive flipbook", () => {
  assert.match(cultivationContent, /Capítulo 39/);
  assert.match(cultivationContent, /Una venta no se persigue: se cultiva\./);
  assert.match(cultivationContent, /Qori — Tu fábrica de ingresos/);
  assert.match(cultivationScript, /function buildPages/);
  assert.match(cultivationScript, /animatePageTurn/);
  assert.match(cultivationScript, /touchstart/);
  assert.match(cultivationScript, /mobileQuery/);
});
