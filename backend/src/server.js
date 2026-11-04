const { app } = require("./app");
const { env } = require("./config/env");
const { pool } = require("./config/db");
const { startDeactivatedUserCleanup } = require("./services/deactivatedUserCleanupService");
const { startAgendaPushWorker } = require("./services/agendaPushService");
const stopAgendaPushWorker = startAgendaPushWorker();
const stopCustomerPayments = require('./services/customerPaymentPushService').start();

const server = app.listen(env.port, () => {
  console.log(`Sales Machine Portal RMS running on http://localhost:${env.port}`);
  startDeactivatedUserCleanup();
});

async function shutdown() {
  await stopAgendaPushWorker();
  await stopCustomerPayments();
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
