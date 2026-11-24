const { app } = require("./app");
const { env } = require("./config/env");
const { pool } = require("./config/db");
const { startDeactivatedUserCleanup } = require("./services/deactivatedUserCleanupService");
const { startAgendaPushWorker } = require("./services/agendaPushService");
const stopAgendaPushWorker = startAgendaPushWorker();
const stopCustomerBenefits = require('./services/customerBenefitNotificationService').start();
const stopCustomerPayments = require('./services/customerPaymentPushService').start();
const stopGiftDelivery = require('./services/giftDeliveryService').start();
const stopSubscriptionRenewals = require('./services/subscriptionAutoRenewalService').start();
const stopSellerCommissions = require('./services/sellerCommissionWorker').startSellerCommissionWorker();

const stopDemonstrations = require('./services/demonstrationWorker').start();

const server = app.listen(env.port, () => {
  console.log(`Sales Machine Portal RMS running on http://localhost:${env.port}`);
  startDeactivatedUserCleanup();
});
const stopSummitLive = require('./services/summitLiveService').attach(server);

const stopPlay = require('./play/realtime').attach(server);
async function shutdown() {
  await stopDemonstrations();
  stopSummitLive();
  await stopSubscriptionRenewals();
  await stopPlay();
  await stopSellerCommissions();
  await stopAgendaPushWorker();
  await stopCustomerPayments();
  await stopCustomerBenefits();
  await stopGiftDelivery();
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
