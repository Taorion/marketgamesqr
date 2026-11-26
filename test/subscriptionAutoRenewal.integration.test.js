const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID,createHmac}=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='autorenew-local-qa';
const {query,pool}=require('../backend/src/config/db');
const {env}=require('../backend/src/config/env');
const renewal=require('../backend/src/services/subscriptionAutoRenewalService');
const mp=require('../backend/src/services/mercadoPagoService');
const actualFetch=global.fetch,mandates=new Map(),invoices=new Map(),payments=new Map();
let creates=0,denyCancel=false,loseCreateResponse=false,server;const invoiceOffsets=[];
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const uuid=randomUUID;
async function fixture(plan='STARTER') {
  const b=(await query("insert into businesses(name,slug,plan_code,subscription_status,subscription_current_period_ends_at) values('Auto renewal QA',$1,$2,'ACTIVE',now()+interval '10 days') returning *",['renew-'+uuid(),plan])).rows[0];
  const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Renewal QA','BUSINESS_OWNER') returning *",[b.id,uuid()+'@example.invalid'])).rows[0];
  await query('insert into business_qr_credit_accounts(business_id) values($1)',[b.id]);
  return {b,u};
}
const business=id=>query('select * from businesses where id=$1',[id]).then(r=>r.rows[0]);
const order=id=>query('select * from qr_credit_purchase_orders where id=$1',[id]).then(r=>r.rows[0]);
function request(topic,id) {const ts=String(Date.now()),rid=uuid(),hash=createHmac('sha256',env.mercadoPagoWebhookSecret).update(`id:${String(id).toLowerCase()};request-id:${rid};ts:${ts};`).digest('hex');return {headers:{'x-signature':`ts=${ts},v1=${hash}`,'x-request-id':rid},query:{'data.id':id,type:topic},body:{data:{id}}};}
function addInvoice(m,status='approved',debit=new Date()) {
  const id=uuid(),pid=uuid(),p={id:pid,status,currency_id:'COP',transaction_amount:m.auto_recurring.transaction_amount,external_reference:m.external_reference,live_mode:true};
  payments.set(pid,p);const invoice={id,preapproval_id:m.id,external_reference:m.external_reference,debit_date:debit.toISOString(),payment:{id:pid,status}};invoices.set(id,invoice);return {invoice,p};
}
after(async()=>{global.fetch=actualFetch;if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});

test('Monthly card renewal: authorization, provider verification, recovery and cancellation',async t=>{
  assert.equal((await query('select current_database() db')).rows[0].db,'qori_customer_qa');
  env.mercadoPagoAccessToken='TEST-local';env.mercadoPagoWebhookSecret='local-webhook';
  global.fetch=async(input,options={})=>{
    const url=new URL(String(input));if(url.origin!=='https://api.mercadopago.com'){assert.equal(url.hostname,'127.0.0.1');return actualFetch(input,options);}
    const body=options.body?JSON.parse(options.body):{};
    if(url.pathname==='/preapproval/search')return json({results:[...mandates.values()].filter(m=>m.external_reference===url.searchParams.get('external_reference'))});
    if(url.pathname==='/preapproval'&&options.method==='POST'){
      creates++;const m={...body,id:uuid().replaceAll('-',''),init_point:'https://example.invalid/authorize',last_modified:new Date().toISOString()};mandates.set(m.id,m);if(loseCreateResponse){loseCreateResponse=false;throw Error("Response lost");}return json(m,201);
    }
    if(url.pathname.startsWith('/preapproval/')){
      const m=mandates.get(url.pathname.split('/').pop());if(!m)return json({message:'Not found'},404);
      if(options.method==='PUT'){if(denyCancel)return json({message:'Unavailable'},503);Object.assign(m,body,{last_modified:new Date().toISOString()});}return json(m);
    }
    if(url.pathname==='/authorized_payments/search'){
      const rows=[...invoices.values()].filter(i=>url.searchParams.has('payment_id')?String(i.payment?.id)===url.searchParams.get('payment_id'):i.preapproval_id===url.searchParams.get('preapproval_id'));
      const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||20);if(url.searchParams.has('limit'))return json({message:'Invalid value for limit'},400);invoiceOffsets.push(offset);return json({results:rows.slice(offset,offset+limit),paging:{total:rows.length}});
    }
    if(url.pathname.startsWith('/authorized_payments/'))return json(invoices.get(url.pathname.split('/').pop()));
    if(url.pathname.startsWith('/v1/payments/'))return json(payments.get(url.pathname.split('/').pop()));
    throw Error('Unexpected provider request '+url.pathname);
  };
  let f,result,m,first,second,period;
  await t.test('creates one monthly authorization with the paid period end as first charge',async()=>{
    f=await fixture();result=await renewal.create(f.u,{plan_code:'STARTER'});m=mandates.get(result.auto_renewal.mercado_pago_preapproval_id);
    assert.equal(m.auto_recurring.frequency,1);assert.equal(m.auto_recurring.frequency_type,'months');assert.equal(m.auto_recurring.currency_id,'COP');
    assert.equal(m.auto_recurring.start_date,new Date(f.b.subscription_current_period_ends_at).toISOString());
    assert.equal((await order(result.order.id)).credited_at,null);assert.equal((await business(f.b.id)).subscription_auto_renew_enabled,false);
  });
  await t.test('multiple tabs and different request keys reuse the pending mandate',async()=>{
    const n=creates;await renewal.create(f.u,{plan_code:'STARTER',idempotency_key:uuid()});
    const attempts=await Promise.allSettled([renewal.create(f.u,{plan_code:'STARTER'}),renewal.create(f.u,{plan_code:'STARTER'})]);
    assert.ok(attempts.some(a=>a.status==='fulfilled'));assert.equal(creates,n);
    await assert.rejects(renewal.create(f.u,{plan_code:'GROWTH'}),/Cancela/);
  });
  await t.test('authorization activates the mandate but does not pay or extend the plan',async()=>{
    m.status='authorized';m.next_payment_date=m.auto_recurring.start_date;
    const before=(await business(f.b.id)).subscription_current_period_ends_at;
    await mp.processMercadoPagoWebhook(request('subscription_preapproval',m.id));
    const b=await business(f.b.id);assert.equal(b.subscription_auto_renew_enabled,true);assert.equal(+b.subscription_current_period_ends_at,+before);assert.equal((await order(result.order.id)).credited_at,null);
  });
  await t.test('a second authorization or manual renewal cannot cause parallel billing',async()=>{
    const n=creates,r=await renewal.create(f.u,{plan_code:'STARTER'});assert.equal(r.auto_renewal.enabled,true);assert.equal(creates,n);
    await assert.rejects(mp.createSubscriptionRenewalCheckout(f.u,{plan_code:'STARTER'}),/Cancela/);
  });
  await t.test('pending first payment gives no access extension; approval credits it once',async()=>{
    first=addInvoice(m,'pending');const before=(await business(f.b.id)).subscription_current_period_ends_at;
    await mp.processMercadoPagoWebhook(request('subscription_authorized_payment',first.invoice.id));assert.equal(+((await business(f.b.id)).subscription_current_period_ends_at),+before);
    first.p.status='approved';first.invoice.payment.status='approved';
    await mp.processMercadoPagoWebhook(request('subscription_authorized_payment',first.invoice.id));period=(await business(f.b.id)).subscription_current_period_ends_at;assert.ok(period>before);
    await Promise.all(Array.from({length:4},()=>mp.processMercadoPagoWebhook(request('subscription_authorized_payment',first.invoice.id))));
    assert.equal(+((await business(f.b.id)).subscription_current_period_ends_at),+period);
    assert.equal((await query('select * from qr_credit_purchase_orders where mercado_pago_payment_id=$1',[first.p.id])).rowCount,1);
  });
  await t.test('a later rejected invoice can become approved without being lost as a duplicate',async()=>{
    // Use a historical unpaid period to test a subsequent provider billing cycle.
    const debit=new Date();debit.setUTCDate(debit.getUTCDate()-2);
    await query("update businesses set subscription_current_period_ends_at=now()-interval '3 days' where id=$1",[f.b.id]);
    second=addInvoice(m,'rejected',debit);await mp.processMercadoPagoWebhook(request('subscription_authorized_payment',second.invoice.id));
    const row=(await query('select * from qr_credit_purchase_orders where mercado_pago_payment_id=$1',[second.p.id])).rows[0];assert.equal(row.status,'REJECTED');assert.equal(row.credited_at,null);
    second.p.status='approved';second.invoice.payment.status='approved';await mp.processMercadoPagoWebhook(request('subscription_authorized_payment',second.invoice.id));
    assert.ok((await order(row.id)).credited_at);period=(await business(f.b.id)).subscription_current_period_ends_at;assert.ok(period>new Date());
    await mp.processMercadoPagoWebhook(request('payment',second.p.id));assert.equal(+((await business(f.b.id)).subscription_current_period_ends_at),+period);
  });
  await t.test('provider refresh recovers a missed invoice with no browser return or webhook',async()=>{
    const third=addInvoice(m);await renewal.refresh(f.u);
    const row=(await query('select * from qr_credit_purchase_orders where mercado_pago_payment_id=$1',[third.p.id])).rows[0];assert.ok(row.credited_at);
    const before=(await business(f.b.id)).subscription_current_period_ends_at;await renewal.refresh(f.u);assert.equal(+((await business(f.b.id)).subscription_current_period_ends_at),+before);
    assert.ok((await business(f.b.id)).settings.subscription.auto_renew_checked_at);
  });
  await t.test('reconciliation uses provider pagination without an unsupported limit parameter',async()=>{
    invoiceOffsets.length=0;for(let i=0;i<21;i++){const id=uuid();invoices.set(id,{id,preapproval_id:m.id});}
    await renewal.refresh(f.u);assert.ok(invoiceOffsets.includes(20));
  });
  await t.test('wrong amount, currency, signature and invoice association never credit',async()=>{
    for(const field of ['amount','currency','association']){
      const x=addInvoice(m);if(field==='amount')x.p.transaction_amount=1;if(field==='currency')x.p.currency_id='USD';if(field==='association')x.invoice.preapproval_id='another-mandate';
      await assert.rejects(mp.processMercadoPagoWebhook(request('subscription_authorized_payment',x.invoice.id)));
      assert.equal((await query('select * from qr_credit_purchase_orders where mercado_pago_payment_id=$1 and credited_at is not null',[x.p.id])).rowCount,0);invoices.delete(x.invoice.id);
    }
    const req=request('payment',first.p.id);req.headers['x-signature']='ts=123,v1=bad';await assert.rejects(mp.processMercadoPagoWebhook(req),/invalida/);
  });
  await t.test('an old mandate event cannot replace the current authorization',async()=>{
    await query('update businesses set mercado_pago_preapproval_id=$2 where id=$1',[f.b.id,'new-current']);
    const r=await mp.processPreapprovalWebhook(m.id);assert.equal(r.reason,'superseded_preapproval');assert.equal((await business(f.b.id)).mercado_pago_preapproval_id,'new-current');
    await query('update businesses set mercado_pago_preapproval_id=$2 where id=$1',[f.b.id,m.id]);
  });
  await t.test('failed cancellation leaves authorization intact; confirmed cancellation preserves paid access',async()=>{
    denyCancel=true;await assert.rejects(renewal.cancel(f.u));assert.equal((await business(f.b.id)).subscription_auto_renew_enabled,true);
    denyCancel=false;const before=(await business(f.b.id)).subscription_current_period_ends_at;await renewal.cancel(f.u);
    const b=await business(f.b.id);assert.equal(m.status,'cancelled');assert.equal(b.subscription_auto_renew_enabled,false);assert.equal(b.subscription_auto_renew_status,'CANCELLED');assert.equal(+b.subscription_current_period_ends_at,+before);
    await renewal.cancel(f.u);const after=await business(f.b.id);assert.equal(+after.subscription_current_period_ends_at,+before);assert.equal(+after.subscription_auto_renew_cancelled_at,+b.subscription_auto_renew_cancelled_at);
  });
  await t.test('cancelled mandate can be replaced and stale notifications stay isolated',async()=>{
    const created=await renewal.create(f.u,{plan_code:'STARTER'});assert.notEqual(created.auto_renewal.mercado_pago_preapproval_id,m.id);
    await mp.processPreapprovalWebhook(m.id);assert.equal((await business(f.b.id)).mercado_pago_preapproval_id,created.auto_renewal.mercado_pago_preapproval_id);
  });
  await t.test('Despega and other businesses cannot enroll through a staff account',async()=>{
    const prepaid=await fixture('DESPEGA');await assert.rejects(renewal.create(prepaid.u,{plan_code:'DESPEGA'}),/prepago/);
    await assert.rejects(renewal.cancel({...f.u,role:'STAFF'}),/administrador/);
    const other=await fixture();const empty=await renewal.refresh(other.u);assert.equal(empty.plan.auto_renew.mercado_pago_preapproval_id,null);
  });
  await t.test('provider creation survives a lost response without a second mandate',async()=>{
    const fresh=await fixture(),n=creates;loseCreateResponse=true;await assert.rejects(renewal.create(fresh.u,{plan_code:'STARTER'}),/Response lost/);
    const retry=await renewal.create(fresh.u,{plan_code:'STARTER'});assert.ok(retry.auto_renewal.checkout_url);assert.equal(creates,n+1);
  });
  await t.test('monthly calendar arithmetic does not skip February for January 31',()=>{
    assert.equal(mp.__testing.addPlanBillingPeriod(new Date('2027-01-31T15:00:00Z'),{billing_frequency:1}).toISOString(),'2027-02-28T15:00:00.000Z');
  });
  await t.test('default card checkout requires the displayed renewal notice and defers a paid account until expiry',async()=>{
    const fresh=await fixture(),n=creates;
    await assert.rejects(mp.createSubscriptionRenewalCheckout(fresh.u,{plan_code:'STARTER'}),/aviso de renovación/);
    assert.equal(creates,n);
    const o=await renewal.withBusinessLock(fresh.b.id,()=>mp.createSubscriptionRenewalCheckout(fresh.u,{plan_code:'STARTER',auto_renewal_consent:true}));
    const mandate=mandates.get(o.mercado_pago_preference_id);
    assert.equal(mandate.auto_recurring.start_date,fresh.b.subscription_current_period_ends_at.toISOString());
    const row=await order(o.id);assert.equal(row.metadata.signup.payment_mode,'recurring_card');
    assert.equal(row.metadata.signup.renewal_consent.amount_cop,229000);
    assert.equal(row.metadata.signup.renewal_consent.user_id,fresh.u.id);
    assert.equal((await business(fresh.b.id)).subscription_auto_renew_enabled,false);
    mandate.status='authorized';await mp.processPreapprovalWebhook(mandate.id);
    assert.equal((await business(fresh.b.id)).subscription_auto_renew_enabled,true);
    assert.equal((await order(o.id)).credited_at,null);
    await renewal.cancel(fresh.u);
    assert.equal(+(await business(fresh.b.id)).subscription_current_period_ends_at,+fresh.b.subscription_current_period_ends_at);
  });
  await t.test('public signup enrolls once; authorization alone gives no access and the first verified invoice activates the plan',async()=>{
    const fresh=await fixture();
    await query("update businesses set is_active=false,subscription_status='PENDING_PAYMENT',subscription_current_period_ends_at=null,settings=coalesce(settings,'{}') || '{\"signup_type\":\"portal_subscription\"}'::jsonb where id=$1",[fresh.b.id]);
    const recoveryPassword='LocalRenewal!2026';
    await query('update app_users set is_active=false,password_hash=$2 where id=$1',[fresh.u.id,await require('bcryptjs').hash(recoveryPassword,4)]);
    const o=await require('../backend/src/config/db').withTransaction(db=>mp.createPortalSignupCheckout(db,{business_id:fresh.b.id,user_id:fresh.u.id,email:fresh.u.email,plan_code:'STARTER',auto_renewal_consent:true}));
    const mandate=mandates.get(o.mercado_pago_preference_id);
    assert.ok(mandate);assert.equal(mandate.auto_recurring.start_date,undefined);assert.equal(mandate.auto_recurring.transaction_amount,229000);
    mandate.status='authorized';await mp.processPreapprovalWebhook(mandate.id);
    assert.equal((await business(fresh.b.id)).is_active,false);
    assert.equal((await business(fresh.b.id)).subscription_auto_renew_enabled,true);
    const recovery=await require('../backend/src/services/signupRecoveryService').recover({email:fresh.u.email,password:recoveryPassword});
    assert.equal(recovery.state,'AWAITING_FIRST_PAYMENT');assert.equal(recovery.order,undefined);
    const invoice=addInvoice(mandate,'pending');await mp.processMercadoPagoResource('subscription_authorized_payment',invoice.invoice.id);
    assert.equal((await business(fresh.b.id)).is_active,false);
    invoice.p.status='approved';invoice.invoice.payment.status='approved';
    await mp.processMercadoPagoResource('subscription_authorized_payment',invoice.invoice.id);
    const paid=await business(fresh.b.id);assert.equal(paid.is_active,true);assert.equal(paid.subscription_status,'ACTIVE');assert.equal(paid.subscription_auto_renew_enabled,true);
    assert.equal((await query('select is_active from app_users where id=$1',[fresh.u.id])).rows[0].is_active,true);
    await mp.processMercadoPagoResource('payment',invoice.p.id);
    assert.equal(+(await business(fresh.b.id)).subscription_current_period_ends_at,+paid.subscription_current_period_ends_at);
    await renewal.cancel(fresh.u);assert.equal((await business(fresh.b.id)).is_active,true);
  });
  await t.test('free-account upgrade preserves the old plan until payment and supports completing a pending mandate',async()=>{
    const fresh=await fixture('PENSE_EN_TI');
    await query('update businesses set subscription_current_period_ends_at=null where id=$1',[fresh.b.id]);
    const o=await renewal.withBusinessLock(fresh.b.id,()=>mp.createSubscriptionRenewalCheckout(fresh.u,{plan_code:'STARTER',auto_renewal_consent:true}));
    const mandate=mandates.get(o.mercado_pago_preference_id);
    assert.equal(mandate.auto_recurring.start_date,undefined);
    const pending=await renewal.create(fresh.u,{plan_code:'STARTER'});assert.equal(pending.reused,true);
    mandate.status='authorized';await mp.processPreapprovalWebhook(mandate.id);
    assert.equal((await business(fresh.b.id)).plan_code,'PENSE_EN_TI');
    const invoice=addInvoice(mandate);await mp.processMercadoPagoResource('subscription_authorized_payment',invoice.invoice.id);
    assert.equal((await business(fresh.b.id)).plan_code,'STARTER');
    await query('update businesses set mercado_pago_preapproval_id=$2 where id=$1',[fresh.b.id,'replacement']);
    const stale=addInvoice(mandate);await assert.rejects(mp.processMercadoPagoResource('subscription_authorized_payment',stale.invoice.id),/reemplazada/);
    assert.equal((await query('select id from qr_credit_purchase_orders where mercado_pago_payment_id=$1',[stale.p.id])).rowCount,0);
  });
  await t.test('default checkout recovers a lost provider response even with a different browser request key',async()=>{
    const fresh=await fixture(),n=creates;loseCreateResponse=true;
    const body={plan_code:'STARTER',auto_renewal_consent:true,idempotency_key:uuid()};
    await assert.rejects(mp.createSubscriptionRenewalCheckout(fresh.u,body),/Response lost/);
    const o=await mp.createSubscriptionRenewalCheckout(fresh.u,{...body,idempotency_key:uuid()});
    assert.ok(o.checkout_url);assert.equal(creates,n+1);
    assert.equal((await business(fresh.b.id)).mercado_pago_preapproval_id,o.mercado_pago_preference_id);
  });
  await t.test('management routes require an authenticated billing administrator',async()=>{
    server=require('../backend/src/app').app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    const base='http://127.0.0.1:'+server.address().port;
    for(const path of ['auto-renewal','auto-renewal/refresh','auto-renewal/cancel'])assert.equal((await actualFetch(base+'/api/payments/subscriptions/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
  });
});
