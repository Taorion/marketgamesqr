const BASE_TICKET_PRICE_COP = 1500;

const rawPackageOffers = [
  {
    code: "QR200",
    public_code: "T200",
    package_size: 200,
    price_cop: 291000,
    prepaid_allowed: false,
    subscriber_allowed: true,
    base_access_allowed: true,
    title: "Ticket x200",
    description: "Compra minima para activar Portal Base sin mensualidad y empezar a generar QR, leads y ventas medibles.",
    mode_label: "Portal Base",
    lead_access: "Dashboard base, leads visibles por 30 dias y 10 exportaciones al mes.",
    expiration_label: "Saldo operativo: no vence con mensualidad.",
  },
  {
    code: "QR500",
    public_code: "T500",
    package_size: 500,
    price_cop: 697500,
    prepaid_allowed: false,
    subscriber_allowed: true,
    base_access_allowed: true,
    title: "Ticket x500",
    description: "Mas capacidad operativa para campanas, QR preventa/postventa, redenciones y Sales Tracker.",
    mode_label: "Tickets operativos",
    lead_access: "Portal Base activo y saldo ampliado para operar mas acciones.",
    expiration_label: "Saldo operativo: no vence con mensualidad.",
  },
  {
    code: "QR1000",
    public_code: "T1000",
    package_size: 1000,
    price_cop: 1350000,
    prepaid_allowed: false,
    subscriber_allowed: true,
    base_access_allowed: true,
    title: "Ticket x1.000",
    description: "Volumen recomendado para negocios con activaciones recurrentes y lectura RMS constante.",
    mode_label: "Tickets operativos",
    lead_access: "Portal Base activo y mayor capacidad de medicion.",
    expiration_label: "Saldo operativo: no vence con mensualidad.",
  },
  {
    code: "QR2000",
    public_code: "T2000",
    package_size: 2000,
    price_cop: 2515695,
    prepaid_allowed: false,
    subscriber_allowed: true,
    base_access_allowed: true,
    title: "Ticket x2.000",
    description: "Saldo premium para activaciones recurrentes, referidos y medicion RMS.",
    mode_label: "Tickets operativos",
    lead_access: "Portal Base activo y capacidad para operar mas campanas.",
    expiration_label: "Saldo operativo: no vence con mensualidad.",
  },
  {
    code: "QR5000",
    public_code: "T5000",
    package_size: 5000,
    price_cop: 6100000,
    prepaid_allowed: false,
    subscriber_allowed: true,
    base_access_allowed: true,
    title: "Ticket x5.000",
    description: "Saldo de alto alcance para operaciones con multiples activaciones.",
    mode_label: "Tickets operativos",
    lead_access: "Portal Base activo y volumen para equipos comerciales.",
    expiration_label: "Saldo operativo: no vence con mensualidad.",
  },
  {
    code: "QR10000",
    public_code: "T10000",
    package_size: 10000,
    price_cop: 11500000,
    prepaid_allowed: false,
    subscriber_allowed: true,
    base_access_allowed: true,
    title: "Ticket x10.000",
    description: "Volumen empresarial para operaciones RMS de alto alcance antes de pasar a Global.",
    mode_label: "Tickets operativos",
    lead_access: "Portal Base activo y saldo robusto para alto uso.",
    expiration_label: "Saldo operativo: no vence con mensualidad.",
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
  payment_url: `/paquetes/?package=${offer.code}`,
}));

function findPackageOffer(code) {
  return QR_PACKAGE_OFFERS.find((offer) => offer.code === String(code || "").trim().toUpperCase());
}

function baseAccessPackageOffers() {
  return QR_PACKAGE_OFFERS.filter((offer) => offer.base_access_allowed);
}

function subscriberPackageOffers() {
  return QR_PACKAGE_OFFERS.filter((offer) => offer.subscriber_allowed);
}

module.exports = {
  BASE_TICKET_PRICE_COP,
  QR_PACKAGE_OFFERS,
  baseAccessPackageOffers,
  findPackageOffer,
  subscriberPackageOffers,
};
