const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto'),{z}=require('zod');
const {query,withTransaction}=require('../config/db');
const {requireApproved}=require('./qoriSellerService');
const {requireSuperadmin}=require('./commercialAuthorization');
const {validate}=require('../utils/validators');
const {notFound,badRequest,forbidden}=require('../utils/http');
const {catalog}=require('./sellerAcademyContent');
const columns='id,resource_key,title,description,kind,state,position,drive_id,asset_key,filename,mime,byte_size,sha256,revision,updated_at';
const keySchema=z.string().regex(/^[a-z0-9][a-z0-9_-]{1,79}$/);
const schema=z.object({title:z.string().trim().min(3).max(140),description:z.string().trim().max(800).default(''),kind:z.enum(['VIDEO','FILE']),state:z.enum(['DRAFT','PUBLISHED','ARCHIVED']).default('DRAFT'),position:z.number().int().min(1).max(9999),url:z.string().max(2000).optional(),filename:z.string().min(1).max(180).optional(),base64:z.string().max(20971520).optional(),expected_revision:z.number().int().positive().optional()}).strict();
const conflict=()=>Object.assign(new Error('Otro administrador modificó este contenido. Actualiza Academy antes de guardar.'),{status:409});
function driveId(value){
 let url;try{url=new URL(value);}catch{throw badRequest('Pega el enlace del video en Google Drive.');}
 const id=url.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]{10,150})\/(?:view|preview)\/?$/)?.[1];
 if(url.origin!=='https://drive.google.com'||url.username||url.password||!id)throw badRequest('Usa un enlace de video https://drive.google.com/file/d/…/view.');
 return id;
}
function diskFile(assetKey){
 const original=catalog.find(item=>item.id===assetKey&&item.format!=='VIDEO');if(!original)throw notFound('Archivo no disponible.');
 const filename=path.resolve(__dirname,'../../assets/academy',original.filename);
 try{if(fs.statSync(filename).isFile())return filename;}catch{}
 throw notFound('Archivo no disponible temporalmente.');
}
function metadata(row){
 let available=true;if(row.asset_key)try{diskFile(row.asset_key);}catch{available=false;}
 return {id:row.resource_key,title:row.title,description:row.description,kind:row.kind,state:row.state,order:row.position,format:row.kind==='VIDEO'?'VIDEO':path.extname(row.filename||'').slice(1).toUpperCase(),filename:row.filename,byte_size:Number(row.byte_size),available,revision:row.revision,updated_at:row.updated_at,...(row.drive_id?{embed_url:`https://drive.google.com/file/d/${row.drive_id}/preview`,url:`https://drive.google.com/file/d/${row.drive_id}/view`}:{})};
}
async function settings(db={query}){return (await db.query('select enabled,revision,updated_at from qori_academy_settings where singleton=true')).rows[0];}
async function summary(){const config=await settings();return {status:config.enabled?'AVAILABLE':'DISABLED',enabled:config.enabled,title:'Qori Academy',message:config.enabled?'Qori Academy está disponible para embajadores aprobados.':'Qori Academy está temporalmente deshabilitada. Vuelve a consultar más adelante.'};}
async function list(user,admin=false){
 if(admin)requireSuperadmin(user);else await requireApproved(user);
 const config=await settings();
 const rows=!admin&&!config.enabled?[]:(await query(`select ${columns} from qori_academy_materials ${admin?'':"where state='PUBLISHED'"} order by position,resource_key`)).rows;
 return {title:'Qori Academy',enabled:config.enabled,...(admin?{settings:config}:{}),resources:rows.map(metadata)};
}
async function get(user,id,bytes=false){
 await requireApproved(user);validate(keySchema,id);
 const config=await settings(),admin=user.role==='QORI_SUPERADMIN';
 if(!admin&&!config.enabled)throw forbidden('Qori Academy está temporalmente deshabilitada.');
 const row=(await query(`select ${columns}${bytes?',content':''} from qori_academy_materials where resource_key=$1`,[id])).rows[0];
 if(!row||(!admin&&row.state!=='PUBLISHED'))throw notFound('Material no disponible.');return row;
}
async function access(user,id){return {resource:metadata(await get(user,id))};}
async function file(user,id){const row=await get(user,id,true);if(row.kind!=='FILE')throw notFound('Archivo no disponible.');return {...metadata(row),mime:row.mime,...(row.asset_key?{path:diskFile(row.asset_key)}:{content:row.content})};}
async function audit(db,user,action,id,detail){await db.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,$2,'academy',$3,$4::jsonb)",[user.id,action,id,JSON.stringify(detail)]);}
async function configure(user,payload){
 requireSuperadmin(user);const d=validate(z.object({enabled:z.boolean(),expected_revision:z.number().int().positive()}).strict(),payload);
 return withTransaction(async db=>{
  const previous=(await db.query('select * from qori_academy_settings where singleton=true for update')).rows[0];if(previous.revision!==d.expected_revision)throw conflict();
  const row=(await db.query('update qori_academy_settings set enabled=$1,revision=revision+1,updated_by=$2,updated_at=now() where singleton=true returning enabled,revision,updated_at',[d.enabled,user.id])).rows[0];
  await audit(db,user,'ACADEMY_ACCESS_CHANGED','00000000-0000-4000-8000-000000000001',{previous_enabled:previous.enabled,enabled:row.enabled,revision:row.revision});return {settings:row};
 });
}
async function save(user,id,payload){
 requireSuperadmin(user);if(id)validate(keySchema,id);
 const d=validate(schema,payload),drive=d.kind==='VIDEO'?driveId(d.url):null;
 if(d.kind==='VIDEO'&&(d.base64!==undefined||d.filename!==undefined))throw badRequest('Los videos se agregan mediante un enlace de Drive.');
 let uploaded;if(d.kind==='FILE'&&d.base64!==undefined){
  if(!/\.(pdf|pptx|docx|xlsx|png|jpe?g|webp)$/i.test(d.filename||''))throw badRequest('Selecciona un documento o imagen admitido.');
  uploaded=await require('./sellerResourceService').fileData(d.filename,d.base64);
 }
 return withTransaction(async db=>{
  const previous=id?(await db.query('select * from qori_academy_materials where resource_key=$1 for update',[id])).rows[0]:null;
  if(id&&!previous)throw notFound();if(id&&d.expected_revision!==previous.revision)throw conflict();
  const f=d.kind==='FILE'?(uploaded||(previous?.kind==='FILE'?previous:null)):null;
  if(d.kind==='FILE'&&!f)throw badRequest('Selecciona el archivo antes de guardar.');
  const fields=['title','description','kind','state','position','drive_id','asset_key','filename','mime','content','byte_size','sha256','updated_by'];
  const values=[d.title,d.description,d.kind,d.state,d.position,drive,f?.asset_key||null,f?.filename||null,f?.mime||null,f?.content||null,f?.byte_size||0,f?.sha256||null,user.id];
  const row=id?(await db.query(`update qori_academy_materials set ${fields.map((f,i)=>f+'=$'+(i+1)).join(',')},revision=revision+1,updated_at=now() where resource_key=$14 returning ${columns}`,[...values,id])).rows[0]:(await db.query(`insert into qori_academy_materials(${fields.join(',')},resource_key,created_by) values(${values.map((_,i)=>'$'+(i+1)).join(',')},$14,$13) returning ${columns}`,[...values,randomUUID()])).rows[0];
  await audit(db,user,id?'ACADEMY_MATERIAL_UPDATED':'ACADEMY_MATERIAL_CREATED',row.id,{resource_key:row.resource_key,title:row.title,previous_state:previous?.state||null,state:row.state,revision:row.revision,position:row.position,sha256:row.sha256});
  return {resource:metadata(row)};
 });
}
module.exports={catalog,list,summary,file,access,configure,save,driveId};
