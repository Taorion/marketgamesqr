const { env } = require("../config/env");

const USD_TO_COP_RATE = Number(env.usdToCopRate || 4000);
const BASE_TICKET_PRICE_USD = 0.25;

function roundCop(value) {
  return Math.round(Number(value || 0) / 1000) * 1000;
}

function usdToCop(value) {
  return roundCop(Number(value || 0) * USD_TO_COP_RATE);
}

const rawPackageOffers = [
  {
    code: "QR50",
    package_size: 50,
    unit_price_usd: 0.25,
    prepaid_allowed: true,
    subscriber_allowed: true,
    title: "Paquete x50",
    description: "Entrada minima para probar QR Validator.",
  },
  {
    code: "QR200",
    package_size: 200,
    unit_price_usd: 0.2125,
    prepaid_allowed: true,
    subscriber_allowed: true,
    title: "Paquete x200",
    description: "Mayor alcance prepago antes de pasar al portal.",
  },
  {
    code: "QR500",
    package_size: 500,
    unit_price_usd: 0.1875,
    prepaid_allowed: false,
    subscriber_allowed: true,
    title: "Portal x500",
    description: "Primer paquete superior exclusivo para suscriptores.",
  },
  {
    code: "QR1000",
    package_size: 1000,
    unit_price_usd: 0.1625,
    prepaid_allowed: false,
    subscriber_allowed: true,
    title: "Portal x1000",
    description: "Volumen comercial para campanas con seguimiento premium.",
  },
  {
    code: "QR2000",
    package_size: 2000,
    unit_price_usd: 0.14375,
    prepaid_allowed: false,
    subscriber_allowed: true,
    title: "Portal x2000",
    description: "Escala para campanas recurrentes y referidos.",
  },
  {
    code: "QR4000",
    package_size: 4000,
    unit_price_usd: 0.13125,
    prepaid_allowed: false,
    subscriber_allowed: true,
    title: "Portal x4000",
    description: "Alto volumen para activaciones recurrentes y medicion avanzada.",
  },
  {
    code: "QR8000",
    package_size: 8000,
    unit_price_usd: 0.125,
    prepaid_allowed: false,
    subscriber_allowed: true,
    title: "Portal x8000",
    description: "Capacidad premium para operaciones de alto alcance.",
  },
];

function savingsPercent(unitPrice) {
  return Math.round((1 - Number(unitPrice || 0) / BASE_TICKET_PRICE_USD) * 100);
}

const QR_PACKAGE_OFFERS = rawPackageOffers.map((offer) => ({
  ...offer,
  price_usd: Number((offer.package_size * offer.unit_price_usd).toFixed(2)),
  price_cop: usdToCop(offer.package_size * offer.unit_price_usd),
  unit_price_cop: Math.round(usdToCop(offer.package_size * offer.unit_price_usd) / offer.package_size),
  usd_to_cop_rate: USD_TO_COP_RATE,
  display_currency: "USD",
  payment_currency: "COP",
  savings_percent: savingsPercent(offer.unit_price_usd),
  payment_url: `/paquetes/?mode=${offer.prepaid_allowed ? "prepaid" : "portal"}&package=${offer.code}`,
}));

function findPackageOffer(code) {
  return QR_PACKAGE_OFFERS.find((offer) => offer.code === String(code || "").trim().toUpperCase());
}

function prepaidPackageOffers() {
  return QR_PACKAGE_OFFERS.filter((offer) => offer.prepaid_allowed);
}

function subscriberPackageOffers() {
  return QR_PACKAGE_OFFERS.filter((offer) => offer.subscriber_allowed);
}

module.exports = {
  BASE_TICKET_PRICE_USD,
  USD_TO_COP_RATE,
  QR_PACKAGE_OFFERS,
  findPackageOffer,
  prepaidPackageOffers,
  subscriberPackageOffers,
};
