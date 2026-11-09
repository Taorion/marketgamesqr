const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto'),{CookieJar}=require('jsdom');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='benefit-session-local';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool,withTransaction}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),auth=require('../backend/src/services/customerAuthService');let server,base;
const link='/sellos/inscripcion.html?programa=5fade592-627d-459a-83d9-3aab76c2a877';
async function session(complete=true){const a=(await query('insert into customer_accounts(email,full_name,declared_document_key) values($1,$2,$3) returning *',[crypto.randomUUID()+'@example.test',complete?'Cliente con sesión antigua':'',complete?crypto.randomUUID():null])).rows[0];return withTransaction(db=>auth.createSession(db,a,'local-cookie-path'));}
async function request(jar,path,headers={}){const url=base+path,r=await fetch(url,{redirect:'manual',headers:{Cookie:await jar.getCookieString(url),...headers}});for(const value of r.headers.getSetCookie())await jar.setCookie(value,url);return r;}
test('existing Customer sessions migrate safely to benefit pages',async t=>{
 assert.equal((await query('select current_database() name')).rows[0].name,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 await t.test('public benefit ignores legacy cookie path, while /me still repairs the private Customer session',async()=>{
  const s=await session(),jar=new CookieJar();await jar.setCookie('qori_customer_session='+s.token+'; Path=/api/customer; HttpOnly; SameSite=Strict',base+'/api/customer');
  const initial=await request(jar,link);assert.equal(initial.status,200);assert.equal(initial.headers.get('location'),null);
  const me=await request(jar,'/api/customer/me');assert.equal(me.status,200);assert.equal((await me.json()).account.id,s.account.id);
  const root=(await jar.getCookies(base+link)).find(c=>c.key==='qori_customer_session');assert.ok(root,'Customer must promote the valid legacy cookie before returning to the benefit');assert.equal(root.value,s.token);assert.equal(root.path,'/');assert.equal(root.httpOnly,true);assert.equal(root.sameSite,'strict');assert.equal(Math.floor(new Date(root.expires).getTime()/1000),Math.floor(new Date(s.session.expires_at).getTime()/1000));
  assert.equal((await jar.getCookies(base+'/api/customer/me')).filter(c=>c.key==='qori_customer_session').length,1,'old path is removed');
  assert.equal((await request(jar,link)).status,200,'benefit page must not redirect back to Customer');
  assert.equal((await query('select count(*)::int n from customer_sessions where customer_id=$1',[s.account.id])).rows[0].n,1);
 });
 await t.test('bearer-only calls never set web cookies',async()=>{const s=await session(),r=await request(new CookieJar(),'/api/customer/me',{Authorization:'Bearer '+s.token});assert.equal(r.status,200);assert.equal(r.headers.get('set-cookie'),null);});
 await t.test('old Customer continuation links go directly to the benefit without requiring finance onboarding',async()=>{
  for(const complete of [true,false]){const s=await session(complete),jar=new CookieJar();await jar.setCookie('qori_customer_session='+s.token+'; Path=/api/customer; HttpOnly; SameSite=Strict',base+'/api/customer');const r=await request(jar,'/customer/?continue='+encodeURIComponent(link)+'#invitations');assert.equal(r.status,303);assert.equal(r.headers.get('location'),link);assert.equal((await request(jar,r.headers.get('location'))).status,200);}
  for(const target of ['https://example.test/claim/secret','//example.test/sellos/','/sellos/../../admin/'])assert.equal((await fetch(base+'/customer/?continue='+encodeURIComponent(target),{redirect:'manual'})).status,200,'unsafe continuations stay in Customer');
 });
 await t.test('invalid, revoked and mismatched-account sessions cannot be promoted',async()=>{
  for(const state of ['invalid','revoked','mismatch']){const s=await session(),jar=new CookieJar();if(state==='revoked')await query('delete from customer_sessions where id=$1',[s.session.id]);await jar.setCookie('qori_customer_session='+(state==='invalid'?crypto.randomBytes(32).toString('base64url'):s.token)+'; Path=/api/customer; HttpOnly',base+'/api/customer');const r=await request(jar,'/api/customer/me',state==='mismatch'?{'X-Qori-Account':crypto.randomUUID()}:{});assert.equal(r.status,state==='mismatch'?409:401);assert.equal(r.headers.get('set-cookie'),null);assert.equal(await jar.getCookieString(base+link),'');}
 });
 await t.test('incomplete Customer registration does not block a public benefit',async()=>{const s=await session(false),jar=new CookieJar();await jar.setCookie('qori_customer_session='+s.token+'; Path=/api/customer; HttpOnly',base+'/api/customer');assert.equal((await request(jar,'/api/customer/me')).status,200);assert.equal((await request(jar,link)).status,200);});
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});
