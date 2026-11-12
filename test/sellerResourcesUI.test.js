const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const {guides,productionAssets}=require('../backend/src/services/sellerResourceContent');
const until=async fn=>{for(let i=0;i<120;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');};
function setup({admin=false}={}){
 const w=new JSDOM('<main id="host"></main>',{url:'https://gosqori.com/seller/',runScripts:'outside-only'}).window,host=w.document.querySelector('main'),calls=[],downloads=[],copied=[];let current=true;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.onclose?.();};
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async value=>copied.push(value)},configurable:true});
 const file={id:'asset-1',resource_key:'cliente',kind:'FILE',state:'PUBLISHED',audience:'PROSPECT',stage:'PRESENT',title:'Cliente <img src=x>',description:'Prueba',usage:'Al presentar',version_label:'1',filename:'cliente.pdf',byte_size:10,revision:2};
 const data={admin,resources:[...guides,file],production_assets:productionAssets,presentation_url:'https://gosqori.com/conoce-qori/?seller=abc'};
 const ctx={admin,isCurrent:()=>current,download:async(...args)=>downloads.push(args),request:async(path,body,method)=>{calls.push({path,body,method});return body?{resource:{...body,id:'asset-1',revision:3,byte_size:10}}:data;}};
 w.eval(fs.readFileSync('seller/resources.js','utf8'));return {w,host,ctx,calls,downloads,copied,data,stop:()=>{current=false;}};
}
test('Seller library filters, escapes content, separates internal resources and shares personal wrapper',async()=>{
 const s=setup();try{await s.w.QoriSellerResources.render(s.host,s.ctx);assert.equal(s.host.querySelectorAll('[data-resource]').length,12);assert.equal(s.host.querySelector('img'),null);assert.equal(s.host.querySelector('[data-new]'),null);
  assert.equal(s.host.querySelector('[data-resource="bienvenida"] [data-share]'),null);s.host.querySelector('[data-presentation]').click();await until(()=>s.copied.length===1);assert.equal(new URL(s.copied[0]).searchParams.get('seller'),'abc');
  s.host.querySelector('[data-resource="asset-1"] [data-share]').click();await until(()=>s.copied.length===2);assert.equal(new URL(s.copied[1]).searchParams.get('recurso'),'asset-1');
  s.host.querySelector('[data-resource="asset-1"] [data-download]').click();await until(()=>s.downloads.length);assert.deepEqual(s.downloads[0],['/api/seller/resources/asset-1/download','cliente.pdf']);
  const audience=s.host.querySelector('[data-audience]');audience.value='PROSPECT';audience.onchange({target:audience});assert.equal(s.host.querySelector('[data-resource="bienvenida"]'),null);assert.equal(s.host.querySelectorAll('[data-resource]').length,5);
  const search=s.host.querySelector('[data-search]');search.value='preguntas';search.oninput({target:search});assert.equal(s.host.querySelectorAll('[data-resource]').length,1);
  Object.defineProperty(s.w.navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied');}}});s.host.querySelector('[data-presentation]').click();await until(()=>s.host.querySelector('[data-copy-fallback] textarea'));assert.match(s.host.querySelector('[data-copy-fallback] textarea').value,/seller=abc/);
 }finally{s.w.close();}
});
test('Admin resource editor uses explicit publication and optimistic revision; export and modal cleanup work',async()=>{
 const s=setup({admin:true});try{s.w.QoriSellerResources.openAdmin(s.ctx);await until(()=>s.w.document.querySelector('[data-new]'));const d=s.w.document.querySelector('dialog');assert.equal(d.querySelectorAll('form form').length,0);
  d.querySelector('[data-prompt]').click();d.querySelector('[data-brief]').click();await until(()=>s.downloads.length===2);
  d.querySelector('[data-new]').click();let f=d.querySelector('.qr-editor');assert.equal(f.elements.state.value,'DRAFT');assert.equal(f.elements.file.required,true);f.elements.kind.value='LINK';f.elements.kind.onchange();assert.equal(f.elements.url.required,true);assert.equal(f.elements.file.required,false);
  for(const [k,v] of Object.entries({resource_key:'nuevo_link',title:'Nuevo material',url:'https://gosqori.com/paquetes/',state:'PUBLISHED',audience:'PROSPECT'}))f.elements[k].value=v;
  await f.onsubmit({preventDefault(){}});let saved=s.calls.find(c=>c.body);assert.equal(saved.method,'POST');assert.equal(saved.body.state,'PUBLISHED');assert.equal(saved.body.file,undefined);
  d.querySelector('[data-resource="asset-1"] [data-edit]').click();f=d.querySelector('.qr-editor');f.elements.state.value='ARCHIVED';await f.onsubmit({preventDefault(){}});saved=s.calls.filter(c=>c.body).at(-1);assert.equal(saved.method,'PATCH');assert.equal(saved.body.expected_revision,3);assert.equal(saved.body.state,'ARCHIVED');
  s.w.QoriSellerResources.closeAdmin();assert.equal(s.w.document.querySelector('dialog'),null);
 }finally{s.w.close();}
});
test('stale library response cannot repaint after logout or a new view',async()=>{
 const s=setup();try{let resolve;const promise=new Promise(r=>resolve=r),work=s.w.QoriSellerResources.render(s.host,{...s.ctx,request:()=>promise});s.stop();s.host.innerHTML='Sesión cerrada';resolve(s.data);await work;assert.equal(s.host.textContent,'Sesión cerrada');}finally{s.w.close();}
});

test('candidate audience is selectable, filters by format and shares its separate opportunity route',async()=>{
 const s=setup();try{
  s.data.resources.push({id:'candidate-1',resource_key:'opportunity',kind:'FILE',state:'PUBLISHED',audience:'CANDIDATE',stage:'START',title:'Tu oportunidad',description:'Conoce Qori',usage:'Antes de solicitar acceso',version_label:'1',filename:'oportunidad.pdf',mime:'application/pdf',byte_size:100,revision:1});
  await s.w.QoriSellerResources.render(s.host,s.ctx);
  const a=s.host.querySelector('[data-audience]');a.value='CANDIDATE';a.onchange({target:a});assert.equal(a.value,'CANDIDATE');assert.equal(s.host.querySelectorAll('[data-resource]').length,1);
  const f=s.host.querySelector('[data-format]');f.value='PPTX';f.onchange({target:f});assert.equal(s.host.querySelectorAll('[data-resource]').length,0);f.value='PDF';f.onchange({target:f});
  s.host.querySelector('[data-share]').click();await until(()=>s.copied.length);const u=new URL(s.copied[0]);assert.equal(u.pathname,'/seller/');assert.equal(u.hash,'#sellerOpportunity');assert.equal(u.searchParams.get('recurso'),'candidate-1');assert.equal(u.searchParams.has('seller'),false);
 }finally{s.w.close();}
 const admin=setup({admin:true});try{await admin.w.QoriSellerResources.render(admin.host,admin.ctx);admin.host.querySelector('[data-new]').click();assert.ok(admin.host.querySelector('select[name="audience"] option[value="CANDIDATE"]'));}finally{admin.w.close();}
});
test('client presentation renders seven current plans and preserves prospect context at every signup CTA',async()=>{
 const w=new JSDOM(fs.readFileSync('conoce-qori/index.html','utf8'),{url:'https://gosqori.com/conoce-qori/?seller=abc&prospect_ref=signed&recurso=registro-y-pago',runScripts:'outside-only'}).window;
 try{const codes=['PENSE_EN_TI','SELLOS_GRATIS','ACTIVACIONES_GRATIS','DESPEGA','STARTER','GROWTH','PRO'];const plans=codes.map((code,i)=>({code,name:code,monthly_price_cop:i<3?0:75000,included:['Incluido de prueba'],not_included:['No incluido de prueba'],url:'https://gosqori.com/'+(i<3?'pense-en-ti/?seller=abc&program=':'paquetes/?advisor=abc&plan=')+code+'&prospect_ref=signed'}));let requested;w.fetch=async path=>{requested=path;return {ok:true,json:async()=>({advisor:{name:'Ana <img src=x>'},plans,resources:guides.filter(g=>g.audience==='PROSPECT')})};};w.eval(fs.readFileSync('conoce-qori/app.js','utf8'));await until(()=>w.document.querySelectorAll('.plan-card').length===7);assert.match(requested,/prospect_ref=signed/);assert.equal(w.document.querySelector('img'),null);assert.equal(w.document.querySelectorAll('.plan-card .cta').length,7);
  for(const a of w.document.querySelectorAll('.plan-card .cta')){const u=new URL(a.href);assert.equal(u.searchParams.get('prospect_ref'),'signed');assert.equal(u.searchParams.get('seller')||u.searchParams.get('advisor'),'abc');}
  assert.equal(w.document.querySelector('#recurso-registro-y-pago details').open,true);assert.doesNotMatch(w.document.body.textContent,/comisiones|salarios|multinivel/i);
  const filter=w.document.querySelector('#planFilter');filter.value='free';filter.onchange();assert.equal(w.document.querySelectorAll('.plan-card').length,3);filter.value='paid';filter.onchange();assert.equal(w.document.querySelectorAll('.plan-card').length,4);
 }finally{w.close();}
});
test('expired client context blocks signup instead of silently removing attribution',async()=>{
 const w=new JSDOM(fs.readFileSync('conoce-qori/index.html','utf8'),{url:'https://gosqori.com/conoce-qori/?seller=abc',runScripts:'outside-only'}).window;try{w.fetch=async()=>({ok:false,json:async()=>({error:{message:'Enlace vencido'}})});w.eval(fs.readFileSync('conoce-qori/app.js','utf8'));await until(()=>w.document.querySelector('#status').getAttribute('role')==='alert');assert.equal(w.document.querySelector('#status').textContent,'Enlace vencido');assert.equal(w.document.querySelector('#planCards a'),null);assert.equal(w.document.querySelector('#planFilter').disabled,true);}finally{w.close();}
});
