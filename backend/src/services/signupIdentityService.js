const { z } = require("zod");
const { badRequest } = require("../utils/http");
const DESCUBRE_USED_MESSAGE = "Este NIT o cédula ya recibió la muestra Descubre. Solo se permite una vez por documento. El negocio debe continuar con un plan de pago.";

const publicSignupBaseSchema = z.object({
  contact_name: z.string().trim().min(2).max(160),
  company_name: z.string().trim().min(2).max(180).optional().nullable(),
  nit: z.string().trim().min(5).max(40),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().min(7).max(40),
  website: z.string().trim().max(220).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(220).optional().nullable(),
  password: z.string().min(8).max(120),
  password_confirm: z.string().min(8).max(120),
  terms_accepted: z.boolean().refine((value) => value === true, "Debes aceptar los terminos y condiciones."),
  privacy_accepted: z.boolean().refine((value) => value === true, "Debes aceptar la politica de privacidad."),
  legal_version: z.string().trim().max(40).default("2026-06-16"),
  sales_advisor_code: z.string().trim().max(40).optional().nullable(),
  commercial_advisor_id: z.string().uuid().optional().nullable(),
}).refine((body) => body.password === body.password_confirm, {
  message: "La confirmacion de clave no coincide.",
  path: ["password_confirm"],
});

function slugify(value) {
  return String(value || "cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "cliente";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDocument(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function assertUniqueSignupIdentity(client, body, { descubre = false } = {}) {
  const email = normalizeEmail(body.email);
  const documentId = normalizeDocument(body.nit);
  if (!email || !documentId) {
    throw badRequest("Email y documento de facturacion son obligatorios.");
  }

  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`signup-email:${email}`]);
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`signup-document:${documentId}`]);

  if (descubre) {
    const used = await client.query("select 1 from qori_descubre_documents where document_key=$1", [documentId]);
    if (used.rowCount) throw badRequest(DESCUBRE_USED_MESSAGE);
  }

  const existingUser = await client.query(
    `select id, is_active
     from app_users
     where lower(email) = $1
     limit 1`,
    [email]
  );
  if (existingUser.rowCount) {
    throw badRequest("Ya existe un usuario registrado con este correo electronico. Inicia sesion o usa otro correo.");
  }

  const existingBusiness = await client.query(
    `select id, name
     from businesses
     where regexp_replace(lower(coalesce(settings->>'nit', '')), '[^a-z0-9]', '', 'g') = $1
     limit 1`,
    [documentId]
  );
  if (existingBusiness.rowCount) {
    throw badRequest("Ya existe una empresa registrada con este documento o NIT. Inicia sesion o contacta soporte para recuperar el acceso.");
  }
}

async function uniqueBusinessSlug(client, baseValue) {
  const base = slugify(baseValue);
  for (let index = 0; index < 8; index += 1) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    const candidate = `${base}${suffix}`;
    const existing = await client.query("select id from businesses where slug = $1", [candidate]);
    if (!existing.rowCount) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function signupSettings(body, type) {
  return {
    nit: body.nit,
    contact_name: body.contact_name,
    contact_email: body.email,
    phone: body.phone,
    website: body.website || "",
    city: body.city || "",
    address: body.address || "",
    signup_type: type,
    billing_cycle: body.billing_cycle || "monthly",
    account_document_type: body.company_name ? "NIT" : "CEDULA",
    legal_acceptance: {
      terms_accepted: body.terms_accepted,
      privacy_accepted: body.privacy_accepted,
      legal_version: body.legal_version || "2026-06-16",
      accepted_at: new Date().toISOString(),
    },
  };
}


module.exports={publicSignupBaseSchema,assertUniqueSignupIdentity,uniqueBusinessSlug,signupSettings,normalizeDocument,DESCUBRE_USED_MESSAGE};
