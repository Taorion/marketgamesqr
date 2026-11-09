const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='setup-local-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),books=require('../backend/src/services/customerFinanceBooks'),finance=require('../backend/src/services/customerFinance');
const ids=[],uuid=()=>crypto.randomUUID();let server,base;
async function account(state='PENDING',document=true){const a=(await query("insert into customer_accounts(email,full_name,declared_document_key,currency,timezone,finance_setup_state) values($1,'Setup QA',$2,'COP','America/Bogota',$3) returning *",[uuid()+'@example.test',document?uuid():null,state])).rows[0];ids.push(a.id);const token=crypto.randomBytes(32).toString('base64url');await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...a,token};}
async function api(a,path,body,method=body?'POST':'GET',headers={}){const r=await fetch(base+'/api/customer'+path,{method,headers:{'Content-Type':'application/json',...(a?{Authorization:'Bearer '+a.token}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return {http:r.status,...await r.json()};}
const ok=r=>{assert.equal(r.http,200,JSON.stringify(r));return r;};
const payload=balance=>({request_id:uuid(),balance,currency:'COP',expected_date:finance.dateKey(new Date(),'America/Bogota'),confirmed:true});
test('financial setup is persistent, mandatory, tenant owned and idempotent',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 await t.test('authentication and confirmed identity precede preparation; private routes cannot bypass it',async()=>{
  assert.equal((await api(null,'/finance-setup')).http,401);const incomplete=await account('PENDING',false);assert.equal((await api(incomplete,'/finance-setup')).http,403);
  const a=await account();for(const p of ['/finance-books','/wallet/overview','/explore','/finance-home','/invitations']){const r=await api(a,p);assert.equal(r.http,403);assert.match(r.error.message,/Prepara tus finanzas/);}
  assert.equal(ok(await api(a,'/me')).account.finance_setup_state,'PENDING');const s=ok(await api(a,'/finance-setup'));assert.equal(s.currency,'COP');assert.equal(s.pocket_name,'Personal');
  const publicPage=await fetch(base+'/sellos/inscripcion.html?programa='+uuid(),{redirect:'manual',headers:{Authorization:'Bearer '+a.token}});assert.equal(publicPage.status,303);assert.match(publicPage.headers.get('location'),/^\/customer\/\?continue=/);
 });
 await t.test('invalid or unconfirmed inputs leave both completion and accounting unchanged',async()=>{
  const a=await account();for(const fields of [{balance:''},{balance:'1,000'},{balance:'1.234'},{balance:'100000000000'},{balance:null},{confirmed:false},{confirmed:undefined},{currency:'USD'},{expected_date:'2000-01-01'},{book_id:uuid()}])assert.equal((await api(a,'/finance-setup',{...payload('0'),...fields})).http,400,JSON.stringify(fields));
  assert.equal(ok(await api(a,'/me')).account.finance_setup_state,'PENDING');assert.equal((await query('select id from customer_finance_books where customer_id=$1',[a.id])).rowCount,0);
 });
 await t.test('positive, zero and negative balances become real cash without an income entry',async()=>{
  for(const balance of ['150000.25','0','-50000.50']){
   const a=await account(),d=payload(balance);const r=ok(await api(a,'/finance-setup',d));assert.equal(r.account.finance_setup_state,'COMPLETE');assert.ok(r.account.finance_setup_completed_at);assert.equal(finance.minor(r.book.opening_amount),finance.minor(balance));
   assert.equal(ok(await api(a,'/finance-home')).balance_minor,finance.minor(balance));assert.equal((await query('select id from customer_entries where customer_id=$1',[a.id])).rowCount,0);
   assert.equal(ok(await api(a,'/me')).account.finance_setup_state,'COMPLETE');assert.equal(ok(await api(a,'/finance-setup')).state,'COMPLETE');
  }
 });
 await t.test('today movements are reconciled once, including concurrent saves and later retries',async()=>{
  const a=await account(),b=await account();await books.ensure(a);await books.ensure(b);const book=(await books.list(a)).books[0],other=(await books.list(b)).books[0];
  await query("insert into customer_entries(customer_id,book_id,request_id,kind,amount,currency,occurred_at,merchant,category) values($1,$2,$3,'EXPENSE',30,'COP',now(),'Import QA','otros')",[a.id,book.id,uuid()]);
  const d=payload('100');const results=await Promise.all([api(a,'/finance-setup',d),api(a,'/finance-setup',d)]);results.forEach(ok);
  assert.equal(ok(await api(a,'/finance-home')).balance_minor,10000);assert.equal((await books.list(a)).books[0].opening_amount,'130.00');
  ok(await api(a,'/entries',{request_id:uuid(),kind:'EXPENSE',amount:'20',currency:'COP',occurred_at:d.expected_date,merchant:'Later QA',category:'otros'}));
  ok(await api(a,'/finance-setup',payload('9999'),'POST',{'X-Qori-Book':other.id}));
  assert.equal(ok(await api(a,'/finance-home')).balance_minor,8000);assert.equal((await books.list(b)).books[0].opening_amount,null);
  assert.equal((await query('select count(*)::int n from customer_entries where customer_id=$1',[a.id])).rows[0].n,2);
 });
 await t.test('established accounts retain their portal and cannot reset it through setup',async()=>{
  const a=await account('LEGACY');const book=ok(await api(a,'/finance-books')).books[0];ok(await api(a,'/finance-setup',payload('9999')));assert.equal((await books.list(a)).books[0].opening_amount,null);assert.equal(ok(await api(a,'/me')).account.finance_setup_state,'LEGACY');assert.ok(book.id);
 });
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await query('delete from customer_accounts where id=any($1::uuid[])',[ids]);await pool.end();});
