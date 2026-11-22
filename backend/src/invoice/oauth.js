const crypto=require('node:crypto');
const {query,withTransaction}=require('../config/db'),{hash,fault}=require('./config');
const SCOPES=['invoices:write','submissions:read'];
async function issue(clientId,secret,requested) {
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(clientId||'')||!/^qi_sbx_[A-Za-z0-9_-]{43}$/.test(secret||''))throw fault(401,'INVALID_CLIENT');
 return withTransaction(async db=>{
  const k=(await db.query(`select k.* from invoice_keys k join invoice_apps a on a.id=k.app_id join invoice_partners p on p.id=a.partner_id
   where k.id=$1 and k.secret_hash=$2 and k.revoked_at is null and k.expires_at>now() and a.active and p.verification_state<>'REVOKED'
   for share of k,a,p`,[clientId,hash(secret)])).rows[0];
  if(!k)throw fault(401,'INVALID_CLIENT');
  const scopes=requested?requested.split(' '):k.scopes;
  if(!scopes.length||scopes.some(s=>!SCOPES.includes(s)||!k.scopes.includes(s)))throw fault(400,'INVALID_SCOPE');
  const token='qi_at_'+crypto.randomBytes(32).toString('base64url');
  await db.query("insert into invoice_access_tokens(token_hash,key_id,scopes,expires_at) values($1,$2,$3,least($4,now()+interval '15 minutes'))",[hash(token),k.id,[...new Set(scopes)],k.expires_at]);
  return {access_token:token,token_type:'Bearer',expires_in:Math.max(1,Math.min(900,Math.floor((new Date(k.expires_at)-Date.now())/1000))),scope:[...new Set(scopes)].join(' ')};
 });
}
async function authenticate(token,scope) {
 if(!/^qi_at_[A-Za-z0-9_-]{43}$/.test(token||''))throw fault(401,'INVALID_CREDENTIAL');
 const row=(await query(`select a.id app_id,k.id key_id,t.scopes,t.token_hash from invoice_access_tokens t
 join invoice_keys k on k.id=t.key_id join invoice_apps a on a.id=k.app_id join invoice_partners p on p.id=a.partner_id
 where t.token_hash=$1 and t.expires_at>now() and k.expires_at>now() and k.revoked_at is null
 and a.active and a.environment='sandbox' and p.verification_state<>'REVOKED'`,[hash(token)])).rows[0];
 if(!row)throw fault(401,'INVALID_CREDENTIAL');if(!row.scopes.includes(scope))throw fault(403,'INSUFFICIENT_SCOPE');return row;
}
module.exports={SCOPES,issue,authenticate};
