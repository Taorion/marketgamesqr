const { forbidden } = require("../utils/http");
const { processWhatsAppWebhook, verifyWhatsAppWebhookSignature, whatsAppWebhookVerifyToken } = require("../services/businessCommunicationWhatsAppWebhookService");

function verify(req, res, next) {
  try {
    const mode = String(req.query["hub.mode"] || "");
    const token = String(req.query["hub.verify_token"] || "");
    const challenge = String(req.query["hub.challenge"] || "");
    if (mode !== "subscribe" || !challenge || token !== whatsAppWebhookVerifyToken()) throw forbidden("Token de verificación de WhatsApp inválido.");
    return res.status(200).type("text/plain").send(challenge);
  } catch (error) { return next(error); }
}

async function receive(req, res, next) {
  try {
    verifyWhatsAppWebhookSignature(req);
    await processWhatsAppWebhook(req.body || {});
    return res.sendStatus(200);
  } catch (error) { return next(error); }
}

module.exports = { receive, verify };
