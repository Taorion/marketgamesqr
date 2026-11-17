const QRCode=require('qrcode');
const {randomBytes,createHash}=require('node:crypto');
const jwt=require('jsonwebtoken');
const {query}=require('../config/db');
const {z}=require('zod');
const {validate}=require('../utils/validators');
const {badRequest}=require('../utils/http');
const {env}=require('../config/env');
const {requireOwner}=require('./commercialAuthorization');
const {requireApproved}=require('./qoriSellerService');
const {advisorById}=require('./commercialAdvisorService');
const {validatePresentationContext}=require('./prospectReferralService');
const {planReferralLinks}=require('./sellerPlanReferralLinks');

// Encode only a currently valid Qori signup link. Never fetch a supplied URL.
function parseTarget(raw){
  const url=new URL(raw),base=new URL(env.publicAppUrl);
  const free=url.pathname==='/pense-en-ti/',paid=url.pathname==='/paquetes/';
  if(url.origin!==base.origin||url.username||url.password||(!free&&!paid))throw badRequest('Usa un enlace de inscripción de Qori.');
  const sellerKey=free?'seller':'advisor',planKey=free?'program':'plan';
  const allowed=new Set([sellerKey,planKey,'prospect_ref']);
  for(const key of url.searchParams.keys())if(!allowed.has(key)||url.searchParams.getAll(key).length!==1)throw badRequest('El enlace contiene parámetros no válidos.');
  const sellerId=validate(z.string().uuid(),url.searchParams.get(sellerKey));
  const freeUrl=new URL('/pense-en-ti/',base);freeUrl.searchParams.set('seller',sellerId);
  const paidUrl=new URL('/paquetes/',base);paidUrl.searchParams.set('advisor',sellerId);
  const plan=planReferralLinks(freeUrl.toString(),paidUrl.toString()).find(p=>p.code===url.searchParams.get(planKey)&&Boolean(p.monthly_price_cop)===paid);
  if(!plan)throw badRequest('Selecciona un plan vigente antes de generar el QR.');
  const token=url.searchParams.get('prospect_ref');
  url.hash=free?'freeForm':'signupSection';
  return {destination:url.toString(),sellerId,plan,token};
}
async function generate(user,body){
  await requireApproved(user);
  const {url:raw}=validate(z.object({url:z.string().url().max(2500)}).strict(),body);
  const {destination,sellerId,plan,token}=parseTarget(raw);
  requireOwner(user,sellerId);
  const advisor=await advisorById(sellerId);
  await validatePresentationContext(sellerId,token);
  let qrUrl=destination,expiresAt=null;
  if(token){
    // The token was verified above. Preserve its original expiration, never renew it.
    expiresAt=new Date(jwt.decode(token).exp*1000).toISOString();
    const digest=createHash('sha256').update(destination).digest('hex');
    const saved=await query(`insert into qori_seller_signup_qr_links(token,seller_id,target_hash,target_url,expires_at,created_by)
      values($1,$2,$3,$4,$5,$6)
      on conflict(seller_id,target_hash) do update set target_hash=excluded.target_hash returning token`,
      [randomBytes(18).toString('base64url'),sellerId,digest,destination,expiresAt,user.id]);
    qrUrl=new URL('/inscripcion/'+saved.rows[0].token,env.publicAppUrl).toString();
  }
  const data=await QRCode.toDataURL(qrUrl,{type:'image/png',width:1024,margin:4,errorCorrectionLevel:'M',color:{dark:'#012268',light:'#ffffff'}});
  return {url:destination,qr_url:qrUrl,expires_at:expiresAt,plan_code:plan.code,plan_name:plan.name,advisor_name:advisor.name,qr_data_url:data,
    filename:'Qori-'+plan.code+'-'+sellerId.slice(0,8)+(token?'-contacto':'')+'-QR.png',
    prospect_specific:Boolean(token),notice:token?'Solo para este contacto. Conserva la vigencia de su enlace de CRM.':'Comparte este QR con clientes que quieran inscribirse en este plan.'};
}
async function resolve(token){
  if(!/^[A-Za-z0-9_-]{24}$/.test(token))throw badRequest('QR no disponible.');
  const row=(await query('select seller_id,target_url from qori_seller_signup_qr_links where token=$1 and expires_at>now()',[token])).rows[0];
  if(!row)throw badRequest('QR vencido o no disponible.');
  const target=parseTarget(row.target_url);
  if(target.sellerId!==row.seller_id||!target.token)throw badRequest('QR no válido.');
  await advisorById(target.sellerId);
  await validatePresentationContext(target.sellerId,target.token);
  return target.destination;
}
module.exports={generate,resolve};
