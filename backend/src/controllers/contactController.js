const { z } = require("zod");
const { sendContactEmail } = require("../services/contactMailService");
const { badRequest } = require("../utils/http");

const contactSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(180).optional().nullable(),
  message: z.string().trim().min(8).max(2000),
  source_url: z.string().trim().max(500).optional().nullable(),
});

async function submitContact(req, res, next) {
  try {
    const result = contactSchema.safeParse(req.body);
    if (!result.success) {
      const error = badRequest("Completa nombre, email, teléfono y un mensaje de al menos 8 caracteres.", result.error.flatten());
      error.publicMessage = error.message;
      throw error;
    }

    const body = result.data;
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
