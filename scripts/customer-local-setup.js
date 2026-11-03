// Creates ONLY a new, explicitly named local QA database. Does not read .env.
const fs = require('fs/promises');
const path = require('path');
const { Client } = require('pg');
const root = path.resolve(__dirname, '..');
async function main() {
  const db = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:55441/qori_customer_qa' });
  await db.connect();
  const exists = (await db.query("select to_regclass('public.businesses') as table_name")).rows[0].table_name;
  if (!exists) {
    const schema = await fs.readFile(path.join(root, 'database/schema.sql'), 'utf8');
    await db.query(schema.slice(0, schema.indexOf('create table if not exists businesses')));
    const files = (await fs.readdir(path.join(root, 'database/migrations'))).filter(f => f.endsWith('.sql')).sort();
    const sources = await Promise.all(files.map(f => fs.readFile(path.join(root, 'database/migrations', f), 'utf8')));
    const pending = [schema, ...sources].flatMap(s => [...s.matchAll(/create table if not exists [\s\S]*?\n\);/g)].map(m => m[0]));
    while (pending.length) {
      let progress = false;
      for (let i = pending.length - 1; i >= 0; i--) {
        try { await db.query(pending[i]); pending.splice(i,1); progress = true; }
        catch(e) { if (!['42P01','42703','42704','42830'].includes(e.code)) throw e; }
      }
      if (!progress) break;
    }
    await db.query(schema);
    for (let i = 0; i < files.length; i++) { try { await db.query(sources[i]); } catch(e) { throw new Error(`${files[i]}: ${e.message}`); } }
  }
  if (!(await db.query("select to_regclass('public.customer_accounts') t")).rows[0].t) {
    await db.query(await fs.readFile(path.join(root,'supabase/migrations/20261028202855_qori_customer.sql'),'utf8'));
  }
  if (!(await db.query("select to_regclass('public.customer_gift_orders') t")).rows[0].t) {
    await db.query(await fs.readFile(path.join(root,'supabase/migrations/20261030202949_qori_customer_wallet_network.sql'),'utf8'));
  }
  for(const [table,file] of [['customer_invitations','20261103170919_qori_customer_network_invitations.sql'],['customer_publications','20261103185938_qori_customer_ecosystem_publications.sql'],['customer_product_gift_orders','20261103195525_qori_customer_product_gifts.sql'],['customer_sale_deliveries','20261103204444_qori_customer_finance_delivery.sql']]){
    if(!(await db.query('select to_regclass($1) t',['public.'+table])).rows[0].t)await db.query(await fs.readFile(path.join(root,'supabase/migrations',file),'utf8'));
  }
  await db.end(); console.log('Local qori_customer_qa schema ready (127.0.0.1:55441).');
}
main().catch(e => { console.error(e.message); process.exit(1); });
