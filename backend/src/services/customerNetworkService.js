const {recovered}=require('./customerBenefitOwnership');
const identity=require('./customerIdentityService');
const {query,withTransaction}=require('../config/db');
const {badRequest,notFound,forbidden,tooManyRequests}=require('../utils/http');
const {env}=require('../config/env');
const {assertStandaloneBusinessFeature,getBusinessSubscription}=require('./subscriptionService');
const svc=require('./customerService');
const stamps=require('./stampCardService');
const affiliates=require('./affiliateService');
const gifts=require('./rewardPassService');
const QRCode=require('qrcode');

async function buyerByPublicId(id,db={query}){
  const row=(await db.query('select id,public_id,full_name,email from customer_accounts where public_id=$1',[id])).rows[0];
  if(!row)throw notFound('Cuenta Qori no encontrada.');return row;
}
async function lookup(user,term){
  const value=term.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&! /^[a-f0-9-]{36}$/.test(value))throw badRequest('Escribe el correo completo o la identificación Qori.');
  const buyer=(await query(`select a.public_id,a.full_name,
    (select r.state from customer_relationships r where r.customer_id=a.id and r.business_id=$2 order by (r.state='ACCEPTED') desc,r.created_at desc limit 1) relationship_state
    from customer_accounts a where (a.email=$1 or a.public_id::text=$1)
    and not exists(select 1 from customer_business_blocks bl where bl.customer_id=a.id and bl.business_id=$2)`,[value,user.business_id])).rows[0];
  if(!buyer)throw notFound('No encontramos una cuenta disponible con esa identificación.');
  return {buyer};
}
const ticketOwnership=`(lower(trim(p.email))=$2 or exists(select 1 from customer_relationships r where r.customer_id=$3 and r.business_id=q.business_id
  and r.state='ACCEPTED' and r.document_key=regexp_replace(lower(p.document_id),'[^a-z0-9]','','g')))`;
// Only already-personal tickets can be associated; claim, stamp and paid-gift flows keep their own rules.
const assignableTicket=`(q.origin_type='INTERACTIVE_ACTIVATION' or (q.origin_type='POST_SALE'
 and not coalesce(q.claim_required,false) and (q.claimed_by_player_id is null or q.claimed_by_player_id=q.player_id)
 and coalesce(q.metadata->>'source','') not in ('STAMP_CARD','CUSTOMER_PRODUCT_GIFT')
 and not exists(select 1 from customer_product_gift_orders pg where pg.qr_code_id=q.id)))`;
async function catalog(user,publicId){
  const buyer=await buyerByPublicId(publicId);
  const [programs,activities,tickets]=await Promise.all([
    query("select id,name,terms from stamp_programs where business_id=$1 and status='ACTIVE' and deleted_at is null order by name",[user.business_id]),
    query("select id,title,description,terms from interactive_activations where company_id=$1 and status='active' and (ends_at is null or ends_at>now()) order by title",[user.business_id]),
    query(`select q.id,coalesce(q.metadata->>'reward_label',rw.name,'Ticket Qori') title,q.expires_at from qr_codes q
      join players p on p.id=q.player_id left join rewards rw on rw.id=q.reward_id
      where q.business_id=$1 and ${assignableTicket} and q.status='ACTIVE' and (q.expires_at is null or q.expires_at>now()) and ${ticketOwnership}
      and not exists(select 1 from customer_invitations i where i.kind='TICKET' and i.resource_id=q.id and i.state in ('PENDING','ACCEPTED')) order by q.created_at desc limit 100`,[user.business_id,buyer.email,buyer.id])
  ]);
  return {programs:programs.rows,activities:activities.rows,tickets:tickets.rows};
}
async function validateResource(user,buyer,data,db){
  if(data.kind==='STAMP'){
    const row=(await db.query("select name title,terms from stamp_programs where id=$1 and business_id=$2 and status='ACTIVE' and deleted_at is null",[data.resource_id,user.business_id])).rows[0];
    if(!row)throw badRequest('Selecciona un programa activo de este negocio.');return row;
  }
  if(data.kind==='ACTIVITY'){
    const row=(await db.query("select title,terms,public_slug from interactive_activations where id=$1 and company_id=$2 and status='active' and (ends_at is null or ends_at>now())",[data.resource_id,user.business_id])).rows[0];
    if(!row)throw badRequest('La actividad no está disponible.');return row;
  }
  if(data.kind==='TICKET'){
    const row=(await db.query(`select coalesce(q.metadata->>'reward_label',rw.name,'Ticket Qori') title from qr_codes q join players p on p.id=q.player_id
      left join rewards rw on rw.id=q.reward_id where q.business_id=$1 and ${ticketOwnership} and q.id=$4
      and ${assignableTicket} and q.status='ACTIVE' and (q.expires_at is null or q.expires_at>now()) for update of q`,[user.business_id,buyer.email,buyer.id,data.resource_id])).rows[0];
    if(!row)throw badRequest('El ticket debe pertenecer a este negocio y estar asignado a este comprador.');return {...row,terms:data.terms};
  }
  if(data.kind==='GIFT')return {title:'Giftcard de regalo',terms:data.terms};
  const config=(await db.query('select points_terms from customer_business_programs where business_id=$1',[user.business_id])).rows[0];
  return {title:'Afiliación Qori',terms:config?.points_terms||data.terms};
}
async function send(user,data,{client}={}){
  const transaction=client?fn=>fn(client):withTransaction;
  return transaction(async db=>{
    await db.query('select pg_advisory_xact_lock(hashtext($1))',[`customer-send:${user.business_id}:${data.public_id}`]);
    const buyer=await buyerByPublicId(data.public_id,db);
    const prior=(await db.query('select id,customer_id,kind,state from customer_invitations where business_id=$1 and request_id=$2',[user.business_id,data.request_id])).rows[0];
    if(prior){if(prior.customer_id!==buyer.id||prior.kind!==data.kind)throw badRequest('La solicitud ya se utilizó para otra entrega.');return {invitation:prior,existing:true};}
    if((await db.query('select 1 from customer_business_blocks where customer_id=$1 and business_id=$2',[buyer.id,user.business_id])).rowCount)throw forbidden('Este comprador no recibe invitaciones de este negocio.');
    const recent=(await db.query("select count(*)::int n from customer_invitations where business_id=$1 and customer_id=$2 and created_at>now()-interval '1 day'",[user.business_id,buyer.id])).rows[0].n;
    if(recent>=10)throw tooManyRequests('Ya enviaste diez invitaciones a este comprador hoy.');
    const resource=await validateResource(user,buyer,data,db);
    if(data.kind==='TICKET'&&(await db.query("select 1 from customer_invitations where kind='TICKET' and resource_id=$1 and state in ('PENDING','ACCEPTED')",[data.resource_id])).rowCount)throw badRequest('Este ticket ya tiene un envío pendiente o aceptado.');
    let relationshipId=null;
    if(['STAMP','AFFILIATION'].includes(data.kind)){
      if(!data.document_id||!data.identity_checked)throw badRequest('Verifica el documento para asignar la tarjeta a la persona correcta.');
      const r=await svc.proposeRelationship(user,{public_id:buyer.public_id,document_id:data.document_id},{client:db});relationshipId=r.relationship.id;
      await db.query("update customer_relationships set expires_at=now()+interval '30 days' where id=$1 and state='PENDING'",[relationshipId]);
    }
    const row=(await db.query(`insert into customer_invitations(business_id,customer_id,created_by,request_id,kind,resource_id,relationship_id,title,message,terms,payload)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) returning id,kind,title,state,created_at`,
      [user.business_id,buyer.id,user.id,data.request_id,data.kind,data.resource_id||null,relationshipId,resource.title,data.message,resource.terms||'',JSON.stringify(data.kind==='GIFT'?{amount:data.amount}:{})])).rows[0];
    return {invitation:row,existing:false};
  });
}
const inboxSql=`select i.id,i.business_id,b.name business_name,i.kind,i.title,i.message,i.terms,i.state,i.result_id,i.created_at,i.expires_at,
  case when i.kind in ('GIFT','SALE') then i.payload->>'amount' end amount,i.payload->>'currency' currency,(i.payload ? 'product_gift_order_id') purchased_product,right(r.document_key,4) document_suffix,r.state relationship_state,
  (i.expires_at<=now()) expired,a.public_slug,a.status activity_status,a.ends_at activity_ends_at
  from customer_invitations i join businesses b on b.id=i.business_id left join customer_relationships r on r.id=i.relationship_id
  left join interactive_activations a on i.kind='ACTIVITY' and a.id=i.resource_id and a.company_id=i.business_id`;
async function inbox(account){
  const rows=(await query(inboxSql+' where i.customer_id=$1 order by i.created_at desc limit 200',[account.id])).rows;
  return {invitations:rows.map(({public_slug,...row})=>({...row,
    activity_url:row.state==='ACCEPTED'&&row.activity_status==='active'&&(!row.activity_ends_at||new Date(row.activity_ends_at)>new Date())?new URL('/activacion/'+encodeURIComponent(public_slug)+'?customer_invitation='+row.id,env.publicAppUrl).toString():null})),
    blocked:(await query('select bl.business_id,b.name from customer_business_blocks bl join businesses b on b.id=bl.business_id where bl.customer_id=$1',[account.id])).rows};
}
async function decide(account,id,data){
  return withTransaction(async db=>{
    await db.query('select id from customer_accounts where id=$1 for update',[account.id]);
    const row=(await db.query('select * from customer_invitations where id=$1 and customer_id=$2 for update',[id,account.id])).rows[0];
    if(!row)throw notFound('Invitación no encontrada.');
    if(row.state==='ACCEPTED'&&data.action==='ACCEPT')return {ok:true,result_id:row.result_id,existing:true};
    if(row.state!=='PENDING'||new Date(row.expires_at)<=new Date())throw badRequest('La invitación ya no está pendiente o venció.');
    if(data.action==='REJECT'){await db.query("update customer_invitations set state='REJECTED',decided_at=now() where id=$1",[id]);return {ok:true};}
    if(!account.full_name||account.full_name.trim().length<2)throw badRequest('Completa tu nombre en Mi cuenta antes de aceptar.');
    if(row.kind==='SALE')return require('./customerFinanceDeliveryService').accept(db,account,row,data);
    if(row.kind==='TICKET'&&row.payload?.product_gift_order_id){
      await require('./customerProductGiftService').validateGiftTicket(db,account,row);
      await db.query("update customer_invitations set state='ACCEPTED',decided_at=now(),result_id=resource_id where id=$1",[id]);
      return {ok:true,result_id:row.resource_id};
    }
    const user=(await db.query("select u.* from app_users u join businesses b on b.id=u.business_id where u.id=$1 and u.business_id=$2 and b.is_active and u.is_active",[row.created_by,row.business_id])).rows[0];
    if(!user||!['BUSINESS_OWNER','BUSINESS_MANAGER'].includes(user.role))throw forbidden('El negocio debe renovar esta invitación.');
    const subscription=await getBusinessSubscription(user.business_id);
    if(!subscription.plan.portal_access_allowed)throw forbidden('El negocio debe habilitar su cuenta para completar esta invitación.');
    const buyer={...account};let resultId=row.resource_id;
    await validateResource(user,buyer,{...row,...row.payload},db);
    if(['STAMP','AFFILIATION'].includes(row.kind)){
      if(row.kind==='AFFILIATION')await assertStandaloneBusinessFeature(user,user.business_id,'affiliates');
      const relation=(await db.query('select * from customer_relationships where id=$1 and customer_id=$2 and business_id=$3 for update',[row.relationship_id,account.id,row.business_id])).rows[0];
      if(!relation||['REVOKED','REJECTED'].includes(relation.state))throw badRequest('Solicita al negocio una nueva conexión.');
      if(relation.state==='PENDING')await svc.decideRelationship(account.id,relation.id,{...data,action:'ACCEPT',include_history:data.include_history},{client:db});
      else await identity.lockDocument(account.id,data,db,{expected:relation.document_key});
      if(row.kind==='STAMP')resultId=(await stamps.enroll(user.business_id,user.id,{program_id:row.resource_id,name:account.full_name,document_id:relation.document_key,email:account.email,consent:true},{client:db})).member.id;
      else{
        await db.query('select pg_advisory_xact_lock(hashtext($1))',[`customer-affiliate:${user.business_id}:${relation.document_key}`]);
        const existing=(await db.query("select id from affiliates where business_id=$1 and regexp_replace(lower(document_id),'[^a-z0-9]','','g')=$2 and status<>'DELETED'",[user.business_id,relation.document_key])).rows[0];
        resultId=existing?.id||(await affiliates.createAffiliate(user.business_id,user,{full_name:account.full_name,document_id:relation.document_key,email:account.email},{client:db})).id;
      }
    }else if(row.kind==='GIFT'){
      await identity.lockDocument(account.id,data,db);
      if(!data.document_id||data.document_id.trim().length<3)throw badRequest('Escribe el documento que presentarás al usar tu giftcard.');
      await assertStandaloneBusinessFeature(user,user.business_id,'gift_cards');
      resultId=(await gifts.createRewardPass(user,{buyer_name:'Regalo del negocio',beneficiary_name:account.full_name,beneficiary_document:data.document_id,
        beneficiary_email:account.email,initial_value_cop:Number(row.payload.amount),partial_redemption_allowed:true,transferable:false,
        branch_authorization_scope:'ALL_BRANCHES',terms:row.terms,internal_notes:`Invitación Customer ${row.id}. Obsequio, sin venta ni pago del comprador.`,idempotency_key:`customer-invitation:${row.id}`},{client:db})).id;
    }
    await db.query("update customer_invitations set state='ACCEPTED',decided_at=now(),result_id=$2 where id=$1",[id,resultId]);
    return {ok:true,result_id:resultId};
  });
}
async function block(account,businessId,blocked){
  return withTransaction(async db=>{
    if(blocked){
      await db.query('insert into customer_business_blocks(customer_id,business_id) values($1,$2) on conflict do nothing',[account.id,businessId]);
      await db.query("update customer_invitations set state='REJECTED',decided_at=now() where customer_id=$1 and business_id=$2 and state='PENDING'",[account.id,businessId]);
    }else await db.query('delete from customer_business_blocks where customer_id=$1 and business_id=$2',[account.id,businessId]);
    return {ok:true};
  });
}
const ticketSql=`select q.id,q.business_id,b.name business_name,q.token,
  case when q.metadata->>'source'='CUSTOMER_PRODUCT_GIFT' and not exists(select 1 from business_sales paid where paid.id=q.sale_id and paid.sale_status='PAID') then 'CANCELLED' else q.status end status,q.expires_at,
  q.metadata->>'customer_gift_sender' sender_name,q.metadata->>'customer_gift_message' gift_message,
  coalesce(q.metadata->>'reward_label',rw.name,'Ticket Qori') title from qr_codes q join businesses b on b.id=q.business_id
  left join rewards rw on rw.id=q.reward_id left join players p on p.id=q.player_id
  where (${recovered('TICKET','q')} or exists(select 1 from customer_activation_participations cp join interactive_activation_rewards ar on ar.participant_id=cp.participant_id where cp.customer_id=$1 and ar.qr_code_id=q.id)
    or exists(select 1 from customer_invitations i where i.customer_id=$1 and i.kind='TICKET' and i.state='ACCEPTED' and i.result_id=q.id)
    or exists(select 1 from customer_relationships r where r.customer_id=$1 and r.business_id=q.business_id and r.state='ACCEPTED'
      and r.document_key=regexp_replace(lower(p.document_id),'[^a-z0-9]','','g') and (r.include_history or q.created_at>=r.accepted_at)))
  and (q.origin_type='INTERACTIVE_ACTIVATION' or (q.origin_type='POST_SALE' and ${assignableTicket}) or exists(select 1 from customer_product_gift_orders pg join customer_invitations gi on gi.id=pg.invitation_id and gi.state='ACCEPTED' where pg.qr_code_id=q.id and pg.recipient_id=$1 and pg.state='ISSUED'))`;
async function tickets(account){return (await query(ticketSql+' order by q.created_at desc limit 200',[account.id])).rows.map(({token,...r})=>({...r,kind:'TICKET',status:r.status==='ACTIVE'&&(!r.expires_at||new Date(r.expires_at)>new Date())?'READY':'ARCHIVED'}));}
async function ticket(account,id){
  const row=(await query(ticketSql+' and q.id=$2',[account.id,id])).rows[0];if(!row)throw notFound('Ticket no encontrado.');
  const {token,...card}=row;
  if(row.status==='ACTIVE'&&(!row.expires_at||new Date(row.expires_at)>new Date())){card.qr_image=await QRCode.toDataURL(new URL('/empresa/?view=validator&token='+encodeURIComponent(token),env.publicAppUrl).toString());card.benefit_url=new URL('/claim/'+encodeURIComponent(token),env.publicAppUrl).toString();}
  return {card};
}
module.exports={lookup,catalog,send,inbox,decide,block,tickets,ticket};
