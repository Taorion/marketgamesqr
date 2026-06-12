const QRCode = require("qrcode");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { canAccessBusiness } = require("../middleware/auth");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { createSecureToken, normalizeToken } = require("../utils/token");
const { logValidation, logQrEvent } = require("./auditService");
const { consumeQrCredit } = require("./qrCreditService");

function buildValidatorUrl(token) {
  const base = env.publicValidatorUrl.replace(/\/$/, "");
  return `${base}/?token=${encodeURIComponent(token)}`;
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

  const now = new Date();
  const isExpired = qr.expires_at && new Date(qr.expires_at) <= now;
  const effectiveStatus = qr.status === "ACTIVE" && isExpired ? "EXPIRED" : qr.status;

  if (effectiveStatus === "EXPIRED" && qr.status !== "EXPIRED") {
    await query("update qr_codes set status = 'EXPIRED' where id = $1 and status = 'ACTIVE'", [qr.id]);
  }

  await logValidation(query, {
    business_id: qr.business_id,
    game_id: qr.game_id,
    qr_code_id: qr.id,
    user_id: user.id,
    token_preview: token.slice(0, 10),
    result: effectiveStatus,
    message: `QR validation returned ${effectiveStatus}.`,
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

async function redeemQr(tokenInput, user) {
  const token = normalizeToken(tokenInput);
  if (!token) {
    throw badRequest("Token is required.");
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `select q.*, b.name as business_name, r.name as reward_name, a.full_name as affiliate_name
       from qr_codes q
       join businesses b on b.id = q.business_id
       left join rewards r on r.id = q.reward_id
       left join affiliates a on a.id = q.affiliate_id
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

    const redemption = await client.query(
      `insert into redemptions (business_id, campaign_id, game_id, qr_code_id, reward_id, player_id, redeemed_by_user_id, branch_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [qr.business_id, qr.campaign_id || null, qr.game_id, qr.id, qr.reward_id, qr.player_id, user.id, user.branch_id || null]
    );

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
      },
    });

    return {
      status: "REDEEMED",
      message: "Beneficio redimido correctamente.",
      redemption: redemption.rows[0],
      business: { id: qr.business_id, name: qr.business_name },
      reward: { id: qr.reward_id, name: qr.reward_name || qr.benefit_value?.label || "Beneficio estrategico" },
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
    return "Este QR ya fue reclamado y espera activacion final.";
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
