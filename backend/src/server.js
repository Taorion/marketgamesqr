const { app } = require("./app");
const { env } = require("./config/env");
const { pool } = require("./config/db");
const { startDeactivatedUserCleanup } = require("./services/deactivatedUserCleanupService");
const { startAgendaPushWorker } = require("./services/agendaPushService");
const stopAgendaPushWorker = startAgendaPushWorker();

const server = app.listen(env.port, () => {
  console.log(`Sales Machine Portal RMS running on http://localhost:${env.port}`);
  startDeactivatedUserCleanup();
});

async function shutdown() {
  await stopAgendaPushWorker();
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
