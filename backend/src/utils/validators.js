const { z } = require("zod");
const { badRequest } = require("./http");

function validate(schema, source) {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw badRequest("Invalid request payload.", result.error.flatten());
  }
  return result.data;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const generateQrSchema = z.object({
  business_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional(),
  game_id: z.string().uuid(),
  reward_id: z.string().uuid(),
  player: z.object({
    external_id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    document_id: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).default({}),
  questionnaire: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  expires_at: z.string().datetime().optional(),
});

const qrOriginTypes = [
  "CAMPAIGN_GAME",
  "CAMPAIGN_FORM",
  "POST_SALE",
  "PRODUCT_LABEL",
  "BULK_PACKAGE",
  "MANUAL_BENEFIT",
  "LOYALTY",
  "SURPRISE_REWARD",
  "AFFILIATE_REFERRAL",
  "TRIVIA_LAUNCHER",
  "INTERACTIVE_ACTIVATION",
];

const benefitTypes = [
  "PERCENT_DISCOUNT",
  "FIXED_AMOUNT_DISCOUNT",
  "FREE_GIFT",
  "FREE_SAMPLE",
  "UPGRADE",
  "VIP_ACCESS",
  "RAFFLE_ENTRY",
  "BUY_X_GET_Y",
  "CUSTOM",
];

const expirationPresets = ["7_DAYS", "15_DAYS", "30_DAYS", "CUSTOM_DATE", "NONE"];

const benefitValueSchema = z.record(z.string(), z.unknown()).default({});

const strategicBenefitSchema = z.object({
  reward_id: z.string().uuid().optional().nullable(),
  benefit_type: z.enum(benefitTypes),
  benefit_label: z.string().trim().min(2).max(160),
  benefit_value: benefitValueSchema,
});

const postSaleQrSchema = z.object({
  campaign_id: z.string().uuid().optional().nullable(),
  sale_amount: z.number().min(0),
  currency: z.string().trim().min(3).max(8).default("COP"),
  customer_name: z.string().trim().max(160).optional().nullable(),
  customer_phone: z.string().trim().max(40).optional().nullable(),
  customer_email: z.string().email().max(160).optional().nullable(),
  document_id: z.string().trim().max(40).optional().nullable(),
  product_name: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  branch_id: z.string().uuid().optional().nullable(),
  expires_mode: z.enum(expirationPresets).default("NONE"),
  expires_at: z.string().datetime().optional().nullable(),
  expiration_days: z.number().int().min(1).max(365).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  benefit: strategicBenefitSchema,
});

const qrBatchSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  quantity: z.number().int().min(1).max(5000),
  campaign_id: z.string().uuid().optional().nullable(),
  qr_origin_type: z.enum(qrOriginTypes).refine((value) => !["POST_SALE", "TRIVIA_LAUNCHER", "INTERACTIVE_ACTIVATION"].includes(value), "This origin type is not valid for batches."),
  channel_use: z.enum([
    "etiqueta",
    "empaque",
    "volante",
    "evento",
    "feria",
    "influencer",
    "whatsapp",
    "redes-sociales",
    "pauta",
    "alianza",
    "referido",
    "activacion-marca",
    "producto",
    "mostrador",
    "campana-interna",
    "punto-de-venta",
  ]),
  claim_required: z.boolean().default(true),
  expires_mode: z.enum(expirationPresets).default("NONE"),
  expires_at: z.string().datetime().optional().nullable(),
  expiration_days: z.number().int().min(1).max(365).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  benefit: strategicBenefitSchema,
});

const affiliateReferralQrBatchSchema = z.object({
  affiliate_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  notes: z.string().trim().max(2000).optional().nullable(),
  expires_mode: z.enum(expirationPresets).default("NONE"),
  expires_at: z.string().datetime().optional().nullable(),
  expiration_days: z.number().int().min(1).max(365).optional().nullable(),
  benefit: strategicBenefitSchema.default({
    benefit_type: "CUSTOM",
    benefit_label: "Recomendacion de afiliado",
    benefit_value: {},
  }),
});

const triviaAnswerKeys = ["A", "B", "C", "D"];
const activationTypes = [
  "TRIVIA",
  "OPEN_QUESTION",
  "SURVEY",
  "SPIN_DISCOVER",
  "THERMOMETER",
];

const interactiveActivationCategories = [
  "commercial",
  "survey",
  "touch",
  "minigame",
  "premium",
  "physical_store",
  "referral",
  "intent",
];

const interactiveRewardModes = [
  "fixed",
  "by_score",
  "by_answer",
  "by_choice",
  "by_position",
  "by_profile",
  "manual_approval",
];

const interactiveActivationTypes = [
  "TRIVIA_QUIZ",
  "OPEN_QUESTION",
  "FLEX_SURVEY",
  "QUICK_VOTE",
  "QUICK_DIAGNOSTIC",
  "BENEFIT_SELECTOR",
  "SPIN_DISCOVER",
  "SCRATCH_WIN",
  "TAP_REVEAL",
  "CHOOSE_DOOR",
  "DISCOUNT_THERMOMETER",
  "LUCK_METER",
  "REWARD_TRAFFIC_LIGHT",
  "HIDDEN_CODE",
  "SPACE_SHOOTER",
  "BREAKOUT",
  "SNAKE",
  "CATCH_PRIZE",
  "MEMORY_PAIRS",
  "FAST_TAP",
  "MINI_MAZE",
  "VIP_EXPERIENCE_SELECTOR",
  "STYLE_PROFILE",
  "GIFT_CURATOR",
  "PRIVATE_INVITATION",
  "PREMIUM_NEED_DIAGNOSTIC",
  "SEALED_LETTER",
  "SILENT_AUCTION_INTENT",
  "EXPERIENCE_RESERVATION",
  "PREMIUM_ACCESS_CERTIFICATE",
  "STORE_CHECKIN",
  "CHECKOUT_REWARD",
  "TOUCH_SATISFACTION",
  "PREFERENCE_WALL",
  "NEXT_PURCHASE_PICKER",
  "INVOICE_UNLOCK",
  "PURCHASE_AMOUNT_ACTIVATION",
  "PURCHASED_PRODUCT_ACTIVATION",
  "TIME_BASED_ACTIVATION",
  "BRANCH_BASED_ACTIVATION",
  "REFERRAL_CHALLENGE",
  "RECOMMENDATION_CHAIN",
  "GROUP_BENEFIT",
  "DOUBLE_PASS",
  "BRAND_ALLIANCE",
  "WAITLIST",
  "PRESALE_BENEFIT",
  "INCENTIVIZED_QUOTE",
  "APPOINTMENT_REWARD",
  "DORMANT_CUSTOMER_RECOVERY",
];

const interactiveRewardTypeSchema = z.enum([
  "discount_percentage",
  "discount_value",
  "reward_pass",
  "gift_card",
  "points",
  "free_item",
  "vip_access",
  "appointment",
  "custom_benefit",
  ...benefitTypes,
]);

const interactiveQuestionSchema = z.object({
  id: z.string().trim().max(80).optional(),
  question_text: z.string().trim().min(2).max(500).optional(),
  question: z.string().trim().min(2).max(500).optional(),
  question_type: z.string().trim().min(2).max(80).optional(),
  type: z.string().trim().min(2).max(80).optional(),
  options: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]).optional().default([]),
  required: z.boolean().default(true),
  order_index: z.number().int().min(0).optional(),
  scoring_rules: z.record(z.string(), z.unknown()).optional().nullable(),
  branching_rules: z.record(z.string(), z.unknown()).optional().nullable(),
}).refine((question) => question.question_text || question.question, "La pregunta necesita texto.");

const interactiveScoreRewardRuleSchema = z.object({
  min_score: z.number().int().min(0),
  max_score: z.number().int().min(0).optional().nullable(),
  reward_type: interactiveRewardTypeSchema.optional().default("custom_benefit"),
  reward_value: z.record(z.string(), z.unknown()).optional().default({}),
  reward_label: z.string().trim().max(180).optional().nullable(),
  reward_conditions: z.string().trim().max(1000).optional().nullable(),
  max_awards: z.number().int().min(1).optional().nullable(),
}).refine((rule) => rule.max_score === null || rule.max_score === undefined || rule.max_score >= rule.min_score, "El max_score debe ser mayor o igual al min_score.");

const interactiveTouchRewardZoneSchema = z.object({
  label: z.string().trim().min(1).max(120),
  position_percent: z.number().min(0).max(100).optional().nullable(),
  start_percent: z.number().min(0).max(100).optional().nullable(),
  end_percent: z.number().min(0).max(100).optional().nullable(),
  reward_type: interactiveRewardTypeSchema.optional().default("custom_benefit"),
  reward_value: z.record(z.string(), z.unknown()).optional().default({}),
  reward_label: z.string().trim().min(2).max(180),
  reward_conditions: z.string().trim().max(1000).optional().nullable(),
  max_awards: z.number().int().min(1).optional().nullable(),
}).refine((zone) => zone.position_percent !== null && zone.position_percent !== undefined
  || (zone.start_percent !== null && zone.start_percent !== undefined && zone.end_percent !== null && zone.end_percent !== undefined),
  "Configura position_percent o rango start/end.");

const interactiveActivationCreateSchema = z.object({
  activation_type: z.enum(interactiveActivationTypes),
  category: z.enum(interactiveActivationCategories).optional(),
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().max(1200).optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "active", "paused", "closed", "archived"]).default("active"),
  reward_ticket_cost: z.number().int().min(1).max(100).default(1),
  reward_mode: z.enum(interactiveRewardModes).default("fixed"),
  reward_config: z.record(z.string(), z.unknown()).optional().default({}),
  game_config: z.record(z.string(), z.unknown()).optional().default({}),
  interaction_config: z.record(z.string(), z.unknown()).optional().default({}),
  capture_config: z.record(z.string(), z.unknown()).optional().default({}),
  visual_config: z.record(z.string(), z.unknown()).optional().default({}),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  max_participants: z.number().int().min(1).max(1000000).optional().nullable(),
  max_rewards: z.number().int().min(1).max(1000000).optional().nullable(),
  max_winners: z.number().int().min(1).max(1000000).optional().nullable(),
  terms: z.string().trim().max(4000).optional().nullable(),
  questions: z.array(interactiveQuestionSchema).max(50).optional().default([]),
  score_rewards: z.array(interactiveScoreRewardRuleSchema).max(30).optional().default([]),
  touch_zones: z.array(interactiveTouchRewardZoneSchema).max(30).optional().default([]),
  benefit: strategicBenefitSchema.optional(),
}).superRefine((body, ctx) => {
  if (body.reward_mode === "by_score" && !body.score_rewards.some((rule) => rule.reward_label)) {
    ctx.addIssue({ code: "custom", path: ["score_rewards"], message: "Configura al menos un rango de score con beneficio." });
  }
  if (body.reward_mode === "by_position" && !body.touch_zones.length) {
    ctx.addIssue({ code: "custom", path: ["touch_zones"], message: "Configura zonas o puntos tactiles para el beneficio." });
  }
  if (body.reward_mode === "fixed" && !body.reward_config?.reward_label && !body.benefit?.benefit_label) {
    ctx.addIssue({ code: "custom", path: ["reward_config"], message: "Configura el beneficio fijo." });
  }
});

const interactiveActivationUpdateSchema = z.object({
  title: z.string().trim().min(4).max(160).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["draft", "active", "paused", "closed", "archived"]).optional(),
  reward_config: z.record(z.string(), z.unknown()).optional(),
  game_config: z.record(z.string(), z.unknown()).optional(),
  interaction_config: z.record(z.string(), z.unknown()).optional(),
  capture_config: z.record(z.string(), z.unknown()).optional(),
  visual_config: z.record(z.string(), z.unknown()).optional(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  max_participants: z.number().int().min(1).max(1000000).optional().nullable(),
  max_rewards: z.number().int().min(1).max(1000000).optional().nullable(),
  terms: z.string().trim().max(4000).optional().nullable(),
}).refine((body) => Object.keys(body).length > 0, {
  message: "No hay campos para actualizar.",
});

const publicInteractiveParticipantSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(5).max(40),
  email: z.string().email().max(160).optional().nullable(),
  document: z.string().trim().max(40).optional().nullable(),
  document_id: z.string().trim().max(40).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const publicInteractiveCompleteSchema = publicInteractiveParticipantSchema.partial().extend({
  participant_id: z.string().uuid().optional(),
  game_session_token: z.string().trim().optional().nullable(),
  answers: z.record(z.string(), z.unknown()).optional().default({}),
  score: z.number().int().min(0).optional(),
  duration_ms: z.number().int().min(0).optional(),
  selected_choice: z.union([z.string(), z.number()]).optional().nullable(),
  position_percent: z.number().min(0).max(100).optional().nullable(),
  result_profile: z.string().trim().max(160).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
}).superRefine((body, ctx) => {
  if (!body.participant_id && (!body.name || !body.phone)) {
    ctx.addIssue({ code: "custom", path: ["name"], message: "Nombre y telefono son requeridos si no existe participant_id." });
  }
});

const triviaQuestionSchema = z.object({
  question: z.string().trim().min(4).max(240),
  options: z.object({
    A: z.string().trim().min(1).max(160),
    B: z.string().trim().min(1).max(160),
    C: z.string().trim().min(1).max(160),
    D: z.string().trim().min(1).max(160),
  }),
  correct_answer: z.enum(triviaAnswerKeys),
});

const triviaLaunchSchema = z.object({
  activation_type: z.enum(activationTypes).default("TRIVIA"),
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  questions: z.array(triviaQuestionSchema).optional().default([]),
  open_question: z.object({
    question: z.string().trim().min(4).max(300),
    placeholder: z.string().trim().max(160).optional().nullable(),
  }).optional().nullable(),
  survey_questions: z.array(z.object({
    id: z.string().trim().max(40).optional(),
    question: z.string().trim().min(4).max(300),
    type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "SHORT_TEXT", "SCALE"]),
    options: z.array(z.string().trim().min(1).max(120)).max(8).optional().default([]),
    required: z.boolean().default(true),
  })).max(8).optional().default([]),
  reveal_cards: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    benefit_label: z.string().trim().min(2).max(160),
    benefit_type: z.enum(benefitTypes).optional(),
    benefit_value: benefitValueSchema.optional(),
  })).min(2).max(8).optional().default([]),
  spin_rewards: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    benefit_label: z.string().trim().min(2).max(160),
    benefit_type: z.enum(benefitTypes).optional(),
    benefit_value: benefitValueSchema.optional(),
  })).min(2).max(10).optional().default([]),
  thermometer_discounts: z.array(z.number().int().min(1).max(100)).min(3).max(9).optional().default([]),
  expires_mode: z.enum(expirationPresets).default("NONE"),
  expires_at: z.string().datetime().optional().nullable(),
  expiration_days: z.number().int().min(1).max(365).optional().nullable(),
  max_winners: z.number().int().min(1).max(100000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  benefit: strategicBenefitSchema,
}).superRefine((body, ctx) => {
  if (body.activation_type === "TRIVIA" && !body.questions.length) {
    ctx.addIssue({ code: "custom", path: ["questions"], message: "Agrega al menos una pregunta de trivia." });
  }
  if (body.activation_type === "OPEN_QUESTION" && !body.open_question?.question) {
    ctx.addIssue({ code: "custom", path: ["open_question"], message: "Configura la pregunta abierta." });
  }
  if (body.activation_type === "SURVEY" && !body.survey_questions.length) {
    ctx.addIssue({ code: "custom", path: ["survey_questions"], message: "Agrega al menos una pregunta de encuesta." });
  }
  if (body.activation_type === "SURVEY") {
    body.survey_questions.forEach((question, index) => {
      if (["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(question.type) && question.options.length < 2) {
        ctx.addIssue({ code: "custom", path: ["survey_questions", index, "options"], message: "Las preguntas de opcion necesitan minimo 2 opciones." });
      }
    });
  }
  if (body.activation_type === "SPIN_DISCOVER" && body.reveal_cards.length < 2 && body.spin_rewards.length < 2) {
    ctx.addIssue({ code: "custom", path: ["reveal_cards"], message: "Configura al menos 2 cards o premios para descubrir." });
  }
  if (body.activation_type === "THERMOMETER" && body.thermometer_discounts.length < 3) {
    ctx.addIssue({ code: "custom", path: ["thermometer_discounts"], message: "Configura al menos 3 valores para el termometro." });
  }
});

const publicTriviaSubmitSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(5).max(40),
  email: z.string().email().max(160).optional().nullable(),
  document_id: z.string().trim().max(40).optional().nullable(),
  answers: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const qrClaimSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().email().max(160).optional().nullable(),
  document_id: z.string().trim().max(40).optional().nullable(),
  source: z.string().trim().max(80).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

module.exports = {
  validate,
  loginSchema,
  generateQrSchema,
  qrOriginTypes,
  benefitTypes,
  postSaleQrSchema,
  qrBatchSchema,
  affiliateReferralQrBatchSchema,
  interactiveActivationCreateSchema,
  interactiveActivationUpdateSchema,
  publicInteractiveParticipantSchema,
  publicInteractiveCompleteSchema,
  triviaLaunchSchema,
  publicTriviaSubmitSchema,
  qrClaimSchema,
};
