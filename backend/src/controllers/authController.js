const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, unauthorized } = require("../utils/http");
const { validate, loginSchema } = require("../utils/validators");
const { getBusinessSubscription } = require("../services/subscriptionService");

const passwordSchema = z.string().min(8).max(120);

const requestPasswordResetSchema = z.object({
  email: z.string().email().max(180),
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

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function passwordResetUrl(token) {
  return `${env.publicAppUrl.replace(/\/$/, "")}/empresa/?reset_token=${encodeURIComponent(token)}`;
}

async function login(req, res, next) {
  try {
    const body = validate(loginSchema, req.body);
    const result = await query(
      `select id, business_id, email, full_name, password_hash, role, is_active, can_redeem_cross_business
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

    if (!["ADMIN", "ADMIN_MARKET_GAMES"].includes(user.role) && !user.business_id) {
      throw badRequest("User does not have a business assigned.");
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role, business_id: user.business_id },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    delete user.password_hash;
    if (user.business_id) {
      user.subscription = await getBusinessSubscription(user.business_id);
    }
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
}

async function requestPasswordReset(req, res, next) {
  try {
    const body = validate(requestPasswordResetSchema, req.body);
    const genericResponse = {
      ok: true,
      message: "Si el correo existe y esta activo, enviaremos instrucciones para restablecer la contrasena.",
    };

    const userResult = await query(
      `select id, email, is_active
       from app_users
       where lower(email) = lower($1)
       limit 1`,
      [body.email]
    );
    const user = userResult.rows[0];
    if (!user || !user.is_active) {
      return res.json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("base64url");
    await query(
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

    const response = { ...genericResponse };
    if (!env.isProduction) {
      response.reset_token = rawToken;
      response.reset_url = passwordResetUrl(rawToken);
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
    const tokenResult = await query(
      `select t.id, t.user_id, u.email, u.is_active
       from password_reset_tokens t
       join app_users u on u.id = t.user_id
       where t.token_hash = $1
         and t.used_at is null
         and t.expires_at > now()
       limit 1`,
      [tokenHash]
    );
    const resetToken = tokenResult.rows[0];
    if (!resetToken || !resetToken.is_active) {
      throw badRequest("Token de recuperacion invalido o vencido.");
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    await withTransaction(async (client) => {
      await client.query(
        `update app_users
         set password_hash = $2,
             updated_at = now()
         where id = $1`,
        [resetToken.user_id, passwordHash]
      );
      await client.query(
        `update password_reset_tokens
         set used_at = now()
         where id = $1`,
        [resetToken.id]
      );
      await client.query(
        `update password_reset_tokens
         set used_at = coalesce(used_at, now())
         where user_id = $1 and id <> $2 and used_at is null`,
        [resetToken.user_id, resetToken.id]
      );
    });

    res.json({ ok: true, message: "Password actualizado. Ya puedes iniciar sesion." });
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
    res.json({ ok: true, message: "Password actualizado correctamente." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  requestPasswordReset,
  resetPassword,
  changePassword,
};
