const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function setup(documents=[]){
 const w=new JSDOM('<main></main>',{url:'https://example.test/seller/',runScripts:'outside-only'}).window,calls=[],downloads=[];let reloads=0;
 w.eval(fs.readFileSync('seller/documents.js','utf8'));const host=w.document.querySelector('main');
 w.QoriSellerDocuments.render(host,{profile:{application:{status:'DRAFT'},documents},request:async(path,body,method)=>{calls.push({path,body,method});return {clauses:[{title:'Condiciones',text:'Texto vigente'}]};},download:async(...args)=>downloads.push(args),reload:async()=>{reloads++;},isCurrent:()=>true});
 return {w,host,calls,downloads,get reloads(){return reloads;},close(){w.QoriSellerDocuments.stopCamera();w.close();}};
}
test('saved documents only download; new attachment requires explicit confirmation',async()=>{
 const s=setup([{kind:'IDENTITY',id:'identity',filename:'Cedula.pdf'}]);try{
  assert.equal(s.host.querySelector('[data-kind=IDENTITY]'),null);await s.host.querySelector('[data-download]').onclick();assert.equal(s.downloads[0][0],'/api/seller/documents/identity');
  await s.host.querySelector('#downloadContract').onclick();assert.equal(s.downloads[1][1],'Contrato-Qori-Seller.pdf');
  const input=s.host.querySelector('[data-kind=POLICE]');Object.defineProperty(input,'files',{value:[new s.w.File(['%PDF-1.4\n%%EOF'],'Policia.pdf',{type:'application/pdf'})]});await input.onchange();assert.equal(s.calls.filter(c=>c.method==='PUT').length,0);
  await input.closest('article').querySelector('[data-confirm]').onclick();assert.equal(s.calls.filter(c=>c.method==='PUT').length,1);assert.equal(s.reloads,1);assert.equal(s.host.querySelector('[data-kind=POLICE]'),null);
 }finally{s.close();}
});
test('camera uses consent, previews a capture, permits retake and stops before save',async()=>{
 const s=setup();let opened=0,stopped=0;try{
  Object.defineProperty(s.w.navigator,'mediaDevices',{value:{getUserMedia:async options=>{opened++;assert.equal(options.audio,false);assert.equal(options.video.facingMode,'user');return {getTracks:()=>[{stop(){stopped++;}}]};}}});
  const card=s.host.querySelector('[data-card=PHOTO]'),camera=card.querySelector('[data-camera]');await camera.onclick();assert.equal(opened,0);card.querySelector('[data-photo-consent]').checked=true;await camera.onclick();assert.equal(opened,1);
  const video=card.querySelector('video');Object.defineProperties(video,{videoWidth:{value:1280},videoHeight:{value:960}});s.w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});s.w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/jpeg;base64,/9j/AAAAAA==';
  card.querySelector('[data-capture]').onclick();assert.equal(stopped,1);assert.equal(card.querySelector('[data-preview]').hidden,false);assert.equal(s.calls.filter(c=>c.method==='PUT').length,0);
  card.querySelector('[data-cancel]').onclick();await camera.onclick();card.querySelector('[data-capture]').onclick();assert.equal(opened,2);assert.equal(stopped,2);
  await card.querySelector('[data-confirm]').onclick();const call=s.calls.find(c=>c.method==='PUT');assert.equal(call.body.photo_consent,true);assert.equal(call.path,'/api/seller/documents/PHOTO');
 }finally{s.close();}
});
test('late camera permission after navigation stops tracks and cannot attach a stream',async()=>{
 const s=setup();let finish,stopped=0;try{
  Object.defineProperty(s.w.navigator,'mediaDevices',{value:{getUserMedia:()=>new Promise(resolve=>{finish=resolve;})}});
  s.host.querySelector('[data-photo-consent]').checked=true;const pending=s.host.querySelector('[data-camera]').onclick();s.w.QoriSellerDocuments.stopCamera();finish({getTracks:()=>[{stop(){stopped++;}}]});await pending;assert.equal(stopped,1);assert.equal(s.host.querySelector('video').srcObject,null);
 }finally{s.close();}
});
test('complete dossier sends all confirmations only after current terms load',async()=>{
 const s=setup(require('../backend/src/services/sellerDocumentPolicy').kinds.map(kind=>({kind,id:kind,filename:kind+'.pdf'})));try{await Promise.resolve();const f=s.host.querySelector('form');for(const key of ['signed','truthful','ciiu_terms'])f.elements[key].checked=true;await f.onsubmit({preventDefault(){}});assert.deepEqual(JSON.parse(JSON.stringify(s.calls.find(c=>c.path.endsWith('/submit')).body)),{signed_and_notarized:true,documents_truthful:true,ciiu_terms_accepted:true});}finally{s.close();}
});
