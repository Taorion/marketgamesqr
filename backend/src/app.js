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
const interactiveActivationRoutes = require("./routes/interactiveActivationRoutes");
const leadCaptureRoutes = require("./routes/leadCaptureRoutes");
const digitalAssetRoutes = require("./routes/digitalAssetRoutes");
const affiliateRoutes = require("./routes/affiliateRoutes");
const salesRoutes = require("./routes/salesRoutes");
const publicGameRoutes = require("./routes/publicGameRoutes");
const publicQrRoutes = require("./routes/publicQrRoutes");
const publicAffiliateRoutes = require("./routes/publicAffiliateRoutes");
const contactRoutes = require("./routes/contactRoutes");
const packageSalesRoutes = require("./routes/packageSalesRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const rewardPassRoutes = require("./routes/rewardPassRoutes");
const {
  publicGet: publicRewardPassGet,
  publicClaim: publicRewardPassClaim,
  publicDownloadPdf: publicRewardPassDownloadPdf,
} = require("./controllers/rewardPassController");
const { env } = require("./config/env");
const { errorHandler } = require("./middleware/errorHandler");
const packageJson = require("../../package.json");

const app = express();
const projectRoot = path.join(__dirname, "../..");
const marketGamesWebRoot = path.join(projectRoot, "Pagina web MG");
const utf8StaticExtensions = new Set([".css", ".html", ".js", ".json", ".svg", ".txt"]);

function setUtf8StaticHeaders(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (utf8StaticExtensions.has(ext)) {
    const currentType = res.getHeader("Content-Type");
    if (currentType && !String(currentType).toLowerCase().includes("charset=")) {
      res.setHeader("Content-Type", `${currentType}; charset=utf-8`);
    }
  }
}

function addOriginVariant(origins, value) {
  if (!value) return;
  let url;
  try {
    url = new URL(value);
  } catch {
    return;
  }
  origins.add(url.origin);
  const host = url.hostname;
  const variantHost = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  url.hostname = variantHost;
  origins.add(url.origin);
}

function allowedCorsOrigins() {
  const origins = new Set(env.corsOrigins);
  addOriginVariant(origins, env.publicAppUrl);
  addOriginVariant(origins, env.publicValidatorUrl);
  addOriginVariant(origins, "https://marketgamesqr.com");
  addOriginVariant(origins, "https://market-games-portal.onrender.com");
  return origins;
}

function corsOrigin(origin, callback) {
  if (!origin) {
    return callback(null, true);
  }
  if (allowedCorsOrigins().has(origin)) {
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
      "script-src": [
        "'self'",
        "'unsafe-eval'",
        "'sha256-IHp/uS8mBTw7c/l/jF15NszNHWr0ClZaGSbEC0tBSUk='",
        "'sha256-Oc+70N0mYEuTXE/mDfwrSpVsc/qCHDZCdbVTtgrcBDU='",
      ],
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
      "form-action": ["'self'"],
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

app.get("/api/version", (_req, res) => {
  res.json({
    ok: true,
    name: packageJson.name,
    version: packageJson.version,
    node_env: env.nodeEnv,
    session_version: env.appSessionVersion,
    render_git_commit: process.env.RENDER_GIT_COMMIT || null,
  });
});

app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
});

app.use("/api/public", contactRoutes);

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
app.use("/api/business/interactive-activations", interactiveActivationRoutes);
app.use("/api/business/lead-capture-activations", leadCaptureRoutes);
app.use("/api/business/digital-assets", digitalAssetRoutes);
app.use("/api/business/reward-passes", rewardPassRoutes);
app.use("/api/portal", affiliateRoutes);
app.use("/api", salesRoutes);
app.use("/api/public", publicGameRoutes);
app.use("/api/public", publicQrRoutes);
app.use("/api/public", publicAffiliateRoutes);
app.use("/api/public", packageSalesRoutes);
app.get("/api/public/reward-passes/:publicCode/pdf", publicRewardPassDownloadPdf);
app.get("/api/public/reward-passes/:publicCode", publicRewardPassGet);
app.post("/api/public/reward-passes/:publicCode/claim", publicRewardPassClaim);
app.use("/api/payments", paymentRoutes);

app.use(express.static(marketGamesWebRoot, { setHeaders: setUtf8StaticHeaders }));
function redirectLegacyValidator(req, res) {
  const target = new URL("/empresa/", `${req.protocol}://${req.get("host")}`);
  if (req.query.token) {
    target.searchParams.set("token", req.query.token);
  }
  res.redirect(302, `${target.pathname}${target.search}`);
}

app.get(["/validador", "/validador/", "/qr-validador", "/qr-validador/"], redirectLegacyValidator);
app.use("/demo", express.static(path.join(__dirname, "../..", "demo")));
app.use("/empresa", express.static(path.join(__dirname, "../..", "empresa")));
app.use("/admin", express.static(path.join(__dirname, "../..", "admin")));
app.use("/paquetes", express.static(path.join(__dirname, "../..", "paquetes")));
app.use("/terminos", express.static(path.join(__dirname, "../..", "terminos")));
app.use("/privacidad", express.static(path.join(__dirname, "../..", "privacidad")));
app.use("/campana-productos", express.static(path.join(__dirname, "../..", "campana-productos")));
app.use("/claim", express.static(path.join(__dirname, "../..", "claim")));
app.use("/carnet-afiliado", express.static(path.join(__dirname, "../..", "carnet-afiliado")));
app.use("/rp", express.static(path.join(__dirname, "../..", "reward-pass-public")));
app.use("/trivia", express.static(path.join(__dirname, "../..", "trivia")));
app.use("/activacion", express.static(path.join(__dirname, "../..", "activacion")));
app.use("/captura", express.static(path.join(__dirname, "../..", "captura")));
app.use("/vendor/jsqr", express.static(path.join(__dirname, "../../node_modules/jsqr/dist")));
app.get("/claim/:token", (_req, res) => {
  res.sendFile(path.join(__dirname, "../..", "claim", "index.html"));
});
app.get("/carnet-afiliado/:token", (_req, res) => {
  res.sendFile(path.join(__dirname, "../..", "carnet-afiliado", "index.html"));
});
app.get("/rp/:publicCode", (_req, res) => {
  res.sendFile(path.join(__dirname, "../..", "reward-pass-public", "index.html"));
});
app.get("/trivia/:slug", (_req, res) => {
  res.sendFile(path.join(__dirname, "../..", "trivia", "index.html"));
});
app.get("/activacion/:slug", (_req, res) => {
  res.sendFile(path.join(__dirname, "../..", "activacion", "index.html"));
});
app.get("/captura/:token", (_req, res) => {
  res.sendFile(path.join(__dirname, "../..", "captura", "index.html"));
});
app.get("/", (_req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.sendFile(path.join(marketGamesWebRoot, "index.html"));
});

app.use(errorHandler);

module.exports = { app };
