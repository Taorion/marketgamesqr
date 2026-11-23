// Standalone laboratory launcher. Never loaded by server.js or Render.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55489/qori_play_qa';
Object.assign(process.env,{DB_SSL:'false',NODE_ENV:'test',QORI_PLAY_SANDBOX_ENABLED:'true',QORI_INVOICE_SANDBOX_ENABLED:'true',AGENDA_PUSH_WORKER_ENABLED:'false',JWT_SECRET:crypto.randomBytes(32).toString('hex')});
process.env.QORI_PLAY_PUBLIC_ORIGIN||='http://127.0.0.1:3198';process.env.PUBLIC_APP_URL=process.env.QORI_PLAY_PUBLIC_ORIGIN;
const directory=path.join(__dirname,'../.qa-play');fs.mkdirSync(directory,{recursive:true});
const keyFile=path.join(directory,'demo-keys.json');if(!fs.existsSync(keyFile))fs.writeFileSync(keyFile,JSON.stringify({encryption:crypto.randomBytes(32).toString('hex'),identity:crypto.randomBytes(32).toString('hex')}));
const keys=JSON.parse(fs.readFileSync(keyFile,'utf8'));process.env.QORI_INVOICE_ENCRYPTION_KEY=keys.encryption;process.env.QORI_INVOICE_IDENTITY_KEY=keys.identity;
const {pool}=require('../backend/src/config/db'),svc=require('../backend/src/play/service'),cfg=require('../backend/src/play/config'),{fixture}=require('../test/fixtures/qoriPlay'),express=require('express');
let lease,stopRuntime,server;
(async()=>{
 lease=await pool.connect();if(!(await lease.query('select pg_try_advisory_lock_shared(53003817) ok')).rows[0].ok)throw Error('TEST_RUNNER_ACTIVE');
 const demo=await fixture({cap:2});
 // Keep the new application's one-time M2M secret out of output and disk.
 await require('../backend/src/invoice/service').revokeKey(demo.owner,demo.app.id,demo.key.key.id);
 const sponsor=await svc.sponsor(demo.user,demo.app.id,demo.source.id);
 const second=await svc.createCampaign(demo.app.id,{sponsor_id:sponsor.id,game_key:'orbita',max_sessions:100,config:{...demo.campaign.config,headline:'Órbita Qori · Cambia de carril',layout:'balanced'}});
 await svc.approve(demo.user,second.id,{reward_cap:0,reward_cost_minor:0,budget_minor:0,min_score:0});
 const host=express(),loopback=(req,res,next)=>['127.0.0.1','::ffff:127.0.0.1','::1'].includes(req.socket.remoteAddress)?next():res.sendStatus(403);
 host.use('/__play-demo',loopback,(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 host.get('/__play-demo/operator',(_req,res)=>{res.cookie('qori_customer_session',demo.owner.token,{httpOnly:true,sameSite:'strict',path:'/'});res.redirect('/play/operator/');});
 host.get('/__play-demo/customer',(_req,res)=>{res.cookie('qori_customer_session',demo.buyer.token,{httpOnly:true,sameSite:'strict',path:'/'});res.redirect('/play/rewards/');});
 host.get('/__play-demo/sponsor',(_req,res)=>res.type('html').send('<!doctype html><html lang="es"><meta charset="utf-8"><title>Sesión sintética</title><script src="/__play-demo/sponsor.js"></script><p>Abriendo patrocinador de laboratorio…</p></html>'));
 host.get('/__play-demo/sponsor.js',(_req,res)=>{const token=require('jsonwebtoken').sign({sub:demo.user.id,password_version:0,session_version:require('../backend/src/config/env').env.appSessionVersion},process.env.JWT_SECRET,{expiresIn:'4h'});res.type('js').send('localStorage.setItem("qr_business_portal_session_v1",'+JSON.stringify(JSON.stringify({token,user:{id:demo.user.id,business_id:demo.business.id}}))+');location.replace("/play/sponsor/");');});
 host.get('/__play-demo',(_req,res)=>res.type('html').send('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Laboratorio Qori Play</title><link rel="stylesheet" href="/play/styles.css"><main><h1>Qori Play · Laboratorio local</h1><p>Todos los datos y beneficios son sintéticos. Los accesos siguientes existen únicamente en este proceso de pruebas, desde loopback.</p><section><p><a href="/__play-demo/operator">1. Operador</a></p><p><a href="/play/screen/" target="_blank" rel="noopener">2. Pantalla</a></p><p><a href="/__play-demo/sponsor">Patrocinador</a></p><p><a href="/__play-demo/customer">Customer de prueba</a></p><p>Aplicación: '+demo.app.id+'</p><p>Campaña Empresa: '+demo.source.id+'</p></section><p>Usa ventanas separadas. El cambio de Customer en una pestaña cambia la sesión del mismo perfil de navegador.</p></main></html>'));
 host.use(require('../backend/src/app').app);
 const origin=new URL(cfg.origin()),tls=origin.protocol==='https:',port=Number(origin.port|| (tls?443:80));
 if(tls&&(!process.env.QORI_PLAY_TLS_KEY||!process.env.QORI_PLAY_TLS_CERT))throw Error('LAB_TLS_CERTIFICATE_REQUIRED');
 server=tls?require('https').createServer({key:fs.readFileSync(process.env.QORI_PLAY_TLS_KEY),cert:fs.readFileSync(process.env.QORI_PLAY_TLS_CERT)},host):require('http').createServer(host);
 stopRuntime=require('../backend/src/play/realtime').attach(server);
 server.listen(port,tls?(process.env.QORI_PLAY_BIND_HOST||'127.0.0.1'):'127.0.0.1',()=>console.log('Laboratorio: '+cfg.origin()+'/__play-demo'));
 async function stop(){await stopRuntime?.();server.close(async()=>{await lease.query('select pg_advisory_unlock_shared(53003817)');lease.release();await pool.end();});}
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
})().catch(async e=>{console.error('PLAY_PREVIEW_START_FAILED: '+(e.code||e.message));await stopRuntime?.();lease?.release();await pool.end();process.exitCode=1;});
