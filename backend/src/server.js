const { app } = require("./app");
const { env } = require("./config/env");
const { pool } = require("./config/db");
const { startActivationFollowupWorker } = require("./services/rmsMachineService");

const server = app.listen(env.port, () => {
  console.log(`Qori Portal RMS running on http://localhost:${env.port}`);
});
const stopActivationFollowupWorker = env.databaseConfigured ? startActivationFollowupWorker() : () => {};

async function shutdown() {
  stopActivationFollowupWorker();
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
