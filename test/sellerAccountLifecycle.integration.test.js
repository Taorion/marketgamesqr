const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='seller-lifecycle-local-only';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken'),svc=require('../backend/src/services/qoriSellerService');
const id=()=>crypto.randomUUID(),now=Date.now(),date=days=>new Date(now+days*86400000).toISOString();
let server;
test('Seller reports canonical Freemium dates, paid conversion and tenant-safe phases',async()=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');
 async function seller(){return (await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Seller lifecycle QA','QORI_SELLER') returning *",[id()+'@example.test'])).rows[0];}
 const a=await seller(),other=await seller();
 async function business(code,end,settings={},status='ACTIVE',owner=a){
  const b=(await query("insert into businesses(name,slug,plan_code,plan_type,subscription_status,subscription_started_at,subscription_current_period_ends_at,settings) values($1,$2,$3,'premium_monthly',$4,$5,$6,$7::jsonb) returning *",['QA '+code,id(),code,status,date(-20),end,JSON.stringify({private_marker:'DO_NOT_EXPOSE',...settings})])).rows[0];
  await query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$2)',[b.id,owner.id]);return b;
 }
 const trial=await business('DESCUBRE',date(10)),ending=await business('DESCUBRE',date(2)),expired=await business('DESCUBRE',date(-1)),unknown=await business('DESCUBRE',null);
 const suspended=await business('DESCUBRE',date(10));await query('update businesses set is_active=false where id=$1',[suspended.id]);
 const history={qori_descubre:{started_at:date(-40),ends_at:date(-10)}};
 const paid=await business('STARTER',date(20),history),unpaid=await business('STARTER',date(20),history),grace=await business('STARTER',date(-1)),pending=await business('STARTER',date(20),{},'PENDING_PAYMENT');
 const commercial=await business('STARTER',date(3),{qori_commercial:{status:'ACTIVE',plan_code:'STARTER',approved_by:a.id,deal_id:id(),benefits_starts_at:date(-10),trial_ends_at:date(3)}});
 const free=await business('PENSE_EN_TI',null),foreign=await business('DESCUBRE',date(15),{},'ACTIVE',other);
 async function payment(b,type,status='APPROVED',amount=100000,credited=true){await query("insert into qr_credit_purchase_orders(business_id,package_code,package_size,package_title,price_cop,external_reference,status,credited_at,metadata) values($1,'PLAN_STARTER',0,'Plan QA',$2,$3,$4,$5,$6::jsonb)",[b.id,amount,id(),status,credited?date(0):null,JSON.stringify({signup:{type}})]);}
 await payment(paid,'portal_monthly_subscription');await payment(unpaid,'qr_tickets');await payment(unpaid,'portal_monthly_subscription','PENDING',100000,false);await payment(unpaid,'portal_monthly_subscription','APPROVED',0);
 const result=await svc.accounts(a),byId=new Map(result.accounts.map(b=>[b.id,b]));
 assert.equal(byId.has(foreign.id),false);assert.equal(JSON.stringify(result).includes('DO_NOT_EXPOSE'),false);assert.equal(result.accounts.some(b=>'settings'in b),false);
 for(const [b,phase] of [[trial,'TRIAL_ACTIVE'],[ending,'TRIAL_ENDING'],[expired,'TRIAL_EXPIRED'],[unknown,'TRIAL_UNKNOWN'],[suspended,'SUSPENDED'],[paid,'PAID_ACTIVE'],[unpaid,'ACTIVE_UNVERIFIED'],[grace,'RENEWAL_DUE'],[pending,'PAYMENT_PENDING'],[commercial,'TRIAL_ENDING'],[free,'FREE']])assert.equal(byId.get(b.id).lifecycle.phase,phase,b.name);
 assert.equal(byId.get(trial.id).lifecycle.trial.ends_at,date(10));assert.equal(byId.get(expired.id).lifecycle.access_allowed,false);assert.equal(byId.get(expired.id).lifecycle.trial.days_remaining,0);
 assert.equal(byId.get(paid.id).lifecycle.converted_to_paid,true);assert.equal(byId.get(unpaid.id).lifecycle.converted_to_paid,false);assert.equal(byId.get(unpaid.id).lifecycle.last_payment_at,null);
 assert.deepEqual((await svc.dashboard(a)).accounts.map(b=>[b.id,b.lifecycle.phase]),result.accounts.map(b=>[b.id,b.lifecycle.phase]));
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base+'/api/seller/accounts')).status,401);
 const response=await fetch(base+'/api/seller/accounts?seller_id='+other.id,{headers:{Authorization:'Bearer '+jwt.sign({sub:a.id,password_version:0},process.env.JWT_SECRET)}});assert.equal(response.status,200);assert.equal((await response.json()).accounts.some(b=>b.id===foreign.id),false);
 await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version) values($1,$2,'3100000000','Bogota','4610','qa')",[other.id,id()]);await assert.rejects(()=>svc.accounts(other),/aprobada/);
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});
