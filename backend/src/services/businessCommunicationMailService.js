const { env } = require("../config/env");

function serviceUnavailable(message) {
  const error = new Error(message);
  error.status = 503;
  error.publicMessage = message;
  return error;
}

function deliveryError(message) {
  const error = new Error(message);
  error.status = 502;
  error.publicMessage = "No se pudo enviar este correo. Revisa la configuración o inténtalo de nuevo.";
  return error;
}

async function sendBusinessCommunicationEmail({ to, subject, text, html, replyTo }) {
  if (!env.resendApiKey) {
    throw serviceUnavailable("El envío masivo por email requiere configurar RESEND_API_KEY y un remitente verificado.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.marketingMailFrom,
      to: [to],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      text,
      html,
      tags: [{ name: "module", value: "business-communications" }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw deliveryError(`Resend rechazó el correo: ${response.status} ${detail}`);
  }

  return response.json();
}

module.exports = { sendBusinessCommunicationEmail };
