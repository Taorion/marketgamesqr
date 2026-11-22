// Fixed disposable local database only. Never load .env or accept a remote URL.
const fs=require('node:fs'),path=require('node:path'),{Client}=require('pg');
const root=path.join(__dirname,'..');
const client=new Client({connectionString:'postgresql://postgres@127.0.0.1:55489/qori_invoice_qa',ssl:false});
(async()=>{
 await client.connect();
 const name=(await client.query('select current_database() n')).rows[0].n;if(name!=='qori_invoice_qa')throw new Error('Unexpected database');
 // Baseline schema has forward FK references. Reorder CREATE TABLE blocks only in this in-memory QA copy.
 let schema=fs.readFileSync(path.join(root,'database/schema.sql'),'utf8');
 const deferred=[['business_acquisition_channel_efforts','interactive_activation_id','interactive_activations'],['business_acquisition_channel_efforts','lead_capture_activation_id','lead_capture_activations'],['business_acquisition_channel_efforts','digital_asset_id','digital_assets'],['business_acquisition_events','participant_id','interactive_activation_participants']];
 for(const [,column,target] of deferred)schema=schema.replace(column+' uuid references '+target+'(id) on delete set null',column+' uuid');
 const blocks=[...schema.matchAll(/^create table if not exists (\w+) \([\s\S]*?^\);/gm)];
 const pending=new Map(blocks.map(m=>[m[1],m[0]])),ordered=[];
 while(pending.size){let progress=false;for(const [name,sql] of pending){
  const deps=[...sql.matchAll(/references\s+(?:public\.)?(\w+)\s*\(/gi)].map(m=>m[1]);
  if(deps.some(d=>d!==name&&pending.has(d)))continue;ordered.push(sql);pending.delete(name);progress=true;
 }if(!progress)throw new Error('Cyclic baseline dependencies');}
 const head=schema.slice(0,blocks[0].index);
 schema=schema.slice(blocks[0].index).replace(/^create table if not exists (\w+) \([\s\S]*?^\);/gm,'');
 schema=head+ordered.join('\n')+'\n'+schema;
 await client.query(schema);
 await client.query('create table if not exists schema_migrations(id text primary key,applied_at timestamptz not null default now())');
 const dir=path.join(root,'database/migrations');
 for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()){
  const id=f.slice(0,-4);if((await client.query('select 1 from schema_migrations where id=$1',[id])).rowCount)continue;
  await client.query('begin');
  try{await client.query(fs.readFileSync(path.join(dir,f),'utf8'));await client.query('insert into schema_migrations(id) values($1)',[id]);await client.query('commit');}
  catch(e){await client.query('rollback');throw new Error(f+': '+e.message);}
 }
 for(const [table,column,target] of deferred){
  const constraint=table+'_'+column+'_fkey';
  if(!(await client.query('select 1 from pg_constraint where conrelid=$1::regclass and conname=$2',[table,constraint])).rowCount)
   await client.query('alter table '+table+' add constraint '+constraint+' foreign key('+column+') references '+target+'(id) on delete set null');
 }
 console.log('Isolated qori_invoice_qa schema ready.');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>client.end());

