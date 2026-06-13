const { query } = require("../config/db");
const { safeDivide, safeRate, safeRoi } = require("./metricsService");

const QR_TYPE_LABELS = {
  CAMPAIGN_GAME: "Campana",
  POST_SALE: "Postventa",
  PRODUCT_LABEL: "Empaque",
  BULK_PACKAGE: "Volante / lote",
  MANUAL_BENEFIT: "Estrategico",
  LOYALTY: "Fidelizacion",
  SURPRISE_REWARD: "Sorpresa",
  AFFILIATE_REFERRAL: "Afiliado",
};

const SOURCE_LABELS = {
  STORE_WALK_IN: "Vitrina / punto de venta",
  FRIEND_REFERRAL: "Referidos",
  FAIR_EVENT: "Feria o evento",
  INTERNET_SEARCH: "Internet / buscador",
  SOCIAL_MEDIA: "Redes sociales",
  PAID_ADS: "Pauta digital",
  QR_SCAN: "QR fisico / impreso",
  OTHER: "Otro",
  QR_REDEMPTION: "QR redimido",
};

function number(value) {
  return Number(value || 0);
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(number(value) * factor) / factor;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDate(value, fallback) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function normalizeFilters(raw = {}) {
  const now = new Date();
  const defaultStart = addDays(now, -29);
  const start = parseDate(raw.startDate, defaultStart);
  const end = parseDate(raw.endDate, now);
  const normalizedEnd = new Date(end);
  normalizedEnd.setHours(23, 59, 59, 999);
  const days = Math.max(1, Math.ceil((normalizedEnd - start) / 86400000));
  const previousEnd = addDays(start, -1);
  previousEnd.setHours(23, 59, 59, 999);
  const previousStart = addDays(start, -days);

  return {
    startDate: isoDate(start),
    endDate: isoDate(normalizedEnd),
    previousStartDate: isoDate(previousStart),
    previousEndDate: isoDate(previousEnd),
    campaignId: raw.campaignId || null,
    channel: raw.channel || null,
    branchId: raw.branchId || null,
    qrStatus: raw.qrStatus || null,
    qrType: raw.qrType || null,
    sellerId: raw.sellerId || null,
    affiliateId: raw.affiliateId || null,
    comparePrevious: raw.comparePrevious !== "false",
  };
}

function salesUnionSql() {
  return `
    select business_id, campaign_id, qr_code_id, branch_id, sale_amount, currency, created_at,
           payment_method, product_or_service as product_name, null::text as acquisition_source,
           null::text as acquisition_channel, null::uuid as referred_affiliate_id,
           sale_confirmed_by_user_id as seller_user_id
    from attributed_sales
    union all
    select business_id, campaign_id, qr_code_id, branch_id, sale_amount, currency, created_at,
           null::text as payment_method, product_name, acquisition_source,
           acquisition_channel, referred_affiliate_id, seller_user_id
    from business_sales
    where qr_code_id is null
  `;
}

function scopedWhere(params, businessId, filters, config = {}) {
  const clauses = [`${config.businessColumn || "business_id"} = $${params.push(businessId)}`];
  if (config.dateColumn) {
    clauses.push(`${config.dateColumn} >= $${params.push(filters.startDate)}::timestamptz`);
    clauses.push(`${config.dateColumn} < ($${params.push(filters.endDate)}::date + interval '1 day')`);
  }
  if (filters.campaignId && config.campaignColumn) {
    clauses.push(`${config.campaignColumn} = $${params.push(filters.campaignId)}::uuid`);
  }
  if (filters.branchId && config.branchColumn) {
    clauses.push(`${config.branchColumn} = $${params.push(filters.branchId)}::uuid`);
  }
  if (filters.qrStatus && config.qrStatusColumn) {
    clauses.push(`${config.qrStatusColumn} = $${params.push(filters.qrStatus)}`);
  }
  if (filters.qrType && config.qrTypeColumn) {
    clauses.push(`${config.qrTypeColumn} = $${params.push(filters.qrType)}`);
  }
  if (filters.affiliateId && config.affiliateColumn) {
    clauses.push(`${config.affiliateColumn} = $${params.push(filters.affiliateId)}::uuid`);
  }
  if (filters.sellerId && config.sellerColumn) {
    clauses.push(`${config.sellerColumn} = $${params.push(filters.sellerId)}::uuid`);
  }
  if (filters.channel && config.channelExpression) {
    clauses.push(`${config.channelExpression} = $${params.push(filters.channel)}`);
  }
  return clauses.join(" and ");
}

async function getTotals(businessId, filters, period = "current") {
  const scoped = { ...filters };
  if (period === "previous") {
    scoped.startDate = filters.previousStartDate;
    scoped.endDate = filters.previousEndDate;
  }

  const leadParams = [];
  const qrParams = [];
  const redemptionParams = [];
  const salesParams = [];
  const [leads, qr, redemptions, sales] = await Promise.all([
    query(
      `select count(*)::int as leads
       from players
       where ${scopedWhere(leadParams, businessId, scoped, {
         dateColumn: "created_at",
         campaignColumn: "campaign_id",
       })}`,
      leadParams
    ),
    query(
      `select
         count(*)::int as qr_generated,
         count(*) filter (where status = 'ACTIVE')::int as active_qr,
         count(*) filter (where status = 'REDEEMED')::int as redeemed_qr,
         count(*) filter (where status = 'EXPIRED')::int as expired_qr,
         count(*) filter (where status = 'CLAIMED')::int as claimed_qr,
         count(*) filter (where status = 'CANCELLED' or status = 'INVALID')::int as cancelled_qr
       from qr_codes
       where ${scopedWhere(qrParams, businessId, scoped, {
         dateColumn: "created_at",
         campaignColumn: "campaign_id",
         qrStatusColumn: "status",
         qrTypeColumn: "origin_type",
         affiliateColumn: "affiliate_id",
       })}`,
      qrParams
    ),
    query(
      `select count(*)::int as redemptions
       from redemptions rd
       left join qr_codes q on q.id = rd.qr_code_id
       where ${scopedWhere(redemptionParams, businessId, scoped, {
         businessColumn: "rd.business_id",
         dateColumn: "rd.redeemed_at",
         campaignColumn: "rd.campaign_id",
         branchColumn: "rd.branch_id",
         qrStatusColumn: "q.status",
         qrTypeColumn: "q.origin_type",
         affiliateColumn: "q.affiliate_id",
         sellerColumn: "rd.redeemed_by_user_id",
       })}`,
      redemptionParams
    ),
    query(
      `with sales as (${salesUnionSql()})
       select
         count(*)::int as sales_count,
         coalesce(sum(sale_amount), 0)::numeric(14, 2) as revenue,
         count(*) filter (where referred_affiliate_id is not null)::int as referred_buyers
       from sales s
       left join qr_codes q on q.id = s.qr_code_id
       where ${scopedWhere(salesParams, businessId, scoped, {
         businessColumn: "s.business_id",
         dateColumn: "s.created_at",
         campaignColumn: "s.campaign_id",
         branchColumn: "s.branch_id",
         qrStatusColumn: "q.status",
         qrTypeColumn: "q.origin_type",
         affiliateColumn: "coalesce(s.referred_affiliate_id, q.affiliate_id)",
         sellerColumn: "s.seller_user_id",
         channelExpression: "coalesce(nullif(s.acquisition_channel, ''), s.acquisition_source, 'QR_REDEMPTION')",
       })}`,
      salesParams
    ),
  ]);

  const row = {
    ...leads.rows[0],
    ...qr.rows[0],
    ...redemptions.rows[0],
    ...sales.rows[0],
  };
  const revenue = number(row.revenue);
  const salesCount = number(row.sales_count);
  const investment = 0;
  return {
    leads: number(row.leads),
    qr_generated: number(row.qr_generated),
    active_qr: number(row.active_qr),
    redeemed_qr: number(row.redeemed_qr),
    expired_qr: number(row.expired_qr),
    claimed_qr: number(row.claimed_qr),
    cancelled_qr: number(row.cancelled_qr),
    redemptions: number(row.redemptions),
    sales_count: salesCount,
    revenue,
    referred_buyers: number(row.referred_buyers),
    redemption_rate: safeRate(row.redemptions, row.qr_generated),
    conversion_rate: safeRate(salesCount, row.leads),
    avg_ticket: safeDivide(revenue, salesCount) || 0,
    cac_estimated: safeDivide(investment, salesCount) || 0,
    roi_estimated: safeRoi(revenue, investment),
  };
}

function delta(current, previous) {
  const c = number(current);
  const p = number(previous);
  if (!p && !c) return 0;
  if (!p) return 100;
  return round(((c - p) / p) * 100, 1);
}

function kpiItems(current, previous, topBranch, topChannel, affiliateSummary) {
  const items = [
    ["revenue", "Revenue atribuido", current.revenue, "money", delta(current.revenue, previous.revenue), "payments", "Ventas reales registradas y atribuibles al RMS."],
    ["sales", "Ventas registradas", current.sales_count, "number", delta(current.sales_count, previous.sales_count), "point_of_sale", "Compras capturadas por redencion o sales tracker."],
    ["leads", "Leads capturados", current.leads, "number", delta(current.leads, previous.leads), "person_add", "Contactos identificados por campañas, juegos, formularios o QR."],
    ["qr", "QR generados", current.qr_generated, "number", delta(current.qr_generated, previous.qr_generated), "qr_code_2", "Beneficios o piezas QR emitidas en el periodo."],
    ["active_qr", "QR activos", current.active_qr, "number", delta(current.active_qr, previous.active_qr), "bolt", "QR disponibles para activar visita o redencion."],
    ["redeemed_qr", "QR redimidos", current.redeemed_qr || current.redemptions, "number", delta(current.redeemed_qr || current.redemptions, previous.redeemed_qr || previous.redemptions), "verified", "QR que llegaron a redencion real."],
    ["expired_qr", "QR vencidos", current.expired_qr, "number", delta(current.expired_qr, previous.expired_qr), "timer_off", "Beneficios no usados antes del vencimiento."],
    ["redemption_rate", "Tasa de redencion", current.redemption_rate, "percent", delta(current.redemption_rate, previous.redemption_rate), "conversion_path", "Porcentaje de QR emitidos que se redimieron."],
    ["conversion_rate", "Lead -> venta", current.conversion_rate, "percent", delta(current.conversion_rate, previous.conversion_rate), "shopping_cart_checkout", "Capacidad para convertir interes en compra."],
    ["avg_ticket", "Ticket promedio", current.avg_ticket, "money", delta(current.avg_ticket, previous.avg_ticket), "receipt_long", "Revenue promedio por venta registrada."],
    ["cac", "CAC estimado", current.cac_estimated, "money", delta(current.cac_estimated, previous.cac_estimated), "target", "Costo estimado por venta segun inversion disponible."],
    ["roi", "ROI estimado", current.roi_estimated ?? 0, "ratio", delta(current.roi_estimated, previous.roi_estimated), "trending_up", "Retorno calculado cuando hay presupuesto de campana."],
    ["affiliates", "Afiliados activos", affiliateSummary.active_affiliates, "number", 0, "groups", "Afiliados disponibles para recomendacion y referidos."],
    ["referrals", "Referidos compradores", current.referred_buyers, "number", delta(current.referred_buyers, previous.referred_buyers), "diversity_3", "Ventas con afiliado o referido identificado."],
    ["branch", "Sucursal lider", topBranch?.branch_name || "Sin datos", "text", topBranch?.conversion_rate || 0, "storefront", "Punto de venta con mejor revenue o conversion."],
    ["channel", "Canal ganador", topChannel?.label || "Sin datos", "text", topChannel?.conversion_rate || 0, "hub", "Medio que aporta mas revenue o ventas."],
  ];

  return items.map(([key, label, value, format, change, icon, help]) => ({
    key,
    label,
    value,
    format,
    change,
    icon,
    help,
    state: key === "expired_qr" || key === "cac"
      ? (change > 8 ? "negative" : "positive")
      : (change < -8 ? "negative" : change > 8 ? "positive" : "neutral"),
  }));
}

async function getOptions(businessId) {
  const [campaigns, branches, affiliates, sellers, channels, qrTypes, statuses] = await Promise.all([
    query("select id, name from campaigns where business_id = $1 order by created_at desc", [businessId]),
    query("select id, name from branches where business_id = $1 order by name asc", [businessId]),
    query("select id, full_name as name from affiliates where business_id = $1 order by full_name asc", [businessId]),
    query(
      `select distinct u.id, u.full_name as name
       from app_users u
       where u.business_id = $1
         and u.is_active = true
         and (
           u.role in ('VALIDATOR', 'BUSINESS_OWNER')
           or exists (select 1 from redemptions rd where rd.redeemed_by_user_id = u.id)
           or exists (select 1 from attributed_sales s where s.sale_confirmed_by_user_id = u.id)
           or exists (select 1 from business_sales bs where bs.seller_user_id = u.id)
         )
       order by u.full_name asc`,
      [businessId]
    ),
    query(
      `select distinct value as channel
       from (
         select coalesce(nullif(acquisition_channel, ''), acquisition_source) as value
         from business_sales
         where business_id = $1
         union
         select channel_use as value
         from qr_batches
         where business_id = $1
       ) x
       where value is not null
       order by value asc`,
      [businessId]
    ),
    query("select distinct origin_type from qr_codes where business_id = $1 order by origin_type", [businessId]),
    query("select distinct status from qr_codes where business_id = $1 order by status", [businessId]),
  ]);
  return {
    campaigns: campaigns.rows,
    branches: branches.rows,
    affiliates: affiliates.rows,
    sellers: sellers.rows,
    channels: channels.rows.map((row) => ({ value: row.channel, label: SOURCE_LABELS[row.channel] || row.channel })),
    qr_types: qrTypes.rows.map((row) => ({ value: row.origin_type, label: QR_TYPE_LABELS[row.origin_type] || row.origin_type })),
    qr_statuses: statuses.rows.map((row) => ({ value: row.status, label: row.status })),
  };
}

async function getSeriesAndCharts(businessId, filters) {
  const params = [];
  const salesParams = [];
  const heatmapParams = [];
  const campaignParams = [];
  const matrixParams = [];
  const qrStatusParams = [];
  const branchParams = [];
  const affiliateParams = [];
  const cohortParams = [];

  const [
    timeline,
    channelRows,
    heatmap,
    campaigns,
    matrix,
    qrStatus,
    branches,
    affiliates,
    cohorts,
  ] = await Promise.all([
    query(
      `with days as (
         select generate_series($${params.push(filters.startDate)}::date, $${params.push(filters.endDate)}::date, interval '1 day')::date as day
       ),
       leads as (
         select players.created_at::date as day, count(*)::int as leads
         from players
         where ${scopedWhere(params, businessId, filters, { dateColumn: "created_at", campaignColumn: "campaign_id" })}
         group by players.created_at::date
       ),
       qr as (
         select qr_codes.created_at::date as day, count(*)::int as qr_generated
         from qr_codes
         where ${scopedWhere(params, businessId, filters, {
           dateColumn: "created_at",
           campaignColumn: "campaign_id",
           qrStatusColumn: "status",
           qrTypeColumn: "origin_type",
           affiliateColumn: "affiliate_id",
         })}
         group by qr_codes.created_at::date
       ),
       redemptions as (
         select rd.redeemed_at::date as day, count(*)::int as redemptions
         from redemptions rd
         left join qr_codes q on q.id = rd.qr_code_id
         where ${scopedWhere(params, businessId, filters, {
           businessColumn: "rd.business_id",
           dateColumn: "rd.redeemed_at",
           campaignColumn: "rd.campaign_id",
           branchColumn: "rd.branch_id",
           qrStatusColumn: "q.status",
           qrTypeColumn: "q.origin_type",
           affiliateColumn: "q.affiliate_id",
           sellerColumn: "rd.redeemed_by_user_id",
         })}
         group by rd.redeemed_at::date
       ),
       sales_union as (${salesUnionSql()}),
       sales as (
         select s.created_at::date as day, count(*)::int as sales, coalesce(sum(s.sale_amount), 0)::numeric(14, 2) as revenue
         from sales_union s
         left join qr_codes q on q.id = s.qr_code_id
         where ${scopedWhere(params, businessId, filters, {
           businessColumn: "s.business_id",
           dateColumn: "s.created_at",
           campaignColumn: "s.campaign_id",
           branchColumn: "s.branch_id",
           qrStatusColumn: "q.status",
           qrTypeColumn: "q.origin_type",
           affiliateColumn: "coalesce(s.referred_affiliate_id, q.affiliate_id)",
           sellerColumn: "s.seller_user_id",
           channelExpression: "coalesce(nullif(s.acquisition_channel, ''), s.acquisition_source, 'QR_REDEMPTION')",
         })}
         group by s.created_at::date
       )
       select to_char(d.day, 'YYYY-MM-DD') as date,
              coalesce(l.leads, 0)::int as leads,
              coalesce(qr.qr_generated, 0)::int as qr_generated,
              coalesce(r.redemptions, 0)::int as redemptions,
              coalesce(s.sales, 0)::int as sales,
              coalesce(s.revenue, 0)::numeric(14, 2) as revenue
       from days d
       left join leads l on l.day = d.day
       left join qr on qr.day = d.day
       left join redemptions r on r.day = d.day
       left join sales s on s.day = d.day
       order by d.day`,
      params
    ),
    query(
      `with sales as (${salesUnionSql()})
       select coalesce(nullif(s.acquisition_channel, ''), s.acquisition_source, 'QR_REDEMPTION') as channel,
              count(*)::int as sales,
              coalesce(sum(s.sale_amount), 0)::numeric(14, 2) as revenue
       from sales s
       left join qr_codes q on q.id = s.qr_code_id
       where ${scopedWhere(salesParams, businessId, filters, {
         businessColumn: "s.business_id",
         dateColumn: "s.created_at",
         campaignColumn: "s.campaign_id",
         branchColumn: "s.branch_id",
         qrStatusColumn: "q.status",
         qrTypeColumn: "q.origin_type",
         affiliateColumn: "coalesce(s.referred_affiliate_id, q.affiliate_id)",
         channelExpression: "coalesce(nullif(s.acquisition_channel, ''), s.acquisition_source, 'QR_REDEMPTION')",
       })}
       group by channel
       order by revenue desc, sales desc
       limit 12`,
      salesParams
    ),
    query(
      `select extract(dow from rd.redeemed_at)::int as dow,
              extract(hour from rd.redeemed_at)::int as hour,
              count(*)::int as redemptions
       from redemptions rd
       left join qr_codes q on q.id = rd.qr_code_id
       where ${scopedWhere(heatmapParams, businessId, filters, {
         businessColumn: "rd.business_id",
         dateColumn: "rd.redeemed_at",
         campaignColumn: "rd.campaign_id",
         branchColumn: "rd.branch_id",
         qrStatusColumn: "q.status",
         qrTypeColumn: "q.origin_type",
         affiliateColumn: "q.affiliate_id",
         sellerColumn: "rd.redeemed_by_user_id",
       })}
       group by dow, hour
       order by dow, hour`,
      heatmapParams
    ),
    query(
      `with sales as (${salesUnionSql()})
       select c.id, coalesce(c.name, 'Sin campana') as campaign_name,
              c.status as campaign_status,
              coalesce(c.budget_total, 0)::numeric(14, 2) as investment,
              count(distinct p.id)::int as leads,
              count(distinct q.id)::int as qr_generated,
              count(distinct rd.id)::int as redemptions,
              count(distinct s.created_at::text || s.sale_amount::text || coalesce(s.qr_code_id::text, ''))::int as sales,
              coalesce(sum(s.sale_amount), 0)::numeric(14, 2) as revenue
       from campaigns c
       left join players p on p.campaign_id = c.id and p.created_at >= $${campaignParams.push(filters.startDate)}::timestamptz and p.created_at < ($${campaignParams.push(filters.endDate)}::date + interval '1 day')
       left join qr_codes q on q.campaign_id = c.id
       left join redemptions rd on rd.campaign_id = c.id and rd.redeemed_at >= $${campaignParams.push(filters.startDate)}::timestamptz and rd.redeemed_at < ($${campaignParams.push(filters.endDate)}::date + interval '1 day')
       left join sales s on s.campaign_id = c.id and s.created_at >= $${campaignParams.push(filters.startDate)}::timestamptz and s.created_at < ($${campaignParams.push(filters.endDate)}::date + interval '1 day')
       where c.business_id = $${campaignParams.push(businessId)}
         and ($${campaignParams.push(filters.campaignId)}::uuid is null or c.id = $${campaignParams.length}::uuid)
       group by c.id, c.name, c.status, c.budget_total
       order by revenue desc, redemptions desc, leads desc
       limit 16`,
      campaignParams
    ),
    query(
      `with sales as (${salesUnionSql()}),
       lead_events as (
         select p.campaign_id,
                coalesce(c.name, 'Sin campana') as campaign_name,
                coalesce(
                  nullif(qn.answers->>'preferred_channel', ''),
                  nullif(qn.answers->>'source', ''),
                  nullif(p.metadata->>'preferred_channel', ''),
                  nullif(p.metadata->>'source', ''),
                  'Sin canal'
                ) as channel,
                count(distinct p.id)::int as leads,
                0::int as qr_generated,
                0::int as redemptions,
                0::int as sales,
                0::numeric(14, 2) as revenue
         from players p
         left join campaigns c on c.id = p.campaign_id and c.business_id = p.business_id
         left join lateral (
           select answers
           from questionnaires
           where player_id = p.id and business_id = p.business_id
           order by created_at desc
           limit 1
         ) qn on true
         where p.business_id = $${matrixParams.push(businessId)}
           and p.created_at >= $${matrixParams.push(filters.startDate)}::timestamptz
           and p.created_at < ($${matrixParams.push(filters.endDate)}::date + interval '1 day')
           and ($${matrixParams.push(filters.campaignId)}::uuid is null or p.campaign_id = $${matrixParams.length}::uuid)
         group by p.campaign_id, c.name, channel
       ),
       qr_events as (
         select q.campaign_id,
                coalesce(c.name, 'Sin campana') as campaign_name,
                coalesce(nullif(qb.channel_use, ''), nullif(q.metadata->>'channel', ''), c.launch_channels->>0, 'QR fisico / impreso') as channel,
                0::int as leads,
                count(distinct q.id)::int as qr_generated,
                0::int as redemptions,
                0::int as sales,
                0::numeric(14, 2) as revenue
         from qr_codes q
         left join campaigns c on c.id = q.campaign_id and c.business_id = q.business_id
         left join qr_batches qb on qb.id = q.batch_id and qb.business_id = q.business_id
         where q.business_id = $${matrixParams.push(businessId)}
           and q.created_at >= $${matrixParams.push(filters.startDate)}::timestamptz
           and q.created_at < ($${matrixParams.push(filters.endDate)}::date + interval '1 day')
           and ($${matrixParams.push(filters.campaignId)}::uuid is null or q.campaign_id = $${matrixParams.length}::uuid)
           and ($${matrixParams.push(filters.qrStatus)}::text is null or q.status::text = $${matrixParams.length}::text)
           and ($${matrixParams.push(filters.qrType)}::text is null or q.origin_type::text = $${matrixParams.length}::text)
           and ($${matrixParams.push(filters.affiliateId)}::uuid is null or q.affiliate_id = $${matrixParams.length}::uuid)
         group by q.campaign_id, c.name, channel
       ),
       redemption_events as (
         select rd.campaign_id,
                coalesce(c.name, 'Sin campana') as campaign_name,
                coalesce(nullif(qb.channel_use, ''), nullif(q.metadata->>'channel', ''), c.launch_channels->>0, 'QR fisico / impreso') as channel,
                0::int as leads,
                0::int as qr_generated,
                count(distinct rd.id)::int as redemptions,
                0::int as sales,
                0::numeric(14, 2) as revenue
         from redemptions rd
         left join qr_codes q on q.id = rd.qr_code_id and q.business_id = rd.business_id
         left join campaigns c on c.id = rd.campaign_id and c.business_id = rd.business_id
         left join qr_batches qb on qb.id = q.batch_id and qb.business_id = rd.business_id
         where rd.business_id = $${matrixParams.push(businessId)}
           and rd.redeemed_at >= $${matrixParams.push(filters.startDate)}::timestamptz
           and rd.redeemed_at < ($${matrixParams.push(filters.endDate)}::date + interval '1 day')
           and ($${matrixParams.push(filters.campaignId)}::uuid is null or rd.campaign_id = $${matrixParams.length}::uuid)
           and ($${matrixParams.push(filters.branchId)}::uuid is null or rd.branch_id = $${matrixParams.length}::uuid)
           and ($${matrixParams.push(filters.qrStatus)}::text is null or q.status::text = $${matrixParams.length}::text)
           and ($${matrixParams.push(filters.qrType)}::text is null or q.origin_type::text = $${matrixParams.length}::text)
           and ($${matrixParams.push(filters.affiliateId)}::uuid is null or q.affiliate_id = $${matrixParams.length}::uuid)
           and ($${matrixParams.push(filters.sellerId)}::uuid is null or rd.redeemed_by_user_id = $${matrixParams.length}::uuid)
         group by rd.campaign_id, c.name, channel
       ),
       sale_events as (
         select s.campaign_id,
                coalesce(c.name, 'Sin campana') as campaign_name,
                coalesce(nullif(s.acquisition_channel, ''), s.acquisition_source, 'QR_REDEMPTION') as channel,
                0::int as leads,
                0::int as qr_generated,
                0::int as redemptions,
                count(*)::int as sales,
                coalesce(sum(s.sale_amount), 0)::numeric(14, 2) as revenue
         from sales s
         left join campaigns c on c.id = s.campaign_id and c.business_id = s.business_id
         left join qr_codes q on q.id = s.qr_code_id and q.business_id = s.business_id
         where s.business_id = $${matrixParams.push(businessId)}
           and s.created_at >= $${matrixParams.push(filters.startDate)}::timestamptz
           and s.created_at < ($${matrixParams.push(filters.endDate)}::date + interval '1 day')
           and ($${matrixParams.push(filters.campaignId)}::uuid is null or s.campaign_id = $${matrixParams.length}::uuid)
           and ($${matrixParams.push(filters.branchId)}::uuid is null or s.branch_id = $${matrixParams.length}::uuid)
           and ($${matrixParams.push(filters.qrStatus)}::text is null or q.status::text = $${matrixParams.length}::text)
           and ($${matrixParams.push(filters.qrType)}::text is null or q.origin_type::text = $${matrixParams.length}::text)
           and ($${matrixParams.push(filters.affiliateId)}::uuid is null or coalesce(s.referred_affiliate_id, q.affiliate_id) = $${matrixParams.length}::uuid)
           and ($${matrixParams.push(filters.sellerId)}::uuid is null or s.seller_user_id = $${matrixParams.length}::uuid)
         group by s.campaign_id, c.name, channel
       ),
       events as (
         select * from lead_events
         union all select * from qr_events
         union all select * from redemption_events
         union all select * from sale_events
       )
       select campaign_id,
              campaign_name,
              case ${Object.entries(SOURCE_LABELS).map(([key, label]) => `when channel = '${key}' then '${label}'`).join(" ")}
                else coalesce(nullif(channel, ''), 'Sin canal')
              end as channel,
              sum(leads)::int as leads,
              sum(qr_generated)::int as qr_generated,
              sum(redemptions)::int as redemptions,
              sum(sales)::int as sales,
              sum(revenue)::numeric(14, 2) as revenue,
              round(case when sum(leads) > 0 then (sum(sales)::numeric / sum(leads)::numeric) * 100 else 0 end, 1) as conversion_rate
       from events
       where ($${matrixParams.push(filters.channel)}::text is null or channel = $${matrixParams.length}::text)
       group by campaign_id, campaign_name, channel
       order by revenue desc, sales desc, leads desc
       limit 120`,
      matrixParams
    ),
    query(
      `select status, count(*)::int as count
       from qr_codes
       where ${scopedWhere(qrStatusParams, businessId, filters, {
         dateColumn: "created_at",
         campaignColumn: "campaign_id",
         qrStatusColumn: "status",
         qrTypeColumn: "origin_type",
         affiliateColumn: "affiliate_id",
       })}
       group by status
       order by status`,
      qrStatusParams
    ),
    query(
      `with sales as (${salesUnionSql()})
       select coalesce(br.name, 'Sin sucursal') as branch_name,
              count(distinct qrd.id)::int as redemptions,
              count(distinct s.created_at::text || s.sale_amount::text || coalesce(s.qr_code_id::text, ''))::int as sales,
              coalesce(sum(s.sale_amount), 0)::numeric(14, 2) as revenue
       from branches br
       left join redemptions rd on rd.branch_id = br.id
        and rd.redeemed_at >= $${branchParams.push(filters.startDate)}::timestamptz
        and rd.redeemed_at < ($${branchParams.push(filters.endDate)}::date + interval '1 day')
        and ($${branchParams.push(filters.campaignId)}::uuid is null or rd.campaign_id = $${branchParams.length}::uuid)
        and ($${branchParams.push(filters.sellerId)}::uuid is null or rd.redeemed_by_user_id = $${branchParams.length}::uuid)
       left join qr_codes qrd on qrd.id = rd.qr_code_id and qrd.business_id = br.business_id
        and ($${branchParams.push(filters.qrStatus)}::text is null or qrd.status::text = $${branchParams.length}::text)
        and ($${branchParams.push(filters.qrType)}::text is null or qrd.origin_type::text = $${branchParams.length}::text)
        and ($${branchParams.push(filters.affiliateId)}::uuid is null or qrd.affiliate_id = $${branchParams.length}::uuid)
       left join sales s on s.branch_id = br.id
        and s.created_at >= $${branchParams.push(filters.startDate)}::timestamptz
        and s.created_at < ($${branchParams.push(filters.endDate)}::date + interval '1 day')
        and ($${branchParams.push(filters.campaignId)}::uuid is null or s.campaign_id = $${branchParams.length}::uuid)
        and ($${branchParams.push(filters.sellerId)}::uuid is null or s.seller_user_id = $${branchParams.length}::uuid)
       left join qr_codes qs on qs.id = s.qr_code_id and qs.business_id = br.business_id
        and ($${branchParams.push(filters.qrStatus)}::text is null or qs.status::text = $${branchParams.length}::text)
        and ($${branchParams.push(filters.qrType)}::text is null or qs.origin_type::text = $${branchParams.length}::text)
        and ($${branchParams.push(filters.affiliateId)}::uuid is null or coalesce(s.referred_affiliate_id, qs.affiliate_id) = $${branchParams.length}::uuid)
       where br.business_id = $${branchParams.push(businessId)}
         and ($${branchParams.push(filters.branchId)}::uuid is null or br.id = $${branchParams.length}::uuid)
       group by br.id, br.name
       order by revenue desc, sales desc, redemptions desc
       limit 12`,
      branchParams
    ),
    query(
      `with sales as (${salesUnionSql()})
       select a.id, a.full_name, a.status, a.points_total,
              count(s.*)::int as sales,
              coalesce(sum(s.sale_amount), 0)::numeric(14, 2) as revenue,
              max(s.created_at) as last_activity_at
       from affiliates a
       left join sales s on s.referred_affiliate_id = a.id
        and s.created_at >= $${affiliateParams.push(filters.startDate)}::timestamptz
        and s.created_at < ($${affiliateParams.push(filters.endDate)}::date + interval '1 day')
       where a.business_id = $${affiliateParams.push(businessId)}
       group by a.id, a.full_name, a.status, a.points_total
       order by revenue desc, sales desc, a.full_name asc
       limit 25`,
      affiliateParams
    ),
    query(
      `select to_char(date_trunc('week', bs.created_at), 'YYYY-MM-DD') as cohort,
              count(*)::int as purchases,
              count(q.id) filter (where q.origin_type = 'POST_SALE')::int as post_sale_qr,
              count(q.id) filter (where q.origin_type = 'POST_SALE' and q.status = 'REDEEMED')::int as post_sale_redeemed,
              coalesce(sum(bs.sale_amount), 0)::numeric(14, 2) as revenue
       from business_sales bs
       left join qr_codes q on q.sale_id = bs.id
       where ${scopedWhere(cohortParams, businessId, filters, {
         businessColumn: "bs.business_id",
         dateColumn: "bs.created_at",
         campaignColumn: "bs.campaign_id",
         branchColumn: "bs.branch_id",
         affiliateColumn: "bs.referred_affiliate_id",
         channelExpression: "coalesce(nullif(bs.acquisition_channel, ''), bs.acquisition_source, 'QR_REDEMPTION')",
       })}
       group by date_trunc('week', bs.created_at)
       order by cohort desc
       limit 8`,
      cohortParams
    ),
  ]);

  return {
    timeline: timeline.rows.map((row) => ({
      ...row,
      revenue: number(row.revenue),
    })),
    channels: channelRows.rows.map((row) => ({
      label: SOURCE_LABELS[row.channel] || row.channel,
      channel: row.channel,
      sales: number(row.sales),
      revenue: number(row.revenue),
    })),
    heatmap: heatmap.rows.map((row) => ({
      dow: number(row.dow),
      hour: number(row.hour),
      value: number(row.redemptions),
    })),
    campaigns: campaigns.rows.map((row) => {
      const revenue = number(row.revenue);
      const investment = number(row.investment);
      const sales = number(row.sales);
      const leads = number(row.leads);
      const qr = number(row.qr_generated);
      const redemptions = number(row.redemptions);
      return {
        id: row.id,
        campaign_name: row.campaign_name,
        campaign_status: row.campaign_status,
        investment,
        leads,
        qr_generated: qr,
        redemptions,
        sales,
        revenue,
        conversion_rate: safeRate(sales, leads),
        redemption_rate: safeRate(redemptions, qr),
        roi: safeRoi(revenue, investment),
        cac: safeDivide(investment, sales) || 0,
      };
    }),
    matrix: matrix.rows.map((row) => ({
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      channel: SOURCE_LABELS[row.channel] || row.channel,
      raw_channel: row.channel,
      leads: number(row.leads),
      qr_generated: number(row.qr_generated),
      redemptions: number(row.redemptions),
      sales: number(row.sales),
      revenue: number(row.revenue),
      conversion_rate: number(row.conversion_rate),
    })),
    qr_status: qrStatus.rows.map((row) => ({ label: row.status, value: number(row.count) })),
    branches: branches.rows.map((row) => {
      const sales = number(row.sales);
      const redemptions = number(row.redemptions);
      return {
        branch_name: row.branch_name,
        redemptions,
        sales,
        revenue: number(row.revenue),
        conversion_rate: safeRate(sales, redemptions),
      };
    }),
    affiliates: affiliates.rows.map((row) => ({
      id: row.id,
      name: row.full_name,
      status: row.status,
      points: number(row.points_total),
      sales: number(row.sales),
      revenue: number(row.revenue),
      last_activity_at: row.last_activity_at,
    })),
    cohorts: cohorts.rows.map((row) => ({
      cohort: row.cohort,
      purchases: number(row.purchases),
      post_sale_qr: number(row.post_sale_qr),
      post_sale_redeemed: number(row.post_sale_redeemed),
      revenue: number(row.revenue),
      retention_rate: safeRate(row.post_sale_redeemed, row.post_sale_qr),
    })),
  };
}

function scoreDimension(value, target) {
  if (!target) return 0;
  return Math.max(0, Math.min(100, round((number(value) / target) * 100, 0)));
}

function buildRevenueScore(current, charts, affiliateSummary) {
  const branchLeader = charts.branches[0];
  const dimensions = [
    { key: "leads", label: "Captacion de leads", score: scoreDimension(current.leads, 120) },
    { key: "redemption", label: "Redencion", score: scoreDimension(current.redemption_rate, 35) },
    { key: "conversion", label: "Conversion a venta", score: scoreDimension(current.conversion_rate, 18) },
    { key: "revenue", label: "Revenue", score: scoreDimension(current.revenue, 5000000) },
    { key: "loyalty", label: "Fidelizacion", score: scoreDimension(charts.cohorts.reduce((sum, row) => sum + row.post_sale_redeemed, 0), 20) },
    { key: "referrals", label: "Referidos", score: scoreDimension(current.referred_buyers, 10) },
    { key: "branches", label: "Sucursales", score: branchLeader ? scoreDimension(branchLeader.conversion_rate, 45) : 0 },
    { key: "data", label: "Calidad de datos", score: scoreDimension(current.sales_count, Math.max(1, current.redemptions)) },
  ];
  const score = round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length, 0);
  const status = score >= 82 ? "Excelente" : score >= 64 ? "Bueno" : score >= 42 ? "En observacion" : "Critico";
  const recommendations = [
    current.redemption_rate < 20 ? "Aumenta urgencia o claridad del beneficio para subir redenciones." : "Documenta el incentivo ganador y repitelo en nuevos canales.",
    current.conversion_rate < 10 ? "Refuerza seguimiento de leads y cierre en tienda o WhatsApp." : "Escala el canal con mejor conversion antes de abrir mas frentes.",
    affiliateSummary.active_affiliates < 3 ? "Activa mas afiliados para probar voz a voz medible." : "Premia afiliados de alto ticket y crea paquetes de QR de recomendacion.",
  ];
  return { score, status, dimensions, recommendations };
}

function buildInsights(current, previous, charts, score) {
  const topChannel = charts.channels[0];
  const topBranch = charts.branches[0];
  const topCampaign = charts.campaigns[0];
  const expiredRatio = safeRate(current.expired_qr, current.qr_generated);
  const insights = [];

  if (delta(current.leads, previous.leads) > 10 && delta(current.redemptions, previous.redemptions) < -5) {
    insights.push(["alert", "Interes sin redencion", "Los leads suben, pero las redenciones bajan.", "Crea recordatorio, urgencia o beneficio mas directo."]);
  }
  if (delta(current.redemptions, previous.redemptions) > 10 && delta(current.sales_count, previous.sales_count) < -5) {
    insights.push(["risk", "La visita no esta comprando", "El beneficio atrae, pero no se convierte en venta.", "Revisa oferta, vendedor, producto destacado o cierre en caja."]);
  }
  if (current.referred_buyers > 0 && current.avg_ticket > 0) {
    insights.push(["opportunity", "Voz a voz con valor", `Los referidos compradores aportan ventas medibles dentro del RMS.`, "Crea mas QR de recomendacion para afiliados activos."]);
  }
  if (topBranch && topBranch.revenue > 0) {
    insights.push(["win", "Sucursal lider detectada", `${topBranch.branch_name} concentra el mayor revenue del periodo.`, "Replica guion, horario o beneficio en sedes rezagadas."]);
  }
  if (expiredRatio > 25) {
    insights.push(["risk", "QR vencidos altos", `${expiredRatio}% de los QR del periodo estan vencidos.`, "Reduce vigencia, avisa por WhatsApp o cambia incentivo."]);
  }
  if (topCampaign && topCampaign.roi !== null && topCampaign.roi < 0) {
    insights.push(["alert", "Campana con ROI bajo", `${topCampaign.campaign_name} necesita revision economica.`, "Ajusta presupuesto, canal o promesa del beneficio."]);
  }
  if (topChannel && topChannel.revenue > 0) {
    insights.push(["opportunity", "Canal ganador", `${topChannel.label} esta generando ${topChannel.sales} ventas registradas.`, "Escala este canal y mide si mantiene ticket y conversion."]);
  }
  if (score.score < 50) {
    insights.push(["risk", "MG Revenue Score bajo", `El score esta en ${score.score}/100.`, "Completa datos de ventas, canal y sucursal para mejorar decisionabilidad."]);
  }

  if (!insights.length) {
    insights.push(["opportunity", "Datos listos para lectura RMS", "El sistema ya esta consolidando actividad comercial.", "Mantén registro de ventas y canales para mejorar los insights."]);
  }

  return insights.slice(0, 8).map(([priority, title, metric, action], index) => ({
    id: `insight-${index}`,
    priority,
    title,
    metric,
    explanation: metric,
    action,
  }));
}

function buildDecisionMap(charts) {
  const empty = { repeat: [], optimize: [], pause: [], scale: [], investigate: [] };
  charts.campaigns.forEach((campaign) => {
    const roi = campaign.roi ?? 0;
    if (roi > 0.35 && campaign.conversion_rate >= 12) empty.repeat.push(campaign.campaign_name);
    else if (campaign.leads >= 20 && campaign.conversion_rate < 8) empty.optimize.push(campaign.campaign_name);
    else if (campaign.investment > 0 && campaign.revenue < campaign.investment * 0.5) empty.pause.push(campaign.campaign_name);
    else if (campaign.conversion_rate >= 12 && campaign.leads < 20) empty.scale.push(campaign.campaign_name);
    else empty.investigate.push(campaign.campaign_name);
  });
  return empty;
}

function campaignDecisionHint(campaign) {
  if ((campaign.roi ?? 0) > 0.35 && campaign.conversion_rate >= 12) {
    return ["Repetir", "Alto retorno y conversion saludable."];
  }
  if (campaign.leads >= 20 && campaign.conversion_rate < 8) {
    return ["Optimizar", "Hay captacion, pero no esta cerrando ventas."];
  }
  if (campaign.investment > 0 && campaign.revenue < campaign.investment * 0.5) {
    return ["Pausar", "La inversion supera el revenue atribuido."];
  }
  if (campaign.conversion_rate >= 12 && campaign.leads < 20) {
    return ["Escalar", "Buena conversion con volumen todavia bajo."];
  }
  return ["Investigar", "Faltan datos o el comportamiento no es concluyente."];
}

function enrichPowerTable(charts) {
  return charts.campaigns.map((campaign) => {
    const relatedMatrixRows = charts.matrix
      .filter((row) => row.campaign_id === campaign.id || row.campaign_name === campaign.campaign_name)
      .sort((a, b) => b.revenue - a.revenue || b.sales - a.sales || b.leads - a.leads);
    const topChannel = relatedMatrixRows[0]?.channel || "";
    const [decisionHint, decisionReason] = campaignDecisionHint(campaign);
    return {
      ...campaign,
      top_channel: topChannel,
      avg_ticket: safeDivide(campaign.revenue, campaign.sales) || 0,
      decision_hint: decisionHint,
      decision_reason: decisionReason,
    };
  });
}

function buildFunnel(current) {
  return [
    { key: "activated", label: "Campana activada", value: Math.max(current.leads, current.qr_generated, current.sales_count) },
    { key: "lead", label: "Lead", value: current.leads },
    { key: "qr", label: "QR generado", value: current.qr_generated },
    { key: "claimed", label: "QR reclamado", value: current.claimed_qr },
    { key: "redeemed", label: "QR redimido", value: current.redemptions },
    { key: "sale", label: "Venta registrada", value: current.sales_count },
    { key: "revenue", label: "Revenue atribuido", value: current.revenue, format: "money" },
  ].map((stage, index, stages) => {
    const previous = index ? stages[index - 1].value : stage.value;
    return {
      ...stage,
      conversion_from_previous: index ? safeRate(stage.value, previous) : 100,
      loss_from_previous: index ? Math.max(0, number(previous) - number(stage.value)) : 0,
    };
  });
}

function buildSankey(charts) {
  const links = [];
  charts.channels.slice(0, 5).forEach((channel) => {
    links.push({ source: channel.label, target: "Ventas", value: channel.sales || 1 });
    links.push({ source: "Ventas", target: "Revenue", value: Math.max(1, Math.round(channel.revenue / 1000)) });
  });
  charts.campaigns.slice(0, 5).forEach((campaign) => {
    links.push({ source: campaign.campaign_name, target: "QR / Redencion", value: campaign.redemptions || campaign.qr_generated || 1 });
    links.push({ source: "QR / Redencion", target: "Ventas", value: campaign.sales || 1 });
  });
  const nodes = Array.from(new Set(links.flatMap((link) => [link.source, link.target]))).map((name) => ({ name }));
  return { nodes, links };
}

async function getCommandCenterAnalytics(businessId, rawFilters = {}) {
  const filters = normalizeFilters(rawFilters);
  const [options, current, previousRaw, charts] = await Promise.all([
    getOptions(businessId),
    getTotals(businessId, filters, "current"),
    getTotals(businessId, filters, "previous"),
    getSeriesAndCharts(businessId, filters),
  ]);
  const previous = filters.comparePrevious ? previousRaw : current;

  const affiliateSummary = {
    active_affiliates: charts.affiliates.filter((item) => item.status !== "INACTIVE").length,
    top_affiliate: charts.affiliates[0] || null,
  };
  const topBranch = charts.branches[0] || null;
  const topChannel = charts.channels[0] || null;
  const score = buildRevenueScore(current, charts, affiliateSummary);
  const insights = buildInsights(current, previous, charts, score);
  const topCampaign = charts.campaigns[0] || null;
  const powerTable = enrichPowerTable(charts);

  return {
    filters,
    options,
    kpis: kpiItems(current, previous, topBranch, topChannel, affiliateSummary),
    totals: current,
    previous_totals: previous,
    funnel: buildFunnel(current),
    revenue_score: score,
    timeline: charts.timeline,
    heatmap: charts.heatmap,
    campaign_channel_matrix: charts.matrix,
    revenue_treemap: charts.channels,
    campaign_comparison: powerTable,
    attribution_sankey: buildSankey(charts),
    affiliate_network: {
      center: { name: "Negocio", revenue: current.revenue },
      nodes: charts.affiliates,
    },
    branch_performance: charts.branches,
    qr_status: charts.qr_status,
    campaign_scatter: powerTable,
    revenue_waterfall: [
      { label: "Revenue total", value: current.revenue },
      ...charts.channels.slice(0, 5).map((item) => ({ label: item.label, value: item.revenue })),
    ],
    cohorts: charts.cohorts,
    power_table: powerTable,
    insights,
    revenue_stories: insights.slice(0, 6),
    decision_map: buildDecisionMap(charts),
    executive_summary: {
      revenue: current.revenue,
      winning_channel: topChannel?.label || "Sin datos",
      winning_campaign: topCampaign?.campaign_name || "Sin datos",
      leading_branch: topBranch?.branch_name || "Sin datos",
      top_affiliate: affiliateSummary.top_affiliate?.name || "Sin datos",
      main_risk: insights.find((item) => item.priority === "risk" || item.priority === "alert")?.title || "Sin riesgo critico detectado",
      recommended_action: insights[0]?.action || "Registra ventas y canales para activar mas recomendaciones.",
    },
  };
}

module.exports = { getCommandCenterAnalytics };
