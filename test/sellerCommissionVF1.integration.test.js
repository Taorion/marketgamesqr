const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='commissions-local-qa-only-secret';
const {query,pool,withTransaction}=require('../backend/src/config/db');
const policy=require('../backend/src/services/sellerCommissionPolicy');
const payments=require('../backend/src/services/mercadoPagoService');
const uid=()=>crypto.randomUUID();let seller;
before(async()=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');
 seller=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','VF1 QA','QORI_SELLER') returning *",[uid()+'@example.test'])).rows[0];
});
after(()=>pool.end());
async function business({legacy=false,assigned=true}={}){
 const b=(await query("insert into businesses(name,slug,plan_code,plan_type,is_active,subscription_status,subscription_current_period_ends_at,created_at) values('VF1 QA',$1,'DESPEGA','premium_monthly',true,'ACTIVE','2042-01-01',(select effective_at from qori_seller_commission_policy where version='QORI_2026_VF1')+($2::int*interval '1 second')) returning *",[uid(),legacy?-1:1])).rows[0];
 if(assigned)await query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$2)',[b.id,seller.id]);
 return b;
}
async function order(b,{plan='DESPEGA',amount=75000,start='2040-01-15',annual=false}={}){
 const metadata=plan.startsWith('QR')||plan.startsWith('GF')?{}:{signup:{type:annual?'portal_annual_subscription':'portal_monthly_subscription',plan_code:plan,billing_cycle:annual?'annual':'monthly'},commission_period:{starts_at:start+'T12:00:00Z'}};
 return (await query('insert into qr_credit_purchase_orders(business_id,package_code,package_size,package_title,price_cop,external_reference,metadata) values($1,$2,0,$2,$3,$4,$5::jsonb) returning *',[b.id,plan,amount,uid(),JSON.stringify(metadata)])).rows[0];
}
const credit=o=>query("update qr_credit_purchase_orders set status='APPROVED',credited_at=coalesce(credited_at,now()) where id=$1",[o.id]);
const ledger=async o=>(await query('select * from qori_seller_commissions where order_id=$1 order by kind,commission_month',[o.id])).rows;
const release=async(b,day)=>(await query('select qori_release_seller_commissions($1,$2) n',[b.id,day+'T17:00:00Z'])).rows[0].n;
test('SQL matches every PDF amount; annual payment and discount use fixed bases, six installments only',async()=>{
 for(const p of policy.publicPolicy().plans){
  const b=await business(),o=await order(b,{plan:p.code,amount:12345,annual:true});await credit(o);await credit(o);
  let rows=await ledger(o);assert.equal(rows.length,6);assert.deepEqual(rows.map(c=>Number(c.amount_cop)),p.months.map(m=>m.reference_commission_cop));
  assert.ok(rows.every(c=>c.status==='SCHEDULED'&&Number(c.base_cop)===p.monthly_price_cop));
  assert.equal(await release(b,'2039-12-31'),0);assert.equal(await release(b,'2040-01-15'),1);assert.equal(await release(b,'2040-01-15'),0);
  for(let m=2;m<=6;m++)assert.equal(await release(b,`2040-0${m}-15`),1);
  rows=await ledger(o);assert.ok(rows.every(c=>c.status==='PENDING'));assert.equal(await release(b,'2040-07-15'),0);
  const later=await order(b,{plan:p.code,start:'2040-07-15'});await credit(later);assert.equal((await ledger(later)).length,0);
 }
});
test('legacy clients keep actual-price ten percent indefinitely; tickets keep ten percent for every cohort',async()=>{
 for(const legacy of [true,false]){
  const b=await business({legacy});
  if(legacy)for(const start of ['2040-01-15','2041-12-15']){
   const o=await order(b,{amount:12345,start,annual:true});await credit(o);const rows=await ledger(o);
   assert.equal(rows.length,1);assert.equal(rows[0].amount_cop,'1234.50');assert.equal(rows[0].policy_version,'LEGACY_10');assert.equal(rows[0].status,'PENDING');
  }
  const o=await order(b,{plan:'QR50',amount:55555});await credit(o);assert.equal((await ledger(o))[0].amount_cop,'5555.50');
  const gift=await order(b,{plan:'GF50',amount:55555});await credit(gift);assert.equal((await ledger(gift)).length,0);
 }
});
test('concurrent same-month payments, upgrades and reassignment cannot duplicate or restart the client clock',async()=>{
 const b=await business(),a=await order(b),duplicate=await order(b);
 await Promise.all([credit(a),credit(duplicate)]);assert.equal((await ledger(a)).length+(await ledger(duplicate)).length,1);
 const secondSeller=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Second VF1 QA','QORI_SELLER') returning *",[uid()+'@example.test'])).rows[0];
 await query('update qori_sales_accounts set seller_id=$2 where business_id=$1',[b.id,secondSeller.id]);
 const upgrade=await order(b,{plan:'PRO',start:'2040-02-15'});await credit(upgrade);const c=(await ledger(upgrade))[0];
 assert.equal(c.seller_id,secondSeller.id);assert.equal(c.commission_month,2);assert.equal(c.amount_cop,'499750.00');
 const end=await order(b,{start:'2040-07-15'});await credit(end);assert.equal((await ledger(end)).length,0);
});
test('unassigned first payment starts client clock; free or unsupported plans never start it',async()=>{
 const b=await business({assigned:false});const free=await order(b,{amount:0}),unknown=await order(b,{plan:'TEST'});
 await credit(free);await credit(unknown);assert.equal((await query('select * from qori_seller_commission_programs where business_id=$1',[b.id])).rowCount,0);
 await credit(await order(b));await query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$2)',[b.id,seller.id]);
 const o=await order(b,{start:'2040-02-15'});await credit(o);assert.equal((await ledger(o))[0].commission_month,2);assert.equal((await ledger(o))[0].amount_cop,'7500.00');
});
test('inactive, unpaid and expired coverage never release; month-end renewals and Thursday cutoff remain deterministic',async()=>{
 const b=await business(),o=await order(b,{annual:true});await credit(o);
 await query('update businesses set is_active=false where id=$1',[b.id]);assert.equal(await release(b,'2040-01-15'),0);
 await query('update businesses set is_active=true where id=$1',[b.id]);assert.equal(await release(b,'2040-02-15'),1);
 assert.equal((await ledger(o))[0].status,'VOID');
 await query("update qr_credit_purchase_orders set status='CANCELLED' where id=$1",[o.id]);assert.equal(await release(b,'2040-03-15'),0);
 const dates=(await query("select qori_seller_commission_month('2039-01-31','2039-02-28') m2,qori_seller_commission_month('2039-01-31','2039-03-28') m3,qori_seller_next_thursday('2026-11-11')::text wed,qori_seller_next_thursday('2026-11-12')::text thu")).rows[0];
 assert.deepEqual(dates,{m2:2,m3:3,wed:'2026-11-12',thu:'2026-11-19'});
});
test('refund keeps paid entries, reverses each paid month once, voids future installments and supports replacement payment',async()=>{
 const b=await business(),o=await order(b,{annual:true,plan:'STARTER'});await credit(o);await release(b,'2040-01-15');await release(b,'2040-02-15');
 const payout=(await query("insert into qori_seller_payouts(seller_id,request_id,gross_cop,withholding_cop,transfer_reference,paid_on,recorded_by) values($1,$2,171750,0,$3,'2040-02-16',$1) returning *",[seller.id,uid(),'QA-'+uid()])).rows[0];
 await query("update qori_seller_commissions set status='PAID',payout_id=$2 where order_id=$1 and status='PENDING'",[o.id,payout.id]);
 await query("update qr_credit_purchase_orders set status='CANCELLED' where id=$1",[o.id]);await query("update qr_credit_purchase_orders set status='CANCELLED' where id=$1",[o.id]);
 const rows=await ledger(o);assert.equal(rows.filter(c=>c.status==='PAID'&&c.payout_id===payout.id).length,2);assert.equal(rows.filter(c=>c.status==='VOID').length,4);
 const reversals=rows.filter(c=>c.kind==='REVERSAL');assert.equal(reversals.length,2);assert.equal(reversals.reduce((s,c)=>s+Number(c.amount_cop),0),-171750);
 const replacement=await order(b,{plan:'STARTER',start:'2040-02-15'});await credit(replacement);assert.equal((await ledger(replacement))[0].amount_cop,'57250.00');
});
test('real payment finalizer stamps trusted coverage and releases only first annual installment after activation',async()=>{
 const b=await business();await query('update businesses set subscription_current_period_ends_at=null where id=$1',[b.id]);
 const o=await order(b,{plan:'STARTER',annual:true,amount:2290000});
 await withTransaction(async db=>payments.__testing.finalizeApprovedCreditPurchase(db,o,{id:uid(),status:'approved',transaction_amount:Number(o.price_cop),currency_id:'COP'}));
 const rows=await ledger(o);assert.equal(rows.filter(c=>c.status==='PENDING').length,1);assert.equal(rows.filter(c=>c.status==='SCHEDULED').length,5);assert.equal(rows[0].amount_cop,'114500.00');
 const fresh=(await query('select * from qr_credit_purchase_orders where id=$1',[o.id])).rows[0];assert.ok(new Date(fresh.metadata.commission_period.starts_at).getTime()<Date.now()+60000);
 await withTransaction(db=>payments.__testing.finalizeApprovedCreditPurchase(db,fresh,{id:uid(),status:'approved',transaction_amount:Number(o.price_cop),currency_id:'COP'}));assert.equal((await ledger(o)).length,6);
});
test('commission policy and release helpers are private, invoker-only and use a fixed search path',async()=>{
 const tables=(await query("select relname,relrowsecurity from pg_class where oid in ('public.qori_seller_commission_policy'::regclass,'public.qori_seller_commission_programs'::regclass)")).rows;
 assert.equal(tables.length,2);assert.ok(tables.every(t=>t.relrowsecurity));
 const functions=(await query("select proname,prosecdef,proconfig from pg_proc where oid in ('public.qori_release_seller_commissions(uuid,timestamptz)'::regprocedure,'public.qori_seller_commission_boundary(date,integer)'::regprocedure)")).rows;
 assert.ok(functions.every(f=>!f.prosecdef&&f.proconfig.includes('search_path=\"\"')));
 const exposed=(await query("select p.proname from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a left join pg_roles r on r.oid=a.grantee where p.proname in ('qori_release_seller_commissions','qori_seller_commission_boundary','qori_seller_commission_month','qori_seller_vf1_base','qori_seller_vf1_rate','qori_seller_next_thursday') and (a.grantee=0 or r.rolname in ('anon','authenticated')) and a.privilege_type='EXECUTE'")).rows;
 assert.deepEqual(exposed,[]);
});
