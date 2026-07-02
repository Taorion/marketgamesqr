const net = require("net");
const tls = require("tls");
const { once } = require("events");
const { env } = require("../config/env");

function serviceUnavailable(message) {
  const error = new Error(message);
  error.status = 503;
  return error;
}

function extractEmail(value) {
  const match = String(value || "").match(/<([^>]+)>/);
  return (match ? match[1] : value || "").trim();
}

function encodeHeader(value) {
  const text = String(value || "");
  return /^[\x20-\x7e]*$/.test(text)
    ? text
    : `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`;
}

function formatMailbox(label, email) {
  const cleanEmail = extractEmail(email);
  return label ? `${encodeHeader(label)} <${cleanEmail}>` : `<${cleanEmail}>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeLineEndings(value) {
  return String(value || "").replace(/\r?\n/g, "\r\n");
}

function createSmtpReader(socket) {
  let buffer = "";
  let pendingLines = [];
  const responses = [];
  const waiters = [];

  function complete(line) {
    return /^\d{3} /.test(line);
  }

  function drain() {
    while (responses.length && waiters.length) {
      waiters.shift().resolve(responses.shift());
    }
  }

  function onData(chunk) {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    lines.forEach((line) => {
      if (!line) return;
      pendingLines.push(line);
      if (complete(line)) {
        responses.push({
          code: Number(line.slice(0, 3)),
          message: pendingLines.join("\n"),
        });
        pendingLines = [];
      }
    });

    drain();
  }

  function onError(error) {
    while (waiters.length) {
      waiters.shift().reject(error);
    }
  }

  socket.setEncoding("utf8");
  socket.on("data", onData);
  socket.on("error", onError);

  function readResponse() {
    if (responses.length) {
      return Promise.resolve(responses.shift());
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout esperando respuesta SMTP."));
      }, 20_000);

      waiters.push({
        resolve: (response) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
    });
  }

  async function command(value, acceptedCodes) {
    if (value) {
      socket.write(`${value}\r\n`);
    }

    const response = await readResponse();
    if (!acceptedCodes.includes(response.code)) {
      throw new Error(`SMTP rechazó "${value || "greeting"}": ${response.message}`);
    }
    return response;
  }

  return {
    command,
    detach() {
      socket.off("data", onData);
      socket.off("error", onError);
    },
  };
}

async function openSmtpSocket() {
  const options = {
    host: env.smtpHost,
    port: env.smtpPort,
    servername: env.smtpHost,
    rejectUnauthorized: env.smtpRejectUnauthorized,
  };
  const socket = env.smtpSecure ? tls.connect(options) : net.connect(options);
  const reader = createSmtpReader(socket);

  socket.setTimeout(30_000, () => socket.destroy(new Error("Timeout de conexión SMTP.")));
  await once(socket, env.smtpSecure ? "secureConnect" : "connect");
  return { socket, reader };
}

function buildMimeMessage({ from, to, replyTo, subject, text, html }) {
  const boundary = `mgqr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizeLineEndings(text),
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizeLineEndings(html),
    `--${boundary}--`,
  ];

  return `${headers.join("\r\n")}\r\n\r\n${body.join("\r\n")}`.replace(/^\./gm, "..");
}

async function sendViaSmtp(message) {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    throw serviceUnavailable("El envío de correo no está configurado. Define SMTP_HOST, SMTP_USER y SMTP_PASS.");
  }

  let { socket, reader } = await openSmtpSocket();
  const ehloName = "marketgamesqr.com";
  const envelopeFrom = extractEmail(env.contactMailFrom) || env.smtpUser;
  const recipient = env.contactRecipientEmail;

  try {
    await reader.command(null, [220]);
    await reader.command(`EHLO ${ehloName}`, [250]);

    if (!env.smtpSecure) {
      await reader.command("STARTTLS", [220]);
      reader.detach();
      socket = tls.connect({
        socket,
        servername: env.smtpHost,
        rejectUnauthorized: env.smtpRejectUnauthorized,
      });
      reader = createSmtpReader(socket);
      await once(socket, "secureConnect");
      await reader.command(`EHLO ${ehloName}`, [250]);
    }

    await reader.command("AUTH LOGIN", [334]);
    await reader.command(Buffer.from(env.smtpUser).toString("base64"), [334]);
    await reader.command(Buffer.from(env.smtpPass).toString("base64"), [235]);
    await reader.command(`MAIL FROM:<${envelopeFrom}>`, [250]);
    await reader.command(`RCPT TO:<${recipient}>`, [250, 251]);
    await reader.command("DATA", [354]);
    socket.write(`${message}\r\n.\r\n`);
    await reader.command(null, [250]);
    await reader.command("QUIT", [221]);
  } finally {
    reader.detach();
    socket.end();
  }
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
      from: env.contactMailFrom,
      to: [env.contactRecipientEmail],
      reply_to: replyTo,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend rechazó el correo: ${response.status} ${errorBody}`);
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
    from: formatMailbox("MarketGamesQR Web", env.contactMailFrom),
    to: formatMailbox("MarketGamesQR Contacto", env.contactRecipientEmail),
    replyTo: formatMailbox(body.name, body.email),
  };
}

async function sendContactEmail(body, metadata = {}) {
  const contactMessage = buildContactMessage(body, metadata);

  if (env.resendApiKey) {
    await sendViaResend(contactMessage);
    return;
  }

  await sendViaSmtp(buildMimeMessage(contactMessage));
}

module.exports = { sendContactEmail };
