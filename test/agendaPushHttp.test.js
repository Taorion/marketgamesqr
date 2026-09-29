const { test } = require("node:test");
const assert = require("node:assert/strict");
const { env } = require("../backend/src/config/env");
// Allows exercising auth rejection without a real DB; missing/invalid bearer tokens
// are rejected before any query. No workers start when importing app.
env.databaseConfigured = true;
const { app } = require("../backend/src/app");

test("HTTP assets, cache policy and unauthenticated push routes", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await t.test("service worker is JavaScript and never long-term cached", async () => {
      const response = await fetch(`${base}/empresa/agenda-sw.js`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /javascript/);
      assert.match(response.headers.get("cache-control"), /no-cache/);
      assert.match(await response.text(), /notificationclick/);
    });
    await t.test("installable manifest has portal scope and accessible icons", async () => {
      const response = await fetch(`${base}/empresa/agenda.webmanifest`);
      assert.equal(response.status, 200);
      const manifest = await response.json();
      assert.equal(manifest.start_url, "/empresa/");
      assert.equal(manifest.scope, "/empresa/");
      assert.equal(manifest.display, "standalone");
      for (const icon of manifest.icons) assert.equal((await fetch(`${base}${icon.src}`)).status, 200);
    });
    await t.test("all push endpoints reject requests without a login", async () => {
      for (const [method, route] of [["GET", "config"], ["POST", "status"], ["POST", "subscription"], ["DELETE", "subscription"], ["POST", "test"]]) {
        const response = await fetch(`${base}/api/business/agenda-push/${route}`, { method });
        assert.equal(response.status, 401, `${method} ${route}`);
      }
    });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
