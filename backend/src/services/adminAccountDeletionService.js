const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { query, withTransaction } = require('../config/db');
const { env } = require('../config/env');
const { validate } = require('../utils/validators');
const { badRequest, forbidden, notFound } = require('../utils/http');
const { requireSuperadmin } = require('./commercialAuthorization');
const { requireAdminAccess, isAdminEmail, hasAdministrativeRole } = require('./adminAccessPolicy');

function authorize(user, kind, id) {
  requireAdminAccess(user);
  requireSuperadmin(user);
  validate(z.enum(['sellers', 'businesses']), kind);
  validate(z.string().uuid(), id);
}

async function target(db, kind, id, lock = false) {
  const seller = kind === 'sellers';
  const row = (await db.query(seller
    ? `select *, updated_at::text revision from app_users where id=$1${lock ? ' for update' : ''}`
    : `select *, updated_at::text revision from businesses where id=$1${lock ? ' for update' : ''}`, [id])).rows[0];
  if (!row) throw notFound('Cuenta no encontrada.');
  if (seller) {
    if (isAdminEmail(row.email) || hasAdministrativeRole(row)) throw forbidden('Las cuentas administradoras están protegidas.');
    const profile = (await db.query('select archived_at from qori_sales_profiles where user_id=$1', [id])).rows[0];
    if (profile?.archived_at || (row.role !== 'QORI_SELLER' && row.platform_role !== 'QORI_SELLER')) throw badRequest('El embajador ya fue eliminado o no tiene acceso Seller. Actualiza la lista.');
  } else {
    if (row.archived_at) throw badRequest('El negocio ya fue eliminado. Actualiza la lista.');
    // Do not strand a live external recurring charge or an administrator's company.
    if (row.subscription_auto_renew_enabled || (row.mercado_pago_preapproval_id && !['cancelled', 'canceled', 'paused'].includes(String(row.subscription_auto_renew_status).toLowerCase()))) throw badRequest('Cancela primero la renovación automática de este negocio antes de eliminarlo.');
    const users = (await db.query('select email,role,platform_role from app_users where business_id=$1', [id])).rows;
    if (users.some(u => isAdminEmail(u.email) || hasAdministrativeRole(u))) throw forbidden('Este negocio contiene una cuenta administradora protegida. Reasigna esa cuenta antes de eliminarlo.');
  }
  return row;
}

async function preview(user, kind, id) {
  authorize(user, kind, id);
  const row = await target({ query }, kind, id);
  return {
    name: kind === 'sellers' ? row.full_name : row.name,
    confirmation: kind === 'sellers' ? row.email : row.name,
    token: jwt.sign({ purpose: 'admin-account-deletion', actor: user.id, kind, id, revision: row.revision }, env.jwtSecret, { expiresIn: '10m' }),
  };
}

async function remove(user, kind, id, payload) {
  authorize(user, kind, id);
  const body = validate(z.object({ token: z.string().max(3000), confirmation: z.string().trim().min(1).max(180), confirmed: z.literal(true), reason: z.string().trim().min(10).max(1000) }).strict(), payload);
  let signed;
  try { signed = jwt.verify(body.token, env.jwtSecret, { algorithms: ['HS256'] }); } catch { throw badRequest('La confirmación venció. Abre de nuevo el reconfirmador.'); }
  if (signed.purpose !== 'admin-account-deletion' || signed.actor !== user.id || signed.kind !== kind || signed.id !== id) throw badRequest('La confirmación no corresponde a esta cuenta.');
  return withTransaction(async db => {
    const row = await target(db, kind, id, true);
    if (row.revision !== signed.revision) throw badRequest('La cuenta cambió. Actualiza la ficha y confirma de nuevo.');
    const expected = kind === 'sellers' ? row.email : row.name;
    if (body.confirmation !== expected) throw badRequest('Escribe exactamente el dato solicitado para confirmar.');
    if (kind === 'sellers') {
      const shared = row.role !== 'QORI_SELLER';
      await db.query(`update app_users set is_active=case when $2 then is_active else false end,
        platform_role=case when platform_role='QORI_SELLER' then null else platform_role end,
        password_version=coalesce(password_version,0)+1,updated_at=now() where id=$1`, [id, shared]);
      await db.query(`insert into qori_sales_profiles(user_id,created_by,archived_at) values($1,$2,now())
        on conflict(user_id) do update set archived_at=now()`, [id, user.id]);
      await db.query('update password_reset_tokens set used_at=now() where user_id=$1 and used_at is null', [id]);
      await db.query('update qori_seller_activations set expires_at=now() where user_id=$1 and completed_at is null', [id]);
    } else {
      await db.query('update businesses set archived_at=now(),is_active=false,updated_at=now() where id=$1', [id]);
      // Preserve separate ambassador access; business access is denied by its inactive tenant.
      await db.query('update app_users set password_version=coalesce(password_version,0)+1,updated_at=now() where business_id=$1', [id]);
      await db.query('update password_reset_tokens set used_at=now() where user_id in (select id from app_users where business_id=$1) and used_at is null', [id]);
    }
    await db.query(`insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail)
      values($1,'ACCOUNT_ADMIN_DELETED',$2,$3,$4::jsonb)`, [user.id, kind === 'sellers' ? 'seller' : 'business', id, JSON.stringify({ reason: body.reason, name: kind === 'sellers' ? row.full_name : row.name, history_preserved: true, access_revoked: true })]);
    return { ok: true, history_preserved: true };
  });
}

module.exports = { preview, remove };
