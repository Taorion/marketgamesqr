const {test,after}=require('node:test');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs/promises'),path=require('node:path');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='customer-network-local';
process.env.PUBLIC_APP_URL='http://127.0.0.1:3051';process.env.CUSTOMER_LOCAL_MAILBOX='true';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app');
const jwt=require('jsonwebtoken'),stamps=require('../backend/src/services/stampCardService');
let server,base,buyer,other,b1,b2,u1,u2,token1,token2,program,activity,stampInvitation,memberId;
async function api(url,token,body,method=body?'POST':'GET'){
  const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,...await r.json()};
}
async function login(){
  const email=crypto.randomUUID()+'@example.test';const c=await api('/api/customer/auth/code',null,{email});
  const mail=JSON.parse(await fs.readFile(path.join(__dirname,'../.local-customer/mailbox',c.challenge_id+'.json'),'utf8'));
  const result=await api('/api/customer/auth/verify',null,{challenge_id:c.challenge_id,code:mail.code});
  const registered=await api('/api/customer/me',result.token,{full_name:'Comprador de red',currency:'COP',timezone:'America/Bogota',preferences:{notifications:{purchases:true,benefits:true,budget:true,summary:true}},document_id:'NEW-QORI-01',document_confirmation:'NEW-QORI-01'},'PATCH');assert.equal(registered.status,200,JSON.stringify(registered));
  const setup=await api('/api/customer/finance-setup',result.token);assert.equal(setup.status,200,JSON.stringify(setup));
  const done=await api('/api/customer/finance-setup',result.token,{request_id:crypto.randomUUID(),balance:'0',currency:setup.currency,expected_date:setup.today,confirmed:true});assert.equal(done.status,200,JSON.stringify(done));return result;
}
async function business(){
  const b=(await query(`insert into businesses(name,slug,plan_code,subscription_status,settings) values('Negocio de red',$1,'PRO','ACTIVE',$2::jsonb) returning *`,[crypto.randomUUID(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];
  const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Operador red','BUSINESS_OWNER') returning *",[b.id,crypto.randomUUID()+'@example.test'])).rows[0];
  await query('insert into business_qr_credit_accounts(business_id,qr_balance,qr_purchased_total) values($1,30,30)',[b.id]);
  await query("insert into branches(business_id,name,slug) values($1,'Sede QA','qa')",[b.id]);
  return {b,u,token:jwt.sign({sub:u.id,password_version:0},process.env.JWT_SECRET)};
}
const send=(kind,extra={},token=token1)=>api('/api/business/customer/invitations',token,{request_id:crypto.randomUUID(),public_id:buyer.account.public_id,kind,...extra});
const accept=(id,extra={},token=buyer.token)=>api('/api/customer/invitations/'+id+'/decision',token,{action:'ACCEPT',terms_accepted:true,document_id:'NEW-QORI-01',document_confirmation:'NEW-QORI-01',...extra});
test('Qori businesses reach a new buyer through an owned invitation inbox',async t=>{
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
  buyer=await login();other=await login();const first=await business(),second=await business();
  ({b:b1,u:u1,token:token1}=first);({b:b2,u:u2,token:token2}=second);
  program=await stamps.saveProgram(b1.id,u1.id,{name:'Nueva tarjeta',stamps_required:3,benefit_type:'FREE_GIFT',benefit_value:{label:'Café de bienvenida'},minimum_purchase:1,one_per_day:false,allow_manual:true,card_valid_days:365,ticket_valid_days:30,reward_cost:1000,ticket_cost:1000,terms:'Premio al completar la tarjeta.',status:'ACTIVE'});
  activity=(await query("insert into interactive_activations(company_id,user_id,title,category,activation_type,status,public_slug,terms) values($1,$2,'Actividad de bienvenida','commercial','instant','active',$3,'Participación de prueba.') returning *",[b1.id,u1.id,crypto.randomUUID()])).rows[0];
  await t.test('exact lookup works for any business before purchases without exposing private profile',async()=>{
    for(const token of [token1,token2]){const r=await api('/api/business/customer/lookup',token,{query:buyer.account.email.toUpperCase()});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.buyer.public_id,buyer.account.public_id);assert.equal(r.buyer.email,undefined);assert.equal(r.buyer.id,undefined);assert.equal(r.buyer.preferences,undefined);}
    assert.equal((await api('/api/business/customer/lookup',buyer.token,{query:buyer.account.email})).status,401);
    assert.equal((await api('/api/business/customer/lookup',token1,{query:'Comprador'})).status,400);
    assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[b1.id])).rows[0].n,0);
  });
  await t.test('a new verified document can receive a stamp invitation without a prior local contact',async()=>{
    const body={request_id:crypto.randomUUID(),public_id:buyer.account.public_id,kind:'STAMP',resource_id:program.id,document_id:'NEW-QORI-01',identity_checked:true,message:'Te esperamos'};
    const sent=await api('/api/business/customer/invitations',token1,body);assert.equal(sent.status,200,JSON.stringify(sent));stampInvitation=sent.invitation.id;
    assert.equal((await api('/api/business/customer/invitations',token1,body)).invitation.id,stampInvitation);
    assert.equal((await api('/api/customer/wallet/overview',buyer.token)).cards.length,0);
    assert.equal((await api('/api/customer/wallet/overview',buyer.token)).pending_invitations,1);
    assert.equal((await api('/api/customer/invitations',buyer.token)).invitations.length,1);
    assert.equal((await api('/api/customer/invitations',other.token)).invitations.length,0);
    assert.equal((await accept(stampInvitation,{},other.token)).status,404);
    assert.equal((await api('/api/business/customer/invitations/'+buyer.account.public_id,token2)).invitations.length,0);
    const results=await Promise.all([accept(stampInvitation),accept(stampInvitation)]);for(const r of results)assert.equal(r.status,200,JSON.stringify(r));
    memberId=results[0].result_id;assert.equal(memberId,results[1].result_id);
    assert.equal((await api('/api/customer/wallet/overview',buyer.token)).pending_invitations,0);
    const cards=(await api('/api/customer/wallet/overview',buyer.token)).cards;assert.equal(cards.length,1);assert.equal(cards[0].stamps,0);
    assert.equal((await query('select count(*)::int n from stamp_members where business_id=$1',[b1.id])).rows[0].n,1);
  });
  await t.test('affiliation uses one canonical record and does not invent a sale',async()=>{
    const r=await send('AFFILIATION',{document_id:'NEW-QORI-01',identity_checked:true});assert.equal(r.status,200,JSON.stringify(r));
    const accepted=await accept(r.invitation.id);assert.equal(accepted.status,200,JSON.stringify(accepted));
    assert.equal((await accept(r.invitation.id)).result_id,accepted.result_id);
    assert.equal((await api('/api/customer/wallet/overview',buyer.token)).cards.find(c=>c.id===accepted.result_id).kind,'POINTS');
    assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[b1.id])).rows[0].n,0);
  });
  await t.test('activity invitation is usable without a relationship, while foreign and expired activities are rejected',async()=>{
    const r=await api('/api/business/customer/invitations',token1,{request_id:crypto.randomUUID(),public_id:other.account.public_id,kind:'ACTIVITY',resource_id:activity.id});assert.equal(r.status,200,JSON.stringify(r));
    assert.equal((await api('/api/customer/relationships',other.token)).relationships.length,0);
    const endpoint='/api/customer/invitations/'+r.invitation.id+'/complete';
    assert.equal((await api(endpoint,other.token,{})).status,404);
    assert.equal((await accept(r.invitation.id,{},other.token)).status,200);
    const inbox=await api('/api/customer/invitations',other.token);assert.match(inbox.invitations[0].activity_url,new RegExp(activity.public_slug));
    assert.match(inbox.invitations[0].activity_url,/customer_invitation=/);
    await query("update interactive_activations set activation_type='FLEX_SURVEY',capture_config=$2::jsonb,reward_config=$3::jsonb where id=$1",[activity.id,JSON.stringify({collect_participant_data:false}),JSON.stringify({mode:'fixed',reward_type:'FREE_GIFT',reward_value:{label:'Premio por invitación'},reward_label:'Premio por invitación',expiration_days:30})]);
    assert.equal((await api(endpoint,buyer.token,{})).status,404);
    const results=await Promise.all([api(endpoint,other.token,{}),api(endpoint,other.token,{})]);
    for(const result of results)assert.equal(result.status,200,JSON.stringify(result));
    assert.ok(results[0].qr_code);assert.equal(results[0].participant.id,results[1].participant.id);
    const participation=(await query('select publication_id from customer_activation_participations where customer_id=$1 and activation_id=$2',[other.account.id,activity.id])).rows;
    assert.equal(participation.length,1);assert.equal(participation[0].publication_id,null);
    assert.ok((await api('/api/customer/wallet/overview',other.token)).cards.some(c=>c.id===results[0].qr_code.id));
    assert.equal((await api('/api/customer/wallet/tickets/'+results[0].qr_code.id,buyer.token)).status,404);
    assert.equal((await send('ACTIVITY',{resource_id:activity.id},token2)).status,400);
    await query("update interactive_activations set status='closed' where id=$1",[activity.id]);
    assert.equal((await api('/api/customer/invitations',other.token)).invitations[0].activity_url,null);
    assert.equal((await api(endpoint,other.token,{})).status,400);
    assert.equal((await send('ACTIVITY',{resource_id:activity.id})).status,400);
    await query("update interactive_activations set status='active' where id=$1",[activity.id]);
  });
  await t.test('gift acceptance consumes credits once, creates no charge, and only recipient sees it',async()=>{
    const before=Number((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b1.id])).rows[0].qr_balance);
    const r=await send('GIFT',{amount:'25000',terms:'Obsequio de prueba, válido en la sede QA.'});assert.equal(r.status,200,JSON.stringify(r));
    assert.equal((await query('select count(*)::int n from reward_passes where company_id=$1',[b1.id])).rows[0].n,0);
    const results=await Promise.all([accept(r.invitation.id,{document_id:'NEW-QORI-01'}),accept(r.invitation.id,{document_id:'NEW-QORI-01'})]);
    for(const a of results)assert.equal(a.status,200,JSON.stringify(a));assert.equal(results[0].result_id,results[1].result_id);
    assert.equal((await query('select count(*)::int n from reward_passes where company_id=$1',[b1.id])).rows[0].n,1);
    const after=Number((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[b1.id])).rows[0].qr_balance);assert.ok(after<before);
    const detail=await api('/api/customer/wallet/gifts/'+results[0].result_id,buyer.token);assert.equal(detail.status,200,JSON.stringify(detail));assert.equal(Number(detail.card.balance),25000);assert.ok(detail.card.qr_image);
    assert.equal((await api('/api/customer/wallet/gifts/'+results[0].result_id,other.token)).status,404);
    assert.equal((await api('/api/customer/dashboard',buyer.token)).total_minor,0);
  });
  await t.test('assigned activation tickets retain recipient isolation and current redemption state',async()=>{
    const game=(await query("insert into games(business_id,name,slug) values($1,'Juego QA',$2) returning id",[b1.id,crypto.randomUUID()])).rows[0];
    const player=(await query("insert into players(business_id,game_id,name,email,document_id) values($1,$2,'Cliente QA',$3,'NEW-QORI-01') returning id",[b1.id,game.id,buyer.account.email])).rows[0];
    const qr=(await query("insert into qr_codes(business_id,game_id,player_id,token,status,origin_type) values($1,$2,$3,$4,'ACTIVE','INTERACTIVE_ACTIVATION') returning id",[b1.id,game.id,player.id,crypto.randomUUID()])).rows[0];
    const r=await send('TICKET',{resource_id:qr.id});assert.equal(r.status,200,JSON.stringify(r));assert.equal((await accept(r.invitation.id)).status,200);
    assert.ok((await api('/api/customer/wallet/tickets/'+qr.id,buyer.token)).card.qr_image);
    assert.equal((await api('/api/customer/wallet/tickets/'+qr.id,other.token)).status,404);
    await query("update qr_codes set status='REDEEMED' where id=$1",[qr.id]);
    assert.equal((await api('/api/customer/wallet/tickets/'+qr.id,buyer.token)).card.qr_image,undefined);
    assert.equal((await api('/api/customer/wallet/overview',buyer.token)).cards.find(c=>c.id===qr.id).status,'ARCHIVED');
  });
  await t.test('personal post-sale tickets require the right recipient and acceptance; claim, stamp and paid gifts keep their own flows',async()=>{
    const game=(await query("insert into games(business_id,name,slug) values($1,'Portal QA',$2) returning id",[b1.id,crypto.randomUUID()])).rows[0];
    const player=(await query("insert into players(business_id,game_id,name,email,document_id) values($1,$2,'Portal QA',$3,'PORTAL-POSTSALE') returning id",[b1.id,game.id,buyer.account.email])).rows[0];
    async function ticket(meta={},claim=false){return (await query("insert into qr_codes(business_id,game_id,player_id,token,status,origin_type,metadata,claim_required) values($1,$2,$3,$4,'ACTIVE','POST_SALE',$5::jsonb,$6) returning id",[b1.id,game.id,player.id,crypto.randomUUID(),JSON.stringify(meta),claim])).rows[0];}
    const valid=await ticket(),paid=await ticket({source:'CUSTOMER_PRODUCT_GIFT'}),stamp=await ticket({source:'STAMP_CARD'}),claim=await ticket({},true);
    const catalog=await api('/api/business/customer/catalog/'+buyer.account.public_id,token1);
    assert.equal(catalog.status,200,JSON.stringify(catalog));assert.ok(catalog.tickets.some(t=>t.id===valid.id));for(const q of [paid,stamp,claim])assert.equal(catalog.tickets.some(t=>t.id===q.id),false);
    for(const q of [paid,stamp,claim])assert.equal((await send('TICKET',{resource_id:q.id})).status,400);
    assert.equal((await send('TICKET',{resource_id:valid.id},token2)).status,400);
    assert.equal((await api('/api/business/customer/invitations',token1,{request_id:crypto.randomUUID(),public_id:other.account.public_id,kind:'TICKET',resource_id:valid.id})).status,400);
    const sent=await send('TICKET',{resource_id:valid.id});assert.equal(sent.status,200,JSON.stringify(sent));
    assert.equal((await api('/api/customer/wallet/tickets/'+valid.id,buyer.token)).status,404);
    assert.equal((await accept(sent.invitation.id)).status,200);
    assert.ok((await api('/api/customer/wallet/tickets/'+valid.id,buyer.token)).card.qr_image);
    assert.equal((await api('/api/customer/wallet/tickets/'+valid.id,other.token)).status,404);
    await query("update qr_codes set status='REDEEMED' where id=$1",[valid.id]);
    assert.equal((await api('/api/customer/wallet/tickets/'+valid.id,buyer.token)).card.qr_image,undefined);
    assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[b1.id])).rows[0].n,0);
  });
  await t.test('reject, cancel and block are enforced server-side without removing accepted benefits',async()=>{
    let r=await send('ACTIVITY',{resource_id:activity.id});assert.equal((await api('/api/customer/invitations/'+r.invitation.id+'/decision',buyer.token,{action:'REJECT'})).status,200);
    assert.equal((await accept(r.invitation.id)).status,400);
    r=await send('ACTIVITY',{resource_id:activity.id});assert.equal((await api('/api/business/customer/invitations/'+r.invitation.id+'/cancel',token2,{})).status,400);
    assert.equal((await api('/api/business/customer/invitations/'+r.invitation.id+'/cancel',token1,{})).status,200);
    assert.equal((await accept(r.invitation.id)).status,400);
    assert.equal((await api('/api/customer/business-blocks/'+b1.id,buyer.token,{blocked:true},'PUT')).status,200);
    assert.equal((await send('ACTIVITY',{resource_id:activity.id})).status,403);
    assert.equal((await api('/api/business/customer/lookup',token1,{query:buyer.account.public_id})).status,404);
    assert.ok((await api('/api/customer/wallet/overview',buyer.token)).cards.some(c=>c.id===memberId));
    assert.equal((await api('/api/customer/business-blocks/'+b1.id,buyer.token,{blocked:false},'PUT')).status,200);
    assert.equal((await api('/api/business/customer/lookup',token1,{query:buyer.account.public_id})).status,200);
  });
  await t.test('lost issuer authority and insufficient credits leave invitations pending without partial issuance',async()=>{
    const r=await send('GIFT',{amount:'12000',terms:'Regalo QA sin valor comercial.'});assert.equal(r.status,200,JSON.stringify(r));
    await query('update app_users set is_active=false where id=$1',[u1.id]);
    assert.equal((await accept(r.invitation.id,{document_id:'NEW-QORI-01'})).status,403);
    await query('update app_users set is_active=true where id=$1',[u1.id]);
    await query('update business_qr_credit_accounts set qr_balance=0 where business_id=$1',[b1.id]);
    assert.equal((await accept(r.invitation.id,{document_id:'NEW-QORI-01'})).status,400);
    assert.equal((await query('select state from customer_invitations where id=$1',[r.invitation.id])).rows[0].state,'PENDING');
    assert.equal((await query('select count(*)::int n from reward_passes where company_id=$1',[b1.id])).rows[0].n,1);
  });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});
