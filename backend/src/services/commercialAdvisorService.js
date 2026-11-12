const { z } = require("zod");
const { query } = require("../config/db");
const { badRequest } = require("../utils/http");
const { validate } = require("../utils/validators");
async function advisorById(id, client = { query }) {
  validate(z.string().uuid(), id);
  const result = await client.query(`select id,full_name,role,platform_role from app_users
    where id=$1 and is_active and (role in ('QORI_SELLER','QORI_SUPERADMIN') or platform_role in ('QORI_SUPERADMIN','QORI_SELLER')) for share`, [id]);
  if (!result.rowCount) throw badRequest("El asesor ya no está disponible. Solicita otro enlace o elige Llegué por mi cuenta.");
  await require('./qoriSellerService').requireApproved(result.rows[0],client);
  return { id: result.rows[0].id, name: result.rows[0].full_name };
}
async function assignPaidSignup(client, advisor, businessId) {
  await client.query("insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$2)", [businessId, advisor.id]);
}
async function assertNotSelfReferral(client, advisor, body) {
  if (!advisor) return;
  const document = require('./signupIdentityService').normalizeDocument(body.nit);
  const own = await client.query(`select 1 from app_users u
    left join qori_seller_applications a on a.user_id=u.id
    left join businesses b on b.id=u.business_id
    where u.id=$1 and (lower(u.email)=lower($2) or a.document_key=$3
      or regexp_replace(lower(coalesce(b.settings->>'nit','')), '[^a-z0-9]', '', 'g')=$3)`, [advisor.id, body.email, document]);
  if (own.rowCount) throw badRequest('No se permite atribuir a tu perfil Seller una cuenta propia.');
}
async function recordPaidSignup(client, advisor, businessId, orderId) {
  // Read the immutable recipient from the order, never from checkout response or browser metadata.
  const order = (await client.query('select commission_seller_id from qr_credit_purchase_orders where id=$1 and business_id=$2', [orderId, businessId])).rows[0];
  if (!order || order.commission_seller_id !== advisor.id) throw badRequest('No se pudo conservar la atribución del embajador. Vuelve a intentar el registro.');
  await client.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values(null,'PAID_SIGNUP_CREATED','business',$1,$2::jsonb)", [businessId, JSON.stringify({seller_id:advisor.id,order_id:orderId,source:'public_checkout_with_advisor',payment_status:'PENDING'})]);
}
module.exports = { advisorById, assignPaidSignup, assertNotSelfReferral, recordPaidSignup };
