const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='grocery-names-test';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app');let server,base;const ids=[],uuid=()=>crypto.randomUUID();
async function account(){const a=(await query("insert into customer_accounts(email,full_name) values($1,'Names QA') returning *",[uuid()+'@example.test'])).rows[0];ids.push(a.id);a.token=crypto.randomBytes(32).toString('base64url');await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(a.token).digest('hex')]);return a;}
async function api(a,book,path,body,method=body?'POST':'GET'){const r=await fetch(base+'/api/customer'+path,{method,headers:{'Content-Type':'application/json',...(a?{Authorization:'Bearer '+a.token}:{}),...(book?{'X-Qori-Book':book}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
test('custom grocery names persist for every state and cannot alter another owner, pocket or financial record',async()=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 const a=await account(),b=await account(),book=(await api(a,null,'/finance-books')).data.books[0].id,alternate=(await api(a,null,'/finance-books',{request_id:uuid(),name:'Otra cuenta',currency:'COP'})).data.book.id;
 const item={id:uuid(),name:'Arroz',unit:'kg',quantity:1,estimated_price:'5000',in_cart:true,actual_price:'4500',actual_quantity:1};
 let g=(await api(a,book,'/groceries',{request_id:uuid(),title:'Mercado semanal de mi casa',items:[item]})).data.list;
 const path='/groceries/'+g.id+'/title';assert.equal((await api(a,book,'/groceries/'+g.id)).data.title,'Mercado semanal de mi casa');
 assert.equal((await api(null,null,path,{title:'Intruso',revision:g.revision},'PATCH')).status,401);
 assert.equal((await api(b,null,path,{title:'Intruso',revision:g.revision},'PATCH')).status,404);
 assert.equal((await api(a,alternate,path,{title:'Otro bolsillo',revision:g.revision},'PATCH')).status,404);
 for(const title of [' ','x','x'.repeat(161)])assert.equal((await api(a,book,path,{title,revision:g.revision},'PATCH')).status,400);
 assert.equal((await api(a,book,path,{title:'No permitido',revision:g.revision,items:[]},'PATCH')).status,400);
 const rename=async title=>{
  const before=(await query('select * from customer_grocery_lists where id=$1',[g.id])).rows[0],oldRevision=g.revision;
  const result=await api(a,book,path,{title,revision:oldRevision},'PATCH');assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.data.list.title,title.trim());assert.equal(result.data.list.revision,oldRevision+1);
  const after=(await query('select * from customer_grocery_lists where id=$1',[g.id])).rows[0];
  for(const key of Object.keys(before))if(!['title','revision','updated_at'].includes(key))assert.deepEqual(after[key],before[key],key);
  assert.equal((await api(a,book,path,{title:'Nombre viejo',revision:oldRevision},'PATCH')).status,400);g=after;
  assert.equal((await api(a,book,'/groceries/'+g.id)).data.title,title.trim());
 };
 await rename('  Aseo y mercado de noviembre  ');
 let r=await api(a,book,'/groceries/'+g.id+'/state',{revision:g.revision,archived:true});assert.equal(r.status,200);g=r.data.list;await rename('Lista archivada de la casa');
 r=await api(a,book,'/groceries/'+g.id+'/state',{revision:g.revision,archived:false});g=r.data.list;
 const day=require('../backend/src/services/customerFinance').dateKey(new Date(),'America/Bogota');
 r=await api(a,book,'/groceries/'+g.id+'/complete',{revision:g.revision,confirmed:true,carry_forward:false,merchant:'Tienda QA',paid_on:day});assert.equal(r.status,200,JSON.stringify(r));g=r.data.list;
 const payment=(await query('select * from customer_entries where id=$1',[g.entry_id])).rows[0];await rename('Compra familiar terminada');
 assert.deepEqual((await query('select * from customer_entries where id=$1',[g.entry_id])).rows[0],payment);
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}if(ids.length)await query('delete from customer_accounts where id=any($1::uuid[])',[ids]);await pool.end();});
