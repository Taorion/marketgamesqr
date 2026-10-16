const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { query, withTransaction } = require("../config/db");
const { badRequest, notFound, forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const { listPlans, planFromBusiness } = require("./subscriptionService");
const { ensureBaseBusinessRecords, assignInitialAgreementTickets } = require("./adminProvisioningService");
const { MODULES, LIMIT_LABELS } = require("./commercialTerms");
const { SUPERADMIN, SELLER, PLAN_CODES, termsSchema, policySchema, requireSuperadmin, requireCommercialUser, requireOwner, policyAllows, assertConvertible } = require("./commercialAuthorization");

const { PERMISSIONS, DEFAULT_PERMISSIONS, permissionsFor, hasPermission, requirePermission, canSeeTeam, hasPrivilegedAccess } = require('./adminPermissions');

const uuid = z.string().uuid();
const reasonSchema = z.string().trim().min(5).max(2000);
const personSchema = z.object({ full_name: z.string().trim().min(2).max(160), email: z.string().trim().email().max(180), phone: z.string().trim().max(60).default("") }).strict();
const sellerPassword = z.string().min(10, "La contraseña debe tener al menos 10 caracteres.").max(120).refine(value => Buffer.byteLength(value, "utf8") <= 72, "La contraseña es demasiado larga.");
const businessRoles = ["BUSINESS_OWNER", "BUSINESS_MANAGER", "BUSINESS_SELLER", "VALIDATOR"];
const sellerCreationSchema = personSchema.extend({
  password: sellerPassword.optional(),
  password_confirm: z.string().max(120).optional(),
}).refine(body => body.password === body.password_confirm, { message: "La confirmación de contraseña no coincide.", path: ["password_confirm"] });
const prospectSchema = z.object({ business_name: z.string().trim().min(2).max(160), contact_name: z.string().trim().min(2).max(160), email: z.string().trim().email().max(180), phone: z.string().trim().max(60).default(""), notes: z.string().trim().max(4000).default(""), stage: z.enum(["NEW", "CONTACTED", "NEGOTIATING", "LOST"]).default("NEW"), next_contact_at: z.string().datetime().nullable().default(null), seller_id: uuid.optional() }).strict();
const dealSchema = z.object({ prospect_id: uuid.nullable().default(null), business_id: uuid.nullable().default(null), policy_id: uuid.nullable().default(null), terms: termsSchema, reason: reasonSchema }).strict().refine(v => Boolean(v.prospect_id) !== Boolean(v.business_id), "Selecciona un prospecto o un cliente existente.");
const dateAfterDays = (date, days) => new Date(date.getTime() + days * 86400000).toISOString();
function addMonths(date, months) { const end = new Date(date); const day = end.getUTCDate(); end.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + months); const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate(); end.setUTCDate(Math.min(day, last)); return end.toISOString(); }
const generatedPassword = () => crypto.randomBytes(18).toString("base64url") + "!7aA";

async function audit(client, actor, action, entity, id, detail = {}) {
  await client.query("insert into qori_commercial_audit (actor_id, action, entity_type, entity_id, detail) values ($1,$2,$3,$4,$5::jsonb)", [actor.id, action, entity, id, JSON.stringify(detail)]);
}
async function sellerExists(client, id) {
  const result = await client.query("select id from app_users where id=$1 and is_active=true and (role in ('QORI_SUPERADMIN','QORI_SELLER') or platform_role in ('QORI_SUPERADMIN','QORI_SELLER')) for share", [id]);
  if (!result.rowCount) throw badRequest("El vendedor debe tener una cuenta comercial activa.");
}
async function locked(client, table, id) {
  validate(uuid, id);
  const result = await client.query(`select * from ${table} where id=$1 for update`, [id]);
  if (!result.rowCount) throw notFound("Registro no encontrado.");
  return result.rows[0];
}
async function bootstrap(user) {
  requireCommercialUser(user);
  const [policies, sellers, counts] = await Promise.all([
    query(`select * from qori_commercial_policies where ($1::boolean or (is_active and expires_at > now() and (seller_id is null or seller_id=$2))) order by created_at desc limit 200`, [hasPermission(user,'policies.manage'), user.id]),
    query(`select u.id,u.full_name,u.email,u.role,u.platform_role,u.admin_permissions,u.business_id,u.is_active as account_is_active,
      (u.is_active and (u.role in ('QORI_SELLER','QORI_SUPERADMIN') or u.platform_role in ('QORI_SELLER','QORI_SUPERADMIN'))) as is_active,
      p.phone,p.archived_at from app_users u left join qori_sales_profiles p on p.user_id=u.id
      where (u.role in ('QORI_SELLER','QORI_SUPERADMIN') or u.platform_role in ('QORI_SELLER','QORI_SUPERADMIN') or p.user_id is not null or u.id=$2)
        and ($1::boolean or u.id=$2) order by u.full_name`, [canSeeTeam(user), user.id]),
    query(`select (select count(*)::int from qori_sales_prospects where ($1 or seller_id=$2) and stage not in ('WON','LOST')) as prospects,
      (select count(*)::int from qori_commercial_deals where ($1 or seller_id=$2) and status='PENDING') as pending,
      (select count(*)::int from qori_commercial_deals where ($1 or seller_id=$2) and status='APPROVED' and valid_until>now()) as approved,
      (select count(*)::int from businesses b where b.is_active and ($1 or exists(select 1 from qori_sales_accounts a where a.business_id=b.id and a.seller_id=$2))) as customers`, [hasPermission(user,'portfolio.all'), user.id]),
  ]);
  return { user: { id: user.id, name: user.full_name, role: user.role, permissions:permissionsFor(user), can_see_team:canSeeTeam(user) }, permission_catalog:PERMISSIONS, default_permissions:DEFAULT_PERMISSIONS, descubre: listPlans().find(p => p.code === "DESCUBRE"), plans: listPlans().filter(p => PLAN_CODES.includes(p.code)), modules: MODULES, limit_labels: LIMIT_LABELS, policies: policies.rows, sellers: sellers.rows.map(s=>({...s,admin_role:s.platform_role||s.role,privileged:hasPrivilegedAccess(s)})), counts: counts.rows[0] };
}
async function createSeller(user, payload) {
  requirePermission(user,'team.create');
  const body = validate(sellerCreationSchema, payload);
  const password = body.password ?? generatedPassword();
  const hash = await bcrypt.hash(password, 12);
  const seller = await withTransaction(async client => {
    const existing = await client.query("select id from app_users where lower(email)=lower($1)", [body.email]);
    if (existing.rowCount) throw badRequest("Ese correo ya tiene una cuenta. Usa Habilitar usuario existente para darle acceso como vendedor.");
    const result = await client.query("insert into app_users(email,password_hash,full_name,role,is_active) values(lower($1),$2,$3,'QORI_SELLER',true) returning id,email,full_name,role,is_active", [body.email, hash, body.full_name]);
    await client.query("insert into qori_sales_profiles(user_id,phone,created_by) values($1,$2,$3)", [result.rows[0].id, body.phone, user.id]);
    await audit(client, user, "SELLER_CREATED", "seller", result.rows[0].id, { name: body.full_name });
    return result.rows[0];
  });
  return { seller, credentials: { email: seller.email, password } };
}
function existingSellerReason(account) {
  if (!account) return "No hay una cuenta con ese correo.";
  if (!account.is_active) return "La cuenta está desactivada. Reactívala antes de habilitar el acceso comercial.";
  if (account.platform_role === SUPERADMIN || !businessRoles.includes(account.role) || !account.business_id) return "Esta opción solo habilita usuarios del portal empresa, sin cambiar administradores existentes.";
  if (account.platform_role === SELLER) return "Este usuario ya tiene acceso como vendedor. Puedes gestionarlo en Equipo de ventas.";
  return null;
}
async function findExistingSeller(user, payload) {
  requirePermission(user,'team.create');
  const body=validate(z.object({email:z.string().trim().email().max(180)}).strict(),payload);
  const account=(await query(`select u.id,u.full_name,u.email,u.role,u.platform_role,u.business_id,u.is_active,b.name as business_name
    from app_users u left join businesses b on b.id=u.business_id where lower(u.email)=lower($1) limit 1`,[body.email])).rows[0] || null;
  const reason=existingSellerReason(account);
  return {user:account,eligible:!reason,reason};
}
async function grantExistingSeller(user, payload) {
  requirePermission(user,'team.create');
  const body=validate(z.object({user_id:uuid,password:sellerPassword,password_confirm:z.string().max(120)}).strict()
    .refine(v=>v.password===v.password_confirm,{message:"La confirmación de contraseña no coincide.",path:["password_confirm"]}),payload);
  const hash=await bcrypt.hash(body.password,12);
  return withTransaction(async client=>{
    const account=await locked(client,"app_users",body.user_id);
    const reason=existingSellerReason(account);if(reason)throw badRequest(reason);
    if(user.role!==SUPERADMIN && hasPrivilegedAccess(account)) throw forbidden('Solo el superadministrador puede habilitar esta cuenta.');
    const seller=(await client.query(`update app_users set platform_role='QORI_SELLER',password_hash=$2,
      password_version=coalesce(password_version,0)+1,updated_at=now() where id=$1
      returning id,email,full_name,role,platform_role,business_id,is_active`,[account.id,hash])).rows[0];
    await client.query(`insert into qori_sales_profiles(user_id,created_by) values($1,$2)
      on conflict(user_id) do update set archived_at=null`,[account.id,user.id]);
    await client.query("update password_reset_tokens set used_at=now() where user_id=$1 and used_at is null",[account.id]);
    await audit(client,user,"SELLER_ACCESS_GRANTED","seller",account.id,{name:account.full_name,business_id:account.business_id,business_role:account.role});
    return {seller,credentials:{email:account.email,password:body.password,shared_login:true}};
  });
}
async function updateSeller(user, id, payload, archive = false) {
  requirePermission(user,archive?'team.remove':'team.edit');
  const body = archive ? {} : validate(z.object({ full_name: z.string().trim().min(2).max(160).optional(), phone: z.string().trim().max(60).optional(), is_active: z.boolean().optional(), reset_password: z.boolean().optional(),password:sellerPassword.optional(),password_confirm:z.string().max(120).optional() }).strict()
    .refine(v=>v.password===v.password_confirm,{message:"La confirmación de contraseña no coincide.",path:["password_confirm"]})
    .refine(v=>!(v.password&&v.reset_password),"Elige una contraseña propia o genera una, no ambas."), payload);
  if(body.is_active!==undefined) requirePermission(user,'team.remove');
  const password = body.password || (body.reset_password ? generatedPassword() : null);
  const hash = password ? await bcrypt.hash(password, 12) : null;
  return withTransaction(async client => {
    const current = await locked(client, "app_users", id);
    if(user.id===id) throw forbidden('No puedes modificar tu propio acceso.');
    if(user.role!==SUPERADMIN && hasPrivilegedAccess(current)) throw forbidden('Solo el superadministrador puede gestionar usuarios con permisos adicionales.');
    const profile=(await client.query("select user_id from qori_sales_profiles where user_id=$1",[id])).rows[0];
    const shared=businessRoles.includes(current.role)&&Boolean(current.business_id);
    if (current.platform_role===SUPERADMIN || (current.role!==SELLER && !(shared&&profile))) throw badRequest("Este control solo administra vendedores de Qori.");
    const active = archive ? false : (body.is_active ?? (shared ? current.platform_role===SELLER : current.is_active));
    if(shared && active && !current.is_active) throw badRequest("La cuenta del usuario está desactivada. Reactívala antes de habilitar el acceso comercial.");
    const result = await client.query(`update app_users set full_name=$2,is_active=$3,password_hash=coalesce($4,password_hash),
      platform_role=$5,password_version=coalesce(password_version,0)+1,updated_at=now() where id=$1
      returning id,email,full_name,is_active,role,platform_role,business_id`, [id, body.full_name || current.full_name, shared?current.is_active:active, hash,shared?(active?SELLER:null):current.platform_role]);
    await client.query(`update qori_sales_profiles set phone=coalesce($2,phone),archived_at=case when $3 then now() when $4 then null else archived_at end where user_id=$1`, [id, body.phone ?? null, archive, active]);
    await audit(client, user, archive ? "SELLER_ARCHIVED" : "SELLER_UPDATED", "seller", id, { active, reset_password: Boolean(password) });
    if(password) await client.query("update password_reset_tokens set used_at=now() where user_id=$1 and used_at is null",[id]);
    return { seller: result.rows[0], ...(password ? { credentials: { email: current.email, password,shared_login:shared } } : {}) };
  });
}
async function updateAdminAccess(user,id,payload) {
  requireSuperadmin(user);
  validate(uuid,id);
  const body=validate(z.object({
    role:z.enum([SUPERADMIN,SELLER,'NONE']),
    permissions:z.array(z.enum(Object.keys(PERMISSIONS))).max(Object.keys(PERMISSIONS).length).default([]),
    reason:reasonSchema,
  }).strict(),payload);
  if(user.id===id) throw forbidden('No puedes cambiar tu propio rol o permisos. Otro superadministrador debe hacerlo.');
  return withTransaction(async client=>{
    // Serialize role changes and recheck the actor after acquiring the lock.
    // Two admins cannot concurrently demote each other and leave no active admin.
    await client.query("select pg_advisory_xact_lock(hashtext('qori-admin-access'))");
    const actor=(await client.query('select role,platform_role,is_active from app_users where id=$1 for share',[user.id])).rows[0];
    if(!actor?.is_active || (actor.platform_role||actor.role)!==SUPERADMIN) throw forbidden('Tu acceso de superadministrador ya no está vigente.');
    const current=await locked(client,'app_users',id);
    const shared=businessRoles.includes(current.role)&&Boolean(current.business_id);
    if(!shared && ![SELLER,SUPERADMIN].includes(current.role)) throw badRequest('Esta cuenta no admite permisos comerciales.');
    if(shared&&!current.is_active&&body.role!=='NONE') throw badRequest('Reactiva la cuenta del portal antes de habilitar su acceso al admin.');
    const permissions=body.role===SELLER?[...new Set(body.permissions)]:[];
    await client.query(`update app_users set role=$2,platform_role=$3,admin_permissions=$4,
      is_active=$5,password_version=coalesce(password_version,0)+1,updated_at=now() where id=$1`,
      [id,shared?current.role:(body.role==='NONE'?SELLER:body.role),shared?(body.role==='NONE'?null:body.role):null,permissions,shared?current.is_active:body.role!=='NONE']);
    await client.query(`insert into qori_sales_profiles(user_id,created_by,archived_at) values($1,$2,case when $3 then now() else null end)
      on conflict(user_id) do update set archived_at=excluded.archived_at`,[id,user.id,body.role==='NONE']);
    await client.query('update password_reset_tokens set used_at=now() where user_id=$1 and used_at is null',[id]);
    await audit(client,user,'ADMIN_ACCESS_UPDATED','seller',id,{name:current.full_name,
      previous_role:current.platform_role||current.role,role:body.role,
      previous_permissions:current.admin_permissions,permissions,reason:body.reason});
    return {ok:true};
  });
}
async function savePolicy(user, payload, id = null) {
  requirePermission(user,'policies.manage');
  const body = validate(policySchema, payload);
  if (new Date(body.expires_at) <= new Date() && body.is_active) throw badRequest("La autorización debe tener una fecha futura.");
  return withTransaction(async client => {
    if (body.seller_id) await sellerExists(client, body.seller_id);
    if (id) await locked(client, "qori_commercial_policies", id);
    const fields = [body.name,body.seller_id,body.plan_codes,body.max_discount_percent,body.max_discount_months,body.max_trial_days,body.max_bonus_tickets,body.allowed_modules,body.max_benefit_days,JSON.stringify(body.max_limits),body.expires_at,body.is_active];
    const result = id
      ? await client.query(`update qori_commercial_policies set name=$1,seller_id=$2,plan_codes=$3,max_discount_percent=$4,max_discount_months=$5,max_trial_days=$6,max_bonus_tickets=$7,allowed_modules=$8,max_benefit_days=$9,max_limits=$10::jsonb,expires_at=$11,is_active=$12,version=version+1,updated_at=now(),approved_by=$14 where id=$13 returning *`, [...fields,id,user.id])
      : await client.query(`insert into qori_commercial_policies(name,seller_id,plan_codes,max_discount_percent,max_discount_months,max_trial_days,max_bonus_tickets,allowed_modules,max_benefit_days,max_limits,expires_at,is_active,approved_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13) returning *`, [...fields,user.id]);
    await audit(client,user,id ? "POLICY_UPDATED" : "POLICY_CREATED","policy",result.rows[0].id,body);
    return { policy: result.rows[0] };
  });
}
function paging(params) {
  return { offset: Math.max(0,Math.min(100000,parseInt(params.offset,10)||0)), search: `%${String(params.search||"").slice(0,150)}%`, status: String(params.status||"").slice(0,30) };
}
async function list(user, kind, params = {}) {
  requireCommercialUser(user);
  const {offset,search,status} = paging(params);
  const superadmin = kind==='audit' ? hasPermission(user,'audit.view') : hasPermission(user,'portfolio.all');
  let sql;
  if (kind === "prospects") sql = `select p.*,u.full_name as seller_name from qori_sales_prospects p join app_users u on u.id=p.seller_id where ($1 or p.seller_id=$2) and (p.business_name ilike $3 or p.email ilike $3 or p.contact_name ilike $3 or p.phone ilike $3) and ($4='' or p.stage=$4) order by p.created_at desc,p.id limit 51 offset $5`;
  else if (kind === "deals") sql = `select d.*,coalesce(p.business_name,b.name) as customer_name,u.full_name as seller_name from qori_commercial_deals d left join qori_sales_prospects p on p.id=d.prospect_id left join businesses b on b.id=d.business_id join app_users u on u.id=d.seller_id where ($1 or d.seller_id=$2) and (coalesce(p.business_name,b.name,'') ilike $3 or p.email ilike $3 or b.settings->>'contact_email' ilike $3) and ($4='' or d.status=$4) order by d.created_at desc,d.id limit 51 offset $5`;
  else if (kind === "customers") sql = `select b.id,b.name,b.slug,b.is_active,b.plan_code,b.plan_type,b.portal_status,b.subscription_status,b.subscription_current_period_ends_at,b.settings,a.seller_id,u.full_name as seller_name
    from businesses b left join qori_sales_accounts a on a.business_id=b.id left join app_users u on u.id=a.seller_id
    where ($1 or a.seller_id=$2)
      and (b.name ilike $3 or b.slug ilike $3 or b.settings->>'contact_email' ilike $3 or b.settings->>'nit' ilike $3 or b.settings->>'phone' ilike $3)
      and ($4='' or
        ($4='SUSPENDED' and (not b.is_active or b.subscription_status='SUSPENDED')) or
        ($4='DESCUBRE_ACTIVE' and b.is_active and b.plan_code='DESCUBRE' and b.subscription_status='ACTIVE' and b.subscription_current_period_ends_at>now()) or
        ($4='DESCUBRE_EXPIRED' and b.plan_code='DESCUBRE' and (b.subscription_current_period_ends_at<=now() or b.subscription_current_period_ends_at is null)) or
        ($4 not in ('SUSPENDED','DESCUBRE_ACTIVE','DESCUBRE_EXPIRED') and b.is_active and b.subscription_status=$4))
    order by b.created_at desc,b.id limit 51 offset $5`;
  else if (kind === "audit") { requirePermission(user,"audit.view"); sql = `select a.*,u.full_name as actor_name from qori_commercial_audit a left join app_users u on u.id=a.actor_id where ($1 or a.actor_id=$2) and (a.action ilike $3 or u.full_name ilike $3) and ($4='' or a.entity_type=$4) order by a.created_at desc,a.id limit 51 offset $5`; }
  else throw notFound();
  const result = await query(sql,[superadmin,user.id,search,status,offset]);
  const rows = result.rows.slice(0,50).map(row => {
    if (kind !== "customers") return row;
    const { settings, ...publicRow } = row;
    return { ...publicRow, contact_email: settings?.contact_email || null, subscription: planFromBusiness(row), commercial: settings?.qori_commercial || null };
  });
  return { rows, has_more: result.rows.length > 50, next_offset: offset + rows.length };
}
async function saveProspect(user,payload,id=null) {
  requirePermission(user,'prospects.manage');
  const body=validate(prospectSchema,payload);
  return withTransaction(async client=>{
    const current=id ? await locked(client,"qori_sales_prospects",id) : null;
    if (current) { requireOwner(user,current.seller_id); if(current.stage === "WON") throw badRequest("El prospecto ya es cliente; gestiona su suscripción en Clientes."); }
    const sellerId=body.seller_id || current?.seller_id || user.id;
    requireOwner(user,sellerId);
    await sellerExists(client,sellerId);
    if(current && sellerId !== current.seller_id) {
      const open = await client.query("select id from qori_commercial_deals where prospect_id=$1 and status in ('PENDING','APPROVED') limit 1",[id]);
      if(open.rowCount) throw badRequest("Cancela las ofertas abiertas antes de reasignar el prospecto.");
    }
    const values=[sellerId,body.business_name,body.contact_name,body.email.toLowerCase(),body.phone,body.notes,body.stage,body.next_contact_at];
    const result=id ? await client.query("update qori_sales_prospects set seller_id=$1,business_name=$2,contact_name=$3,email=$4,phone=$5,notes=$6,stage=$7,next_contact_at=$8,updated_at=now() where id=$9 returning *",[...values,id]) : await client.query("insert into qori_sales_prospects(seller_id,business_name,contact_name,email,phone,notes,stage,next_contact_at) values($1,$2,$3,$4,$5,$6,$7,$8) returning *",values);
    await audit(client,user,id?"PROSPECT_UPDATED":"PROSPECT_CREATED","prospect",result.rows[0].id,{ seller_id:sellerId,stage:body.stage });
    return { prospect:result.rows[0] };
  });
}
async function createDeal(user,payload) {
  requirePermission(user,'offers.manage');
  const body=validate(dealSchema,payload);
  return withTransaction(async client=>{
    let sellerId=user.id;
    if(body.prospect_id) {
      const prospect=await locked(client,"qori_sales_prospects",body.prospect_id);
      requireOwner(user,prospect.seller_id);
      if(prospect.stage === "WON") throw badRequest("Este prospecto ya fue inscrito.");
      sellerId=prospect.seller_id;
    } else {
      await locked(client,"businesses",body.business_id);
      const account=await client.query("select seller_id from qori_sales_accounts where business_id=$1",[body.business_id]);
      if(user.role!==SUPERADMIN) requireOwner(user,account.rows[0]?.seller_id);
      sellerId=account.rows[0]?.seller_id || user.id;
    }
    await sellerExists(client,sellerId);
    const policy=body.policy_id ? await locked(client,"qori_commercial_policies",body.policy_id) : null;
    if(policy && user.role!==SUPERADMIN && policy.seller_id && policy.seller_id!==user.id) throw badRequest("Esta autorización no está asignada a tu cuenta.");
    // Existing subscribers require an individual decision: a seller cannot stack trials or credits.
    const automatic=!body.business_id && policyAllows(policy,body.terms,sellerId);
    const approved=user.role===SUPERADMIN || automatic;
    const source=user.role===SUPERADMIN ? "SUPERADMIN" : automatic ? "POLICY" : null;
    const validUntil=approved ? (source==="POLICY" ? new Date(Math.min(Date.now()+30*86400000,new Date(policy.expires_at).getTime())).toISOString() : dateAfterDays(new Date(),30)) : null;
    const result=await client.query(`insert into qori_commercial_deals(prospect_id,business_id,seller_id,policy_id,policy_version,terms,reason,status,approval_source,approved_by,approved_at,valid_until) values($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,case when $10::uuid is not null then now() else null end,$11) returning *`,[body.prospect_id,body.business_id,sellerId,body.policy_id,policy?.version||null,JSON.stringify(body.terms),body.reason,approved?"APPROVED":"PENDING",source,approved?(source==="SUPERADMIN"?user.id:policy.approved_by):null,validUntil]);
    await audit(client,user,approved?"DEAL_AUTHORIZED":"EXCEPTION_REQUESTED","deal",result.rows[0].id,{terms:body.terms,source,reason:body.reason});
    return { deal:result.rows[0] };
  });
}
async function decideDeal(user,id,payload) {
  requirePermission(user,'offers.approve');
  const body=validate(z.object({ decision:z.enum(["APPROVED","REJECTED"]),reason:reasonSchema,valid_days:z.number().int().min(1).max(90).default(30) }).strict(),payload);
  return withTransaction(async client=>{
    const deal=await locked(client,"qori_commercial_deals",id);
    requireOwner(user,deal.seller_id);
    if(!["PENDING","APPROVED"].includes(deal.status)) throw badRequest("Esta oferta ya está cerrada.");
    await sellerExists(client,deal.seller_id);
    const result=await client.query("update qori_commercial_deals set status=$2,approval_source='SUPERADMIN',approved_by=$3,approved_at=now(),decision_reason=$4,valid_until=$5,updated_at=now() where id=$1 returning *",[id,body.decision,user.id,body.reason,dateAfterDays(new Date(),body.valid_days)]);
    await audit(client,user,`DEAL_${body.decision}`,"deal",id,{reason:body.reason,terms:deal.terms});
    return {deal:result.rows[0]};
  });
}
async function cancelDeal(user,id,payload) {
  requirePermission(user,'offers.manage');
  const reason=validate(reasonSchema,payload.reason);
  return withTransaction(async client=>{
    const deal=await locked(client,"qori_commercial_deals",id);
    requireOwner(user,deal.seller_id);
    if(!["PENDING","APPROVED"].includes(deal.status)) throw badRequest("La oferta ya fue cerrada.");
    await client.query("update qori_commercial_deals set status='CANCELLED',decision_reason=$2,updated_at=now() where id=$1",[id,reason]);
    await audit(client,user,"DEAL_CANCELLED","deal",id,{reason});
    return {ok:true};
  });
}
function buildTerms(deal,start) {
  const t=deal.terms;
  const discountStart=new Date(dateAfterDays(start,t.trial_days));
  return { status:"ACTIVE",deal_id:deal.id,approved_by:deal.approved_by,seller_id:deal.seller_id,plan_code:t.plan_code,modules:t.modules,limit_overrides:t.limit_overrides,
    benefits_starts_at:start.toISOString(),benefits_ends_at:dateAfterDays(start,t.benefit_days),discount_percent:t.discount_percent,
    discount_starts_at:discountStart.toISOString(),discount_ends_at:addMonths(discountStart,t.discount_months),trial_ends_at:t.trial_days?discountStart.toISOString():null };
}
async function applyDeal(user,id) {
  requirePermission(user,'offers.manage');
  requireCommercialUser(user);
  const password=generatedPassword();
  const hash=await bcrypt.hash(password,12);
  return withTransaction(async client=>{
    const deal=await locked(client,"qori_commercial_deals",id);
    requireOwner(user,deal.seller_id);
    if(deal.status==="APPLIED") return { business_id:deal.business_id,already_applied:true };
    const policy=deal.policy_id ? await locked(client,"qori_commercial_policies",deal.policy_id) : null;
    assertConvertible(deal,user,policy);
    await sellerExists(client,deal.seller_id);
    const now=new Date();
    const terms=buildTerms(deal,now);
    let business, credentials;
    if(deal.prospect_id && !deal.business_id) {
      const prospect=await locked(client,"qori_sales_prospects",deal.prospect_id);
      if(prospect.stage==="WON" || prospect.business_id) throw badRequest("Este prospecto ya fue inscrito por otra oferta.");
      if(prospect.seller_id!==deal.seller_id) throw badRequest("La asignación del prospecto cambió. Crea una nueva oferta.");
      const existing=await client.query("select id from app_users where lower(email)=lower($1)",[prospect.email]);
      if(existing.rowCount) throw badRequest("El correo ya tiene una cuenta; vincula el cliente existente o corrige el prospecto.");
      const slug=prospect.business_name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90)+"-"+crypto.randomBytes(4).toString("hex");
      const active=deal.terms.trial_days>0;
      const settings={contact_name:prospect.contact_name,contact_email:prospect.email,phone:prospect.phone,signup_type:"qori_sales",qori_commercial:terms,subscription:{plan_code:terms.plan_code,status:active?"ACTIVE":"PENDING_PAYMENT",monthly_payment_required:true},access:{source:"qori_sales",plan_type:"premium_monthly",portal_status:active?"ACTIVE":"PENDING_PAYMENT"}};
      const result=await client.query(`insert into businesses(name,slug,settings,plan_code,plan_type,portal_status,subscription_status,subscription_started_at,subscription_current_period_ends_at,is_active) values($1,$2,$3::jsonb,$4,'premium_monthly',$5,$5,now(),$6,true) returning *`,[prospect.business_name,slug,JSON.stringify(settings),terms.plan_code,active?"ACTIVE":"PENDING_PAYMENT",terms.trial_ends_at||now.toISOString()]);
      business=result.rows[0];
      await client.query("insert into app_users(business_id,email,password_hash,full_name,role,is_active) values($1,lower($2),$3,$4,'BUSINESS_OWNER',true)",[business.id,prospect.email,hash,prospect.contact_name]);
      await ensureBaseBusinessRecords(client,business.id,business.name);
      await client.query("update qori_sales_prospects set stage='WON',business_id=$2,updated_at=now() where id=$1",[prospect.id,business.id]);
      credentials={email:prospect.email,password};
    } else {
      business=await locked(client,"businesses",deal.business_id);
      if(!business.is_active) throw badRequest("Reactiva el negocio antes de aplicar beneficios.");
      const account=await client.query("select seller_id from qori_sales_accounts where business_id=$1 for update",[business.id]);
      if(user.role!==SUPERADMIN) requireOwner(user,account.rows[0]?.seller_id);
      if(business.settings?.subscription?.lifetime_access || business.settings?.commercial_deal?.lifetime_access || business.settings?.access?.lifetime_access) throw badRequest("Este cliente tiene un convenio vitalicio; conserva su contrato desde la gestión de suscripción existente.");
      if(business.subscription_auto_renew_enabled || business.subscription_auto_renew_status === "AUTHORIZED") throw badRequest("El cliente debe desactivar el débito automático antes de cambiar sus condiciones comerciales.");
      const period=business.subscription_current_period_ends_at ? new Date(business.subscription_current_period_ends_at) : now;
      if(deal.terms.trial_days) {
        const end=new Date(Math.max(now.getTime(),period.getTime())+deal.terms.trial_days*86400000);
        terms.trial_ends_at=end.toISOString();
        terms.discount_starts_at=end.toISOString();
        terms.discount_ends_at=addMonths(end,deal.terms.discount_months);
      }
      const nextStatus=deal.terms.trial_days ? "ACTIVE" : business.subscription_status;
      const result=await client.query(`update businesses set plan_code=$2,plan_type='premium_monthly',subscription_status=$3,portal_status=$3,subscription_current_period_ends_at=$4,settings=coalesce(settings,'{}'::jsonb)||jsonb_build_object('qori_commercial',$5::jsonb),updated_at=now() where id=$1 returning *`,[business.id,terms.plan_code,nextStatus,terms.trial_ends_at||business.subscription_current_period_ends_at,JSON.stringify(terms)]);
      business=result.rows[0];
    }
    await client.query(`insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$3) on conflict(business_id) do nothing`,[business.id,deal.seller_id,user.id]);
    await assignInitialAgreementTickets(client,business.id,deal.terms.bonus_tickets,user.id,`Beneficio autorizado ${deal.id}`);
    await client.query("update qori_commercial_deals set status='APPLIED',business_id=$2,applied_at=now(),applied_by=$3,updated_at=now() where id=$1",[id,business.id,user.id]);
    await audit(client,user,"DEAL_APPLIED","deal",id,{business_id:business.id,terms:deal.terms});
    return {business_id:business.id,business_name:business.name,subscription:planFromBusiness(business),...(credentials?{credentials}:{})};
  });
}
async function updateCustomer(user,id,payload) {
  requirePermission(user,'customers.manage');
  const body=validate(z.object({ seller_id:uuid.nullable().optional(),is_active:z.boolean().optional(),revoke_benefits:z.boolean().optional(),reason:reasonSchema }).strict(),payload);
  return withTransaction(async client=>{
    // Match applyDeal lock order (deal -> business) to avoid deadlocks during reassignment.
    await client.query("select id from qori_commercial_deals where business_id=$1 and status in ('PENDING','APPROVED') order by id for update",[validate(uuid,id)]);
    const business=await locked(client,"businesses",id);
    const owner=(await client.query('select seller_id from qori_sales_accounts where business_id=$1',[id])).rows[0];
    requireOwner(user,owner?.seller_id);
    if(body.seller_id) await sellerExists(client,body.seller_id);
    if(body.seller_id!==undefined) {
      const previous=await client.query("select seller_id from qori_sales_accounts where business_id=$1",[id]);
      await client.query("insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$3) on conflict(business_id) do update set seller_id=$2,assigned_by=$3,updated_at=now()",[id,body.seller_id,user.id]);
      if((previous.rows[0]?.seller_id||null)!==body.seller_id) await client.query("update qori_commercial_deals set status='CANCELLED',decision_reason='Cartera reasignada',updated_at=now() where business_id=$1 and status in ('PENDING','APPROVED')",[id]);
    }
    if(body.is_active!==undefined) await client.query("update businesses set is_active=$2,updated_at=now() where id=$1",[id,body.is_active]);
    if(body.revoke_benefits && business.settings?.qori_commercial) {
      const terms={...business.settings.qori_commercial,status:"REVOKED",revoked_at:new Date().toISOString(),revoked_by:user.id};
      const unpaidTrial=Boolean(terms.trial_ends_at && business.subscription_current_period_ends_at && new Date(business.subscription_current_period_ends_at)<=new Date(terms.trial_ends_at));
      await client.query("update businesses set settings=jsonb_set(settings,'{qori_commercial}',$2::jsonb),subscription_status=case when $3 then 'PENDING_PAYMENT' else subscription_status end,updated_at=now() where id=$1",[id,JSON.stringify(terms),unpaidTrial]);
    }
    await audit(client,user,"CUSTOMER_UPDATED","business",id,body);
    return {ok:true};
  });
}
module.exports={bootstrap,createSeller,findExistingSeller,grantExistingSeller,updateSeller,updateAdminAccess,savePolicy,list,saveProspect,createDeal,decideDeal,cancelDeal,applyDeal,updateCustomer,buildTerms};
