const { z } = require("zod");
const { query } = require("../config/db");
const { canAccessBusiness } = require("../middleware/auth");
const { badRequest, forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");

const campaignSchema = z.object({
  game_id: z.string().uuid().optional().nullable(),
  reward_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(140),
  type: z.enum(["GAME", "FORM", "TIKTOK", "EVENT", "INSTANT_WIN", "INFLUENCER"]).default("FORM"),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED"]).default("ACTIVE"),
  public_slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  max_qr_total: z.number().int().positive().optional().nullable(),
  max_redemptions_total: z.number().int().positive().optional().nullable(),
  max_qr_per_person: z.number().int().positive().max(100).default(1),
  qr_expires_after_hours: z.number().int().positive().optional().nullable(),
  requires_document_check: z.boolean().default(true),
});

function ensureBusinessAccess(user, businessId) {
  if (!canAccessBusiness(user, businessId)) {
    throw forbidden("You cannot access this business.");
  }
}

async function listCampaigns(req, res, next) {
  try {
    const businessId = req.params.id;
    ensureBusinessAccess(req.user, businessId);
    const result = await query(
      `select
         c.*,
         g.name as game_name,
         r.name as reward_name,
         count(distinct q.id)::int as qr_generated,
         count(distinct rd.id)::int as redemptions
       from campaigns c
       left join games g on g.id = c.game_id
       left join rewards r on r.id = c.reward_id
       left join qr_codes q on q.campaign_id = c.id
       left join redemptions rd on rd.campaign_id = c.id
       where c.business_id = $1
       group by c.id, g.name, r.name
       order by c.created_at desc`,
      [businessId]
    );
    res.json({ campaigns: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createCampaign(req, res, next) {
  try {
    const businessId = req.params.id;
    ensureBusinessAccess(req.user, businessId);
    if (!["ADMIN_MARKET_GAMES", "ADMIN"].includes(req.user.role)) {
      throw forbidden("Only Market Games admins can create campaigns.");
    }
    const body = validate(campaignSchema, req.body);

    if (body.game_id) {
      const game = await query("select id from games where id = $1 and business_id = $2", [body.game_id, businessId]);
      if (!game.rowCount) {
        throw badRequest("Game does not belong to this business.");
      }
    }
    if (body.reward_id) {
      const reward = await query("select id from rewards where id = $1 and business_id = $2", [body.reward_id, businessId]);
      if (!reward.rowCount) {
        throw badRequest("Reward does not belong to this business.");
      }
    }

    const result = await query(
      `insert into campaigns
        (business_id, game_id, reward_id, name, type, status, public_slug, starts_at, ends_at,
         max_qr_total, max_redemptions_total, max_qr_per_person, qr_expires_after_hours, requires_document_check)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       returning *`,
      [
        businessId,
        body.game_id || null,
        body.reward_id || null,
        body.name,
        body.type,
        body.status,
        body.public_slug,
        body.starts_at || null,
        body.ends_at || null,
        body.max_qr_total || null,
        body.max_redemptions_total || null,
        body.max_qr_per_person,
        body.qr_expires_after_hours || null,
        body.requires_document_check,
      ]
    );
    res.status(201).json({ campaign: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function listRewards(req, res, next) {
  try {
    const businessId = req.params.id;
    ensureBusinessAccess(req.user, businessId);
    const result = await query(
      `select id, name, description, display_in_validator, is_active, created_at
       from rewards
       where business_id = $1
       order by created_at desc`,
      [businessId]
    );
    res.json({ rewards: result.rows });
  } catch (error) {
    next(error);
  }
}

async function listLeads(req, res, next) {
  try {
    const businessId = req.params.id;
    ensureBusinessAccess(req.user, businessId);
    const result = await query(
      `select p.id, p.name, p.document_id, p.phone, p.email, p.created_at, c.name as campaign_name,
              q.status as qr_status, rd.redeemed_at
       from players p
       left join campaigns c on c.id = p.campaign_id
       left join qr_codes q on q.player_id = p.id
       left join redemptions rd on rd.player_id = p.id
       where p.business_id = $1
       order by p.created_at desc
       limit 500`,
      [businessId]
    );
    res.json({ leads: result.rows });
  } catch (error) {
    next(error);
  }
}

async function listAnswers(req, res, next) {
  try {
    const businessId = req.params.id;
    ensureBusinessAccess(req.user, businessId);
    const result = await query(
      `select qu.id, qu.answers, qu.created_at, p.name, p.document_id, p.phone, p.email, c.name as campaign_name
       from questionnaires qu
       join players p on p.id = qu.player_id
       left join campaigns c on c.id = qu.campaign_id
       where qu.business_id = $1
       order by qu.created_at desc
       limit 500`,
      [businessId]
    );
    res.json({ answers: result.rows });
  } catch (error) {
    next(error);
  }
}

module.exports = { listCampaigns, createCampaign, listRewards, listLeads, listAnswers };
