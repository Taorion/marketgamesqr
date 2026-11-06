const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { query, withTransaction } = require('../config/db');
const { env } = require('../config/env');
const { unauthorized, tooManyRequests, forbidden } = require('../utils/http');
const WEB_COOKIE='qori_customer_session';
const cookieOptions=()=>({httpOnly:true,secure:env.isProduction,sameSite:'strict',path:'/api/customer'});
function webToken(req){return (req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(WEB_COOKIE+'='))?.slice(WEB_COOKIE.length+1);}
function assertWebRequest(req){
  const origin=req.get('Origin');
  const expected=new URL(env.publicAppUrl).origin;
  const sameOrigin=`${req.protocol}://${req.get('host')}`;
  if(req.get('X-Qori-Web')!=='1'||!origin||![expected,sameOrigin].includes(origin))throw forbidden('Abre Qori Customer para continuar con esta operación.');
}
function setWebSession(res,result){res.cookie(WEB_COOKIE,result.token,{...cookieOptions(),expires:new Date(result.session.expires_at)});}
function clearWebSession(res){res.clearCookie(WEB_COOKIE,cookieOptions());}
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const codeHash = (id, code) => crypto.createHmac('sha256', env.jwtSecret).update(`${id}:${code}`).digest('hex');

function localMailboxEnabled(){
  return process.env.CUSTOMER_LOCAL_MAILBOX==='true'&&!env.isProduction&&
    ['127.0.0.1','localhost'].includes(new URL(env.databaseUrl).hostname)&&new URL(env.databaseUrl).pathname==='/qori_customer_qa';
}
async function status(){
  await query('select 1 from customer_accounts limit 1');
  return {ok:true,registration_available:Boolean(localMailboxEnabled()||(env.resendApiKey&&env.contactMailFrom))};
}

async function deliverCode(email, code, challengeId, recovery=false, passwordChange=false) {
  // Local mailbox is explicit, loopback-only and never available in production.
  const local = localMailboxEnabled();
  if (local) {
    const dir = path.resolve(__dirname, '../../../.local-customer/mailbox');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${challengeId}.json`), JSON.stringify({ email, code, challengeId }), { mode: 0o600 });
    return;
  }
  if (!env.resendApiKey) { const error = new Error('El acceso por correo no está configurado.'); error.status = 503; throw error; }
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.contactMailFrom, to: [email], subject: recovery?'Recupera tus beneficios en Qori':'Tu código de acceso a Qori',
      text: passwordChange?`Tu código para crear o cambiar la contraseña de Qori Customer es ${code}. Vence en 10 minutos. Al confirmarlo, se cerrarán tus sesiones anteriores. Úsalo únicamente si solicitaste esta contraseña en Qori. No lo compartas. Si no lo solicitaste, ignora este mensaje.`:recovery?`Tu código para recuperar tus beneficios anteriores en Qori Customer es ${code}. Vence en 10 minutos. Úsalo únicamente en la cuenta donde solicitaste la recuperación. No lo compartas. Si no lo solicitaste, ignora este mensaje.`:`Tu código de acceso es ${code}. Vence en 10 minutos. No lo compartas. Si no lo solicitaste, ignora este mensaje.` })
  });
  if (!result.ok) { const error = new Error('No pudimos enviar el código. Inténtalo más tarde.'); error.status = 503; throw error; }
}
async function requestCode(email,{passwordHash=null}={}) {
  email = email.trim().toLowerCase();
  const id = crypto.randomUUID(), code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await withTransaction(async db => {
    await db.query('select pg_advisory_xact_lock(hashtext($1))', [`customer-login:${email}`]);
    const { rows } = await db.query("select count(*)::int n from customer_challenges where email=$1 and created_at>now()-interval '15 minutes'", [email]);
    if (rows[0].n >= 5) throw tooManyRequests('Espera unos minutos antes de solicitar otro código.');
    await db.query('update customer_challenges set consumed_at=now() where email=$1 and consumed_at is null', [email]);
    await db.query('delete from customer_challenge_passwords where challenge_id in (select id from customer_challenges where email=$1)',[email]);
    await db.query("insert into customer_challenges(id,email,code_hash,expires_at) values($1,$2,$3,now()+interval '10 minutes')", [id,email,codeHash(id,code)]);
    if(passwordHash)await db.query('insert into customer_challenge_passwords(challenge_id,password_hash) values($1,$2)',[id,passwordHash]);
  });
  try { await deliverCode(email, code, id, false, Boolean(passwordHash)); }
  catch (error) { await query('update customer_challenges set consumed_at=now() where id=$1',[id]);await query('delete from customer_challenge_passwords where challenge_id=$1',[id]); throw error; }
  return { challenge_id: id, message: 'Revisa tu correo para continuar.' };
}
async function verifyCode(id, code, deviceName, {webConsent=false}={}) {
  const result = await withTransaction(async db => {
    const { rows } = await db.query('select * from customer_challenges where id=$1 for update', [id]);
    const challenge = rows[0];
    if (!challenge || challenge.consumed_at || challenge.attempts >= 5 || new Date(challenge.expires_at) <= new Date()) return null;
    await db.query('update customer_challenges set attempts=attempts+1 where id=$1',[id]);
    if (!crypto.timingSafeEqual(Buffer.from(challenge.code_hash),Buffer.from(codeHash(id,code)))) return null;
    await db.query('update customer_challenges set consumed_at=now() where id=$1',[id]);
    const account = (await db.query('insert into customer_accounts(email) values($1) on conflict(email) do update set email=excluded.email returning *',[challenge.email])).rows[0];
    const pending=(await db.query('delete from customer_challenge_passwords where challenge_id=$1 returning password_hash',[id])).rows[0];
    if(pending){
      await db.query('insert into customer_password_credentials(customer_id,password_hash) values($1,$2) on conflict(customer_id) do update set password_hash=excluded.password_hash,changed_at=now()',[account.id,pending.password_hash]);
      await db.query('delete from customer_sessions where customer_id=$1',[account.id]);
    }
    if(webConsent){
      const updated=await db.query(`update customer_accounts set preferences=preferences||jsonb_build_object('web_registration',jsonb_build_object('notice_version','2026-11-03','accepted_at',now()))
        where id=$1 and not preferences ? 'web_registration' returning preferences`,[account.id]);
      if(updated.rows[0])account.preferences=updated.rows[0].preferences;
    }
    return createSession(db,account,deviceName);
  });
  if (!result) throw unauthorized('Código inválido o vencido.');
  return result;
}
async function createSession(db,account,deviceName){
  const token=crypto.randomBytes(32).toString('base64url');
  const session=(await db.query("insert into customer_sessions(customer_id,token_hash,device_name,expires_at) values($1,$2,$3,now()+interval '30 days') returning id,expires_at",[account.id,hash(token),deviceName])).rows[0];
  return {token,session,account};
}
async function customerRequired(req, res, next) {
  res.set('Cache-Control','private, no-store');
  res.vary('Cookie');res.vary('Authorization');res.vary('X-Qori-Account');
  try {
    const bearer = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '')?.[1];
    const cookie=webToken(req);
    const token=bearer || (/^[A-Za-z0-9_-]{43}$/.test(cookie||'')?cookie:null);
    if (!token) throw unauthorized('Inicia sesión en Qori.');
    if(!bearer&&!['GET','HEAD','OPTIONS'].includes(req.method))assertWebRequest(req);
    const result = await query(`select a.*,s.id as session_id from customer_sessions s join customer_accounts a on a.id=s.customer_id
      where s.token_hash=$1 and s.expires_at>now()`,[hash(token)]);
    if (!result.rows[0]) throw unauthorized('Tu sesión venció. Vuelve a entrar.');
    const account=result.rows[0],expected=req.get('X-Qori-Account');
    // This is a consistency check, never an identity source. The session owns access.
    if(expected&&expected!==account.id){
      res.set('X-Qori-Session-Changed','1');
      throw Object.assign(new Error('La sesión cambió. Abre de nuevo tu cuenta para continuar.'),{status:409});
    }
    req.customer = account;res.set('X-Qori-Customer',account.id);
    // Email/password/OAuth prove access to the session, not completed registration.
    // Pending registrations can manage their own identity/session, but no portal data.
    if(!account.full_name?.trim()||!account.declared_document_key){
      const path=req.path.replace(/\/+$/,'').toLowerCase(),method=req.method;
      const allowed=(path==='/me'&&['GET','PATCH','DELETE'].includes(method))||
        (method==='GET'&&['/sessions','/export','/auth/security'].includes(path))||
        (method==='POST'&&(path==='/logout'||path==='/auth/oauth/link'||/^\/auth\/oauth\/(google|microsoft)\/start$/.test(path)))||
        (method==='DELETE'&&/^\/sessions\/[0-9a-f-]{36}$/.test(path));
      if(!allowed)throw forbidden('Completa tu registro con tu nombre y tu cédula confirmada para entrar a Qori Customer.',{code:'REGISTRATION_INCOMPLETE'});
    }
    next();
  } catch(error) { next(error); }
}
module.exports = { createSession,deliverBenefitCode:(email,code,id)=>deliverCode(email,code,id,true),requestCode, verifyCode, customerRequired,assertWebRequest,setWebSession,clearWebSession,status };
