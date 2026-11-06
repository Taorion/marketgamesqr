const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto'),fs=require('fs/promises'),jwt=require('jsonwebtoken');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='password-oauth-test';process.env.CUSTOMER_LOCAL_MAILBOX='true';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),auth=require('../backend/src/services/customerAuthService'),oauth=require('../backend/src/services/customerOAuthService'),password=require('../backend/src/services/customerPasswordService');
const ids=[],emails=[];let server,base;const originalFetch=global.fetch;
const email=()=>{const e=crypto.randomUUID()+'@example.test';emails.push(e);return e;};
async function mail(id){return JSON.parse(await fs.readFile('.local-customer/mailbox/'+id+'.json','utf8')).code;}
async function api(path,body,cookie,origin=true){const r=await originalFetch(base+'/api/customer'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(origin?{'X-Qori-Web':'1',Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,headers:r.headers,data:await r.json()};}
const cookie=r=>r.headers.get('set-cookie').split(';')[0];
test('password registration requires email proof; recovery preserves identity, revokes sessions and never exposes credentials',async()=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;require('../backend/src/config/env').env.corsOrigins.push(base);
 const e=email(),pass='Mi frase de prueba 2026';
 assert.equal((await api('/auth/web/password/code',{email:e,password:'short',confirmation:'short',consent:true})).status,400);
 assert.equal((await api('/auth/web/password/code',{email:e,password:pass,confirmation:pass+'x',consent:true})).status,400);
 const sent=await api('/auth/web/password/code',{email:e,password:pass,confirmation:pass,consent:true});assert.equal(sent.status,200);assert.equal(sent.headers.get('set-cookie'),null);
 assert.equal((await query('select 1 from customer_accounts where email=$1',[e])).rowCount,0);assert.equal((await api('/me')).status,401);
 assert.equal((await api('/auth/web/password/login',{email:e,password:pass})).status,401);
 const code=await mail(sent.data.challenge_id),wrong=code==='000000'?'111111':'000000';
 assert.equal((await api('/auth/web/verify',{challenge_id:sent.data.challenge_id,code:wrong,consent:true})).status,401);
 const verified=await api('/auth/web/verify',{challenge_id:sent.data.challenge_id,code,consent:true});assert.equal(verified.status,200);ids.push(verified.data.account.id);const first=cookie(verified);
 assert.equal(JSON.stringify(verified.data).includes('password_hash'),false);assert.match(verified.headers.get('set-cookie'),/HttpOnly/);assert.match(verified.headers.get('set-cookie'),/SameSite=Strict/);
 const stored=(await query('select password_hash from customer_password_credentials where customer_id=$1',[ids[0]])).rows[0].password_hash;assert.notEqual(stored,pass);assert.match(stored,/^scrypt\$/);
 const login=await api('/auth/web/password/login',{email:e,password:pass});assert.equal(login.status,200);assert.equal(login.data.account.id,ids[0]);assert.equal(login.data.token,undefined);
 assert.equal((await api('/dashboard',null,cookie(login))).status,403,'Password login cannot skip document registration');
 const bad=await api('/auth/web/password/login',{email:e,password:pass+'bad'}),unknown=await api('/auth/web/password/login',{email:email(),password:pass});assert.equal(bad.status,401);assert.deepEqual(bad.data,unknown.data);
 assert.equal((await api('/auth/web/password/login',{email:e,password:pass},null,false)).status,403);
 const reset=await api('/auth/web/password/code',{email:e,password:pass+' nueva',confirmation:pass+' nueva',consent:true});assert.equal(reset.status,200);
 assert.equal((await api('/me',null,first)).status,200);
 const recovered=await api('/auth/web/verify',{challenge_id:reset.data.challenge_id,code:await mail(reset.data.challenge_id),consent:true});assert.equal(recovered.status,200);assert.equal(recovered.data.account.id,ids[0]);
 assert.equal((await api('/me',null,first)).status,401);assert.equal((await api('/me',null,cookie(login))).status,401);
 assert.equal((await api('/auth/web/password/login',{email:e,password:pass})).status,401);assert.equal((await api('/auth/web/password/login',{email:e,password:pass+' nueva'})).status,200);
 assert.equal((await api('/auth/web/verify',{challenge_id:reset.data.challenge_id,code:await mail(reset.data.challenge_id),consent:true})).status,401);
 assert.equal((await api('/auth/security',null,cookie(recovered))).data.has_password,true);
 const limited=email();for(let i=0;i<10;i++)await assert.rejects(password.login(limited,pass),e=>e.status===401);await assert.rejects(password.login(limited,pass),e=>e.status===429);
});
test('Google and Microsoft signed identity flows resist replay, wrong browser/claims and cross-account linking',async()=>{
 process.env.CUSTOMER_GOOGLE_CLIENT_ID='google-test';process.env.CUSTOMER_GOOGLE_CLIENT_SECRET='google-secret';process.env.CUSTOMER_MICROSOFT_CLIENT_ID='microsoft-test';process.env.CUSTOMER_MICROSOFT_CLIENT_SECRET='microsoft-secret';
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...publicKey.export({format:'jwk'}),kid:'test-key',use:'sig',alg:'RS256'},tid='11111111-2222-3333-4444-555555555555';let claims,exchanged;
 global.fetch=async(url,init)=>{if(String(url).includes('/certs')||String(url).includes('/keys'))return new Response(JSON.stringify({keys:[jwk]}));if(String(url).includes('/token')){exchanged=init.body;return new Response(JSON.stringify({id_token:jwt.sign(claims,privateKey,{algorithm:'RS256',keyid:'test-key',expiresIn:300})}));}return originalFetch(url,init);};
 const response=()=>({cookies:{},cookie(k,v){this.cookies[k]=v;},clearCookie(k){delete this.cookies[k];}});
 function req(cookies={},body={}){return {headers:{cookie:Object.entries(cookies).map(([k,v])=>k+'='+v).join('; ')},body,protocol:'http',get:n=>n==='Origin'?new URL(require('../backend/src/config/env').env.publicAppUrl).origin:n==='X-Qori-Web'?'1':new URL(base).host};}
 async function begin(provider,customerId=null){const res=response(),start=await oauth.start(req({}, {consent:true}),res,provider,customerId),url=new URL(start.url);return {res,url,req:{...req(res.cookies),query:{state:url.searchParams.get('state'),code:'provider-code'}}};}
 async function verifiedAccount(e){const sent=await auth.requestCode(e),result=await auth.verifyCode(sent.challenge_id,await mail(sent.challenge_id),'QA',{webConsent:true});if(!ids.includes(result.account.id))ids.push(result.account.id);return {...result.account,session_id:result.session.id};}
 for(const provider of ['google','microsoft']){
  const e=email(),old=await verifiedAccount(e),flow=await begin(provider),issuer=provider==='google'?'https://accounts.google.com':`https://login.microsoftonline.com/${tid}/v2.0`,sub=crypto.randomUUID();
  claims={iss:issuer,aud:provider+'-test',sub,nonce:flow.url.searchParams.get('nonce'),email:e,tid};
  assert.equal(flow.url.searchParams.get('code_challenge_method'),'S256');assert.equal(flow.url.searchParams.get('scope'),'openid profile email');assert.equal(flow.url.searchParams.get('redirect_uri'),new URL(`/api/customer/auth/web/oauth/${provider}/callback`,require('../backend/src/config/env').env.publicAppUrl).href);
  await assert.rejects(oauth.callback({...flow.req,headers:{cookie:'qori_customer_oauth='+crypto.randomBytes(32).toString('base64url')}},response(),provider),e=>e.status===401);
  assert.equal(await oauth.callback(flow.req,flow.res,provider),'/customer/#oauth-connect');assert.equal(flow.res.cookies.qori_customer_session,undefined,'Matching provider email must not auto-login');
  assert.equal(crypto.createHash('sha256').update(exchanged.get('code_verifier')).digest('base64url'),flow.url.searchParams.get('code_challenge'));
  await assert.rejects(oauth.callback(flow.req,response(),provider),e=>e.status===401);
  const lr={...req(flow.res.cookies,{confirmed:true}),customer:old};await assert.rejects(oauth.link(lr,response()),e=>e.status===403);
  lr.customer=await verifiedAccount(e);await oauth.link(lr,flow.res);assert.equal((await oauth.security(lr.customer)).providers[0].provider,provider);
  await assert.rejects(oauth.link(lr,response()),e=>e.status===401);
  const second=await begin(provider);claims.nonce=second.url.searchParams.get('nonce');assert.equal(await oauth.callback(second.req,second.res,provider),'/customer/#home');assert.ok(second.res.cookies.qori_customer_session);
  const owner=(await query('select customer_id from customer_sessions where token_hash=$1',[crypto.createHash('sha256').update(second.res.cookies.qori_customer_session).digest('hex')])).rows[0];assert.equal(owner.customer_id,old.id);
  assert.equal((await api('/dashboard',null,'qori_customer_session='+second.res.cookies.qori_customer_session)).status,403,provider+' cannot skip document registration');
  const another=await verifiedAccount(email()),conflict=await begin(provider,another.id);claims.nonce=conflict.url.searchParams.get('nonce');await assert.rejects(oauth.callback(conflict.req,conflict.res,provider),e=>e.status===403);
  const nonce=claims.nonce;
  for(const bad of [{aud:'other-client'},{iss:'https://evil.test'},{nonce:'wrong'},{exp:Math.floor(Date.now()/1000)-120}]){
   const payload={...claims,...bad},token=jwt.sign(payload,privateKey,{algorithm:'RS256',keyid:'test-key',...(bad.exp?{}:{expiresIn:300})});await assert.rejects(oauth.verifyIdToken(provider,token,nonce));
  }
  const stolen=jwt.sign(claims,'wrong-signature',{algorithm:'HS256',expiresIn:300,keyid:'test-key'});await assert.rejects(oauth.verifyIdToken(provider,stolen,nonce));
 }
});
after(async()=>{global.fetch=originalFetch;if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}if(ids.length)await query('delete from customer_accounts where id=any($1::uuid[])',[ids]);if(emails.length)await query('delete from customer_challenges where email=any($1::text[])',[emails]);await query("delete from customer_oauth_flows where email_hint like '%@example.test'");await pool.end();});
