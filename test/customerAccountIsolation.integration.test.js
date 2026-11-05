const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='isolation-local-only';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app');
let server,base;const accounts=[],uuid=()=>crypto.randomUUID();
async function account(name){const a=(await query('insert into customer_accounts(email,full_name) values($1,$2) returning *',[uuid()+'@example.test',name])).rows[0],token=crypto.randomBytes(32).toString('base64url');await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);accounts.push(a.id);return {...a,token};}
async function api(a,path,{body,method=body?'POST':'GET',book,expected=a?.id,cookie=false}={}){
 const r=await fetch(base+'/api/customer'+path,{method,headers:{'Content-Type':'application/json',Origin:base,'X-Qori-Web':'1',...(a?(cookie?{Cookie:'qori_customer_session='+a.token}:{Authorization:'Bearer '+a.token}):{}),...(expected?{'X-Qori-Account':expected}:{}),...(book?{'X-Qori-Book':book}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,headers:r.headers,data:await r.json()};
}
test('real HTTP sessions isolate two people, their books and stale browser requests',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 require('../backend/src/config/env').env.corsOrigins.push(base);
 const a=await account('Alice private'),b=await account('Bob private');
 const ba=(await api(a,'/finance-books')).data.books[0],bb=(await api(b,'/finance-books')).data.books[0];
 const requestId=uuid(),entry={request_id:requestId,kind:'INCOME',amount:'1234',currency:'COP',occurred_at:'2026-11-05',merchant:'ALICE_PRIVATE',category:'otros'};
 const own=(await api(a,'/entries',{book:ba.id,body:entry})).data.entry;assert.ok(own);
 const other=(await api(b,'/entries',{book:bb.id,body:{...entry,amount:'75',merchant:'BOB_PRIVATE'}})).data.entry;assert.ok(other);assert.notEqual(own.id,other.id);
 await t.test('book ids and caller-supplied owner fields cannot change authenticated ownership',async()=>{
  for(const path of ['/finance-home','/dashboard','/planning','/movements','/groceries','/dreams','/debts','/wealth'])assert.equal((await api(b,path,{book:ba.id})).status,404,path);
  for(const path of ['/entries/'+own.id,'/entries/'+own.id+'?customer_id='+a.id])assert.equal((await api(b,path,{book:bb.id})).status,404,path);
  assert.equal((await api(b,'/entries/'+own.id,{book:bb.id,body:entry,method:'PUT'})).status,404);
  assert.equal((await api(b,'/entries/'+own.id,{book:bb.id,method:'DELETE'})).status,404);
  const forged=await api(b,'/entries',{book:bb.id,body:{...entry,merchant:'BOB_FORGED_OWNER',request_id:uuid(),customer_id:a.id,book_id:ba.id}});
  assert.equal(forged.status,200);assert.equal(forged.data.entry.customer_id,b.id);assert.equal(forged.data.entry.book_id,bb.id);
  const found=await api(b,'/movements?from=2026-11-01&to=2026-11-30',{book:bb.id});
  assert.equal(found.status,200);assert.ok(!JSON.stringify(found.data).includes('ALICE_PRIVATE'));
 });
 await t.test('receipts and complete exports contain only the signed-in customer records',async()=>{
  const receipt=(await query("insert into customer_receipts(customer_id,entry_id,filename,mime_type,bytes) values($1,$2,'ALICE_PRIVATE.pdf','application/pdf',$3) returning id",[a.id,own.id,Buffer.from('%PDF-1.4 ALICE_PRIVATE')])).rows[0];
  assert.equal((await api(b,'/receipts/'+receipt.id)).status,404);
  await api(b,'/receipts/'+receipt.id,{method:'DELETE'});
  assert.equal((await api(a,'/receipts/'+receipt.id)).status,200);
  const file={filename:'receipt.pdf',mime_type:'application/pdf',base64:Buffer.from('%PDF-1.4 RETRY_RECEIPT').toString('base64')};
  const copies=await Promise.all([api(a,'/entries/'+own.id+'/receipts',{book:ba.id,body:file}),api(a,'/entries/'+own.id+'/receipts',{book:ba.id,body:file})]);
  for(const copy of copies)assert.equal(copy.status,200);
  assert.equal(copies[0].data.receipt.id,copies[1].data.receipt.id);
  assert.equal((await api(b,'/entries/'+own.id+'/receipts',{book:bb.id,body:file})).status,404);
  assert.equal((await api(a,'/entries/'+own.id+'/receipts',{book:ba.id,body:{...file,base64:Buffer.from('invalid').toString('base64')}})).status,400);
  const exported=await api(b,'/export');assert.equal(exported.status,200);
  assert.equal(exported.data.account.id,b.id);assert.equal(exported.data.account.session_id,undefined);
  assert.ok(exported.data.customer_entries.every(row=>row.customer_id===b.id));
  assert.ok(!JSON.stringify(exported.data).includes('ALICE_PRIVATE'));
  assert.ok(!JSON.stringify(exported.data).includes(a.token));assert.ok(!JSON.stringify(exported.data).includes(b.token));
 });
 await t.test('stale tab with Alice context and Bob cookie is denied before reads and writes',async()=>{
  for(const path of ['/me','/wallet/overview','/finance-books','/notifications','/export']){
   const r=await api(b,path,{cookie:true,expected:a.id});assert.equal(r.status,409,path);
   assert.equal(r.headers.get('x-qori-session-changed'),'1');assert.equal(r.headers.get('x-qori-customer'),null);
   assert.match(r.headers.get('cache-control'),/no-store/);assert.ok(!JSON.stringify(r.data).includes('Bob private'));
  }
  const before=(await query('select count(*)::int n from customer_entries where customer_id=$1',[b.id])).rows[0].n;
  assert.equal((await api(b,'/entries',{cookie:true,expected:a.id,body:{...entry,request_id:uuid()}})).status,409);
  assert.equal((await query('select count(*)::int n from customer_entries where customer_id=$1',[b.id])).rows[0].n,before);
  assert.equal((await api(a,'/me',{expected:b.id})).status,409);
  const right=await api(b,'/me',{cookie:true});assert.equal(right.status,200);assert.equal(right.headers.get('x-qori-customer'),b.id);
 });
 await t.test('anonymous and revoked sessions fail closed and are never cacheable',async()=>{
  for(const path of ['/me','/wallet/overview','/movements','/notifications','/finance-books','/export']){
   const r=await api(null,path);assert.equal(r.status,401,path);assert.match(r.headers.get('cache-control'),/no-store/);
  }
  assert.equal((await api(a,'/logout',{body:{},cookie:true})).status,200);
  assert.equal((await api(a,'/me')).status,401);assert.equal((await api(b,'/me')).status,200);
 });
});
after(async()=>{if(accounts.length)await query('delete from customer_accounts where id=any($1::uuid[])',[accounts]);await pool.end();if(server)await new Promise(r=>server.close(r));});
