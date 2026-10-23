const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

test('admin contacts synchronize into the internal Qori CRM', {skip:process.env.QORI_COMMERCIAL_QA !== 'true'}, async t => {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname,'127.0.0.1');
  assert.equal(url.port,'55439');
  const {pool,withTransaction} = require('../backend/src/config/db');
  const {syncCommercialContact,syncCommercialBusiness} = require('../backend/src/services/commercialContactSyncService');
  const {enrollDescubre} = require('../backend/src/services/descubreEnrollmentService');
  const {saveProspect,updateCustomer} = require('../backend/src/services/commercialAdminService');
  const {listLeadCrmRows} = require('../backend/src/services/leadCrmService');
  t.after(()=>pool.end());
  const prefix=randomUUID();
  const internal=(await pool.query(`insert into businesses(name,slug,settings) values('Qori QA','marketgames-qr','{"internal_account":true}')
    on conflict(slug) do update set is_active=true,settings=businesses.settings||'{"internal_account":true}'::jsonb returning id`)).rows[0];
  const other=(await pool.query('insert into businesses(name,slug) values($1,$2) returning id',['Other tenant',prefix])).rows[0];
  const seller=(await pool.query(`insert into app_users(business_id,email,password_hash,full_name,role,platform_role)
    values($1,$2,'unused','Gonzalo QA','BUSINESS_SELLER','QORI_SELLER') returning *`,[internal.id,`${prefix}-seller@example.test`])).rows[0];
  const user={...seller,role:'QORI_SELLER'};
  const email=`${prefix}@example.test`;
  const phone='3'+String(BigInt('0x'+prefix.replaceAll('-','').slice(0,12)) % 1000000000n).padStart(9,'0');
  const foreign=(await pool.query(`insert into business_manual_leads(business_id,name,email) values($1,'Same name elsewhere',$2) returning *`,[other.id,email])).rows[0];
  let prospect,contactId,businessId;
  await t.test('saving a prospect creates a tenant-scoped portal contact assigned to the seller',async()=>{
    prospect=(await saveProspect(user,{business_name:'Rey del sabor QA',contact_name:'Rodrigo QA',email,phone})).prospect;
    const rows=(await pool.query('select * from business_manual_leads where business_id=$1 and email=$2',[internal.id,email])).rows;
    assert.equal(rows.length,1);contactId=rows[0].id;
    assert.equal(rows[0].seller_user_id,seller.id);
    assert.equal(rows[0].metadata.qori_admin.prospect_id,prospect.id);
    assert.deepEqual((await pool.query('select * from business_manual_leads where id=$1',[foreign.id])).rows[0],foreign);
  });
  await t.test('concurrent enrollment and retries preserve the contact ID and seller',async()=>{
    const password='Local-QA-Only!2026';
    const body={request_id:randomUUID(),prospect_id:prospect.id,company_name:prospect.business_name,contact_name:prospect.contact_name,
      nit:prefix,phone:prospect.phone,email,password,password_confirm:password,terms_accepted:true,privacy_accepted:true};
    const results=await Promise.all([enrollDescubre(user,body),enrollDescubre(user,body)]);
    businessId=results[0].business_id;
    assert.equal(results[1].business_id,businessId);
    assert.equal(results.filter(row=>row.already_created).length,1);
    const contacts=(await pool.query('select * from business_manual_leads where business_id=$1 and email=$2',[internal.id,email])).rows;
    assert.equal(contacts.length,1);assert.equal(contacts[0].id,contactId);
    assert.equal(contacts[0].metadata.qori_admin.business_id,businessId);
    assert.equal(contacts[0].metadata.qori_admin.plan_code,'DESCUBRE');
    assert.equal(contacts[0].seller_user_id,seller.id);
    const crm=await listLeadCrmRows(internal.id,{search:'Rey del sabor QA',seller_id:seller.id});
    assert.ok(crm.leads.some(row=>row.id===contactId && row.seller_name==='Gonzalo QA'));
    assert.equal((await listLeadCrmRows(other.id,{search:'Rey del sabor QA'})).leads.some(row=>row.id===contactId),false);
  });
  await t.test('reassignment and removal update the existing contact, preserving notes/history',async()=>{
    await pool.query("update business_manual_leads set notes='Keep CRM notes' where id=$1",[contactId]);
    const admin={...user,role:'QORI_SUPERADMIN'};
    await updateCustomer(admin,businessId,{seller_id:null,reason:'QA unassign'});
    let contact=(await pool.query('select * from business_manual_leads where id=$1',[contactId])).rows[0];
    assert.equal(contact.seller_user_id,null);assert.equal(contact.notes,'Keep CRM notes');
    await updateCustomer(admin,businessId,{seller_id:seller.id,reason:'QA reassign'});
    contact=(await pool.query('select * from business_manual_leads where id=$1',[contactId])).rows[0];
    assert.equal(contact.seller_user_id,seller.id);
  });
  await t.test('existing player and affiliate identities are reused without manual duplicates',async()=>{
    for(const type of ['PLAYER','AFFILIATE']) {
      const address=`${prefix}-${type}@example.test`;
      const row=type==='PLAYER'
        ? (await pool.query("insert into players(business_id,name,email,metadata) values($1,'Existing player',$2,'{\"keep\":true}') returning id",[internal.id,address])).rows[0]
        : (await pool.query("insert into affiliates(business_id,full_name,email,qr_token,card_metadata) values($1,'Existing affiliate',$2,$3,'{\"keep\":true}') returning id",[internal.id,address,randomUUID()])).rows[0];
      const p={id:randomUUID(),business_name:type,contact_name:'Contact',email:address,stage:'NEW'};
      const synced=await withTransaction(c=>syncCommercialContact(c,{prospect:p,sellerId:seller.id}));
      assert.equal(synced.id,row.id);assert.equal(synced.source_type,type);
      assert.equal((await pool.query('select id from business_manual_leads where business_id=$1 and email=$2',[internal.id,address])).rowCount,0);
    }
  });
  await t.test('rolled-back sync does not leave partial contacts; seller IDs never cross tenants',async()=>{
    const p={id:randomUUID(),business_name:'Rollback',contact_name:'Rollback',email:`${prefix}-rollback@example.test`};
    await assert.rejects(withTransaction(async c=>{await syncCommercialContact(c,{prospect:p,sellerId:seller.id});throw new Error('rollback');}),/rollback/);
    assert.equal((await pool.query('select id from business_manual_leads where email=$1',[p.email])).rowCount,0);
    const outsider=(await pool.query("insert into app_users(business_id,email,password_hash,full_name,role,platform_role) values($1,$2,'unused','External seller','BUSINESS_OWNER','QORI_SELLER') returning id",[other.id,`${prefix}-outside@example.test`])).rows[0];
    const synced=await withTransaction(c=>syncCommercialContact(c,{prospect:p,sellerId:outsider.id}));
    const contact=(await pool.query('select * from business_manual_leads where id=$1',[synced.id])).rows[0];
    assert.equal(contact.seller_user_id,null);
    assert.equal(contact.metadata.qori_admin.seller_id,outsider.id);
  });
  await t.test('backfill is idempotent',async()=>{
    const first=await withTransaction(c=>syncCommercialBusiness(c,businessId));
    const second=await withTransaction(c=>syncCommercialBusiness(c,businessId));
    assert.equal(first.id,contactId);assert.equal(second.id,contactId);assert.equal(second.created,false);
  });
});
