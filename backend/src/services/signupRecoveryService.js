const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { query } = require('../config/db');
const { validate } = require('../utils/validators');
const { unauthorized, badRequest } = require('../utils/http');
const dummyHash = bcrypt.hash('qori-checkout-recovery-dummy-password',12);

// This endpoint authenticates the original owner solely to recover a checkout.
// It never issues a session, activates a business, changes attribution or creates an order.
async function recover(payload) {
  const d=validate(z.object({email:z.string().trim().email().max(180),password:z.string().min(1).max(120)}).strict(),payload);
  const user=(await query('select id,business_id,password_hash,password_version,role,deactivated_at,password_setup_required from app_users where lower(email)=lower($1)',[d.email])).rows[0];
  const valid=await bcrypt.compare(d.password,user?.password_hash||await dummyHash);
  if(!user||!valid)throw unauthorized('Correo o contraseña incorrectos. Usa los datos con los que registraste el negocio.');
  if(user.role!=='BUSINESS_OWNER'||!user.business_id||user.deactivated_at||user.password_setup_required)throw badRequest('Esta cuenta no tiene una inscripción pendiente disponible. Entra a tu portal o solicita revisión a Qori.');
  // Recheck credentials and current state after password verification. A password
  // change or administrative deactivation during verification revokes this request.
  const b=(await query(`select b.*,u.is_active owner_active from businesses b join app_users u on u.business_id=b.id
    where u.id=$1 and u.password_hash=$2 and coalesce(u.password_version,0)=$3 and u.deactivated_at is null
      and u.role='BUSINESS_OWNER' and not u.password_setup_required`,[user.id,user.password_hash,Number(user.password_version||0)])).rows[0];
  if(!b)throw unauthorized('La cuenta cambió. Vuelve a verificar tus datos.');
  if(b.is_active&&b.owner_active&&b.subscription_status==='ACTIVE')return {state:'ACTIVE',portal_url:'/empresa/',message:'Tu cuenta ya está activa. Entra a Qori Empresa; no necesitas repetir el pago de inscripción.'};
  if(b.settings?.signup_type!=='portal_subscription'||b.subscription_status!=='PENDING_PAYMENT'||b.is_active||b.owner_active||b.portal_status==='SUSPENDED')throw badRequest('La cuenta requiere revisión de Qori. No crees otra cuenta ni repitas un pago.');
  const order=(await query(`select id,status,credited_at,checkout_url,sandbox_checkout_url,checkout_expires_at,price_cop,currency,package_title
    from qr_credit_purchase_orders where business_id=$1 and created_by_user_id=$2
      and metadata->>'source'='public_portal_signup' and metadata->'signup'->>'user_id'=$2::text
    order by created_at desc,id desc limit 1`,[b.id,user.id])).rows[0];
  if(!order||order.credited_at||!['PENDING','REJECTED'].includes(order.status)||!order.checkout_url||
    (order.checkout_expires_at&&new Date(order.checkout_expires_at)<=new Date()))throw badRequest('No hay un enlace de pago vigente para retomar. Solicita revisión a Qori conservando esta cuenta.');
  return {state:'PENDING_PAYMENT',order:{id:order.id,checkout_url:order.checkout_url,price_cop:Number(order.price_cop),currency:order.currency,package_title:order.package_title},
    message:'Tu cuenta y su atribución están conservadas. Si ya pagaste, espera la confirmación antes de volver a pagar.'};
}
module.exports={recover};
