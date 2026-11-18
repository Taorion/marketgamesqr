const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { z } = require('zod');
const { query, withTransaction } = require('../config/db');
const { env } = require('../config/env');
const { badRequest, notFound, forbidden } = require('../utils/http');
const { planFromBusiness } = require('./subscriptionService');
const { owned } = require('./customerBenefitOwnership');
const { consumeQrCredit } = require('./qrCreditService');
const { createSecureToken } = require('../utils/token');
const { logQrEvent } = require('./auditService');
const { syncSaleProductsWithCatalog } = require('./productCatalogService');
const SOURCE = 'AFFILIATE_CATALOG_POINTS';
const WARNING = 'Presenta tu documento de identidad físico al redimir. Debe coincidir con el titular del carné y del ticket. El QR es personal y de un solo uso.';
const key = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const identitySchema = z.object({ affiliate_id: z.string().uuid().optional(), card_token: z.string().trim().min(20).max(200).optional(), document_id: z.string().trim().min(3).max(80).optional() });
const cartSchema = identitySchema.extend({ items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(99) }).strict()).min(1).max(50) });
const issueSchema = identitySchema.extend({ request_id: z.string().uuid(), quote_token: z.string().max(40000), document_notice_accepted: z.literal(true) });
function parse(schema, input) { const r = schema.safeParse(input); if (!r.success) throw badRequest('Revisa los productos, cantidades y datos del carné.'); return r.data; }
const isPoints = c => c?.metadata?.redemption_mode === 'AFFILIATE_POINTS';

async function catalog(db, slug, lock = false, active = true) {
  const c = (await db.query(`select c.*,to_jsonb(b) business from smart_catalogs c join businesses b on b.id=c.business_id where c.slug=$1 ${lock ? 'for update of c' : ''}`, [slug])).rows[0];
  if (!c || !isPoints(c)) throw notFound('Vitrina de puntos no encontrada.');
  if (active) {
    const plan = planFromBusiness(c.business);
    if (c.status !== 'ACTIVE' || !c.business.is_active || c.business.archived_at || plan.raw_status !== 'ACTIVE' || !plan.portal_access_allowed || !plan.features.showcase || !plan.features.affiliates) throw badRequest('Esta vitrina no está disponible para nuevos canjes.');
  }
  return c;
}
async function affiliate(db, businessId, input, account, lock = false) {
  let a;
  if (account) {
    a = (await db.query(`select a.* from affiliates a where a.business_id=$1 and a.id=$2 and a.status='ACTIVE' and ${owned('AFFILIATION','a','$3')} ${lock ? 'for update of a' : ''}`, [businessId,input.affiliate_id,account.id])).rows[0];
  } else if (input.card_token && key(input.document_id)) {
    a = (await db.query(`select a.* from affiliates a where a.business_id=$1 and a.qr_token=$2 and a.status='ACTIVE' ${lock ? 'for update of a' : ''}`, [businessId,input.card_token])).rows[0];
    if (a && key(a.document_id) !== key(input.document_id)) a = null;
  }
  if (!a || !key(a.document_id)) throw forbidden('El carné y el documento deben corresponder al titular y a este negocio. Abre tu carné o entra desde tu afiliación en Customer.');
  if (account && input.document_id && key(input.document_id) !== key(a.document_id)) throw forbidden('El documento no coincide con tu afiliación.');
  return a;
}
function pointsCost(p) {
  const value = Number(p.metadata?.redemption_points_cost ?? p.inventory_points ?? 0);
  return Number.isSafeInteger(value) && value > 0 && value <= 100000000 ? value : 0;
}
async function products(db, c, lock = false) {
  const rows = (await db.query(`select p.*,ip.redemption_points_cost inventory_points,ip.status inventory_status,ip.stock_quantity inventory_stock
    from smart_catalog_products p left join business_inventory_products ip on ip.id=p.inventory_product_id and ip.business_id=p.business_id
    where p.catalog_id=$1 and p.business_id=$2 and p.stock_status<>'HIDDEN' order by p.id ${lock ? 'for update of p' : ''}`, [c.id,c.business_id])).rows;
  return rows.map(p => ({...p,points_cost:pointsCost(p),available:['AVAILABLE','LIMITED'].includes(p.stock_status) && pointsCost(p)>0 && (!p.inventory_product_id || (p.inventory_status==='ACTIVE' && Number(p.inventory_stock)>0))}));
}
async function storefront(slug) {
  const c = await catalog({query},slug);
  const rows = await products({query},c);
  return { catalog:{id:c.id,slug:c.slug,title:c.title,business_id:c.business_id,business_name:c.business.name}, notice:WARNING,
    products:rows.map(p=>({id:p.id,name:p.name,description:p.description||p.short_description,image_url:p.image_url,category:p.category,points_cost:p.points_cost,available:p.available})) };
}
async function identity(slug, input, account) {
  const c = await catalog({query},slug), a = await affiliate({query},c.business_id,parse(identitySchema,input),account);
  const tickets = (await query(`select t.id,t.snapshot,t.total_points,q.status,q.created_at,q.redeemed_at from affiliate_catalog_tickets t join qr_codes q on q.id=t.qr_code_id where t.business_id=$1 and t.affiliate_id=$2 order by t.created_at desc limit 30`,[c.business_id,a.id])).rows;
  return {affiliate:{id:a.id,name:a.full_name,points_total:Number(a.points_total),document_suffix:a.document_id.slice(-4)},business_name:c.business.name,notice:WARNING,tickets};
}
async function buildQuote(db, c, a, items) {
  const rows = await products(db,c,true), seen = new Set();
  const lines = items.map(item=>{
    if (seen.has(item.product_id)) throw badRequest('Combina las cantidades del mismo producto.');
    seen.add(item.product_id);
    const p = rows.find(p=>p.id===item.product_id);
    if (!p?.available) throw badRequest('Un producto no está disponible para canjear en esta vitrina.');
    return {product_id:p.id,inventory_product_id:p.inventory_product_id,name:p.name,quantity:item.quantity,unit_points:p.points_cost,total_points:p.points_cost*item.quantity};
  });
  const inventory = new Map();
  for (const l of lines) if (l.inventory_product_id) inventory.set(l.inventory_product_id,(inventory.get(l.inventory_product_id)||0)+l.quantity);
  for (const [id,qty] of [...inventory].sort(([a],[b])=>a.localeCompare(b))) {
    const p = (await db.query('select status,stock_quantity from business_inventory_products where id=$1 and business_id=$2 for update',[id,c.business_id])).rows[0];
    if (!p || p.status!=='ACTIVE' || Number(p.stock_quantity)<qty) throw badRequest('No hay existencias suficientes para emitir este canje.');
  }
  const total = lines.reduce((n,l)=>n+l.total_points,0);
  if (!Number.isSafeInteger(total) || total>2147483647) throw badRequest('El total de puntos es demasiado alto.');
  if (Number(a.points_total)<total) throw badRequest(`Puntos insuficientes: necesitas ${total} y tienes ${a.points_total} en este negocio.`);
  return {catalog_id:c.id,catalog_title:c.title,business_id:c.business_id,business_name:c.business.name,affiliate_id:a.id,holder_name:a.full_name,document_id:a.document_id,items:lines,total_points:total,notice:WARNING};
}
async function quote(slug, body, account) {
  const input=parse(cartSchema,body);
  return withTransaction(async db=>{
    const c=await catalog(db,slug,true),a=await affiliate(db,c.business_id,input,account,true),snapshot=await buildQuote(db,c,a,input.items);
    return {quote:snapshot,balance:Number(a.points_total),remaining_points:Number(a.points_total)-snapshot.total_points,
      quote_token:jwt.sign({purpose:SOURCE,slug,affiliate_id:a.id,items:input.items,digest:digest(snapshot)},env.jwtSecret,{expiresIn:'10m'})};
  });
}
async function renderTicket(row) {
  const url=new URL('/empresa/',env.publicAppUrl);url.searchParams.set('view','validator');url.searchParams.set('token',row.token);
  return {id:row.id,status:row.status,created_at:row.created_at,redeemed_at:row.redeemed_at,total_points:row.total_points,snapshot:row.snapshot,
    qr_image:row.status==='ACTIVE'?await QRCode.toDataURL(url.toString()):null,receipt_url:'/smart-catalog/puntos-ticket.html#'+row.token,notice:WARNING};
}
async function issue(slug, body, account) {
  const input=parse(issueSchema,body);let claim;
  try {claim=jwt.verify(input.quote_token,env.jwtSecret,{ignoreExpiration:true});} catch {throw badRequest('Revisa de nuevo el total de puntos.');}
  if (claim.purpose!==SOURCE || claim.slug!==slug) throw badRequest('La revisión no pertenece a esta vitrina.');
  const result=await withTransaction(async db=>{
    // Lock order is catalog -> affiliate -> products/inventory -> credits. The same affiliate cannot overspend.
    const c=await catalog(db,slug,true,false),a=await affiliate(db,c.business_id,input,account,true);
    if (a.id!==claim.affiliate_id) throw forbidden('Este resumen pertenece a otro carné.');
    const fingerprint=digest({affiliate:a.id,quote:claim.digest});
    const prior=(await db.query(`select t.*,q.token,q.status,q.redeemed_at from affiliate_catalog_tickets t join qr_codes q on q.id=t.qr_code_id where t.business_id=$1 and t.affiliate_id=$2 and t.request_id=$3`,[c.business_id,a.id,input.request_id])).rows[0];
    if(prior){if(prior.fingerprint!==fingerprint)throw badRequest('La solicitud ya se utilizó con otros productos.');return {row:prior,balance:Number(a.points_total),existing:true};}
    await catalog(db,slug,false,true);
    if(claim.exp*1000<=Date.now())throw badRequest('La revisión venció. Revisa el carrito otra vez.');
    const snapshot=await buildQuote(db,c,a,claim.items);
    if(digest(snapshot)!==claim.digest)throw badRequest('La oferta o el documento cambió. Revisa el carrito y confirma el nuevo total.');
    const qr=(await db.query(`insert into qr_codes(business_id,token,status,origin_type,benefit_type,benefit_value,metadata,affiliate_id,claim_required)
      values($1,$2,'ACTIVE','MANUAL_BENEFIT','CUSTOM',$3,$4,$5,false) returning *`,[c.business_id,createSecureToken(),{label:'Canje por puntos',display:snapshot.items.map(l=>`${l.quantity} × ${l.name}`).join(' · '),purchase_required:false,fulfillment:{mode:'PHYSICAL_QR',instructions:WARNING}},{source:SOURCE},a.id])).rows[0];
    try { await consumeQrCredit(db,c.business_id,qr.id,null); }
    catch(error) { if(error.message?.includes('Trafico agotado')) throw badRequest('El negocio no tiene tickets disponibles para emitir este canje. Tus puntos no se descontaron. Contacta al negocio.'); throw error; }
    const row=(await db.query(`insert into affiliate_catalog_tickets(business_id,catalog_id,affiliate_id,qr_code_id,request_id,fingerprint,total_points,snapshot,customer_id)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,[c.business_id,c.id,a.id,qr.id,input.request_id,fingerprint,snapshot.total_points,snapshot,account?.id||null])).rows[0];
    await db.query('update affiliates set points_total=points_total-$3,updated_at=now() where id=$1 and business_id=$2',[a.id,c.business_id,snapshot.total_points]);
    await db.query(`insert into affiliate_point_ledger(business_id,affiliate_id,amount,points_awarded,reason,metadata) values($1,$2,0,$3,'Canje desde vitrina de puntos',$4)`,[c.business_id,a.id,-snapshot.total_points,{source:SOURCE,ticket_id:row.id,qr_code_id:qr.id,items:snapshot.items}]);
    const reserved=[...new Set(snapshot.items.map(l=>l.inventory_product_id).filter(Boolean))].sort().map(id=>({inventory_product_id:id,name:snapshot.items.find(l=>l.inventory_product_id===id).name,quantity:snapshot.items.filter(l=>l.inventory_product_id===id).reduce((s,l)=>s+l.quantity,0),unit_price:0}));
    await syncSaleProductsWithCatalog(db,c.business_id,null,reserved,{allowZero:true,createMissingProducts:false,sourceModule:'affiliate_points_reservation',inventoryMovementKey:row.id,qrCodeId:qr.id});
    await logQrEvent(db,{business_id:c.business_id,qr_code_id:qr.id,event_type:'QR_CREATED',message:'Canje personal por puntos emitido.',metadata:{source:SOURCE,affiliate_id:a.id,total_points:snapshot.total_points,ticket_id:row.id}});
    return {row:{...row,token:qr.token,status:qr.status},balance:Number(a.points_total)-snapshot.total_points,existing:false};
  });
  return {ticket:await renderTicket(result.row),balance:result.balance,existing:result.existing};
}
async function ticket(slug,id,body,account) {
  const c=await catalog({query},slug,false,false),a=await affiliate({query},c.business_id,parse(identitySchema,body),account);
  const row=(await query(`select t.*,q.token,q.status,q.redeemed_at from affiliate_catalog_tickets t join qr_codes q on q.id=t.qr_code_id where t.id=$1 and t.business_id=$2 and t.affiliate_id=$3`,[id,c.business_id,a.id])).rows[0];
  if(!row)throw notFound('Ticket no encontrado para este carné.');
  return {ticket:await renderTicket(row)};
}
async function validatorTicket(db,qr) {
  if(qr.metadata?.source!==SOURCE)return null;
  const row=(await db.query('select * from affiliate_catalog_tickets where qr_code_id=$1 and business_id=$2 and affiliate_id=$3',[qr.id,qr.business_id,qr.affiliate_id])).rows[0];
  if(!row)throw badRequest('El ticket no tiene un canje de puntos válido.');
  return {id:row.id,...row.snapshot};
}
async function catalogsForAffiliate(account,id) {
  const a=(await query(`select a.* from affiliates a where a.id=$1 and a.status<>'DELETED' and ${owned('AFFILIATION','a','$2')}`,[id,account.id])).rows[0];
  if(!a)throw notFound('Afiliación no encontrada.');
  if(a.status!=='ACTIVE')return [];
  return catalogsForBusiness(a.business_id);
}
async function catalogsForBusiness(businessId) {
  return (await query(`select id,title,slug from smart_catalogs where business_id=$1 and status='ACTIVE' and metadata->>'redemption_mode'='AFFILIATE_POINTS' order by title`,[businessId])).rows;
}
async function receipt(token) {
  if(!/^[A-Za-z0-9_-]{43}$/.test(token||''))throw notFound('Ticket no encontrado.');
  const row=(await query(`select t.*,q.token,q.status,q.redeemed_at from affiliate_catalog_tickets t join qr_codes q on q.id=t.qr_code_id and q.business_id=t.business_id where q.token=$1`,[token])).rows[0];
  if(!row)throw notFound('Ticket no encontrado.');
  return {ticket:await renderTicket(row)};
}
// Called only after Customer ownership or the private card bearer token was validated.
async function ticketsForCard(businessId,affiliateId) {
  return (await query(`select t.id,t.total_points,q.status,q.token,t.created_at from affiliate_catalog_tickets t join qr_codes q on q.id=t.qr_code_id and q.business_id=t.business_id where t.business_id=$1 and t.affiliate_id=$2 order by t.created_at desc limit 30`,[businessId,affiliateId])).rows.map(({token,...t})=>({...t,receipt_url:'/smart-catalog/puntos-ticket.html#'+token}));
}
async function refundCancelled(db,qr,user) {
  if(qr.metadata?.source!==SOURCE)return;
  const row=(await db.query('select * from affiliate_catalog_tickets where qr_code_id=$1 and business_id=$2 for update',[qr.id,qr.business_id])).rows[0];
  if(!row)throw badRequest('Canje no encontrado.');
  if(row.refunded_at)return;
  await db.query('select id from affiliates where id=$1 and business_id=$2 for update',[row.affiliate_id,qr.business_id]);
  await db.query('update affiliates set points_total=points_total+$3,updated_at=now() where id=$1 and business_id=$2',[row.affiliate_id,qr.business_id,row.total_points]);
  await db.query(`insert into affiliate_point_ledger(business_id,affiliate_id,created_by_user_id,amount,points_awarded,reason,metadata) values($1,$2,$3,0,$4,'Devolución por anulación de canje',$5)`,[qr.business_id,row.affiliate_id,user.id,row.total_points,{source:SOURCE,ticket_id:row.id,qr_code_id:qr.id,refund:true}]);
  const inventory=new Map();for(const l of row.snapshot.items)if(l.inventory_product_id)inventory.set(l.inventory_product_id,(inventory.get(l.inventory_product_id)||0)+l.quantity);
  for(const [id,quantity] of [...inventory].sort(([a],[b])=>a.localeCompare(b))) {
    await db.query('update business_inventory_products set stock_quantity=stock_quantity+$3,updated_at=now() where id=$1 and business_id=$2',[id,qr.business_id,quantity]);
    await require('./lifecycleAuditService').recordLifecycleEvent({business_id:qr.business_id,entity_type:'INVENTORY_PRODUCT',entity_id:id,action:'RESTORED',reason:'Reserva liberada por anulación de canje por puntos',actor_user_id:user.id,idempotency_key:'points-refund:'+row.id+':'+id,metadata:{quantity,ticket_id:row.id}},db);
  }
  await db.query('update affiliate_catalog_tickets set refunded_at=now() where id=$1',[row.id]);
}
module.exports={SOURCE,WARNING,isPoints,storefront,identity,quote,issue,ticket,validatorTicket,catalogsForAffiliate,catalogsForBusiness,refundCancelled,receipt,ticketsForCard};
