const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('crypto');
const fs=require('fs/promises');
const path=require('path');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='local-customer-integration-only';
process.env.PUBLIC_APP_URL='http://127.0.0.1:3051';process.env.CUSTOMER_LOCAL_MAILBOX='true';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db');
const {app}=require('../backend/src/app');
const jwt=require('jsonwebtoken');
const stamps=require('../backend/src/services/stampCardService');
const affiliates=require('../backend/src/services/affiliateService');
const gifts=require('../backend/src/services/rewardPassService');
let server,base,customer,other,business,enterprise,member,saleId,manual;
async function api(url,token,body,method=body?'POST':'GET') {
  const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,...await response.json()};
}
async function login(email) {
  const r=await api('/api/customer/auth/code',null,{email});assert.equal(r.status,200,JSON.stringify(r));
  const mail=JSON.parse(await fs.readFile(path.join(__dirname,'../.local-customer/mailbox',`${r.challenge_id}.json`),'utf8'));
  const verified=await api('/api/customer/auth/verify',null,{challenge_id:r.challenge_id,code:mail.code});
  assert.equal(verified.status,200,JSON.stringify(verified));return {...verified,challenge_id:r.challenge_id,code:mail.code};
}
test('real customer integration with existing enterprise sale and stamp services',async t=>{
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;
  await t.test('verified email creates personal account; OTP is consumed and not an enterprise session',async()=>{
    customer=await login(`buyer-${crypto.randomUUID()}@example.test`);other=await login(`other-${crypto.randomUUID()}@example.test`);
    assert.equal((await api('/api/customer/auth/verify',null,{challenge_id:customer.challenge_id,code:customer.code})).status,401);
    assert.equal((await api('/api/auth/me',customer.token)).status,401);
  });
  await t.test('create actual business and loyalty program in isolated database',async()=>{
    business=(await query(`insert into businesses(name,slug,plan_code,subscription_status,settings) values('Café Qori QA',$1,'PRO','ACTIVE',$2::jsonb) returning *`,['customer-'+crypto.randomUUID(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];
    const user=(await query(`insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'test','Operador QA','BUSINESS_OWNER') returning *`,[business.id,crypto.randomUUID()+'@example.test'])).rows[0];
    enterprise=jwt.sign({sub:user.id,password_version:0},process.env.JWT_SECRET);
    await query('insert into business_qr_credit_accounts(business_id,qr_balance,qr_purchased_total) values($1,10,10)',[business.id]);
    const program=await stamps.saveProgram(business.id,user.id,{name:'Café de la casa',stamps_required:2,benefit_type:'FREE_GIFT',benefit_value:{label:'Un café gratis'},minimum_purchase:5000,one_per_day:false,allow_manual:true,card_valid_days:365,ticket_valid_days:30,reward_cost:2000,ticket_cost:1000,terms:'Personal.',status:'ACTIVE'});
    member=(await stamps.enroll(business.id,user.id,{program_id:program.id,name:'Comprador QA',document_id:'CC-QA123',email:customer.account.email,consent:true})).member;
    assert.equal((await api('/api/customer/me',enterprise)).status,401);
  });
  await t.test('merchant proposes and only intended buyer can accept; history is explicit',async()=>{
    const proposal=await api('/api/business/customer/relationships',enterprise,{public_id:customer.account.public_id,document_id:'CC-QA123',identity_checked:true});
    assert.equal(proposal.status,200,JSON.stringify(proposal));
    assert.equal((await api(`/api/customer/relationships/${proposal.relationship.id}/decision`,other.token,{action:'ACCEPT',include_history:true})).status,404);
    assert.equal((await api('/api/customer/wallet',customer.token)).cards.length,0);
    assert.equal((await api(`/api/customer/relationships/${proposal.relationship.id}/decision`,customer.token,{action:'ACCEPT',include_history:true})).status,200);
    assert.equal((await api('/api/customer/wallet',customer.token)).cards[0].id,member.id);
  });
  const saleBody={customer_name:'Comprador QA',customer_document_id:'CC-QA123',sale_amount:12000,currency:'COP',product_name:'Café',payment_method:'CASH',acquisition_source:'STORE_WALK_IN',idempotency_key:crypto.randomUUID()};
  await t.test('existing enterprise sale route automatically appears exactly once and earns stamp',async()=>{
    const sale=await api('/api/business/customer-acquisition-sales',enterprise,saleBody);
    assert.equal(sale.status,201,JSON.stringify(sale));saleId=sale.sale.id;
    const duplicate=await api('/api/business/customer-acquisition-sales',enterprise,saleBody);assert.equal(duplicate.sale.id,saleId);
    const dashboard=await api('/api/customer/dashboard',customer.token);assert.equal(dashboard.status,200,JSON.stringify(dashboard));
    assert.equal(dashboard.total_minor,1200000);assert.equal(dashboard.purchases,1);
    const wallet=await api('/api/customer/wallet',customer.token);assert.equal(wallet.cards[0].cycles[0].stamps,1);
    assert.equal((await api(`/api/customer/sales/${saleId}`,other.token)).status,404);
    assert.equal((await api('/api/customer/dashboard',other.token)).purchases,0);
  });
  await t.test('manual expense persists once under retries and cannot mint benefits',async()=>{
    const body={request_id:crypto.randomUUID(),amount:'12000',currency:'COP',occurred_at:new Date().toISOString(),merchant:'Café Qori QA',category:'alimentacion',note:'Mi nota',expense_pattern:'RECURRING'};
    const created=await api('/api/customer/entries',customer.token,body);assert.equal(created.status,200,JSON.stringify(created));manual=created.entry;
    const retry=await api('/api/customer/entries',customer.token,body);assert.equal(retry.entry.id,manual.id);
    assert.equal((await api('/api/customer/dashboard',customer.token)).total_minor,2400000);
    assert.equal((await api('/api/customer/wallet',customer.token)).cards[0].cycles[0].stamps,1);
    assert.equal((await api(`/api/customer/entries/${manual.id}`,other.token)).status,404);
    assert.equal((await api(`/api/customer/entries/${manual.id}`,other.token,null,'DELETE')).status,404);
  });
  await t.test('receipts enforce ownership and validate real file signatures',async()=>{
    assert.equal((await api(`/api/customer/entries/${manual.id}/receipts`,other.token,{filename:'x.pdf',mime_type:'application/pdf',base64:Buffer.from('%PDF-1.7\n%%EOF').toString('base64')})).status,404);
    assert.equal((await api(`/api/customer/entries/${manual.id}/receipts`,customer.token,{filename:'x.pdf',mime_type:'application/pdf',base64:Buffer.from('<script>bad</script>').toString('base64')})).status,400);
    const upload=await api(`/api/customer/entries/${manual.id}/receipts`,customer.token,{filename:'QA.pdf',mime_type:'application/pdf',base64:Buffer.from('%PDF-1.7\n%%EOF').toString('base64')});assert.equal(upload.status,200);
    assert.equal((await api(`/api/customer/receipts/${upload.receipt.id}`,other.token)).status,404);
  });
  await t.test('manual match is proposed, explicit merge preserves personal notes and original sale',async()=>{
    const candidates=await api(`/api/customer/entries/${manual.id}/matches`,customer.token);assert.equal(candidates.candidates.length,1);
    assert.equal((await api(`/api/customer/entries/${manual.id}/link`,customer.token,{sale_id:saleId,confirmed:true})).status,200);
    const dashboard=await api('/api/customer/dashboard',customer.token);assert.equal(dashboard.total_minor,1200000);assert.equal(dashboard.movements[0].note,'Mi nota');
    assert.equal(dashboard.movements[0].expense_pattern,'RECURRING');
    const classification={category:'alimentacion',priority:'FLEXIBLE',note:'Mi nota',expense_pattern:'EVENTUAL'};
    assert.equal((await api(`/api/customer/sales/${saleId}/note`,customer.token,classification,'PATCH')).status,200);
    delete classification.expense_pattern;
    assert.equal((await api(`/api/customer/sales/${saleId}/note`,customer.token,classification,'PATCH')).status,200);
    assert.equal((await api('/api/customer/dashboard',customer.token)).movements[0].expense_pattern,'EVENTUAL');
    assert.equal((await query('select sale_amount from business_sales where id=$1',[saleId])).rows[0].sale_amount,'12000.00');
    assert.equal((await api(`/api/customer/sales/${saleId}/note`,customer.token,{category:'hogar',priority:'UNSET',note:'Cambio',sale_amount:1},'PATCH')).status,400);
  });
  await t.test('void from enterprise adjusts buyer amount and stamp without another ledger',async()=>{
    const result=await api(`/api/business/sales/${saleId}/void`,enterprise,{reason:'Prueba de devolución completa',idempotency_key:crypto.randomUUID()});
    assert.equal(result.status,200,JSON.stringify(result));
    assert.equal((await api('/api/customer/dashboard',customer.token)).total_minor,0);
    assert.equal((await api('/api/customer/wallet',customer.token)).cards[0].cycles[0].stamps,0);
  });
  let actor,affiliate,rule,branch,order,pass;
  const programs={points_terms:'Cada 1000 COP acumula un punto en compras elegibles.',accumulation_terms:'Las compras elegibles acumulan sellos y puntos según sus programas.',gift_enabled:true,gift_min:'10000',gift_max:'1000000',gift_terms:'Prueba sin valor comercial. Uso parcial en todas las sedes activas.',gift_payment_instructions:'Paga directamente en la caja del establecimiento.'};
  const directory={published:true,category:'Café QA',city:'Bogotá',address:'Solo prueba',description:'Establecimiento de prueba aislada'};
  await t.test('public business profile is independent from the optional full loyalty standard',async()=>{
    assert.equal((await api('/api/business/customer/directory',enterprise,directory,'PUT')).status,200);
    actor=(await query('select * from app_users where business_id=$1',[business.id])).rows[0];
    branch=(await query("insert into branches(business_id,name,slug) values($1,'Sede QA','qa') returning *",[business.id])).rows[0];
    affiliate=await affiliates.createAffiliate(business.id,actor,{full_name:'Comprador QA',document_id:'CC-QA123',email:customer.account.email});
    rule=await affiliates.createAffiliateRewardRule(business.id,actor,{title:'Premio QA',required_points:10,benefit_type:'FREE_GIFT',benefit_label:'Café de prueba',expiration_days:30});
    const standard=await api('/api/business/customer/standard',enterprise,programs,'PUT');
    assert.equal(standard.status,200,JSON.stringify(standard));assert.equal(standard.ready,true,JSON.stringify(standard));
    assert.equal((await api('/api/business/customer/directory',enterprise,directory,'PUT')).status,200);
    const places=await api('/api/customer/places',customer.token);assert.ok(places.places.some(p=>p.id===business.id&&p.qori_standard));
  });
  await t.test('real sale awards existing affiliate points once and owner claims one reward',async()=>{
    const body={...saleBody,sale_amount:20000,idempotency_key:crypto.randomUUID(),metadata:{affiliate_purchase:true}};
    const first=await api('/api/business/customer-acquisition-sales',enterprise,body);assert.equal(first.status,201,JSON.stringify(first));
    assert.equal((await api('/api/business/customer-acquisition-sales',enterprise,body)).sale.id,first.sale.id);
    const card=await api(`/api/customer/wallet/affiliations/${affiliate.id}`,customer.token);assert.equal(card.status,200,JSON.stringify(card));assert.equal(card.card.points_total,20);
    const summary=await api('/api/customer/wallet/overview',customer.token);
    assert.equal(summary.cards.find(c=>c.id===affiliate.id).kind,'POINTS');
    assert.equal(summary.cards.find(c=>c.id===affiliate.id).status,'READY');
    assert.ok(card.card.qr_image?.startsWith('data:image/'));
    assert.equal((await api(`/api/customer/wallet/affiliations/${affiliate.id}`,other.token)).status,404);
    const claim=await api(`/api/customer/wallet/affiliations/${affiliate.id}/claim`,customer.token,{reward_rule_id:rule.id});assert.equal(claim.status,200,JSON.stringify(claim));assert.ok(claim.ticket.qr_image);
    const retry=await api(`/api/customer/wallet/affiliations/${affiliate.id}/claim`,customer.token,{reward_rule_id:rule.id});assert.equal(retry.existing,true);
    assert.equal((await query('select count(*)::int n from affiliate_reward_tickets where affiliate_id=$1',[affiliate.id])).rows[0].n,1);
  });
  await t.test('gift order is not money or a benefit until merchant confirms actual payment',async()=>{
    const data={request_id:crypto.randomUUID(),business_id:business.id,buyer_name:'Comprador QA',recipient_name:'Otra persona QA',recipient_email:other.account.email,amount:'50000',message:'Un regalo de prueba',terms_accepted:true};
    const result=await api('/api/customer/gift-orders',customer.token,data);assert.equal(result.status,200,JSON.stringify(result));order=result.order;
    assert.equal((await api('/api/customer/gift-orders',customer.token,data)).order.id,order.id);
    assert.equal(order.state,'PENDING_PAYMENT');assert.equal(order.reward_pass_id,null);
    assert.equal((await api(`/api/customer/gift-orders/${order.id}`,other.token)).status,404);
    assert.equal((await api('/api/customer/wallet',other.token)).giftcards.received.length,0);
    assert.equal((await api('/api/customer/dashboard',customer.token)).total_minor,2000000);
    const confirmation={amount:'50000',payment_reference:'QA-RECEIPT-1',payment_method:'CASH',payment_received:true};
    assert.equal((await api(`/api/business/customer/gift-orders/${order.id}/confirm-payment`,customer.token,confirmation)).status,401);
    assert.equal((await api(`/api/business/customer/gift-orders/${order.id}/confirm-payment`,enterprise,{...confirmation,amount:'1'})).status,400);
    const confirmed=await Promise.all([api(`/api/business/customer/gift-orders/${order.id}/confirm-payment`,enterprise,confirmation),api(`/api/business/customer/gift-orders/${order.id}/confirm-payment`,enterprise,confirmation)]);
    for(const r of confirmed)assert.equal(r.status,200,JSON.stringify(r));assert.equal(confirmed[0].reward_pass_id,confirmed[1].reward_pass_id);
    assert.equal(confirmed.filter(r=>r.idempotent).length,1);
    pass=(await query('select * from reward_passes where id=$1',[confirmed[0].reward_pass_id])).rows[0];
    assert.equal((await api('/api/customer/dashboard',customer.token)).total_minor,7000000);
    assert.equal((await api('/api/customer/dashboard',other.token)).total_minor,0);
    assert.equal((await query('select count(*)::int n from reward_passes where company_id=$1',[business.id])).rows[0].n,1);
  });
  await t.test('only verified recipient receives gift, claims once and sees real redemption balance',async()=>{
    assert.equal((await api(`/api/customer/wallet/gifts/${pass.id}`,customer.token)).status,404);
    const received=await api(`/api/customer/wallet/gifts/${pass.id}`,other.token);assert.equal(received.status,200,JSON.stringify(received));assert.equal(received.card.claim_required,true);assert.equal(received.card.qr_image,undefined);
    assert.equal((await api('/api/customer/wallet/overview',other.token)).cards.find(c=>c.id===pass.id).status,'PENDING');
    assert.equal(JSON.stringify(received).includes(pass.security_pin),false);
    const claim=await api(`/api/customer/wallet/gifts/${pass.id}/accept`,other.token,{full_name:'Destinatario QA',document_id:'QA-RECIPIENT',terms_accepted:true});assert.equal(claim.status,200,JSON.stringify(claim));assert.ok(claim.card.qr_image);
    await api(`/api/customer/wallet/gifts/${pass.id}/accept`,other.token,{full_name:'Intento de cambio',document_id:'OTHER',terms_accepted:true});
    assert.equal((await query('select beneficiary_document from reward_passes where id=$1',[pass.id])).rows[0].beneficiary_document,'QA-RECIPIENT');
    const payload={purchase_value_cop:10000,redeemed_value_cop:10000,invoice_number:'QA-'+crypto.randomUUID(),document_checked:'QA-RECIPIENT',branch_id:branch.id,idempotency_key:crypto.randomUUID()};
    await assert.rejects(gifts.redeemRewardPass({...actor,business_id:crypto.randomUUID()},pass.qr_token,payload),/otro negocio/);
    await gifts.redeemRewardPass(actor,pass.qr_token,payload);
    assert.equal((await gifts.redeemRewardPass(actor,pass.qr_token,payload)).idempotent,true);
    const detail=await api(`/api/customer/wallet/gifts/${pass.id}`,other.token);assert.equal(Number(detail.card.balance),40000);assert.equal(detail.redemptions.length,1);
    const giftSummary=(await api('/api/customer/wallet/overview',other.token)).cards.find(c=>c.id===pass.id);
    assert.equal(giftSummary.kind,'GIFT');assert.equal(Number(giftSummary.balance),40000);assert.equal(giftSummary.status,'READY');
    const finalUse={...payload,purchase_value_cop:40000,redeemed_value_cop:40000,invoice_number:'QA-FINAL-'+crypto.randomUUID(),idempotency_key:crypto.randomUUID()};
    await gifts.redeemRewardPass(actor,pass.qr_token,finalUse);
    assert.equal((await gifts.redeemRewardPass(actor,pass.qr_token,finalUse)).idempotent,true);
    const consumed=await api(`/api/customer/wallet/gifts/${pass.id}`,other.token);assert.equal(Number(consumed.card.balance),0);assert.equal(consumed.card.status,'fully_redeemed');assert.equal(consumed.card.qr_image,undefined);assert.equal(consumed.redemptions.length,2);
    assert.equal((await api('/api/customer/wallet/overview',other.token)).cards.find(c=>c.id===pass.id).status,'ARCHIVED');
    assert.equal((await api('/api/customer/dashboard',other.token)).total_minor,0);
    assert.equal((await api('/api/customer/dashboard',customer.token)).total_minor,7000000);
  });
  await t.test('merchant without all three active services stops appearing as Somos Qori',async()=>{
    await api('/api/business/customer/standard',enterprise,{...programs,gift_enabled:false},'PUT');
    assert.equal((await api('/api/customer/places',customer.token)).places.some(p=>p.id===business.id),false);
    assert.equal((await api('/api/business/customer/directory',enterprise,directory,'PUT')).status,200);
    assert.equal((await api(`/api/customer/wallet/gifts/${pass.id}`,other.token)).status,200);
  });
  await t.test('database denies public Data API grants and session revocation is immediate',async()=>{
    const tables=await query("select relname,relrowsecurity from pg_class where relname like 'customer_%' and relkind='r'");assert.ok(tables.rows.length>=15);assert.ok(tables.rows.every(r=>r.relrowsecurity));
    const grants=await query("select c.relname from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where c.relname like 'customer_%' and c.relkind='r' and a.grantee=0");assert.equal(grants.rowCount,0);
    const logout=await api('/api/customer/logout',other.token,{});assert.equal(logout.status,200);assert.equal((await api('/api/customer/me',other.token)).status,401);
  });
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await pool.end();});
