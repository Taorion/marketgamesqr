const { z } = require("zod");
const { validate } = require("../utils/validators");
const service = require("../services/publicCommunicationPreferenceService");

const tokenSchema = z.object({ token: z.string().uuid() });

function escapeHtml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function preferencePage({ title, description, token, actionLabel = "Confirmar baja", success = false }) {
  const form = success ? "" : `<form method="post" action="/api/public/communications/unsubscribe/${escapeHtml(token)}"><button type="submit">${escapeHtml(actionLabel)}</button></form>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | Qori</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07111f;color:#eef6ff;font-family:Inter,Arial,sans-serif;padding:24px}.card{width:min(560px,100%);box-sizing:border-box;padding:42px;border:1px solid rgba(133,205,255,.24);border-radius:28px;background:linear-gradient(145deg,#10243b,#0a1728);box-shadow:0 30px 90px rgba(0,0,0,.36)}.mark{display:inline-grid;place-items:center;width:50px;height:50px;border-radius:16px;background:#55e6c1;color:#07111f;font-weight:900;font-size:24px}h1{font-size:34px;line-height:1.08;margin:24px 0 14px}p{color:#b9c9da;line-height:1.7;margin:0 0 28px}button{border:0;border-radius:14px;background:#55e6c1;color:#07111f;font-weight:800;padding:15px 22px;cursor:pointer}small{display:block;color:#7890a9;margin-top:24px}</style></head><body><main class="card"><span class="mark">Q</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>${form}<small>Qori protege tus preferencias de comunicación.</small></main></body></html>`;
}

async function show(req, res, next) {
  try {
    const { token } = validate(tokenSchema, req.params);
    const preference = await service.preferenceByToken(token);
    const done = Boolean(preference.unsubscribed_at);
    res.type("html").send(preferencePage({
      title: done ? "Tu preferencia ya está guardada" : "¿Quieres dejar de recibir estos correos?",
      description: done ? `El correo ${preference.recipient_email} ya no recibirá comunicaciones comerciales de ${preference.business_name}.` : `Confirma para que ${preference.recipient_email} deje de recibir comunicaciones comerciales de ${preference.business_name}.`,
      token,
      success: done,
    }));
  } catch (error) { next(error); }
}

async function unsubscribe(req, res, next) {
  try {
    const { token } = validate(tokenSchema, req.params);
    const preference = await service.unsubscribeCommunicationEmail(token);
    if (req.get("List-Unsubscribe-Post") === "List-Unsubscribe=One-Click" || req.accepts(["html", "json"]) === "json") return res.json({ ok: true, unsubscribed: true });
    res.type("html").send(preferencePage({ title: "Preferencia actualizada", description: `${preference.recipient_email} ya no recibirá comunicaciones comerciales de ${preference.business_name}.`, token, success: true }));
  } catch (error) { next(error); }
}

module.exports = { show, unsubscribe };
