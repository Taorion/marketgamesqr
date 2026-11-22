// Start separately from HTTP. No production or remote database execution in this increment.
const {enabled,configured}=require('../backend/src/invoice/config');
const {env}=require('../backend/src/config/env');
const db=new URL(env.databaseUrl||'http://invalid');
if(!enabled()||!['localhost','127.0.0.1'].includes(db.hostname)||db.pathname!=='/qori_invoice_qa')
 throw new Error('Worker requires enabled sandbox and local qori_invoice_qa.');
configured();
const {processOne}=require('../backend/src/invoice/service'),{pool}=require('../backend/src/config/db');
let stopped=false;process.on('SIGINT',()=>{stopped=true;});process.on('SIGTERM',()=>{stopped=true;});
setInterval(()=>require('../backend/src/invoice/operations').retention().catch(()=>console.error('INVOICE_RETENTION_UNAVAILABLE')),60000).unref();
let environmentLock;
(async()=>{environmentLock=await pool.connect();if(!(await environmentLock.query('select pg_try_advisory_lock_shared(53002817) acquired')).rows[0].acquired)throw new Error('Local test runner owns this environment');
 do {const found=await processOne();if(process.argv.includes('--once'))break;if(!found)await new Promise(r=>setTimeout(r,1000));}while(!stopped);})()
 .catch(()=>{console.error('INVOICE_WORKER_UNAVAILABLE');process.exitCode=1;}).finally(async()=>{if(environmentLock){await environmentLock.query('select pg_advisory_unlock_shared(53002817)');environmentLock.release();}await pool.end();});

