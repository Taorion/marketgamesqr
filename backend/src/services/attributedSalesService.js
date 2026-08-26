const { query } = require("../config/db");
const { badRequest } = require("../utils/http");

const SALE_STATUS = new Set(["ALL", "PAID", "VOIDED"]);
const SALE_SOURCE = new Set(["ALL", "REDEMPTION", "CONTACT_CENTER"]);

function cleanText(value, max = 240) {
  return String(value || "").trim().slice(0, max);
}

function normalizeSaleStatus(value) {
  const status = cleanText(value || "ALL", 20).toUpperCase();
  if (!SALE_STATUS.has(status)) throw badRequest("El estado de venta no es valido.");
  return status;
}

function normalizeSaleSource(value) {
  const source = cleanText(value || "ALL", 30).toUpperCase();
  if (!SALE_SOURCE.has(source)) throw badRequest("El origen de venta no es valido.");
  return source;
}

function encodeSalesCursor(row = {}) {
  if (!row.created_at || !row.id) return null;
  return Buffer.from(JSON.stringify({ created_at: row.created_at, id: row.id }), "utf8").toString("base64url");
}

function decodeSalesCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(value), "base64url").toString("utf8"));
    const createdAt = new Date(parsed.created_at);
    if (Number.isNaN(createdAt.getTime()) || !/^[0-9a-f-]{36}$/i.test(String(parsed.id || ""))) throw new Error("invalid");
    return { created_at: createdAt.toISOString(), id: String(parsed.id) };
  } catch {
    throw badRequest("El cursor de ventas no es valido.");
  }
}

function endExclusive(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw badRequest("La fecha final no es valida.");
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString();
}

function startInclusive(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw badRequest("La fecha inicial no es valida.");
  return parsed.toISOString();
}

function normalizeAttributedSalesFilters(input = {}) {
  return {
    search: cleanText(input.search, 240),
    customer: cleanText(input.customer, 180),
    product: cleanText(input.product, 180),
    channel: cleanText(input.channel, 180),
    campaign: cleanText(input.campaign, 180),
    branch: cleanText(input.branch, 180),
    status: normalizeSaleStatus(input.status),
    source: normalizeSaleSource(input.source),
    date_from: startInclusive(input.date_from),
    date_to: endExclusive(input.date_to),
  };
}

function canonicalAttributedSalesSql() {
  return `
    with canonical_sales as (
      select
        s.id, s.business_id, s.campaign_id, c.name as campaign_name,
        s.qr_code_id, s.redemption_id, s.player_id,
        s.sale_amount, s.currency, s.sale_confirmed_by_user_id,
        s.branch_id, s.payment_method, s.product_or_service,
        'QR_SCAN'::text as acquisition_source,
        coalesce(nullif(q.metadata->>'acquisition_channel_name_snapshot', ''), nullif(q.metadata->>'acquisition_channel', ''), nullif(q.metadata->>'channel_use', ''), 'Ticket QR') as acquisition_channel,
        s.notes, 'PAID'::text as sale_status,
        jsonb_build_object(
          'products', coalesce(s.line_items, '[]'::jsonb),
          'benefit', coalesce(s.benefit_snapshot, '{}'::jsonb),
          'application_summary', coalesce(s.application_summary, '{}'::jsonb)
        ) as metadata,
        null::uuid as referred_affiliate_id, 0::int as referral_points_awarded,
        s.created_at, 'REDEMPTION'::text as sale_source,
        p.name as player_name, p.document_id, p.phone, p.email,
        br.name as branch_name, u.full_name as confirmed_by,
        null::text as affiliate_name,
        coalesce(p.document_id, p.phone, lower(p.email), p.id::text, s.id::text) as customer_key
      from attributed_sales s
      left join campaigns c on c.id = s.campaign_id and c.business_id = s.business_id
      left join qr_codes q on q.id = s.qr_code_id and q.business_id = s.business_id
      left join players p on p.id = s.player_id and p.business_id = s.business_id
      left join branches br on br.id = s.branch_id and br.business_id = s.business_id
      left join app_users u on u.id = s.sale_confirmed_by_user_id and u.business_id = s.business_id
      where s.business_id = $1

      union all

      select
        bs.id, bs.business_id, bs.campaign_id, c.name as campaign_name,
        bs.qr_code_id, null::uuid as redemption_id, null::uuid as player_id,
        bs.sale_amount, bs.currency, bs.seller_user_id as sale_confirmed_by_user_id,
        bs.branch_id, bs.payment_method, bs.product_name as product_or_service,
        bs.acquisition_source,
        coalesce(nullif(bs.acquisition_channel_name_snapshot, ''), nullif(bs.acquisition_channel, ''), 'Sin canal') as acquisition_channel,
        bs.notes, coalesce(bs.sale_status, 'PAID') as sale_status,
        bs.metadata, bs.referred_affiliate_id, bs.referral_points_awarded,
        bs.created_at, 'CONTACT_CENTER'::text as sale_source,
        bs.customer_name as player_name, bs.customer_document_id as document_id,
        bs.customer_phone as phone, bs.customer_email as email,
        br.name as branch_name, u.full_name as confirmed_by,
        a.full_name as affiliate_name,
        coalesce(nullif(bs.customer_document_id, ''), nullif(bs.customer_phone, ''), nullif(lower(bs.customer_email), ''), bs.id::text) as customer_key
      from business_sales bs
      left join campaigns c on c.id = bs.campaign_id and c.business_id = bs.business_id
      left join branches br on br.id = bs.branch_id and br.business_id = bs.business_id
      left join app_users u on u.id = bs.seller_user_id and u.business_id = bs.business_id
      left join affiliates a on a.id = bs.referred_affiliate_id and a.business_id = bs.business_id
      where bs.business_id = $1
        and not exists (
          select 1 from attributed_sales mirror
          where mirror.business_id = bs.business_id
            and mirror.qr_code_id = bs.qr_code_id
            and bs.qr_code_id is not null
        )
    ), filtered_sales as (
      select * from canonical_sales sale
      where ($2::uuid is null or sale.campaign_id = $2)
        and ($5::text = '' or concat_ws(' ', sale.player_name, sale.document_id, sale.phone, sale.email, sale.product_or_service, sale.campaign_name, sale.acquisition_channel, sale.acquisition_source, sale.branch_name, sale.notes) ilike '%' || $5 || '%')
        and ($6::text = '' or concat_ws(' ', sale.player_name, sale.document_id, sale.phone, sale.email) ilike '%' || $6 || '%')
        and ($7::text = '' or concat_ws(' ', sale.product_or_service, sale.metadata->>'products') ilike '%' || $7 || '%')
        and ($8::text = '' or sale.acquisition_channel = $8)
        and ($9::text = '' or coalesce(sale.campaign_name, 'Sin campaña') = $9)
        and ($10::text = '' or coalesce(sale.branch_name, 'Sin sede') = $10)
        and ($11::text = 'ALL' or sale.sale_source = $11)
        and ($12::text = 'ALL' or sale.sale_status = $12)
        and ($13::timestamptz is null or sale.created_at >= $13)
        and ($14::timestamptz is null or sale.created_at < $14)
    ), summary as (
      select
        count(*)::int as total_records,
        count(*) filter (where sale_status = 'PAID')::int as paid_count,
        count(*) filter (where sale_status = 'VOIDED')::int as voided_count,
        count(distinct customer_key) filter (where sale_status = 'PAID')::int as unique_customers,
        coalesce(sum(sale_amount) filter (where sale_status = 'PAID'), 0)::numeric(14,2) as attributed_revenue,
        coalesce(avg(sale_amount) filter (where sale_status = 'PAID'), 0)::numeric(14,2) as average_ticket
      from filtered_sales
    )
    select sale.*, summary.*
    from filtered_sales sale cross join summary
    where ($3::timestamptz is null or (sale.created_at, sale.id) < ($3::timestamptz, $4::uuid))
    order by sale.created_at desc, sale.id desc
    limit $15
  `;
}

async function listAttributedSales(options = {}) {
  const filters = normalizeAttributedSalesFilters(options.filters || {});
  const cursor = decodeSalesCursor(options.cursor);
  const maxLimit = Math.max(1, Math.min(Number(options.maxLimit || 100), 10000));
  const limit = Math.max(1, Math.min(Number(options.limit || 50), maxLimit));
  const result = await (options.dbQuery || query)(canonicalAttributedSalesSql(), [
    options.businessId,
    options.campaignId || null,
    cursor?.created_at || null,
    cursor?.id || null,
    filters.search,
    filters.customer,
    filters.product,
    filters.channel,
    filters.campaign,
    filters.branch,
    filters.source,
    filters.status,
    filters.date_from,
    filters.date_to,
    limit + 1,
  ]);
  const hasMore = result.rows.length > limit;
  const rows = result.rows.slice(0, limit);
  const first = result.rows[0] || {};
  const cleanRows = rows.map((row) => {
    const { total_records, paid_count, voided_count, unique_customers, attributed_revenue, average_ticket, customer_key, ...sale } = row;
    return sale;
  });
  return {
    sales: cleanRows,
    summary: {
      total_records: Number(first.total_records || 0),
      paid_count: Number(first.paid_count || 0),
      voided_count: Number(first.voided_count || 0),
      unique_customers: Number(first.unique_customers || 0),
      attributed_revenue: Number(first.attributed_revenue || 0),
      average_ticket: Number(first.average_ticket || 0),
    },
    pagination: {
      limit,
      has_more: hasMore,
      next_cursor: hasMore ? encodeSalesCursor(rows[rows.length - 1]) : null,
    },
  };
}

module.exports = {
  canonicalAttributedSalesSql,
  decodeSalesCursor,
  encodeSalesCursor,
  listAttributedSales,
  normalizeAttributedSalesFilters,
};
