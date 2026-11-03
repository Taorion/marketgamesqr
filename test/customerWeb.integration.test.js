const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const path=require('node:path');
// Always the isolated Customer database, never DATABASE_URL from the shell.
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='customer-web-local-test';
process.env.PUBLIC_APP_URL='http://127.0.0.1:3051';process.env.CUSTOMER_LOCAL_MAILBOX='true';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db');
const {app}=require('../backend/src/app');
const stamps=require('../backend/src/services/stampCardService');
const links=require('../backend/src/services/customerService');
const model=require('../customer-web/wallet-model');
let server,base,buyer,outsider,b1,b2,operator,m1,m2,m3;
const rules={name:'Mi programa',stamps_required:2,benefit_type:'FREE_GIFT',benefit_value:{label:'Un café gratis'},minimum_purchase:5000,
  one_per_day:false,allow_manual:false,card_valid_days:365,ticket_valid_days:30,reward_cost:2000,ticket_cost:1000,terms:'Personal.',status:'ACTIVE'};
async function api(route,{body,method=body?'POST':'GET',cookie,headers={}}={}){
  const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',Origin:base,'X-Qori-Web':'1',...(cookie?{Cookie:cookie}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,headers:response.headers,data:await response.json()};
}
async function signup(){
  const email=crypto.randomUUID()+'@example.test';
  const challenge=await api('/api/customer/auth/web/code',{body:{email}});assert.equal(challenge.status,200,JSON.stringify(challenge.data));
  const mailbox=JSON.parse(await fs.readFile(path.join(__dirname,'../.local-customer/mailbox',challenge.data.challenge_id+'.json'),'utf8'));
  const result=await api('/api/customer/auth/web/verify',{body:{challenge_id:challenge.data.challenge_id,code:mailbox.code,consent:true}});
  assert.equal(result.status,200,JSON.stringify(result.data));return {...result,cookie:result.headers.get('set-cookie').split(';')[0],email,challenge:challenge.data.challenge_id,code:mailbox.code};
}
async function business(){return (await query(`insert into businesses(name,slug,plan_code,subscription_status,settings)
  values('Café del barrio',$1,'PRO','ACTIVE',$2::jsonb) returning *`,[crypto.randomUUID(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];}
async function enrollment(businessId,document){const p=await stamps.saveProgram(businessId,null,rules);return (await stamps.enroll(businessId,null,{program_id:p.id,name:'Cliente web',document_id:document,email:buyer.email,consent:true})).member;}
async function connect(businessId,document){
  const proposed=await links.proposeRelationship({id:operator.id,business_id:businessId},{public_id:buyer.data.account.public_id,document_id:document,identity_checked:true});
  return api(`/api/customer/relationships/${proposed.relationship.id}/decision`,{cookie:buyer.cookie,body:{action:'ACCEPT',include_history:true}});
}
test('Customer web registration and multi-business loyalty use real canonical data',async t=>{
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base=`http://127.0.0.1:${server.address().port}`;
  require('../backend/src/config/env').env.corsOrigins.push(base);
  await t.test('web entry point and assets are public and do not require an enterprise plan',async()=>{
    for(const route of ['/customer/','/customer/app.js','/customer/portal.js','/customer/portal.css','/customer/styles.css','/customer/wallet-model.js','/customer/privacidad.html']){
      const response=await fetch(base+route);assert.equal(response.status,200,route);assert.match(response.headers.get('cache-control'),/no-cache/);
    }
    assert.match(await (await fetch(base+'/customer/')).text(),/Tu portal de beneficios y finanzas/);
    assert.equal((await (await fetch(base+'/customer/manifest.webmanifest')).json()).start_url,'/customer/');
  });
  await t.test('web authentication requires same-origin requests and consent',async()=>{
    assert.equal((await api('/api/customer/auth/web/code',{body:{email:'blocked@example.test'},headers:{Origin:'https://foreign.test'}})).status,403);
    assert.equal((await api('/api/customer/auth/web/code',{body:{email:'blocked@example.test'},headers:{'X-Qori-Web':''}})).status,403);
    const challenge=await api('/api/customer/auth/web/code',{body:{email:crypto.randomUUID()+'@example.test'}});
    assert.equal((await api('/api/customer/auth/web/verify',{body:{challenge_id:challenge.data.challenge_id,code:'000000',consent:false}})).status,400);
  });
  await t.test('verified registration stores an HttpOnly session without returning a token to JavaScript',async()=>{
    buyer=await signup();outsider=await signup();
    assert.equal(buyer.data.token,undefined);assert.equal(buyer.data.account.email,buyer.email);
    assert.match(buyer.headers.get('set-cookie'),/HttpOnly/);assert.match(buyer.headers.get('set-cookie'),/SameSite=Strict/);assert.match(buyer.headers.get('set-cookie'),/Path=\/api\/customer/);
    assert.ok(buyer.data.account.preferences.web_registration.accepted_at);
    assert.equal((await api('/api/customer/me',{cookie:buyer.cookie})).status,200);
    assert.equal((await api('/api/auth/me',{cookie:buyer.cookie})).status,401);
    assert.equal((await api('/api/customer/auth/web/verify',{body:{challenge_id:buyer.challenge,code:buyer.code,consent:true}})).status,401);
  });
  await t.test('cookie writes reject cross-site requests and profile changes preserve registration consent',async()=>{
    const body={full_name:'Compradora Web',currency:'COP',timezone:'America/Bogota',preferences:{notifications:{purchases:true,benefits:true,budget:false,summary:false}}};
    assert.equal((await api('/api/customer/me',{cookie:buyer.cookie,method:'PATCH',body,headers:{Origin:'https://foreign.test'}})).status,403);
    assert.equal((await api('/api/customer/me',{cookie:buyer.cookie,method:'PATCH',body,headers:{'X-Qori-Web':''}})).status,403);
    const changed=await api('/api/customer/me',{cookie:buyer.cookie,method:'PATCH',body});assert.equal(changed.status,200);
    assert.equal(changed.data.account.full_name,'Compradora Web');assert.ok(changed.data.account.preferences.web_registration.accepted_at);
  });
  await t.test('matching contact data never auto-links cards and pending relationships reveal no cards',async()=>{
    b1=await business();b2=await business();
    operator=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Operador','BUSINESS_OWNER') returning *",[b1.id,crypto.randomUUID()+'@example.test'])).rows[0];
    m1=await enrollment(b1.id,'WEB123');m2=await enrollment(b1.id,'WEB123');m3=await enrollment(b2.id,'WEB123');
    assert.equal((await api('/api/customer/wallet/overview',{cookie:buyer.cookie})).data.cards.length,0);
    const proposed=await links.proposeRelationship({id:operator.id,business_id:b1.id},{public_id:buyer.data.account.public_id,document_id:'WEB123',identity_checked:true});
    assert.equal((await api('/api/customer/wallet/overview',{cookie:buyer.cookie})).data.cards.length,0);
    assert.equal((await api(`/api/customer/relationships/${proposed.relationship.id}/decision`,{cookie:outsider.cookie,body:{action:'ACCEPT',include_history:true}})).status,404);
  });
  await t.test('one accepted connection includes multiple programs, and two businesses retain separate identities',async()=>{
    assert.equal((await connect(b1.id,'WEB123')).status,200);assert.equal((await connect(b2.id,'WEB123')).status,200);
    const result=await api('/api/customer/wallet/overview',{cookie:buyer.cookie});assert.equal(result.status,200,JSON.stringify(result.data));
    assert.equal(result.data.cards.length,3);assert.equal(result.data.free_for_buyers,true);
    const grouped=model.groups(result.data.cards);assert.equal(grouped.length,2);assert.equal(grouped.find(g=>g.id===b1.id).cards.length,2);
    assert.equal(new Set(result.data.cards.map(c=>c.program_id)).size,3);
    for(const card of result.data.cards){assert.equal(card.public_token,undefined);assert.equal(card.document_key,undefined);assert.equal(card.qr_image,undefined);}
    assert.equal((await api('/api/customer/wallet/overview',{cookie:outsider.cookie})).data.cards.length,0);
    assert.equal((await api(`/api/customer/wallet/cards/${m1.id}`,{cookie:outsider.cookie})).status,404);
    assert.equal((await api(`/api/customer/wallet/cards/${m1.id}`,{cookie:buyer.cookie})).status,200);
  });
  await t.test('paid sales and stamp reversals from Empresa are reflected without duplicate transactions',async()=>{
    const paid=async()=> (await query("insert into business_sales(business_id,customer_name,customer_document_id,sale_amount,sale_status,paid_at) values($1,'Cliente','WEB123',10000,'PAID',now()) returning *",[b1.id])).rows[0];
    await paid();const second=await paid();
    let cards=(await api('/api/customer/wallet/overview',{cookie:buyer.cookie})).data.cards;
    assert.equal(cards.find(c=>c.id===m1.id).stamps,2);assert.equal(cards.find(c=>c.id===m1.id).status,'READY');assert.equal(cards.find(c=>c.id===m3.id).stamps,0);
    const event=(await query('select id from stamp_events where member_id=$1 and sale_id=$2',[m1.id,second.id])).rows[0];
    await stamps.voidStamp(b1.id,operator.id,event.id,'Ajuste local de prueba');
    cards=(await api('/api/customer/wallet/overview',{cookie:buyer.cookie})).data.cards;
    assert.equal(cards.find(c=>c.id===m1.id).stamps,1);assert.equal(cards.find(c=>c.id===m1.id).status,'ACTIVE');assert.equal(cards.find(c=>c.id===m2.id).stamps,2);
    assert.equal((await query('select sale_status from business_sales where id=$1',[second.id])).rows[0].sale_status,'PAID');
  });
  await t.test('new programs appear automatically, while expired cards move into history',async()=>{
    const newest=await enrollment(b1.id,'WEB123');
    let result=await api('/api/customer/wallet/overview',{cookie:buyer.cookie});assert.ok(result.data.cards.some(c=>c.id===newest.id));
    await query("update stamp_cycles set expires_at=now()-interval '1 day' where member_id=$1",[newest.id]);
    result=await api('/api/customer/wallet/overview',{cookie:buyer.cookie});
    assert.equal(model.groups(result.data.cards,{status:'HISTORY'})[0].cards[0].id,newest.id);
  });
  await t.test('revoking one business removes its cards and private details without affecting another business',async()=>{
    const relations=(await api('/api/customer/relationships',{cookie:buyer.cookie})).data.relationships;
    const relationship=relations.find(r=>r.business_id===b1.id);
    assert.equal((await api(`/api/customer/relationships/${relationship.id}/decision`,{cookie:buyer.cookie,body:{action:'REVOKE'}})).status,200);
    const cards=(await api('/api/customer/wallet/overview',{cookie:buyer.cookie})).data.cards;
    assert.equal(cards.length,1);assert.equal(cards[0].business_id,b2.id);
    assert.equal((await api(`/api/customer/wallet/cards/${m1.id}`,{cookie:buyer.cookie})).status,404);
  });
  await t.test('logout clears the browser cookie and revokes its server-side session',async()=>{
    const result=await api('/api/customer/logout',{cookie:buyer.cookie,body:{}});assert.equal(result.status,200);
    assert.match(result.headers.get('set-cookie'),/Expires=Thu, 01 Jan 1970/);
    assert.equal((await api('/api/customer/me',{cookie:buyer.cookie})).status,401);
  });
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await pool.end();});
