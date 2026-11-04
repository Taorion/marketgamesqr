const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='sources-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app');
let server,base,buyer,other,book,otherBook,usd,business,product,pub,plan;const uuid=()=>crypto.randomUUID();
async function account(){const a=(await query("insert into customer_accounts(email,full_name,currency,timezone) values($1,'Budget QA','COP','America/Bogota') returning *",[uuid()+'@example.test'])).rows[0],token=crypto.randomBytes(32).toString('base64url');await query("insert into customer_sessions(customer_id,token_hash,device_name,expires_at) values($1,$2,'QA',now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...a,token};}
async function api(path,body,method=body?'POST':'GET',selected=book?.id,user=buyer){const r=await fetch(base+'/api/customer'+path,{method,headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',...(selected?{'X-Qori-Book':selected}:{})},...(body?{body:JSON.stringify(body)}:{})});return {http:r.status,...await r.json()};}
test('published products become private budget references without paying or reserving stock',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 buyer=await account();other=await account();book=(await api('/finance-books')).books[0];otherBook=(await api('/finance-books',{request_id:uuid(),name:'Casa',currency:'COP'})).book;usd=(await api('/finance-books',{request_id:uuid(),name:'USD',currency:'USD'})).book;
 business=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values('Presupuestos QA',$1,'PRO','ACTIVE',$2::jsonb) returning *",[uuid(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];
 await query("insert into customer_directory(business_id,published) values($1,true)",[business.id]);
 product=(await query("insert into business_inventory_products(business_id,internal_id,name,status,stock_quantity,unit_price,cost_price,currency) values($1,'PLAN','Café','ACTIVE',10,100,30,'COP') returning *",[business.id])).rows[0];
 pub=(await query("insert into customer_publications(business_id,kind,resource_id,title,status) values($1,'PRODUCT',$2,'Café publicado','PUBLISHED') returning *",[business.id,product.id])).rows[0];
 await query("insert into customer_product_offers(publication_id,price,terms,payment_instructions,valid_days) values($1,80,'Condiciones publicadas QA','Pagar al negocio',30)",[pub.id]);
 const data={request_id:uuid(),publication_id:pub.id,quantity:3,expected_unit_price:'80',target_date:null};
 await t.test('snapshot uses server price, concurrent retries reuse one plan and projections include it',async()=>{
  const rows=await Promise.all([api('/purchases/from-publication',data),api('/purchases/from-publication',data)]);for(const r of rows)assert.equal(r.http,200,JSON.stringify(r));plan=rows[0].plan;assert.equal(rows[1].plan.id,plan.id);assert.equal(Number(plan.estimated_amount),240);assert.equal(plan.source_snapshot.quantity,3);assert.equal(Number(plan.source_snapshot.unit_price),80);assert.equal(Number(plan.source_snapshot.regular_price),100);
  assert.equal((await query('select count(*)::int n from customer_entries where customer_id=$1',[buyer.id])).rows[0].n,0);assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[business.id])).rows[0].n,0);assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[product.id])).rows[0].stock_quantity),10);
  assert.equal((await api('/finance-home')).planned_minor,24000);assert.ok((await api('/discovery/me')).saved.includes(pub.id));
 });
 await t.test('price changes are visible and only explicit recalculation changes the estimate',async()=>{
  await query('update customer_product_offers set price=90 where publication_id=$1',[pub.id]);
  const p=(await api('/purchases')).plans.find(p=>p.id===plan.id);assert.equal(p.source.price_changed,true);assert.equal(Number(p.estimated_amount),240);
  assert.equal((await api('/purchases/from-publication',{...data,request_id:uuid()})).http,400);
  assert.equal((await api('/purchases/from-publication',data)).plan.id,plan.id);
  const r=await api('/purchases/'+plan.id+'/source',{revision:plan.revision,quantity:2,expected_unit_price:'90'},'PUT');assert.equal(r.http,200,JSON.stringify(r));plan=r.plan;assert.equal(Number(plan.estimated_amount),180);
  assert.equal((await api('/purchases/'+plan.id+'/source',{revision:1,quantity:2,expected_unit_price:'90'},'PUT')).http,400);
 });
 await t.test('unpublished and foreign references cannot be created or altered; history survives removal',async()=>{
  assert.equal((await api('/purchases/'+plan.id+'/source',{revision:plan.revision,quantity:2,expected_unit_price:'90'},'PUT',otherBook.id)).http,404);
  assert.equal((await api('/purchases/'+plan.id+'/source',{revision:plan.revision,quantity:2,expected_unit_price:'90'},'PUT',undefined,other)).http,404);
  assert.equal((await api('/purchases/from-publication',{...data,request_id:uuid(),expected_unit_price:'90'},'POST',usd.id)).http,400);
  await query("update customer_publications set status='PAUSED' where id=$1",[pub.id]);assert.equal((await api('/purchases/from-publication',{...data,request_id:uuid(),expected_unit_price:'90'})).http,404);
  let p=(await api('/purchases')).plans.find(p=>p.id===plan.id);assert.equal(p.source.available,false);assert.equal(Number(p.estimated_amount),180);
  await query('delete from customer_publications where id=$1',[pub.id]);p=(await api('/purchases')).plans.find(p=>p.id===plan.id);assert.equal(p.source_publication_id,null);assert.equal(p.source_snapshot.product_name,'Café');assert.equal(p.source.available,false);
 });
 await t.test('source columns remain private from public database roles',async()=>{
  for(const role of ['anon','authenticated']){const db=await pool.connect();try{await db.query('begin');if(!(await db.query('select 1 from pg_roles where rolname=$1',[role])).rowCount)await db.query('create role '+role+' nologin');await db.query('set local role '+role);await assert.rejects(db.query('select source_snapshot from customer_purchase_plans limit 1'),e=>e.code==='42501');}finally{await db.query('rollback');db.release();}}
 });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(buyer)await query('delete from customer_accounts where id=any($1::uuid[])',[[buyer.id,other.id]]);if(business)await query('delete from businesses where id=$1',[business.id]);await pool.end();});
