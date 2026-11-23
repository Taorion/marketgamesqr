const {badRequest,notFound}=require('../utils/http');
const {syncSaleProductsWithCatalog}=require('./productCatalogService');
const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const round=value=>Math.round(Number(value)*100)/100;

async function purchaseContext(client,businessId,card){
  const productId=card.rules.purchase_product?.inventory_product_id||null;
  const products=await client.query(`select id,name,unit_price,currency from business_inventory_products
    where business_id=$1 and status='ACTIVE' and currency='COP' and ($2::uuid is null or id=$2)
    order by name,id`,[businessId,productId]);
  const sales=await client.query(`select s.id,s.product_name,s.sale_amount,s.created_at,s.inventory_product_id,s.quantity,s.metadata
    from business_sales s where s.business_id=$1 and s.sale_status='PAID' and s.sale_amount>0 and s.currency='COP'
      and regexp_replace(lower(coalesce(s.customer_document_id,'')), '[^a-z0-9]', '', 'g')=$2
      and s.created_at >= $3 and not exists(select 1 from stamp_events e where e.member_id=$4 and e.sale_id=s.id and e.voided_at is null)
    order by s.created_at desc,s.id limit 30`,[businessId,card.document_key,card.member_created_at,card.id]);
  return {products:products.rows,existing_sales:sales.rows.filter(s=>qualifies(s,card.rules)).map(({metadata,inventory_product_id,...s})=>s)};
}
function qualifies(sale,rules){
  if(Number(sale.sale_amount)<Number(rules.minimum_purchase||0))return false;
  const required=rules.purchase_product?.inventory_product_id;
  if(!required)return true;
  if(sale.inventory_product_id===required&&Number(sale.quantity||1)>0)return true;
  const lines=sale.metadata?.products||sale.metadata?.line_items;
  return Array.isArray(lines)&&lines.some(p=>p.inventory_product_id===required&&Number(p.quantity)>0&&Number(p.line_total??Number(p.quantity)*Number(p.unit_price))>0);
}
async function recordStampPurchase(client,businessId,userId,member,cycle,purchase,reference){
  if(!purchase)throw badRequest('Confirma el producto y el valor de la compra para poner el sello. Actualiza la página si no aparecen.');
  if(purchase.existing_sale_id){
    const sale=(await client.query('select * from business_sales where id=$1 and business_id=$2 for update',[purchase.existing_sale_id,businessId])).rows[0];
    if(!sale||normalize(sale.customer_document_id)!==member.document_key)throw notFound('Venta no encontrada para este cliente y negocio.');
    if(sale.sale_status!=='PAID'||sale.currency!=='COP'||Number(sale.sale_amount)<=0||new Date(sale.created_at)<new Date(member.created_at)||!qualifies(sale,cycle.rules))throw badRequest('La venta debe estar pagada y cumplir las condiciones de la tarjeta.');
    const used=await client.query('select id from stamp_events where member_id=$1 and sale_id=$2 and voided_at is null',[member.id,sale.id]);
    if(used.rowCount)throw badRequest('Esta venta ya tiene un sello en este programa.');
    return {...sale,linked_existing:true};
  }
  const product=(await client.query("select * from business_inventory_products where id=$1 and business_id=$2 and status='ACTIVE' for update",[purchase.inventory_product_id,businessId])).rows[0];
  if(!product||product.currency!=='COP')throw badRequest('Selecciona un producto activo en pesos colombianos del negocio.');
  const required=cycle.rules.purchase_product?.inventory_product_id;
  if(required&&required!==product.id)throw badRequest('Selecciona el producto requerido por esta tarjeta.');
  const quantity=Number(purchase.quantity??1),amount=round(purchase.sale_amount??Number(product.unit_price)*quantity);
  if(!Number.isInteger(quantity)||quantity<1||quantity>10000||!Number.isFinite(amount)||amount<=0||amount>999999999)throw badRequest('Revisa la cantidad y el valor pagado de la compra.');
  if(amount<Number(cycle.rules.minimum_purchase||0))throw badRequest('La compra no alcanza el valor mínimo de esta tarjeta.');
  const actor=(await client.query('select id,full_name,email,role,branch_id from app_users where id=$1 and business_id=$2 and is_active=true',[userId,businessId])).rows[0];
  if(!actor)throw badRequest('El responsable de la venta no pertenece al negocio.');
  const contact=(await client.query(`select id,document_id,seller_user_id,'PLAYER' as source_type from players where business_id=$1 and regexp_replace(lower(coalesce(document_id,'')), '[^a-z0-9]', '', 'g')=$2
    union all select id,document_id,seller_user_id,'MANUAL' from business_manual_leads where business_id=$1 and regexp_replace(lower(coalesce(document_id,'')), '[^a-z0-9]', '', 'g')=$2
    union all select id,document_id,seller_user_id,'AFFILIATE' from affiliates where business_id=$1 and regexp_replace(lower(coalesce(document_id,'')), '[^a-z0-9]', '', 'g')=$2 limit 1`,[businessId,member.document_key])).rows[0];
  // Preserve an assigned commercial owner; record the actual stamping operator separately.
  const assigned=contact?.seller_user_id?(await client.query('select id,full_name,email,role from app_users where id=$1 and business_id=$2 and is_active=true',[contact.seller_user_id,businessId])).rows[0]:null;
  const seller=assigned||actor;
  const branch=actor.branch_id?(await client.query('select id from branches where id=$1 and business_id=$2 and is_active=true',[actor.branch_id,businessId])).rows[0]?.id:null;
  const key=`stamp-purchase:${member.id}:${reference}`;
  const catalog=await syncSaleProductsWithCatalog(client,businessId,userId,[{inventory_product_id:product.id,name:product.name,quantity,unit_price:amount/quantity,line_total:amount,currency:'COP'}],{createMissingProducts:false,sourceModule:'stamp_card',inventoryMovementKey:key,saleReference:key});
  const unitCost=round(product.cost_price||0),cost=round(unitCost*quantity),profit=round(amount-cost);
  const metadata={source_module:'stamp_card',category:product.category||null,stamp_program_id:member.program_id,stamp_program_name:cycle.rules.name,stamp_member_id:member.id,stamp_cycle_id:cycle.id,
    products:catalog.products,line_items:catalog.products,product_catalog_sync:true,crm_source_type:contact?.source_type||null,crm_source_id:contact?.id||null,
    recorded_by_user_id:userId,responsible_commercial:{user_id:seller.id,name_snapshot:seller.full_name,role_snapshot:seller.role}};
  const sale=(await client.query(`insert into business_sales
    (business_id,customer_name,customer_document_id,customer_phone,customer_email,product_name,inventory_product_id,quantity,sale_amount,currency,
    seller_user_id,created_by_user_id,branch_id,acquisition_source,acquisition_channel,acquisition_channel_name_snapshot,acquisition_channel_source,
    sale_status,paid_at,idempotency_key,metadata,unit_cost,product_cost_total,gross_profit,net_profit,notes,rms_source_type,rms_source_id,payment_method)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,'COP',$10,$11,$12,'STAMP_CARD',$13,$13,'SYSTEM_SPECIAL','PAID',now(),$14,$15::jsonb,$16,$17,$18,$18,$19,$20,$21,$22) returning *`,
    [businessId,member.name,contact?.document_id||member.document_key,member.phone,member.email,product.name,product.id,quantity,amount,seller.id,userId,branch||null,
      `Tarjeta de sellos · ${cycle.rules.name}`,key,JSON.stringify(metadata),unitCost,cost,profit,'Compra confirmada al poner un sello.',contact?.source_type||null,contact?.id||null,purchase.payment_method||null])).rows[0];
  return {...sale,linked_existing:false};
}
module.exports={purchaseContext,recordStampPurchase};
