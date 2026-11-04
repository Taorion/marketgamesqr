const {withTransaction}=require('../config/db'),{badRequest,notFound}=require('../utils/http'),finance=require('./customerFinance'),explore=require('./customerExploreService');
const decimal=n=>(n/100).toFixed(2);
async function quote(account,id,quantity,expected,db){
 const p=await explore.detail(id,db);
 if(p.kind!=='PRODUCT')throw badRequest('Esta publicación no tiene un precio de producto para presupuestar.');
 if(p.product_currency!==account.finance_book.currency)throw badRequest('Selecciona un bolsillo en '+p.product_currency+' para guardar este producto.');
 const unit=finance.minor(p.product_price),total=unit*quantity;if(!Number.isSafeInteger(total)||total>99999999999999)throw badRequest('El total supera el rango permitido.');
 if(unit!==finance.minor(expected))throw badRequest('El precio publicado cambió. Abre el producto nuevamente y revisa el importe.');
 return {total,snapshot:{publication_id:p.id,business_id:p.business_id,business_name:p.business_name,business_slug:p.business_slug,product_name:p.product_name,title:p.title,currency:p.product_currency,quantity,unit_price:p.product_price,regular_price:p.product_regular_price,terms:p.product_terms,captured_at:new Date().toISOString()}};
}
async function fromPublication(account,data){return withTransaction(async db=>{
 await db.query('select id from customer_accounts where id=$1 for update',[account.id]);
 const existing=(await db.query('select *,target_date::text target_date from customer_purchase_plans where customer_id=$1 and request_id=$2',[account.id,data.request_id])).rows[0];
 if(existing){if(existing.book_id!==account.finance_book.id)throw notFound();return {plan:existing,existing:true};}
 if(data.target_date&&(data.target_date<'2000-01-01'||data.target_date>'2200-12-31'))throw badRequest('Revisa la fecha prevista.');
 const q=await quote(account,data.publication_id,data.quantity,data.expected_unit_price,db),s=q.snapshot;
 const plan=(await db.query("insert into customer_purchase_plans(customer_id,book_id,request_id,title,category,currency,estimated_amount,target_date,source_publication_id,source_snapshot) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) returning *,target_date::text target_date",[account.id,account.finance_book.id,data.request_id,(s.product_name+' · '+s.business_name).slice(0,160),data.category,s.currency,decimal(q.total),data.target_date,s.publication_id,JSON.stringify(s)])).rows[0];
 await db.query('insert into customer_saved_publications(customer_id,publication_id) values($1,$2) on conflict do nothing',[account.id,s.publication_id]);
 return {plan};
});}
async function refreshSource(account,id,data){return withTransaction(async db=>{
 const p=(await db.query('select * from customer_purchase_plans where customer_id=$1 and book_id=$2 and id=$3 for update',[account.id,account.finance_book.id,id])).rows[0];if(!p)throw notFound();
 if(p.status!=='PLANNED'||p.revision!==data.revision||!p.source_snapshot)throw badRequest('La compra cambió o no tiene un producto publicado. Actualiza la pantalla.');
 const q=await quote(account,p.source_publication_id||p.source_snapshot.publication_id,data.quantity,data.expected_unit_price,db);
 return {plan:(await db.query('update customer_purchase_plans set estimated_amount=$3,source_snapshot=$4::jsonb,revision=revision+1,updated_at=now() where customer_id=$1 and id=$2 returning *,target_date::text target_date',[account.id,id,decimal(q.total),JSON.stringify(q.snapshot)])).rows[0]};
});}
async function current(account,plan){
 if(!plan.source_snapshot)return null;
 try{const p=await explore.detail(plan.source_publication_id||plan.source_snapshot.publication_id);if(p.kind!=='PRODUCT'||p.product_currency!==plan.currency)return {available:false};
 return {available:true,unit_price:p.product_price,price_changed:finance.minor(p.product_price)!==finance.minor(plan.source_snapshot.unit_price)};
 }catch(e){if(e.status===404)return {available:false};throw e;}
}
module.exports={fromPublication,refreshSource,current};
