const BASE_TICKET_PRICE_COP = 1500;

const rawPackageOffers = [
  {
    code: "QR50",
    public_code: "T50",
    package_size: 50,
    unit_price_cop: 1500,
    prepaid_allowed: true,
    subscriber_allowed: true,
    base_access_allowed: false,
    title: "Ticket x50",
    description: "Paquete de entrada para probar activaciones, QR y medicion con saldo operativo.",
    mode_label: "Tickets operativos",
    lead_access: "Saldo operativo para generar QR; no activa Portal Base por si solo.",
    expiration_label: "Saldo operativo: no vence con mensualidad.",
  },
  {
    code: "QR200",
    public_code: "T200",
    package_size: 200,
    unit_price_cop: 1425,
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
    code: "QR600",
    public_code: "T600",
    package_size: 600,
    unit_price_cop: 1350,
    prepaid_allowed: false,
    subscriber_allowed: true,
    base_access_allowed: true,
    title: "Ticket x600",
    description: "Mas capacidad operativa para campanas, QR preventa/postventa, redenciones y Sales Tracker.",
    mode_label: "Tickets operativos",
    lead_access: "Portal Base activo y saldo ampliado para operar mas acciones.",
    expiration_label: "Saldo operativo: no vence con mensualidad.",
  },
  {
    code: "QR2000",
    public_code: "T2000",
    package_size: 2000,
    unit_price_cop: 1275,
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
    code: "QR6000",
    public_code: "T6000",
    package_size: 6000,
    unit_price_cop: 1200,
    prepaid_allowed: false,
    subscriber_allowed: true,
    base_access_allowed: true,
    title: "Ticket x6.000",
    description: "Volumen empresarial con el mejor valor unitario para operaciones RMS de alto alcance.",
    mode_label: "Tickets operativos",
    lead_access: "Portal Base activo y volumen para equipos comerciales.",
    expiration_label: "Saldo operativo: no vence con mensualidad.",
  },
];

function savingsPercent(unitPriceCop) {
  return Math.max(0, Math.round((1 - Number(unitPriceCop || 0) / BASE_TICKET_PRICE_COP) * 100));
}

const QR_PACKAGE_OFFERS = rawPackageOffers.map((offer) => ({
  ...offer,
  display_code: offer.public_code,
  price_cop: Number(offer.package_size || 0) * Number(offer.unit_price_cop || BASE_TICKET_PRICE_COP),
  display_currency: "COP",
  payment_currency: "COP",
  savings_percent: savingsPercent(Number(offer.unit_price_cop || BASE_TICKET_PRICE_COP)),
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
