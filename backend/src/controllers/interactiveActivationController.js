const { z } = require("zod");
const { query } = require("../config/db");
const { forbidden } = require("../utils/http");
const {
  validate,
  interactiveActivationCreateSchema,
  interactiveActivationUpdateSchema,
  publicInteractiveParticipantSchema,
  publicInteractiveCompleteSchema,
} = require("../utils/validators");
const {
  completeInteractiveParticipant,
  createInteractiveActivation,
  deleteInteractiveActivation,
  downloadInteractiveActivationAsset,
  getInteractiveActivationReport,
  getPublicInteractiveActivation,
  listActivationCatalog,
  listInteractiveActivations,
  listInteractiveParticipants,
  listInteractiveRewards,
  recycleInteractiveActivation,
  startInteractiveParticipant,
  updateInteractiveActivation,
} = require("../services/interactiveActivationService");
const {
  assertFeatureForRequest,
  assertInteractiveActivationTypeForBusiness,
  assertLimitForBusiness,
  assertMonthlyUsageLimit,
  getBusinessSubscription,
  recordUsage,
} = require("../services/subscriptionService");

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
}

async function assertActiveInteractiveActivationCapacity(businessId, excludeId = null) {
  const count = await query(
    `select count(*)::int as total
     from interactive_activations
     where company_id = $1
       and status = 'active'
       and ($2::uuid is null or id <> $2::uuid)`,
    [businessId, excludeId]
  );
  return assertLimitForBusiness(
    businessId,
    "active_interactive_activations",
    Number(count.rows[0]?.total || 0),
    "activaciones interactivas activas"
  );
}

const interactiveActivationListQuerySchema = z.object({
  campaign_id: z.string().uuid().optional(),
});

function reqMeta(req) {
  return {
    ip: req.ip || req.headers["x-forwarded-for"] || "",
    userAgent: req.headers["user-agent"] || "",
  };
}

async function catalog(req, res, next) {
  try {
    const subscription = await getBusinessSubscription(businessIdFor(req));
    res.json(listActivationCatalog({
      allowedTypes: subscription.plan.limits?.allowed_interactive_activation_types,
    }));
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const subscription = await assertFeatureForRequest(req, businessId, "qr_batch_generator");
    const body = validate(interactiveActivationCreateSchema, req.body);
    await assertInteractiveActivationTypeForBusiness(businessId, body.activation_type);
    await assertMonthlyUsageLimit(
      businessId,
      "interactive_activation_created",
      subscription.plan.limits?.activation_types_month,
      1,
      "activaciones interactivas creadas",
      { plan: subscription.plan, limit_key: "activation_types_month" }
    );
    if ((body.status || "active") === "active") {
      await assertActiveInteractiveActivationCapacity(businessId);
    }
    const result = await createInteractiveActivation(businessId, req.user, body);
    await recordUsage({
      business_id: businessId,
      user_id: req.user.id,
      event_type: "interactive_activation_created",
      quantity: 1,
      metadata: {
        activation_id: result.activation?.id || null,
        activation_type: result.activation?.activation_type || null,
      },
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 120, 1), 300);
    const includeArchived = ["1", "true", "yes"].includes(String(req.query.include_archived || "").toLowerCase());
    const availableOnly = ["1", "true", "yes"].includes(String(req.query.available_only || "").toLowerCase());
    const { campaign_id: campaignId } = validate(interactiveActivationListQuerySchema, {
      campaign_id: req.query.campaign_id || undefined,
    });
    const activations = await listInteractiveActivations(businessIdFor(req), {
      limit,
      includeArchived,
      availableOnly,
      campaignId,
    });
    res.json({ activations, trivias: activations });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const body = validate(interactiveActivationUpdateSchema, req.body);
    const businessId = businessIdFor(req);
    if (body.activation_type) await assertInteractiveActivationTypeForBusiness(businessId, body.activation_type);
    if (body.status === "active") await assertActiveInteractiveActivationCapacity(businessId, req.params.id);
    res.json(await updateInteractiveActivation(businessId, req.params.id, body));
  } catch (error) {
    next(error);
  }
}

async function recycle(req, res, next) {
  try {
    res.status(201).json(await recycleInteractiveActivation(businessIdFor(req), req.user, req.params.id));
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    res.json(await deleteInteractiveActivation(businessIdFor(req), req.params.id));
  } catch (error) {
    next(error);
  }
}

async function report(req, res, next) {
  try {
    res.json(await getInteractiveActivationReport(businessIdFor(req), req.params.id));
  } catch (error) {
    next(error);
  }
}

async function participants(req, res, next) {
  try {
    res.json({ participants: await listInteractiveParticipants(businessIdFor(req), req.params.id) });
  } catch (error) {
    next(error);
  }
}

async function rewards(req, res, next) {
  try {
    res.json({ rewards: await listInteractiveRewards(businessIdFor(req), req.params.id) });
  } catch (error) {
    next(error);
  }
}

async function publicGet(req, res, next) {
  try {
    res.json({ activation: await getPublicInteractiveActivation(req.params.slug, req.query.qori_ref, req.query.qori_source) });
  } catch (error) {
    next(error);
  }
}

async function publicStart(req, res, next) {
  try {
    const body = validate(publicInteractiveParticipantSchema, req.body);
    res.status(201).json(await startInteractiveParticipant(req.params.slug, body));
  } catch (error) {
    next(error);
  }
}

async function publicComplete(req, res, next) {
  try {
    const body = validate(publicInteractiveCompleteSchema, req.body);
    res.status(201).json(await completeInteractiveParticipant(req.params.slug, body));
  } catch (error) {
    next(error);
  }
}

async function publicDownload(req, res, next) {
  try {
    const file = await downloadInteractiveActivationAsset(req.params.downloadToken, reqMeta(req));
    res.setHeader("Content-Type", file.file_type);
    res.setHeader("Content-Length", file.buffer.length);
    res.setHeader("Content-Disposition", `attachment; filename="${String(file.file_name || "activo-digital").replace(/"/g, "")}"`);
    res.send(file.buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  catalog,
  create,
  list,
  remove,
  recycle,
  publicComplete,
  publicDownload,
  publicGet,
  publicStart,
  report,
  participants,
  rewards,
  update,
};
