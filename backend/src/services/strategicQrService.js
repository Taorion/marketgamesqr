const QRCode = require("qrcode");
const JSZip = require("jszip");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, notFound } = require("../utils/http");
const { createSecureToken, normalizeToken } = require("../utils/token");
const { logQrEvent } = require("./auditService");
const { consumeQrCredit, consumeQrCredits, ensureCreditAccount, mapPublicCreditAccount } = require("./qrCreditService");

const BUSINESS_BRAND_SETTINGS_SQL = `
  jsonb_strip_nulls(jsonb_build_object(
    'brand_primary', b.settings->>'brand_primary',
    'brand_secondary', b.settings->>'brand_secondary',
    'logo_url', b.settings->>'logo_url',
    'logo_data_url', b.settings->>'logo_data_url',
    'ticket_frame_url', b.settings->>'ticket_frame_url',
    'ticket_frame_data_url', b.settings->>'ticket_frame_data_url'
  ))
`;

function publicAppBaseUrl() {
  try {
    const parsed = new URL(env.publicAppUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "http://localhost:3000";
  }
}

function buildValidatorUrl(token) {
  const target = new URL("/empresa/", publicAppBaseUrl());
  target.searchParams.set("view", "validator");
  target.searchParams.set("token", token);
  return target.toString();
}

function buildClaimUrl(token) {
  return `${publicAppBaseUrl()}/claim/${encodeURIComponent(token)}`;
}

function buildPublicQrLinks(qr) {
  const requiresClaim = Boolean(qr.claim_required) && ["UNCLAIMED", "CLAIMED"].includes(qr.status);
  const claimUrl = buildClaimUrl(qr.token);
  const validatorUrl = buildValidatorUrl(qr.token);
  return {
    scan_url: requiresClaim ? claimUrl : validatorUrl,
    validator_url: requiresClaim ? null : validatorUrl,
    claim_url: claimUrl,
  };
}

function resolveExpiration({ expires_mode, expires_at, expiration_days }) {
  if (expires_mode === "NONE") {
    return null;
  }
  if (expires_mode === "CUSTOM_DATE") {
    if (!expires_at) {
      throw badRequest("expires_at is required when expires_mode is CUSTOM_DATE.");
    }
    return expires_at;
  }
  if (expiration_days) {
    return new Date(Date.now() + expiration_days * 24 * 60 * 60 * 1000).toISOString();
  }
  const presetDays = {
    "7_DAYS": 7,
    "15_DAYS": 15,
    "30_DAYS": 30,
  }[expires_mode];
  if (!presetDays) {
    throw badRequest("Invalid expiration configuration.");
  }
  return new Date(Date.now() + presetDays * 24 * 60 * 60 * 1000).toISOString();
}

async function assertReward(client, businessId, rewardId) {
  if (!rewardId) {
    return null;
  }
  const result = await client.query(
    "select id, name, description, display_in_validator from rewards where id = $1 and business_id = $2 and is_active = true",
    [rewardId, businessId]
  );
  const reward = result.rows[0];
  if (!reward) {
    throw badRequest("Reward does not exist for this business.");
  }
  return reward;
}

async function assertCampaign(client, businessId, campaignId) {
  if (!campaignId) {
    return null;
  }
  const result = await client.query(
    "select id, name, status from campaigns where id = $1 and business_id = $2",
    [campaignId, businessId]
  );
  const campaign = result.rows[0];
  if (!campaign) {
    throw badRequest("Campaign does not exist for this business.");
  }
  if (["FINISHED", "ARCHIVED"].includes(campaign.status)) {
    throw badRequest("La campana seleccionada ya finalizo o esta archivada.");
  }
  return campaign;
}

async function assertBranch(client, businessId, branchId) {
  if (!branchId) {
    return null;
  }
  const result = await client.query(
    "select id, name from branches where id = $1 and business_id = $2 and is_active = true",
    [branchId, businessId]
  );
  const branch = result.rows[0];
  if (!branch) {
    throw badRequest("Branch does not exist for this business.");
  }
  return branch;
}

async function assertAffiliate(client, businessId, affiliateId) {
  if (!affiliateId) {
    return null;
  }
  const result = await client.query(
    "select id, full_name, document_id, phone from affiliates where id = $1 and business_id = $2 and status = 'ACTIVE'",
    [affiliateId, businessId]
  );
  const affiliate = result.rows[0];
  if (!affiliate) {
    throw badRequest("El afiliado no existe o no esta activo para este negocio.");
  }
  return affiliate;
}

async function createOptionalPlayer(client, businessId, campaignId, customer = {}, metadata = {}) {
  if (!customer.customer_name && !customer.customer_phone && !customer.customer_email && !customer.document_id) {
    return null;
  }
  const result = await client.query(
    `insert into players (business_id, campaign_id, game_id, name, email, phone, document_id, metadata)
     values ($1, $2, null, $3, $4, $5, $6, $7)
     returning *`,
    [
      businessId,
      campaignId || null,
      customer.customer_name || null,
      customer.customer_email || null,
      customer.customer_phone || null,
      customer.document_id || null,
      metadata,
    ]
  );
  return result.rows[0];
}

function buildBenefitPayload(benefit, reward) {
  return {
    type: benefit.benefit_type,
    label: benefit.benefit_label,
    value: benefit.benefit_value || {},
    reward_id: benefit.reward_id || null,
    reward_name: reward?.name || null,
    display: reward?.display_in_validator || null,
  };
}

function formatTicketDate(value) {
  if (!value) {
    return "Sin vencimiento";
  }
  try {
    return new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function shortTicketCode(qr) {
  return String(qr?.id || qr?.token || "")
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase();
}

function truncateTicketLine(value, maxLength = 96) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}...`;
}

function buildTicketDetailLines({ label, expiresAt, code }) {
  return [
    `Beneficio: ${truncateTicketLine(label || "Beneficio")}`,
    `Vence: ${formatTicketDate(expiresAt)}`,
    `Codigo: ${String(code || "").trim() || "N/A"}`,
  ];
}

function safeFilenamePart(value, fallback = "ticket") {
  const normalized = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

async function createPostSaleQr(businessId, user, body) {
  return withTransaction(async (client) => {
    const [reward, campaign] = await Promise.all([
      assertReward(client, businessId, body.benefit.reward_id),
      assertCampaign(client, businessId, body.campaign_id),
      assertBranch(client, businessId, body.branch_id),
    ]);
    const isGenericTicket = body.metadata?.qr_creation_context === "business_owner_generic_ticket" || Boolean(body.metadata?.ticket_use_case);

    const player = await createOptionalPlayer(
      client,
      businessId,
      body.campaign_id,
      {
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        customer_email: body.customer_email,
        document_id: body.document_id,
      },
      {
        source: isGenericTicket ? (body.metadata?.ticket_use_case || "generic-ticket") : (body.metadata?.qr_creation_context || "post-sale"),
        product_name: body.product_name || null,
        ticket_use_case: body.metadata?.ticket_use_case || null,
        ticket_occasion: body.metadata?.ticket_occasion || null,
      }
    );

    const attributionSource = body.metadata?.attribution_source || "POST_SALE";
    const attributionSubject = body.metadata?.attribution_subject || body.product_name || null;
    const saleResult = await client.query(
      `insert into business_sales
        (business_id, campaign_id, customer_name, customer_phone, customer_email, product_name, sale_amount, currency, seller_user_id, branch_id, notes, metadata, acquisition_source, acquisition_channel, customer_document_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       returning *`,
      [
        businessId,
        body.campaign_id || null,
        body.customer_name || null,
        body.customer_phone || null,
        body.customer_email || null,
        body.product_name || null,
        body.sale_amount,
        body.currency,
        user.id,
        body.branch_id || user.branch_id || null,
        body.notes || null,
        body.metadata || {},
        attributionSource,
        attributionSubject,
        body.document_id || null,
      ]
    );
    const sale = saleResult.rows[0];

    const token = createSecureToken();
    const expiresAt = resolveExpiration(body);
    const benefitPayload = buildBenefitPayload(body.benefit, reward);
    const ticketUseCaseLabel = body.metadata?.ticket_use_case_label || (isGenericTicket ? "Ticket generico" : "Beneficio postventa");
    const ticketOriginLabel = body.metadata?.origin_label || (isGenericTicket ? `Ticket generico - ${ticketUseCaseLabel}` : "QR postventa");

    const qrResult = await client.query(
      `insert into qr_codes
        (business_id, campaign_id, game_id, player_id, reward_id, token, status, metadata, expires_at, batch_id, origin_type, benefit_type, benefit_value, sale_id, claim_required, claimed_at, claimed_by_player_id)
       values ($1, $2, null, $3, $4, $5, 'ACTIVE', $6, $7, null, 'POST_SALE', $8, $9, $10, false, $11, $12)
       returning *`,
      [
        businessId,
        body.campaign_id || null,
        player?.id || null,
        body.benefit.reward_id || null,
        token,
        {
          strategic_qr: true,
          origin_label: ticketOriginLabel,
          campaign_id: campaign?.id || null,
          campaign_name: campaign?.name || null,
          notes: body.notes || null,
          product_name: body.product_name || null,
          ...body.metadata,
        },
        expiresAt,
        body.benefit.benefit_type,
        benefitPayload,
        sale.id,
        player ? new Date().toISOString() : null,
        player?.id || null,
      ]
    );
    const qr = qrResult.rows[0];

    await client.query("update business_sales set qr_code_id = $2 where id = $1", [sale.id, qr.id]);
    await ensureCreditAccount(client, businessId);
    const creditAccount = await consumeQrCredit(client, businessId, qr.id, user.id);

    await logQrEvent(client, {
      business_id: businessId,
      campaign_id: body.campaign_id || null,
      qr_code_id: qr.id,
      player_id: player?.id || null,
      user_id: user.id,
      event_type: "QR_CREATED",
      message: "Generic benefit ticket created.",
      metadata: {
        origin_type: "POST_SALE",
        sale_id: sale.id,
        benefit_type: body.benefit.benefit_type,
        ticket_use_case: body.metadata?.ticket_use_case || null,
      },
    });

    const validatorUrl = buildValidatorUrl(token);
    const claimUrl = buildClaimUrl(token);
    const sharedTicketUrl = isGenericTicket ? claimUrl : validatorUrl;
    const businessResult = await client.query(
      `select id, name, ${BUSINESS_BRAND_SETTINGS_SQL} as business_settings
       from businesses b
       where id = $1`,
      [businessId]
    );
    const business = businessResult.rows[0] || null;
    const brand = getBrandStyle(business?.business_settings || {});
    const hasFrame = Boolean(brand.ticketFrameUrl);
    const postSaleTicketImage = hasFrame
      ? await buildBrandedTicketSvgDataUrl({
          scanUrl: sharedTicketUrl,
          brand,
          detailLines: buildTicketDetailLines({
            label: benefitPayload?.label || body.benefit.benefit_type || "Beneficio",
            expiresAt,
            code: shortTicketCode(qr),
          }),
        })
      : await QRCode.toDataURL(sharedTicketUrl);

    return {
      sale,
      qr_code: qr,
      business,
      credit_account: mapPublicCreditAccount(creditAccount),
      validator_url: validatorUrl,
      claim_url: claimUrl,
      public_ticket_url: sharedTicketUrl,
      qr_content: sharedTicketUrl,
      qr_image_data_url: postSaleTicketImage,
      filename: `${isGenericTicket ? safeFilenamePart(ticketUseCaseLabel) : "post-sale"}-${String(qr.id).slice(0, 8)}.${hasFrame ? "svg" : "png"}`,
      benefit: benefitPayload,
    };
  });
}

function buildBatchInsert(rows) {
  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const base = rowIndex * 15;
    values.push(
      row.business_id,
      row.campaign_id,
      row.reward_id,
      row.token,
      row.status,
      row.metadata,
      row.expires_at,
      row.batch_id,
      row.origin_type,
      row.benefit_type,
      row.benefit_value,
      row.claim_required,
      row.claimed_at,
      row.claimed_by_player_id,
      row.affiliate_id || null
    );
    return `($${base + 1}, $${base + 2}, null, null, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, null, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15})`;
  });

  return {
    sql: `insert into qr_codes
      (business_id, campaign_id, game_id, player_id, reward_id, token, status, metadata, expires_at, batch_id, origin_type, benefit_type, benefit_value, sale_id, claim_required, claimed_at, claimed_by_player_id, affiliate_id)
      values ${placeholders.join(", ")}
      returning id, token, status, created_at, expires_at, batch_id, origin_type, benefit_type, benefit_value, affiliate_id`,
    values,
  };
}

async function createQrBatch(businessId, user, body) {
  return withTransaction(async (client) => {
    if (!body.campaign_id) {
      throw badRequest("Selecciona una campana antes de generar un paquete de tickets.");
    }
    const reward = await assertReward(client, businessId, body.benefit.reward_id);
    const campaign = await assertCampaign(client, businessId, body.campaign_id);
    const affiliate = await assertAffiliate(client, businessId, body.affiliate_id);
    const expiresAt = resolveExpiration(body);
    const benefitPayload = buildBenefitPayload(body.benefit, reward);
    const claimRequired = true;

    const batchResult = await client.query(
      `insert into qr_batches
        (business_id, campaign_id, reward_id, name, description, quantity, qr_origin_type, benefit_type, benefit_value, expires_at, expiration_days, channel_use, status, created_by_user_id, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE', $13, $14)
       returning *`,
      [
        businessId,
        body.campaign_id || null,
        body.benefit.reward_id || null,
        body.name,
        body.description || body.notes || null,
        body.quantity,
        body.qr_origin_type,
        body.benefit.benefit_type,
        benefitPayload,
        expiresAt,
        body.expiration_days || null,
        body.channel_use,
        user.id,
        {
          notes: body.notes || null,
          campaign_id: campaign?.id || null,
          campaign_name: campaign?.name || null,
          claim_required: claimRequired,
          package_ticket_role: "initial_claim_qr",
          affiliate_id: affiliate?.id || null,
          affiliate_name: affiliate?.full_name || null,
          ...body.metadata,
        },
      ]
    );
    const batch = batchResult.rows[0];

    const rows = Array.from({ length: body.quantity }, () => {
      const token = createSecureToken();
      return {
        business_id: businessId,
        campaign_id: body.campaign_id || null,
        reward_id: body.benefit.reward_id || null,
        token,
        status: "UNCLAIMED",
        metadata: {
          strategic_qr: true,
          package_ticket_role: "initial_claim_qr",
          origin_label: body.qr_origin_type === "AFFILIATE_REFERRAL" ? "QR recomendacion afiliado" : "Paquete QR",
          campaign_id: campaign?.id || null,
          campaign_name: campaign?.name || null,
          package_name: body.name,
          channel_use: body.channel_use,
          affiliate_id: affiliate?.id || null,
          affiliate_name: affiliate?.full_name || null,
          ...body.metadata,
        },
        expires_at: expiresAt,
        batch_id: batch.id,
        origin_type: body.qr_origin_type,
        benefit_type: body.benefit.benefit_type,
        benefit_value: benefitPayload,
        claim_required: claimRequired,
        claimed_at: null,
        claimed_by_player_id: null,
        affiliate_id: affiliate?.id || null,
      };
    });

    const insert = buildBatchInsert(rows);
    const qrInsert = await client.query(insert.sql, insert.values);
    const qrCodes = qrInsert.rows;
    await ensureCreditAccount(client, businessId);
    const creditAccount = await consumeQrCredits(
      client,
      businessId,
      qrCodes.length,
      null,
      user.id,
      `Paquete QR generado desde portal empresa: ${body.name}.`
    );

    await logQrEvent(client, {
      business_id: businessId,
      campaign_id: body.campaign_id || null,
      batch_id: batch.id,
      user_id: user.id,
      event_type: "QR_BATCH_CREATED",
      message: "Strategic QR batch created.",
      metadata: {
        quantity: body.quantity,
        origin_type: body.qr_origin_type,
        benefit_type: body.benefit.benefit_type,
        affiliate_id: affiliate?.id || null,
      },
    });

    return {
      batch,
      credit_account: mapPublicCreditAccount(creditAccount),
      qr_codes: qrCodes.map((qr) => ({
        ...qr,
        ...buildPublicQrLinks({ ...qr, claim_required: claimRequired }),
      })),
    };
  });
}

async function createAffiliateReferralQrBatch(businessId, user, body) {
  const affiliate = await query(
    "select id, full_name from affiliates where id = $1 and business_id = $2 and status = 'ACTIVE'",
    [body.affiliate_id, businessId]
  );
  const row = affiliate.rows[0];
  if (!row) {
    throw badRequest("El afiliado no existe o no esta activo para este negocio.");
  }
  const result = await createQrBatch(businessId, user, {
    name: `QR recomendacion - ${row.full_name}`,
    description: body.notes || `QR unicos de recomendacion asignados a ${row.full_name}.`,
    quantity: body.quantity,
    campaign_id: body.campaign_id,
    qr_origin_type: "AFFILIATE_REFERRAL",
    channel_use: "recomendacion",
    claim_required: true,
    expires_mode: body.expires_mode || "NONE",
    expires_at: body.expires_at || null,
    expiration_days: body.expiration_days || null,
    notes: body.notes || null,
    affiliate_id: row.id,
    metadata: {
      source: "affiliate_referral_generator",
      attribution_source: "affiliate_referral",
      attribution_subject: row.full_name,
      campaign_id: body.campaign_id,
      affiliate_id: row.id,
      affiliate_name: row.full_name,
    },
    benefit: {
      reward_id: body.benefit?.reward_id || null,
      benefit_type: body.benefit?.benefit_type || "CUSTOM",
      benefit_label: body.benefit?.benefit_label || "Recomendacion de afiliado",
      benefit_value: body.benefit?.benefit_value || {},
    },
  });
  await query(
    `insert into campaign_affiliates
      (business_id, campaign_id, affiliate_id, assigned_by_user_id, role, status, notes, metadata)
     values ($1, $2, $3, $4, 'REFERER', 'ACTIVE', $5, $6::jsonb)
     on conflict (business_id, campaign_id, affiliate_id)
     do update set status = 'ACTIVE',
                   notes = coalesce(excluded.notes, campaign_affiliates.notes),
                   metadata = campaign_affiliates.metadata || excluded.metadata,
                   updated_at = now()`,
    [
      businessId,
      body.campaign_id,
      row.id,
      user?.id || null,
      body.notes || null,
      JSON.stringify({ source: "affiliate_referral_qr_batch", batch_id: result.batch?.id || null }),
    ]
  );
  return result;
}

async function listQrBatches(businessId, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit || 80), 1), 200);
  const result = await query(
    `with recent_batches as (
       select *
       from qr_batches
       where business_id = $1
       order by created_at desc
       limit $2
     )
     select
       b.*,
       coalesce(q.generated_count, 0)::int as generated_count,
       coalesce(q.unclaimed_count, 0)::int as unclaimed_count,
       coalesce(q.active_count, 0)::int as active_count,
       coalesce(q.redeemed_count, 0)::int as redeemed_count,
       coalesce(q.expired_count, 0)::int as expired_count
     from recent_batches b
     left join lateral (
       select
         count(*)::int as generated_count,
         count(*) filter (where status = 'UNCLAIMED')::int as unclaimed_count,
         count(*) filter (where status = 'ACTIVE')::int as active_count,
         count(*) filter (where status = 'REDEEMED')::int as redeemed_count,
         count(*) filter (where status = 'EXPIRED')::int as expired_count
       from qr_codes
       where batch_id = b.id and business_id = b.business_id
     ) q on true
     order by b.created_at desc`,
    [businessId, limit]
  );
  return result.rows;
}

async function getQrBatch(businessId, batchId) {
  const [batchResult, qrResult] = await Promise.all([
    query(
      `select *
       from qr_batches
       where id = $1 and business_id = $2`,
      [batchId, businessId]
    ),
    query(
      `select id, token, status, created_at, expires_at, claimed_at, redeemed_at, benefit_type, benefit_value, affiliate_id
       from qr_codes
       where batch_id = $1 and business_id = $2
       order by created_at asc
       limit 300`,
      [batchId, businessId]
    ),
  ]);
  if (!batchResult.rowCount) {
    throw notFound("QR batch not found.");
  }
  return {
    batch: batchResult.rows[0],
    qr_codes: qrResult.rows.map((qr) => ({
      ...qr,
      validator_url: buildValidatorUrl(qr.token),
      claim_url: buildClaimUrl(qr.token),
    })),
  };
}

async function getQrHistory(businessId, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit || 120), 1), 300);
  const result = await query(
    `select
       q.id,
       q.token,
       q.origin_type,
       q.status,
       q.created_at,
       q.expires_at,
       q.claimed_at,
       q.redeemed_at,
       q.benefit_type,
       q.benefit_value,
       qb.id as batch_id,
       qb.name as batch_name,
       bs.id as sale_id,
       bs.sale_amount,
       bs.product_name,
       p.name as player_name,
       p.phone as player_phone,
       p.email as player_email,
       a.id as affiliate_id,
       a.full_name as affiliate_name,
       a.document_id as affiliate_document_id,
       a.phone as affiliate_phone
     from qr_codes q
     left join qr_batches qb on qb.id = q.batch_id
     left join business_sales bs on bs.id = q.sale_id
     left join players p on p.id = q.player_id
     left join affiliates a on a.id = q.affiliate_id
     where q.business_id = $1
       and q.origin_type in ('POST_SALE', 'PRODUCT_LABEL', 'BULK_PACKAGE', 'MANUAL_BENEFIT', 'LOYALTY', 'SURPRISE_REWARD', 'AFFILIATE_REFERRAL', 'TRIVIA_LAUNCHER', 'INTERACTIVE_ACTIVATION')
     order by q.created_at desc
     limit $2`,
    [businessId, limit]
  );
  return result.rows.map((qr) => ({
    ...qr,
    ...buildPublicQrLinks(qr),
  }));
}

async function getQrMetrics(businessId) {
  const [totals, benefitUsage, bySeller] = await Promise.all([
    query(
      `select
         count(*) filter (where origin_type = 'POST_SALE')::int as post_sale_generated,
         count(*) filter (where origin_type = 'POST_SALE' and status = 'REDEEMED')::int as post_sale_redeemed,
         count(distinct batch_id)::int as qr_batches_generated,
         count(*) filter (where origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE') and coalesce(metadata->>'package_ticket_role', '') <> 'final_validable_qr' and status in ('CLAIMED', 'ACTIVE', 'REDEEMED'))::int as label_qr_claimed_or_active,
         count(*) filter (where origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE') and status = 'REDEEMED')::int as label_qr_redeemed,
         count(*) filter (where origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE') and coalesce(metadata->>'package_ticket_role', '') <> 'final_validable_qr' and status = 'UNCLAIMED')::int as label_qr_unclaimed,
         count(*) filter (where origin_type = 'AFFILIATE_REFERRAL' and coalesce(metadata->>'package_ticket_role', '') <> 'final_validable_qr')::int as affiliate_referral_generated,
         count(*) filter (where origin_type = 'AFFILIATE_REFERRAL' and coalesce(metadata->>'package_ticket_role', '') <> 'final_validable_qr' and status in ('CLAIMED', 'ACTIVE', 'REDEEMED'))::int as affiliate_referral_claimed_or_active,
         count(*) filter (where origin_type = 'AFFILIATE_REFERRAL' and status = 'REDEEMED')::int as affiliate_referral_redeemed,
         count(*) filter (where origin_type = 'AFFILIATE_REFERRAL' and coalesce(metadata->>'package_ticket_role', '') <> 'final_validable_qr' and status = 'UNCLAIMED')::int as affiliate_referral_unclaimed,
         count(*) filter (where origin_type in ('TRIVIA_LAUNCHER', 'INTERACTIVE_ACTIVATION'))::int as trivia_generated,
         count(*) filter (where origin_type in ('TRIVIA_LAUNCHER', 'INTERACTIVE_ACTIVATION') and status = 'REDEEMED')::int as trivia_redeemed,
         count(*) filter (where origin_type = 'INTERACTIVE_ACTIVATION')::int as interactive_activation_generated,
         count(*) filter (where origin_type = 'INTERACTIVE_ACTIVATION' and status = 'REDEEMED')::int as interactive_activation_redeemed,
         count(*) filter (where status = 'EXPIRED')::int as expired_without_redeem
       from qr_codes
       where business_id = $1`,
      [businessId]
    ),
    query(
      `select benefit_type, count(*)::int as total
       from qr_codes
       where business_id = $1
         and origin_type in ('POST_SALE', 'PRODUCT_LABEL', 'BULK_PACKAGE', 'MANUAL_BENEFIT', 'LOYALTY', 'SURPRISE_REWARD', 'AFFILIATE_REFERRAL', 'TRIVIA_LAUNCHER', 'INTERACTIVE_ACTIVATION')
         and coalesce(metadata->>'package_ticket_role', '') <> 'final_validable_qr'
       group by benefit_type
       order by total desc`,
      [businessId]
    ),
    query(
      `select u.full_name as seller_name, count(*)::int as redemptions
       from redemptions r
       left join app_users u on u.id = r.redeemed_by_user_id
       where r.business_id = $1
       group by u.full_name
       order by redemptions desc`,
      [businessId]
    ),
  ]);

  const top = totals.rows[0] || {};
  const postSaleGenerated = Number(top.post_sale_generated || 0);
  const postSaleRedeemed = Number(top.post_sale_redeemed || 0);

  return {
    totals: {
      post_sale_generated: postSaleGenerated,
      post_sale_redeemed: postSaleRedeemed,
      repurchase_rate: postSaleGenerated ? Number((postSaleRedeemed / postSaleGenerated).toFixed(4)) : 0,
      qr_batches_generated: Number(top.qr_batches_generated || 0),
      label_qr_claimed_or_active: Number(top.label_qr_claimed_or_active || 0),
      label_qr_redeemed: Number(top.label_qr_redeemed || 0),
      label_qr_unclaimed: Number(top.label_qr_unclaimed || 0),
      affiliate_referral_generated: Number(top.affiliate_referral_generated || 0),
      affiliate_referral_claimed_or_active: Number(top.affiliate_referral_claimed_or_active || 0),
      affiliate_referral_redeemed: Number(top.affiliate_referral_redeemed || 0),
      affiliate_referral_unclaimed: Number(top.affiliate_referral_unclaimed || 0),
      trivia_generated: Number(top.trivia_generated || 0),
      trivia_redeemed: Number(top.trivia_redeemed || 0),
      interactive_activation_generated: Number(top.interactive_activation_generated || 0),
      interactive_activation_redeemed: Number(top.interactive_activation_redeemed || 0),
      expired_without_redeem: Number(top.expired_without_redeem || 0),
    },
    benefits: benefitUsage.rows,
    redemptions_by_seller: bySeller.rows,
  };
}

async function getIndividualQrDownload(businessId, qrId, options = {}) {
  const result = await query(
    `select
       q.id,
       q.token,
       q.status,
       q.claim_required,
       q.expires_at,
       q.origin_type,
       q.benefit_type,
       q.benefit_value,
       qb.name as batch_name,
       b.name as business_name,
       ${BUSINESS_BRAND_SETTINGS_SQL} as business_settings
     from qr_codes q
     join businesses b on b.id = q.business_id
     left join qr_batches qb on qb.id = q.batch_id
     where q.id = $1 and q.business_id = $2`,
    [qrId, businessId]
  );
  const qr = result.rows[0];
  if (!qr) {
    throw notFound("QR not found.");
  }
  const links = buildPublicQrLinks(qr);
  const scanUrl = options.publicClaimUrl ? links.claim_url : links.scan_url;
  const brand = getBrandStyle(qr.business_settings || {});
  const hasFrame = Boolean(brand.ticketFrameUrl);
  const ticketLabel = qr.benefit_value?.label || qr.benefit_type || "Beneficio";
  const detailLines = buildTicketDetailLines({
    label: ticketLabel,
    expiresAt: qr.expires_at,
    code: shortTicketCode(qr),
  });
  const qrImageDataUrl = hasFrame
    ? await buildBrandedTicketSvgDataUrl({
        scanUrl,
        brand,
        detailLines,
      })
    : await QRCode.toDataURL(scanUrl);
  return {
    qr_code_id: qr.id,
    status: qr.status,
    validator_url: links.validator_url,
    claim_url: links.claim_url,
    scan_url: links.scan_url,
    public_ticket_url: links.claim_url,
    filename: `strategic-qr-${String(qr.id).slice(0, 8)}.${hasFrame ? "svg" : "png"}`,
    qr_image_data_url: qrImageDataUrl,
  };
}

async function getBatchCsvDownload(businessId, batchId) {
  const result = await query(
    `select id, token, status, claim_required, created_at, expires_at
     from qr_codes
     where batch_id = $1 and business_id = $2
     order by created_at asc`,
    [batchId, businessId]
  );
  if (!result.rowCount) {
    throw notFound("QR batch not found.");
  }
  const lines = [
    ["qr_code_id", "token", "status", "scan_url", "validator_url", "claim_url", "created_at", "expires_at"].join(","),
    ...result.rows.map((row) => {
      const links = buildPublicQrLinks(row);
      return [
        row.id,
        row.token,
        row.status,
        links.scan_url,
        links.validator_url || "",
        links.claim_url,
        row.created_at,
        row.expires_at || "",
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",");
    }),
  ];
  return lines.join("\n");
}

async function getBatchJsonDownload(businessId, batchId) {
  const result = await query(
    `select
       q.id,
       q.token,
       q.status,
       q.created_at,
       q.expires_at,
       q.origin_type,
       q.claim_required,
       q.benefit_type,
       q.benefit_value,
       q.affiliate_id,
       a.full_name as affiliate_name,
       a.document_id as affiliate_document_id
     from qr_codes q
     left join affiliates a on a.id = q.affiliate_id
     where q.batch_id = $1 and q.business_id = $2
     order by q.created_at asc`,
    [batchId, businessId]
  );
  if (!result.rowCount) {
    throw notFound("QR batch not found.");
  }
  return result.rows.map((row) => ({
    ...row,
    ...buildPublicQrLinks(row),
  }));
}

async function getBatchContext(businessId, batchId) {
  const batchResult = await query(
    `select
       qb.id,
       qb.name,
       qb.qr_origin_type,
       qb.channel_use,
       qb.benefit_type,
       qb.benefit_value,
       qb.metadata,
       b.name as business_name,
       ${BUSINESS_BRAND_SETTINGS_SQL} as business_settings
     from qr_batches qb
     join businesses b on b.id = qb.business_id
     where qb.id = $1 and qb.business_id = $2`,
    [batchId, businessId]
  );
  const batch = batchResult.rows[0];
  if (!batch) {
    throw notFound("QR batch not found.");
  }
  return batch;
}

function resolvePrintTemplate(template = "sticker") {
  const value = String(template || "sticker").toLowerCase();
  if (value === "shelf") {
    return {
      id: "shelf",
      htmlColumns: 2,
      htmlCardPadding: 18,
      pageWidth: 595,
      pageHeight: 842,
      margin: 28,
      columns: 2,
      rowsPerPage: 4,
      cardGap: 14,
      cardHeight: 170,
      qrSize: 92,
      titleSize: 12,
    };
  }
  if (value === "card") {
    return {
      id: "card",
      htmlColumns: 2,
      htmlCardPadding: 20,
      pageWidth: 595,
      pageHeight: 842,
      margin: 26,
      columns: 2,
      rowsPerPage: 3,
      cardGap: 16,
      cardHeight: 240,
      qrSize: 128,
      titleSize: 13,
    };
  }
  return {
    id: "sticker",
    htmlColumns: 3,
    htmlCardPadding: 14,
    pageWidth: 595,
    pageHeight: 842,
    margin: 32,
    columns: 3,
    rowsPerPage: 3,
    cardGap: 14,
    cardHeight: 230,
    qrSize: 115,
    titleSize: 10,
  };
}

function resolvePaperSize(paper = "a4") {
  const value = String(paper || "a4").toLowerCase();
  if (value === "letter") {
    return { id: "letter", width: 612, height: 792 };
  }
  return { id: "a4", width: 595, height: 842 };
}

function getBrandStyle(settings = {}) {
  const logoUrl = typeof settings.logo_data_url === "string" && settings.logo_data_url
    ? settings.logo_data_url
    : typeof settings.logo_url === "string" ? settings.logo_url : "";
  const ticketFrameUrl = typeof settings.ticket_frame_data_url === "string" && settings.ticket_frame_data_url
    ? settings.ticket_frame_data_url
    : typeof settings.ticket_frame_url === "string" ? settings.ticket_frame_url : "";
  return {
    primary: typeof settings.brand_primary === "string" ? settings.brand_primary : "#13212c",
    secondary: typeof settings.brand_secondary === "string" ? settings.brand_secondary : "#945d20",
    logoUrl,
    ticketFrameUrl,
  };
}

function hexToRgb(hex, fallback = { r: 19, g: 33, b: 44 }) {
  const cleaned = String(hex || "").trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return fallback;
  }
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

function toPdfRgb(hex, fallback) {
  const { r, g, b } = hexToRgb(hex, fallback);
  return rgb(r / 255, g / 255, b / 255);
}

async function fetchLogoBytes(logoUrl) {
  const value = String(logoUrl || "").trim();
  if (!value) return null;

  if (value.startsWith("data:image/")) {
    const match = value.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return null;
    return {
      mimeType: match[1],
      bytes: Buffer.from(match[2], "base64"),
    };
  }

  if (!/^https?:\/\//i.test(value)) {
    return null;
  }

  try {
    const response = await fetch(value);
    if (!response.ok) return null;
    const mimeType = response.headers.get("content-type") || "";
    if (!mimeType.startsWith("image/")) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return { mimeType, bytes: buffer };
  } catch {
    return null;
  }
}

function svgEscape(value) {
  return escapeHtml(value).replace(/\n/g, " ");
}

function wrapTicketSvgText(value, maxChars = 48, maxLines = 1) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let current = "";

  words.forEach((rawWord) => {
    let word = rawWord;
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      return;
    }
    if (current) {
      lines.push(current);
      current = "";
    }
    while (word.length > maxChars) {
      lines.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    current = word;
  });
  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const visible = lines.slice(0, maxLines);
    visible[maxLines - 1] = truncateTicketLine(visible[maxLines - 1], Math.max(8, maxChars - 1));
    return visible;
  }
  return lines;
}

function buildTicketSvgTextRows(detailLines = []) {
  return detailLines.slice(0, 3).flatMap((line, index) => {
    const maxLines = index === 0 ? 2 : 1;
    return wrapTicketSvgText(line, index === 0 ? 48 : 54, maxLines).map((text, subIndex) => ({
      text: svgEscape(text),
      weight: index === 0 && subIndex === 0 ? 800 : 700,
      size: index === 0 ? 23 : 22,
    }));
  }).slice(0, 4);
}

async function buildBrandedTicketSvgDataUrl({ scanUrl, brand, detailLines = [] }) {
  const qrImage = await QRCode.toDataURL(scanUrl, {
    type: "image/png",
    width: 560,
    margin: 1,
    errorCorrectionLevel: "M",
  });
  const frame = String(brand.ticketFrameUrl || "").trim();
  const width = 1080;
  const height = 1350;
  const qrSize = 500;
  const qrX = Math.round((width - qrSize) / 2);
  const qrY = 450;
  const textRows = buildTicketSvgTextRows(detailLines);
  const panelX = 150;
  const panelY = 976;
  const panelWidth = width - panelX * 2;
  const panelHeight = textRows.length ? 56 + textRows.length * 31 : 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" rx="48" fill="#ffffff"/>
  ${frame ? `<image href="${svgEscape(frame)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>` : `<rect x="0" y="0" width="${width}" height="${height}" rx="48" fill="${svgEscape(brand.primary)}"/><rect x="42" y="42" width="996" height="1266" rx="40" fill="#ffffff"/>`}
  <rect x="${qrX - 28}" y="${qrY - 28}" width="${qrSize + 56}" height="${qrSize + 56}" rx="36" fill="#ffffff"/>
  <image href="${qrImage}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/>
  ${textRows.length ? `<rect x="${panelX}" y="${panelY}" width="${panelWidth}" height="${panelHeight}" rx="30" fill="#ffffff" opacity="0.96"/>
  ${textRows.map((row, index) => `<text x="${width / 2}" y="${panelY + 45 + index * 31}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${row.size}" font-weight="${row.weight}" fill="#111827">${row.text}</text>`).join("\n  ")}
  ` : ""}
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function getBatchPrintableHtml(businessId, batchId, template = "sticker", paper = "a4") {
  const batch = await getBatchContext(businessId, batchId);
  const layout = resolvePrintTemplate(template);
  const paperSpec = resolvePaperSize(paper);
  const brand = getBrandStyle(batch.business_settings || {});

  const qrRows = await getBatchJsonDownload(businessId, batchId);
  const cards = await Promise.all(
    qrRows.map(async (row) => {
      const qrImage = await QRCode.toDataURL(row.scan_url || buildClaimUrl(row.token));
      const label = row.benefit_value?.label || row.benefit_type || "Beneficio";
      const detailLines = buildTicketDetailLines({
        label,
        expiresAt: row.expires_at,
        code: shortTicketCode(row),
      });
      const affiliateLine = row.affiliate_name
        ? `Afiliado asignado: ${row.affiliate_name}${row.affiliate_document_id ? ` · ${row.affiliate_document_id}` : ""}`
        : "";
      return `
        <article class="label-card${brand.ticketFrameUrl ? " has-brand-frame" : ""}">
          <div class="qr-pad"><img src="${qrImage}" alt="QR ${row.id}"></div>
          ${brand.ticketFrameUrl ? `
            <div class="ticket-meta">
              ${detailLines.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}
            </div>
          ` : `
            <h2>${escapeHtml(label)}</h2>
            <p>${escapeHtml(batch.name)}</p>
            ${affiliateLine ? `<p class="affiliate-line">${escapeHtml(affiliateLine)}</p>` : ""}
            <small>${escapeHtml(row.origin_type)} | ${escapeHtml(row.status)}</small>
          `}
        </article>
      `;
    })
  );

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(batch.name)} | Etiquetas QR</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; background: #f4f4f4; color: #111; }
    main { padding: 20px; }
    header { margin-bottom: 20px; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    .meta { color: #555; font-size: 13px; }
    .brand { color: ${brand.secondary}; font-size: 12px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .08em; display:flex; align-items:center; gap:12px; }
    .brand-logo { max-height: 38px; max-width: 120px; object-fit: contain; }
    .grid { display: grid; grid-template-columns: repeat(${layout.htmlColumns}, 1fr); gap: 16px; }
    .label-card { background: #fff; border: 1px solid #ddd; border-top: 4px solid ${brand.primary}; border-radius: 14px; padding: ${layout.htmlCardPadding}px; text-align: center; break-inside: avoid; background-size: cover; background-position: center; }
    .label-card.has-brand-frame { background-image: url("${escapeHtml(brand.ticketFrameUrl)}"); border: 0; min-height: ${layout.cardHeight}px; }
    .qr-pad { display: inline-grid; place-items: center; padding: 10px; border-radius: 18px; background: #fff; }
    .label-card img { width: ${layout.qrSize + 30}px; height: ${layout.qrSize + 30}px; object-fit: contain; display: block; }
    .ticket-meta { display: grid; gap: 4px; width: min(100%, 260px); margin: 10px auto 0; padding: 8px 10px; border-radius: 12px; background: rgba(255, 255, 255, .94); color: #111827; }
    .ticket-meta span { display: block; color: #111827; font-size: 11px; font-weight: 700; line-height: 1.25; }
    .ticket-meta span:first-child { font-weight: 800; }
    .label-card h2 { margin: 10px 0 6px; font-size: ${layout.titleSize + 5}px; }
    .label-card p { margin: 0 0 6px; font-size: 13px; color: #444; }
    .label-card .affiliate-line { font-weight: 700; color: #111; }
    .label-card small { color: #666; font-size: 11px; }
    @page { size: ${paperSpec.id === "letter" ? "Letter" : "A4"}; margin: 10mm; }
    @media print {
      body { background: #fff; }
      main { padding: 0; }
      .grid { gap: 10px; }
      .label-card { border-radius: 0; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="brand">
        ${brand.logoUrl ? `<img class="brand-logo" src="${escapeHtml(brand.logoUrl)}" alt="Logo">` : ""}
        <span>${escapeHtml(batch.business_name || "Negocio")}</span>
      </div>
      <h1>${escapeHtml(batch.name)}</h1>
      <div class="meta">${escapeHtml(batch.qr_origin_type)} | ${escapeHtml(batch.channel_use || "-")} | ${escapeHtml(batch.benefit_value?.label || batch.benefit_type || "Beneficio")} | plantilla ${escapeHtml(layout.id)} | hoja ${escapeHtml(paperSpec.id.toUpperCase())}</div>
    </header>
    <section class="grid">
      ${cards.join("\n")}
    </section>
  </main>
</body>
</html>`;
}

async function getBatchZipDownload(businessId, batchId) {
  const batch = await getBatchContext(businessId, batchId);
  const qrRows = await getBatchJsonDownload(businessId, batchId);
  const brand = getBrandStyle(batch.business_settings || {});
  const zip = new JSZip();

  for (const row of qrRows) {
    if (brand.ticketFrameUrl) {
      const svgDataUrl = await buildBrandedTicketSvgDataUrl({
        scanUrl: row.scan_url || buildClaimUrl(row.token),
        brand,
        detailLines: buildTicketDetailLines({
          label: row.benefit_value?.label || row.benefit_type || "Beneficio",
          expiresAt: row.expires_at,
          code: shortTicketCode(row),
        }),
      });
      const svg = decodeURIComponent(svgDataUrl.replace(/^data:image\/svg\+xml;charset=utf-8,/, ""));
      zip.file(`ticket-${String(row.id).slice(0, 8)}.svg`, svg);
    } else {
      const png = await QRCode.toBuffer(row.scan_url || buildClaimUrl(row.token), {
        type: "png",
        width: 900,
        margin: 1,
      });
      zip.file(`qr-${String(row.id).slice(0, 8)}.png`, png);
    }
  }

  zip.file("manifest.json", JSON.stringify(qrRows, null, 2));
  return {
    filename: `qr-batch-${String(batch.id).slice(0, 8)}.zip`,
    bytes: await zip.generateAsync({ type: "nodebuffer" }),
  };
}

async function getBatchPdfDownload(businessId, batchId, template = "sticker", paper = "a4") {
  const batch = await getBatchContext(businessId, batchId);
  const layout = resolvePrintTemplate(template);
  const paperSpec = resolvePaperSize(paper);
  const brand = getBrandStyle(batch.business_settings || {});
  const primaryColor = toPdfRgb(brand.primary);
  const secondaryColor = toPdfRgb(brand.secondary, { r: 148, g: 93, b: 32 });
  const qrRows = await getBatchJsonDownload(businessId, batchId);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await fetchLogoBytes(brand.logoUrl);
  let embeddedLogo = null;
  if (logo?.mimeType?.includes("png")) {
    embeddedLogo = await pdf.embedPng(logo.bytes);
  } else if (logo?.mimeType?.includes("jpeg") || logo?.mimeType?.includes("jpg")) {
    embeddedLogo = await pdf.embedJpg(logo.bytes);
  }
  const frame = await fetchLogoBytes(brand.ticketFrameUrl);
  let embeddedFrame = null;
  if (frame?.mimeType?.includes("png")) {
    embeddedFrame = await pdf.embedPng(frame.bytes);
  } else if (frame?.mimeType?.includes("jpeg") || frame?.mimeType?.includes("jpg")) {
    embeddedFrame = await pdf.embedJpg(frame.bytes);
  }

  const pageWidth = paperSpec.width;
  const pageHeight = paperSpec.height;
  const margin = layout.margin;
  const columns = layout.columns;
  const rowsPerPage = layout.rowsPerPage;
  const cardGap = layout.cardGap;
  const cardWidth = (pageWidth - margin * 2 - cardGap * (columns - 1)) / columns;
  const cardHeight = layout.cardHeight;

  let page = null;

  for (let index = 0; index < qrRows.length; index += 1) {
    const row = qrRows[index];
    const slot = index % (columns * rowsPerPage);
    if (slot === 0) {
      page = pdf.addPage([pageWidth, pageHeight]);
      if (!embeddedFrame) {
        if (embeddedLogo) {
          page.drawImage(embeddedLogo, {
            x: margin,
            y: pageHeight - 36,
            width: 72,
            height: 24,
          });
        }
        page.drawText(batch.business_name || "Negocio", {
          x: embeddedLogo ? margin + 82 : margin,
          y: pageHeight - 18,
          size: 9,
          font,
          color: secondaryColor,
        });
        page.drawText(batch.name, {
          x: margin,
          y: pageHeight - 36,
          size: 18,
          font: bold,
          color: primaryColor,
        });
        page.drawText(`${batch.qr_origin_type} | ${batch.channel_use || "-"} | ${batch.benefit_value?.label || batch.benefit_type || "Beneficio"} | plantilla ${layout.id} | hoja ${paperSpec.id.toUpperCase()}`, {
          x: margin,
          y: pageHeight - 54,
          size: 9,
          font,
          color: rgb(0.4, 0.43, 0.47),
        });
      }
    }

    const col = slot % columns;
    const rowIndex = Math.floor(slot / columns);
    const x = margin + col * (cardWidth + cardGap);
    const y = pageHeight - 92 - rowIndex * (cardHeight + cardGap) - cardHeight;

    if (embeddedFrame) {
      page.drawImage(embeddedFrame, {
        x,
        y,
        width: cardWidth,
        height: cardHeight,
      });
    } else {
      page.drawRectangle({
        x,
        y,
        width: cardWidth,
        height: cardHeight,
        borderWidth: 1,
        borderColor: rgb(0.86, 0.88, 0.9),
      });
      page.drawRectangle({
        x,
        y: y + cardHeight - 6,
        width: cardWidth,
        height: 6,
        color: primaryColor,
      });
    }

    const png = await QRCode.toBuffer(row.scan_url || buildClaimUrl(row.token), {
      type: "png",
      width: 900,
      margin: 1,
    });
    const image = await pdf.embedPng(png);
    const imageSize = layout.qrSize;
    const qrDrawX = x + (cardWidth - imageSize) / 2;
    const qrDrawY = y + Math.max(60, cardHeight - imageSize - 30);
    page.drawRectangle({
      x: qrDrawX - 6,
      y: qrDrawY - 6,
      width: imageSize + 12,
      height: imageSize + 12,
      color: rgb(1, 1, 1),
    });
    page.drawImage(image, {
      x: qrDrawX,
      y: qrDrawY,
      width: imageSize,
      height: imageSize,
    });

    const title = row.benefit_value?.label || row.benefit_type || "Beneficio";
    if (embeddedFrame) {
      const detailLines = buildTicketDetailLines({
        label: title,
        expiresAt: row.expires_at,
        code: shortTicketCode(row),
      });
      const panelWidth = Math.min(cardWidth - 18, 150);
      const panelHeight = 44;
      const panelX = x + (cardWidth - panelWidth) / 2;
      const panelY = Math.max(y + 8, qrDrawY - panelHeight - 10);
      page.drawRectangle({
        x: panelX,
        y: panelY,
        width: panelWidth,
        height: panelHeight,
        color: rgb(1, 1, 1),
      });
      detailLines.forEach((line, lineIndex) => {
        page.drawText(line.slice(0, 38), {
          x: panelX + 6,
          y: panelY + panelHeight - 13 - lineIndex * 12,
          size: lineIndex === 0 ? 6.5 : 6,
          font: lineIndex === 0 ? bold : font,
          color: rgb(0.07, 0.09, 0.12),
          maxWidth: panelWidth - 12,
        });
      });
    } else {
      page.drawText(title.slice(0, 36), {
        x: x + 10,
        y: y + 44,
        size: layout.titleSize,
        font: bold,
        color: primaryColor,
        maxWidth: cardWidth - 20,
      });
      if (row.affiliate_name) {
        const affiliateLine = `Afiliado: ${row.affiliate_name}${row.affiliate_document_id ? ` - ${row.affiliate_document_id}` : ""}`;
        page.drawText(affiliateLine.slice(0, 42), {
          x: x + 10,
          y: y + 32,
          size: 8,
          font: bold,
          color: rgb(0.08, 0.13, 0.17),
          maxWidth: cardWidth - 20,
        });
      }
      page.drawText((row.origin_type || "").slice(0, 30), {
        x: x + 10,
        y: y + (row.affiliate_name ? 21 : 30),
        size: 8,
        font,
        color: rgb(0.36, 0.4, 0.44),
      });
      page.drawText(String(row.id).slice(0, 8), {
        x: x + 10,
        y: y + (row.affiliate_name ? 12 : 20),
        size: 8,
        font,
        color: rgb(0.36, 0.4, 0.44),
      });
      page.drawText(row.status, {
        x: x + cardWidth - 52,
        y: y + (row.affiliate_name ? 12 : 20),
        size: 8,
        font: bold,
        color: rgb(0.08, 0.13, 0.17),
      });
    }
  }

  return {
    filename: `qr-batch-${String(batch.id).slice(0, 8)}.pdf`,
    bytes: Buffer.from(await pdf.save()),
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getClaimDetails(tokenInput) {
  const token = normalizeToken(tokenInput);
  if (!token) {
    throw badRequest("Token is required.");
  }

  const result = await query(
    `select
       q.id,
       q.business_id,
       q.campaign_id,
       q.player_id,
       q.token,
       q.status,
       q.origin_type,
       q.claim_required,
       q.claimed_at,
       q.redeemed_at,
       q.expires_at,
       q.benefit_type,
       q.benefit_value,
       qc.metadata as claim_metadata,
       fq.id as final_qr_code_id,
       fq.token as final_qr_token,
       fq.status as final_qr_status,
       fq.created_at as final_qr_created_at,
       fq.expires_at as final_qr_expires_at,
       b.name as business_name,
       ${BUSINESS_BRAND_SETTINGS_SQL} as business_settings,
       c.name as campaign_name,
       p.name as player_name,
       p.phone as player_phone,
       p.email as player_email,
       a.id as affiliate_id,
       a.full_name as affiliate_name,
       a.document_id as affiliate_document_id,
       a.phone as affiliate_phone
     from qr_codes q
     join businesses b on b.id = q.business_id
     left join campaigns c on c.id = q.campaign_id
     left join players p on p.id = q.player_id
     left join qr_claims qc on qc.qr_code_id = q.id
     left join qr_codes fq on fq.id =
       case
         when (qc.metadata->>'final_qr_code_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         then (qc.metadata->>'final_qr_code_id')::uuid
         else null
       end
     left join affiliates a on a.id = q.affiliate_id
     where q.token = $1`,
    [token]
  );
  const qr = result.rows[0];
  if (!qr) {
    return {
      status: "INVALID",
      allowed: false,
      message: "Este QR no existe.",
    };
  }

  if (qr.expires_at && new Date(qr.expires_at) <= new Date() && !["REDEEMED", "CANCELLED"].includes(qr.status)) {
    await query("update qr_codes set status = 'EXPIRED' where id = $1 and status not in ('REDEEMED', 'EXPIRED', 'CANCELLED')", [qr.id]);
    qr.status = "EXPIRED";
  }

  const brand = getBrandStyle(qr.business_settings || {});
  const activeTicketUrl = !qr.claim_required && qr.token ? buildValidatorUrl(qr.token) : null;
  const finalTicketUrl = qr.final_qr_token ? buildValidatorUrl(qr.final_qr_token) : activeTicketUrl;
  const finalTicketId = qr.final_qr_code_id || (!qr.claim_required ? qr.id : null);
  const finalTicketExpiresAt = qr.final_qr_expires_at || (!qr.claim_required ? qr.expires_at : null);
  const finalTicketCreatedAt = qr.final_qr_created_at || (!qr.claim_required ? qr.claimed_at : null);
  const finalTicketImageDataUrl = finalTicketId && finalTicketUrl
    ? brand.ticketFrameUrl
      ? await buildBrandedTicketSvgDataUrl({
          scanUrl: finalTicketUrl,
          brand,
          detailLines: buildTicketDetailLines({
            label: qr.benefit_value?.label || qr.benefit_type || "Beneficio",
            expiresAt: finalTicketExpiresAt,
            code: shortTicketCode({ id: finalTicketId, token: qr.final_qr_token || qr.token }),
          }),
        })
      : await QRCode.toDataURL(finalTicketUrl)
    : null;

  return {
    status: qr.status,
    allowed: qr.status === "UNCLAIMED",
    message: buildClaimMessage(qr.status),
    business: { id: qr.business_id, name: qr.business_name },
    campaign: qr.campaign_id ? { id: qr.campaign_id, name: qr.campaign_name } : null,
    qr_code: {
      id: qr.id,
      origin_type: qr.origin_type,
      claim_required: qr.claim_required,
      claimed_at: qr.claimed_at,
      redeemed_at: qr.redeemed_at,
      expires_at: qr.expires_at,
    },
    benefit: {
      type: qr.benefit_type,
      value: qr.benefit_value || {},
    },
    final_ticket: finalTicketId
      ? {
          id: finalTicketId,
          status: qr.final_qr_status || qr.status,
          validator_url: finalTicketUrl,
          qr_image_data_url: finalTicketImageDataUrl,
          created_at: finalTicketCreatedAt,
          expires_at: finalTicketExpiresAt,
        }
      : null,
    player: qr.player_id
      ? {
          id: qr.player_id,
          name: qr.player_name,
          phone: qr.player_phone,
          email: qr.player_email,
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
  };
}

async function claimQr(tokenInput, body) {
  const token = normalizeToken(tokenInput);
  if (!token) {
    throw badRequest("Token is required.");
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `select q.*, a.full_name as affiliate_name, a.document_id as affiliate_document_id, a.phone as affiliate_phone
       from qr_codes q
       left join affiliates a on a.id = q.affiliate_id
       where q.token = $1
       for update of q`,
      [token]
    );
    const qr = result.rows[0];
    if (!qr) {
      throw notFound("Este QR no existe.");
    }
    if (!qr.claim_required) {
      throw badRequest("Este QR no requiere activacion previa.");
    }
    if (qr.status === "REDEEMED") {
      throw badRequest("Este QR ya fue redimido.");
    }
    if (qr.status === "EXPIRED") {
      throw badRequest("Este QR ya expiro.");
    }
    if (qr.status === "CANCELLED") {
      throw badRequest("Este QR fue cancelado.");
    }
    if (qr.expires_at && new Date(qr.expires_at) <= new Date()) {
      await client.query("update qr_codes set status = 'EXPIRED' where id = $1", [qr.id]);
      throw badRequest("Este QR ya expiro.");
    }
    if (qr.status !== "UNCLAIMED") {
      const existing = await getClaimDetails(token);
      return existing;
    }

    const playerResult = await client.query(
      `insert into players (business_id, campaign_id, game_id, name, email, phone, document_id, metadata)
       values ($1, $2, null, $3, $4, $5, $6, $7)
       returning *`,
      [
        qr.business_id,
        qr.campaign_id || null,
        body.name,
        body.email || null,
        body.phone || null,
        body.document_id || null,
        {
          source: body.source || "claim",
          claim: true,
          affiliate_referral_id: qr.affiliate_id || null,
          affiliate_referral_name: qr.affiliate_name || null,
          ...body.metadata,
        },
      ]
    );
    const player = playerResult.rows[0];
    const finalToken = createSecureToken();
    const finalMetadata = {
      ...(qr.metadata || {}),
      strategic_qr: true,
      package_ticket_role: "final_validable_qr",
      issued_from_claim_qr_id: qr.id,
      source_batch_id: qr.batch_id || null,
      source_origin_type: qr.origin_type,
      source_token_preview: token.slice(0, 10),
      campaign_id: qr.campaign_id || null,
      lead_player_id: player.id,
      affiliate_id: qr.affiliate_id || null,
      affiliate_name: qr.affiliate_name || null,
    };

    const finalQrResult = await client.query(
      `insert into qr_codes
        (business_id, campaign_id, game_id, player_id, reward_id, token, status, metadata, expires_at, batch_id, origin_type, benefit_type, benefit_value, sale_id, claim_required, claimed_at, claimed_by_player_id, affiliate_id)
       values ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8, null, $9, $10, $11, null, false, now(), $4, $12)
       returning *`,
      [
        qr.business_id,
        qr.campaign_id || null,
        qr.game_id || null,
        player.id,
        qr.reward_id || null,
        finalToken,
        finalMetadata,
        qr.expires_at || null,
        qr.origin_type,
        qr.benefit_type,
        qr.benefit_value || {},
        qr.affiliate_id || null,
      ]
    );
    const finalQr = finalQrResult.rows[0];

    await client.query(
      `insert into qr_claims (business_id, qr_code_id, player_id, source, metadata)
       values ($1, $2, $3, $4, $5)`,
      [
        qr.business_id,
        qr.id,
        player.id,
        body.source || "claim",
        {
          affiliate_id: qr.affiliate_id || null,
          affiliate_name: qr.affiliate_name || null,
          campaign_id: qr.campaign_id || null,
          source_batch_id: qr.batch_id || null,
          final_qr_code_id: finalQr.id,
          final_token_preview: finalToken.slice(0, 10),
          ...(body.metadata || {}),
        },
      ]
    );

    await client.query(
      `update qr_codes
       set player_id = $2,
           claimed_by_player_id = $2,
           claimed_at = now(),
           status = 'CLAIMED',
           metadata = metadata || $3::jsonb
       where id = $1`,
      [
        qr.id,
        player.id,
        {
          package_ticket_role: "initial_claim_qr",
          final_qr_code_id: finalQr.id,
          final_token_preview: finalToken.slice(0, 10),
          claimed_player_id: player.id,
        },
      ]
    );

    await logQrEvent(client, {
      business_id: qr.business_id,
      campaign_id: qr.campaign_id,
      qr_code_id: qr.id,
      player_id: player.id,
      event_type: "QR_CLAIMED",
      message: "Pre-created QR claimed by customer.",
      metadata: {
        source: body.source || "claim",
        affiliate_id: qr.affiliate_id || null,
        affiliate_name: qr.affiliate_name || null,
        final_qr_code_id: finalQr.id,
      },
    });

    await logQrEvent(client, {
      business_id: qr.business_id,
      campaign_id: qr.campaign_id,
      qr_code_id: finalQr.id,
      batch_id: qr.batch_id || null,
      player_id: player.id,
      event_type: "QR_FINAL_TICKET_ISSUED",
      message: "Final validable QR issued after lead claim.",
      metadata: {
        source_qr_code_id: qr.id,
        source: body.source || "claim",
        origin_type: qr.origin_type,
        affiliate_id: qr.affiliate_id || null,
        affiliate_name: qr.affiliate_name || null,
      },
    });

    const businessResult = await client.query(
      `select id, name, ${BUSINESS_BRAND_SETTINGS_SQL} as business_settings
       from businesses b
       where id = $1`,
      [qr.business_id]
    );
    const campaignResult = qr.campaign_id
      ? await client.query("select name from campaigns where id = $1", [qr.campaign_id])
      : { rows: [] };
    const business = businessResult.rows[0] || null;
    const brand = getBrandStyle(business?.business_settings || {});
    const finalTicketUrl = buildValidatorUrl(finalToken);
    const finalTicketImageDataUrl = brand.ticketFrameUrl
      ? await buildBrandedTicketSvgDataUrl({
          scanUrl: finalTicketUrl,
          brand,
          detailLines: buildTicketDetailLines({
            label: qr.benefit_value?.label || qr.benefit_type || "Beneficio",
            expiresAt: finalQr.expires_at,
            code: shortTicketCode(finalQr),
          }),
        })
      : await QRCode.toDataURL(finalTicketUrl);

    return {
      status: "ACTIVE",
      allowed: false,
      message: "Tu beneficio ya esta activo y listo para redimir.",
      business: { id: qr.business_id, name: business?.name || null },
      campaign: qr.campaign_id ? { id: qr.campaign_id, name: campaignResult.rows[0]?.name || null } : null,
      qr_code: {
        id: qr.id,
        origin_type: qr.origin_type,
        claim_required: qr.claim_required,
        claimed_at: new Date().toISOString(),
        redeemed_at: qr.redeemed_at,
        expires_at: qr.expires_at,
      },
      benefit: {
        type: qr.benefit_type,
        value: qr.benefit_value || {},
      },
      final_ticket: {
        id: finalQr.id,
        status: finalQr.status,
        validator_url: finalTicketUrl,
        qr_image_data_url: finalTicketImageDataUrl,
        created_at: finalQr.created_at,
        expires_at: finalQr.expires_at,
      },
      player: {
        id: player.id,
        name: player.name,
        phone: player.phone,
        email: player.email,
      },
      affiliate: qr.affiliate_id
        ? {
            id: qr.affiliate_id,
            name: qr.affiliate_name,
            document_id: qr.affiliate_document_id,
            phone: qr.affiliate_phone,
          }
        : null,
    };
  });
}

function buildClaimMessage(status) {
  if (status === "UNCLAIMED") {
    return "Activa este beneficio dejando tus datos.";
  }
  if (status === "ACTIVE") {
    return "Tu beneficio ya esta activo y listo para redimir.";
  }
  if (status === "CLAIMED") {
    return "Este QR inicial ya emitio un ticket final.";
  }
  if (status === "REDEEMED") {
    return "Este QR ya fue redimido.";
  }
  if (status === "EXPIRED") {
    return "Este QR ya expiro.";
  }
  if (status === "CANCELLED") {
    return "Este QR fue cancelado.";
  }
  return "Este QR no es valido.";
}

module.exports = {
  buildValidatorUrl,
  buildClaimUrl,
  createPostSaleQr,
  createQrBatch,
  createAffiliateReferralQrBatch,
  listQrBatches,
  getQrBatch,
  getQrHistory,
  getQrMetrics,
  getIndividualQrDownload,
  getBatchCsvDownload,
  getBatchJsonDownload,
  getBatchPrintableHtml,
  getBatchZipDownload,
  getBatchPdfDownload,
  getClaimDetails,
  claimQr,
};
