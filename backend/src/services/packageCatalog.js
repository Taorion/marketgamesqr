const QR_PACKAGE_OFFERS = [
  {
    code: "QR100",
    package_size: 100,
    title: "Paquete x100",
    price_cop: 119000,
    payment_url: "https://mpago.li/1pqNCgU",
  },
  {
    code: "QR300",
    package_size: 300,
    title: "Paquete x300",
    price_cop: 369000,
    payment_url: "https://mpago.li/1GycaYR",
  },
  {
    code: "QR500",
    package_size: 500,
    title: "Paquete x500",
    price_cop: 615400,
    payment_url: "https://mpago.li/1LDn8a5",
  },
  {
    code: "QR800",
    package_size: 800,
    title: "Paquete x800",
    price_cop: 984200,
    payment_url: "https://mpago.li/16GjdmY",
  },
  {
    code: "QR1000",
    package_size: 1000,
    title: "Paquete x1000",
    price_cop: 1230000,
    payment_url: "https://mpago.li/1adnBeQ",
  },
  {
    code: "QR1500",
    package_size: 1500,
    title: "Paquete x1500",
    price_cop: 1400000,
    payment_url: "https://mpago.li/1PGfSA7",
  },
  {
    code: "QR2000",
    package_size: 2000,
    title: "Paquete x2000",
    price_cop: 1800000,
    payment_url: "https://mpago.li/2XHRnGa",
  },
  {
    code: "QR5000",
    package_size: 5000,
    title: "Paquete x5000",
    price_cop: 3073900,
    payment_url: "https://mpago.li/1bGseQp",
  },
  {
    code: "QRMAX",
    package_size: 10000,
    title: "Paquete x10000",
    price_cop: 4890000,
    payment_url: "https://mpago.li/2zPQE3G",
  },
];

function findPackageOffer(code) {
  return QR_PACKAGE_OFFERS.find((offer) => offer.code === code);
}

module.exports = { QR_PACKAGE_OFFERS, findPackageOffer };
