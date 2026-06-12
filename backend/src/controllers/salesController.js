const { z } = require("zod");
const { query, withTransaction } = require("../config/db");
const { canAccessBusiness } = require("../middleware/auth");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { validate } = require("../utils/validators");

const AFFILIATE_POINTS_PER_PESO = 1000;
const REFERRAL_POINTS_RATE = 0.2;

const attributedSaleSchema = z.object({
  had_sale: z.boolean().default(true),
  sale_amount: z.number().min(0).default(0),
  currency: z.string().trim().min(3).max(3).default("COP"),
  branch_id: z.string().uuid().optional().nullable(),
  payment_method: z.string().trim().max(80).optional().nullable(),
  product_or_service: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

function calculateReferralPoints(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.ceil((value / AFFILIATE_POINTS_PER_PESO) * REFERRAL_POINTS_RATE);
}

async function createAttributedSale(req, res, next) {
  try {
    const body = validate(attributedSaleSchema, req.body);
    const redemption = await query(
      `select
         rd.*,
         q.id as qr_code_id,
         q.origin_type,
         q.affiliate_id,
         p.name as player_name,
         p.email as player_email,
         p.phone as player_phone,
         p.document_id as player_document_id
       from redemptions rd
       join qr_codes q on q.id = rd.qr_code_id
       left join players p on p.id = rd.player_id
       where rd.id = $1`,
      [req.params.id]
    );
    const row = redemption.rows[0];
    if (!row) {
      throw notFound("Redemption not found.");
    }
    if (!canAccessBusiness(req.user, row.business_id)) {
      throw forbidden("You cannot register sales for this business.");
    }
    if (!body.had_sale) {
      return res.json({ sale: null, message: "Redemption marked without sale." });
    }
    if (body.sale_amount <= 0) {
      throw badRequest("Ingresa un valor pagado mayor a 0 o marca la redencion como sin venta.");
    }

    const result = await withTransaction(async (client) => {
      const saleResult = await client.query(
        `insert into attributed_sales
          (business_id, campaign_id, qr_code_id, redemption_id, player_id, sale_amount, currency,
           sale_confirmed_by_user_id, branch_id, payment_method, product_or_service, notes)
         values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9::uuid, $10::uuid), $11, $12, $13)
         on conflict (redemption_id) do update
         set sale_amount = excluded.sale_amount,
             currency = excluded.currency,
             sale_confirmed_by_user_id = excluded.sale_confirmed_by_user_id,
             branch_id = excluded.branch_id,
             payment_method = excluded.payment_method,
             product_or_service = excluded.product_or_service,
             notes = excluded.notes
         returning *`,
        [
          row.business_id,
          row.campaign_id,
          row.qr_code_id,
          row.id,
          row.player_id,
          body.sale_amount,
          body.currency,
          req.user.id,
          body.branch_id || null,
          req.user.branch_id || null,
          body.payment_method || null,
          body.product_or_service || null,
          body.notes || null,
        ]
      );
      const attributedSale = saleResult.rows[0];
      let referral = null;

      if (row.origin_type === "AFFILIATE_REFERRAL" && row.affiliate_id) {
        const referralPoints = calculateReferralPoints(body.sale_amount);
        const existingResult = await client.query(
          `select *
           from business_sales
           where business_id = $1 and qr_code_id = $2
           for update`,
          [row.business_id, row.qr_code_id]
        );
        const existing = existingResult.rows[0] || null;
        const previousPoints = Number(existing?.referral_points_awarded || 0);
        const pointDelta = referralPoints - previousPoints;
        let businessSale = null;

        if (existing) {
          const updated = await client.query(
            `update business_sales
             set campaign_id = $3,
                 customer_name = $4,
                 customer_phone = $5,
                 customer_email = $6,
                 customer_document_id = $7,
                 product_name = $8,
                 sale_amount = $9,
                 currency = $10,
                 seller_user_id = $11,
                 branch_id = coalesce($12::uuid, $13::uuid),
                 acquisition_source = 'FRIEND_REFERRAL',
                 acquisition_channel = 'QR recomendacion afiliado',
                 referred_affiliate_id = $14,
                 referral_points_awarded = $15,
                 notes = $16,
                 metadata = metadata || $17::jsonb
             where id = $1 and business_id = $2
             returning *`,
            [
              existing.id,
              row.business_id,
              row.campaign_id || null,
              row.player_name || null,
              row.player_phone || null,
              row.player_email || null,
              row.player_document_id || null,
              body.product_or_service || null,
              body.sale_amount,
              body.currency,
              req.user.id,
              body.branch_id || null,
              req.user.branch_id || null,
              row.affiliate_id,
              referralPoints,
              body.notes || null,
              JSON.stringify({
                source: "affiliate_referral_qr",
                redemption_id: row.id,
                attributed_sale_id: attributedSale.id,
              }),
            ]
          );
          businessSale = updated.rows[0];
        } else {
          const inserted = await client.query(
            `insert into business_sales
              (business_id, campaign_id, qr_code_id, customer_name, customer_phone, customer_email,
               customer_document_id, product_name, sale_amount, currency, seller_user_id, branch_id,
               acquisition_source, acquisition_channel, referred_affiliate_id, referral_points_awarded, notes, metadata)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, coalesce($12::uuid, $13::uuid),
               'FRIEND_REFERRAL', 'QR recomendacion afiliado', $14, $15, $16, $17)
             returning *`,
            [
              row.business_id,
              row.campaign_id || null,
              row.qr_code_id,
              row.player_name || null,
              row.player_phone || null,
              row.player_email || null,
              row.player_document_id || null,
              body.product_or_service || null,
              body.sale_amount,
              body.currency,
              req.user.id,
              body.branch_id || null,
              req.user.branch_id || null,
              row.affiliate_id,
              referralPoints,
              body.notes || null,
              {
                source: "affiliate_referral_qr",
                redemption_id: row.id,
                attributed_sale_id: attributedSale.id,
              },
            ]
          );
          businessSale = inserted.rows[0];
        }

        if (pointDelta !== 0) {
          await client.query(
            `update affiliates
             set points_total = points_total + $3
             where id = $1 and business_id = $2`,
            [row.affiliate_id, row.business_id, pointDelta]
          );
          await client.query(
            `insert into affiliate_point_ledger
              (business_id, affiliate_id, created_by_user_id, amount, points_awarded, reason, metadata)
             values ($1, $2, $3, $4, $5, 'REFERRAL_PURCHASE_QR', $6)`,
            [
              row.business_id,
              row.affiliate_id,
              req.user.id,
              body.sale_amount,
              pointDelta,
              {
                business_sale_id: businessSale.id,
                attributed_sale_id: attributedSale.id,
                qr_code_id: row.qr_code_id,
                redemption_id: row.id,
                previous_points: previousPoints,
                referral_points: referralPoints,
                referred_customer: row.player_name || row.player_phone || row.player_document_id || null,
              },
            ]
          );
        }

        referral = {
          affiliate_id: row.affiliate_id,
          business_sale_id: businessSale.id,
          points_awarded: referralPoints,
          points_delta: pointDelta,
          acquisition_source: "FRIEND_REFERRAL",
          acquisition_channel: "QR recomendacion afiliado",
        };
      }

      return { sale: attributedSale, referral };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { createAttributedSale };
