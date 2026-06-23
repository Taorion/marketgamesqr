const dotenv = require("dotenv");

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const productionPublicAppUrl = process.env.RENDER_EXTERNAL_URL || "https://market-games-portal.onrender.com";
const defaultPublicAppUrl = isProduction ? productionPublicAppUrl : "http://localhost:3000";
const defaultPublicValidatorUrl = `${defaultPublicAppUrl.replace(/\/$/, "")}/empresa/`;

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction,
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  databaseConfigured: Boolean(process.env.DATABASE_URL) && !/PROJECT_REF|YOUR_PASSWORD/.test(process.env.DATABASE_URL),
  dbSsl: process.env.DB_SSL !== "false",
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  appSessionVersion: process.env.APP_SESSION_VERSION || process.env.RENDER_GIT_COMMIT || (isProduction ? "production" : "development"),
  publicValidatorUrl: process.env.PUBLIC_VALIDATOR_URL || defaultPublicValidatorUrl,
  publicAppUrl: process.env.PUBLIC_APP_URL || defaultPublicAppUrl,
  corsOrigins: splitList(process.env.CORS_ORIGINS || process.env.PUBLIC_APP_URL || defaultPublicAppUrl),
  enableDemoTools: process.env.ENABLE_DEMO_TOOLS === "true" || (!isProduction && process.env.ENABLE_DEMO_TOOLS !== "false"),
  mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
  mercadoPagoWebhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || "",
  mercadoPagoWebhookUrl: process.env.MERCADO_PAGO_WEBHOOK_URL || "",
  motoBusinessId: process.env.MOTO_BUSINESS_ID || null,
  motoGameId: process.env.MOTO_GAME_ID || null,
  motoRewardId: process.env.MOTO_REWARD_ID || null,
  motoCampaignId: process.env.MOTO_CAMPAIGN_ID || null,
  productCampaignId: process.env.PRODUCT_CAMPAIGN_ID || null,
};

if (!env.databaseUrl || /PROJECT_REF|YOUR_PASSWORD/.test(env.databaseUrl)) {
  const message = env.databaseUrl
    ? "DATABASE_URL still contains placeholder values. Configure a real PostgreSQL/Supabase URL."
    : "DATABASE_URL is not configured. Static pages can run, but API routes that need the database will return 503.";
  console.warn(message);
}

if (env.jwtSecret === "dev-only-change-me") {
  if (env.isProduction) {
    throw new Error("JWT_SECRET is required in production.");
  }
  console.warn("JWT_SECRET is using the development fallback. Set a strong value in .env.");
}

module.exports = { env };
