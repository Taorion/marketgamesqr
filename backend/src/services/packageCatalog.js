const BASE_TICKET_PRICE_COP = 1500;

const rawPackageOffers = [
  {
    code: "QR50",
    public_code: "T50",
    package_size: 50,
    price_cop: 75000,
    prepaid_allowed: true,
    subscriber_allowed: true,
    title: "Ticket x50",
    description: "Entrada prepago para validar beneficios y ver los ultimos 50 leads.",
    mode_label: "Prepago",
    lead_access: "Visualizacion de los ultimos 50 leads, sin exportacion.",
    expiration_label: "Con vencimiento operativo.",
  },
  {
    code: "QR200",
    public_code: "T200",
    package_size: 200,
    price_cop: 291000,
    prepaid_allowed: true,
    subscriber_allowed: true,
    title: "Ticket x200",
    description: "Prepago ampliado con mejor valor por ticket y lista de los ultimos 50 leads.",
    mode_label: "Prepago",
    lead_access: "Visualizacion de los ultimos 50 leads, sin exportacion.",
    expiration_label: "Con vencimiento operativo.",
  },
  {
    code: "QR600",
    public_code: "T600",
    package_size: 600,
    price_cop: 829350,
    prepaid_allowed: false,
    subscriber_allowed: true,
    title: "Ticket x600",
    description: "Saldo inicial para empresas con portal activo, campanas y acceso a todos los leads.",
    mode_label: "Pospago",
    lead_access: "Lista completa de leads capturados.",
    expiration_label: "No vence con la mensualidad del portal.",
  },
  {
    code: "QR2000",
    public_code: "T2000",
    package_size: 2000,
    price_cop: 2515695,
    prepaid_allowed: false,
    subscriber_allowed: true,
    title: "Ticket x2.000",
    description: "Saldo premium para activaciones recurrentes, referidos y medicion RMS.",
    mode_label: "Pospago",
    lead_access: "Lista completa de leads capturados.",
    expiration_label: "No vence con la mensualidad del portal.",
  },
  {
    code: "QR6000",
    public_code: "T6000",
    package_size: 6000,
    price_cop: 7169731,
    prepaid_allowed: false,
    subscriber_allowed: true,
    title: "Ticket x6.000",
    description: "Saldo de alto alcance para operaciones con multiples activaciones.",
    mode_label: "Pospago",
    lead_access: "Lista completa de leads capturados.",
    expiration_label: "No vence con la mensualidad del portal.",
  },
];

function savingsPercent(unitPriceCop) {
  return Math.max(0, Math.round((1 - Number(unitPriceCop || 0) / BASE_TICKET_PRICE_COP) * 100));
}

const QR_PACKAGE_OFFERS = rawPackageOffers.map((offer) => ({
  ...offer,
  display_code: offer.public_code,
  unit_price_cop: Math.round(Number(offer.price_cop || 0) / Number(offer.package_size || 1)),
  display_currency: "COP",
  payment_currency: "COP",
  savings_percent: savingsPercent(Number(offer.price_cop || 0) / Number(offer.package_size || 1)),
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
  BASE_TICKET_PRICE_COP,
  QR_PACKAGE_OFFERS,
  findPackageOffer,
  prepaidPackageOffers,
  subscriberPackageOffers,
};
