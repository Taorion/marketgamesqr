const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID, createECDH } = require("node:crypto");
const { Pool } = require("pg");
const { env } = require("../backend/src/config/env");
const push = require("../backend/src/services/agendaPushService");

const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
const keys = { p256dh: ecdh.getPublicKey().toString("base64url"), auth: Buffer.alloc(16, 9).toString("base64url") };
const subscription = (suffix = randomUUID()) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${suffix}`, keys });

test("accepts real browser push key sizes and known providers", () => {
  for (const host of ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "wns2-par02p.notify.windows.com"]) {
    assert.equal(push.validateSubscription({ endpoint: `https://${host}/token`, keys }).endpoint, `https://${host}/token`);
  }
});
test("rejects arbitrary destinations, credentials, ports and malformed keys", () => {
  for (const endpoint of ["http://fcm.googleapis.com/x", "https://localhost/x", "https://127.0.0.1/x", "https://fcm.googleapis.com.attacker.test/x", "https://u:p@fcm.googleapis.com/x", "https://web.push.apple.com:444/x"]) {
    assert.throws(() => push.validateSubscription({ endpoint, keys }), { status: 400 });
  }
  assert.throws(() => push.validateSubscription({ ...subscription(), keys: { ...keys, auth: "bad" } }));
});
test("payloads carry correct offset, identity, date and stable tag", () => {
  for (const minutes of [1440, 30, 10]) {
    const data = push.notificationPayload({ id: "job", user_id: "u", business_id: "b", note_id: "n", offset_minutes: minutes,
      reminder_at: "2026-10-01T14:00:00Z", expires_at: "2026-10-01T13:55:00Z", next_action: "Reunión" });
    assert.match(data.title, minutes === 1440 ? /Mañana/ : new RegExp(`${minutes} minutos`));
    assert.equal(data.tag, "agenda-job");
    assert.equal(new URL(data.url, "https://gosqori.com").searchParams.get("agenda_date"), "2026-10-01T14:00:00.000Z");
  }
});

const testUrl = process.env.AGENDA_PUSH_TEST_DATABASE_URL;
test("PostgreSQL scheduling, ownership, retries and security", { skip: !testUrl }, async (t) => {
  const url = new URL(testUrl);
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname), "Only a disposable local database is allowed");
  const admin = new Pool({ connectionString: testUrl });
  const schema = `agenda_test_${randomUUID().replace(/-/g, "")}`;
  await admin.query(`create schema ${schema}`);
  const db = new Pool({ connectionString: testUrl, options: `-c search_path=${schema}` });
  const previous = { publicKey: env.agendaPushPublicKey, privateKey: env.agendaPushPrivateKey };
  env.agendaPushPublicKey = "test-public";
  env.agendaPushPrivateKey = "test-private";
  try {
    await db.query(`
      create table businesses (id uuid primary key, is_active boolean default true);
      create type user_role as enum ('ADMIN', 'BUSINESS_OWNER', 'VALIDATOR', 'ADMIN_MARKET_GAMES', 'BUSINESS_MANAGER', 'BUSINESS_SELLER');
      create table app_users (id uuid primary key, business_id uuid references businesses, is_active boolean default true,
        password_version integer default 0, role user_role default 'BUSINESS_OWNER');
      create table lead_notes (id uuid primary key, business_id uuid references businesses, created_by uuid references app_users,
        note text, next_action text, reminder_at timestamptz, agenda_status text default 'OPEN', created_at timestamptz default now());
    `);
    const migration = fs.readFileSync(path.join(__dirname, "../database/migrations/20260929143446_agenda_push_notifications.sql"), "utf8");
    await db.query(migration);
    await db.query(migration); // migration is safe to rerun

    async function fixture({ devices = 1, minutes = 10, status = "OPEN", recent = false } = {}) {
      const business = randomUUID(); const user = { id: randomUUID(), business_id: business, password_version: 0 };
      const note = randomUUID();
      await db.query("insert into businesses(id) values($1)", [business]);
      await db.query("insert into app_users(id,business_id) values($1,$2)", [user.id, business]);
      const subs = [];
      for (let i = 0; i < devices; i++) {
        const body = { subscription: subscription(), device_name: `test-${i}` };
        const saved = await push.subscribe(user, body, db);
        if (!recent) await db.query("update agenda_push_subscriptions set enabled_at = now() - interval '2 days' where id=$1", [saved.id]);
        subs.push({ ...saved, ...body.subscription });
      }
      await db.query(`insert into lead_notes(id,business_id,created_by,note,next_action,reminder_at,agenda_status,created_at)
        values($1,$2,$3,'Detalle','Reunión',now() + $4 * interval '1 minute' - interval '30 seconds',$5,now() - interval '2 days')`,
      [note, business, user.id, minutes, status]);
      return { business, user, note, subs };
    }
    const deliveries = async (note) => (await db.query("select * from agenda_push_deliveries where note_id=$1", [note])).rows;
    const sent = [];
    const deliver = async (sub, payload) => { sent.push({ sub, payload }); };
    // Each subtest isolates pending jobs; test data lives only in the disposable schema.
    async function clearJobs() { await db.query("update agenda_push_deliveries set status='CANCELLED' where status in ('PENDING','SENDING')"); }

    await t.test("all three times reach each device once, even with concurrent workers", async () => {
      for (const minutes of [1440, 30, 10]) {
        const f = await fixture({ devices: 2, minutes });
        await Promise.all([push.enqueueDue(db), push.enqueueDue(db)]);
        assert.equal((await deliveries(f.note)).length, 2);
        await Promise.all(Array.from({ length: 4 }, () => push.processNext(db, deliver)));
        assert.ok((await deliveries(f.note)).every((row) => row.status === "SENT"));
        assert.equal(sent.filter((item) => item.payload.user_id === f.user.id).length, 2);
        await push.enqueueDue(db);
        assert.equal((await deliveries(f.note)).length, 2);
      }
    });
    await t.test("does not notify other users or another tenant; cannot revoke another account", async () => {
      const f = await fixture(); const other = await fixture();
      await push.unsubscribe(other.user, f.subs[0].endpoint, db);
      assert.equal((await db.query("select active from agenda_push_subscriptions where id=$1", [f.subs[0].id])).rows[0].active, true);
      await assert.rejects(push.subscribe(other.user, { subscription: f.subs[0] }, db), { status: 409 });
      await db.query("update lead_notes set created_by=$2 where id=$1", [f.note, other.user.id]);
      await push.enqueueDue(db);
      assert.equal((await deliveries(f.note)).length, 0);
      await clearJobs();
    });
    await t.test("done, cancelled, recently enabled and late-created reminders are omitted", async () => {
      for (const options of [{ status: "DONE" }, { status: "CANCELLED" }, { recent: true }]) {
        const f = await fixture(options); await push.enqueueDue(db);
        assert.equal((await deliveries(f.note)).length, 0);
      }
      const f = await fixture();
      await db.query("update lead_notes set created_at=now() where id=$1", [f.note]);
      await push.enqueueDue(db); assert.equal((await deliveries(f.note)).length, 0);
      await clearJobs();
    });
    await t.test("rechecks cancellation, rescheduling, disabling, password and account changes before sending", async () => {
      for (const change of ["cancel", "reschedule", "unsubscribe", "password", "inactive", "business-inactive", "role"]) {
        const f = await fixture(); await push.enqueueDue(db);
        if (change === "cancel") await db.query("update lead_notes set agenda_status='CANCELLED' where id=$1", [f.note]);
        if (change === "reschedule") await db.query("update lead_notes set reminder_at=reminder_at+interval '1 hour' where id=$1", [f.note]);
        if (change === "unsubscribe") await push.unsubscribe(f.user, f.subs[0].endpoint, db);
        if (change === "password") await db.query("update app_users set password_version=1 where id=$1", [f.user.id]);
        if (change === "inactive") await db.query("update app_users set is_active=false where id=$1", [f.user.id]);
        if (change === "role") await db.query("update app_users set role='VALIDATOR' where id=$1", [f.user.id]);
        if (change === "business-inactive") await db.query("update businesses set is_active=false where id=$1", [f.business]);
        while (await push.processNext(db, deliver)) { /* drain */ }
        assert.equal(sent.filter((item) => item.payload.user_id === f.user.id).length, 0, change);
        assert.equal((await deliveries(f.note))[0].status, "CANCELLED", change);
      }
    });
    await t.test("new schedule has new deliveries and old schedule stays cancelled", async () => {
      const f = await fixture(); await push.enqueueDue(db);
      await db.query("update lead_notes set reminder_at=now()+interval '29 minutes 30 seconds' where id=$1", [f.note]);
      await push.enqueueDue(db);
      while (await push.processNext(db, deliver)) { /* drain */ }
      const jobs = await deliveries(f.note);
      assert.equal(jobs.find((job) => job.offset_minutes === 10).status, "CANCELLED");
      assert.equal(jobs.find((job) => job.offset_minutes === 30).status, "SENT");
    });
    await t.test("temporary errors retry; expired endpoints deactivate only the affected device", async () => {
      const f = await fixture(); await push.enqueueDue(db);
      await push.processNext(db, async () => { throw { statusCode: 503 }; });
      assert.equal((await deliveries(f.note))[0].status, "PENDING");
      await db.query("update agenda_push_deliveries set next_attempt_at=now() where note_id=$1", [f.note]);
      await push.processNext(db, deliver);
      assert.equal((await deliveries(f.note))[0].status, "SENT");
      const expired = await fixture(); await push.enqueueDue(db);
      await push.processNext(db, async () => { throw { statusCode: 410 }; });
      assert.equal((await deliveries(expired.note))[0].status, "FAILED");
      assert.equal((await db.query("select active from agenda_push_subscriptions where id=$1", [expired.subs[0].id])).rows[0].active, false);
      assert.equal((await db.query("select active from agenda_push_subscriptions where id=$1", [f.subs[0].id])).rows[0].active, true);
    });
    await t.test("recovers interrupted leases and skips expired deliveries", async () => {
      const f = await fixture(); await push.enqueueDue(db);
      await db.query("update agenda_push_deliveries set status='SENDING', lease_until=now()-interval '1 minute' where note_id=$1", [f.note]);
      await push.processNext(db, deliver); assert.equal((await deliveries(f.note))[0].status, "SENT");
      const expired = await fixture(); await push.enqueueDue(db);
      await db.query("update agenda_push_deliveries set expires_at=now()-interval '1 minute' where note_id=$1", [expired.note]);
      await push.runAgendaPushTick(db, deliver);
      assert.equal((await deliveries(expired.note))[0].status, "CANCELLED");
    });
    await t.test("test notification is scoped to authenticated device ownership", async () => {
      const f = await fixture(); const other = await fixture();
      await assert.rejects(push.sendTest(other.user, f.subs[0].endpoint, db, deliver), { status: 400 });
      await push.sendTest(f.user, f.subs[0].endpoint, db, deliver);
      assert.equal(sent.at(-1).payload.user_id, f.user.id);
      await clearJobs();
    });
    await t.test("RLS enabled and PUBLIC has no grants to either table", async () => {
      const tables = await db.query("select relrowsecurity from pg_class where relnamespace=$1::regnamespace and relname in ('agenda_push_deliveries','agenda_push_subscriptions')", [schema]);
      assert.equal(tables.rowCount, 2); assert.ok(tables.rows.every((row) => row.relrowsecurity));
      const grants = await db.query(`select 1 from pg_class c, lateral aclexplode(c.relacl) a
        where c.relnamespace=$1::regnamespace and c.relname in ('agenda_push_deliveries','agenda_push_subscriptions') and a.grantee=0`, [schema]);
      assert.equal(grants.rowCount, 0);
    });
  } finally {
    env.agendaPushPublicKey = previous.publicKey; env.agendaPushPrivateKey = previous.privateKey;
    await db.end();
    await admin.query(`drop schema ${schema} cascade`);
    await admin.end();
  }
});
