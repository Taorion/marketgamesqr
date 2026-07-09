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
  getBusinessSubscription,
  recordUsage,
} = require("../services/subscriptionService");

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
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
    await assertFeatureForRequest(req, businessId, "qr_batch_generator");
    const body = validate(interactiveActivationCreateSchema, req.body);
    await assertInteractiveActivationTypeForBusiness(businessId, body.activation_type);
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
    const activations = await listInteractiveActivations(businessIdFor(req), { limit });
    res.json({ activations, trivias: activations });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const body = validate(interactiveActivationUpdateSchema, req.body);
    res.json(await updateInteractiveActivation(businessIdFor(req), req.params.id, body));
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
    res.json({ activation: await getPublicInteractiveActivation(req.params.slug) });
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

module.exports = {
  catalog,
  create,
  list,
  remove,
  recycle,
  publicComplete,
  publicGet,
  publicStart,
  report,
  participants,
  rewards,
  update,
};
