const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8'),tick=()=>new Promise(r=>setImmediate(r));
const {programs}=require('../backend/src/services/freeProgramPolicy');
test('free plan tools are restricted before the account screen has ever been opened',()=>{
 const app=read('empresa/js/app.js'),source=app.slice(app.indexOf('function hasPlanFeature(feature)'),app.indexOf('function currentPlan()'));
 const {PLAN_CATALOG}=require('../backend/src/services/subscriptionService');
 const w=new JSDOM('',{runScripts:'outside-only'}).window;
 try{w.state={accountWorkspaceLoaded:false};w.isAdmin=()=>false;w.isPrepaidValidatorOnly=()=>false;w.normalizePlanTierCode=x=>x;w.eval(source);
  for(const code of Object.keys(programs)){const plan=PLAN_CATALOG[code];w.currentPlan=()=>plan;
   assert.equal(w.hasPlanFeature('qr_validator'),true);assert.equal(w.hasPlanFeature('rms_core'),false);assert.equal(w.hasPlanFeature('gift_cards'),false);assert.equal(w.hasPlanFeature('stamp_cards'),code==='SELLOS_GRATIS');assert.equal(w.hasPlanFeature('interactive_activations'),code==='ACTIVACIONES_GRATIS');
  }
 }finally{w.close();}
});
test('each personal free link preselects its program and submits exact seller and CRM attribution',async()=>{
 for(const code of Object.keys(programs)){
  const w=new JSDOM(read('pense-en-ti/index.html'),{url:'https://example.test/pense-en-ti/?program='+code+'&seller=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&prospect_ref=exact-token',runScripts:'outside-only'}).window,calls=[];
  try{w.fetch=async(path,opts={})=>{calls.push({path,body:opts.body&&JSON.parse(opts.body)});return {ok:!opts.body,json:async()=>opts.body?{error:{message:'QA stop'}}:{name:'Embajador QA'}};};
   w.eval(read('qori-web/js/seller-referral.js'));w.eval(read('pense-en-ti/app.js'));await tick();await tick();
   assert.equal(w.document.getElementById('freeProgram').value,code);await w.document.getElementById('freeForm').onsubmit({preventDefault(){}});
   const body=calls.find(r=>r.body)?.body;assert.equal(body.free_program,code);assert.equal(body.commercial_advisor_id,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');assert.equal(body.commercial_prospect_token,'exact-token');
   w.document.querySelector('[data-program=SELLOS_GRATIS]').click();assert.equal(w.document.getElementById('freeProgram').value,'SELLOS_GRATIS');
  }finally{w.close();}
 }
});
test('invalid program link cannot silently register a different program',async()=>{
 const w=new JSDOM(read('pense-en-ti/index.html'),{url:'https://example.test/pense-en-ti/?program=INVALID',runScripts:'outside-only'}).window;let calls=0;
 try{w.fetch=async()=>{calls++;};w.eval(read('pense-en-ti/app.js'));await w.document.getElementById('freeForm').onsubmit({preventDefault(){}});assert.equal(calls,0);assert.match(w.document.querySelector('.status').textContent,/Selecciona/);}finally{w.close();}
});
test('free portal banner shows only the chosen program, inventory, validator and billing',async()=>{
 for(const [code,p] of Object.entries(programs)){
  const w=new JSDOM('<main></main>',{url:'https://example.test/empresa/',runScripts:'outside-only'}).window;
  try{w.authHeaders=()=>({Authorization:'Bearer local'});w.fetch=async()=>({ok:true,json:async()=>({balances:{plan_code:code,tickets:p.tickets,products:4}})});w.eval(read('empresa/js/pense-en-ti.js'));await tick();await tick();
   assert.deepEqual([...w.document.querySelectorAll('[data-step]')].map(b=>b.dataset.step),[p.view,'inventory','validator','account']);assert.ok(w.document.querySelector('h2').textContent.includes(p.name));assert.doesNotMatch(w.document.body.textContent,/giftcards/i);
  }finally{w.close();}
 }
});
test('Customer publication dialog limits each free program to its own kind without requesting paid gift tools',async()=>{
 for(const [code,kind] of [['PENSE_EN_TI','PRODUCT'],['SELLOS_GRATIS','STAMP'],['ACTIVACIONES_GRATIS','ACTIVITY']]){
  const w=new JSDOM('<body></body>',{url:'https://example.test/empresa/',runScripts:'outside-only'}).window,calls=[];
  try{w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.currentPlan=()=>({code,free_program:true});w.authHeaders=()=>({});
   w.api=async(path)=>{calls.push(path);return path.endsWith('/publications')?{directory:{},activities:[],stamps:[],products:[],publications:[]}:path.endsWith('/program-requests')?{requests:[]}:{orders:[]};};
   w.eval(read('empresa/js/customer-publishing.js'));w.QoriCustomerPublishing.open();await tick();await tick();
   const select=w.document.querySelector('#publishOffer select[name=kind]');assert.ok(select);assert.deepEqual([...select.options].map(o=>o.value),[kind]);
   assert.equal(calls.some(p=>p.endsWith('/product-gifts')),kind==='PRODUCT');assert.ok(w.document.querySelector('#publishProfile'));
  }finally{w.close();}
 }
});
