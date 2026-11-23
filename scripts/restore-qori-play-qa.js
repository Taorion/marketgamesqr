// Backup + disposable restore drill. Fixed loopback source, random isolated destination.
const {Client}=require('pg'),{execFileSync}=require('node:child_process'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const bin='C:/Program Files/PostgreSQL/18/bin',name='qori_play_restore_'+crypto.randomBytes(8).toString('hex'),file=path.resolve('.qa-play/restore-drill.dump');
const db=n=>new Client({connectionString:'postgresql://postgres@127.0.0.1:55489/'+n,ssl:false});
const admin=db('postgres'),source=db('qori_play_qa'),restored=db(name);let created=false,connected=false;
async function evidence(client){const out={};for(const table of ['play_sessions','play_reward_grants','play_events','play_webhooks','play_webhook_deliveries'])out[table]=(await client.query(`select count(*)::int count,md5(coalesce(string_agg(row_to_json(t)::text,'' order by row_to_json(t)::text),'')) digest from ${table} t`)).rows[0];return out;}
(async()=>{await source.connect();if((await source.query('select current_database() n')).rows[0].n!=='qori_play_qa')throw Error('WRONG_SOURCE');
 if(!(await source.query('select pg_try_advisory_lock(53003817) ok')).rows[0].ok)throw Error('STOP_PREVIEW_AND_TESTS');
 const before=await evidence(source),start=performance.now();await admin.connect();await admin.query('create database '+name);created=true;
 execFileSync(path.join(bin,'pg_dump.exe'),['-h','127.0.0.1','-p','55489','-U','postgres','-d','qori_play_qa','-Fc','--no-owner','--no-acl','-f',file],{stdio:'pipe',windowsHide:true});
 execFileSync(path.join(bin,'pg_restore.exe'),['-h','127.0.0.1','-p','55489','-U','postgres','-d',name,'--no-owner','--no-acl','--exit-on-error',file],{stdio:'pipe',windowsHide:true});
 await restored.connect();connected=true;const after=await evidence(restored);require('node:assert/strict').deepEqual(after,before);
 const report={at:new Date().toISOString(),matched:true,tables:before,seconds:(performance.now()-start)/1000,backup_bytes:fs.statSync(file).size,scope:'Synthetic local DB restore and exact Play row digests; does not validate production backup service, encryption-key recovery or remote RTO'};
 fs.writeFileSync('docs/qori-play/restore-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({matched:true,seconds:report.seconds,backup_bytes:report.backup_bytes}));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{if(connected)await restored.end();if(created){if(!/^qori_play_restore_[a-f0-9]{16}$/.test(name))throw Error('UNSAFE_TARGET');await admin.query('drop database '+name);}await admin.end().catch(()=>{});await source.end().catch(()=>{});});
