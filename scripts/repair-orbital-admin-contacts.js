// One-time correction of the five contacts linked by aa05c81. Dry run by default.
const assert = require('node:assert/strict');
const {pool} = require('../backend/src/config/db');
const {commercialContactBusiness,syncCommercialContact,syncCommercialBusiness} = require('../backend/src/services/commercialContactSyncService');
const oldBusinessId='535a5f6e-01c3-4244-8a16-d1554e4d8d12';
const targetBusinessId='259a2769-e386-4b03-9019-017a2d6c8c6c';
const contactIds=['2c782611-a827-4482-bbd9-74e59e2fdcc6','6bc470e0-81ed-4e18-985b-ad6e8d7f0e72','41d473e0-bfc0-44a5-a6d1-f6ded0372fb7','77b51c71-8795-413c-b68e-70d5a84e21fd'];
async function main(){
 const apply=process.argv.includes('--apply');
 const client=await pool.connect();
 try {
  await client.query('begin');
  await client.query("set local lock_timeout='10s'");
  assert.equal((await commercialContactBusiness(client))?.id,targetBusinessId);
  await client.query('select pg_advisory_xact_lock(hashtext($1))',[`qori-admin-contacts:${targetBusinessId}`]);
  const rows=(await client.query('select * from business_manual_leads where id=any($1::uuid[]) order by id for update',[contactIds])).rows;
  assert.equal(rows.length,contactIds.length);
  const columns=(await client.query(`select table_name,column_name from information_schema.columns where table_schema='public'
    and data_type='uuid' and column_name in ('source_id','lead_id','manual_lead_id','contact_id','lead_row_id')`)).rows;
  const pendingIds=rows.filter(row=>row.business_id===oldBusinessId).map(row=>row.id);
  if(columns.length && pendingIds.length){
   const references=await client.query(columns.map(col=>`select '${col.table_name}.${col.column_name}' as reference,count(*)::int as count
     from "${col.table_name}" where "${col.column_name}"=any($1::uuid[])`).join(' union all '),[pendingIds]);
   assert.deepEqual(references.rows.filter(row=>row.count>0),[],'Contacts have history; requires a separate migration.');
  }
  const moved=[];
  for(const row of rows){
   if(row.business_id===targetBusinessId)continue;
   assert.equal(row.business_id,oldBusinessId);assert.equal(row.source,'Admin Qori');assert.equal(row.metadata?.qori_admin?.created_by_sync,true);
   for(const table of ['players','affiliates','business_manual_leads']){
    const duplicate=await client.query(`select id from ${table} where business_id=$1 and lower(email)=lower($2)`,[targetBusinessId,row.email]);
    assert.equal(duplicate.rowCount,0,`Existing target identity for ${row.id}; review before moving.`);
   }
   await client.query(`update business_manual_leads set business_id=$2,seller_user_id=null,updated_at=now() where id=$1 and business_id=$3`,[row.id,targetBusinessId,oldBusinessId]);
   moved.push(row.id);
  }
  const prospects=(await client.query('select * from qori_sales_prospects order by created_at,id')).rows;
  const customers=(await client.query(`select distinct b.id from businesses b left join qori_sales_accounts a on a.business_id=b.id
   where (a.business_id is not null or b.settings->>'signup_type' in ('qori_descubre','qori_sales','admin_agreement_client'))
   and b.id<>$1 and not exists(select 1 from qori_sales_prospects p where p.business_id=b.id) order by b.id`,[targetBusinessId])).rows;
  const synced=[];
  for(const prospect of prospects){
   synced.push(prospect.business_id ? await syncCommercialBusiness(client,prospect.business_id)
    : await syncCommercialContact(client,{prospect,sellerId:prospect.seller_id}));
  }
  for(const business of customers)synced.push(await syncCommercialBusiness(client,business.id));
  // This pre-existing legacy player remains in its original tenant; remove only our admin link.
  const unlinked=await client.query(`update players set metadata=metadata-'qori_admin' where id=$1 and business_id=$2
    and metadata->'qori_admin'->>'created_by_sync'='false' returning id`,['e10db51e-4eec-4cfd-bd0d-646637ecfaae',oldBusinessId]);
  if(moved.length || unlinked.rowCount || synced.some(r=>r?.created)){
   await client.query(`insert into qori_commercial_audit(action,entity_type,entity_id,detail)
    values('ADMIN_CONTACT_DESTINATION_CORRECTED','business',$1,$2::jsonb)`,[targetBusinessId,JSON.stringify({previous_business_id:oldBusinessId,moved_contact_ids:moved,synced,unlinked_player_ids:unlinked.rows.map(r=>r.id)})]);
  }
  await client.query(apply?'commit':'rollback');
  console.log(JSON.stringify({apply,destination:'Orbital Innovation SAS',moved_contact_ids:moved,synced,legacy_players_unlinked:unlinked.rowCount},null,2));
 }catch(error){await client.query('rollback');throw error;}finally{client.release();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
