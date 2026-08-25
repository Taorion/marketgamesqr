const { badRequest } = require("../utils/http");
const { getWhatsAppConnectionStatus, ownWhatsAppAccessToken } = require("./businessCommunicationCredentialService");

const DEFAULT_GRAPH_API_VERSION = "v23.0";

function providerError(status, detail = "") {
  const text = String(detail || "").toLowerCase();
  let metaError = null;
  try { metaError = JSON.parse(String(detail || ""))?.error || null; } catch { /* Meta can also return plain text. */ }
  const metaCode = Number(metaError?.code || 0);
  const metaSubcode = Number(metaError?.error_subcode || 0);
  let publicMessage = "WhatsApp no aceptó este envío. Revisa la plantilla, el consentimiento y la conexión en Cuenta.";
  if (metaCode === 131030 || /allowed list|test recipient|recipient.*not.*allowed/.test(text)) {
    publicMessage = "Meta bloque\u00f3 este n\u00famero porque la app est\u00e1 en modo de prueba. Agr\u00e9galo en Meta for Developers > WhatsApp > API Setup > Add phone number y verifica el c\u00f3digo, o publica la app para enviar a n\u00fameros reales.";
  } else if (status === 401 || status === 403 || metaCode === 190 || /invalid.*token|access token.*invalid|token.*expired/.test(text)) {
    publicMessage = "Meta rechazó el token de WhatsApp. Genera un token de usuario del sistema con permisos de WhatsApp y vuelve a conectarlo en Cuenta.";
  } else if (/template|plantilla/.test(text)) {
    publicMessage = "Meta rechazó la plantilla. Elige una plantilla aprobada, con el idioma y las variables exactas configuradas en WhatsApp Manager.";
  } else if (/recipient|phone|number/.test(text) || [131026, 133010].includes(metaCode) || metaSubcode === 2494073) {
    publicMessage = "Meta no pudo entregar a uno de los números. Revisa que tenga prefijo de país y consentimiento para WhatsApp.";
  } else if (status === 429) {
    publicMessage = "Meta aplicó un límite temporal. Qori detuvo este lote para que puedas reintentarlo más tarde.";
  }
  const error = new Error(`WhatsApp Cloud API rechazó la solicitud: ${status} ${detail}`.trim());
  error.status = status >= 500 ? 502 : 400;
  error.publicMessage = publicMessage;
  return error;
}

async function whatsappConnection(businessId) {
  const status = await getWhatsAppConnectionStatus(businessId);
  if (!status.ready) throw badRequest("Conecta WhatsApp Business en Cuenta antes de enviar: falta el token, la cuenta de WhatsApp Business o el ID del número.");
  const token = await ownWhatsAppAccessToken(businessId);
  if (!token) throw badRequest("Vuelve a conectar el token de WhatsApp Business en Cuenta antes de enviar.");
  return { ...status, token };
}

async function graphRequest(connection, path, options = {}) {
  const response = await fetch(`https://graph.facebook.com/${DEFAULT_GRAPH_API_VERSION}/${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${connection.token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      "User-Agent": "Qori-RMS/1.0",
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!response.ok) throw providerError(response.status, await response.text());
  return response.json();
}

function templateSummary(template = {}) {
  const components = Array.isArray(template.components) ? template.components : [];
  const body = components.find((component) => String(component.type || "").toUpperCase() === "BODY") || {};
  const variables = [...String(body.text || "").matchAll(/{{\s*(\d+)\s*}}/g)].map((match) => Number(match[1]));
  return {
    name: String(template.name || ""),
    language: String(template.language || "es_CO"),
    category: String(template.category || ""),
    status: String(template.status || ""),
    body: String(body.text || ""),
    variable_count: variables.length ? Math.max(...variables) : 0,
  };
}

async function listApprovedWhatsAppTemplates(businessId) {
  const connection = await whatsappConnection(businessId);
  let data;
  try {
    data = await graphRequest(connection, `${encodeURIComponent(connection.business_account_id)}/message_templates?fields=name,status,language,category,components&limit=250`);
  } catch (error) {
    error.publicMessage = "Meta no permitió leer las plantillas. En Meta Business Settings abre Usuarios del sistema, asigna a ese usuario la aplicación y la cuenta de WhatsApp Business con control total; luego genera un token nuevo con whatsapp_business_management y vuelve a guardarlo en Qori.";
    throw error;
  }
  return {
    templates: (data.data || []).map(templateSummary).filter((template) => template.status === "APPROVED").sort((a, b) => a.name.localeCompare(b.name, "es")),
  };
}

async function sendWhatsAppTemplate(businessId, { to, templateName, languageCode, bodyParameters = [] }) {
  const connection = await whatsappConnection(businessId);
  const components = bodyParameters.length ? [{
    type: "body",
    parameters: bodyParameters.map((value) => ({ type: "text", text: String(value || "").slice(0, 1024) })),
  }] : [];
  const data = await graphRequest(connection, `${encodeURIComponent(connection.phone_number_id)}/messages`, {
    method: "POST",
    body: {
      messaging_product: "whatsapp",
      to: String(to || "").replace(/\D/g, ""),
      type: "template",
      template: {
        name: String(templateName || "").trim(),
        language: { code: String(languageCode || "es_CO").trim() || "es_CO" },
        ...(components.length ? { components } : {}),
      },
    },
  });
  return { id: data.messages?.[0]?.id || null };
}

module.exports = { listApprovedWhatsAppTemplates, sendWhatsAppTemplate };
