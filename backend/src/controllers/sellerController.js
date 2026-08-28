const { z } = require("zod");
const { validate } = require("../utils/validators");
const { badRequest } = require("../utils/http");
const { assertBusinessFeature } = require("../services/subscriptionService");
const {
  publicSalesAdvisors,
  createSeller,
  updateSeller,
  updateSellerSelf,
  saveSellerGoal,
  sellerDirectory,
  sellerDetail,
  recordSellerSale,
  reassignSignupAttribution,
} = require("../services/sellerService");

const sellerCodeSchema = z.string().trim().min(3).max(40);
const optionalText = (max) => z.string().trim().max(max).optional().nullable();

const sellerCreateSchema = z.object({
  full_name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(120),
  seller_code: sellerCodeSchema,
  job_title: optionalText(120),
  phone: optionalText(40),
  territory: optionalText(160),
  branch_id: z.string().uuid().optional().nullable(),
  hired_at: z.string().date().optional().nullable(),
  administrative_notes: optionalText(2000),
  commercial_settings: z.record(z.string(), z.any()).optional().default({}),
});

const sellerPatchSchema = sellerCreateSchema.omit({ password: true }).partial().extend({
  is_active: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

const sellerSelfPatchSchema = z.object({
  phone: optionalText(40),
  profile_note: optionalText(500),
});

const goalSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  period_start: z.string().date(),
  period_end: z.string().date(),
  target_revenue: z.number().min(0).max(999999999999),
  target_sales: z.number().int().min(0).max(1000000),
  target_new_customers: z.number().int().min(0).max(1000000),
  product_targets: z.array(z.object({
    product_id: z.string().max(180).optional().nullable(),
    label: z.string().trim().min(1).max(180),
    target_units: z.number().min(0).max(1000000).default(0),
    target_revenue: z.number().min(0).max(999999999999).default(0),
  })).max(100).optional().default([]),
  status: z.enum(["ACTIVE", "CLOSED", "CANCELLED"]).default("ACTIVE"),
  notes: optionalText(1200),
}).refine((body) => body.period_end >= body.period_start, { message: "La fecha final debe ser igual o posterior a la inicial.", path: ["period_end"] });

const saleProductSchema = z.object({
  inventory_product_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(180),
  sku: optionalText(80),
  barcode: optionalText(120),
  category: optionalText(120),
  brand: optionalText(120),
  quantity: z.number().positive().max(1000000).default(1),
  unit_price: z.number().min(0).max(999999999999),
  line_total: z.number().positive().max(999999999999),
});

const sellerSaleSchema = z.object({
  customer_name: optionalText(160),
  customer_phone: optionalText(40),
  customer_email: z.string().trim().email().max(180).optional().nullable(),
  customer_document_id: optionalText(80),
  product_name: optionalText(180),
  sale_amount: z.number().positive().max(999999999999),
  currency: z.string().trim().min(3).max(12).default("COP"),
  branch_id: z.string().uuid().optional().nullable(),
  acquisition_source: optionalText(80),
  acquisition_channel: optionalText(180),
  paid_at: z.string().datetime().optional().nullable(),
  notes: optionalText(2000),
  products: z.array(saleProductSchema).min(1).max(100).optional(),
  idempotency_key: z.string().trim().min(8).max(160),
  metadata: z.record(z.string(), z.any()).optional().default({}),
}).refine((body) => body.products?.length || body.product_name, { message: "Registra al menos un producto o plan vendido.", path: ["products"] });

const attributionPatchSchema = z.object({
  seller_user_id: z.string().uuid().optional().nullable(),
  reason: z.string().trim().min(5).max(1000),
});

function businessId(req) {
  return req.seller_business_id || req.user.business_id;
}

async function sellerModuleAccess(req, _res, next) {
  try {
    const admin = ["ADMIN", "ADMIN_MARKET_GAMES"].includes(req.user?.role);
    const target = admin
      ? (req.query.business_id || req.body?.business_id || req.headers["x-qori-business-id"])
      : req.user?.business_id;
    if (!z.string().uuid().safeParse(target).success) {
      throw badRequest(admin ? "Indica el negocio que deseas administrar." : "Tu usuario no tiene un negocio valido asignado.");
    }
    await assertBusinessFeature(req.user, target, "portal_access");
    req.seller_business_id = target;
    next();
  } catch (error) { next(error); }
}

function filters(req) {
  return {
    start_date: req.query.start_date,
    end_date: req.query.end_date,
    seller_id: req.query.seller_id,
    branch_id: req.query.branch_id,
    status: req.query.status,
    product: String(req.query.product || "").trim().slice(0, 160),
    channel: String(req.query.channel || "").trim().slice(0, 160),
    search: String(req.query.search || "").trim().slice(0, 120),
  };
}

async function listPublicSalesAdvisors(req, res, next) {
  try {
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    res.json({ advisors: await publicSalesAdvisors(req.query.q) });
  } catch (error) { next(error); }
}

async function listSellers(req, res, next) {
  try { res.set("Cache-Control", "private, no-store"); res.json(await sellerDirectory(businessId(req), req.user, filters(req))); }
  catch (error) { next(error); }
}

async function getSeller(req, res, next) {
  try { res.set("Cache-Control", "private, no-store"); res.json(await sellerDetail(businessId(req), req.params.sellerId, req.user, filters(req))); }
  catch (error) { next(error); }
}

async function getSellerSelf(req, res, next) {
  try { res.set("Cache-Control", "private, no-store"); res.json(await sellerDetail(businessId(req), req.user.id, req.user, filters(req))); }
  catch (error) { next(error); }
}

async function createSellerHandler(req, res, next) {
  try { res.status(201).json({ seller: await createSeller(businessId(req), req.user, validate(sellerCreateSchema, req.body)) }); }
  catch (error) { next(error); }
}

async function patchSeller(req, res, next) {
  try { res.json({ seller: await updateSeller(businessId(req), req.params.sellerId, req.user, validate(sellerPatchSchema, req.body)) }); }
  catch (error) { next(error); }
}

async function patchSellerSelf(req, res, next) {
  try { res.json({ seller: await updateSellerSelf(businessId(req), req.user.id, validate(sellerSelfPatchSchema, req.body)) }); }
  catch (error) { next(error); }
}

async function putSellerGoal(req, res, next) {
  try { res.json({ goal: await saveSellerGoal(businessId(req), req.params.sellerId, req.user, validate(goalSchema, req.body)) }); }
  catch (error) { next(error); }
}

async function postSellerSale(req, res, next) {
  try { res.status(201).json(await recordSellerSale(businessId(req), req.params.sellerId, req.user, validate(sellerSaleSchema, req.body))); }
  catch (error) { next(error); }
}

async function patchSignupAttribution(req, res, next) {
  try { res.json({ attribution: await reassignSignupAttribution(businessId(req), req.params.attributionId, req.user, validate(attributionPatchSchema, req.body)) }); }
  catch (error) { next(error); }
}

module.exports = {
  sellerModuleAccess,
  listPublicSalesAdvisors,
  listSellers,
  getSeller,
  getSellerSelf,
  createSellerHandler,
  patchSeller,
  patchSellerSelf,
  putSellerGoal,
  postSellerSale,
  patchSignupAttribution,
};
