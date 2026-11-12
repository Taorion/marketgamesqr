const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const until=async fn=>{for(let i=0;i<120;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');};
test('supervisor filters, paginates, drills into a client and saves audited ownership with stale-owner protection',async()=>{
 const w=new JSDOM('<body></body>',{url:'https://example.test/admin/',runScripts:'outside-only'}).window,calls=[];let current=true;
 const account={id:'business-1',name:'Café <img src=x>',plan_code:'STARTER',subscription_status:'ACTIVE',is_active:true,seller_id:'seller-1',seller_name:'Ana'};
 const request=async(path,body,method)=>{calls.push({path,body,method});if(body)return {ok:true};if(path.endsWith('/bootstrap'))return {sellers:[{id:'seller-1',full_name:'Ana',is_active:true},{id:'seller-2',full_name:'Luis',is_active:true}]};const q=new URL('https://test'+path).searchParams;return {rows:q.get('view')==='accounts'?[account]:[],summary:{total:31},has_more:q.get('offset')==='0'};};
 const dialog=(title,body)=>{const d=w.document.createElement('dialog');d.innerHTML='<h2>'+title+'</h2><form>'+body+'</form>';w.document.body.append(d);return d;};
 w.eval(fs.readFileSync('admin/js/seller-supervision.js','utf8'));
 try{await w.QoriSellerSupervision.open({dialog,request,isCurrent:()=>current,showPayments:()=>{}});
  assert.equal(w.document.querySelector('td img'),null);assert.match(w.document.body.textContent,/Café <img src=x>/);
  w.document.querySelector('[data-next]').click();await until(()=>w.document.querySelector('[data-page]').textContent==='Página 2');assert.match(calls.at(-1).path,/offset=30/);
  w.document.querySelector('[data-manage]').click();w.document.querySelector('[data-owner]').value='seller-2';w.document.querySelector('[data-reason]').value='Cambio de responsable solicitado por Admin.';
  w.document.querySelector('[data-save]').click();await until(()=>calls.some(c=>c.method==='PATCH'));const write=calls.find(c=>c.body);assert.equal(write.body.expected_seller_id,'seller-1');assert.equal(write.body.seller_id,'seller-2');
  await until(()=>w.document.querySelector('[data-management]').hidden);
  w.document.querySelector('[data-orders]').click();await until(()=>calls.at(-1).path.includes('view=orders'));assert.match(calls.at(-1).path,/business_id=business-1/);
  current=false;w.document.querySelector('[data-payments]').click();
 }finally{w.close();}
});
test('a late supervisor response is discarded after logout',async()=>{
 const w=new JSDOM('<body></body>',{runScripts:'outside-only'}).window;let resolve,current=true;
 w.eval(fs.readFileSync('admin/js/seller-supervision.js','utf8'));
 const pending=w.QoriSellerSupervision.open({dialog:(_t,body)=>{const d=w.document.createElement('dialog');d.innerHTML=body;w.document.body.append(d);return d;},request:()=>new Promise(r=>resolve=r),isCurrent:()=>current});
 current=false;resolve({sellers:[{id:'secret',full_name:'Private seller'}]});await pending;assert.doesNotMatch(w.document.body.textContent,/Private seller/);w.close();
});
