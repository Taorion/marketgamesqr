const crypto = require('node:crypto');
const { z } = require('zod');
const { withTransaction } = require('../config/db');
const { validate } = require('../utils/validators');
const { badRequest, notFound } = require('../utils/http');
const { requireSuperadmin } = require('./commercialAuthorization');
const { requireAdminAccess } = require('./adminAccessPolicy');
const { passwordResetUrl, isSeller } = require('./passwordResetLinks');

async function issue(actor, id, payload) {
  requireAdminAccess(actor);
  requireSuperadmin(actor);
  validate(z.string().uuid(), id);
  const { reason } = validate(z.object({ reason: z.string().trim().min(10).max(1000) }), payload);
  return withTransaction(async db => {
    // Same lock order as public issuance and consumption: account, then tokens.
    const user = (await db.query('select * from app_users where id=$1 for update', [id])).rows[0];
    if (!user || !isSeller(user)) throw notFound('No se encontró la cuenta de embajador.');
    if (!user.is_active || user.deactivated_at) throw badRequest('La cuenta está suspendida o eliminada.');
    if (user.password_setup_required) throw badRequest('Esta cuenta necesita su enlace de activación inicial. Usa Generar enlace de activación.');
    const raw = crypto.randomBytes(32).toString('base64url');
    await db.query('update password_reset_tokens set used_at=now() where user_id=$1 and used_at is null', [id]);
    const token = (await db.query(`insert into password_reset_tokens(user_id,token_hash,expires_at,metadata)
      values($1,$2,now()+interval '30 minutes',$3::jsonb) returning expires_at`,
    [id, crypto.createHash('sha256').update(raw).digest('hex'), JSON.stringify({ source: 'SELLER_ADMIN_RECOVERY', created_by: actor.id })])).rows[0];
    await db.query(`insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail)
      values($1,'SELLER_PASSWORD_RECOVERY_ISSUED','seller',$2,$3::jsonb)`,
    [actor.id, id, JSON.stringify({ reason, expires_at: token.expires_at })]);
    return { recovery: { url: passwordResetUrl(raw, user), expires_at: token.expires_at } };
  });
}
module.exports = { issue };
