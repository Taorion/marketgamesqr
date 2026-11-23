const crypto=require('node:crypto');
// Call with raw body BEFORE JSON parsing; persist accepted IDs with a uniqueness constraint.
function verify(secret,id,timestamp,rawBody,signature,now=Date.now()){
 if(!/^[0-9a-f-]{36}$/.test(id||'')||!/^\d{10}$/.test(timestamp||'')||Math.abs(now/1000-Number(timestamp))>300||! /^[a-f0-9]{64}$/.test(signature||''))return false;
 const expected=crypto.createHmac('sha256',secret).update(timestamp+'.'+id+'.'+rawBody).digest();
 return crypto.timingSafeEqual(expected,Buffer.from(signature,'hex'));
}
module.exports={verify};
