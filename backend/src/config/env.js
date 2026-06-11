const dotenv = require("dotenv");

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const defaultPublicAppUrl = "http://localhost:3000";

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
  publicValidatorUrl: process.env.PUBLIC_VALIDATOR_URL || "http://localhost:3000/validador",
  publicAppUrl: process.env.PUBLIC_APP_URL || defaultPublicAppUrl,
  corsOrigins: splitList(process.env.CORS_ORIGINS || process.env.PUBLIC_APP_URL || defaultPublicAppUrl),
  enableDemoTools: process.env.ENABLE_DEMO_TOOLS === "true" || (!isProduction && process.env.ENABLE_DEMO_TOOLS !== "false"),
  mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
  mercadoPagoWebhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || "",
  mercadoPagoWebhookUrl: process.env.MERCADO_PAGO_WEBHOOK_URL || "",
  motoBusinessId: process.env.MOTO_BUSINESS_ID || "d081638a-8667-437d-a882-72bd19545792",
  motoGameId: process.env.MOTO_GAME_ID || "cf48e22f-4107-4369-8446-f03f443ef778",
  motoRewardId: process.env.MOTO_REWARD_ID || "f10ebf47-3cea-46b8-acdf-d18e7088a50c",
  motoCampaignId: process.env.MOTO_CAMPAIGN_ID || null,
  productCampaignId: process.env.PRODUCT_CAMPAIGN_ID || null,
};

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

if (/PROJECT_REF|YOUR_PASSWORD/.test(env.databaseUrl)) {
  const message = "DATABASE_URL still contains placeholder values. Configure a real PostgreSQL/Supabase URL.";
  if (env.isProduction) {
    throw new Error(message);
  }
  console.warn(message);
}

if (env.jwtSecret === "dev-only-change-me") {
  if (env.isProduction) {
    throw new Error("JWT_SECRET is required in production.");
  }
  console.warn("JWT_SECRET is using the development fallback. Set a strong value in .env.");
}

if (env.isProduction && !env.mercadoPagoWebhookSecret) {
  throw new Error("MERCADO_PAGO_WEBHOOK_SECRET is required in production.");
}

module.exports = { env };
