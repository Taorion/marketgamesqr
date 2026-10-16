const { z } = require("zod");
const { forbidden, badRequest } = require("../utils/http");
const { MODULES, LIMIT_LABELS } = require("./commercialTerms");
const SUPERADMIN = "QORI_SUPERADMIN";
const SELLER = "QORI_SELLER";
const PLAN_CODES = ["DESPEGA", "STARTER", "GROWTH", "PRO"];
const limitsSchema = z.partialRecord(z.enum(Object.keys(LIMIT_LABELS)), z.number().int().min(0).max(100000)).default({});
const termsSchema = z.object({
  plan_code: z.enum(PLAN_CODES), discount_percent: z.number().min(0).max(90).default(0),
  discount_months: z.number().int().min(0).max(24).default(0), trial_days: z.number().int().min(0).max(365).default(0),
  bonus_tickets: z.number().int().min(0).max(100000).default(0), modules: z.array(z.enum(Object.keys(MODULES))).max(30).default([]),
  benefit_days: z.number().int().min(0).max(730).default(0), limit_overrides: limitsSchema,
}).strict().superRefine((v, ctx) => {
  if (v.discount_percent && !v.discount_months) ctx.addIssue({ code: "custom", message: "Indica cuántos meses dura el descuento." });
  if ((v.modules.length || Object.keys(v.limit_overrides).length) && !v.benefit_days) ctx.addIssue({ code: "custom", message: "Indica la duración de los módulos y cupos adicionales." });
});
const policySchema = z.object({
  name: z.string().trim().min(3).max(120), seller_id: z.string().uuid().nullable().default(null),
  plan_codes: z.array(z.enum(PLAN_CODES)).min(1), max_discount_percent: z.number().min(0).max(90),
  max_discount_months: z.number().int().min(0).max(24), max_trial_days: z.number().int().min(0).max(365),
  max_bonus_tickets: z.number().int().min(0).max(100000), allowed_modules: z.array(z.enum(Object.keys(MODULES))).default([]),
  max_benefit_days: z.number().int().min(0).max(730), max_limits: limitsSchema,
  expires_at: z.string().datetime(), is_active: z.boolean().default(true),
}).strict().superRefine((v, ctx) => {
  if (v.max_discount_percent && !v.max_discount_months) ctx.addIssue({ code: "custom", message: "Indica la duración máxima del descuento." });
  if ((v.allowed_modules.length || Object.keys(v.max_limits).length) && !v.max_benefit_days) ctx.addIssue({ code: "custom", message: "Indica cuántos días pueden durar los módulos y cupos adicionales." });
});
function requireSuperadmin(user) { if (user?.role !== SUPERADMIN) throw forbidden("Solo el superadmin puede autorizar esta acción."); }
function requireCommercialUser(user) { if (![SUPERADMIN, SELLER].includes(user?.role)) throw forbidden("Necesitas una cuenta comercial de Qori."); }
function requireOwner(user, sellerId) { requireCommercialUser(user); if (user.role !== SUPERADMIN && user.id !== sellerId) throw forbidden("Este registro pertenece a otro vendedor."); }
function policyAllows(policy, terms, sellerId, now = new Date()) {
  if (!policy || !policy.is_active || new Date(policy.expires_at) <= now || (policy.seller_id && policy.seller_id !== sellerId)) return false;
  return policy.plan_codes.includes(terms.plan_code) && terms.discount_percent <= Number(policy.max_discount_percent)
    && terms.discount_months <= policy.max_discount_months && terms.trial_days <= policy.max_trial_days
    && terms.bonus_tickets <= policy.max_bonus_tickets && terms.benefit_days <= policy.max_benefit_days
    && terms.modules.every(m => policy.allowed_modules.includes(m))
    && Object.entries(terms.limit_overrides).every(([k, v]) => Object.hasOwn(policy.max_limits || {}, k) && v <= policy.max_limits[k]);
}
function assertConvertible(deal, user, policy, now = new Date()) {
  requireOwner(user, deal.seller_id);
  if (deal.status !== "APPROVED" || new Date(deal.valid_until) <= now) throw badRequest("La oferta debe estar aprobada y vigente antes de aplicarse.");
  if (deal.approval_source === "POLICY" && (!policyAllows(policy, deal.terms, deal.seller_id, now) || policy.version !== deal.policy_version)) throw badRequest("La autorización cambió o venció. Solicita una nueva aprobación.");
}
module.exports = { SUPERADMIN, SELLER, PLAN_CODES, termsSchema, policySchema, requireSuperadmin, requireCommercialUser, requireOwner, policyAllows, assertConvertible };
