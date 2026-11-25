'use strict';
// Verifies/applies ONLY the demonstrations migration to an already migrated local QA database.
const fs=require('node:fs'),path=require('node:path'),{Client}=require('pg');
async function main(){
 const url=process.env.DEMONSTRATIONS_TEST_DATABASE_URL||'postgresql://postgres@127.0.0.1:55441/qori_demonstrations_qa',u=new URL(url);
 if(!['localhost','127.0.0.1','[::1]'].includes(u.hostname)||!/^\/qori_[a-z_]*qa$/.test(u.pathname))throw Error('Solo se permiten bases qori_*qa en loopback. No se aceptan conexiones remotas.');
 const file='20261124131815_qori_commercial_demonstrations.sql',sql=fs.readFileSync(path.join(__dirname,'../database/migrations',file),'utf8');
 if(sql!==fs.readFileSync(path.join(__dirname,'../supabase/migrations',file),'utf8'))throw Error('Las dos copias de la migración difieren.');
 const db=new Client({connectionString:url,ssl:false});await db.connect();try{
  const exists=(await db.query("select to_regclass('qori_demo_config') name")).rows[0].name;
  if(!exists){if(!process.argv.includes('--apply'))throw Error('Falta la migración. Añade --apply para aplicarla solo a esta base local.');await db.query('begin');try{await db.query(sql);await db.query('commit');}catch(e){await db.query('rollback');throw e;}}
  const releaseFile='20261124150438_qori_demo_december_open_agenda.sql',releaseId=releaseFile.slice(0,-4),releaseSql=fs.readFileSync(path.join(__dirname,'../database/migrations',releaseFile),'utf8');
  if(releaseSql!==fs.readFileSync(path.join(__dirname,'../supabase/migrations',releaseFile),'utf8'))throw Error('Las copias de la migración de diciembre difieren.');
  if(!(await db.query("select 1 from pg_constraint where conrelid='qori_demo_sessions'::regclass and conname='qori_demo_sessions_local_date_check' and pg_get_constraintdef(oid) like '%2026-12-01%'")).rowCount){if(!process.argv.includes('--apply'))throw Error('Falta la migración de diciembre. Añade --apply.');await db.query('begin');try{await db.query(releaseSql);await db.query('commit');}catch(e){await db.query('rollback');throw e;}}
  const windowFile='20261124173537_qori_demo_fifteen_day_booking_window.sql',windowSql=fs.readFileSync(path.join(__dirname,'../database/migrations',windowFile),'utf8');
  if(windowSql!==fs.readFileSync(path.join(__dirname,'../supabase/migrations',windowFile),'utf8'))throw Error('Las copias de la migración de 15 días difieren.');
  if(!(await db.query("select 1 from qori_demo_events where action='BOOKING_WINDOW_FIFTEEN_DAYS' limit 1")).rowCount){if(!process.argv.includes('--apply'))throw Error('Falta la migración de 15 días. Añade --apply.');await db.query('begin');try{await db.query(windowSql);await db.query('commit');}catch(e){await db.query('rollback');throw e;}}
  const feedbackFile='20261125141127_qori_demo_closing_feedback.sql',feedbackSql=fs.readFileSync(path.join(__dirname,'../database/migrations',feedbackFile),'utf8');
  if(feedbackSql!==fs.readFileSync(path.join(__dirname,'../supabase/migrations',feedbackFile),'utf8'))throw Error('Las copias de la migración de cierre difieren.');
  if(!(await db.query("select to_regclass('qori_demo_feedback') name")).rows[0].name){if(!process.argv.includes('--apply'))throw Error('Falta la migración de cierre. Añade --apply.');await db.query('begin');try{await db.query(feedbackSql);await db.query('commit');}catch(e){await db.query('rollback');throw e;}}
  const tables=(await db.query("select relname,relrowsecurity from pg_class where relname like 'qori_demo_%' and relkind='r'")).rows;
  if(tables.length!==12||tables.some(t=>!t.relrowsecurity))throw Error('Faltan tablas o RLS.');
  const grants=(await db.query("select grantee,table_name,privilege_type from information_schema.role_table_grants where table_name like 'qori_demo_%' and grantee in('anon','authenticated','PUBLIC')")).rows;
  if(grants.length)throw Error('Hay privilegios directos inesperados.');
  const templates=(await db.query('select weekday,local_time,meet_url,confirmed from qori_demo_templates order by weekday,local_time')).rows;
  if(templates.length!==12||templates.some(t=>t.meet_url.endsWith('aecv')))throw Error('Revisa las franjas iniciales.');
  console.log(JSON.stringify({database:u.pathname.slice(1),migration:file,tables:tables.length,rls:true,direct_public_grants:0,templates:templates.length,pending_templates:templates.filter(t=>!t.confirmed).length},null,2));
 }finally{await db.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
