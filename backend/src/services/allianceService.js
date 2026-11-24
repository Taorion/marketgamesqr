const crypto=require('crypto');
const QRCode=require('qrcode');
const {query,withTransaction}=require('../config/db');
const {env}=require('../config/env');
const {badRequest,forbidden,notFound}=require('../utils/http');
const {consumeQrCredits,ensureCreditAccount,refundTickets}=require('./qrCreditService');
const {resolveBeneficiary}=require('./validatorBeneficiaryService');
const {planFromBusiness}=require('./subscriptionService');
const {clearBusinessResponseCache}=require('../middleware/businessResponseCache');
const R=require('./allianceRules');
const token=()=>crypto.randomBytes(32).toString('hex');
const url=(path)=>new URL(path,env.publicAppUrl).toString();
const eligible=b=>b?.is_active&&planFromBusiness(b).portal_access_allowed;
const isDemo=b=>Boolean(b?.is_seller_demo||(b?.settings?.internal_account===true&&b?.settings?.alliance_demo===true));
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
async function event(c,a,user,action,details={}){await c.query('insert into qori_alliance_events(alliance_id,actor_id,action,details) values($1,$2,$3,$4)',[a.id,user?.id||null,action,details]);}
async function agreement(c,id,businessId,lock=false){
  const a=(await c.query(`select * from qori_alliances where id=$1 and (issuer_id=$2 or ally_id=$2)${lock?' for no key update':''}`,[id,businessId])).rows[0];
  if(!a)throw notFound('Alianza no encontrada.');return a;
}
function issuer(a,u){if(a.issuer_id!==u.business_id)throw forbidden('Solo el negocio emisor puede realizar esta acción.');}
function ally(a,u){if(a.ally_id!==u.business_id)throw forbidden('Solo el negocio aliado puede realizar esta acción.');}
async function businesses(c,a){const rows=(await c.query('select * from businesses where id=any($1::uuid[])',[[a.issuer_id,a.ally_id]])).rows;return {issuer:rows.find(b=>b.id===a.issuer_id),ally:rows.find(b=>b.id===a.ally_id)};}
async function validateRules(c,businessId,r){
  r.purchase_product_name=null;r.branch_names=[];
  if(r.purchase_product_id){const p=(await c.query("select name from business_inventory_products where id=$1 and business_id=$2 and status='ACTIVE' and currency='COP'",[r.purchase_product_id,businessId])).rows[0];if(!p)throw badRequest('Selecciona un producto activo propio en COP.');r.purchase_product_name=p.name;}
  if(r.branch_ids.length){const valid=await c.query('select id,name,address from branches where business_id=$1 and is_active=true and id=any($2::uuid[]) order by name',[businessId,r.branch_ids]);if(valid.rowCount!==new Set(r.branch_ids).size)throw badRequest('Las sucursales deben pertenecer al emisor y estar activas.');r.branch_names=valid.rows.map(b=>({name:b.name,address:b.address}));}
}
async function context(user){
  const [a,b,p,s]=await Promise.all([
    query(`select a.*,i.name issuer_name,n.name ally_name,
      coalesce((select sum(quantity-delivered-retired) from qori_alliance_batches where alliance_id=a.id),0)::int available,
      (select count(*)::int from qori_alliance_tickets where alliance_id=a.id) delivered
      from qori_alliances a join businesses i on i.id=a.issuer_id join businesses n on n.id=a.ally_id
      where a.issuer_id=$1 or a.ally_id=$1 order by a.created_at desc`,[user.business_id]),
    query('select c.qr_balance,b.is_seller_demo,b.settings from businesses b left join business_qr_credit_accounts c on c.business_id=b.id where b.id=$1',[user.business_id]),
    query("select id,name from business_inventory_products where business_id=$1 and status='ACTIVE' and currency='COP' order by name",[user.business_id]),
    query('select id,name,address from branches where business_id=$1 and is_active=true order by name',[user.business_id])]);
  return {business_id:user.business_id,demo_mode:isDemo(b.rows[0]),alliances:a.rows,ticket_balance:Number(b.rows[0]?.qr_balance||0),products:p.rows,branches:s.rows};
}
async function lookup(user,slug){
  const b=(await query('select * from businesses where slug=$1 and id<>$2',[String(slug).trim().toLowerCase(),user.business_id])).rows[0];
  if(!eligible(b))throw notFound('No encontramos un negocio activo con ese identificador.');
  const own=(await query('select is_seller_demo,settings from businesses where id=$1',[user.business_id])).rows[0];
  if(isDemo(own)!==isDemo(b))throw forbidden('Las alianzas de demostración solo pueden conectar negocios de demostración.');
  return {id:b.id,name:b.name,slug:b.slug};
}
async function save(user,input,id){
  const rules=R.parse(R.rulesSchema,input.rules);
  return withTransaction(async c=>{
    await validateRules(c,user.business_id,rules);
    if(!id){
      const partner=await lookup(user,input.ally_slug);
      const a=(await c.query('insert into qori_alliances(issuer_id,ally_id,rules,public_token,created_by) values($1,$2,$3,$4,$5) returning *',[user.business_id,partner.id,rules,token(),user.id])).rows[0];
      await event(c,a,user,'CREATED');return a;
    }
    const a=await agreement(c,id,user.business_id,true);issuer(a,user);
    if(Number(input.revision)!==a.revision)throw badRequest('La alianza cambió. Actualiza antes de guardar.');
    if(['CANCELLED','ARCHIVED'].includes(a.status))throw badRequest('Esta alianza está cerrada. Crea una nueva propuesta.');
    const accepted=Boolean(a.accepted_at);
    if(!accepted&&['DRAFT','REJECTED'].includes(a.status)&&input.ally_slug){const partner=await lookup(user,input.ally_slug);await c.query('update qori_alliances set ally_id=$2 where id=$1',[id,partner.id]);}
    const updated=(await c.query(`update qori_alliances set ${accepted?'pending_rules':'rules'}=$2,revision=revision+1,
      status=case when status='REJECTED' then 'DRAFT' else status end,updated_at=now() where id=$1 returning *`,[id,rules])).rows[0];
    await event(c,a,user,accepted?'REVISION_PROPOSED':'EDITED',{revision:updated.revision,rules});return updated;
  });
}
// Retire only unassigned inventory. Delivered tickets retain their original benefit and expiry.
async function closeBatches(c,a,user,expiredOnly=false,batchId=null){
  const batches=(await c.query(`select * from qori_alliance_batches where alliance_id=$1 and closed_at is null
    and ($2::uuid is null or id=$2) ${expiredOnly?"and (rules->>'ends_at')::timestamptz<=now()":''} order by created_at for update`,[a.id,batchId])).rows;
  for(const b of batches){
    const remaining=b.quantity-b.delivered-b.retired;let refund=0;
    if(remaining>0&&b.rules.unused_policy==='RETURN_UNUSED'){
      const account=await ensureCreditAccount(c,a.issuer_id);
      const unusedIncluded=Math.max(0,b.included_quantity-b.delivered);
      const restoreIncluded=account.included_period_key===b.included_period?unusedIncluded:0;
      refund=remaining-unusedIncluded+restoreIncluded;
      if(refund>0)await refundTickets(c,a.issuer_id,refund,`Alianzas · devolución de lote ${b.id}`,{user_id:user.id});
      if(restoreIncluded>0)await c.query('update business_qr_credit_accounts set included_balance=included_balance+$2 where business_id=$1',[a.issuer_id,restoreIncluded]);
    }
    await c.query('update qori_alliance_batches set retired=retired+$2,refunded=refunded+$3,closed_at=now() where id=$1',[b.id,remaining,refund]);
    await event(c,a,user,'BATCH_CLOSED',{batch_id:b.id,retired:remaining,refunded:refund});
  }
}
async function returnBatch(user,id,batchId,reason){return withTransaction(async c=>{
  const a=await agreement(c,id,user.business_id,true);
  if(String(reason||'').trim().length<5)throw badRequest('Indica el motivo del cierre del lote.');
  if(!(await c.query('select id from qori_alliance_batches where id=$1 and alliance_id=$2',[batchId,id])).rowCount)throw notFound('Lote no encontrado.');
  await closeBatches(c,a,user,false,batchId);await event(c,a,user,'BATCH_RETURN_REQUESTED',{batch_id:batchId,reason:String(reason).slice(0,500)});return {closed:true};
});}
async function action(user,id,input){return withTransaction(async c=>{
  const a=await agreement(c,id,user.business_id,true),action=input.action;
  if(Number(input.revision)!==a.revision)throw badRequest('La alianza cambió. Actualiza y vuelve a intentarlo.');
  let status=a.status;
  if(action==='PROPOSE'){issuer(a,user);if(!['DRAFT','REJECTED'].includes(status))throw badRequest('La propuesta ya fue enviada.');status='PROPOSED';}
  else if(action==='ACCEPT'){
    ally(a,user);if(status!=='PROPOSED'&&!a.pending_rules)throw badRequest('No hay una propuesta pendiente.');
    if(['CANCELLED','ARCHIVED'].includes(status))throw badRequest('La alianza está cerrada.');
    const r=a.pending_rules||a.rules;await validateRules(c,a.issuer_id,r);
    if(new Date(r.ends_at)<=new Date())throw badRequest('La propuesta ya venció. Solicita actualizarla.');
    if(a.pending_rules)await closeBatches(c,a,user);
    await c.query('update qori_alliances set rules=$2,pending_rules=null,accepted_at=now() where id=$1',[id,r]);status='ACTIVE';
  } else if(action==='REJECT'){
    ally(a,user);if(a.pending_rules)await c.query('update qori_alliances set pending_rules=null where id=$1',[id]);
    else if(status==='PROPOSED')status='REJECTED';else throw badRequest('No hay propuesta pendiente.');
  } else if(action==='PAUSE'){
    if(status!=='ACTIVE')throw badRequest('Solo puedes pausar una alianza activa.');status='PAUSED';
  } else if(action==='RESUME'){
    issuer(a,user);if(status!=='PAUSED')throw badRequest('La alianza no está pausada.');
    // A pause by either party needs both parties again before distributing more tickets.
    status='PROPOSED';
  } else if(action==='CANCEL'||action==='ARCHIVE'){
    if(!String(input.reason||'').trim())throw badRequest('Indica el motivo del cierre.');
    await closeBatches(c,a,user);status=action==='CANCEL'?'CANCELLED':'ARCHIVED';
    await c.query('update qori_alliances set pending_rules=null where id=$1',[id]);
  } else if(action==='RETURN_EXPIRED'){await closeBatches(c,a,user,true);}
  else throw badRequest('Acción no válida.');
  await c.query('update qori_alliances set status=$2,revision=revision+1,updated_at=now() where id=$1',[id,status]);
  await event(c,a,user,action,{reason:String(input.reason||'').slice(0,500),revision:a.revision});return {status};
});}
async function remove(user,id){return withTransaction(async c=>{
  const a=await agreement(c,id,user.business_id,true);issuer(a,user);
  if(!['DRAFT','REJECTED'].includes(a.status)||a.accepted_at||(await c.query('select 1 from qori_alliance_batches where alliance_id=$1',[id])).rowCount)throw badRequest('Esta alianza tiene compromisos o historial. Usa cancelar o archivar.');
  await c.query('delete from qori_alliances where id=$1',[id]);return {deleted:true};
});}
async function personalize(user,id,input){const branding=R.parse(R.brandingSchema,input);return withTransaction(async c=>{
  const a=await agreement(c,id,user.business_id,true);ally(a,user);
  if(['CANCELLED','ARCHIVED','REJECTED','DRAFT'].includes(a.status))throw badRequest('La alianza no admite personalización en este estado.');
  await c.query('update qori_alliances set branding=$2,updated_at=now() where id=$1',[id,branding]);await event(c,a,user,'PERSONALIZED',{branding});return {branding};
});}
async function issue(user,id,input){
  const quantity=Number(input.quantity);if(!Number.isInteger(quantity)||quantity<1||quantity>100000)throw badRequest('La cantidad debe estar entre 1 y 100.000.');
  R.parse(R.uuid,input.request_key);
  return withTransaction(async c=>{
    const a=await agreement(c,id,user.business_id,true);issuer(a,user);
    const prior=(await c.query('select * from qori_alliance_batches where alliance_id=$1 and request_key=$2',[id,input.request_key])).rows[0];
    if(prior){if(prior.quantity!==quantity)throw badRequest('El identificador ya corresponde a otro lote.');return prior;}
    if(a.status!=='ACTIVE'||!a.accepted_at||a.pending_rules)throw badRequest('Acepta primero las condiciones vigentes de la alianza.');
    if(new Date(a.rules.ends_at)<=new Date())throw badRequest('La alianza venció.');
    const partners=await businesses(c,a);if(!eligible(partners.issuer)||!eligible(partners.ally))throw badRequest('Ambos negocios deben tener acceso activo.');
    const account=await ensureCreditAccount(c,a.issuer_id);
    if(Number(account.qr_balance)<quantity)throw badRequest('Saldo de tickets insuficiente.');
    const b=(await c.query(`insert into qori_alliance_batches(alliance_id,request_key,revision,rules,quantity,included_quantity,included_period)
      values($1,$2,$3,$4,$5,$6,$7) returning *`,[id,input.request_key,a.revision,a.rules,quantity,Math.min(Number(account.included_balance||0),quantity),account.included_period_key])).rows[0];
    await consumeQrCredits(c,a.issuer_id,quantity,null,user.id,`Alianzas · lote ${b.id} · ${a.rules.name}`);
    await event(c,a,user,'BATCH_ISSUED',{batch_id:b.id,quantity});return b;
  });
}
async function publicAgreement(publicToken){
  const a=(await query('select * from qori_alliances where public_token=$1',[publicToken])).rows[0];
  if(!a)throw notFound('Alianza no encontrada.');
  const b=await businesses({query},a);
  const available=(await query(`select coalesce(sum(quantity-delivered-retired),0)::int n from qori_alliance_batches
    where alliance_id=$1 and closed_at is null and (rules->>'ends_at')::timestamptz>now()`,[a.id])).rows[0].n;
  const active=a.status==='ACTIVE'&&a.branding&&eligible(b.issuer)&&eligible(b.ally)&&new Date(a.rules.starts_at)<=new Date()&&new Date(a.rules.ends_at)>new Date();
  return {...R.publicRules(a.rules),issuer:{name:b.issuer.name},ally:{name:b.ally.name},branding:a.branding,
    available:active?available:0,accepting:Boolean(active&&available>0),
    message:!active?'Esta alianza no está recibiendo nuevas inscripciones.':available?'Completa tus datos para recibir el beneficio.':'Se agotaron los tickets disponibles.'};
}
async function enroll(publicToken,input){
  const data=R.parse(R.enrollmentSchema,input);data.document_id=R.documentKey(data.document_id);
  if(data.document_id.length<4)throw badRequest('Revisa el documento.');
  const requestHash=digest(data);
  const result=await withTransaction(async c=>{
    const a=(await c.query('select * from qori_alliances where public_token=$1 for no key update',[publicToken])).rows[0];
    if(!a)throw notFound('Alianza no encontrada.');
    const previous=(await c.query('select public_token,request_hash from qori_alliance_tickets where alliance_id=$1 and request_key=$2',[a.id,data.request_key])).rows[0];
    if(previous){if(previous.request_hash!==requestHash)throw badRequest('Esta solicitud ya fue utilizada con otros datos.');return {token:previous.public_token,businesses:[a.issuer_id,a.ally_id]};}
    if(a.status!=='ACTIVE'||!a.branding||new Date(a.rules.starts_at)>new Date()||new Date(a.rules.ends_at)<=new Date())throw badRequest('La alianza no está disponible para nuevas inscripciones.');
    const partners=await businesses(c,a);if(!eligible(partners.issuer)||!eligible(partners.ally))throw badRequest('La alianza no está disponible.');
    if(a.branding.collect_phone&&!/^\+?[\d ()-]{7,30}$/.test(data.phone))throw badRequest('Ingresa un teléfono válido.');
    if(a.branding.collect_email&&!data.email)throw badRequest('Ingresa tu correo.');
    // Do not accept hidden personal fields; never return someone else's ticket by document alone.
    if(!a.branding.collect_phone)data.phone='';if(!a.branding.collect_email)data.email='';
    const count=(await c.query('select count(*)::int n from qori_alliance_tickets where alliance_id=$1 and document_key=$2',[a.id,data.document_id])).rows[0].n;
    if(count>=a.rules.per_customer_limit)throw badRequest('Ya se alcanzó el límite de participación para este documento. Conserva el ticket recibido.');
    const batch=(await c.query(`select * from qori_alliance_batches where alliance_id=$1 and closed_at is null
      and delivered+retired<quantity and (rules->>'ends_at')::timestamptz>now() order by created_at,id limit 1 for update`,[a.id])).rows[0];
    if(!batch)throw badRequest('Se agotaron los tickets.');
    const contacts={};
    // Stable ordering prevents reciprocal alliances from taking contact locks in opposite order.
    for(const businessId of [a.issuer_id,a.ally_id].sort()){
      const marketing=businessId===a.issuer_id?data.marketing_issuer:data.marketing_ally;
      const {player}=await resolveBeneficiary(c,{businessId,documentRequired:true,input:{...data,data_use_confirmed:true,marketing_consent:marketing,capture_source:'TICKET'},operationKey:`alliance:${a.id}:${data.request_key}`});
      contacts[businessId]=player.id;
      await c.query(`update players set metadata=coalesce(metadata,'{}')||$2::jsonb where id=$1`,[player.id,
        {alliance_origin:{alliance_id:a.id,issuer_id:a.issuer_id,ally_id:a.ally_id,registered_at:new Date().toISOString(),marketing_consent:marketing},source_label:'Qori Alianzas',...(marketing?{marketing_consent:true}:{})}]);
    }
    const ticketToken=token(),qrToken=token();
    const q=(await c.query(`insert into qr_codes(business_id,player_id,token,status,origin_type,benefit_type,benefit_value,expires_at,claim_required,claimed_at,claimed_by_player_id,metadata)
      values($1,$2,$3,'ACTIVE','LOYALTY',$4,$5,least($6::timestamptz,now()+make_interval(days=>$7)),false,now(),$2,$8) returning id`,
    [a.issuer_id,contacts[a.issuer_id],qrToken,batch.rules.benefit_type,R.benefit(batch.rules),batch.rules.ends_at,batch.rules.ticket_valid_days,
      {source:'QORI_ALLIANCE',alliance_id:a.id,ally_name:partners.ally.name,terms:batch.rules.terms,acquisition_channel_name_snapshot:`Qori Alianzas · ${partners.ally.name}`}])).rows[0];
    await c.query(`insert into qori_alliance_tickets(alliance_id,batch_id,qr_code_id,issuer_player_id,ally_player_id,document_key,request_key,request_hash,public_token,branding,consent)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[a.id,batch.id,q.id,contacts[a.issuer_id],contacts[a.ally_id],data.document_id,data.request_key,requestHash,ticketToken,a.branding,
      {version:1,accepted_at:new Date().toISOString(),issuer_id:a.issuer_id,ally_id:a.ally_id,issuer_name:partners.issuer.name,ally_name:partners.ally.name,data_use_confirmed:true,
        purpose:'Gestionar el ticket y la recomendación entre ambos negocios.',marketing_issuer:data.marketing_issuer,marketing_ally:data.marketing_ally}]);
    await c.query('update qori_alliance_batches set delivered=delivered+1 where id=$1',[batch.id]);
    return {token:ticketToken,businesses:[a.issuer_id,a.ally_id]};
  });
  result.businesses.forEach(clearBusinessResponseCache);
  return publicTicket(result.token);
}
async function publicTicket(publicToken){
  const t=(await query(`select t.branding,t.public_token,b.rules,q.token,q.status,q.expires_at,i.name issuer_name,n.name ally_name
    from qori_alliance_tickets t join qori_alliance_batches b on b.id=t.batch_id join qori_alliances a on a.id=t.alliance_id
    join qr_codes q on q.id=t.qr_code_id join businesses i on i.id=a.issuer_id join businesses n on n.id=a.ally_id where t.public_token=$1`,[publicToken])).rows[0];
  if(!t)throw notFound('Ticket no encontrado.');
  return {...R.publicRules(t.rules),branding:t.branding,issuer:{name:t.issuer_name},ally:{name:t.ally_name},
    status:t.status==='ACTIVE'&&new Date(t.expires_at)<=new Date()?'EXPIRED':t.status,expires_at:t.expires_at,
    ticket_code:t.token,ticket_url:url(`/alianzas/#ticket=${t.public_token}`),qr_image:await QRCode.toDataURL(url(`/empresa/?view=validator&token=${t.token}`))};
}
async function detail(user,id,offset=0){
  const a=await agreement({query},id,user.business_id);const names=await businesses({query},a);
  const [b,t,c,p,e]=await Promise.all([
    query('select * from qori_alliance_batches where alliance_id=$1 order by created_at desc',[id]),
    query(`select t.id,t.created_at,case when q.status='ACTIVE' and q.expires_at<=now() then 'EXPIRED' else q.status end status,q.expires_at,p.name,p.document_id,p.phone,p.email,
      t.consent->>$4 as marketing_consent,coalesce(s.sale_status='PAID',false) as purchased
      from qori_alliance_tickets t join qr_codes q on q.id=t.qr_code_id left join business_sales s on s.id=q.sale_id join players p on p.id=case when $2 then t.issuer_player_id else t.ally_player_id end
      where t.alliance_id=$1 order by t.created_at desc,t.id limit 51 offset $3`,[id,user.business_id===a.issuer_id,offset,user.business_id===a.issuer_id?'marketing_issuer':'marketing_ally']),
    query(`select c.*,s.sale_amount,s.sale_status,s.product_name,
      coalesce((select sum(amount) from qori_alliance_payments where commission_id=c.id),0) paid_amount
      from qori_alliance_commissions c join business_sales s on s.id=c.sale_id where c.alliance_id=$1 order by c.created_at desc`,[id]),
    query('select p.* from qori_alliance_payments p join qori_alliance_commissions c on c.id=p.commission_id where c.alliance_id=$1 order by p.created_at desc',[id]),
    query('select action,details,created_at from qori_alliance_events where alliance_id=$1 order by created_at desc limit 100',[id])]);
  const totals=c.rows.reduce((s,v)=>{s.earned+=Number(v.amount);s.paid+=Number(v.paid_amount);s.pending+=Math.max(0,Number(v.amount)-Number(v.paid_amount));s.recoverable+=Math.max(0,Number(v.paid_amount)-Number(v.amount));return s;},{earned:0,paid:0,pending:0,recoverable:0});
  const capture_url=url(`/alianzas/#alianza=${a.public_token}`);
  return {alliance:{...a,issuer_name:names.issuer.name,ally_name:names.ally.name},batches:b.rows,tickets:t.rows.slice(0,50),has_more:t.rows.length>50,offset,commissions:c.rows,payments:p.rows,events:e.rows,totals,
    capture_url,qr_image:await QRCode.toDataURL(capture_url)};
}
async function pay(user,id,input){
  R.parse(R.uuid,input.request_key);R.parse(R.uuid,input.commission_id);
  const amount=R.round(input.amount),paidAt=new Date(input.paid_at);
  if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(paidAt.getTime())||paidAt>new Date()||!String(input.reference||'').trim())throw badRequest('Revisa importe, fecha y referencia del pago.');
  return withTransaction(async c=>{
    const a=await agreement(c,id,user.business_id);issuer(a,user);
    // Same lock order as canonical-sale adjustments: sale, then commission.
    const ref=(await c.query('select sale_id from qori_alliance_commissions where id=$1 and alliance_id=$2',[input.commission_id,id])).rows[0];if(!ref)throw notFound('Comisión no encontrada.');
    await c.query('select id from business_sales where id=$1 for update',[ref.sale_id]);
    const commission=(await c.query('select * from qori_alliance_commissions where id=$1 for update',[input.commission_id])).rows[0];
    const prior=(await c.query('select * from qori_alliance_payments where request_key=$1',[input.request_key])).rows[0];
    if(prior){if(prior.commission_id!==commission.id||Number(prior.amount)!==amount||prior.reference!==String(input.reference).trim())throw badRequest('La referencia de solicitud ya fue utilizada.');return prior;}
    const paid=Number((await c.query('select coalesce(sum(amount),0) n from qori_alliance_payments where commission_id=$1',[commission.id])).rows[0].n);
    if(amount>R.round(Number(commission.amount)-paid))throw badRequest('El pago supera la comisión pendiente.');
    const p=(await c.query('insert into qori_alliance_payments(commission_id,request_key,amount,paid_at,reference,created_by) values($1,$2,$3,$4,$5,$6) returning *',[commission.id,input.request_key,amount,paidAt,String(input.reference).trim().slice(0,300),user.id])).rows[0];
    await event(c,a,user,'PAYMENT_RECORDED',{payment_id:p.id,amount,reference:p.reference});return p;
  });
}
async function reversePayment(user,id,paymentId,reason){return withTransaction(async c=>{
  const a=await agreement(c,id,user.business_id);issuer(a,user);
  if(String(reason||'').trim().length<5)throw badRequest('Explica el motivo de la reversión.');
  const ref=(await c.query(`select c.id,c.sale_id from qori_alliance_commissions c join qori_alliance_payments p on p.commission_id=c.id where p.id=$1 and c.alliance_id=$2`,[paymentId,id])).rows[0];
  if(!ref)throw notFound('Pago no encontrado.');
  await c.query('select id from business_sales where id=$1 for update',[ref.sale_id]);
  await c.query('select id from qori_alliance_commissions where id=$1 for update',[ref.id]);
  const p=(await c.query(`select p.* from qori_alliance_payments p join qori_alliance_commissions c on c.id=p.commission_id
    where p.id=$1 and c.alliance_id=$2 for update of p`,[paymentId,id])).rows[0];
  if(!p||Number(p.amount)<=0)throw notFound('Pago no encontrado.');
  const reversal=(await c.query(`insert into qori_alliance_payments(commission_id,request_key,amount,paid_at,reference,created_by,reverses_id)
    values($1,$2,$3,now(),$4,$5,$6) on conflict(reverses_id) do nothing returning id`,[p.commission_id,crypto.randomUUID(),-Number(p.amount),String(reason).slice(0,300),user.id,p.id])).rows[0];
  if(reversal)await event(c,a,user,'PAYMENT_REVERSED',{payment_id:p.id,reason});return {reversed:true};
});}
async function cancelTicket(user,id,ticketId,reason){return withTransaction(async c=>{
  const a=await agreement(c,id,user.business_id);issuer(a,user);
  if(String(reason||'').trim().length<5)throw badRequest('Explica por qué se anula el ticket entregado.');
  const t=(await c.query('select qr_code_id from qori_alliance_tickets where id=$1 and alliance_id=$2',[ticketId,id])).rows[0];if(!t)throw notFound('Ticket no encontrado.');
  const q=(await c.query('select status from qr_codes where id=$1 for update',[t.qr_code_id])).rows[0];
  if(q.status==='REDEEMED')throw badRequest('El ticket ya tiene una venta. Gestiona su devolución desde Ventas.');
  if(q.status!=='CANCELLED'){await c.query("update qr_codes set status='CANCELLED' where id=$1",[t.qr_code_id]);await event(c,a,user,'TICKET_CANCELLED',{ticket_id:ticketId,reason});}
  return {cancelled:true};
});}
// Hooks run inside the existing Validator transaction. Never publish commission fields on QR metadata.
async function validateRedemption(c,qr,user,payload,checkout){
  if(qr.metadata?.source!=='QORI_ALLIANCE')return null;
  const t=(await c.query(`select t.*,b.rules,a.issuer_id,a.ally_id from qori_alliance_tickets t
    join qori_alliance_batches b on b.id=t.batch_id join qori_alliances a on a.id=t.alliance_id where t.qr_code_id=$1`,[qr.id])).rows[0];
  if(!t||t.issuer_id!==user.business_id||qr.business_id!==t.issuer_id)throw forbidden('Solo el negocio emisor puede canjear este ticket.');
  if(payload.mode!=='PURCHASE'||checkout.final_total<=0||(payload.purchase?.currency||'COP')!=='COP')throw badRequest('Confirma una compra pagada en COP para aplicar la alianza.');
  if(!String(payload.purchase?.payment_method||'').trim())throw badRequest('Indica el medio del pago recibido.');
  if(R.documentKey(payload.beneficiary?.document_id)!==t.document_key)throw badRequest('El ticket de alianza es personal. Verifica el documento del titular.');
  const branchId=payload.purchase?.branch_id||user.branch_id;
  if(user.branch_id&&branchId!==user.branch_id)throw forbidden('Usa la sucursal asignada a tu usuario.');
  if(branchId&&!(await c.query('select 1 from branches where id=$1 and business_id=$2 and is_active=true',[branchId,t.issuer_id])).rowCount)throw forbidden('Sucursal no autorizada.');
  if(t.rules.branch_ids.length&&!t.rules.branch_ids.includes(branchId))throw badRequest('El ticket no aplica en esta sucursal.');
  if(t.rules.purchase_product_id&&!checkout.line_items.some(i=>i.inventory_product_id===t.rules.purchase_product_id))throw badRequest('Agrega el producto requerido para esta alianza.');
  return t;
}
async function accrue(c,t,sale,checkout,user){
  if(!t)return;
  if(!sale?.id)throw badRequest('La comisión requiere una venta confirmada.');
  const value=R.commission(t.rules,checkout);
  const inserted=await c.query(`insert into qori_alliance_commissions(alliance_id,ticket_id,sale_id,original_sale_amount,original_amount,amount)
    values($1,$2,$3,$4,$5,$5) on conflict(ticket_id) do nothing returning id`,[t.alliance_id,t.id,sale.id,checkout.final_total,value]);
  await c.query("update business_sales set metadata=metadata||$2::jsonb where id=$1",[sale.id,{source_module:'qori_alliances',alliance_id:t.alliance_id,ally_id:t.ally_id,alliance_ticket_id:t.id}]);
  if(inserted.rowCount)await event(c,{id:t.alliance_id},user,'COMMISSION_EARNED',{commission_id:inserted.rows[0].id,sale_id:sale.id,amount:value});
}
module.exports={context,lookup,save,action,remove,personalize,issue,returnBatch,publicAgreement,enroll,publicTicket,detail,pay,reversePayment,cancelTicket,validateRedemption,accrue};
