const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const policy=require('../backend/src/services/sellerCommissionPolicy').publicPolicy();
test('Seller matrix exposes all six monthly amounts, fixed bases and eligibility without rendering HTML from API values',()=>{
 const w=new JSDOM('<section id="host"></section>',{runScripts:'outside-only'}).window;
 try{
  w.eval(fs.readFileSync('seller/commissions.js','utf8'));const host=w.document.querySelector('#host');
  const data=structuredClone(policy);data.plans[0].name='Despega <img src=x>';
  w.QoriSellerCommissions.render(host,data);
  assert.equal(host.querySelectorAll('tbody tr').length,4);assert.equal(host.querySelectorAll('thead th').length,8);
  assert.equal(host.querySelector('img'),null);assert.equal(host.querySelector('[role=region]').tabIndex,0);
  for(const p of data.plans){const row=[...host.querySelectorAll('tbody tr')].find(r=>r.textContent.includes(p.name));assert.ok(row);assert.equal(row.querySelectorAll('td').length,7);}
  assert.match(host.textContent,/desde el mes 7/i);assert.match(host.textContent,/Base fija incluso con descuentos o pago anual/);assert.match(host.textContent,/Tickets: 10%/);assert.match(host.textContent,/anteriores conservan el 10%/);
 }finally{w.close();}
});
test('client portfolio distinguishes legacy, waiting for first paid period, active month and ended commission window',()=>{
 const w=new JSDOM('<div id="host"></div>',{runScripts:'outside-only'}).window;
 try{
  w.eval(fs.readFileSync('seller/accounts.js','utf8'));const host=w.document.querySelector('#host');
  const accounts=[{policy_version:'LEGACY_10'},{policy_version:'QORI_2026_VF1'},{policy_version:'QORI_2026_VF1',starts_on:'2026-10-15',ends_on:'2027-04-15',month:2},{policy_version:'QORI_2026_VF1',starts_on:'2025-10-15',ends_on:'2026-04-15',month:0}].map((commission,i)=>({name:'Cliente '+i,commission,lifecycle:{phase:'PAID_ACTIVE',label:'Activo',plan_name:'Crece',access_allowed:true}}));
  w.QoriSellerAccounts.render(host,accounts);assert.match(host.textContent,/esquema anterior, 10%/);assert.match(host.textContent,/primera cobertura paga/);assert.match(host.textContent,/Mes 2 de 6/);assert.match(host.textContent,/Fuera del mes de comisión actual/);assert.match(host.textContent,/15\/4\/2027/);
 }finally{w.close();}
});
