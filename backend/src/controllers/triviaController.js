const { forbidden } = require("../utils/http");
const { validate, triviaLaunchSchema, publicTriviaSubmitSchema } = require("../utils/validators");
const {
  createTriviaLauncher,
  listTriviaLaunchers,
  getPublicTrivia,
  submitPublicTrivia,
} = require("../services/triviaService");
const { assertFeatureForRequest, recordUsage } = require("../services/subscriptionService");

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
}

async function createTrivia(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "qr_batch_generator");
    const body = validate(triviaLaunchSchema, req.body);
    const result = await createTriviaLauncher(businessId, req.user, body);
    await recordUsage({
      business_id: businessId,
      user_id: req.user.id,
      event_type: "trivia_launcher_created",
      quantity: 1,
      metadata: { trivia_id: result.trivia?.id || null },
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function listTrivias(req, res, next) {
  try {
    res.json({ trivias: await listTriviaLaunchers(businessIdFor(req)) });
  } catch (error) {
    next(error);
  }
}

async function publicGetTrivia(req, res, next) {
  try {
    res.json({ trivia: await getPublicTrivia(req.params.slug) });
  } catch (error) {
    next(error);
  }
}

async function publicSubmitTrivia(req, res, next) {
  try {
    const body = validate(publicTriviaSubmitSchema, req.body);
    const result = await submitPublicTrivia(req.params.slug, body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTrivia,
  listTrivias,
  publicGetTrivia,
  publicSubmitTrivia,
};
