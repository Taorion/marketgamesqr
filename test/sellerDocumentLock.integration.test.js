const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='dossier-lock-isolated-qa';
const {query,pool}=require('../backend/src/config/db'),service=require('../backend/src/services/qoriSellerService'),{VERSION}=require('../backend/src/services/qoriSellerPolicy'),fixtures=require('./helpers/sellerDossier');
let seller,admin,other,pdf;
async function person(role){return (await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Expediente Pruebas',$2) returning *",[crypto.randomUUID()+'@example.test',role])).rows[0];}
before(async()=>{assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');seller=await person('QORI_SELLER');other=await person('QORI_SELLER');admin=await person('QORI_SUPERADMIN');await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version) values($1,$2,'3105550000','Bogotá','4610',$3)",[seller.id,crypto.randomUUID(),VERSION]);const d=await require('pdf-lib').PDFDocument.create();d.addPage();pdf=Buffer.from(await d.save());});
after(async()=>{await pool.end();});
test('seller concurrent first attachments serialize; every later replacement is denied and owner download remains exact',async()=>{
 const first=await fixtures.file('IDENTITY',pdf),results=await Promise.allSettled([service.upload(seller,'IDENTITY',first),service.upload(seller,'IDENTITY',first)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,403);
 const doc=(await query("select * from qori_seller_documents where user_id=$1 and kind='IDENTITY'",[seller.id])).rows[0];
 for(const status of ['DRAFT','CHANGES_REQUESTED','SUBMITTED','APPROVED','REJECTED','SUSPENDED']){
  await query('update qori_seller_applications set status=$2 where user_id=$1',[seller.id,status]);
  await assert.rejects(service.upload(seller,'IDENTITY',first),e=>e.status===403);
  assert.deepEqual((await service.document(seller,doc.id)).bytes,pdf);
 }
 await assert.rejects(service.document(other,doc.id),e=>e.status===403);
 assert.equal((await query("select count(*)::int n from qori_commercial_audit where entity_id=$1 and action='SELLER_DOCUMENT_UPLOADED'",[seller.id])).rows[0].n,1);
});
test('Admin replacement supports all states, requires current hash and invalidates documentary approval',async()=>{
 const file=await fixtures.adminFile('IDENTITY',pdf);
 for(const status of ['DRAFT','CHANGES_REQUESTED','SUBMITTED','APPROVED','REJECTED','SUSPENDED']){
  await query("update qori_seller_applications set status=$2,approval_mode='DOCUMENTS',submitted_at=now() where user_id=$1",[seller.id,status]);
  const previous=(await query("select sha256 from qori_seller_documents where user_id=$1 and kind='IDENTITY'",[seller.id])).rows[0];
  await assert.rejects(service.adminUpload(admin,seller.id,'IDENTITY',{...file,expected_sha256:null}),e=>e.status===409);
  await service.adminUpload(admin,seller.id,'IDENTITY',{...file,expected_sha256:previous.sha256});
  const a=(await service.application(seller)).application;assert.equal(a.submitted_at,null);assert.equal(a.status,status==='SUBMITTED'?'DRAFT':status);
  if(status==='APPROVED')assert.equal(a.approval_mode,'ADMIN_OVERRIDE');
 }
 await assert.rejects(service.adminUpload(other,seller.id,'IDENTITY',file),e=>e.status===403);
 const events=(await query("select actor_id,detail from qori_commercial_audit where entity_id=$1 and action='SELLER_DOCUMENT_ADMIN_UPLOADED'",[seller.id])).rows;
 assert.equal(events.length,6);assert.ok(events.every(e=>e.actor_id===admin.id&&e.detail.previous_sha256&&e.detail.requires_document_review));
});
test('face photo requires explicit consent and a decodable image; new requirements cannot be bypassed',async()=>{
 await query("update qori_seller_applications set status='DRAFT' where user_id=$1",[seller.id]);
 const photo=await fixtures.file('PHOTO',pdf),missing={...photo};delete missing.photo_consent;
 await assert.rejects(service.upload(seller,'PHOTO',missing),e=>e.status===400);
 await assert.rejects(service.upload(seller,'PHOTO',{...photo,content_base64:pdf.toString('base64')}),e=>e.status===400);
 await assert.rejects(service.upload(seller,'PHOTO',{...photo,content_base64:Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(50)]).toString('base64')}),e=>e.status===400);
 await service.upload(seller,'PHOTO',photo);await assert.rejects(service.upload(seller,'PHOTO',photo),e=>e.status===403);
 const confirmation={signed_and_notarized:true,documents_truthful:true,ciiu_terms_accepted:true};await assert.rejects(service.submit(seller,confirmation,'127.0.0.1'),e=>e.status===400);
 for(const kind of fixtures.kinds.filter(k=>!['IDENTITY','PHOTO'].includes(k)))await service.upload(seller,kind,await fixtures.file(kind,pdf));
 await service.submit(seller,confirmation,'127.0.0.1');
 const checks={status:'APPROVED',note:'Verificación manual del expediente completo.',identity_checked:true,ciiu_checked:true,bank_ownership_checked:true,notarized_contract_checked:true,legal_terms_checked:true};
 await assert.rejects(service.review(admin,seller.id,checks),e=>e.status===400);
 await service.review(admin,seller.id,{...checks,police_checked:true,procuraduria_checked:true,photo_checked:true});
 assert.equal((await service.application(seller)).documentation.attention,false);
 const consent=(await query("select detail from qori_commercial_audit where entity_id=$1 and action='SELLER_DOCUMENT_UPLOADED' and detail->>'kind'='PHOTO'",[seller.id])).rows[0].detail;
 assert.equal(consent.photo_consent,true);assert.equal(consent.photo_use,'MANUAL_DOSSIER_REVIEW');
});
test('documents remain private under RLS and public roles have no table grants',async()=>{
 assert.equal((await query("select relrowsecurity from pg_class where oid='public.qori_seller_documents'::regclass")).rows[0].relrowsecurity,true);
 for(const role of ['anon','authenticated']){
  if((await query('select 1 from pg_roles where rolname=$1',[role])).rowCount)assert.equal((await query("select has_table_privilege($1,'public.qori_seller_documents','SELECT,INSERT,UPDATE,DELETE') allowed",[role])).rows[0].allowed,false);
 }
});
