const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto'),fs=require('fs/promises');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='registration-gate-qa';process.env.CUSTOMER_LOCAL_MAILBOX='true';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {app}=require('../backend/src/app'),{query,pool}=require('../backend/src/config/db');let server,base,accountId;
async function api(path,body,cookie,method=body?'POST':'GET'){const r=await fetch(base+'/api/customer'+path,{method,headers:{'Content-Type':'application/json','X-Qori-Web':'1',Origin:base,...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,headers:r.headers,data:await r.json()};}
test('verified email stays pending until mandatory document is confirmed; only complete registration unlocks Customer',async()=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;require('../backend/src/config/env').env.corsOrigins.push(base);
 const email=crypto.randomUUID()+'@example.test',sent=await api('/auth/web/code',{email});assert.equal(sent.status,200);assert.equal(sent.headers.get('set-cookie'),null);assert.equal(sent.data.account,undefined);assert.equal((await query('select id from customer_accounts where email=$1',[email])).rowCount,0);
 const routes=['/me','/dashboard','/wallet/overview','/finance-books','/relationships','/invitations','/explore','/explore/directory','/explore/businesses/example','/explore/publications/00000000-0000-0000-0000-000000000000','/explore/publications/00000000-0000-0000-0000-000000000000/qr'];
 for(const p of routes){const r=await api(p);assert.equal(r.status,401,p);assert.match(r.headers.get('cache-control'),/no-store/);}
 assert.equal((await api('/explore/resolve',{url:'https://gosqori.com/customer/#explore'})).status,401);
 const mail=JSON.parse(await fs.readFile('.local-customer/mailbox/'+sent.data.challenge_id+'.json','utf8')),wrong=mail.code==='000000'?'111111':'000000';
 const bad=await api('/auth/web/verify',{challenge_id:sent.data.challenge_id,code:wrong,consent:true});assert.equal(bad.status,401);assert.equal(bad.headers.get('set-cookie'),null);assert.equal((await query('select id from customer_accounts where email=$1',[email])).rowCount,0);
 const verified=await api('/auth/web/verify',{challenge_id:sent.data.challenge_id,code:mail.code,consent:true});assert.equal(verified.status,200);accountId=verified.data.account.id;const cookie=verified.headers.get('set-cookie').split(';')[0];assert.match(verified.headers.get('set-cookie'),/HttpOnly/);
 assert.equal((await api('/me',null,cookie)).status,200);
 for(const p of routes.filter(p=>p!=='/me').concat(['/notifications','/groceries','/dreams','/purchases','/movements']))assert.equal((await api(p,null,cookie)).status,403,p);
 assert.equal((await api('/entries',{kind:'EXPENSE'},cookie)).status,403);
 const profile={full_name:'Registro verificado',currency:'COP',timezone:'America/Bogota',preferences:{notifications:{purchases:true,benefits:true,budget:true,summary:true}}};
 for(const fields of [{},{document_id:'123456789'},{document_id:'123456789',document_confirmation:'987654321'},{document_id:'---',document_confirmation:'---'}]){
  const invalid=await api('/me',{...profile,...fields},cookie,'PATCH');assert.equal(invalid.status,400,JSON.stringify(fields));
  const row=(await query('select full_name,declared_document_key from customer_accounts where id=$1',[accountId])).rows[0];assert.ok(!row.full_name);assert.equal(row.declared_document_key,null);
 }
 // Older registrations/provider profiles may already have a name. It never substitutes the document.
 await query('update customer_accounts set full_name=$2 where id=$1',[accountId,'Nombre previo']);
 assert.equal((await api('/dashboard',null,cookie)).status,403);
 const registered=await api('/me',{...profile,document_id:'123456789',document_confirmation:'123456789'},cookie,'PATCH');assert.equal(registered.status,200);
 assert.equal(registered.data.account.declared_document_key,'123456789');assert.ok(registered.data.account.document_locked_at);
 assert.equal(registered.data.account.benefit_recovery_completed_at,null,'Registration does not authorize benefit recovery');
 assert.equal((await api('/explore?search=absent-registration-qa',null,cookie)).status,200);
 assert.equal((await api('/finance-books',null,cookie)).status,200);
 assert.equal((await api('/me',{...profile,full_name:'Cambiar nombre'},cookie,'PATCH')).status,200);
 const changed=await api('/me',{...profile,document_id:'987654321',document_confirmation:'987654321'},cookie,'PATCH');assert.equal(changed.status,400);assert.match(changed.data.error.message,/dato maestro/);
 assert.equal((await api('/me',null,cookie)).data.account.declared_document_key,'123456789');
 assert.equal((await api('/auth/web/verify',{challenge_id:sent.data.challenge_id,code:mail.code,consent:true})).status,401);
 await query("update customer_sessions set expires_at=now()-interval '1 second' where customer_id=$1",[accountId]);assert.equal((await api('/explore',null,cookie)).status,401);assert.equal((await api('/dashboard',null,cookie)).status,401);
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}if(accountId)await query('delete from customer_accounts where id=$1',[accountId]);await pool.end();});
