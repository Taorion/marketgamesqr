const QRCode = require("qrcode");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { canAccessBusiness } = require("../middleware/auth");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { createSecureToken, normalizeToken } = require("../utils/token");
const { logValidation, logQrEvent } = require("./auditService");
const { consumeQrCredit } = require("./qrCreditService");
const { assertStandaloneBusinessFeature } = require("./subscriptionService");
const { resolveQrContact, registerRedemptionIntake } = require("./redemptionLeadIntakeService");
const {
  calculateBenefitCheckout,
  describeBenefitApplication,
} = require("./benefitCheckoutService");
const {
  affiliatePointRuleMetadata,
  getAffiliatePointRules,
  referralPointsForAmount,
} = require("./affiliatePointRulesService");

const QR_VALIDATOR_ROLES = new Set(["BUSINESS_OWNER", "BUSINESS_MANAGER", "VALIDATOR", "ADMIN", "ADMIN_MARKET_GAMES", "ADMIN_Qori"]);

function assertQrValidator(user) {
  if (!QR_VALIDATOR_ROLES.has(user?.role)) {
    throw forbidden("Este rol no puede validar ni redimir tickets QR.");
  }
}

function buildValidatorUrl(token) {
  const target = new URL("/empresa/", env.publicAppUrl || "http://localhost:3000");
  target.searchParams.set("view", "validator");
  target.searchParams.set("token", token);
  return target.toString();
}

async function generateQr(data, actor) {
  if (actor.type === "game") {
    if (actor.game.id !== data.game_id || actor.game.business_id !== data.business_id) {
      throw forbidden("The game API key cannot generate QR codes for this business or game.");
    }
  } else if (!canAccessBusiness(actor.user, data.business_id)) {
    throw forbidden("You cannot generate QR codes for this business.");
  }

  const token = createSecureToken();
  const validatorUrl = buildValidatorUrl(token);

  const result = await withTransaction(async (client) => {
    const business = await client.query("select id from businesses where id = $1 and is_active = true", [data.business_id]);
    if (!business.rowCount) {
      throw badRequest("Business does not exist or is inactive.");
    }

    const game = await client.query(
      "select id from games where id = $1 and business_id = $2 and is_active = true",
      [data.game_id, data.business_id]
    );
    if (!game.rowCount) {
      throw badRequest("Game does not exist for this business or is inactive.");
    }

    const reward = await client.query(
      "select id from rewards where id = $1 and business_id = $2 and is_active = true",
      [data.reward_id, data.business_id]
    );
    if (!reward.rowCount) {
      throw badRequest("Reward does not exist for this business or is inactive.");
    }

    let campaign = null;
    if (data.campaign_id) {
      const campaignResult = await client.query(
        `select *
         from campaigns
         where id = $1 and business_id = $2
         for update`,
        [data.campaign_id, data.business_id]
      );
      campaign = campaignResult.rows[0];
      if (!campaign || campaign.status !== "ACTIVE") {
        throw badRequest("Campaign does not exist or is not active.");
      }
      const now = new Date();
      if (campaign.starts_at && new Date(campaign.starts_at) > now) {
        throw badRequest("Campaign has not started yet.");
      }
      if (campaign.ends_at && new Date(campaign.ends_at) <= now) {
        throw badRequest("Campaign has ended.");
      }

      const usage = await client.query(
        `select
           count(distinct q.id)::int as generated,
           count(distinct rd.id)::int as redeemed
         from campaigns c
         left join qr_codes q on q.campaign_id = c.id
         left join redemptions rd on rd.campaign_id = c.id
         where c.id = $1
         group by c.id`,
        [campaign.id]
      );
      const generated = usage.rows[0]?.generated || 0;
      const redeemed = usage.rows[0]?.redeemed || 0;
      if (campaign.max_qr_total && generated >= campaign.max_qr_total) {
        throw badRequest("Campaign QR limit reached.");
      }
      if (campaign.max_redemptions_total && redeemed >= campaign.max_redemptions_total) {
        throw badRequest("Campaign redemption limit reached.");
      }
      if (campaign.max_qr_per_person && data.player.document_id) {
        const personUsage = await client.query(
          `select count(*)::int as total
           from players
           where campaign_id = $1 and document_id = $2`,
          [campaign.id, data.player.document_id]
        );
        if ((personUsage.rows[0]?.total || 0) >= campaign.max_qr_per_person) {
          throw badRequest("This person already received the maximum QR codes for this campaign.");
        }
      }
    }

    const expiresAt = data.expires_at ||
      (campaign?.qr_expires_after_hours
        ? new Date(Date.now() + campaign.qr_expires_after_hours * 60 * 60 * 1000).toISOString()
        : null);

    const player = await client.query(
      `insert into players (business_id, campaign_id, game_id, external_id, name, email, phone, document_id, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        data.business_id,
        data.campaign_id || null,
        data.game_id,
        data.player.external_id || null,
        data.player.name || null,
        data.player.email || null,
        data.player.phone || null,
        data.player.document_id || null,
        data.player.metadata || {},
      ]
    );

    const questionnaire = await client.query(
      `insert into questionnaires (business_id, campaign_id, game_id, player_id, answers)
       values ($1, $2, $3, $4, $5)
       returning id`,
      [data.business_id, data.campaign_id || null, data.game_id, player.rows[0].id, data.questionnaire || {}]
    );

    const qr = await client.query(
      `insert into qr_codes
        (business_id, campaign_id, game_id, player_id, reward_id, questionnaire_id, token, status, expires_at, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $9)
       returning id, business_id, campaign_id, game_id, player_id, reward_id, token, status, created_at, expires_at`,
      [
        data.business_id,
        data.campaign_id || null,
        data.game_id,
        player.rows[0].id,
        data.reward_id,
        questionnaire.rows[0].id,
        token,
        expiresAt,
        data.metadata || {},
      ]
    );

    await consumeQrCredit(
      client,
      data.business_id,
      qr.rows[0].id,
      actor.type === "user" ? actor.user.id : null
    );

    return qr.rows[0];
  });

  return {
    qr_code: result,
    qr_content: validatorUrl,
    validator_url: validatorUrl,
    qr_image_data_url: await QRCode.toDataURL(validatorUrl),
  };
}

async function getQrDetails(tokenInput, user) {
  assertQrValidator(user);
  const token = normalizeToken(tokenInput);
  if (!token) {
    throw badRequest("Token is required.");
  }

  const result = await query(
    `select
       q.*,
       b.name as business_name,
       b.slug as business_slug,
       c.name as campaign_name,
       c.type as campaign_type,
       g.name as game_name,
       r.name as reward_name,
       r.description as reward_description,
       r.display_in_validator as reward_display,
       qb.name as batch_name,
       qb.channel_use as batch_channel_use,
       bs.id as sale_id,
       bs.sale_amount,
       bs.currency as sale_currency,
       bs.product_name as sale_product_name,
       bs.notes as sale_notes,
       p.name as player_name,
       p.email as player_email,
       p.phone as player_phone,
       p.document_id as player_document_id,
       a.id as affiliate_id,
       a.full_name as affiliate_name,
       a.document_id as affiliate_document_id,
       a.phone as affiliate_phone
     from qr_codes q
     join businesses b on b.id = q.business_id
     left join campaigns c on c.id = q.campaign_id
     left join games g on g.id = q.game_id
     left join rewards r on r.id = q.reward_id
     left join qr_batches qb on qb.id = q.batch_id
     left join business_sales bs on bs.id = q.sale_id
     left join players p on p.id = q.player_id
     left join affiliates a on a.id = q.affiliate_id
     where q.token = $1`,
    [token]
  );

  const qr = result.rows[0];
  if (!qr) {
    await logValidation(query, {
      user_id: user.id,
      token_preview: token.slice(0, 10),
      result: "INVALID",
      message: "QR does not exist.",
    });
    return {
      status: "INVALID",
      allowed: false,
      message: "El QR no existe o fue inventado.",
    };
  }

  if (!canAccessBusiness(user, qr.business_id)) {
    await logValidation(query, {
      business_id: qr.business_id,
      campaign_id: qr.campaign_id,
      game_id: qr.game_id,
      qr_code_id: qr.id,
      user_id: user.id,
      token_preview: token.slice(0, 10),
      result: "OTHER_BUSINESS",
      message: "QR belongs to another business.",
    });
    return {
      status: "INVALID",
      allowed: false,
      message: "Este QR pertenece a otro negocio.",
      business: { id: qr.business_id, name: qr.business_name },
    };
  }

  await assertStandaloneBusinessFeature(user, qr.business_id, "qr_validator");

  const now = new Date();
  const isExpired = qr.expires_at && new Date(qr.expires_at) <= now;
  const effectiveStatus = qr.status === "ACTIVE" && isExpired ? "EXPIRED" : qr.status;

  if (effectiveStatus === "EXPIRED" && qr.status !== "EXPIRED") {
    await query("update qr_codes set status = 'EXPIRED' where id = $1 and status = 'ACTIVE'", [qr.id]);
  }

  await logValidation(query, {
    business_id: qr.business_id,
    campaign_id: qr.campaign_id,
    game_id: qr.game_id,
    qr_code_id: qr.id,
    user_id: user.id,
    token_preview: token.slice(0, 10),
    result: effectiveStatus,
    message: `QR validation returned ${effectiveStatus}.`,
  });

  await logQrEvent(query, {
    business_id: qr.business_id,
    campaign_id: qr.campaign_id,
    qr_code_id: qr.id,
    batch_id: qr.batch_id,
    player_id: qr.player_id,
    user_id: user.id,
    event_type: "QR_VALIDATED",
    message: `QR scan returned ${effectiveStatus}.`,
    metadata: {
      result: effectiveStatus,
      origin_type: qr.origin_type,
      affiliate_id: qr.affiliate_id || null,
      batch_id: qr.batch_id || null,
    },
  });

  return {
    status: effectiveStatus,
    allowed: effectiveStatus === "ACTIVE",
    message: buildStatusMessage(effectiveStatus),
    qr_code: {
      id: qr.id,
      origin_type: qr.origin_type,
      claim_required: qr.claim_required,
      claimed_at: qr.claimed_at,
      created_at: qr.created_at,
      expires_at: qr.expires_at,
      redeemed_at: qr.redeemed_at,
    },
    business: { id: qr.business_id, name: qr.business_name, slug: qr.business_slug },
    game: qr.game_id ? { id: qr.game_id, name: qr.game_name } : null,
    campaign: qr.campaign_id ? { id: qr.campaign_id, name: qr.campaign_name, type: qr.campaign_type } : null,
    reward: {
      id: qr.reward_id || null,
      name: qr.reward_name || qr.benefit_value?.label || "Beneficio estrategico",
      description: qr.reward_description || null,
      display: qr.reward_display || qr.benefit_value?.display || null,
      benefit_type: qr.benefit_type || null,
      benefit_value: qr.benefit_value || {},
    },
    benefit_application: describeBenefitApplication(
      qr.benefit_type,
      qr.benefit_value || {},
      qr.reward_name || qr.benefit_value?.label || "Beneficio estrategico"
    ),
    player: qr.player_id
      ? {
          id: qr.player_id,
          name: qr.player_name,
          email: qr.player_email,
          phone: qr.player_phone,
          document_id: qr.player_document_id,
        }
      : null,
    affiliate: qr.affiliate_id
      ? {
          id: qr.affiliate_id,
          name: qr.affiliate_name,
          document_id: qr.affiliate_document_id,
          phone: qr.affiliate_phone,
        }
      : null,
    sale: qr.sale_id
      ? {
          id: qr.sale_id,
          amount: qr.sale_amount,
          currency: qr.sale_currency,
          product_name: qr.sale_product_name,
          notes: qr.sale_notes,
        }
      : null,
    batch: qr.batch_name
      ? {
          id: qr.batch_id,
          name: qr.batch_name,
          channel_use: qr.batch_channel_use,
        }
      : null,
  };
}

async function recordAffiliateCheckout(client, qr, attributedSale, checkout, purchase, user) {
  const rules = await getAffiliatePointRules(qr.business_id, client);
  const points = referralPointsForAmount(checkout.final_total, rules);
  const ruleMetadata = affiliatePointRuleMetadata(rules);
  const existingResult = await client.query(
    `select * from business_sales where business_id = $1 and qr_code_id = $2 for update`,
    [qr.business_id, qr.id]
  );
  const existing = existingResult.rows[0] || null;
  const previousPoints = Number(existing?.referral_points_awarded || 0);
  const pointDelta = points - previousPoints;
  const productSummary = purchase.product_or_service
    || checkout.line_items.map((item) => `${item.name} x${item.quantity}`).join(", ").slice(0, 200)
    || null;
  const values = [
    qr.business_id,
    qr.campaign_id || null,
    qr.id,
    qr.player_name || null,
    qr.player_phone || null,
    qr.player_email || null,
    qr.player_document_id || null,
    productSummary,
    checkout.final_total,
    purchase.currency || "COP",
    user.id,
    purchase.branch_id || null,
    user.branch_id || null,
    qr.affiliate_id,
    points,
    purchase.notes || null,
    {
      source: "affiliate_referral_qr",
      redemption_id: attributedSale.redemption_id,
      attributed_sale_id: attributedSale.id,
      checkout,
      ...ruleMetadata,
    },
  ];
  let businessSale;
  if (existing) {
    const updated = await client.query(
      `update business_sales
       set campaign_id = $2, customer_name = $4, customer_phone = $5, customer_email = $6,
           customer_document_id = $7, product_name = $8, sale_amount = $9, currency = $10,
           seller_user_id = $11, branch_id = coalesce($12::uuid, $13::uuid),
           acquisition_source = 'FRIEND_REFERRAL', acquisition_channel = 'QR recomendacion afiliado',
           referred_affiliate_id = $14, referral_points_awarded = $15, notes = $16,
           metadata = metadata || $17::jsonb
       where id = $18 and business_id = $1
       returning *`,
      [...values, existing.id]
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
      values
    );
    businessSale = inserted.rows[0];
  }

  if (pointDelta !== 0) {
    await client.query(
      `update affiliates set points_total = points_total + $3 where id = $1 and business_id = $2`,
      [qr.affiliate_id, qr.business_id, pointDelta]
    );
    await client.query(
      `insert into affiliate_point_ledger
        (business_id, affiliate_id, created_by_user_id, amount, points_awarded, reason, metadata)
       values ($1, $2, $3, $4, $5, 'REFERRAL_PURCHASE_QR', $6)`,
      [
        qr.business_id,
        qr.affiliate_id,
        user.id,
        checkout.final_total,
        pointDelta,
        {
          business_sale_id: businessSale.id,
          attributed_sale_id: attributedSale.id,
          qr_code_id: qr.id,
          redemption_id: attributedSale.redemption_id,
          previous_points: previousPoints,
          referral_points: points,
          ...ruleMetadata,
        },
      ]
    );
  }

  return {
    affiliate_id: qr.affiliate_id,
    business_sale_id: businessSale.id,
    points_awarded: points,
    points_delta: pointDelta,
  };
}

async function redeemQr(tokenInput, user, checkoutPayload = {}) {
  assertQrValidator(user);
  const token = normalizeToken(tokenInput);
  if (!token) {
    throw badRequest("Token is required.");
  }

  const accessResult = await query("select business_id from qr_codes where token = $1", [token]);
  const accessRow = accessResult.rows[0];
  if (accessRow) {
    if (!canAccessBusiness(user, accessRow.business_id)) {
      throw forbidden("Este QR pertenece a otro negocio.");
    }
    await assertStandaloneBusinessFeature(user, accessRow.business_id, "qr_validator");
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `select q.*, b.name as business_name, r.name as reward_name, a.full_name as affiliate_name,
              p.name as player_name, p.email as player_email, p.phone as player_phone,
              p.document_id as player_document_id
       from qr_codes q
       join businesses b on b.id = q.business_id
       left join rewards r on r.id = q.reward_id
       left join affiliates a on a.id = q.affiliate_id
       left join players p on p.id = q.player_id
       where q.token = $1
       for update of q`,
      [token]
    );

    const qr = result.rows[0];
    if (!qr) {
      await logValidation(client, {
        user_id: user.id,
        token_preview: token.slice(0, 10),
        result: "INVALID",
        message: "Redeem attempted for non-existing QR.",
      });
      throw notFound("El QR no existe.");
    }

    if (!canAccessBusiness(user, qr.business_id)) {
      await logValidation(client, {
        business_id: qr.business_id,
        campaign_id: qr.campaign_id,
        game_id: qr.game_id,
        qr_code_id: qr.id,
        user_id: user.id,
        token_preview: token.slice(0, 10),
        result: "OTHER_BUSINESS",
        message: "Redeem attempted for another business.",
      });
      throw forbidden("Este QR pertenece a otro negocio.");
    }

    if (qr.status === "REDEEMED") {
      await logValidation(client, {
        business_id: qr.business_id,
        campaign_id: qr.campaign_id,
        game_id: qr.game_id,
        qr_code_id: qr.id,
        user_id: user.id,
        token_preview: token.slice(0, 10),
        result: "REDEEMED",
        message: "QR was already redeemed.",
      });
      throw badRequest("Este QR ya fue redimido.");
    }

    if (qr.status !== "ACTIVE") {
      throw badRequest(`Este QR no puede redimirse porque su estado es ${qr.status}.`);
    }

    if (qr.expires_at && new Date(qr.expires_at) <= new Date()) {
      await client.query("update qr_codes set status = 'EXPIRED' where id = $1", [qr.id]);
      await logValidation(client, {
        business_id: qr.business_id,
        campaign_id: qr.campaign_id,
        game_id: qr.game_id,
        qr_code_id: qr.id,
        user_id: user.id,
        token_preview: token.slice(0, 10),
        result: "EXPIRED",
        message: "Expired QR redeem attempt.",
      });
      throw badRequest("Este QR esta vencido.");
    }

    const benefitLabel = qr.reward_name || qr.benefit_value?.label || "Beneficio estrategico";
    const checkout = calculateBenefitCheckout({
      benefitType: qr.benefit_type,
      benefitValue: qr.benefit_value || {},
      label: benefitLabel,
      mode: checkoutPayload.mode,
      purchase: checkoutPayload.purchase || {},
    });
    const redemptionMetadata = {
      benefit_application: checkout,
      origin_type: qr.origin_type,
      affiliate_id: qr.affiliate_id || null,
    };
    const redemption = await client.query(
      `insert into redemptions
        (business_id, campaign_id, game_id, qr_code_id, reward_id, player_id, redeemed_by_user_id, branch_id, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, coalesce($8::uuid, $9::uuid), $10)
       returning *`,
      [
        qr.business_id,
        qr.campaign_id || null,
        qr.game_id,
        qr.id,
        qr.reward_id,
        qr.player_id,
        user.id,
        checkoutPayload.purchase?.branch_id || null,
        user.branch_id || null,
        redemptionMetadata,
      ]
    );

    let attributedSale = null;
    let referral = null;
    if (checkout.mode === "PURCHASE") {
      const purchase = checkoutPayload.purchase || {};
      const productSummary = purchase.product_or_service
        || checkout.line_items.map((item) => `${item.name} x${item.quantity}`).join(", ").slice(0, 200)
        || null;
      const saleResult = await client.query(
        `insert into attributed_sales
          (business_id, campaign_id, qr_code_id, redemption_id, player_id,
           sale_amount, purchase_subtotal, benefit_discount_amount, benefit_type, benefit_label,
           benefit_snapshot, line_items, application_summary, purchase_required, application_mode,
           currency, sale_confirmed_by_user_id, branch_id, payment_method, product_or_service, notes)
         values
          ($1, $2, $3, $4, $5,
           $6, $7, $8, $9, $10,
           $11, $12, $13, $14, 'PURCHASE',
           $15, $16, coalesce($17::uuid, $18::uuid), $19, $20, $21)
         returning *`,
        [
          qr.business_id,
          qr.campaign_id || null,
          qr.id,
          redemption.rows[0].id,
          qr.player_id || null,
          checkout.final_total,
          checkout.subtotal,
          checkout.discount_amount,
          checkout.benefit.type,
          checkout.benefit.label,
          checkout.benefit,
          checkout.line_items,
          checkout,
          checkout.purchase_required,
          purchase.currency || "COP",
          user.id,
          purchase.branch_id || null,
          user.branch_id || null,
          purchase.payment_method || null,
          productSummary,
          purchase.notes || null,
        ]
      );
      attributedSale = saleResult.rows[0];
      if (qr.origin_type === "AFFILIATE_REFERRAL" && qr.affiliate_id) {
        referral = await recordAffiliateCheckout(client, qr, attributedSale, checkout, checkoutPayload.purchase || {}, user);
      }
    }

    await client.query(
      `update qr_codes
       set status = 'REDEEMED', redeemed_at = now(), redeemed_by_user_id = $2
       where id = $1`,
      [qr.id, user.id]
    );

    await logValidation(client, {
      business_id: qr.business_id,
      campaign_id: qr.campaign_id,
      game_id: qr.game_id,
      qr_code_id: qr.id,
      user_id: user.id,
      token_preview: token.slice(0, 10),
      result: "REDEEMED",
      message: "QR redeemed successfully.",
    });

    await logQrEvent(client, {
      business_id: qr.business_id,
      campaign_id: qr.campaign_id,
      qr_code_id: qr.id,
      player_id: qr.player_id,
      user_id: user.id,
      event_type: "QR_REDEEMED",
      message: "QR redeemed successfully.",
      metadata: {
        origin_type: qr.origin_type,
        affiliate_id: qr.affiliate_id || null,
        checkout_mode: checkout.mode,
        purchase_subtotal: checkout.subtotal,
        benefit_discount_amount: checkout.discount_amount,
        final_total: checkout.final_total,
      },
    });

    const acquisitionEffortId = qr.metadata?.acquisition_effort_id || null;
    if (acquisitionEffortId) {
      await client.query(
        `insert into business_acquisition_events
          (business_id, effort_id, channel_id, event_type, source_type, source_id, lead_id, qr_code_id, dedupe_key, metadata)
         select $1, e.id, e.channel_id, 'REDEMPTION', 'QR_CODE', $2, $3, $2, $4, $5::jsonb
         from business_acquisition_channel_efforts e
         where e.id=$6 and e.business_id=$1
         on conflict (business_id, effort_id, dedupe_key) where dedupe_key is not null do nothing`,
        [qr.business_id, qr.id, qr.player_id || null, `REDEMPTION:${qr.id}`, JSON.stringify({ redemption_id: redemption.rows[0].id, validator_user_id: user.id }), acquisitionEffortId]
      );
    }

    const redeemedContact = await resolveQrContact(client, qr);
    await registerRedemptionIntake(client, {
      businessId: qr.business_id,
      contact: redeemedContact,
      userId: user.id,
      campaignId: qr.campaign_id || null,
      origin: qr.origin_type || "QR",
      dedupeKey: `QR_REDEMPTION:${redemption.rows[0].id}`,
      description: `Beneficio ${benefitLabel} redimido por QR y enviado al Recolector.`,
      metadata: { qr_code_id: qr.id, redemption_id: redemption.rows[0].id, acquisition_effort_id: acquisitionEffortId },
    });

    return {
      status: "REDEEMED",
      message: checkout.mode === "PURCHASE"
        ? "Compra registrada y beneficio aplicado correctamente."
        : "Beneficio redimido correctamente sin compra asociada.",
      redemption: redemption.rows[0],
      sale: attributedSale,
      checkout,
      referral,
      business: { id: qr.business_id, name: qr.business_name },
      reward: { id: qr.reward_id, name: benefitLabel },
      affiliate: qr.affiliate_id ? { id: qr.affiliate_id, name: qr.affiliate_name } : null,
    };
  });
}

function buildStatusMessage(status) {
  if (status === "ACTIVE") {
    return "QR valido. Puede redimirse una sola vez.";
  }
  if (status === "UNCLAIMED") {
    return "Este QR aun no ha sido activado por un cliente.";
  }
  if (status === "CLAIMED") {
    return "Este QR inicial ya fue reclamado. Valida el ticket final emitido al cliente.";
  }
  if (status === "REDEEMED") {
    return "Este QR ya fue usado.";
  }
  if (status === "EXPIRED") {
    return "Este QR esta vencido.";
  }
  if (status === "CANCELLED") {
    return "Este QR fue cancelado.";
  }
  return "QR invalido.";
}

module.exports = { generateQr, getQrDetails, redeemQr };
