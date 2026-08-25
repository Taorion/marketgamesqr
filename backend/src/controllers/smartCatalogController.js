const { z } = require("zod");
const { forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const {
  archiveCatalog,
  catalogDetail,
  createAgendaTask,
  createCatalog,
  createProduct,
  createWhatsappIntent,
  dashboard,
  deleteProduct,
  getPublicCatalog,
  listCatalogs,
  listIntents,
  listProducts,
  markWon,
  publicProduct,
  recordEvent,
  seedDoctorAngieCatalog,
  sendPostSaleTicket,
  updateCatalog,
  updateIntent,
  updateProduct,
} = require("../services/smartCatalogService");

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
}

function reqMeta(req) {
  return {
    ip: req.ip || req.headers["x-forwarded-for"] || "",
    userAgent: req.headers["user-agent"] || "",
    sourceUrl: req.headers.referer || "",
  };
}

const uuidNullable = z.string().uuid().optional().nullable();

const catalogSchema = z.object({
  title: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(1400).optional().nullable(),
  brand_name: z.string().trim().max(180).optional().nullable(),
  brand_logo_url: z.string().trim().max(1200).optional().nullable(),
  cover_image_url: z.string().trim().max(1200).optional().nullable(),
  whatsapp_number: z.string().trim().min(8).max(30),
  default_cta_label: z.string().trim().max(80).optional().nullable(),
  theme_color: z.string().trim().max(32).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
  linked_campaign_id: uuidNullable,
  linked_activation_id: uuidNullable,
  linked_lead_capture_id: uuidNullable,
  linked_reward_id: uuidNullable,
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const catalogPatchSchema = catalogSchema.partial().refine((body) => Object.keys(body).length > 0, {
  message: "No hay campos para actualizar.",
});

const productSchema = z.object({
  inventory_product_id: uuidNullable,
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(120).optional().nullable(),
  product_type: z.enum(["physical", "service", "combo", "advisory", "plan", "voucher", "experience"]).optional(),
  description: z.string().trim().max(4000).optional().nullable(),
  short_description: z.string().trim().max(260).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  price: z.coerce.number().min(0).optional().nullable(),
  compare_at_price: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().trim().max(8).optional(),
  image_url: z.string().trim().max(1_600_000).optional().nullable(),
  gallery: z.array(z.unknown()).optional().default([]),
  tags: z.array(z.unknown()).optional().default([]),
  benefits: z.array(z.unknown()).optional().default([]),
  ingredients_or_details: z.string().trim().max(4000).optional().nullable(),
  stock_status: z.enum(["AVAILABLE", "LIMITED", "OUT_OF_STOCK", "HIDDEN"]).optional(),
  cta_label: z.string().trim().max(80).optional().nullable(),
  whatsapp_message_template: z.string().trim().max(600).optional().nullable(),
  display_order: z.coerce.number().int().optional(),
  is_featured: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const productPatchSchema = productSchema.partial().refine((body) => Object.keys(body).length > 0, {
  message: "No hay campos para actualizar.",
});

const publicLeadSchema = z.object({
  customer_name: z.string().trim().min(2).max(160),
  customer_phone: z.string().trim().min(5).max(40),
  customer_email: z.string().email().max(160).optional().nullable(),
  customer_document_type: z.enum(["CC", "CE", "TI", "NIT", "PASSPORT", "PEP", "OTHER"]),
  customer_document: z.string().trim().min(3).max(60),
  campaign_id: uuidNullable,
  activation_id: uuidNullable,
  qr_code_id: uuidNullable,
  source: z.string().trim().max(120).optional().nullable(),
  channel: z.string().trim().max(120).optional().nullable(),
  partner_id: uuidNullable,
  branch_id: uuidNullable,
  partner_name: z.string().trim().max(160).optional().nullable(),
  referral_source: z.string().trim().max(160).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const publicEventSchema = z.object({
  catalog_id: z.string().uuid().optional(),
  product_id: uuidNullable,
  lead_id: uuidNullable,
  campaign_id: uuidNullable,
  activation_id: uuidNullable,
  qr_code_id: uuidNullable,
  event_type: z.enum([
    "catalog_view",
    "product_view",
    "whatsapp_click",
    "info_click",
    "lead_created_from_catalog",
    "post_sale_ticket_sent",
    "post_sale_ticket_claimed",
    "catalog_order_intent",
    "catalog_return_visit",
  ]),
  source: z.string().trim().max(120).optional().nullable(),
  channel: z.string().trim().max(120).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const intentPatchSchema = z.object({
  status: z.enum(["INTENT_CREATED", "CONTACTED", "WON", "LOST", "POST_SALE_SENT"]).optional(),
  sale_notes: z.string().trim().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
}).refine((body) => Object.keys(body).length > 0, {
  message: "No hay campos para actualizar.",
});

const agendaTaskSchema = z.object({
  note: z.string().trim().max(1000).optional().nullable(),
  next_action: z.string().trim().max(240).optional().nullable(),
  reminder_at: z.string().datetime().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

const markWonSchema = z.object({
  sale_amount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().trim().max(8).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const postSaleSchema = z.object({
  sale_amount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().trim().max(8).optional().nullable(),
  campaign_id: uuidNullable,
  notes: z.string().trim().max(2000).optional().nullable(),
  expires_mode: z.enum(["7_DAYS", "15_DAYS", "30_DAYS", "CUSTOM_DATE", "NONE"]).optional(),
  expires_at: z.string().datetime().optional().nullable(),
  expiration_days: z.coerce.number().int().min(1).max(365).optional().nullable(),
  benefit_type: z.string().trim().max(80).optional().nullable(),
  benefit_label: z.string().trim().max(180).optional().nullable(),
  benefit_value: z.record(z.string(), z.unknown()).optional(),
  reward_id: uuidNullable,
});

async function businessDashboard(req, res, next) {
  try {
    res.json(await dashboard(businessIdFor(req)));
  } catch (error) {
    next(error);
  }
}

async function businessList(req, res, next) {
  try {
    res.json({ catalogs: await listCatalogs(businessIdFor(req)) });
  } catch (error) {
    next(error);
  }
}

async function businessCreate(req, res, next) {
  try {
    const body = validate(catalogSchema, req.body);
    res.status(201).json({ catalog: await createCatalog(businessIdFor(req), req.user, body) });
  } catch (error) {
    next(error);
  }
}

async function businessDetail(req, res, next) {
  try {
    res.json(await catalogDetail(businessIdFor(req), req.params.catalogId));
  } catch (error) {
    next(error);
  }
}

async function businessPatch(req, res, next) {
  try {
    const body = validate(catalogPatchSchema, req.body);
    res.json({ catalog: await updateCatalog(businessIdFor(req), req.params.catalogId, body) });
  } catch (error) {
    next(error);
  }
}

async function businessArchive(req, res, next) {
  try {
    res.json({ catalog: await archiveCatalog(businessIdFor(req), req.params.catalogId) });
  } catch (error) {
    next(error);
  }
}

async function productsList(req, res, next) {
  try {
    res.json({ products: await listProducts(businessIdFor(req), req.params.catalogId) });
  } catch (error) {
    next(error);
  }
}

async function productsCreate(req, res, next) {
  try {
    const body = validate(productSchema, req.body);
    res.status(201).json({ product: await createProduct(businessIdFor(req), req.params.catalogId, req.user, body) });
  } catch (error) {
    next(error);
  }
}

async function productsPatch(req, res, next) {
  try {
    const body = validate(productPatchSchema, req.body);
    res.json({ product: await updateProduct(businessIdFor(req), req.params.catalogId, req.params.productId, body) });
  } catch (error) {
    next(error);
  }
}

async function productsDelete(req, res, next) {
  try {
    res.json(await deleteProduct(businessIdFor(req), req.params.catalogId, req.params.productId));
  } catch (error) {
    next(error);
  }
}

async function intentsList(req, res, next) {
  try {
    res.json(await listIntents(businessIdFor(req), { ...req.query, catalog_id: req.params.catalogId }));
  } catch (error) {
    next(error);
  }
}

async function businessIntentPatch(req, res, next) {
  try {
    const body = validate(intentPatchSchema, req.body);
    res.json({ intent: await updateIntent(businessIdFor(req), req.params.intentId, body, req.user) });
  } catch (error) {
    next(error);
  }
}

async function businessIntentAgenda(req, res, next) {
  try {
    const body = validate(agendaTaskSchema, req.body);
    res.status(201).json(await createAgendaTask(businessIdFor(req), req.params.intentId, body, req.user));
  } catch (error) {
    next(error);
  }
}

async function businessIntentWon(req, res, next) {
  try {
    const body = validate(markWonSchema, req.body);
    res.json(await markWon(businessIdFor(req), req.params.intentId, body, req.user));
  } catch (error) {
    next(error);
  }
}

async function businessIntentPostSale(req, res, next) {
  try {
    const body = validate(postSaleSchema, req.body);
    res.status(201).json(await sendPostSaleTicket(businessIdFor(req), req.params.intentId, body, req.user));
  } catch (error) {
    next(error);
  }
}

async function seedDoctorAngie(req, res, next) {
  try {
    res.status(201).json(await seedDoctorAngieCatalog(businessIdFor(req), req.user));
  } catch (error) {
    next(error);
  }
}

async function publicGet(req, res, next) {
  try {
    res.json(await getPublicCatalog(req.params.catalogSlug, reqMeta(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function publicGetProduct(req, res, next) {
  try {
    res.json(await publicProduct(req.params.catalogSlug, req.params.productSlug, reqMeta(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function publicEvent(req, res, next) {
  try {
    const body = validate(publicEventSchema, req.body);
    const data = await getPublicCatalog(req.params.catalogSlug, reqMeta(req), { ...req.query, return_visit: true });
    const { business_id: _businessId, catalog_id: _catalogId, ...eventBody } = body;
    res.status(201).json({
      event: await recordEvent(null, {
        ...eventBody,
        business_id: data.catalog.business_id,
        catalog_id: data.catalog.id,
      }, reqMeta(req)),
    });
  } catch (error) {
    next(error);
  }
}

async function publicWhatsappIntent(req, res, next) {
  try {
    const body = validate(publicLeadSchema, req.body);
    res.status(201).json(await createWhatsappIntent(req.params.catalogSlug, req.params.productId, body, reqMeta(req)));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  businessArchive,
  businessCreate,
  businessDashboard,
  businessDetail,
  businessIntentAgenda,
  businessIntentPatch,
  businessIntentPostSale,
  businessIntentWon,
  businessList,
  businessPatch,
  intentsList,
  productsCreate,
  productsDelete,
  productsList,
  productsPatch,
  publicEvent,
  publicGet,
  publicGetProduct,
  publicWhatsappIntent,
  seedDoctorAngie,
};
