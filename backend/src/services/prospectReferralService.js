const { createHmac } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { query, withTransaction } = require('../config/db');
const { env } = require('../config/env');
const { validate } = require('../utils/validators');
const { badRequest, notFound } = require('../utils/http');
const { requireOwner, requireSuperadmin } = require('./commercialAuthorization');
const { advisorById } = require('./commercialAdvisorService');
const uuid = z.string().uuid();
const audience = 'qori-prospect-signup';
// A referral must never be usable as a login token, even with a valid signature.
const signingKey = () => createHmac('sha256', env.jwtSecret).update(audience).digest('hex');
const contactKey = email => createHmac('sha256', signingKey()).update(String(email).trim().toLowerCase()).digest('hex');
const eligible = p => p && !p.business_id && !p.closed_at && ['NEW','CONTACTED','NEGOTIATING'].includes(p.stage);
async function audit(db, actorId, action, id, detail) {
  await db.query('insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,$2,\'prospect\',$3,$4::jsonb)', [actorId,action,id,JSON.stringify(detail)]);
}
async function referral(user, id) {
  validate(uuid,id);
  const p = (await query('select * from qori_sales_prospects where id=$1',[id])).rows[0];
  if (!p) throw notFound('Prospecto no encontrado.');
  requireOwner(user,p.seller_id);
  if (!eligible(p)) throw badRequest('Este contacto ya fue inscrito o su seguimiento está cerrado.');
  await advisorById(p.seller_id);
  const token = jwt.sign({prospect_id:p.id,seller_id:p.seller_id,contact_key:contactKey(p.email)},signingKey(),{algorithm:'HS256',audience,expiresIn:'30d'});
  const base = env.publicAppUrl.replace(/\/$/,'');
  return {plan_referral_url:base+'/paquetes/?'+new URLSearchParams({advisor:p.seller_id,prospect_ref:token}),
    referral_url:base+'/pense-en-ti/?'+new URLSearchParams({seller:p.seller_id,prospect_ref:token}),email:p.email,expires_in_days:30};
}
// Run before provisioning, in the same transaction. A shared/expired/reassigned
// prospect link fails explicitly instead of silently becoming a generic signup.
async function resolveSignupProspect(db, advisor, body) {
  if (!body.commercial_prospect_token) return null;
  let claims;
  try { claims = jwt.verify(body.commercial_prospect_token,signingKey(),{algorithms:['HS256'],audience}); }
  catch { throw badRequest('El enlace de este contacto venció o no es válido. Pide uno nuevo a tu embajador.'); }
  if (!advisor || claims.seller_id !== advisor.id || !uuid.safeParse(claims.prospect_id).success) throw badRequest('El enlace no corresponde a este embajador. Solicita un enlace nuevo.');
  const p = (await db.query('select * from qori_sales_prospects where id=$1 for update',[claims.prospect_id])).rows[0];
  if (!eligible(p) || p.seller_id !== advisor.id) throw badRequest('Este contacto ya está inscrito, cambió de responsable o está cerrado. Consulta a tu embajador.');
  if (claims.contact_key !== contactKey(p.email) || claims.contact_key !== contactKey(body.email)) throw badRequest('Usa el correo registrado en tu contacto de CRM. Si cambió, pide al embajador actualizarlo y generar otro enlace.');
  return p;
}
async function linkSignupProspect(db, advisor, body, businessId, prospect) {
  if (!advisor) return null;
  let linked;
  if (prospect) linked = (await db.query("update qori_sales_prospects set business_id=$2,stage='WON',updated_at=now() where id=$1 returning *",[prospect.id,businessId])).rows[0];
  else linked = (await db.query("insert into qori_sales_prospects(seller_id,business_id,business_name,contact_name,email,phone,stage) values($1,$2,$3,$4,$5,$6,'WON') returning *",[advisor.id,businessId,body.company_name||body.contact_name,body.contact_name,body.email,body.phone])).rows[0];
  await audit(db,null,prospect?'SIGNUP_PROSPECT_LINKED':'SIGNUP_PROSPECT_CREATED',linked.id,{seller_id:advisor.id,business_id:businessId,source:prospect?'prospect_link':'personal_link',previous_stage:prospect?.stage||null});
  const business = (await db.query('select * from businesses where id=$1',[businessId])).rows[0];
  await require('./commercialContactSyncService').syncCommercialContact(db,{prospect:linked,business,sellerId:advisor.id});
  return linked;
}
// Historical repairs are explicit, reviewed by Admin and never change account
// ownership, order attribution, payment evidence or a validated closure.
async function linkableBusinesses(user,id,params) {
  requireSuperadmin(user);validate(uuid,id);
  const {search} = validate(z.object({search:z.string().trim().max(180).default('')}).strict(),params);
  const p = (await query('select * from qori_sales_prospects where id=$1',[id])).rows[0];
  if (!p) throw notFound('Prospecto no encontrado.');
  if (!eligible(p)) throw badRequest('Solo se puede vincular un prospecto abierto sin negocio.');
  const rows = (await query(`select b.id,b.name,b.settings->>'contact_email' contact_email,b.plan_code,
    (select jsonb_agg(jsonb_build_object('id',p2.id,'name',p2.business_name,'closed_at',p2.closed_at)) from qori_sales_prospects p2 where p2.business_id=b.id) linked_prospects
    from qori_sales_accounts a join businesses b on b.id=a.business_id
    where a.seller_id=$1 and (b.name ilike $2 or b.settings->>'contact_email' ilike $2 or b.id::text=$3)
    order by b.name,b.id limit 31`,[p.seller_id,'%'+search+'%',search])).rows;
  return {rows:rows.slice(0,30),has_more:rows.length>30};
}
async function repairLink(user,id,payload) {
  requireSuperadmin(user);validate(uuid,id);
  const d = validate(z.object({business_id:uuid,expected_linked_prospect_id:uuid.nullable(),reason:z.string().trim().min(15).max(2000)}).strict(),payload);
  return withTransaction(async db=>{
    const account = (await db.query('select * from qori_sales_accounts where business_id=$1 for update',[d.business_id])).rows[0];
    const p = (await db.query('select * from qori_sales_prospects where id=$1 for update',[id])).rows[0];
    if (!p) throw notFound('Prospecto no encontrado.');
    if (!account || account.seller_id !== p.seller_id) throw badRequest('El negocio debe pertenecer al mismo embajador. Revisa la asignación en Supervisión.');
    if (p.business_id === d.business_id && p.stage === 'WON') return {ok:true,already_linked:true};
    if (!eligible(p)) throw badRequest('El prospecto cambió o ya está inscrito. Actualiza la lista.');
    const existing = (await db.query('select * from qori_sales_prospects where business_id=$1 order by id for update',[d.business_id])).rows;
    if (existing.length > 1 || (existing[0]?.id||null) !== d.expected_linked_prospect_id) throw badRequest('El vínculo cambió. Actualiza y revisa el negocio de nuevo.');
    const previous = existing[0];
    if (previous) {
      const automatic = await db.query("select 1 from qori_commercial_audit where entity_id=$1 and action='SIGNUP_PROSPECT_CREATED' limit 1",[previous.id]);
      const deals = await db.query('select 1 from qori_commercial_deals where prospect_id=$1 limit 1',[previous.id]);
      if (previous.closed_at || previous.seller_id !== p.seller_id || !automatic.rowCount || deals.rowCount) throw badRequest('El negocio ya tiene un prospecto con gestión propia. No se puede sustituir este vínculo.');
      await db.query("update qori_sales_prospects set business_id=null,stage='LOST',updated_at=now() where id=$1",[previous.id]);
      await audit(db,user.id,'SIGNUP_PROSPECT_RECONCILED',previous.id,{business_id:d.business_id,replacement_prospect_id:p.id,reason:d.reason});
    }
    const linked = (await db.query("update qori_sales_prospects set business_id=$2,stage='WON',updated_at=now() where id=$1 returning *",[id,d.business_id])).rows[0];
    await audit(db,user.id,'PROSPECT_BUSINESS_LINKED',p.id,{seller_id:p.seller_id,business_id:d.business_id,previous_prospect_id:previous?.id||null,previous_stage:p.stage,reason:d.reason});
    const business = (await db.query('select * from businesses where id=$1',[d.business_id])).rows[0];
    await require('./commercialContactSyncService').syncCommercialContact(db,{prospect:linked,business,sellerId:p.seller_id,actorId:user.id});
    return {ok:true,prospect:linked};
  });
}
module.exports = {referral,resolveSignupProspect,linkSignupProspect,linkableBusinesses,repairLink};
