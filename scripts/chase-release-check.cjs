// Explicit, scoped migration/verification. Credentials are loaded, never logged.
const fs=require('node:fs'),path=require('node:path');
require('dotenv').config({path:process.argv[3]||'.env',quiet:true});
const {Client}=require('pg'),mode=process.argv[2]||'verify',id='20261128144900_qori_chase_rooms';
async function main(){
 const db=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DB_SSL==='false'?false:{rejectUnauthorized:false},connectionTimeoutMillis:15000});await db.connect();
 try{
  if(mode==='migrate'){
   await db.query('begin');await db.query("select pg_advisory_xact_lock(hashtext('qori-chase-migration'))");
   if(!(await db.query('select 1 from schema_migrations where id=$1',[id])).rowCount){await db.query(fs.readFileSync(path.join(__dirname,'../database/migrations/'+id+'.sql'),'utf8'));await db.query('insert into schema_migrations(id) values($1)',[id]);}
   await db.query('commit');
  }
  const tables=(await db.query(`select relname,relrowsecurity,has_table_privilege('anon',oid,'select') as anon_read,
    has_table_privilege('authenticated',oid,'select') as authenticated_read from pg_class
    where relname in ('qori_chase_rooms','qori_chase_members','qori_chase_rounds','qori_chase_results') order by relname`)).rows;
  const migrated=(await db.query('select id from schema_migrations where id=$1',[id])).rowCount===1;
  console.log(JSON.stringify({mode,migrated,tables,verified:migrated&&tables.length===4&&tables.every(t=>t.relrowsecurity&&!t.anon_read&&!t.authenticated_read)}));
 }finally{await db.end();}
}
main().catch(error=>{console.error(error.code||error.message);process.exitCode=1;});
