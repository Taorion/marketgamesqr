const crypto = require("node:crypto");
const webPush = require("web-push");
const { pool } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, forbidden } = require("../utils/http");

const OFFSETS = [1440, 30, 10];
const GRACE_SECONDS = 300;

function pushConfigured() {
  return Boolean(env.agendaPushPublicKey && env.agendaPushPrivateKey && env.agendaPushSubject);
}

function validateSubscription(value) {
  let url;
  try { url = new URL(value?.endpoint); } catch { throw badRequest("Dispositivo de notificaciones inválido."); }
  const host = url.hostname;
  const allowed = host === "fcm.googleapis.com"
    || host === "updates.push.services.mozilla.com"
    || host.endsWith(".push.services.mozilla.com")
    || host === "web.push.apple.com" || host.endsWith(".push.apple.com")
    || host.endsWith(".notify.windows.com");
  if (!allowed || url.protocol !== "https:" || url.port || url.username || url.password
      || url.hash || value.endpoint.length > 2048) {
    throw badRequest("El servicio de notificaciones de este navegador no es compatible.");
  }
  const keys = value.keys || {};
  if (!/^[A-Za-z0-9_-]{87}$/.test(keys.p256dh || "")
      || !/^[A-Za-z0-9_-]{22}$/.test(keys.auth || "")
      || Buffer.from(keys.p256dh, "base64url")[0] !== 4) {
    throw badRequest("Las claves del dispositivo no son válidas.");
  }
  return { endpoint: value.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

function requireBusiness(user) {
  if (!user?.business_id) throw forbidden("Este usuario no tiene un negocio asignado.");
}

async function subscribe(user, body, db = pool) {
  requireBusiness(user);
  if (!pushConfigured()) throw badRequest("Las notificaciones aún no están habilitadas en el servidor.");
  const sub = validateSubscription(body.subscription);
  const result = await db.query(
    `insert into agenda_push_subscriptions
       (business_id, user_id, endpoint, p256dh, auth, password_version, device_name)
     values ($1,$2,$3,$4,$5,$6,$7)
     on conflict (endpoint) do update set
       p256dh = excluded.p256dh, auth = excluded.auth, active = true,
       password_version = excluded.password_version, device_name = excluded.device_name,
       enabled_at = case when agenda_push_subscriptions.active
         and agenda_push_subscriptions.password_version = excluded.password_version
         then agenda_push_subscriptions.enabled_at else now() end,
       updated_at = now()
     where agenda_push_subscriptions.business_id = excluded.business_id
       and agenda_push_subscriptions.user_id = excluded.user_id
     returning id`,
    [user.business_id, user.id, sub.endpoint, sub.keys.p256dh, sub.keys.auth,
      Number(user.password_version || 0), String(body.device_name || "Dispositivo").slice(0, 100)]
  );
  if (!result.rowCount) {
    const error = badRequest("Este dispositivo pertenece a otra cuenta. Desactiva sus notificaciones y vuelve a activarlas.");
    error.status = 409;
    throw error;
  }
  return { id: result.rows[0].id, active: true };
}

async function unsubscribe(user, endpoint, db = pool) {
  requireBusiness(user);
  await db.query(
    `update agenda_push_subscriptions set active = false, updated_at = now()
     where business_id = $1 and user_id = $2 and endpoint = $3`,
    [user.business_id, user.id, String(endpoint || "")]
  );
}

function notificationPayload(row) {
  const label = row.offset_minutes === 1440 ? "Mañana" : `En ${row.offset_minutes} minutos`;
  return {
    title: `Qori · ${label}`,
    body: String(row.next_action || row.note || "Tienes una actividad en tu agenda").slice(0, 180),
    tag: `agenda-${row.id}`,
    user_id: row.user_id,
    business_id: row.business_id,
    expires_at: new Date(row.expires_at).toISOString(),
    url: `/empresa/?view=leads&agenda_date=${encodeURIComponent(new Date(row.reminder_at).toISOString())}&agenda_item=${row.note_id}`,
  };
}

async function send(subscription, payload, ttl = GRACE_SECONDS) {
  // Validate again: do not turn stored endpoints into an arbitrary HTTP client.
  const safeSubscription = validateSubscription(subscription);
  return webPush.sendNotification(safeSubscription, JSON.stringify(payload), {
    vapidDetails: {
      subject: env.agendaPushSubject,
      publicKey: env.agendaPushPublicKey,
      privateKey: env.agendaPushPrivateKey,
    },
    TTL: Math.max(0, Math.min(GRACE_SECONDS, Math.floor(ttl))),
    urgency: "high",
    timeout: 10000,
  });
}

async function sendTest(user, endpoint, db = pool, deliver = send) {
  requireBusiness(user);
  if (!pushConfigured()) throw badRequest("Las notificaciones aún no están habilitadas en el servidor.");
  const { rows } = await db.query(
    `select id, endpoint, p256dh, auth from agenda_push_subscriptions
     where user_id = $1 and business_id = $2 and endpoint = $3 and active
       and password_version = $4`,
    [user.id, user.business_id, String(endpoint || ""), Number(user.password_version || 0)]
  );
  if (!rows[0]) throw badRequest("Activa primero las notificaciones en este dispositivo.");
  try {
    await deliver({ endpoint: rows[0].endpoint, keys: { p256dh: rows[0].p256dh, auth: rows[0].auth } }, {
      title: "Qori · Notificaciones activadas",
      body: "Recibirás avisos de tu agenda 24 horas, 30 minutos y 10 minutos antes.",
      tag: "qori-agenda-test", user_id: user.id, business_id: user.business_id,
      expires_at: new Date(Date.now() + 60000).toISOString(), url: "/empresa/?view=leads&agenda=1",
    }, 60);
  } catch (error) {
    if ([404, 410].includes(error.statusCode)) await unsubscribe(user, endpoint, db);
    throw badRequest("No se pudo enviar la prueba. Desactiva y vuelve a activar este dispositivo.");
  }
}

// Derive schedules from canonical agenda rows, including writers outside the agenda UI.
// The short catch-up window avoids a burst of obsolete reminders after an outage.
async function enqueueDue(db = pool) {
  return db.query(
    `insert into agenda_push_deliveries
       (note_id, subscription_id, business_id, user_id, reminder_at, offset_minutes, due_at, expires_at)
     select n.id, s.id, n.business_id, s.user_id, n.reminder_at, offsets.minutes,
       n.reminder_at - offsets.minutes * interval '1 minute',
       least(n.reminder_at, n.reminder_at - offsets.minutes * interval '1 minute' + interval '5 minutes')
     from unnest($1::integer[]) as offsets(minutes)
     join lead_notes n on n.reminder_at > now() + offsets.minutes * interval '1 minute' - interval '5 minutes'
       and n.reminder_at <= now() + offsets.minutes * interval '1 minute'
       and n.agenda_status = 'OPEN'
     join agenda_push_subscriptions s on s.business_id = n.business_id and s.user_id = n.created_by and s.active
     join app_users u on u.id = s.user_id and u.business_id = s.business_id and u.is_active
       and u.role in ('BUSINESS_OWNER','BUSINESS_MANAGER','ADMIN','ADMIN_MARKET_GAMES','ADMIN_Qori')
       and coalesce(u.password_version, 0) = s.password_version
     join businesses b on b.id = n.business_id and b.is_active
     where n.reminder_at > now()
       and n.created_at <= n.reminder_at - offsets.minutes * interval '1 minute'
       and s.enabled_at <= n.reminder_at - offsets.minutes * interval '1 minute'
     on conflict (note_id, subscription_id, reminder_at, offset_minutes) do nothing`, [OFFSETS]
  );
}

async function processNext(db = pool, deliver = send) {
  const lease = crypto.randomUUID();
  const claimed = await db.query(
    `update agenda_push_deliveries set status = 'SENDING', lease_token = $1,
       lease_until = now() + interval '2 minutes', attempts = attempts + 1
     where id = (
       select id from agenda_push_deliveries
       where expires_at > now() and attempts < 4 and (
         (status = 'PENDING' and next_attempt_at <= now()) or
         (status = 'SENDING' and lease_until < now()))
       order by due_at, id limit 1 for update skip locked
     ) returning id`, [lease]
  );
  if (!claimed.rowCount) return false;
  const id = claimed.rows[0].id;
  const current = await db.query(
    `select d.*, n.next_action, n.note, s.endpoint, s.p256dh, s.auth
     from agenda_push_deliveries d
     join lead_notes n on n.id = d.note_id and n.business_id = d.business_id
       and n.created_by = d.user_id and n.agenda_status = 'OPEN' and n.reminder_at = d.reminder_at
     join agenda_push_subscriptions s on s.id = d.subscription_id
       and s.user_id = d.user_id and s.business_id = d.business_id and s.active and s.enabled_at <= d.due_at
     join app_users u on u.id = s.user_id and u.business_id = s.business_id
       and u.role in ('BUSINESS_OWNER','BUSINESS_MANAGER','ADMIN','ADMIN_MARKET_GAMES','ADMIN_Qori')
       and u.is_active and coalesce(u.password_version, 0) = s.password_version
     join businesses b on b.id = d.business_id and b.is_active
     where d.id = $1 and d.lease_token = $2 and d.expires_at > now() and n.reminder_at > now()`, [id, lease]
  );
  if (!current.rowCount) {
    await db.query("update agenda_push_deliveries set status = 'CANCELLED' where id = $1 and lease_token = $2", [id, lease]);
    return true;
  }
  const row = current.rows[0];
  try {
    await deliver({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      notificationPayload(row), (new Date(row.expires_at).getTime() - Date.now()) / 1000);
    await db.query(
      "update agenda_push_deliveries set status = 'SENT', sent_at = now(), last_error = null where id = $1 and lease_token = $2",
      [id, lease]
    );
  } catch (error) {
    const expired = [404, 410].includes(error.statusCode);
    if (expired) {
      await db.query("update agenda_push_subscriptions set active = false, updated_at = now() where id = $1", [row.subscription_id]);
    }
    const retry = !expired && (!error.statusCode || error.statusCode === 429 || error.statusCode >= 500) && row.attempts < 4;
    // Never log endpoints, subscription keys or provider response bodies.
    await db.query(
      `update agenda_push_deliveries set status = $3, last_error = $4,
         next_attempt_at = now() + interval '45 seconds', lease_until = null
       where id = $1 and lease_token = $2`,
      [id, lease, retry ? "PENDING" : "FAILED", String(error.statusCode || "NETWORK")]
    );
  }
  return true;
}

async function runAgendaPushTick(db = pool, deliver = send) {
  await enqueueDue(db);
  await db.query(
    `update agenda_push_deliveries set status = 'CANCELLED'
     where status in ('PENDING','SENDING') and (expires_at <= now() or (attempts >= 4 and lease_until < now()))`
  );
  for (let count = 0; count < 50 && await processNext(db, deliver); count += 1) { /* bounded batch */ }
}

function startAgendaPushWorker() {
  if (!env.databaseConfigured || !pushConfigured() || !env.agendaPushWorkerEnabled) return async () => {};
  let running = null;
  const tick = () => {
    if (running) return;
    running = runAgendaPushTick().catch((error) => {
      console.error("Agenda push worker failed", error.code || error.name);
    }).finally(() => { running = null; });
  };
  tick();
  const timer = setInterval(tick, 30000);
  timer.unref?.();
  return async () => { clearInterval(timer); if (running) await running; };
}

module.exports = { OFFSETS, pushConfigured, validateSubscription, subscribe, unsubscribe,
  notificationPayload, sendTest, enqueueDue, processNext, runAgendaPushTick, startAgendaPushWorker };
