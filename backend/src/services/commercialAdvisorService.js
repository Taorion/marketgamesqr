const { z } = require("zod");
const { query } = require("../config/db");
const { badRequest } = require("../utils/http");
const { validate } = require("../utils/validators");
async function advisorById(id, client = { query }) {
  validate(z.string().uuid(), id);
  const result = await client.query(`select id,full_name from app_users
    where id=$1 and is_active and (role in ('QORI_SELLER','QORI_SUPERADMIN') or platform_role='QORI_SUPERADMIN') for share`, [id]);
  if (!result.rowCount) throw badRequest("El asesor ya no está disponible. Solicita otro enlace o elige Llegué por mi cuenta.");
  return { id: result.rows[0].id, name: result.rows[0].full_name };
}
async function assignPaidSignup(client, advisor, businessId, orderId) {
  await client.query("insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$2)", [businessId, advisor.id]);
  await client.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values(null,'PAID_SIGNUP_CREATED','business',$1,$2::jsonb)", [businessId,JSON.stringify({seller_id:advisor.id,order_id:orderId,source:"public_checkout_with_advisor"})]);
}
module.exports = { advisorById, assignPaidSignup };
