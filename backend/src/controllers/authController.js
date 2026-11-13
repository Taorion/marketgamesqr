const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, unauthorized, forbidden } = require("../utils/http");
const { validate, loginSchema } = require("../utils/validators");
const { getBusinessSubscription } = require("../services/subscriptionService");
const { sendPasswordResetEmail } = require("../services/passwordResetMailService");

const { eligibility: resetEligibility } = require('../services/passwordResetEligibility');
const { passwordResetUrl, isSeller } = require('../services/passwordResetLinks');

const passwordSchema = z.string().min(8).max(120);

const requestPasswordResetSchema = z.object({
  email: z.string().trim().email().max(180),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(240),
  password: passwordSchema,
  password_confirm: passwordSchema,
}).refine((body) => body.password === body.password_confirm, {
  message: "La confirmacion de password no coincide.",
  path: ["password_confirm"],
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(120),
  password: passwordSchema,
  password_confirm: passwordSchema,
}).refine((body) => body.password === body.password_confirm, {
  message: "La confirmacion de password no coincide.",
  path: ["password_confirm"],
});

function publicUser(row = {}) {
  return {
    id: row.id,
    business_id: row.business_id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    platform_role: row.platform_role || null,
    admin_access: require('../services/adminAccessPolicy').canAccessAdmin(row),
    is_active: row.is_active,
    can_redeem_cross_business: row.can_redeem_cross_business,
    branch_id: row.branch_id || null,
    ...(row.demo_mode?{demo_mode:true,auth_user_id:row.auth_user_id}:{}),
  };
}

async function buildAuthUser(row = {}) {
  const user = publicUser(row);
  if (user.business_id) {
    if (["QORI_SUPERADMIN", "QORI_SELLER"].includes(user.platform_role)) {
      try { user.subscription = await getBusinessSubscription(user.business_id); } catch (error) { if (error.status !== 404) throw error; }
      return user;
    }
    user.subscription = await getBusinessSubscription(user.business_id);
  }
  return user;
}

function sessionInfoFromToken(token) {
  const decoded = jwt.decode(token) || {};
  return {
    token_type: "Bearer",
    session_version: decoded.session_version || null,
    issued_at: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
    expires_at: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
  };
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function login(req, res, next, demoMode = false, adminMode = false) {
  try {
    const body = validate(loginSchema, req.body);
    const result = await query(
      `select id, business_id, email, full_name, password_hash, password_version, role, platform_role, is_active, can_redeem_cross_business, branch_id, password_setup_required
       from app_users
       where lower(email) = lower($1)`,
      [body.email]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      throw unauthorized("Invalid credentials.");
    }

    const ok = await bcrypt.compare(body.password, user.password_hash);
    if (!ok) {
      throw unauthorized("Invalid credentials.");
    }
    if(user.password_setup_required)throw forbidden('Activa tu cuenta desde el enlace enviado por el administrador de Qori y crea tu contraseña.');
    require('../services/adminAccessPolicy').enforceAdministrativeIdentity(user);
    if(adminMode)require('../services/adminAccessPolicy').requireAdminAccess(user);
    if(user.business_id && !['QORI_SELLER','QORI_SUPERADMIN'].includes(user.platform_role) && !['QORI_SELLER','QORI_SUPERADMIN','ADMIN','ADMIN_MARKET_GAMES'].includes(user.role)
      && (await query('select 1 from businesses where id=$1 and archived_at is not null',[user.business_id])).rowCount){
      throw forbidden('Este negocio fue eliminado por el administrador de Qori.');
    }

    if(demoMode)return res.json(await require('../services/sellerDemoService').createSession(user));
    if(user.business_id && (await query('select 1 from businesses where id=$1 and is_seller_demo',[user.business_id])).rowCount){
      throw unauthorized('Entra a Demo Qori con tu cuenta aprobada de Qori Seller.');
    }

    if (!["ADMIN", "ADMIN_MARKET_GAMES", "QORI_SUPERADMIN", "QORI_SELLER"].includes(user.role) && !user.business_id) {
      throw badRequest("User does not have a business assigned.");
    }

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        business_id: user.business_id,
        session_version: env.appSessionVersion,
        password_version: Number(user.password_version || 0),
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    res.json({
      token,
      session: sessionInfoFromToken(token),
      user: await buildAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    res.json({ user: await buildAuthUser(req.user) });
  } catch (error) {
    next(error);
  }
}

async function requestPasswordReset(req, res, next) {
  try {
    const body = validate(requestPasswordResetSchema, req.body);
    const genericResponse = {
      ok: true,
      message: "Si la cuenta permite recuperación, enviaremos instrucciones a tu correo para restablecer la contraseña.",
    };

    const userResult = await query(
      `select id, email, is_active, role, platform_role
       from app_users
       where lower(email) = lower($1)
       limit 1`,
      [body.email]
    );
    const user = userResult.rows[0];
    if (!user || !(await resetEligibility({query}, user.id))) {
      return res.json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const issued = await withTransaction(async (client) => {
      await client.query("select id from app_users where id=$1 for update", [user.id]);
      if (!(await resetEligibility(client, user.id))) return false;
      await client.query(
        `update password_reset_tokens
         set used_at = coalesce(used_at, now())
         where user_id = $1 and used_at is null`,
        [user.id]
      );
      await client.query(
        `insert into password_reset_tokens (user_id, token_hash, expires_at, metadata)
         values ($1, $2, now() + interval '30 minutes', $3::jsonb)`,
        [
          user.id,
          hashResetToken(rawToken),
          JSON.stringify({
            requested_ip: req.ip || null,
            user_agent: req.headers["user-agent"] || null,
          }),
        ]
      );
      return true;
    });
    if (!issued) return res.json(genericResponse);

    try {
      await sendPasswordResetEmail({ to: user.email, resetUrl: passwordResetUrl(rawToken, user) });
    } catch (error) {
      await query(
        "update password_reset_tokens set used_at = now() where user_id = $1 and token_hash = $2 and used_at is null",
        [user.id, hashResetToken(rawToken)]
      );
      throw error;
    }

    const response = { ...genericResponse };
    if (!env.isProduction) {
      response.reset_token = rawToken;
      response.reset_url = passwordResetUrl(rawToken, user);
    }
    return res.json(response);
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const body = validate(resetPasswordSchema, req.body);
    const tokenHash = hashResetToken(body.token);
    const candidate = (await query('select user_id from password_reset_tokens where token_hash=$1 and used_at is null and expires_at>now()', [tokenHash])).rows[0];
    if (!candidate) throw badRequest('Enlace de recuperación inválido o vencido.');
    const passwordHash = await bcrypt.hash(body.password, 12);
    const result = await withTransaction(async client => {
      // Serialize issuance and consumption per user, then recheck the token.
      const user = (await client.query('select id,role,platform_role from app_users where id=$1 for update', [candidate.user_id])).rows[0];
      const token = (await client.query('select id,metadata from password_reset_tokens where token_hash=$1 and user_id=$2 and used_at is null and expires_at>now() for update', [tokenHash, candidate.user_id])).rows[0];
      const allowed = await resetEligibility(client, candidate.user_id);
      if (!user || !token || !allowed || (token.metadata?.source === 'SELLER_ADMIN_RECOVERY' && !isSeller(user))) throw badRequest('Enlace de recuperación inválido o vencido.');
      if (isSeller(user) && (body.password.length < 12 || Buffer.byteLength(body.password, 'utf8') > 72)) throw badRequest('Usa al menos 12 caracteres y como máximo 72 bytes para tu contraseña.');
      await client.query('update app_users set password_hash=$2,updated_at=now() where id=$1', [candidate.user_id, passwordHash]);
      await client.query('update password_reset_tokens set used_at=now() where user_id=$1 and used_at is null', [candidate.user_id]);
      return { ...allowed, seller: isSeller(user) };
    });
    res.set('Cache-Control', 'no-store').json({ok:true,
      next_url:result.pending ? '/paquetes/#retomar' : result.seller ? '/seller/' : '/empresa/',
      message:result.pending ? 'Contraseña actualizada. Retoma tu inscripción con el mismo correo para continuar el pago pendiente.' : 'Contraseña actualizada. Ya puedes iniciar sesión.'});

  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const body = validate(changePasswordSchema, req.body);
    const userResult = await query(
      `select id, password_hash
       from app_users
       where id = $1 and is_active = true`,
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user) {
      throw unauthorized("Usuario inactivo o inexistente.");
    }
    const ok = await bcrypt.compare(body.current_password, user.password_hash);
    if (!ok) {
      throw unauthorized("Password actual invalido.");
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    await query(
      `update app_users
       set password_hash = $2,
           updated_at = now()
       where id = $1`,
      [req.user.id, passwordHash]
    );
    res.json({ ok: true, message: "Contraseña actualizada. Inicia sesión de nuevo; las sesiones anteriores fueron cerradas." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  me,
  requestPasswordReset,
  resetPassword,
  changePassword,
};
