const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),jwt=require('jsonwebtoken'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='points-qa-local';process.env.PUBLIC_APP_URL='http://127.0.0.1:3138';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
for(const name of ['RESEND_API_KEY','SMTP_HOST','SMTP_USER','SMTP_PASS','MERCADO_PAGO_ACCESS_TOKEN'])process.env[name]='';
const {query,pool,withTransaction}=require('../backend/src/config/db');
const svc=require('../backend/src/services/affiliateCatalogService');
const {app}=require('../backend/src/app');
const {getQrDetails,redeemQr}=require('../backend/src/services/qrService');
const {cancelStrategicQr}=require('../backend/src/services/strategicQrService');
let server,base;
const uuid=()=>crypto.randomUUID();
before(async()=>{assert.equal((await query('select current_database() db')).rows[0].db,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;require('../backend/src/config/env').env.publicAppUrl=base;});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(r=>server.close(r));await pool.end();});
async function fixture({balance=1000,credits=10,stock=20}={}){
 const b=(await query("insert into businesses(name,slug,plan_code,subscription_status) values('Vitrina puntos QA',$1,'PRO','ACTIVE') returning *",['points-'+uuid()])).rows[0];
 const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','Owner QA','BUSINESS_OWNER') returning *",[b.id,uuid()+'@example.test'])).rows[0];
 const a=(await query("insert into affiliates(business_id,full_name,document_id,qr_token,points_total) values($1,'Titular QA',$2,$3,$4) returning *",[b.id,'QA'+uuid().replaceAll('-',''),crypto.randomBytes(32).toString('hex'),balance])).rows[0];
 const c=(await query("insert into smart_catalogs(business_id,title,slug,status,whatsapp_number,metadata) values($1,'Premios QA',$2,'ACTIVE','573001234567',$3) returning *",[b.id,'points-'+uuid(),{redemption_mode:'AFFILIATE_POINTS'}])).rows[0];
 const ip=(await query("insert into business_inventory_products(business_id,internal_id,name,stock_quantity,redemption_points_cost) values($1,$2,'Café QA',$3,100) returning *",[b.id,uuid(),stock])).rows[0];
 const p=(await query("insert into smart_catalog_products(business_id,catalog_id,inventory_product_id,name,slug,price) values($1,$2,$3,'Café QA','cafe',10000) returning *",[b.id,c.id,ip.id])).rows[0];
 const p2=(await query("insert into smart_catalog_products(business_id,catalog_id,name,slug,metadata) values($1,$2,'Asesoría QA','asesoria',$3) returning *",[b.id,c.id,{redemption_points_cost:250}])).rows[0];
 await query('insert into business_qr_credit_accounts(business_id,qr_balance) values($1,$2)',[b.id,credits]);
 return {b,u,a,c,p,p2,ip,auth:{card_token:a.qr_token,document_id:a.document_id}};
}
async function state(f){return (await query(`select a.points_total,c.qr_balance,(select count(*)::int from affiliate_catalog_tickets where business_id=$1) tickets,(select count(*)::int from affiliate_point_ledger where business_id=$1) ledger from affiliates a join business_qr_credit_accounts c on c.business_id=a.business_id where a.id=$2`,[f.b.id,f.a.id])).rows[0];}
async function prepare(f,items=[{product_id:f.p.id,quantity:1}],identity=f.auth,account){const q=await svc.quote(f.c.slug,{...identity,items},account);return {...identity,request_id:uuid(),quote_token:q.quote_token,document_notice_accepted:true};}
async function token(t){return (await query('select q.token from qr_codes q join affiliate_catalog_tickets t on t.qr_code_id=q.id where t.id=$1',[t.id])).rows[0].token;}
const redeemBody=f=>({idempotency_key:uuid(),mode:'STANDALONE',document_physically_checked:true,beneficiary:{name:f.a.full_name,document_id:f.a.document_id,data_use_confirmed:true},purchase:{subtotal:0,line_items:[]}});
async function http(path,body,auth){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
test('multi-product ticket debits exact points, one merchant credit, reserves linked inventory, creates no money sale',async()=>{
 const f=await fixture();const issued=await svc.issue(f.c.slug,await prepare(f,[{product_id:f.p.id,quantity:2},{product_id:f.p2.id,quantity:1}]));
 assert.equal(issued.ticket.total_points,450);assert.equal(issued.balance,550);assert.equal(issued.ticket.snapshot.items.length,2);assert.match(issued.ticket.qr_image,/^data:image\/png/);
 assert.deepEqual(await state(f),{points_total:550,qr_balance:9,tickets:1,ledger:1});
 assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[f.ip.id])).rows[0].stock_quantity),18);
 assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[f.b.id])).rows[0].n,0);
});
test('document alone, wrong card document and another business card cannot access balance or spend',async()=>{
 const f=await fixture(),other=await fixture();
 for(const auth of [{document_id:f.a.document_id},{...f.auth,document_id:'WRONG'},{...other.auth}])await assert.rejects(()=>svc.identity(f.c.slug,auth),/carné y el documento/);
 assert.deepEqual(await state(f),{points_total:1000,qr_balance:10,tickets:0,ledger:0});
});
test('insufficient points, foreign products, hidden products and zero point cost fail without charges',async()=>{
 const f=await fixture({balance:99}),other=await fixture();await assert.rejects(()=>prepare(f),/insuficientes/);
 await assert.rejects(()=>prepare(other,[{product_id:f.p.id,quantity:1}]),/no está disponible/);
 await query("update smart_catalog_products set stock_status='HIDDEN' where id=$1",[other.p.id]);await assert.rejects(()=>prepare(other),/no está disponible/);
 await query("update smart_catalog_products set metadata='{}' where id=$1",[other.p2.id]);await assert.rejects(()=>prepare(other,[{product_id:other.p2.id,quantity:1}]),/no está disponible/);
 assert.equal((await state(f)).points_total,99);assert.equal((await state(other)).tickets,0);
});
test('no merchant credits rolls back QR, points ledger and inventory',async()=>{
 const f=await fixture({credits:0});await assert.rejects(()=>prepare(f).then(body=>svc.issue(f.c.slug,body)),/tickets disponibles/);assert.deepEqual(await state(f),{points_total:1000,qr_balance:0,tickets:0,ledger:0});assert.equal((await query('select count(*)::int n from qr_codes where business_id=$1',[f.b.id])).rows[0].n,0);
});
test('concurrent repeated emission consumes one credit and one point debit; response can be recovered',async()=>{
 const f=await fixture(),body=await prepare(f);const result=await Promise.all([svc.issue(f.c.slug,body),svc.issue(f.c.slug,body)]);assert.equal(result[0].ticket.id,result[1].ticket.id);assert.deepEqual(await state(f),{points_total:900,qr_balance:9,tickets:1,ledger:1});
 await query("update smart_catalogs set status='PAUSED' where id=$1",[f.c.id]);assert.equal((await svc.issue(f.c.slug,body)).existing,true);
});
test('concurrent different requests cannot overspend a card or the last merchant credit',async()=>{
 for(const options of [{balance:100},{credits:1}]){const f=await fixture(options),a=await prepare(f),b=await prepare(f);const results=await Promise.allSettled([svc.issue(f.c.slug,a),svc.issue(f.c.slug,b)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await state(f)).tickets,1);assert.equal((await state(f)).points_total,(options.balance??1000)-100);}
});
test('changed prices, expired reviews, invalid document acceptance, inactive cards and paused catalogs cannot issue',async()=>{
 const f=await fixture(),body=await prepare(f);await query("update smart_catalog_products set metadata=$2 where id=$1",[f.p.id,{redemption_points_cost:120}]);await assert.rejects(()=>svc.issue(f.c.slug,body),/cambió/);
 const fresh=await prepare(f),claim=jwt.verify(fresh.quote_token,process.env.JWT_SECRET);claim.exp=Math.floor(Date.now()/1000)-1;await assert.rejects(()=>svc.issue(f.c.slug,{...fresh,quote_token:jwt.sign(claim,process.env.JWT_SECRET)}),/venció/);
 await assert.rejects(()=>svc.issue(f.c.slug,{...fresh,document_notice_accepted:false}));
 await query("update affiliates set status='INACTIVE' where id=$1",[f.a.id]);await assert.rejects(()=>svc.issue(f.c.slug,fresh));await query("update affiliates set status='ACTIVE' where id=$1",[f.a.id]);await query("update smart_catalogs set status='PAUSED' where id=$1",[f.c.id]);await assert.rejects(()=>svc.issue(f.c.slug,fresh));assert.equal((await state(f)).tickets,0);
});
test('Validator shows immutable items and document, refuses foreign tenant, mismatch, missing physical check and double redemption',async()=>{
 const f=await fixture(),other=await fixture(),issued=await svc.issue(f.c.slug,await prepare(f,[{product_id:f.p.id,quantity:2},{product_id:f.p2.id,quantity:1}])),qrToken=await token(issued.ticket);
 await query("update smart_catalog_products set name='Nombre cambiado',metadata=$2 where id=$1",[f.p.id,{redemption_points_cost:999}]);
 const details=await getQrDetails(qrToken,f.u);assert.equal(details.points_ticket.items[0].name,'Café QA');assert.equal(details.points_ticket.items[0].quantity,2);assert.equal(details.player.document_id,f.a.document_id);assert.equal(details.beneficiary.document_required,true);
 assert.equal((await getQrDetails(qrToken,other.u)).allowed,false);await assert.rejects(()=>redeemQr(qrToken,other.u,redeemBody(f)));
 await assert.rejects(()=>redeemQr(qrToken,f.u,{...redeemBody(f),document_physically_checked:false}),/documento físico/);
 await assert.rejects(()=>redeemQr(qrToken,f.u,{...redeemBody(f),beneficiary:{...redeemBody(f).beneficiary,document_id:'WRONG'}}),/documento físico/);
 await assert.rejects(()=>redeemQr(qrToken,f.u,{...redeemBody(f),mode:'PURCHASE'}),/pagado con puntos/);
 const body=redeemBody(f),redeemed=await redeemQr(qrToken,f.u,body);assert.equal(redeemed.status,'REDEEMED');assert.equal(redeemed.redemption.metadata.points_ticket.total_points,450);assert.equal(redeemed.sale,null);assert.equal((await redeemQr(qrToken,f.u,body)).idempotent_replay,true);await assert.rejects(()=>redeemQr(qrToken,f.u,redeemBody(f)),/ya fue redimido/);assert.equal((await state(f)).points_total,550);
});
test('cancellation refunds points and inventory once and makes the QR unusable; consumed ticket remains charged',async()=>{
 const f=await fixture(),issued=await svc.issue(f.c.slug,await prepare(f));const row=(await query('select * from affiliate_catalog_tickets where id=$1',[issued.ticket.id])).rows[0];
 await cancelStrategicQr(f.b.id,row.qr_code_id,f.u);await cancelStrategicQr(f.b.id,row.qr_code_id,f.u);assert.deepEqual(await state(f),{points_total:1000,qr_balance:9,tickets:1,ledger:2});assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[f.ip.id])).rows[0].stock_quantity),20);assert.equal((await svc.ticket(f.c.slug,row.id,f.auth)).ticket.qr_image,null);
});
test('Customer authenticated ownership selects only the matching business card, never name or phone matches',async()=>{
 const f=await fixture(),foreign=await fixture();const account=(await query("insert into customer_accounts(email,full_name,declared_document_key,finance_setup_state) values($1,$2,$3,'LEGACY') returning *",[uuid()+'@example.test','Titular QA',f.a.document_id.toLowerCase()])).rows[0];
 await query("insert into customer_relationships(customer_id,business_id,document_key,state,include_history,accepted_at) values($1,$2,$3,'ACCEPTED',true,now())",[account.id,f.b.id,f.a.document_id.toLowerCase()]);
 const session=await withTransaction(db=>require('../backend/src/services/customerAuthService').createSession(db,account,'QA'));
 const path='/api/customer/points-catalogs/'+f.c.slug;
 assert.equal((await http(path+'/identity',{affiliate_id:f.a.id})).status,401);
 const identityResult=await http(path+'/identity',{affiliate_id:f.a.id},session.token);assert.equal(identityResult.status,200,JSON.stringify(identityResult));assert.equal(identityResult.data.affiliate.points_total,1000);
 const cookieHeaders={'Content-Type':'application/json',Cookie:'qori_customer_session='+session.token,'X-Qori-Web':'1',Origin:base};
 const cookieResult=await fetch(base+path+'/identity',{method:'POST',headers:cookieHeaders,body:JSON.stringify({affiliate_id:f.a.id})});assert.equal(cookieResult.status,200,await cookieResult.text());
 const csrfResult=await fetch(base+path+'/identity',{method:'POST',headers:{...cookieHeaders,Origin:'https://other.example'},body:JSON.stringify({affiliate_id:f.a.id})});assert.equal(csrfResult.status,403);
 assert.equal((await http('/api/customer/points-catalogs/'+foreign.c.slug+'/identity',{affiliate_id:foreign.a.id},session.token)).status,403);
 const q=await http(path+'/quote',{affiliate_id:f.a.id,items:[{product_id:f.p.id,quantity:1}]},session.token);assert.equal(q.status,200);
 const issued=await http(path+'/issue',{affiliate_id:f.a.id,request_id:uuid(),quote_token:q.data.quote_token,document_notice_accepted:true},session.token);assert.equal(issued.status,200);assert.equal(issued.data.balance,900);
 const catalogs=await svc.catalogsForAffiliate(account,f.a.id);assert.equal(catalogs[0].id,f.c.id);
 await query("update customer_relationships set state='REVOKED' where customer_id=$1",[account.id]);assert.equal((await http(path+'/identity',{affiliate_id:f.a.id},session.token)).status,403);
});
test('points catalog refuses WhatsApp ordering and cash-delivery path; RLS exposes no direct table privileges',async()=>{
 const f=await fixture();await assert.rejects(()=>require('../backend/src/services/smartCatalogService').createWhatsappIntent(f.c.slug,f.p.id,{customer_name:'QA',customer_phone:'3001234567',customer_document_type:'CC',customer_document:'12345'}),/carrito de puntos/);
 assert.equal((await require('../backend/src/services/catalogOrderService').publicConfig(f.c.slug)).enabled,false);
 assert.equal((await query("select relrowsecurity from pg_class where oid='affiliate_catalog_tickets'::regclass")).rows[0].relrowsecurity,true);
 const grants=(await query("select grantee from information_schema.role_table_grants where table_name='affiliate_catalog_tickets' and grantee in ('anon','authenticated','PUBLIC')")).rows;assert.equal(grants.length,0);
});
async function until(fn){const end=Date.now()+5000;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('UI timeout');}
test('merchant publishes a points catalog and editor product; public view immediately reflects a changed mode',async()=>{
 const f=await fixture(),env=require('../backend/src/config/env').env;
 const auth=jwt.sign({sub:f.u.id,password_version:f.u.password_version,session_version:env.appSessionVersion},env.jwtSecret);
 const created=await http('/api/business/catalogs',{title:'Premios publicados',slug:'published-'+uuid(),whatsapp_number:'573001234567',status:'ACTIVE',metadata:{redemption_mode:'AFFILIATE_POINTS'}},auth);
 assert.equal(created.status,201,JSON.stringify(created));const c=created.data.catalog;
 const source=fs.readFileSync('empresa/js/app.js','utf8'),d=new JSDOM(fs.readFileSync('empresa/index.html','utf8'),{runScripts:'outside-only'}),w=d.window;
 try{
  const block=(start,end)=>source.slice(source.indexOf('function '+start+'('),source.indexOf('function '+end+'('));
  w.eval('const findInventoryProduct=()=>null,OPEN_PRODUCT_VALUE="open";'+block('smartCatalogFormPayload','smartCatalogProductBenefits')+block('prepareSmartCatalogProductPayload','ensureSmartCatalogUxStyles'));
  const form=w.document.querySelector('#smartCatalogProductForm');form.elements.name.value='Producto publicado';form.elements.redemption_points_cost.value='175';
  const payload=w.prepareSmartCatalogProductPayload(w.smartCatalogFormPayload(form));payload.is_featured=false;
  const product=await http('/api/business/catalogs/'+c.id+'/products',payload,auth);assert.equal(product.status,201,JSON.stringify(product));
  const visible=await http('/api/public/points-catalogs/'+c.slug);assert.equal(visible.data.products[0].points_cost,175);
  const cached=await http('/api/public/catalogs/'+c.slug);assert.equal(cached.data.catalog.metadata.redemption_mode,'AFFILIATE_POINTS');
  const changed=await fetch(base+'/api/business/catalogs/'+c.id,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth},body:JSON.stringify({metadata:{redemption_mode:'COMMERCE'}})});assert.equal(changed.status,200,await changed.text());
  assert.equal((await http('/api/public/catalogs/'+c.slug)).data.catalog.metadata.redemption_mode,'COMMERCE');
 }finally{w.close();}
});
function storefrontDom(f,{lost=false}={}){
 const d=new JSDOM(fs.readFileSync('smart-catalog/index.html','utf8'),{url:base+'/c/'+f.c.slug+'#card='+f.a.qr_token,runScripts:'outside-only',pretendToBeVisual:true});const w=d.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.fetch=async(p,o)=>{const r=await fetch(new URL(p,base),o);if(lost&&p.endsWith('/issue')&&r.ok){lost=false;await r.json();throw Error('lost response');}return r;};
 for(const file of ['points.js','orders.js','app.js'])w.eval(fs.readFileSync('smart-catalog/'+file,'utf8'));return d;
}
async function uiCheckout(f,d){const w=d.window,$=s=>w.document.querySelector(s);await until(()=>$('#qp-cart')&&!$('[data-order-product="'+f.p.id+'"]').disabled);$('[data-order-product="'+f.p.id+'"]').click();$('#qp-qty').value='2';$('#qp-add').click();$('#qp-cart').click();$('#qp-review').click();const form=$('#qp-identity');form.elements.document_id.value=f.a.document_id;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>$('#qp-review')?.textContent==='Revisar canje');$('#qp-review').click();await until(()=>$('#qp-body input[name=notice]'));$('#qp-body input[name=notice]').checked=true;$('#qp-body form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));}
test('public storefront real DOM adds quantities, verifies card+document, totals points and displays generated QR',async()=>{const f=await fixture(),d=storefrontDom(f);try{await uiCheckout(f,d);await until(()=>d.window.document.querySelector('.qp-qr'));assert.match(d.window.document.querySelector('#qp-body').textContent,/200 puntos/);assert.match(d.window.document.querySelector('#qp-body').textContent,/documento de identidad físico/);assert.equal((await state(f)).points_total,800);assert.equal(d.window.document.querySelector('#intentModal').classList.contains('hidden'),true);}finally{d.window.close();}});
test('lost emission response is recovered from real storefront without another debit',async()=>{const f=await fixture(),d=storefrontDom(f,{lost:true});try{await uiCheckout(f,d);await until(()=>[...d.window.document.querySelectorAll('#qp-body button')].some(b=>b.textContent==='Recuperar ticket'));[...d.window.document.querySelectorAll('#qp-body button')].find(b=>b.textContent==='Recuperar ticket').click();await until(()=>d.window.document.querySelector('.qp-qr'));assert.deepEqual(await state(f),{points_total:800,qr_balance:9,tickets:1,ledger:1});}finally{d.window.close();}});
test('private receipt and card history remain usable after catalog pause and show redeemed state without QR',async()=>{
 const f=await fixture(),issued=await svc.issue(f.c.slug,await prepare(f)),qrToken=await token(issued.ticket);
 await query("update smart_catalogs set status='PAUSED' where id=$1",[f.c.id]);
 const card=await require('../backend/src/services/affiliateService').getPublicAffiliateCard(f.a.qr_token);assert.equal(card.points_tickets[0].receipt_url,issued.ticket.receipt_url);
 const d=new JSDOM(fs.readFileSync('smart-catalog/puntos-ticket.html','utf8'),{url:base+issued.ticket.receipt_url,runScripts:'outside-only'});
 try{d.window.fetch=(p,o)=>fetch(new URL(p,base),o);d.window.eval(fs.readFileSync('smart-catalog/points.js','utf8'));await until(()=>d.window.document.querySelector('.qp-qr'));await redeemQr(qrToken,f.u,redeemBody(f));d.window.document.querySelector('#qp-refresh').click();await until(()=>d.window.document.body.textContent.includes('Canje entregado'));assert.equal(d.window.document.querySelector('.qp-qr'),null);}finally{d.window.close();}
 assert.equal((await http('/api/public/points-catalogs/tickets/'+uuid())).status,404);
});
test('linked inventory cannot be overspent or borrowed from another business',async()=>{
 const f=await fixture({stock:1}),other=await fixture();await assert.rejects(()=>prepare(f,[{product_id:f.p.id,quantity:2}]),/existencias/);
 await query('update smart_catalog_products set inventory_product_id=$2 where id=$1',[f.p.id,other.ip.id]);await assert.rejects(()=>prepare(f),/no está disponible/);assert.equal((await state(f)).tickets,0);
});
test('real Validator renderer lists products and requires explicit physical-document confirmation',async()=>{
 const f=await fixture(),issued=await svc.issue(f.c.slug,await prepare(f,[{product_id:f.p.id,quantity:2},{product_id:f.p2.id,quantity:1}]));const details=await getQrDetails(await token(issued.ticket),f.u);
 const source=fs.readFileSync('empresa/js/app.js','utf8'),d=new JSDOM(fs.readFileSync('empresa/index.html','utf8'),{url:base+'/empresa/',runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
 try{
  const declarations=source.match(/^const validator\w+ = document\.getElementById\([^\n]+/gm).join('\n');
  const block=(start,end)=>source.slice(source.indexOf('function '+start+'('),source.indexOf('function '+end+'('));
  w.data=details;w.eval(declarations+`\nconst state={validatorLastValidation:data};
   const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const validatorIsTransferableTicket=()=>false,validatorKindLabel=()=>'',validatorTokenPreview=()=>'',benefitProductScopeLabel=()=>'',benefitFulfillmentLabel=()=>'',formatDate=()=>'',money=v=>String(v),resetValidatorCustomerLookup=()=>{},rewardPassBalancePreview=()=>{};
  `+block('renderValidatorBeneficiary','collectValidatorBeneficiary')+block('collectValidatorBeneficiary','setValidatorOperationState')+block('setValidatorResult','resetValidatorSaleForm')+'\nsetValidatorResult("ok","Ticket válido","",data);window.collect=collectValidatorBeneficiary;');
  assert.match(w.document.querySelector('#validatorPointsTicket').textContent,/2 × Café QA/);assert.match(w.document.querySelector('#validatorPointsTicket').textContent,/1 × Asesoría QA/);assert.match(w.document.querySelector('#validatorPointsTicket').textContent,/450/);
  assert.throws(()=>w.collect(),/documento físico/);w.document.querySelector('#validatorPointsDocumentChecked').checked=true;
  const documentField=w.document.querySelector('#validatorBeneficiaryDocumentInput');assert.equal(documentField.value,'');documentField.value=f.a.document_id;w.document.querySelector('#validatorBeneficiaryDataUseInput').checked=true;assert.equal(w.collect().document_id,f.a.document_id);
 }finally{w.close();}
});
