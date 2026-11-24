const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');const {JSDOM}=require('jsdom');const crypto=require('crypto');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const pause=()=>new Promise(r=>setTimeout(r,15));
const r={name:'Pan compartido',purpose:'Visitas desde Naturista Vida',benefit_type:'FREE_GIFT',benefit_label:'Compra pan y recibe otro',benefit_amount:0,minimum_purchase:12000,terms:'Solo con compra',destination:'Calle 12',starts_at:'2026-11-01T12:00:00Z',ends_at:'2027-01-01T12:00:00Z',ticket_valid_days:30,per_customer_limit:1,commission_type:'FIXED',commission_value:1000,commission_base:'NET_PAID',settlement_terms:'Cada viernes',unused_policy:'RETURN_UNUSED',branch_ids:[]};
function setup(html,url='http://127.0.0.1:3057/empresa/'){
 const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.HTMLElement.prototype.scrollIntoView=function(){};Object.defineProperty(w.crypto,'randomUUID',{value:crypto.randomUUID});return dom;
}
test('portal module renders empty state, opens editable form and sends a real configuration payload',async()=>{
 const dom=setup('<div id="alliancesWorkspace"></div>'),w=dom.window,calls=[];
 w.authHeaders=()=>({Authorization:'Bearer QA'});w.api=async(path,options)=>{calls.push({path,options});if(path.endsWith('/context'))return {business_id:'issuer',ticket_balance:20,products:[],branches:[],alliances:[]};if(options.method==='POST')return {id:'new',rules:r};return {alliance:{id:'new',issuer_id:'issuer',issuer_name:'Origen',ally_name:'Vida',status:'DRAFT',rules:r},totals:{earned:0,paid:0,pending:0,recoverable:0},batches:[],tickets:[],commissions:[],payments:[],events:[]};};
 try{w.eval(read('empresa/js/alliances.js'));await w.QoriAlliances.open();assert.match(w.document.body.textContent,/Tu próxima alianza/);
 w.document.querySelector('[data-alliance-action=create]').click();const form=w.document.querySelector('dialog form');assert.ok(form);const values={ally_slug:'naturista-vida',name:r.name,purpose:r.purpose,benefit_label:r.benefit_label,terms:r.terms,destination:r.destination};for(const [k,v] of Object.entries(values))form.elements[k].value=v;
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pause();const sent=calls.find(c=>c.path==='/api/business/alliances'&&c.options.method==='POST');assert.ok(sent);const body=JSON.parse(sent.options.body);assert.equal(body.ally_slug,'naturista-vida');assert.equal(body.rules.benefit_type,'FREE_GIFT');assert.equal(body.rules.unused_policy,'RETURN_UNUSED');assert.equal(body.rules.per_customer_limit,1);
 }finally{dom.window.close();}
});
test('received proposals show accept and personalization but never emission or editing controls',async()=>{
 const dom=setup('<div id="alliancesWorkspace"></div>'),w=dom.window;const a={id:'ag',issuer_id:'issuer',ally_id:'ally',issuer_name:'Origen',ally_name:'Vida',status:'PROPOSED',rules:r};
 w.authHeaders=()=>({});w.api=async p=>p.endsWith('/context')?{business_id:'ally',alliances:[a]}:{alliance:a,totals:{},batches:[],tickets:[],commissions:[],payments:[],events:[]};
 try{w.eval(read('empresa/js/alliances.js'));await w.QoriAlliances.open();w.document.querySelector('[data-id=received]').click();w.document.querySelector('[data-alliance-action=detail]').click();await pause();
 assert.ok(w.document.querySelector('[data-alliance-action=ACCEPT]'));assert.ok(w.document.querySelector('[data-alliance-action=branding]'));assert.equal(w.document.querySelector('[data-alliance-action=issue]'),null);assert.equal(w.document.querySelector('[data-alliance-action=edit]'),null);
 }finally{dom.window.close();}
});
test('business-provided strings are rendered as text, not executable markup',async()=>{
 const dom=setup('<div id="alliancesWorkspace"></div>'),w=dom.window;
 w.authHeaders=()=>({});w.api=async()=>({business_id:'issuer',alliances:[{id:'x',issuer_id:'issuer',rules:{...r,name:'<img src=x onerror=alert(1)>',benefit_label:'<script>bad()</script>'},status:'ACTIVE',ally_name:'<svg onload=bad()>',issuer_name:'Qori'}]});
 try{w.eval(read('empresa/js/alliances.js'));await w.QoriAlliances.open();assert.equal(w.document.querySelector('#alliancesWorkspace img'),null);assert.equal(w.document.querySelector('#alliancesWorkspace script'),null);assert.match(w.document.body.textContent,/<img src=x/);}finally{dom.window.close();}
});
const publicOffer={...r,issuer:{name:'Origen'},ally:{name:'Vida'},branding:{display_name:'Vida',message:'Por venir de nuestra parte',invitation:'Recibe tu ticket',presentation:'',logo_url:'',collect_phone:false,collect_email:true},accepting:true};
test('public form requests only configured data, separates marketing and preserves retry key',async()=>{
 const token='a'.repeat(64),dom=setup('<main id="app"></main>','http://127.0.0.1:3057/alianzas/#alianza='+token),w=dom.window,calls=[];let attempts=0;
 w.fetch=async(url,options)=>{calls.push({url,options});if(options.method==='GET')return {ok:true,json:async()=>publicOffer};attempts++;return {ok:attempts>1,json:async()=>attempts===1?{error:{message:'Error transitorio'}}:{...publicOffer,status:'ACTIVE',expires_at:r.ends_at,ticket_code:'b'.repeat(64),ticket_url:'http://127.0.0.1:3057/alianzas/#ticket='+'c'.repeat(64),qr_image:'data:image/png;base64,AAAA'}};};
 try{w.eval(read('alliance-public/app.js'));await pause();const form=w.document.querySelector('form');assert.ok(form);assert.equal(form.elements.phone,undefined);assert.ok(form.elements.email);assert.equal(form.elements.marketing_issuer.checked,false);assert.equal(form.elements.marketing_ally.checked,false);assert.equal(form.elements.data_use_confirmed.required,true);
 assert.equal(calls.length,1);form.elements.name.value='Ana Cliente';form.elements.document_id.value='12345678';form.elements.email.value='ana@example.test';form.elements.data_use_confirmed.checked=true;
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pause();assert.match(w.document.getElementById('error').textContent,/Error transitorio/);
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pause();const bodies=calls.filter(c=>c.options.method==='POST').map(c=>JSON.parse(c.options.body));assert.equal(bodies[0].request_key,bodies[1].request_key);assert.equal(bodies[1].marketing_issuer,false);
 assert.match(w.document.body.textContent,/Tu ticket de alianza/);assert.doesNotMatch(w.document.body.textContent,/Comisión|Liquidación|1000/);assert.ok(w.location.hash.startsWith('#ticket='));
 }finally{dom.window.close();}
});
test('exhausted public offer has no enrollment submission control',async()=>{
 const dom=setup('<main id="app"></main>','http://127.0.0.1:3057/alianzas/#alianza='+'a'.repeat(64)),w=dom.window;
 w.fetch=async()=>({ok:true,json:async()=>({...publicOffer,accepting:false,message:'Se agotaron los tickets disponibles.'})});
 try{w.eval(read('alliance-public/app.js'));await pause();assert.equal(w.document.querySelector('form'),null);assert.match(w.document.body.textContent,/agotaron/);}finally{dom.window.close();}
});
