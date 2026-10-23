const bcrypt = require("bcryptjs");
const { syncCommercialBusiness } = require('./commercialContactSyncService');
const { z } = require("zod");
const { withTransaction } = require("../config/db");
const { validate } = require("../utils/validators");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { publicSignupBaseSchema, assertUniqueSignupIdentity, uniqueBusinessSlug, signupSettings, normalizeDocument, DESCUBRE_USED_MESSAGE } = require("./signupIdentityService");
const { requireCommercialUser, requireOwner } = require("./commercialAuthorization");
const { listPlans, planFromBusiness } = require("./subscriptionService");
const { ensureBaseBusinessRecords, assignInitialAgreementTickets } = require("./adminProvisioningService");

const { requirePermission } = require('./adminPermissions');
const enrollmentSchema = publicSignupBaseSchema.extend({
  request_id: z.string().uuid(),
  prospect_id: z.string().uuid().nullable().default(null),
}).strict();
function response(business, email, alreadyCreated = false) {
  return { business_id: business.id, business_name: business.name, email,
    plan: planFromBusiness(business), already_created: alreadyCreated,
    portal_url: "/empresa/?view=stamp-cards" };
}
async function enrollDescubre(user, payload) {
  requireCommercialUser(user);
  requirePermission(user,'enrollments.create');
  const body = validate(enrollmentSchema, payload);
  body.email = body.email.toLowerCase();
  if (body.sales_advisor_code || body.commercial_advisor_id) throw badRequest("El vendedor responsable se asigna desde tu cuenta autenticada.");
  const passwordHash = await bcrypt.hash(body.password, 12);
  const plan = listPlans().find(p => p.code === "DESCUBRE");
  return withTransaction(async client => {
    const seller = await client.query("select id from app_users where id=$1 and is_active and (role in ('QORI_SELLER','QORI_SUPERADMIN') or platform_role in ('QORI_SUPERADMIN','QORI_SELLER')) for share", [user.id]);
    if (!seller.rowCount) throw forbidden("Tu cuenta comercial no está habilitada.");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`descubre-request:${body.request_id}`]);
    const previous = await client.query("select * from businesses where settings->'qori_descubre'->>'request_id'=$1", [body.request_id]);
    if (previous.rowCount) {
      const business = previous.rows[0];
      const owner=(await client.query('select seller_id from qori_sales_accounts where business_id=$1',[business.id])).rows[0];
      requireOwner(user, owner?.seller_id);
      if (business.settings.contact_email !== body.email || business.settings.nit !== body.nit) throw badRequest("Esta inscripción ya fue utilizada con otros datos.");
      await syncCommercialBusiness(client, business.id, user.id);
      return response(business, body.email, true);
    }
    let prospect;
    if (body.prospect_id) {
      prospect = (await client.query("select * from qori_sales_prospects where id=$1 for update", [body.prospect_id])).rows[0];
      if (!prospect) throw notFound("Prospecto no encontrado.");
      requireOwner(user, prospect.seller_id);
      if (prospect.business_id || prospect.stage === "WON") throw badRequest("El prospecto ya fue inscrito. Gestiona su cuenta desde Clientes.");
    }
    await assertUniqueSignupIdentity(client, body, { descubre:true });
    const name = body.company_name || body.contact_name;
    const slug = await uniqueBusinessSlug(client, name);
    const start = new Date();
    const expires = new Date(start.getTime() + plan.trial_days * 86400000).toISOString();
    const sellerId = prospect?.seller_id || user.id;
    const settings = { ...signupSettings(body, "qori_descubre"),
      subscription: { plan_code: "DESCUBRE", status: "ACTIVE" },
      access: { source: "qori_descubre", plan_type: "premium_monthly", portal_status: "ACTIVE" },
      qori_descubre: { request_id: body.request_id, seller_id: sellerId, created_by: user.id, started_at: start.toISOString(), ends_at: expires },
    };
    settings.legal_acceptance.recorded_by = user.id;
    settings.legal_acceptance.source = "seller_assisted_enrollment";
    const business = (await client.query(`insert into businesses
      (name,slug,settings,plan_code,plan_type,portal_status,subscription_status,subscription_started_at,subscription_current_period_ends_at,portal_activated_at,is_active)
      values($1,$2,$3::jsonb,'DESCUBRE','premium_monthly','ACTIVE','ACTIVE',$4,$5,$4,true) returning *`,
    [name, slug, JSON.stringify(settings), start.toISOString(), expires])).rows[0];
    const claim = await client.query(`insert into qori_descubre_documents(document_key,business_id,granted_at)
      values($1,$2,$3) on conflict(document_key) do nothing returning document_key`, [normalizeDocument(body.nit),business.id,start.toISOString()]);
    if (!claim.rowCount) throw badRequest(DESCUBRE_USED_MESSAGE);
    await client.query("insert into app_users(business_id,email,password_hash,full_name,role,is_active) values($1,$2,$3,$4,'BUSINESS_OWNER',true)", [business.id, body.email, passwordHash, body.contact_name]);
    const base = await ensureBaseBusinessRecords(client, business.id, name);
    await client.query("update branches set address=$2 where id=$1 and business_id=$3", [base.branch.id, body.address || null, business.id]);
    await assignInitialAgreementTickets(client, business.id, plan.limits.welcome_courtesy_tickets, user.id, "25 tickets iniciales de la muestra Descubre. Entrega única.");
    await client.query("insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$3)", [business.id, sellerId, user.id]);
    if (prospect) {
      await client.query("update qori_sales_prospects set business_id=$2,business_name=$3,contact_name=$4,email=$5,phone=$6,stage='WON',updated_at=now() where id=$1", [prospect.id,business.id,name,body.contact_name,body.email,body.phone]);
    } else {
      await client.query("insert into qori_sales_prospects(seller_id,business_id,business_name,contact_name,email,phone,stage) values($1,$2,$3,$4,$5,$6,'WON')", [sellerId,business.id,name,body.contact_name,body.email,body.phone]);
    }
    await client.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,'DESCUBRE_ENROLLED','business',$2,$3::jsonb)", [user.id,business.id,JSON.stringify({name,plan_code:"DESCUBRE",seller_id:sellerId,trial_days:plan.trial_days,ends_at:expires,initial_tickets:25})]);
    await syncCommercialBusiness(client, business.id, user.id);
    return response(business, body.email);
  });
}
module.exports = { enrollDescubre, enrollmentSchema };
