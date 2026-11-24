// Isolated local database bootstrap. Never points at DATABASE_URL or a remote host.
const fs=require('fs/promises');
const path=require('path');
const {Client}=require('pg');
const root=path.resolve(__dirname,'..');
async function main(){
  const client=new Client({connectionString:'postgresql://postgres@127.0.0.1:55441/postgres'});await client.connect();
  for(const role of ['anon','authenticated','service_role']){
    if(!(await client.query('select 1 from pg_roles where rolname=$1',[role])).rowCount) await client.query(`create role ${role}`);
  }
  if((await client.query("select 1 from pg_database where datname='qori_alliances_qa_v2'")).rowCount){await client.end();console.log('La base local ya existe; se conserva sin modificar. Ejecuta las pruebas.');return;}
  await client.query('create database qori_alliances_qa_v2');await client.end();
  const db=new Client({connectionString:'postgresql://postgres@127.0.0.1:55441/qori_alliances_qa_v2'});await db.connect();
  const schema=await fs.readFile(path.join(root,'database/schema.sql'),'utf8');
  // The legacy schema has forward references. Pre-create its tables in dependency order,
  // then run the unchanged schema and the real migrations.
  await db.query(schema.slice(0,schema.indexOf('create table if not exists businesses')));
  const files=(await fs.readdir(path.join(root,'database/migrations'))).filter(f=>f.endsWith('.sql')).sort();
  const migrationSources=await Promise.all(files.map(f=>fs.readFile(path.join(root,'database/migrations',f),'utf8')));
  const pending=[...schema.matchAll(/create table if not exists [\s\S]*?\n\);/g),...migrationSources.flatMap(s=>[...s.matchAll(/create table if not exists [\s\S]*?\n\);/g)])].map(m=>m[0]);
  while(pending.length){let progress=false;for(let i=pending.length-1;i>=0;i--){try{await db.query(pending[i]);pending.splice(i,1);progress=true;}catch(e){if(!['42P01','42703','42704','42830'].includes(e.code))throw e;}}if(!progress)break;}
  await db.query(schema);
  for(const file of files){try{await db.query(await fs.readFile(path.join(root,'database/migrations',file),'utf8'));}catch(e){throw new Error(file+': '+e.message);}}
  await db.end();console.log('Isolated qori_alliances_qa_v2 schema and migrations ready.');
}
main().catch(e=>{console.error(e.message);process.exit(1);});
