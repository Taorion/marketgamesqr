const { generateQr, getQrDetails, redeemQr } = require("../services/qrService");
const { query } = require("../config/db");
const { forbidden } = require("../utils/http");
const { mapPublicCreditAccount } = require("../services/qrCreditService");
const { validate, generateQrSchema } = require("../utils/validators");

async function generate(req, res, next) {
  try {
    const body = validate(generateQrSchema, req.body);
    const actor = req.gameAuth ? { type: "game", game: req.gameAuth } : { type: "user", user: req.user };
    if (!req.gameAuth && !req.user) {
      throw forbidden("Use a valid JWT or X-Game-Api-Key to generate QR codes.");
    }
    const result = await generateQr(body, actor);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function validateQr(req, res, next) {
  try {
    res.json(await getQrDetails(req.params.token, req.user));
  } catch (error) {
    next(error);
  }
}

async function redeem(req, res, next) {
  try {
    res.json(await redeemQr(req.params.token, req.user));
  } catch (error) {
    next(error);
  }
}

async function myQrCredits(req, res, next) {
  try {
    if (!req.user.business_id) {
      return res.json({ credit_account: null });
    }
    const result = await query(
      `select a.*,
              coalesce((
                select sum(l.delta_qr)::int
                from business_qr_credit_ledger l
                where l.business_id = a.business_id
                  and l.delta_qr > 0
                  and (
                    lower(coalesce(l.public_label, '')) like '%cortesia%'
                    or lower(coalesce(l.notes, '')) like '%cortesia%'
                  )
              ), 0)::int as qr_courtesy_total
       from business_qr_credit_accounts a
       where a.business_id = $1`,
      [req.user.business_id]
    );
    res.json({ credit_account: mapPublicCreditAccount(result.rows[0]) });
  } catch (error) {
    next(error);
  }
}

module.exports = { generate, validateQr, redeem, myQrCredits };
