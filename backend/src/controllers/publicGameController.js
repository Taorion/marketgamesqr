const { z } = require("zod");
const { env } = require("../config/env");
const { query } = require("../config/db");
const { generateQr } = require("../services/qrService");
const { validate } = require("../utils/validators");

const motoRewardSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(120),
  documentId: z.string().regex(/^[0-9]{6,12}$/),
  email: z.string().email().max(160),
  phone: z.string().regex(/^[0-9]{7,15}$/),
  lockedPercent: z.number().int().min(0).max(100),
});

async function createMotoRewardQr(req, res, next) {
  try {
    const body = validate(motoRewardSchema, req.body);
    const fullName = `${body.firstName} ${body.lastName}`;

    const result = await generateQr(
      {
        business_id: env.motoBusinessId,
        campaign_id: env.motoCampaignId || undefined,
        game_id: env.motoGameId,
        reward_id: env.motoRewardId,
        player: {
          name: fullName,
          email: body.email,
          phone: body.phone,
          document_id: body.documentId,
          metadata: {
            source: "moto-pescuezo",
            locked_percent: body.lockedPercent,
          },
        },
        questionnaire: {
          first_name: body.firstName,
          last_name: body.lastName,
          document_id: body.documentId,
          email: body.email,
          phone: body.phone,
          locked_percent: body.lockedPercent,
        },
        metadata: {
          source: "moto-pescuezo",
          reward_flow: "win-form-submit",
        },
      },
      {
        type: "game",
        game: {
          id: env.motoGameId,
          business_id: env.motoBusinessId,
        },
      }
    );

    res.status(201).json({
      qr_content: result.qr_content,
      validator_url: result.validator_url,
      qr_image_data_url: result.qr_image_data_url,
      qr_code: {
        id: result.qr_code.id,
        status: result.qr_code.status,
        created_at: result.qr_code.created_at,
        expires_at: result.qr_code.expires_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

const demoQrSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(120).optional().default(""),
  documentId: z.string().regex(/^[0-9]{6,12}$/),
  email: z.string().email().max(160),
  phone: z.string().regex(/^[0-9]{7,15}$/),
  campaignLabel: z.string().trim().min(2).max(120).optional(),
  source: z.string().trim().min(2).max(80).optional(),
});

const productPreferenceSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(120),
  documentId: z.string().regex(/^[0-9]{6,12}$/),
  email: z.string().email().max(160),
  phone: z.string().regex(/^[0-9]{7,15}$/),
  favoriteProduct: z.enum(["billetera", "correa", "morral", "chaqueta", "maletin"]),
  purchaseWindow: z.enum(["hoy", "esta-semana", "este-mes", "solo-explorando"]),
  giftBudget: z.enum(["50000-80000", "80000-120000", "120000-200000", "200000+"]),
  preferredChannel: z.enum(["whatsapp", "instagram", "facebook", "correo"]),
  purchaseIntent: z.enum(["regalo-padre", "compra-propia", "regalo-pareja", "otro"]),
  stylePreference: z.enum(["clasico", "moderno", "casual", "ejecutivo"]),
  usageContext: z.enum(["oficina", "diario", "viaje", "regalo-especial"]),
  preferredContactTime: z.enum(["manana", "tarde", "noche"]),
});

const publicCampaignLeadQrSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().email().max(160).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  document_id: z.string().trim().max(40).optional().nullable(),
  source: z.string().trim().min(2).max(80).optional().nullable(),
  referrer: z.string().trim().max(120).optional().nullable(),
  subject: z.string().trim().max(160).optional().nullable(),
  answers: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

async function resolveCampaignCaptureContext(businessSlug, campaignSlug) {
  const result = await query(
    `select
       c.id as campaign_id,
       c.name as campaign_name,
       c.public_slug,
       c.status,
       c.starts_at,
       c.ends_at,
       coalesce(c.game_id, g.id) as game_id,
       coalesce(c.reward_id, r.id) as reward_id,
       b.id as business_id
     from businesses b
     join campaigns c on c.business_id = b.id
     left join lateral (
       select id
       from games
       where business_id = b.id and is_active = true
       order by created_at asc
       limit 1
     ) g on true
     left join lateral (
       select id
       from rewards
       where business_id = b.id and is_active = true
       order by created_at asc
       limit 1
     ) r on true
     where b.slug = $1
       and c.public_slug = $2
       and b.is_active = true`,
    [businessSlug, campaignSlug]
  );
  const campaign = result.rows[0];
  if (!campaign) {
    const error = new Error("Campana publica no encontrada.");
    error.status = 404;
    throw error;
  }
  if (campaign.status !== "ACTIVE") {
    const error = new Error("La campana aun no esta activa para capturar leads.");
    error.status = 409;
    throw error;
  }
  const now = new Date();
  if (campaign.starts_at && new Date(campaign.starts_at) > now) {
    const error = new Error("La campana todavia no ha iniciado.");
    error.status = 409;
    throw error;
  }
  if (campaign.ends_at && new Date(campaign.ends_at) <= now) {
    const error = new Error("La campana ya finalizo.");
    error.status = 409;
    throw error;
  }
  if (!campaign.game_id || !campaign.reward_id) {
    const error = new Error("La campana necesita un juego y beneficio activo para emitir QR publicos.");
    error.status = 409;
    throw error;
  }
  return campaign;
}

async function createPublicCampaignLeadQr(req, res, next) {
  try {
    const body = validate(publicCampaignLeadQrSchema, req.body);
    const context = await resolveCampaignCaptureContext(req.params.businessSlug, req.params.campaignSlug);
    const source = body.source || body.referrer || "public-campaign";
    const subject = body.subject || body.referrer || context.campaign_name;

    const result = await generateQr(
      {
        business_id: context.business_id,
        campaign_id: context.campaign_id,
        game_id: context.game_id,
        reward_id: context.reward_id,
        player: {
          name: body.name,
          email: body.email || undefined,
          phone: body.phone || undefined,
          document_id: body.document_id || undefined,
          metadata: {
            source,
            referrer: body.referrer || null,
            attribution_source: source,
            attribution_subject: subject,
            public_campaign_slug: context.public_slug,
            ...(body.metadata || {}),
          },
        },
        questionnaire: {
          name: body.name,
          email: body.email || null,
          phone: body.phone || null,
          document_id: body.document_id || null,
          source,
          referrer: body.referrer || null,
          campaign_label: context.campaign_name,
          attribution_subject: subject,
          ...(body.answers || {}),
        },
        metadata: {
          source,
          attribution_source: source,
          attribution_subject: subject,
          campaign_label: context.campaign_name,
          public_campaign_slug: context.public_slug,
          qr_creation_context: "public_campaign_landing",
          ...(body.metadata || {}),
        },
      },
      {
        type: "game",
        game: {
          id: context.game_id,
          business_id: context.business_id,
        },
      }
    );

    res.status(201).json({
      campaign: {
        id: context.campaign_id,
        name: context.campaign_name,
        public_slug: context.public_slug,
      },
      qr_content: result.qr_content,
      validator_url: result.validator_url,
      qr_image_data_url: result.qr_image_data_url,
      qr_code: {
        id: result.qr_code.id,
        status: result.qr_code.status,
        created_at: result.qr_code.created_at,
        expires_at: result.qr_code.expires_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

const demoTypes = new Map([
  ["form-qr", "Formulario directo"],
  ["tiktok-drop", "Campana TikTok/Reels"],
  ["instant-win", "Premio instantaneo"],
  ["event", "Activacion en evento"],
]);

async function createDemoQr(req, res, next) {
  try {
    const demoType = req.params.type;
    const defaultLabel = demoTypes.get(demoType);
    if (!defaultLabel) {
      const error = new Error("Demo type not found.");
      error.status = 404;
      throw error;
    }

    const body = validate(demoQrSchema, req.body);
    const fullName = `${body.firstName} ${body.lastName}`.trim();
    const campaignLabel = body.campaignLabel || defaultLabel;

    const result = await generateQr(
      {
        business_id: env.motoBusinessId,
        game_id: env.motoGameId,
        reward_id: env.motoRewardId,
        player: {
          name: fullName,
          email: body.email,
          phone: body.phone,
          document_id: body.documentId,
          metadata: {
            demo_type: demoType,
            campaign_label: campaignLabel,
          },
        },
        questionnaire: {
          first_name: body.firstName,
          last_name: body.lastName,
          document_id: body.documentId,
          email: body.email,
          phone: body.phone,
          campaign_label: campaignLabel,
          demo_type: demoType,
          source: body.source || demoType,
        },
        metadata: {
          source: body.source || demoType,
          demo_type: demoType,
          campaign_label: campaignLabel,
        },
      },
      {
        type: "game",
        game: {
          id: env.motoGameId,
          business_id: env.motoBusinessId,
        },
      }
    );

    res.status(201).json({
      demo_type: demoType,
      campaign_label: campaignLabel,
      qr_content: result.qr_content,
      validator_url: result.validator_url,
      qr_image_data_url: result.qr_image_data_url,
      qr_code: {
        id: result.qr_code.id,
        status: result.qr_code.status,
        created_at: result.qr_code.created_at,
        expires_at: result.qr_code.expires_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createProductPreferenceQr(req, res, next) {
  try {
    const body = validate(productPreferenceSchema, req.body);
    const fullName = `${body.firstName} ${body.lastName}`;

    const answers = {
      first_name: body.firstName,
      last_name: body.lastName,
      document_id: body.documentId,
      email: body.email,
      phone: body.phone,
      favorite_product: body.favoriteProduct,
      purchase_window: body.purchaseWindow,
      gift_budget: body.giftBudget,
      preferred_channel: body.preferredChannel,
      purchase_intent: body.purchaseIntent,
      style_preference: body.stylePreference,
      usage_context: body.usageContext,
      preferred_contact_time: body.preferredContactTime,
      campaign_label: "Dia del Padre Cuero",
      source: "social-landing-dia-del-padre",
    };

    const result = await generateQr(
      {
        business_id: env.motoBusinessId,
        campaign_id: env.productCampaignId || undefined,
        game_id: env.motoGameId,
        reward_id: env.motoRewardId,
        player: {
          name: fullName,
          email: body.email,
          phone: body.phone,
          document_id: body.documentId,
          metadata: {
            source: "social-landing-dia-del-padre",
            favorite_product: body.favoriteProduct,
            purchase_intent: body.purchaseIntent,
            gift_budget: body.giftBudget,
            purchase_window: body.purchaseWindow,
            preferred_channel: body.preferredChannel,
            style_preference: body.stylePreference,
            usage_context: body.usageContext,
            preferred_contact_time: body.preferredContactTime,
          },
        },
        questionnaire: answers,
        metadata: {
          source: "social-landing-dia-del-padre",
          campaign_label: "Dia del Padre Cuero",
          favorite_product: body.favoriteProduct,
          coupon_value: 30000,
          minimum_purchase: 50000,
        },
      },
      {
        type: "game",
        game: {
          id: env.motoGameId,
          business_id: env.motoBusinessId,
        },
      }
    );

    res.status(201).json({
      campaign_label: "Dia del Padre Cuero",
      qr_content: result.qr_content,
      validator_url: result.validator_url,
      qr_image_data_url: result.qr_image_data_url,
      qr_code: {
        id: result.qr_code.id,
        status: result.qr_code.status,
        created_at: result.qr_code.created_at,
        expires_at: result.qr_code.expires_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createMotoRewardQr,
  createDemoQr,
  createProductPreferenceQr,
  createPublicCampaignLeadQr,
};
