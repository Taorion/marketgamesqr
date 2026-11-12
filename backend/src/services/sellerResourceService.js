const {z}=require('zod');
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {query,withTransaction}=require('../config/db');
const {env}=require('../config/env');
const {validate}=require('../utils/validators');
const {badRequest,notFound}=require('../utils/http');
const {requireApproved}=require('./qoriSellerService');
const {requireSuperadmin}=require('./commercialAuthorization');
const {guides,productionAssets}=require('./sellerResourceContent');
const uuid=z.string().uuid(),maxBytes=15*1024*1024;
const columns='id,resource_key,title,description,usage,audience,stage,kind,state,version_label,url,filename,mime,byte_size,sha256,revision,created_at,updated_at';
const schema=z.object({resource_key:z.string().regex(/^[a-z0-9][a-z0-9_-]{1,79}$/),title:z.string().trim().min(3).max(140),description:z.string().trim().max(800).default(''),usage:z.string().trim().max(2000).default(''),audience:z.enum(['SELLER','PROSPECT','CANDIDATE']),stage:z.enum(['START','DISCOVER','PRESENT','CLOSE','ACTIVATE','FOLLOW_UP']),kind:z.enum(['FILE','LINK']),state:z.enum(['DRAFT','PUBLISHED','ARCHIVED']).default('DRAFT'),version_label:z.string().trim().min(1).max(40),url:z.string().max(2000).nullable().optional(),filename:z.string().min(1).max(180).optional(),base64:z.string().max(Math.ceil(maxBytes/3)*4).optional(),expected_revision:z.number().int().positive().optional()}).strict();
function safeUrl(value){
 let u;try{u=new URL(value);}catch{throw badRequest('Indica un enlace HTTPS completo.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||u.hostname.endsWith('.local')||u.hostname.endsWith('.localhost')||u.hostname.endsWith('.internal')||/^[\d.]+$/.test(u.hostname)||u.hostname.includes(':'))throw badRequest('Usa un enlace HTTPS público, sin credenciales ni puertos.');
 return u.href;
}
async function fileData(filename,base64){
 if(!filename||!base64||/[\/\\\x00-\x1f]/.test(filename)||base64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw badRequest('Archivo inválido.');
 const content=Buffer.from(base64,'base64');if(!content.length||content.length>maxBytes)throw badRequest('El archivo debe pesar hasta 15 MB.');
 const ext=path.extname(filename).toLowerCase();let mime;
 try{
  if(ext==='.pdf'){
   if(content.subarray(0,5).toString()!=='%PDF-'||!content.subarray(-2048).includes(Buffer.from('%%EOF')))throw Error();
   await require('pdf-lib').PDFDocument.load(content);mime='application/pdf';
  }else if(['.png','.jpg','.jpeg','.webp'].includes(ext)){
   const m=await require('sharp')(content,{limitInputPixels:40000000}).metadata(),expected={'.png':'png','.jpg':'jpeg','.jpeg':'jpeg','.webp':'webp'}[ext];
   if(m.format!==expected)throw Error();mime='image/'+expected;
  }else if(['.docx','.pptx','.xlsx'].includes(ext)){
   const zip=await require('jszip').loadAsync(content),entries=Object.values(zip.files),main={'.docx':'word/document.xml','.pptx':'ppt/presentation.xml','.xlsx':'xl/workbook.xml'}[ext];
   if(entries.length>4000||entries.reduce((n,e)=>n+(e._data?.uncompressedSize||0),0)>80*1024*1024||!zip.file('[Content_Types].xml')||!zip.file(main)||entries.some(e=>/vbaProject|embeddings\/|activeX\//i.test(e.name)))throw Error();
   const types=await zip.file('[Content_Types].xml').async('string');if(/macroEnabled|vbaProject/i.test(types))throw Error();
   mime='application/vnd.openxmlformats-officedocument.'+{'.docx':'wordprocessingml.document','.pptx':'presentationml.presentation','.xlsx':'spreadsheetml.sheet'}[ext];
  }else throw Error();
 }catch{throw badRequest('Formato inválido. Admite PDF, PNG, JPG, WebP, DOCX, PPTX y XLSX sin macros ni archivos incrustados.');}
 return {content,filename,mime,byte_size:content.length,sha256:createHash('sha256').update(content).digest('hex')};
}
const presentationUrl=(seller,token)=>env.publicAppUrl.replace(/\/$/,'')+'/conoce-qori/?'+new URLSearchParams({seller,...(token?{prospect_ref:token}:{})});
function plans(seller,token){
 const base=env.publicAppUrl.replace(/\/$/,''),params=token?{prospect_ref:token}:{};
 return require('./sellerPlanReferralLinks').planReferralLinks(base+'/pense-en-ti/?'+new URLSearchParams({seller,...params}),base+'/paquetes/?'+new URLSearchParams({advisor:seller,...params})).map(p=>({...require('./subscriptionService').PLAN_CATALOG[p.code],code:p.code,url:p.url,...(require('./freeProgramPolicy').programs[p.code]?{access_summary:require('./freeProgramPolicy').programs[p.code].summary}:{})}));
}
async function list(user){
 await requireApproved(user);const admin=user.role==='QORI_SUPERADMIN';
 return {resources:[...guides,...(await query(`select ${columns} from qori_seller_resources ${admin?'':"where state='PUBLISHED'"} order by updated_at desc,id`)).rows],presentation_url:presentationUrl(user.id),admin,production_assets:admin?productionAssets:undefined};
}
async function save(user,id,payload){
 requireSuperadmin(user);if(id)validate(uuid,id);const d=validate(schema,payload);
 if(guides.some(g=>g.id===d.resource_key))throw badRequest('Este código está reservado para una guía web.');
 const uploaded=d.base64!==undefined?await fileData(d.filename,d.base64):null;
 const url=d.kind==='LINK'?safeUrl(d.url):null;
 return withTransaction(async db=>{
  const previous=id?(await db.query('select * from qori_seller_resources where id=$1 for update',[id])).rows[0]:null;
  if(id&&!previous)throw notFound();
  if(id&&d.expected_revision!==previous.revision)throw Object.assign(new Error('Otro administrador actualizó el recurso. Actualiza la biblioteca antes de guardar.'),{status:409});
  const file=d.kind==='FILE'?(uploaded||(previous?.kind==='FILE'?previous:{})):{};
  if(d.kind==='FILE'&&!file.content)throw badRequest('Selecciona el archivo antes de guardar.');
  const fields=['resource_key','title','description','usage','audience','stage','kind','state','version_label','url','filename','mime','content','byte_size','sha256','updated_by'];
  const values=[d.resource_key,d.title,d.description,d.usage,d.audience,d.stage,d.kind,d.state,d.version_label,url,file.filename||null,file.mime||null,file.content||null,file.byte_size||0,file.sha256||null,user.id];
  const result=id?await db.query(`update qori_seller_resources set ${fields.map((f,i)=>f+'=$'+(i+1)).join(',')},revision=revision+1,updated_at=now() where id=$17 returning ${columns}`,[...values,id]):await db.query(`insert into qori_seller_resources(${fields.join(',')},created_by) values(${values.map((_,i)=>'$'+(i+1)).join(',')},$16) returning ${columns}`,values);
  const resource=result.rows[0];await db.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,$2,'seller_resource',$3,$4::jsonb)",[user.id,id?'SELLER_RESOURCE_UPDATED':'SELLER_RESOURCE_CREATED',resource.id,JSON.stringify({state:resource.state,previous_state:previous?.state||null,audience:resource.audience,previous_audience:previous?.audience||null,revision:resource.revision,sha256:resource.sha256,title:resource.title})]);
  return {resource};
 });
}
async function publicContext(params){
 const d=validate(z.object({seller:uuid,prospect_ref:z.string().max(2500).optional()}).strict(),params),advisor=await require('./commercialAdvisorService').advisorById(d.seller);
 await require('./prospectReferralService').validatePresentationContext(d.seller,d.prospect_ref);
 const resources=(await query(`select ${columns} from qori_seller_resources where state='PUBLISHED' and audience='PROSPECT' order by updated_at desc,id`)).rows;
 // Official signup links uploaded as resources receive the same verified context.
 for(const r of resources){if(r.kind!=='LINK')continue;const u=new URL(r.url);if(u.origin!==new URL(env.publicAppUrl).origin)continue;const target=u.pathname.replace(/\/$/,'');if(!['/paquetes','/pense-en-ti','/conoce-qori'].includes(target))continue;u.searchParams.delete('seller');u.searchParams.delete('advisor');u.searchParams.delete('prospect_ref');u.searchParams.set(target==='/paquetes'?'advisor':'seller',d.seller);if(d.prospect_ref)u.searchParams.set('prospect_ref',d.prospect_ref);r.url=u.href;}
 return {advisor,presentation_url:presentationUrl(d.seller,d.prospect_ref),plans:plans(d.seller,d.prospect_ref),resources:[...guides.filter(g=>g.audience==='PROSPECT'),...resources]};
}
async function download(user,id,params){
 validate(uuid,id);
 if(user)await requireApproved(user);else await publicContext(params);
 const r=(await query('select * from qori_seller_resources where id=$1',[id])).rows[0];
 if(!r||r.kind!=='FILE'||(!user&&(r.audience!=='PROSPECT'||r.state!=='PUBLISHED'))||(user&&user.role!=='QORI_SUPERADMIN'&&r.state!=='PUBLISHED'))throw notFound('Archivo no disponible.');
 return r;
}
async function opportunity(){return {resources:(await query(`select ${columns} from qori_seller_resources where state='PUBLISHED' and audience='CANDIDATE' order by resource_key,id`)).rows};}
async function opportunityDownload(id){
 validate(uuid,id);const r=(await query("select * from qori_seller_resources where id=$1 and audience='CANDIDATE' and state='PUBLISHED' and kind='FILE'",[id])).rows[0];if(!r)throw notFound('Archivo no disponible.');return r;
}
function brief(user){
 requireSuperadmin(user);const base=env.publicAppUrl.replace(/\/$/,'');
 return {generated_at:new Date().toISOString(),audience:'INTERNAL_PRODUCTION_ONLY',official_urls:{home:base,seller:base+'/seller/',empresa:base+'/empresa/',customer:base+'/customer/',plans:base+'/paquetes/',catalog:base+'/api/public/subscription-plans'},plans:plans(user.id).map(({url,...p})=>p),free_programs:require('./freeProgramPolicy').programs,commission_policy_internal_only:require('./sellerCommissionPolicy').publicPolicy(),production_assets:productionAssets,guides,link_instructions:'Los enlaces personales se copian desde Seller > Materiales para vender. Si el contacto existe en Mi CRM, usa Compartir suscripción > Presentación y materiales. Nunca inventes identificadores, enlaces personales ni tokens. Los archivos para clientes se acompañan del enlace personal; descargar un PDF no personaliza sus enlaces. Una cuenta creada no equivale a pago confirmado ni a cierre validado ni a comisión pagada.'};
}
function prompt(user){requireSuperadmin(user);return fs.readFileSync(path.resolve(__dirname,'../../../docs/PROMPT_COLECCION_DIGITAL_QORI.txt'),'utf8');}
module.exports={list,save,publicContext,download,brief,prompt,fileData,safeUrl,opportunity,opportunityDownload};
