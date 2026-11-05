const crypto=require('crypto');
const {promisify}=require('util');
const scrypt=promisify(crypto.scrypt);
const {query,withTransaction}=require('../config/db');
const {env}=require('../config/env');
const {badRequest,unauthorized,tooManyRequests}=require('../utils/http');
let active=0;
async function derive(password,salt){
  if(active>=4)throw tooManyRequests('Hay varios accesos en curso. Inténtalo en un momento.');
  active++;
  try{return await scrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024});}finally{active--;}
}
function validate(password,confirmation){
  if(typeof password!=='string'||password.length<12||password.length>128||Buffer.byteLength(password)>512)throw badRequest('Usa una contraseña de 12 a 128 caracteres.');
  if(password!==confirmation)throw badRequest('Las contraseñas no coinciden.');
}
async function hash(password){const salt=crypto.randomBytes(16).toString('base64url');return `scrypt$32768$8$3$${salt}$${(await derive(password,salt)).toString('base64url')}`;}
async function matches(password,encoded){
  const parts=(encoded||'').split('$');
  const valid=parts.length===6&&parts.slice(0,4).join('$')==='scrypt$32768$8$3'&&/^[\w-]{22}$/.test(parts[4])&&/^[\w-]{86}$/.test(parts[5]);
  const actual=await derive(password,valid?parts[4]:'qori-unknown-account-salt');
  return valid&&crypto.timingSafeEqual(actual,Buffer.from(parts[5],'base64url'));
}
async function attempt(email){
  const key=crypto.createHmac('sha256',env.jwtSecret).update('password:'+email).digest('hex');
  const row=(await query(`insert into customer_login_attempts(key_hash,attempts,window_started) values($1,1,now())
    on conflict(key_hash) do update set attempts=case when customer_login_attempts.window_started<now()-interval '15 minutes' then 1 else customer_login_attempts.attempts+1 end,
    window_started=case when customer_login_attempts.window_started<now()-interval '15 minutes' then now() else customer_login_attempts.window_started end returning attempts`,[key])).rows[0];
  if(row.attempts>10)throw tooManyRequests('Demasiados intentos. Espera 15 minutos o entra con un código de correo.');
  return key;
}
async function request(email,password,confirmation){validate(password,confirmation);await attempt(email.trim().toLowerCase());return require('./customerAuthService').requestCode(email,{passwordHash:await hash(password)});}
async function login(email,password){
  email=email.trim().toLowerCase();
  if(typeof password!=='string'||password.length>128)throw unauthorized('Correo o contraseña incorrectos.');
  const key=await attempt(email);
  const candidate=(await query(`select c.customer_id,c.password_hash from customer_password_credentials c join customer_accounts a on a.id=c.customer_id where a.email=$1`,[email])).rows[0];
  if(!await matches(password,candidate?.password_hash))throw unauthorized('Correo o contraseña incorrectos.');
  return withTransaction(async db=>{
    const account=(await db.query('select * from customer_accounts where id=$1 for update',[candidate.customer_id])).rows[0];
    const credential=(await db.query('select password_hash from customer_password_credentials where customer_id=$1',[candidate.customer_id])).rows[0];
    if(!account||credential?.password_hash!==candidate.password_hash)throw unauthorized('Vuelve a iniciar sesión con tu contraseña actual.');
    await db.query('delete from customer_login_attempts where key_hash=$1',[key]);
    return require('./customerAuthService').createSession(db,account,'Qori Customer · Contraseña');
  });
}
module.exports={request,login,hash,matches,validate};
