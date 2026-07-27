const QRCode = require("qrcode");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { createSecureToken } = require("../utils/token");
const { canAccessBusiness } = require("../middleware/auth");
const { logQrEvent } = require("./auditService");
const { consumeQrCredit, ensureCreditAccount, mapPublicCreditAccount } = require("./qrCreditService");
const {
  affiliatePointRuleMetadata,
  getAffiliatePointRules,
  referralPointsForAmount,
} = require("./affiliatePointRulesService");

const BUSINESS_CARD_SETTINGS_SQL = `
  jsonb_strip_nulls(jsonb_build_object(
    'slogan', b.settings->>'slogan',
    'tagline', b.settings->>'tagline',
    'contact_name', b.settings->>'contact_name',
    'email', b.settings->>'email',
    'contact_email', b.settings->>'contact_email',
    'phone', b.settings->>'phone',
    'website', b.settings->>'website',
    'city', b.settings->>'city',
    'address', b.settings->>'address',
    'brand_primary', b.settings->>'brand_primary',
    'brand_secondary', b.settings->>'brand_secondary',
    'logo_url', b.settings->>'logo_url'
  ))
`;

function ensureBusinessAccess(user, businessId) {
  if (!canAccessBusiness(user, businessId)) {
    throw forbidden("You cannot access this business.");
  }
}

async function businessNameFor(businessId) {
  const result = await query(
    `select id, name, ${BUSINESS_CARD_SETTINGS_SQL} as settings
     from businesses b
     where id = $1`,
    [businessId]
  );
  return result.rows[0] || null;
}

function affiliateDigitalCardUrl(token) {
  const base = String(env.publicAppUrl || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/carnet-afiliado/${encodeURIComponent(token || "")}`;
}

function publicAppBaseUrl() {
  return String(env.publicAppUrl || "http://localhost:3000").replace(/\/$/, "");
}

function validatorUrlForToken(token) {
  const target = new URL("/empresa/", `${publicAppBaseUrl()}/`);
  target.searchParams.set("view", "validator");
  target.searchParams.set("token", token);
  return target.toString();
}

function rewardRuleTicketPayload(rule) {
  return {
    type: rule.benefit_type,
    label: rule.benefit_label,
    value: rule.benefit_value || {},
    reward_rule_id: rule.id,
    required_points: Number(rule.required_points || 0),
  };
}

function expiresAtForRule(rule) {
  const days = Number(rule.expiration_days || 0);
  if (!Number.isFinite(days) || days <= 0) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function attachQrDataUrl(affiliate) {
  const digitalCardUrl = affiliateDigitalCardUrl(affiliate.qr_token || "");
  return {
    ...affiliate,
    digital_card_url: digitalCardUrl,
    qr_data_url: await QRCode.toDataURL(digitalCardUrl, {
      margin: 2,
      width: 720,
      errorCorrectionLevel: "Q",
    }),
  };
}

async function listAffiliates(businessId, user) {
  ensureBusinessAccess(user, businessId);
  const result = await query(
    `select
       a.*,
       b.name as business_name,
       ${BUSINESS_CARD_SETTINGS_SQL} as business_settings,
       u.full_name as created_by_name,
       coalesce((select sum(l.points_awarded)::int from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as ledger_points,
       coalesce((select count(*)::int from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as point_events,
       coalesce((select sum(l.amount)::numeric from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as purchase_total,
       coalesce((select avg(l.amount)::numeric from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as average_purchase,
       (select max(l.created_at) from affiliate_point_ledger l where l.affiliate_id = a.id) as last_purchase_at
     from affiliates a
     join businesses b on b.id = a.business_id
     left join app_users u on u.id = a.created_by_user_id
     where a.business_id = $1
     order by a.created_at desc`,
    [businessId]
  );

  const affiliates = await Promise.all(result.rows.map(attachQrDataUrl));
  return affiliates;
}

async function createAffiliate(businessId, user, body) {
  ensureBusinessAccess(user, businessId);
  const business = await businessNameFor(businessId);
  if (!business) {
    throw notFound("Business not found.");
  }

  const qrToken = createSecureToken();
  const result = await query(
    `insert into affiliates
      (business_id, created_by_user_id, full_name, document_id, phone, email, photo_data_url, qr_token, status, notes, card_metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', $9, $10)
     returning *`,
    [
      businessId,
      user.id,
      body.full_name,
      body.document_id || null,
      body.phone || null,
      body.email || null,
      body.photo_data_url || null,
      qrToken,
      body.notes || null,
      body.card_metadata || {},
    ]
  );

  const affiliate = await attachQrDataUrl({
    ...result.rows[0],
    business_name: business.name,
    business_settings: business.settings || {},
    created_by_name: user.full_name || user.email || null,
    ledger_points: 0,
    point_events: 0,
  });

  return affiliate;
}

async function updateAffiliate(businessId, affiliateId, user, body) {
  ensureBusinessAccess(user, businessId);
  const result = await query(
    `update affiliates
     set full_name = coalesce($3, full_name),
         document_id = $4,
         phone = $5,
         email = $6,
         photo_data_url = coalesce($7, photo_data_url),
         notes = $8,
         card_metadata = coalesce(card_metadata, '{}'::jsonb) || coalesce($9::jsonb, '{}'::jsonb),
         updated_at = now()
     where business_id = $1 and id = $2
     returning id`,
    [
      businessId,
      affiliateId,
      body.full_name || null,
      body.document_id || null,
      body.phone || null,
      body.email || null,
      body.photo_data_url || null,
      body.notes || null,
      body.card_metadata || {},
    ]
  );
  if (!result.rowCount) {
    throw notFound("Affiliate not found.");
  }
  return getAffiliate(businessId, affiliateId, user);
}

async function getAffiliate(businessId, affiliateId, user) {
  ensureBusinessAccess(user, businessId);
  const result = await query(
    `select
       a.*,
       b.name as business_name,
       ${BUSINESS_CARD_SETTINGS_SQL} as business_settings,
       u.full_name as created_by_name,
       coalesce((select sum(l.points_awarded)::int from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as ledger_points,
       coalesce((select count(*)::int from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as point_events,
       coalesce((select sum(l.amount)::numeric from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as purchase_total,
       coalesce((select avg(l.amount)::numeric from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as average_purchase,
       (select max(l.created_at) from affiliate_point_ledger l where l.affiliate_id = a.id) as last_purchase_at
     from affiliates a
     join businesses b on b.id = a.business_id
     left join app_users u on u.id = a.created_by_user_id
     where a.business_id = $1 and a.id = $2`,
    [businessId, affiliateId]
  );

  const affiliate = result.rows[0];
  if (!affiliate) {
    throw notFound("Affiliate not found.");
  }
  return attachQrDataUrl(affiliate);
}

async function getPublicAffiliateCard(token) {
  const value = String(token || "").trim();
  if (!value) {
    throw notFound("Affiliate card not found.");
  }
  const result = await query(
    `select
       a.id,
       a.business_id,
       a.full_name,
       a.document_id,
       a.phone,
       a.email,
       a.photo_data_url,
       a.qr_token,
       a.status,
       a.created_at,
       a.updated_at,
       b.name as business_name,
       ${BUSINESS_CARD_SETTINGS_SQL} as business_settings,
       coalesce((select sum(l.points_awarded)::int from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as ledger_points,
       coalesce((select count(*)::int from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as point_events,
       coalesce((select sum(l.amount)::numeric from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as purchase_total,
       coalesce((select avg(l.amount)::numeric from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as average_purchase,
       (select max(l.created_at) from affiliate_point_ledger l where l.affiliate_id = a.id) as last_purchase_at
     from affiliates a
     join businesses b on b.id = a.business_id
     where a.qr_token = $1
       and a.status <> 'DELETED'
     limit 1`,
    [value]
  );
  const affiliate = result.rows[0];
  if (!affiliate) {
    throw notFound("Affiliate card not found.");
  }
  const ledger = await query(
    `select id, points_awarded, reason, created_at
     from affiliate_point_ledger
     where affiliate_id = $1
     order by created_at desc
     limit 20`,
    [affiliate.id]
  );
  return {
    affiliate: await attachQrDataUrl(affiliate),
    ledger: ledger.rows,
  };
}

async function awardAffiliatePoints(businessId, affiliateId, user, body) {
  ensureBusinessAccess(user, businessId);
  const amount = Number(body.amount || 0);
  const manualPoints = Number(body.points_awarded || 0);
  if ((!Number.isFinite(amount) || amount <= 0) && (!Number.isInteger(manualPoints) || manualPoints <= 0)) {
    throw badRequest("El monto debe ser mayor a 0.");
  }

  const pointRules = manualPoints > 0 ? null : await getAffiliatePointRules(businessId);
  // A purchase registered from the affiliate screen must earn exactly the
  // same configured referral rate as a sale captured through CRM or QR.
  // Keeping this calculation aligned prevents the preview and final balance
  // from disagreeing when a business uses a rate other than 1.
  const points = manualPoints > 0 ? manualPoints : referralPointsForAmount(amount, pointRules);
  if (points < 1) {
    return {
      awarded: 0,
      message: `El monto no genera puntos porque es menor a ${pointRules.point_amount_cop.toLocaleString("es-CO")} pesos.`,
      affiliate: await getAffiliate(businessId, affiliateId, user),
    };
  }

  const updatedAffiliate = await withTransaction(async (client) => {
    const result = await client.query(
      `select *
       from affiliates
       where business_id = $1 and id = $2
       for update`,
      [businessId, affiliateId]
    );
    const row = result.rows[0];
    if (!row) {
      throw notFound("Affiliate not found.");
    }

    await client.query(
      `insert into affiliate_point_ledger
        (business_id, affiliate_id, created_by_user_id, amount, points_awarded, reason, metadata)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        businessId,
        affiliateId,
        user.id,
        amount,
        points,
        body.reason || (manualPoints > 0 ? "MANUAL_ADJUSTMENT" : "PURCHASE"),
        {
          ...(body.metadata || {}),
          source: manualPoints > 0 ? "manual_points_adjustment" : body.metadata?.source,
          ...(pointRules ? affiliatePointRuleMetadata(pointRules) : {}),
        },
      ]
    );

    const updated = await client.query(
      `update affiliates
       set points_total = points_total + $3
       where id = $1 and business_id = $2
       returning *`,
      [affiliateId, businessId, points]
    );

    return updated.rows[0];
  });

  const affiliate = await getAffiliate(businessId, updatedAffiliate.id, user);

  return {
    awarded: points,
    amount,
    affiliate,
  };
}

async function listAffiliateLedger(businessId, affiliateId, user) {
  ensureBusinessAccess(user, businessId);
  const result = await query(
    `select
       l.id,
       l.amount,
       l.points_awarded,
       l.reason,
       l.metadata,
       l.created_at,
       u.full_name as created_by_name
     from affiliate_point_ledger l
     left join app_users u on u.id = l.created_by_user_id
     where l.business_id = $1 and l.affiliate_id = $2
     order by l.created_at desc
     limit 200`,
    [businessId, affiliateId]
  );
  return result.rows;
}

async function updateAffiliateLedgerEntry(businessId, affiliateId, ledgerId, user, body) {
  ensureBusinessAccess(user, businessId);

  const requestedAmount = body.amount === undefined ? null : Number(body.amount);
  const requestedPoints = body.points_awarded === undefined ? null : Number(body.points_awarded);
  if (requestedAmount !== null && (!Number.isFinite(requestedAmount) || requestedAmount < 0)) {
    throw badRequest("El monto del movimiento debe ser 0 o mayor.");
  }
  if (requestedPoints !== null && (!Number.isInteger(requestedPoints) || requestedPoints < 0)) {
    throw badRequest("Los puntos del movimiento deben ser un numero entero de 0 o mayor.");
  }

  const result = await withTransaction(async (client) => {
    const current = await client.query(
      `select *
       from affiliate_point_ledger
       where business_id = $1 and affiliate_id = $2 and id = $3
       for update`,
      [businessId, affiliateId, ledgerId]
    );
    const currentLedger = current.rows[0];
    if (!currentLedger) {
      throw notFound("Affiliate ledger entry not found.");
    }

    const affiliate = await client.query(
      `select id
       from affiliates
       where business_id = $1 and id = $2 and status <> 'DELETED'
       for update`,
      [businessId, affiliateId]
    );
    if (!affiliate.rowCount) {
      throw notFound("Affiliate not found.");
    }

    const previousPoints = Number(currentLedger.points_awarded || 0);
    const amount = requestedAmount === null ? Number(currentLedger.amount || 0) : requestedAmount;
    const points = requestedPoints === null ? previousPoints : requestedPoints;
    const pointDelta = points - previousPoints;
    const reason = body.reason || currentLedger.reason || "PURCHASE";
    const metadata = {
      ...(body.metadata || {}),
      edited: true,
      edited_at: new Date().toISOString(),
      edited_by_user_id: user.id,
      previous_amount: Number(currentLedger.amount || 0),
      previous_points_awarded: previousPoints,
      previous_reason: currentLedger.reason || null,
    };

    const updatedLedger = await client.query(
      `update affiliate_point_ledger
       set amount = $4,
           points_awarded = $5,
           reason = $6,
           metadata = coalesce(metadata, '{}'::jsonb) || $7::jsonb
       where business_id = $1 and affiliate_id = $2 and id = $3
       returning id, amount, points_awarded, reason, metadata, created_at`,
      [businessId, affiliateId, ledgerId, amount, points, reason, metadata]
    );

    if (pointDelta !== 0) {
      await client.query(
        `update affiliates
         set points_total = greatest(0, points_total + $3)
         where id = $1 and business_id = $2`,
        [affiliateId, businessId, pointDelta]
      );
    }

    const updatedAffiliate = await client.query(
      `select id, full_name, points_total
       from affiliates
       where id = $1 and business_id = $2`,
      [affiliateId, businessId]
    );

    return {
      ledger: updatedLedger.rows[0],
      affiliate: updatedAffiliate.rows[0],
      points_delta: pointDelta,
    };
  });

  return {
    ...result,
    affiliate: await getAffiliate(businessId, affiliateId, user),
  };
}

async function listAffiliateRewardRules(businessId, user, options = {}) {
  ensureBusinessAccess(user, businessId);
  const includeArchived = options.includeArchived === true;
  const result = await query(
    `select
       r.*,
       c.name as campaign_name,
       rw.name as reward_name,
       coalesce(t.issued_count, 0)::int as issued_count
     from affiliate_reward_rules r
     left join campaigns c on c.id = r.campaign_id
     left join rewards rw on rw.id = r.reward_id
     left join lateral (
       select count(*)::int as issued_count
       from affiliate_reward_tickets t
       where t.reward_rule_id = r.id
     ) t on true
     where r.business_id = $1
       and ($2::boolean = true or r.status <> 'ARCHIVED')
     order by r.required_points asc, r.created_at desc`,
    [businessId, includeArchived]
  );
  return result.rows;
}

async function createAffiliateRewardRule(businessId, user, body) {
  ensureBusinessAccess(user, businessId);
  if (body.campaign_id) {
    const campaign = await query(
      "select id from campaigns where id = $1 and business_id = $2",
      [body.campaign_id, businessId]
    );
    if (!campaign.rowCount) throw badRequest("La campana no existe para este negocio.");
  }
  if (body.reward_id) {
    const reward = await query(
      "select id from rewards where id = $1 and business_id = $2 and is_active = true",
      [body.reward_id, businessId]
    );
    if (!reward.rowCount) throw badRequest("El reward no existe para este negocio.");
  }
  const result = await query(
    `insert into affiliate_reward_rules
      (business_id, created_by_user_id, title, description, required_points, benefit_type,
       benefit_label, benefit_value, campaign_id, reward_id, expiration_days, status, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, 'ACTIVE', $12::jsonb)
     returning *`,
    [
      businessId,
      user?.id || null,
      body.title,
      body.description || null,
      body.required_points,
      body.benefit_type || "CUSTOM",
      body.benefit_label,
      JSON.stringify(body.benefit_value || {}),
      body.campaign_id || null,
      body.reward_id || null,
      body.expiration_days || null,
      JSON.stringify(body.metadata || {}),
    ]
  );
  return result.rows[0];
}

async function archiveAffiliateRewardRule(businessId, ruleId, user) {
  ensureBusinessAccess(user, businessId);
  const result = await query(
    `update affiliate_reward_rules
     set status = 'ARCHIVED', updated_at = now()
     where id = $1 and business_id = $2
     returning *`,
    [ruleId, businessId]
  );
  const rule = result.rows[0];
  if (!rule) throw notFound("Premio de afiliado no encontrado.");
  return rule;
}

async function listAffiliateRewardUnlocks(businessId, affiliateId, user) {
  ensureBusinessAccess(user, businessId);
  const affiliate = await query(
    "select id, points_total from affiliates where id = $1 and business_id = $2 and status <> 'DELETED'",
    [affiliateId, businessId]
  );
  const row = affiliate.rows[0];
  if (!row) throw notFound("Affiliate not found.");
  const pointsTotal = Number(row.points_total || 0);
  const result = await query(
    `select
       r.*,
       c.name as campaign_name,
       t.id as ticket_id,
       t.status as ticket_status,
       t.created_at as ticket_created_at,
       q.id as qr_code_id,
       q.token as qr_token,
       q.status as qr_status,
       q.expires_at,
       q.redeemed_at
     from affiliate_reward_rules r
     left join campaigns c on c.id = r.campaign_id
     left join affiliate_reward_tickets t
       on t.reward_rule_id = r.id
      and t.affiliate_id = $2
      and t.business_id = r.business_id
     left join qr_codes q on q.id = t.qr_code_id
     where r.business_id = $1
       and r.status = 'ACTIVE'
     order by r.required_points asc, r.created_at desc`,
    [businessId, affiliateId]
  );
  return result.rows.map((rule) => {
    const unlocked = pointsTotal >= Number(rule.required_points || 0);
    const validatorUrl = rule.qr_token ? validatorUrlForToken(rule.qr_token) : null;
    return {
      ...rule,
      affiliate_points_total: pointsTotal,
      points_remaining: Math.max(0, Number(rule.required_points || 0) - pointsTotal),
      unlocked,
      generated: Boolean(rule.ticket_id),
      validator_url: validatorUrl,
      public_ticket_url: validatorUrl,
    };
  });
}

async function createAffiliateRewardTicket(businessId, affiliateId, user, body) {
  ensureBusinessAccess(user, businessId);
  return withTransaction(async (client) => {
    const affiliateResult = await client.query(
      `select *
       from affiliates
       where id = $1 and business_id = $2 and status = 'ACTIVE'
       for update`,
      [affiliateId, businessId]
    );
    const affiliate = affiliateResult.rows[0];
    if (!affiliate) throw notFound("Affiliate not found.");

    const ruleResult = await client.query(
      `select *
       from affiliate_reward_rules
       where id = $1 and business_id = $2 and status = 'ACTIVE'
       for update`,
      [body.reward_rule_id, businessId]
    );
    const rule = ruleResult.rows[0];
    if (!rule) throw notFound("Premio de afiliado no encontrado.");

    const pointsTotal = Number(affiliate.points_total || 0);
    if (pointsTotal < Number(rule.required_points || 0)) {
      throw badRequest(`Este premio requiere ${rule.required_points} puntos. El afiliado tiene ${pointsTotal}.`);
    }

    const existing = await client.query(
      `select
         t.*,
         q.token,
         q.status as qr_status,
         q.expires_at,
         q.redeemed_at
       from affiliate_reward_tickets t
       join qr_codes q on q.id = t.qr_code_id
       where t.business_id = $1
         and t.affiliate_id = $2
         and t.reward_rule_id = $3
       limit 1`,
      [businessId, affiliateId, rule.id]
    );
    if (existing.rowCount) {
      const row = existing.rows[0];
      const url = validatorUrlForToken(row.token);
      return {
        ticket: {
          ...row,
          validator_url: url,
          public_ticket_url: url,
          qr_image_data_url: await QRCode.toDataURL(url),
        },
        existing: true,
      };
    }

    const token = createSecureToken();
    const benefitPayload = rewardRuleTicketPayload(rule);
    const expiresAt = expiresAtForRule(rule);
    const qrResult = await client.query(
      `insert into qr_codes
        (business_id, campaign_id, game_id, player_id, reward_id, token, status, metadata,
         expires_at, batch_id, origin_type, benefit_type, benefit_value, sale_id, claim_required,
         claimed_at, claimed_by_player_id, affiliate_id)
       values ($1, $2, null, null, $3, $4, 'ACTIVE', $5::jsonb, $6, null, 'MANUAL_BENEFIT',
         $7, $8::jsonb, null, false, null, null, $9)
       returning *`,
      [
        businessId,
        rule.campaign_id || null,
        rule.reward_id || null,
        token,
        JSON.stringify({
          source: "affiliate_reward_unlock",
          origin_label: "Premio desbloqueado por afiliado",
          affiliate_id: affiliate.id,
          affiliate_name: affiliate.full_name,
          reward_rule_id: rule.id,
          required_points: rule.required_points,
          points_snapshot: pointsTotal,
        }),
        expiresAt,
        rule.benefit_type,
        JSON.stringify(benefitPayload),
        affiliate.id,
      ]
    );
    const qr = qrResult.rows[0];

    const ticketResult = await client.query(
      `insert into affiliate_reward_tickets
        (business_id, affiliate_id, reward_rule_id, qr_code_id, created_by_user_id, points_snapshot, metadata)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb)
       returning *`,
      [
        businessId,
        affiliate.id,
        rule.id,
        qr.id,
        user?.id || null,
        pointsTotal,
        JSON.stringify({
          benefit_label: rule.benefit_label,
          required_points: rule.required_points,
        }),
      ]
    );

    await ensureCreditAccount(client, businessId);
    const creditAccount = await consumeQrCredit(client, businessId, qr.id, user?.id || null);

    await logQrEvent(client, {
      business_id: businessId,
      campaign_id: rule.campaign_id || null,
      qr_code_id: qr.id,
      user_id: user?.id || null,
      event_type: "QR_CREATED",
      message: "Affiliate reward ticket created.",
      metadata: {
        origin_type: "MANUAL_BENEFIT",
        source: "affiliate_reward_unlock",
        affiliate_id: affiliate.id,
        reward_rule_id: rule.id,
      },
    });

    const validatorUrl = validatorUrlForToken(token);
    return {
      ticket: {
        ...ticketResult.rows[0],
        qr_code: qr,
        qr_token: token,
        qr_status: qr.status,
        expires_at: qr.expires_at,
        benefit: benefitPayload,
        validator_url: validatorUrl,
        public_ticket_url: validatorUrl,
        qr_image_data_url: await QRCode.toDataURL(validatorUrl),
      },
      affiliate,
      reward_rule: rule,
      credit_account: mapPublicCreditAccount(creditAccount),
      existing: false,
    };
  });
}

async function assertCampaignOwnership(businessId, campaignId) {
  const result = await query(
    "select id, name from campaigns where id = $1 and business_id = $2",
    [campaignId, businessId]
  );
  const campaign = result.rows[0];
  if (!campaign) throw notFound("Campaign not found.");
  return campaign;
}

async function listCampaignAffiliates(businessId, campaignId, user) {
  ensureBusinessAccess(user, businessId);
  await assertCampaignOwnership(businessId, campaignId);
  const result = await query(
    `select
       ca.*,
       a.full_name,
       a.document_id,
       a.phone,
       a.email,
       a.qr_token,
       a.status as affiliate_status,
       u.full_name as assigned_by_name,
       coalesce(q.generated_count, 0)::int as referral_tickets_generated,
       coalesce(q.redeemed_count, 0)::int as referral_tickets_redeemed,
       coalesce(s.sales_count, 0)::int as referral_sales_count,
       coalesce(s.revenue, 0)::numeric as referral_revenue,
       coalesce(s.points_awarded, 0)::int as referral_points_awarded,
       coalesce(l.ledger_points, 0)::int as ledger_points
     from campaign_affiliates ca
     join affiliates a on a.id = ca.affiliate_id and a.business_id = ca.business_id
     left join app_users u on u.id = ca.assigned_by_user_id
     left join lateral (
       select count(*)::int as generated_count,
              count(*) filter (where q.status = 'REDEEMED' or q.redeemed_at is not null)::int as redeemed_count
       from qr_codes q
       where q.business_id = ca.business_id
         and q.campaign_id = ca.campaign_id
         and q.affiliate_id = ca.affiliate_id
     ) q on true
     left join lateral (
       select count(*)::int as sales_count,
              coalesce(sum(bs.sale_amount), 0)::numeric as revenue,
              coalesce(sum(bs.referral_points_awarded), 0)::int as points_awarded
       from business_sales bs
       left join qr_codes qrs on qrs.id = bs.qr_code_id
       where bs.business_id = ca.business_id
         and coalesce(bs.campaign_id, qrs.campaign_id) = ca.campaign_id
         and coalesce(bs.referred_affiliate_id, qrs.affiliate_id) = ca.affiliate_id
     ) s on true
     left join lateral (
       select coalesce(sum(points_awarded), 0)::int as ledger_points
       from affiliate_point_ledger l
       where l.business_id = ca.business_id and l.affiliate_id = ca.affiliate_id
     ) l on true
     where ca.business_id = $1 and ca.campaign_id = $2
     order by ca.created_at desc`,
    [businessId, campaignId]
  );
  return result.rows;
}

async function assignAffiliateToCampaign(businessId, campaignId, affiliateId, user, body = {}) {
  ensureBusinessAccess(user, businessId);
  await assertCampaignOwnership(businessId, campaignId);
  const affiliate = await query(
    "select id from affiliates where id = $1 and business_id = $2 and status <> 'DELETED'",
    [affiliateId, businessId]
  );
  if (!affiliate.rowCount) throw notFound("Affiliate not found.");
  const result = await query(
    `insert into campaign_affiliates
      (business_id, campaign_id, affiliate_id, assigned_by_user_id, role, status, notes, metadata)
     values ($1, $2, $3, $4, $5, 'ACTIVE', $6, $7::jsonb)
     on conflict (business_id, campaign_id, affiliate_id)
     do update set status = 'ACTIVE',
                   role = excluded.role,
                   notes = excluded.notes,
                   assigned_by_user_id = excluded.assigned_by_user_id,
                   metadata = campaign_affiliates.metadata || excluded.metadata,
                   updated_at = now()
     returning *`,
    [
      businessId,
      campaignId,
      affiliateId,
      user?.id || null,
      body.role || "REFERER",
      body.notes || null,
      JSON.stringify(body.metadata || {}),
    ]
  );
  return result.rows[0];
}

async function removeAffiliateFromCampaign(businessId, campaignId, affiliateId, user) {
  ensureBusinessAccess(user, businessId);
  await assertCampaignOwnership(businessId, campaignId);
  const result = await query(
    `delete from campaign_affiliates
     where business_id = $1 and campaign_id = $2 and affiliate_id = $3
     returning id`,
    [businessId, campaignId, affiliateId]
  );
  if (!result.rowCount) throw notFound("Campaign affiliate not found.");
  return { removed: true, affiliate_id: affiliateId, campaign_id: campaignId };
}

async function deleteAffiliate(businessId, affiliateId, user) {
  ensureBusinessAccess(user, businessId);
  const result = await query(
    `delete from affiliates
     where business_id = $1 and id = $2
     returning id, full_name`,
    [businessId, affiliateId]
  );
  const affiliate = result.rows[0];
  if (!affiliate) {
    throw notFound("Affiliate not found.");
  }
  return affiliate;
}

module.exports = {
  assignAffiliateToCampaign,
  affiliateDigitalCardUrl,
  archiveAffiliateRewardRule,
  createAffiliateRewardRule,
  createAffiliateRewardTicket,
  createAffiliate,
  deleteAffiliate,
  getAffiliate,
  getPublicAffiliateCard,
  listAffiliateRewardRules,
  listAffiliateRewardUnlocks,
  listCampaignAffiliates,
  listAffiliates,
  listAffiliateLedger,
  removeAffiliateFromCampaign,
  awardAffiliatePoints,
  updateAffiliate,
  updateAffiliateLedgerEntry,
};
