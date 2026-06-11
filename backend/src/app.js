const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const qrRoutes = require("./routes/qrRoutes");
const businessRoutes = require("./routes/businessRoutes");
const gameRoutes = require("./routes/gameRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const portalRoutes = require("./routes/portalRoutes");
const adminRoutes = require("./routes/adminRoutes");
const businessPortalRoutes = require("./routes/businessPortalRoutes");
const businessQrRoutes = require("./routes/businessQrRoutes");
const affiliateRoutes = require("./routes/affiliateRoutes");
const salesRoutes = require("./routes/salesRoutes");
const publicGameRoutes = require("./routes/publicGameRoutes");
const publicQrRoutes = require("./routes/publicQrRoutes");
const packageSalesRoutes = require("./routes/packageSalesRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const { env } = require("./config/env");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
const projectRoot = path.join(__dirname, "../..");
const marketGamesWebRoot = path.join(projectRoot, "Pagina web MG");

function corsOrigin(origin, callback) {
  if (!origin) {
    return callback(null, true);
  }
  if (env.corsOrigins.includes(origin)) {
    return callback(null, true);
  }
  const error = new Error("CORS origin not allowed.");
  error.status = 403;
  return callback(error);
}

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "object-src": ["'none'"],
      "script-src": ["'self'", "'unsafe-eval'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
      "img-src": ["'self'", "data:", "blob:", "https:"],
      "media-src": ["'self'", "blob:"],
      "connect-src": ["'self'", ...env.corsOrigins],
      "frame-src": [
        "'self'",
        "https://mgcoffeeshop.netlify.app",
        "https://mgautoparts.netlify.app",
        "https://luxyandpets.com",
        "https://atelierdecoleccion.com",
      ],
      "form-action": ["'self'", "mailto:"],
      "worker-src": ["'self'", "blob:"],
    },
  },
}));
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database_configured: env.databaseConfigured });
});

app.use((req, res, next) => {
  if (env.databaseConfigured || !req.path.startsWith("/api/")) {
    return next();
  }

  const publicCatalogPaths = new Set([
    "/api/public/packages",
    "/api/public/subscription-plans",
  ]);
  if (req.method === "GET" && publicCatalogPaths.has(req.path)) {
    return next();
  }

  return res.status(503).json({
    error: {
      message: "Base de datos no configurada. Reemplaza DATABASE_URL en .env; el valor actual contiene PROJECT_REF.",
      code: "DATABASE_URL_NOT_CONFIGURED",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/business", businessPortalRoutes);
app.use("/api/business/qr", businessQrRoutes);
app.use("/api/portal", affiliateRoutes);
app.use("/api", salesRoutes);
app.use("/api/public", publicGameRoutes);
app.use("/api/public", publicQrRoutes);
app.use("/api/public", packageSalesRoutes);
app.use("/api/payments", paymentRoutes);

app.use(express.static(marketGamesWebRoot));
app.use("/validador", express.static(path.join(__dirname, "../..", "validador")));
app.use("/qr-validador", express.static(path.join(__dirname, "../..", "validador")));
app.use("/demo", express.static(path.join(__dirname, "../..", "demo")));
app.use("/empresa", express.static(path.join(__dirname, "../..", "empresa")));
app.use("/admin", express.static(path.join(__dirname, "../..", "admin")));
app.use("/paquetes", express.static(path.join(__dirname, "../..", "paquetes")));
app.use("/campana-productos", express.static(path.join(__dirname, "../..", "campana-productos")));
app.use("/claim", express.static(path.join(__dirname, "../..", "claim")));
app.use("/vendor/jsqr", express.static(path.join(__dirname, "../../node_modules/jsqr/dist")));
app.get("/claim/:token", (_req, res) => {
  res.sendFile(path.join(__dirname, "../..", "claim", "index.html"));
});
app.get("/", (_req, res) => {
  res.sendFile(path.join(marketGamesWebRoot, "index.html"));
});

app.use(errorHandler);

module.exports = { app };
