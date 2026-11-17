// Applies only this additive migration, only to an explicitly named loopback QA database.
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const url = process.env.DATABASE_URL || '';
const parsed = new URL(url);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || !/^\/qori_.*_qa$/.test(parsed.pathname)) throw new Error('Use an explicit local qori_*_qa DATABASE_URL.');
const file = '20261113210829_catalog_delivery_orders.sql';
(async () => {
  const db = new Client({ connectionString: url, ssl: false });
  await db.connect();
  try {
    await db.query('begin');
    await db.query(fs.readFileSync(path.join(__dirname, '..', 'database', 'migrations', file), 'utf8'));
    await db.query('commit');
    console.log('Applied local QA migration:', file);
  } catch (e) { await db.query('rollback'); throw e; }
  finally { await db.end(); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
