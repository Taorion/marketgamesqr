const crypto=require('node:crypto');
const jwt=require('jsonwebtoken');
const {query,withTransaction}=require('../config/db');
const {env}=require('../config/env');
const {forbidden,notFound}=require('../utils/http');

async function authorize(user,db={query}){
 if(!user?.is_active)throw forbidden('Tu cuenta de vendedor no está activa.');
 await require('./qoriSellerService').requireApproved(user,db);
 const demo=(await db.query('select b.id,b.name from qori_seller_demo d join businesses b on b.id=d.business_id where d.singleton and b.is_seller_demo and b.is_active')).rows[0];
 if(!demo)throw notFound('Demo Qori aún no está disponible.');
 return demo;
}
async function effectiveUser(user,claimedBusinessId){
 const demo=await authorize(user);
 if(demo.id!==claimedBusinessId)throw forbidden('La sesión no corresponde a Demo Qori.');
 const actor=(await query('select u.* from qori_seller_demo_members m join app_users u on u.id=m.demo_user_id where m.seller_id=$1 and u.business_id=$2 and u.is_active',[user.id,demo.id])).rows[0];
 if(!actor)throw forbidden('Tu acceso a Demo Qori ya no está disponible.');
 return {id:actor.id,business_id:demo.id,email:user.email,full_name:user.full_name,role:'BUSINESS_OWNER',platform_role:null,
  is_active:true,password_version:user.password_version,can_redeem_cross_business:false,branch_id:null,demo_mode:true,auth_user_id:user.id};
}
async function createSession(user){
 const demo=await withTransaction(async db=>{
  const tenant=await authorize(user,db);
  await db.query('select pg_advisory_xact_lock(hashtext($1))',['qori-demo-member:'+user.id]);
  const mapping=(await db.query('select demo_user_id from qori_seller_demo_members where seller_id=$1',[user.id])).rows[0];
  if(!mapping){
   const actor=(await db.query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,$3,$4,'BUSINESS_OWNER') returning id",[tenant.id,'seller-'+user.id+'@demo-qori.invalid','!demo-only-'+crypto.randomBytes(32).toString('hex'),user.full_name])).rows[0];
   await db.query('insert into qori_seller_demo_members(seller_id,demo_user_id) values($1,$2)',[user.id,actor.id]);
  }
  await db.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,'SELLER_DEMO_OPENED','business',$2,'{\"demo\":true}')",[user.id,tenant.id]);
  return tenant;
 });
 const token=jwt.sign({sub:user.id,demo_business_id:demo.id,session_version:env.appSessionVersion,password_version:Number(user.password_version||0)},env.jwtSecret,{expiresIn:env.jwtExpiresIn});
 const effective=await effectiveUser(user,demo.id);
 const subscription=await require('./subscriptionService').getBusinessSubscription(demo.id);
 return {token,user:{...effective,subscription},demo:{name:demo.name,shared:true},session:{token_type:'Bearer',expires_at:new Date(jwt.decode(token).exp*1000).toISOString()}};
}
function enforceDemoRequest(req){
 if(!req.user?.demo_mode)return;
 const path=String(req.originalUrl||req.url||'').split('?')[0];
 if(path==='/api/auth/me'&&req.method==='GET')return;
 if(!/^\/api\/(?:business\/|portal\/businesses\/|businesses(?:\/|$)|qr\/|redemptions\/|dashboard\/|games(?:\/|$)|payments\/)/.test(path))throw forbidden('Esta sesión es exclusiva de Demo Qori. Regresa a Seller para gestionar tu cuenta.');
 const scoped=path.match(/^\/api\/(?:portal\/)?businesses\/([^/]+)/);
 if(scoped&&scoped[1]!==req.user.business_id)throw forbidden('La demostración solo permite acceder a Demo Qori.');
 if(['GET','HEAD'].includes(req.method))return;
 // Keep all training modules visible; do not connect providers, publish externally or create paid checkouts.
 if(/\/(?:users|sellers|profile|payments|billing|subscription|storage|checkout|email-connection|whatsapp-connection)(?:\/|$)/i.test(path)
  || /(?:send|dispatch|connection|checkout|auto-renewal|publish|invitation)/i.test(path)
  || /\/customer\//i.test(path)){
  throw forbidden('Demo Qori permite practicar con datos ficticios. Esta acción de envío, cobro o configuración real no se ejecuta en la demostración.');
 }
}
module.exports={authorize,effectiveUser,createSession,enforceDemoRequest};
