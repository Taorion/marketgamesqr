const crypto=require('crypto');
const {query,withTransaction}=require('../config/db');
const {badRequest,notFound,forbidden}=require('../utils/http');
const {planFromBusiness}=require('./subscriptionService');
const {env}=require('../config/env');
const wallet=require('./customerWalletService');
const network=require('./customerNetworkService');
const activationService=require('./interactiveActivationService');
const qr=require('qrcode');
const baseSql=`select p.*,b.name business_name,b.slug business_slug,to_jsonb(b) business,
 d.city,d.address,d.category business_category,d.description business_description,d.published directory_published,
 a.status activation_status,a.starts_at,a.ends_at,a.public_slug,a.activation_type,a.terms activation_terms,a.reward_config,a.visual_config,
 s.status stamp_status,s.deleted_at stamp_deleted,s.stamps_required,s.benefit_value,s.terms stamp_terms,s.card_valid_days,
 cb.points_terms,cb.accumulation_terms,cb.gift_enabled,cb.gift_min,cb.gift_max,cb.gift_terms,cb.gift_payment_instructions,
 ip.name product_name,ip.status product_status,ip.stock_quantity,ip.currency product_currency,ip.unit_price product_regular_price,po.price product_price,po.terms product_terms,po.payment_instructions product_payment_instructions,po.valid_days product_valid_days
 from customer_publications p join businesses b on b.id=p.business_id
 left join customer_directory d on d.business_id=b.id
 left join interactive_activations a on p.kind='ACTIVITY' and a.id=p.resource_id and a.company_id=p.business_id
 left join stamp_programs s on p.kind='STAMP' and s.id=p.resource_id and s.business_id=p.business_id
 left join business_inventory_products ip on p.kind='PRODUCT' and ip.id=p.resource_id and ip.business_id=p.business_id
 left join customer_product_offers po on po.publication_id=p.id
 left join customer_business_programs cb on cb.business_id=p.business_id`;
const media=value=>typeof value==='string'&&(/^(https:\/\/|\/(?!\/))/.test(value))?value:'';
function eligibility(row){
 const plan=planFromBusiness(row.business),now=Date.now();
 if(!row.business.is_active||!plan.portal_access_allowed||plan.raw_status!=='ACTIVE')return false;
 if(row.kind==='ACTIVITY')return !!plan.features.qr_batch_generator&&row.activation_status==='active'&&(!row.starts_at||new Date(row.starts_at)<=now)&&(!row.ends_at||new Date(row.ends_at)>now);
 if(row.kind==='STAMP')return row.stamp_status==='ACTIVE'&&!row.stamp_deleted;
 if(row.kind==='AFFILIATION')return !!plan.features.affiliates&&String(row.points_terms||'').trim().length>=10;
 if(row.kind==='PRODUCT')return !!plan.features.product_gifts&&row.product_status==='ACTIVE'&&row.product_currency==='COP'&&Number(row.stock_quantity)>=1&&Number(row.product_price)>0;
 return !!plan.features.gift_cards&&row.gift_enabled&&String(row.gift_terms||'').trim().length>=10&&String(row.gift_payment_instructions||'').trim().length>=10;
}
function publicRow(r){
 const benefit=r.kind==='PRODUCT'?r.product_name:r.kind==='STAMP'?r.benefit_value?.label:r.kind==='ACTIVITY'?(r.reward_config?.label||r.reward_config?.reward_label):r.kind==='AFFILIATION'?'Acumula puntos y descubre sus premios':'Un regalo para disfrutar en este negocio';
 return {id:r.id,business_id:r.business_id,business_name:r.business_name,business_slug:r.business_slug,kind:r.kind,title:r.title,description:r.description,
  cover_url:media(r.cover_url),logo_url:media(r.business.settings?.logo_url||r.business.settings?.logoUrl),category:r.category||r.business_category||'',city:r.city||'',address:r.address||'',
  terms:r.kind==='PRODUCT'?r.product_terms:r.kind==='STAMP'?r.stamp_terms:r.kind==='ACTIVITY'?r.activation_terms:r.kind==='AFFILIATION'?r.points_terms:r.gift_terms,
  product_name:r.product_name,product_price:r.product_price,product_currency:r.product_currency,product_regular_price:r.product_regular_price,product_valid_days:r.product_valid_days,
  benefit:typeof benefit==='string'?benefit:'',stamps_required:r.stamps_required||null,card_valid_days:r.card_valid_days||null,
  starts_at:r.starts_at||null,ends_at:r.ends_at||null,gift_min:r.kind==='GIFT'?r.gift_min:null,gift_max:r.kind==='GIFT'?r.gift_max:null,
  payment_instructions:r.kind==='PRODUCT'?r.product_payment_instructions:r.kind==='GIFT'?r.gift_payment_instructions:null,
  url:new URL('/customer/#publication/'+r.id,env.publicAppUrl).toString(),updated_at:r.updated_at};
}
async function detail(id,db={query}){
 const row=(await db.query(baseSql+' where p.id=$1',[id])).rows[0];
 if(!row||row.status!=='PUBLISHED'||!row.directory_published||!eligibility(row))throw notFound('Esta publicación no está disponible.');
 return row;
}
async function feed({search='',city='',kind='',category='',offset=0,limit=24,business='',savedBy=null}={}){
 const rows=(await query(baseSql+` where p.status='PUBLISHED' and d.published and b.is_active
 and ($1='' or p.title ilike '%'||$1||'%' or p.description ilike '%'||$1||'%' or b.name ilike '%'||$1||'%')
 and ($2='' or d.city ilike '%'||$2||'%') and ($3='' or p.kind=$3) and ($4='' or p.category=$4 or d.category=$4)
 and ($5='' or b.slug=$5) and ($6::uuid is null or exists(select 1 from customer_saved_publications sv where sv.publication_id=p.id and sv.customer_id=$6))
 order by p.updated_at desc,p.id limit $7 offset $8`,[search,city,kind,category,business,savedBy,limit+1,offset])).rows;
 return {publications:rows.slice(0,limit).filter(eligibility).map(publicRow),next_offset:rows.length>limit?offset+limit:null};
}
async function get(id){return {publication:publicRow(await detail(id))};}
// Empresa accounts have a basic public identity. A saved hidden profile remains hidden.
// Internal seed accounts are never listed automatically.
const visibleBusinessSql=`b.is_active and (d.published or (d.business_id is null
 and coalesce(b.settings->>'internal_account','false')<>'true'
 and coalesce(b.settings->'access'->>'source','')<>'internal_seed'))`;
const businessSelect=`select b.id,b.name,b.slug,to_jsonb(b) business,d.category,d.city,d.address,d.latitude,d.longitude,d.description
 from businesses b left join customer_directory d on d.business_id=b.id`;
function businessAvailable(row){const p=planFromBusiness(row.business);return p.portal_access_allowed&&p.raw_status==='ACTIVE';}
const searchText=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function publicBusiness(row){return {id:row.id,name:row.name,slug:row.slug,category:row.category,city:row.city,address:row.address,latitude:row.latitude,longitude:row.longitude};}
async function visibleBusiness(field,value){
 const row=(await query(businessSelect+` where ${visibleBusinessSql} and b.${field}=$1`,[value])).rows[0];
 if(!row||!businessAvailable(row))throw notFound('Negocio no disponible.');
 return row;
}
async function directory({search='',city='',offset=0}={}){
 const words=searchText(search).split(/\s+/).filter(w=>w&&!['el','la','los','las','de','del','y'].includes(w));
 const businesses=[];let cursor=offset;
 while(true){
  const rows=(await query(businessSelect+` where ${visibleBusinessSql}
   and not exists(select 1 from unnest($1::text[]) word where strpos(translate(lower(concat_ws(' ',b.name,b.slug,d.category)),'áéíóúüñ','aeiouun'),word)=0)
   and ($2='' or strpos(translate(lower(coalesce(d.city,'')),'áéíóúüñ','aeiouun'),$2)>0)
   order by b.name,b.id limit 100 offset $3`,[words,searchText(city),cursor])).rows;
  for(let i=0;i<rows.length;i++){
   if(!businessAvailable(rows[i]))continue;
   if(businesses.length===48)return {businesses,next_offset:cursor+i};
   businesses.push(publicBusiness(rows[i]));
  }
  if(rows.length<100)return {businesses,next_offset:null};
  cursor+=rows.length;
 }
}
async function businessPage(slug){
 const b=await visibleBusiness('slug',slug);
 return {business:{id:b.id,slug:b.slug,name:b.name,city:b.city,address:b.address,description:b.description,category:b.category,logo_url:media(b.business.settings?.logo_url)},...await feed({business:slug,limit:48})};
}
async function followBusiness(account,id){
 await visibleBusiness('id',id);
 await query('insert into customer_favorites(customer_id,business_id) values($1,$2) on conflict do nothing',[account.id,id]);
 return {ok:true};
}
async function catalog(user){
 const [activities,stamps,products]=await Promise.all([
 query("select id,title,activation_type,status from interactive_activations where company_id=$1 and status='active' order by title",[user.business_id]),
 query("select id,name,stamps_required from stamp_programs where business_id=$1 and status='ACTIVE' and deleted_at is null order by name",[user.business_id]),
 query("select id,name,unit_price,stock_quantity from business_inventory_products where business_id=$1 and status='ACTIVE' and currency='COP' order by name limit 300",[user.business_id])]);
 const pubs=(await query(baseSql+' where p.business_id=$1 order by p.updated_at desc',[user.business_id])).rows;
 const counts=(await query(`select publication_id,event_type,count(*)::int count from customer_publication_events where publication_id in(select id from customer_publications where business_id=$1) group by publication_id,event_type`,[user.business_id])).rows;
 return {activities:activities.rows,stamps:stamps.rows,products:products.rows,publications:pubs.map(r=>({...publicRow(r),resource_id:r.resource_id,status:r.status,eligible:eligibility(r),metrics:Object.fromEntries(counts.filter(c=>c.publication_id===r.id).map(c=>[c.event_type,c.count]))})),
  directory:(await query('select * from customer_directory where business_id=$1',[user.business_id])).rows[0]||null};
}
async function publish(user,data){
 return withTransaction(async db=>{
  const b=(await db.query('select * from businesses where id=$1 and is_active',[user.business_id])).rows[0];
  if(!b||!planFromBusiness(b).portal_access_allowed)throw forbidden('Activa tu cuenta Qori Empresa para publicar.');
  if(data.kind==='ACTIVITY'&&!(await db.query('select 1 from interactive_activations where id=$1 and company_id=$2',[data.resource_id,user.business_id])).rowCount)throw notFound('Actividad no encontrada.');
  if(data.kind==='STAMP'&&!(await db.query('select 1 from stamp_programs where id=$1 and business_id=$2',[data.resource_id,user.business_id])).rowCount)throw notFound('Programa no encontrado.');
  if(data.kind==='PRODUCT'&&!(await db.query("select 1 from business_inventory_products where id=$1 and business_id=$2 and status='ACTIVE' and currency='COP'",[data.resource_id,user.business_id])).rowCount)throw notFound('Producto no encontrado.');
  const r=(await db.query(`insert into customer_publications(business_id,kind,resource_id,title,description,cover_url,category,status,created_by)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(business_id,kind,(coalesce(resource_id,'00000000-0000-0000-0000-000000000000'::uuid)))
   do update set title=excluded.title,description=excluded.description,cover_url=excluded.cover_url,category=excluded.category,status=excluded.status,updated_at=now() returning id`,
   [user.business_id,data.kind,data.resource_id||null,data.title,data.description,data.cover_url,data.category,data.status,user.id])).rows[0];
  if(data.kind==='PRODUCT')await db.query('insert into customer_product_offers(publication_id,price,terms,payment_instructions,valid_days) values($1,$2,$3,$4,$5) on conflict(publication_id) do update set price=excluded.price,terms=excluded.terms,payment_instructions=excluded.payment_instructions,valid_days=excluded.valid_days,updated_at=now()',[r.id,data.product_price,data.product_terms,data.payment_instructions,data.product_valid_days]);
  const current=(await db.query(baseSql+' where p.id=$1',[r.id])).rows[0];
  if(data.status==='PUBLISHED'&&!eligibility(current))throw badRequest('Activa el programa y configura sus condiciones para publicarlo. No necesitas ofrecer los otros programas.');
  if(data.status==='PUBLISHED'&&!current.directory_published)throw badRequest('Publica primero el perfil de tu negocio.');
  return {publication:{...publicRow(current),status:current.status}};
 });
}
async function publicationState(user,id,status){
 const r=await query('update customer_publications set status=$3,updated_at=now() where id=$1 and business_id=$2 returning id',[id,user.business_id,status]);
 if(!r.rowCount)throw notFound();return {ok:true};
}
async function save(account,id,saved){
 if(saved){await detail(id);await query('insert into customer_saved_publications(customer_id,publication_id) values($1,$2) on conflict do nothing',[account.id,id]);}
 else await query('delete from customer_saved_publications where customer_id=$1 and publication_id=$2',[account.id,id]);return {ok:true};
}
async function event(account,id,type,db={query}){
 await detail(id,db);
 await db.query(`insert into customer_publication_events(publication_id,customer_id,event_type)
 select $1,$2,$3 where not exists(select 1 from customer_publication_events where publication_id=$1 and customer_id=$2 and event_type=$3 and created_at>now()-interval '5 minutes')`,[id,account.id,type]);
 return {ok:true};
}
async function personal(account){return {saved:(await query('select publication_id from customer_saved_publications where customer_id=$1',[account.id])).rows.map(r=>r.publication_id),requests:(await query(`select r.id,r.publication_id,r.state,r.created_at,p.title,b.name business_name from customer_program_requests r join customer_publications p on p.id=r.publication_id join businesses b on b.id=r.business_id where r.customer_id=$1 order by r.created_at desc limit 100`,[account.id])).rows};}
async function requestProgram(account,id,data){
 const row=await detail(id);if(!['STAMP','AFFILIATION'].includes(row.kind))throw badRequest('Esta publicación no recibe solicitudes de afiliación.');
 if((await query('select 1 from customer_business_blocks where customer_id=$1 and business_id=$2',[account.id,row.business_id])).rowCount)throw badRequest('Primero permite invitaciones de este negocio.');
 await require('./customerIdentityService').assertCompatible(account.id,data.document_id,{query});
 const r=(await query(`insert into customer_program_requests(customer_id,publication_id,business_id,document_id,message) values($1,$2,$3,$4,$5)
 on conflict(customer_id,publication_id) where state in ('PENDING','INVITED') do update set publication_id=excluded.publication_id returning id,state`,[account.id,id,row.business_id,data.document_id,data.message])).rows[0];
 await event(account,id,'REQUEST');return {request:r};
}
async function businessRequests(user){return {requests:(await query(`select r.id,r.state,r.document_id,r.message,r.created_at,a.full_name,a.email,a.public_id,p.title,p.kind
 from customer_program_requests r join customer_accounts a on a.id=r.customer_id join customer_publications p on p.id=r.publication_id where r.business_id=$1 order by r.created_at desc limit 100`,[user.business_id])).rows};}
async function decideRequest(user,id,data){
 return withTransaction(async db=>{
  const r=(await db.query(`select r.*,a.public_id,p.kind,p.resource_id from customer_program_requests r join customer_accounts a on a.id=r.customer_id join customer_publications p on p.id=r.publication_id where r.id=$1 and r.business_id=$2 for update of r`,[id,user.business_id])).rows[0];
  if(!r)throw notFound();if(r.state==='INVITED'&&data.action==='INVITE')return {ok:true,existing:true};if(r.state!=='PENDING')throw badRequest('La solicitud ya fue atendida.');
  let invitation=null;
  if(data.action==='INVITE'){
   if(!data.identity_checked)throw badRequest('Verifica la identidad y el documento antes de vincular registros.');
   invitation=(await network.send(user,{request_id:r.id,public_id:r.public_id,kind:r.kind,resource_id:r.resource_id,document_id:r.document_id,identity_checked:true,message:data.message||'Confirmamos tu solicitud. Acepta la invitación para incorporar tu tarjeta.',terms:''},{client:db})).invitation;
  }
  await db.query('update customer_program_requests set state=$2,invitation_id=$3,decided_at=now() where id=$1',[id,invitation?'INVITED':'REJECTED',invitation?.id||null]);return {ok:true};
 });
}
async function giftOrder(account,id,data){const row=await detail(id);if(row.kind!=='GIFT')throw badRequest('Selecciona una publicación de giftcards.');return wallet.createGiftOrder(account,{...data,business_id:row.business_id},{publishedOffer:true});}
async function launch(account,id){const p=await detail(id);if(p.kind!=='ACTIVITY')throw badRequest('Selecciona una actividad.');await event(account,id,'LAUNCH');return {url:new URL('/activacion/'+encodeURIComponent(p.public_slug)+'?customer_publication='+p.id,env.publicAppUrl).toString()};}
async function participate(account,id,body,complete){
 const row=await detail(id);if(row.kind!=='ACTIVITY')throw notFound();
 return participateResource(account,row,id,body,complete);
}
async function participateInvitation(account,id,body,complete){
 const row=(await query(`select a.id resource_id,a.public_slug,a.status,a.ends_at,b.is_active,to_jsonb(b) business
   from customer_invitations i join interactive_activations a on a.id=i.resource_id and a.company_id=i.business_id
   join businesses b on b.id=i.business_id
   where i.id=$1 and i.customer_id=$2 and i.kind='ACTIVITY' and i.state='ACCEPTED'`,[id,account.id])).rows[0];
 if(!row)throw notFound('Invitación de actividad no encontrada.');
 const plan=planFromBusiness(row.business);
 if(!row.is_active||row.status!=='active'||(row.ends_at&&new Date(row.ends_at)<=new Date())||!plan.portal_access_allowed||plan.raw_status!=='ACTIVE')throw badRequest('Esta actividad ya no está disponible.');
 return participateResource(account,row,null,body,complete);
}
async function participateResource(account,row,publicationId,body,complete){
 return withTransaction(async db=>{
  await db.query('select pg_advisory_xact_lock(hashtext($1))',[`customer-play:${account.id}:${row.resource_id}`]);
  const own=(await db.query('select * from customer_activation_participations where customer_id=$1 and activation_id=$2',[account.id,row.resource_id])).rows[0];
  if(body.participant_id&&body.participant_id!==own?.participant_id)throw forbidden('La participación no pertenece a tu cuenta.');
  if(own?.result){const reward=own.result.qr_code?.id;if(reward){const q=(await db.query('select status,expires_at from qr_codes where id=$1',[reward])).rows[0];if(!q||q.status!=='ACTIVE'||(q.expires_at&&new Date(q.expires_at)<=new Date()))throw badRequest('Consulta el estado actual de este beneficio en Mis tarjetas.');}return own.result;}
  if(own&&!complete){const p=(await db.query('select * from interactive_activation_participants where id=$1',[own.participant_id])).rows[0];return {participant:p,game_session_token:p.game_session_token};}
  const nonce=crypto.randomUUID();
  const payload={...body,email:account.email,metadata:{...(body.metadata||{}),customer_provenance:nonce}};
  if(own)payload.participant_id=own.participant_id;
  const result=await (complete?activationService.completeInteractiveParticipant:activationService.startInteractiveParticipant)(row.public_slug,payload,{client:db});
  const participant=(await db.query('select id,metadata from interactive_activation_participants where id=$1 and activation_id=$2',[result.participant.id,row.resource_id])).rows[0];
  if(!participant||(own?participant.id!==own.participant_id:participant.metadata?.customer_provenance!==nonce))throw forbidden('Esa participación anterior no está vinculada a tu cuenta. Consulta con el negocio.');
  const safe={...result};delete safe.credit_account;
  await db.query(`insert into customer_activation_participations(customer_id,activation_id,publication_id,participant_id,result) values($1,$2,$3,$4,$5::jsonb)
   on conflict(customer_id,activation_id) do update set result=excluded.result`,[account.id,row.resource_id,publicationId,participant.id,complete||result.rewarded?JSON.stringify(safe):null]);
  return safe;
 });
}
async function shareQr(id){const p=await detail(id),url=publicRow(p).url;return {url,qr_image:await qr.toDataURL(url)};}
async function following(account){
 const rows=(await query(businessSelect+` join customer_favorites f on f.business_id=b.id where f.customer_id=$1 and ${visibleBusinessSql} order by b.name,b.id limit 100`,[account.id])).rows;
 return {businesses:rows.filter(businessAvailable).map(b=>({id:b.id,slug:b.slug,name:b.name,city:b.city,description:b.description}))};
}
async function earned(account){
 const rows=(await query("select cp.publication_id,cp.created_at,ip.status,a.title,b.name business_name,r.reward_label,r.qr_code_id,q.status qr_status,q.expires_at,da.title asset_title,dl.download_token from customer_activation_participations cp join interactive_activation_participants ip on ip.id=cp.participant_id join interactive_activations a on a.id=cp.activation_id join businesses b on b.id=a.company_id left join interactive_activation_rewards r on r.participant_id=cp.participant_id left join qr_codes q on q.id=r.qr_code_id left join interactive_activation_asset_downloads dl on dl.reward_id=r.id left join digital_assets da on da.id=dl.asset_id and da.is_active where cp.customer_id=$1 order by cp.created_at desc limit 100",[account.id])).rows;
 return {participations:rows.map(({download_token,...r})=>({...r,download_url:r.asset_title&&download_token?new URL('/api/public/activations/download/'+encodeURIComponent(download_token),env.publicAppUrl).toString():null}))};
}
async function resolveQr(input){
 let url;try{url=new URL(input,env.publicAppUrl);}catch{throw badRequest('No reconocemos este enlace.');}
 const allowed=new Set([new URL(env.publicAppUrl).origin,'https://gosqori.com','https://www.gosqori.com']);
 if(!allowed.has(url.origin))throw badRequest('Escanea un QR público de Qori.');
 const match=url.hash.match(/^#publication\/([a-f0-9-]{36})$/i);if(match){await detail(match[1]);return {hash:'#publication/'+match[1]};}
 const slug=url.pathname.match(/^\/activacion\/([^/]+)\/?$/)?.[1];
 const program=url.pathname==='/sellos/inscripcion.html'?url.searchParams.get('programa'):null;
 const row=(await query(`select p.id from customer_publications p left join interactive_activations a on p.kind='ACTIVITY' and a.id=p.resource_id where (a.public_slug=$1 or (p.kind='STAMP' and p.resource_id::text=$2)) and p.status='PUBLISHED' limit 1`,[slug||'',program||''])).rows[0];
 if(!row)throw badRequest('Este QR no corresponde a una publicación disponible. Tus tickets personales se consultan en Mis tarjetas.');
 await detail(row.id);return {hash:'#publication/'+row.id};
}
module.exports={detail,directory,feed,get,businessPage,followBusiness,catalog,publish,publicationState,save,event,personal,requestProgram,businessRequests,decideRequest,giftOrder,launch,participate,participateInvitation,shareQr,resolveQr,eligibility,earned,following};
