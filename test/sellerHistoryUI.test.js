const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');};
test('history loads more, searches beyond loaded rows and ignores stale search/session results',async()=>{
 const w=new JSDOM('<div id="host"></div>',{runScripts:'outside-only'}).window;
 try{
  w.eval(fs.readFileSync('seller/history.js','utf8'));const host=w.document.getElementById('host'),calls=[];let active=true;
  w.QoriSellerHistory.render(host,{view:'accounts',rows:[{id:'one'}],pagination:{has_more:true,next_offset:50},renderRows:rows=>rows.map(r=>r.id).join(','),isCurrent:()=>active,searchLabel:'Buscar todos',fetchPage:params=>new Promise(resolve=>calls.push({params,resolve}))});
  const form=host.querySelector('form'),more=host.querySelector('[data-history-more]'),list=host.querySelector('[data-history-rows]');
  more.click();assert.equal(calls[0].params.offset,50);calls[0].resolve({rows:[{id:'one'},{id:'two'}],pagination:{has_more:false,next_offset:100}});await until(()=>!more.disabled);assert.equal(list.textContent,'one,two');assert.equal(more.hidden,true);
  form.elements.search.value='old';form.dispatchEvent(new w.Event('submit',{cancelable:true}));form.elements.search.value='new';form.dispatchEvent(new w.Event('submit',{cancelable:true}));
  assert.equal(calls[1].params.offset,0);assert.equal(calls[2].params.search,'new');calls[2].resolve({rows:[{id:'new-result'}],pagination:{has_more:false,next_offset:1}});await until(()=>list.textContent==='new-result');
  calls[1].resolve({rows:[{id:'stale'}],pagination:{has_more:false,next_offset:1}});await new Promise(r=>setImmediate(r));assert.equal(list.textContent,'new-result');
  form.dispatchEvent(new w.Event('submit',{cancelable:true}));active=false;calls[3].resolve({rows:[{id:'private-after-logout'}],pagination:{has_more:false,next_offset:1}});await new Promise(r=>setImmediate(r));assert.equal(list.textContent,'new-result');
 }finally{w.close();}
});
test('forgot password sends only an email and offers recovery without creating another account',async()=>{
 const w=new JSDOM(fs.readFileSync('paquetes/index.html','utf8'),{url:'https://example.test/paquetes/#retomar',runScripts:'outside-only'}).window;
 try{
  let call;w.fetch=async(path,options)=>{call={path,body:JSON.parse(options.body)};return {ok:true,json:async()=>({message:'Revisa tu correo'})};};w.eval(fs.readFileSync('paquetes/js/signup-recovery.js','utf8'));
  assert.equal(w.document.querySelector('#signupRecovery').open,true);const form=w.document.querySelector('#signupForgotForm');form.elements.email.value='cliente@example.test';form.dispatchEvent(new w.Event('submit',{cancelable:true}));await until(()=>!form.querySelector('button').disabled);
  assert.deepEqual(call,{path:'/api/auth/password/request-reset',body:{email:'cliente@example.test'}});assert.equal(form.querySelector('[role=status]').textContent,'Revisa tu correo');
 }finally{w.close();}
});
