// Local synthetic preview only. This launcher is not used by server.js or Render.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55489/qori_invoice_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.QORI_INVOICE_SANDBOX_ENABLED='true';
process.env.AGENDA_PUSH_WORKER_ENABLED='false';process.env.PUBLIC_APP_URL='http://127.0.0.1:3197';
process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
const dir=path.join(__dirname,'../.qa-invoice');fs.mkdirSync(dir,{recursive:true});
const file=path.join(dir,'demo-keys.json');
if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify({encryption:crypto.randomBytes(32).toString('hex'),identity:crypto.randomBytes(32).toString('hex')}));
const keys=JSON.parse(fs.readFileSync(file,'utf8'));
process.env.QORI_INVOICE_ENCRYPTION_KEY=keys.encryption;process.env.QORI_INVOICE_IDENTITY_KEY=keys.identity;
const {query,pool}=require('../backend/src/config/db'),cfg=require('../backend/src/invoice/config'),svc=require('../backend/src/invoice/service');
const express=require('express'),{fixture}=require('../test/fixtures/qoriInvoice');
async function person(email,name,document){
 let a=(await query("insert into customer_accounts(email,full_name,declared_document_key,document_locked_at,finance_setup_state) values($1,$2,$3,now(),'LEGACY') on conflict(email) do update set full_name=excluded.full_name returning *",[email,name,document.toLowerCase()])).rows[0];
 await require('../backend/src/services/customerFinanceBooks').ensure(a);
 a.book=(await query('select * from customer_finance_books where customer_id=$1 and is_default',[a.id])).rows[0];
 a.token=crypto.randomBytes(32).toString('base64url');
 await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '4 hours')",[a.id,cfg.hash(a.token)]);return a;
}
(async()=>{
 const owner=await person('invoice.developer@example.invalid','Integrador de prueba','SANDBOXDEVELOPER001');
 const buyer=await person('invoice.consumer@example.invalid','Consumidor de prueba','SANDBOXBUYER001');
 await query("insert into invoice_identity_attestations(customer_id,identity_hmac,method,evidence_reference,expires_at) values($1,$2,'SANDBOX_FIXTURE','LOCAL_PREVIEW',now()+interval '1 day') on conflict(identity_hmac) where revoked_at is null do update set expires_at=excluded.expires_at",[buyer.id,cfg.identity('13','SANDBOXBUYER001')]);
 const partner=(await svc.register(owner,'Integrador de demostración')).partner;
 const prior=(await svc.overview(owner)).apps;
 const app=prior[0]||(await svc.createApp(owner,partner.id,'POS · Demostración Qori')).app;
 await svc.listing(owner,app.id,true);await svc.authorizeFixture(owner,app.id);
 await svc.grant(buyer,{app_id:app.id,book_id:buyer.book.id});
 const credential=await svc.createKey(owner,app.id);
 const principal=await svc.machine(credential.secret,'invoices:write');
 await svc.receive(principal,'local-preview-v1',{issuer_nit:'900000000',xml:fixture()});
 await svc.processOne();await svc.revokeKey(owner,app.id,credential.key.id);
 const host=express();
 // A loopback-only test session shortcut exists only in this standalone fixture launcher.
 host.get('/__invoice-demo/:role',(req,res)=>{
  if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return res.sendStatus(403);
  const a=req.params.role==='developer'?owner:req.params.role==='customer'?buyer:null;if(!a)return res.sendStatus(404);
  res.cookie('qori_customer_session',a.token,{httpOnly:true,sameSite:'strict',path:'/'});
  res.set('Cache-Control','no-store').redirect(req.params.role==='developer'?'/developers/':'/customer/invoices/');
 });
 host.use(require('../backend/src/app').app);
 const server=host.listen(3197,'127.0.0.1',()=>console.log('Preview local: http://127.0.0.1:3197/__invoice-demo/developer | /__invoice-demo/customer'));
 let busy=false;const timer=setInterval(async()=>{if(busy)return;busy=true;try{await svc.processOne();}catch{console.error('SANDBOX_WORKER_UNAVAILABLE');}finally{busy=false;}},1000);
 const stop=()=>{clearInterval(timer);server.close(()=>pool.end());};process.on('SIGINT',stop);process.on('SIGTERM',stop);
})().catch(()=>{console.error('INVOICE_PREVIEW_START_FAILED');process.exitCode=1;pool.end();});

