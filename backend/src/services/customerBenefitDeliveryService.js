const crypto=require('crypto');
const {query,withTransaction}=require('../config/db');
const {owned}=require('./customerBenefitOwnership');
const {badRequest,notFound}=require('../utils/http');
const identity=require('./customerIdentityService');
// Only personal canonical benefits, never sales or unclaimed generic tickets.
const sources=`select m.id,m.business_id,'STAMP'::text kind,m.document_key,lower(trim(m.email)) email,p.name title,p.terms,m.created_by from stamp_members m join stamp_programs p on p.id=m.program_id
 union all select a.id,a.business_id,'AFFILIATION',regexp_replace(lower(a.document_id),'[^a-z0-9]','','g'),lower(trim(a.email)),'Afiliación y puntos','',a.created_by_user_id from affiliates a where a.status<>'DELETED'
 union all select rp.id,rp.company_id,'GIFT',regexp_replace(lower(rp.beneficiary_document),'[^a-z0-9]','','g'),lower(trim(rp.beneficiary_email)),'Giftcard',rp.terms,rp.user_id from reward_passes rp where not exists(select 1 from customer_gift_orders o where o.reward_pass_id=rp.id)
 union all select q.id,q.business_id,'TICKET',regexp_replace(lower(p.document_id),'[^a-z0-9]','','g'),lower(trim(p.email)),coalesce(q.metadata->>'reward_label','Ticket Qori'),'',null::uuid from qr_codes q join players p on p.id=q.player_id
 where not coalesce(q.claim_required,false) and (q.claimed_by_player_id is null or q.claimed_by_player_id=q.player_id)
 and (q.origin_type='INTERACTIVE_ACTIVATION' or (q.origin_type='POST_SALE' and coalesce(q.metadata->>'source','') not in ('STAMP_CARD','CUSTOMER_PRODUCT_GIFT') and not exists(select 1 from customer_product_gift_orders pg where pg.qr_code_id=q.id)))`;
async function source(kind,id,db={query}){return (await db.query(`select s.*,b.name business_name from (${sources}) s join businesses b on b.id=s.business_id where s.kind=$1 and s.id=$2`,[kind,id])).rows[0];}
async function owns(a,s,db={query}){
 if(s.kind==='STAMP'||s.kind==='AFFILIATION')return !!(await db.query(`select 1 from ${s.kind==='STAMP'?'stamp_members':'affiliates'} m where m.id=$2 and ${owned(s.kind,'m')}`,[a.id,s.id])).rowCount;
 if(s.kind==='GIFT')return !!(await db.query(require('./customerWalletService').receivedSql+' and rp.id=$3',[a.id,a.email,s.id])).rowCount;
 return !!(await db.query(require('./customerNetworkService').ticketSql+' and q.id=$2',[a.id,s.id])).rowCount;
}
async function available(a,s,db){
 if((await db.query('select 1 from businesses where id=$1 and is_seller_demo',[s.business_id])).rowCount)return false;
 if(a.document_review_required||!a.declared_document_key||s.document_key!==a.declared_document_key||s.email!==a.email)return false;
 const conflict=await db.query(`select 1 where exists(select 1 from customer_business_blocks where customer_id=$1 and business_id=$2)
 or exists(select 1 from customer_relationships where business_id=$2 and document_key=$3 and state='ACCEPTED' and customer_id<>$1)
 or exists(select 1 from customer_recovered_benefits where kind=$4 and resource_id=$5 and customer_id<>$1)
 or exists(select 1 from customer_invitations where kind=$4 and (result_id=$5 or (payload ? 'existing_benefit' and resource_id=$5)) and state in ('ACCEPTED','PENDING') and customer_id<>$1)
 or exists(select 1 from customer_activation_participations cp join interactive_activation_rewards ar on ar.participant_id=cp.participant_id where $4='TICKET' and ar.qr_code_id=$5 and cp.customer_id<>$1)`,[a.id,s.business_id,s.document_key,s.kind,s.id]);
 return !conflict.rowCount;
}
async function noticeInvitation(i,db={query}){
 if(i.state!=='PENDING')await db.query("update customer_benefit_notifications set read_at=coalesce(read_at,now()) where invitation_id=$1 and event_key=$2",[i.id,'invitation:'+i.id+':PENDING']);
 if(!['PENDING','ACCEPTED'].includes(i.state)||i.state==='PENDING'&&new Date(i.expires_at)<=new Date())return;
 const accepted=i.state==='ACCEPTED';
 await require('./customerBenefitNotificationService').insert(db,{customer_id:i.customer_id,business_id:i.business_id,
 event_key:accepted&&i.payload?.existing_benefit?'received:'+i.kind+':'+i.result_id:'invitation:'+i.id+':'+i.state,kind:i.kind,title:accepted?'Beneficio recibido':'Tienes una nueva invitación',
 body:i.title,resource_id:accepted?i.result_id:null,invitation_id:i.id});
}
async function offer(a,s,db){
 if(await owns(a,s,db))return;
 if(!await available(a,s,db))return;
 await db.query('select pg_advisory_xact_lock(hashtext($1))',[`relationship:${s.business_id}:${s.document_key}`]);
 if(!await available(a,s,db))return;
 const prior=(await db.query("select * from customer_invitations where customer_id=$1 and kind=$2 and resource_id=$3 and payload ? 'existing_benefit'",[a.id,s.kind,s.id])).rows[0];
 if(prior){await noticeInvitation(prior,db);return;}
 const known=(await db.query(`select 1 where exists(select 1 from customer_relationships where customer_id=$1 and business_id=$2 and document_key=$3 and state='ACCEPTED')
 or exists(select 1 from customer_recovered_benefits where customer_id=$1 and business_id=$2 and document_key=$3 and verified_email=$4)
 or exists(select 1 from customer_invitations where customer_id=$1 and business_id=$2 and state='ACCEPTED' and payload->>'document_key'=$3 and payload ? 'existing_benefit')`,[a.id,s.business_id,s.document_key,a.email])).rowCount>0;
 const state=known?'ACCEPTED':'PENDING';
 const i=(await db.query(`insert into customer_invitations(customer_id,business_id,created_by,request_id,kind,resource_id,title,terms,message,payload,state,result_id,decided_at)
 values($1,$2,$3,$4,$5,$6,$7,$8,'Este beneficio ya fue asignado a tu cédula y correo. Al aceptarlo lo agregas a Mis tarjetas sin crear otra tarjeta ni modificar tus finanzas.',$9::jsonb,$10,$11,case when $10='ACCEPTED' then now() end) returning *`,
 [a.id,s.business_id,s.created_by,crypto.randomUUID(),s.kind,s.id,s.title,s.terms||'',JSON.stringify({existing_benefit:true,document_key:s.document_key}),state,known?s.id:null])).rows[0];
 await noticeInvitation(i,db);
}
async function sync(account){
 if(!account.declared_document_key||account.document_review_required)return;
 await withTransaction(async db=>{
  const a=(await db.query('select * from customer_accounts where id=$1 for update',[account.id])).rows[0];if(!a)return;
  const rows=(await db.query(`select * from (${sources}) s where s.document_key=$1 and s.email=$2 order by business_id,kind,id`,[a.declared_document_key,a.email])).rows;
  for(const s of rows)await offer(a,s,db);
 });
}
async function accept(db,a,i,data){
 const s=await source(i.kind,i.resource_id,db);
 const master=await identity.lockDocument(a.id,data,db,{expected:i.payload.document_key});
 if(!s||!await available({...a,...master},s,db))throw badRequest('El negocio debe revisar la cédula y el correo de este beneficio antes de conectarlo.');
 await db.query('select pg_advisory_xact_lock(hashtext($1))',[`relationship:${s.business_id}:${s.document_key}`]);
 if(!await available({...a,...master},s,db))throw badRequest('Este beneficio ya tiene otra cuenta vinculada.');
 await db.query("update customer_invitations set state='ACCEPTED',decided_at=now(),result_id=resource_id where id=$1",[i.id]);
 await noticeInvitation({...i,state:'ACCEPTED',result_id:s.id},db);
 return {ok:true,result_id:s.id};
}
async function businessCatalog(user,publicId){
 const a=(await query('select * from customer_accounts where public_id=$1',[publicId])).rows[0];if(!a)throw notFound();
 if(!a.declared_document_key||a.document_review_required)return {benefits:[],needs_document:true};
 if((await query('select 1 from customer_business_blocks where customer_id=$1 and business_id=$2',[a.id,user.business_id])).rowCount)throw notFound();
 const rows=(await query(`select s.id,s.kind,s.title,i.state from (${sources}) s left join customer_invitations i on i.customer_id=$3 and i.kind=s.kind and i.resource_id=s.id and i.payload ? 'existing_benefit'
 where s.business_id=$1 and s.document_key=$2 order by s.kind,s.title,s.id`,[user.business_id,a.declared_document_key,a.id])).rows;
 return {benefits:rows,needs_document:false};
}
async function businessSend(user,data){
 return withTransaction(async db=>{
  const a=(await db.query('select * from customer_accounts where public_id=$1 for update',[data.public_id])).rows[0];if(!a)throw notFound();
  if(!a.declared_document_key||a.declared_document_key!==identity.normalize(data.document_id)||a.document_review_required)throw badRequest('El documento no coincide con la cédula maestra del comprador.');
  let s=await source(data.kind,data.resource_id,db);if(!s||s.business_id!==user.business_id||s.document_key!==a.declared_document_key)throw notFound('Beneficio no encontrado en tu negocio para esta persona.');
  if((await db.query('select 1 from customer_business_blocks where customer_id=$1 and business_id=$2',[a.id,user.business_id])).rowCount)throw badRequest('Este comprador no recibe beneficios de tu negocio.');
  if(s.email&&s.email!==a.email)throw badRequest('El beneficio tiene otro correo. Revisa el registro original y la identidad del destinatario antes de entregarlo.');
  if(!s.email){
   const columns={STAMP:['stamp_members','email'],AFFILIATION:['affiliates','email'],GIFT:['reward_passes','beneficiary_email']},c=columns[s.kind];
   if(!c)throw badRequest('Completa el correo del titular del ticket antes de entregarlo.');
   await db.query(`update ${c[0]} set ${c[1]}=$2 where id=$1 and (${c[1]} is null or trim(${c[1]})='')`,[s.id,a.email]);s=await source(data.kind,data.resource_id,db);
  }
  if(!await available(a,s,db))throw badRequest('Este beneficio no está disponible para esta cuenta.');
  await offer(a,s,db);
  const i=(await db.query("select id,state from customer_invitations where customer_id=$1 and kind=$2 and resource_id=$3 and payload ? 'existing_benefit'",[a.id,s.kind,s.id])).rows[0];
  const state=i?.state||(await owns(a,s,db)?'ACCEPTED':'PENDING');
  if(state==='ACCEPTED')await require('./customerBenefitNotificationService').insert(db,{customer_id:a.id,business_id:s.business_id,event_key:'received:'+s.kind+':'+s.id,kind:s.kind,title:'Beneficio recibido',body:s.title,resource_id:s.id});
  return {delivery:{id:i?.id||null,state,title:s.title},message:state==='ACCEPTED'?'Entregado en Mis tarjetas. El comprador tiene un aviso en Qori.':state==='PENDING'?'Enviado para aceptar en Qori Customer. El comprador tiene una notificación.':'El comprador rechazó o canceló esta entrega. No se reenviará automáticamente.'};
 });
}
module.exports={sources,source,owns,available,offer,sync,accept,noticeInvitation,businessCatalog,businessSend};
