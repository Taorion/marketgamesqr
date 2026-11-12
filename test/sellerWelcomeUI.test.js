const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function setup({allowed=true,failed=false}={}){
 const w=new JSDOM('<body></body>',{url:'https://example.test/admin/',runScripts:'outside-only'}).window,calls=[];let current=true,sends=0;
 function dialog(title,body){const d=w.document.createElement('dialog');d.innerHTML='<h2>'+title+'</h2><form>'+body+'</form>';w.document.body.append(d);return d;}
 const preview={recipient:'seller@example.test',subject:'¡Felicitaciones!',requires_activation:true,can_send:allowed,reason:'Primero verifica los documentos.',history:[],html:'<h1>Bienvenido</h1>'};
 const request=async(path,body,method)=>{calls.push({path,body,method});if(!body)return preview;sends++;return failed&&sends===1?{status:'FAILED',message:'Reintenta desde esta ventana.'}:{status:'SENT'};};
 w.eval(fs.readFileSync('admin/js/seller-welcome.js','utf8'));return {w,calls,preview,options:{id:'seller-id',dialog,request,isCurrent:()=>current},logout:()=>current=false};
}
test('Admin previews recipient and HTML, explicitly sends once, and sees success',async()=>{
 const s=setup();try{await s.w.QoriSellerWelcome.open(s.options);assert.equal(s.calls.length,1);const frame=s.w.document.querySelector('iframe');assert.equal(frame.getAttribute('sandbox'),'');assert.equal(frame.srcdoc,s.preview.html);assert.match(s.w.document.body.textContent,/seller@example.test/);
  const f=s.w.document.querySelector('form');await f.onsubmit({preventDefault(){}});await f.onsubmit({preventDefault(){}});assert.equal(s.calls.filter(c=>c.body).length,1);assert.equal(s.calls[1].body.expected_email,'seller@example.test');assert.match(f.textContent,/Correo de bienvenida enviado/);assert.equal(f.querySelector('button').disabled,true);
 }finally{s.w.close();}
});
test('failed delivery retries the same request and pending documents cannot send',async()=>{
 const s=setup({failed:true});try{await s.w.QoriSellerWelcome.open(s.options);const f=s.w.document.querySelector('form');await f.onsubmit({preventDefault(){}});assert.equal(f.querySelector('button').disabled,false);await f.onsubmit({preventDefault(){}});assert.equal(s.calls[1].body.request_id,s.calls[2].body.request_id);}finally{s.w.close();}
 const blocked=setup({allowed:false});try{await blocked.w.QoriSellerWelcome.open(blocked.options);assert.equal(blocked.w.document.querySelector('button').disabled,true);await blocked.w.document.querySelector('form').onsubmit({preventDefault(){}});assert.equal(blocked.calls.length,1);assert.match(blocked.w.document.querySelector('[role=alert]').textContent,/verifica/);}finally{blocked.w.close();}
});
test('logging out prevents a new send from an already-open preview',async()=>{const s=setup();try{await s.w.QoriSellerWelcome.open(s.options);s.logout();await s.w.document.querySelector('form').onsubmit({preventDefault(){}});assert.equal(s.calls.length,1);}finally{s.w.close();}});
