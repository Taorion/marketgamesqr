const QRCode=require('qrcode');
const {query}=require('../config/db');
const {env}=require('../config/env');
const {badRequest,notFound,forbidden}=require('../utils/http');
const {planFromBusiness}=require('./subscriptionService');
const {snapshot,publicRules}=require('./stampCardService');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isStamps=c=>c?.metadata?.redemption_mode==='STAMP_PROGRAMS';
async function validateConfig(db,businessId,payload){
 if(!isStamps(payload))return;
 const b=(await db.query('select * from businesses where id=$1',[businessId])).rows[0];
 if(!b||!planFromBusiness(b).features.stamp_cards)throw forbidden('Tu plan no incluye programas de sellos.');
 const ids=payload.metadata.stamp_program_ids;
 if(!Array.isArray(ids)||ids.length>50||ids.some(id=>typeof id!=='string'||!uuid.test(id))||new Set(ids).size!==ids.length)throw badRequest('Selecciona programas válidos de tu negocio.');
 if(payload.status==='ACTIVE'&&!ids.length)throw badRequest('Selecciona al menos un programa antes de publicar la vitrina.');
 const rows=(await db.query('select id from stamp_programs where business_id=$1 and id=any($2::uuid[]) and deleted_at is null',[businessId,ids])).rows;
 if(rows.length!==ids.length)throw badRequest('Todos los programas deben pertenecer a este negocio y no estar eliminados.');
}
async function publicCatalog(slug){
 const c=(await query(`select c.*,to_jsonb(b) business from smart_catalogs c join businesses b on b.id=c.business_id where c.slug=$1 and c.status='ACTIVE'`,[slug])).rows[0];
 if(!c||!c.business.is_active||c.business.archived_at)throw notFound('Vitrina no disponible.');
 const p=planFromBusiness(c.business);
 if(!p.portal_access_allowed||p.raw_status!=='ACTIVE'||!p.features.showcase)throw notFound('Vitrina no disponible.');
 return c;
}
async function stampPrograms(slug){
 const c=await publicCatalog(slug);
 if(!isStamps(c)||!planFromBusiness(c.business).features.stamp_cards)throw notFound('Vitrina de programas no disponible.');
 const ids=Array.isArray(c.metadata.stamp_program_ids)?c.metadata.stamp_program_ids.filter(id=>typeof id==='string'&&uuid.test(id)):[];
 const rows=(await query(`select * from stamp_programs where business_id=$1 and id=any($2::uuid[]) and status='ACTIVE' and deleted_at is null order by array_position($2::uuid[],id)`,[c.business_id,ids])).rows;
 return {catalog:{id:c.id,title:c.title,business_id:c.business_id,business_name:c.business.name},programs:rows.map(p=>({id:p.id,...publicRules(snapshot(p)),enrollment_url:'/sellos/inscripcion.html?programa='+p.id}))};
}
async function qrFor(c){
 const url=new URL('/c/'+encodeURIComponent(c.slug),env.publicAppUrl).toString();
 return {catalog_id:c.id,title:c.title,status:c.status,url,qr_image:await QRCode.toDataURL(url,{width:900,margin:4,errorCorrectionLevel:'M'}),credits_consumed:0};
}
async function accessQr(businessId,id){
 if(!uuid.test(id||''))throw badRequest('Vitrina no válida.');
 const c=(await query("select * from smart_catalogs where id=$1 and business_id=$2 and status<>'ARCHIVED'",[id,businessId])).rows[0];
 if(!c)throw notFound('Vitrina no encontrada.');
 return qrFor(c);
}
async function publicAccessQr(slug){return qrFor(await publicCatalog(slug));}
module.exports={isStamps,validateConfig,stampPrograms,accessQr,publicAccessQr};
