const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
// Never use an environment-provided production connection for these tests.
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55439/quotes_qa';
process.env.DB_SSL='false';process.env.PUBLIC_APP_URL='http://localhost:3058';process.env.JWT_SECRET='quote-local-qa-only';
const {query,pool}=require('../backend/src/config/db');
const svc=require('../backend/src/services/quoteService');
const {quoteSchema}=require('../backend/src/routes/quoteRoutes');
const {renderQuotePdf}=require('../backend/src/services/quotePdfService');
const {PDFDocument}=require('pdf-lib');
const sharp=require('sharp');
const {publicAddress,storedLogo}=require('../backend/src/services/quoteImageService');
const bcrypt=require('bcryptjs');
let b,other,user,contact,product,foreignProduct,activation,foreignActivation,issued;
let server;
const payload=extra=>quoteSchema.parse({request_id:crypto.randomUUID(),title:'Una propuesta a tu medida',valid_until:new Date(Date.now()+7*86400000).toISOString(),
  contact_id:contact.id,contact_source:'MANUAL',items:[{product_id:product.id,quantity:2,unit_price:125000,discount_percent:10,tax_percent:19}],
  activation_id:activation.id,benefit_timing:'AFTER_PAYMENT',benefit_description:'Accede a una experiencia especial con tu compra.',
  payment_terms:'Transferencia al confirmar el pedido.',delivery_terms:'Entrega en 3 días hábiles.',terms:'Producto elaborado a mano. Conserva esta propuesta para consultar las condiciones.',...extra});
test('quotes: database, images, lifecycle and HTTP authorization',{skip:process.env.QUOTES_INTEGRATION!=='1'},async t=>{
  await t.test('create local tenant fixtures and real uploaded product photo',async()=>{
    const settings={subscription:{lifetime_access:true,monthly_payment_required:false},brand_primary:'#173e39',phone:'573001112233',contact_email:'ventas@example.test',nit:'900.123.456-7',address:'Calle de los artesanos 24',city:'Bogotá'};
    const logo=await sharp(Buffer.from('<svg width="300" height="120"><rect width="300" height="120" fill="#173e39"/><text x="24" y="76" fill="white" font-size="44" font-family="Arial">ATELIER</text></svg>')).png().toBuffer();settings.logo_data_url='data:image/png;base64,'+logo.toString('base64');
    b=(await query(`insert into businesses(name,slug,plan_code,subscription_status,settings) values ('Atelier de Colección QA',$1,'PRO','ACTIVE',$2) returning *`,['quotes-'+crypto.randomUUID(),settings])).rows[0];
    other=(await query(`insert into businesses(name,slug,plan_code,subscription_status) values ('Otro negocio QA',$1,'PRO','ACTIVE') returning *`,['quotes-other-'+crypto.randomUUID()])).rows[0];
    user=(await query(`insert into app_users(business_id,email,password_hash,full_name,role) values ($1,$2,$3,'Diseñadora QA','BUSINESS_OWNER') returning *`,[b.id,'quotes-'+crypto.randomUUID()+'@example.test',await bcrypt.hash('Quotes-local-2026!',10)])).rows[0];
    contact=(await query(`insert into business_manual_leads(business_id,name,email,phone,document_id) values ($1,'María Camila Restrepo','maria@example.test','573001234567','QA-100') returning *`,[b.id])).rows[0];
    product=(await query(`insert into business_inventory_products(business_id,internal_id,name,description,unit_price,cost_price,stock_quantity,sku) values ($1,'QT-QA','Bolso de cuero artesanal','Cuero natural, acabado artesanal y herrajes dorados. Una pieza pensada para acompañarte cada día.',125000,50000,20,'AT-001') returning *`,[b.id])).rows[0];
    foreignProduct=(await query(`insert into business_inventory_products(business_id,internal_id,name,unit_price) values ($1,'QT-OTHER','Privado',50000) returning *`,[other.id])).rows[0];
    const photo=await sharp(Buffer.from('<svg width="600" height="600"><rect width="600" height="600" fill="#eee8dc"/><ellipse cx="300" cy="480" rx="185" ry="25" fill="#d5c9b6"/><path d="M220 220 Q220 80 300 80 Q380 80 380 220" fill="none" stroke="#68432d" stroke-width="24"/><path d="M135 200 L465 200 L485 460 Q300 510 115 460 Z" fill="#9c6140"/><path d="M135 200 L465 200 L430 290 L170 290 Z" fill="#b37950"/><rect x="275" y="265" width="50" height="35" rx="7" fill="#d1b26d"/></svg>')).webp().toBuffer();
    await query('insert into business_inventory_product_photos(business_id,product_id,mime_type,image_data) values ($1,$2,$3,$4)',[b.id,product.id,'image/webp',photo]);
    const makeActivation=async bid=>(await query(`insert into interactive_activations(company_id,title,category,activation_type,status,public_slug,description,terms) values ($1,'Una experiencia para estrenar','commercial','OPEN_QUESTION','active',$2,'Un detalle especial para ti.','Sujeto a las condiciones de la activación. No acumulable.') returning *`,[bid,'quote-'+crypto.randomUUID()])).rows[0];
    activation=await makeActivation(b.id);foreignActivation=await makeActivation(other.id);
  });
  await t.test('schema rejects invalid monetary amounts, quantities and excess items',()=>{
    for(const change of [{quantity:0},{quantity:1.5},{unit_price:-1},{discount_percent:100},{tax_percent:101}])assert.equal(quoteSchema.safeParse({...payload(),items:[{...payload().items[0],...change}]}).success,false);
    assert.equal(quoteSchema.safeParse({...payload(),items:Array(31).fill(payload().items[0])}).success,false);
    assert.equal(svc.calculate([{quantity:3,unit_price:0.1,discount_percent:0,tax_percent:0}]).total,.3);
  });
  await t.test('logos cannot fetch private networks, non-HTTPS URLs or non-image data URLs',async()=>{
    for(const address of ['127.0.0.1','10.0.0.2','169.254.169.254','192.168.1.1','172.16.0.1','100.64.0.1','0.0.0.0','::1'])assert.equal(publicAddress(address),false);
    assert.equal(publicAddress('8.8.8.8'),true);
    await assert.rejects(()=>storedLogo({logo_url:'http://127.0.0.1/logo'},'https://gosqori.com'),/HTTPS/);
    await assert.rejects(()=>storedLogo({logo_url:'https://127.0.0.1/logo'},'https://gosqori.com'),/logo guardado/);
    await assert.rejects(()=>storedLogo({logo_data_url:'data:text/html;base64,AAAA'},'https://gosqori.com'),/imagen/);
  });
  await t.test('cross-tenant product, activation and contact are rejected',async()=>{
    await assert.rejects(()=>svc.save(b.id,user.id,payload({items:[{product_id:foreignProduct.id,quantity:1,unit_price:1}]})),/negocio/);
    await assert.rejects(()=>svc.save(b.id,user.id,payload({activation_id:foreignActivation.id})),/activación/);
    await assert.rejects(()=>svc.save(other.id,user.id,payload()),/not found/);
  });
  await t.test('creation is idempotent and snapshots WebP as a PDF-compatible image',async()=>{
    const input=payload();const results=await Promise.all([svc.save(b.id,user.id,input),svc.save(b.id,user.id,input)]);assert.equal(results[0].id,results[1].id);issued=results[0];
    assert.equal(issued.snapshot.total,267750);assert.equal(issued.snapshot.discount,25000);assert.equal(issued.snapshot.taxes,42750);
    assert.match(issued.snapshot.items[0].photo,/^data:image\/png;base64,/);assert.ok(issued.snapshot.business.logo);assert.equal(issued.public_url,null);
    await assert.rejects(()=>svc.detail(other.id,issued.id),/no encontrada/);
  });
  await t.test('draft can be edited; issued quote is immutable and creates contact history',async()=>{
    issued=await svc.save(b.id,user.id,payload({title:'Propuesta exclusiva para María'}),issued.id);
    const raw=(await query('select public_token from business_quotes where id=$1',[issued.id])).rows[0];await assert.rejects(()=>svc.publicDetail(raw.public_token),/no disponible/);
    issued=await svc.action(b.id,issued.id,'issue');assert.equal(issued.status,'SENT');assert.ok(issued.public_url);
    await assert.rejects(()=>svc.save(b.id,user.id,payload(),issued.id),/conserva/);
    assert.equal((await query('select count(*)::int as n from lead_events where business_id=$1 and source_id=$2',[b.id,contact.id])).rows[0].n,1);
  });
  await t.test('public payload excludes private IDs and costs; view is recorded',async()=>{
    const token=new URL(issued.public_url).hash.slice(1);const pub=await svc.publicDetail(token);assert.ok(pub.qr_image);assert.equal(pub.snapshot.customer.name,contact.name);
    assert.equal(pub.business_id,undefined);assert.equal(pub.sale_id,undefined);assert.equal(pub.snapshot.items[0].cost_price,undefined);
    assert.ok((await svc.detail(b.id,issued.id)).first_viewed_at);
    await assert.rejects(()=>svc.benefit(token),/registre el pago/);
  });
  await t.test('acceptance is idempotent and never creates revenue or stock movements',async()=>{
    const token=new URL(issued.public_url).hash.slice(1);await Promise.all([svc.respond(token,'ACCEPTED'),svc.respond(token,'ACCEPTED')]);
    assert.equal((await query('select count(*)::int as n from business_sales where business_id=$1',[b.id])).rows[0].n,0);
    assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[product.id])).rows[0].stock_quantity),20);
  });
  await t.test('concurrent payment creates one canonical sale and one stock movement',async()=>{
    await Promise.all([svc.convert(b.id,user,issued.id,'TRANSFER'),svc.convert(b.id,user,issued.id,'TRANSFER')]);
    const q=await svc.detail(b.id,issued.id);assert.equal(q.status,'CONVERTED');assert.ok(q.sale_id);
    assert.equal((await query('select count(*)::int as n from business_sales where business_id=$1',[b.id])).rows[0].n,1);
    assert.equal(Number((await query('select stock_quantity from business_inventory_products where id=$1',[product.id])).rows[0].stock_quantity),18);
    const sale=(await query('select * from business_sales where id=$1',[q.sale_id])).rows[0];assert.equal(Number(sale.sale_amount),267750);assert.equal(sale.metadata.products[0].quantity,2);
    assert.match(await svc.benefit(new URL(issued.public_url).hash.slice(1)),/\/activacion\//);
    await query("update business_sales set sale_status='VOIDED' where id=$1",[q.sale_id]);await assert.rejects(()=>svc.benefit(new URL(issued.public_url).hash.slice(1)),/registre el pago/);
    await query("update business_sales set sale_status='PAID' where id=$1",[q.sale_id]);
  });
  await t.test('tenant scoping applies to actions, reads, conversion and lists',async()=>{
    await assert.rejects(()=>svc.action(other.id,issued.id,'cancel'),/no encontrada/);await assert.rejects(()=>svc.convert(other.id,user,issued.id,'CASH'),/no encontrada/);
    assert.equal((await svc.list(other.id)).quotes.length,0);assert.equal((await svc.products(other.id)).some(p=>p.id===product.id),false);
  });
  await t.test('catalog changes cannot change previously issued photo, brand or prices',async()=>{
    await query("update business_inventory_products set name='Nombre posterior',unit_price=9999 where id=$1",[product.id]);
    await query("update businesses set settings=jsonb_set(settings,'{brand_primary}','\"#000000\"') where id=$1",[b.id]);
    const q=await svc.detail(b.id,issued.id);assert.equal(q.snapshot.items[0].name,'Bolso de cuero artesanal');assert.equal(q.snapshot.business.color,'#173e39');assert.equal(q.snapshot.total,267750);
  });
  await t.test('expiration, cancellation and paused activation block participation',async()=>{
    let q=await svc.save(b.id,user.id,payload({benefit_timing:'ON_ISSUE'}));q=await svc.action(b.id,q.id,'issue');const token=new URL(q.public_url).hash.slice(1);assert.match(await svc.benefit(token),/activacion/);
    await query("update interactive_activations set status='paused' where id=$1",[activation.id]);await assert.rejects(()=>svc.benefit(token),/no está disponible/);await query("update interactive_activations set status='active' where id=$1",[activation.id]);
    await query("update business_quotes set valid_until=now()-interval '1 second' where id=$1",[q.id]);assert.equal((await svc.detail(b.id,q.id)).status,'EXPIRED');await assert.rejects(()=>svc.respond(token,'ACCEPTED'),/no admite/);await assert.rejects(()=>svc.convert(b.id,user,q.id,'CASH'),/vigente/);await assert.rejects(()=>svc.benefit(token),/disponible/);
    await svc.action(b.id,q.id,'cancel');await assert.rejects(()=>svc.publicDetail(token),/no disponible/);
  });
  await t.test('RLS denies direct Data API roles',async()=>{
    assert.equal((await query("select relrowsecurity from pg_class where oid='business_quotes'::regclass")).rows[0].relrowsecurity,true);
    for(const role of ['anon','authenticated']){const exists=(await query('select 1 from pg_roles where rolname=$1',[role])).rowCount;if(exists)assert.equal((await query("select has_table_privilege($1,'business_quotes','select') as allowed",[role])).rows[0].allowed,false);}
  });
  await t.test('search finds padded quote numbers and titles; state counts stay tenant-scoped',async()=>{
    const draft=await svc.save(b.id,user.id,payload({title:'Propuesta 100% especial'}));
    const byNumber=await svc.list(b.id,0,`COT-${String(draft.number).padStart(6,'0')}`);
    assert.equal(byNumber.total_count,1);assert.equal(byNumber.quotes[0].id,draft.id);
    const byTitle=await svc.list(b.id,0,'100% especial','DRAFT');
    assert.equal(byTitle.total_count,1);assert.equal(byTitle.summary.DRAFT,1);
    assert.equal((await svc.list(b.id,0,'100_ especial')).total_count,0);
    assert.equal((await svc.list(other.id,0,'')).summary.ALL,0);
    assert.equal((await svc.list(b.id,0,'','CONVERTED')).quotes.every(q=>q.status==='CONVERTED'),true);
    await svc.action(b.id,draft.id,'issue');
    await query("update business_quotes set valid_until=now()-interval '1 second' where id=$1",[draft.id]);
    const expired=await svc.list(b.id,0,'100% especial','EXPIRED');
    assert.equal(expired.quotes[0].id,draft.id);assert.equal(expired.summary.EXPIRED,1);
    assert.equal((await svc.list(b.id,0,'100% especial','SENT')).total_count,0);
  });
  await t.test('public document escapes customer text and hides unavailable benefit links',()=>{
    const vm=require('node:vm'),sandbox={window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../quote-public/document.js'),'utf8'),sandbox);
    const q={...issued,status:'EXPIRED',benefit_url:'https://example.test/benefit',qr_image:null,snapshot:structuredClone(issued.snapshot)};
    q.snapshot.customer.name='<script>alert(1)</script>';
    const html=sandbox.window.QuoteDocument.html(q);
    assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('Abrir mi beneficio'));
    assert.ok(html.includes('ya no está disponible'));
    q.status='SENT';assert.ok(sandbox.window.QuoteDocument.html(q).includes('Abrir mi beneficio'));
  });
  await t.test('real HTTP routes require authentication and authorized role',async()=>{
    const {app}=require('../backend/src/app');server=app.listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/api/business/quotes`)).status,401);
    const jwt=require('jsonwebtoken');const token=jwt.sign({sub:user.id,password_version:0},process.env.JWT_SECRET);const headers={Authorization:`Bearer ${token}`};
    const result=await fetch(`${base}/api/business/quotes/context`,{headers});assert.equal(result.status,200,await result.text());
    assert.equal((await fetch(`${base}/api/business/quotes?status=INVALID`,{headers})).status,400);
    const filtered=await fetch(`${base}/api/business/quotes?status=CONVERTED`,{headers});assert.equal(filtered.status,200);assert.equal((await filtered.json()).total_count,1);
    const contactResponse=await fetch(`${base}/api/business/quotes/contacts?search=Mar%C3%ADa`,{headers});assert.equal(contactResponse.status,200,await contactResponse.text());
    await query("update app_users set role='VALIDATOR' where id=$1",[user.id]);assert.equal((await fetch(`${base}/api/business/quotes`,{headers})).status,403);await query("update app_users set role='BUSINESS_OWNER' where id=$1",[user.id]);
    assert.equal((await fetch(`${base}/api/public/quotes/invalid`)).status,404);
    const response=await fetch(`${base}/api/public/quotes/${new URL(issued.public_url).hash.slice(1)}/pdf`);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/pdf/);
  });
  await t.test('PDF exports real images, links and multi-page long conditions',async()=>{
    const q=await svc.detail(b.id,issued.id);const bytes=await renderQuotePdf(q),pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>=1);
    const dir=path.join(__dirname,'../tmp/quotes-qa');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'cotizacion-ejemplo.pdf'),bytes);
    const long=structuredClone(q);long.snapshot.items=Array.from({length:12},(_,i)=>({...q.snapshot.items[0],name:`Producto ${i+1} con descripción extensa`,description:'Detalles del producto con información de materiales y condiciones. '.repeat(9)}));long.snapshot.terms='Condiciones de entrega, pago y disponibilidad de productos. '.repeat(60);const longBytes=await renderQuotePdf(long);assert.ok((await PDFDocument.load(longBytes)).getPageCount()>3);fs.writeFileSync(path.join(dir,'cotizacion-larga.pdf'),longBytes);
    const light=structuredClone(q);light.snapshot.business.color='#ffffcc';light.snapshot.total=999999999999;light.snapshot.terms='Primera condición.\nSegunda condición.\nTercera condición.';
    const lightBytes=await renderQuotePdf(light);assert.ok((await PDFDocument.load(lightBytes)).getPageCount()>=1);fs.writeFileSync(path.join(dir,'cotizacion-marca-clara.pdf'),lightBytes);
    fs.writeFileSync(path.join(dir,'fixture.json'),JSON.stringify({business_id:b.id,user_id:user.id,email:user.email,password:'Quotes-local-2026!',quote_id:q.id,public_url:issued.public_url,product_id:product.id,activation_id:activation.id},null,2));
  });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});
