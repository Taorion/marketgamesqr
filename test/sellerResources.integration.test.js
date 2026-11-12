const {test,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='seller-resources-qa-only';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),{env}=require('../backend/src/config/env'),jwt=require('jsonwebtoken');
const service=require('../backend/src/services/sellerResourceService');
let server,base,ip=0;const users=[],resources=[];
async function api(path,user,body,method=body?'POST':'GET'){
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Forwarded-For':'198.18.0.'+(++ip),...(user?{Authorization:'Bearer '+jwt.sign({sub:user.id,password_version:0},env.jwtSecret)}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const bytes=Buffer.from(await r.arrayBuffer()),text=bytes.toString();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:r.status,data,bytes,headers:r.headers};
}
async function person(role,status='APPROVED',platformRole=null){const u=(await query("insert into app_users(email,password_hash,full_name,role,platform_role) values($1,'qa','Embajador de prueba',$2,$3) returning *",[randomUUID()+'@example.test',role,platformRole])).rows[0];users.push(u.id);if(role==='QORI_SELLER'||platformRole==='QORI_SELLER')await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,status,approval_mode) values($1,$2,'3100000000','Bogotá','4610','2026-11-11-comisiones-vf1',$3,'DOCUMENTS')",[u.id,randomUUID(),status]);return u;}
const payload=(extra={})=>({resource_key:'qa_'+randomUUID(),title:'Guía de prueba',description:'Descripción de prueba',usage:'Después de presentar el programa',audience:'PROSPECT',stage:'PRESENT',kind:'LINK',state:'DRAFT',version_label:'1',url:'https://gosqori.com/paquetes/',...extra});
after(async()=>{if(server)await new Promise(r=>server.close(r));for(const id of resources){await query('delete from qori_commercial_audit where entity_id=$1',[id]);await query('delete from qori_seller_resources where id=$1',[id]);}for(const id of users){await query('delete from qori_commercial_audit where actor_id=$1',[id]);await query('delete from qori_sales_prospects where seller_id=$1',[id]);await query('delete from qori_seller_applications where user_id=$1',[id]);await query('delete from app_users where id=$1',[id]);}await pool.end();});
test('Seller resource publication, private files and attributed public funnel',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 const admin=await person('QORI_SUPERADMIN'),seller=await person('QORI_SELLER'),other=await person('QORI_SELLER'),pending=await person('QORI_SELLER','DRAFT'),generic=await person('ADMIN'),dual=await person('BUSINESS_OWNER','APPROVED','QORI_SELLER');
 const root='/api/seller/resources',context=s=>'/api/public/seller-kit?seller='+s.id;
 async function create(body){const r=await api(root,admin,body);assert.equal(r.status,201,JSON.stringify(r.data));resources.push(r.data.resource.id);return r.data.resource;}
 await t.test('approved-only reads and superadmin-only mutation/export',async()=>{
  for(const [u,expected] of [[null,401],[pending,403],[generic,403],[seller,200],[admin,200],[dual,200]])assert.equal((await api(root,u)).status,expected);
  for(const u of [seller,other,pending,generic,dual])for(const suffix of ['/production-brief','/production-prompt'])assert.equal((await api(root+suffix,u)).status,403);
  for(const u of [seller,other,pending,generic,dual])assert.equal((await api(root,u,payload())).status,403);
  const brief=await api(root+'/production-brief',admin);assert.equal(brief.status,200);assert.equal(brief.data.plans.length,7);assert.equal(brief.data.production_assets.length,21);assert.equal(brief.data.plans.find(p=>p.code==='ACTIVACIONES_GRATIS').monthly_price_cop,0);assert.match(brief.headers.get('content-disposition'),/attachment/);
  assert.match((await api(root+'/production-prompt',admin)).data,/GUÍA|guía|Guía/);
 });
 let draft,internal,published,fileBody,pdf;
 await t.test('drafts are hidden, client publication is explicit, bytes stay out of list',async()=>{
  draft=await create(payload());internal=await create(payload({audience:'SELLER',state:'PUBLISHED'}));published=await create(payload({state:'PUBLISHED'}));
  const r=await api(root,seller);assert.equal(r.data.resources.some(x=>x.id===draft.id),false);assert.equal(r.data.resources.some(x=>x.id===internal.id),true);assert.equal(r.data.resources.some(x=>x.id===published.id),true);assert.equal(r.data.resources.some(x=>x.content||x.base64),false);assert.equal(r.data.production_assets,undefined);
  const pub=await api(context(seller));assert.equal(pub.status,200);assert.ok(pub.data.resources.every(x=>x.audience==='PROSPECT'));assert.equal(pub.data.resources.some(x=>[draft.id,internal.id].includes(x.id)),false);assert.equal(JSON.stringify(pub.data).includes('commission_policy'),false);assert.equal(pub.data.advisor.email,undefined);
 });
 await t.test('format validation accepts genuine Office/PDF/image and rejects executable/macro/invalid inputs',async()=>{
  const doc=await require('pdf-lib').PDFDocument.create();doc.addPage();pdf=Buffer.from(await doc.save());fileBody=payload({kind:'FILE',url:undefined,filename:'guia.pdf',base64:pdf.toString('base64'),state:'PUBLISHED'});
  assert.equal((await service.fileData('guia.pdf',pdf.toString('base64'))).mime,'application/pdf');
  const png=await require('sharp')({create:{width:2,height:2,channels:4,background:'#123456'}}).png().toBuffer();assert.equal((await service.fileData('imagen.png',png.toString('base64'))).mime,'image/png');
  const zip=new(require('jszip'))();zip.file('[Content_Types].xml','<Types/>');zip.file('ppt/presentation.xml','<presentation/>');assert.match((await service.fileData('slides.pptx',(await zip.generateAsync({type:'nodebuffer'})).toString('base64'))).mime,/presentation/);zip.file('ppt/vbaProject.bin','macro');
  const macro=await zip.generateAsync({type:'nodebuffer'});await assert.rejects(()=>service.fileData('slides.pptx',macro.toString('base64')));
  for(const filename of ['script.html','script.svg','guia.pdf','photo.png','../escape.pdf'])assert.equal((await api(root,admin,payload({kind:'FILE',filename,base64:Buffer.from('<script>alert(1)</script>').toString('base64')}))).status,400);
  for(const url of ['javascript:alert(1)','http://example.com','https://localhost','https://127.0.0.1/','https://user:password@example.com','https://example.com:444/'])assert.equal((await api(root,admin,payload({url}))).status,400);
  assert.equal((await api(root,admin,payload({kind:'FILE',filename:'missing.pdf'}))).status,400);
  assert.equal((await api(root,admin,payload({resource_key:'empieza-aqui'}))).status,400);
 });
 await t.test('downloads require eligible viewer, public audience and current publication; mutations audit revisions',async()=>{
  const f=await create(fileBody),privateFile=await create({...fileBody,resource_key:'qa_'+randomUUID(),audience:'SELLER'}),draftFile=await create({...fileBody,resource_key:'qa_'+randomUUID(),state:'DRAFT'});
  const privatePath=id=>root+'/'+id+'/download',publicPath=id=>'/api/public/seller-kit/resources/'+id+'/download?seller='+seller.id;
  assert.equal((await api(privatePath(f.id))).status,401);assert.equal((await api(privatePath(f.id),pending)).status,403);
  const downloaded=await api(publicPath(f.id));assert.equal(downloaded.status,200);assert.deepEqual(downloaded.bytes,pdf);assert.equal(downloaded.headers.get('content-type'),'application/pdf');assert.match(downloaded.headers.get('cache-control'),/no-store/);assert.equal(downloaded.headers.get('x-content-type-options'),'nosniff');
  assert.equal((await api(publicPath(privateFile.id))).status,404);assert.equal((await api(publicPath(draftFile.id))).status,404);assert.equal((await api(privatePath(draftFile.id),seller)).status,404);assert.equal((await api(privatePath(draftFile.id),admin)).status,200);
  const update={...fileBody,resource_key:f.resource_key,base64:undefined,filename:undefined,state:'ARCHIVED',expected_revision:1};assert.equal((await api(root+'/'+f.id,seller,update,'PATCH')).status,403);
  assert.equal((await api(root+'/'+f.id,admin,update,'PATCH')).status,200);assert.equal((await api(root+'/'+f.id,admin,update,'PATCH')).status,409);assert.equal((await api(publicPath(f.id))).status,404);assert.equal((await api(privatePath(f.id),seller)).status,404);
  const audits=(await query('select detail from qori_commercial_audit where entity_id=$1 order by created_at',[f.id])).rows;assert.equal(audits.length,2);assert.equal(audits[1].detail.previous_state,'PUBLISHED');assert.equal(audits[1].detail.state,'ARCHIVED');assert.ok(audits[1].detail.sha256);assert.equal(JSON.stringify(audits).includes('base64'),false);
 });
 await t.test('personal and CRM presentation retain seven plan selections without exposing or modifying prospect',async()=>{
  const p=(await query("insert into qori_sales_prospects(seller_id,business_name,contact_name,email,stage,phone) values($1,'Negocio prueba','Contacto QA',$2,'NEGOTIATING','3100000000') returning *",[seller.id,randomUUID()+'@example.test'])).rows[0];
  const referral=await api('/api/admin/commercial/prospects/'+p.id+'/referral',seller);assert.equal(referral.status,200);const link=new URL(referral.data.presentation_url),token=link.searchParams.get('prospect_ref');assert.ok(token);assert.equal(link.searchParams.get('seller'),seller.id);
  const pub=await api(context(seller)+'&prospect_ref='+token);assert.equal(pub.status,200,JSON.stringify(pub.data));assert.equal(pub.data.plans.length,7);assert.equal(JSON.stringify(pub.data).includes(p.email),false);
  for(const plan of pub.data.plans){const u=new URL(plan.url);assert.equal(u.searchParams.get('prospect_ref'),token);assert.equal(u.searchParams.get(plan.monthly_price_cop===0?'seller':'advisor'),seller.id);assert.equal(u.searchParams.get(plan.monthly_price_cop===0?'program':'plan'),plan.code);}
  assert.equal((await query('select business_id,stage from qori_sales_prospects where id=$1',[p.id])).rows[0].stage,'NEGOTIATING');
  assert.equal((await api(context(other)+'&prospect_ref='+token)).status,400);assert.equal((await api(context(seller)+'&prospect_ref='+token+'x')).status,400);assert.equal((await api(context(pending))).status,403);assert.equal((await api('/api/public/seller-kit')).status,400);
  await query('update qori_sales_prospects set email=$2 where id=$1',[p.id,randomUUID()+'@example.test']);assert.equal((await api(context(seller)+'&prospect_ref='+token)).status,400);
  await query('update app_users set is_active=false where id=$1',[other.id]);assert.equal((await api(context(other))).status,400);
 });
 await t.test('table has RLS; public static surfaces never serve internal source documents',async()=>{
  assert.equal((await query("select relrowsecurity from pg_class where oid='qori_seller_resources'::regclass")).rows[0].relrowsecurity,true);
  for(const route of ['/docs/PROMPT_COLECCION_DIGITAL_QORI.txt','/backend/src/services/sellerResourceContent.js'])assert.equal((await api(route)).status,404);
  for(const route of ['/conoce-qori/','/seller/resources.js','/seller/resources.css'])assert.equal((await api(route)).status,200);
 });
 await t.test('candidate resources have their own public gate; neither client nor private files cross audiences',async()=>{
  const candidate=await create({...fileBody,resource_key:'qa_'+randomUUID(),audience:'CANDIDATE'});
  const url='/api/public/seller-kit/opportunity/resources/'+candidate.id+'/download';assert.equal((await api(url)).status,200);
  const list=await api('/api/public/seller-kit/opportunity');assert.equal(list.status,200);assert.ok(list.data.resources.every(r=>r.audience==='CANDIDATE'));assert.ok(list.data.resources.some(r=>r.id===candidate.id));
  assert.equal((await api('/api/public/seller-kit/opportunity/resources/'+internal.id+'/download')).status,404);
  assert.equal((await api('/api/public/seller-kit/resources/'+candidate.id+'/download?seller='+seller.id)).status,404);
  assert.equal((await api(context(seller))).data.resources.some(r=>r.id===candidate.id),false);
  const update={...fileBody,resource_key:candidate.resource_key,audience:'CANDIDATE',state:'ARCHIVED',base64:undefined,filename:undefined,expected_revision:1};assert.equal((await api(root+'/'+candidate.id,admin,update,'PATCH')).status,200);assert.equal((await api(url)).status,404);
 });
});
