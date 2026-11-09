const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
test('Seller can find trial deadlines, filter expired accounts and distinguish paid conversion',()=>{
 const w=new JSDOM('<div id="host"></div>',{url:'https://example.test/seller/',runScripts:'outside-only'}).window;
 try{
  w.eval(fs.readFileSync('seller/accounts.js','utf8'));const host=w.document.querySelector('#host');let refreshed=0;
  const account=(name,phase,trial,extra={})=>({name,created_at:'2026-10-20T12:00:00Z',lifecycle:{phase,label:phase==='TRIAL_ENDING'?'Freemium · vence pronto':phase==='TRIAL_EXPIRED'?'Freemium vencido':'Plan pago activo',plan_name:'Descubre',tone:'warning',access_allowed:true,next_action:'Contacta al negocio.',trial,...extra}});
  const trial={status:'ACTIVE',started_at:'2026-10-20T12:00:00Z',ends_at:'2026-11-15T04:00:00Z',days_remaining:3};
  const rows=[account('Café <img src=x>', 'TRIAL_ENDING',trial),account('Comercio vencido','TRIAL_EXPIRED',{...trial,status:'EXPIRED',days_remaining:0}),account('Negocio convertido','PAID_ACTIVE',{...trial,status:'CONVERTED',days_remaining:null},{converted_to_paid:true,plan_name:'Crece',last_payment_at:'2026-11-10T12:00:00Z'})];
  w.QoriSellerAccounts.render(host,rows,{refresh:()=>refreshed++});
  assert.equal(host.querySelectorAll('.seller-account').length,3);assert.equal(host.querySelector('img'),null);assert.match(host.textContent,/Quedan 3 días de prueba/);assert.match(host.textContent,/Inicio de prueba/);assert.match(host.textContent,/Vencimiento de prueba/);assert.match(host.textContent,/14\/11\/2026/);assert.match(host.textContent,/Pasó de Freemium a un plan pago/);
  const filter=host.querySelector('[data-account-phase]');filter.value='TRIAL_EXPIRED';filter.dispatchEvent(new w.Event('change'));assert.equal(host.querySelectorAll('.seller-account').length,1);assert.match(host.querySelector('.seller-account').textContent,/La prueba ya venció/);
  filter.value='CONVERTED';filter.dispatchEvent(new w.Event('change'));assert.match(host.querySelector('.seller-account').textContent,/Negocio convertido/);assert.doesNotMatch(host.querySelector('.seller-account').textContent,/Quedan/);
  filter.value='ALL';filter.dispatchEvent(new w.Event('change'));const search=host.querySelector('[data-account-search]');search.value='Café';search.dispatchEvent(new w.Event('input'));assert.equal(host.querySelectorAll('.seller-account').length,1);
  host.querySelector('[data-refresh-accounts]').click();assert.equal(refreshed,1);assert.match(w.QoriSellerAccounts.summary(rows[0]),/Quedan 3 días/);
 }finally{w.close();}
});
