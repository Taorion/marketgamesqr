const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const wait=async fn=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(resolve=>setTimeout(resolve,2));}throw Error('UI did not settle');};
function setup(){
 const w=new JSDOM('<section id="accountsWorkspace"></section>',{url:'https://example.test/admin/',runScripts:'outside-only'}).window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const record={id:'s1',name:'Ana <QA>',email:'seller@example.test',phone:'3105550000',is_active:true,application:{status:'DRAFT',approval_mode:'DOCUMENTS'},documents:[],documentation:{attention:true,missing:['IDENTITY','RUT','BANK','CONTRACT']},commissions:{}};
 const calls=[],copied=[],downloaded=[];
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async value=>copied.push(value)}});
 const ctx={user:{role:'QORI_SUPERADMIN'},showTeam(){},showLegacy(){},showSellerAdmin(){},download:async(...args)=>downloaded.push(args),api:async(path,options={})=>{
  const body=options.body&&JSON.parse(options.body);calls.push({path,body,method:options.method});
  if(path.endsWith('/bootstrap'))return {counts:Object.fromEntries(['sellers','customers','businesses'].map(kind=>[kind,{total:1,active:1}])),versions:{sellers:[],customers:[],businesses:[]}};
  if(options.method==='PUT'){const kind=path.split('/').at(-1);record.documents=record.documents.filter(d=>d.kind!==kind).concat({id:kind,kind,filename:body.filename,byte_size:100,sha256:'a'.repeat(64)});return {ok:true};}
  if(path.endsWith('/submit')){record.application.status='SUBMITTED';return {ok:true};}
  if(path==='/api/admin/accounts/sellers/s1')return {record:structuredClone(record),history:[]};
  return {total:1,has_more:false,rows:[{id:'s1',name:record.name,email:record.email,is_active:true,application_status:record.application.status,documentation:record.documentation}]};
 }};
 for(const file of ['admin/js/seller-documents.js','admin/js/accounts.js'])w.eval(fs.readFileSync(file,'utf8'));
 return {w,ctx,calls,record,copied,downloaded};
}
async function openDocuments(s){await s.w.QoriAccounts.load(s.ctx);s.w.document.querySelector('[data-kind=sellers]').click();await wait(()=>s.w.document.querySelector('[data-detail]'));s.w.document.querySelector('[data-detail]').click();await wait(()=>s.w.document.querySelector('#sellerDocuments'));s.w.document.querySelector('#sellerDocuments').click();}
test('Admin shares registration without credentials or forced account creation',async()=>{
 const s=setup();try{await s.w.QoriAccounts.load(s.ctx);s.w.document.querySelector('#accountsInviteSeller').click();const input=s.w.document.querySelector('#sellerRegistrationLink');assert.equal(input.value,'https://example.test/seller/?registro=asistido#postular');await s.w.document.querySelector('#copySellerRegistration').onclick();assert.deepEqual(s.copied,[input.value]);assert.equal(s.calls.some(c=>c.body),false);assert.match(s.w.document.querySelector('dialog').textContent,/Adjuntar documentos/);}finally{s.w.close();}
});
test('Admin uploads four files for the selected seller and explicitly submits a snapshot',async()=>{
 const s=setup();try{
  await openDocuments(s);assert.equal(s.w.document.querySelector('qa'),null);assert.equal(s.w.document.querySelector('dialog [type=submit]').disabled,true);
  for(const kind of ['IDENTITY','RUT','BANK','CONTRACT']){
   const input=s.w.document.querySelector(`[data-upload="${kind}"]`);Object.defineProperty(input,'files',{value:[new s.w.File(['%PDF-1.4\n%%EOF'],kind+'.pdf',{type:'application/pdf'})]});await input.onchange();
   const call=s.calls.find(c=>c.path.endsWith('/documents/'+kind));assert.equal(call.method,'PUT');assert.equal(call.body.expected_sha256,null);assert.ok(call.body.content_base64);assert.equal(s.w.document.querySelector('dialog').dataset.saving,undefined);
  }
  const form=s.w.document.querySelector('dialog form');assert.equal(form.querySelector('[type=submit]').disabled,false);
  form.elements.documents_received.checked=true;form.elements.signed_and_notarized.checked=true;form.elements.note.value='Documentación recibida y verificada por equipo Qori.';
  await form.onsubmit({preventDefault(){},target:form});const sent=s.calls.find(c=>c.path.endsWith('/submit'));assert.equal(sent.body.documents_received,true);assert.equal(Object.keys(sent.body.document_hashes).length,4);assert.equal(sent.body.terms_accepted,undefined);assert.equal(s.w.document.querySelector('dialog'),null);
 }finally{s.w.close();}
});
test('verified documents are read only and uploads stop after logout',async()=>{
 const s=setup();try{await openDocuments(s);const input=s.w.document.querySelector('[data-upload]');Object.defineProperty(input,'files',{value:[new s.w.File(['document'],'identity.pdf',{type:'application/pdf'})]});let finish;class DeferredReader{readAsDataURL(){finish=()=>{this.result='data:application/pdf;base64,JVBERi0xLjQKJSVFT0Y=';this.onload();};}}s.w.FileReader=DeferredReader;const loading=input.onchange();s.w.QoriAccounts.clear();finish();await loading;assert.equal(s.calls.filter(c=>c.method==='PUT').length,0);s.record.application={status:'APPROVED',approval_mode:'DOCUMENTS'};await openDocuments(s);assert.equal(s.w.document.querySelector('[data-upload]'),null);assert.equal(s.w.document.querySelector('dialog [type=submit]').disabled,true);}finally{s.w.close();}
});
test('failed upload remains visible and can be retried without submitting',async()=>{
 const s=setup();try{const original=s.ctx.api;s.ctx.api=async(path,options)=>{if(options?.method==='PUT')throw Error('No se pudo guardar el soporte.');return original(path,options);};await openDocuments(s);const input=s.w.document.querySelector('[data-upload]');Object.defineProperty(input,'files',{value:[new s.w.File(['document'],'identity.pdf',{type:'application/pdf'})]});await input.onchange();assert.match(s.w.document.querySelector('dialog [role=status]').textContent,/No se pudo guardar/);assert.equal(s.w.document.querySelector('[data-upload]').disabled,false);assert.equal(s.w.document.querySelector('dialog [type=submit]').disabled,true);}finally{s.w.close();}
});
