const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { query, withTransaction } = require('../config/db');
const { env } = require('../config/env');
const { validate } = require('../utils/validators');
const { badRequest, notFound } = require('../utils/http');
const { requireSuperadmin } = require('./commercialAuthorization');
const { VERSION, CIIU } = require('./qoriSellerPolicy');
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
const unavailable = () => badRequest('Este enlace de activación no está disponible o venció. Solicita uno nuevo al administrador de Qori.');
async function audit(db, actor, action, id, detail) {
  await db.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,$2,'seller',$3,$4::jsonb)", [actor, action, id, JSON.stringify(detail)]);
}
async function issue(db, userId, adminId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const row = (await db.query(`insert into qori_seller_activations(user_id,token_hash,expires_at,created_by)
    values($1,$2,now()+interval '7 days',$3) on conflict(user_id) do update
    set token_hash=excluded.token_hash,expires_at=excluded.expires_at,created_by=excluded.created_by,created_at=now()
    returning expires_at`, [userId, hash(token), adminId])).rows[0];
  return { url: new URL('/seller/#activar=' + token, env.publicAppUrl).toString(), expires_at: row.expires_at };
}
async function create(user, payload) {
  requireSuperadmin(user);
  const d = validate(z.object({
    full_name:z.string().trim().min(5).max(160), email:z.string().trim().email().max(180),
    document_key:z.string().trim().regex(/^\d{5,15}$/), phone:z.string().trim().min(7).max(40),
    city:z.string().trim().min(2).max(120), reason:z.string().trim().min(15).max(1000),
  }).strict(), payload);
  return withTransaction(async db => {
    await db.query('select pg_advisory_xact_lock(hashtext($1))', ['signup-email:' + d.email.toLowerCase()]);
    if ((await db.query('select 1 from app_users where lower(email)=lower($1)', [d.email])).rowCount) throw badRequest('Este correo ya tiene una cuenta. Administra la cuenta existente; no se cambiará su contraseña.');
    if ((await db.query('select 1 from qori_seller_applications where document_key=$1', [d.document_key])).rowCount) throw badRequest('Ya existe un embajador con ese documento.');
    const seller = (await db.query(`insert into app_users(email,password_hash,full_name,role,is_active,password_setup_required)
      values(lower($1),$2,$3,'QORI_SELLER',true,true) returning id,email,full_name,password_setup_required`, [d.email, '!pending-activation-' + crypto.randomBytes(32).toString('hex'), d.full_name])).rows[0];
    await db.query(`insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,accepted_at)
      values($1,$2,$3,$4,$5,'PENDING_ACTIVATION',null)`, [seller.id,d.document_key,d.phone,d.city,CIIU.code]);
    await db.query('insert into qori_sales_profiles(user_id,phone,created_by) values($1,$2,$3)', [seller.id,d.phone,user.id]);
    const activation = await issue(db, seller.id, user.id);
    await audit(db,user.id,'SELLER_MANUALLY_CREATED',seller.id,{reason:d.reason,password_setup_required:true,terms_accepted:false});
    return { seller, activation };
  });
}
async function renew(user, id) {
  requireSuperadmin(user); validate(z.string().uuid(),id);
  return withTransaction(async db => {
    const u = (await db.query('select id,is_active,role,platform_role,password_setup_required from app_users where id=$1 for update',[id])).rows[0];
    if (!u || (u.platform_role||u.role)!=='QORI_SELLER') throw notFound('Embajador no encontrado.');
    if (!u.password_setup_required || !u.is_active) throw badRequest('Solo puedes renovar la activación de una cuenta pendiente y habilitada.');
    const current=(await db.query('select completed_at from qori_seller_activations where user_id=$1 for update',[id])).rows[0];
    if(!current || current.completed_at) throw unavailable();
    const activation=await issue(db,id,user.id);
    await audit(db,user.id,'SELLER_ACTIVATION_RENEWED',id,{});
    return {activation};
  });
}
async function inspect(payload) {
  const {token}=validate(z.object({token:tokenSchema}).strict(),payload);
  const u=(await query(`select u.full_name,u.email from qori_seller_activations a join app_users u on u.id=a.user_id
    where a.token_hash=$1 and a.completed_at is null and a.expires_at>now() and u.is_active and u.password_setup_required
    and coalesce(u.platform_role,u.role::text)='QORI_SELLER'`,[hash(token)])).rows[0];
  if(!u)throw unavailable();
  return {seller:u,terms:require('./qoriSellerContract').terms()};
}
async function complete(payload,ip) {
  const password=z.string().min(12).max(72).refine(v=>Buffer.byteLength(v,'utf8')<=72,'La contraseña debe ocupar como máximo 72 bytes.');
  const d=validate(z.object({token:tokenSchema,password,password_confirm:password,terms_version:z.literal(VERSION),terms_accepted:z.literal(true),privacy_accepted:z.literal(true),adult_confirmed:z.literal(true)})
    .strict().refine(v=>v.password===v.password_confirm,'Las contraseñas no coinciden.'),payload);
  const tokenHash=hash(d.token);
  const found=(await query('select user_id from qori_seller_activations where token_hash=$1',[tokenHash])).rows[0];
  if(!found)throw unavailable();
  const passwordHash=await bcrypt.hash(d.password,12);
  return withTransaction(async db=>{
    const u=(await db.query('select * from app_users where id=$1 for update',[found.user_id])).rows[0];
    const a=(await db.query('select *,expires_at>now() valid from qori_seller_activations where user_id=$1 for update',[found.user_id])).rows[0];
    if(!u?.is_active||!u.password_setup_required||(u.platform_role||u.role)!=='QORI_SELLER'||!a?.valid||a.completed_at||a.token_hash!==tokenHash)throw unavailable();
    await db.query('update app_users set password_hash=$2,password_setup_required=false,updated_at=now() where id=$1',[u.id,passwordHash]);
    await db.query('update qori_seller_activations set completed_at=now() where user_id=$1',[u.id]);
    await db.query('update qori_seller_applications set terms_version=$2,accepted_at=now(),accepted_ip=$3,updated_at=now() where user_id=$1',[u.id,VERSION,ip||null]);
    await db.query('update password_reset_tokens set used_at=now() where user_id=$1 and used_at is null',[u.id]);
    await audit(db,u.id,'SELLER_ACTIVATED',u.id,{terms_version:VERSION,privacy_accepted:true,adult_confirmed:true});
    return {ok:true,email:u.email,message:'Tu contraseña quedó creada. Ya puedes iniciar sesión en Qori Seller.'};
  });
}
module.exports={create,renew,inspect,complete,issue};
