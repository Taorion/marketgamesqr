// Node 22+, server side only. No external dependencies.
import {readFile} from 'node:fs/promises';
const base=new URL(process.env.QORI_BASE_URL||'http://127.0.0.1:3197');
if(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname))throw new Error('HTTPS required');
const id=process.env.QORI_CLIENT_ID,secret=process.env.QORI_CLIENT_SECRET;
if(!id||!secret)throw new Error('Set QORI_CLIENT_ID and QORI_CLIENT_SECRET on the server');
const call=async(path,options={})=>{const r=await fetch(new URL(path,base),{...options,redirect:'error',signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok)throw new Error('HTTP '+r.status+' '+(d.error?.code||'REQUEST_FAILED'));return d;};
const token=await call('/api/invoice/v1/oauth/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(id+':'+secret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
const xml=await readFile(process.argv[2]||'developers/example.xml','utf8');
const key=process.env.QORI_IDEMPOTENCY_KEY;if(!key)throw new Error('Set a stable QORI_IDEMPOTENCY_KEY for this document');
const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json','Idempotency-Key':key};
const sent=await call('/api/invoice/v1/invoices',{method:'POST',headers,body:JSON.stringify({issuer_nit:'900000000',xml})});
console.log(JSON.stringify(sent));
console.log(JSON.stringify(await call('/api/invoice/v1/receipts/'+sent.submission_id,{headers:{Authorization:headers.Authorization}})));
