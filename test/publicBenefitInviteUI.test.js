const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));
test('optional Customer card preserves the full benefit link, offers copying and never blocks content',async()=>{
 for(const path of ['/claim/example','/rp/example','/sellos/#'+'a'.repeat(64),'/carnet-afiliado/example','/activacion/example','/trivia/example']){
  const w=new JSDOM('<main><h1>Tu beneficio</h1><button id="redeem">Usar mi beneficio</button></main>',{url:'https://gosqori.com'+path,runScripts:'outside-only'}).window;let copied;
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async v=>{copied=v;}}});
  try{w.eval(fs.readFileSync('customer-web/public-benefit-invite.js','utf8'));await tick();const card=w.document.querySelector('qori-benefit-invite');assert.ok(card);assert.equal(w.document.querySelector('#redeem').disabled,false);const root=card.shadowRoot;assert.match(root.textContent,/sin crear una cuenta/);assert.match(root.textContent,/cuidar tus finanzas/);const url=new URL(root.querySelector('#save').href);assert.equal(url.searchParams.get('benefit'),path);assert.equal(url.hash,'#invitations');root.querySelector('#copy').click();await tick();assert.equal(copied,'https://gosqori.com'+path);assert.match(root.querySelector('#status').textContent,/copiado/);}finally{w.close();}
 }
});
test('public fetch adds web provenance without redirecting errors into Customer',async()=>{
 const w=new JSDOM('<main>Beneficio</main>',{url:'https://gosqori.com/sellos/#abc',runScripts:'outside-only'}).window;let request;
 w.Headers=Headers;w.Request=Request;w.fetch=async(url,init)=>{request={url,init};return {status:401};};
 try{w.eval(fs.readFileSync('customer-web/benefit-entry.js','utf8'));const r=await w.fetch('/api/public/stamp-cards/abc');assert.equal(r.status,401);assert.equal(w.location.pathname,'/sellos/');assert.equal(request.init.headers.get('X-Qori-Web'),'1');assert.ok(w.document.querySelector('script[src*="public-benefit-invite"]'));}finally{w.close();}
});
test('Customer sign-in offers a guest return and does not auto-redirect optional saving',async()=>{
 const target='/sellos/#'+'b'.repeat(64),w=new JSDOM('<div class="auth-form-wrap"></div>',{url:'https://gosqori.com/customer/?benefit='+encodeURIComponent(target)+'#invitations',runScripts:'outside-only'}).window;
 try{w.sessionStorage.setItem('qori-benefit-return','/claim/old');w.eval(fs.readFileSync('customer-web/benefit-entry.js','utf8'));assert.match(w.document.querySelector('#benefitWelcome').textContent,/opcional/);assert.equal(w.document.querySelector('#benefitWelcome a').getAttribute('href'),target);assert.equal(w.QoriBenefitReturn(),false);}finally{w.close();}
});
test('real ticket page shows its downloadable QR without Customer and hides used or expired tickets',async()=>{
 for(const state of ['ACTIVE','REDEEMED','EXPIRED','CANCELLED']){
  const w=new JSDOM(fs.readFileSync('claim/index.html','utf8'),{url:'https://gosqori.com/claim/qa-token',runScripts:'outside-only'}).window;
  const data={status:state,allowed:false,business:{name:'Café QA'},qr_code:{origin_type:'POST_SALE',expires_at:'2099-01-01'},benefit:{type:'FREE_GIFT',value:{label:'Un café gratis'}},final_ticket:{id:'ticket-qa',status:state,expires_at:'2099-01-01',validator_url:'https://gosqori.com/empresa/?token=qa-token',qr_image_data_url:'data:image/png;base64,AAAA'}};
  w.fetch=async()=>({ok:true,json:async()=>data});
  try{w.eval(fs.readFileSync('claim/app.js','utf8'));await tick();assert.equal(w.document.querySelector('#claimForm').classList.contains('hidden'),true);assert.equal(w.document.querySelector('#finalTicketBlock').classList.contains('hidden'),state!=='ACTIVE');if(state==='ACTIVE'){assert.match(w.document.querySelector('#claimMessage').textContent,/no necesitas una cuenta/);assert.equal(w.document.querySelector('#downloadTicketImageButton').disabled,false);assert.equal(w.document.querySelector('#finalTicketQrImage').src,data.final_ticket.qr_image_data_url);}else assert.match(w.document.querySelector('#resultBlock').textContent,/canjeado|venció|cancelado/);}finally{w.close();}
 }
});
