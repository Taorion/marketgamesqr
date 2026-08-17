const { z } = require("zod");
const { query } = require("../config/db");
const { sendContactEmail } = require("../services/contactMailService");
const { badRequest } = require("../utils/http");

const contactSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional().nullable(),
  document_type: z.enum(["CC", "CE", "TI", "NIT", "PASSPORT", "PEP", "OTHER"]),
  document_id: z.string().trim().min(3).max(60),
  company: z.string().trim().max(180).optional().nullable(),
  message: z.string().trim().min(8).max(2000),
  terms_accepted: z.literal(true),
  privacy_accepted: z.literal(true),
  source_url: z.string().trim().max(500).optional().nullable(),
});

async function submitContact(req, res, next) {
  try {
    const result = contactSchema.safeParse(req.body);
    if (!result.success) {
      const error = badRequest("Completa tus datos, documento, mensaje y acepta los Términos y la Política de privacidad.", result.error.flatten());
      error.publicMessage = error.message;
      throw error;
    }

    const body = result.data;
    const metadata = {
      ip: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip,
      userAgent: req.get("user-agent") || "",
    };
    const saved = await query(
      `insert into public_contact_messages
         (name, email, phone, company, message, source_url, ip_address, user_agent, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       returning id`,
      [
        body.name,
        body.email,
        body.phone || null,
        body.company || null,
        body.message,
        body.source_url || null,
        metadata.ip || null,
        metadata.userAgent || null,
        JSON.stringify({
          source: "home_contact_form",
          identity_document: { type: body.document_type, id: body.document_id },
          legal_consent: { terms_accepted: true, privacy_accepted: true, accepted_at: new Date().toISOString() },
        }),
      ]
    );
    const contactId = saved.rows[0].id;

    try {
      await sendContactEmail(body, metadata);
      await query(
        `update public_contact_messages
         set mail_delivery_status = 'SENT', mail_error = null, updated_at = now()
         where id = $1`,
        [contactId]
      );
      return res.status(202).json({ ok: true, message: "Mensaje enviado correctamente." });
    } catch (emailError) {
      await query(
        `update public_contact_messages
         set mail_delivery_status = 'ERROR', mail_error = $2, updated_at = now()
         where id = $1`,
        [contactId, String(emailError.message || emailError).slice(0, 1200)]
      );
      console.error("Contact message saved but email delivery failed", {
        contact_id: contactId,
        message: emailError.message,
      });
      return res.status(202).json({
        ok: true,
        email_delivered: false,
        message: "Recibimos tu consulta. Nuestro equipo revisará el mensaje.",
      });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = { submitContact };
