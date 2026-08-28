const bcrypt = require("bcryptjs");
const { query, withTransaction } = require("../config/db");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { assertLimitForBusiness, listPlans } = require("./subscriptionService");
const { syncSaleProductsWithCatalog } = require("./productCatalogService");

const SELLER_ROLE = "BUSINESS_SELLER";
const SELLER_ADMIN_ROLES = new Set(["BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"]);
const QORI_INTERNAL_SLUG = "marketgames-qr";

function cleanText(value, max = 180) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : null;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function escapeLikePattern(value = "") {
  return String(value).replace(/[\\%_]/g, "\\$&");
}

function searchableCharacters(value = "") {
  return (String(value).normalize("NFKC").match(/[\p{L}\p{N}]/gu) || []).length;
}

function inclusiveDays(start, end) {
  const startMs = new Date(`${start}T00:00:00.000Z`).getTime();
  const endMs = new Date(`${end}T00:00:00.000Z`).getTime();
  return Math.max(0, Math.floor((endMs - startMs) / 86_400_000) + 1);
}

function proratedGoalForRange(goal, range) {
  const goalStart = String(goal.period_start || "").slice(0, 10);
  const goalEnd = String(goal.period_end || "").slice(0, 10);
  const overlapStart = goalStart > range.startDate ? goalStart : range.startDate;
  const overlapEnd = goalEnd < range.endDate ? goalEnd : range.endDate;
  const totalDays = inclusiveDays(goalStart, goalEnd);
  const overlapDays = inclusiveDays(overlapStart, overlapEnd);
  const factor = totalDays > 0 ? Math.min(1, overlapDays / totalDays) : 0;
  return {
    target_revenue: Number(goal.target_revenue || 0) * factor,
    target_sales: Number(goal.target_sales || 0) * factor,
    target_new_customers: Number(goal.target_new_customers || 0) * factor,
    overlap_days: overlapDays,
    total_days: totalDays,
  };
}

function normalizeSellerCode(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function sellerAdmin(user = {}) {
  return SELLER_ADMIN_ROLES.has(String(user.role || "").toUpperCase());
}

function assertSellerAdmin(user = {}) {
  if (!sellerAdmin(user)) throw forbidden("Solo el Propietario o un administrador autorizado puede gestionar vendedores.");
}

function assertSellerSelf(user = {}) {
  if (user.role !== SELLER_ROLE || !user.business_id) throw forbidden("Esta ruta pertenece al autoservicio del vendedor.");
}

function dateRange(input = {}) {
  const end = input.end_date ? new Date(`${input.end_date}T23:59:59.999Z`) : new Date();
  const start = input.start_date ? new Date(`${input.start_date}T00:00:00.000Z`) : new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw badRequest("El periodo seleccionado no es valido.");
  return { start: start.toISOString(), end: end.toISOString(), startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

async function logSellerActivity(client, payload) {
  await client.query(
    `insert into business_seller_activity_events
      (business_id,seller_user_id,actor_user_id,event_type,entity_type,entity_id,metadata)
     values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [payload.business_id,payload.seller_user_id || null,payload.actor_user_id || null,payload.event_type,payload.entity_type,payload.entity_id || null,JSON.stringify(payload.metadata || {})]
  );
}

async function qoriInternalBusiness(client = { query }) {
  const result = await client.query(
    `select id, name, slug, settings
       from businesses
      where is_active = true
        and settings->>'internal_account' = 'true'
        and slug = $1
      limit 1`,
    [QORI_INTERNAL_SLUG]
  );
  return result.rows[0] || null;
}

async function publicSalesAdvisors(search = "") {
  const term = cleanText(search, 80) || "";
  if (term.length < 2 || searchableCharacters(term) < 2) return [];
  const internal = await qoriInternalBusiness();
  if (!internal) return [];
  const exactCode = normalizeSellerCode(term);
  const likeTerm = `%${escapeLikePattern(term)}%`;
  const result = await query(
    `select u.full_name, p.seller_code
       from business_seller_profiles p
       join app_users u on u.id = p.user_id and u.business_id = p.business_id
      where p.business_id = $1
        and p.status = 'ACTIVE'
        and u.role = 'BUSINESS_SELLER'
        and u.is_active = true
        and (lower(u.full_name) like lower($2) escape '\\' or lower(p.seller_code) like lower($2) escape '\\' or p.seller_code = $3)
      order by case when p.seller_code = $3 then 0 else 1 end, u.full_name asc
      limit 8`,
    [internal.id, likeTerm, exactCode]
  );
  return result.rows.map((row) => ({ name: row.full_name, code: row.seller_code, label: `${row.full_name} · ${row.seller_code}` }));
}

async function resolveQoriAdvisor(client, sellerCode) {
  const code = normalizeSellerCode(sellerCode);
  if (!code) return { internalBusiness: await qoriInternalBusiness(client), seller: null, source: "SELF" };
  const internalBusiness = await qoriInternalBusiness(client);
  if (!internalBusiness) throw badRequest("El directorio de asesores Qori no esta disponible. Elige Llegue por mi cuenta.");
  const result = await client.query(
    `select u.id, u.full_name, p.seller_code
       from business_seller_profiles p
       join app_users u on u.id = p.user_id and u.business_id = p.business_id
      where p.business_id = $1 and p.seller_code = $2
        and p.status = 'ACTIVE' and u.role = 'BUSINESS_SELLER' and u.is_active = true
      limit 1`,
    [internalBusiness.id, code]
  );
  if (!result.rowCount) throw badRequest("El asesor seleccionado ya no esta disponible. Elige otro asesor o Llegue por mi cuenta.");
  return { internalBusiness, seller: result.rows[0], source: "SELLER" };
}

async function createSignupAttribution(client, payload) {
  const advisor = await resolveQoriAdvisor(client, payload.sales_advisor_code);
  if (!advisor.internalBusiness) return null;
  const result = await client.query(
    `insert into portal_signup_sales_attributions
      (purchase_order_id, qori_business_id, client_business_id, seller_user_id, attribution_source,
       seller_code_snapshot, seller_name_snapshot, plan_code, billing_cycle, expected_revenue_cop, metadata)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
     on conflict (purchase_order_id) do nothing
     returning *`,
    [
      payload.purchase_order_id,
      advisor.internalBusiness.id,
      payload.client_business_id,
      advisor.seller?.id || null,
      advisor.source,
      advisor.seller?.seller_code || null,
      advisor.seller?.full_name || null,
      payload.plan_code,
      payload.billing_cycle || "monthly",
      Number(payload.expected_revenue_cop || 0),
      JSON.stringify({ signup_source: "public_portal_signup" }),
    ]
  );
  const attribution = result.rows[0] || null;
  if (attribution) {
    await client.query(
      `insert into portal_signup_sales_attribution_events
        (attribution_id, qori_business_id, event_type, next_seller_user_id, metadata)
       values ($1,$2,'CREATED',$3,$4::jsonb)`,
      [attribution.id, attribution.qori_business_id, attribution.seller_user_id, JSON.stringify({ source: attribution.attribution_source })]
    );
  }
  return attribution;
}

async function approveSignupAttribution(client, payload) {
  const result = await client.query(
    `update portal_signup_sales_attributions
        set status = 'APPROVED', approved_revenue_cop = $2, mercado_pago_payment_id = $3,
            approved_at = coalesce(approved_at, now()), updated_at = now()
      where purchase_order_id = $1 and status not in ('APPROVED','REFUNDED','CANCELLED')
      returning *`,
    [payload.purchase_order_id, Number(payload.approved_revenue_cop || 0), String(payload.payment_id || "") || null]
  );
  const attribution = result.rows[0];
  if (attribution) {
    await client.query(
      `insert into portal_signup_sales_attribution_events
        (attribution_id, qori_business_id, event_type, next_seller_user_id, metadata)
       values ($1,$2,'APPROVED',$3,$4::jsonb)`,
      [attribution.id, attribution.qori_business_id, attribution.seller_user_id, JSON.stringify({ payment_id: payload.payment_id || null, plan_code: attribution.plan_code })]
    );
  }
  return attribution || null;
}

function signupAttributionStatus(providerStatus) {
  const normalized = String(providerStatus || "PENDING").toUpperCase();
  return normalized === "APPROVED" ? "APPROVED"
    : normalized === "CANCELLED" ? "CANCELLED"
      : normalized === "REFUNDED" ? "REFUNDED"
        : ["REJECTED", "FAILED", "ERROR"].includes(normalized) ? "FAILED" : "PENDING";
}

async function syncSignupAttributionStatus(client, purchaseOrderId, providerStatus, paymentId = null) {
  const status = signupAttributionStatus(providerStatus);
  const result = await client.query(
    `update portal_signup_sales_attributions
        set status=$2, mercado_pago_payment_id=coalesce(mercado_pago_payment_id,$3), updated_at=now()
      where purchase_order_id=$1
        and status <> $2
        and (status <> 'APPROVED' or $2 in ('REFUNDED','CANCELLED'))
      returning *`,
    [purchaseOrderId, status, paymentId ? String(paymentId) : null]
  );
  const attribution = result.rows[0];
  if (attribution) {
    await client.query(
      `insert into portal_signup_sales_attribution_events
        (attribution_id,qori_business_id,event_type,previous_seller_user_id,next_seller_user_id,metadata)
       values ($1,$2,'STATUS_CHANGED',$3,$3,$4::jsonb)`,
      [attribution.id,attribution.qori_business_id,attribution.seller_user_id,JSON.stringify({status,payment_id:paymentId||null})]
    );
  }
  return attribution || null;
}

async function sellerForBusiness(client, businessId, sellerId, { activeOnly = false } = {}) {
  const result = await client.query(
    `select u.id, u.business_id, u.full_name, u.email, u.role, u.is_active, u.branch_id,
            p.seller_code, p.job_title, p.phone, p.territory, p.hired_at, p.status,
            p.administrative_notes, p.commercial_settings, p.metadata, p.created_at, p.updated_at,
            b.name as branch_name
       from app_users u
       join business_seller_profiles p on p.user_id = u.id and p.business_id = u.business_id
       left join branches b on b.id = p.branch_id and b.business_id = p.business_id
      where u.id = $1 and u.business_id = $2 and u.role = 'BUSINESS_SELLER'
        ${activeOnly ? "and u.is_active = true and p.status = 'ACTIVE'" : ""}
      limit 1`,
    [sellerId, businessId]
  );
  return result.rows[0] || null;
}

async function createSeller(businessId, actor, body) {
  assertSellerAdmin(actor);
  return withTransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`seller-create:${businessId}`]);
    const activeUsers = await client.query("select count(*)::int as total from app_users where business_id = $1 and is_active = true", [businessId]);
    await assertLimitForBusiness(businessId, "users", Number(activeUsers.rows[0]?.total || 0), "usuarios");
    const collision = await client.query("select id from app_users where lower(email) = lower($1) limit 1", [body.email]);
    if (collision.rowCount) throw badRequest("Ya existe un usuario registrado con este correo.");
    const code = normalizeSellerCode(body.seller_code);
    if (code.length < 3) throw badRequest("El codigo del vendedor debe tener al menos 3 caracteres.");
    const codeCollision = await client.query("select id from business_seller_profiles where business_id=$1 and lower(seller_code)=lower($2) limit 1", [businessId, code]);
    if (codeCollision.rowCount) throw badRequest("Ya existe un vendedor con este codigo en el negocio.");
    if (body.branch_id) {
      const branch = await client.query("select id from branches where id=$1 and business_id=$2 and is_active=true", [body.branch_id, businessId]);
      if (!branch.rowCount) throw badRequest("La sede seleccionada no pertenece a este negocio.");
    }
    const passwordHash = await bcrypt.hash(body.password, 12);
    const userResult = await client.query(
      `insert into app_users (business_id, email, password_hash, full_name, role, is_active)
       values ($1,lower($2),$3,$4,'BUSINESS_SELLER',true) returning id`,
      [businessId, body.email, passwordHash, body.full_name]
    );
    const userId = userResult.rows[0].id;
    await client.query(
      `insert into business_seller_profiles
        (business_id,user_id,seller_code,job_title,phone,territory,branch_id,hired_at,status,administrative_notes,commercial_settings,created_by_user_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVE',$9,$10::jsonb,$11)`,
      [businessId, userId, code, body.job_title || null, body.phone || null, body.territory || null, body.branch_id || null, body.hired_at || null, body.administrative_notes || null, JSON.stringify(body.commercial_settings || {}), actor.id]
    );
    await logSellerActivity(client,{business_id:businessId,seller_user_id:userId,actor_user_id:actor.id,event_type:"SELLER_CREATED",entity_type:"SELLER",entity_id:userId,metadata:{seller_code:code,name_snapshot:body.full_name}});
    return sellerForBusiness(client, businessId, userId);
  });
}

async function updateSeller(businessId, sellerId, actor, body) {
  assertSellerAdmin(actor);
  return withTransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`seller-update:${businessId}:${sellerId}`]);
    const seller = await sellerForBusiness(client, businessId, sellerId);
    if (!seller) throw notFound("Vendedor no encontrado.");
    if (body.branch_id) {
      const branch = await client.query("select id from branches where id = $1 and business_id = $2 and is_active = true", [body.branch_id, businessId]);
      if (!branch.rowCount) throw badRequest("La sede seleccionada no pertenece a este negocio.");
    }
    const nextCode = body.seller_code === undefined ? seller.seller_code : normalizeSellerCode(body.seller_code);
    if (nextCode.length < 3) throw badRequest("El codigo del vendedor debe tener al menos 3 caracteres.");
    const collision = await client.query(
      `select id from business_seller_profiles where business_id=$1 and user_id<>$2 and lower(seller_code)=lower($3) limit 1`,
      [businessId, sellerId, nextCode]
    );
    if (collision.rowCount) throw badRequest("Ya existe un vendedor con este codigo en el negocio.");
    if (body.email) {
      const emailCollision = await client.query("select id from app_users where id<>$1 and lower(email)=lower($2) limit 1", [sellerId, body.email]);
      if (emailCollision.rowCount) throw badRequest("Ya existe un usuario registrado con este correo.");
    }
    const nextIsActive = body.is_active !== undefined
      ? body.is_active
      : body.status !== undefined ? body.status === "ACTIVE" : null;
    const nextStatus = body.status !== undefined
      ? body.status
      : body.is_active !== undefined ? (body.is_active ? "ACTIVE" : "INACTIVE") : null;
    if (!seller.is_active && nextIsActive === true) {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [`seller-create:${businessId}`]);
      const activeUsers = await client.query(
        "select count(*)::int as total from app_users where business_id = $1 and is_active = true",
        [businessId]
      );
      await assertLimitForBusiness(businessId, "users", Number(activeUsers.rows[0]?.total || 0), "usuarios");
    }
    await client.query(
      `update app_users set full_name = coalesce($3,full_name), email = coalesce(lower($4),email),
          is_active = coalesce($5,is_active), updated_at = now()
        where id = $1 and business_id = $2 and role = 'BUSINESS_SELLER'`,
      [sellerId, businessId, body.full_name || null, body.email || null, nextIsActive]
    );
    await client.query(
      `update business_seller_profiles set seller_code=$3,
          job_title=case when $4::boolean then $5::text else job_title end,
          phone=case when $6::boolean then $7::text else phone end,
          territory=case when $8::boolean then $9::text else territory end,
          branch_id=case when $10::boolean then $11::uuid else branch_id end,
          hired_at=case when $12::boolean then $13::date else hired_at end,
          status=coalesce($14,status),
          administrative_notes=case when $15::boolean then $16::text else administrative_notes end,
          commercial_settings=case when $17::boolean then $18::jsonb else commercial_settings end,
          updated_at=now()
        where user_id=$1 and business_id=$2`,
      [
        sellerId, businessId, nextCode,
        hasOwn(body, "job_title"), body.job_title || null,
        hasOwn(body, "phone"), body.phone || null,
        hasOwn(body, "territory"), body.territory || null,
        hasOwn(body, "branch_id"), body.branch_id || null,
        hasOwn(body, "hired_at"), body.hired_at || null,
        nextStatus,
        hasOwn(body, "administrative_notes"), body.administrative_notes || null,
        hasOwn(body, "commercial_settings"), JSON.stringify(body.commercial_settings || {}),
      ]
    );
    await logSellerActivity(client,{business_id:businessId,seller_user_id:sellerId,actor_user_id:actor.id,event_type:"SELLER_UPDATED",entity_type:"SELLER",entity_id:sellerId,metadata:{changed_fields:Object.keys(body),seller_code_snapshot:nextCode}});
    return sellerForBusiness(client, businessId, sellerId);
  });
}

async function updateSellerSelf(businessId, sellerId, body) {
  const result = await query(
    `update business_seller_profiles p set
        phone=case when $3::boolean then $4::text else p.phone end,
        metadata=case when $5::boolean then p.metadata || jsonb_build_object('self_profile_note',$6::text) else p.metadata end,
        updated_at=now()
      from app_users u where p.user_id=$1 and p.business_id=$2 and u.id=p.user_id and u.role='BUSINESS_SELLER'
      returning p.user_id`,
    [sellerId, businessId, hasOwn(body, "phone"), body.phone || null, hasOwn(body, "profile_note"), body.profile_note || null]
  );
  if (!result.rowCount) throw notFound("Perfil de vendedor no encontrado.");
  return sellerForBusiness({ query }, businessId, sellerId);
}

async function saveSellerGoal(businessId, sellerId, actor, body) {
  assertSellerAdmin(actor);
  return withTransaction(async (client) => {
    const seller = await sellerForBusiness(client, businessId, sellerId, { activeOnly: true });
    if (!seller) throw notFound("Vendedor activo no encontrado.");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`seller-goal:${businessId}:${sellerId}`]);
    if ((body.status || "ACTIVE") === "ACTIVE") {
      const overlap = await client.query(
        `select id from business_seller_goals where business_id=$1 and seller_user_id=$2 and status='ACTIVE'
          and daterange(period_start,period_end,'[]') && daterange($3::date,$4::date,'[]') and id <> coalesce($5::uuid,'00000000-0000-0000-0000-000000000000'::uuid) limit 1`,
        [businessId, sellerId, body.period_start, body.period_end, body.id || null]
      );
      if (overlap.rowCount) throw badRequest("El vendedor ya tiene una meta activa que se cruza con este periodo.");
    }
    const result = body.id
      ? await client.query(
          `update business_seller_goals set period_start=$4,period_end=$5,target_revenue=$6,target_sales=$7,target_new_customers=$8,
              product_targets=$9::jsonb,status=$10,notes=$11,updated_at=now()
            where id=$1 and business_id=$2 and seller_user_id=$3 returning *`,
          [body.id,businessId,sellerId,body.period_start,body.period_end,body.target_revenue,body.target_sales,body.target_new_customers,JSON.stringify(body.product_targets || []),body.status || "ACTIVE",body.notes || null]
        )
      : await client.query(
          `insert into business_seller_goals
            (business_id,seller_user_id,period_start,period_end,target_revenue,target_sales,target_new_customers,product_targets,status,notes,created_by_user_id)
           values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11) returning *`,
          [businessId,sellerId,body.period_start,body.period_end,body.target_revenue,body.target_sales,body.target_new_customers,JSON.stringify(body.product_targets || []),body.status || "ACTIVE",body.notes || null,actor.id]
        );
    if (!result.rowCount) throw notFound("Meta no encontrada.");
    await logSellerActivity(client,{business_id:businessId,seller_user_id:sellerId,actor_user_id:actor.id,event_type:body.id?"GOAL_UPDATED":"GOAL_CREATED",entity_type:"GOAL",entity_id:result.rows[0].id,metadata:{period_start:body.period_start,period_end:body.period_end,target_revenue:body.target_revenue,target_sales:body.target_sales,target_new_customers:body.target_new_customers}});
    return result.rows[0];
  });
}

function identitySql(alias = "s") {
  return `coalesce(nullif(${alias}.customer_document_id,''),lower(nullif(${alias}.customer_email,'')),regexp_replace(coalesce(${alias}.customer_phone,''),'\\D','','g'),lower(nullif(${alias}.customer_name,'')))`;
}

async function analyticsForSellers(businessId, sellerIds, range, internalQori, filters = {}) {
  if (!sellerIds.length) return { metrics: new Map(), sales: [], products: [], clients: [] };
  const metrics = new Map(sellerIds.map((id) => [id, { revenue: 0, sales: 0, customers: 0, new_customers: 0, products: 0, pending_attributions: 0, last_activity_at: null }]));
  const general = await query(
    `with period_sales as (
       select s.* from business_sales s where s.business_id=$1 and s.seller_user_id=any($2::uuid[])
         and s.sale_status='PAID' and coalesce(s.paid_at,s.created_at) between $3 and $4
         and ($5::text = '' or lower(coalesce(s.product_name,'')) like lower($5) or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(s.metadata->'products')='array' then s.metadata->'products' else '[]'::jsonb end) i where lower(coalesce(i->>'name','')) like lower($5)))
         and ($6::text = '' or lower(coalesce(s.acquisition_channel,s.acquisition_source,'')) like lower($6))
         and ($7::uuid is null or s.branch_id=$7)
     ), first_sales as (
       select seller_user_id, ${identitySql("x")} as customer_key, min(coalesce(paid_at,created_at)) as first_at
       from business_sales x where business_id=$1 and seller_user_id=any($2::uuid[]) and sale_status='PAID'
       group by seller_user_id, ${identitySql("x")}
     )
     select p.seller_user_id, count(*)::int as sales, coalesce(sum(p.sale_amount),0)::numeric as revenue,
       count(distinct ${identitySql("p")}) filter (where ${identitySql("p")} is not null)::int as customers,
       count(distinct ${identitySql("p")}) filter (where f.first_at between $3 and $4)::int as new_customers,
       coalesce(sum((select coalesce(sum(greatest(case when coalesce(item->>'quantity','') ~ '^[0-9]+([.][0-9]+)?$' then (item->>'quantity')::numeric else 1 end,0)),0) from jsonb_array_elements(case when jsonb_typeof(p.metadata->'products')='array' then p.metadata->'products' else '[]'::jsonb end) item)),0)::numeric as products,
       max(coalesce(p.paid_at,p.created_at)) as last_activity_at
     from period_sales p left join first_sales f on f.seller_user_id=p.seller_user_id and f.customer_key=${identitySql("p")}
     group by p.seller_user_id`,
    [businessId, sellerIds, range.start, range.end, filters.product ? `%${filters.product}%` : "", filters.channel ? `%${filters.channel}%` : "", filters.branch_id || null]
  );
  general.rows.forEach((row) => metrics.set(row.seller_user_id, { ...metrics.get(row.seller_user_id), ...row, revenue: Number(row.revenue), products: Number(row.products) }));
  if (internalQori) {
    const plans = await query(
      `select seller_user_id,count(*)::int as sales,coalesce(sum(approved_revenue_cop),0)::numeric as revenue,
              count(distinct client_business_id)::int as customers,count(*)::numeric as products,max(approved_at) as last_activity_at
         from portal_signup_sales_attributions
        where qori_business_id=$1 and seller_user_id=any($2::uuid[]) and status='APPROVED' and approved_at between $3 and $4
          and ($5::text = '' or lower(plan_code) like lower($5))
          and ($6::text = '' or lower(attribution_source) like lower($6) or lower('ACTIVA_QORI') like lower($6))
          and $7::uuid is null
        group by seller_user_id`,
      [businessId, sellerIds, range.start, range.end, filters.product ? `%${filters.product}%` : "", filters.channel ? `%${filters.channel}%` : "", filters.branch_id || null]
    );
    plans.rows.forEach((row) => {
      const current = metrics.get(row.seller_user_id);
      metrics.set(row.seller_user_id, { ...current, sales: Number(current.sales)+Number(row.sales), revenue: Number(current.revenue)+Number(row.revenue), customers: Number(current.customers)+Number(row.customers), new_customers: Number(current.new_customers)+Number(row.customers), products: Number(current.products)+Number(row.products), last_activity_at: [current.last_activity_at,row.last_activity_at].filter(Boolean).sort().at(-1) || null });
    });
    const pending = await query(
      `select seller_user_id,count(*)::int as total from portal_signup_sales_attributions
        where qori_business_id=$1 and seller_user_id=any($2::uuid[]) and status='PENDING' group by seller_user_id`,
      [businessId, sellerIds]
    );
    pending.rows.forEach((row) => { const current=metrics.get(row.seller_user_id); current.pending_attributions=Number(row.total); });
  }
  return { metrics };
}

async function sellerDirectory(businessId, actor, filters = {}) {
  const selfOnly = actor.role === SELLER_ROLE;
  if (!selfOnly) assertSellerAdmin(actor);
  const range = dateRange(filters);
  const values = [businessId];
  const where = ["u.business_id=$1", "u.role='BUSINESS_SELLER'", "p.status <> 'ARCHIVED'"];
  if (selfOnly) where.push(`u.id=$${values.push(actor.id)}`);
  if (filters.seller_id && !selfOnly) where.push(`u.id=$${values.push(filters.seller_id)}::uuid`);
  if (filters.search) where.push(`(lower(u.full_name) like lower($${values.push(`%${filters.search}%`)}) or lower(p.seller_code) like lower($${values.length}))`);
  if (filters.status) where.push(`p.status=$${values.push(filters.status)}`);
  if (filters.branch_id) where.push(`p.branch_id=$${values.push(filters.branch_id)}::uuid`);
  const result = await query(
    `select u.id,u.full_name,u.email,u.is_active,p.seller_code,p.job_title,p.phone,p.territory,p.branch_id,p.hired_at,p.status,
            p.administrative_notes,p.commercial_settings,p.metadata,p.created_at,p.updated_at,b.name as branch_name
       from app_users u join business_seller_profiles p on p.user_id=u.id and p.business_id=u.business_id
       left join branches b on b.id=p.branch_id and b.business_id=p.business_id
      where ${where.join(" and ")} order by u.is_active desc,u.full_name asc limit 250`,
    values
  );
  const internal = await qoriInternalBusiness();
  const internalQori = internal?.id === businessId;
  const ids = result.rows.map((row) => row.id);
  const analytics = await analyticsForSellers(businessId, ids, range, internalQori, filters);
  const goals = ids.length ? await query(
    `select * from business_seller_goals
      where business_id=$1 and seller_user_id=any($2::uuid[]) and status='ACTIVE' and period_start <= $3::date and period_end >= $4::date
      order by seller_user_id,period_start asc,period_end asc`, [businessId,ids,range.endDate,range.startDate]
  ) : { rows: [] };
  const goalMap = new Map();
  goals.rows.forEach((goal) => {
    const current = goalMap.get(goal.seller_user_id) || [];
    current.push(goal);
    goalMap.set(goal.seller_user_id, current);
  });
  const sellers = result.rows.map((row) => {
    const metric = analytics.metrics.get(row.id) || {};
    const sellerGoals = goalMap.get(row.id) || [];
    const periodGoal = sellerGoals.reduce((acc, goal) => {
      const contribution = proratedGoalForRange(goal, range);
      acc.target_revenue += contribution.target_revenue;
      acc.target_sales += contribution.target_sales;
      acc.target_new_customers += contribution.target_new_customers;
      acc.contributing_goals += 1;
      return acc;
    }, { target_revenue: 0, target_sales: 0, target_new_customers: 0, contributing_goals: 0 });
    const target = Number(periodGoal.target_revenue || 0);
    const currentGoal = sellerGoals.length === 1 ? sellerGoals[0] : null;
    return {
      ...row,
      administrative_notes: selfOnly ? undefined : row.administrative_notes,
      commercial_settings: selfOnly ? undefined : row.commercial_settings,
      metrics: { ...metric, average_ticket: Number(metric.sales) ? Number(metric.revenue)/Number(metric.sales) : 0, goal_attainment_percent: target > 0 ? Math.min(999, Number(metric.revenue)/target*100) : null },
      current_goal: currentGoal,
      period_goal: periodGoal,
    };
  });
  const totals = sellers.reduce((acc,row) => ({ active_sellers: acc.active_sellers + (row.is_active && row.status === "ACTIVE" ? 1 : 0), revenue: acc.revenue + Number(row.metrics.revenue || 0), sales: acc.sales + Number(row.metrics.sales || 0), customers: acc.customers + Number(row.metrics.customers || 0), new_customers: acc.new_customers + Number(row.metrics.new_customers || 0), products: acc.products + Number(row.metrics.products || 0), pending_attributions: acc.pending_attributions + Number(row.metrics.pending_attributions || 0) }), { active_sellers:0,revenue:0,sales:0,customers:0,new_customers:0,products:0,pending_attributions:0 });
  totals.average_ticket = totals.sales ? totals.revenue/totals.sales : 0;
  totals.target_revenue = sellers.reduce((sum,row) => sum + Number(row.period_goal?.target_revenue || 0), 0);
  totals.target_sales = sellers.reduce((sum,row) => sum + Number(row.period_goal?.target_sales || 0), 0);
  totals.target_new_customers = sellers.reduce((sum,row) => sum + Number(row.period_goal?.target_new_customers || 0), 0);
  totals.goal_attainment_percent = totals.target_revenue > 0 ? totals.revenue / totals.target_revenue * 100 : null;
  if (internalQori) {
    const attributionSummary = await query(
      `select count(*) filter (where status='PENDING' and created_at between $2 and $3)::int as payment_pending,
              count(*) filter (where status='APPROVED' and seller_user_id is null and approved_at between $2 and $3)::int as pending_attribution,
              count(*) filter (where status='APPROVED' and attribution_source='SELF' and approved_at between $2 and $3)::int as self_arrivals
         from portal_signup_sales_attributions
        where qori_business_id=$1
          and ($4::text = '' or lower(plan_code) like lower($4))`,
      [businessId, range.start, range.end, filters.product ? `%${filters.product}%` : ""]
    );
    totals.pending_attributions = Number(attributionSummary.rows[0]?.pending_attribution || 0);
    totals.payment_pending = Number(attributionSummary.rows[0]?.payment_pending || 0);
    totals.self_arrivals = Number(attributionSummary.rows[0]?.self_arrivals || 0);
  }
  return { sellers, totals, range: { start_date: range.startDate, end_date: range.endDate }, mode: internalQori ? "QORI_PLANS_AND_BUSINESS_SALES" : "BUSINESS_SALES", permissions: { can_manage: !selfOnly, self_only: selfOnly } };
}

async function sellerDetail(businessId, sellerId, actor, filters = {}) {
  if (actor.role === SELLER_ROLE && actor.id !== sellerId) throw forbidden("Solo puedes consultar tu propio desempeno.");
  if (actor.role !== SELLER_ROLE) assertSellerAdmin(actor);
  const directory = await sellerDirectory(businessId, actor, { ...filters, seller_id: sellerId });
  const seller = directory.sellers[0];
  if (!seller) throw notFound("Vendedor no encontrado.");
  const range = dateRange(filters);
  const internal = await qoriInternalBusiness();
  const internalQori = internal?.id === businessId;
  const generalSales = await query(
    `select s.id,s.customer_name,s.customer_phone,s.customer_email,s.product_name,s.sale_amount,s.currency,s.sale_status,
            s.acquisition_source,s.acquisition_channel,s.branch_id,b.name as branch_name,s.metadata,coalesce(s.paid_at,s.created_at) as sold_at,
            creator.full_name as created_by_name
       from business_sales s left join branches b on b.id=s.branch_id and b.business_id=s.business_id
       left join app_users creator on creator.id=s.created_by_user_id
      where s.business_id=$1 and s.seller_user_id=$2 and s.sale_status='PAID' and coalesce(s.paid_at,s.created_at) between $3 and $4
        and ($5::text = '' or lower(coalesce(s.product_name,'')) like lower($5) or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(s.metadata->'products')='array' then s.metadata->'products' else '[]'::jsonb end) i where lower(coalesce(i->>'name','')) like lower($5)))
        and ($6::text = '' or lower(coalesce(s.acquisition_channel,s.acquisition_source,'')) like lower($6))
        and ($7::uuid is null or s.branch_id=$7)
      order by sold_at desc limit 250`,
    [businessId,sellerId,range.start,range.end,filters.product ? `%${filters.product}%` : "",filters.channel ? `%${filters.channel}%` : "",filters.branch_id || null]
  );
  let planSales = [];
  if (internalQori) {
    const plans = await query(
      `select a.id,a.client_business_id,b.name as customer_name,a.plan_code as product_name,a.approved_revenue_cop as sale_amount,
              'COP' as currency,a.status as sale_status,'ACTIVA_QORI' as acquisition_source,a.attribution_source as acquisition_channel,
              a.approved_at as sold_at,a.seller_code_snapshot,a.seller_name_snapshot,a.mercado_pago_payment_id
         from portal_signup_sales_attributions a join businesses b on b.id=a.client_business_id
        where a.qori_business_id=$1 and a.seller_user_id=$2 and a.status='APPROVED' and a.approved_at between $3 and $4
          and ($5::text = '' or lower(a.plan_code) like lower($5))
          and ($6::text = '' or lower(a.attribution_source) like lower($6) or lower('ACTIVA_QORI') like lower($6))
          and $7::uuid is null
        order by a.approved_at desc limit 250`,
      [businessId,sellerId,range.start,range.end,filters.product ? `%${filters.product}%` : "",filters.channel ? `%${filters.channel}%` : "",filters.branch_id || null]
    );
    const planNames = new Map(listPlans().map((plan) => [plan.code, plan.name]));
    planSales = plans.rows.map((row) => ({ ...row, plan_code: row.product_name, product_name: planNames.get(row.product_name) || row.product_name }));
  }
  const allSales = [...generalSales.rows, ...planSales].sort((a,b) => new Date(b.sold_at)-new Date(a.sold_at));
  const clientMap = new Map();
  const productMap = new Map();
  allSales.forEach((sale) => {
    const clientKey = sale.client_business_id || sale.customer_email || sale.customer_phone || sale.customer_name || sale.id;
    const currentClient = clientMap.get(clientKey) || { name: sale.customer_name || "Cliente", email: sale.customer_email || null, phone: sale.customer_phone || null, first_purchase_at: sale.sold_at, last_purchase_at: sale.sold_at, revenue: 0, purchases: 0, products: [] };
    currentClient.revenue += Number(sale.sale_amount || 0); currentClient.purchases += 1;
    if (new Date(sale.sold_at) < new Date(currentClient.first_purchase_at)) currentClient.first_purchase_at=sale.sold_at;
    if (new Date(sale.sold_at) > new Date(currentClient.last_purchase_at)) currentClient.last_purchase_at=sale.sold_at;
    clientMap.set(clientKey,currentClient);
    const products = Array.isArray(sale.metadata?.products) && sale.metadata.products.length ? sale.metadata.products : [{ name: sale.product_name || "Venta", quantity: 1, line_total: sale.sale_amount }];
    products.forEach((item)=>{ const name=String(item.name||sale.product_name||"Venta"); if (!currentClient.products.includes(name)) currentClient.products.push(name); });
    products.forEach((item) => { const key=item.inventory_product_id || item.name || "Venta"; const current=productMap.get(key)||{ name:item.name||sale.product_name||"Venta", units:0,revenue:0 }; current.units+=Number(item.quantity||1); current.revenue+=Number(item.line_total||sale.sale_amount||0); productMap.set(key,current); });
  });
  const goals = await query("select * from business_seller_goals where business_id=$1 and seller_user_id=$2 order by period_start desc limit 50", [businessId,sellerId]);
  const generalEvents = await query(
    `select e.event_type,null::text as reason,e.metadata,e.created_at,actor.full_name as actor_name
       from business_seller_activity_events e left join app_users actor on actor.id=e.actor_user_id
      where e.business_id=$1 and e.seller_user_id=$2 order by e.created_at desc limit 100`, [businessId,sellerId]
  );
  const attributionEvents = internalQori ? await query(
    `select e.event_type,e.reason,e.metadata,e.created_at,actor.full_name as actor_name
       from portal_signup_sales_attribution_events e left join app_users actor on actor.id=e.actor_user_id
      where e.qori_business_id=$1 and (e.previous_seller_user_id=$2 or e.next_seller_user_id=$2) order by e.created_at desc limit 100`, [businessId,sellerId]
  ) : { rows: [] };
  const periodMs = new Date(range.end).getTime() - new Date(range.start).getTime() + 1;
  const previousEnd = new Date(new Date(range.start).getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - periodMs + 1);
  const previousRange = { start: previousStart.toISOString(), end: previousEnd.toISOString(), startDate: previousStart.toISOString().slice(0,10), endDate: previousEnd.toISOString().slice(0,10) };
  const previousAnalytics = await analyticsForSellers(businessId,[sellerId],previousRange,internalQori,filters);
  const previousMetrics = previousAnalytics.metrics.get(sellerId) || { revenue:0,sales:0,customers:0,new_customers:0,products:0 };
  const trendPercent = (currentValue, previousValue) => Number(previousValue) > 0 ? (Number(currentValue)-Number(previousValue))/Number(previousValue)*100 : (Number(currentValue) > 0 ? 100 : 0);
  const previousProducts = await query(
    `select lower(coalesce(nullif(i->>'name',''),s.product_name,'Venta')) as product_key,
            coalesce(sum(case when coalesce(i->>'line_total','') ~ '^-?[0-9]+([.][0-9]+)?$' then (i->>'line_total')::numeric else s.sale_amount end),0)::numeric as revenue
       from business_sales s
       left join lateral jsonb_array_elements(case when jsonb_typeof(s.metadata->'products')='array' and jsonb_array_length(s.metadata->'products') > 0 then s.metadata->'products' else jsonb_build_array(jsonb_build_object('name',s.product_name,'line_total',s.sale_amount)) end) i on true
      where s.business_id=$1 and s.seller_user_id=$2 and s.sale_status='PAID' and coalesce(s.paid_at,s.created_at) between $3 and $4
      group by lower(coalesce(nullif(i->>'name',''),s.product_name,'Venta'))`,
    [businessId,sellerId,previousRange.start,previousRange.end]
  );
  const previousProductMap = new Map(previousProducts.rows.map((row)=>[String(row.product_key).toLowerCase(),Number(row.revenue||0)]));
  if (internalQori) {
    const previousPlans = await query(
      `select plan_code,coalesce(sum(approved_revenue_cop),0)::numeric as revenue
         from portal_signup_sales_attributions
        where qori_business_id=$1 and seller_user_id=$2 and status='APPROVED' and approved_at between $3 and $4
        group by plan_code`, [businessId,sellerId,previousRange.start,previousRange.end]
    );
    const planNames = new Map(listPlans().map((plan)=>[plan.code,plan.name]));
    previousPlans.rows.forEach((row)=>{ const key=String(planNames.get(row.plan_code)||row.plan_code).toLowerCase(); previousProductMap.set(key,Number(previousProductMap.get(key)||0)+Number(row.revenue||0)); });
  }
  const productsWithTrend = Array.from(productMap.values()).map((product)=>{ const previousRevenue=Number(previousProductMap.get(String(product.name).toLowerCase())||0); return {...product,previous_revenue:previousRevenue,trend_percent:trendPercent(product.revenue,previousRevenue)}; }).sort((a,b)=>b.revenue-a.revenue);
  const comparison = {
    previous_period: { start_date: previousRange.startDate, end_date: previousRange.endDate },
    previous_metrics: previousMetrics,
    revenue_change_percent: trendPercent(seller.metrics?.revenue,previousMetrics.revenue),
    sales_change_percent: trendPercent(seller.metrics?.sales,previousMetrics.sales),
    customers_change_percent: trendPercent(seller.metrics?.new_customers,previousMetrics.new_customers),
  };
  const activity = [...generalEvents.rows,...attributionEvents.rows].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,100);
  return { seller, sales: allSales, clients: Array.from(clientMap.values()).sort((a,b)=>b.revenue-a.revenue), products: productsWithTrend, goals: goals.rows, activity, comparison, range: directory.range, permissions: directory.permissions };
}

async function recordSellerSale(businessId, sellerId, actor, body) {
  assertSellerAdmin(actor);
  return withTransaction(async (client) => {
    const seller = await sellerForBusiness(client,businessId,sellerId,{activeOnly:true});
    if (!seller) throw notFound("Vendedor activo no encontrado en este negocio.");
    if (body.branch_id) {
      const branch = await client.query("select id from branches where id=$1 and business_id=$2 and is_active=true", [body.branch_id, businessId]);
      if (!branch.rowCount) throw badRequest("La sede seleccionada no pertenece a este negocio.");
    }
    const idempotencyKey = body.idempotency_key;
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`seller-sale:${businessId}:${idempotencyKey}`]);
    const duplicate = await client.query("select * from business_sales where business_id=$1 and idempotency_key=$2 limit 1", [businessId,idempotencyKey]);
    if (duplicate.rowCount) return { sale: duplicate.rows[0], duplicate: true };
    const products = body.products?.length ? body.products : [{ name: body.product_name, quantity:1, unit_price:body.sale_amount, line_total:body.sale_amount, currency:body.currency || "COP" }];
    const catalog = await syncSaleProductsWithCatalog(client,businessId,actor.id,products,{currency:body.currency || "COP",sourceModule:"seller_command_center"});
    const result = await client.query(
      `insert into business_sales
        (business_id,customer_name,customer_phone,customer_email,customer_document_id,product_name,sale_amount,currency,
         seller_user_id,branch_id,acquisition_source,acquisition_channel,notes,paid_at,sale_status,idempotency_key,metadata,created_by_user_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,coalesce($14::timestamptz,now()),'PAID',$15,$16::jsonb,$17) returning *`,
      [businessId,body.customer_name||null,body.customer_phone||null,body.customer_email||null,body.customer_document_id||null,body.product_name||catalog.products[0]?.name||"Venta",body.sale_amount,body.currency||"COP",sellerId,body.branch_id||seller.branch_id||null,body.acquisition_source||"MANUAL",body.acquisition_channel||null,body.notes||null,body.paid_at||null,idempotencyKey,JSON.stringify({ ...(body.metadata||{}),products:catalog.products,auto_created_products:catalog.autoCreatedProducts,matched_products:catalog.matchedProducts,product_catalog_sync:true,capture_source:"seller_command_center",responsible_commercial:{user_id:sellerId,name_snapshot:seller.full_name,code_snapshot:seller.seller_code},recorded_by_user_id:actor.id }),actor.id]
    );
    await logSellerActivity(client,{business_id:businessId,seller_user_id:sellerId,actor_user_id:actor.id,event_type:"SALE_RECORDED",entity_type:"BUSINESS_SALE",entity_id:result.rows[0].id,metadata:{amount:Number(body.sale_amount),currency:body.currency||"COP",product_name:body.product_name||catalog.products[0]?.name||"Venta",customer_name_snapshot:body.customer_name||null}});
    return { sale: result.rows[0], duplicate: false };
  });
}

async function listSignupAttributions(businessId, actor, filters = {}) {
  assertSellerAdmin(actor);
  const internal = await qoriInternalBusiness();
  if (!internal || internal.id !== businessId) throw forbidden("Las atribuciones de planes solo estan disponibles en la cuenta interna oficial de Qori.");
  const range = dateRange(filters);
  const status = cleanText(filters.attribution_status, 20) || "";
  const source = cleanText(filters.attribution_source, 20) || "";
  const sellerId = cleanText(filters.seller_id, 40);
  const product = cleanText(filters.product, 160) || "";
  const search = cleanText(filters.attribution_search, 120) || "";
  const searchLike = search ? `%${escapeLikePattern(search)}%` : "";
  const limit = Math.min(100, Math.max(10, Number(filters.limit || 50)));
  const page = Math.max(1, Number(filters.page || 1));
  const offset = (page - 1) * limit;
  const baseWhere = `a.qori_business_id=$1
    and coalesce(a.approved_at,a.created_at) between $2 and $3
    and ($4::text='' or lower(a.plan_code) like lower($4))
    and ($5::text='' or lower(cb.name) like lower($5) escape '\\' or lower(coalesce(a.seller_name_snapshot,'')) like lower($5) escape '\\' or lower(coalesce(a.seller_code_snapshot,'')) like lower($5) escape '\\')`;
  const rows = await query(
    `select a.id,a.status,a.attribution_source,a.plan_code,a.billing_cycle,a.expected_revenue_cop,a.approved_revenue_cop,
            a.approved_at,a.created_at,a.updated_at,a.seller_user_id,a.seller_name_snapshot,a.seller_code_snapshot,
            cb.name as client_business_name,coalesce(su.full_name,a.seller_name_snapshot) as current_seller_name,
            coalesce(sp.seller_code,a.seller_code_snapshot) as current_seller_code,
            right(a.purchase_order_id::text,8) as order_reference,
            case when a.mercado_pago_payment_id is null then null else right(a.mercado_pago_payment_id,8) end as payment_reference,
            count(*) over()::int as filtered_total
       from portal_signup_sales_attributions a
       join businesses cb on cb.id=a.client_business_id
       left join app_users su on su.id=a.seller_user_id and su.business_id=a.qori_business_id
       left join business_seller_profiles sp on sp.user_id=su.id and sp.business_id=su.business_id
      where ${baseWhere}
        and ($6::text='' or a.status=$6)
        and ($7::text='' or a.attribution_source=$7)
        and ($8::uuid is null or a.seller_user_id=$8)
      order by case a.status when 'PENDING' then 0 when 'APPROVED' then 1 else 2 end,
               coalesce(a.approved_at,a.created_at) desc
      limit $9 offset $10`,
    [businessId,range.start,range.end,product ? `%${product}%` : "",searchLike,status,source,sellerId || null,limit,offset]
  );
  const summary = await query(
    `select count(*)::int as total,
            count(*) filter (where a.status='PENDING')::int as payment_pending,
            count(*) filter (where a.status='APPROVED')::int as approved,
            count(*) filter (where a.status='APPROVED' and a.seller_user_id is null)::int as needs_assignment,
            count(*) filter (where a.status in ('FAILED','CANCELLED','REFUNDED'))::int as exceptions
       from portal_signup_sales_attributions a
       join businesses cb on cb.id=a.client_business_id
      where ${baseWhere}`,
    [businessId,range.start,range.end,product ? `%${product}%` : "",searchLike]
  );
  const plans = new Map(listPlans().map((plan) => [plan.code, plan.name]));
  return {
    attributions: rows.rows.map((row) => ({ ...row, plan_name: plans.get(row.plan_code) || row.plan_code, filtered_total: undefined })),
    summary: summary.rows[0] || { total: 0, payment_pending: 0, approved: 0, needs_assignment: 0, exceptions: 0 },
    pagination: { page, limit, total: Number(rows.rows[0]?.filtered_total || 0), has_more: offset + rows.rows.length < Number(rows.rows[0]?.filtered_total || 0) },
    range: { start_date: range.startDate, end_date: range.endDate },
  };
}

async function reassignSignupAttribution(businessId, attributionId, actor, body) {
  assertSellerAdmin(actor);
  const internal = await qoriInternalBusiness();
  if (!internal || internal.id !== businessId) throw forbidden("La atribucion de planes solo se administra desde la cuenta interna oficial de Qori.");
  return withTransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`signup-attribution:${attributionId}`]);
    const currentResult = await client.query("select * from portal_signup_sales_attributions where id=$1 and qori_business_id=$2 for update", [attributionId,businessId]);
    const current = currentResult.rows[0];
    if (!current) throw notFound("Atribucion no encontrada.");
    let nextSeller = null;
    if (body.seller_user_id) {
      nextSeller = await sellerForBusiness(client,businessId,body.seller_user_id,{activeOnly:true});
      if (!nextSeller) throw badRequest("El vendedor seleccionado no esta activo en la cuenta Qori.");
    }
    const source = nextSeller ? "ADMIN_ASSIGNED" : "SELF";
    const updated = await client.query(
      `update portal_signup_sales_attributions set seller_user_id=$3,attribution_source=$4,seller_code_snapshot=$5,
          seller_name_snapshot=$6,assigned_by_user_id=$7,assignment_reason=$8,updated_at=now()
        where id=$1 and qori_business_id=$2 returning *`,
      [attributionId,businessId,nextSeller?.id||null,source,nextSeller?.seller_code||null,nextSeller?.full_name||null,actor.id,body.reason]
    );
    await client.query(
      `insert into portal_signup_sales_attribution_events
        (attribution_id,qori_business_id,event_type,previous_seller_user_id,next_seller_user_id,actor_user_id,reason,metadata)
       values ($1,$2,'REASSIGNED',$3,$4,$5,$6,$7::jsonb)`,
      [attributionId,businessId,current.seller_user_id,nextSeller?.id||null,actor.id,body.reason,JSON.stringify({previous_source:current.attribution_source,next_source:source})]
    );
    if (current.seller_user_id) await logSellerActivity(client,{business_id:businessId,seller_user_id:current.seller_user_id,actor_user_id:actor.id,event_type:"ATTRIBUTION_REASSIGNED",entity_type:"PORTAL_SIGNUP_ATTRIBUTION",entity_id:attributionId,metadata:{direction:"OUT",next_seller_user_id:nextSeller?.id||null,reason:body.reason}});
    if (nextSeller?.id) await logSellerActivity(client,{business_id:businessId,seller_user_id:nextSeller.id,actor_user_id:actor.id,event_type:"ATTRIBUTION_REASSIGNED",entity_type:"PORTAL_SIGNUP_ATTRIBUTION",entity_id:attributionId,metadata:{direction:"IN",previous_seller_user_id:current.seller_user_id||null,reason:body.reason}});
    return updated.rows[0];
  });
}

module.exports = {
  SELLER_ROLE,
  sellerAdmin,
  assertSellerAdmin,
  assertSellerSelf,
  normalizeSellerCode,
  qoriInternalBusiness,
  publicSalesAdvisors,
  resolveQoriAdvisor,
  createSignupAttribution,
  approveSignupAttribution,
  syncSignupAttributionStatus,
  createSeller,
  updateSeller,
  updateSellerSelf,
  saveSellerGoal,
  sellerDirectory,
  sellerDetail,
  recordSellerSale,
  listSignupAttributions,
  reassignSignupAttribution,
  __testing: { normalizeSellerCode, signupAttributionStatus, dateRange, escapeLikePattern, searchableCharacters, proratedGoalForRange },
};
