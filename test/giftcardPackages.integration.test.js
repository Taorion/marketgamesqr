const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='giftcard-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool,withTransaction}=require('../backend/src/config/db'),catalog=require('../backend/src/services/packageCatalog'),payments=require('../backend/src/services/mercadoPagoService');
const uuid=()=>crypto.randomUUID();
test('giftcard packs match ticket quantities at COP 2500 and credit verified payments once',async()=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');
 assert.deepEqual(catalog.GIFTCARD_PACKAGE_OFFERS.map(p=>p.package_size),catalog.QR_PACKAGE_OFFERS.map(p=>p.package_size));assert.equal(catalog.findPackageOffer('GF5'),undefined);
 const b=(await query("insert into businesses(name,slug,plan_code,subscription_status) values('Giftcard packs QA',$1,'PENSE_EN_TI','ACTIVE') returning *",[uuid()])).rows[0];await query('insert into qori_giftcard_credit_accounts(business_id) values($1)',[b.id]);await query('insert into business_qr_credit_accounts(business_id,qr_balance) values($1,20)',[b.id]);
 let total=20;
 for(const p of catalog.GIFTCARD_PACKAGE_OFFERS){
  assert.equal(p.unit_price_cop,2500);assert.equal(p.price_cop,p.package_size*2500);
  const o=(await query("insert into qr_credit_purchase_orders(business_id,package_code,package_size,package_title,price_cop,external_reference) values($1,$2,$3,$4,$5,$6) returning *",[b.id,p.code,p.package_size,p.title,p.price_cop,uuid()])).rows[0];
  const payment={id:uuid(),status:'approved',transaction_amount:p.price_cop,currency_id:'COP'};
  const approve=()=>withTransaction(async db=>{const row=(await db.query('select * from qr_credit_purchase_orders where id=$1 for update',[o.id])).rows[0];return payments.__testing.finalizeApprovedCreditPurchase(db,row,payment);});
  assert.equal(Number((await query('select balance from qori_giftcard_credit_accounts where business_id=$1',[b.id])).rows[0].balance),total);
  await assert.rejects(withTransaction(db=>payments.__testing.finalizeApprovedCreditPurchase(db,o,{...payment,transaction_amount:1})));
  const r=await Promise.all([approve(),approve()]);assert.equal(r.filter(x=>x.credited).length,1);total+=p.package_size;
  assert.equal(Number((await query('select balance from qori_giftcard_credit_accounts where business_id=$1',[b.id])).rows[0].balance),total);
  assert.equal(Number((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b.id])).rows[0].qr_balance),20);
  assert.equal((await query('select 1 from qori_seller_commissions where order_id=$1',[o.id])).rowCount,0);
 }
 const plan=require('../backend/src/services/subscriptionService').planFromBusiness(b);assert.equal(plan.limits.stamp_programs,1);assert.equal(plan.limits.stamp_members,null);
 const stamps=require('../backend/src/services/stampCardService');
 const user=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'test','Owner QA','BUSINESS_OWNER') returning id",[b.id,uuid()+'@example.test'])).rows[0];
 const rules={name:'Programa gratuito',stamps_required:5,benefit_type:'FREE_GIFT',benefit_value:{label:'Un producto gratis'},minimum_purchase:0,one_per_day:false,allow_manual:true,card_valid_days:365,ticket_valid_days:30,reward_cost:0,ticket_cost:1500,terms:'Un producto de regalo.',status:'ACTIVE'};
 const programs=await Promise.allSettled([stamps.saveProgram(b.id,user.id,rules),stamps.saveProgram(b.id,user.id,{...rules,name:'Segundo programa'})]);
 assert.equal(programs.filter(r=>r.status==='fulfilled').length,1);assert.match(programs.find(r=>r.status==='rejected').reason.message,/hasta 1 programa/);
 assert.equal((await query('select count(*)::int n from stamp_programs where business_id=$1',[b.id])).rows[0].n,1);
});
after(()=>pool.end());
