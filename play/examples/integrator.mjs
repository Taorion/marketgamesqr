// Node 22+, backend only. Credentials come from your sandbox application.
const base=process.env.QORI_BASE_URL||'http://127.0.0.1:3198';
const url=new URL(base);if(url.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(url.hostname))throw Error('HTTPS required');
if(!process.env.QORI_CLIENT_ID||!process.env.QORI_CLIENT_SECRET)throw Error('Set QORI_CLIENT_ID and QORI_CLIENT_SECRET');
const response=await fetch(base+'/api/invoice/v1/oauth/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(process.env.QORI_CLIENT_ID+':'+process.env.QORI_CLIENT_SECRET).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials&scope=play%3Aanalytics'});
if(!response.ok)throw Error('Token request failed: '+response.status);
const {access_token}=await response.json();
const metrics=await fetch(base+'/api/play/v1/manage/analytics',{headers:{Authorization:'Bearer '+access_token}});
if(!metrics.ok)throw Error('Metrics request failed: '+metrics.status);
console.log(JSON.stringify(await metrics.json(),null,2)); // Never log credentials or bearer tokens.
