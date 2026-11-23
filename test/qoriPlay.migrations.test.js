const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),{Client}=require('pg');
test('Play migration applies, blocks populated rollback, reverses empty module and reapplies',async()=>{
 const db=new Client({connectionString:'postgresql://postgres@127.0.0.1:55489/qori_play_qa',ssl:false});await db.connect();
 const schema='qa_play_'+crypto.randomBytes(8).toString('hex');
 try{assert.equal((await db.query('select current_database() n')).rows[0].n,'qori_play_qa');await db.query('begin');await db.query('create schema '+schema);await db.query('set local search_path='+schema+',public');
 await db.query('create table invoice_partners(id uuid primary key); create table invoice_apps(id uuid primary key,partner_id uuid,unique(partner_id,id));create table campaigns(id uuid primary key);create table app_users(id uuid primary key);create table customer_accounts(id uuid primary key);create table qr_codes(id uuid primary key);create table schema_migrations(id text primary key)');
 const up=fs.readFileSync('database/migrations/20261122173811_qori_play_sandbox.sql','utf8');assert.equal(up,fs.readFileSync('supabase/migrations/20261122173811_qori_play_sandbox.sql','utf8'));
 const down=fs.readFileSync('docs/qori-play/rollback.sql','utf8').replace(/^begin;\r?\n/m,'').replace(/^commit;\r?\n/m,'');
 const count=async()=>Number((await db.query("select count(*) n from pg_tables where schemaname=$1 and left(tablename,5)='play_'",[schema])).rows[0].n);
 await db.query(up);assert.equal(await count(),11);await db.query('savepoint populated');
 const ops=fs.readFileSync('database/migrations/20261122233458_qori_play_operations.sql','utf8');assert.equal(ops,fs.readFileSync('supabase/migrations/20261122233458_qori_play_operations.sql','utf8'));
 const reverseOps=fs.readFileSync('docs/qori-play/rollback-operations.sql','utf8').replace(/^begin;\r?\n/m,'').replace(/^commit;\r?\n/m,'');
 await db.query(ops);assert.equal(await count(),13);await db.query(reverseOps);assert.equal(await count(),11);
 await db.query("with p as (insert into invoice_partners values(gen_random_uuid()) returning id) insert into play_organizations(partner_id) select id from p");
 await assert.rejects(db.query(down),/Play data exists/);await db.query('rollback to savepoint populated');await db.query(down);assert.equal(await count(),0);await db.query(up);assert.equal(await count(),11);
 }finally{await db.query('rollback');await db.end();}
});
