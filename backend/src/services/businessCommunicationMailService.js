const { env } = require("../config/env");

function serviceUnavailable(message) {
  const error = new Error(message);
  error.status = 503;
  error.publicMessage = message;
  return error;
}

function deliveryError(message, publicMessage = "No se pudo enviar este correo. Revisa la configuración o inténtalo de nuevo.") {
  const error = new Error(message);
  error.status = 502;
  error.publicMessage = publicMessage;
  return error;
}

function resendDeliveryMessage(status, detail = "") {
  const normalized = String(detail || "").toLowerCase();
  if (/verify|verified|domain|from address|sender/.test(normalized)) {
    return "El remitente o su dominio aún no está verificado en Resend. Verifica el dominio y usa una dirección de ese dominio en Cuenta.";
  }
  if (status === 401 || status === 403 || /api key|authorization|unauthorized|forbidden/.test(normalized)) {
    return "Resend rechazó la clave de envío. Revísala en Cuenta > Correo masivo y vuelve a conectar Resend.";
  }
  if (status === 429) {
    return "Resend aplicó un límite temporal de envío. Espera unos minutos y vuelve a intentar.";
  }
  return "Resend rechazó el correo. Revisa la verificación del dominio remitente y la configuración de envío.";
}

async function sendBusinessCommunicationEmail({ apiKey, from, to, subject, text, html, replyTo, attachments = [], headers = {} }) {
  const resendApiKey = String(apiKey || env.resendApiKey || "").trim();
  if (!resendApiKey) {
    throw serviceUnavailable("Conecta tu cuenta de Resend en Cuenta > Correo masivo antes de enviar.");
  }

  if (!from) {
    throw serviceUnavailable("Configura un remitente propio y verificado para esta empresa antes de enviar comunicaciones por email.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "Qori-RMS/1.0",
    },
    body: JSON.stringify({
      from,
      to: [to],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      text,
      html,
      ...(Object.keys(headers).length ? { headers } : {}),
      ...(attachments.length ? { attachments } : {}),
      tags: [{ name: "module", value: "business-communications" }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw deliveryError(`Resend rechazó el correo: ${response.status} ${detail}`, resendDeliveryMessage(response.status, detail));
  }

  return response.json();
}

module.exports = { sendBusinessCommunicationEmail };
