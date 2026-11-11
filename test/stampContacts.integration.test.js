const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='stamp-contacts-local-test-only';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),svc=require('../backend/src/services/stampCardService'),crm=require('../backend/src/services/leadCrmService');
const id=()=>crypto.randomUUID(),data=()=>({name:'Titular Sellos QA',document_id:id(),email:id()+'@example.test',phone:'310'+String(Math.floor(Math.random()*1e7)).padStart(7,'0'),consent:true});
let b,other,program,user,legacy,server,base,headers;
async function makeBusiness(){return (await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values('Sellos Contactos QA',$1,'PRO','ACTIVE',$2::jsonb) returning *",[id(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];}
async function makeProgram(business){return (await query("insert into stamp_programs(business_id,name,stamps_required,benefit_type,benefit_value,allow_manual) values($1,'Fidelidad QA',8,'FREE_GIFT','{\"label\":\"Café\"}',true) returning *",[business.id])).rows[0];}
const list=(business,search,audience_type='CLIENT')=>crm.listLeadCrmRows(business.id,{search,audience_type});
before(async()=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');b=await makeBusiness();other=await makeBusiness();program=await makeProgram(b);
 user=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','QA','BUSINESS_OWNER') returning *",[b.id,id()+'@example.test'])).rows[0];
 legacy=await svc.enroll(b.id,user.id,{...data(),program_id:program.id});
 const installed=(await query("select to_regprocedure('public.qori_ensure_stamp_contact(uuid)') f")).rows[0].f;
 if(!installed){
  assert.equal((await query('select 1 from players where business_id=$1 and document_id=$2',[b.id,legacy.member.document_key])).rowCount,0);
  await query(fs.readFileSync('database/migrations/20261111212221_stamp_card_contacts.sql','utf8'));
 }
 const {app}=require('../backend/src/app');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 headers={Authorization:'Bearer '+require('jsonwebtoken').sign({sub:user.id,password_version:0},process.env.JWT_SECRET)};
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});
test('existing and new zero-stamp cardholders are searchable clients, without fabricated sales or exposed card tokens',async()=>{
 for(const card of [legacy,await svc.enroll(b.id,user.id,{...data(),program_id:program.id})]){
  for(const search of [card.member.document_key,card.member.email,card.member.phone]){
   const result=await list(b,search);assert.equal(result.leads.length,1);const lead=result.leads[0];assert.equal(lead.has_stamp_card,true);assert.equal(lead.is_customer,true);assert.equal(lead.purchase_count,0);assert.equal(lead.total_spent,0);assert.equal(lead.last_purchase_at,null);
   assert.equal(JSON.stringify(result).includes(card.member.public_token),false);assert.equal((await list(b,search,'LEAD')).leads.length,0);
  }
  const lead=(await list(b,card.member.document_key)).leads[0],detail=await crm.getLeadCrmDetail(b.id,lead.id,lead.source_type);
  assert.equal(detail.lead.has_stamp_card,true);assert.equal(detail.lead.is_customer,true);assert.equal(detail.summary.purchase_count,0);assert.equal(detail.purchases.length,0);
  assert.equal((await query('select stamps from stamp_cycles where member_id=$1',[card.member.id])).rows[0].stamps,0);
 }
 assert.equal((await query('select 1 from business_sales where business_id=$1',[b.id])).rowCount,0);
});
test('same document reuses existing contact and multiple concurrent programs do not duplicate identities',async()=>{
 const input=data(),document=svc.normalizeDocument(input.document_id),p2=await makeProgram(b);
 const existing=(await query('insert into players(business_id,name,document_id,email,metadata) values($1,$2,$3,$4,$5::jsonb) returning *',[b.id,'Nombre original',document,input.email,JSON.stringify({notes:'Conservar historial'})])).rows[0];
 await Promise.all([svc.enroll(b.id,user.id,{...input,program_id:program.id}),svc.enroll(b.id,user.id,{...input,program_id:p2.id})]);
 const rows=(await list(b,document)).leads;assert.equal(rows.length,1);assert.equal(rows[0].id,existing.id);assert.equal(rows[0].name,'Nombre original');assert.equal(rows[0].metadata.notes,'Conservar historial');
 const newcomer=data(),key=svc.normalizeDocument(newcomer.document_id);
 await Promise.all([svc.enroll(b.id,user.id,{...newcomer,program_id:program.id}),svc.enroll(b.id,user.id,{...newcomer,program_id:p2.id})]);
 assert.equal((await query('select count(*)::int n from players where business_id=$1 and document_id=$2',[b.id,key])).rows[0].n,1);assert.equal((await list(b,key)).leads.length,1);
});
test('manual contacts keep canonical ID; archived contacts do not reappear; shared email never crosses conflicting documents',async()=>{
 const input=data(),key=svc.normalizeDocument(input.document_id);
 const manual=(await query("insert into business_manual_leads(business_id,name,document_id,email,status) values($1,'Contacto manual',$2,$3,'NEW') returning *",[b.id,key,input.email])).rows[0];
 await svc.enroll(b.id,user.id,{...input,program_id:program.id});let rows=(await list(b,key)).leads;assert.equal(rows.length,1);assert.equal(rows[0].id,manual.id);assert.equal(rows[0].source_type,'MANUAL');
 await query("update business_manual_leads set status='ARCHIVED' where id=$1",[manual.id]);await query('select qori_ensure_stamp_contact(id) from stamp_members where business_id=$1 and document_key=$2',[b.id,key]);assert.equal((await list(b,key)).leads.length,0);
 const separate=data();await query('insert into players(business_id,name,document_id,email) values($1,$2,$3,$4)',[b.id,'Otra persona',svc.normalizeDocument(separate.document_id),input.email]);
 const member=await svc.enroll(b.id,user.id,{...data(),email:input.email,program_id:program.id});rows=(await list(b,member.member.document_key)).leads;assert.equal(rows.length,1);assert.equal(rows[0].document_id,member.member.document_key);
 const unrelated=(await crm.listLeadCrmRows(b.id,{search:svc.normalizeDocument(separate.document_id)})).leads[0];assert.equal(unrelated.is_customer,false);assert.equal(unrelated.has_stamp_card,false);
});
test('public self-registration invalidates contact cache and is visible via authenticated API with tenant isolation',async()=>{
 const input={...data(),access_key:crypto.randomBytes(32).toString('hex')},search=svc.normalizeDocument(input.document_id),url=base+'/api/business/leads/crm?audience_type=CLIENT&search='+search;
 let response=await fetch(url,{headers});assert.equal(response.status,200);assert.equal((await response.json()).leads.length,0);
 const registered=await fetch(base+'/api/public/stamp-cards/programs/'+program.id+'/enroll',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});assert.equal(registered.status,200);
 response=await fetch(url,{headers});assert.equal(response.status,200);const result=await response.json();assert.equal(result.leads.length,1);assert.equal(result.leads[0].is_customer,true);
 assert.equal((await list(other,search)).leads.length,0);assert.equal((await fetch(url)).status,401);
 const foreign=(await query('insert into players(business_id,name,document_id,email) values($1,$2,$3,$4) returning *',[other.id,input.name,search,input.email])).rows[0];
 const otherResult=(await crm.listLeadCrmRows(other.id,{search})).leads[0];assert.equal(otherResult.id,foreign.id);assert.equal(otherResult.has_stamp_card,false);assert.equal(otherResult.is_customer,false);
 await assert.rejects(()=>crm.getLeadCrmDetail(other.id,result.leads[0].id),/not found/i);
});
