const QRCode = require("qrcode");

async function generateLinkQr(payload) {
  const targetUrl = String(payload.url || "").trim();
  const size = Number(payload.size || 900);
  const qrImageDataUrl = await QRCode.toDataURL(targetUrl, {
    type: "image/png",
    width: size,
    margin: 3,
    errorCorrectionLevel: "H",
    color: {
      dark: "#052A6B",
      light: "#FFFFFFFF",
    },
  });
  return {
    target_url: targetUrl,
    label: String(payload.label || "QR publicitario").trim() || "QR publicitario",
    size,
    qr_image_data_url: qrImageDataUrl,
    consumes_tickets: false,
    creates_benefit: false,
    creates_redemption: false,
  };
}

module.exports = { generateLinkQr };
