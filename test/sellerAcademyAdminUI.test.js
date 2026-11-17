const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const wait=async fn=>{for(let i=0;i<60;i++){if(fn())return;await new Promise(setImmediate);}throw Error('UI did not settle');};
function setup(){
 const w=new JSDOM('<main/>',{url:'https://gosqori.com/admin/',runScripts:'outside-only'}).window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.onclose?.();};
 w.eval(fs.readFileSync('admin/js/academy.js','utf8'));
 const calls=[],downloads=[],data={enabled:true,settings:{enabled:true,revision:1},resources:[{id:'video-one',title:'Video <img src=x>',description:'Capacitación',kind:'VIDEO',format:'VIDEO',state:'PUBLISHED',order:1,revision:1,url:'https://drive.google.com/file/d/1234567890/view'}]};
 const ctx={isCurrent:()=>true,download:async(...args)=>downloads.push(args),request:async(path,body,method)=>{calls.push({path,body,method});if(path.endsWith('/settings'))return {settings:{...body,revision:2}};if(body)return {resource:{...body,id:'new-resource',format:body.kind==='VIDEO'?'VIDEO':'PDF',order:body.position,revision:2}};return data;}};
 return {w,ctx,data,calls,downloads,host:w.document.querySelector('main')};
}
test('admin toggles access and creates hidden materials with explicit publication state',async()=>{
 const s=setup();try{
  await s.w.QoriAcademyAdmin.render(s.host,s.ctx);assert.equal(s.host.querySelector('img'),null);s.host.querySelector('[data-toggle]').click();await wait(()=>s.host.textContent.includes('Academy deshabilitada para embajadores.'));
  const toggle=s.calls.find(r=>r.path.endsWith('/settings'));assert.equal(toggle.method,'PATCH');assert.deepEqual(JSON.parse(JSON.stringify(toggle.body)),{enabled:false,expected_revision:1});
  s.host.querySelector('[data-new]').click();const f=s.host.querySelector('form');assert.equal(f.elements.state.value,'DRAFT');assert.equal(f.elements.url.required,true);
  f.elements.title.value='Nueva capacitación';f.elements.url.value='https://drive.google.com/file/d/1234567890/view';await f.onsubmit({preventDefault(){}});
  const create=s.calls.find(r=>r.path.endsWith('/materials'));assert.equal(create.method,'POST');assert.equal(create.body.state,'DRAFT');assert.equal(create.body.position,2);assert.match(s.host.textContent,/Nueva capacitación/);
 }finally{s.w.close();}
});
test('admin edits existing materials, archives, filters, and surfaces conflicting revisions',async()=>{
 const s=setup();try{
  await s.w.QoriAcademyAdmin.render(s.host,s.ctx);s.host.querySelector('[data-edit]').click();const f=s.host.querySelector('form');f.elements.state.value='ARCHIVED';f.elements.position.value='8';await f.onsubmit({preventDefault(){}});
  const saved=s.calls.find(r=>r.method==='PATCH');assert.equal(saved.body.expected_revision,1);assert.equal(saved.body.state,'ARCHIVED');assert.equal(saved.body.position,8);
  const filter=s.host.querySelector('[data-state]');filter.value='DRAFT';filter.onchange({target:filter});assert.equal(s.host.querySelectorAll('[data-resource]').length,0);
  await s.w.QoriAcademyAdmin.render(s.host,{...s.ctx,request:async(p,b,m)=>{if(b)throw Error('Otro administrador modificó este contenido.');return s.data;}});
  s.host.querySelector('[data-edit]').click();await s.host.querySelector('form').onsubmit({preventDefault(){}});assert.match(s.host.querySelector('form').textContent,/Otro administrador/);assert.equal(s.host.querySelector('button[type=submit]').disabled,false);
 }finally{s.w.close();}
});
test('document upload sends file contents, and editor keeps existing documents without upload',async()=>{
 const s=setup();try{
  s.data.resources.push({id:'document-one',title:'Guía',kind:'FILE',format:'PDF',state:'PUBLISHED',order:2,revision:5,filename:'guia.pdf'});
  await s.w.QoriAcademyAdmin.render(s.host,s.ctx);s.host.querySelector('[data-resource=document-one] [data-edit]').click();let f=s.host.querySelector('form');assert.equal(f.elements.file.required,false);assert.equal(f.elements.url.required,false);
  const file=new s.w.File(['%PDF-test'],'nuevo.pdf',{type:'application/pdf'});Object.defineProperty(f.elements.file,'files',{value:[file]});await f.onsubmit({preventDefault(){}});
  const saved=s.calls.find(r=>r.body);assert.equal(saved.body.filename,'nuevo.pdf');assert.equal(Buffer.from(saved.body.base64,'base64').toString(),'%PDF-test');assert.equal(saved.body.expected_revision,5);assert.equal(saved.body.url,undefined);
 }finally{s.w.close();}
});
test('admin dialog has internal scroll wrapper and stale reads cannot paint after logout',async()=>{
 const s=setup();try{
  s.w.QoriAcademyAdmin.open(s.ctx);await wait(()=>s.w.document.querySelector('[data-new]'));assert.ok(s.w.document.querySelector('dialog.qori-resource-dialog .qr-dialog-body'));s.w.document.querySelector('[data-close]').click();assert.equal(s.w.document.querySelector('dialog'),null);
  let resolve,active=true;const pending=s.w.QoriAcademyAdmin.render(s.host,{...s.ctx,isCurrent:()=>active,request:()=>new Promise(r=>resolve=r)});active=false;s.host.innerHTML='Sesión cerrada';resolve(s.data);await pending;assert.equal(s.host.textContent,'Sesión cerrada');
 }finally{s.w.close();}
});
