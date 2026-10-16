const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../admin/js/commercial.js'),'utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function harness(api){
  class Element{
    constructor(){this.listeners={};this.children={};this.dataset={};this.isConnected=true;this.innerHTML='';this.textContent='';this.classList={toggle(){}};}
    addEventListener(name,handler){this.listeners[name]=handler;}
    setAttribute(){} removeAttribute(){} close(){} showModal(){} remove(){this.isConnected=false;}
    querySelector(selector){if(selector.startsWith('[name='))return null;return this.children[selector]??=new Element();}
    querySelectorAll(selector){return selector==='button'?[this.querySelector('[type="submit"]')]:[];}
  }
  const root=new Element(),dialogs=[],document={getElementById:()=>root,createElement:()=>{const d=new Element();dialogs.push(d);return d;},body:{append(){}}};
  class FormData {constructor(){this.values={full_name:'QA seller',email:'qa@example.test',phone:'',password:'Chosen-QA!2026',password_confirm:'Chosen-QA!2026'};}get(k){return this.values[k]??'';}has(k){return k in this.values;}getAll(){return [];} }
  const context={document,window:{},Intl,Date,URLSearchParams,FormData};vm.runInNewContext(source,context);
  return {root,dialogs,app:context.window.QoriCommercial,load:()=>context.window.QoriCommercial.load({api}),click:(name,id='')=>root.listeners.click({target:{closest:()=>({dataset:{action:name,id}})}}),submit:()=>{const d=dialogs.at(-1);return d.querySelector('form').listeners.submit({preventDefault(){},target:d.querySelector('form')});}};
}
const bootstrap=()=>({user:{id:'root',name:'QA',role:'QORI_SUPERADMIN',permissions:['team.create'],can_see_team:true},counts:{},plans:[],policies:[],sellers:[],modules:{},limit_labels:{},default_permissions:[]});

test('one-time credentials survive refresh failure; pending modal blocks duplicate submission and dismissal',async()=>{
  const write=deferred();let calls=0,boots=0;
  const h=harness(async path=>{if(path.endsWith('/bootstrap')){if(++boots>1)throw Error('offline');return bootstrap();}if(path.endsWith('/sellers')){++calls;return write.promise;}throw Error(path);});
  await h.load();await h.click('new-seller');const saving=h.dialogs.at(-1);
  const first=h.submit();await h.submit();assert.equal(calls,1);
  saving.listeners.cancel({preventDefault(){}});assert.equal(saving.isConnected,true);
  write.resolve({credentials:{email:'qa@example.test',password:'ONE-TIME-PASSWORD'}});await first;
  assert.match(h.dialogs.at(-1).innerHTML,/ONE-TIME-PASSWORD/);
  assert.match(h.root.querySelector('#commercialNotice').textContent,/Los cambios se guardaron/);
});

test('a late list cannot populate another tab, and failed searches do not expose stale rows',async()=>{
  const customer=deferred();let fail=false;
  const h=harness(async path=>{if(path.endsWith('/bootstrap'))return bootstrap();if(path.includes('/customers?'))return customer.promise;if(path.includes('/prospects?')){if(fail)throw Error('offline');return {rows:[{id:'p1',business_name:'CURRENT PROSPECT'}],has_more:false};}throw Error(path);});
  await h.load();const pending=h.click('tab','customers');await h.click('tab','prospects');customer.resolve({rows:[{id:'c1',name:'STALE CUSTOMER'}],has_more:false});await pending;
  assert.match(h.root.querySelector('#commercialContent').innerHTML,/CURRENT PROSPECT/);assert.doesNotMatch(h.root.querySelector('#commercialContent').innerHTML,/STALE CUSTOMER/);
  fail=true;await h.click('tab','prospects');assert.doesNotMatch(h.root.querySelector('#commercialContent').innerHTML,/CURRENT PROSPECT/);assert.match(h.root.querySelector('#commercialContent').innerHTML,/No se pudieron cargar/);
});

test('signing out discards late bootstrap and credential responses',async()=>{
  const boot=deferred();const h=harness(()=>boot.promise);const pending=h.load();h.app.clear();boot.resolve(bootstrap());await pending;assert.equal(h.root.innerHTML,'');
  const write=deferred();const h2=harness(path=>path.endsWith('/bootstrap')?bootstrap():write.promise);await h2.load();await h2.click('new-seller');const submit=h2.submit();h2.app.clear();write.resolve({credentials:{password:'PRIVATE'}});await submit;assert.equal(h2.root.innerHTML,'');assert.ok(h2.dialogs.every(d=>!d.isConnected));
});

test('local date inputs preserve the selected calendar day across UTC offsets',()=>{
  const original=process.env.TZ;process.env.TZ='America/Bogota';
  try{
    const functionText=source.slice(source.indexOf('  const localDate ='),source.indexOf('\n  let ctx'));
    const context={Date};vm.runInNewContext(functionText+'\nthis.result=localDate("2026-10-17T04:59:59Z");',context);assert.equal(context.result,'2026-10-16');
  }finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});

const legacySource=fs.readFileSync(require.resolve('../admin/js/app.js'),'utf8');
function legacyFunction(start,end,context){vm.runInNewContext(legacySource.slice(legacySource.indexOf(start),legacySource.indexOf(end,legacySource.indexOf(start))),context);}
test('advanced forms ignore repeat submits while the original save is pending',async()=>{
  let submit;const button={disabled:false};const form={dataset:{},setAttribute(){},removeAttribute(){},querySelectorAll:()=>[button],addEventListener:(_,handler)=>submit=handler};
  const context={};legacyFunction('function bindAsyncForm','[[loginForm,login]',context);
  const pending=deferred();let writes=0;context.bindAsyncForm(form,()=>{++writes;return pending.promise;});
  const first=submit({preventDefault(){}});await submit({preventDefault(){}});assert.equal(writes,1);assert.equal(button.disabled,true);
  pending.resolve();await first;assert.equal(button.disabled,false);
});

test('late business summaries cannot populate the newly selected customer form',async()=>{
  const first=deferred(),second=deferred(),input={disabled:false};
  const context={state:{selectedBusinessId:'a'},businessGeneration:0,subscriptionForm:{querySelectorAll:()=>[input]},renderBusinessSummary(){},renderCredits(){},api:path=>path.includes('/a/')?first.promise:second.promise};
  legacyFunction('async function loadBusinessSummary','function renderBusinessSummary',context);
  const a=context.loadBusinessSummary('a');assert.equal(input.disabled,true);
  context.state.selectedBusinessId='b';const b=context.loadBusinessSummary('b');
  second.resolve({business:{id:'b'}});await b;first.resolve({business:{id:'a'}});await a;
  assert.equal(context.state.selectedBusinessSummary.business.id,'b');assert.equal(input.disabled,false);
});
