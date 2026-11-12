const bcrypt=require('bcryptjs');
const {query,withTransaction}=require('../config/db');
const {validate}=require('../utils/validators');
const {badRequest}=require('../utils/http');
const {publicSignupBaseSchema,assertUniqueSignupIdentity,uniqueBusinessSlug,signupSettings,normalizeDocument}=require('./signupIdentityService');
const {ensureBaseBusinessRecords,assignInitialAgreementTickets}=require('./adminProvisioningService');
const {advisorById,assertNotSelfReferral}=require('./commercialAdvisorService');
async function signup(payload){
 const d=validate(publicSignupBaseSchema,payload);d.email=d.email.toLowerCase();
 if(d.sales_advisor_code)throw badRequest('Usa el enlace de tu Embajador Qori.');
 const program=require('./freeProgramPolicy').programs[d.free_program||'PENSE_EN_TI'];
 const password=await bcrypt.hash(d.password,12);
 return withTransaction(async db=>{
  await assertUniqueSignupIdentity(db,d);
  const document=normalizeDocument(d.nit);
  if((await db.query('select 1 from qori_free_enrollments where document_key=$1',[document])).rowCount)throw badRequest('Este documento ya tiene un programa gratuito. Entra a la cuenta existente para continuar.');
  const advisor=d.commercial_advisor_id?await advisorById(d.commercial_advisor_id,db):null;
  await assertNotSelfReferral(db,advisor,d);
  const prospectReferrals=require('./prospectReferralService');
  const signupProspect=await prospectReferrals.resolveSignupProspect(db,advisor,d);
  const name=d.company_name||d.contact_name,slug=await uniqueBusinessSlug(db,name);
  const settings={...signupSettings({...d,legal_version:'2026-11-07'},'free_program'),free_program:program.code,subscription:{plan_code:program.code,status:'ACTIVE'},access:{source:'free_program'}};
  const b=(await db.query("insert into businesses(name,slug,settings,plan_code,plan_type,portal_status,subscription_status,portal_activated_at,is_active) values($1,$2,$3::jsonb,$4,'premium_monthly','ACTIVE','ACTIVE',now(),true) returning id",[name,slug,JSON.stringify(settings),program.code])).rows[0];
  const u=(await db.query("insert into app_users(business_id,email,password_hash,full_name,role,is_active) values($1,$2,$3,$4,'BUSINESS_OWNER',true) returning id",[b.id,d.email,password,d.contact_name])).rows[0];
  await ensureBaseBusinessRecords(db,b.id,name);
  await require('./qrCreditService').ensureCreditAccount(db,b.id);
  if(program.tickets){
   await assignInitialAgreementTickets(db,b.id,program.tickets,u.id,program.name+': tickets iniciales de entrega única.');
   await db.query("update business_qr_credit_accounts set included_balance=$2,included_period_key='PENSE_EN_TI_WELCOME' where business_id=$1",[b.id,program.tickets]);
  }
  await db.query('insert into qori_free_enrollments(document_key,business_id) values($1,$2)',[document,b.id]);
  if(advisor){
   await db.query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$2)',[b.id,advisor.id]);
   await prospectReferrals.linkSignupProspect(db,advisor,d,b.id,signupProspect);
  }
  await db.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,'PENSE_EN_TI_ENROLLED','business',$2,$3::jsonb)",[u.id,b.id,JSON.stringify({seller_id:advisor?.id||null,free_program:program.code,initial_tickets:program.tickets,initial_giftcards:0})]);
  return {ok:true,business_id:b.id,email:d.email,portal_url:'/empresa/?view='+program.view,free_program:program.code,message:'Tu cuenta '+program.name+' está lista. '+program.summary};
 });
}
async function balances(user){
 const r=await query(`select b.plan_code,coalesce(c.qr_balance,0) tickets,coalesce(c.included_balance,0) included_tickets,
  g.balance giftcards,g.used giftcards_used,(select count(*)::int from business_inventory_products p where p.business_id=b.id and p.status<>'DELETED') products
  from businesses b left join business_qr_credit_accounts c on c.business_id=b.id left join qori_giftcard_credit_accounts g on g.business_id=b.id where b.id=$1`,[user.business_id]);
 return {balances:r.rows[0]};
}
module.exports={signup,balances};
