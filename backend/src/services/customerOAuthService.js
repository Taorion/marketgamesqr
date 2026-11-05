const crypto=require('crypto');
const jwt=require('jsonwebtoken');
const {query,withTransaction}=require('../config/db');
const {env}=require('../config/env');
const auth=require('./customerAuthService');
const {badRequest,unauthorized,forbidden}=require('../utils/http');
const COOKIE='qori_customer_oauth', sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const random=()=>crypto.randomBytes(32).toString('base64url');
const cookieOptions=()=>({httpOnly:true,secure:env.isProduction,sameSite:'lax',path:'/api/customer'});
const definitions={
 google:{label:'Google',authorize:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',jwks:'https://www.googleapis.com/oauth2/v3/certs'},
 microsoft:{label:'Microsoft',authorize:'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',token:'https://login.microsoftonline.com/common/oauth2/v2.0/token',jwks:'https://login.microsoftonline.com/common/discovery/v2.0/keys'}
};
function config(provider){
 const d=definitions[provider];if(!d)throw badRequest('Proveedor no disponible.');
 return {...d,id:process.env[`CUSTOMER_${provider.toUpperCase()}_CLIENT_ID`],secret:process.env[`CUSTOMER_${provider.toUpperCase()}_CLIENT_SECRET`]};
}
function options(){return {providers:Object.keys(definitions).map(provider=>({provider,label:definitions[provider].label,enabled:Boolean(config(provider).id&&config(provider).secret)}))};}
function browserToken(req){const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);return /^[\w-]{43}$/.test(token||'')?token:null;}
function clear(res){res.clearCookie(COOKIE,cookieOptions());}
function callbackUrl(provider){return new URL(`/api/customer/auth/web/oauth/${provider}/callback`,env.publicAppUrl).href;}
async function start(req,res,provider,customerId=null){
 auth.assertWebRequest(req);
 if(req.body.consent!==true)throw badRequest('Confirma que conoces la política de privacidad.');
 const c=config(provider);if(!c.id||!c.secret)throw Object.assign(new Error(`${c.label} aún no está habilitado. Entra con contraseña o código.`),{status:503});
 const state=random(),browser=random(),nonce=random(),verifier=random();
 await query("delete from customer_oauth_flows where expires_at<now()-interval '1 day'");
 await query('insert into customer_oauth_flows(state_hash,browser_hash,provider,nonce,pkce_verifier,customer_id) values($1,$2,$3,$4,$5,$6)',[sha(state),sha(browser),provider,nonce,verifier,customerId]);
 res.cookie(COOKIE,browser,{...cookieOptions(),maxAge:10*60*1000});
 const url=new URL(c.authorize);url.search=new URLSearchParams({client_id:c.id,response_type:'code',redirect_uri:callbackUrl(provider),scope:'openid profile email',state,nonce,code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'}).toString();
 return {url:url.href};
}
async function fetchJson(url,init={}){
 const response=await fetch(url,{...init,redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw unauthorized('No pudimos validar el acceso con el proveedor.');
 const reader=response.body.getReader();let length=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>1024*1024)throw unauthorized('Respuesta de acceso inválida.');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
const keyCache=new Map();
async function verifyIdToken(provider,idToken,nonce){
 const c=config(provider);if(typeof idToken!=='string'||idToken.length>20000)throw unauthorized('Identidad inválida.');
 const decoded=jwt.decode(idToken,{complete:true});
 if(!decoded||decoded.header.alg!=='RS256'||typeof decoded.header.kid!=='string'||decoded.header.kid.length>200)throw unauthorized('Firma inválida.');
 let cached=keyCache.get(provider),now=Date.now();
 if(!cached||cached.until<now||(!cached.keys.some(k=>k.kid===decoded.header.kid)&&cached.fetched<now-60000)){
  const data=await fetchJson(c.jwks);if(!Array.isArray(data.keys))throw unauthorized('Claves de acceso inválidas.');
  cached={keys:data.keys,until:now+3600000,fetched:now};keyCache.set(provider,cached);
 }
 const jwk=cached.keys.find(k=>k.kid===decoded.header.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig')&&(!k.alg||k.alg==='RS256'));
 if(!jwk)throw unauthorized('Firma no reconocida.');
 const claims=jwt.verify(idToken,crypto.createPublicKey({key:jwk,format:'jwk'}),{algorithms:['RS256'],audience:c.id,clockTolerance:30});
 if(typeof claims.exp!=='number'||typeof claims.iat!=='number'||claims.iat>Date.now()/1000+30||claims.nonce!==nonce||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>255||(claims.azp&&claims.azp!==c.id))throw unauthorized('Identidad inválida.');
 let issuer=claims.iss;
 if(provider==='google'){
  if(!['accounts.google.com','https://accounts.google.com'].includes(issuer))throw unauthorized('Emisor inválido.');
  issuer='https://accounts.google.com';
 }else{
  if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(claims.tid||'')||issuer!==`https://login.microsoftonline.com/${claims.tid}/v2.0`)throw unauthorized('Emisor inválido.');
  if(jwk.issuer&&jwk.issuer.replace('{tenantid}',claims.tid)!==issuer)throw unauthorized('Clave de otro emisor.');
 }
 // Email/name are hints only. First-time linking always requires a verified Qori session.
 return {issuer,subject:claims.sub,email:typeof claims.email==='string'?claims.email.slice(0,180):'',name:typeof claims.name==='string'?claims.name.slice(0,100):''};
}
async function callback(req,res,provider){
 const browser=browserToken(req),state=req.query.state;
 if(!browser||typeof state!=='string'||!/^[-\w]{43}$/.test(state))throw unauthorized('La solicitud de acceso venció.');
 const flow=(await query("update customer_oauth_flows set status='EXCHANGING' where state_hash=$1 and browser_hash=$2 and provider=$3 and status='STARTED' and expires_at>now() returning *",[sha(state),sha(browser),provider])).rows[0];
 if(!flow)throw unauthorized('La solicitud ya fue utilizada o venció.');
 try{
  if(req.query.error||typeof req.query.code!=='string'||req.query.code.length>4096)throw unauthorized('Acceso cancelado.');
  const c=config(provider);
  const result=await fetchJson(c.token,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:c.id,client_secret:c.secret,code:req.query.code,grant_type:'authorization_code',redirect_uri:callbackUrl(provider),code_verifier:flow.pkce_verifier})});
  const identity=await verifyIdToken(provider,result.id_token,flow.nonce);
  const login=await withTransaction(async db=>{
   const locked=(await db.query('select * from customer_oauth_flows where state_hash=$1 for update',[flow.state_hash])).rows[0];
   if(locked.status!=='EXCHANGING'||new Date(locked.expires_at)<=new Date())throw unauthorized('Solicitud vencida.');
   const owner=(await db.query('select customer_id from customer_oauth_identities where provider=$1 and issuer=$2 and subject=$3',[provider,identity.issuer,identity.subject])).rows[0];
   if(flow.customer_id&&owner&&owner.customer_id!==flow.customer_id)throw forbidden('Esta identidad pertenece a otra cuenta Qori.');
   if(owner&&!flow.customer_id){
    const account=(await db.query('select * from customer_accounts where id=$1 for update',[owner.customer_id])).rows[0];
    if(!account)throw unauthorized('Cuenta no disponible.');
    await db.query("update customer_oauth_flows set status='CONSUMED',pkce_verifier='' where state_hash=$1",[flow.state_hash]);
    return auth.createSession(db,account,`Qori Customer · ${c.label}`);
   }
   await db.query("update customer_oauth_flows set status='VERIFIED',issuer=$2,subject=$3,email_hint=$4,name_hint=$5,pkce_verifier='' where state_hash=$1",[flow.state_hash,identity.issuer,identity.subject,identity.email,identity.name]);
   return null;
  });
  if(login){auth.setWebSession(res,login);clear(res);return '/customer/#home';}
  return '/customer/#oauth-connect';
 }catch(error){await query("update customer_oauth_flows set status='FAILED',pkce_verifier='' where state_hash=$1",[flow.state_hash]);throw error;}
}
async function pending(req){
 const token=browserToken(req);if(!token)throw unauthorized('Vuelve a elegir Google o Microsoft para continuar.');
 const flow=(await query("select provider,email_hint from customer_oauth_flows where browser_hash=$1 and status='VERIFIED' and expires_at>now()",[sha(token)])).rows[0];
 if(!flow)throw unauthorized('La conexión venció. Vuelve a elegir tu proveedor.');
 return {provider:flow.provider,label:definitions[flow.provider].label,email_hint:flow.email_hint};
}
async function link(req,res){
 if(req.body.confirmed!==true)throw badRequest('Confirma la conexión de tu cuenta.');
 const token=browserToken(req);if(!token)throw unauthorized('Conexión vencida.');
 await withTransaction(async db=>{
  const flow=(await db.query("select * from customer_oauth_flows where browser_hash=$1 and status='VERIFIED' and expires_at>now() for update",[sha(token)])).rows[0];
  if(!flow)throw unauthorized('Conexión vencida o utilizada.');
  if(flow.customer_id&&flow.customer_id!==req.customer.id)throw forbidden('Inicia sesión en la cuenta donde comenzaste la conexión.');
  // A fresh Qori login is required even if another Customer session was already open.
  const session=(await db.query("select created_at from customer_sessions where id=$1 and customer_id=$2 and expires_at>now()",[req.customer.session_id,req.customer.id])).rows[0];
  if(!session||new Date(session.created_at)<new Date(flow.created_at))throw forbidden('Verifica tu correo Qori nuevamente para conectar el proveedor.');
  await db.query('select id from customer_accounts where id=$1 for update',[req.customer.id]);
  const existing=(await db.query('select * from customer_oauth_identities where provider=$1 and (customer_id=$2 or (issuer=$3 and subject=$4))',[flow.provider,req.customer.id,flow.issuer,flow.subject])).rows;
  if(existing.some(x=>x.customer_id!==req.customer.id||x.issuer!==flow.issuer||x.subject!==flow.subject))throw forbidden('Este proveedor ya está conectado a otra identidad.');
  try{await db.query('insert into customer_oauth_identities(provider,issuer,subject,customer_id) values($1,$2,$3,$4) on conflict(provider,issuer,subject) do nothing',[flow.provider,flow.issuer,flow.subject,req.customer.id]);}catch(e){if(e.code==='23505')throw forbidden('La identidad ya está conectada.');throw e;}
  const owner=(await db.query('select customer_id from customer_oauth_identities where provider=$1 and issuer=$2 and subject=$3',[flow.provider,flow.issuer,flow.subject])).rows[0];
  if(owner?.customer_id!==req.customer.id)throw forbidden('La identidad pertenece a otra cuenta.');
  await db.query("update customer_oauth_flows set status='CONSUMED' where state_hash=$1",[flow.state_hash]);
 });
 clear(res);return {ok:true};
}
async function security(customer){return {has_password:(await query('select 1 from customer_password_credentials where customer_id=$1',[customer.id])).rowCount>0,providers:(await query('select provider,created_at from customer_oauth_identities where customer_id=$1',[customer.id])).rows};}
module.exports={options,start,callback,pending,link,clear,security,verifyIdToken};
