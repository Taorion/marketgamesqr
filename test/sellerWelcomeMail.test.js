const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
process.env.RESEND_API_KEY='test-resend-key-not-real';
const mail=require('../backend/src/services/sellerWelcomeMailService');
const params={name:'María <img src=x>',email:'maria@example.test',actionUrl:'https://example.test/seller/#activar='+'a'.repeat(43),needsActivation:true,expiresAt:'2026-11-18T22:00:00Z'};
test('welcome is responsive, readable without images, and includes working activation and Demo links',()=>{
 const m=mail.message(params),w=new JSDOM(m.html).window;try{
  assert.match(m.subject,/Felicitaciones/);assert.match(w.document.body.textContent,/documentos han sido verificados/);assert.match(w.document.body.textContent,/admitido como Embajador Qori/);
  assert.equal(w.document.querySelector('img'),null);assert.equal(w.document.querySelector('script'),null);assert.match(m.html,/@media only screen and \(max-width:620px\)/);assert.match(m.html,/v:roundrect/);
  const button=[...w.document.querySelectorAll('a')].find(a=>a.textContent.includes('Activar mi cuenta'));assert.equal(button.href,params.actionUrl);assert.match(button.getAttribute('style'),/background-color:#275ddd/);assert.match(button.getAttribute('style'),/color:#ffffff/);
  assert.ok([...w.document.querySelectorAll('a')].some(a=>a.href.includes('/empresa/?demo=1')));assert.match(m.text,/una sola vez/);assert.match(m.text,/hora de Colombia/);assert.ok(Buffer.byteLength(m.html)<95000);
 }finally{w.close();}
});
test('active-account welcome does not instruct password replacement',()=>{const m=mail.message({...params,needsActivation:false,actionUrl:'https://example.test/seller/',expiresAt:null});assert.match(m.html,/Entrar a Qori Seller/);assert.doesNotMatch(m.html,/Activar mi cuenta y crear contraseña/);assert.match(m.text,/contraseña actual se conserva/);});
test('Resend delivery sends HTML and plain text with one idempotency key and sanitizes provider errors',async()=>{
 const original=global.fetch,calls=[];
 try{global.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({id:'provider-test-id'})};};
  const payload={from:'Qori <noreply@example.test>',to:['maria@example.test'],...mail.message(params)};
  assert.equal(await mail.deliver(payload,'seller-welcome/test'),'provider-test-id');assert.equal(calls[0].url,'https://api.resend.com/emails');assert.equal(calls[0].options.headers['Idempotency-Key'],'seller-welcome/test');assert.deepEqual(JSON.parse(calls[0].options.body),payload);
  global.fetch=async()=>({ok:false,status:500,text:async()=>'PRIVATE PROVIDER DETAIL'});await assert.rejects(()=>mail.deliver(payload,'seller-welcome/test'),e=>e.status===502&&!e.message.includes('PRIVATE'));
 }finally{global.fetch=original;}
});
