const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,10));
function setup(view='alliances',authenticated=true){
 const dom=new JSDOM(read('empresa/index.html'),{url:'https://example.test/empresa/',runScripts:'outside-only'});
 dom.window.document.body.dataset.authState=authenticated?'authenticated':'guest';
 dom.window.document.body.dataset.currentView=view;
 dom.window.eval(read('empresa/js/module-help.js'));
 return {dom,d:dom.window.document,help:dom.window.document.getElementById('portalModuleHelp')};
}
test('every Empresa view and sidebar module has a short description and a concrete example',async()=>{
 const {dom,d,help}=setup();
 try{
  const views=[...new Set([...d.querySelectorAll('.view-section[data-view],.sidebar .nav-item[data-view]')].map(el=>el.dataset.view))];
  assert.ok(views.length>=26);
  for(const view of views){
   d.body.dataset.currentView=view;await tick();assert.equal(help.hidden,false,view);
   const description=help.querySelector('[data-module-help-description]').textContent,example=help.querySelector('[data-module-help-example]').textContent;
   assert.ok(description.length>35&&description.length<250,view+' short explanation');
   assert.ok(example.length>35&&example.length<250,view+' short example');
   assert.match(example,/^(Una? |El equipo)/,view+' business scenario');
  }
  assert.equal(d.querySelectorAll('#portalModuleHelp').length,1);
  assert.equal(help.closest('.view-section'),null,'module refreshes must not erase the guide');
 }finally{dom.window.close();}
});
test('the native disclosure starts closed and preserves each module choice across navigation',async()=>{
 const {dom,d,help}=setup();
 try{
  assert.equal(help.tagName,'DETAILS');assert.equal(help.firstElementChild.tagName,'SUMMARY');assert.equal(help.open,false);
  help.querySelector('summary').click();await tick();assert.equal(help.open,true);
  d.body.dataset.currentView='inventory';await tick();assert.equal(help.open,false);
  d.body.dataset.currentView='alliances';await tick();assert.equal(help.open,true);
  help.querySelector('summary').click();await tick();assert.equal(help.open,false);
  d.body.dataset.currentView='inventory';await tick();d.body.dataset.currentView='alliances';await tick();assert.equal(help.open,false);
 }finally{dom.window.close();}
});
test('Contactos and Agenda get distinct help even though they share the same view',async()=>{
 const {dom,d,help}=setup('leads');
 try{
  assert.equal(help.dataset.moduleHelpKey,'leads');
  d.getElementById('contactCenterShell').dataset.contactStage='agenda';await tick();
  assert.equal(help.querySelector('[data-module-help-title]').textContent,'Agenda comercial');
  assert.match(help.querySelector('[data-module-help-example]').textContent,/taller/);
  d.getElementById('contactCenterShell').dataset.contactStage='directory';await tick();assert.equal(help.dataset.moduleHelpKey,'leads');
 }finally{dom.window.close();}
});
test('account screens including Recargas and Activos digitales update their own explanation',async()=>{
 const {dom,d,help}=setup('account');
 try{
  const account=d.querySelector('.view-section[data-view="account"]');
  for(const screen of ['billing','assets','security','channels','admin']){
   account.className='view-section account-screen-'+screen;await tick();
   assert.equal(help.dataset.moduleHelpKey,'account:'+screen);
  }
  account.className='view-section account-screen-profile';await tick();assert.equal(help.dataset.moduleHelpKey,'account');
 }finally{dom.window.close();}
});
test('help follows restored sessions, hides on logout and does not invent unknown modules',async()=>{
 const {dom,d,help}=setup('sales',false);
 try{
  assert.equal(help.hidden,true);d.body.dataset.authState='authenticated';await tick();assert.equal(help.hidden,false);
  assert.equal(help.querySelector('[data-module-help-title]').textContent,'Ventas atribuidas');
  d.body.dataset.currentView='not-a-module';await tick();assert.equal(help.hidden,true);
  d.body.dataset.currentView='validator';await tick();assert.equal(help.hidden,false);
  d.body.dataset.authState='guest';await tick();assert.equal(help.hidden,true);
 }finally{dom.window.close();}
});
