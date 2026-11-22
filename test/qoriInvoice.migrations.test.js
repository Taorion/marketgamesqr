const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto'),{Client}=require('pg');
test('both additive migrations apply, guard populated rollback, reverse empty module and apply again',async()=>{
 const db=new Client({connectionString:'postgresql://postgres@127.0.0.1:55489/qori_invoice_qa',ssl:false});
 await db.connect();assert.equal((await db.query('select current_database() n')).rows[0].n,'qori_invoice_qa');
 const schema='qa_invoice_migration_'+crypto.randomBytes(8).toString('hex');
 try{await db.query('begin');await db.query('create schema '+schema);await db.query('set local search_path='+schema+',public');
 await db.query('create table customer_accounts(id uuid primary key);create table customer_finance_books(customer_id uuid,id uuid,primary key(customer_id,id));create table customer_entries(id uuid primary key);create table app_users(id uuid primary key);create table schema_migrations(id text primary key)');
 const files=['20261122160317_qori_invoice_sandbox','20261122163509_qori_invoice_customer_developers'];
 const up=async()=>{for(const id of files){const sql=fs.readFileSync('database/migrations/'+id+'.sql','utf8');assert.equal(sql,fs.readFileSync('supabase/migrations/'+id+'.sql','utf8'));await db.query(sql);}};
 const down=fs.readFileSync('docs/qori-invoice/rollback.sql','utf8').replace(/^begin;\r?\n/m,'').replace(/^commit;\r?\n/m,'');
 const count=async()=>Number((await db.query("select count(*) n from pg_tables where schemaname=$1 and tablename like 'invoice_%'",[schema])).rows[0].n);
 await up();assert.equal(await count(),18);
 await db.query('savepoint populated');await db.query("insert into invoice_partners(name) values('Synthetic partner')");
 await assert.rejects(()=>db.query(down),/Invoice data exists/);await db.query('rollback to savepoint populated');
 await db.query(down);assert.equal(await count(),0);await up();assert.equal(await count(),18);
 }finally{await db.query('rollback');await db.end();}
});
