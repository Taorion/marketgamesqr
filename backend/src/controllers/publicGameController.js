const { z } = require("zod");
const { env } = require("../config/env");
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

module.exports = { createMotoRewardQr, createDemoQr, createProductPreferenceQr };
