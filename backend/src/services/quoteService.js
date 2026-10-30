const crypto = require('crypto');
const sharp = require('sharp');
const QRCode = require('qrcode');
const { query, withTransaction } = require('../config/db');
const { env } = require('../config/env');
const { badRequest, notFound } = require('../utils/http');
const { resolveLead, listLeadCrmRows } = require('./leadCrmService');
const { syncSaleProductsWithCatalog } = require('./productCatalogService');
const { resolveBusinessSaleSeller } = require('./sellerService');
const { storedLogo } = require('./quoteImageService');

const round = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const link = token => new URL(`/cotizacion/#${token}`, env.publicAppUrl).href;
const expired = q => new Date(q.valid_until).getTime() < Date.now();
const displayStatus = q => ['SENT','ACCEPTED'].includes(q.status) && expired(q) ? 'EXPIRED' : q.status;
const safeColor = color => /^#[\da-f]{6}$/i.test(color || '') ? color : '#173e39';

async function normalizeImage(data) {
  if (!data) return null;
  try {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(String(data).split(',')[1] || '', 'base64');
    if (!bytes.length || bytes.length > 2000000) throw new Error('size');
    const output = await sharp(bytes, { limitInputPixels: 16000000 }).rotate().resize(1000, 1000, { fit:'inside', withoutEnlargement:true }).png().toBuffer();
    return `data:image/png;base64,${output.toString('base64')}`;
  } catch { throw badRequest('No se pudo preparar una imagen. Vuelve a cargar el logo o la foto en formato JPG, PNG o WebP.'); }
}

function calculate(items) {
  let subtotal = 0, discount = 0, taxes = 0;
  const lines = items.map(item => {
    const gross = round(item.unit_price * item.quantity);
    const reduction = round(gross * item.discount_percent / 100);
    const tax = round((gross - reduction) * item.tax_percent / 100);
    subtotal = round(subtotal + gross); discount = round(discount + reduction); taxes = round(taxes + tax);
    return { ...item, subtotal:gross, discount:reduction, tax, line_total:round(gross - reduction + tax) };
  });
  const total = round(subtotal - discount + taxes);
  if (!Number.isFinite(total) || total <= 0 || total > 999999999999) throw badRequest('Revisa el total de la cotización.');
  return { items:lines, subtotal, discount, taxes, total, currency:'COP' };
}

async function products(businessId, search = '') {
  return (await query(`select p.id,p.name,p.description,p.sku,p.unit_price,p.currency,
    exists(select 1 from business_inventory_product_photos ph where ph.product_id=p.id and ph.business_id=p.business_id) as has_photo
    from business_inventory_products p where p.business_id=$1 and p.status='ACTIVE' and p.currency='COP'
    and (p.name ilike $2 or p.sku ilike $2) order by p.name,p.id limit 100`, [businessId, `%${search}%`])).rows;
}
async function contacts(businessId, search = '') {
  const result = await listLeadCrmRows(businessId, { search, limit:60 });
  return result.leads.map(c => ({ id:c.id, source_type:c.source_type, name:c.name, email:c.email, phone:c.phone,
    document_id:c.document_id||'', organization:c.organization||'' }));
}
async function context(businessId) {
  const [business, activations] = await Promise.all([
    query(`select name,settings->>'logo_data_url' as logo,settings->>'logo_url' as logo_url from businesses where id=$1`, [businessId]),
    query(`select id,title,description,terms,ends_at from interactive_activations where company_id=$1 and status='active'
      and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()) order by title limit 200`, [businessId])
  ]);
  return { business:business.rows[0], activations:activations.rows };
}

async function save(businessId, userId, data, id) {
  return withTransaction(async client => {
    let old;
    if (id) {
      old = (await client.query('select * from business_quotes where business_id=$1 and id=$2 for update', [businessId,id])).rows[0];
      if (!old) throw notFound('Cotización no encontrada.');
      if (old.status !== 'DRAFT') throw badRequest('La cotización emitida conserva sus condiciones. Crea una nueva versión.');
    } else {
      await client.query('select pg_advisory_xact_lock(hashtext($1))',[`quote:${businessId}:${data.request_id}`]);
      const duplicate = (await client.query('select id from business_quotes where business_id=$1 and request_id=$2',[businessId,data.request_id])).rows[0];
      if (duplicate) return detail(businessId,duplicate.id,client);
    }
    if (new Date(data.valid_until).getTime() <= Date.now()) throw badRequest('La vigencia debe estar en el futuro.');
    const business = (await client.query('select name,settings from businesses where id=$1', [businessId])).rows[0];
    if (!business) throw notFound('Negocio no encontrado.');
    let customer = data.customer;
    if (data.contact_id) {
      const lead = await resolveLead(businessId,data.contact_id,data.contact_source,client);
      customer = { name:lead.name, email:lead.email||'', phone:lead.phone||'', document_id:lead.document_id||'', organization:lead.organization||'' };
    }
    if (!customer?.name?.trim()) throw badRequest('Selecciona un cliente o escribe su nombre.');
    const ids = data.items.map(i=>i.product_id);
    if (new Set(ids).size !== ids.length) throw badRequest('Agrupa las cantidades del mismo producto en una sola línea.');
    const found = (await client.query(`select p.id,p.name,p.description,p.sku,p.unit_price,p.currency,ph.image_data
      from business_inventory_products p left join business_inventory_product_photos ph on ph.product_id=p.id and ph.business_id=p.business_id
      where p.business_id=$1 and p.id=any($2::uuid[]) and p.status='ACTIVE'`, [businessId,ids])).rows;
    const items = [];
    for (const input of data.items) {
      const product = found.find(p=>p.id===input.product_id);
      if (!product || product.currency !== 'COP') throw badRequest('Selecciona productos activos de tu negocio en COP.');
      items.push({ ...input, name:product.name, description:(product.description||'').slice(0,600), sku:product.sku||'',
        unit_price:input.unit_price ?? Number(product.unit_price), photo:await normalizeImage(product.image_data) });
    }
    let benefit = null;
    if (data.activation_id) {
      const activation = (await client.query(`select * from interactive_activations where id=$1 and company_id=$2 and status='active'
        and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())`, [data.activation_id,businessId])).rows[0];
      if (!activation) throw badRequest('La activación no está disponible en tu negocio.');
      if (activation.ends_at && new Date(data.valid_until)>new Date(activation.ends_at)) throw badRequest('La cotización no puede vencer después de la activación.');
      benefit = { title:activation.title, description:data.benefit_description || activation.description || activation.title,
        terms:activation.terms||'', timing:data.benefit_timing, expires_at:activation.ends_at };
    }
    const settings = business.settings || {};
    const snapshot = { title:data.title, customer, business:{ name:business.name, logo:await normalizeImage(await storedLogo(settings,env.publicAppUrl)),
      color:safeColor(settings.brand_primary), nit:settings.nit||'', phone:settings.phone||'', email:settings.contact_email||settings.email||'',
      address:settings.address||'', city:settings.city||'', slogan:settings.slogan||settings.tagline||'' },
      ...calculate(items), benefit, terms:data.terms, payment_terms:data.payment_terms, delivery_terms:data.delivery_terms };
    if(Buffer.byteLength(JSON.stringify(snapshot))>16000000)throw badRequest('Las fotos superan el tamaño permitido para una cotización. Reduce su tamaño en Inventario o divide los productos en dos propuestas.');
    const values = [businessId, userId, data.contact_id||null, data.contact_source||null, data.activation_id||null,
      data.valid_until, JSON.stringify(snapshot), data.request_id];
    let row;
    if (old) {
      row = (await client.query(`update business_quotes set contact_id=$3,contact_source=$4,activation_id=$5,
        valid_until=$6,snapshot=$7::jsonb,updated_at=now() where business_id=$1 and id=$2 returning *`,
        [businessId,id,data.contact_id||null,data.contact_source||null,data.activation_id||null,data.valid_until,JSON.stringify(snapshot)])).rows[0];
    } else {
      row = (await client.query(`insert into business_quotes (business_id,created_by,contact_id,contact_source,activation_id,valid_until,snapshot,request_id)
        values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8) returning *`, values)).rows[0];
    }
    return expose(row);
  });
}

function expose(q) {
  return { id:q.id, number:q.number, status:displayStatus(q), created_at:q.created_at, valid_until:q.valid_until,
    issued_at:q.issued_at, accepted_at:q.accepted_at, first_viewed_at:q.first_viewed_at, sale_id:q.sale_id,
    contact_id:q.contact_id, contact_source:q.contact_source, activation_id:q.activation_id, snapshot:q.snapshot,
    public_url:q.status!=='DRAFT' && q.status!=='CANCELLED' ? link(q.public_token) : null };
}
async function detail(businessId,id,client={query}) {
  const q = (await client.query('select * from business_quotes where business_id=$1 and id=$2',[businessId,id])).rows[0];
  if (!q) throw notFound('Cotización no encontrada.');
  const result=expose(q);
  if(result.public_url && q.activation_id){
    result.benefit_url=new URL(`/api/public/quotes/${q.public_token}/benefit`,env.publicAppUrl).href;
    result.qr_image=await QRCode.toDataURL(result.benefit_url,{width:280,margin:2,errorCorrectionLevel:'M'});
  }
  return result;
}
async function list(businessId,offset=0,search='',status='ALL') {
  const number=search.trim().match(/^(?:COT[-\s]*)?0*(\d+)$/i)?.[1]||null;
  const pattern=`%${search.trim().replace(/[\\%_]/g,'\\$&')}%`;
  const effective="case when status in ('SENT','ACCEPTED') and valid_until<now() then 'EXPIRED' else status end";
  const matching=`business_id=$1 and (snapshot->'customer'->>'name' ilike $2 or snapshot->>'title' ilike $2 or number::text=$3)`;
  const [result,counts]=await Promise.all([
    query(`select id,number,${effective} as status,created_at,valid_until,issued_at,accepted_at,first_viewed_at,sale_id,
      snapshot->>'title' as title,snapshot->'customer'->>'name' as customer_name,snapshot->>'total' as total,
      jsonb_array_length(snapshot->'items') as product_count,snapshot->'benefit'->>'title' as benefit_title
      from business_quotes where ${matching} and ($4='ALL' or (${effective})=$4)
      order by created_at desc,id desc limit 31 offset $5`,[businessId,pattern,number,status,offset]),
    query(`select ${effective} as status,count(*)::int as count from business_quotes where ${matching} group by 1`,[businessId,pattern,number])
  ]);
  const summary=Object.fromEntries(counts.rows.map(r=>[r.status,r.count]));
  summary.ALL=counts.rows.reduce((sum,r)=>sum+r.count,0);
  return {quotes:result.rows.slice(0,30),has_more:result.rows.length>30,summary,total_count:summary[status]||0};
}
async function publicRow(token, client={query}, lock=false) {
  if (!/^[a-f0-9]{64}$/.test(token||'')) throw notFound('Cotización no disponible.');
  const q=(await client.query(`select * from business_quotes where public_token=$1 and status not in ('DRAFT','CANCELLED')${lock?' for update':''}`,[token])).rows[0];
  if (!q) throw notFound('Cotización no disponible.');
  return q;
}
async function publicDetail(token) {
  const q=await publicRow(token);
  await query('update business_quotes set first_viewed_at=coalesce(first_viewed_at,now()) where id=$1',[q.id]);
  const benefitUrl=new URL(`/api/public/quotes/${token}/benefit`,env.publicAppUrl).href;
  return { number:q.number,status:displayStatus(q),created_at:q.created_at,issued_at:q.issued_at,valid_until:q.valid_until,
    snapshot:q.snapshot,benefit_url:q.activation_id?benefitUrl:null,
    qr_image:q.activation_id?await QRCode.toDataURL(benefitUrl,{width:280,margin:2,errorCorrectionLevel:'M'}):null };
}
async function action(businessId,id,actionName) {
  return withTransaction(async client=>{
    const q=(await client.query('select * from business_quotes where business_id=$1 and id=$2 for update',[businessId,id])).rows[0];
    if (!q) throw notFound('Cotización no encontrada.');
    let next;
    if(actionName==='issue' && q.status==='SENT') return detail(businessId,id,client);
    if (actionName==='issue' && q.status==='DRAFT') {
      if(expired(q)) throw badRequest('Actualiza la vigencia antes de emitir.');
      if(q.activation_id) await assertActivation(client,q);
      next='SENT';
    } else if(actionName==='accept' && ['SENT','ACCEPTED'].includes(q.status) && !expired(q)) next='ACCEPTED';
    else if(actionName==='cancel' && q.status!=='CONVERTED') next='CANCELLED';
    else throw badRequest('Esta acción no está disponible para el estado actual.');
    await client.query(`update business_quotes set status=$3,updated_at=now(),
      issued_at=case when $3='SENT' then now() else issued_at end,
      accepted_at=case when $3='ACCEPTED' then coalesce(accepted_at,now()) else accepted_at end where business_id=$1 and id=$2`,[businessId,id,next]);
    if(actionName==='issue' && q.contact_id) await contactEvent(client,q,'Cotización emitida',`Cotización COT-${q.number} lista para compartir.`,null);
    return detail(businessId,id,client);
  });
}
async function respond(token,decision) {
  return withTransaction(async client=>{
    const q=await publicRow(token,client,true);
    const updated=await client.query(`update business_quotes set status=$2,accepted_at=case when $2='ACCEPTED' then now() else null end,updated_at=now()
      where id=$1 and status='SENT' and valid_until>now() returning id`,[q.id,decision]);
    if(!updated.rowCount) {
      if(q.status===decision && !expired(q)) return {status:decision};
      throw badRequest('Esta cotización ya no admite respuestas.');
    }
    return {status:decision};
  });
}
async function assertActivation(client,q) {
  const a=(await client.query(`select public_slug from interactive_activations where id=$1 and company_id=$2 and status='active'
    and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())`,[q.activation_id,q.business_id])).rows[0];
  if(!a) throw badRequest('La activación ya no está disponible. Contacta al negocio.');
  return a;
}
async function benefit(token) {
  const q=await publicRow(token);
  if(q.status==='DECLINED' || (expired(q)&&q.status!=='CONVERTED')) throw badRequest('La cotización ya no tiene un beneficio disponible.');
  if(!q.activation_id) throw notFound('Esta cotización no incluye una activación.');
  if(q.snapshot.benefit.timing==='AFTER_PAYMENT') {
    const paid=q.sale_id && (await query(`select id from business_sales where id=$1 and business_id=$2 and sale_status='PAID'`,[q.sale_id,q.business_id])).rowCount;
    if(!paid) throw badRequest('Tu beneficio se habilita cuando el negocio registre el pago de esta cotización.');
  }
  const a=await assertActivation({query},q);
  return new URL(`/activacion/${encodeURIComponent(a.public_slug)}`,env.publicAppUrl).href;
}
async function contactEvent(client,q,title,description,userId) {
  await client.query(`insert into lead_events (business_id,lead_id,source_type,source_id,event_type,event_title,event_description,metadata,created_by)
    values ($1,$2,$3,$4,'quote_updated',$5,$6,$7::jsonb,$8)`,[q.business_id,q.contact_source==='PLAYER'?q.contact_id:null,
    q.contact_source,q.contact_id,title,description,JSON.stringify({quote_id:q.id,quote_number:q.number}),userId]);
}
async function convert(businessId,user,id,paymentMethod) {
  return withTransaction(async client=>{
    const q=(await client.query('select * from business_quotes where business_id=$1 and id=$2 for update',[businessId,id])).rows[0];
    if(!q) throw notFound('Cotización no encontrada.');
    if(q.status==='CONVERTED') return detail(businessId,id,client);
    if(!['SENT','ACCEPTED'].includes(q.status)||expired(q)) throw badRequest('Solo puedes registrar el pago de una cotización vigente.');
    const s=q.snapshot;
    const lead=q.contact_id?await resolveLead(businessId,q.contact_id,q.contact_source,client):null;
    const seller=await resolveBusinessSaleSeller(client,businessId,user,lead?.seller_user_id||null);
    const saleId=crypto.randomUUID();
    // Reuse the canonical stock movement and audit service in this same transaction.
    const sync=await syncSaleProductsWithCatalog(client,businessId,user.id,s.items.map(i=>({
      inventory_product_id:i.product_id,name:i.name,quantity:i.quantity,unit_price:i.unit_price,line_total:i.line_total,currency:'COP'
    })).sort((a,b)=>a.inventory_product_id.localeCompare(b.inventory_product_id)),{
      createMissingProducts:false,sourceModule:'quotes',saleReference:saleId,inventoryMovementKey:`quote:${q.id}`
    });
    const costs=(await client.query('select id,cost_price from business_inventory_products where business_id=$1 and id=any($2::uuid[])',
      [businessId,s.items.map(i=>i.product_id)])).rows;
    const cost=round(s.items.reduce((sum,i)=>sum+Number(costs.find(p=>p.id===i.product_id)?.cost_price||0)*i.quantity,0));
    const metadata={source_module:'quotes',quote_id:q.id,quote_number:q.number,products:sync.products,line_items:sync.products,
      crm_entry:Boolean(lead),crm_source_type:q.contact_source,crm_source_id:q.contact_id,recorded_by_user_id:user.id,
      responsible_commercial:seller?{user_id:seller.id,name_snapshot:seller.full_name,email_snapshot:seller.email,role_snapshot:seller.role}:null};
    await client.query(`insert into business_sales (id,business_id,customer_name,customer_phone,customer_email,customer_document_id,
      product_name,sale_amount,currency,seller_user_id,created_by_user_id,metadata,idempotency_key,payment_method,paid_at,sale_status,
      product_cost_total,gross_profit,net_profit,acquisition_source,notes)
      values ($1,$2,$3,$4,$5,$6,$7,$8,'COP',$9,$10,$11::jsonb,$12,$13,now(),'PAID',$14,$15,$15,'QUOTATION',$16)`,
      [saleId,businessId,s.customer.name,s.customer.phone||null,s.customer.email||null,s.customer.document_id||null,
        s.items.map(i=>i.name).join(', ').slice(0,500),s.total,seller?.id||user.id,user.id,JSON.stringify(metadata),`quote:${q.id}`,
        paymentMethod,cost,round(s.total-s.taxes-cost),`Cotización COT-${q.number}`]);
    await client.query(`update business_quotes set status='CONVERTED',sale_id=$3,updated_at=now() where business_id=$1 and id=$2`,[businessId,id,saleId]);
    if(lead) await contactEvent(client,q,'Cotización convertida en venta',`Pago registrado por ${s.total} COP.`,user.id);
    return detail(businessId,id,client);
  });
}
module.exports={context,products,contacts,save,detail,list,action,respond,convert,publicDetail,publicRow,benefit,calculate,normalizeImage,expose};
