const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');

test('Descubre: seller onboarding, enforced quotas, expiry and paid conversion',{skip:process.env.QORI_COMMERCIAL_QA!=='true'},async t=>{
  const url=new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55439');
  const {pool,withTransaction}=require('../backend/src/config/db');
  const {env}=require('../backend/src/config/env');
  const bcrypt=require('bcryptjs');
  const express=require('express');
  const app=express();app.use(express.json());
  app.use('/api/auth',require('../backend/src/routes/authRoutes'));
  app.use('/api/admin',require('../backend/src/routes/adminRoutes'));
  app.use('/api/public',require('../backend/src/routes/packageSalesRoutes'));
  app.use('/api/business/stamp-cards',require('../backend/src/routes/stampCardRoutes').router);
  app.use(require('../backend/src/middleware/errorHandler').errorHandler);
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const actualFetch=global.fetch;
  const mpRequests=[];
  env.mercadoPagoAccessToken='TEST-local-only';
  env.mercadoPagoWebhookSecret='local-simulated-webhook-only';
  global.fetch=async(input,options)=>{
    if(String(input).startsWith('https://api.mercadopago.com/')) {
      assert.ok(String(input).endsWith('/checkout/preferences'),'Only simulated checkout preferences allowed');
      mpRequests.push(JSON.parse(options.body));
      return new Response(JSON.stringify({id:randomUUID(),init_point:'https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=qa-only'}),{status:201,headers:{'Content-Type':'application/json'}});
    }
    assert.ok(String(input).startsWith(base),'Never make external calls in this suite');
    return actualFetch(input,options);
  };
  t.after(async()=>{global.fetch=actualFetch;await new Promise(r=>server.close(r));await pool.end();});
  const prefix=`descubre-${Date.now()}`,password='Descubre-QA-Only!2026';
  const hash=await bcrypt.hash(password,4);
  await pool.query("insert into app_users(email,password_hash,full_name,role) values($1,$2,'QA Descubre Superadmin','QORI_SUPERADMIN')",[`${prefix}-root@example.test`,hash]);
  async function call(path,token,body,expected=200,method=body===undefined?'GET':'POST') {
    const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const data=await r.json();assert.equal(r.status,expected,`${path}: ${JSON.stringify(data)}`);return data;
  }
  const root=(await call('/api/auth/login',null,{email:`${prefix}-root@example.test`,password})).token;
  const c='/api/admin/commercial';
  const seller=await call(c+'/sellers',root,{full_name:'QA Descubre Vendedor',email:`${prefix}-seller@example.test`});
  const seller2=await call(c+'/sellers',root,{full_name:'QA Descubre Otro',email:`${prefix}-other@example.test`});
  const token=(await call('/api/auth/login',null,seller.credentials)).token;
  const token2=(await call('/api/auth/login',null,seller2.credentials)).token;
  const body={request_id:randomUUID(),company_name:'QA Negocio Descubre',contact_name:'QA Titular',nit:prefix,phone:'3001234567',email:`${prefix}@example.test`,password,password_confirm:password,website:'https://example.test',city:'Bogotá',address:'Calle QA 123',terms_accepted:true,privacy_accepted:true};
  let enrolled,owner,program,member;
  const {getBusinessSubscription}=require('../backend/src/services/subscriptionService');
  await t.test('seller cannot manage staff or authorizations; invalid and forged enrollments fail',async()=>{
    await call(c+'/enrollments/descubre',null,body,401);
    await call(c+'/sellers',token,{full_name:'Forbidden',email:'forged@example.test'},403);
    await call(c+'/enrollments/descubre',token,{...body,password_confirm:'DoesNotMatch'},400);
    await call(c+'/enrollments/descubre',token,{...body,nit:''},400);
    await call(c+'/enrollments/descubre',token,{...body,trial_days:365},400);
    await call(c+'/enrollments/descubre',token,{...body,plan_code:'GLOBAL'},400);
    await call(c+'/enrollments/descubre',token,{...body,commercial_advisor_id:seller2.seller.id},400);
    assert.equal((await call('/api/public/subscription-plans')).plans.some(p=>p.code==='DESCUBRE'),false);
  });
  await t.test('simultaneous enrollment retries create one business and one 25-ticket grant',async()=>{
    const results=await Promise.all([call(c+'/enrollments/descubre',token,body),call(c+'/enrollments/descubre',token,body)]);
    enrolled=results[0];assert.equal(results[0].business_id,results[1].business_id);
    assert.equal(results.filter(r=>r.already_created).length,1);
    const business=(await pool.query('select * from businesses where id=$1',[enrolled.business_id])).rows[0];
    assert.equal(business.plan_code,'DESCUBRE');
    assert.equal(new Date(business.subscription_current_period_ends_at)-new Date(business.subscription_started_at),30*86400000);
    for(const field of ['nit','phone','city','address','website'])assert.equal(business.settings[field],body[field]);
    assert.equal(business.settings.contact_email,body.email);
    assert.equal(business.settings.legal_acceptance.recorded_by,seller.seller.id);
    const balance=await pool.query('select qr_balance from business_qr_credit_accounts where business_id=$1',[business.id]);assert.equal(Number(balance.rows[0].qr_balance),25);
    assert.equal((await pool.query('select id from business_qr_credit_ledger where business_id=$1',[business.id])).rowCount,1);
    assert.equal((await pool.query('select id from branches where business_id=$1 and address=$2',[business.id,body.address])).rowCount,1);
    assert.equal(JSON.stringify(enrolled).includes(password),false);
    const audit=await pool.query("select detail from qori_commercial_audit where entity_id=$1",[business.id]);assert.equal(audit.rowCount,1);assert.equal(JSON.stringify(audit.rows).includes(password),false);
  });
  await t.test('identity collisions and other sellers cannot repeat or see the enrollment',async()=>{
    await call(c+'/enrollments/descubre',token,{...body,request_id:randomUUID()},400);
    await call(c+'/enrollments/descubre',token,{...body,request_id:randomUUID(),email:`${prefix}-collision@example.test`,nit:prefix.replaceAll('-','.')},400);
    await call(c+'/enrollments/descubre',token2,body,403);
    assert.equal((await call(c+'/customers',token2)).rows.some(b=>b.id===enrolled.business_id),false);
    assert.equal((await call(c+'/customers',token)).rows.some(b=>b.id===enrolled.business_id),true);
    owner=await call('/api/auth/login',null,{email:body.email,password});
    assert.equal(owner.user.role,'BUSINESS_OWNER');assert.equal(owner.user.business_id,enrolled.business_id);
    assert.equal(owner.user.subscription.plan.portal_access_allowed,true);
    assert.ok(Object.values(owner.user.subscription.plan.features).every(Boolean));
    await call(c+'/enrollments/descubre',owner.token,{...body,request_id:randomUUID()},403);
  });
  await t.test('all modules have real limits and storage rejects more than 100 MB',async()=>{
    const plan=(await getBusinessSubscription(enrolled.business_id)).plan;
    assert.equal(plan.limits.affiliates,10);assert.equal(plan.limits.gift_cards_total,10);assert.equal(plan.limits.storage_bytes,100*1024*1024);
    const {assertStorageQuotaForUpload}=require('../backend/src/services/storageQuotaService');
    assert.equal((await assertStorageQuotaForUpload(enrolled.business_id,100*1024*1024)).limit_bytes,100*1024*1024);
    await assert.rejects(()=>assertStorageQuotaForUpload(enrolled.business_id,100*1024*1024+1),{status:403});
  });
  await t.test('Descubre allows ten programs and unlimited cards in each program',async()=>{
    program=await call('/api/business/stamp-cards/programs',owner.token,{name:'QA Café Descubre',stamps_required:2,benefit_type:'PERCENT_DISCOUNT',benefit_value:{label:'10% de descuento',percent:10},minimum_purchase:0,one_per_day:false,allow_manual:true,card_valid_days:30,ticket_valid_days:30,reward_cost:0,ticket_cost:1,terms:'Condiciones QA',status:'ACTIVE'});
    const programs=[program,...await Promise.all(Array.from({length:9},(_,i)=>call('/api/business/stamp-cards/programs',owner.token,{...program,name:`Programa adicional ${i}` })))];
    await call('/api/business/stamp-cards/programs',owner.token,{...program,name:'Programa once'},403);
    const plan=(await getBusinessSubscription(enrolled.business_id)).plan;
    assert.equal(plan.limits.stamp_programs,10);assert.equal(plan.limits.stamp_members,null);
    for(const p of programs.slice(0,2)) for(let i=0;i<11;i++) {
      const result=await call('/api/business/stamp-cards/members',owner.token,{program_id:p.id,name:`Cliente ${i}`,document_id:`QA${i}00`,consent:true});
      if(!member)member=result.member;
    }
    const counts=await pool.query('select program_id,count(*)::int as total from stamp_members where business_id=$1 group by program_id',[enrolled.business_id]);
    assert.equal(counts.rowCount,2);assert.ok(counts.rows.every(row=>row.total===11));
    await call(`/api/business/stamp-cards/members/${member.id}/stamps`,owner.token,{reference:'QA-compra-001',note:'Primera visita de prueba'});
    assert.equal(Number((await pool.query('select stamps from stamp_cycles where member_id=$1',[member.id])).rows[0].stamps),1);
  });
  await t.test('the eleventh affiliate is rejected by the shared server quota',async()=>{
    const {createAffiliate}=require('../backend/src/services/affiliateService');
    for(let i=0;i<10;i++)await createAffiliate(enrolled.business_id,owner.user,{full_name:`Afiliado QA ${i}`,document_id:`AF${i}`});
    await assert.rejects(()=>createAffiliate(enrolled.business_id,owner.user,{full_name:'Afiliado once'}),{status:403});
  });
  await t.test('ten Gift Cards across month boundaries are allowed, the eleventh is rejected',async()=>{
    const {createRewardPass}=require('../backend/src/services/rewardPassService');
    for(let i=0;i<10;i++)await createRewardPass(owner.user,{buyer_name:'Comprador QA',initial_value_cop:10000,idempotency_key:`${prefix}-gift-${i}`});
    await pool.query("update reward_passes set created_at=now()-interval '1 month' where company_id=$1",[enrolled.business_id]);
    await assert.rejects(()=>createRewardPass(owner.user,{buyer_name:'Comprador once',initial_value_cop:10000,idempotency_key:`${prefix}-gift-11`}),{status:403});
    assert.equal((await pool.query('select id from reward_passes where company_id=$1',[enrolled.business_id])).rowCount,10);
  });
  await t.test('the initial tickets are finite and do not silently replenish',async()=>{
    const {consumeQrCredits}=require('../backend/src/services/qrCreditService');
    const balance=Number((await pool.query('select qr_balance from business_qr_credit_accounts where business_id=$1',[enrolled.business_id])).rows[0].qr_balance);
    await withTransaction(client=>consumeQrCredits(client,enrolled.business_id,balance,null,owner.user.id));
    await assert.rejects(()=>withTransaction(client=>consumeQrCredits(client,enrolled.business_id,1,null,owner.user.id)));
    await call(c+'/enrollments/descubre',token,body);
    assert.equal(Number((await pool.query('select qr_balance from business_qr_credit_accounts where business_id=$1',[enrolled.business_id])).rows[0].qr_balance),0);
  });
  await t.test('expired samples lose portal access without grace and retain login/data',async()=>{
    await pool.query("update businesses set subscription_current_period_ends_at=now()-interval '1 second' where id=$1",[enrolled.business_id]);
    const plan=(await getBusinessSubscription(enrolled.business_id)).plan;
    assert.equal(plan.portal_access_allowed,false);assert.equal(plan.grace_period_days,0);
    await call('/api/business/stamp-cards/context',owner.token,undefined,403);
    assert.equal((await call('/api/auth/login',null,{email:body.email,password})).user.business_id,enrolled.business_id);
    assert.equal((await pool.query('select id from stamp_members where business_id=$1',[enrolled.business_id])).rowCount,22);
  });
  await t.test('existing sample can pay through the normal checkout; approved payment preserves data',async()=>{
    const paymentService=require('../backend/src/services/mercadoPagoService');
    const checkout=await paymentService.createSubscriptionRenewalCheckout(owner.user,{plan_code:'STARTER',idempotency_key:randomUUID()});
    assert.equal(mpRequests.at(-1).items[0].unit_price,229000);
    assert.equal((await getBusinessSubscription(enrolled.business_id)).plan.code,'DESCUBRE','Creating checkout is not proof of payment');
    await withTransaction(async client=>{
      const order=(await client.query('select * from qr_credit_purchase_orders where id=$1 for update',[checkout.id])).rows[0];
      await paymentService.__testing.finalizeApprovedPortalSubscription(client,order,{id:'qa-approved-'+Date.now(),transaction_amount:229000,currency_id:'COP'},order.metadata.signup);
    });
    const plan=(await getBusinessSubscription(enrolled.business_id)).plan;
    assert.equal(plan.code,'STARTER');assert.equal(plan.portal_access_allowed,true);assert.equal(plan.monthly_payment_required,true);
    assert.equal((await pool.query('select id from stamp_members where business_id=$1',[enrolled.business_id])).rowCount,22);
    assert.equal((await pool.query('select seller_id from qori_sales_accounts where business_id=$1',[enrolled.business_id])).rows[0].seller_id,seller.seller.id);
  });
  await t.test('paid signup link validates active advisor and assigns portfolio without activating unpaid access',async()=>{
    const advisor=await call('/api/public/commercial-advisors/'+seller.seller.id);
    assert.deepEqual(Object.keys(advisor.advisor).sort(),['id','name']);
    const paidBody={...body,email:`${prefix}-paid@example.test`,nit:`${prefix}-paid`,plan_code:'GROWTH',commercial_advisor_id:seller.seller.id};delete paidBody.request_id;
    const paid=await call('/api/public/signup/portal',null,paidBody,201);
    assert.equal(paid.business.subscription_status,'PENDING_PAYMENT');assert.equal(paid.business.is_active,false);
    assert.equal((await pool.query('select seller_id from qori_sales_accounts where business_id=$1',[paid.business.id])).rows[0].seller_id,seller.seller.id);
    await call('/api/public/signup/portal',null,{...paidBody,email:`${prefix}-fake@example.test`,nit:`${prefix}-fake`,commercial_advisor_id:owner.user.id},400);
  });
});
