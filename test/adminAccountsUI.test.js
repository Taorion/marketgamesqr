const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));async function until(f){for(let n=0;n<80;n++){if(f())return;await tick();}throw Error('UI did not settle');}
function setup(role='QORI_SUPERADMIN'){
 const w=new JSDOM('<section id="accountsWorkspace" hidden></section>',{url:'https://example.test/admin/',runScripts:'outside-only'}).window,calls=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const ctx={user:{role},showTeam(){},showLegacy(){},showSellerAdmin(){},download:async()=>{},api:async(path,opts={})=>{const body=opts.body&&JSON.parse(opts.body);calls.push({path,body});
  if(path.endsWith('bootstrap'))return {counts:Object.fromEntries(['sellers','businesses','customers'].map(k=>[k,{total:1,active:1}])),versions:{sellers:[{code:'SELLER',name:'Seller'}],businesses:[{code:'PENSE_EN_TI',name:'Pensé en ti'}],customers:[{code:'CUSTOMER_FREE',name:'Customer gratis'}]}};
  if(body)return {ok:true};
  if(path.includes('/customers/c1'))return {record:{id:'c1',full_name:'Ana <script>',email:'qa@example.test',is_active:true,admin_revision:2,sessions:1},history:[]};
  return {total:1,has_more:false,rows:[{id:'c1',name:'Ana <img src=x>',email:'qa@example.test',version:path.includes('/customers')?'CUSTOMER_FREE':'PENSE_EN_TI',is_active:true,created_at:'2026-11-07'}]};
 }};w.eval(fs.readFileSync('admin/js/accounts.js','utf8'));return {w,calls,ctx};
}
test('Customer management is reachable, escapes names and sends explicit revision/reason',async()=>{
 const {w,calls,ctx}=setup();try{await w.QoriAccounts.load(ctx);w.document.querySelector('[data-kind=customers]').click();await until(()=>w.document.querySelector('[data-detail]'));assert.equal(w.document.querySelector('img'),null);w.document.querySelector('[data-detail]').click();await until(()=>w.document.querySelector('dialog'));const f=w.document.querySelector('dialog form');f.elements.full_name.value='Ana editada';f.elements.reason.value='Verificación administrativa';f.elements.is_active.checked=false;f.elements.revoke_sessions.checked=true;await f.onsubmit({preventDefault(){},target:f});const changed=calls.find(c=>c.body);assert.deepEqual(changed.body,{full_name:'Ana editada',is_active:false,revoke_sessions:true,expected_revision:2,reason:'Verificación administrativa'});assert.equal(w.document.querySelector('dialog'),null);}finally{w.close();}
});
test('Seller role never loads admin accounts and logout clears sensitive detail',async()=>{
 const {w,calls,ctx}=setup('QORI_SELLER');try{await w.QoriAccounts.load(ctx);assert.equal(calls.length,0);assert.equal(w.document.querySelector('section').hidden,true);ctx.user.role='QORI_SUPERADMIN';await w.QoriAccounts.load(ctx);w.QoriAccounts.clear();assert.equal(w.document.querySelector('section').innerHTML,'');}finally{w.close();}
});
