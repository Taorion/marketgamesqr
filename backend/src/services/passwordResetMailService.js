const { env } = require("../config/env");

function serviceUnavailable(message) {
  const error = new Error(message);
  error.status = 503;
  error.publicMessage = "No pudimos enviar el enlace de recuperación. Inténtalo nuevamente en unos minutos.";
  return error;
}

function deliveryError(message) {
  const error = new Error(message);
  error.status = 502;
  error.publicMessage = "No pudimos enviar el enlace de recuperación. Inténtalo nuevamente en unos minutos.";
  return error;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function passwordResetMessage(resetUrl) {
  const safeUrl = escapeHtml(resetUrl);
  return {
    subject: "Recupera tu acceso a Qori",
    text: [
      "Recibimos una solicitud para restablecer tu contraseña de Qori.",
      "",
      "Abre este enlace para elegir una nueva contraseña:",
      resetUrl,
      "",
      "El enlace vence en 30 minutos y solo puede usarse una vez.",
      "Si no solicitaste este cambio, puedes ignorar este correo.",
    ].join("\n"),
    html: `<main style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Inter,Arial,sans-serif;color:#18212f;line-height:1.55">
      <p style="margin:0 0 12px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#7b627f">Qori · Acceso seguro</p>
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2">Recupera tu acceso</h1>
      <p>Recibimos una solicitud para restablecer tu contraseña de Qori.</p>
      <p style="margin:26px 0"><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#33243b;color:#ffffff;text-decoration:none;font-weight:700">Crear nueva contraseña</a></p>
      <p style="font-size:14px;color:#5d6470">El enlace vence en 30 minutos y solo puede usarse una vez. Si no solicitaste este cambio, puedes ignorar este correo.</p>
      <p style="font-size:12px;color:#7a7f88;word-break:break-all">Si el botón no abre, copia este enlace: ${safeUrl}</p>
    </main>`,
  };
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!env.resendApiKey) {
    throw serviceUnavailable("La recuperación de contraseña requiere configurar RESEND_API_KEY y un remitente verificado.");
  }
  const message = passwordResetMessage(resetUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.marketingMailFrom,
      to: [to],
      subject: message.subject,
      text: message.text,
      html: message.html,
      tags: [{ name: "module", value: "password-reset" }],
    }),
  });
  if (!response.ok) {
    throw deliveryError(`Resend rechazó el correo de recuperación: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

module.exports = { sendPasswordResetEmail };
