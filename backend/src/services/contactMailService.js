const nodemailer = require("nodemailer");
const dns = require("dns/promises");
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
  // El formulario público de gosqori.com es institucional. No debe heredar
  // el remitente de una empresa ni un valor histórico de MarketGamesQR.
  return "Qori · Tu Fábrica de Ingresos <contacto@gosqori.com>";
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

  const resolvedSmtpHost = await dns.lookup(env.smtpHost, { family: 4 });
  const transporter = nodemailer.createTransport({
    host: resolvedSmtpHost.address,
    port: env.smtpPort,
    secure: env.smtpSecure,
    family: 4,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
    tls: {
      rejectUnauthorized: env.smtpRejectUnauthorized,
      servername: env.smtpHost,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
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
    console.error("Contact SMTP delivery failed", {
      host: env.smtpHost,
      resolved_host: resolvedSmtpHost.address,
      resolved_family: resolvedSmtpHost.family,
      port: env.smtpPort,
      secure: env.smtpSecure,
      user: env.smtpUser,
      from: contactFromAddress(),
      to: env.contactRecipientEmail,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response,
      message: error.message,
    });
    throw deliveryError(`SMTP no pudo enviar el correo: ${error.message}`, error);
  }
}

function buildContactMessage(body, metadata) {
  const subject = `Qori · Nueva conversación — ${body.company || body.name || "Contacto web"}`;
  const submittedAt = new Date().toISOString();
  const lines = [
    "Qori · Tu Fábrica de Ingresos",
    "Nueva conversación desde gosqori.com",
    "",
    `Nombre: ${body.name}`,
    `Email: ${body.email}`,
    `Teléfono: ${body.phone || "No especificado"}`,
    `Documento: ${body.document_type || "Sin tipo"} · ${body.document_id || "No especificado"}`,
    `Empresa: ${body.company || "No especificada"}`,
    "Aceptaciones: Términos y Condiciones: sí · Política de Datos y Privacidad: sí",
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
    <div style="max-width:680px;margin:0 auto;padding:28px;background:#f6faff;color:#0b1e3d;font-family:Arial,sans-serif">
      <div style="padding:22px 24px;border-radius:18px;background:linear-gradient(135deg,#012268,#0341b3);color:#fff">
        <div style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#9deeff">Qori · Tu Fábrica de Ingresos</div>
        <h2 style="margin:0;font-size:25px;line-height:1.2">Nueva conversación desde gosqori.com</h2>
      </div>
      <div style="margin-top:16px;padding:24px;border:1px solid #d9e8f7;border-radius:18px;background:#fff">
        <p><strong>Nombre:</strong> ${escapeHtml(body.name)}</p>
        <p><strong>Correo:</strong> ${escapeHtml(body.email)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(body.phone || "No especificado")}</p>
        <p><strong>Documento:</strong> ${escapeHtml(`${body.document_type || "Sin tipo"} · ${body.document_id || "No especificado"}`)}</p>
        <p><strong>Empresa:</strong> ${escapeHtml(body.company || "No especificada")}</p>
        <p><strong>Aceptaciones:</strong> Términos y Condiciones: sí · Política de Datos y Privacidad: sí</p>
        <div style="margin-top:20px;padding:16px;border-radius:12px;background:#f4f9ff"><strong>Mensaje</strong><p style="margin:8px 0 0;line-height:1.55">${escapeHtml(body.message).replace(/\r?\n/g, "<br>")}</p></div>
      </div>
      <p style="margin:16px 4px 0;color:#54708f;font-size:12px">Recibido ${escapeHtml(submittedAt)} · ${escapeHtml(body.source_url || "gosqori.com")}</p>
    </div>
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
