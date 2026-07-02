const nodemailer = require("nodemailer");
const { env } = require("../config/env");

function serviceUnavailable(message) {
  const error = new Error(message);
  error.status = 503;
  error.publicMessage = "No se pudo enviar la consulta en este momento. Intenta nuevamente o escríbenos por WhatsApp.";
  return error;
}

function deliveryError(message, cause) {
  const error = new Error(message);
  error.status = 502;
  error.publicMessage = "No se pudo enviar la consulta en este momento. Intenta nuevamente o escríbenos por WhatsApp.";
  error.cause = cause;
  return error;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function contactFromAddress() {
  return env.contactMailFrom || env.smtpUser || "MarketGamesQR <no-reply@marketgamesqr.com>";
}

async function sendViaResend({ subject, text, html, replyTo }) {
  if (!env.resendApiKey) {
    throw serviceUnavailable("El envío de correo no está configurado. Define RESEND_API_KEY o credenciales SMTP.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: contactFromAddress(),
      to: [env.contactRecipientEmail],
      reply_to: replyTo,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw deliveryError(`Resend rechazó el correo: ${response.status} ${errorBody}`);
  }
}

async function sendViaSmtp({ subject, text, html, replyTo }) {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    throw serviceUnavailable("El envío de correo no está configurado. Define SMTP_HOST, SMTP_USER y SMTP_PASS.");
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
    tls: {
      rejectUnauthorized: env.smtpRejectUnauthorized,
    },
  });

  try {
    await transporter.sendMail({
      from: contactFromAddress(),
      to: env.contactRecipientEmail,
      replyTo,
      subject,
      text,
      html,
    });
  } catch (error) {
    throw deliveryError(`SMTP no pudo enviar el correo: ${error.message}`, error);
  }
}

function buildContactMessage(body, metadata) {
  const subject = `Nuevo contacto web - ${body.company || body.name || "MarketGamesQR"}`;
  const submittedAt = new Date().toISOString();
  const lines = [
    "Nuevo mensaje desde la home de MarketGamesQR",
    "",
    `Nombre: ${body.name}`,
    `Email: ${body.email}`,
    `Teléfono: ${body.phone}`,
    `Empresa: ${body.company || "No especificada"}`,
    "",
    "Mensaje:",
    body.message,
    "",
    "Contexto técnico:",
    `Fecha: ${submittedAt}`,
    `IP: ${metadata.ip || "No disponible"}`,
    `User-Agent: ${metadata.userAgent || "No disponible"}`,
    `Página: ${body.source_url || "No especificada"}`,
  ];

  const html = `
    <h2>Nuevo mensaje desde la home de MarketGamesQR</h2>
    <p><strong>Nombre:</strong> ${escapeHtml(body.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(body.email)}</p>
    <p><strong>Teléfono:</strong> ${escapeHtml(body.phone)}</p>
    <p><strong>Empresa:</strong> ${escapeHtml(body.company || "No especificada")}</p>
    <p><strong>Mensaje:</strong></p>
    <p>${escapeHtml(body.message).replace(/\r?\n/g, "<br>")}</p>
    <hr>
    <p><strong>Fecha:</strong> ${escapeHtml(submittedAt)}</p>
    <p><strong>IP:</strong> ${escapeHtml(metadata.ip || "No disponible")}</p>
    <p><strong>User-Agent:</strong> ${escapeHtml(metadata.userAgent || "No disponible")}</p>
    <p><strong>Página:</strong> ${escapeHtml(body.source_url || "No especificada")}</p>
  `;

  return {
    subject,
    text: lines.join("\n"),
    html,
    replyTo: `${body.name} <${body.email}>`,
  };
}

async function sendContactEmail(body, metadata = {}) {
  const contactMessage = buildContactMessage(body, metadata);

  if (env.resendApiKey) {
    await sendViaResend(contactMessage);
    return;
  }

  await sendViaSmtp(contactMessage);
}

module.exports = { sendContactEmail };
