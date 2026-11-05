const crypto=require('crypto'),{query,withTransaction}=require('../config/db'),{env}=require('../config/env');
const {badRequest,tooManyRequests}=require('../utils/http');
const normalize=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const codeHash=(id,code)=>crypto.createHmac('sha256',env.jwtSecret).update('customer-benefit-recovery:'+id+':'+code).digest('hex');
const sources=`select business_id,id resource_id,'STAMP'::text kind,lower(trim(email)) email from stamp_members where document_key=$1
 union all select business_id,id,'AFFILIATION',lower(trim(email)) from affiliates where regexp_replace(lower(document_id),'[^a-z0-9]','','g')=$1 and status<>'DELETED'
 union all select company_id,id,'GIFT',lower(trim(beneficiary_email)) from reward_passes rp where regexp_replace(lower(beneficiary_document),'[^a-z0-9]','','g')=$1 and not exists(select 1 from customer_gift_orders o where o.reward_pass_id=rp.id)
 union all select q.business_id,q.id,'TICKET',lower(trim(p.email)) from qr_codes q join players p on p.id=q.player_id where regexp_replace(lower(p.document_id),'[^a-z0-9]','','g')=$1 and not coalesce(q.claim_required,false) and (q.claimed_by_player_id is null or q.claimed_by_player_id=q.player_id)
 and (q.origin_type='INTERACTIVE_ACTIVATION' or (q.origin_type='POST_SALE' and coalesce(q.metadata->>'source','') not in ('STAMP_CARD','CUSTOMER_PRODUCT_GIFT') and not exists(select 1 from customer_product_gift_orders pg where pg.qr_code_id=q.id)))`;
// Email possession verifies each original benefit. It never verifies a global
// document identity or grants access to another benefit or purchase history.
async function candidates(a,document,email,db={query}){return (await db.query(`with records as (${sources}) select b.id,b.name,r.resource_id,r.kind from records r join businesses b on b.id=r.business_id where r.email=$2
 and not exists(select 1 from customer_business_blocks bl where bl.business_id=b.id and bl.customer_id=$3)
 order by b.id,r.kind,r.resource_id`,[document,email,a.id])).rows;}
async function connect(a,document,email,method,db,allowed){
 const rows=await candidates(a,document,email,db),connected=new Map();let recovered_count=0;
 for(const b of rows){if(allowed&&!allowed.includes(b.resource_id))continue;await db.query('select pg_advisory_xact_lock(hashtext($1))',[`relationship:${b.id}:${document}`]);
  if((await db.query("select 1 from customer_relationships where business_id=$1 and document_key=$2 and state='ACCEPTED' and customer_id<>$3",[b.id,document,a.id])).rowCount)continue;
  if((await db.query('select 1 from customer_business_blocks where business_id=$1 and customer_id=$2',[b.id,a.id])).rowCount)continue;
  if((await db.query("select 1 from customer_invitations where business_id=$1 and kind=$2 and result_id=$3 and state='ACCEPTED' and customer_id<>$4",[b.id,b.kind,b.resource_id,a.id])).rowCount)continue;
  if(b.kind==='TICKET'&&(await db.query('select 1 from customer_activation_participations cp join interactive_activation_rewards ar on ar.participant_id=cp.participant_id where ar.qr_code_id=$1 and cp.customer_id<>$2',[b.resource_id,a.id])).rowCount)continue;
  const r=await db.query(`insert into customer_recovered_benefits(customer_id,business_id,kind,resource_id,document_key,proof_method,verified_email) values($1,$2,$3,$4,$5,$6,$7)
    on conflict(kind,resource_id) do update set resource_id=excluded.resource_id where customer_recovered_benefits.customer_id=excluded.customer_id returning id`,[a.id,b.id,b.kind,b.resource_id,document,method,email]);
  if(r.rowCount){recovered_count++;connected.set(b.id,{business_id:b.id,business_name:b.name});}
 }
 await db.query('update customer_accounts set declared_document_key=$2 where id=$1',[a.id,document]);
 return {connected:[...connected.values()],recovered_count,document_suffix:document.slice(-4),verification:method,message:recovered_count?'Tus beneficios anteriores ya están conectados.':'No pudimos recuperar beneficios automáticamente con estos datos. Puedes verificar el correo registrado en el negocio o pedirle que confirme tu conexión.'};
}
async function recover(a,d){const document=normalize(d.document_id);if(document.length<3)throw badRequest('Escribe una cédula válida.');return withTransaction(async db=>{
 await db.query('select id from customer_accounts where id=$1 for update',[a.id]);
 const old=(await db.query('select result from customer_benefit_recovery_runs where customer_id=$1 and request_id=$2',[a.id,d.request_id])).rows[0];if(old)return old.result;
 const n=(await db.query("select count(*)::int n from customer_benefit_recovery_runs where customer_id=$1 and created_at>now()-interval '15 minutes'",[a.id])).rows[0].n;if(n>=10)throw tooManyRequests('Espera unos minutos antes de volver a buscar.');
 const result=await connect(a,document,a.email,'ACCOUNT_EMAIL',db);
 await db.query("insert into customer_benefit_recovery_runs(customer_id,request_id,document_key,proof_method,result) values($1,$2,$3,'ACCOUNT_EMAIL',$4::jsonb)",[a.id,d.request_id,document,JSON.stringify(result)]);return result;
});}
async function requestCode(a,d){const document=normalize(d.document_id),email=d.email.trim().toLowerCase();if(document.length<3)throw badRequest('Escribe una cédula válida.');const id=crypto.randomUUID(),code=String(crypto.randomInt(0,1000000)).padStart(6,'0');
 const rows=await withTransaction(async db=>{await db.query('select id from customer_accounts where id=$1 for update',[a.id]);await db.query('select pg_advisory_xact_lock(hashtext($1))',['benefit-recovery-email:'+email]);
 const n=(await db.query("select count(*)::int n from customer_benefit_recovery_challenges where (customer_id=$1 or email=$2) and created_at>now()-interval '15 minutes'",[a.id,email])).rows[0].n;if(n>=5)throw tooManyRequests('Espera unos minutos antes de solicitar otro código.');
 const found=await candidates(a,document,email,db);await db.query('update customer_benefit_recovery_challenges set consumed_at=now() where customer_id=$1 and consumed_at is null',[a.id]);
 await db.query("insert into customer_benefit_recovery_challenges(id,customer_id,document_key,email,code_hash,resource_ids,expires_at) values($1,$2,$3,$4,$5,$6,now()+interval '10 minutes')",[id,a.id,document,email,codeHash(id,code),found.map(b=>b.resource_id)]);return found;});
 if(rows.length)try{await require('./customerAuthService').deliverBenefitCode(email,code,id);}catch{await query('update customer_benefit_recovery_challenges set consumed_at=now() where id=$1',[id]);}
 return {challenge_id:id,message:'Si la cédula y el correo coinciden con registros verificables del negocio, enviamos un código. Revisa también el correo no deseado. Si no llega, pide al negocio que confirme tu conexión.'};
}
async function verifyCode(a,d){const result=await withTransaction(async db=>{
 await db.query('select id from customer_accounts where id=$1 for update',[a.id]);const c=(await db.query('select * from customer_benefit_recovery_challenges where id=$1 and customer_id=$2 for update',[d.challenge_id,a.id])).rows[0];
 if(!c||new Date(c.expires_at)<=new Date())return {invalid:true};
 const expected=Buffer.from(c.code_hash,'hex'),actual=Buffer.from(codeHash(c.id,d.code),'hex');
 if(c.consumed_at)return !crypto.timingSafeEqual(expected,actual)||!c.result?{invalid:true}:c.result;
 if(c.attempts>=5)return {invalid:true};
 await db.query('update customer_benefit_recovery_challenges set attempts=attempts+1 where id=$1',[c.id]);
 if(!crypto.timingSafeEqual(expected,actual)||!c.resource_ids.length)return {invalid:true};
 const output=await connect(a,c.document_key,c.email,'HISTORICAL_EMAIL',db,c.resource_ids);
 await db.query('update customer_benefit_recovery_challenges set consumed_at=now(),result=$2::jsonb where id=$1',[c.id,JSON.stringify(output)]);
 await db.query("insert into customer_benefit_recovery_runs(customer_id,request_id,document_key,proof_method,result) values($1,$2,$3,'HISTORICAL_EMAIL',$4::jsonb)",[a.id,c.id,c.document_key,JSON.stringify(output)]);return output;
 });if(result.invalid)throw badRequest('El código no es válido, venció o ya no está disponible. Solicita uno nuevo.');return result;}
async function status(a){return {document_id:(await query('select declared_document_key from customer_accounts where id=$1',[a.id])).rows[0]?.declared_document_key||'',email:a.email};}
module.exports={recover,requestCode,verifyCode,status,candidates};
