const { z } = require("zod");
const { sendContactEmail } = require("../services/contactMailService");
const { validate } = require("../utils/validators");

const contactSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().min(7).max(40),
  company: z.string().trim().max(180).optional().nullable(),
  message: z.string().trim().min(8).max(2000),
  source_url: z.string().trim().max(500).optional().nullable(),
});

async function submitContact(req, res, next) {
  try {
    const body = validate(contactSchema, req.body);
    await sendContactEmail(body, {
      ip: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip,
      userAgent: req.get("user-agent") || "",
    });
    res.status(202).json({ ok: true, message: "Mensaje enviado correctamente." });
  } catch (error) {
    next(error);
  }
}

module.exports = { submitContact };
