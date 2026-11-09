const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';
const {query,pool}=require('../backend/src/config/db'),admin=require('../backend/src/services/adminAccountsService');
const uuid=()=>crypto.randomUUID();let user;
async function business(code){return (await query("insert into businesses(name,slug,plan_code,subscription_status,subscription_current_period_ends_at) values($1,$1,$2,'ACTIVE',now()+interval '20 days') returning *",['qa-balance-'+uuid(),code])).rows[0];}
async function card(b,value,balance,status='active',expired=false,claimed=true){return (await query("insert into reward_passes(company_id,user_id,buyer_name,beneficiary_name,beneficiary_document,initial_value_cop,current_balance_cop,expires_at,qr_token,public_code,terms,status) values($1,$2,'QA',$3,$4,$5,$6,now()+($7::int*interval '1 day'),$8,$9,'QA',$10) returning id",[b.id,user.id,claimed?'QA':'',claimed?'123':'',value,balance,expired?-1:30,uuid(),uuid(),status])).rows[0].id;}
async function balances(b){return (await admin.detail(user,'businesses',b.id)).record.balances;}
test('Admin balances use real credits, plan caps and canonical giftcard money without writes',async t=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_customer_qa');
 user=(await query("insert into app_users(email,full_name,role,password_hash) values($1,'Balance QA','QORI_SUPERADMIN','qa') returning *",[uuid()+'@example.test'])).rows[0];
 const free=await business('PENSE_EN_TI'),trial=await business('DESCUBRE'),paid=await business('STARTER'),empty=await business('PENSE_EN_TI');
 await query('insert into business_qr_credit_accounts(business_id,qr_balance,included_balance,qr_used_total,qr_purchased_total) values($1,63,13,7,50),($2,100,0,0,100),($3,3,0,0,3)',[free.id,trial.id,paid.id]);
 await query('insert into qori_giftcard_credit_accounts(business_id,balance,purchased,used,welcome_granted) values($1,65,50,5,20)',[free.id]);
 await card(free,10000,6000,'partially_redeemed');await card(free,20000,20000,'active',false,false);await card(free,30000,30000,'active',true);await card(free,40000,40000,'cancelled');await card(free,5000,0);
 await card(trial,1000,1000);const old=await card(trial,1000,1000);await query("update reward_passes set created_at=date_trunc('month',now())-interval '1 day' where id=$1",[old]);
 await query('update businesses set settings=$2::jsonb where id=$1',[paid.id,JSON.stringify({reward_pass_ticket_cost:2})]);
 await t.test('tickets are not double counted; monetary balances exclude expired/cancelled cards',async()=>{
  const b=await balances(free);assert.deepEqual(b.tickets,{available:63,included:13,additional:50,used_total:7,credited_total:50,included_period:null});
  assert.equal(b.giftcards.available,65);assert.equal(b.giftcards.credits_purchased,50);assert.equal(b.giftcards.credits_used,5);
  assert.equal(b.giftcards.pending_cop,26000);assert.equal(b.giftcards.expired_cop,30000);assert.equal(b.giftcards.cancelled_cop,40000);assert.equal(b.giftcards.redeemed_cop,9000);assert.equal(b.giftcards.issued_cop,105000);
  const list=await admin.list(user,'businesses',{search:free.slug});assert.equal(list.total,1);assert.equal(list.rows[0].balances.giftcards.pending_cop,26000);assert.equal(list.rows[0].settings,undefined);
 });
 await t.test('Freemium total quota and monthly quota remain distinct; paid issuance is ticket limited',async()=>{
  const b=await balances(trial);assert.equal(b.giftcards.total_remaining,8);assert.equal(b.giftcards.monthly_remaining,9);assert.equal(b.giftcards.available,8);
  const p=await balances(paid);assert.equal(p.giftcards.available,1);assert.equal(p.giftcards.tickets_per_card,2);
  await query("update businesses set plan_code='DESPEGA' where id=$1",[paid.id]);assert.equal((await balances(paid)).giftcards.available,0);
 });
 await t.test('missing accounts stay zero and reads do not create or recharge balances',async()=>{
  const b=await balances(empty);assert.equal(b.tickets.available,0);assert.equal(b.giftcards.available,0);
  assert.equal((await query('select count(*)::int n from business_qr_credit_accounts where business_id=$1',[empty.id])).rows[0].n,0);
  assert.equal((await query('select count(*)::int n from qori_giftcard_credit_accounts where business_id=$1',[empty.id])).rows[0].n,0);
  assert.equal((await query('select count(*)::int n from business_qr_credit_ledger where business_id=$1',[free.id])).rows[0].n,0);
  await query('update businesses set is_active=false where id=$1',[free.id]);const suspended=await balances(free);assert.equal(suspended.access_allowed,false);assert.equal(suspended.tickets.available,63);
 });
 await t.test('balances remain private to superadmin and refresh reflects consumption',async()=>{
  await assert.rejects(admin.list({...user,role:'QORI_SELLER'},'businesses'),/403|permiso|autoriz|acceso|administrador/i);
  await query('update business_qr_credit_accounts set qr_balance=62,included_balance=12,qr_used_total=8 where business_id=$1',[free.id]);assert.equal((await balances(free)).tickets.available,62);
 });
 await t.test('Clientes shows balances after real ticket consumption and giftcard issuance, scoped to the seller',async()=>{
  const commercial=require('../backend/src/services/commercialAdminService');
  const {withTransaction}=require('../backend/src/config/db');
  await query('update businesses set is_active=true where id=$1',[free.id]);
  await query("insert into branches(business_id,name,slug) values($1,'Sede QA','qa')",[free.id]);
  const seller=(await query("insert into app_users(email,full_name,role,password_hash) values($1,'Saldo Seller','QORI_SELLER','qa') returning *",[uuid()+'@example.test'])).rows[0];
  await query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$3)',[free.id,seller.id,user.id]);
  const read=async who=>(await commercial.list(who,'customers',{search:free.slug})).rows;
  assert.equal((await read(user))[0].balances.tickets.available,62);
  await withTransaction(db=>require('../backend/src/services/qrCreditService').consumeQrCredits(db,free.id,3));
  await require('../backend/src/services/rewardPassService').createRewardPass({...user,role:'BUSINESS_OWNER',business_id:free.id},{buyer_name:'QA Saldo',initial_value_cop:10000,branch_authorization_scope:'ALL_BRANCHES',terms:'Prueba local',idempotency_key:uuid()});
  const updated=(await read(user))[0];assert.equal(updated.balances.tickets.available,59);assert.equal(updated.balances.giftcards.available,64);assert.equal(updated.balances.giftcards.issued_count,6);
  assert.equal((await read(seller))[0].balances.tickets.available,59);
  assert.equal((await read({...seller,id:uuid()})).length,0);
  await withTransaction(db=>require('../backend/src/services/qrCreditService').consumeQrCredits(db,free.id,59));assert.equal((await read(user))[0].balances.tickets.available,0);
 });
});
after(()=>pool.end());
