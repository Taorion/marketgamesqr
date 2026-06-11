const QR_PACKAGE_OFFERS = [
  {
    code: "QR100",
    package_size: 100,
    title: "Paquete x100",
    price_cop: 39000,
    payment_url: "/paquetes/?mode=prepaid&package=QR100",
  },
  {
    code: "QR300",
    package_size: 300,
    title: "Paquete x300",
    price_cop: 79000,
    payment_url: "/paquetes/?mode=prepaid&package=QR300",
  },
  {
    code: "QR500",
    package_size: 500,
    title: "Paquete x500",
    price_cop: 119000,
    payment_url: "/paquetes/?mode=prepaid&package=QR500",
  },
  {
    code: "QR800",
    package_size: 800,
    title: "Paquete x800",
    price_cop: 169000,
    payment_url: "/paquetes/?mode=prepaid&package=QR800",
  },
  {
    code: "QR1000",
    package_size: 1000,
    title: "Paquete x1000",
    price_cop: 199000,
    payment_url: "/paquetes/?mode=prepaid&package=QR1000",
  },
  {
    code: "QR1500",
    package_size: 1500,
    title: "Paquete x1500",
    price_cop: 279000,
    payment_url: "/paquetes/?mode=prepaid&package=QR1500",
  },
  {
    code: "QR2000",
    package_size: 2000,
    title: "Paquete x2000",
    price_cop: 349000,
    payment_url: "/paquetes/?mode=prepaid&package=QR2000",
  },
  {
    code: "QR5000",
    package_size: 5000,
    title: "Paquete x5000",
    price_cop: 749000,
    payment_url: "/paquetes/?mode=prepaid&package=QR5000",
  },
  {
    code: "QRMAX",
    package_size: 10000,
    title: "Paquete x10000",
    price_cop: 1290000,
    payment_url: "/paquetes/?mode=prepaid&package=QRMAX",
  },
];

function findPackageOffer(code) {
  return QR_PACKAGE_OFFERS.find((offer) => offer.code === code);
}

module.exports = { QR_PACKAGE_OFFERS, findPackageOffer };
