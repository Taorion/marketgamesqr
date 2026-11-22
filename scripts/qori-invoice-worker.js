// Start separately from HTTP. No production or remote database execution in this increment.
const {enabled,configured}=require('../backend/src/invoice/config');
const {env}=require('../backend/src/config/env');
const db=new URL(env.databaseUrl||'http://invalid');
if(!enabled()||!['localhost','127.0.0.1'].includes(db.hostname)||db.pathname!=='/qori_invoice_qa')
 throw new Error('Worker requires enabled sandbox and local qori_invoice_qa.');
configured();
const {processOne}=require('../backend/src/invoice/service'),{pool}=require('../backend/src/config/db');
let stopped=false;process.on('SIGINT',()=>{stopped=true;});process.on('SIGTERM',()=>{stopped=true;});
(async()=>{do {const found=await processOne();if(process.argv.includes('--once'))break;if(!found)await new Promise(r=>setTimeout(r,1000));}while(!stopped);})()
 .catch(()=>{console.error('INVOICE_WORKER_UNAVAILABLE');process.exitCode=1;}).finally(()=>pool.end());

