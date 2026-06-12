const QRCode = require("qrcode");
const JSZip = require("jszip");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, notFound } = require("../utils/http");
const { createSecureToken, normalizeToken } = require("../utils/token");
const { logQrEvent } = require("./auditService");
const { consumeQrCredit, consumeQrCredits, ensureCreditAccount, mapPublicCreditAccount } = require("./qrCreditService");

function publicAppBaseUrl() {
  try {
    const parsed = new URL(env.publicValidatorUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "http://localhost:3000";
  }
}

function buildValidatorUrl(token) {
  const base = env.publicValidatorUrl.replace(/\/$/, "");
  return `${base}/?token=${encodeURIComponent(token)}`;
}

function buildClaimUrl(token) {
  return `${publicAppBaseUrl()}/claim/${encodeURIComponent(token)}`;
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

async function createPostSaleQr(businessId, user, body) {
  return withTransaction(async (client) => {
    const [reward] = await Promise.all([
      assertReward(client, businessId, body.benefit.reward_id),
      assertCampaign(client, businessId, body.campaign_id),
      assertBranch(client, businessId, body.branch_id),
    ]);

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
        source: "post-sale",
        product_name: body.product_name || null,
      }
    );

    const saleResult = await client.query(
      `insert into business_sales
        (business_id, campaign_id, customer_name, customer_phone, customer_email, product_name, sale_amount, currency, seller_user_id, branch_id, notes, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
      ]
    );
    const sale = saleResult.rows[0];

    const token = createSecureToken();
    const expiresAt = resolveExpiration(body);
    const benefitPayload = buildBenefitPayload(body.benefit, reward);

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
          origin_label: "QR postventa",
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
      message: "Post-sale QR created.",
      metadata: {
        origin_type: "POST_SALE",
        sale_id: sale.id,
        benefit_type: body.benefit.benefit_type,
      },
    });

    const validatorUrl = buildValidatorUrl(token);
    const businessResult = await client.query("select id, name from businesses where id = $1", [businessId]);

    return {
      sale,
      qr_code: qr,
      business: businessResult.rows[0] || null,
      credit_account: mapPublicCreditAccount(creditAccount),
      validator_url: validatorUrl,
      qr_content: validatorUrl,
      qr_image_data_url: await QRCode.toDataURL(validatorUrl),
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
    const reward = await assertReward(client, businessId, body.benefit.reward_id);
    await assertCampaign(client, businessId, body.campaign_id);
    const affiliate = await assertAffiliate(client, businessId, body.affiliate_id);
    const expiresAt = resolveExpiration(body);
    const benefitPayload = buildBenefitPayload(body.benefit, reward);

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
          claim_required: body.claim_required,
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
        status: body.claim_required ? "UNCLAIMED" : "ACTIVE",
        metadata: {
          strategic_qr: true,
          origin_label: body.qr_origin_type === "AFFILIATE_REFERRAL" ? "QR recomendacion afiliado" : "Paquete QR",
          package_name: body.name,
          channel_use: body.channel_use,
          affiliate_id: affiliate?.id || null,
          affiliate_name: affiliate?.full_name || null,
        },
        expires_at: expiresAt,
        batch_id: batch.id,
        origin_type: body.qr_origin_type,
        benefit_type: body.benefit.benefit_type,
        benefit_value: benefitPayload,
        claim_required: body.claim_required,
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
        validator_url: buildValidatorUrl(qr.token),
        claim_url: buildClaimUrl(qr.token),
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
  return createQrBatch(businessId, user, {
    name: `QR recomendacion - ${row.full_name}`,
    description: body.notes || `QR unicos de recomendacion asignados a ${row.full_name}.`,
    quantity: body.quantity,
    campaign_id: null,
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
}

async function listQrBatches(businessId) {
  const result = await query(
    `select
       b.*,
       count(q.id)::int as generated_count,
       count(*) filter (where q.status = 'UNCLAIMED')::int as unclaimed_count,
       count(*) filter (where q.status = 'ACTIVE')::int as active_count,
       count(*) filter (where q.status = 'REDEEMED')::int as redeemed_count,
       count(*) filter (where q.status = 'EXPIRED')::int as expired_count
     from qr_batches b
     left join qr_codes q on q.batch_id = b.id
     where b.business_id = $1
     group by b.id
     order by b.created_at desc`,
    [businessId]
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

async function getQrHistory(businessId) {
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
       and q.origin_type in ('POST_SALE', 'PRODUCT_LABEL', 'BULK_PACKAGE', 'MANUAL_BENEFIT', 'LOYALTY', 'SURPRISE_REWARD', 'AFFILIATE_REFERRAL')
     order by q.created_at desc
     limit 500`,
    [businessId]
  );
  return result.rows.map((qr) => ({
    ...qr,
    validator_url: buildValidatorUrl(qr.token),
    claim_url: buildClaimUrl(qr.token),
  }));
}

async function getQrMetrics(businessId) {
  const [totals, benefitUsage, bySeller] = await Promise.all([
    query(
      `select
         count(*) filter (where origin_type = 'POST_SALE')::int as post_sale_generated,
         count(*) filter (where origin_type = 'POST_SALE' and status = 'REDEEMED')::int as post_sale_redeemed,
         count(distinct batch_id)::int as qr_batches_generated,
         count(*) filter (where origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE') and status in ('CLAIMED', 'ACTIVE', 'REDEEMED'))::int as label_qr_claimed_or_active,
         count(*) filter (where origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE') and status = 'REDEEMED')::int as label_qr_redeemed,
         count(*) filter (where origin_type in ('PRODUCT_LABEL', 'BULK_PACKAGE') and status = 'UNCLAIMED')::int as label_qr_unclaimed,
         count(*) filter (where origin_type = 'AFFILIATE_REFERRAL')::int as affiliate_referral_generated,
         count(*) filter (where origin_type = 'AFFILIATE_REFERRAL' and status in ('ACTIVE', 'REDEEMED'))::int as affiliate_referral_claimed_or_active,
         count(*) filter (where origin_type = 'AFFILIATE_REFERRAL' and status = 'REDEEMED')::int as affiliate_referral_redeemed,
         count(*) filter (where origin_type = 'AFFILIATE_REFERRAL' and status = 'UNCLAIMED')::int as affiliate_referral_unclaimed,
         count(*) filter (where status = 'EXPIRED')::int as expired_without_redeem
       from qr_codes
       where business_id = $1`,
      [businessId]
    ),
    query(
      `select benefit_type, count(*)::int as total
       from qr_codes
       where business_id = $1
         and origin_type in ('POST_SALE', 'PRODUCT_LABEL', 'BULK_PACKAGE', 'MANUAL_BENEFIT', 'LOYALTY', 'SURPRISE_REWARD', 'AFFILIATE_REFERRAL')
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
      expired_without_redeem: Number(top.expired_without_redeem || 0),
    },
    benefits: benefitUsage.rows,
    redemptions_by_seller: bySeller.rows,
  };
}

async function getIndividualQrDownload(businessId, qrId) {
  const result = await query(
    `select id, token, status
     from qr_codes
     where id = $1 and business_id = $2`,
    [qrId, businessId]
  );
  const qr = result.rows[0];
  if (!qr) {
    throw notFound("QR not found.");
  }
  const validatorUrl = buildValidatorUrl(qr.token);
  return {
    qr_code_id: qr.id,
    status: qr.status,
    validator_url: validatorUrl,
    filename: `strategic-qr-${String(qr.id).slice(0, 8)}.png`,
    qr_image_data_url: await QRCode.toDataURL(validatorUrl),
  };
}

async function getBatchCsvDownload(businessId, batchId) {
  const result = await query(
    `select id, token, status, created_at, expires_at
     from qr_codes
     where batch_id = $1 and business_id = $2
     order by created_at asc`,
    [batchId, businessId]
  );
  if (!result.rowCount) {
    throw notFound("QR batch not found.");
  }
  const lines = [
    ["qr_code_id", "token", "status", "validator_url", "claim_url", "created_at", "expires_at"].join(","),
    ...result.rows.map((row) =>
      [
        row.id,
        row.token,
        row.status,
        buildValidatorUrl(row.token),
        buildClaimUrl(row.token),
        row.created_at,
        row.expires_at || "",
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];
  return lines.join("\n");
}

async function getBatchJsonDownload(businessId, batchId) {
  const result = await query(
    `select id, token, status, created_at, expires_at, origin_type, benefit_type, benefit_value
     from qr_codes
     where batch_id = $1 and business_id = $2
     order by created_at asc`,
    [batchId, businessId]
  );
  if (!result.rowCount) {
    throw notFound("QR batch not found.");
  }
  return result.rows.map((row) => ({
    ...row,
    validator_url: buildValidatorUrl(row.token),
    claim_url: buildClaimUrl(row.token),
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
       b.name as business_name,
       b.settings as business_settings
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
  return {
    primary: typeof settings.brand_primary === "string" ? settings.brand_primary : "#13212c",
    secondary: typeof settings.brand_secondary === "string" ? settings.brand_secondary : "#945d20",
    logoUrl: typeof settings.logo_url === "string" ? settings.logo_url : "",
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

async function getBatchPrintableHtml(businessId, batchId, template = "sticker", paper = "a4") {
  const batch = await getBatchContext(businessId, batchId);
  const layout = resolvePrintTemplate(template);
  const paperSpec = resolvePaperSize(paper);
  const brand = getBrandStyle(batch.business_settings || {});

  const qrRows = await getBatchJsonDownload(businessId, batchId);
  const cards = await Promise.all(
    qrRows.map(async (row) => {
      const qrImage = await QRCode.toDataURL(buildClaimUrl(row.token));
      const label = row.benefit_value?.label || row.benefit_type || "Beneficio";
      return `
        <article class="label-card">
          <img src="${qrImage}" alt="QR ${row.id}">
          <h2>${escapeHtml(label)}</h2>
          <p>${escapeHtml(batch.name)}</p>
          <small>${escapeHtml(row.origin_type)} | ${escapeHtml(row.status)}</small>
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
    .label-card { background: #fff; border: 1px solid #ddd; border-top: 4px solid ${brand.primary}; border-radius: 14px; padding: ${layout.htmlCardPadding}px; text-align: center; break-inside: avoid; }
    .label-card img { width: ${layout.qrSize + 30}px; height: ${layout.qrSize + 30}px; object-fit: contain; }
    .label-card h2 { margin: 10px 0 6px; font-size: ${layout.titleSize + 5}px; }
    .label-card p { margin: 0 0 6px; font-size: 13px; color: #444; }
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
  const zip = new JSZip();

  for (const row of qrRows) {
    const png = await QRCode.toBuffer(buildClaimUrl(row.token), {
      type: "png",
      width: 900,
      margin: 1,
    });
    zip.file(`qr-${String(row.id).slice(0, 8)}.png`, png);
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

    const col = slot % columns;
    const rowIndex = Math.floor(slot / columns);
    const x = margin + col * (cardWidth + cardGap);
    const y = pageHeight - 92 - rowIndex * (cardHeight + cardGap) - cardHeight;

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

    const png = await QRCode.toBuffer(buildClaimUrl(row.token), {
      type: "png",
      width: 900,
      margin: 1,
    });
    const image = await pdf.embedPng(png);
    const imageSize = layout.qrSize;
    page.drawImage(image, {
      x: x + (cardWidth - imageSize) / 2,
      y: y + Math.max(60, cardHeight - imageSize - 30),
      width: imageSize,
      height: imageSize,
    });

    const title = row.benefit_value?.label || row.benefit_type || "Beneficio";
    page.drawText(title.slice(0, 36), {
      x: x + 10,
      y: y + 44,
      size: layout.titleSize,
      font: bold,
      color: primaryColor,
      maxWidth: cardWidth - 20,
    });
    page.drawText((row.origin_type || "").slice(0, 30), {
      x: x + 10,
      y: y + 30,
      size: 8,
      font,
      color: rgb(0.36, 0.4, 0.44),
    });
    page.drawText(String(row.id).slice(0, 8), {
      x: x + 10,
      y: y + 20,
      size: 8,
      font,
      color: rgb(0.36, 0.4, 0.44),
    });
    page.drawText(row.status, {
      x: x + cardWidth - 52,
      y: y + 20,
      size: 8,
      font: bold,
      color: rgb(0.08, 0.13, 0.17),
    });
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
       b.name as business_name,
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
          ...(body.metadata || {}),
        },
      ]
    );

    await client.query(
      `update qr_codes
       set player_id = $2,
           claimed_by_player_id = $2,
           claimed_at = now(),
           status = 'ACTIVE'
       where id = $1`,
      [qr.id, player.id]
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
      },
    });

    const businessResult = await client.query("select name from businesses where id = $1", [qr.business_id]);
    const campaignResult = qr.campaign_id
      ? await client.query("select name from campaigns where id = $1", [qr.campaign_id])
      : { rows: [] };

    return {
      status: "ACTIVE",
      allowed: false,
      message: "Tu beneficio ya esta activo y listo para redimir.",
      business: { id: qr.business_id, name: businessResult.rows[0]?.name || null },
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
    return "Este QR ya fue reclamado.";
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
