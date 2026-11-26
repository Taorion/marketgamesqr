const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID:id}=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='renewal-commission-local-qa';
const {query,pool,withTransaction}=require('../backend/src/config/db');
const mp=require('../backend/src/services/mercadoPagoService');
const {correctFirstPaidPeriod}=require('../backend/src/services/sellerCommissionCorrection');
after(()=>pool.end());

test('recovered trial with UTC-midnight renewal follows all six rates only after confirmed payments',async()=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_customer_qa');
 const admin=await require('./helpers/adminIdentity').admin(query);
 const seller=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Renewal commission QA','QORI_SELLER') returning *",[id()+'@example.test'])).rows[0];
 const approved=new Date();approved.setUTCHours(12,0,0,0);
 const end=mp.__testing.addPlanBillingPeriod(approved,{billing_frequency:1});end.setUTCHours(0,0,0,0);
 const b=(await query("insert into businesses(name,slug,plan_code,subscription_status,subscription_current_period_ends_at,created_at) values('Recovered trial renewal QA',$1,'STARTER','ACTIVE',$2,'2020-01-01') returning *",[id(),end])).rows[0];
 await query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$3)',[b.id,seller.id,admin.id]);
 const makeOrder=async extra=>(await query("insert into qr_credit_purchase_orders(business_id,package_code,package_size,package_title,price_cop,external_reference,metadata) values($1,'STARTER',0,'Crece',229000,$2,$3) returning *",[b.id,id(),{signup:{type:'portal_monthly_subscription',plan_code:'STARTER'},...extra}])).rows[0];
 const payment=()=>({id:id(),status:'approved',currency_id:'COP',transaction_amount:229000,date_approved:approved.toISOString()});
 const finalize=(o,p)=>withTransaction(db=>mp.__testing.finalizeApprovedCreditPurchase(db,o,p));
 const first=await makeOrder({reconciliation:{requested:true,authorized_by:admin.id,preserve_period_end:end.toISOString()}});
 await finalize(first,payment());
 await correctFirstPaidPeriod(admin,{business_id:b.id,order_id:first.id,reason:'Tabla aprobada para primer pago después de prueba gratuita.'},{apply:true});
 const {commissionStartsAt}=require('../backend/src/services/sellerCommissionPeriod');
 const gap=new Date(end.getTime()+3*86400000);
 assert.equal((await commissionStartsAt({query},b.id,id(),gap)).toISOString(),gap.toISOString());
 assert.equal((await commissionStartsAt({query},id(),id(),end)).toISOString(),end.toISOString());
 const amounts=[114500,57250,57250,45800,34350,22900];
 for(let month=2;month<=7;month++){
  const recurring=month%2===0 ? {signup:{type:'portal_monthly_subscription_auto_renewal',plan_code:'STARTER'},recurring_debit_date:(await query('select subscription_current_period_ends_at from businesses where id=$1',[b.id])).rows[0].subscription_current_period_ends_at.toISOString()} : {};
  const renewal=await makeOrder(recurring);const p=payment();
  for(const status of ['pending','rejected'])await assert.rejects(()=>finalize(renewal,{...p,status}),/aprobado/);
  assert.equal((await query('select id from qori_seller_commissions where order_id=$1',[renewal.id])).rowCount,0);
  await finalize(renewal,p);
  const fresh=(await query('select * from qr_credit_purchase_orders where id=$1',[renewal.id])).rows[0];
  assert.equal((await finalize(fresh,p)).duplicate,true);
  const rows=(await query('select * from qori_seller_commissions where order_id=$1',[renewal.id])).rows;
  assert.equal(rows.length,month<=6?1:0,'commission count for month '+month);
  if(month<=6){assert.equal(rows[0].commission_month,month);assert.equal(Number(rows[0].amount_cop),amounts[month-1]);assert.equal(rows[0].seller_id,seller.id);}
 }
 assert.equal((await query('select count(*)::int n from qori_seller_commissions where business_id=$1',[b.id])).rows[0].n,6);
});
