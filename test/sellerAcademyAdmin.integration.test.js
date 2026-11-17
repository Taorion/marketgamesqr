const {test,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fs=require('node:fs');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='academy-admin-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken');
const service=require('../backend/src/services/sellerAcademyService');
let server,base,admin,settingsBefore,seedBefore;const users=[],keys=[];
async function person(role,status='APPROVED'){const u=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Academy QA',$2) returning *",[randomUUID()+'@example.test',role])).rows[0];users.push(u.id);if(role==='QORI_SELLER')await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,status,approval_mode) values($1,$2,'3100000000','Bogotá','4610','2026-11-11-comisiones-vf1',$3,'DOCUMENTS')",[u.id,randomUUID(),status]);return u;}
async function api(suffix,user,body,method=body?'POST':'GET'){
 const r=await fetch(base+'/api/seller/resources/academy'+suffix,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:'Bearer '+jwt.sign({sub:user.id,password_version:0},process.env.JWT_SECRET)}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const bytes=Buffer.from(await r.arrayBuffer());let data;try{data=JSON.parse(bytes);}catch{data=bytes;}return {status:r.status,data,bytes,headers:r.headers};
}
const video=(extra={})=>({title:'Capacitación QA',description:'Material de prueba',kind:'VIDEO',state:'DRAFT',position:20,url:'https://drive.google.com/file/d/1lhTGySneKzX9BkgqJYj7Wgp6juYQbDEX/view?usp=sharing',...extra});
after(async()=>{
 if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
 if(settingsBefore)await query('update qori_academy_settings set enabled=$1,revision=$2,updated_by=$3,updated_at=$4 where singleton=true',[settingsBefore.enabled,settingsBefore.revision,settingsBefore.updated_by,settingsBefore.updated_at]);
 if(seedBefore)await query('update qori_academy_materials set title=$1,position=$2,revision=$3,updated_by=$4,updated_at=$5 where resource_key=$6',[seedBefore.title,seedBefore.position,seedBefore.revision,seedBefore.updated_by,seedBefore.updated_at,seedBefore.resource_key]);
 for(const key of keys){await query("delete from qori_commercial_audit where entity_id in(select id from qori_academy_materials where resource_key=$1)",[key]);await query('delete from qori_academy_materials where resource_key=$1',[key]);}
 if(admin)await query("delete from qori_commercial_audit where entity_type='academy' and actor_id=$1 and created_at>=$2",[admin.id,admin.test_start]);
 for(const id of users){await query('delete from qori_seller_applications where user_id=$1',[id]);await query('delete from app_users where id=$1',[id]);}await pool.end();
});
test('Academy administration persists access and controls materials with authorization and auditing',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');
 settingsBefore=(await query('select * from qori_academy_settings')).rows[0];seedBefore=(await query("select * from qori_academy_materials where resource_key='marca-filosofia'")).rows[0];
 admin=await require('./helpers/adminIdentity').admin(query);admin.test_start=new Date();const seller=await person('QORI_SELLER'),pending=await person('QORI_SELLER','DRAFT'),generic=await person('ADMIN');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 let material;
 await t.test('only superadmin manages Academy; public and pending access remain blocked',async()=>{
  for(const [user,expected] of [[null,401],[seller,403],[pending,403],[generic,403],[admin,200]])assert.equal((await api('/admin',user)).status,expected);
  for(const user of [seller,pending,generic]){assert.equal((await api('/settings',user,{enabled:false,expected_revision:1},'PATCH')).status,403);assert.equal((await api('/materials',user,video())).status,403);}
  assert.equal((await api('',pending)).status,403);
 });
 await t.test('global disabling blocks listing, opening and downloads but preserves Admin access; stale settings conflict',async()=>{
  const before=(await api('/admin',admin)).data;assert.ok(before.resources.length>=9);
  const update={enabled:false,expected_revision:before.settings.revision};const off=await api('/settings',admin,update,'PATCH');assert.equal(off.status,200);
  assert.equal((await api('/settings',admin,update,'PATCH')).status,409);
  const hidden=await api('',seller);assert.equal(hidden.data.enabled,false);assert.deepEqual(hidden.data.resources,[]);
  assert.equal((await api('/capacitacion-1',seller)).status,403);assert.equal((await api('/marca-filosofia/download',seller)).status,403);
  assert.equal((await api('/marca-filosofia/download',admin)).status,200);assert.ok((await api('/admin',admin)).data.resources.length>=9);
  assert.equal((await service.summary()).status,'DISABLED');
  assert.equal((await api('/settings',admin,{enabled:true,expected_revision:off.data.settings.revision},'PATCH')).status,200);
 });
 await t.test('new draft is private, publication works, ordering persists, archive is reversible',async()=>{
  const created=await api('/materials',admin,video());assert.equal(created.status,201,JSON.stringify(created.data));material=created.data.resource;keys.push(material.id);
  assert.equal((await api('',seller)).data.resources.some(r=>r.id===material.id),false);assert.equal((await api('/'+material.id,seller)).status,404);
  const published=await api('/materials/'+material.id,admin,video({state:'PUBLISHED',position:1,expected_revision:material.revision}),'PATCH');assert.equal(published.status,200);material=published.data.resource;
  assert.equal((await api('/'+material.id,seller)).status,200);assert.equal((await api('',seller)).data.resources.find(r=>r.id===material.id).order,1);
  const archived=await api('/materials/'+material.id,admin,video({state:'ARCHIVED',expected_revision:material.revision}),'PATCH');assert.equal(archived.status,200);
  assert.equal((await api('/'+material.id,seller)).status,404);
  assert.equal((await api('/materials/'+material.id,admin,video({expected_revision:material.revision}),'PATCH')).status,409);
  const restored=await api('/materials/'+material.id,admin,video({state:'PUBLISHED',expected_revision:archived.data.resource.revision}),'PATCH');assert.equal(restored.status,200);material=restored.data.resource;
 });
 await t.test('file upload, replacement and visibility are enforced on each download',async()=>{
  const doc=await require('pdf-lib').PDFDocument.create();doc.addPage();const bytes=Buffer.from(await doc.save());
  const body={title:'Documento QA',description:'Prueba',kind:'FILE',state:'PUBLISHED',position:30,filename:'prueba.pdf',base64:bytes.toString('base64')};
  const r=await api('/materials',admin,body);assert.equal(r.status,201,JSON.stringify(r.data));keys.push(r.data.resource.id);
  const download=await api('/'+r.data.resource.id+'/download',seller);assert.equal(download.status,200);assert.deepEqual(download.bytes,bytes);assert.match(download.headers.get('cache-control'),/no-store/);
  const hidden=await api('/materials/'+r.data.resource.id,admin,{...body,base64:undefined,filename:undefined,state:'DRAFT',expected_revision:1},'PATCH');assert.equal(hidden.status,200);assert.equal((await api('/'+r.data.resource.id+'/download',seller)).status,404);
  const replace=await api('/materials/'+material.id,admin,{...body,expected_revision:material.revision},'PATCH');assert.equal(replace.status,200);assert.equal(replace.data.resource.kind,'FILE');assert.equal(replace.data.resource.url,undefined);
  assert.deepEqual((await api('/'+material.id+'/download',seller)).bytes,bytes);
  const listed=JSON.stringify((await api('/admin',admin)).data);assert.equal(listed.includes('base64'),false);assert.equal(listed.includes('"content"'),false);
 });
 await t.test('built-in document metadata changes preserve the original file',async()=>{
  const r=await api('/materials/marca-filosofia',admin,{title:'Marca Qori revisada',description:seedBefore.description,kind:'FILE',state:'PUBLISHED',position:7,expected_revision:seedBefore.revision},'PATCH');assert.equal(r.status,200);
  assert.deepEqual((await api('/marca-filosofia/download',seller)).bytes,fs.readFileSync('backend/assets/academy/Qori_01_Marca_y_Filosofia.pptx'));
 });
 await t.test('invalid links, executable uploads, oversized order and unexpected fields are rejected',async()=>{
  for(const url of ['javascript:alert(1)','https://drive.google.com.evil.test/file/d/1234567890/view','https://user:pass@drive.google.com/file/d/1234567890/view','http://drive.google.com/file/d/1234567890/view'])assert.equal((await api('/materials',admin,video({url}))).status,400);
  assert.equal((await api('/materials',admin,video({position:-1}))).status,400);assert.equal((await api('/materials',admin,video({asset_key:'../secret'}))).status,400);
  assert.equal((await api('/materials',admin,{title:'Mal archivo',kind:'FILE',position:1,filename:'archivo.html',base64:Buffer.from('<script/>').toString('base64')})).status,400);
  assert.equal((await api('/materials/missing-resource',admin,video({expected_revision:1}),'PATCH')).status,404);
 });
 await t.test('changes are audited, RLS is enabled and original seed is preserved',async()=>{
  const rows=(await query("select action,detail from qori_commercial_audit where entity_type='academy' and actor_id=$1 and created_at>=$2",[admin.id,admin.test_start])).rows;
  assert.ok(rows.some(r=>r.action==='ACADEMY_ACCESS_CHANGED'));assert.ok(rows.some(r=>r.detail.previous_state==='PUBLISHED'&&r.detail.state==='ARCHIVED'));assert.equal(JSON.stringify(rows).includes('base64'),false);
  assert.equal((await query("select count(*)::int n from pg_class where relname in ('qori_academy_settings','qori_academy_materials') and relrowsecurity")).rows[0].n,2);
  assert.equal((await query('select count(*)::int n from qori_academy_materials where created_by is null')).rows[0].n,9);
 });
});
