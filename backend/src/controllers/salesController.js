const { z } = require("zod");
const { query } = require("../config/db");
const { canAccessBusiness } = require("../middleware/auth");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { validate } = require("../utils/validators");

const attributedSaleSchema = z.object({
  had_sale: z.boolean().default(true),
  sale_amount: z.number().min(0).default(0),
  currency: z.string().trim().min(3).max(3).default("COP"),
  branch_id: z.string().uuid().optional().nullable(),
  payment_method: z.string().trim().max(80).optional().nullable(),
  product_or_service: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

async function createAttributedSale(req, res, next) {
  try {
    const body = validate(attributedSaleSchema, req.body);
    const redemption = await query(
      `select rd.*, q.id as qr_code_id
       from redemptions rd
       join qr_codes q on q.id = rd.qr_code_id
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

    const result = await query(
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
    res.status(201).json({ sale: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

module.exports = { createAttributedSale };
