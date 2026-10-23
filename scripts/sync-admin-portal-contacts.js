// Dry run by default. --apply commits the listed admin contacts into Orbital Innovation's CRM.
const { pool } = require('../backend/src/config/db');
const { syncCommercialContact, syncCommercialBusiness } = require('../backend/src/services/commercialContactSyncService');
async function main() {
  const apply = process.argv.includes('--apply');
  const prospects = (await pool.query('select * from qori_sales_prospects order by created_at,id')).rows;
  const businesses = (await pool.query(`select distinct b.id,b.name from businesses b
    left join qori_sales_accounts a on a.business_id=b.id
    where (a.business_id is not null or b.settings->>'signup_type' in ('qori_descubre','qori_sales','admin_agreement_client'))
    and not exists(select 1 from qori_sales_prospects p where p.business_id=b.id)
    order by b.id`)).rows;
  const results = [];
  for (const entry of [...prospects.map(prospect=>({prospect})),...businesses.map(business=>({business}))]) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query("set local lock_timeout='10s'");
      const businessId = entry.business?.id || entry.prospect?.business_id;
      const result = businessId
        ? await syncCommercialBusiness(client,businessId)
        : await syncCommercialContact(client,{prospect:entry.prospect,sellerId:entry.prospect.seller_id});
      if (!result) throw new Error('No se encontró la cuenta interna activa de Orbital Innovation.');
      await client.query(apply ? 'commit' : 'rollback');
      results.push({name:entry.business?.name || entry.prospect.business_name,...result});
    } catch(error) { await client.query('rollback'); throw error; }
    finally { client.release(); }
  }
  console.log(JSON.stringify({apply,count:results.length,results},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
