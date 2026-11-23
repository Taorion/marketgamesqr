const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55439/stamp_cards_qa';process.env.DB_SSL='false';process.env.JWT_SECRET='stamp-sale-qa-only';
const {query,pool}=require('../backend/src/config/db'),svc=require('../backend/src/services/stampCardService');
const {listAttributedSales}=require('../backend/src/services/attributedSalesService');
const {getCommandCenterAnalytics,clearCommandCenterAnalyticsCache}=require('../backend/src/services/commandCenterAnalyticsService');
const {canonicalSalesUnionSql}=require('../backend/src/services/metricsService');
const {listLeadCrmRows}=require('../backend/src/services/leadCrmService');
const filters={from:'2020-01-01',to:'2030-12-31'};
test('confirmed stamp purchases reach canonical revenue once',{skip:process.env.STAMP_CARD_INTEGRATION!=='1'},async t=>{
 const biz=async()=> (await query(`insert into businesses(name,slug,plan_code,subscription_status,settings) values ('Sello venta QA',$1,'PRO','ACTIVE','{"subscription":{"lifetime_access":true,"monthly_payment_required":false}}') returning *`,[crypto.randomUUID()])).rows[0];
 const b=await biz(),other=await biz();
 const user=async(role)=> (await query(`insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'test',$3,$4) returning *`,[b.id,crypto.randomUUID()+'@example.test',role,role])).rows[0];
 const owner=await user('BUSINESS_OWNER'),seller=await user('BUSINESS_SELLER');
 const product=async(business,name)=>(await query(`insert into business_inventory_products(business_id,internal_id,name,unit_price,cost_price,stock_quantity) values($1,$2,$3,6000,2000,100) returning *`,[business,crypto.randomUUID(),name])).rows[0];
 const coffee=await product(b.id,'Café comprado'),cake=await product(b.id,'Torta'),foreign=await product(other.id,'Ajeno');
 const rules={name:'Café con sellos',stamps_required:8,benefit_type:'FREE_GIFT',benefit_value:{label:'Premio café'},purchase_product:{inventory_product_id:coffee.id},minimum_purchase:5000,one_per_day:false,allow_manual:true,card_valid_days:365,ticket_valid_days:30,reward_cost:1000,ticket_cost:1000,terms:'Un sello por compra.',status:'ACTIVE'};
 const p=await svc.saveProgram(b.id,owner.id,rules),{member:m}=await svc.enroll(b.id,owner.id,{program_id:p.id,name:'Cliente venta QA',document_id:'QA-SALE-123'});
 await query('update players set seller_user_id=$2 where business_id=$1',[b.id,seller.id]);
 const initial=await svc.validatorCard(b.id,m.id),purchase={inventory_product_id:coffee.id,quantity:2,sale_amount:12000};
 const payload={cycle_id:initial.card.cycle_id,expected_stamps:0,expected_voids:0,purchase};
 const stock=async()=>Number((await query('select stock_quantity from business_inventory_products where id=$1',[coffee.id])).rows[0].stock_quantity);
 const sales=async()=> (await query('select * from business_sales where business_id=$1 order by created_at,id',[b.id])).rows;
 let result,existing;
 await t.test('read-only card returns the exact required product and no sale is created',async()=>{
  assert.deepEqual(initial.purchase.products.map(p=>p.id),[coffee.id]);assert.equal((await sales()).length,0);assert.equal(initial.card.stamps,0);
  await getCommandCenterAnalytics(b.id);assert.equal((await getCommandCenterAnalytics(b.id)).cache.hit,true);
 });
 await t.test('concurrent confirmations create one paid sale, one stamp and one inventory debit',async()=>{
  const responses=await Promise.all([1,2,3].map(()=>svc.stampFromQr(b.id,owner.id,m.id,payload)));result=responses.find(r=>!r.duplicate);
  assert.equal(responses.filter(r=>!r.duplicate).length,1);assert.equal((await sales()).length,1);assert.equal(result.card.stamps,1);assert.equal(await stock(),98);
  const sale=(await sales())[0];assert.equal(sale.seller_user_id,seller.id);assert.equal(sale.created_by_user_id,owner.id);assert.equal(sale.sale_status,'PAID');assert.equal(sale.inventory_product_id,coffee.id);
  assert.equal(Number(sale.product_cost_total),4000);assert.equal(Number(sale.gross_profit),8000);assert.equal(sale.metadata.products[0].quantity,2);
  assert.equal((await query('select sale_id from stamp_events where member_id=$1',[m.id])).rows[0].sale_id,sale.id);
 });
 await t.test('stamp dashboard, sales filters, CRM and Revenue Center expose the same purchase',async()=>{
  const dashboard=await svc.dashboard(b.id,filters);assert.equal(Number(dashboard.metrics.linked_sales),12000);
  const listed=await listAttributedSales({businessId:b.id,filters:{source:'STAMP_CARD'}});assert.equal(listed.sales.length,1);assert.equal(Number(listed.summary.attributed_revenue),12000);
  const revenue=await getCommandCenterAnalytics(b.id);assert.equal(revenue.cache.hit,false);assert.equal(revenue.totals.sales_count,1);assert.equal(revenue.totals.revenue,12000);assert.ok(revenue.channel_performance.some(c=>c.revenue===12000));
  const crm=await listLeadCrmRows(b.id,{search:'QA-SALE-123'});assert.ok(JSON.stringify(crm).includes('12000'));
 });
 await t.test('bad product, tenant, minimum, and missing purchase leave sale, stamp and stock unchanged',async()=>{
  for(const invalid of [undefined,{...purchase,inventory_product_id:foreign.id},{...purchase,inventory_product_id:cake.id},{...purchase,sale_amount:100},{...purchase,quantity:0}])await assert.rejects(()=>svc.stampFromQr(b.id,owner.id,m.id,{...payload,expected_stamps:1,purchase:invalid}));
  await assert.rejects(()=>svc.stampFromQr(other.id,owner.id,m.id,payload),/no encontrada/);
  assert.equal((await sales()).length,1);assert.equal(await stock(),98);assert.equal((await svc.validatorCard(b.id,m.id)).card.stamps,1);
 });
 await t.test('an already recorded purchase is linked without another sale or inventory debit',async()=>{
  existing=(await query(`insert into business_sales(business_id,customer_document_id,product_name,inventory_product_id,sale_amount,sale_status,paid_at) values($1,$2,'Café comprado',$3,7000,'PAID',now()) returning *`,[b.id,m.document_key,coffee.id])).rows[0];
  assert.equal((await svc.validatorCard(b.id,m.id)).card.stamps,1);
  assert.ok((await svc.validatorCard(b.id,m.id)).purchase.existing_sales.some(s=>s.id===existing.id));
  const linked=await svc.stampFromQr(b.id,owner.id,m.id,{...payload,expected_stamps:1,purchase:{existing_sale_id:existing.id}});assert.equal(linked.sale.linked_existing,true);assert.equal(linked.card.stamps,2);assert.equal((await sales()).length,2);assert.equal(await stock(),98);
  await assert.rejects(()=>svc.stampFromQr(b.id,owner.id,m.id,{...payload,expected_stamps:2,purchase:{existing_sale_id:existing.id}}),/ya tiene/);
  assert.equal(Number((await svc.dashboard(b.id,filters)).metrics.linked_sales),19000);assert.equal((await getCommandCenterAnalytics(b.id)).totals.revenue,19000);
 });
 await t.test('daily rejection rolls back a newly attempted sale and stock movement',async()=>{
  const daily=await svc.saveProgram(b.id,owner.id,{...rules,one_per_day:true}),{member:dm}=await svc.enroll(b.id,owner.id,{program_id:daily.id,name:'Cliente diario',document_id:'DAILYSALE'});
  const dc=await svc.validatorCard(b.id,dm.id),dp={...payload,cycle_id:dc.card.cycle_id};await svc.stampFromQr(b.id,owner.id,dm.id,dp);const count=(await sales()).length,before=await stock();
  await assert.rejects(()=>svc.stampFromQr(b.id,owner.id,dm.id,{...dp,expected_stamps:1}),/hoy/);assert.equal((await sales()).length,count);assert.equal(await stock(),before);
 });
 await t.test('voiding the canonical sale reverses its stamp; sales never generate new stamps',async()=>{
  await query("update business_sales set sale_status='VOIDED' where id=$1",[result.sale.id]);assert.equal((await svc.validatorCard(b.id,m.id)).card.stamps,1);
  const sum=(await query(`with sales as (${canonicalSalesUnionSql()}) select sum(sale_amount) as amount from sales where business_id=$1`,[b.id])).rows[0];assert.equal(Number(sum.amount),19000);
  await query("update business_sales set sale_status='PAID' where id=$1",[result.sale.id]);assert.equal((await svc.validatorCard(b.id,m.id)).card.stamps,1);
 });
 await t.test('HTTP requires an explicit purchase and validates payloads before recording',async()=>{
  const {app}=require('../backend/src/app'),jwt=require('jsonwebtoken');const server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s));});
  try{const url=`http://127.0.0.1:${server.address().port}/api/business/stamp-cards/validator/${m.id}/stamp`,headers={'Content-Type':'application/json',Authorization:'Bearer '+jwt.sign({sub:owner.id,password_version:0},process.env.JWT_SECRET)};
   assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})).status,401);
   assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify({cycle_id:payload.cycle_id,expected_stamps:1})})).status,400);
   assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify({...payload,purchase:{...purchase,sale_amount:-1}})})).status,400);
   const base=`http://127.0.0.1:${server.address().port}`,analyticsUrl=base+'/api/business/analytics/command-center';
   const beforeResponse=await fetch(analyticsUrl,{headers});assert.equal(beforeResponse.status,200);const before=await beforeResponse.json();
   const card=await svc.validatorCard(b.id,m.id);
   const confirmed=await fetch(url,{method:'POST',headers,body:JSON.stringify({cycle_id:card.card.cycle_id,expected_stamps:card.card.stamps,expected_voids:card.card.void_count,purchase:{inventory_product_id:coffee.id,quantity:1,sale_amount:6000}})});
   assert.equal(confirmed.status,200);const after=await(await fetch(analyticsUrl,{headers})).json();assert.equal(after.totals.revenue-before.totals.revenue,6000);assert.equal(after.totals.sales_count-before.totals.sales_count,1);
  }finally{await new Promise(r=>server.close(r));}
 });
});
after(()=>pool.end());
